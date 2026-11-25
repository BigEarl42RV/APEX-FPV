/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import type { GateDef, TrackBiome, TrackDef, TrackObstacle } from '../types/game';

/**
 * Deterministic seeded PRNG for consistent procedural terrains
 */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Continuous height query so physics, terrain mesh, trees, and gates all align cleanly.
 */
export function sampleTrackTerrainHeight(
  x: number,
  z: number,
  track: TrackDef
): number {
  const s = track.terrainScale;
  const r = track.terrainRelief;
  const seedOffset = (track.terrainSeed % 1000) * 0.13;

  // Multi-octave trigonometric terrain + real elevation profile modulation when available
  const wave1 = Math.sin(x * s + seedOffset) * Math.cos(z * s * 0.9 - seedOffset);
  const wave2 = Math.sin((x + z) * s * 1.85 + seedOffset * 2.1) * 0.42;
  const wave3 = Math.cos((x * 2.4 - z * 1.9) * s + seedOffset * 0.7) * 0.18;

  let baseH = (wave1 + wave2 + wave3) * r;

  // If built from Google Maps ElevationService data, modulate terrain height smoothly
  // along radial/azimuthal projection of the sampled elevation profile
  if (track.elevationProfileM && track.elevationProfileM.length >= 2) {
    const prof = track.elevationProfileM;
    const minE = track.minElevationM ?? Math.min(...prof);
    const maxE = track.maxElevationM ?? Math.max(...prof);
    const span = Math.max(1, maxE - minE);
    // Map world angle around origin to elevation sample index
    const angle = Math.atan2(z, x); // -PI..PI
    const norm = (angle + Math.PI) / (Math.PI * 2);
    const fIdx = norm * (prof.length - 1);
    const i0 = Math.floor(fIdx);
    const i1 = Math.min(prof.length - 1, i0 + 1);
    const frac = fIdx - i0;
    const elevSample = prof[i0] * (1 - frac) + prof[i1] * frac;
    const normalizedElev = (elevSample - minE) / span; // 0..1
    const reliefClamp = Math.min(28, Math.max(4, span * 0.25));
    const radialBlend = Math.min(1, Math.hypot(x, z) / 260);
    baseH = baseH * 0.35 + (normalizedElev * reliefClamp) * (0.4 + 0.6 * radialBlend);
  }

  // Keep start pad area (around first gate / origin) relatively level for clean takeoffs
  const distOrigin = Math.hypot(x, z);
  const startFlatten = Math.min(1, Math.max(0, (distOrigin - 18) / 35));
  // Natural perimeter rim rise outside 220m so outdoor arena never floats in a void
  const rimDist = Math.max(0, distOrigin - 220);
  const rimRise = Math.pow(rimDist * 0.025, 1.55) * 3.8;

  return Math.max(0, baseH * startFlatten + rimRise);
}

function createLoopGates(
  points: Array<{ x: number; z: number; altOffset: number; type: GateDef['type'] }>,
  trackStub: Pick<TrackDef, 'terrainSeed' | 'terrainScale' | 'terrainRelief' | 'elevationProfileM' | 'minElevationM' | 'maxElevationM'>
): GateDef[] {
  const fullStub = {
    ...trackStub,
    id: '',
    name: '',
    locationLabel: '',
    biome: 'alpine' as TrackBiome,
    source: 'builtin' as const,
    lapCount: 3,
    parTimeSec: 60,
    gates: [],
    obstacles: [],
  };

  return points.map((pt, idx) => {
    const next = points[(idx + 1) % points.length];
    const headingRad = Math.atan2(next.x - pt.x, next.z - pt.z);
    const groundY = sampleTrackTerrainHeight(pt.x, pt.z, fullStub);
    return {
      id: idx + 1,
      position: [pt.x, groundY + pt.altOffset, pt.z],
      headingRad,
      width: pt.type === 'ring' ? 9.5 : 11,
      height: pt.type === 'ring' ? 9.5 : 8.5,
      type: pt.type,
    };
  });
}

