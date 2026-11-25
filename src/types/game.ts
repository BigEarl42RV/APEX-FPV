/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
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
export type HudDensityMode = 'minimal' | 'pure';
export type TouchSticksMode = 'auto' | 'always' | 'hidden';

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

export type FrameFinish = 'matte' | 'gloss' | 'metallic';

export interface DroneCustomization {
  frameColor?: string;
  frameFinish?: FrameFinish;
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

export type GamepadPresetId = 'rc-radio' | 'gamepad-standard' | 'custom';

export interface GamepadAxisMapping {
  index: number;
  invert: boolean;
}

export interface GamepadConfig {
  enabled: boolean;
  preset: GamepadPresetId;
  autoDetectPreset: boolean;
  deadzone: number; // 0..0.25
  throttleBipolar: boolean; // true: full -1..+1 -> 0..1 (RC gimbal); false: center-spring or 0..1
  axes: {
    throttle: GamepadAxisMapping;
    yaw: GamepadAxisMapping;
    pitch: GamepadAxisMapping;
    roll: GamepadAxisMapping;
  };
  buttons: {
    switchCam: number;
    cycleMode: number;
    reset: number;
    pause: number;
  };
}

export type CareerBadgeId =
  | 'cadet-wings'
  | 'gate-centurion'
  | 'gate-master'
  | 'flight-hour'
  | 'endurance-ace'
  | 'mach-pilot'
  | 'medal-collector'
  | 'league-champion';

export type CareerMilestoneCategory =
  | 'gates'
  | 'flight_time'
  | 'speed'
  | 'mastery'
  | 'league';

export type CareerMilestoneMetric =
  | 'totalCleanGates'
  | 'totalFlightSeconds'
  | 'racesCompleted'
  | 'peakSpeedKmh'
  | 'totalDistanceKm'
  | 'goldOrAceMedals'
  | 'leagueChampionships';

export interface CareerBadgeDef {
  id: CareerBadgeId;
  name: string;
  titleTag: string;
  description: string;
  accentHex: string;
  unlockHint: string;
}

export interface CareerMilestoneDef {
  id: string;
  title: string;
  description: string;
  category: CareerMilestoneCategory;
  metric: CareerMilestoneMetric;
  targetValue: number;
  unitLabel: string;
  badgeId?: CareerBadgeId;
  prototypePartId?: string;
  prototypePartName?: string;
  rewardCredits: number;
}

export interface UnlockedMilestoneSummary {
  milestoneId: string;
  title: string;
  badgeId?: CareerBadgeId;
  badgeName?: string;
  prototypePartId?: string;
  prototypePartName?: string;
  rewardCredits: number;
}

export interface PilotProfile {
  callsign: string;
  racesCompleted: number;
  totalCleanGates: number;
  totalFlightSeconds?: number;
  totalDistanceKm?: number;
  peakSpeedKmh?: number;
  unlockedMilestoneIds?: string[];
  unlockedBadgeIds?: CareerBadgeId[];
  equippedBadgeId?: CareerBadgeId | null;
}

export interface CircuitLeaderboardEntry {
  id: string;
  callsign: string;
  circuitId: string;
  frameId: DroneFrameId;
  frameName: string;
  totalTimeMs: number;
  bestLapMs: number;
  cleanGates: number;
  recordedAt: string;
}

export type GraphicsQuality = 'ultra' | 'high' | 'performance';
export type FirmwareLevel = 0 | 1 | 2;
export type GoggleFeedMode = 'digital-hd' | 'action-raw' | 'analog-raceband';
export type HudModuleId = 'racingLine3d' | 'gateRadar' | 'blackboxGhostDelta';
export type CareerMedalTier = 'none' | 'bronze' | 'silver' | 'gold' | 'ace';

export interface SoftwareLoadout {
  firmwareLevel: FirmwareLevel;
  unlockedFirmwareLevel: FirmwareLevel;
  unlockedHudModules: HudModuleId[];
  enabledHudModules: Record<HudModuleId, boolean>;
  unlockedGoggleModes: GoggleFeedMode[];
  goggleMode: GoggleFeedMode;
  analogFxEnabled: boolean;
}

/** Compact 15Hz ghost keyframe: [timeMs, px, py, pz, qx, qy, qz, qw] */
export type GhostKeyframe = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface GhostRecording {
  trackId: string;
  frameId: DroneFrameId;
  totalTimeMs: number;
  label: string;
  isProTarget?: boolean;
  frames: GhostKeyframe[];
}

export type SponsorContractObjective =
  | 'clean_gates'
  | 'finish_races'
  | 'beat_par'
  | 'high_speed_kmh'
  | 'gold_medal';

export interface SponsorContract {
  id: string;
  sponsorName: string;
  title: string;
  description: string;
  objectiveType: SponsorContractObjective;
  targetValue: number;
  progressValue: number;
  rewardCredits: number;
  completed: boolean;
}

export type PropSizeClass = '3.5' | '5' | '7';
export type FrameGeometryStyle =
  | 'true-x'
  | 'stretched-x'
  | 'cinewhoop-duct'
  | 'deadcat-lr';
export type BuildPartCategory =
  | 'frame'
  | 'motors'
  | 'props'
  | 'stack'
  | 'battery'
  | 'camera';

export interface BuilderFramePart {
  id: string;
  name: string;
  sizeClass: PropSizeClass;
  geometryStyle: FrameGeometryStyle;
  massGrams: number;
  armSpanM: number;
  armThicknessScale: number;
  dragCoeff: number;
  agility: number;
  hasDucts: boolean;
  maxCells: 4 | 6;
  cost: number;
  milestoneUnlockId?: string;
  milestoneUnlockTitle?: string;
  detail: string;
}

export interface BuilderMotorPart {
  id: string;
  name: string;
  statorLabel: string;
  kv: number;
  supportedCells: Array<4 | 6>;
  idealSizeClass: PropSizeClass;
  massGrams: number; // total for 4 motors
  baseThrustN: number;
  peakAmpsTotal: number;
  motorScale: number;
  cost: number;
  milestoneUnlockId?: string;
  milestoneUnlockTitle?: string;
  detail: string;
}

export interface BuilderPropPart {
  id: string;
  name: string;
  sizeClass: PropSizeClass;
  blades: 2 | 3 | 5;
  massGrams: number; // total for 4 props
  thrustFactor: number;
  efficiencyFactor: number;
  dragFactor: number;
  cost: number;
  milestoneUnlockId?: string;
  milestoneUnlockTitle?: string;
  detail: string;
}

export interface BuilderStackPart {
  id: string;
  name: string;
  mountSize: '20x20' | '30x30';
  escAmpsTotal: number; // 4-in-1 combined peak rating
  maxCells: 4 | 6;
  massGrams: number;
  pidBoost: number;
  heatsinkColor: string;
  cost: number;
  milestoneUnlockId?: string;
  milestoneUnlockTitle?: string;
  detail: string;
}

export interface BuilderBatteryPart {
  id: string;
  name: string;
  cells: 4 | 6;
  capacityMah: number;
  chemistry: 'lipo' | 'lihv' | 'li-ion';
  massGrams: number;
  wh: number;
  maxDischargeAmps: number;
  packScale: [number, number, number];
  cost: number;
  milestoneUnlockId?: string;
  milestoneUnlockTitle?: string;
  detail: string;
}

export interface BuilderCameraPart {
  id: string;
  name: string;
  camStyle: 'micro-analog' | 'o3-digital' | 'action-4k';
  antennaStyle: 'stubby' | 'lollipop' | 'long-range';
  massGrams: number;
  dragPenalty: number;
  cost: number;
  milestoneUnlockId?: string;
  milestoneUnlockTitle?: string;
  detail: string;
}

export interface CustomDronePartsSelection {
  frameId: string;
  motorId: string;
  propId: string;
  stackId: string;
  batteryId: string;
  cameraId: string;
}

export interface CustomDroneBuild {
  id: string;
  name: string;
  parts: CustomDronePartsSelection;
  customization: DroneCustomization;
  createdAt: string;
}

export interface DroneVisualBlueprint {
  geometryStyle: FrameGeometryStyle;
  armSpanM: number;
  armThicknessScale: number;
  hasDucts: boolean;
  bladeCount: 2 | 3 | 5;
  motorScale: number;
  stackSize: '20x20' | '30x30';
  heatsinkColor: string;
  batteryScale: [number, number, number];
  camStyle: 'micro-analog' | 'o3-digital' | 'action-4k';
  antennaStyle: 'stubby' | 'lollipop' | 'long-range';
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
  gamepad?: GamepadConfig;
  software?: SoftwareLoadout;
  graphicsQuality?: GraphicsQuality;
  unlockedPartIds?: string[];
  customBuilds?: CustomDroneBuild[];
  activeCustomBuildId?: string | null;
  hudDensity?: HudDensityMode;
  touchSticksMode?: TouchSticksMode;
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
  gateElevationDiffM: number;
  ghostDeltaMs: number | null;
  ghostDistM: number | null;
  ghostLabel: string | null;
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
  medalBonusCredits: number;
  contractRewardsCredits: number;
  completedContractTitles: string[];
  earnedMedal: CareerMedalTier;
  previousMedal: CareerMedalTier;
  beatGhost: boolean;
  ghostLabel: string | null;
  maxSpeedKmh: number;
  isNewRecord: boolean;
  cleanGates: number;
  totalGatesCount: number;
  leagueOutcome?: LeagueOutcomeSummary;
  newlyUnlockedMilestones?: UnlockedMilestoneSummary[];
}

export type LeagueStage = 'qualifier' | 'final';
export type LeagueRoundStatus = 'locked' | 'qualifying' | 'qualified' | 'completed';
export type SponsorTierId = 'club' | 'pro-am' | 'factory' | 'vip';

export interface LeagueSponsorOffer {
  id: string;
  teamName: string;
  tier: SponsorTierId;
  tagline: string;
  minRep: number;
  minQualifiedRounds: number;
  signingBonusCr: number;
  podiumMultiplier: number;
  vipFinalBonusCr: number;
  accentHex: string;
}

export interface LeagueDriverStanding {
  id: string;
  name: string;
  team: string;
  points: number;
  wins: number;
  podiums: number;
  isPlayer?: boolean;
}

export interface LeagueRoundState {
  roundNumber: number;
  roundId: string;
  title: string;
  subtitle: string;
  trackId: string;
  qualifyingCutOffMs: number;
  poleTimeMs: number;
  finalAiTimesMs: number[];
  baseQualifyPurseCr: number;
  baseFinalPurseCr: number;
  status: LeagueRoundStatus;
  bestQualifyingMs: number | null;
  gridSeed: number | null;
  bestFinalMs: number | null;
  finalPlacement: number | null;
}

export interface LeagueSeasonState {
  seasonNumber: number;
  pilotRep: number;
  activeSponsorId: string | null;
  claimedSponsorIds: string[];
  rounds: LeagueRoundState[];
  aiPointsByDriverId: Record<string, number>;
  aiWinsByDriverId: Record<string, number>;
  aiPodiumsByDriverId: Record<string, number>;
  seasonCompleted: boolean;
  championshipsWon: number;
}

export interface ActiveLeagueSession {
  seasonNumber: number;
  roundNumber: number;
  roundTitle: string;
  trackId: string;
  stage: LeagueStage;
  cutOffMs: number;
  poleTimeMs: number;
  finalAiTimesMs: number[];
}

export interface LeagueOutcomeSummary {
  roundNumber: number;
  roundTitle: string;
  stage: LeagueStage;
  qualified?: boolean;
  cutOffMs?: number;
  gridSeed?: number | null;
  placement?: number;
  pointsEarned?: number;
  repEarned: number;
  sponsorTeamName: string | null;
  sponsorMultiplier: number;
  sponsorBonusCredits: number;
  newlyUnlockedSponsorNames: string[];
  seasonCompleted?: boolean;
  seasonRank?: number;
}

