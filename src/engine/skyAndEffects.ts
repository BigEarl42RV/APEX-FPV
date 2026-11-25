/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import * as THREE from 'three';
import type { TrackBiome } from '../types/game';

export interface SkyBiomeTheme {
  zenith: number;
  horizon: number;
  sunGlow: number;
  cloudTint: number;
  sunDir: [number, number, number];
}

const SKY_THEMES: Record<TrackBiome, SkyBiomeTheme> = {
  alpine: {
    zenith: 0x1e4e8c,
    horizon: 0xbdd9f2,
    sunGlow: 0xffe4b5,
    cloudTint: 0xffffff,
    sunDir: [0.55, 0.45, 0.42],
  },
  coastal: {
    zenith: 0x0e5888,
    horizon: 0xb7e4f4,
    sunGlow: 0xfff3d1,
    cloudTint: 0xf8fafc,
    sunDir: [0.48, 0.42, -0.52],
  },
  desert: {
    zenith: 0x6b4f8c,
    horizon: 0xf3a86b,
    sunGlow: 0xffd18a,
    cloudTint: 0xffe6cc,
    sunDir: [-0.52, 0.28, 0.6],
  },
  urban: {
    zenith: 0x090d1a,
    horizon: 0x2c365e,
    sunGlow: 0xf59e0b,
    cloudTint: 0x64748b,
    sunDir: [-0.4, 0.22, -0.68],
  },
};

export interface AtmosphericSkyHandle {
  mesh: THREE.Mesh;
  update: (elapsedSec: number, biome: TrackBiome, showClouds: boolean) => void;
  dispose: () => void;
}

/**
 * Custom GLSL atmospheric sky dome with solar halo and animated procedural FBM clouds
 */
export function buildAtmosphericSkyDome(initialBiome: TrackBiome): AtmosphericSkyHandle {
  const theme = SKY_THEMES[initialBiome];
  const sunVec = new THREE.Vector3(...theme.sunDir).normalize();

  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uZenith: { value: new THREE.Color(theme.zenith) },
      uHorizon: { value: new THREE.Color(theme.horizon) },
      uSunGlow: { value: new THREE.Color(theme.sunGlow) },
      uCloudTint: { value: new THREE.Color(theme.cloudTint) },
      uSunDir: { value: sunVec },
      uCloudStrength: { value: 1.0 },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uSunGlow;
      uniform vec3 uCloudTint;
      uniform vec3 uSunDir;
      uniform float uCloudStrength;
      varying vec3 vWorldDir;

      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      float noise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise2D(p);
          p *= 2.05;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, 0.0, 1.0);

        // Smooth Rayleigh-style vertical gradient
        vec3 sky = mix(uHorizon, uZenith, pow(h, 0.55));

        // Solar disc + Mie atmospheric scatter halo
        float sunAmt = max(0.0, dot(dir, normalize(uSunDir)));
        sky += uSunGlow * pow(sunAmt, 10.0) * 0.42;
        sky += uSunGlow * smoothstep(0.9965, 0.9994, sunAmt) * 1.9;

        // Projected procedural cloud layer above horizon
        if (uCloudStrength > 0.05 && dir.y > 0.03) {
          vec2 cloudUv = dir.xz / (dir.y + 0.16) * 1.65;
          cloudUv += vec2(uTime * 0.018, uTime * 0.008);
          float c = fbm(cloudUv);
          float cloudMask = smoothstep(0.46, 0.78, c) * smoothstep(0.03, 0.24, dir.y);
          vec3 litCloud = mix(uCloudTint, uSunGlow, pow(sunAmt, 4.0) * 0.45);
          sky = mix(sky, litCloud, cloudMask * 0.58 * uCloudStrength);
        }

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });

  const geo = new THREE.SphereGeometry(620, 32, 20);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;

  return {
    mesh,
    update: (elapsedSec: number, biome: TrackBiome, showClouds: boolean) => {
      const next = SKY_THEMES[biome];
      mat.uniforms.uTime.value = elapsedSec;
      mat.uniforms.uZenith.value.setHex(next.zenith);
      mat.uniforms.uHorizon.value.setHex(next.horizon);
      mat.uniforms.uSunGlow.value.setHex(next.sunGlow);
      mat.uniforms.uCloudTint.value.setHex(next.cloudTint);
      mat.uniforms.uSunDir.value.set(...next.sunDir).normalize();
      mat.uniforms.uCloudStrength.value = showClouds ? 1.0 : 0.0;
    },
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}

