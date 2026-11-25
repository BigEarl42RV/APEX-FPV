/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React from 'react';
import {
  Award,
  Camera,
  Check,
  CheckCircle2,
  Cpu,
  Gamepad2,
  Globe,
  Home,
  Play,
  RotateCcw,
  ShieldCheck,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { MEDAL_LABELS } from '../data/progression';
import { BRAND_IDENTITY } from '../engine/ownershipGuard';
import type {
  CameraView,
  CareerBadgeId,
  CareerMedalTier,
  CircuitLeaderboardEntry,
  FlightMode,
  GraphicsQuality,
  HudDensityMode,
  RaceResultSummary,
  StickMode,
  TouchSticksMode,
} from '../types/game';
import { formatRaceTime } from './FpvOsdHud';
import { PWAInstallButton } from './PWAAndDeviceUI';
import { PilotBadgeEmblem } from './PilotBadgeEmblem';

interface PauseModalProps {
  trackName: string;
  flightMode: FlightMode;
  cameraView: CameraView;
  stickMode: StickMode;
  hudDensity: HudDensityMode;
  touchSticksMode: TouchSticksMode;
  graphicsQuality: GraphicsQuality;
  muted: boolean;
  gamepadConnected: boolean;
  onResume: () => void;
  onRestart: () => void;
  onChangeFlightMode: (m: FlightMode) => void;
  onToggleCamera: () => void;
  onChangeStickMode: (s: StickMode) => void;
  onChangeHudDensity: (h: HudDensityMode) => void;
  onChangeTouchSticksMode: (t: TouchSticksMode) => void;
  onChangeGraphicsQuality: (q: GraphicsQuality) => void;
  onOpenGamepadConfig: () => void;
  onToggleMute: () => void;
  onOpenGarage: () => void;
  onOpenWorldMap: () => void;
  onExitTitle: () => void;
  onOpenLegal: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  trackName,
  flightMode,
  cameraView,
  stickMode,
  hudDensity,
  touchSticksMode,
  graphicsQuality,
  muted,
  gamepadConnected,
  onResume,
  onRestart,
  onChangeFlightMode,
  onToggleCamera,
  onChangeStickMode,
  onChangeHudDensity,
  onChangeTouchSticksMode,
  onChangeGraphicsQuality,
  onOpenGamepadConfig,
  onToggleMute,
  onOpenGarage,
  onOpenWorldMap,
  onExitTitle,
  onOpenLegal,
}) => {
  return (
    <div
      data-gp-scope="true"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 overflow-y-auto safe-inset-container"
    >
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl p-5 sm:p-6 shadow-2xl max-h-[90dvh] overflow-y-auto my-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold text-white">
              Flight Paused
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">{trackName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenGamepadConfig}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-xs font-medium text-zinc-200 cursor-pointer transition-colors"
            >
              <Gamepad2
                className={`w-3.5 h-3.5 ${
                  gamepadConnected ? 'text-emerald-400' : 'text-zinc-400'
                }`}
              />
              <span>Controller</span>
            </button>
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

          <div>
            <div className="text-xs text-zinc-400 mb-1.5">Graphics Preset</div>
            <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              {(['ultra', 'high', 'performance'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onChangeGraphicsQuality(q)}
                  className={`py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer capitalize ${
                    graphicsQuality === q
                      ? 'bg-cyan-500 text-zinc-950'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {q === 'performance' ? 'Performance' : q}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-zinc-400 mb-1.5">Flight HUD (H)</div>
              <div className="grid grid-cols-2 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                {(['minimal', 'pure'] as HudDensityMode[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onChangeHudDensity(h)}
                    className={`py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer capitalize ${
                      hudDensity === h
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    {h === 'minimal' ? 'Corner' : 'Pure'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-400 mb-1.5">On-Screen Sticks</div>
              <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                {(['auto', 'always', 'hidden'] as TouchSticksMode[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChangeTouchSticksMode(t)}
                    className={`py-1.5 text-[11px] font-semibold rounded transition-colors cursor-pointer capitalize ${
                      touchSticksMode === t
                        ? 'bg-cyan-500 text-zinc-950'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    {t === 'always' ? 'Show' : t === 'hidden' ? 'Hide' : 'Auto'}
                  </button>
                ))}
              </div>
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
              className="flex items-center justify-center gap-1.5 py-2.5 sm:py-2 px-3 min-h-[44px] sm:min-h-0 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-100 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
            <button
              type="button"
              onClick={onOpenGarage}
              className="flex items-center justify-center gap-1.5 py-2.5 sm:py-2 px-3 min-h-[44px] sm:min-h-0 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-100 cursor-pointer whitespace-nowrap"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>Hangar</span>
            </button>
            <button
              type="button"
              onClick={onOpenWorldMap}
              className="flex items-center justify-center gap-1.5 py-2.5 sm:py-2 px-3 min-h-[44px] sm:min-h-0 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-100 cursor-pointer whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Circuits</span>
            </button>
            <button
              type="button"
              onClick={onExitTitle}
              className="flex items-center justify-center gap-1.5 py-2.5 sm:py-2 px-3 min-h-[44px] sm:min-h-0 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 cursor-pointer whitespace-nowrap"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Title</span>
            </button>
          </div>
          <div className="flex justify-center">
            <PWAInstallButton compact />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 gap-2">
          <span className="truncate">{BRAND_IDENTITY.copyrightNotice}</span>
          <button
            type="button"
            onClick={onOpenLegal}
            className="flex items-center gap-1 text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Legal &amp; Terms</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ResultsModalProps {
  results: RaceResultSummary;
  pilotCallsign: string;
  equippedBadgeId?: CareerBadgeId | null;
  leaderboard: CircuitLeaderboardEntry[];
  onRetry: () => void;
  onLaunchQualifiedFinal?: (roundNumber: number) => void;
  onEquipBadge?: (badgeId: CareerBadgeId) => void;
  onOpenCareer?: () => void;
  onOpenLeague: () => void;
  onOpenGarage: () => void;
  onOpenWorldMap: () => void;
  onExitTitle: () => void;
}

const MEDAL_STYLES: Record<CareerMedalTier, { text: string; border: string; bg: string }> = {
  none: { text: 'text-zinc-400', border: 'border-zinc-800', bg: 'bg-zinc-900' },
  bronze: { text: 'text-amber-500', border: 'border-amber-600/50', bg: 'bg-amber-950/30' },
  silver: { text: 'text-slate-200', border: 'border-slate-400/50', bg: 'bg-slate-800/40' },
  gold: { text: 'text-amber-400', border: 'border-amber-400/60', bg: 'bg-amber-500/15' },
  ace: { text: 'text-cyan-300', border: 'border-cyan-400/70', bg: 'bg-cyan-500/15' },
};

export const ResultsModal: React.FC<ResultsModalProps> = ({
  results,
  pilotCallsign,
  equippedBadgeId,
  leaderboard,
  onRetry,
  onLaunchQualifiedFinal,
  onEquipBadge,
  onOpenCareer,
  onOpenLeague,
  onOpenGarage,
  onOpenWorldMap,
  onExitTitle,
}) => {
  const medalStyle = MEDAL_STYLES[results.earnedMedal];

  return (
    <div
      data-gp-scope="true"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-4 overflow-y-auto safe-inset-container"
    >
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto my-auto">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="text-xs font-medium text-amber-400">
              {results.isNewRecord ? 'New Circuit Record' : 'Session Complete'}
              <span className="text-zinc-500 ml-2">· {pilotCallsign}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white mt-0.5 truncate">
              {results.trackName}
            </h2>
          </div>
          <div className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border flex items-center gap-2 shrink-0 ${medalStyle.bg} ${medalStyle.border}`}>
            <Award className={`w-5 h-5 ${medalStyle.text}`} />
            <div className="text-right">
              <div className={`text-xs font-display font-bold ${medalStyle.text}`}>
                {MEDAL_LABELS[results.earnedMedal]}
              </div>
              <div className="text-[10px] text-zinc-400">Career Medal</div>
            </div>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2 sm:gap-3 mt-4">
          <div className="p-2.5 sm:p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] text-zinc-400">Total Time</div>
            <div className="text-base sm:text-lg font-display font-bold font-mono-tabular text-white mt-0.5">
              {formatRaceTime(results.totalTimeMs)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] text-zinc-400">Best Lap · Peak</div>
            <div className="text-lg font-display font-bold font-mono-tabular text-cyan-400 mt-0.5">
              {formatRaceTime(results.bestLapMs)}
            </div>
            <div className="text-[10px] font-mono-tabular text-zinc-400">
              {results.maxSpeedKmh} km/h peak
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] text-zinc-400">Total Payout</div>
            <div className="text-lg font-display font-bold font-mono-tabular text-amber-400 mt-0.5">
              +{results.creditsEarned} CR
            </div>
            {(results.medalBonusCredits > 0 || results.contractRewardsCredits > 0) && (
              <div className="text-[10px] font-mono-tabular text-emerald-400">
                Includes {results.medalBonusCredits + results.contractRewardsCredits} bonus
              </div>
            )}
          </div>
        </div>

        {/* League Qualifier / Main Event Final Adjudication Card */}
        {results.leagueOutcome && (
          <div className="mt-3 p-3.5 rounded-lg bg-zinc-900/85 border border-amber-500/50 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-amber-400">
                  {results.leagueOutcome.roundTitle} ·{' '}
                  {results.leagueOutcome.stage === 'qualifier'
                    ? 'Qualifying Heat'
                    : 'Main Event Final'}
                </div>
                <div className="text-sm font-display font-bold text-white mt-0.5">
                  {results.leagueOutcome.stage === 'qualifier'
                    ? results.leagueOutcome.qualified
                      ? `Qualified for Final · Grid P${results.leagueOutcome.gridSeed}`
                      : `Missed Cut-Off (${formatRaceTime(results.leagueOutcome.cutOffMs ?? 0)})`
                    : `Finished P${results.leagueOutcome.placement} (+${results.leagueOutcome.pointsEarned} Pts)`}
                </div>
              </div>
              <div className="text-right font-mono-tabular">
                <div className="text-xs font-bold text-cyan-400">
                  +{results.leagueOutcome.repEarned} REP
                </div>
                {results.leagueOutcome.sponsorTeamName && (
                  <div className="text-[10px] text-emerald-400">
                    {results.leagueOutcome.sponsorTeamName} ({results.leagueOutcome.sponsorMultiplier}x)
                  </div>
                )}
              </div>
            </div>

            {results.leagueOutcome.sponsorBonusCredits > 0 && (
              <div className="text-xs text-emerald-400 font-mono-tabular">
                Sponsor Bonus Purse: +{results.leagueOutcome.sponsorBonusCredits.toLocaleString()} CR included
              </div>
            )}

            {results.leagueOutcome.newlyUnlockedSponsorNames.length > 0 && (
              <div className="text-xs text-amber-300 font-semibold">
                New Sponsor Offer Unlocked:{' '}
                {results.leagueOutcome.newlyUnlockedSponsorNames.join(', ')} — Sign in Pro League!
              </div>
            )}
          </div>
        )}

        {/* Career Milestone Unlocked Alert */}
        {results.newlyUnlockedMilestones &&
          results.newlyUnlockedMilestones.length > 0 && (
            <div className="mt-3 p-3.5 rounded-lg bg-zinc-900/90 border border-cyan-500/50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-display font-bold text-cyan-400">
                  <Award className="w-4 h-4 shrink-0" />
                  <span>
                    Career Milestone Unlocked (
                    {results.newlyUnlockedMilestones.length})
                  </span>
                </div>
                {onOpenCareer && (
                  <button
                    type="button"
                    onClick={onOpenCareer}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 cursor-pointer whitespace-nowrap"
                  >
                    View Pilot Career →
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {results.newlyUnlockedMilestones.map((ms) => {
                  const isBadgeEquipped =
                    ms.badgeId && equippedBadgeId === ms.badgeId;
                  return (
                    <div
                      key={ms.milestoneId}
                      className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {ms.badgeId ? (
                          <PilotBadgeEmblem badgeId={ms.badgeId} size="sm" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-display font-bold text-white truncate">
                            {ms.title}{' '}
                            <span className="font-mono-tabular text-amber-400 font-semibold ml-1">
                              +{ms.rewardCredits} CR
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-2">
                            {ms.badgeName && <span>Crest: {ms.badgeName}</span>}
                            {ms.prototypePartName && (
                              <span className="inline-flex items-center gap-1 text-cyan-400 font-medium">
                                <Cpu className="w-3 h-3 shrink-0" />
                                <span>{ms.prototypePartName}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {ms.badgeId && onEquipBadge && (
                        <button
                          type="button"
                          onClick={() => onEquipBadge(ms.badgeId!)}
                          disabled={Boolean(isBadgeEquipped)}
                          className={`px-2.5 py-1.5 min-h-[36px] sm:min-h-0 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            isBadgeEquipped
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                              : 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 cursor-pointer'
                          }`}
                        >
                          {isBadgeEquipped ? (
                            <span className="inline-flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Equipped
                            </span>
                          ) : (
                            'Equip Badge'
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* Ghost Duel & Sponsor Contract Payout Banner */}
        {(results.ghostLabel || results.completedContractTitles.length > 0) && (
          <div className="mt-3 p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1.5">
            {results.ghostLabel && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ghost Rival ({results.ghostLabel})</span>
                </span>
                <span
                  className={`font-semibold ${
                    results.beatGhost ? 'text-emerald-400' : 'text-zinc-300'
                  }`}
                >
                  {results.beatGhost ? 'Rival Defeated' : 'Target Ahead'}
                </span>
              </div>
            )}
            {results.completedContractTitles.map((title, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs text-emerald-400"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Contract Cleared: {title}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Lap Splits */}
        <div className="mt-3 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Lap Splits</span>
            <span className="font-mono-tabular">
              Par {(results.parTimeMs / 1000).toFixed(1)}s · {results.cleanGates}/
              {results.totalGatesCount} Gates
            </span>
          </div>
          <div className="space-y-1">
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

        {/* Circuit Standings */}
        {leaderboard.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span>Circuit Standings</span>
              <span className="text-[11px]">Saved Locally</span>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {leaderboard.slice(0, 5).map((entry, idx) => {
                const isCurrentRun =
                  entry.totalTimeMs === Math.round(results.totalTimeMs) &&
                  entry.callsign === pilotCallsign;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between text-xs font-mono-tabular px-2 py-1 rounded ${
                      isCurrentRun
                        ? 'bg-amber-500/15 text-amber-200'
                        : 'text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 text-zinc-500">#{idx + 1}</span>
                      <span className="font-sans font-medium truncate">
                        {entry.callsign}
                      </span>
                      <span className="font-sans text-[11px] text-zinc-500 truncate">
                        {entry.frameName}
                      </span>
                    </div>
                    <span className="font-semibold shrink-0 ml-2">
                      {formatRaceTime(entry.totalTimeMs)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2.5">
          {results.leagueOutcome?.stage === 'qualifier' &&
          results.leagueOutcome.qualified &&
          onLaunchQualifiedFinal ? (
            <button
              type="button"
              onClick={() =>
                onLaunchQualifiedFinal(results.leagueOutcome!.roundNumber)
              }
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Main Event Final (3 Laps)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Race Again</span>
            </button>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={onOpenLeague}
              className="flex items-center justify-center gap-1.5 py-2.5 sm:py-2 px-2.5 min-h-[44px] sm:min-h-0 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-xs font-semibold text-amber-300 cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>League</span>
            </button>
            <button
              type="button"
              onClick={onOpenGarage}
              className="flex items-center justify-center gap-1.5 py-2.5 sm:py-2 px-2.5 min-h-[44px] sm:min-h-0 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-100 cursor-pointer whitespace-nowrap"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>Hangar</span>
            </button>
            <button
              type="button"
              onClick={onOpenWorldMap}
              className="flex items-center justify-center gap-1.5 py-2.5 sm:py-2 px-2.5 min-h-[44px] sm:min-h-0 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-100 cursor-pointer whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Circuits</span>
            </button>
            <button
              type="button"
              onClick={onExitTitle}
              className="flex items-center justify-center gap-1.5 py-2.5 sm:py-2 px-2.5 min-h-[44px] sm:min-h-0 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 cursor-pointer whitespace-nowrap"
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
