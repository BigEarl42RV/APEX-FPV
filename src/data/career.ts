/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import type {
  CareerBadgeDef,
  CareerBadgeId,
  CareerMedalTier,
  CareerMilestoneDef,
  CareerMilestoneMetric,
  LeagueSeasonState,
  PilotProfile,
  UnlockedMilestoneSummary,
} from '../types/game';
import {
  BUILDER_BATTERIES,
  BUILDER_CAMERAS,
  BUILDER_FRAMES,
  BUILDER_MOTORS,
  BUILDER_PROPS,
  BUILDER_STACKS,
} from './droneBuilder';

export const CAREER_BADGES: CareerBadgeDef[] = [
  {
    id: 'cadet-wings',
    name: 'Cadet Wings',
    titleTag: 'First Sortie',
    description: 'Awarded upon completing your first official timed circuit.',
    accentHex: '#a1a1aa',
    unlockHint: 'Complete 1 race',
  },
  {
    id: 'gate-centurion',
    name: 'Gate Centurion',
    titleTag: '500 Gates',
    description: 'Precision slalom emblem for pilots clearing 500 lifetime race gates.',
    accentHex: '#06b6d4',
    unlockHint: 'Pass 500 gates cleanly',
  },
  {
    id: 'gate-master',
    name: 'Millennium Crest',
    titleTag: '1,000 Gates',
    description: 'Carbon-trimmed apex crest reserved for 1,000-gate veterans.',
    accentHex: '#f59e0b',
    unlockHint: 'Pass 1,000 gates cleanly',
  },
  {
    id: 'flight-hour',
    name: 'Skyline Wings',
    titleTag: '15 Min Stick',
    description: 'Dedicated stick-time insignia earned after 15 airborne minutes.',
    accentHex: '#38bdf8',
    unlockHint: 'Log 15 flight minutes',
  },
  {
    id: 'endurance-ace',
    name: 'Stratosphere Crest',
    titleTag: '3.0 Hours',
    description: 'Long-haul endurance badge forged across 3 full hours of flight.',
    accentHex: '#10b981',
    unlockHint: 'Log 3.0 flight hours',
  },
  {
    id: 'mach-pilot',
    name: 'Mach Vector',
    titleTag: '190+ km/h',
    description: 'Supersonic swept delta crest for breaking 190 km/h airspeed.',
    accentHex: '#ef4444',
    unlockHint: 'Hit 190 km/h peak speed',
  },
  {
    id: 'medal-collector',
    name: 'Apex Laurels',
    titleTag: 'Gold Standard',
    description: 'Factory gold laurel wreath earned across 4 Gold or Ace circuits.',
    accentHex: '#eab308',
    unlockHint: 'Earn 4 Gold or Ace medals',
  },
  {
    id: 'league-champion',
    name: 'Factory Crown',
    titleTag: 'League Champ',
    description: 'Highest Stratum Pro League honor for winning a full Season title.',
    accentHex: '#fbbf24',
    unlockHint: 'Win a Pro League Championship',
  },
];

