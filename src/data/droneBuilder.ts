/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import type {
  BuilderBatteryPart,
  BuilderCameraPart,
  BuilderFramePart,
  BuilderMotorPart,
  BuilderPropPart,
  BuilderStackPart,
  ComputedDroneStats,
  CustomDroneBuild,
  CustomDronePartsSelection,
  DroneFrameId,
  DroneVisualBlueprint,
  FirmwareLevel,
  RatesProfile,
} from '../types/game';
import { FIRMWARE_CATALOG } from './progression';

export const MAX_CUSTOM_BUILD_SLOTS = 6;

export const BUILDER_FRAMES: BuilderFramePart[] = [
  {
    id: 'bf-true-x5',
    name: 'Apex True-X 5" Carbon',
    sizeClass: '5',
    geometryStyle: 'true-x',
    massGrams: 118,
    armSpanM: 0.24,
    armThicknessScale: 1.0,
    dragCoeff: 0.138,
    agility: 1.04,
    hasDucts: false,
    maxCells: 6,
    cost: 0,
    detail: 'Balanced 5mm Toray T700 X-frame for crisp all-around racing.',
  },
  {
    id: 'bf-stretch-x5',
    name: 'Veloce Stretched-X 5"',
    sizeClass: '5',
    geometryStyle: 'stretched-x',
    massGrams: 94,
    armSpanM: 0.225,
    armThicknessScale: 0.84,
    dragCoeff: 0.114,
    agility: 1.18,
    hasDucts: false,
    maxCells: 6,
    cost: 340,
    detail: 'Ultralight forward-CG league frame built for razor-sharp straights.',
  },
  {
    id: 'bf-cine-35',
    name: 'Kestrel Ducted 3.5"',
    sizeClass: '3.5',
    geometryStyle: 'cinewhoop-duct',
    massGrams: 126,
    armSpanM: 0.185,
    armThicknessScale: 0.92,
    dragCoeff: 0.162,
    agility: 0.96,
    hasDucts: true,
    maxCells: 6,
    cost: 280,
    detail: 'Guarded aero ducts for technical slaloms and collision bounce.',
  },
  {
    id: 'bf-deadcat-7',
    name: 'Helios Deadcat LR 7"',
    sizeClass: '7',
    geometryStyle: 'deadcat-lr',
    massGrams: 168,
    armSpanM: 0.33,
    armThicknessScale: 1.18,
    dragCoeff: 0.128,
    agility: 0.92,
    hasDucts: false,
    maxCells: 6,
    cost: 480,
    detail: 'Swept-front 7-inch long-range chassis with clean unobstructed lens FOV.',
  },
  {
    id: 'bf-proto-monocoque',
    name: 'Proto-X5 Carbon Monocoque',
    sizeClass: '5',
    geometryStyle: 'stretched-x',
    massGrams: 78,
    armSpanM: 0.222,
    armThicknessScale: 0.82,
    dragCoeff: 0.102,
    agility: 1.24,
    hasDucts: false,
    maxCells: 6,
    cost: 0,
    milestoneUnlockId: 'ms-gates-1000',
    milestoneUnlockTitle: 'Millennium Gate Runner',
    detail: 'Autoclave T1000 monocoque prototype unlocked at 1,000 lifetime gates passed.',
  },
];