function generateTrackObstacles(
  seed: number,
  gates: GateDef[],
  biome: TrackBiome,
  count: number
): TrackObstacle[] {
  const rand = mulberry32(seed);
  const obstacles: TrackObstacle[] = [];
  let attempts = 0;

  while (obstacles.length < count && attempts < count * 8) {
    attempts++;
    const angle = rand() * Math.PI * 2;
    const radius = 26 + rand() * 210;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Never block any gate flight corridor
    let clear = true;
    for (const g of gates) {
      const d = Math.hypot(x - g.position[0], z - g.position[2]);
      if (d < 16) {
        clear = false;
        break;
      }
    }
    if (!clear) continue;

    const kindRoll = rand();
    let kind: TrackObstacle['kind'] = 'pylon';
    if (biome === 'alpine' || biome === 'coastal') {
      kind = kindRoll < 0.65 ? 'tree' : kindRoll < 0.85 ? 'rock' : 'pylon';
    } else if (biome === 'desert') {
      kind = kindRoll < 0.6 ? 'rock' : kindRoll < 0.85 ? 'tower' : 'pylon';
    } else {
      kind = kindRoll < 0.45 ? 'tower' : kindRoll < 0.85 ? 'pylon' : 'tree';
    }

    obstacles.push({
      x,
      z,
      radius: kind === 'tree' ? 2.4 + rand() * 1.4 : kind === 'rock' ? 3.2 + rand() * 2.8 : 1.8 + rand() * 1.6,
      height: kind === 'tower' ? 16 + rand() * 18 : kind === 'tree' ? 9 + rand() * 8 : kind === 'rock' ? 4 + rand() * 6 : 10 + rand() * 7,
      kind,
    });
  }

  return obstacles;
}

const ALPINE_STUB = {
  terrainSeed: 1042,
  terrainScale: 0.014,
  terrainRelief: 6.5,
};
const ALPINE_GATES = createLoopGates(
  [
    { x: 0, z: 32, altOffset: 5.5, type: 'arch' },
    { x: 42, z: 86, altOffset: 8.0, type: 'arch' },
    { x: 108, z: 102, altOffset: 14.0, type: 'ring' },
    { x: 152, z: 54, altOffset: 19.0, type: 'dive' },
    { x: 126, z: -24, altOffset: 7.5, type: 'split' },
    { x: 64, z: -78, altOffset: 11.0, type: 'ring' },
    { x: -18, z: -96, altOffset: 15.0, type: 'arch' },
    { x: -86, z: -52, altOffset: 9.0, type: 'ring' },
    { x: -94, z: 18, altOffset: 6.5, type: 'arch' },
    { x: -46, z: 10, altOffset: 5.0, type: 'split' },
  ],
  ALPINE_STUB
);

const URBAN_STUB = {
  terrainSeed: 2291,
  terrainScale: 0.011,
  terrainRelief: 1.8,
};
const URBAN_GATES = createLoopGates(
  [
    { x: 0, z: 28, altOffset: 5.0, type: 'arch' },
    { x: 52, z: 68, altOffset: 6.5, type: 'split' },
    { x: 96, z: 22, altOffset: 16.0, type: 'dive' },
    { x: 92, z: -46, altOffset: 7.0, type: 'ring' },
    { x: 34, z: -92, altOffset: 12.0, type: 'arch' },
    { x: -38, z: -84, altOffset: 8.5, type: 'ring' },
    { x: -92, z: -24, altOffset: 14.5, type: 'dive' },
    { x: -64, z: 42, altOffset: 6.0, type: 'arch' },
  ],
  URBAN_STUB
);