export const CAREER_MILESTONES: CareerMilestoneDef[] = [
  {
    id: 'ms-first-flight',
    title: 'First Sortie',
    description: 'Complete your first official multi-lap timed circuit.',
    category: 'mastery',
    metric: 'racesCompleted',
    targetValue: 1,
    unitLabel: 'races',
    badgeId: 'cadet-wings',
    rewardCredits: 150,
  },
  {
    id: 'ms-gates-100',
    title: 'Century Gate Pilot',
    description: 'Thread 100 race gates cleanly across any circuits.',
    category: 'gates',
    metric: 'totalCleanGates',
    targetValue: 100,
    unitLabel: 'gates',
    rewardCredits: 250,
  },
  {
    id: 'ms-gates-500',
    title: 'Precision Wingman',
    description: 'Pass 500 lifetime gates to unlock prototype swept-Kevlar props.',
    category: 'gates',
    metric: 'totalCleanGates',
    targetValue: 500,
    unitLabel: 'gates',
    badgeId: 'gate-centurion',
    prototypePartId: 'bp-proto-5146-kevlar',
    prototypePartName: '5146 Kevlar-Swept Prototype',
    rewardCredits: 450,
  },
  {
    id: 'ms-gates-1000',
    title: 'Millennium Gate Runner',
    description: 'Clear 1,000 lifetime gates to earn the autoclave T1000 Monocoque prototype frame.',
    category: 'gates',
    metric: 'totalCleanGates',
    targetValue: 1000,
    unitLabel: 'gates',
    badgeId: 'gate-master',
    prototypePartId: 'bf-proto-monocoque',
    prototypePartName: 'Proto-X5 Carbon Monocoque',
    rewardCredits: 900,
  },
  {
    id: 'ms-hours-quarter',
    title: 'Airspace Regular',
    description: 'Accumulate 15 minutes (0.25 hrs) of live airborne flight telemetry.',
    category: 'flight_time',
    metric: 'totalFlightSeconds',
    targetValue: 900,
    unitLabel: 'min',
    badgeId: 'flight-hour',
    rewardCredits: 250,
  },
  {
    id: 'ms-hours-1',
    title: 'Airborne Centurion',
    description: 'Log 1.0 total flight hour in the air to unlock the 80A GaN prototype stack.',
    category: 'flight_time',
    metric: 'totalFlightSeconds',
    targetValue: 3600,
    unitLabel: 'hrs',
    prototypePartId: 'bs-proto-h7-80a',
    prototypePartName: 'H743 80A GaN Prototype (30x30)',
    rewardCredits: 600,
  },
  {
    id: 'ms-hours-3',
    title: 'Endurance Aviator',
    description: 'Log 3.0 total flight hours to unlock the Solid-Graphene 6S prototype battery.',
    category: 'flight_time',
    metric: 'totalFlightSeconds',
    targetValue: 10800,
    unitLabel: 'hrs',
    badgeId: 'endurance-ace',
    prototypePartId: 'bb-proto-6s-graphene',
    prototypePartName: '6S 1650mAh Solid-Graphene',
    rewardCredits: 1200,
  },
  {
    id: 'ms-speed-165',
    title: 'Slipstream Breaker',
    description: 'Reach 165 km/h terminal velocity during live flight.',
    category: 'speed',
    metric: 'peakSpeedKmh',
    targetValue: 165,
    unitLabel: 'km/h',
    rewardCredits: 300,
  },
  {
    id: 'ms-speed-190',
    title: 'Mach-190 Interceptor',
    description: 'Clock 190 km/h peak airspeed to unlock prototype 2408 N54 race motors.',
    category: 'speed',
    metric: 'peakSpeedKmh',
    targetValue: 190,
    unitLabel: 'km/h',
    badgeId: 'mach-pilot',
    prototypePartId: 'bm-proto-2408-n54',
    prototypePartName: '2408 2550KV N54 Prototype',
    rewardCredits: 700,
  },
  {
    id: 'ms-distance-25',
    title: 'Cross-Country Scout',
    description: 'Cover 25 km of cumulative airborne flight distance across circuits.',
    category: 'mastery',
    metric: 'totalDistanceKm',
    targetValue: 25,
    unitLabel: 'km',
    rewardCredits: 400,
  },
  {
    id: 'ms-medals-gold4',
    title: 'Podium Collector',
    description: 'Earn Gold or Ace Career Medals on 4 different circuits.',
    category: 'mastery',
    metric: 'goldOrAceMedals',
    targetValue: 4,
    unitLabel: 'medals',
    badgeId: 'medal-collector',
    rewardCredits: 650,
  },
  {
    id: 'ms-league-champ',
    title: 'Pro League Champion',
    description: 'Capture 1st Place Overall in a Stratum Pro League Season to unlock the Titanium Nano-O3 camera.',
    category: 'league',
    metric: 'leagueChampionships',
    targetValue: 1,
    unitLabel: 'titles',
    badgeId: 'league-champion',
    prototypePartId: 'bc-proto-ti-micro',
    prototypePartName: 'Titanium Nano-O3 Zero-Drag',
    rewardCredits: 1500,
  },
];

export interface PrototypePartCatalogEntry {
  id: string;
  categoryLabel: 'Frame' | 'Motors' | 'Propellers' | 'FC / ESC Stack' | 'Battery' | 'Camera & VTX';
  name: string;
  specLine: string;
  detail: string;
  milestoneId: string;
  milestoneTitle: string;
}