export const BUILDER_MOTORS: BuilderMotorPart[] = [
  {
    id: 'bm-2207-1750',
    name: '2207 1750KV Standard',
    statorLabel: '2207 · 1750KV',
    kv: 1750,
    supportedCells: [4, 6],
    idealSizeClass: '5',
    massGrams: 132,
    baseThrustN: 34.0,
    peakAmpsTotal: 140,
    motorScale: 1.0,
    cost: 0,
    detail: 'Smooth copper windings suited for 4S practice or efficient 6S race.',
  },
  {
    id: 'bm-2004-2800',
    name: '2004 2800KV Cine-Lite',
    statorLabel: '2004 · 2800KV',
    kv: 2800,
    supportedCells: [4],
    idealSizeClass: '3.5',
    massGrams: 72,
    baseThrustN: 26.5,
    peakAmpsTotal: 96,
    motorScale: 0.82,
    cost: 190,
    detail: 'Featherweight pancake stators tuned for 3.5" 4S technical rigs.',
  },
  {
    id: 'bm-2306-2100',
    name: '2306 2100KV Titanium',
    statorLabel: '2306 · 2100KV',
    kv: 2100,
    supportedCells: [4, 6],
    idealSizeClass: '5',
    massGrams: 138,
    baseThrustN: 41.0,
    peakAmpsTotal: 185,
    motorScale: 1.06,
    cost: 320,
    detail: 'Hollow titanium shafts with snappy mid-throttle corner exit.',
  },
  {
    id: 'bm-2407-2450',
    name: '2407 2450KV Factory Spec',
    statorLabel: '2407 · 2450KV',
    kv: 2450,
    supportedCells: [6],
    idealSizeClass: '5',
    massGrams: 154,
    baseThrustN: 49.5,
    peakAmpsTotal: 235,
    motorScale: 1.14,
    cost: 560,
    detail: 'High-KV beryllium-balanced 6S race bells; demands high-amp ESC.',
  },
  {
    id: 'bm-2807-1300',
    name: '2807 1300KV Alpine Torque',
    statorLabel: '2807 · 1300KV',
    kv: 1300,
    supportedCells: [6],
    idealSizeClass: '7',
    massGrams: 204,
    baseThrustN: 58.0,
    peakAmpsTotal: 195,
    motorScale: 1.32,
    cost: 490,
    detail: 'High-torque wide stators engineered to swing 7-inch blades cleanly.',
  },
  {
    id: 'bm-proto-2408-n54',
    name: '2408 2550KV N54 Prototype',
    statorLabel: '2408 · 2550KV',
    kv: 2550,
    supportedCells: [6],
    idealSizeClass: '5',
    massGrams: 144,
    baseThrustN: 54.0,
    peakAmpsTotal: 255,
    motorScale: 1.16,
    cost: 0,
    milestoneUnlockId: 'ms-speed-190',
    milestoneUnlockTitle: 'Mach-190 Interceptor',
    detail: 'Custom N54SH magnet prototype stators unlocked by reaching 190 km/h peak airspeed.',
  },
];

export const BUILDER_PROPS: BuilderPropPart[] = [
  {
    id: 'bp-5140-3b',
    name: '5140 Tri-Blade Poly',
    sizeClass: '5',
    blades: 3,
    massGrams: 16,
    thrustFactor: 1.0,
    efficiencyFactor: 1.0,
    dragFactor: 1.0,
    cost: 0,
    detail: 'Balanced 5" tri-blade baseline with forgiving throttle curve.',
  },
  {
    id: 'bp-5148-2b',
    name: '5148 Speed Bi-Blade',
    sizeClass: '5',
    blades: 2,
    massGrams: 12,
    thrustFactor: 0.96,
    efficiencyFactor: 1.14,
    dragFactor: 0.84,
    cost: 180,
    detail: 'Low-drag 2-blade race prop delivering higher top speed & longer pack life.',
  },
  {
    id: 'bp-5152-5b',
    name: '5152 Grip 5-Blade',
    sizeClass: '5',
    blades: 5,
    massGrams: 22,
    thrustFactor: 1.18,
    efficiencyFactor: 0.86,
    dragFactor: 1.1,
    cost: 290,
    detail: 'Massive corner bite and braking authority at higher amp draw.',
  },
  {
    id: 'bp-3530-5b',
    name: '3530 Ducted 5-Blade',
    sizeClass: '3.5',
    blades: 5,
    massGrams: 11,
    thrustFactor: 0.94,
    efficiencyFactor: 1.05,
    dragFactor: 1.02,
    cost: 160,
    detail: 'High-solidity 3.5" blades optimized for tight duct clearance.',
  },
  {
    id: 'bp-7040-3b',
    name: '7040 Alpine 3-Blade',
    sizeClass: '7',
    blades: 3,
    massGrams: 32,
    thrustFactor: 1.24,
    efficiencyFactor: 1.18,
    dragFactor: 0.92,
    cost: 260,
    detail: 'High-aspect 7" carbon-nylon blades for sweeping mountain velocity.',
  },
  {
    id: 'bp-proto-5146-kevlar',
    name: '5146 Kevlar-Swept Prototype',
    sizeClass: '5',
    blades: 3,
    massGrams: 13,
    thrustFactor: 1.16,
    efficiencyFactor: 1.14,
    dragFactor: 0.86,
    cost: 0,
    milestoneUnlockId: 'ms-gates-500',
    milestoneUnlockTitle: 'Precision Wingman',
    detail: 'Aero-swept carbon-kevlar tri-blades unlocked at 500 lifetime gates passed.',
  },
];

