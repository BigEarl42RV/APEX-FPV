import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  computeDroneStats,
  createInitialGarageState,
  getFrameSpec,
} from './data/drones';
import { BUILTIN_TRACKS } from './data/tracks';
import { fpvAudio } from './engine/audio';
import { FpvViewport } from './engine/FpvViewport';
import { TitleOverlay } from './components/TitleOverlay';
import { TouchController } from './components/TouchController';
import { FpvOsdHud } from './components/FpvOsdHud';
import { GarageModal } from './components/GarageModal';
import { PauseModal, ResultsModal } from './components/PauseResultsModal';
import { WorldMapModal } from './components/WorldMapModal';
import type {
  DroneCustomization,
  DroneFrameId,
  FlightMode,
  PlayerGarageState,
  RaceResultSummary,
  RatesProfile,
  ScreenMode,
  StickInputs,
  StickMode,
  TelemetrySnapshot,
  TrackDef,
  UpgradeCategory,
} from './types/game';

const STORAGE_KEY_GARAGE = 'stratum_fpv_garage_v1';
const STORAGE_KEY_TRACKS = 'stratum_fpv_custom_tracks_v1';
const STORAGE_KEY_RECORDS = 'stratum_fpv_records_v1';

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
  const [garage, setGarage] = useState<PlayerGarageState>(() =>
    loadFromStorage(STORAGE_KEY_GARAGE, createInitialGarageState())
  );
  const [savedCustomTracks, setSavedCustomTracks] = useState<TrackDef[]>(() =>
    loadFromStorage(STORAGE_KEY_TRACKS, [])
  );
  const [bestTimesByTrack, setBestTimesByTrack] = useState<Record<string, number>>(() =>
    loadFromStorage(STORAGE_KEY_RECORDS, {})
  );
  const [activeTrack, setActiveTrack] = useState<TrackDef>(BUILTIN_TRACKS[0]);
  const [raceRunId, setRaceRunId] = useState<number>(1);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(INITIAL_TELEMETRY);
  const [gateFlash, setGateFlash] = useState(false);
  const [raceResults, setRaceResults] = useState<RaceResultSummary | null>(null);
  const [muted, setMuted] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const touchSticksRef = useRef<StickInputs>({
    throttle: 0.28,
    yaw: 0,
    pitch: 0,
    roll: 0,
  });

  // Listen for Case A Google Maps Demo Key Quota Exceeded events
  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  // Persist garage, custom tracks, and personal bests
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GARAGE, JSON.stringify(garage));
    } catch {
      // Ignore storage quota errors
    }
  }, [garage]);

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

  const activeFrame = useMemo(
    () => getFrameSpec(garage.selectedFrame),
    [garage.selectedFrame]
  );
  const activeUpgrades = garage.upgradesByFrame[garage.selectedFrame];
  const activeCustom = garage.customizationByFrame[garage.selectedFrame];
  const activeStats = useMemo(
    () => computeDroneStats(garage.selectedFrame, activeUpgrades, garage.rates),
    [garage.selectedFrame, activeUpgrades, garage.rates]
  );

  const startRace = useCallback(() => {
    fpvAudio.unlock();
    setRaceResults(null);
    setRaceRunId((n) => n + 1);
    setScreenMode('playing');
  }, []);

  // Title screen Enter / Space shortcut to start immediately
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        screenMode === 'title' &&
        (e.code === 'Enter' || e.code === 'Space')
      ) {
        e.preventDefault();
        startRace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screenMode, startRace]);

  const handleTogglePause = useCallback(() => {
    setScreenMode((cur) => (cur === 'playing' ? 'paused' : cur === 'paused' ? 'playing' : cur));
  }, []);

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

  const handleRaceFinished = useCallback(
    (summary: {
      totalTimeMs: number;
      bestLapMs: number;
      lapTimesMs: number[];
      cleanGates: number;
    }) => {
      const parMs = activeTrack.parTimeSec * 1000;
      const prevBest = bestTimesByTrack[activeTrack.id];
      const isNewRecord =
        prevBest === undefined || summary.totalTimeMs < prevBest;

      const basePrize = 180;
      const parBonus = summary.totalTimeMs <= parMs ? 160 : 50;
      const recordBonus = isNewRecord ? 120 : 0;
      const creditsEarned = basePrize + parBonus + recordBonus;

      if (isNewRecord) {
        setBestTimesByTrack((prev) => ({
          ...prev,
          [activeTrack.id]: summary.totalTimeMs,
        }));
      }

      setGarage((prev) => ({
        ...prev,
        credits: prev.credits + creditsEarned,
      }));

      setRaceResults({
        trackId: activeTrack.id,
        trackName: activeTrack.name,
        totalTimeMs: summary.totalTimeMs,
        bestLapMs: summary.bestLapMs,
        lapTimesMs: summary.lapTimesMs,
        parTimeMs: parMs,
        creditsEarned,
        isNewRecord,
        cleanGates: summary.cleanGates,
        totalGatesCount: activeTrack.gates.length * activeTrack.lapCount,
      });
      setScreenMode('results');
    },
    [activeTrack, bestTimesByTrack]
  );

  // Garage Handlers
  const handleSelectFrame = (id: DroneFrameId) => {
    setGarage((prev) => ({ ...prev, selectedFrame: id }));
  };

  const handleUnlockFrame = (id: DroneFrameId, cost: number) => {
    setGarage((prev) => {
      if (prev.credits < cost || prev.unlockedFrames.includes(id)) return prev;
      return {
        ...prev,
        credits: prev.credits - cost,
        unlockedFrames: [...prev.unlockedFrames, id],
        selectedFrame: id,
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

  const handleUpdateCustomization = (patch: Partial<DroneCustomization>) => {
    setGarage((prev) => ({
      ...prev,
      customizationByFrame: {
        ...prev.customizationByFrame,
        [prev.selectedFrame]: {
          ...prev.customizationByFrame[prev.selectedFrame],
          ...patch,
        },
      },
    }));
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

  const handleSaveCustomTrack = (tr: TrackDef) => {
    setSavedCustomTracks((prev) => {
      const filtered = prev.filter((x) => x.id !== tr.id);
      return [tr, ...filtered].slice(0, 8);
    });
  };

  const handleSelectTrack = (tr: TrackDef, launchImmediately: boolean) => {
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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950">
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
        customization={activeCustom}
        stats={activeStats}
        rates={garage.rates}
        flightMode={garage.flightMode}
        cameraView={garage.cameraView}
        touchSticksRef={touchSticksRef}
        raceRunId={raceRunId}
        onTelemetry={setTelemetry}
        onGatePassed={handleGatePassed}
        onRaceFinished={handleRaceFinished}
        onTogglePause={handleTogglePause}
        onQuickSwitchCam={handleQuickSwitchCam}
        onQuickSwitchMode={handleCycleFlightMode}
      />

      {/* Screen 1: Title Screen */}
      {screenMode === 'title' && (
        <TitleOverlay
          frame={activeFrame}
          stats={activeStats}
          activeTrack={activeTrack}
          credits={garage.credits}
          bestTimeMs={bestTimesByTrack[activeTrack.id] ?? null}
          onStartRace={startRace}
          onOpenGarage={() => {
            setPreviousScreen('title');
            setScreenMode('garage');
          }}
          onOpenWorldMap={() => {
            setPreviousScreen('title');
            setScreenMode('worldmap');
          }}
        />
      )}

      {/* Screen 2: Active Flight HUD + Touch RC Dual-Stick Controller */}
      {screenMode === 'playing' && (
        <>
          <FpvOsdHud
            telemetry={telemetry}
            track={activeTrack}
            gateFlash={gateFlash}
          />
          <TouchController
            stickMode={garage.stickMode}
            flightMode={garage.flightMode}
            cameraView={garage.cameraView}
            muted={muted}
            touchSticksRef={touchSticksRef}
            onCycleFlightMode={handleCycleFlightMode}
            onToggleCamera={handleQuickSwitchCam}
            onResetDrone={() => setRaceRunId((n) => n + 1)}
            onToggleMute={handleToggleMute}
            onPause={() => setScreenMode('paused')}
          />
        </>
      )}

      {/* Screen 3: Drone Hangar & Upgrade Workshop */}
      {screenMode === 'garage' && (
        <GarageModal
          garage={garage}
          onSelectFrame={handleSelectFrame}
          onUnlockFrame={handleUnlockFrame}
          onUpgradePart={handleUpgradePart}
          onUpdateCustomization={handleUpdateCustomization}
          onUpdateRates={handleUpdateRates}
          onChangeFlightMode={handleChangeFlightMode}
          onChangeStickMode={handleChangeStickMode}
          onClose={() => setScreenMode(previousScreen)}
          onLaunchFlight={startRace}
        />
      )}

      {/* Screen 4: Google Maps Real-World Circuit Selector & Elevation Builder */}
      {screenMode === 'worldmap' && (
        <WorldMapModal
          activeTrack={activeTrack}
          savedCustomTracks={savedCustomTracks}
          bestTimesByTrack={bestTimesByTrack}
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
          muted={muted}
          onResume={() => setScreenMode('playing')}
          onRestart={startRace}
          onChangeFlightMode={handleChangeFlightMode}
          onToggleCamera={handleQuickSwitchCam}
          onChangeStickMode={handleChangeStickMode}
          onToggleMute={handleToggleMute}
          onOpenGarage={() => {
            setPreviousScreen('paused');
            setScreenMode('garage');
          }}
          onOpenWorldMap={() => {
            setPreviousScreen('paused');
            setScreenMode('worldmap');
          }}
          onExitTitle={() => setScreenMode('title')}
        />
      )}

      {/* Screen 6: Race Results Modal */}
      {screenMode === 'results' && raceResults && (
        <ResultsModal
          results={raceResults}
          onRetry={startRace}
          onOpenGarage={() => {
            setPreviousScreen('results');
            setScreenMode('garage');
          }}
          onOpenWorldMap={() => {
            setPreviousScreen('results');
            setScreenMode('worldmap');
          }}
          onExitTitle={() => setScreenMode('title')}
        />
      )}
    </div>
  );
}