export function getPrototypePartsCatalog(): PrototypePartCatalogEntry[] {
  const entries: PrototypePartCatalogEntry[] = [];
  for (const f of BUILDER_FRAMES) {
    if (f.milestoneUnlockId) {
      entries.push({
        id: f.id,
        categoryLabel: 'Frame',
        name: f.name,
        specLine: `${f.sizeClass}" Class · ${f.massGrams}g · ${f.agility.toFixed(2)}x Agility`,
        detail: f.detail,
        milestoneId: f.milestoneUnlockId,
        milestoneTitle: f.milestoneUnlockTitle ?? 'Career Milestone',
      });
    }
  }
  for (const m of BUILDER_MOTORS) {
    if (m.milestoneUnlockId) {
      entries.push({
        id: m.id,
        categoryLabel: 'Motors',
        name: m.name,
        specLine: `${m.statorLabel} · ${m.baseThrustN}N Thrust · ${m.peakAmpsTotal}A Peak`,
        detail: m.detail,
        milestoneId: m.milestoneUnlockId,
        milestoneTitle: m.milestoneUnlockTitle ?? 'Career Milestone',
      });
    }
  }
  for (const p of BUILDER_PROPS) {
    if (p.milestoneUnlockId) {
      entries.push({
        id: p.id,
        categoryLabel: 'Propellers',
        name: p.name,
        specLine: `${p.sizeClass}" ${p.blades}-Blade · ${p.massGrams}g · +16% Thrust`,
        detail: p.detail,
        milestoneId: p.milestoneUnlockId,
        milestoneTitle: p.milestoneUnlockTitle ?? 'Career Milestone',
      });
    }
  }
  for (const s of BUILDER_STACKS) {
    if (s.milestoneUnlockId) {
      entries.push({
        id: s.id,
        categoryLabel: 'FC / ESC Stack',
        name: s.name,
        specLine: `${s.mountSize} · ${s.escAmpsTotal}A Total · +${Math.round(s.pidBoost * 100)}% PID`,
        detail: s.detail,
        milestoneId: s.milestoneUnlockId,
        milestoneTitle: s.milestoneUnlockTitle ?? 'Career Milestone',
      });
    }
  }
  for (const b of BUILDER_BATTERIES) {
    if (b.milestoneUnlockId) {
      entries.push({
        id: b.id,
        categoryLabel: 'Battery',
        name: b.name,
        specLine: `${b.cells}S · ${b.wh}Wh · ${b.maxDischargeAmps}A Burst · ${b.massGrams}g`,
        detail: b.detail,
        milestoneId: b.milestoneUnlockId,
        milestoneTitle: b.milestoneUnlockTitle ?? 'Career Milestone',
      });
    }
  }
  for (const c of BUILDER_CAMERAS) {
    if (c.milestoneUnlockId) {
      entries.push({
        id: c.id,
        categoryLabel: 'Camera & VTX',
        name: c.name,
        specLine: `${c.massGrams}g · Zero-Drag Profile · Digital HD`,
        detail: c.detail,
        milestoneId: c.milestoneUnlockId,
        milestoneTitle: c.milestoneUnlockTitle ?? 'Career Milestone',
      });
    }
  }
  return entries;
}

export function getBadgeById(badgeId?: CareerBadgeId | null): CareerBadgeDef | null {
  if (!badgeId) return null;
  return CAREER_BADGES.find((b) => b.id === badgeId) ?? null;
}

export interface ComputedCareerMetrics {
  racesCompleted: number;
  totalCleanGates: number;
  totalFlightSeconds: number;
  totalFlightHours: number;
  totalDistanceKm: number;
  peakSpeedKmh: number;
  goldOrAceMedals: number;
  leagueChampionships: number;
}

export function computeCareerMetrics(
  pilot: PilotProfile,
  medalsByTrack: Record<string, CareerMedalTier>,
  leagueSeason: LeagueSeasonState
): ComputedCareerMetrics {
  const totalFlightSeconds = Math.max(0, pilot.totalFlightSeconds ?? 0);
  const goldOrAceMedals = Object.values(medalsByTrack).filter(
    (m) => m === 'gold' || m === 'ace'
  ).length;

  return {
    racesCompleted: Math.max(0, pilot.racesCompleted ?? 0),
    totalCleanGates: Math.max(0, pilot.totalCleanGates ?? 0),
    totalFlightSeconds,
    totalFlightHours: Number((totalFlightSeconds / 3600).toFixed(2)),
    totalDistanceKm: Number((pilot.totalDistanceKm ?? 0).toFixed(1)),
    peakSpeedKmh: Math.round(pilot.peakSpeedKmh ?? 0),
    goldOrAceMedals,
    leagueChampionships: Math.max(0, leagueSeason.championshipsWon ?? 0),
  };
}