export const BUILDER_STACKS: BuilderStackPart[] = [
  {
    id: 'bs-f4-45a',
    name: 'F405 + 45A 4-in-1 (20x20)',
    mountSize: '20x20',
    escAmpsTotal: 180,
    maxCells: 4,
    massGrams: 24,
    pidBoost: 0.0,
    heatsinkColor: '#3f3f46',
    cost: 0,
    detail: 'Compact 4S-rated 20x20 stack for light 4S builds.',
  },
  {
    id: 'bs-f7-55a',
    name: 'F722 + 55A Pro (30x30)',
    mountSize: '30x30',
    escAmpsTotal: 220,
    maxCells: 6,
    massGrams: 34,
    pidBoost: 0.14,
    heatsinkColor: '#06b6d4',
    cost: 240,
    detail: '6S-ready 30x30 stack with dual-gyro filtering and alloy heatsink.',
  },
  {
    id: 'bs-h7-70a',
    name: 'H743 + 70A Race (30x30)',
    mountSize: '30x30',
    escAmpsTotal: 280,
    maxCells: 6,
    massGrams: 38,
    pidBoost: 0.28,
    heatsinkColor: '#f59e0b',
    cost: 460,
    detail: 'Championship DShot1200 stack handling high-KV 6S burst loads effortlessly.',
  },
  {
    id: 'bs-f7-mini-45a',
    name: 'F7 Mini + 45A 6S (20x20)',
    mountSize: '20x20',
    escAmpsTotal: 180,
    maxCells: 6,
    massGrams: 22,
    pidBoost: 0.18,
    heatsinkColor: '#ef4444',
    cost: 310,
    detail: 'Ultralight 6S-capable 20x20 stack for stretched-X and 3.5" rigs.',
  },
  {
    id: 'bs-proto-h7-80a',
    name: 'H743 80A GaN Prototype (30x30)',
    mountSize: '30x30',
    escAmpsTotal: 320,
    maxCells: 6,
    massGrams: 32,
    pidBoost: 0.34,
    heatsinkColor: '#22d3ee',
    cost: 0,
    milestoneUnlockId: 'ms-hours-1',
    milestoneUnlockTitle: 'Airborne Centurion',
    detail: 'Gallium-nitride 80A telemetry stack unlocked after 1.0 total flight hour.',
  },
];

export const BUILDER_BATTERIES: BuilderBatteryPart[] = [
  {
    id: 'bb-4s-1300',
    name: '4S 1300mAh 95C LiPo',
    cells: 4,
    capacityMah: 1300,
    chemistry: 'lipo',
    massGrams: 158,
    wh: 19.2,
    maxDischargeAmps: 124,
    packScale: [0.92, 0.85, 0.9],
    cost: 0,
    detail: 'Nimble 14.8V pack keeping all-up weight low for learning and technical tracks.',
  },
  {
    id: 'bb-6s-1300',
    name: '6S 1300mAh 120C Race',
    cells: 6,
    capacityMah: 1300,
    chemistry: 'lipo',
    massGrams: 215,
    wh: 28.9,
    maxDischargeAmps: 195,
    packScale: [1.0, 1.0, 1.0],
    cost: 250,
    detail: '22.2V race standard delivering crisp high-throttle punch with minimal sag.',
  },
  {
    id: 'bb-6s-1550-lihv',
    name: '6S 1550mAh 140C LiHV',
    cells: 6,
    capacityMah: 1550,
    chemistry: 'lihv',
    massGrams: 242,
    wh: 35.3,
    maxDischargeAmps: 250,
    packScale: [1.06, 1.08, 1.06],
    cost: 440,
    detail: 'Zero-sag high-voltage championship pack feeding extreme 2450KV motors.',
  },
  {
    id: 'bb-6s-3000-liion',
    name: '6S 3000mAh 21700 Li-Ion',
    cells: 6,
    capacityMah: 3000,
    chemistry: 'li-ion',
    massGrams: 395,
    wh: 66.6,
    maxDischargeAmps: 110,
    packScale: [1.22, 1.15, 1.38],
    cost: 390,
    detail: 'High-density endurance pack for 7" long-range cruises; heavier & lower burst amps.',
  },
  {
    id: 'bb-proto-6s-graphene',
    name: '6S 1650mAh Solid-Graphene',
    cells: 6,
    capacityMah: 1650,
    chemistry: 'lihv',
    massGrams: 228,
    wh: 38.4,
    maxDischargeAmps: 290,
    packScale: [1.04, 1.04, 1.04],
    cost: 0,
    milestoneUnlockId: 'ms-hours-3',
    milestoneUnlockTitle: 'Endurance Aviator',
    detail: 'Ultra-low-resistance solid-electrolyte cell pack unlocked at 3.0 flight hours.',
  },
];

