const sharp = require('sharp');
const fs = require('fs');

// We create the 3D Stone Expert Logo SVG matching the user's uploaded emblem
const createLogoSvg = (padding = 30, background = null) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <!-- Top Face Highlight Gradient -->
    <linearGradient id="topFace" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="45%" stop-color="#F8FAFC" />
      <stop offset="85%" stop-color="#E2E8F0" />
      <stop offset="100%" stop-color="#CBD5E1" />
    </linearGradient>

    <!-- Side Bevel & Extrusion Gradient -->
    <linearGradient id="sideBevel" x1="0%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#CBD5E1" />
      <stop offset="40%" stop-color="#94A3B8" />
      <stop offset="100%" stop-color="#64748B" />
    </linearGradient>

    <!-- Deep Bevel / Underside Shading -->
    <linearGradient id="deepBevel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#94A3B8" />
      <stop offset="60%" stop-color="#64748B" />
      <stop offset="100%" stop-color="#475569" />
    </linearGradient>

    <!-- Soft Ambient Cast Shadow -->
    <filter id="castShadow" x="-20%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="6" dy="12" stdDeviation="9" flood-color="#0f172a" flood-opacity="0.28" />
      <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.18" />
    </filter>

    <!-- Micro Bevel Shadow for Intricate Edges -->
    <filter id="edgeBevel" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="1.5" dy="3" stdDeviation="1.5" flood-color="#475569" flood-opacity="0.45" />
    </filter>
  </defs>

  ${background ? `<rect width="512" height="512" rx="90" fill="${background}" />` : ''}

  <!-- Main Logo Emblem -->
  <g filter="url(#castShadow)" transform="translate(256, 248) scale(0.92) translate(-256, -248)">
    
    <!-- 1. 3D EXTRUSION BASE LAYER (Darker bevel depth) -->
    <g transform="translate(4, 7)" fill="url(#deepBevel)" stroke="url(#deepBevel)" stroke-linejoin="round" stroke-linecap="round">
      <!-- Ring Extrusion -->
      <path d="
        M 158 418
        A 210 210 0 1 1 354 418
        L 388 440
        A 238 238 0 1 0 124 440
        Z" />
      
      <!-- Mountain Facets Extrusion -->
      <!-- Left slab -->
      <polygon points="128,268 174,166 210,296 142,284" />
      <!-- Left peak center -->
      <polygon points="196,166 248,84 274,302 210,296" />
      <!-- Wireframe right -->
      <polygon points="248,84 354,168 316,302 274,302" />
      <polygon points="354,168 416,278 358,296" />

      <!-- Text Ledge Base Bar -->
      <rect x="136" y="408" width="240" height="12" rx="3" />

      <!-- Text Extrusion -->
      <g font-family="'Montserrat', 'Arial Black', -apple-system, sans-serif" font-weight="900" text-anchor="middle">
        <text x="256" y="348" font-size="52" letter-spacing="4">STONE</text>
        <text x="256" y="398" font-size="47" letter-spacing="3.5">EXPERT</text>
      </g>
    </g>

    <!-- 2. MID-TONE 3D BEVEL EDGES -->
    <g transform="translate(1.5, 3)" fill="url(#sideBevel)" stroke="url(#sideBevel)" stroke-width="1.5" stroke-linejoin="round">
      <!-- Ring -->
      <path d="
        M 158 418
        A 210 210 0 1 1 354 418
        L 386 438
        A 238 238 0 1 0 126 438
        Z" />

      <!-- Solid left facets -->
      <polygon points="128,268 174,166 210,296 142,284" />
      <polygon points="196,166 248,84 274,302 210,296" />

      <!-- Wireframe right -->
      <path d="
        M 248,84 L 358,168 L 314,302 L 274,302 Z
        M 264,124 L 284,276 L 334,178 Z" fill-rule="evenodd" />

      <path d="
        M 358,168 L 416,278 L 348,302 L 314,302 Z
        M 364,196 L 334,278 L 392,266 Z" fill-rule="evenodd" />

      <!-- Base Bar -->
      <rect x="136" y="407" width="240" height="11" rx="3" />

      <!-- Text -->
      <g font-family="'Montserrat', 'Arial Black', -apple-system, sans-serif" font-weight="900" text-anchor="middle">
        <text x="256" y="347" font-size="52" letter-spacing="4">STONE</text>
        <text x="256" y="397" font-size="47" letter-spacing="3.5">EXPERT</text>
      </g>
    </g>

    <!-- 3. TOP WHITE MARBLE FACE (The crisp, pristine front surface) -->
    <g fill="url(#topFace)" stroke="#F8FAFC" stroke-width="0.8" stroke-linejoin="round">
      <!-- Outer Ring (Broken at bottom, flaring at feet) -->
      <path d="
        M 160 416
        A 210 210 0 1 1 352 416
        L 384 436
        A 238 238 0 1 0 128 436
        Z" />

      <!-- Mountain Peak - Far Left Facet -->
      <polygon points="128,268 174,166 206,294 142,284" />

      <!-- Mountain Peak - Middle Left Facet -->
      <polygon points="176,166 248,84 220,296 206,294" />

      <!-- Mountain Peak - Center Peak Left Shading -->
      <polygon points="248,84 274,300 220,296" />

      <!-- Mountain Peak - Wireframe Struts Right -->
      <!-- Frame 1 -->
      <path d="
        M 248,84 L 356,166 L 314,300 L 274,300 Z
        M 268,124 L 284,276 L 334,178 Z" fill-rule="evenodd" />
      
      <!-- Frame 2 -->
      <path d="
        M 356,166 L 414,276 L 348,300 L 314,300 Z
        M 364,196 L 334,276 L 392,264 Z" fill-rule="evenodd" />

      <!-- Horizontal Ledge Bar under EXPERT -->
      <rect x="136" y="405" width="240" height="9" rx="2.5" />

      <!-- 3D Front Face Typography -->
      <g font-family="'Montserrat', 'Arial Black', -apple-system, sans-serif" font-weight="900" text-anchor="middle">
        <text x="256" y="345" font-size="52" letter-spacing="4">STONE</text>
        <text x="256" y="395" font-size="47" letter-spacing="3.5">EXPERT</text>
      </g>
    </g>

    <!-- 4. INNER ACCENT SPECULAR HIGHLIGHTS -->
    <g fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.8" stroke-linecap="round">
      <path d="M 170 120 A 210 210 0 0 1 342 120" />
      <line x1="248" y1="84" x2="274" y2="300" />
      <line x1="176" y1="166" x2="220" y2="296" />
      <line x1="138" y1="406" x2="374" y2="406" />
    </g>

  </g>
