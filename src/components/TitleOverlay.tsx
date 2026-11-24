import React from 'react';
import { Globe, Play, Wrench } from 'lucide-react';
import type { ComputedDroneStats, DroneFrameSpec, TrackDef } from '../types/game';

interface TitleOverlayProps {
  frame: DroneFrameSpec;
  stats: ComputedDroneStats;
  activeTrack: TrackDef;
  credits: number;
  bestTimeMs: number | null;
  onStartRace: () => void;
  onOpenGarage: () => void;
  onOpenWorldMap: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  frame,
  stats,
  activeTrack,
  credits,
  bestTimeMs,
  onStartRace,
  onOpenGarage,
  onOpenWorldMap,
}) => {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 sm:p-10">
      {/* Top Minimal Header Lockup (Left-aligned, leaving 60%+ center/right viewport open for the 3D hovering drone) */}
      <div className="flex items-start justify-between gap-6">
        <div className="pointer-events-auto max-w-md">
          {/* Bespoke inline SVG Title Lockup */}
          <svg
            viewBox="0 0 380 86"
            className="w-72 sm:w-96 h-auto mb-3"
            aria-label="Stratum FPV"
          >
            <g fill="none" stroke="none">
              {/* Prop rotor geometric emblem */}
              <circle
                cx="34"
                cy="42"
                r="24"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="16 6"
              />
              <circle cx="34" cy="42" r="6" fill="#f59e0b" />
              <path
                d="M16 24 L52 60 M52 24 L16 60"
                stroke="#e4e4e7"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <text
                x="76"
                y="46"
                fill="#ffffff"
                fontFamily="Chakra Petch, sans-serif"
                fontWeight="700"
                fontSize="36"
                letterSpacing="2"
              >
                STRATUM FPV
              </text>
              <text
                x="78"
                y="68"
                fill="#a1a1aa"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="500"
                fontSize="13"
                letterSpacing="1.5"
              >
                AERODYNAMIC RACING SIMULATOR
              </text>
            </g>
          </svg>

          <p className="text-sm text-zinc-300 leading-relaxed max-w-sm">
            True 6-DOF acro physics, dual-gimbal touch transmitter controls, and real-world circuits mapped from Google Elevation terrain.
          </p>
        </div>

        {/* Clean Unboxed Top-Right Credits & Active Rig Summary */}
        <div className="pointer-events-auto hidden sm:flex flex-col items-end gap-1 bg-zinc-950/82 border border-zinc-800 rounded-lg px-4 py-3 text-right">
          <div className="text-xs text-zinc-400">
            Credits{' '}
            <span className="font-mono-tabular font-semibold text-amber-400 ml-1">
              {credits.toLocaleString()} CR
            </span>
          </div>
          <div className="text-sm font-display font-semibold text-white">
            {frame.name}
          </div>
          <div className="text-xs text-zinc-400 font-mono-tabular flex items-center gap-2">
            <span>{stats.thrustToWeight}:1 TWR</span>
            <span aria-hidden="true">·</span>
            <span>{stats.topSpeedKmh} km/h</span>
            <span aria-hidden="true">·</span>
            <span>{stats.maxRateDegS}°/s</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar + Active Circuit Info */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="pointer-events-auto flex flex-col gap-3 max-w-xl">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onStartRace}
              className="flex items-center gap-2.5 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-base rounded-lg transition-colors shadow-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Race</span>
            </button>

            <button
              type="button"
              onClick={onOpenGarage}
              className="flex items-center gap-2 px-5 py-3 bg-zinc-900/92 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-medium text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Drone Hangar</span>
            </button>

            <button
              type="button"
              onClick={onOpenWorldMap}
              className="flex items-center gap-2 px-5 py-3 bg-zinc-900/92 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-medium text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Real-World Circuits</span>
            </button>
          </div>

          <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-2">
            <span>Enter / Space Start</span>
            <span aria-hidden="true">·</span>
            <span>W/S Throttle</span>
            <span aria-hidden="true">·</span>
            <span>A/D Yaw</span>
            <span aria-hidden="true">·</span>
            <span>Arrows Pitch/Roll</span>
            <span aria-hidden="true">·</span>
            <span>Touch Dual-Stick Mode 2</span>
            <span aria-hidden="true">·</span>
            <span>Esc Pause</span>
          </div>
        </div>

        {/* Active Circuit Summary Card */}
        <div className="pointer-events-auto bg-zinc-950/85 border border-zinc-800 rounded-lg px-4 py-3 min-w-[240px]">
          <div className="text-[11px] text-zinc-400">Selected Circuit</div>
          <div className="text-sm font-display font-bold text-white mt-0.5">
            {activeTrack.name}
          </div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2 font-mono-tabular">
            <span>{activeTrack.gates.length} Gates</span>
            <span aria-hidden="true">·</span>
            <span>{activeTrack.lapCount} Laps</span>
            <span aria-hidden="true">·</span>
            <span>
              Best{' '}
              {bestTimeMs !== null
                ? `${(bestTimeMs / 1000).toFixed(2)}s`
                : `${activeTrack.parTimeSec}s Par`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
