/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import type {
  BotSkill,
  MultiplayerModeId,
  MultiplayerModePreset,
  RoomRulesConfig,
} from '../types/multiplayer';

export const MODE_DESCRIPTIONS: Record<
  MultiplayerModeId,
  { title: string; shortLabel: string; summary: string; objective: string }
> = {
  'laser-tag': {
    title: 'Laser Tag Battle',
    shortLabel: 'Laser Tag',
    summary:
      'High-speed 3D aerial laser combat with shield bars, heat cooldowns, and instant arena respawns.',
    objective: 'Lock onto rival drones and fire pulse beams to score eliminations.',
  },
  'drone-tag': {
    title: 'Drone Tag',
    shortLabel: 'Drone Tag',
    summary:
      'High-voltage IT beacon chase: close proximity ramming or short-range tag pulses transfer the charge.',
    objective:
      'Outfly the IT carrier in Hot Potato or hold the beacon cleanly in Hunter Hold.',
  },
  'follow-leader': {
    title: 'Follow the Leader',
    shortLabel: 'Follow Leader',
    summary:
      'Turn-based set-and-beat runs on any circuit. Leader sets the ghost run; challengers must match or beat it.',
    objective:
      'Beat the Leader ghost within the elimination margin to survive each bracket round.',
  },
  'team-race': {
    title: 'Team Circuit Race',
    shortLabel: 'Team Race',
    summary:
      'Head-to-head Red vs Blue squad racing through full multi-lap checkpoints for team placement points.',
    objective: 'Cross every gate cleanly and stack top team finishes before rivals.',
  },
};

export const DEFAULT_RULES_BY_MODE: Record<MultiplayerModeId, RoomRulesConfig> = {
  'laser-tag': {
    teamMode: 'teams',
    maxPlayers: 8,
    scoreLimit: 15,
    timeLimitSec: 180,
    shieldHits: 3,
    laserCooldownMs: 550,
    friendlyFire: false,
    tagVariant: 'hot-potato',
    tagImmunitySec: 3,
    leaderMarginPct: 12,
    elimPerRound: 1,
    lapCount: 2,
    botCount: 3,
    botSkill: 'pro',
    autoReplaceBots: true,
  },
  'drone-tag': {
    teamMode: 'ffa',
    maxPlayers: 8,
    scoreLimit: 45,
    timeLimitSec: 180,
    shieldHits: 3,
    laserCooldownMs: 600,
    friendlyFire: false,
    tagVariant: 'hot-potato',
    tagImmunitySec: 3,
    leaderMarginPct: 12,
    elimPerRound: 1,
    lapCount: 2,
    botCount: 3,
    botSkill: 'pro',
    autoReplaceBots: true,
  },
  'follow-leader': {
    teamMode: 'teams',
    maxPlayers: 8,
    scoreLimit: 10,
    timeLimitSec: 240,
    shieldHits: 3,
    laserCooldownMs: 550,
    friendlyFire: false,
    tagVariant: 'hot-potato',
    tagImmunitySec: 3,
    leaderMarginPct: 14,
    elimPerRound: 1,
    lapCount: 1,
    botCount: 3,
    botSkill: 'pro',
    autoReplaceBots: true,
  },
  'team-race': {
    teamMode: 'teams',
    maxPlayers: 8,
    scoreLimit: 25,
    timeLimitSec: 210,
    shieldHits: 3,
    laserCooldownMs: 550,
    friendlyFire: false,
    tagVariant: 'hunter-hold',
    tagImmunitySec: 3,
    leaderMarginPct: 12,
    elimPerRound: 1,
    lapCount: 3,
    botCount: 3,
    botSkill: 'pro',
    autoReplaceBots: true,
  },
};

