/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import * as THREE from 'three';
import type {
  CareerMedalTier,
  FirmwareLevel,
  GhostKeyframe,
  GhostRecording,
  GoggleFeedMode,
  HudModuleId,
  SoftwareLoadout,
  SponsorContract,
  TrackDef,
} from '../types/game';
import { sampleTrackTerrainHeight } from './tracks';

export interface FirmwareSpec {
  level: FirmwareLevel;
  name: string;
  tag: string;
  detail: string;
  cost: number;
  pidBoost: number;
  propwashDamping: number;
}

export const FIRMWARE_CATALOG: FirmwareSpec[] = [
  {
    level: 0,
    name: 'StratumOS 2kHz Stock',
    tag: '2KHZ',
    detail: 'Standard baseline gyro loop with soft low-pass filtering.',
    cost: 0,
    pidBoost: 0,
    propwashDamping: 0,
  },
  {
    level: 1,
    name: 'BetaTrack 4kHz Notch',
    tag: '4KHZ NOTCH',
    detail: 'Dynamic gyro notch filter cuts high-G corner propwash bounce (+14% lock).',
    cost: 380,
    pidBoost: 0.14,
    propwashDamping: 0.35,
  },
  {
    level: 2,
    name: 'ApexPro 8kHz RPM DShot',
    tag: '8KHZ RPM',
    detail: 'Bi-directional DShot RPM telemetry + zero-phase feedforward (+28% lock).',
    cost: 860,
    pidBoost: 0.28,
    propwashDamping: 0.72,
  },
];

export interface HudModuleSpec {
  id: HudModuleId;
  name: string;
  detail: string;
  cost: number;
}

export const HUD_MODULES_CATALOG: HudModuleSpec[] = [
  {
    id: 'racingLine3d',
    name: '3D Optimal Racing Line',
    detail: 'Projects a glowing Catmull-Rom flight spline through upcoming gates.',
    cost: 340,
  },
  {
    id: 'gateRadar',
    name: 'Corner Gate Radar',
    detail: 'Dynamic reticle arc indicating off-axis gate azimuth and climb angle.',
    cost: 420,
  },
  {
    id: 'blackboxGhostDelta',
    name: 'Blackbox Ghost Delta',
    detail: 'Real-time millisecond gap and range telemetry against the 3D Ghost Rival.',
    cost: 520,
  },
];

export interface GoggleFeedSpec {
  mode: GoggleFeedMode;
  name: string;
  tag: string;
  detail: string;
  cost: number;
}

export const GOGGLE_FEED_CATALOG: GoggleFeedSpec[] = [
  {
    mode: 'digital-hd',
    name: 'Digital HD 60fps',
    tag: 'HD LINK',
    detail: 'Clean wide-dynamic-range low-latency digital FPV optical link.',
    cost: 0,
  },
  {
    mode: 'action-raw',
    name: '4K Action Raw',
    tag: '4K RAW',
    detail: 'Boosted cinema tone-mapping and crisp horizon sharpening.',
    cost: 460,
  },
  {
    mode: 'analog-raceband',
    name: 'Analog 5.8GHz Raceband',
    tag: '5.8G R4',
    detail: 'Classic sub-5ms analog link with toggleable CRT scanline & RSSI OSD.',
    cost: 320,
  },
];

export function createDefaultSoftwareLoadout(): SoftwareLoadout {
  return {
    firmwareLevel: 0,
    unlockedFirmwareLevel: 0,
    unlockedHudModules: ['racingLine3d'],
    enabledHudModules: {
      racingLine3d: true,
      gateRadar: false,
      blackboxGhostDelta: false,
    },
    unlockedGoggleModes: ['digital-hd'],
    goggleMode: 'digital-hd',
    analogFxEnabled: true,
  };
}

