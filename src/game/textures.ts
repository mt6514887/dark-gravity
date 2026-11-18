import * as THREE from 'three';

export interface TextureBundle {
  stationFloor: THREE.CanvasTexture;
  factoryFloor: THREE.CanvasTexture;
  labFloor: THREE.CanvasTexture;
  alienFloor: THREE.CanvasTexture;
  coreFloor: THREE.CanvasTexture;
  wallMetal: THREE.CanvasTexture;
  hazardTrim: THREE.CanvasTexture;
  glowCyan: THREE.CanvasTexture;
  glowOrange: THREE.CanvasTexture;
  glowRed: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w = 256, h = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAniso: number
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  return tex;
}

function createGlowSpriteTexture(innerColor: string, midColor: string): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 128);
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.2, innerColor);
  grad.addColorStop(0.55, midColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createProceduralTextures(maxAniso: number): TextureBundle {
  // 1. Space Station metallic deck plating
  const [sfC, sfCtx] = makeCanvas(256, 256);
  sfCtx.fillStyle = '#18202c';
  sfCtx.fillRect(0, 0, 256, 256);
  sfCtx.strokeStyle = '#273549';
  sfCtx.lineWidth = 3;
  sfCtx.strokeRect(4, 4, 248, 248);
  sfCtx.strokeRect(64, 64, 128, 128);
  sfCtx.fillStyle = '#0f172a';
  for (let x = 16; x < 256; x += 64) {
    for (let y = 16; y < 256; y += 64) {
      sfCtx.fillRect(x, y, 6, 6);
    }
  }
  sfCtx.fillStyle = 'rgba(56, 189, 248, 0.28)';
  sfCtx.fillRect(0, 125, 256, 4);

  // 2. Industrial Factory riveted grate + amber lines
  const [ffC, ffCtx] = makeCanvas(256, 256);
  ffCtx.fillStyle = '#1d1917';
  ffCtx.fillRect(0, 0, 256, 256);
  ffCtx.strokeStyle = '#332924';
  ffCtx.lineWidth = 2;
  for (let i = 0; i < 256; i += 32) {
    ffCtx.beginPath();
    ffCtx.moveTo(i, 0);
    ffCtx.lineTo(i, 256);
    ffCtx.stroke();
    ffCtx.beginPath();
    ffCtx.moveTo(0, i);
    ffCtx.lineTo(256, i);
    ffCtx.stroke();
  }
  ffCtx.fillStyle = 'rgba(245, 158, 11, 0.3)';
  ffCtx.fillRect(0, 8, 256, 6);
  ffCtx.fillRect(0, 242, 256, 6);

  // 3. Underground Research Lab hex tiles
  const [lfC, lfCtx] = makeCanvas(256, 256);
  lfCtx.fillStyle = '#0f1923';
  lfCtx.fillRect(0, 0, 256, 256);
  lfCtx.strokeStyle = '#1e3246';
  lfCtx.lineWidth = 2;
  for (let y = 0; y < 256; y += 64) {
    for (let x = 0; x < 256; x += 64) {
      lfCtx.strokeRect(x + 2, y + 2, 60, 60);
    }
  }
  lfCtx.fillStyle = 'rgba(34, 211, 238, 0.25)';
  lfCtx.fillRect(124, 0, 8, 256);

  // 4. Alien Planet basalt & glowing veins
  const [afC, afCtx] = makeCanvas(256, 256);
  afCtx.fillStyle = '#1a1423';
  afCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) {
    const rx = Math.random() * 256;
    const ry = Math.random() * 256;
    const r = 4 + Math.random() * 14;
    afCtx.fillStyle = i % 5 === 0 ? 'rgba(249, 115, 22, 0.14)' : 'rgba(46, 32, 66, 0.45)';
    afCtx.beginPath();
    afCtx.arc(rx, ry, r, 0, Math.PI * 2);
    afCtx.fill();
  }

  // 5. Dark Gravity Core obsidian circuit floor
  const [cfC, cfCtx] = makeCanvas(256, 256);
  cfCtx.fillStyle = '#0a0b14';
  cfCtx.fillRect(0, 0, 256, 256);
  cfCtx.strokeStyle = '#1e223b';
  cfCtx.lineWidth = 3;
  cfCtx.strokeRect(8, 8, 240, 240);
  cfCtx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
  cfCtx.lineWidth = 2;
  cfCtx.beginPath();
  cfCtx.moveTo(0, 128);
  cfCtx.lineTo(96, 128);
  cfCtx.lineTo(128, 96);
  cfCtx.lineTo(160, 128);
  cfCtx.lineTo(256, 128);
  cfCtx.stroke();

  // 6. Wall bulkhead paneling
  const [wmC, wmCtx] = makeCanvas(256, 256);
  wmCtx.fillStyle = '#1e2634';
  wmCtx.fillRect(0, 0, 256, 256);
  wmCtx.fillStyle = '#141a24';
  wmCtx.fillRect(10, 10, 236, 108);
  wmCtx.fillRect(10, 134, 236, 112);
  wmCtx.strokeStyle = '#334155';
  wmCtx.lineWidth = 3;
  wmCtx.strokeRect(10, 10, 236, 108);
  wmCtx.strokeRect(10, 134, 236, 112);
  wmCtx.fillStyle = '#475569';
  wmCtx.fillRect(20, 20, 16, 4);
  wmCtx.fillRect(220, 20, 16, 4);

  // 7. Industrial Hazard Stripes
  const [hzC, hzCtx] = makeCanvas(128, 128);
  hzCtx.fillStyle = '#18181b';
  hzCtx.fillRect(0, 0, 128, 128);
  hzCtx.fillStyle = '#f59e0b';
  for (let i = -128; i < 256; i += 32) {
    hzCtx.beginPath();
    hzCtx.moveTo(i, 0);
    hzCtx.lineTo(i + 16, 0);
    hzCtx.lineTo(i + 144, 128);
    hzCtx.lineTo(i + 128, 128);
    hzCtx.closePath();
    hzCtx.fill();
  }

  const stationFloor = finalizeTexture(sfC, 16, 16, maxAniso);
  const factoryFloor = finalizeTexture(ffC, 16, 16, maxAniso);
  const labFloor = finalizeTexture(lfC, 16, 16, maxAniso);
  const alienFloor = finalizeTexture(afC, 14, 14, maxAniso);
  const coreFloor = finalizeTexture(cfC, 14, 14, maxAniso);
  const wallMetal = finalizeTexture(wmC, 2, 1, maxAniso);
  const hazardTrim = finalizeTexture(hzC, 4, 1, maxAniso);

  const glowCyan = createGlowSpriteTexture('rgba(56, 189, 248, 0.85)', 'rgba(6, 182, 212, 0.25)');
  const glowOrange = createGlowSpriteTexture('rgba(251, 146, 60, 0.9)', 'rgba(245, 158, 11, 0.25)');
  const glowRed = createGlowSpriteTexture('rgba(248, 113, 113, 0.9)', 'rgba(239, 68, 68, 0.28)');

  return {
    stationFloor,
    factoryFloor,
    labFloor,
    alienFloor,
    coreFloor,
    wallMetal,
    hazardTrim,
    glowCyan,
    glowOrange,
    glowRed,
    dispose: () => {
      stationFloor.dispose();
      factoryFloor.dispose();
      labFloor.dispose();
      alienFloor.dispose();
      coreFloor.dispose();
      wallMetal.dispose();
      hazardTrim.dispose();
      glowCyan.dispose();
      glowOrange.dispose();
      glowRed.dispose();
    },
  };
}
