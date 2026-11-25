/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  computeDroneStats,
  createInitialGarageState,
  getFrameSpec,
  normalizeGarageState,
} from './data/drones';
import {
  DEFAULT_CUSTOM_PARTS,
  MAX_CUSTOM_BUILD_SLOTS,
  createStarterCustomBuild,
  evaluateCustomDroneBuild,
  getFactoryFrameBlueprint,
} from './data/droneBuilder';
import { BUILTIN_TRACKS } from './data/tracks';
import {
  FIRMWARE_CATALOG,
  MEDAL_BONUS_CREDITS,
  advanceContractsForRace,
  createInitialSponsorContracts,
  evaluateMedalTier,
  getNextTargetMedal,
  isHigherMedal,
  normalizeSoftwareLoadout,
  rotateSponsorContract,
  synthesizeProTargetGhost,
} from './data/progression';
import {
  LEAGUE_SPONSOR_OFFERS,
  createInitialLeagueSeasonState,
  evaluateLeagueFinalRun,
  evaluateLeagueQualifierRun,
  isSponsorOfferUnlocked,
  normalizeLeagueSeasonState,
} from './data/league';
import { fpvAudio } from './engine/audio';
import {
  createDefaultGamepadConfig,
  detectGamepadPreset,
  normalizeGamepadConfig,
} from './engine/gamepad';
import {
  installStudioConsoleSignature,
  verifyRuntimeIntegrity,
} from './engine/ownershipGuard';
import { FpvViewport, type MultiplayerViewportConfig } from './engine/FpvViewport';
import { mpClient, type MultiplayerClientState } from './engine/multiplayerClient';
import { TitleOverlay } from './components/TitleOverlay';
import { TouchController } from './components/TouchController';
import { FpvOsdHud } from './components/FpvOsdHud';
import { GarageModal } from './components/GarageModal';
import { PauseModal, ResultsModal } from './components/PauseResultsModal';
import { WorldMapModal } from './components/WorldMapModal';
import { GamepadConfigModal } from './components/GamepadConfigModal';
import { LeagueSeasonModal } from './components/LeagueSeasonModal';
import { PilotCareerModal } from './components/PilotCareerModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { MultiplayerResultsModal } from './components/MultiplayerResultsModal';
import {
  LegalOwnershipModal,
  UnauthorizedMirrorGate,
} from './components/LegalOwnershipModal';
import { ConsolePromptBar, OfflineIndicator } from './components/PWAAndDeviceUI';
import { evaluateCareerProgression, normalizePilotProfile } from './data/career';
import { useDevicePosture } from './hooks/useDevicePosture';
import { useGamepadMenuNav } from './hooks/useGamepadMenuNav';
import type {
  ActiveLeagueSession,
  CareerBadgeId,
  CareerMedalTier,
  CircuitLeaderboardEntry,
  CustomDroneBuild,
  CustomDronePartsSelection,
  DroneCustomization,
  DroneFrameId,
  FirmwareLevel,
  FlightMode,
  GamepadConfig,
  GhostKeyframe,
  GhostRecording,
  GoggleFeedMode,
  GraphicsQuality,
  HudDensityMode,
  HudModuleId,
  LeagueRoundState,
  LeagueSeasonState,
  LeagueStage,
  PilotProfile,
  PlayerGarageState,
  RaceResultSummary,
  RatesProfile,
  ScreenMode,
  SponsorContract,
  StickInputs,
  StickMode,
  TelemetrySnapshot,
  TouchSticksMode,
  TrackDef,
  UpgradeCategory,
} from './types/game';

const STORAGE_KEY_GARAGE = 'stratum_fpv_garage_v1';
const STORAGE_KEY_TRACKS = 'stratum_fpv_custom_tracks_v1';
const STORAGE_KEY_RECORDS = 'stratum_fpv_records_v1';
const STORAGE_KEY_PILOT = 'stratum_fpv_pilot_v1';
const STORAGE_KEY_LEADERBOARDS = 'stratum_fpv_leaderboards_v1';
const STORAGE_KEY_MEDALS = 'stratum_fpv_medals_v1';
const STORAGE_KEY_CONTRACTS = 'stratum_fpv_contracts_v1';
const STORAGE_KEY_GHOSTS = 'stratum_fpv_ghosts_v1';
const STORAGE_KEY_LEAGUE = 'stratum_fpv_league_v1';

const INITIAL_PILOT: PilotProfile = {
  callsign: 'APEX-01',
  racesCompleted: 0,
  totalCleanGates: 0,
  totalFlightSeconds: 0,
  totalDistanceKm: 0,
  peakSpeedKmh: 0,
  unlockedMilestoneIds: [],
  unlockedBadgeIds: [],
  equippedBadgeId: null,
};

