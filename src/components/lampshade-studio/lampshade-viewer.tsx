'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LampshadeParams, FilamentMaterial, PrinterBed } from './types';
import { GenerationResult, generateLampshadeGeometry } from './lampshade-generator';

interface LampshadeViewerProps {
  params: LampshadeParams;
  heightmapCanvas: HTMLCanvasElement | null;
  onStatsCalculated?: (stats: GenerationResult) => void;
  onExporterReady?: (exporter: {
    downloadSTL: (filename?: string) => void;
    downloadOBJ: (filename?: string) => void;
  }) => void;
}

export const LampshadeViewer: React.FC<LampshadeViewerProps> = ({
  params,
  heightmapCanvas,
  onStatsCalculated,
  onExporterReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const shadeMeshRef = useRef<THREE.Mesh | null>(null);
  const fitterMeshRef = useRef<THREE.Mesh | null>(null);
  const bulbLightRef = useRef<THREE.PointLight | null>(null);
  const bulbMeshRef = useRef<THREE.Mesh | null>(null);
  const bedGroupRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);

  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [cameraView, setCameraView] = useState<'persp' | 'front' | 'top' | 'inside'>('persp');
  const [wireframe, setWireframe] = useState<boolean>(false);

  // Latest stats cached
  const latestStatsRef = useRef<GenerationResult | null>(null);

  // Material builder based on filament type and wireframe
  const createMaterial = useCallback((filament: FilamentMaterial, isWire: boolean) => {
    const clippingPlanes = clipPlaneRef.current ? [clipPlaneRef.current] : [];

    if (isWire) {
      return new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        wireframe: true,
        clippingPlanes,
        clipShadows: true,
      });
    }

    switch (filament) {
      case 'white_pla':
        return new THREE.MeshPhysicalMaterial({
          color: 0xfdfdfd,
          roughness: 0.38,
          metalness: 0.02,
          transmission: 0.65,
          thickness: 2.8,
          ior: 1.48,
          attenuationColor: new THREE.Color(0xfff5e6),
          attenuationDistance: 15,
          side: THREE.DoubleSide,
          clippingPlanes,
          clipShadows: true,
        });

      case 'ivory_pla':
        return new THREE.MeshPhysicalMaterial({
          color: 0xfff7ed,
          roughness: 0.42,
          metalness: 0.02,
          transmission: 0.58,
          thickness: 2.5,
          ior: 1.49,
          attenuationColor: new THREE.Color(0xffedd5),
          attenuationDistance: 12,
          side: THREE.DoubleSide,
          clippingPlanes,
          clipShadows: true,
        });

      case 'sandstone_marble':
        return new THREE.MeshStandardMaterial({
          color: 0xf5f0eb,
          roughness: 0.78,
          metalness: 0.05,
          side: THREE.DoubleSide,
          clippingPlanes,
          clipShadows: true,
        });

      case 'silk_gold':
        return new THREE.MeshPhysicalMaterial({
          color: 0xd4af37,
          roughness: 0.22,
          metalness: 0.82,
          clearcoat: 0.4,
          clearcoatRoughness: 0.2,
          side: THREE.DoubleSide,
          clippingPlanes,
          clipShadows: true,
        });

      case 'terracotta':
        return new THREE.MeshStandardMaterial({
          color: 0xd97757,
          roughness: 0.85,
          metalness: 0.02,
          side: THREE.DoubleSide,
          clippingPlanes,
          clipShadows: true,
        });

      case 'clear_petg':
        return new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          roughness: 0.12,
          metalness: 0.05,
          transmission: 0.94,
          thickness: 3.5,
          ior: 1.57,
          clearcoat: 0.8,
          side: THREE.DoubleSide,
          clippingPlanes,
          clipShadows: true,
        });

      case 'matte_black':
      default:
        return new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.65,
          metalness: 0.15,
          side: THREE.DoubleSide,
          clippingPlanes,
          clipShadows: true,
        });
    }
  }, []);

  // Printer Bed Visualizer
  const updatePrinterBed = useCallback((bedType: PrinterBed) => {
    if (!bedGroupRef.current) return;
    const group = bedGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    let sizeX = 256;
    let sizeZ = 256;
    let label = 'Bambu Lab (256 x 256 mm)';

    if (bedType === 'ender_220') {
      sizeX = 220;
      sizeZ = 220;
      label = 'Creality Ender 3 (220 x 220 mm)';
    } else if (bedType === 'prusa_250') {
      sizeX = 250;
      sizeZ = 210;
      label = 'Prusa MK4 / Core One (250 x 210 mm)';
    } else if (bedType === 'large_300') {
      sizeX = 300;
      sizeZ = 300;
      label = 'Large Format (300 x 300 mm)';
    }

    // Grid Floor
    const grid = new THREE.GridHelper(Math.max(sizeX, sizeZ), 20, 0xf59e0b, 0x334155);
    grid.position.y = -0.1;
    group.add(grid);

    // Bed Plate Outline Frame
    const frameGeo = new THREE.BoxGeometry(sizeX, 2, sizeZ);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.1,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.y = -1.1;
    frameMesh.receiveShadow = true;
    group.add(frameMesh);

    // Corner Alignment Marks
    const markMat = new THREE.LineBasicMaterial({ color: 0xf59e0b });
    const corners = [
      [-sizeX / 2, -sizeZ / 2],
      [sizeX / 2, -sizeZ / 2],
      [sizeX / 2, sizeZ / 2],
      [-sizeX / 2, sizeZ / 2],
    ];

    corners.forEach(([cx, cz]) => {
      const signX = cx > 0 ? -1 : 1;
      const signZ = cz > 0 ? -1 : 1;
      const points = [
        new THREE.Vector3(cx + signX * 15, 0.2, cz),
        new THREE.Vector3(cx, 0.2, cz),
        new THREE.Vector3(cx, 0.2, cz + signZ * 15),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      group.add(new THREE.Line(lineGeo, markMat));
    });
  }, []);

  // 1. Initial Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 3000);
    camera.position.set(240, 220, 360);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.15; // Don't go too far under bed
    controls.minDistance = 60;
    controls.maxDistance = 1200;
    controls.target.set(0, 90, 0);
    controlsRef.current = controls;

    // Studio Environment Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio Lights
    // Key Light (Warm)
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    keyLight.position.set(250, 400, 200);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.camera.near = 50;
    keyLight.shadow.camera.far = 1000;
    keyLight.shadow.camera.left = -250;
    keyLight.shadow.camera.right = 250;
    keyLight.shadow.camera.top = 250;
    keyLight.shadow.camera.bottom = -250;
    scene.add(keyLight);

    // Fill Light (Cool Sky)
    const fillLight = new THREE.HemisphereLight(0x94a3b8, 0x0f172a, 1.2);
    scene.add(fillLight);

    // Soft Rim Light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    rimLight.position.set(-250, 200, -200);
    scene.add(rimLight);

    // Internal Light Bulb Simulation
    const bulbGroup = new THREE.Group();
    const bulbLight = new THREE.PointLight(0xffaa44, 3.5, 450, 1.8);
    bulbLight.castShadow = true;
    bulbLight.shadow.bias = -0.002;
    bulbLight.position.set(0, 90, 0);
    bulbGroup.add(bulbLight);
    bulbLightRef.current = bulbLight;

    const bulbMeshGeo = new THREE.SphereGeometry(14, 24, 24);
    const bulbMeshMat = new THREE.MeshBasicMaterial({ color: 0xffe082 });
    const bulbMesh = new THREE.Mesh(bulbMeshGeo, bulbMeshMat);
    bulbMesh.position.set(0, 90, 0);
    bulbGroup.add(bulbMesh);
    bulbMeshRef.current = bulbMesh;

    scene.add(bulbGroup);

    // Printer Bed Group
    const bedGroup = new THREE.Group();
    scene.add(bedGroup);
    bedGroupRef.current = bedGroup;
    updatePrinterBed(params.printerBed);

    // Meshes Container
    const shadeMesh = new THREE.Mesh();
    shadeMesh.castShadow = true;
    shadeMesh.receiveShadow = true;
    scene.add(shadeMesh);
    shadeMeshRef.current = shadeMesh;

    const fitterMesh = new THREE.Mesh();
    fitterMesh.castShadow = true;
    fitterMesh.receiveShadow = true;
    scene.add(fitterMesh);
    fitterMeshRef.current = fitterMesh;

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (controlsRef.current) {
        if (autoRotate) {
          controlsRef.current.autoRotate = true;
          controlsRef.current.autoRotateSpeed = 2.0;
        } else {
          controlsRef.current.autoRotate = false;
        }
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 2. Update Clip Plane for Cross-Section Slicer View
  useEffect(() => {
    if (params.sliceCutPlane > 0) {
      clipPlaneRef.current = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    } else {
      clipPlaneRef.current = null;
    }
  }, [params.sliceCutPlane]);

  // 3. Update Bulb Position & Lighting
  useEffect(() => {
    if (!bulbLightRef.current || !bulbMeshRef.current) return;
    const bulbY = params.height * 0.45;
    bulbLightRef.current.position.y = bulbY;
    bulbMeshRef.current.position.y = bulbY;

    bulbLightRef.current.visible = params.lightBulbOn;
    bulbMeshRef.current.visible = params.lightBulbOn;
    bulbLightRef.current.intensity = params.bulbIntensity * 2.2;

    let colorHex = 0xffaa44; // warm
    if (params.bulbColorTemp === 'candle') {
      colorHex = 0xff7722;
    } else if (params.bulbColorTemp === 'neutral') {
      colorHex = 0xfff4e6;
    } else if (params.bulbColorTemp === 'rgb') {
      colorHex = parseInt(params.bulbCustomColor.replace('#', ''), 16) || 0xffaa44;
    }
    bulbLightRef.current.color.setHex(colorHex);
    (bulbMeshRef.current.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
  }, [params.lightBulbOn, params.bulbIntensity, params.bulbColorTemp, params.bulbCustomColor, params.height]);

  // 4. Update Printer Bed Model
  useEffect(() => {
    updatePrinterBed(params.printerBed);
  }, [params.printerBed, updatePrinterBed]);

  // 5. Recompute & Regenerate 3D Mesh
  useEffect(() => {
    if (!shadeMeshRef.current || !fitterMeshRef.current) return;

    // Generate mesh from parameters and heightmap
    const result = generateLampshadeGeometry(params, heightmapCanvas);
    latestStatsRef.current = result;

    // Dispose old geometries
    if (shadeMeshRef.current.geometry) shadeMeshRef.current.geometry.dispose();
    if (fitterMeshRef.current.geometry) fitterMeshRef.current.geometry.dispose();

    // Set new geometries
    shadeMeshRef.current.geometry = result.geometry;
    shadeMeshRef.current.material = createMaterial(params.filament, wireframe);

    if (result.fitterGeometry) {
      fitterMeshRef.current.geometry = result.fitterGeometry;
      fitterMeshRef.current.material = createMaterial('matte_black', wireframe);
      fitterMeshRef.current.visible = true;
    } else {
      fitterMeshRef.current.visible = false;
    }

    // Adjust orbit control center target
    if (controlsRef.current) {
      controlsRef.current.target.set(0, params.height / 2, 0);
    }

    if (onStatsCalculated) {
      onStatsCalculated(result);
    }
  }, [params, heightmapCanvas, wireframe, createMaterial, onStatsCalculated]);

  // 6. Exporter Handlers (STL & OBJ)
  const downloadSTL = useCallback((customFilename?: string) => {
    if (!latestStatsRef.current) return;
    const exporter = new STLExporter();
    // Export combined manifold geometry as single mesh for slicer
    const exportMesh = new THREE.Mesh(latestStatsRef.current.combinedGeometry);
    const stlData = exporter.parse(exportMesh, { binary: true });

    const blob = new Blob([stlData], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    const name = customFilename || `LuminaPrint_Shade_${params.waveType}_H${params.height}mm.stl`;
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [params]);

  const downloadOBJ = useCallback((customFilename?: string) => {
    if (!latestStatsRef.current) return;
    const geo = latestStatsRef.current.combinedGeometry;
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;

    let objStr = `# LuminaPrint 3D Model Export\n# Parametric Lampshade & Lithophane Studio\no Lampshade\n`;

    for (let i = 0; i < pos.count; i++) {
      objStr += `v ${pos.getX(i).toFixed(4)} ${pos.getY(i).toFixed(4)} ${pos.getZ(i).toFixed(4)}\n`;
    }

    if (uv) {
      for (let i = 0; i < uv.count; i++) {
        objStr += `vt ${uv.getX(i).toFixed(4)} ${uv.getY(i).toFixed(4)}\n`;
      }
    }

    for (let i = 0; i < pos.count; i += 3) {
      const idx = i + 1;
      objStr += `f ${idx}/${idx} ${idx + 1}/${idx + 1} ${idx + 2}/${idx + 2}\n`;
    }

    const blob = new Blob([objStr], { type: 'text/plain' });
    const link = document.createElement('a');
    const name = customFilename || `LuminaPrint_Shade_${params.waveType}_H${params.height}mm.obj`;
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [params]);

  // Expose exporter methods to parent component
  useEffect(() => {
    if (onExporterReady) {
      onExporterReady({ downloadSTL, downloadOBJ });
    }
  }, [onExporterReady, downloadSTL, downloadOBJ]);

  // Camera preset views
  const applyCameraView = (view: 'persp' | 'front' | 'top' | 'inside') => {
    if (!cameraRef.current || !controlsRef.current) return;
    setCameraView(view);
    const targetY = params.height / 2;
    controlsRef.current.target.set(0, targetY, 0);

    const dist = params.height * 2.0;

    switch (view) {
      case 'front':
        cameraRef.current.position.set(0, targetY, dist);
        break;
      case 'top':
        cameraRef.current.position.set(0, dist * 1.4, 0);
        break;
      case 'inside':
        cameraRef.current.position.set(0, 20, 0.1);
        controlsRef.current.target.set(0, params.height * 0.8, 0);
        break;
      case 'persp':
      default:
        cameraRef.current.position.set(dist * 0.7, targetY + 60, dist * 0.9);
        break;
    }
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating HUD Viewport Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Camera Views Bar */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-1.5 shadow-xl flex items-center gap-1 text-xs">
          <button
            onClick={() => applyCameraView('persp')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              cameraView === 'persp' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            3D Orbit
          </button>
          <button
            onClick={() => applyCameraView('front')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              cameraView === 'front' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => applyCameraView('top')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              cameraView === 'top' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Top Rim
          </button>
          <button
            onClick={() => applyCameraView('inside')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              cameraView === 'inside' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Inside Bulb
          </button>
        </div>

        {/* View Mode Toggles */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-1.5 shadow-xl flex items-center justify-between gap-1 text-xs">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex-1 px-2 py-1 rounded-lg font-medium transition text-center ${
              autoRotate ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {autoRotate ? 'Rotating' : 'Auto-Spin'}
          </button>
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`flex-1 px-2 py-1 rounded-lg font-medium transition text-center ${
              wireframe ? 'bg-amber-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {wireframe ? 'Wireframe' : 'Solid'}
          </button>
        </div>
      </div>

      {/* Viewport Scale Indicator */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 font-mono shadow-md flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>1:1 Metric Scale (mm) • Orbit: Left Click Drag • Pan: Right Click Drag • Zoom: Wheel</span>
      </div>
    </div>
  );
};