export const BUILDER_CAMERAS: BuilderCameraPart[] = [
  {
    id: 'bc-micro-analog',
    name: 'Micro Analog + Stubby',
    camStyle: 'micro-analog',
    antennaStyle: 'stubby',
    massGrams: 18,
    dragPenalty: 0,
    cost: 0,
    detail: 'Featherweight 1200TVL race camera with low-profile stubby SMA antenna.',
  },
  {
    id: 'bc-o3-digital',
    name: 'HD O3 Air Unit + Lollipop',
    camStyle: 'o3-digital',
    antennaStyle: 'lollipop',
    massGrams: 40,
    dragPenalty: 0.005,
    cost: 290,
    detail: 'Cinematic 4K onboard air unit with circularly polarized lollipop antenna.',
  },
  {
    id: 'bc-action-lr',
    name: 'Action 4K + LR Whip VTX',
    camStyle: 'action-4k',
    antennaStyle: 'long-range',
    massGrams: 86,
    dragPenalty: 0.015,
    cost: 420,
    detail: 'Top-mounted 4K action camera + extended long-range mast; adds nose drag.',
  },
  {
    id: 'bc-proto-ti-micro',
    name: 'Titanium Nano-O3 Zero-Drag',
    camStyle: 'o3-digital',
    antennaStyle: 'stubby',
    massGrams: 14,
    dragPenalty: 0,
    cost: 0,
    milestoneUnlockId: 'ms-league-champ',
    milestoneUnlockTitle: 'Pro League Champion',
    detail: 'Zero-drag magnesium-titanium HD air unit unlocked by winning a Pro League Championship.',
  },
];

export const DEFAULT_CUSTOM_PARTS: CustomDronePartsSelection = {
  frameId: 'bf-true-x5',
  motorId: 'bm-2207-1750',
  propId: 'bp-5140-3b',
  stackId: 'bs-f4-45a',
  batteryId: 'bb-4s-1300',
  cameraId: 'bc-micro-analog',
};

export const STARTER_UNLOCKED_PART_IDS: string[] = [
  'bf-true-x5',
  'bm-2207-1750',
  'bp-5140-3b',
  'bs-f4-45a',
  'bb-4s-1300',
  'bc-micro-analog',
];

export function getBuilderPartMaps(parts: CustomDronePartsSelection) {
  const frame =
    BUILDER_FRAMES.find((f) => f.id === parts.frameId) ?? BUILDER_FRAMES[0];
  const motor =
    BUILDER_MOTORS.find((m) => m.id === parts.motorId) ?? BUILDER_MOTORS[0];
  const prop =
    BUILDER_PROPS.find((p) => p.id === parts.propId) ?? BUILDER_PROPS[0];
  const stack =
    BUILDER_STACKS.find((s) => s.id === parts.stackId) ?? BUILDER_STACKS[0];
  const battery =
    BUILDER_BATTERIES.find((b) => b.id === parts.batteryId) ??
    BUILDER_BATTERIES[0];
  const camera =
    BUILDER_CAMERAS.find((c) => c.id === parts.cameraId) ?? BUILDER_CAMERAS[0];

  return { frame, motor, prop, stack, battery, camera };
}

export interface BuildCompatibilityIssue {
  severity: 'error' | 'warning';
  message: string;
}

