/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import type {
  CareerBadgeId,
  DroneFrameId,
  GhostKeyframe,
  TrackDef,
} from './game';

export type MultiplayerModeId =
  | 'laser-tag'
  | 'drone-tag'
  | 'follow-leader'
  | 'team-race';

export type TeamMode = 'teams' | 'ffa';
export type TeamId = 'red' | 'blue' | 'solo';
export type RoomVisibility = 'public' | 'private';
export type BotSkill = 'rookie' | 'pro' | 'ace';
export type TagVariant = 'hot-potato' | 'hunter-hold';

export type RoomMatchStatus =
  | 'lobby'
  | 'countdown'
  | 'playing'
  | 'results';

export type FollowLeaderPhase =
  | 'leader-turn'
  | 'challenger-turn'
  | 'round-summary';

export interface RoomRulesConfig {
  teamMode: TeamMode;
  maxPlayers: number;
  scoreLimit: number;
  timeLimitSec: number;
  shieldHits: number;
  laserCooldownMs: number;
  friendlyFire: boolean;
  tagVariant: TagVariant;
  tagImmunitySec: number;
  leaderMarginPct: number;
  elimPerRound: number;
  lapCount: number;
  botCount: number;
  botSkill: BotSkill;
  autoReplaceBots: boolean;
}

export interface MultiplayerModePreset {
  id: string;
  mode: MultiplayerModeId;
  name: string;
  tagline: string;
  rules: RoomRulesConfig;
}

export interface RoomParticipant {
  id: string;
  callsign: string;
  isBot: boolean;
  botSkill?: BotSkill;
  isHost: boolean;
  team: TeamId;
  partyId: string | null;
  ready: boolean;
  frameId: DroneFrameId;
  ledColor: string;
  canopyColor: string;
  equippedBadgeId?: CareerBadgeId | null;
  // Live match stats
  score: number;
  hits: number;
  deaths: number;
  tagsCount: number;
  tagHoldSec: number;
  shieldHp: number;
  maxShieldHp: number;
  eliminated: boolean;
  respawnInvulnUntilMs: number;
  isIt: boolean;
  lap: number;
  gateIndex: number;
  finishedRace: boolean;
  finishTimeMs: number | null;
  lastTurnTimeMs: number | null;
  turnPassed: boolean | null;
}

export interface PartyMember {
  id: string;
  callsign: string;
  isLeader: boolean;
  equippedBadgeId?: CareerBadgeId | null;
}

export interface PartyState {
  partyId: string;
  partyCode: string;
  leaderId: string;
  lockSameTeam: boolean;
  preferredTeam: 'red' | 'blue';
  members: PartyMember[];
}

export interface PublicRoomSummary {
  roomId: string;
  roomCode: string;
  roomName: string;
  mode: MultiplayerModeId;
  teamMode: TeamMode;
  trackId: string;
  trackName: string;
  hostCallsign: string;
  humanCount: number;
  botCount: number;
  maxPlayers: number;
  status: RoomMatchStatus;
}

export interface FollowLeaderState {
  roundNumber: number;
  phase: FollowLeaderPhase;
  leaderId: string;
  leaderCallsign: string;
  leaderTeam: TeamId;
  leaderTargetMs: number | null;
  leaderCutoffMs: number | null;
  phaseEndsAtMs: number;
  survivorIds: string[];
  eliminatedThisRoundIds: string[];
  completedTurnIds: string[];
  ghostFrames: GhostKeyframe[];
}

export interface MatchFeedEvent {
  id: string;
  timestampMs: number;
  kind: 'hit' | 'elim' | 'tag' | 'leader' | 'race' | 'system';
  text: string;
  accent: 'red' | 'blue' | 'amber' | 'emerald' | 'cyan';
}

export interface ChatMessage {
  id: string;
  senderCallsign: string;
  team: TeamId;
  text: string;
  timestampMs: number;
}

export interface MultiplayerPose {
  playerId: string;
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  vx: number;
  vy: number;
  vz: number;
  shieldHp: number;
  maxShieldHp: number;
  isIt: boolean;
  eliminated: boolean;
  respawnInvuln: boolean;
  team: TeamId;
  callsign: string;
  isBot: boolean;
  ts: number;
}

