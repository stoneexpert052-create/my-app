import * as THREE from 'three';
import { LampshadeParams } from './types';
import { sampleCanvasHeight } from './procedural-patterns';

export interface GenerationResult {
  geometry: THREE.BufferGeometry;
  fitterGeometry?: THREE.BufferGeometry;
  combinedGeometry: THREE.BufferGeometry;
  triangleCount: number;
  vertexCount: number;
  volumeCm3: number;
  weightGrams: number;
  estimatedPrintTimeHours: number;
  dimensions: {
    widthMm: number;
    depthMm: number;
    heightMm: number;
  };
}

/**
 * Calculates radial profile at height t (0.0 to 1.0)
 */
export function getBaseRadiusAt(
  t: number,
  bottomR: number,
  topR: number,
  waist: number,
  waistPos: number
): number {
  // Linear interpolation base
  const linearR = bottomR * (1 - t) + topR * t;

  // Waist / bulge modulation using smooth bell curve centered at waistPos
  const dist = t - waistPos;
  const bell = Math.exp(-((dist * dist) / 0.045));
  const bulge = waist * bell;

  return Math.max(8, linearR + bulge);
}

/**
 * Calculates rib displacement offset based on angle and height
 */
export function getRibDisplacement(
  theta: number,
  t: number,
  params: LampshadeParams
): number {
  if (params.ribCount <= 0 || params.ribDepth <= 0) return 0;

  // Twist angle offset
  const twistRad = THREE.MathUtils.degToRad(params.twist) * t;
  const angle = theta * params.ribCount + twistRad;

  // Vertical wave modulation
  let vFactor = 1.0;
  if (params.vWaveCount > 0) {
    vFactor += Math.sin(t * Math.PI * 2 * params.vWaveCount) * (params.vWaveAmp / Math.max(1, params.ribDepth));
  }

  let wave = 0;
  switch (params.waveType) {
    case 'sharp': {
      // Sawtooth / Origami pleat: triangle wave
      const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      wave = (Math.abs(norm - Math.PI) / Math.PI) * 2 - 1;
      break;
    }
    case 'scallop': {
      // Rounded scallops
      const s = Math.sin(angle);
      wave = s > 0 ? Math.sqrt(s) : -Math.sqrt(-s) * 0.5;
      break;
    }
    case 'cellular': {
      // 2D Diamond knurl
      const u = angle;
      const v = t * Math.PI * params.ribCount * 0.5;
      wave = Math.sin(u) * Math.cos(v);
      break;
    }
    case 'fluted': {
      // Architectural concave flutes
      const s = Math.sin(angle);
      wave = s > 0 ? -Math.pow(s, 2) : 0;
      break;
    }
    case 'sine':
    default: {
      wave = Math.sin(angle);
      break;
    }
  }

  return wave * params.ribDepth * vFactor;
}

/**
 * Generates the complete 3D printable lampshade mesh
 */