export function normalizeSoftwareLoadout(raw?: Partial<SoftwareLoadout>): SoftwareLoadout {
  const def = createDefaultSoftwareLoadout();
  if (!raw) return def;

  const unlockedHud = Array.isArray(raw.unlockedHudModules)
    ? Array.from(new Set<HudModuleId>(['racingLine3d', ...raw.unlockedHudModules]))
    : def.unlockedHudModules;
  const unlockedGoggles = Array.isArray(raw.unlockedGoggleModes)
    ? Array.from(new Set<GoggleFeedMode>(['digital-hd', ...raw.unlockedGoggleModes]))
    : def.unlockedGoggleModes;

  const unlockedFw: FirmwareLevel =
    raw.unlockedFirmwareLevel === 2 || raw.unlockedFirmwareLevel === 1 ? raw.unlockedFirmwareLevel : 0;
  const activeFw: FirmwareLevel =
    raw.firmwareLevel === 2 && unlockedFw >= 2
      ? 2
      : raw.firmwareLevel === 1 && unlockedFw >= 1
        ? 1
        : 0;

  return {
    firmwareLevel: activeFw,
    unlockedFirmwareLevel: unlockedFw,
    unlockedHudModules: unlockedHud,
    enabledHudModules: {
      racingLine3d:
        unlockedHud.includes('racingLine3d') &&
        (raw.enabledHudModules?.racingLine3d ?? true),
      gateRadar:
        unlockedHud.includes('gateRadar') &&
        (raw.enabledHudModules?.gateRadar ?? false),
      blackboxGhostDelta:
        unlockedHud.includes('blackboxGhostDelta') &&
        (raw.enabledHudModules?.blackboxGhostDelta ?? false),
    },
    unlockedGoggleModes: unlockedGoggles,
    goggleMode: unlockedGoggles.includes(raw.goggleMode ?? 'digital-hd')
      ? (raw.goggleMode ?? 'digital-hd')
      : 'digital-hd',
    analogFxEnabled: raw.analogFxEnabled ?? true,
  };
}

// ---------------- Career Medals System ----------------

export const MEDAL_ORDER: CareerMedalTier[] = [
  'none',
  'bronze',
  'silver',
  'gold',
  'ace',
];

export const MEDAL_LABELS: Record<CareerMedalTier, string> = {
  none: 'Unranked',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  ace: 'Ace',
};

export const MEDAL_BONUS_CREDITS: Record<CareerMedalTier, number> = {
  none: 0,
  bronze: 120,
  silver: 240,
  gold: 450,
  ace: 800,
};

export function getMedalThresholdsMs(parTimeSec: number): {
  bronze: number;
  silver: number;
  gold: number;
  ace: number;
} {
  const parMs = parTimeSec * 1000;
  return {
    bronze: Math.round(parMs * 1.2),
    silver: Math.round(parMs * 1.0),
    gold: Math.round(parMs * 0.86),
    ace: Math.round(parMs * 0.76),
  };
}

export function evaluateMedalTier(
  totalTimeMs: number,
  parTimeSec: number
): CareerMedalTier {
  const t = getMedalThresholdsMs(parTimeSec);
  if (totalTimeMs <= t.ace) return 'ace';
  if (totalTimeMs <= t.gold) return 'gold';
  if (totalTimeMs <= t.silver) return 'silver';
  if (totalTimeMs <= t.bronze) return 'bronze';
  return 'none';
}

export function isHigherMedal(
  nextMedal: CareerMedalTier,
  prevMedal: CareerMedalTier
): boolean {
  return MEDAL_ORDER.indexOf(nextMedal) > MEDAL_ORDER.indexOf(prevMedal);
}

export function getNextTargetMedal(
  currentMedal: CareerMedalTier
): Exclude<CareerMedalTier, 'none'> {
  switch (currentMedal) {
    case 'none':
      return 'bronze';
    case 'bronze':
      return 'silver';
    case 'silver':
      return 'gold';
    case 'gold':
    case 'ace':
      return 'ace';
  }
}

// ---------------- Sponsor Contracts System ----------------

interface ContractTemplate {
  sponsorName: string;
  title: string;
  description: string;
  objectiveType: SponsorContract['objectiveType'];
  targetValue: number;
  rewardCredits: number;
}

const CONTRACT_POOL: ContractTemplate[] = [
  {
    sponsorName: 'Stratum Aero',
    title: 'Clean Gate Precision',
    description: 'Thread 22 race gates cleanly across any circuits.',
    objectiveType: 'clean_gates',
    targetValue: 22,
    rewardCredits: 320,
  },
  {
    sponsorName: 'Redline LiPo',
    title: 'Terminal Dive Velocity',
    description: 'Hit 145 km/h peak airspeed during a timed race.',
    objectiveType: 'high_speed_kmh',
    targetValue: 145,
    rewardCredits: 280,
  },
  {
    sponsorName: 'Apex Carbon',
    title: 'Par-Beating Pace',
    description: 'Beat circuit Par time on any race run.',
    objectiveType: 'beat_par',
    targetValue: 1,
    rewardCredits: 350,
  },
  {
    sponsorName: 'Vector VTX',
    title: 'Circuit Endurance',
    description: 'Complete 3 full multi-lap races on any tracks.',
    objectiveType: 'finish_races',
    targetValue: 3,
    rewardCredits: 340,
  },
  {
    sponsorName: 'Kestrel Labs',
    title: 'Gold Standard Pilot',
    description: 'Earn a Gold or Ace Career Medal on any circuit.',
    objectiveType: 'gold_medal',
    targetValue: 1,
    rewardCredits: 520,
  },
  {
    sponsorName: 'Helios Propulsion',
    title: 'Mach Gate Marathon',
    description: 'Pass 45 gates cleanly across championship or map runs.',
    objectiveType: 'clean_gates',
    targetValue: 45,
    rewardCredits: 560,
  },
  {
    sponsorName: 'Stratum Works',
    title: 'Mach-2 Overdrive',
    description: 'Reach 175 km/h in live competition.',
    objectiveType: 'high_speed_kmh',
    targetValue: 175,
    rewardCredits: 480,
  },
];

