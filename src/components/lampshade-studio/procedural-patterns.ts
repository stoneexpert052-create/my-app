/**
 * Procedural heightmap generator and image processing utility for 3D Lithophanes
 */

export type ProceduralPatternType = 'voronoi' | 'mandala' | 'gradient' | 'jali' | 'marble';

/**
 * Generates procedural canvas pattern
 */
export function generateProceduralPattern(
  type: ProceduralPatternType,
  width: number = 512,
  height: number = 512
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (type === 'voronoi') {
    // Cellular / Voronoi pattern
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Seed points
    const numPoints = 48;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height
      });
    }

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let d1 = Infinity;
        let d2 = Infinity;

        // Check distance to points with toroidal wrapping
        for (let i = 0; i < numPoints; i++) {
          const p = points[i];
          let dx = Math.abs(x - p.x);
          if (dx > width / 2) dx = width - dx;
          let dy = Math.abs(y - p.y);
          if (dy > height / 2) dy = height - dy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < d1) {
            d2 = d1;
            d1 = dist;
          } else if (dist < d2) {
            d2 = dist;
          }
        }

        // Cell boundary formula: d2 - d1 gives organic cell walls
        const cellEdge = Math.min(255, Math.max(0, (d2 - d1) * 7.5));
        const idx = (y * width + x) * 4;
        data[idx] = cellEdge;
        data[idx + 1] = cellEdge;
        data[idx + 2] = cellEdge;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

  } else if (type === 'mandala') {
    // Sacred Geometry / Mandala / Geo Lattice
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    const cx = width / 2;
    const cy = height / 2;

    // Draw overlapping concentric flower-of-life circles
    const baseR = width * 0.18;
    for (let ring = 1; ring <= 4; ring++) {
      const r = baseR * ring * 0.55;
      const count = 8 * ring;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        ctx.beginPath();
        ctx.arc(px, py, baseR, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Radial spokes
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * (width * 0.48), cy + Math.sin(a) * (height * 0.48));
      ctx.stroke();
    }

  } else if (type === 'jali') {
    // Islamic Geometric Arabesque / Jali Screen
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 4;

    const tileSize = width / 4;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = c * tileSize + tileSize / 2;
        const y = r * tileSize + tileSize / 2;
        const rad = tileSize * 0.42;

        // 8-pointed star
        ctx.save();
        ctx.translate(x, y);
        for (let rot = 0; rot < 2; rot++) {
          ctx.beginPath();
          ctx.rect(-rad * 0.7, -rad * 0.7, rad * 1.4, rad * 1.4);
          ctx.stroke();
          ctx.rotate(Math.PI / 4);
        }

        // Inner rosette
        ctx.beginPath();
        ctx.arc(0, 0, rad * 0.35, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    }

  } else if (type === 'marble') {
    // Translucent Onyx / Marble Veins
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / 60;
        const ny = y / 60;
        const v = Math.sin(nx + Math.sin(ny * 1.8 + Math.cos(nx * 0.8) * 2.5) * 2.2);
        const intensity = Math.pow(Math.abs(v), 2.8) * 255;
        const idx = (y * width + x) * 4;
        data[idx] = intensity;
        data[idx + 1] = intensity;
        data[idx + 2] = intensity;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

  } else {
    // 'gradient' - Sunset flow
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.25, '#777777');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(0.75, '#444444');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Overlay horizontal undulating waves
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (let w = 0; w < 12; w++) {
      const yBase = (w / 12) * height;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const y = yBase + Math.sin(x * 0.03 + w * 0.7) * 14;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  return canvas;
}

/**
 * Processes an uploaded image into a normalized grayscale heightmap canvas
 */
export async function processImageToHeightmap(
  imageSource: HTMLImageElement | File,
  options: {
    invert?: boolean;
    blur?: number;
    targetWidth?: number;
    targetHeight?: number;
  } = {}
): Promise<HTMLCanvasElement> {
  const {
    invert = true,
    blur = 0,
    targetWidth = 512,
    targetHeight = 512
  } = options;

  let img: HTMLImageElement;
  if (imageSource instanceof File) {
    img = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    });
  } else {
    img = imageSource;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (blur > 0) {
    ctx.filter = `blur(${blur}px)`;
  }

  // Draw image scaled to fit
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Convert to grayscale and apply inversion
  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Perceptual luminance formula
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    if (invert) {
      // In lithophanes: Darker area in photo = thicker plastic = less light transmission
      gray = 255 - gray;
    }
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Fast sample height from canvas using normalized UV coordinates (0..1, 0..1)
 */
export function sampleCanvasHeight(
  canvas: HTMLCanvasElement,
  u: number,
  v: number,
  tileU: number = 1,
  tileV: number = 1
): number {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;

  // Wrap UV with tiling
  let tu = (u * tileU) % 1.0;
  if (tu < 0) tu += 1.0;
  let tv = (v * tileV) % 1.0;
  if (tv < 0) tv += 1.0;

  const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(tu * canvas.width)));
  const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(tv * canvas.height)));

  const pixel = ctx.getImageData(x, y, 1, 1).data;
  // Normalized 0.0 to 1.0
  return pixel[0] / 255.0;
}
