/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import { BUILTIN_TRACKS } from './tracks';
import type {
  LeagueDriverStanding,
  LeagueOutcomeSummary,
  LeagueRoundState,
  LeagueRoundStatus,
  LeagueSeasonState,
  LeagueSponsorOffer,
} from '../types/game';

export const POINTS_BY_POSITION = [25, 18, 15, 12, 10, 8, 6, 4];

export interface AiLeagueDriverDef {
  id: string;
  name: string;
  team: string;
  paceFactor: number; // multiplier against track par (lower = faster)
}

export const LEAGUE_AI_DRIVERS: AiLeagueDriverDef[] = [
  { id: 'ai-knox', name: 'V. Knox', team: 'Helios VIP Syndicate', paceFactor: 0.85 },
  { id: 'ai-sato', name: 'K. Sato', team: 'Redline Works', paceFactor: 0.90 },
  { id: 'ai-miller', name: 'R. Miller', team: 'Apex Carbon Racing', paceFactor: 0.95 },
  { id: 'ai-vega', name: 'M. Vega', team: 'Stratum Academy', paceFactor: 1.00 },
  { id: 'ai-novak', name: 'T. Novak', team: 'Vector VTX', paceFactor: 1.06 },
  { id: 'ai-chen', name: 'L. Chen', team: 'Kestrel Dynamics', paceFactor: 1.13 },
  { id: 'ai-brooks', name: 'D. Brooks', team: 'Privateer Entry', paceFactor: 1.21 },
];

export const LEAGUE_SPONSOR_OFFERS: LeagueSponsorOffer[] = [
  {
    id: 'sp-stratum-academy',
    teamName: 'Stratum Academy',
    tier: 'club',
    tagline: 'Entry works seat backing promising qualifier breakthroughs.',
    minRep: 90,
    minQualifiedRounds: 1,
    signingBonusCr: 1200,
    podiumMultiplier: 1.4,
    vipFinalBonusCr: 750,
    accentHex: '#38bdf8',
  },
  {
    id: 'sp-apex-carbon',
    teamName: 'Apex Carbon Racing',
    tier: 'pro-am',
    tagline: 'Carbon chassis syndicate rewarding podium consistency.',
    minRep: 240,
    minQualifiedRounds: 2,
    signingBonusCr: 2800,
    podiumMultiplier: 1.75,
    vipFinalBonusCr: 1500,
    accentHex: '#f59e0b',
  },
  {
    id: 'sp-redline-works',
    teamName: 'Redline Works Propulsion',
    tier: 'factory',
    tagline: 'Factory motor & battery program with elite podium purses.',
    minRep: 460,
    minQualifiedRounds: 3,
    signingBonusCr: 5500,
    podiumMultiplier: 2.25,
    vipFinalBonusCr: 2800,
    accentHex: '#ef4444',
  },
  {
    id: 'sp-helios-vip',
    teamName: 'Helios VIP Syndicate',
    tier: 'vip',
    tagline: 'High-roller flagship seat reserved for dominant championship aces.',
    minRep: 760,
    minQualifiedRounds: 4,
    signingBonusCr: 10000,
    podiumMultiplier: 3.0,
    vipFinalBonusCr: 5000,
    accentHex: '#a855f7',
  },
];

const SEASON_ROUND_TEMPLATES = [
  {
    roundNumber: 1,
    roundId: 'r1-alpine',
    title: 'Round 1 · Alpine Qualifier GP',
    subtitle: 'High-altitude opener · Fast timberline sweepers',
    trackId: 'alpine-ridge',
    baseQualifyPurseCr: 320,
    baseFinalPurseCr: 1200,
  },
  {
    roundNumber: 2,
    roundId: 'r2-urban',
    title: 'Round 2 · Apex Urban Sprint',
    subtitle: 'Tight technical pylons & vertical power dives',
    trackId: 'concrete-docks',
    baseQualifyPurseCr: 420,
    baseFinalPurseCr: 1550,
  },
  {
    roundNumber: 3,
    roundId: 'r3-desert',
    title: 'Round 3 · Redrock Endurance',
    subtitle: 'High-speed canyon straights & heat management',
    trackId: 'redrock-canyon',
    baseQualifyPurseCr: 540,
    baseFinalPurseCr: 2000,
  },
  {
    roundNumber: 4,
    roundId: 'r4-coastal',
    title: 'Round 4 · Coastal Harbor Finale',
    subtitle: 'Double-stakes Championship Grand Final over open bay',
    trackId: 'coastal-harbor',
    baseQualifyPurseCr: 720,
    baseFinalPurseCr: 3200,
  },
];