export interface CustomBuildEvaluation {
  stats: ComputedDroneStats;
  blueprint: DroneVisualBlueprint;
  totalMassGrams: number;
  estimatedPeakAmps: number;
  escMaxAmps: number;
  batteryMaxAmps: number;
  ampLoadPct: number;
  issues: BuildCompatibilityIssue[];
  hasHardError: boolean;
  lockedPartIds: string[];
  unlockCost: number;
}

export function evaluateCustomDroneBuild(
  parts: CustomDronePartsSelection,
  rates: RatesProfile,
  firmwareLevel: FirmwareLevel,
  unlockedPartIds: string[]
): CustomBuildEvaluation {
  const { frame, motor, prop, stack, battery, camera } =
    getBuilderPartMaps(parts);
  const fwSpec = FIRMWARE_CATALOG[firmwareLevel] ?? FIRMWARE_CATALOG[0];

  const issues: BuildCompatibilityIssue[] = [];

  // 1. Hard mechanical fitment: propeller diameter vs frame size class
  if (prop.sizeClass !== frame.sizeClass) {
    const propNum = Number(prop.sizeClass);
    const frameNum = Number(frame.sizeClass);
    if (propNum > frameNum) {
      issues.push({
        severity: 'error',
        message: `${prop.sizeClass}" propellers physically collide with ${frame.sizeClass}" ${frame.name} arms.`,
      });
    } else {
      issues.push({
        severity: 'warning',
        message: `${prop.sizeClass}" propellers are undersized for a ${frame.sizeClass}" frame (reduced disc thrust).`,
      });
    }
  }

  // 2. Hard electrical voltage limit: Battery cells vs ESC/Stack max cells
  if (battery.cells > stack.maxCells) {
    issues.push({
      severity: 'error',
      message: `${battery.cells}S pack exceeds ${stack.name} ${stack.maxCells}S voltage rating.`,
    });
  }
  if (battery.cells > frame.maxCells) {
    issues.push({
      severity: 'error',
      message: `${battery.cells}S pack exceeds ${frame.name} voltage spec.`,
    });
  }

  // 3. Motor-cell voltage matching & peak amp draw computation
  const voltageMultiplier = battery.cells === 6 ? 1.24 : 0.92;
  const propLoadScale =
    prop.blades === 5 ? 1.14 : prop.blades === 2 ? 0.88 : 1.0;
  const sizeMismatchThrust =
    prop.sizeClass === frame.sizeClass ? 1.0 : 0.72;
  const estimatedPeakAmps = Math.round(
    motor.peakAmpsTotal *
      (battery.cells === 6 ? 1.05 : 0.78) *
      propLoadScale
  );

  if (!motor.supportedCells.includes(battery.cells)) {
    if (battery.cells === 6) {
      issues.push({
        severity: 'warning',
        message: `${motor.kv}KV motors on 6S will run hot — watch burst amp load.`,
      });
    } else {
      issues.push({
        severity: 'warning',
        message: `Low-KV ${motor.kv}KV motors feel sluggish on 4S voltage.`,
      });
    }
  }

  // 4. ESC & Battery current headroom checks
  const bottleneckAmps = Math.min(stack.escAmpsTotal, battery.maxDischargeAmps);
  const ampLoadPct = Math.round((estimatedPeakAmps / bottleneckAmps) * 100);
  let ampThrottleLimit = 1.0;
  if (estimatedPeakAmps > stack.escAmpsTotal) {
    ampThrottleLimit = Math.max(0.78, stack.escAmpsTotal / estimatedPeakAmps);
    issues.push({
      severity: 'warning',
      message: `Peak draw (~${estimatedPeakAmps}A) exceeds ${stack.escAmpsTotal}A ESC limit; thrust is thermally capped.`,
    });
  } else if (estimatedPeakAmps > battery.maxDischargeAmps) {
    ampThrottleLimit = Math.max(0.8, battery.maxDischargeAmps / estimatedPeakAmps);
    issues.push({
      severity: 'warning',
      message: `Battery sag: ${battery.name} maxes at ${battery.maxDischargeAmps}A vs ${estimatedPeakAmps}A motor demand.`,
    });
  }

  // 5. Realistic Mass Summation (grams -> kg)
  const hardwarePaddingG = 28; // XT60 pigtail, strap, hardware, RX
  const totalMassGrams =
    frame.massGrams +
    motor.massGrams +
    prop.massGrams +
    stack.massGrams +
    battery.massGrams +
    camera.massGrams +
    hardwarePaddingG;
  const massKg = Number((totalMassGrams / 1000).toFixed(3));

  const maxThrustN = Number(
    (
      motor.baseThrustN *
      voltageMultiplier *
      prop.thrustFactor *
      sizeMismatchThrust *
      ampThrottleLimit
    ).toFixed(2)
  );

  const dragCoeff = Number(
    (frame.dragCoeff * prop.dragFactor + camera.dragPenalty).toFixed(4)
  );
  const gravityForce = massKg * 9.81;
  const thrustToWeight = Number((maxThrustN / gravityForce).toFixed(2));

  if (thrustToWeight < 2.2) {
    issues.push({
      severity: 'warning',
      message: `Low ${thrustToWeight}:1 TWR (${totalMassGrams}g AUW) — sluggish climb recovery.`,
    });
  }

  const netHorizThrust = Math.max(8, maxThrustN - gravityForce * 0.45);
  const topSpeedMs = Math.sqrt(
    netHorizThrust / Math.max(0.06, dragCoeff * 0.14)
  );
  const topSpeedKmh = Math.round(topSpeedMs * 3.6);

  const totalFcLock = stack.pidBoost + fwSpec.pidBoost;
  const massAgilityPenalty = Math.max(0.78, Math.min(1.12, 0.62 / massKg));
  const maxRateDegS = Math.round(
    ((200 * rates.rcRate) / Math.max(0.12, 1 - rates.superRate)) *
      frame.agility *
      massAgilityPenalty *
      (1 + totalFcLock * 0.16)
  );

  const batteryWh = Number(battery.wh.toFixed(1));
  const flightMinutes = Number(
    (((batteryWh * prop.efficiencyFactor) / (maxThrustN * 0.16)) * 3.6).toFixed(1)
  );

  const selectedIds = [
    parts.frameId,
    parts.motorId,
    parts.propId,
    parts.stackId,
    parts.batteryId,
    parts.cameraId,
  ];
  const unlockedSet = new Set(unlockedPartIds);
  const selectedPartsList = [frame, motor, prop, stack, battery, camera];

  for (const part of selectedPartsList) {
    if (part.milestoneUnlockId && !unlockedSet.has(part.id)) {
      issues.push({
        severity: 'error',
        message: `${part.name} is a Milestone Prototype — unlock via Pilot Career (${part.milestoneUnlockTitle ?? 'Career Milestone'}).`,
      });
    }
  }

  const lockedPartIds = selectedIds.filter((id) => !unlockedSet.has(id));
  const unlockCost = selectedPartsList.reduce((sum, part) => {
    if (unlockedSet.has(part.id) || part.milestoneUnlockId) return sum;
    return sum + part.cost;
  }, 0);

  return {
    stats: {
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
    },
    blueprint: {
      geometryStyle: frame.geometryStyle,
      armSpanM: frame.armSpanM,
      armThicknessScale: frame.armThicknessScale,
      hasDucts: frame.hasDucts,
      bladeCount: prop.blades,
      motorScale: motor.motorScale,
      stackSize: stack.mountSize,
      heatsinkColor: stack.heatsinkColor,
      batteryScale: battery.packScale,
      camStyle: camera.camStyle,
      antennaStyle: camera.antennaStyle,
    },
    totalMassGrams,
    estimatedPeakAmps,
    escMaxAmps: stack.escAmpsTotal,
    batteryMaxAmps: battery.maxDischargeAmps,
    ampLoadPct,
    issues,
    hasHardError: issues.some((i) => i.severity === 'error'),
    lockedPartIds,
    unlockCost,
  };
}

