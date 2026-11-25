/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import type {
  ComputedDroneStats,
  DroneCustomization,
  DroneFrameId,
  DroneFrameSpec,
  FirmwareLevel,
  PlayerGarageState,
  RatesProfile,
  UpgradeCategory,
  UpgradeLevelSpec,
  UpgradeLevels,
} from '../types/game';
import { createDefaultGamepadConfig, normalizeGamepadConfig } from '../engine/gamepad';
import {
  createDefaultSoftwareLoadout,
  FIRMWARE_CATALOG,
  normalizeSoftwareLoadout,
} from './progression';
import {
  STARTER_UNLOCKED_PART_IDS,
  createStarterCustomBuild,
} from './droneBuilder';

export const DRONE_FRAMES: DroneFrameSpec[] = [
  {
    id: 'apex-x5',
    name: 'Apex X5 Carbon',
    classLabel: '5-Inch Pro Freestyle / Race',
    description:
      'True-X 5mm Toray T700 carbon chassis engineered for balanced yaw authority, predictable cornering, and rugged gate resilience.',
    unlockCost: 0,
    baseMassKg: 0.62,
    armSpanM: 0.24,
    baseThrustN: 34.0,
    baseDragCoeff: 0.145,
    baseAgility: 1.0,
    baseBatteryWh: 26.6,
    hasDucts: false,
    defaultColors: {
      canopy: '#f59e0b',
      accent: '#27272a',
      prop: '#06b6d4',
      led: '#f59e0b',
    },
  },
  {
    id: 'veloce-210',
    name: 'Veloce RS-210',
    classLabel: '5-Inch Ultralight League Spec',
    description:
      'Minimal-drag stretched-X competition airframe with razor-thin arms and forward center of gravity for explosive straights.',
    unlockCost: 650,
    baseMassKg: 0.53,
    armSpanM: 0.22,
    baseThrustN: 36.5,
    baseDragCoeff: 0.118,
    baseAgility: 1.18,
    baseBatteryWh: 24.4,
    hasDucts: false,
    defaultColors: {
      canopy: '#ef4444',
      accent: '#18181b',
      prop: '#facc15',
      led: '#ef4444',
    },
  },
  {
    id: 'kestrel-35',
    name: 'Kestrel Cine 35',
    classLabel: '3.5-Inch Ducted Technical',
    description:
      'Aerodynamic prop-guarded airframe offering high low-speed lift stability and tight indoor/slalom precision.',
    unlockCost: 480,
    baseMassKg: 0.56,
    armSpanM: 0.19,
    baseThrustN: 28.5,
    baseDragCoeff: 0.165,
    baseAgility: 0.94,
    baseBatteryWh: 28.8,
    hasDucts: true,
    defaultColors: {
      canopy: '#06b6d4',
      accent: '#3f3f46',
      prop: '#f4f4f5',
      led: '#22d3ee',
    },
  },
  {
    id: 'helios-7',
    name: 'Helios LR-7 Interceptor',
    classLabel: '7-Inch Long-Range Alpine',
    description:
      'High-aspect 7-inch deadcat rig built to carve mountain ridges and canyon drops at blistering terminal velocity.',
    unlockCost: 1100,
    baseMassKg: 0.84,
    armSpanM: 0.33,
    baseThrustN: 52.0,
    baseDragCoeff: 0.132,
    baseAgility: 0.92,
    baseBatteryWh: 46.2,
    hasDucts: false,
    defaultColors: {
      canopy: '#e4e4e7',
      accent: '#18181b',
      prop: '#10b981',
      led: '#34d399',
    },
  },
];

export const UPGRADE_CATALOG: Record<
  UpgradeCategory,
  { title: string; unit: string; levels: UpgradeLevelSpec[] }
