import React from 'react';
import type { TelemetrySnapshot, TrackDef } from '../types/game';

interface FpvOsdHudProps {
  telemetry: TelemetrySnapshot;
  track: TrackDef;
  gateFlash: boolean;
}

export function formatRaceTime(ms: number): string {
  const clamped = Math.max(0, ms);
  const mins = Math.floor(clamped / 60000);
  const secs = Math.floor((clamped % 60000) / 1000);
  const hundredths = Math.floor((clamped % 1000) / 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

export const FpvOsdHud: React.FC<FpvOsdHudProps> = ({
  telemetry,
  track,
  gateFlash,
}) => {
  const arrowDeg = (telemetry.gateArrowAngleRad * 180) / Math.PI;
  const clampedBatt = Math.max(0, Math.min(100, telemetry.batteryPct));
  const lowBatt = clampedBatt <= 22;
  const midBatt = clampedBatt > 22 && clampedBatt <= 45;

  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between">
      {/* Top Perimeter Telemetry Cluster */}
      <div className="flex items-start justify-between px-4 pt-16 sm:pt-5 sm:px-48 gap-4">
        {/* Lap & Gate Progress */}
        <div className="bg-zinc-950/75 border border-zinc-800/80 rounded-lg px-3 py-2 flex items-center gap-3">
          <div>
            <div className="text-[10px] text-zinc-400">Lap</div>
            <div className="text-base font-display font-bold font-mono-tabular text-white">
              {telemetry.currentLap}/{telemetry.totalLaps}
            </div>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <div className="text-[10px] text-zinc-400">Gate</div>
            <div className="text-base font-display font-bold font-mono-tabular text-amber-400">
              {telemetry.currentGateIndex + 1}/{telemetry.totalGates}
            </div>
          </div>
          <div className="hidden sm:block h-6 w-px bg-zinc-800" />
          <div className="hidden sm:block max-w-[140px] truncate">
            <div className="text-[10px] text-zinc-400">Circuit</div>
            <div className="text-xs font-medium text-zinc-200 truncate">
              {track.name}
            </div>
          </div>
        </div>

        {/* Center Lap Timer & Next Gate Directional Vector */}
        <div className="flex flex-col items-center gap-1.5">
          <div
            className={`px-4 py-1.5 rounded-lg border transition-colors duration-150 ${
              gateFlash
                ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                : 'bg-zinc-950/75 border-zinc-800/80 text-white'
            }`}
          >
            <div className="text-xl sm:text-2xl font-display font-bold font-mono-tabular tracking-tight text-center">
              {formatRaceTime(telemetry.lapTimeMs)}
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] font-mono-tabular text-zinc-400">
              <span>
                Best{' '}
                {telemetry.bestLapMs !== null
                  ? formatRaceTime(telemetry.bestLapMs)
                  : '--:--.--'}
              </span>
              {telemetry.lastSplitDeltaMs !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      telemetry.lastSplitDeltaMs <= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }
                  >
                    {telemetry.lastSplitDeltaMs <= 0 ? '-' : '+'}
                    {(Math.abs(telemetry.lastSplitDeltaMs) / 1000).toFixed(2)}s
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Next Gate Bearing Indicator */}
          <div className="flex items-center gap-1.5 bg-zinc-950/75 border border-zinc-800/80 rounded px-2.5 py-0.5 text-xs font-mono-tabular">
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 text-amber-400"
              style={{ transform: `rotate(${arrowDeg}deg)` }}
            >
              <path
                fill="currentColor"
                d="M12 2L19 20L12 16L5 20L12 2Z"
              />
            </svg>
            <span className="text-zinc-200">Next Gate</span>
            <span className="text-cyan-400 font-semibold">
              {telemetry.gateDistM}m
            </span>
          </div>
        </div>

        {/* Speed, Altitude & Battery */}
        <div className="bg-zinc-950/75 border border-zinc-800/80 rounded-lg px-3 py-2 flex items-center gap-3">
          <div>
            <div className="text-[10px] text-zinc-400">Airspeed</div>
            <div className="text-base font-display font-bold font-mono-tabular text-cyan-400">
              {telemetry.speedKmh}{' '}
              <span className="text-[10px] font-sans text-zinc-400">km/h</span>
            </div>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <div className="text-[10px] text-zinc-400">Alt AGL</div>
            <div className="text-base font-display font-bold font-mono-tabular text-white">
              {telemetry.altitudeM.toFixed(1)}
              <span className="text-[10px] font-sans text-zinc-400">m</span>
            </div>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div className="min-w-[82px] sm:min-w-[104px]">
            <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-400">
              <span>6S LiPo</span>
              <span
                className={`font-mono-tabular font-semibold ${
                  lowBatt
                    ? 'text-rose-400'
                    : midBatt
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {clampedBatt}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Battery charge"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={clampedBatt}
              className="mt-1 flex items-center gap-1"
            >
              <div className="relative flex-1 h-2 bg-zinc-900 border border-zinc-700/80 rounded-[3px] overflow-hidden p-[1px]">
                <div
                  className={`h-full rounded-[1px] transition-[width,background-color] duration-150 ${
                    lowBatt
                      ? 'bg-rose-500'
                      : midBatt
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${clampedBatt}%` }}
                />
              </div>
              <div className="w-[2px] h-1 bg-zinc-500 rounded-r-xs shrink-0" />
            </div>
            <div className="hidden sm:block text-[10px] font-mono-tabular text-zinc-400 mt-0.5 leading-none">
              {telemetry.voltageV.toFixed(1)}V
            </div>
          </div>
        </div>
      </div>

      {/* Optical Center Artificial Horizon & Reticle (Minimal Occlusion) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg
          viewBox="0 0 160 160"
          className="w-36 h-36 opacity-55"
        >
          {/* Fixed center boresight */}
          <circle cx="80" cy="80" r="2.2" fill="#f59e0b" />
          <line x1="66" y1="80" x2="74" y2="80" stroke="#f59e0b" strokeWidth="1.5" />
          <line x1="86" y1="80" x2="94" y2="80" stroke="#f59e0b" strokeWidth="1.5" />
          <line x1="80" y1="86" x2="80" y2="92" stroke="#f59e0b" strokeWidth="1.5" />

          {/* Dynamic roll/pitch horizon reference */}
          <g
            transform={`translate(80 80) rotate(${-telemetry.rollDeg}) translate(0 ${Math.max(-28, Math.min(28, telemetry.pitchDeg * 0.6))})`}
          >
            <line
              x1="-36"
              y1="0"
              x2="-16"
              y2="0"
              stroke="#e4e4e7"
              strokeWidth="1"
              strokeOpacity="0.6"
            />
            <line
              x1="16"
              y1="0"
              x2="36"
              y2="0"
              stroke="#e4e4e7"
              strokeWidth="1"
              strokeOpacity="0.6"
            />
          </g>
        </svg>

        {/* Launch Countdown Overlay */}
        {telemetry.countdownSec > 0 && (
          <div className="absolute flex flex-col items-center justify-center">
            <div className="text-7xl font-display font-bold font-mono-tabular text-amber-400 drop-shadow-lg">
              {telemetry.countdownSec}
            </div>
            <div className="text-xs font-medium tracking-widest text-zinc-200 bg-zinc-950/85 px-3 py-1 rounded border border-zinc-800 mt-2">
              Motors Armed · Ready on Grid
            </div>
          </div>
        )}
      </div>

      {/* Empty bottom spacer to balance flex layout */}
      <div className="h-4" />
    </div>
  );
};