export interface AnimatedWaterHandle {
  mesh: THREE.Mesh;
  update: (elapsedSec: number, cameraPos: THREE.Vector3) => void;
  dispose: () => void;
}

/**
 * Animated reflective GLSL basin water surface for coastal and alpine arenas
 */
export function buildReflectiveWaterPlane(
  biome: TrackBiome,
  waterY: number
): AnimatedWaterHandle {
  const deepColor = biome === 'coastal' ? 0x083344 : 0x0c2d48;
  const shallowColor = biome === 'coastal' ? 0x0ea5e9 : 0x38bdf8;

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uCamPos: { value: new THREE.Vector3() },
      uDeep: { value: new THREE.Color(deepColor) },
      uShallow: { value: new THREE.Color(shallowColor) },
      uSunDir: { value: new THREE.Vector3(0.5, 0.45, -0.5).normalize() },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uCamPos;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSunDir;
      varying vec3 vWorldPos;

      void main() {
        vec2 uv = vWorldPos.xz * 0.14;
        float w1 = sin(uv.x * 2.1 + uTime * 1.9) * cos(uv.y * 1.8 - uTime * 1.4);
        float w2 = sin((uv.x + uv.y) * 3.4 - uTime * 2.5);
        vec3 n = normalize(vec3((w1 + w2) * 0.06, 1.0, (w1 - w2) * 0.06));

        vec3 viewDir = normalize(uCamPos - vWorldPos);
        float fresnel = pow(1.0 - max(0.0, dot(viewDir, n)), 3.2);

        vec3 reflDir = reflect(-uSunDir, n);
        float spec = pow(max(0.0, dot(viewDir, reflDir)), 48.0);

        vec3 baseCol = mix(uDeep, uShallow, 0.35 + fresnel * 0.55);
        vec3 col = baseCol + vec3(1.0, 0.94, 0.8) * spec * 0.85;
        gl_FragColor = vec4(col, 0.82);
      }
    `,
  });

  const geo = new THREE.PlaneGeometry(660, 660, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = waterY;

  return {
    mesh,
    update: (elapsedSec: number, cameraPos: THREE.Vector3) => {
      mat.uniforms.uTime.value = elapsedSec;
      mat.uniforms.uCamPos.value.copy(cameraPos);
    },
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}

/**
 * Zero-GC Wingtip / Prop-Tip Ribbon Trail System
 */
export interface AeroRibbonHandle {
  group: THREE.Group;
  pushTipPositions: (
    leftPos: THREE.Vector3,
    rightPos: THREE.Vector3,
    intensity: number
  ) => void;
  reset: (pos: THREE.Vector3) => void;
  setColor: (hex: string) => void;
  dispose: () => void;
}

const TRAIL_SEGMENTS = 26;

function createSingleRibbon(colorHex: number): {
  mesh: THREE.Mesh;
  positions: Float32Array;
  alphas: Float32Array;
  history: THREE.Vector3[];
  geo: THREE.BufferGeometry;
  mat: THREE.ShaderMaterial;
} {
  const vertexCount = TRAIL_SEGMENTS * 2;
  const positions = new Float32Array(vertexCount * 3);
  const alphas = new Float32Array(vertexCount);
  const indices: number[] = [];

  for (let i = 0; i < TRAIL_SEGMENTS - 1; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  geo.setIndex(indices);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uOpacity: { value: 0.55 },
    },
    vertexShader: `
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor * 1.4, vAlpha * uOpacity);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;

  const history = Array.from({ length: TRAIL_SEGMENTS }, () => new THREE.Vector3());
  return { mesh, positions, alphas, history, geo, mat };
}