const DESERT_STUB = {
  terrainSeed: 4077,
  terrainScale: 0.012,
  terrainRelief: 9.2,
};
const DESERT_GATES = createLoopGates(
  [
    { x: 0, z: 34, altOffset: 5.5, type: 'arch' },
    { x: 64, z: 98, altOffset: 12.0, type: 'ring' },
    { x: 144, z: 72, altOffset: 20.0, type: 'dive' },
    { x: 156, z: -18, altOffset: 9.5, type: 'split' },
    { x: 92, z: -102, altOffset: 13.0, type: 'ring' },
    { x: -10, z: -124, altOffset: 17.5, type: 'dive' },
    { x: -104, z: -76, altOffset: 9.0, type: 'arch' },
    { x: -116, z: 18, altOffset: 11.0, type: 'ring' },
    { x: -58, z: 74, altOffset: 6.5, type: 'arch' },
  ],
  DESERT_STUB
);

const COASTAL_STUB = {
  terrainSeed: 6814,
  terrainScale: 0.0115,
  terrainRelief: 5.4,
};
const COASTAL_GATES = createLoopGates(
  [
    { x: 0, z: 30, altOffset: 5.2, type: 'arch' },
    { x: 56, z: 84, altOffset: 8.5, type: 'split' },
    { x: 128, z: 74, altOffset: 14.5, type: 'ring' },
    { x: 148, z: 0, altOffset: 19.5, type: 'dive' },
    { x: 110, z: -78, altOffset: 8.0, type: 'arch' },
    { x: 34, z: -114, altOffset: 11.5, type: 'ring' },
    { x: -52, z: -98, altOffset: 16.0, type: 'dive' },
    { x: -116, z: -36, altOffset: 8.5, type: 'split' },
    { x: -104, z: 38, altOffset: 7.0, type: 'ring' },
    { x: -48, z: 54, altOffset: 5.5, type: 'arch' },
  ],
  COASTAL_STUB
);

export const BUILTIN_TRACKS: TrackDef[] = [
  {
    id: 'alpine-ridge',
    name: 'Alpine Timberline GP',
    locationLabel: 'Highland Training Grounds',
    biome: 'alpine',
    source: 'builtin',
    lapCount: 3,
    parTimeSec: 68,
    gates: ALPINE_GATES,
    obstacles: generateTrackObstacles(1042, ALPINE_GATES, 'alpine', 58),
    ...ALPINE_STUB,
  },
  {
    id: 'concrete-docks',
    name: 'Apex Pro Pylon Circuit',
    locationLabel: 'Industrial Test Airfield',
    biome: 'urban',
    source: 'builtin',
    lapCount: 3,
    parTimeSec: 54,
    gates: URBAN_GATES,
    obstacles: generateTrackObstacles(2291, URBAN_GATES, 'urban', 42),
    ...URBAN_STUB,
  },
  {
    id: 'redrock-canyon',
    name: 'Redrock Mesa Run',
    locationLabel: 'Sandstone Canyon Sector',
    biome: 'desert',
    source: 'builtin',
    lapCount: 3,
    parTimeSec: 72,
    gates: DESERT_GATES,
    obstacles: generateTrackObstacles(4077, DESERT_GATES, 'desert', 48),
    ...DESERT_STUB,
  },
  {
    id: 'coastal-harbor',
    name: 'Coastal Harbor GP',
    locationLabel: 'Pacific Breakwater Arena',
    biome: 'coastal',
    source: 'builtin',
    lapCount: 3,
    parTimeSec: 64,
    gates: COASTAL_GATES,
    obstacles: generateTrackObstacles(6814, COASTAL_GATES, 'coastal', 44),
    ...COASTAL_STUB,
  },
];

/**
 * Converts real-world Google Maps LatLng waypoints + ElevationService samples into a playable 3D FPV race track!
 */