> = {
  motors: {
    title: 'Brushless Motors',
    unit: 'KV / Torque',
    levels: [
      { level: 0, label: '2207 1750KV Stock', detail: 'Baseline copper stator', cost: 0, statBoost: 0 },
      { level: 1, label: '2207 1950KV Pro', detail: 'N52H arc magnets (+10% thrust)', cost: 220, statBoost: 0.1 },
      { level: 2, label: '2306 2100KV Titanium', detail: 'Hollow titanium shaft (+20% thrust)', cost: 420, statBoost: 0.2 },
      { level: 3, label: '2306.5 2280KV Race', detail: 'Single-strand silver wind (+32% thrust)', cost: 720, statBoost: 0.32 },
      { level: 4, label: '2407 2450KV Factory', detail: 'Beryllium-balanced bell (+45% thrust)', cost: 1100, statBoost: 0.45 },
    ],
  },
  battery: {
    title: 'LiPo Power Pack',
    unit: 'Discharge / Cells',
    levels: [
      { level: 0, label: '4S 1300mAh 95C', detail: 'Standard 14.8V pack', cost: 0, statBoost: 0 },
      { level: 1, label: '5S 1300mAh 110C', detail: '18.5V high-burst pack', cost: 200, statBoost: 0.08 },
      { level: 2, label: '6S 1300mAh 120C', detail: '22.2V pro race standard', cost: 400, statBoost: 0.16 },
      { level: 3, label: '6S 1400mAh LiHV', detail: 'Low internal resistance Graphene', cost: 680, statBoost: 0.24 },
      { level: 4, label: '6S 1550mAh Solid-Cell', detail: 'Zero-sag championship pack', cost: 1050, statBoost: 0.34 },
    ],
  },
  props: {
    title: 'Propeller Blades',
    unit: 'Pitch / Aero',
    levels: [
      { level: 0, label: '5140 Polycarbonate', detail: 'Balanced grip & durability', cost: 0, statBoost: 0 },
      { level: 1, label: '5143 Tri-Blade Aero', detail: 'Crisper mid-throttle bite', cost: 180, statBoost: 0.06 },
      { level: 2, label: '5146.6 Race Composite', detail: 'Glass-nylon low flex tip', cost: 340, statBoost: 0.13 },
      { level: 3, label: '5149 V3 Carbon-Nylon', detail: 'Low tip-vortex drag', cost: 580, statBoost: 0.2 },
      { level: 4, label: '5152 Bi/Tri Hybrid', detail: 'Maximum top-end pitch speed', cost: 900, statBoost: 0.28 },
    ],
  },
  frame: {
    title: 'Airframe Structure',
    unit: 'Mass / Aero Drag',
    levels: [
      { level: 0, label: 'T700 5mm Standard', detail: 'Steel hardware assembly', cost: 0, statBoost: 0 },
      { level: 1, label: 'T700 Chamfered + Ti', detail: 'Titanium bolts (-5% mass)', cost: 210, statBoost: 0.05 },
      { level: 2, label: 'T800 Aero Arms', detail: 'Slim vertical-profile arms (-10% mass)', cost: 390, statBoost: 0.1 },
      { level: 3, label: 'T1000 Monocoque', detail: 'CNC 7075 brace (-15% mass)', cost: 640, statBoost: 0.15 },
      { level: 4, label: 'Forged Carbon Spec', detail: 'Wind-tunnel canopy (-20% mass)', cost: 980, statBoost: 0.2 },
    ],
  },
  fc: {
    title: 'Flight Controller',
    unit: 'PID Loop / Gyro',
    levels: [
      { level: 0, label: 'F4 4KHz Standard', detail: 'Reliable baseline response', cost: 0, statBoost: 0 },
      { level: 1, label: 'F7 8KHz Dual-Gyro', detail: 'Cleaner propwash filtering', cost: 190, statBoost: 0.08 },
      { level: 2, label: 'H743 8KHz DShot600', detail: 'Bi-directional RPM filter', cost: 380, statBoost: 0.16 },
      { level: 3, label: 'H743 Race + DShot1200', detail: 'Sub-millisecond lock', cost: 620, statBoost: 0.25 },
      { level: 4, label: 'Factory Telemetry FC', detail: 'Zero-phase feedforward tune', cost: 950, statBoost: 0.35 },
    ],
  },
};

export const COLOR_SWATCHES = [
  { name: 'Solar Amber', hex: '#f59e0b' },
  { name: 'Crimson Track', hex: '#ef4444' },
  { name: 'Cyan Vector', hex: '#06b6d4' },
  { name: 'Emerald Acid', hex: '#10b981' },
  { name: 'Volt Lime', hex: '#84cc16' },
  { name: 'Cobalt Steel', hex: '#3b82f6' },
  { name: 'Titanium Silver', hex: '#e4e4e7' },
  { name: 'Stealth Carbon', hex: '#27272a' },
];

export const DEFAULT_RATES: RatesProfile = {
  rcRate: 1.15,
  superRate: 0.68,
  expo: 0.2,
  throttleMid: 0.5,
  throttleExpo: 0.15,
};

export function createDefaultUpgrades(): UpgradeLevels {
  return { motors: 0, battery: 0, props: 0, frame: 0, fc: 0 };
}

export function createInitialGarageState(): PlayerGarageState {
  const upgradesByFrame = {} as Record<DroneFrameId, UpgradeLevels>;
  const customizationByFrame = {} as Record<DroneFrameId, DroneCustomization>;

  for (const frame of DRONE_FRAMES) {
    upgradesByFrame[frame.id] = createDefaultUpgrades();
    customizationByFrame[frame.id] = {
      frameColor: '#27272a',
      frameFinish: 'matte',
      canopyColor: frame.defaultColors.canopy,
      armAccentColor: frame.defaultColors.accent,
      propColor: frame.defaultColors.prop,
      ledColor: frame.defaultColors.led,
      cameraTiltDeg: 28,
    };
  }

  return {
    credits: 500,
    unlockedFrames: ['apex-x5'],
    selectedFrame: 'apex-x5',
    upgradesByFrame,
    customizationByFrame,
    rates: { ...DEFAULT_RATES },
    flightMode: 'acro',
    stickMode: 'mode2',
    cameraView: 'fpv',
    gamepad: createDefaultGamepadConfig('gamepad-standard'),
    software: createDefaultSoftwareLoadout(),
    graphicsQuality: 'ultra',
    unlockedPartIds: [...STARTER_UNLOCKED_PART_IDS],
    customBuilds: [createStarterCustomBuild()],
    activeCustomBuildId: null,
    hudDensity: 'minimal',
    touchSticksMode: 'auto',
  };
}