export function getFactoryFrameBlueprint(frameId: DroneFrameId): DroneVisualBlueprint {
  switch (frameId) {
    case 'veloce-210':
      return {
        geometryStyle: 'stretched-x',
        armSpanM: 0.22,
        armThicknessScale: 0.85,
        hasDucts: false,
        bladeCount: 3,
        motorScale: 1.0,
        stackSize: '20x20',
        heatsinkColor: '#ef4444',
        batteryScale: [0.96, 0.95, 0.96],
        camStyle: 'micro-analog',
        antennaStyle: 'stubby',
      };
    case 'kestrel-35':
      return {
        geometryStyle: 'cinewhoop-duct',
        armSpanM: 0.19,
        armThicknessScale: 0.92,
        hasDucts: true,
        bladeCount: 5,
        motorScale: 0.86,
        stackSize: '20x20',
        heatsinkColor: '#06b6d4',
        batteryScale: [0.9, 0.88, 0.9],
        camStyle: 'o3-digital',
        antennaStyle: 'lollipop',
      };
    case 'helios-7':
      return {
        geometryStyle: 'deadcat-lr',
        armSpanM: 0.33,
        armThicknessScale: 1.18,
        hasDucts: false,
        bladeCount: 3,
        motorScale: 1.28,
        stackSize: '30x30',
        heatsinkColor: '#10b981',
        batteryScale: [1.18, 1.12, 1.32],
        camStyle: 'action-4k',
        antennaStyle: 'long-range',
      };
    case 'apex-x5':
    default:
      return {
        geometryStyle: 'true-x',
        armSpanM: 0.24,
        armThicknessScale: 1.0,
        hasDucts: false,
        bladeCount: 3,
        motorScale: 1.0,
        stackSize: '30x30',
        heatsinkColor: '#f59e0b',
        batteryScale: [1.0, 1.0, 1.0],
        camStyle: 'micro-analog',
        antennaStyle: 'stubby',
      };
  }
}