export function buildTrackFromGoogleMaps(params: {
  name: string;
  locationLabel: string;
  center: { lat: number; lng: number };
  waypoints: Array<{ lat: number; lng: number }>;
  elevationProfileM: number[];
  biome?: TrackBiome;
}): TrackDef {
  const { name, locationLabel, center, waypoints, elevationProfileM } = params;
  const minE = elevationProfileM.length > 0 ? Math.min(...elevationProfileM) : 0;
  const maxE = elevationProfileM.length > 0 ? Math.max(...elevationProfileM) : 10;
  const elevSpan = Math.max(1, maxE - minE);

  // Choose biome automatically based on real elevation relief unless overridden
  const biome: TrackBiome =
    params.biome ??
    (elevSpan > 45 ? 'alpine' : elevSpan > 15 ? 'desert' : maxE < 25 ? 'coastal' : 'urban');

  // Project lat/lng waypoints into local meters relative to center
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((center.lat * Math.PI) / 180);

  let projected = waypoints.map((wp) => ({
    x: (wp.lng - center.lng) * metersPerDegLng,
    z: -(wp.lat - center.lat) * metersPerDegLat,
  }));

  // Normalize circuit scale so any user-drawn real-world loop fits comfortably inside the 3D arena (radius ~60m..175m)
  const maxDist = Math.max(
    10,
    ...projected.map((p) => Math.hypot(p.x, p.z))
  );
  const targetRadius = Math.min(165, Math.max(75, maxDist));
  const scaleFactor = targetRadius / maxDist;
  projected = projected.map((p) => ({
    x: p.x * scaleFactor,
    z: p.z * scaleFactor,
  }));

  // Ensure start area near first gate is approachable from origin
  const seed = Math.abs(Math.round((center.lat * 1000 + center.lng * 1000) * 17)) % 99999;
  const relief = Math.min(14, Math.max(2.5, elevSpan * 0.18));
  const stub = {
    terrainSeed: seed || 777,
    terrainScale: 0.013,
    terrainRelief: relief,
    elevationProfileM,
    minElevationM: minE,
    maxElevationM: maxE,
  };

  const gateDefs: GateDef[] = projected.map((pt, idx) => {
    const next = projected[(idx + 1) % projected.length];
    const headingRad = Math.atan2(next.x - pt.x, next.z - pt.z);
    const sampleIdx = Math.min(
      elevationProfileM.length - 1,
      Math.floor((idx / Math.max(1, projected.length)) * elevationProfileM.length)
    );
    const localElev =
      elevationProfileM.length > 0 ? elevationProfileM[sampleIdx] - minE : 0;
    const altOffset = 6.0 + Math.min(14, (localElev / elevSpan) * 10) + (idx % 3 === 2 ? 4 : 0);

    const groundY = sampleTrackTerrainHeight(pt.x, pt.z, {
      ...stub,
      id: 'tmp',
      name,
      locationLabel,
      biome,
      source: 'google-maps',
      lapCount: 3,
      parTimeSec: 65,
      gates: [],
      obstacles: [],
    });

    const gateTypes: GateDef['type'][] = ['arch', 'ring', 'dive', 'split'];
    return {
      id: idx + 1,
      position: [pt.x, groundY + altOffset, pt.z],
      headingRad,
      width: 11.5,
      height: 9.0,
      type: idx === 0 ? 'arch' : gateTypes[idx % gateTypes.length],
    };
  });

  // Compute total loop length for realistic par time
  let loopMeters = 0;
  for (let i = 0; i < gateDefs.length; i++) {
    const a = gateDefs[i].position;
    const b = gateDefs[(i + 1) % gateDefs.length].position;
    loopMeters += Math.hypot(b[0] - a[0], b[2] - a[2]);
  }
  const parTimeSec = Math.max(35, Math.round((loopMeters * 3) / 34));

  return {
    id: `gmaps-${seed}`,
    name,
    locationLabel,
    biome,
    source: 'google-maps',
    centerLatLng: center,
    waypointsLatLng: waypoints,
    lapCount: 3,
    parTimeSec,
    gates: gateDefs,
    obstacles: generateTrackObstacles(seed || 777, gateDefs, biome, 46),
    ...stub,
  };
}
