import * as THREE from 'three';
import type { TrackBiome } from '../types/game';

/**
 * Procedural carbon fiber weave albedo + bump CanvasTexture (zero external 404s)
 */
export function createCarbonFiberTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 128;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const cell = 16;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const alt = ((x / cell + y / cell) & 1) === 0;
      cCtx.fillStyle = alt ? '#1f1f24' : '#111115';
      cCtx.fillRect(x, y, cell, cell);
      cCtx.fillStyle = alt ? '#2c2c34' : '#18181d';
      cCtx.fillRect(x + 2, y + 2, cell - 4, cell - 4);

      bCtx.fillStyle = alt ? '#c8c8c8' : '#585858';
      bCtx.fillRect(x, y, cell, cell);
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 4);
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 4);
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

/**
 * Procedural racing gate chevron banner texture
 */
export function createGateBannerTexture(
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, 512, 128);

  // Diagonal racing chevrons
  ctx.fillStyle = accentHex;
  for (let x = -64; x < 560; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 28, 0);
    ctx.lineTo(x + 56, 64);
    ctx.lineTo(x + 28, 128);
    ctx.lineTo(x, 128);
    ctx.lineTo(x + 28, 64);
    ctx.closePath();
    ctx.fill();
  }

  // Crisp top & bottom trim lines
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 6, 512, 5);
  ctx.fillRect(0, 117, 512, 5);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Procedural biome terrain texture with micro-grit & contour grid lines
 */
export function createBiomeTerrainTexture(
  biome: TrackBiome,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const palette: Record<
    TrackBiome,
    { base: string; speckA: string; speckB: string; grid: string }
  > = {
    alpine: {
      base: '#2b4232',
      speckA: '#35523d',
      speckB: '#213326',
      grid: 'rgba(255,255,255,0.04)',
    },
    coastal: {
      base: '#2f4542',
      speckA: '#3b5752',
      speckB: '#243633',
      grid: 'rgba(255,255,255,0.05)',
    },
    desert: {
      base: '#7c5338',
      speckA: '#946343',
      speckB: '#613f29',
      grid: 'rgba(255,230,180,0.05)',
    },
    urban: {
      base: '#25272d',
      speckA: '#31343c',
      speckB: '#1b1d22',
      grid: 'rgba(245,158,11,0.08)',
    },
  };

  const p = palette[biome];
  ctx.fillStyle = p.base;
  ctx.fillRect(0, 0, size, size);

  // Micro surface grain
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 3.5;
    ctx.fillStyle = i % 2 === 0 ? p.speckA : p.speckB;
    ctx.fillRect(x, y, r, r);
  }

  // Subtle spatial distance grid
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Soft radial contact shadow canvas texture
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    4,
    size / 2,
    size / 2,
    size / 2
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