let contractSeq = 1;

function instantiateContract(tpl: ContractTemplate): SponsorContract {
  contractSeq++;
  return {
    id: `contract-${Date.now()}-${contractSeq}-${Math.random().toString(36).slice(2, 5)}`,
    sponsorName: tpl.sponsorName,
    title: tpl.title,
    description: tpl.description,
    objectiveType: tpl.objectiveType,
    targetValue: tpl.targetValue,
    progressValue: 0,
    rewardCredits: tpl.rewardCredits,
    completed: false,
  };
}

export function createInitialSponsorContracts(): SponsorContract[] {
  return [
    instantiateContract(CONTRACT_POOL[0]),
    instantiateContract(CONTRACT_POOL[1]),
    instantiateContract(CONTRACT_POOL[2]),
  ];
}

export function advanceContractsForRace(
  contracts: SponsorContract[],
  stats: {
    cleanGates: number;
    maxSpeedKmh: number;
    beatPar: boolean;
    earnedMedal: CareerMedalTier;
  }
): {
  updatedContracts: SponsorContract[];
  newlyCompletedTitles: string[];
  totalRewardCredits: number;
} {
  const newlyCompletedTitles: string[] = [];
  let totalRewardCredits = 0;

  const updatedContracts = contracts.map((c) => {
    if (c.completed) return c;
    let nextProgress = c.progressValue;
    if (c.objectiveType === 'clean_gates') {
      nextProgress += stats.cleanGates;
    } else if (c.objectiveType === 'finish_races') {
      nextProgress += 1;
    } else if (c.objectiveType === 'beat_par' && stats.beatPar) {
      nextProgress += 1;
    } else if (c.objectiveType === 'high_speed_kmh') {
      nextProgress = Math.max(nextProgress, Math.round(stats.maxSpeedKmh));
    } else if (
      c.objectiveType === 'gold_medal' &&
      (stats.earnedMedal === 'gold' || stats.earnedMedal === 'ace')
    ) {
      nextProgress += 1;
    }

    const clamped = Math.min(c.targetValue, nextProgress);
    const nowCompleted = clamped >= c.targetValue;
    if (nowCompleted) {
      newlyCompletedTitles.push(`${c.sponsorName}: ${c.title}`);
      totalRewardCredits += c.rewardCredits;
    }

    return {
      ...c,
      progressValue: clamped,
      completed: nowCompleted,
    };
  });

  return { updatedContracts, newlyCompletedTitles, totalRewardCredits };
}

export function rotateSponsorContract(
  contracts: SponsorContract[],
  replaceId: string
): SponsorContract[] {
  const existingTitles = new Set(contracts.map((c) => c.title));
  const candidates = CONTRACT_POOL.filter((t) => !existingTitles.has(t.title));
  const pick =
    candidates[Math.floor(Math.random() * candidates.length)] ??
    CONTRACT_POOL[Math.floor(Math.random() * CONTRACT_POOL.length)];
  return contracts.map((c) => (c.id === replaceId ? instantiateContract(pick) : c));
}

// ---------------- Ghost Rival Synthesis & Zero-GC Playback ----------------

const _gPos = new THREE.Vector3();
const _gNextPos = new THREE.Vector3();
const _gTan = new THREE.Vector3();
const _gRight = new THREE.Vector3();
const _gUp = new THREE.Vector3(0, 1, 0);
const _gMat = new THREE.Matrix4();
const _gQuat = new THREE.Quaternion();
const _gBankQuat = new THREE.Quaternion();
const _gAxisZ = new THREE.Vector3(0, 0, 1);

/**
 * Generates a realistic 15Hz spline-interpolated Pro Target Ghost for any track & medal tier.
 */
