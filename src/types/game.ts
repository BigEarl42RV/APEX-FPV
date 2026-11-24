export type ScreenMode =
  | 'title'
  | 'playing'
  | 'paused'
  | 'results'
  | 'garage'
  | 'worldmap';

export type FlightMode = 'acro' | 'angle' | 'airmode';
export type CameraView = 'fpv' | 'chase';
export type StickMode = 'mode2' | 'mode1';

export type DroneFrameId =
  | 'apex-x5'
  | 'veloce-210'
  | 'kestrel-35'
  | 'helios-7';

export type UpgradeCategory = 'motors' | 'battery' | 'props' | 'frame' | 'fc';

export interface UpgradeLevelSpec {
  level: number;
  label: string;
  detail: string;
  cost: number;
  statBoost: number;
}

export interface DroneFrameSpec {
  id: DroneFrameId;
  name: string;
  classLabel: string;
  description: string;
  unlockCost: number;
  baseMassKg: number;
  armSpanM: number;
  baseThrustN: number;
  baseDragCoeff: number;
  baseAgility: number;
  baseBatteryWh: number;
  hasDucts: boolean;
  defaultColors: {
    canopy: string;
    accent: string;
    prop: string;
    led: string;
  };
}

export interface DroneCustomization {
  canopyColor: string;
  armAccentColor: string;
  propColor: string;
  ledColor: string;
  cameraTiltDeg: number;
}

export interface RatesProfile {
  rcRate: number; // 0.5 - 2.0
  superRate: number; // 0.3 - 0.85
  expo: number; // 0.0 - 0.6
  throttleMid: number; // 0.2 - 0.8
  throttleExpo: number; // 0.0 - 0.6
}

export interface UpgradeLevels {
  motors: number; // 0..4
  battery: number; // 0..4
  props: number; // 0..4
  frame: number; // 0..4
  fc: number; // 0..4
}

export interface ComputedDroneStats {
  massKg: number;
  maxThrustN: number;
  thrustToWeight: number;
  topSpeedKmh: number;
  maxRateDegS: number;
  dragCoeff: number;
  batteryWh: number;
  flightMinutes: number;
  armSpanM: number;
  hasDucts: boolean;
  pidResponsiveness: number;
}

export interface PlayerGarageState {
  credits: number;
  unlockedFrames: DroneFrameId[];
  selectedFrame: DroneFrameId;
  upgradesByFrame: Record<DroneFrameId, UpgradeLevels>;
  customizationByFrame: Record<DroneFrameId, DroneCustomization>;
  rates: RatesProfile;
  flightMode: FlightMode;
  stickMode: StickMode;
  cameraView: CameraView;
}

export interface StickInputs {
  throttle: number; // 0..1
  yaw: number; // -1..1
  pitch: number; // -1..1
  roll: number; // -1..1
}

export interface GateDef {
  id: number;
  position: [number, number, number];
  headingRad: number;
  width: number;
  height: number;
  type: 'arch' | 'ring' | 'dive' | 'split';
}

export interface TrackObstacle {
  x: number;
  z: number;
  radius: number;
  height: number;
  kind: 'pylon' | 'tower' | 'rock' | 'tree';
}

export type TrackBiome = 'alpine' | 'coastal' | 'desert' | 'urban';

export interface TrackDef {
  id: string;
  name: string;
  locationLabel: string;
  biome: TrackBiome;
  source: 'builtin' | 'google-maps';
  centerLatLng?: { lat: number; lng: number };
  waypointsLatLng?: Array<{ lat: number; lng: number }>;
  elevationProfileM?: number[];
  minElevationM?: number;
  maxElevationM?: number;
  lapCount: number;
  parTimeSec: number;
  gates: GateDef[];
  obstacles: TrackObstacle[];
  terrainSeed: number;
  terrainScale: number;
  terrainRelief: number;
}

export interface TelemetrySnapshot {
  speedKmh: number;
  altitudeM: number;
  verticalSpeedMs: number;
  throttlePct: number;
  voltageV: number;
  batteryPct: number;
  pitchDeg: number;
  rollDeg: number;
  headingDeg: number;
  currentLap: number;
  totalLaps: number;
  currentGateIndex: number;
  totalGates: number;
  lapTimeMs: number;
  totalTimeMs: number;
  bestLapMs: number | null;
  lastSplitDeltaMs: number | null;
  gateArrowAngleRad: number;
  gateDistM: number;
  motorRpms: [number, number, number, number];
  armed: boolean;
  crashed: boolean;
  countdownSec: number;
}

export interface RaceResultSummary {
  trackId: string;
  trackName: string;
  totalTimeMs: number;
  bestLapMs: number;
  lapTimesMs: number[];
  parTimeMs: number;
  creditsEarned: number;
  isNewRecord: boolean;
  cleanGates: number;
  totalGatesCount: number;
}
