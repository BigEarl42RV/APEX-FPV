/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React, { useState } from 'react';
import {
  Award,
  Check,
  Edit3,
  Gamepad2,
  Globe,
  Play,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';
import {
  MEDAL_LABELS,
  getMedalThresholdsMs,
  getNextTargetMedal,
} from '../data/progression';
import { getActiveSponsorOffer, getQualifiedRoundCount } from '../data/league';
import { formatFlightDuration, getPilotRankInfo } from '../data/career';
import { getGamepadGlyphs } from '../engine/gamepad';
import { BRAND_IDENTITY } from '../engine/ownershipGuard';
import { PWAInstallButton } from './PWAAndDeviceUI';
import { PilotBadgeEmblem } from './PilotBadgeEmblem';
import type {
  CareerMedalTier,
  ComputedDroneStats,
  GraphicsQuality,
  LeagueSeasonState,
  PilotProfile,
  SponsorContract,
  TrackDef,
} from '../types/game';

interface TitleOverlayProps {
  rigName: string;
  isCustomBuild: boolean;
  stats: ComputedDroneStats;
  activeTrack: TrackDef;
  credits: number;
  bestTimeMs: number | null;
  trackMedal: CareerMedalTier;
  activeGhostLabel: string | null;
  graphicsQuality: GraphicsQuality;
  pilotProfile: PilotProfile;
  sponsorContracts: SponsorContract[];
  leagueSeason: LeagueSeasonState;
  gamepadStatus: { connected: boolean; id: string };
  onUpdateCallsign: (callsign: string) => void;
  onChangeGraphicsQuality: (q: GraphicsQuality) => void;
  onRotateContract: (contractId: string) => void;
  onStartRace: () => void;
  onOpenMultiplayer: () => void;
  onOpenLeague: () => void;
  onOpenCareer: () => void;
  onOpenGarage: () => void;
  onOpenWorldMap: () => void;
  onOpenGamepadConfig: () => void;
  onOpenLegal: () => void;
}

const MEDAL_COLORS: Record<CareerMedalTier, string> = {
  none: 'text-zinc-500',
  bronze: 'text-amber-600',
  silver: 'text-slate-300',
  gold: 'text-amber-400',
  ace: 'text-cyan-400',
};

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  rigName,
  isCustomBuild,
  stats,
  activeTrack,
  credits,
  bestTimeMs,
  trackMedal,
  activeGhostLabel,
  graphicsQuality,
  pilotProfile,
  sponsorContracts,
  leagueSeason,
  gamepadStatus,
  onUpdateCallsign,
  onChangeGraphicsQuality,
  onRotateContract,
  onStartRace,
  onOpenMultiplayer,
  onOpenLeague,
  onOpenCareer,
  onOpenGarage,
  onOpenWorldMap,
  onOpenGamepadConfig,
  onOpenLegal,
}) => {
  const activeSponsor = getActiveSponsorOffer(leagueSeason);
  const qualifiedRounds = getQualifiedRoundCount(leagueSeason);
  const glyphs = getGamepadGlyphs(gamepadStatus.id);
  const rankInfo = getPilotRankInfo(pilotProfile);
  const [editingCallsign, setEditingCallsign] = useState(false);
  const [draftCallsign, setDraftCallsign] = useState(pilotProfile.callsign);

  const commitCallsign = () => {
    const cleaned = draftCallsign.trim().slice(0, 18) || 'APEX-01';
    onUpdateCallsign(cleaned);
    setDraftCallsign(cleaned);
    setEditingCallsign(false);
  };

  const nextMedal = getNextTargetMedal(trackMedal);
  const thresholds = getMedalThresholdsMs(activeTrack.parTimeSec);
  const nextTargetMs = thresholds[nextMedal];

  return (
    <div
      data-gp-scope="true"
      className="fixed inset-0 z-20 pointer-events-none overflow-y-auto safe-inset-container"
    >
      <div className="min-h-full flex flex-col justify-between p-4 sm:p-8 lg:p-10 gap-5">
        {/* Top Perimeter Row: Left Brand + Compact Sponsor Briefs, Right Pilot & Graphics */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6 fold-split-h">
          <div className="pointer-events-auto max-w-md space-y-3 fold-pane-left">
            <div>
              {/* Bespoke inline SVG Title Lockup */}
              <svg
                viewBox="0 0 380 86"
                className="w-60 sm:w-80 lg:w-96 max-w-full h-auto mb-2"
                aria-label="Stratum FPV"
              >
              <g fill="none" stroke="none">
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
              True 6-DOF acro physics, avionics software tuning, holographic ghost rivals, and real-world circuits mapped with Google Elevation &amp; Street View.
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={onOpenLegal}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-zinc-950/88 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-[11px] text-zinc-300 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  <strong className="text-white">{BRAND_IDENTITY.studioName}</strong>
                </span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="text-amber-400 font-medium">Legal</span>
              </button>
              <div className="sm:hidden">
                <PWAInstallButton compact />
              </div>
            </div>
          </div>

          {/* Mobile / Narrow Cover Compact Rig & Credits Strip */}
          <div className="sm:hidden bg-zinc-950/88 border border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <PilotBadgeEmblem
                badgeId={pilotProfile.equippedBadgeId}
                size="xs"
                locked={!pilotProfile.equippedBadgeId}
              />
              <div className="min-w-0">
                <div className="font-display font-bold text-white truncate">
                  {rigName}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono-tabular truncate">
                  {pilotProfile.callsign} · {rankInfo.rankTitle} · S{leagueSeason.seasonNumber} ({qualifiedRounds}/4)
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono-tabular font-bold text-amber-400">
                {credits.toLocaleString()} CR
              </div>
              <div className="text-[10px] text-zinc-400 capitalize">
                {graphicsQuality === 'performance' ? 'Perf' : graphicsQuality} GFX
              </div>
            </div>
          </div>

          {/* Rotating Sponsor Contracts Card (Compact Left-Side, leaves center drone wide open) */}
          <div className="hidden lg:block bg-zinc-950/82 border border-zinc-800 rounded-lg p-3.5 max-w-xs space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="font-semibold text-zinc-200">
                Active Sponsor Contracts
              </span>
              <span className="font-mono-tabular text-amber-400">
                {sponsorContracts.filter((c) => c.completed).length}/3 Ready
              </span>
            </div>
            <div className="space-y-2">
              {sponsorContracts.map((c) => {
                const pct = Math.min(
                  100,
                  Math.round((c.progressValue / Math.max(1, c.targetValue)) * 100)
                );
                return (
                  <div
                    key={c.id}
                    className="p-2 rounded bg-zinc-900/75 border border-zinc-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-white truncate">
                        {c.sponsorName} · {c.title}
                      </span>
                      {c.completed ? (
                        <button
                          type="button"
                          onClick={() => onRotateContract(c.id)}
                          className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 shrink-0 cursor-pointer"
                          title="Claimed · Load next contract"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Next</span>
                        </button>
                      ) : (
                        <span className="font-mono-tabular text-amber-400 shrink-0">
                          +{c.rewardCredits} CR
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400 leading-tight">
                      {c.description}
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            c.completed ? 'bg-emerald-400' : 'bg-cyan-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono-tabular text-zinc-400">
                        {c.progressValue}/{c.targetValue}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Clean Unboxed Top-Right Pilot Profile, Quality Preset & Active Rig Summary */}
        <div className="pointer-events-auto hidden sm:flex flex-col items-end gap-1.5 bg-zinc-950/84 border border-zinc-800 rounded-lg px-4 py-3 text-right fold-pane-right justify-self-end self-start">
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={onOpenCareer}
              className="flex items-center gap-1.5 text-zinc-300 hover:text-white cursor-pointer"
              title="Open Pilot Career"
            >
              <PilotBadgeEmblem
                badgeId={pilotProfile.equippedBadgeId}
                size="sm"
                locked={!pilotProfile.equippedBadgeId}
              />
              <span className="text-[11px] font-semibold text-cyan-400">
                {rankInfo.rankTitle}
              </span>
            </button>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            {editingCallsign ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={draftCallsign}
                  maxLength={18}
                  onChange={(e) => setDraftCallsign(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitCallsign();
                    if (e.key === 'Escape') setEditingCallsign(false);
                  }}
                  className="w-28 px-2 py-0.5 bg-zinc-900 border border-amber-500 rounded text-xs text-white focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={commitCallsign}
                  className="p-1 rounded bg-amber-500 text-zinc-950 cursor-pointer"
                  aria-label="Save callsign"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraftCallsign(pilotProfile.callsign);
                  setEditingCallsign(true);
                }}
                className="flex items-center gap-1.5 text-zinc-300 hover:text-white cursor-pointer"
              >
                <span className="font-semibold">{pilotProfile.callsign}</span>
                <Edit3 className="w-3 h-3 text-zinc-500" />
              </button>
            )}
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span className="font-mono-tabular font-semibold text-amber-400">
              {credits.toLocaleString()} CR
            </span>
          </div>

          <div className="text-[11px] text-zinc-400 font-mono-tabular flex items-center justify-end gap-2">
            <span>{formatFlightDuration(pilotProfile.totalFlightSeconds ?? 0)} Flight</span>
            <span aria-hidden="true">·</span>
            <span>{pilotProfile.totalCleanGates.toLocaleString()} Gates</span>
            <span aria-hidden="true">·</span>
            <span>{rankInfo.completedCount}/{rankInfo.totalCount} Milestones</span>
          </div>

          <div className="text-sm font-display font-semibold text-white">
            {rigName}
            {isCustomBuild && (
              <span className="ml-1.5 text-[11px] font-sans font-medium text-cyan-400">
                Custom
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-400 font-mono-tabular flex items-center gap-2">
            <span>{stats.thrustToWeight}:1 TWR</span>
            <span aria-hidden="true">·</span>
            <span>{stats.topSpeedKmh} km/h</span>
            <span aria-hidden="true">·</span>
            <span>{stats.pidResponsiveness.toFixed(2)}x PID</span>
          </div>

          <div className="text-[11px] text-zinc-300 flex items-center justify-end gap-2">
            <span className="text-amber-400 font-medium">
              S{leagueSeason.seasonNumber} ({qualifiedRounds}/4 Qual)
            </span>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span>
              {activeSponsor
                ? `${activeSponsor.teamName} (${activeSponsor.podiumMultiplier}x)`
                : `${leagueSeason.pilotRep} REP · Free Agent`}
            </span>
          </div>

          {/* Graphics Quality Selector */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] text-zinc-500">Graphics</span>
            <div className="flex items-center gap-0.5 bg-zinc-900 p-0.5 rounded border border-zinc-800">
              {(['ultra', 'high', 'performance'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onChangeGraphicsQuality(q)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer capitalize ${
                    graphicsQuality === q
                      ? 'bg-cyan-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {q === 'performance' ? 'Perf' : q}
                </button>
              ))}
            </div>
          </div>

          {gamepadStatus.connected && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 pt-0.5 max-w-[260px]">
              <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {glyphs.brandLabel} · {gamepadStatus.id}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar + Active Circuit & Medal Summary */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 fold-split-h pb-5 sm:pb-6">
        <div className="pointer-events-auto flex flex-col gap-3 max-w-2xl fold-pane-left">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onStartRace}
              className="flex items-center justify-center gap-2.5 px-5 sm:px-6 py-3 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm sm:text-base rounded-lg transition-colors shadow-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Race</span>
            </button>

            <button
              type="button"
              onClick={onOpenMultiplayer}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 min-h-[44px] bg-zinc-900/92 hover:bg-zinc-800 border border-emerald-500/60 text-emerald-300 font-display font-bold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Multiplayer</span>
            </button>

            <button
              type="button"
              onClick={onOpenLeague}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 min-h-[44px] bg-zinc-900/92 hover:bg-zinc-800 border border-amber-500/60 text-amber-300 font-display font-bold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Pro League</span>
            </button>

            <button
              type="button"
              onClick={onOpenCareer}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 min-h-[44px] bg-zinc-900/92 hover:bg-zinc-800 border border-cyan-500/60 text-cyan-300 font-display font-bold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Award className="w-4 h-4 text-cyan-400" />
              <span>Pilot Career</span>
            </button>

            <button
              type="button"
              onClick={onOpenGarage}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 min-h-[44px] bg-zinc-900/92 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-medium text-xs sm:text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Drone Hangar</span>
            </button>

            <button
              type="button"
              onClick={onOpenWorldMap}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 min-h-[44px] bg-zinc-900/92 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-medium text-xs sm:text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Real-World Circuits</span>
            </button>

            <button
              type="button"
              onClick={onOpenGamepadConfig}
              className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-zinc-900/92 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-medium text-xs sm:text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Gamepad2
                className={`w-4 h-4 ${
                  gamepadStatus.connected ? 'text-emerald-400' : 'text-zinc-400'
                }`}
              />
              <span>Controller</span>
            </button>

            <div className="hidden sm:block">
              <PWAInstallButton />
            </div>
          </div>

          <div className="text-[11px] sm:text-xs text-zinc-400 flex flex-wrap items-center gap-2">
            {gamepadStatus.connected ? (
              <>
                <span className="text-emerald-400 font-semibold">
                  {glyphs.brandLabel} Ready
                </span>
                <span aria-hidden="true">·</span>
                <span>{glyphs.start} / {glyphs.confirm} Start</span>
                <span aria-hidden="true">·</span>
                <span>{glyphs.dpad} Navigate</span>
                <span aria-hidden="true">·</span>
                <span>{glyphs.cam} Cam</span>
                <span aria-hidden="true">·</span>
                <span>{glyphs.mode} Mode</span>
              </>
            ) : (
              <>
                <span>Enter / Space Start</span>
                <span aria-hidden="true">·</span>
                <span>W/S Throttle</span>
                <span aria-hidden="true">·</span>
                <span>A/D Yaw</span>
                <span aria-hidden="true">·</span>
                <span>Arrows Pitch/Roll</span>
                <span aria-hidden="true">·</span>
                <span>Esc Pause</span>
              </>
            )}
          </div>
        </div>

        {/* Active Circuit Summary Card with Medal Crest & Ghost Target */}
        <div className="pointer-events-auto bg-zinc-950/85 border border-zinc-800 rounded-lg px-4 py-3 sm:min-w-[265px] fold-pane-right">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-zinc-400">Selected Circuit</span>
            <span
              className={`flex items-center gap-1 text-[11px] font-semibold ${MEDAL_COLORS[trackMedal]}`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{MEDAL_LABELS[trackMedal]} Medal</span>
            </span>
          </div>
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
          <div className="text-[11px] text-cyan-400 font-mono-tabular mt-1 flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
            <span>Ghost: {activeGhostLabel ?? `PRO ${MEDAL_LABELS[nextMedal].toUpperCase()}`}</span>
            <span>
              {MEDAL_LABELS[nextMedal]} {(nextTargetMs / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