function buildRoundsForSeason(seasonNumber: number): LeagueRoundState[] {
  const paceTighten = Math.max(0.84, Math.pow(0.96, seasonNumber - 1));
  const purseScale = 1 + (seasonNumber - 1) * 0.25;

  return SEASON_ROUND_TEMPLATES.map((tpl, idx) => {
    const track =
      BUILTIN_TRACKS.find((t) => t.id === tpl.trackId) ?? BUILTIN_TRACKS[0];
    const singleLapParMs = (track.parTimeSec / track.lapCount) * 1000;
    const fullParMs = track.parTimeSec * 1000;

    // 1-lap qualifier cut-off is achievable (~118% of par in Season 1), tightening slightly each season
    const qualifyingCutOffMs = Math.round(singleLapParMs * 1.18 * paceTighten);
    const poleTimeMs = Math.round(singleLapParMs * 0.87 * paceTighten);

    // 7 deterministic AI final race finish times (sorted fastest -> slowest)
    const finalAiTimesMs = LEAGUE_AI_DRIVERS.map((drv, dIdx) => {
      const roundVar = 1 + (((idx * 7 + dIdx * 3) % 5) - 2) * 0.008;
      return Math.round(fullParMs * drv.paceFactor * paceTighten * roundVar);
    }).sort((a, b) => a - b);

    return {
      roundNumber: tpl.roundNumber,
      roundId: tpl.roundId,
      title: tpl.title,
      subtitle: tpl.subtitle,
      trackId: track.id,
      qualifyingCutOffMs,
      poleTimeMs,
      finalAiTimesMs,
      baseQualifyPurseCr: Math.round(tpl.baseQualifyPurseCr * purseScale),
      baseFinalPurseCr: Math.round(tpl.baseFinalPurseCr * purseScale),
      status: idx === 0 ? 'qualifying' : 'locked',
      bestQualifyingMs: null,
      gridSeed: null,
      bestFinalMs: null,
      finalPlacement: null,
    };
  });
}

export function createInitialLeagueSeasonState(
  seasonNumber = 1,
  carry?: Pick<
    LeagueSeasonState,
    'pilotRep' | 'activeSponsorId' | 'claimedSponsorIds' | 'championshipsWon'
  >
): LeagueSeasonState {
  const aiPointsByDriverId: Record<string, number> = {};
  const aiWinsByDriverId: Record<string, number> = {};
  const aiPodiumsByDriverId: Record<string, number> = {};
  for (const d of LEAGUE_AI_DRIVERS) {
    aiPointsByDriverId[d.id] = 0;
    aiWinsByDriverId[d.id] = 0;
    aiPodiumsByDriverId[d.id] = 0;
  }

  return {
    seasonNumber,
    pilotRep: carry?.pilotRep ?? 0,
    activeSponsorId: carry?.activeSponsorId ?? null,
    claimedSponsorIds: carry?.claimedSponsorIds ?? [],
    rounds: buildRoundsForSeason(seasonNumber),
    aiPointsByDriverId,
    aiWinsByDriverId,
    aiPodiumsByDriverId,
    seasonCompleted: false,
    championshipsWon: carry?.championshipsWon ?? 0,
  };
}

export function normalizeLeagueSeasonState(
  raw?: Partial<LeagueSeasonState>
): LeagueSeasonState {
  const base = createInitialLeagueSeasonState(raw?.seasonNumber ?? 1);
  if (!raw || !Array.isArray(raw.rounds) || raw.rounds.length !== 4) {
    return base;
  }
  return {
    ...base,
    ...raw,
    rounds: raw.rounds,
    claimedSponsorIds: Array.isArray(raw.claimedSponsorIds)
      ? raw.claimedSponsorIds
      : [],
    aiPointsByDriverId: {
      ...base.aiPointsByDriverId,
      ...(raw.aiPointsByDriverId ?? {}),
    },
    aiWinsByDriverId: {
      ...base.aiWinsByDriverId,
      ...(raw.aiWinsByDriverId ?? {}),
    },
    aiPodiumsByDriverId: {
      ...base.aiPodiumsByDriverId,
      ...(raw.aiPodiumsByDriverId ?? {}),
    },
  };
}