export function getMilestoneMetricValue(
  metric: CareerMilestoneMetric,
  m: ComputedCareerMetrics
): number {
  switch (metric) {
    case 'totalCleanGates':
      return m.totalCleanGates;
    case 'totalFlightSeconds':
      return m.totalFlightSeconds;
    case 'racesCompleted':
      return m.racesCompleted;
    case 'peakSpeedKmh':
      return m.peakSpeedKmh;
    case 'totalDistanceKm':
      return m.totalDistanceKm;
    case 'goldOrAceMedals':
      return m.goldOrAceMedals;
    case 'leagueChampionships':
      return m.leagueChampionships;
  }
}

export function formatMilestoneProgress(
  def: CareerMilestoneDef,
  currentVal: number
): { currentText: string; targetText: string; pct: number } {
  const clamped = Math.min(def.targetValue, currentVal);
  const pct = Math.min(100, Math.round((clamped / Math.max(1, def.targetValue)) * 100));

  if (def.metric === 'totalFlightSeconds') {
    if (def.targetValue < 3600) {
      return {
        currentText: `${(clamped / 60).toFixed(1)} min`,
        targetText: `${Math.round(def.targetValue / 60)} min`,
        pct,
      };
    }
    return {
      currentText: `${(clamped / 3600).toFixed(2)} hrs`,
      targetText: `${(def.targetValue / 3600).toFixed(1)} hrs`,
      pct,
    };
  }

  if (def.metric === 'totalDistanceKm') {
    return {
      currentText: `${clamped.toFixed(1)} km`,
      targetText: `${def.targetValue} km`,
      pct,
    };
  }

  return {
    currentText: `${Math.round(clamped).toLocaleString()}`,
    targetText: `${def.targetValue.toLocaleString()} ${def.unitLabel}`,
    pct,
  };
}

