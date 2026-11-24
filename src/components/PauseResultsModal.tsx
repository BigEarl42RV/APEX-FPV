import React from 'react';
import {
  Camera,
  Globe,
  Home,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import type {
  CameraView,
  FlightMode,
  RaceResultSummary,
  StickMode,
} from '../types/game';
import { formatRaceTime } from './FpvOsdHud';

interface PauseModalProps {
  trackName: string;
  flightMode: FlightMode;
  cameraView: CameraView;
  stickMode: StickMode;
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onChangeFlightMode: (m: FlightMode) => void;
  onToggleCamera: () => void;
  onChangeStickMode: (s: StickMode) => void;
  onToggleMute: () => void;
  onOpenGarage: () => void;
  onOpenWorldMap: () => void;
  onExitTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  trackName,
  flightMode,
  cameraView,
  stickMode,
  muted,
  onResume,
  onRestart,
  onChangeFlightMode,
  onToggleCamera,
  onChangeStickMode,
  onToggleMute,
  onOpenGarage,
  onOpenWorldMap,
  onExitTitle,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold text-white">
              Flight Paused
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">{trackName}</p>
          </div>
          <button
            type="button"
            onClick={onToggleMute}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <div className="text-xs text-zinc-400 mb-1.5">Flight Mode</div>
            <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              {(['acro', 'airmode', 'angle'] as FlightMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChangeFlightMode(m)}
                  className={`py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    flightMode === m
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {m === 'acro'
                    ? 'Acro'
                    : m === 'airmode'
                      ? 'Airmode'
                      : 'Angle'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-zinc-400 mb-1.5">Camera View</div>
              <button
                type="button"
                onClick={onToggleCamera}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-100 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>{cameraView === 'fpv' ? 'FPV Lens' : 'Chase Cam'}</span>
              </button>
            </div>

            <div>
              <div className="text-xs text-zinc-400 mb-1.5">Stick Layout</div>
              <button
                type="button"
                onClick={() =>
                  onChangeStickMode(stickMode === 'mode2' ? 'mode1' : 'mode2')
                }
                className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-100 cursor-pointer"
              >
                {stickMode === 'mode2' ? 'Mode 2 (L-Thr)' : 'Mode 1 (R-Thr)'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Flight</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-100 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
            <button
              type="button"
              onClick={onOpenGarage}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-100 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>Hangar</span>
            </button>
            <button
              type="button"
              onClick={onOpenWorldMap}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-100 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Circuits</span>
            </button>
            <button
              type="button"
              onClick={onExitTitle}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Title</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ResultsModalProps {
  results: RaceResultSummary;
  onRetry: () => void;
  onOpenGarage: () => void;
  onOpenWorldMap: () => void;
  onExitTitle: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  results,
  onRetry,
  onOpenGarage,
  onOpenWorldMap,
  onExitTitle,
}) => {
  const beatPar = results.totalTimeMs <= results.parTimeMs;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-amber-400">
              {results.isNewRecord ? 'New Circuit Record' : 'Session Complete'}
            </div>
            <h2 className="text-2xl font-display font-bold text-white mt-0.5">
              {results.trackName}
            </h2>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <Trophy
              className={`w-6 h-6 ${
                beatPar ? 'text-amber-400' : 'text-zinc-400'
              }`}
            />
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] text-zinc-400">Total Time</div>
            <div className="text-lg font-display font-bold font-mono-tabular text-white mt-0.5">
              {formatRaceTime(results.totalTimeMs)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] text-zinc-400">Best Lap</div>
            <div className="text-lg font-display font-bold font-mono-tabular text-cyan-400 mt-0.5">
              {formatRaceTime(results.bestLapMs)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] text-zinc-400">Prize Earned</div>
            <div className="text-lg font-display font-bold font-mono-tabular text-amber-400 mt-0.5">
              +{results.creditsEarned} CR
            </div>
          </div>
        </div>

        {/* Lap Splits */}
        <div className="mt-4 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Lap Splits</span>
            <span className="font-mono-tabular">
              Par {(results.parTimeMs / 1000).toFixed(1)}s · {results.cleanGates}/
              {results.totalGatesCount} Gates
            </span>
          </div>
          <div className="space-y-1.5">
            {results.lapTimesMs.map((lapMs, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs font-mono-tabular"
              >
                <span className="text-zinc-400">Lap {idx + 1}</span>
                <span
                  className={
                    lapMs === results.bestLapMs
                      ? 'text-cyan-400 font-semibold'
                      : 'text-zinc-200'
                  }
                >
                  {formatRaceTime(lapMs)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Race Again</span>
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onOpenGarage}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-100 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>Upgrades</span>
            </button>
            <button
              type="button"
              onClick={onOpenWorldMap}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-100 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>World Map</span>
            </button>
            <button
              type="button"
              onClick={onExitTitle}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Title</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