const INITIAL_TELEMETRY: TelemetrySnapshot = {
  speedKmh: 0,
  altitudeM: 0.4,
  verticalSpeedMs: 0,
  throttlePct: 28,
  voltageV: 25.2,
  batteryPct: 100,
  pitchDeg: 0,
  rollDeg: 0,
  headingDeg: 0,
  currentLap: 1,
  totalLaps: 3,
  currentGateIndex: 0,
  totalGates: 10,
  lapTimeMs: 0,
  totalTimeMs: 0,
  bestLapMs: null,
  lastSplitDeltaMs: null,
  gateArrowAngleRad: 0,
  gateDistM: 16,
  gateElevationDiffM: 0,
  ghostDeltaMs: null,
  ghostDistM: null,
  ghostLabel: null,
  motorRpms: [0, 0, 0, 0],
  armed: true,
  crashed: false,
  countdownSec: 3,
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [screenMode, setScreenMode] = useState<ScreenMode>('title');
  const [previousScreen, setPreviousScreen] = useState<ScreenMode>('title');
  const [medalsByTrack, setMedalsByTrack] = useState<
    Record<string, CareerMedalTier>
  >(() => loadFromStorage(STORAGE_KEY_MEDALS, {}));
  const [leagueSeason, setLeagueSeason] = useState<LeagueSeasonState>(() =>
    normalizeLeagueSeasonState(
      loadFromStorage(STORAGE_KEY_LEAGUE, createInitialLeagueSeasonState())
    )
  );
  const [pilotProfile, setPilotProfile] = useState<PilotProfile>(() =>
    normalizePilotProfile(
      loadFromStorage(STORAGE_KEY_PILOT, INITIAL_PILOT),
      medalsByTrack,
      leagueSeason
    ).pilot
  );
  const [garage, setGarage] = useState<PlayerGarageState>(() => {
    const loaded = normalizeGarageState(
      loadFromStorage(STORAGE_KEY_GARAGE, createInitialGarageState())
    );
    const earnedProtoIds = normalizePilotProfile(
      loadFromStorage(STORAGE_KEY_PILOT, INITIAL_PILOT),
      medalsByTrack,
      leagueSeason
    ).unlockedPrototypePartIds;
    if (earnedProtoIds.length === 0) return loaded;
    return {
      ...loaded,
      unlockedPartIds: Array.from(
        new Set([...(loaded.unlockedPartIds ?? []), ...earnedProtoIds])
      ),
    };
  });
  const [savedCustomTracks, setSavedCustomTracks] = useState<TrackDef[]>(() =>
    loadFromStorage(STORAGE_KEY_TRACKS, [])
  );
  const [bestTimesByTrack, setBestTimesByTrack] = useState<Record<string, number>>(() =>
    loadFromStorage(STORAGE_KEY_RECORDS, {})
  );
  const [sponsorContracts, setSponsorContracts] = useState<SponsorContract[]>(() =>
    loadFromStorage(STORAGE_KEY_CONTRACTS, createInitialSponsorContracts())
  );
  const [ghostRunsByTrack, setGhostRunsByTrack] = useState<
    Record<string, GhostRecording>
  >(() => loadFromStorage(STORAGE_KEY_GHOSTS, {}));
  const [leaderboardsByTrack, setLeaderboardsByTrack] = useState<
    Record<string, CircuitLeaderboardEntry[]>
  >(() => loadFromStorage(STORAGE_KEY_LEADERBOARDS, {}));

  const [activeTrack, setActiveTrack] = useState<TrackDef>(BUILTIN_TRACKS[0]);
  const [raceRunId, setRaceRunId] = useState<number>(1);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(INITIAL_TELEMETRY);
  const [gateFlash, setGateFlash] = useState(false);
  const [raceResults, setRaceResults] = useState<RaceResultSummary | null>(null);
  const [muted, setMuted] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [gamepadStatus, setGamepadStatus] = useState<{ connected: boolean; id: string }>({
    connected: false,
    id: '',
  });
  const [isGamepadModalOpen, setIsGamepadModalOpen] = useState(false);
  const [isCapturingGamepad, setIsCapturingGamepad] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isLeagueModalOpen, setIsLeagueModalOpen] = useState(false);
  const [isCareerModalOpen, setIsCareerModalOpen] = useState(false);
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState(false);
  const [mpState, setMpState] = useState<MultiplayerClientState>(() => mpClient.state);
  const [mpCreditsAwarded, setMpCreditsAwarded] = useState(0);
  const mpFireTriggerRef = useRef<(() => void) | null>(null);
  const prevMpStatusRef = useRef<string | null>(null);
  const prevMpFlPhaseRef = useRef<string | null>(null);
  const prevMpFlRoundRef = useRef<number | null>(null);
  const [activeLeagueSession, setActiveLeagueSession] =
    useState<ActiveLeagueSession | null>(null);
  const runtimeIntegrity = useMemo(() => verifyRuntimeIntegrity(), []);
  const posture = useDevicePosture();
  const pilotProfileRef = useRef(pilotProfile);
  pilotProfileRef.current = pilotProfile;

  // Build Bench draft & 3D inspection state
  const initialCustomSlot =
    (garage.activeCustomBuildId &&
      garage.customBuilds?.find((b) => b.id === garage.activeCustomBuildId)) ||
    (garage.customBuilds && garage.customBuilds[0]) ||
    createStarterCustomBuild();
  const [benchTabActive, setBenchTabActive] = useState(true);
  const [benchExploded, setBenchExploded] = useState(false);
  const [benchCameraResetKey, setBenchCameraResetKey] = useState(0);
  const [benchEditingSlotId, setBenchEditingSlotId] = useState<string | null>(
    garage.activeCustomBuildId ?? initialCustomSlot.id
  );
  const [benchDraftParts, setBenchDraftParts] = useState<CustomDronePartsSelection>(
    () => initialCustomSlot.parts
  );
  const [benchDraftCustom, setBenchDraftCustom] = useState<DroneCustomization>(() => ({
    frameColor: '#27272a',
    frameFinish: 'matte',
    ...initialCustomSlot.customization,
  }));
  const [benchDraftName, setBenchDraftName] = useState<string>(
    () => initialCustomSlot.name
  );

  const touchSticksRef = useRef<StickInputs>({
    throttle: 0.28,
    yaw: 0,
    pitch: 0,
    roll: 0,
  });

  useEffect(() => {
    installStudioConsoleSignature();
  }, []);

  useEffect(() => {
    const unlockOnce = () => fpvAudio.unlock();
    window.addEventListener('pointerdown', unlockOnce, {
      once: true,
      passive: true,
    });
    return () => window.removeEventListener('pointerdown', unlockOnce);
  }, []);

  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  // Persist local player state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GARAGE, JSON.stringify(garage));
    } catch {
      // Ignore storage quota errors
    }
  }, [garage]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PILOT, JSON.stringify(pilotProfile));
    } catch {
      // Ignore
    }
  }, [pilotProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRACKS, JSON.stringify(savedCustomTracks));
    } catch {
      // Ignore
    }
  }, [savedCustomTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(bestTimesByTrack));
    } catch {
      // Ignore
    }
  }, [bestTimesByTrack]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MEDALS, JSON.stringify(medalsByTrack));
    } catch {
      // Ignore
    }
  }, [medalsByTrack]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(sponsorContracts));
    } catch {
      // Ignore
    }
  }, [sponsorContracts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GHOSTS, JSON.stringify(ghostRunsByTrack));
    } catch {
      // Ignore
    }
  }, [ghostRunsByTrack]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_LEADERBOARDS,
        JSON.stringify(leaderboardsByTrack)
      );
    } catch {
      // Ignore
    }
  }, [leaderboardsByTrack]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LEAGUE, JSON.stringify(leagueSeason));
    } catch {
      // Ignore
    }
  }, [leagueSeason]);

  const activeFrame = useMemo(
    () => getFrameSpec(garage.selectedFrame),
    [garage.selectedFrame]
  );
  const activeUpgrades = garage.upgradesByFrame[garage.selectedFrame];
  const activeGamepadConfig = useMemo(
    () => normalizeGamepadConfig(garage.gamepad),
    [garage.gamepad]
  );
  const activeSoftware = useMemo(
    () => normalizeSoftwareLoadout(garage.software),
    [garage.software]
  );
  const graphicsQuality: GraphicsQuality = garage.graphicsQuality ?? 'ultra';
  const hudDensity: HudDensityMode = garage.hudDensity ?? 'minimal';
  const touchSticksMode: TouchSticksMode = garage.touchSticksMode ?? 'auto';
  const activeFirmwareSpec =
    FIRMWARE_CATALOG[activeSoftware.firmwareLevel] ?? FIRMWARE_CATALOG[0];

  const customBuilds = useMemo(
    () => garage.customBuilds ?? [createStarterCustomBuild()],
    [garage.customBuilds]
  );
  const activeCustomBuild = useMemo(
    () =>
      garage.activeCustomBuildId
        ? customBuilds.find((b) => b.id === garage.activeCustomBuildId) ?? null
        : null,
    [customBuilds, garage.activeCustomBuildId]
  );

  const activeCustomEval = useMemo(
    () =>
      activeCustomBuild
        ? evaluateCustomDroneBuild(
            activeCustomBuild.parts,
            garage.rates,
            activeSoftware.firmwareLevel,
            garage.unlockedPartIds ?? []
          )
        : null,
    [
      activeCustomBuild,
      garage.rates,
      activeSoftware.firmwareLevel,
      garage.unlockedPartIds,
    ]
  );

  const activeCustom: DroneCustomization = activeCustomBuild
    ? activeCustomBuild.customization
    : garage.customizationByFrame[garage.selectedFrame];

  const activeStats = useMemo(
    () =>
      activeCustomEval
        ? activeCustomEval.stats
        : computeDroneStats(
            garage.selectedFrame,
            activeUpgrades,
            garage.rates,
            activeSoftware.firmwareLevel
          ),
    [
      activeCustomEval,
      garage.selectedFrame,
      activeUpgrades,
      garage.rates,
      activeSoftware.firmwareLevel,
    ]
  );

  const activeRigName = activeCustomBuild
    ? activeCustomBuild.name
    : activeFrame.name;
  const activeRigClass = activeCustomBuild
    ? 'Custom Built FPV Quad'
    : activeFrame.classLabel;

  const benchPreviewEval = useMemo(
    () =>
      evaluateCustomDroneBuild(
        benchDraftParts,
        garage.rates,
        activeSoftware.firmwareLevel,
        garage.unlockedPartIds ?? []
      ),
    [
      benchDraftParts,
      garage.rates,
      activeSoftware.firmwareLevel,
      garage.unlockedPartIds,
    ]
  );

  const isInspectingBench = screenMode === 'garage' && benchTabActive;
  const viewportBlueprint = isInspectingBench
    ? benchPreviewEval.blueprint
    : activeCustomEval
      ? activeCustomEval.blueprint
      : getFactoryFrameBlueprint(garage.selectedFrame);

  // Select Multiplayer Follow-Leader Ghost, League Qualifier ghost, PB ghost, or Pro Target ghost
  const currentTrackMedal: CareerMedalTier = medalsByTrack[activeTrack.id] ?? 'none';
  const activeGhost: GhostRecording | null = useMemo(() => {
    const mpRoom = mpState.room;
    if (
      mpRoom &&
      (mpRoom.status === 'playing' || mpRoom.status === 'countdown') &&
      mpRoom.mode === 'follow-leader' &&
      mpRoom.followLeader
    ) {
      if (
        mpRoom.followLeader.phase === 'challenger-turn' &&
        mpRoom.followLeader.ghostFrames.length > 3
      ) {
        return {
          trackId: mpRoom.trackId,
          frameId: garage.selectedFrame,
          totalTimeMs: mpRoom.followLeader.leaderTargetMs ?? 25000,
          label: `LEADER ${mpRoom.followLeader.leaderCallsign}`,
          isProTarget: true,
          frames: mpRoom.followLeader.ghostFrames,
        };
      }
      return null;
    }
    if (activeLeagueSession?.stage === 'qualifier') {
      const qGhost = synthesizeProTargetGhost(activeTrack, 'silver');
      return {
        ...qGhost,
        totalTimeMs: activeLeagueSession.cutOffMs,
        label: 'QUAL CUT-OFF',
      };
    }
    const savedPb = ghostRunsByTrack[activeTrack.id];
    if (savedPb && savedPb.frames.length > 5) {
      return savedPb;
    }
    const targetTier = getNextTargetMedal(currentTrackMedal);
    return synthesizeProTargetGhost(activeTrack, targetTier);
  }, [
    mpState.room,
    garage.selectedFrame,
    activeLeagueSession,
    activeTrack,
    currentTrackMedal,
    ghostRunsByTrack,
  ]);

  const handleGamepadStatus = useCallback(
    (status: { connected: boolean; id: string }) => {
      setGamepadStatus(status);
      if (status.connected && status.id) {
        setGarage((prev) => {
          const cur = normalizeGamepadConfig(prev.gamepad);
          if (!cur.autoDetectPreset || cur.preset === 'custom') return prev;
          const detected = detectGamepadPreset(status.id);
          if (detected === cur.preset) return prev;
          return {
            ...prev,
            gamepad: {
              ...createDefaultGamepadConfig(detected),
              enabled: cur.enabled,
            },
          };
        });
      }
    },
    []
  );

  const startFreeRace = useCallback(() => {
    fpvAudio.unlock();
    setActiveLeagueSession(null);
    setActiveTrack((cur) => {
      const canonical = BUILTIN_TRACKS.find((t) => t.id === cur.id);
      return canonical ?? cur;
    });
    setRaceResults(null);
    setRaceRunId((n) => n + 1);
    setScreenMode('playing');
  }, []);

  const retryActiveRace = useCallback(() => {
    fpvAudio.unlock();
    setRaceResults(null);
    setRaceRunId((n) => n + 1);
    setScreenMode('playing');
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (
        screenMode === 'title' &&
        !isGamepadModalOpen &&
        !isLegalModalOpen &&
        !isLeagueModalOpen &&
        !isCareerModalOpen &&
        !isMultiplayerModalOpen &&
        (e.code === 'Enter' || e.code === 'Space')
      ) {
        e.preventDefault();
        startFreeRace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    screenMode,
    isGamepadModalOpen,
    isLegalModalOpen,
    isLeagueModalOpen,
    isCareerModalOpen,
    isMultiplayerModalOpen,
    startFreeRace,
  ]);

  // Subscribe to multiplayer WebSocket state & match transitions
  useEffect(() => {
    const unsub = mpClient.subscribe(() => setMpState(mpClient.state));
    mpClient.onAudioEvent = (kind) => {
      if (kind === 'laser_fire') fpvAudio.playLaserPulse();
      else if (kind === 'laser_hit') fpvAudio.playHitConfirm(false);
      else if (kind === 'laser_elim') fpvAudio.playHitConfirm(true);
      else if (kind === 'shield_damaged') fpvAudio.playShieldHit();
      else if (kind === 'tag_transferred') fpvAudio.playTagTransfer();
    };
    return () => {
      unsub();
      mpClient.onAudioEvent = null;
    };
  }, []);

  useEffect(() => {
    if (mpState.status === 'connected') {
      mpClient.updateIdentity({
        callsign: pilotProfile.callsign,
        frameId: garage.selectedFrame,
        ledColor: activeCustom.ledColor,
        canopyColor: activeCustom.canopyColor,
        equippedBadgeId: pilotProfile.equippedBadgeId ?? null,
      });
    }
  }, [
    mpState.status,
    pilotProfile.callsign,
    pilotProfile.equippedBadgeId,
    garage.selectedFrame,
    activeCustom.ledColor,
    activeCustom.canopyColor,
  ]);

  useEffect(() => {
    const room = mpState.room;
    const nextStatus = room?.status ?? null;
    const prevStatus = prevMpStatusRef.current;
    prevMpStatusRef.current = nextStatus;

    if (!room) {
      prevMpFlPhaseRef.current = null;
      prevMpFlRoundRef.current = null;
      return;
    }

    if (
      (nextStatus === 'countdown' || nextStatus === 'playing') &&
      prevStatus !== 'countdown' &&
      prevStatus !== 'playing'
    ) {
      fpvAudio.unlock();
      setActiveLeagueSession(null);
      setRaceResults(null);
      setMpCreditsAwarded(0);
      setIsMultiplayerModalOpen(false);
      const mpTrack: TrackDef = {
        ...room.trackSnapshot,
        lapCount:
          room.mode === 'follow-leader' || room.mode === 'team-race'
            ? room.rules.lapCount
            : room.trackSnapshot.lapCount,
      };
      setActiveTrack(mpTrack);
      setRaceRunId((n) => n + 1);
      setScreenMode('playing');
      prevMpFlPhaseRef.current = room.followLeader?.phase ?? null;
      prevMpFlRoundRef.current = room.followLeader?.roundNumber ?? null;
      return;
    }

    if (nextStatus === 'playing' && room.mode === 'follow-leader' && room.followLeader) {
      const fl = room.followLeader;
      if (
        fl.phase !== prevMpFlPhaseRef.current ||
        fl.roundNumber !== prevMpFlRoundRef.current
      ) {
        prevMpFlPhaseRef.current = fl.phase;
        prevMpFlRoundRef.current = fl.roundNumber;
        if (fl.phase === 'leader-turn' || fl.phase === 'challenger-turn') {
          setRaceRunId((n) => n + 1);
        }
      }
    }

    if (nextStatus === 'results' && prevStatus !== 'results') {
      const me = room.participants.find((p) => p.id === mpState.playerId);
      const won =
        room.winnerPlayerId === mpState.playerId ||
        (room.rules.teamMode === 'teams' && me && me.team === room.winnerTeam);
      const payout = won ? 340 : 180;
      setMpCreditsAwarded(payout);
      setGarage((prev) => ({ ...prev, credits: prev.credits + payout }));
      const nextPilot: PilotProfile = {
        ...pilotProfileRef.current,
        racesCompleted: pilotProfileRef.current.racesCompleted + 1,
      };
      const careerEval = evaluateCareerProgression(
        nextPilot,
        medalsByTrack,
        leagueSeason
      );
      pilotProfileRef.current = careerEval.nextPilot;
      setPilotProfile(careerEval.nextPilot);
      setScreenMode('title');
    }

    if (
      nextStatus === 'lobby' &&
      (prevStatus === 'results' || prevStatus === 'playing' || prevStatus === 'countdown')
    ) {
      setScreenMode('title');
      setIsMultiplayerModalOpen(true);
    }
  }, [mpState.room, mpState.playerId, medalsByTrack, leagueSeason]);

  const handleTogglePause = useCallback(() => {
    if (isLegalModalOpen) {
      setIsLegalModalOpen(false);
      return;
    }
    if (isGamepadModalOpen) {
      setIsGamepadModalOpen(false);
      return;
    }
    if (isLeagueModalOpen) {
      setIsLeagueModalOpen(false);
      return;
    }
    if (isCareerModalOpen) {
      setIsCareerModalOpen(false);
      return;
    }
    if (isMultiplayerModalOpen) {
      setIsMultiplayerModalOpen(false);
      return;
    }
    setScreenMode((cur) =>
      cur === 'playing' ? 'paused' : cur === 'paused' ? 'playing' : cur
    );
  }, [
    isGamepadModalOpen,
    isLegalModalOpen,
    isLeagueModalOpen,
    isCareerModalOpen,
    isMultiplayerModalOpen,
  ]);

  const handleMenuBack = useCallback(() => {
    if (isLegalModalOpen) {
      setIsLegalModalOpen(false);
      return;
    }
    if (isGamepadModalOpen) {
      setIsGamepadModalOpen(false);
      return;
    }
    if (isLeagueModalOpen) {
      setIsLeagueModalOpen(false);
      return;
    }
    if (isCareerModalOpen) {
      setIsCareerModalOpen(false);
      return;
    }
    if (isMultiplayerModalOpen) {
      setIsMultiplayerModalOpen(false);
      return;
    }
    if (screenMode === 'garage' || screenMode === 'worldmap') {
      setScreenMode(previousScreen);
      return;
    }
    if (screenMode === 'paused') {
      setScreenMode('playing');
      return;
    }
    if (screenMode === 'results') {
      setActiveLeagueSession(null);
      setScreenMode('title');
    }
  }, [
    isGamepadModalOpen,
    isLegalModalOpen,
    isLeagueModalOpen,
    isCareerModalOpen,
    isMultiplayerModalOpen,
    previousScreen,
    screenMode,
  ]);

  const handleMenuStart = useCallback(() => {
    if (
      isLegalModalOpen ||
      isGamepadModalOpen ||
      isLeagueModalOpen ||
      isCareerModalOpen ||
      isMultiplayerModalOpen
    ) {
      return;
    }
    if (screenMode === 'title') {
      startFreeRace();
    } else if (screenMode === 'paused') {
      setScreenMode('playing');
    }
  }, [
    isGamepadModalOpen,
    isLegalModalOpen,
    isLeagueModalOpen,
    isCareerModalOpen,
    isMultiplayerModalOpen,
    screenMode,
    startFreeRace,
  ]);

  useGamepadMenuNav({
    enabled:
      screenMode !== 'playing' &&
      gamepadStatus.connected &&
      !isCapturingGamepad,
    onBack: handleMenuBack,
    onStart: handleMenuStart,
  });

  const handleToggleHudDensity = useCallback(() => {
    setGarage((prev) => ({
      ...prev,
      hudDensity: (prev.hudDensity ?? 'minimal') === 'minimal' ? 'pure' : 'minimal',
    }));
  }, []);

  const handleChangeHudDensity = (h: HudDensityMode) => {
    setGarage((prev) => ({ ...prev, hudDensity: h }));
  };

  const handleChangeTouchSticksMode = (t: TouchSticksMode) => {
    setGarage((prev) => ({ ...prev, touchSticksMode: t }));
  };

  const handleQuickSwitchCam = useCallback(() => {
    setGarage((prev) => ({
      ...prev,
      cameraView: prev.cameraView === 'fpv' ? 'chase' : 'fpv',
    }));
  }, []);

  const handleCycleFlightMode = useCallback(() => {
    setGarage((prev) => {
      const order: FlightMode[] = ['acro', 'airmode', 'angle'];
      const next = order[(order.indexOf(prev.flightMode) + 1) % order.length];
      return { ...prev, flightMode: next };
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    fpvAudio.unlock();
    setMuted((prev) => {
      const next = !prev;
      fpvAudio.setMuted(next);
      return next;
    });
  }, []);

  const handleGatePassed = useCallback(() => {
    setGateFlash(true);
    window.setTimeout(() => setGateFlash(false), 260);
  }, []);

  const handleEquipBadge = useCallback((badgeId: CareerBadgeId) => {
    setPilotProfile((prev) => {
      if (!(prev.unlockedBadgeIds ?? []).includes(badgeId)) return prev;
      return { ...prev, equippedBadgeId: badgeId };
    });
  }, []);

  const handleFlightSessionAccumulate = useCallback(
    (flightSeconds: number, distanceKm: number, maxSpeedKmh: number) => {
      if (flightSeconds <= 0 && distanceKm <= 0 && maxSpeedKmh <= 0) return;
      const prev = pilotProfileRef.current;
      const updated: PilotProfile = {
        ...prev,
        totalFlightSeconds: Number(
          ((prev.totalFlightSeconds ?? 0) + flightSeconds).toFixed(1)
        ),
        totalDistanceKm: Number(
          ((prev.totalDistanceKm ?? 0) + distanceKm).toFixed(3)
        ),
        peakSpeedKmh: Math.max(prev.peakSpeedKmh ?? 0, maxSpeedKmh),
      };
      const careerEval = evaluateCareerProgression(
        updated,
        medalsByTrack,
        leagueSeason
      );
      pilotProfileRef.current = careerEval.nextPilot;
      setPilotProfile(careerEval.nextPilot);

      if (
        careerEval.totalRewardCredits > 0 ||
        careerEval.newlyUnlockedPrototypePartIds.length > 0
      ) {
        setGarage((gPrev) => ({
          ...gPrev,
          credits: gPrev.credits + careerEval.totalRewardCredits,
          unlockedPartIds:
            careerEval.newlyUnlockedPrototypePartIds.length > 0
              ? Array.from(
                  new Set([
                    ...(gPrev.unlockedPartIds ?? []),
                    ...careerEval.newlyUnlockedPrototypePartIds,
                  ])
                )
              : gPrev.unlockedPartIds,
        }));
      }
    },
    [medalsByTrack, leagueSeason]
  );

  const handleRaceFinished = useCallback(
    (summary: {
      totalTimeMs: number;
      bestLapMs: number;
      lapTimesMs: number[];
      cleanGates: number;
      maxSpeedKmh: number;
      flightDurationSec: number;
      distanceKm: number;
      recordedGhostFrames: GhostKeyframe[];
    }) => {
      const mpRoom = mpState.room;
      if (mpRoom && (mpRoom.status === 'playing' || mpRoom.status === 'countdown')) {
        mpClient.submitRunResult(
          Math.round(summary.totalTimeMs),
          summary.cleanGates,
          summary.recordedGhostFrames
        );
        return;
      }
      const roundedTotalMs = Math.round(summary.totalTimeMs);
      const parMs = activeTrack.parTimeSec * 1000;
      const isQualifier = activeLeagueSession?.stage === 'qualifier';

      const prevBest = bestTimesByTrack[activeTrack.id];
      const isNewRecord =
        !isQualifier &&
        (prevBest === undefined || roundedTotalMs < prevBest);

      const previousMedal: CareerMedalTier = medalsByTrack[activeTrack.id] ?? 'none';
      const earnedMedal = isQualifier
        ? 'none'
        : evaluateMedalTier(roundedTotalMs, activeTrack.parTimeSec);
      const upgradedMedal =
        !isQualifier && isHigherMedal(earnedMedal, previousMedal);
      const medalBonusCredits = upgradedMedal ? MEDAL_BONUS_CREDITS[earnedMedal] : 0;

      const nextMedalsMap = upgradedMedal
        ? { ...medalsByTrack, [activeTrack.id]: earnedMedal }
        : medalsByTrack;
      if (upgradedMedal) {
        setMedalsByTrack(nextMedalsMap);
      }

      // League Season & Sponsor Evaluation when racing a League Qualifier or Final
      let leagueOutcome = undefined;
      let creditsEarned = 0;
      let nextLeagueSeason = leagueSeason;

      // Advance Sponsor Contracts
      const contractRes = advanceContractsForRace(sponsorContracts, {
        cleanGates: summary.cleanGates,
        maxSpeedKmh: summary.maxSpeedKmh,
        beatPar: roundedTotalMs <= parMs,
        earnedMedal,
      });
      setSponsorContracts(contractRes.updatedContracts);

      if (activeLeagueSession) {
        if (activeLeagueSession.stage === 'qualifier') {
          const qEval = evaluateLeagueQualifierRun(
            leagueSeason,
            activeLeagueSession.roundNumber,
            roundedTotalMs,
            summary.cleanGates
          );
          nextLeagueSeason = qEval.nextSeason;
          setLeagueSeason(qEval.nextSeason);
          leagueOutcome = qEval.outcome;
          creditsEarned = qEval.payoutCredits + contractRes.totalRewardCredits;
        } else {
          const fEval = evaluateLeagueFinalRun(
            leagueSeason,
            activeLeagueSession.roundNumber,
            roundedTotalMs,
            summary.cleanGates,
            pilotProfile.callsign
          );
          nextLeagueSeason = fEval.nextSeason;
          setLeagueSeason(fEval.nextSeason);
          leagueOutcome = fEval.outcome;
          creditsEarned =
            fEval.payoutCredits +
            medalBonusCredits +
            contractRes.totalRewardCredits;
        }
      } else {
        const basePrize = 180;
        const parBonus = roundedTotalMs <= parMs ? 160 : 50;
        const recordBonus = isNewRecord ? 120 : 0;
        creditsEarned =
          basePrize +
          parBonus +
          recordBonus +
          medalBonusCredits +
          contractRes.totalRewardCredits;
      }

      const beatGhost = activeGhost ? roundedTotalMs < activeGhost.totalTimeMs : false;

      // Save PB Ghost & Circuit Standings only on full multi-lap runs
      if (!isQualifier) {
        if (isNewRecord && summary.recordedGhostFrames.length > 5) {
          setGhostRunsByTrack((prev) => ({
            ...prev,
            [activeTrack.id]: {
              trackId: activeTrack.id,
              frameId: activeFrame.id,
              totalTimeMs: roundedTotalMs,
              label: `${pilotProfile.callsign} PB`,
              isProTarget: false,
              frames: summary.recordedGhostFrames,
            },
          }));
        }

        if (isNewRecord) {
          setBestTimesByTrack((prev) => ({
            ...prev,
            [activeTrack.id]: roundedTotalMs,
          }));
        }

        const entry: CircuitLeaderboardEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          callsign: pilotProfile.callsign,
          circuitId: activeTrack.id,
          frameId: activeFrame.id,
          frameName: activeRigName,
          totalTimeMs: roundedTotalMs,
          bestLapMs: Math.round(summary.bestLapMs),
          cleanGates: summary.cleanGates,
          recordedAt: new Date().toISOString(),
        };

        setLeaderboardsByTrack((prev) => {
          const list = [...(prev[activeTrack.id] ?? []), entry]
            .sort((a, b) => a.totalTimeMs - b.totalTimeMs)
            .slice(0, 15);
          return { ...prev, [activeTrack.id]: list };
        });
      }

      // Evaluate Pilot Career Lifetime Milestones, Badges & Prototype Part Unlocks
      const prevPilot = pilotProfileRef.current;
      const nextPilotInput: PilotProfile = {
        ...prevPilot,
        racesCompleted: prevPilot.racesCompleted + 1,
        totalCleanGates: prevPilot.totalCleanGates + summary.cleanGates,
        totalFlightSeconds: Number(
          ((prevPilot.totalFlightSeconds ?? 0) + summary.flightDurationSec).toFixed(1)
        ),
        totalDistanceKm: Number(
          ((prevPilot.totalDistanceKm ?? 0) + summary.distanceKm).toFixed(3)
        ),
        peakSpeedKmh: Math.max(prevPilot.peakSpeedKmh ?? 0, summary.maxSpeedKmh),
      };
      const careerEval = evaluateCareerProgression(
        nextPilotInput,
        nextMedalsMap,
        nextLeagueSeason
      );
      pilotProfileRef.current = careerEval.nextPilot;
      setPilotProfile(careerEval.nextPilot);

      const totalCreditsEarned = creditsEarned + careerEval.totalRewardCredits;

      setGarage((prev) => ({
        ...prev,
        credits: prev.credits + totalCreditsEarned,
        unlockedPartIds:
          careerEval.newlyUnlockedPrototypePartIds.length > 0
            ? Array.from(
                new Set([
                  ...(prev.unlockedPartIds ?? []),
                  ...careerEval.newlyUnlockedPrototypePartIds,
                ])
              )
            : prev.unlockedPartIds,
      }));

      setRaceResults({
        trackId: activeTrack.id,
        trackName: activeTrack.name,
        totalTimeMs: roundedTotalMs,
        bestLapMs: summary.bestLapMs,
        lapTimesMs: summary.lapTimesMs,
        parTimeMs: parMs,
        creditsEarned: totalCreditsEarned,
        medalBonusCredits,
        contractRewardsCredits: contractRes.totalRewardCredits,
        completedContractTitles: contractRes.newlyCompletedTitles,
        earnedMedal,
        previousMedal,
        beatGhost,
        ghostLabel: activeGhost ? activeGhost.label : null,
        maxSpeedKmh: summary.maxSpeedKmh,
        isNewRecord,
        cleanGates: summary.cleanGates,
        totalGatesCount: activeTrack.gates.length * activeTrack.lapCount,
        leagueOutcome,
        newlyUnlockedMilestones: careerEval.newlyUnlockedMilestones,
      });
      setScreenMode('results');
    },
    [
      mpState.room,
      activeTrack,
      activeFrame.id,
      activeRigName,
      activeGhost,
      activeLeagueSession,
      leagueSeason,
      bestTimesByTrack,
      medalsByTrack,
      pilotProfile.callsign,
      sponsorContracts,
    ]
  );

  const handleLaunchLeagueRace = useCallback(
    (round: LeagueRoundState, stage: LeagueStage) => {
      const baseTrack =
        BUILTIN_TRACKS.find((t) => t.id === round.trackId) ?? BUILTIN_TRACKS[0];
      const raceTrack: TrackDef =
        stage === 'qualifier'
          ? {
              ...baseTrack,
              lapCount: 1,
              parTimeSec: Math.max(
                16,
                Math.round(round.qualifyingCutOffMs / 1000)
              ),
            }
          : baseTrack;

      fpvAudio.unlock();
      setActiveTrack(raceTrack);
      setActiveLeagueSession({
        seasonNumber: leagueSeason.seasonNumber,
        roundNumber: round.roundNumber,
        roundTitle: round.title,
        trackId: baseTrack.id,
        stage,
        cutOffMs: round.qualifyingCutOffMs,
        poleTimeMs: round.poleTimeMs,
        finalAiTimesMs: round.finalAiTimesMs,
      });
      setIsLeagueModalOpen(false);
      setRaceResults(null);
      setRaceRunId((n) => n + 1);
      setScreenMode('playing');
    },
    [leagueSeason.seasonNumber]
  );

  const handleLaunchQualifiedFinal = useCallback(
    (roundNumber: number) => {
      const round = leagueSeason.rounds.find(
        (r) => r.roundNumber === roundNumber
      );
      if (round) {
        handleLaunchLeagueRace(round, 'final');
      }
    },
    [leagueSeason.rounds, handleLaunchLeagueRace]
  );

  const handleSignSponsor = useCallback(
    (sponsorId: string) => {
      const offer = LEAGUE_SPONSOR_OFFERS.find((o) => o.id === sponsorId);
      if (!offer || !isSponsorOfferUnlocked(offer, leagueSeason)) return;

      const alreadyClaimed = leagueSeason.claimedSponsorIds.includes(offer.id);
      if (!alreadyClaimed) {
        setGarage((prev) => ({
          ...prev,
          credits: prev.credits + offer.signingBonusCr,
        }));
      }
      setLeagueSeason((prev) => ({
        ...prev,
        activeSponsorId: offer.id,
        claimedSponsorIds: alreadyClaimed
          ? prev.claimedSponsorIds
          : [...prev.claimedSponsorIds, offer.id],
      }));
    },
    [leagueSeason]
  );

  const handleStartNextSeason = useCallback(() => {
    setLeagueSeason((prev) =>
      createInitialLeagueSeasonState(prev.seasonNumber + 1, {
        pilotRep: prev.pilotRep,
        activeSponsorId: prev.activeSponsorId,
        claimedSponsorIds: prev.claimedSponsorIds,
        championshipsWon: prev.championshipsWon,
      })
    );
  }, []);

  // Garage, Build Bench & Avionics Software Handlers
  const handleSelectFrame = (id: DroneFrameId) => {
    setGarage((prev) => ({
      ...prev,
      selectedFrame: id,
      activeCustomBuildId: null,
    }));
  };

  const handleUnlockFrame = (id: DroneFrameId, cost: number) => {
    setGarage((prev) => {
      if (prev.credits < cost || prev.unlockedFrames.includes(id)) return prev;
      return {
        ...prev,
        credits: prev.credits - cost,
        unlockedFrames: [...prev.unlockedFrames, id],
        selectedFrame: id,
        activeCustomBuildId: null,
      };
    });
  };

  const handleUpgradePart = (cat: UpgradeCategory, cost: number) => {
    setGarage((prev) => {
      const curLvls = prev.upgradesByFrame[prev.selectedFrame];
      if (prev.credits < cost || curLvls[cat] >= 4) return prev;
      return {
        ...prev,
        credits: prev.credits - cost,
        upgradesByFrame: {
          ...prev.upgradesByFrame,
          [prev.selectedFrame]: {
            ...curLvls,
            [cat]: curLvls[cat] + 1,
          },
        },
      };
    });
  };

  const handleUnlockFirmware = (level: FirmwareLevel, cost: number) => {
    setGarage((prev) => {
      const sw = normalizeSoftwareLoadout(prev.software);
      if (prev.credits < cost || sw.unlockedFirmwareLevel >= level) return prev;
      return {
        ...prev,
        credits: prev.credits - cost,
        software: {
          ...sw,
          unlockedFirmwareLevel: level,
          firmwareLevel: level,
        },
      };
    });
  };

  const handleSelectFirmware = (level: FirmwareLevel) => {
    setGarage((prev) => {
      const sw = normalizeSoftwareLoadout(prev.software);
      if (sw.unlockedFirmwareLevel < level) return prev;
      return {
        ...prev,
        software: { ...sw, firmwareLevel: level },
      };
    });
  };

  const handleUnlockHudModule = (id: HudModuleId, cost: number) => {
    setGarage((prev) => {
      const sw = normalizeSoftwareLoadout(prev.software);
      if (prev.credits < cost || sw.unlockedHudModules.includes(id)) return prev;
      return {
        ...prev,
        credits: prev.credits - cost,
        software: {
          ...sw,
          unlockedHudModules: [...sw.unlockedHudModules, id],
          enabledHudModules: { ...sw.enabledHudModules, [id]: true },
        },
      };
    });
  };

  const handleToggleHudModule = (id: HudModuleId) => {
    setGarage((prev) => {
      const sw = normalizeSoftwareLoadout(prev.software);
      if (!sw.unlockedHudModules.includes(id)) return prev;
      return {
        ...prev,
        software: {
          ...sw,
          enabledHudModules: {
            ...sw.enabledHudModules,
            [id]: !sw.enabledHudModules[id],
          },
        },
      };
    });
  };

  const handleUnlockGoggleMode = (mode: GoggleFeedMode, cost: number) => {
    setGarage((prev) => {
      const sw = normalizeSoftwareLoadout(prev.software);
      if (prev.credits < cost || sw.unlockedGoggleModes.includes(mode)) return prev;
      return {
        ...prev,
        credits: prev.credits - cost,
        software: {
          ...sw,
          unlockedGoggleModes: [...sw.unlockedGoggleModes, mode],
          goggleMode: mode,
        },
      };
    });
  };

  const handleSelectGoggleMode = (mode: GoggleFeedMode) => {
    setGarage((prev) => {
      const sw = normalizeSoftwareLoadout(prev.software);
      if (!sw.unlockedGoggleModes.includes(mode)) return prev;
      return {
        ...prev,
        software: { ...sw, goggleMode: mode },
      };
    });
  };

  const handleToggleAnalogFx = () => {
    setGarage((prev) => {
      const sw = normalizeSoftwareLoadout(prev.software);
      return {
        ...prev,
        software: { ...sw, analogFxEnabled: !sw.analogFxEnabled },
      };
    });
  };

  const handleChangeGraphicsQuality = (q: GraphicsQuality) => {
    setGarage((prev) => ({ ...prev, graphicsQuality: q }));
  };

  const handleUpdateCustomization = (patch: Partial<DroneCustomization>) => {
    setGarage((prev) => {
      if (prev.activeCustomBuildId) {
        const nextBuilds = (prev.customBuilds ?? []).map((b) =>
          b.id === prev.activeCustomBuildId
            ? { ...b, customization: { ...b.customization, ...patch } }
            : b
        );
        return { ...prev, customBuilds: nextBuilds };
      }
      return {
        ...prev,
        customizationByFrame: {
          ...prev.customizationByFrame,
          [prev.selectedFrame]: {
            ...prev.customizationByFrame[prev.selectedFrame],
            ...patch,
          },
        },
      };
    });
    if (garage.activeCustomBuildId && benchEditingSlotId === garage.activeCustomBuildId) {
      setBenchDraftCustom((prev) => ({ ...prev, ...patch }));
    }
  };

  const handleUpdateBenchDraftCustom = (patch: Partial<DroneCustomization>) => {
    setBenchDraftCustom((prev) => ({ ...prev, ...patch }));
  };

  const handleSelectBenchSlotToEdit = (build: CustomDroneBuild) => {
    setBenchEditingSlotId(build.id);
    setBenchDraftParts({ ...build.parts });
    setBenchDraftCustom({
      frameColor: '#27272a',
      frameFinish: 'matte',
      ...build.customization,
    });
    setBenchDraftName(build.name);
  };

  const handleStartNewBenchDraft = () => {
    setBenchEditingSlotId(null);
    setBenchDraftParts({ ...DEFAULT_CUSTOM_PARTS });
    setBenchDraftCustom({
      frameColor: '#27272a',
      frameFinish: 'matte',
      ...activeCustom,
    });
    setBenchDraftName(`Custom Build ${(garage.customBuilds?.length ?? 0) + 1}`);
  };

  const handleEquipCustomBuild = (buildId: string) => {
    setGarage((prev) => ({ ...prev, activeCustomBuildId: buildId }));
  };

  const handleDuplicateCustomBuild = (buildId: string) => {
    const list = garage.customBuilds ?? [];
    if (list.length >= MAX_CUSTOM_BUILD_SLOTS) return;
    const src = list.find((b) => b.id === buildId);
    if (!src) return;
    const copy: CustomDroneBuild = {
      id: `custom-${Date.now()}`,
      name: `${src.name.slice(0, 18)} Copy`,
      parts: { ...src.parts },
      customization: {
        frameColor: '#27272a',
        frameFinish: 'matte',
        ...src.customization,
      },
      createdAt: new Date().toISOString(),
    };
    setBenchEditingSlotId(copy.id);
    setBenchDraftParts({ ...copy.parts });
    setBenchDraftCustom({ ...copy.customization });
    setBenchDraftName(copy.name);
    setGarage((prev) => ({
      ...prev,
      customBuilds: [...(prev.customBuilds ?? []), copy],
      activeCustomBuildId: copy.id,
    }));
  };

  const handleDeleteCustomBuild = (buildId: string) => {
    const list = garage.customBuilds ?? [];
    if (list.length <= 1) return;
    const filtered = list.filter((b) => b.id !== buildId);
    if (benchEditingSlotId === buildId && filtered[0]) {
      setBenchEditingSlotId(filtered[0].id);
      setBenchDraftParts({ ...filtered[0].parts });
      setBenchDraftCustom({
        frameColor: '#27272a',
        frameFinish: 'matte',
        ...filtered[0].customization,
      });
      setBenchDraftName(filtered[0].name);
    }
    setGarage((prev) => ({
      ...prev,
      customBuilds: filtered,
      activeCustomBuildId:
        prev.activeCustomBuildId === buildId ? null : prev.activeCustomBuildId,
    }));
  };

  const handleSaveAndEquipCustomBuild = () => {
    const evalResult = evaluateCustomDroneBuild(
      benchDraftParts,
      garage.rates,
      activeSoftware.firmwareLevel,
      garage.unlockedPartIds ?? []
    );
    if (evalResult.hasHardError || garage.credits < evalResult.unlockCost) {
      return;
    }

    const cleanName = benchDraftName.trim().slice(0, 24) || 'Custom Race Quad';
    const list = garage.customBuilds ?? [];
    const existing =
      benchEditingSlotId && list.some((b) => b.id === benchEditingSlotId);

    if (!existing && list.length >= MAX_CUSTOM_BUILD_SLOTS) {
      return;
    }

    const targetId = existing ? benchEditingSlotId! : `custom-${Date.now()}`;
    const nextUnlockedParts = Array.from(
      new Set([...(garage.unlockedPartIds ?? []), ...evalResult.lockedPartIds])
    );

    setBenchEditingSlotId(targetId);
    setBenchDraftName(cleanName);
    setGarage((prev) => {
      const prevList = prev.customBuilds ?? [];
      const nextBuilds = existing
        ? prevList.map((b) =>
            b.id === targetId
              ? {
                  ...b,
                  name: cleanName,
                  parts: { ...benchDraftParts },
                  customization: { ...benchDraftCustom },
                }
              : b
          )
        : [
            ...prevList,
            {
              id: targetId,
              name: cleanName,
              parts: { ...benchDraftParts },
              customization: { ...benchDraftCustom },
              createdAt: new Date().toISOString(),
            },
          ];

      return {
        ...prev,
        credits: prev.credits - evalResult.unlockCost,
        unlockedPartIds: nextUnlockedParts,
        customBuilds: nextBuilds,
        activeCustomBuildId: targetId,
      };
    });
  };

  const handleUpdateRates = (patch: Partial<RatesProfile>) => {
    setGarage((prev) => ({
      ...prev,
      rates: { ...prev.rates, ...patch },
    }));
  };

  const handleChangeFlightMode = (m: FlightMode) => {
    setGarage((prev) => ({ ...prev, flightMode: m }));
  };

  const handleChangeStickMode = (s: StickMode) => {
    setGarage((prev) => ({ ...prev, stickMode: s }));
  };

  const handleUpdateGamepad = (nextGamepad: GamepadConfig) => {
    setGarage((prev) => ({ ...prev, gamepad: nextGamepad }));
  };

  const handleUpdateCallsign = (callsign: string) => {
    setPilotProfile((prev) => ({ ...prev, callsign }));
  };

  const handleRotateContract = (contractId: string) => {
    setSponsorContracts((prev) => rotateSponsorContract(prev, contractId));
  };

  const handleSaveCustomTrack = (tr: TrackDef) => {
    setSavedCustomTracks((prev) => {
      const filtered = prev.filter((x) => x.id !== tr.id);
      return [tr, ...filtered].slice(0, 8);
    });
  };

  const handleSelectTrack = (tr: TrackDef, launchImmediately: boolean) => {
    setActiveLeagueSession(null);
    setActiveTrack(tr);
    if (launchImmediately) {
      fpvAudio.unlock();
      setRaceResults(null);
      setRaceRunId((n) => n + 1);
      setScreenMode('playing');
    } else {
      setScreenMode('title');
    }
  };

  const handleOpenMultiplayer = useCallback(() => {
    mpClient.connect({
      callsign: pilotProfile.callsign,
      frameId: garage.selectedFrame,
      ledColor: activeCustom.ledColor,
      canopyColor: activeCustom.canopyColor,
      equippedBadgeId: pilotProfile.equippedBadgeId ?? null,
    });
    mpClient.refreshRooms();
    setIsMultiplayerModalOpen(true);
  }, [
    pilotProfile.callsign,
    pilotProfile.equippedBadgeId,
    garage.selectedFrame,
    activeCustom.ledColor,
    activeCustom.canopyColor,
  ]);

  const activeMpRoom =
    mpState.room &&
    (mpState.room.status === 'countdown' || mpState.room.status === 'playing')
      ? mpState.room
      : null;

  const mpViewportConfig: MultiplayerViewportConfig | null = useMemo(() => {
    if (!activeMpRoom) return null;
    const localIdx = Math.max(
      0,
      activeMpRoom.participants.findIndex((p) => p.id === mpState.playerId)
    );
    const fl = activeMpRoom.followLeader;
    const spectatingFollowLeader = Boolean(
      activeMpRoom.mode === 'follow-leader' &&
        fl &&
        ((fl.phase === 'leader-turn' && fl.leaderId !== mpState.playerId) ||
          (fl.phase === 'challenger-turn' &&
            (fl.leaderId === mpState.playerId ||
              !fl.survivorIds.includes(mpState.playerId ?? '') ||
              fl.completedTurnIds.includes(mpState.playerId ?? ''))))
    );
    return {
      active: true,
      mode: activeMpRoom.mode,
      localPlayerId: mpState.playerId,
      spectatingFollowLeader,
      spectateTargetId:
        fl?.phase === 'leader-turn'
          ? fl.leaderId
          : fl?.survivorIds.find((id) => id !== fl.leaderId && id !== mpState.playerId) ?? null,
      laserCooldownMs: activeMpRoom.rules.laserCooldownMs,
      arenaSpawnIndex: localIdx,
      arenaTotalSlots: Math.max(2, activeMpRoom.participants.length),
      remotePoses: mpClient.remotePoses,
      pendingLaserBeams: mpClient.pendingLaserBeams,
      fireTriggerRef: mpFireTriggerRef,
      onPublishPose: (pose) => mpClient.publishPose(pose),
      onFireLaser: (origin, dir) => mpClient.fireLaser(origin, dir),
      onReportProgress: (lap, gateIndex, cleanGates) =>
        mpClient.reportRaceProgress(lap, gateIndex, cleanGates),
    };
  }, [activeMpRoom, mpState.playerId]);

  if (!runtimeIntegrity.authorized || !runtimeIntegrity.integrityValid) {
    return <UnauthorizedMirrorGate integrity={runtimeIntegrity} />;
  }

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-zinc-950">
      {/* Case A Demo Key Quota Exceeded Non-Intrusive Top Banner */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Isolated 60fps Three.js WebGL Viewport */}
      <FpvViewport
        screenMode={screenMode}
        track={activeTrack}
        frameId={garage.selectedFrame}
        visualBlueprint={viewportBlueprint}
        benchInspectActive={isInspectingBench}
        benchExploded={isInspectingBench && benchExploded}
        benchCameraResetKey={benchCameraResetKey}
        customization={isInspectingBench ? benchDraftCustom : activeCustom}
        stats={activeStats}
        rates={garage.rates}
        flightMode={garage.flightMode}
        cameraView={garage.cameraView}
        gamepadConfig={activeGamepadConfig}
        graphicsQuality={graphicsQuality}
        maxDpr={posture.recommendedMaxDpr}
        goggleMode={activeSoftware.goggleMode}
        racingLineEnabled={
          activeSoftware.unlockedHudModules.includes('racingLine3d') &&
          activeSoftware.enabledHudModules.racingLine3d
        }
        propwashDamping={activeFirmwareSpec.propwashDamping}
        activeGhost={activeGhost}
        multiplayer={mpViewportConfig}
        touchSticksRef={touchSticksRef}
        raceRunId={raceRunId}
        onTelemetry={setTelemetry}
        onGatePassed={handleGatePassed}
        onRaceFinished={handleRaceFinished}
        onFlightSessionAccumulate={handleFlightSessionAccumulate}
        onTogglePause={handleTogglePause}
        onQuickSwitchCam={handleQuickSwitchCam}
        onQuickSwitchMode={handleCycleFlightMode}
        onQuickToggleHud={handleToggleHudDensity}
        onGamepadStatus={handleGamepadStatus}
      />

      {/* Screen 1: Title Screen */}
      {screenMode === 'title' && (
        <TitleOverlay
          rigName={activeRigName}
          isCustomBuild={Boolean(activeCustomBuild)}
          stats={activeStats}
          activeTrack={activeTrack}
          credits={garage.credits}
          bestTimeMs={bestTimesByTrack[activeTrack.id] ?? null}
          trackMedal={currentTrackMedal}
          activeGhostLabel={activeGhost ? activeGhost.label : null}
          graphicsQuality={graphicsQuality}
          pilotProfile={pilotProfile}
          sponsorContracts={sponsorContracts}
          leagueSeason={leagueSeason}
          gamepadStatus={gamepadStatus}
          onUpdateCallsign={handleUpdateCallsign}
          onChangeGraphicsQuality={handleChangeGraphicsQuality}
          onRotateContract={handleRotateContract}
          onStartRace={startFreeRace}
          onOpenMultiplayer={handleOpenMultiplayer}
          onOpenLeague={() => setIsLeagueModalOpen(true)}
          onOpenCareer={() => setIsCareerModalOpen(true)}
          onOpenGarage={() => {
            setPreviousScreen('title');
            setScreenMode('garage');
          }}
          onOpenWorldMap={() => {
            setPreviousScreen('title');
            setScreenMode('worldmap');
          }}
          onOpenGamepadConfig={() => setIsGamepadModalOpen(true)}
          onOpenLegal={() => setIsLegalModalOpen(true)}
        />
      )}

      {/* Screen 2: Active Flight HUD + Auto-Hide Touch RC Controller */}
      {screenMode === 'playing' && (
        <>
          <FpvOsdHud
            telemetry={telemetry}
            track={activeTrack}
            gateFlash={gateFlash}
            software={activeSoftware}
            hudDensity={hudDensity}
            activeLeagueSession={activeLeagueSession}
            multiplayerRoom={activeMpRoom}
            multiplayerPlayerId={mpState.playerId}
            hitBanner={mpState.hitBanner}
            onFastForwardBotTurn={() => mpClient.fastForwardBotTurn()}
          />
          <TouchController
            stickMode={garage.stickMode}
            flightMode={garage.flightMode}
            cameraView={garage.cameraView}
            hudDensity={hudDensity}
            touchSticksMode={touchSticksMode}
            gamepadConnected={gamepadStatus.connected}
            muted={muted}
            showFireButton={Boolean(
              activeMpRoom &&
                (activeMpRoom.mode === 'laser-tag' ||
                  (activeMpRoom.mode === 'drone-tag' &&
                    activeMpRoom.itPlayerId === mpState.playerId))
            )}
            fireLabel={activeMpRoom?.mode === 'drone-tag' ? 'TAG' : 'FIRE'}
            touchSticksRef={touchSticksRef}
            onFireLaser={() => mpFireTriggerRef.current?.()}
            onCycleFlightMode={handleCycleFlightMode}
            onToggleCamera={handleQuickSwitchCam}
            onToggleHudDensity={handleToggleHudDensity}
            onResetDrone={() => setRaceRunId((n) => n + 1)}
            onToggleMute={handleToggleMute}
            onPause={() => setScreenMode('paused')}
          />
        </>
      )}

      {/* Screen 3: Drone Hangar, Build Bench & Avionics Software Workshop */}
      {screenMode === 'garage' && (
        <GarageModal
          garage={garage}
          activeRigName={activeRigName}
          activeRigClass={activeRigClass}
          activeRigStats={activeStats}
          activeRigCustom={activeCustom}
          benchDraftParts={benchDraftParts}
          benchDraftCustom={benchDraftCustom}
          benchDraftName={benchDraftName}
          benchEditingSlotId={benchEditingSlotId}
          benchExploded={benchExploded}
          onSelectFrame={handleSelectFrame}
          onUnlockFrame={handleUnlockFrame}
          onUpgradePart={handleUpgradePart}
          onUpdateCustomization={handleUpdateCustomization}
          onUpdateRates={handleUpdateRates}
          onChangeFlightMode={handleChangeFlightMode}
          onChangeStickMode={handleChangeStickMode}
          onUpdateGamepad={handleUpdateGamepad}
          onOpenGamepadConfig={() => setIsGamepadModalOpen(true)}
          onChangeGraphicsQuality={handleChangeGraphicsQuality}
          onUnlockFirmware={handleUnlockFirmware}
          onSelectFirmware={handleSelectFirmware}
          onUnlockHudModule={handleUnlockHudModule}
          onToggleHudModule={handleToggleHudModule}
          onUnlockGoggleMode={handleUnlockGoggleMode}
          onSelectGoggleMode={handleSelectGoggleMode}
          onToggleAnalogFx={handleToggleAnalogFx}
          onChangeBenchTabActive={setBenchTabActive}
          onChangeBenchDraftParts={setBenchDraftParts}
          onChangeBenchDraftCustom={handleUpdateBenchDraftCustom}
          onChangeBenchDraftName={setBenchDraftName}
          onSelectBenchSlotToEdit={handleSelectBenchSlotToEdit}
          onStartNewBenchDraft={handleStartNewBenchDraft}
          onEquipCustomBuild={handleEquipCustomBuild}
          onDuplicateCustomBuild={handleDuplicateCustomBuild}
          onDeleteCustomBuild={handleDeleteCustomBuild}
          onSaveAndEquipCustomBuild={handleSaveAndEquipCustomBuild}
          onToggleBenchExploded={() => setBenchExploded((e) => !e)}
          onResetBenchCamera={() => setBenchCameraResetKey((k) => k + 1)}
          onOpenCareer={() => setIsCareerModalOpen(true)}
          onClose={() => setScreenMode(previousScreen)}
          onLaunchFlight={startFreeRace}
        />
      )}

      {/* Screen 4: Google Maps Real-World Circuit Selector, Street View Scout & Elevation Builder */}
      {screenMode === 'worldmap' && (
        <WorldMapModal
          activeTrack={activeTrack}
          savedCustomTracks={savedCustomTracks}
          bestTimesByTrack={bestTimesByTrack}
          medalsByTrack={medalsByTrack}
          leaderboardsByTrack={leaderboardsByTrack}
          onSelectTrack={handleSelectTrack}
          onSaveCustomTrack={handleSaveCustomTrack}
          onClose={() => setScreenMode(previousScreen)}
        />
      )}

      {/* Screen 5: Pause Modal */}
      {screenMode === 'paused' && (
        <PauseModal
          trackName={activeTrack.name}
          flightMode={garage.flightMode}
          cameraView={garage.cameraView}
          stickMode={garage.stickMode}
          hudDensity={hudDensity}
          touchSticksMode={touchSticksMode}
          graphicsQuality={graphicsQuality}
          muted={muted}
          gamepadConnected={gamepadStatus.connected}
          onResume={() => setScreenMode('playing')}
          onRestart={retryActiveRace}
          onChangeFlightMode={handleChangeFlightMode}
          onToggleCamera={handleQuickSwitchCam}
          onChangeStickMode={handleChangeStickMode}
          onChangeHudDensity={handleChangeHudDensity}
          onChangeTouchSticksMode={handleChangeTouchSticksMode}
          onChangeGraphicsQuality={handleChangeGraphicsQuality}
          onOpenGamepadConfig={() => setIsGamepadModalOpen(true)}
          onToggleMute={handleToggleMute}
          onOpenGarage={() => {
            setPreviousScreen('paused');
            setScreenMode('garage');
          }}
          onOpenWorldMap={() => {
            setPreviousScreen('paused');
            setScreenMode('worldmap');
          }}
          onExitTitle={() => {
            setActiveLeagueSession(null);
            if (mpState.room) {
              mpClient.leaveRoom();
            }
            setScreenMode('title');
          }}
          onOpenLegal={() => setIsLegalModalOpen(true)}
        />
      )}

      {/* Screen 6: Race Results Modal */}
      {screenMode === 'results' && raceResults && (
        <ResultsModal
          results={raceResults}
          pilotCallsign={pilotProfile.callsign}
          equippedBadgeId={pilotProfile.equippedBadgeId}
          leaderboard={leaderboardsByTrack[raceResults.trackId] ?? []}
          onRetry={retryActiveRace}
          onLaunchQualifiedFinal={handleLaunchQualifiedFinal}
          onEquipBadge={handleEquipBadge}
          onOpenCareer={() => setIsCareerModalOpen(true)}
          onOpenLeague={() => {
            setScreenMode('title');
            setIsLeagueModalOpen(true);
          }}
          onOpenGarage={() => {
            setPreviousScreen('results');
            setScreenMode('garage');
          }}
          onOpenWorldMap={() => {
            setPreviousScreen('results');
            setScreenMode('worldmap');
          }}
          onExitTitle={() => {
            setActiveLeagueSession(null);
            setScreenMode('title');
          }}
        />
      )}

      {/* Stratum Pro Race League Season & Big-Money Sponsor Selection Modal */}
      {isLeagueModalOpen && (
        <LeagueSeasonModal
          season={leagueSeason}
          pilotCallsign={pilotProfile.callsign}
          credits={garage.credits}
          rigName={activeRigName}
          onLaunchLeagueRace={handleLaunchLeagueRace}
          onSignSponsor={handleSignSponsor}
          onStartNextSeason={handleStartNextSeason}
          onClose={() => setIsLeagueModalOpen(false)}
        />
      )}

      {/* Pilot Career Progression Dashboard Modal */}
      {isCareerModalOpen && (
        <PilotCareerModal
          pilot={pilotProfile}
          medalsByTrack={medalsByTrack}
          leagueSeason={leagueSeason}
          unlockedPartIds={garage.unlockedPartIds ?? []}
          onEquipBadge={handleEquipBadge}
          onOpenBuildBench={() => {
            setIsCareerModalOpen(false);
            if (screenMode !== 'garage') {
              setPreviousScreen(screenMode === 'results' ? 'results' : 'title');
              setScreenMode('garage');
            }
          }}
          onClose={() => setIsCareerModalOpen(false)}
        />
      )}

      {/* Multiplayer Hub & Staging Lobby Modal */}
      {isMultiplayerModalOpen && (
        <MultiplayerModal
          wsStatus={mpState.status}
          playerId={mpState.playerId}
          callsign={pilotProfile.callsign}
          publicRooms={mpState.publicRooms}
          party={mpState.party}
          room={mpState.room}
          errorMessage={mpState.errorMessage}
          savedCustomTracks={savedCustomTracks}
          selectedTrack={activeTrack}
          onClearError={() => mpClient.clearError()}
          onRefreshRooms={() => mpClient.refreshRooms()}
          onCreateParty={() => mpClient.createParty()}
          onJoinParty={(code) => mpClient.joinParty(code)}
          onLeaveParty={() => mpClient.leaveParty()}
          onUpdatePartySettings={(lock, pref) =>
            mpClient.updatePartySettings(lock, pref)
          }
          onCreateRoom={(params) => mpClient.createRoom(params)}
          onJoinRoom={(codeOrId) => mpClient.joinRoom(codeOrId)}
          onLeaveRoom={() => mpClient.leaveRoom()}
          onSwitchTeam={(team) => mpClient.switchTeam(team)}
          onSetReady={(ready) => mpClient.setReady(ready)}
          onUpdateRoomRules={(patch) => mpClient.updateRoomRules(patch)}
          onKickBot={(botId) => mpClient.kickBot(botId)}
          onStartMatch={() => mpClient.startMatch()}
          onSendChat={(text) => mpClient.sendChat(text)}
          onClose={() => setIsMultiplayerModalOpen(false)}
        />
      )}

      {/* Multiplayer Match Results Modal */}
      {mpState.room && mpState.room.status === 'results' && (
        <MultiplayerResultsModal
          room={mpState.room}
          playerId={mpState.playerId}
          creditsAwarded={mpCreditsAwarded}
          onReturnToLobby={() => mpClient.returnToLobby()}
          onExitToTitle={() => {
            mpClient.leaveRoom();
            setScreenMode('title');
          }}
        />
      )}

      {/* Visual Hardware Controller & USB Radio Mapping Modal */}
      {isGamepadModalOpen && (
        <GamepadConfigModal
          config={activeGamepadConfig}
          stickMode={garage.stickMode}
          onChange={handleUpdateGamepad}
          onCapturingChange={setIsCapturingGamepad}
          onClose={() => setIsGamepadModalOpen(false)}
        />
      )}

      {/* Ownership, Copyright & Legal Verification Modal */}
      {isLegalModalOpen && (
        <LegalOwnershipModal
          integrity={runtimeIntegrity}
          onClose={() => setIsLegalModalOpen(false)}
        />
      )}

      {/* Offline Status & Console Controller Prompt Bar */}
      <OfflineIndicator />
      {screenMode !== 'playing' && (
        <ConsolePromptBar
          gamepadConnected={gamepadStatus.connected}
          gamepadId={gamepadStatus.id}
          showTabHint={
            screenMode === 'garage' ||
            isLeagueModalOpen ||
            isCareerModalOpen ||
            isMultiplayerModalOpen
          }
          startLabel={screenMode === 'paused' ? 'Resume' : 'Start Race'}
        />
      )}
    </div>
  );
}