export function createAeroTrailSystem(initialHex: string): AeroRibbonHandle {
  const group = new THREE.Group();
  const colorNum = new THREE.Color(initialHex).getHex();
  const left = createSingleRibbon(colorNum);
  const right = createSingleRibbon(colorNum);
  group.add(left.mesh, right.mesh);

  const updateRibbonBuffer = (
    rib: ReturnType<typeof createSingleRibbon>,
    tip: THREE.Vector3,
    intensity: number
  ) => {
    for (let i = TRAIL_SEGMENTS - 1; i > 0; i--) {
      rib.history[i].copy(rib.history[i - 1]);
    }
    rib.history[0].copy(tip);

    const halfWidth = 0.032;
    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      const p = rib.history[i];
      const frac = 1 - i / (TRAIL_SEGMENTS - 1);
      const w = halfWidth * frac;

      const idx = i * 6;
      rib.positions[idx] = p.x - w;
      rib.positions[idx + 1] = p.y;
      rib.positions[idx + 2] = p.z;
      rib.positions[idx + 3] = p.x + w;
      rib.positions[idx + 4] = p.y;
      rib.positions[idx + 5] = p.z;

      const alphaVal = frac * frac * intensity;
      rib.alphas[i * 2] = alphaVal;
      rib.alphas[i * 2 + 1] = alphaVal;
    }

    (rib.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (rib.geo.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  };

  return {
    group,
    pushTipPositions: (leftPos, rightPos, intensity) => {
      updateRibbonBuffer(left, leftPos, intensity);
      updateRibbonBuffer(right, rightPos, intensity);
    },
    reset: (pos) => {
      for (let i = 0; i < TRAIL_SEGMENTS; i++) {
        left.history[i].copy(pos);
        right.history[i].copy(pos);
      }
      updateRibbonBuffer(left, pos, 0);
      updateRibbonBuffer(right, pos, 0);
    },
    setColor: (hex: string) => {
      left.mat.uniforms.uColor.value.set(hex);
      right.mat.uniforms.uColor.value.set(hex);
    },
    dispose: () => {
      left.geo.dispose();
      left.mat.dispose();
      right.geo.dispose();
      right.mat.dispose();
    },
  };
}

/**
 * Expanding Gate-Pass Shockwave Ring Pool
 */
export interface ShockwavePoolHandle {
  group: THREE.Group;
  spawn: (pos: THREE.Vector3, headingRad: number, isLapComplete: boolean) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

export function createGateShockwavePool(): ShockwavePoolHandle {
  const group = new THREE.Group();
  const poolSize = 6;
  const geo = new THREE.RingGeometry(2.6, 3.3, 36);

  const items = Array.from({ length: poolSize }, () => {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    group.add(mesh);
    return { mesh, mat, active: false, life: 0, maxLife: 0.45 };
  });

  return {
    group,
    spawn: (pos, headingRad, isLapComplete) => {
      const slot = items.find((x) => !x.active) ?? items[0];
      slot.active = true;
      slot.life = 0;
      slot.maxLife = isLapComplete ? 0.62 : 0.44;
      slot.mesh.visible = true;
      slot.mesh.position.copy(pos);
      slot.mesh.rotation.set(0, headingRad, 0);
      slot.mesh.scale.setScalar(1);
      slot.mat.color.setHex(isLapComplete ? 0x22d3ee : 0xf59e0b);
      slot.mat.opacity = 0.9;
    },
    update: (dt) => {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.active) continue;
        it.life += dt;
        const t = it.life / it.maxLife;
        if (t >= 1) {
          it.active = false;
          it.mesh.visible = false;
        } else {
          const ease = 1 - Math.pow(1 - t, 3);
          it.mesh.scale.setScalar(1 + ease * 2.4);
          it.mat.opacity = (1 - t) * 0.85;
        }
      }
    },
    dispose: () => {
      geo.dispose();
      items.forEach((it) => it.mat.dispose());
    },
  };
}