export interface LaserBeamVisual {
  id: string;
  shooterId: string;
  team: TeamId;
  start: [number, number, number];
  end: [number, number, number];
  hitPlayerId: string | null;
  createdAtPerfMs: number;
}

export interface RoomStateSnapshot {
  roomId: string;
  roomCode: string;
  roomName: string;
  visibility: RoomVisibility;
  mode: MultiplayerModeId;
  trackId: string;
  trackSnapshot: TrackDef;
  rules: RoomRulesConfig;
  status: RoomMatchStatus;
  hostId: string;
  countdownRemainingSec: number;
  matchElapsedSec: number;
  matchTimeRemainingSec: number;
  teamScores: {
    red: number;
    blue: number;
  };
  itPlayerId: string | null;
  itPulseCountdownSec: number | null;
  tagImmunityRemainingSec: number;
  followLeader: FollowLeaderState | null;
  participants: RoomParticipant[];
  feed: MatchFeedEvent[];
  chat: ChatMessage[];
  winnerTeam: TeamId | 'draw' | null;
  winnerPlayerId: string | null;
  winnerReason: string | null;
}

export interface MultiplayerIdentity {
  callsign: string;
  frameId: DroneFrameId;
  ledColor: string;
  canopyColor: string;
  equippedBadgeId?: CareerBadgeId | null;
}

export type ClientWsMessage =
  | { type: 'hello'; identity: MultiplayerIdentity }
  | { type: 'update_identity'; identity: MultiplayerIdentity }
  | { type: 'list_rooms' }
  | { type: 'party_create' }
  | { type: 'party_join'; partyCode: string }
  | { type: 'party_leave' }
  | {
      type: 'party_update_settings';
      lockSameTeam?: boolean;
      preferredTeam?: 'red' | 'blue';
    }
  | {
      type: 'create_room';
      roomName: string;
      mode: MultiplayerModeId;
      visibility: RoomVisibility;
      trackSnapshot: TrackDef;
      rules: Partial<RoomRulesConfig>;
    }
  | { type: 'join_room'; roomCodeOrId: string }
  | { type: 'leave_room' }
  | { type: 'switch_team'; team: TeamId }
  | { type: 'set_ready'; ready: boolean }
  | {
      type: 'update_room_rules';
      mode?: MultiplayerModeId;
      trackSnapshot?: TrackDef;
      rules?: Partial<RoomRulesConfig>;
      roomName?: string;
      visibility?: RoomVisibility;
    }
  | { type: 'kick_bot'; botId: string }
  | { type: 'start_match' }
  | { type: 'return_to_lobby' }
  | { type: 'fast_forward_bot_turn' }
  | { type: 'send_chat'; text: string }
  | {
      type: 'pose_update';
      x: number;
      y: number;
      z: number;
      qx: number;
      qy: number;
      qz: number;
      qw: number;
      vx: number;
      vy: number;
      vz: number;
      lap: number;
      gateIndex: number;
    }
  | {
      type: 'fire_laser';
      origin: [number, number, number];
      dir: [number, number, number];
    }
  | {
      type: 'race_progress';
      lap: number;
      gateIndex: number;
      cleanGates: number;
    }
  | {
      type: 'submit_run_result';
      totalTimeMs: number;
      cleanGates: number;
      ghostFrames: GhostKeyframe[];
    };

export type ServerWsMessage =
  | { type: 'welcome'; playerId: string; sessionToken: string; rooms: PublicRoomSummary[] }
  | { type: 'rooms_list'; rooms: PublicRoomSummary[] }
  | { type: 'party_state'; party: PartyState | null }
  | { type: 'room_state'; room: RoomStateSnapshot | null }
  | { type: 'pose_batch'; poses: MultiplayerPose[] }
  | {
      type: 'laser_fired';
      shooterId: string;
      team: TeamId;
      start: [number, number, number];
      end: [number, number, number];
      hitPlayerId: string | null;
      eliminated: boolean;
    }
  | {
      type: 'tag_transferred';
      fromPlayerId: string | null;
      toPlayerId: string;
      toCallsign: string;
    }
  | { type: 'error'; message: string };