export function normalizeGarageState(loaded: PlayerGarageState): PlayerGarageState {
  const base = createInitialGarageState();
  const unlockedPartIds =
    Array.isArray(loaded.unlockedPartIds) && loaded.unlockedPartIds.length > 0
      ? Array.from(new Set([...STARTER_UNLOCKED_PART_IDS, ...loaded.unlockedPartIds]))
      : base.unlockedPartIds!;
  const customBuilds =
    Array.isArray(loaded.customBuilds) && loaded.customBuilds.length > 0
      ? loaded.customBuilds
      : base.customBuilds!;

  return {
    ...base,
    ...loaded,
    gamepad: normalizeGamepadConfig(loaded.gamepad),
    software: normalizeSoftwareLoadout(loaded.software),
    graphicsQuality: loaded.graphicsQuality ?? 'ultra',
    hudDensity: loaded.hudDensity === 'pure' ? 'pure' : 'minimal',
    touchSticksMode:
      loaded.touchSticksMode === 'always' || loaded.touchSticksMode === 'hidden'
        ? loaded.touchSticksMode
        : 'auto',
    unlockedPartIds,
    customBuilds,
    activeCustomBuildId:
      loaded.activeCustomBuildId &&
      customBuilds.some((b) => b.id === loaded.activeCustomBuildId)
        ? loaded.activeCustomBuildId
        : null,
  };
}

export function getFrameSpec(id: DroneFrameId): DroneFrameSpec {
  return DRONE_FRAMES.find((f) => f.id === id) ?? DRONE_FRAMES[0];
}

export function computeDroneStats(
  frameId: DroneFrameId,
  upgrades: UpgradeLevels,
  rates: RatesProfile,
  firmwareLevel: FirmwareLevel = 0
): ComputedDroneStats {
  const frame = getFrameSpec(frameId);
  const motorBoost = UPGRADE_CATALOG.motors.levels[upgrades.motors]?.statBoost ?? 0;
  const batteryBoost = UPGRADE_CATALOG.battery.levels[upgrades.battery]?.statBoost ?? 0;
  const propBoost = UPGRADE_CATALOG.props.levels[upgrades.props]?.statBoost ?? 0;
  const frameReduction = UPGRADE_CATALOG.frame.levels[upgrades.frame]?.statBoost ?? 0;
  const fcBoost = UPGRADE_CATALOG.fc.levels[upgrades.fc]?.statBoost ?? 0;
  const fwSpec = FIRMWARE_CATALOG[firmwareLevel] ?? FIRMWARE_CATALOG[0];
  const totalFcLock = fcBoost + fwSpec.pidBoost;

  const massKg = Number((frame.baseMassKg * (1 - frameReduction)).toFixed(3));
  const maxThrustN = Number(
    (frame.baseThrustN * (1 + motorBoost + propBoost * 0.55 + batteryBoost * 0.35)).toFixed(2)
  );
  const dragCoeff = Number(
    (frame.baseDragCoeff * (1 - frameReduction * 0.4 - propBoost * 0.25)).toFixed(4)
  );
  const gravityForce = massKg * 9.81;
  const thrustToWeight = Number((maxThrustN / gravityForce).toFixed(2));

  // Terminal velocity approximation: F_thrust_horiz ~ dragCoeff * v^2 => v = sqrt(maxThrust / dragCoeff)
  const netHorizThrust = Math.max(8, maxThrustN - gravityForce * 0.45);
  const topSpeedMs = Math.sqrt(netHorizThrust / Math.max(0.06, dragCoeff * 0.14));
  const topSpeedKmh = Math.round(topSpeedMs * 3.6);

  // Betaflight-like max rate at full deflection
  const maxRateDegS = Math.round(
    (200 * rates.rcRate) / Math.max(0.12, 1 - rates.superRate) * frame.baseAgility * (1 + totalFcLock * 0.16)
  );

  const batteryWh = Number((frame.baseBatteryWh * (1 + batteryBoost)).toFixed(1));
  const flightMinutes = Number(((batteryWh / (maxThrustN * 0.16)) * 3.6).toFixed(1));

  return {
    massKg,
    maxThrustN,
    thrustToWeight,
    topSpeedKmh,
    maxRateDegS,
    dragCoeff,
    batteryWh,
    flightMinutes,
    armSpanM: frame.armSpanM,
    hasDucts: frame.hasDucts,
    pidResponsiveness: Number((1 + totalFcLock).toFixed(2)),
  };
}