export function getQualifiedRoundCount(season: LeagueSeasonState): number {
  return season.rounds.filter(
    (r) => r.status === 'qualified' || r.status === 'completed'
  ).length;
}

export function getPilotRepTierLabel(rep: number): string {
  if (rep >= 760) return 'VIP High-Roller';
  if (rep >= 460) return 'Factory Works';
  if (rep >= 240) return 'Pro-Am Contender';
  if (rep >= 90) return 'Club Qualifier';
  return 'Rookie Privateer';
}

export function getActiveSponsorOffer(
  season: LeagueSeasonState
): LeagueSponsorOffer | null {
  if (!season.activeSponsorId) return null;
  return (
    LEAGUE_SPONSOR_OFFERS.find((o) => o.id === season.activeSponsorId) ?? null
  );
}

export function isSponsorOfferUnlocked(
  offer: LeagueSponsorOffer,
  season: LeagueSeasonState
): boolean {
  const qualifiedCount = getQualifiedRoundCount(season);
  return (
    season.pilotRep >= offer.minRep && qualifiedCount >= offer.minQualifiedRounds
  );
}

export function buildSeasonStandings(
  season: LeagueSeasonState,
  playerCallsign: string
): LeagueDriverStanding[] {
  const activeSponsor = getActiveSponsorOffer(season);
  let playerPts = 0;
  let playerWins = 0;
  let playerPodiums = 0;

  for (const r of season.rounds) {
    if (r.finalPlacement && r.finalPlacement >= 1 && r.finalPlacement <= 8) {
      playerPts += POINTS_BY_POSITION[r.finalPlacement - 1] ?? 0;
      if (r.finalPlacement === 1) playerWins++;
      if (r.finalPlacement <= 3) playerPodiums++;
    }
  }

  const rows: LeagueDriverStanding[] = [
    {
      id: 'player',
      name: playerCallsign,
      team: activeSponsor ? activeSponsor.teamName : 'Independent Entry',
      points: playerPts,
      wins: playerWins,
      podiums: playerPodiums,
      isPlayer: true,
    },
    ...LEAGUE_AI_DRIVERS.map((drv) => ({
      id: drv.id,
      name: drv.name,
      team: drv.team,
      points: season.aiPointsByDriverId[drv.id] ?? 0,
      wins: season.aiWinsByDriverId[drv.id] ?? 0,
      podiums: season.aiPodiumsByDriverId[drv.id] ?? 0,
    })),
  ];

  return rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.isPlayer ? -1 : 1;
  });
}