export interface PaintShopPreset {
  id: string;
  name: string;
  frameColor: string;
  frameFinish: 'matte' | 'gloss' | 'metallic';
  armAccentColor: string; // Motor bells
  propColor: string;
  canopyColor: string;
  ledColor: string;
}

export const PAINT_SHOP_PRESETS: PaintShopPreset[] = [
  {
    id: 'stealth-ember',
    name: 'Stealth Ember',
    frameColor: '#27272a',
    frameFinish: 'matte',
    armAccentColor: '#f59e0b',
    propColor: '#06b6d4',
    canopyColor: '#f59e0b',
    ledColor: '#f59e0b',
  },
  {
    id: 'cyan-vector',
    name: 'Cyan Vector',
    frameColor: '#0f766e',
    frameFinish: 'gloss',
    armAccentColor: '#22d3ee',
    propColor: '#e4e4e7',
    canopyColor: '#06b6d4',
    ledColor: '#22d3ee',
  },
  {
    id: 'crimson-spec',
    name: 'Crimson Spec',
    frameColor: '#7f1d1d',
    frameFinish: 'metallic',
    armAccentColor: '#ef4444',
    propColor: '#facc15',
    canopyColor: '#dc2626',
    ledColor: '#ef4444',
  },
  {
    id: 'titanium-ice',
    name: 'Titanium Ice',
    frameColor: '#d4d4d8',
    frameFinish: 'metallic',
    armAccentColor: '#3b82f6',
    propColor: '#38bdf8',
    canopyColor: '#f4f4f5',
    ledColor: '#38bdf8',
  },
  {
    id: 'volt-acid',
    name: 'Volt Acid',
    frameColor: '#365314',
    frameFinish: 'gloss',
    armAccentColor: '#84cc16',
    propColor: '#a3e635',
    canopyColor: '#65a30d',
    ledColor: '#84cc16',
  },
  {
    id: 'midnight-gold',
    name: 'Midnight Gold',
    frameColor: '#18181b',
    frameFinish: 'metallic',
    armAccentColor: '#eab308',
    propColor: '#fbbf24',
    canopyColor: '#27272a',
    ledColor: '#f59e0b',
  },
];

export function createStarterCustomBuild(): CustomDroneBuild {
  return {
    id: 'custom-slot-1',
    name: 'Apex Custom Mk1',
    parts: { ...DEFAULT_CUSTOM_PARTS },
    customization: {
      frameColor: '#27272a',
      frameFinish: 'matte',
      canopyColor: '#f59e0b',
      armAccentColor: '#27272a',
      propColor: '#06b6d4',
      ledColor: '#f59e0b',
      cameraTiltDeg: 28,
    },
    createdAt: new Date(2026, 0, 1).toISOString(),
  };
}