export const MODE_PRESETS: MultiplayerModePreset[] = [
  {
    id: 'laser-standard',
    mode: 'laser-tag',
    name: 'Squad Skirmish 3v3+',
    tagline: '3-hit shields · 15 elim cap · 3m arena clock',
    rules: { ...DEFAULT_RULES_BY_MODE['laser-tag'] },
  },
  {
    id: 'laser-instagib',
    mode: 'laser-tag',
    name: 'One-Shot Instagib',
    tagline: '1-hit elimination · rapid 350ms pulse · 20 elims',
    rules: {
      ...DEFAULT_RULES_BY_MODE['laser-tag'],
      shieldHits: 1,
      laserCooldownMs: 350,
      scoreLimit: 20,
      timeLimitSec: 150,
    },
  },
  {
    id: 'tag-hot-potato',
    mode: 'drone-tag',
    name: 'Hot Potato Overload',
    tagline: 'IT carrier discharges every 22s · last pilot wins',
    rules: { ...DEFAULT_RULES_BY_MODE['drone-tag'] },
  },
  {
    id: 'tag-hunter-hold',
    mode: 'drone-tag',
    name: 'Hunter Hold Squads',
    tagline: 'Red vs Blue · earn points while holding the beacon',
    rules: {
      ...DEFAULT_RULES_BY_MODE['drone-tag'],
      teamMode: 'teams',
      tagVariant: 'hunter-hold',
      scoreLimit: 40,
      timeLimitSec: 180,
    },
  },
  {
    id: 'ftl-pro-knockout',
    mode: 'follow-leader',
    name: 'Pro Line Knockout',
    tagline: '14% survival margin · 1-lap sprint turns',
    rules: { ...DEFAULT_RULES_BY_MODE['follow-leader'] },
  },
  {
    id: 'ftl-sudden-death',
    mode: 'follow-leader',
    name: 'Beat-the-Clock Duel',
    tagline: 'Tight 5% margin · 2 eliminated per round',
    rules: {
      ...DEFAULT_RULES_BY_MODE['follow-leader'],
      leaderMarginPct: 5,
      elimPerRound: 2,
      lapCount: 1,
    },
  },
  {
    id: 'race-squad-gp',
    mode: 'team-race',
    name: 'Red vs Blue GP (3 Laps)',
    tagline: 'Classic 3-lap squad points race',
    rules: { ...DEFAULT_RULES_BY_MODE['team-race'] },
  },
  {
    id: 'race-sprint',
    mode: 'team-race',
    name: '1-Lap Blitz',
    tagline: 'Single-lap all-out squad sprint',
    rules: {
      ...DEFAULT_RULES_BY_MODE['team-race'],
      lapCount: 1,
      timeLimitSec: 90,
    },
  },
];

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}

export function sanitizeRoomRules(
  mode: MultiplayerModeId,
  patch?: Partial<RoomRulesConfig> | null
): RoomRulesConfig {
  const base = DEFAULT_RULES_BY_MODE[mode] ?? DEFAULT_RULES_BY_MODE['laser-tag'];
  const raw = patch ?? {};
  const teamMode = raw.teamMode === 'ffa' ? 'ffa' : raw.teamMode === 'teams' ? 'teams' : base.teamMode;
  const botSkill: BotSkill =
    raw.botSkill === 'rookie' || raw.botSkill === 'pro' || raw.botSkill === 'ace'
      ? raw.botSkill
      : base.botSkill;
  const tagVariant =
    raw.tagVariant === 'hunter-hold'
      ? 'hunter-hold'
      : raw.tagVariant === 'hot-potato'
        ? 'hot-potato'
        : base.tagVariant;

  const maxPlayers = clampNum(raw.maxPlayers, 2, 8, base.maxPlayers);
  return {
    teamMode,
    maxPlayers,
    scoreLimit: clampNum(raw.scoreLimit, 3, 120, base.scoreLimit),
    timeLimitSec: clampNum(raw.timeLimitSec, 45, 420, base.timeLimitSec),
    shieldHits: clampNum(raw.shieldHits, 1, 5, base.shieldHits),
    laserCooldownMs: clampNum(raw.laserCooldownMs, 250, 1500, base.laserCooldownMs),
    friendlyFire: typeof raw.friendlyFire === 'boolean' ? raw.friendlyFire : base.friendlyFire,
    tagVariant,
    tagImmunitySec: clampNum(raw.tagImmunitySec, 1, 6, base.tagImmunitySec),
    leaderMarginPct: clampNum(raw.leaderMarginPct, 0, 30, base.leaderMarginPct),
    elimPerRound: clampNum(raw.elimPerRound, 1, 3, base.elimPerRound),
    lapCount: clampNum(raw.lapCount, 1, 5, base.lapCount),
    botCount: clampNum(raw.botCount, 0, maxPlayers - 1, base.botCount),
    botSkill,
    autoReplaceBots:
      typeof raw.autoReplaceBots === 'boolean' ? raw.autoReplaceBots : base.autoReplaceBots,
  };
}