export function evaluateLeagueQualifierRun(
  prevSeason: LeagueSeasonState,
  roundNumber: number,
  runTimeMs: number,
  cleanGates: number
): {
  nextSeason: LeagueSeasonState;
  outcome: LeagueOutcomeSummary;
  payoutCredits: number;
} {
  const roundIdx = prevSeason.rounds.findIndex(
    (r) => r.roundNumber === roundNumber
  );
  if (roundIdx < 0) {
    return {
      nextSeason: prevSeason,
      outcome: {
        roundNumber,
        roundTitle: `Round ${roundNumber}`,
        stage: 'qualifier',
        qualified: false,
        repEarned: 15,
        sponsorTeamName: null,
        sponsorMultiplier: 1,
        sponsorBonusCredits: 0,
        newlyUnlockedSponsorNames: [],
      },
      payoutCredits: 80,
    };
  }

  const round = prevSeason.rounds[roundIdx];
  const qualified = runTimeMs <= round.qualifyingCutOffMs;
  const activeSponsor = getActiveSponsorOffer(prevSeason);
  const mult = activeSponsor ? activeSponsor.podiumMultiplier : 1;

  // Grid seed 1..8 interpolated between poleTimeMs and qualifyingCutOffMs
  let gridSeed: number | null = null;
  if (qualified) {
    const span = Math.max(1, round.qualifyingCutOffMs - round.poleTimeMs);
    const ratio = Math.max(0, Math.min(1, (runTimeMs - round.poleTimeMs) / span));
    gridSeed = Math.min(8, Math.max(1, 1 + Math.floor(ratio * 7.5)));
  }

  const repEarned = qualified
    ? (gridSeed === 1 ? 145 : 105) + Math.min(30, cleanGates * 2)
    : 35 + Math.min(20, cleanGates);

  const rawPurse = qualified
    ? round.baseQualifyPurseCr + (gridSeed === 1 ? 200 : 0)
    : Math.round(round.baseQualifyPurseCr * 0.28);
  const payoutCredits = Math.round(rawPurse * mult);
  const sponsorBonusCredits = Math.max(0, payoutCredits - rawPurse);

  const prevUnlocked = new Set(
    LEAGUE_SPONSOR_OFFERS.filter((o) =>
      isSponsorOfferUnlocked(o, prevSeason)
    ).map((o) => o.id)
  );

  const nextRounds = prevSeason.rounds.map((r, i) => {
    if (i !== roundIdx) return r;
    const bestQ =
      r.bestQualifyingMs === null
        ? runTimeMs
        : Math.min(r.bestQualifyingMs, runTimeMs);
    const nextSeed =
      r.gridSeed === null
        ? gridSeed
        : gridSeed === null
          ? r.gridSeed
          : Math.min(r.gridSeed, gridSeed);
    const nextStatus: LeagueRoundStatus =
      r.status === 'completed'
        ? 'completed'
        : qualified
          ? 'qualified'
          : 'qualifying';
    return {
      ...r,
      status: nextStatus,
      bestQualifyingMs: bestQ,
      gridSeed: nextSeed,
    };
  });

  const nextSeason: LeagueSeasonState = {
    ...prevSeason,
    pilotRep: prevSeason.pilotRep + repEarned,
    rounds: nextRounds,
  };

  const newlyUnlockedSponsorNames = LEAGUE_SPONSOR_OFFERS.filter(
    (o) => !prevUnlocked.has(o.id) && isSponsorOfferUnlocked(o, nextSeason)
  ).map((o) => o.teamName);

  return {
    nextSeason,
    outcome: {
      roundNumber,
      roundTitle: round.title,
      stage: 'qualifier',
      qualified,
      cutOffMs: round.qualifyingCutOffMs,
      gridSeed,
      repEarned,
      sponsorTeamName: activeSponsor ? activeSponsor.teamName : null,
      sponsorMultiplier: mult,
      sponsorBonusCredits,
      newlyUnlockedSponsorNames,
    },
    payoutCredits,
  };
}