/**
 * Velocity Speed Lines Tunnel attached cleanly in camera-aligned space
 */
export interface SpeedLinesHandle {
  lines: THREE.LineSegments;
  update: (
    cameraPos: THREE.Vector3,
    cameraQuat: THREE.Quaternion,
    speedKmh: number,
    dt: number,
    enabled: boolean
  ) => void;
  dispose: () => void;
}

export function createSpeedLinesEffect(): SpeedLinesHandle {
  const count = 44;
  const positions = new Float32Array(count * 2 * 3);
  const radii = new Float32Array(count);
  const angles = new Float32Array(count);
  const zs = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    angles[i] = (i / count) * Math.PI * 2 + (i % 3) * 0.25;
    radii[i] = 2.6 + (i % 5) * 0.65;
    zs[i] = -Math.random() * 14 - 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;

  return {
    lines,
    update: (cameraPos, cameraQuat, speedKmh, dt, enabled) => {
      const intensity = enabled
        ? THREE.MathUtils.clamp((speedKmh - 100) / 115, 0, 1)
        : 0;

      if (intensity <= 0.02) {
        lines.visible = false;
        return;
      }

      lines.visible = true;
      lines.position.copy(cameraPos);
      lines.quaternion.copy(cameraQuat);
      mat.opacity = intensity * 0.34;

      const streakLen = 1.4 + intensity * 3.8;
      const moveSpeed = 24 + speedKmh * 0.35;

      for (let i = 0; i < count; i++) {
        zs[i] += moveSpeed * dt;
        if (zs[i] > 0.5) {
          zs[i] = -15 - Math.random() * 6;
        }
        const r = radii[i];
        const a = angles[i];
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        const z = zs[i];

        const idx = i * 6;
        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;
        positions[idx + 3] = x;
        positions[idx + 4] = y;
        positions[idx + 5] = z - streakLen;
      }
      (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    },
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}

/**
 * Holographic Translucent 3D Ghost Rival Quadcopter
 */
export interface GhostDroneHandle {
  root: THREE.Group;
  setModeColor: (isProTarget: boolean) => void;
  dispose: () => void;
}

export function buildGhostDroneMesh(): GhostDroneHandle {
  const root = new THREE.Group();

  const shellMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const bodyGeo = new THREE.BoxGeometry(0.18, 0.055, 0.28);
  const armGeo = new THREE.BoxGeometry(0.032, 0.018, 0.38);
  const ringGeo = new THREE.TorusGeometry(0.11, 0.014, 8, 20);
  ringGeo.rotateX(Math.PI / 2);

  const body = new THREE.Mesh(bodyGeo, shellMat);
  const arm1 = new THREE.Mesh(armGeo, shellMat);
  arm1.rotation.y = Math.PI * 0.25;
  const arm2 = new THREE.Mesh(armGeo, shellMat);
  arm2.rotation.y = -Math.PI * 0.25;
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.018, 8, 28),
    coreMat
  );
  halo.rotation.x = Math.PI / 2;

  root.add(body, arm1, arm2, halo);

  const offsets: [number, number][] = [
    [0.14, 0.14],
    [-0.14, 0.14],
    [0.14, -0.14],
    [-0.14, -0.14],
  ];
  offsets.forEach(([x, z]) => {
    const r = new THREE.Mesh(ringGeo, coreMat);
    r.position.set(x, 0.03, z);
    root.add(r);
  });

  root.visible = false;

  return {
    root,
    setModeColor: (isProTarget: boolean) => {
      shellMat.color.setHex(isProTarget ? 0x22d3ee : 0x34d399);
      coreMat.color.setHex(isProTarget ? 0xf59e0b : 0xa7f3d0);
    },
    dispose: () => {
      bodyGeo.dispose();
      armGeo.dispose();
      ringGeo.dispose();
      halo.geometry.dispose();
      shellMat.dispose();
      coreMat.dispose();
    },
  };
}