export function formatFlightDuration(totalSeconds: number): string {
  const hrs = totalSeconds / 3600;
  if (hrs >= 1) {
    return `${hrs.toFixed(2)} hrs`;
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (mins > 0) {
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

export interface PilotRankInfo {
  rankTitle: string;
  nextRankTitle: string | null;
  completedCount: number;
  totalCount: number;
  progressPct: number;
}

const RANK_LADDER: Array<{ minMilestones: number; title: string }> = [
  { minMilestones: 0, title: 'Cadet Pilot' },
  { minMilestones: 2, title: 'Club Racer' },
  { minMilestones: 4, title: 'Track Specialist' },
  { minMilestones: 6, title: 'Factory Test Pilot' },
  { minMilestones: 9, title: 'Pro League Ace' },
  { minMilestones: 12, title: 'Stratum Legend' },
];

export function getPilotRankInfo(pilot: PilotProfile): PilotRankInfo {
  const completedCount = (pilot.unlockedMilestoneIds ?? []).length;
  const totalCount = CAREER_MILESTONES.length;

  let currentIdx = 0;
  for (let i = 0; i < RANK_LADDER.length; i++) {
    if (completedCount >= RANK_LADDER[i].minMilestones) {
      currentIdx = i;
    }
  }
  const current = RANK_LADDER[currentIdx];
  const next = RANK_LADDER[currentIdx + 1] ?? null;

  const progressPct = next
    ? Math.min(
        100,
        Math.round(
          ((completedCount - current.minMilestones) /
            Math.max(1, next.minMilestones - current.minMilestones)) *
            100
        )
      )
    : 100;

  return {
    rankTitle: current.title,
    nextRankTitle: next ? next.title : null,
    completedCount,
    totalCount,
    progressPct,
  };
}

export function evaluateCareerProgression(
  pilot: PilotProfile,
  medalsByTrack: Record<string, CareerMedalTier>,
  leagueSeason: LeagueSeasonState
): {
  nextPilot: PilotProfile;
  newlyUnlockedMilestones: UnlockedMilestoneSummary[];
  newlyUnlockedPrototypePartIds: string[];
  totalRewardCredits: number;
} {
  const metrics = computeCareerMetrics(pilot, medalsByTrack, leagueSeason);
  const existingMilestones = new Set(pilot.unlockedMilestoneIds ?? []);
  const existingBadges = new Set<CareerBadgeId>(pilot.unlockedBadgeIds ?? []);

  const newlyUnlockedMilestones: UnlockedMilestoneSummary[] = [];
  const newlyUnlockedPrototypePartIds: string[] = [];
  let totalRewardCredits = 0;

  for (const def of CAREER_MILESTONES) {
    if (existingMilestones.has(def.id)) continue;
    const val = getMilestoneMetricValue(def.metric, metrics);
    if (val >= def.targetValue) {
      existingMilestones.add(def.id);
      totalRewardCredits += def.rewardCredits;

      let badgeName: string | undefined;
      if (def.badgeId) {
        existingBadges.add(def.badgeId);
        badgeName = getBadgeById(def.badgeId)?.name;
      }
      if (def.prototypePartId) {
        newlyUnlockedPrototypePartIds.push(def.prototypePartId);
      }

      newlyUnlockedMilestones.push({
        milestoneId: def.id,
        title: def.title,
        badgeId: def.badgeId,
        badgeName,
        prototypePartId: def.prototypePartId,
        prototypePartName: def.prototypePartName,
        rewardCredits: def.rewardCredits,
      });
    }
  }

  const unlockedBadgesArr = Array.from(existingBadges);
  let equippedBadgeId = pilot.equippedBadgeId ?? null;
  if (equippedBadgeId && !existingBadges.has(equippedBadgeId)) {
    equippedBadgeId = null;
  }
  if (!equippedBadgeId && unlockedBadgesArr.length > 0) {
    equippedBadgeId = unlockedBadgesArr[unlockedBadgesArr.length - 1];
  }

  const nextPilot: PilotProfile = {
    callsign: pilot.callsign || 'APEX-01',
    racesCompleted: metrics.racesCompleted,
    totalCleanGates: metrics.totalCleanGates,
    totalFlightSeconds: metrics.totalFlightSeconds,
    totalDistanceKm: metrics.totalDistanceKm,
    peakSpeedKmh: metrics.peakSpeedKmh,
    unlockedMilestoneIds: Array.from(existingMilestones),
    unlockedBadgeIds: unlockedBadgesArr,
    equippedBadgeId,
  };

  return {
    nextPilot,
    newlyUnlockedMilestones,
    newlyUnlockedPrototypePartIds,
    totalRewardCredits,
  };
}

export function normalizePilotProfile(
  raw: Partial<PilotProfile> | undefined,
  medalsByTrack: Record<string, CareerMedalTier>,
  leagueSeason: LeagueSeasonState
): {
  pilot: PilotProfile;
  unlockedPrototypePartIds: string[];
} {
  const base: PilotProfile = {
    callsign: raw?.callsign?.trim() || 'APEX-01',
    racesCompleted: Math.max(0, raw?.racesCompleted ?? 0),
    totalCleanGates: Math.max(0, raw?.totalCleanGates ?? 0),
    totalFlightSeconds: Math.max(
      0,
      raw?.totalFlightSeconds ?? (raw?.racesCompleted ?? 0) * 52
    ),
    totalDistanceKm: Math.max(
      0,
      raw?.totalDistanceKm ?? (raw?.racesCompleted ?? 0) * 1.15
    ),
    peakSpeedKmh: Math.max(0, raw?.peakSpeedKmh ?? 0),
    unlockedMilestoneIds: Array.isArray(raw?.unlockedMilestoneIds)
      ? raw.unlockedMilestoneIds
      : [],
    unlockedBadgeIds: Array.isArray(raw?.unlockedBadgeIds)
      ? raw.unlockedBadgeIds
      : [],
    equippedBadgeId: raw?.equippedBadgeId ?? null,
  };

  const evaluated = evaluateCareerProgression(base, medalsByTrack, leagueSeason);

  // Ensure any previously unlocked milestone's prototype parts are also returned
  const allEarnedPrototypeIds = new Set<string>(evaluated.newlyUnlockedPrototypePartIds);
  for (const mId of evaluated.nextPilot.unlockedMilestoneIds ?? []) {
    const def = CAREER_MILESTONES.find((m) => m.id === mId);
    if (def?.prototypePartId) {
      allEarnedPrototypeIds.add(def.prototypePartId);
    }
  }

  return {
    pilot: evaluated.nextPilot,
    unlockedPrototypePartIds: Array.from(allEarnedPrototypeIds),
  };
}