export function evaluateLeagueFinalRun(
  prevSeason: LeagueSeasonState,
  roundNumber: number,
  runTimeMs: number,
  cleanGates: number,
  playerCallsign: string
): {
  nextSeason: LeagueSeasonState;
  outcome: LeagueOutcomeSummary;
  payoutCredits: number;
} {
  const roundIdx = prevSeason.rounds.findIndex(
    (r) => r.roundNumber === roundNumber
  );
  const round = prevSeason.rounds[roundIdx] ?? prevSeason.rounds[0];

  // Determine placement 1..8 against AI rival field
  let placement = 1;
  for (const aiMs of round.finalAiTimesMs) {
    if (runTimeMs > aiMs) placement++;
  }
  placement = Math.min(8, Math.max(1, placement));

  const pointsEarned = POINTS_BY_POSITION[placement - 1] ?? 4;
  const placementRatio =
    placement === 1
      ? 1.0
      : placement === 2
        ? 0.72
        : placement === 3
          ? 0.54
          : Math.max(0.2, 0.45 - (placement - 4) * 0.06);

  const activeSponsor = getActiveSponsorOffer(prevSeason);
  const mult = activeSponsor ? activeSponsor.podiumMultiplier : 1;
  const basePurse = Math.round(round.baseFinalPurseCr * placementRatio);
  const isPodium = placement <= 3;
  const vipBonus =
    activeSponsor && isPodium
      ? placement === 1
        ? activeSponsor.vipFinalBonusCr
        : Math.round(activeSponsor.vipFinalBonusCr * 0.5)
      : 0;

  const multipliedBase = isPodium
    ? Math.round(basePurse * mult)
    : basePurse;
  const payoutCredits = multipliedBase + vipBonus;
  const sponsorBonusCredits = Math.max(0, payoutCredits - basePurse);

  const repEarned =
    (placement === 1
      ? 185
      : placement === 2
        ? 140
        : placement === 3
          ? 110
          : 60) + Math.min(35, cleanGates);

  const prevUnlocked = new Set(
    LEAGUE_SPONSOR_OFFERS.filter((o) =>
      isSponsorOfferUnlocked(o, prevSeason)
    ).map((o) => o.id)
  );

  // Award AI points for this round ONLY the first time this round reaches 'completed'
  // (preventing AI points farm by re-running Round 1 infinitely)
  const firstTimeCompleted = round.status !== 'completed';
  const nextAiPts = { ...prevSeason.aiPointsByDriverId };
  const nextAiWins = { ...prevSeason.aiWinsByDriverId };
  const nextAiPodiums = { ...prevSeason.aiPodiumsByDriverId };

  if (firstTimeCompleted) {
    // Pair AI drivers in seeded order around player's placement
    const aiSorted = [...LEAGUE_AI_DRIVERS].map((drv, idx) => ({
      drv,
      ms: round.finalAiTimesMs[idx] ?? 999999,
    }));
    aiSorted.sort((a, b) => a.ms - b.ms);

    let slot = 1;
    for (const item of aiSorted) {
      if (slot === placement) slot++; // player occupies this slot
      const pts = POINTS_BY_POSITION[slot - 1] ?? 2;
      nextAiPts[item.drv.id] = (nextAiPts[item.drv.id] ?? 0) + pts;
      if (slot === 1) {
        nextAiWins[item.drv.id] = (nextAiWins[item.drv.id] ?? 0) + 1;
      }
      if (slot <= 3) {
        nextAiPodiums[item.drv.id] = (nextAiPodiums[item.drv.id] ?? 0) + 1;
      }
      slot++;
    }
  }

  const nextRounds = prevSeason.rounds.map((r, i) => {
    if (i === roundIdx) {
      const bestF =
        r.bestFinalMs === null ? runTimeMs : Math.min(r.bestFinalMs, runTimeMs);
      const bestPos =
        r.finalPlacement === null
          ? placement
          : Math.min(r.finalPlacement, placement);
      return {
        ...r,
        status: 'completed' as const,
        bestFinalMs: bestF,
        finalPlacement: bestPos,
      };
    }
    // Unlock next round qualifier once this final is completed!
    if (i === roundIdx + 1 && r.status === 'locked') {
      return {
        ...r,
        status: 'qualifying' as const,
      };
    }
    return r;
  });

  const allCompleted = nextRounds.every((r) => r.status === 'completed');
  const draftSeason: LeagueSeasonState = {
    ...prevSeason,
    pilotRep: prevSeason.pilotRep + repEarned,
    rounds: nextRounds,
    aiPointsByDriverId: nextAiPts,
    aiWinsByDriverId: nextAiWins,
    aiPodiumsByDriverId: nextAiPodiums,
    seasonCompleted: prevSeason.seasonCompleted || allCompleted,
  };

  const standings = buildSeasonStandings(draftSeason, playerCallsign);
  const seasonRank = Math.max(
    1,
    standings.findIndex((s) => s.isPlayer) + 1
  );

  const newlyWonSeason =
    allCompleted && !prevSeason.seasonCompleted && seasonRank === 1;
  const finalSeason: LeagueSeasonState = {
    ...draftSeason,
    championshipsWon:
      prevSeason.championshipsWon + (newlyWonSeason ? 1 : 0),
  };

  const newlyUnlockedSponsorNames = LEAGUE_SPONSOR_OFFERS.filter(
    (o) => !prevUnlocked.has(o.id) && isSponsorOfferUnlocked(o, finalSeason)
  ).map((o) => o.teamName);

  return {
    nextSeason: finalSeason,
    outcome: {
      roundNumber,
      roundTitle: round.title,
      stage: 'final',
      placement,
      pointsEarned,
      repEarned,
      sponsorTeamName: activeSponsor ? activeSponsor.teamName : null,
      sponsorMultiplier: mult,
      sponsorBonusCredits,
      newlyUnlockedSponsorNames,
      seasonCompleted: allCompleted,
      seasonRank,
    },
    payoutCredits: payoutCredits + (newlyWonSeason ? 3500 : 0),
  };
}
