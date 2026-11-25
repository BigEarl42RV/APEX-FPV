/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React, { useMemo, useState } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Flag,
  Gauge,
  Hammer,
  Lock,
  Shield,
  Target,
  X,
} from 'lucide-react';
import {
  CAREER_BADGES,
  CAREER_MILESTONES,
  computeCareerMetrics,
  formatFlightDuration,
  formatMilestoneProgress,
  getBadgeById,
  getMilestoneMetricValue,
  getPilotRankInfo,
  getPrototypePartsCatalog,
} from '../data/career';
import { PilotBadgeEmblem } from './PilotBadgeEmblem';
import type {
  CareerBadgeId,
  CareerMedalTier,
  LeagueSeasonState,
  PilotProfile,
} from '../types/game';

interface PilotCareerModalProps {
  pilot: PilotProfile;
  medalsByTrack: Record<string, CareerMedalTier>;
  leagueSeason: LeagueSeasonState;
  unlockedPartIds: string[];
  onEquipBadge: (badgeId: CareerBadgeId) => void;
  onOpenBuildBench: () => void;
  onClose: () => void;
}

type CareerTab = 'milestones' | 'badges' | 'prototypes';
type MilestoneFilter = 'all' | 'active' | 'completed';

export const PilotCareerModal: React.FC<PilotCareerModalProps> = ({
  pilot,
  medalsByTrack,
  leagueSeason,
  unlockedPartIds,
  onEquipBadge,
  onOpenBuildBench,
  onClose,
}) => {
  const [tab, setTab] = useState<CareerTab>('milestones');
  const [filter, setFilter] = useState<MilestoneFilter>('all');

  const metrics = useMemo(
    () => computeCareerMetrics(pilot, medalsByTrack, leagueSeason),
    [pilot, medalsByTrack, leagueSeason]
  );
  const rank = useMemo(() => getPilotRankInfo(pilot), [pilot]);
  const equippedBadge = getBadgeById(pilot.equippedBadgeId);

  const unlockedMilestoneSet = useMemo(
    () => new Set(pilot.unlockedMilestoneIds ?? []),
    [pilot.unlockedMilestoneIds]
  );
  const unlockedBadgeSet = useMemo(
    () => new Set<CareerBadgeId>(pilot.unlockedBadgeIds ?? []),
    [pilot.unlockedBadgeIds]
  );
  const unlockedPartSet = useMemo(
    () => new Set(unlockedPartIds),
    [unlockedPartIds]
  );

  const prototypeCatalog = useMemo(() => getPrototypePartsCatalog(), []);
  const unlockedProtoCount = prototypeCatalog.filter((p) =>
    unlockedPartSet.has(p.id)
  ).length;

  const filteredMilestones = useMemo(() => {
    return CAREER_MILESTONES.filter((m) => {
      const done = unlockedMilestoneSet.has(m.id);
      if (filter === 'active') return !done;
      if (filter === 'completed') return done;
      return true;
    });
  }, [filter, unlockedMilestoneSet]);

  return (
    <div
      data-gp-scope="true"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3 sm:p-6 overflow-y-auto safe-inset-container"
    >
      <div className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        {/* Top Career Header + Rank Progression + Lifetime Telemetry KPIs */}
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 shrink-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <PilotBadgeEmblem
                badgeId={pilot.equippedBadgeId}
                size="lg"
                locked={!pilot.equippedBadgeId}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-display font-bold text-white truncate">
                    {pilot.callsign} · Pilot Career
                  </h2>
                  <span className="text-xs font-semibold text-amber-400">
                    {rank.rankTitle}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-2 mt-0.5">
                  <span>
                    {equippedBadge
                      ? `Equipped Crest: ${equippedBadge.name}`
                      : 'No Crest Equipped'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-cyan-400">
                    {rank.completedCount}/{rank.totalCount} Milestones
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-zinc-300">
                    {unlockedBadgeSet.size}/{CAREER_BADGES.length} Badges
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:block w-44">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">
                    {rank.nextRankTitle ? `Next: ${rank.nextRankTitle}` : 'Max Rank'}
                  </span>
                  <span className="font-mono-tabular text-amber-400 font-semibold">
                    {rank.progressPct}%
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${rank.progressPct}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                aria-label="Close Pilot Career"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4 Lifetime Telemetry KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-2.5 sm:p-3 rounded-lg bg-zinc-950/90 border border-zinc-800">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Total Flight Time</span>
              </div>
              <div className="text-base sm:text-lg font-display font-bold font-mono-tabular text-white mt-0.5">
                {formatFlightDuration(metrics.totalFlightSeconds)}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-lg bg-zinc-950/90 border border-zinc-800">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Gates Passed</span>
              </div>
              <div className="text-base sm:text-lg font-display font-bold font-mono-tabular text-amber-400 mt-0.5">
                {metrics.totalCleanGates.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-lg bg-zinc-950/90 border border-zinc-800">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <Flag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Races &amp; Distance</span>
              </div>
              <div className="text-base sm:text-lg font-display font-bold font-mono-tabular text-white mt-0.5">
                {metrics.racesCompleted}{' '}
                <span className="text-xs font-normal text-zinc-400">
                  · {metrics.totalDistanceKm.toFixed(1)} km
                </span>
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-lg bg-zinc-950/90 border border-zinc-800">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <Gauge className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Peak Airspeed</span>
              </div>
              <div className="text-base sm:text-lg font-display font-bold font-mono-tabular text-cyan-400 mt-0.5">
                {metrics.peakSpeedKmh} km/h
              </div>
            </div>
          </div>

          {/* Primary Segmented View Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 overflow-x-auto">
              <button
                type="button"
                data-gp-tab="true"
                data-gp-tab-active={String(tab === 'milestones')}
                onClick={() => setTab('milestones')}
                className={`flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === 'milestones'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>
                  Lifetime Milestones ({rank.completedCount}/{rank.totalCount})
                </span>
              </button>

              <button
                type="button"
                data-gp-tab="true"
                data-gp-tab-active={String(tab === 'badges')}
                onClick={() => setTab('badges')}
                className={`flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === 'badges'
                    ? 'bg-cyan-500 text-zinc-950'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>
                  Badge Vault ({unlockedBadgeSet.size}/{CAREER_BADGES.length})
                </span>
              </button>

              <button
                type="button"
                data-gp-tab="true"
                data-gp-tab-active={String(tab === 'prototypes')}
                onClick={() => setTab('prototypes')}
                className={`flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === 'prototypes'
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>
                  Prototype R&amp;D ({unlockedProtoCount}/{prototypeCatalog.length})
                </span>
              </button>
            </div>

            {tab === 'milestones' && (
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'active', label: 'Active' },
                    { id: 'completed', label: 'Completed' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFilter(opt.id)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      filter === opt.id
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {tab === 'milestones' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 fold-split-h">
              {filteredMilestones.length === 0 ? (
                <div className="md:col-span-2 p-8 text-center rounded-lg bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400">
                  {filter === 'active'
                    ? 'All lifetime milestones completed — Stratum Legend achieved.'
                    : 'No milestones completed yet. Launch a sortie to log flight telemetry.'}
                </div>
              ) : (
                filteredMilestones.map((ms) => {
                  const unlocked = unlockedMilestoneSet.has(ms.id);
                  const currentVal = getMilestoneMetricValue(ms.metric, metrics);
                  const prog = formatMilestoneProgress(ms, currentVal);
                  const badge = getBadgeById(ms.badgeId);

                  return (
                    <div
                      key={ms.id}
                      className={`p-3.5 rounded-lg border flex flex-col justify-between gap-3 ${
                        unlocked
                          ? 'bg-zinc-900/80 border-emerald-500/45'
                          : 'bg-zinc-900/55 border-zinc-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {unlocked ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Target className="w-4 h-4 text-zinc-500 shrink-0" />
                              )}
                              <h3 className="text-sm font-display font-bold text-white truncate">
                                {ms.title}
                              </h3>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1 leading-snug">
                              {ms.description}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-mono-tabular font-semibold shrink-0 ${
                              unlocked ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            +{ms.rewardCredits} CR
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                            <span className="text-zinc-300">
                              {prog.currentText} / {prog.targetText}
                            </span>
                            <span
                              className={
                                unlocked
                                  ? 'text-emerald-400 font-semibold'
                                  : 'text-zinc-400'
                              }
                            >
                              {unlocked ? 'Completed' : `${prog.pct}%`}
                            </span>
                          </div>
                          <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                            <div
                              className={`h-full transition-all ${
                                unlocked ? 'bg-emerald-400' : 'bg-amber-400'
                              }`}
                              style={{ width: `${unlocked ? 100 : prog.pct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Rewards Summary Row (No Nested Cards) */}
                      {(badge || ms.prototypePartName) && (
                        <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          {badge && (
                            <div className="flex items-center gap-1.5 text-zinc-200 min-w-0">
                              <PilotBadgeEmblem
                                badgeId={badge.id}
                                size="xs"
                                locked={!unlocked}
                              />
                              <span className="truncate">
                                Crest: <strong>{badge.name}</strong>
                              </span>
                            </div>
                          )}
                          {ms.prototypePartName && (
                            <div className="flex items-center gap-1 text-cyan-400 min-w-0">
                              <Cpu className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate font-medium">
                                Prototype: {ms.prototypePartName}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'badges' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CAREER_BADGES.map((badge) => {
                const unlocked = unlockedBadgeSet.has(badge.id);
                const equipped = pilot.equippedBadgeId === badge.id;

                return (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-lg border flex flex-col justify-between gap-3 ${
                      equipped
                        ? 'bg-zinc-900 border-amber-500'
                        : unlocked
                          ? 'bg-zinc-900/70 border-zinc-700'
                          : 'bg-zinc-900/40 border-zinc-800/80'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <PilotBadgeEmblem
                          badgeId={badge.id}
                          size="lg"
                          locked={!unlocked}
                        />
                        <span
                          className={`text-[11px] font-semibold ${
                            equipped
                              ? 'text-amber-400'
                              : unlocked
                                ? 'text-emerald-400'
                                : 'text-zinc-500'
                          }`}
                        >
                          {equipped ? 'Equipped' : unlocked ? 'Unlocked' : 'Locked'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-display font-bold text-white">
                          {badge.name}
                        </h3>
                        <div className="text-[11px] text-cyan-400 font-medium">
                          {badge.titleTag}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1.5 leading-snug">
                          {badge.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-zinc-800">
                      {unlocked ? (
                        <button
                          type="button"
                          onClick={() => onEquipBadge(badge.id)}
                          disabled={equipped}
                          className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 min-h-[44px] sm:min-h-0 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                            equipped
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default'
                              : 'bg-zinc-100 hover:bg-white text-zinc-950 cursor-pointer'
                          }`}
                        >
                          {equipped && <Check className="w-3.5 h-3.5" />}
                          <span>{equipped ? 'Equipped on Profile' : 'Equip Badge'}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 py-1">
                          <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>{badge.unlockHint}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'prototypes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                <span>
                  Milestone-exclusive R&amp;D parts cannot be purchased with credits — earn them via lifetime telemetry and fit them on the Build Bench.
                </span>
                <button
                  type="button"
                  onClick={onOpenBuildBench}
                  className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] sm:min-h-0 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-xs cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  <span>Open Build Bench</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {prototypeCatalog.map((part) => {
                  const unlocked = unlockedPartSet.has(part.id);
                  return (
                    <div
                      key={part.id}
                      className={`p-3.5 rounded-lg border flex flex-col justify-between gap-3 ${
                        unlocked
                          ? 'bg-zinc-900/80 border-cyan-500/50'
                          : 'bg-zinc-900/45 border-zinc-800'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-semibold text-zinc-400">
                            {part.categoryLabel}
                          </span>
                          {unlocked ? (
                            <span className="flex items-center gap-1 font-semibold text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Unlocked</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 font-semibold text-zinc-500">
                              <Lock className="w-3 h-3" />
                              <span>R&amp;D Locked</span>
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-display font-bold text-white">
                          {part.name}
                        </h3>
                        <div className="text-[11px] font-mono-tabular text-cyan-400">
                          {part.specLine}
                        </div>
                        <p className="text-xs text-zinc-400 leading-snug pt-0.5">
                          {part.detail}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-zinc-400 truncate">
                          Milestone: <strong className="text-zinc-200">{part.milestoneTitle}</strong>
                        </span>
                        {unlocked && (
                          <button
                            type="button"
                            onClick={onOpenBuildBench}
                            className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer whitespace-nowrap shrink-0"
                          >
                            Fit Part →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
