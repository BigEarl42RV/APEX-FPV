/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React from 'react';
import { FastForward } from 'lucide-react';
import type {
  ActiveLeagueSession,
  HudDensityMode,
  SoftwareLoadout,
  TelemetrySnapshot,
  TrackDef,
} from '../types/game';
import type { RoomStateSnapshot } from '../types/multiplayer';
import type { MultiplayerClientState } from '../engine/multiplayerClient';

interface FpvOsdHudProps {
  telemetry: TelemetrySnapshot;
  track: TrackDef;
  gateFlash: boolean;
  software: SoftwareLoadout;
  hudDensity: HudDensityMode;
  activeLeagueSession: ActiveLeagueSession | null;
  multiplayerRoom?: RoomStateSnapshot | null;
  multiplayerPlayerId?: string | null;
  hitBanner?: MultiplayerClientState['hitBanner'];
  onFastForwardBotTurn?: () => void;
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
  software,
  hudDensity,
  activeLeagueSession,
  multiplayerRoom = null,
  multiplayerPlayerId = null,
  hitBanner = null,
  onFastForwardBotTurn,
}) => {
  const arrowDeg = (telemetry.gateArrowAngleRad * 180) / Math.PI;
  const clampedBatt = Math.max(0, Math.min(100, telemetry.batteryPct));
  const lowBatt = clampedBatt <= 22;
  const midBatt = clampedBatt > 22 && clampedBatt <= 45;

  const showGateRadar =
    hudDensity === 'minimal' &&
    software.unlockedHudModules.includes('gateRadar') &&
    software.enabledHudModules.gateRadar;
  const showGhostDelta =
    hudDensity === 'minimal' &&
    software.unlockedHudModules.includes('blackboxGhostDelta') &&
    software.enabledHudModules.blackboxGhostDelta;
  const showAnalogScanlines =
    software.goggleMode === 'analog-raceband' && software.analogFxEnabled;

  // Compact radar chevron coordinates along 34px radius ring inside 100x100 viewBox
  const radarRad = telemetry.gateArrowAngleRad;
  const radarX = 50 + Math.sin(radarRad) * 34;
  const radarY = 50 - Math.cos(radarRad) * 34;

  const isPure = hudDensity === 'pure';
  const localMp =
    multiplayerRoom && multiplayerPlayerId
      ? multiplayerRoom.participants.find((p) => p.id === multiplayerPlayerId) ?? null
      : null;
  const itPilot = multiplayerRoom?.itPlayerId
    ? multiplayerRoom.participants.find((p) => p.id === multiplayerRoom.itPlayerId) ?? null
    : null;
  const fl = multiplayerRoom?.followLeader ?? null;
  const flLeader =
    fl && multiplayerRoom
      ? multiplayerRoom.participants.find((p) => p.id === fl.leaderId) ?? null
      : null;
  const isHost = Boolean(
    multiplayerRoom && multiplayerPlayerId && multiplayerRoom.hostId === multiplayerPlayerId
  );
  const canFastForwardBot = Boolean(
    isHost &&
      fl &&
      ((fl.phase === 'leader-turn' && flLeader?.isBot) ||
        (fl.phase === 'challenger-turn' &&
          fl.survivorIds.every((id) => {
            if (id === fl.leaderId || fl.completedTurnIds.includes(id)) return true;
            const p = multiplayerRoom?.participants.find((x) => x.id === id);
            return Boolean(p?.isBot);
          })))
  );
  const showHitBanner = Boolean(hitBanner && Date.now() - hitBanner.ts < 2200);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between safe-inset-container">
      {/* Optional Analog 5.8GHz Raceband CRT Scanline Layer (No backdrop-filter) */}
      {showAnalogScanlines && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.55) 0px, rgba(0,0,0,0.55) 1px, transparent 1px, transparent 3px)',
          }}
        />
      )}

      {/* Slim Perimeter Corner OSD (Unboxed, zero center-viewport obstruction) */}
      <div className="flex items-start justify-between px-3 pt-2 sm:px-5 sm:pt-3.5 gap-2 sm:gap-4">
        {/* Top-Left Corner: Stopwatch, Lap/Gate & Split/Ghost/Cut-Off */}
        <div className="[text-shadow:0_1px_4px_rgba(0,0,0,0.95)] space-y-0.5 min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-lg sm:text-2xl font-display font-bold font-mono-tabular tracking-tight transition-colors duration-150 ${
                gateFlash ? 'text-amber-300' : 'text-white'
              }`}
            >
              {multiplayerRoom &&
              (multiplayerRoom.mode === 'laser-tag' || multiplayerRoom.mode === 'drone-tag')
                ? `${String(Math.floor(multiplayerRoom.matchTimeRemainingSec / 60)).padStart(2, '0')}:${String(multiplayerRoom.matchTimeRemainingSec % 60).padStart(2, '0')}`
                : formatRaceTime(telemetry.lapTimeMs)}
            </span>
            {!isPure &&
              (!multiplayerRoom ||
                multiplayerRoom.mode === 'team-race' ||
                multiplayerRoom.mode === 'follow-leader') && (
                <span className="text-[11px] sm:text-xs font-mono-tabular font-semibold text-zinc-200 whitespace-nowrap">
                  L{telemetry.currentLap}/
                  {multiplayerRoom ? multiplayerRoom.rules.lapCount : telemetry.totalLaps}
                  <span className="text-zinc-500 mx-1">·</span>
                  <span className="text-amber-400">
                    G{telemetry.currentGateIndex + 1}/{telemetry.totalGates}
                  </span>
                </span>
              )}
          </div>

          {!isPure && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono-tabular text-zinc-300">
              {multiplayerRoom ? (
                <>
                  {multiplayerRoom.mode === 'laser-tag' && localMp && (
                    <span className="text-cyan-300 font-semibold">
                      SHIELD {localMp.shieldHp}/{localMp.maxShieldHp} · {localMp.score} ELIM
                    </span>
                  )}
                  {multiplayerRoom.mode === 'drone-tag' && (
                    <span
                      className={`font-semibold ${
                        localMp?.isIt ? 'text-rose-400' : 'text-amber-300'
                      }`}
                    >
                      {localMp?.isIt
                        ? 'YOU ARE IT (F / Click Pulse)'
                        : `IT: ${itPilot?.callsign ?? '--'}`}
                    </span>
                  )}
                  {multiplayerRoom.mode === 'follow-leader' && fl && (
                    <span className="text-amber-300 font-semibold">
                      R{fl.roundNumber} ·{' '}
                      {fl.phase === 'leader-turn'
                        ? `Leader: ${fl.leaderCallsign}`
                        : fl.leaderCutoffMs
                          ? `Beat ${formatRaceTime(fl.leaderCutoffMs)}`
                          : 'Round Complete'}
                    </span>
                  )}
                  {multiplayerRoom.mode === 'team-race' && localMp && (
                    <span className="text-cyan-300 font-semibold">
                      {localMp.team === 'red'
                        ? 'RED SQUAD'
                        : localMp.team === 'blue'
                          ? 'BLUE SQUAD'
                          : 'SOLO GRID'}
                    </span>
                  )}
                </>
              ) : activeLeagueSession?.stage === 'qualifier' ? (
                <span className="text-cyan-300 font-semibold">
                  Cut-off {formatRaceTime(activeLeagueSession.cutOffMs)}
                </span>
              ) : (
                <span>
                  Best{' '}
                  {telemetry.bestLapMs !== null
                    ? formatRaceTime(telemetry.bestLapMs)
                    : '--:--.--'}
                </span>
              )}

              {telemetry.lastSplitDeltaMs !== null && !multiplayerRoom && (
                <span
                  className={
                    telemetry.lastSplitDeltaMs <= 0
                      ? 'text-emerald-400 font-semibold'
                      : 'text-rose-400 font-semibold'
                  }
                >
                  {telemetry.lastSplitDeltaMs <= 0 ? '-' : '+'}
                  {(Math.abs(telemetry.lastSplitDeltaMs) / 1000).toFixed(2)}s
                </span>
              )}

              {showGhostDelta && telemetry.ghostLabel && (
                <>
                  <span className="text-zinc-500">·</span>
                  <span className="text-cyan-300">
                    {telemetry.ghostLabel}{' '}
                    {telemetry.ghostDeltaMs !== null ? (
                      <strong
                        className={
                          telemetry.ghostDeltaMs <= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }
                      >
                        {telemetry.ghostDeltaMs <= 0 ? '-' : '+'}
                        {(Math.abs(telemetry.ghostDeltaMs) / 1000).toFixed(2)}s
                      </strong>
                    ) : (
                      '--'
                    )}
                  </span>
                </>
              )}

              {(!multiplayerRoom ||
                multiplayerRoom.mode === 'team-race' ||
                multiplayerRoom.mode === 'follow-leader') && (
                <>
                  <span className="text-zinc-500">·</span>
                  <span className="inline-flex items-center gap-1 text-zinc-200">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-3 h-3 text-amber-400 shrink-0"
                      style={{ transform: `rotate(${arrowDeg}deg)` }}
                    >
                      <path
                        fill="currentColor"
                        d="M12 2L19 20L12 16L5 20L12 2Z"
                      />
                    </svg>
                    <span className="text-cyan-300 font-semibold">
                      {telemetry.gateDistM}m
                    </span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Top-Center Multiplayer Live Score Strip */}
        {multiplayerRoom && !isPure && (
          <div className="hidden sm:flex flex-col items-center gap-1 [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
            <div className="flex items-center gap-3 px-3 py-1 rounded bg-zinc-950/85 border border-zinc-800 text-xs font-mono-tabular">
              {multiplayerRoom.rules.teamMode === 'teams' ? (
                <>
                  <span className="font-display font-bold text-rose-400">
                    RED {multiplayerRoom.teamScores.red}
                  </span>
                  <span className="text-zinc-500">vs</span>
                  <span className="font-display font-bold text-cyan-400">
                    BLUE {multiplayerRoom.teamScores.blue}
                  </span>
                </>
              ) : (
                <span className="font-display font-bold text-amber-400">
                  {multiplayerRoom.participants.filter((p) => !p.eliminated).length}/
                  {multiplayerRoom.participants.length} ACTIVE
                </span>
              )}
              {multiplayerRoom.mode === 'drone-tag' &&
                multiplayerRoom.itPulseCountdownSec !== null && (
                  <>
                    <span className="text-zinc-600">·</span>
                    <span className="text-rose-400 font-bold">
                      PULSE {multiplayerRoom.itPulseCountdownSec}s
                    </span>
                  </>
                )}
              {fl && fl.phase === 'challenger-turn' && fl.leaderTargetMs && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-amber-300">
                    Leader {formatRaceTime(fl.leaderTargetMs)}
                  </span>
                </>
              )}
            </div>

            {canFastForwardBot && onFastForwardBotTurn && (
              <button
                type="button"
                onClick={onFastForwardBotTurn}
                className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-[11px] cursor-pointer shadow"
              >
                <FastForward className="w-3 h-3" />
                <span>Fast-Forward Bot Turn</span>
              </button>
            )}
          </div>
        )}

        {/* Top-Right Corner: Airspeed, Alt AGL, Battery & League/MP Tag */}
        {!isPure && (
          <div className="text-right [text-shadow:0_1px_4px_rgba(0,0,0,0.95)] space-y-0.5">
            <div className="flex items-center justify-end gap-2.5 text-xs sm:text-sm font-mono-tabular">
              <span className="font-display font-bold text-cyan-300">
                {telemetry.speedKmh}
                <span className="text-[10px] font-sans text-zinc-300 ml-0.5">
                  km/h
                </span>
              </span>
              <span className="text-zinc-500">·</span>
              <span className="font-semibold text-white">
                {telemetry.altitudeM.toFixed(1)}
                <span className="text-[10px] font-sans text-zinc-300 ml-0.5">
                  m
                </span>
              </span>
              <span className="text-zinc-500">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  role="progressbar"
                  aria-label="Battery charge"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={clampedBatt}
                  className="w-8 h-1.5 bg-zinc-900/85 border border-zinc-600/80 rounded-xs overflow-hidden inline-block"
                >
                  <span
                    className={`block h-full transition-[width,background-color] duration-150 ${
                      lowBatt
                        ? 'bg-rose-500'
                        : midBatt
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                    }`}
                    style={{ width: `${clampedBatt}%` }}
                  />
                </span>
                <span
                  className={`font-semibold text-xs ${
                    lowBatt
                      ? 'text-rose-400'
                      : midBatt
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                  }`}
                >
                  {telemetry.voltageV.toFixed(1)}V
                </span>
              </span>
            </div>

            <div className="text-[10px] font-medium text-zinc-300/90 truncate max-w-[230px] ml-auto">
              {multiplayerRoom ? (
                <span className="text-amber-300 font-semibold">
                  {multiplayerRoom.roomCode} · {track.name}
                </span>
              ) : activeLeagueSession ? (
                <span className="text-amber-300 font-semibold">
                  R{activeLeagueSession.roundNumber}{' '}
                  {activeLeagueSession.stage === 'qualifier'
                    ? 'Qualifier'
                    : 'Main Event Final'}
                  {' · '}
                  {track.name}
                </span>
              ) : (
                track.name
              )}
            </div>

            {/* Compact 2-line Multiplayer Combat/Tag Feed */}
            {multiplayerRoom && multiplayerRoom.feed.length > 0 && (
              <div className="hidden md:flex flex-col items-end gap-0.5 pt-1">
                {multiplayerRoom.feed.slice(-2).map((ev) => (
                  <div
                    key={ev.id}
                    className={`text-[10px] font-mono-tabular ${
                      ev.accent === 'red'
                        ? 'text-rose-300'
                        : ev.accent === 'blue'
                          ? 'text-cyan-300'
                          : ev.accent === 'emerald'
                            ? 'text-emerald-300'
                            : 'text-amber-300'
                    }`}
                  >
                    {ev.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ultra-Minimal Center Boresight Reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-24 h-24 opacity-55">
          {showGateRadar && (
            <g>
              <circle
                cx="50"
                cy="50"
                r="34"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="0.8"
                strokeOpacity="0.25"
                strokeDasharray="4 4"
              />
              <g
                transform={`translate(${radarX.toFixed(1)} ${radarY.toFixed(1)}) rotate(${arrowDeg.toFixed(1)})`}
              >
                <polygon
                  points="0,-5 3.6,3.6 0,1.4 -3.6,3.6"
                  fill="#22d3ee"
                  fillOpacity="0.9"
                />
              </g>
            </g>
          )}

          {/* Laser Tag Targeting Ring */}
          {multiplayerRoom?.mode === 'laser-tag' && (
            <circle
              cx="50"
              cy="50"
              r="14"
              fill="none"
              stroke="#ef4444"
              strokeWidth="0.9"
              strokeOpacity="0.6"
              strokeDasharray="5 3"
            />
          )}

          {/* Whisper-thin center boresight */}
          <circle cx="50" cy="50" r="1.4" fill="#f59e0b" />
          <line x1="41" y1="50" x2="46" y2="50" stroke="#f59e0b" strokeWidth="1" />
          <line x1="54" y1="50" x2="59" y2="50" stroke="#f59e0b" strokeWidth="1" />

          {/* Subtle roll/pitch horizon ticks */}
          <g
            transform={`translate(50 50) rotate(${-telemetry.rollDeg}) translate(0 ${Math.max(-16, Math.min(16, telemetry.pitchDeg * 0.35))})`}
          >
            <line
              x1="-20"
              y1="0"
              x2="-11"
              y2="0"
              stroke="#e4e4e7"
              strokeWidth="0.8"
              strokeOpacity="0.55"
            />
            <line
              x1="11"
              y1="0"
              x2="20"
              y2="0"
              stroke="#e4e4e7"
              strokeWidth="0.8"
              strokeOpacity="0.55"
            />
          </g>
        </svg>

        {showGateRadar && Math.abs(telemetry.gateElevationDiffM) >= 2 && (
          <div className="absolute mt-24 text-[10px] font-mono-tabular text-cyan-300 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
            {telemetry.gateElevationDiffM > 0 ? '▲ +' : '▼ '}
            {telemetry.gateElevationDiffM}m
          </div>
        )}

        {/* Follow the Leader Spectate Status */}
        {fl &&
          fl.phase === 'leader-turn' &&
          fl.leaderId !== multiplayerPlayerId && (
            <div className="absolute top-20 flex flex-col items-center gap-1 [text-shadow:0_1px_5px_rgba(0,0,0,0.95)]">
              <div className="px-3 py-1 rounded bg-zinc-950/88 border border-amber-500/60 text-xs font-display font-bold text-amber-300">
                WATCHING LEADER: {fl.leaderCallsign}
              </div>
              <div className="text-[11px] text-zinc-200">
                Your challenger run begins as soon as the Leader finishes
              </div>
            </div>
          )}

        {/* Transient Combat / Tag Banner */}
        {showHitBanner && hitBanner && (
          <div
            className={`absolute mt-32 px-3 py-1 rounded bg-zinc-950/90 border text-xs font-display font-bold tracking-wide [text-shadow:0_1px_3px_rgba(0,0,0,0.95)] ${
              hitBanner.accent === 'emerald'
                ? 'border-emerald-500/70 text-emerald-300'
                : hitBanner.accent === 'rose'
                  ? 'border-rose-500/70 text-rose-300'
                  : 'border-amber-500/70 text-amber-300'
            }`}
          >
            {hitBanner.text}
          </div>
        )}

        {/* Launch Countdown Overlay */}
        {((multiplayerRoom && multiplayerRoom.status === 'countdown') ||
          (!multiplayerRoom && telemetry.countdownSec > 0)) && (
          <div className="absolute flex flex-col items-center justify-center">
            <div className="text-7xl font-display font-bold font-mono-tabular text-amber-400 [text-shadow:0_2px_12px_rgba(0,0,0,0.9)]">
              {multiplayerRoom
                ? Math.max(1, multiplayerRoom.countdownRemainingSec)
                : telemetry.countdownSec}
            </div>
            <div className="text-xs font-medium tracking-wide text-zinc-100 [text-shadow:0_1px_4px_rgba(0,0,0,0.95)] mt-1">
              {multiplayerRoom
                ? `${multiplayerRoom.roomName} · Motors Armed`
                : activeLeagueSession
                  ? `R${activeLeagueSession.roundNumber} ${activeLeagueSession.stage === 'qualifier' ? 'Qualifier' : 'Main Event'} · Motors Armed`
                  : 'Motors Armed · Ready on Grid'}
            </div>
          </div>
        )}
      </div>

      <div aria-hidden="true" />
    </div>
  );
};