export function synthesizeProTargetGhost(
  track: TrackDef,
  tier: Exclude<CareerMedalTier, 'none'>
): GhostRecording {
  const thresholds = getMedalThresholdsMs(track.parTimeSec);
  const totalTimeMs = thresholds[tier];
  const gates = track.gates;

  if (gates.length < 2) {
    return {
      trackId: track.id,
      frameId: 'veloce-210',
      totalTimeMs,
      label: `PRO ${MEDAL_LABELS[tier].toUpperCase()}`,
      isProTarget: true,
      frames: [],
    };
  }

  const firstGate = gates[0];
  const heading = firstGate.headingRad;
  const spawnX = firstGate.position[0] - Math.sin(heading) * 16;
  const spawnZ = firstGate.position[2] - Math.cos(heading) * 16;
  const spawnY = sampleTrackTerrainHeight(spawnX, spawnZ, track) + 0.6;

  // Build closed loop spline waypoints through every gate across all laps
  const pathPts: THREE.Vector3[] = [new THREE.Vector3(spawnX, spawnY, spawnZ)];
  for (let lap = 0; lap < track.lapCount; lap++) {
    for (let gi = 0; gi < gates.length; gi++) {
      const g = gates[gi];
      pathPts.push(new THREE.Vector3(g.position[0], g.position[1], g.position[2]));
    }
  }

  const curve = new THREE.CatmullRomCurve3(pathPts, false, 'catmullrom', 0.45);
  const sampleCount = Math.max(80, Math.round((totalTimeMs / 1000) * 12));
  const frames: GhostKeyframe[] = [];

  for (let i = 0; i <= sampleCount; i++) {
    const u = i / sampleCount;
    // Slight ease-in off the launch pad during first 4% of race
    const shapedU = u < 0.05 ? Math.pow(u / 0.05, 1.35) * 0.05 : u;
    curve.getPointAt(Math.min(1, shapedU), _gPos);
    curve.getPointAt(Math.min(1, shapedU + 0.008), _gNextPos);

    _gTan.subVectors(_gNextPos, _gPos);
    if (_gTan.lengthSq() < 0.0001) {
      _gTan.set(Math.sin(heading), 0, Math.cos(heading));
    } else {
      _gTan.normalize();
    }

    // Drone local -Z points along velocity tangent, +Y roughly up
    const lookBack = _gPos.clone().sub(_gTan);
    _gMat.lookAt(_gPos, lookBack, _gUp);
    _gQuat.setFromRotationMatrix(_gMat);

    // Subtle forward pitch proportional to race pace
    _gBankQuat.setFromAxisAngle(_gAxisZ, 0);
    _gQuat.multiply(_gBankQuat);

    frames.push([
      Math.round(u * totalTimeMs),
      Number(_gPos.x.toFixed(2)),
      Number(_gPos.y.toFixed(2)),
      Number(_gPos.z.toFixed(2)),
      Number(_gQuat.x.toFixed(4)),
      Number(_gQuat.y.toFixed(4)),
      Number(_gQuat.z.toFixed(4)),
      Number(_gQuat.w.toFixed(4)),
    ]);
  }

  return {
    trackId: track.id,
    frameId: 'veloce-210',
    totalTimeMs,
    label: `PRO ${MEDAL_LABELS[tier].toUpperCase()}`,
    isProTarget: true,
    frames,
  };
}

const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion();

/**
 * Zero-GC interpolated pose lookup at elapsed race timeMs
 */
export function sampleGhostPoseAtTimeInto(
  frames: GhostKeyframe[],
  timeMs: number,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion
): boolean {
  if (frames.length === 0) return false;
  if (timeMs <= frames[0][0]) {
    const f = frames[0];
    outPos.set(f[1], f[2], f[3]);
    outQuat.set(f[4], f[5], f[6], f[7]);
    return true;
  }
  const last = frames[frames.length - 1];
  if (timeMs >= last[0]) {
    outPos.set(last[1], last[2], last[3]);
    outQuat.set(last[4], last[5], last[6], last[7]);
    return true;
  }

  // Binary search for bracketing frames
  let lo = 0;
  let hi = frames.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid][0] <= timeMs) lo = mid;
    else hi = mid;
  }

  const f0 = frames[lo];
  const f1 = frames[hi];
  const span = Math.max(1, f1[0] - f0[0]);
  const alpha = THREE.MathUtils.clamp((timeMs - f0[0]) / span, 0, 1);

  outPos.set(
    f0[1] + (f1[1] - f0[1]) * alpha,
    f0[2] + (f1[2] - f0[2]) * alpha,
    f0[3] + (f1[3] - f0[3]) * alpha
  );
  _q0.set(f0[4], f0[5], f0[6], f0[7]);
  _q1.set(f1[4], f1[5], f1[6], f1[7]);
  outQuat.copy(_q0).slerp(_q1, alpha);
  return true;
}