export function generateLampshadeGeometry(
  params: LampshadeParams,
  heightmapCanvas?: HTMLCanvasElement | null
): GenerationResult {
  const heightSegments = Math.max(20, Math.min(180, params.heightSegments));
  const radialSegments = Math.max(32, Math.min(240, params.radialSegments));

  const totalHeight = params.height;
  const isVase = params.wallStyle === 'vase';
  const wallThick = Math.max(0.8, params.wallThickness);

  // Pre-allocate arrays
  const outerPositions: THREE.Vector3[][] = [];
  const innerPositions: THREE.Vector3[][] = [];

  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  // 1. Calculate Grid of Vertices
  for (let j = 0; j <= heightSegments; j++) {
    const t = j / heightSegments; // 0 (bottom) to 1 (top)
    const y = t * totalHeight;

    outerPositions[j] = [];
    if (!isVase) innerPositions[j] = [];

    const baseR = getBaseRadiusAt(t, params.bottomRadius, params.topRadius, params.waist, params.waistPos);

    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      const theta = u * Math.PI * 2;

      // Parametric Ribs
      const ribDisp = getRibDisplacement(theta, t, params);

      // Lithophane Image Displacement
      let imgDisp = 0;
      if (params.imgActive && heightmapCanvas) {
        const sample = sampleCanvasHeight(heightmapCanvas, u, 1 - t, params.imgTileU, params.imgTileV);
        imgDisp = sample * params.imgDepth;
      }

      // Rim reinforcement
      let rimBonus = 0;
      const rimH = Math.max(2, params.rimHeight);
      const isNearBottom = y < rimH;
      const isNearTop = y > totalHeight - rimH;
      if (isNearBottom || isNearTop) {
        rimBonus = params.rimLipSize;
      }

      // Determine Outer and Inner Radii depending on modulation mode
      let rOuter = baseR + ribDisp;
      let rInner = baseR - wallThick;

      if (!isVase) {
        switch (params.imgMode) {
          case 'lithoOuter':
            // Smooth inner, displaced outer
            rOuter += imgDisp + rimBonus;
            rInner = baseR - wallThick;
            break;
          case 'lithoInner':
            // Smooth outer, displaced inner (hidden photo!)
            rOuter = baseR + ribDisp + rimBonus;
            rInner = (baseR - wallThick) - imgDisp;
            break;
          case 'embossBoth':
          default:
            // Whole wall displaced
            rOuter += imgDisp + rimBonus;
            rInner += imgDisp - wallThick;
            break;
        }
      } else {
        rOuter += imgDisp + rimBonus;
      }

      // Outer point
      const ox = Math.cos(theta) * rOuter;
      const oz = Math.sin(theta) * rOuter;
      outerPositions[j][i] = new THREE.Vector3(ox, y, oz);

      minX = Math.min(minX, ox);
      maxX = Math.max(maxX, ox);
      minZ = Math.min(minZ, oz);
      maxZ = Math.max(maxZ, oz);

      // Inner point
      if (!isVase) {
        const clampedInnerR = Math.max(4, rInner);
        const ix = Math.cos(theta) * clampedInnerR;
        const iz = Math.sin(theta) * clampedInnerR;
        innerPositions[j][i] = new THREE.Vector3(ix, y, iz);
      }
    }
  }

  // 2. Assemble BufferGeometry Triangles
  const vertices: number[] = [];
  const uvs: number[] = [];

  // A. Outer Wall
  for (let j = 0; j < heightSegments; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const p00 = outerPositions[j][i];
      const p10 = outerPositions[j][i + 1];
      const p01 = outerPositions[j + 1][i];
      const p11 = outerPositions[j + 1][i + 1];

      const u0 = i / radialSegments;
      const u1 = (i + 1) / radialSegments;
      const v0 = j / heightSegments;
      const v1 = (j + 1) / heightSegments;

      // Triangle 1: p00 -> p10 -> p11
      vertices.push(p00.x, p00.y, p00.z);
      vertices.push(p10.x, p10.y, p10.z);
      vertices.push(p11.x, p11.y, p11.z);
      uvs.push(u0, v0, u1, v0, u1, v1);

      // Triangle 2: p00 -> p11 -> p01
      vertices.push(p00.x, p00.y, p00.z);
      vertices.push(p11.x, p11.y, p11.z);
      vertices.push(p01.x, p01.y, p01.z);
      uvs.push(u0, v0, u1, v1, u0, v1);
    }
  }

  // B. Inner Wall (Reversed winding for correct outward normals)
  if (!isVase) {
    for (let j = 0; j < heightSegments; j++) {
      for (let i = 0; i < radialSegments; i++) {
        const p00 = innerPositions[j][i];
        const p10 = innerPositions[j][i + 1];
        const p01 = innerPositions[j + 1][i];
        const p11 = innerPositions[j + 1][i + 1];

        const u0 = i / radialSegments;
        const u1 = (i + 1) / radialSegments;
        const v0 = j / heightSegments;
        const v1 = (j + 1) / heightSegments;

        // Triangle 1: p00 -> p11 -> p10 (reversed)
        vertices.push(p00.x, p00.y, p00.z);
        vertices.push(p11.x, p11.y, p11.z);
        vertices.push(p10.x, p10.y, p10.z);
        uvs.push(u0, v0, u1, v1, u1, v0);

        // Triangle 2: p00 -> p01 -> p11 (reversed)
        vertices.push(p00.x, p00.y, p00.z);
        vertices.push(p01.x, p01.y, p01.z);
        vertices.push(p11.x, p11.y, p11.z);
        uvs.push(u0, v0, u0, v1, u1, v1);
      }
    }

    // C. Bottom Rim Ring (Cap bottom gap between inner and outer)
    const jBot = 0;
    for (let i = 0; i < radialSegments; i++) {
      const o0 = outerPositions[jBot][i];
      const o1 = outerPositions[jBot][i + 1];
      const i0 = innerPositions[jBot][i];
      const i1 = innerPositions[jBot][i + 1];

      vertices.push(o0.x, o0.y, o0.z);
      vertices.push(i1.x, i1.y, i1.z);
      vertices.push(o1.x, o1.y, o1.z);
      uvs.push(0, 0, 1, 1, 1, 0);

      vertices.push(o0.x, o0.y, o0.z);
      vertices.push(i0.x, i0.y, i0.z);
      vertices.push(i1.x, i1.y, i1.z);
      uvs.push(0, 0, 0, 1, 1, 1);
    }

    // D. Top Rim Ring (Cap top gap between inner and outer)
    const jTop = heightSegments;
    for (let i = 0; i < radialSegments; i++) {
      const o0 = outerPositions[jTop][i];
      const o1 = outerPositions[jTop][i + 1];
      const i0 = innerPositions[jTop][i];
      const i1 = innerPositions[jTop][i + 1];

      vertices.push(o0.x, o0.y, o0.z);
      vertices.push(o1.x, o1.y, o1.z);
      vertices.push(i1.x, i1.y, i1.z);
      uvs.push(0, 0, 1, 0, 1, 1);

      vertices.push(o0.x, o0.y, o0.z);
      vertices.push(i1.x, i1.y, i1.z);
      vertices.push(i0.x, i0.y, i0.z);
      uvs.push(0, 0, 1, 1, 0, 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  // 3. Generate Hardware Fitter Socket (E27, E14, Spider, etc.)
  let fitterGeometry: THREE.BufferGeometry | undefined;
  if (params.socketType !== 'none') {
    fitterGeometry = generateFitterGeometry(params);
  }

  // Combine geometries for 3D printing
  let combinedGeometry = geometry.clone();
  if (fitterGeometry) {
    combinedGeometry = mergeBufferGeometries([geometry, fitterGeometry]);
  }

  // Calculate volume approximation and 3D print specs
  const avgRadius = (params.bottomRadius + params.topRadius + Math.max(0, params.waist)) / 2;
  const perimeter = 2 * Math.PI * avgRadius;
  const surfaceAreaMm2 = perimeter * totalHeight;
  const effectiveThickness = isVase ? 0.45 : wallThick;
  const volumeMm3 = surfaceAreaMm2 * effectiveThickness;
  const volumeCm3 = volumeMm3 / 1000;

  // PLA density is approx 1.24 g/cm3
  const weightGrams = Math.round(volumeCm3 * 1.24);

  // Speed estimation: approx 15g/hour on standard 3D printer
  const estimatedPrintTimeHours = Number((weightGrams / 18.0).toFixed(1));

  return {
    geometry,
    fitterGeometry,
    combinedGeometry,
    triangleCount: Math.round(vertices.length / 9) + (fitterGeometry ? fitterGeometry.attributes.position.count / 3 : 0),
    vertexCount: vertices.length / 3 + (fitterGeometry ? fitterGeometry.attributes.position.count : 0),
    volumeCm3: Number(volumeCm3.toFixed(1)),
    weightGrams,
    estimatedPrintTimeHours,
    dimensions: {
      widthMm: Math.round((maxX - minX)),
      depthMm: Math.round((maxZ - minZ)),
      heightMm: Math.round(totalHeight)
    }
  };
}

/**
 * Generates hardware mount fitter (E27, E14, Spider with spokes)
 */
function generateFitterGeometry(params: LampshadeParams): THREE.BufferGeometry {
  const isTop = params.socketPosition === 'top';
  const fitterY = isTop ? params.height - params.socketDrop : params.socketDrop;

  let holeDiameter = 41; // E27 standard
  let ringOuterDiameter = 54;
  if (params.socketType === 'e14') {
    holeDiameter = 28;
    ringOuterDiameter = 38;
  } else if (params.socketType === 'spider') {
    holeDiameter = 10.5; // Standard 3/8" or 10mm harp post
    ringOuterDiameter = 24;
  } else if (params.socketType === 'cord_grip') {
    holeDiameter = 12;
    ringOuterDiameter = 24;
  }

  const innerRadius = holeDiameter / 2;
  const outerRadius = ringOuterDiameter / 2;
  const ringThickness = Math.max(2, params.spokeThickness);

  // Measure shade radius at fitterY
  const tFitter = Math.min(0.98, Math.max(0.02, fitterY / params.height));
  const shadeR = getBaseRadiusAt(tFitter, params.bottomRadius, params.topRadius, params.waist, params.waistPos) - params.wallThickness;

  const geometriesToMerge: THREE.BufferGeometry[] = [];

  // 1. Center Mounting Ring Cylinder with hole
  const ringShape = new THREE.Shape();
  ringShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const holePath = new THREE.Path();
  holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  ringShape.holes.push(holePath);

  const ringGeo = new THREE.ExtrudeGeometry(ringShape, {
    depth: ringThickness,
    bevelEnabled: false,
    curveSegments: 36
  });
  ringGeo.rotateX(Math.PI / 2);
  ringGeo.translate(0, fitterY, 0);
  geometriesToMerge.push(ringGeo);

  // 2. Connecting Spokes / Struts
  const spokeCount = Math.max(3, params.spokeCount);
  const spokeLen = Math.max(10, shadeR - outerRadius + 2);
  const spokeWidth = Math.max(2.5, params.spokeWidth);

  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const spokeGeo = new THREE.BoxGeometry(spokeLen, ringThickness, spokeWidth);
    spokeGeo.translate(spokeLen / 2 + outerRadius - 1, 0, 0);
    spokeGeo.rotateY(angle);
    spokeGeo.translate(0, fitterY + ringThickness / 2, 0);
    geometriesToMerge.push(spokeGeo);
  }

  return mergeBufferGeometries(geometriesToMerge);
}

/**
 * Utility to merge multiple BufferGeometries into one
 */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const allPositions: number[] = [];
  const allUvs: number[] = [];

  for (const geo of geometries) {
    const nonIndexed = geo.toNonIndexed();
    const pos = nonIndexed.attributes.position;
    const uv = nonIndexed.attributes.uv;

    for (let i = 0; i < pos.count; i++) {
      allPositions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (uv) {
        allUvs.push(uv.getX(i), uv.getY(i));
      } else {
        allUvs.push(0, 0);
      }
    }
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
  merged.computeVertexNormals();
  return merged;
}