</svg>
`;

async function main() {
  const transparentSvg = Buffer.from(createLogoSvg(20, null));
  const darkMaskableSvg = Buffer.from(createLogoSvg(40, '#0f172a'));

  console.log('Generating PNG assets with Sharp...');

  // 1. logo.png (High-Res 512x512 transparent)
  await sharp(transparentSvg)
    .resize(512, 512)
    .png()
    .toFile('public/logo.png');
  console.log('Created public/logo.png (512x512)');

  // 2. icon-192.png (192x192 transparent & maskable)
  await sharp(transparentSvg)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
  console.log('Created public/icon-192.png');

  // 3. icon-512.png (512x512 transparent)
  await sharp(transparentSvg)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
  console.log('Created public/icon-512.png');

  // 4. icon-maskable-192.png & 512.png (with dark background matching PWA theme)
  await sharp(darkMaskableSvg)
    .resize(192, 192)
    .png()
    .toFile('public/icon-maskable-192.png');
  await sharp(darkMaskableSvg)
    .resize(512, 512)
    .png()
    .toFile('public/icon-maskable-512.png');
  console.log('Created public maskable icons');

  // 5. apple-touch-icon.png (180x180 for iOS)
  await sharp(darkMaskableSvg)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('Created public/apple-touch-icon.png');

  // 6. favicon.png (48x48)
  await sharp(transparentSvg)
    .resize(48, 48)
    .png()
    .toFile('public/favicon.png');
  console.log('Created public/favicon.png');

  // Save the SVG as public/logo.svg and public/icon.svg
  fs.writeFileSync('public/logo.svg', createLogoSvg(20, null));
  fs.writeFileSync('public/icon.svg', createLogoSvg(20, null));
  console.log('Updated public/logo.svg and public/icon.svg');
}

main().catch(console.error);
