/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import crypto from 'crypto';
import type { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { BUILTIN_TRACKS, sampleTrackTerrainHeight } from '../data/tracks';
import {
  DEFAULT_RULES_BY_MODE,
  sanitizeRoomRules,
} from '../data/multiplayerPresets';
import type {
  DroneFrameId,
  GhostKeyframe,
  TrackDef,
} from '../types/game';
import type {
  BotSkill,
  ChatMessage,
  ClientWsMessage,
  FollowLeaderState,
  MatchFeedEvent,
  MultiplayerIdentity,
  MultiplayerModeId,
  MultiplayerPose,
  PartyState,
  PublicRoomSummary,
  RoomParticipant,
  RoomRulesConfig,
  RoomStateSnapshot,
  RoomVisibility,
  ServerWsMessage,
  TeamId,
} from '../types/multiplayer';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BOT_CALLSIGNS = [
  '[BOT] Apex-Valk',
  '[BOT] Red-Razor',
  '[BOT] Volt-Kestrel',
  '[BOT] Aero-Sable',
  '[BOT] Pulse-Rift',
  '[BOT] Ion-Zephyr',
  '[BOT] Nova-Talon',
];
const BOT_FRAME_IDS: DroneFrameId[] = [
  'apex-x5',
  'veloce-210',
  'kestrel-35',
  'helios-7',
];

function genCode(len = 6): string {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

function genId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

function sanitizeText(raw: unknown, maxLen: number, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
  return cleaned.length > 0 ? cleaned.slice(0, maxLen) : fallback;
}

function clampFinite(val: unknown, min: number, max: number, fallback = 0): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}

function sanitizeTrackSnapshot(raw: unknown): TrackDef {
  if (!raw || typeof raw !== 'object') return BUILTIN_TRACKS[0];
  const obj = raw as Partial<TrackDef>;
  const builtin = BUILTIN_TRACKS.find((t) => t.id === obj.id);
  if (builtin) return builtin;
  if (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.gates) &&
    obj.gates.length >= 3 &&
    obj.gates.length <= 40
  ) {
    return {
      ...BUILTIN_TRACKS[0],
      id: sanitizeText(obj.id, 48, 'custom-track'),
      name: sanitizeText(obj.name, 48, 'Custom Circuit'),
      locationLabel: sanitizeText(obj.locationLabel, 48, 'Custom Arena'),
      biome:
        obj.biome === 'coastal' ||
        obj.biome === 'desert' ||
        obj.biome === 'urban' ||
        obj.biome === 'alpine'
          ? obj.biome
          : 'alpine',
      source: obj.source === 'google-maps' ? 'google-maps' : 'builtin',
      centerLatLng: obj.centerLatLng,
      waypointsLatLng: Array.isArray(obj.waypointsLatLng)
        ? obj.waypointsLatLng.slice(0, 40)
        : undefined,
      elevationProfileM: Array.isArray(obj.elevationProfileM)
        ? obj.elevationProfileM.slice(0, 128)
        : undefined,
      minElevationM: typeof obj.minElevationM === 'number' ? obj.minElevationM : undefined,
      maxElevationM: typeof obj.maxElevationM === 'number' ? obj.maxElevationM : undefined,
      lapCount: clampFinite(obj.lapCount, 1, 5, 3),
      parTimeSec: clampFinite(obj.parTimeSec, 15, 300, 65),
      gates: obj.gates.slice(0, 40).map((g, idx) => ({
        id: idx + 1,
        position: [
          clampFinite(g?.position?.[0], -500, 500, 0),
          clampFinite(g?.position?.[1], 1, 200, 8),
          clampFinite(g?.position?.[2], -500, 500, 30 + idx * 20),
        ],
        headingRad: clampFinite(g?.headingRad, -Math.PI * 2, Math.PI * 2, 0),
        width: clampFinite(g?.width, 6, 20, 11),
        height: clampFinite(g?.height, 5, 20, 8.5),
        type:
          g?.type === 'ring' || g?.type === 'dive' || g?.type === 'split'
            ? g.type
            : 'arch',
      })),
      obstacles: Array.isArray(obj.obstacles) ? obj.obstacles.slice(0, 80) : [],
      terrainSeed: clampFinite(obj.terrainSeed, 1, 999999, 1042),
      terrainScale: clampFinite(obj.terrainScale, 0.002, 0.05, 0.013),
      terrainRelief: clampFinite(obj.terrainRelief, 0, 25, 5),
    };
  }
  return BUILTIN_TRACKS[0];
}

interface InternalBotSim {
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
  targetGateIdx: number;
  lap: number;
  cleanGates: number;
  lastFireMs: number;
  lastGhostMs: number;
  runStartMs: number;
  phaseOffset: number;
  orbitRadius: number;
}

interface InternalPose {
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
  ts: number;
}

interface InternalParticipant extends RoomParticipant {
  lastFireMs: number;
  tagImmunityUntilMs: number;
  pose: InternalPose;
  botSim?: InternalBotSim;
}

interface InternalRoom {
  roomId: string;
  roomCode: string;
  roomName: string;
  visibility: RoomVisibility;
  mode: MultiplayerModeId;
  trackSnapshot: TrackDef;
  rules: RoomRulesConfig;
  status: 'lobby' | 'countdown' | 'playing' | 'results';
  hostId: string;
  countdownEndsAtMs: number;
  matchStartedAtMs: number;
  matchEndsAtMs: number;
  firstRaceFinishAtMs: number | null;
  teamScores: { red: number; blue: number };
  itPlayerId: string | null;
  itPulseEndsAtMs: number;
  tagImmunityEndsAtMs: number;
  lastTagHoldTickMs: number;
  followLeader: FollowLeaderState | null;
  participants: Map<string, InternalParticipant>;
  feed: MatchFeedEvent[];
  chat: ChatMessage[];
  winnerTeam: TeamId | 'draw' | null;
  winnerPlayerId: string | null;
  winnerReason: string | null;
  lastBotIndex: number;
}

interface InternalParty {
  partyId: string;
  partyCode: string;
  leaderId: string;
  lockSameTeam: boolean;
  preferredTeam: 'red' | 'blue';
  memberIds: string[];
}

interface ClientSession {
  playerId: string;
  sessionToken: string;
  ws: WebSocket;
  identity: MultiplayerIdentity;
  partyId: string | null;
  roomId: string | null;
}

function yawPitchToQuat(yaw: number, pitch: number, roll = 0): [number, number, number, number] {
  // Matches Three.js YXZ order where forward -Z rotated by (yaw + PI) points along (sin, cos)
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);

  const qx = cy * sp * cr + sy * cp * sr;
  const qy = sy * cp * cr - cy * sp * sr;
  const qz = cy * cp * sr - sy * sp * cr;
  const qw = cy * cp * cr + sy * sp * sr;
  return [qx, qy, qz, qw];
}

function getGridSpawn(track: TrackDef, slotIndex: number): {
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
} {
  const firstGate = track.gates[0];
  const h = firstGate ? firstGate.headingRad : 0;
  const backX = firstGate ? firstGate.position[0] - Math.sin(h) * 16 : 0;
  const backZ = firstGate ? firstGate.position[2] - Math.cos(h) * 16 : 0;
  const rightX = Math.cos(h);
  const rightZ = -Math.sin(h);
  const fwdX = Math.sin(h);
  const fwdZ = Math.cos(h);

  const col = (slotIndex % 4) - 1.5;
  const row = Math.floor(slotIndex / 4);
  const x = backX + rightX * (col * 3.0) - fwdX * (row * 3.4);
  const z = backZ + rightZ * (col * 3.0) - fwdZ * (row * 3.4);
  const gy = sampleTrackTerrainHeight(x, z, track);
  const [qx, qy, qz, qw] = yawPitchToQuat(h + Math.PI, 0, 0);
  return { x, y: gy + 0.55, z, qx, qy, qz, qw };
}

function getArenaSpawn(track: TrackDef, slotIndex: number, totalSlots: number): {
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
} {
  const angle = (slotIndex / Math.max(1, totalSlots)) * Math.PI * 2;
  const radius = 58 + (slotIndex % 2) * 18;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const gy = sampleTrackTerrainHeight(x, z, track);
  const yawToCenter = Math.atan2(-x, -z) + Math.PI;
  const [qx, qy, qz, qw] = yawPitchToQuat(yawToCenter, 0, 0);
  return { x, y: gy + 7.5, z, qx, qy, qz, qw };
}

function raySphereDistance(
  origin: [number, number, number],
  dir: [number, number, number],
  target: [number, number, number],
  maxRange: number
): { hit: boolean; dist: number; perpDist: number } {
  const dx = target[0] - origin[0];
  const dy = target[1] - origin[1];
  const dz = target[2] - origin[2];
  const t = dx * dir[0] + dy * dir[1] + dz * dir[2];
  if (t <= 0.5 || t > maxRange) {
    return { hit: false, dist: t, perpDist: Infinity };
  }
  const px = origin[0] + dir[0] * t - target[0];
  const py = origin[1] + dir[1] * t - target[1];
  const pz = origin[2] + dir[2] * t - target[2];
  const perpDist = Math.hypot(px, py, pz);
  return { hit: perpDist <= 2.75, dist: t, perpDist };
}

export class MultiplayerServerManager {
  private wss: WebSocketServer;
  private clients = new Map<string, ClientSession>();
  private rooms = new Map<string, InternalRoom>();
  private parties = new Map<string, InternalParty>();
  private tickHandle: NodeJS.Timeout | null = null;
  private lastTickMs = Date.now();

  constructor(httpServer: HttpServer) {
    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws',
      maxPayload: 256 * 1024,
    });

    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    this.tickHandle = setInterval(() => this.tick(), 50);
  }

  public getPublicRooms(): PublicRoomSummary[] {
    const out: PublicRoomSummary[] = [];
    for (const room of this.rooms.values()) {
      if (room.visibility !== 'public') continue;
      const list = Array.from(room.participants.values());
      const humanCount = list.filter((p) => !p.isBot).length;
      const botCount = list.filter((p) => p.isBot).length;
      if (humanCount === 0) continue;
      const host = room.participants.get(room.hostId);
      out.push({
        roomId: room.roomId,
        roomCode: room.roomCode,
        roomName: room.roomName,
        mode: room.mode,
        teamMode: room.rules.teamMode,
        trackId: room.trackSnapshot.id,
        trackName: room.trackSnapshot.name,
        hostCallsign: host?.callsign ?? 'Host',
        humanCount,
        botCount,
        maxPlayers: room.rules.maxPlayers,
        status: room.status,
      });
    }
    return out;
  }

  public dispose(): void {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
    this.wss.close();
  }

  private send(ws: WebSocket, msg: ServerWsMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  private sendError(client: ClientSession, message: string): void {
    this.send(client.ws, { type: 'error', message });
  }

  private broadcastDirectory(): void {
    const rooms = this.getPublicRooms();
    for (const c of this.clients.values()) {
      this.send(c.ws, { type: 'rooms_list', rooms });
    }
  }

  private buildPartySnapshot(party: InternalParty): PartyState {
    return {
      partyId: party.partyId,
      partyCode: party.partyCode,
      leaderId: party.leaderId,
      lockSameTeam: party.lockSameTeam,
      preferredTeam: party.preferredTeam,
      members: party.memberIds
        .map((id) => {
          const c = this.clients.get(id);
          if (!c) return null;
          return {
            id,
            callsign: c.identity.callsign,
            isLeader: id === party.leaderId,
            equippedBadgeId: c.identity.equippedBadgeId ?? null,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    };
  }

  private broadcastParty(partyId: string | null): void {
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party) return;
    const snap = this.buildPartySnapshot(party);
    for (const memberId of party.memberIds) {
      const c = this.clients.get(memberId);
      if (c) this.send(c.ws, { type: 'party_state', party: snap });
    }
  }

  private buildRoomSnapshot(room: InternalRoom): RoomStateSnapshot {
    const now = Date.now();
    const countdownRemainingSec =
      room.status === 'countdown'
        ? Math.max(0, Math.ceil((room.countdownEndsAtMs - now) / 1000))
        : 0;
    const matchElapsedSec =
      room.status === 'playing'
        ? Math.max(0, Math.floor((now - room.matchStartedAtMs) / 1000))
        : 0;
    const matchTimeRemainingSec =
      room.status === 'playing'
        ? Math.max(0, Math.ceil((room.matchEndsAtMs - now) / 1000))
        : room.rules.timeLimitSec;

    return {
      roomId: room.roomId,
      roomCode: room.roomCode,
      roomName: room.roomName,
      visibility: room.visibility,
      mode: room.mode,
      trackId: room.trackSnapshot.id,
      trackSnapshot: room.trackSnapshot,
      rules: room.rules,
      status: room.status,
      hostId: room.hostId,
      countdownRemainingSec,
      matchElapsedSec,
      matchTimeRemainingSec,
      teamScores: { ...room.teamScores },
      itPlayerId: room.itPlayerId,
      itPulseCountdownSec:
        room.mode === 'drone-tag' &&
        room.rules.tagVariant === 'hot-potato' &&
        room.status === 'playing'
          ? Math.max(0, Math.ceil((room.itPulseEndsAtMs - now) / 1000))
          : null,
      tagImmunityRemainingSec:
        room.mode === 'drone-tag' && room.status === 'playing'
          ? Math.max(0, Number(((room.tagImmunityEndsAtMs - now) / 1000).toFixed(1)))
          : 0,
      followLeader: room.followLeader ? { ...room.followLeader } : null,
      participants: Array.from(room.participants.values()).map((p) => {
        const { lastFireMs: _lfm, tagImmunityUntilMs: _ti, pose: _pose, botSim: _bs, ...rest } = p;
        return rest;
      }),
      feed: room.feed.slice(-12),
      chat: room.chat.slice(-24),
      winnerTeam: room.winnerTeam,
      winnerPlayerId: room.winnerPlayerId,
      winnerReason: room.winnerReason,
    };
  }

  private broadcastRoom(room: InternalRoom): void {
    const snap = this.buildRoomSnapshot(room);
    for (const p of room.participants.values()) {
      if (p.isBot) continue;
      const c = this.clients.get(p.id);
      if (c) this.send(c.ws, { type: 'room_state', room: snap });
    }
  }

  private broadcastRoomMessage(room: InternalRoom, msg: ServerWsMessage): void {
    for (const p of room.participants.values()) {
      if (p.isBot) continue;
      const c = this.clients.get(p.id);
      if (c) this.send(c.ws, msg);
    }
  }

  private pushFeed(
    room: InternalRoom,
    kind: MatchFeedEvent['kind'],
    text: string,
    accent: MatchFeedEvent['accent']
  ): void {
    room.feed.push({
      id: genId('ev'),
      timestampMs: Date.now(),
      kind,
      text,
      accent,
    });
    if (room.feed.length > 24) {
      room.feed = room.feed.slice(-24);
    }
  }

  private handleConnection(ws: WebSocket, _req: IncomingMessage): void {
    const playerId = genId('p');
    const sessionToken = crypto.randomBytes(16).toString('hex');
    const client: ClientSession = {
      playerId,
      sessionToken,
      ws,
      identity: {
        callsign: `PILOT-${playerId.slice(-4).toUpperCase()}`,
        frameId: 'apex-x5',
        ledColor: '#f59e0b',
        canopyColor: '#f59e0b',
        equippedBadgeId: null,
      },
      partyId: null,
      roomId: null,
    };
    this.clients.set(playerId, client);

    this.send(ws, {
      type: 'welcome',
      playerId,
      sessionToken,
      rooms: this.getPublicRooms(),
    });

    ws.on('message', (data) => {
      try {
        const str = typeof data === 'string' ? data : data.toString('utf8');
        if (str.length > 200000) return;
        const parsed = JSON.parse(str) as ClientWsMessage;
        if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') return;
        this.handleMessage(client, parsed);
      } catch {
        // Ignore malformed packets
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(client);
    });
  }

  private handleDisconnect(client: ClientSession): void {
    this.removeFromRoom(client);
    this.removeFromParty(client);
    this.clients.delete(client.playerId);
  }

  private handleMessage(client: ClientSession, msg: ClientWsMessage): void {
    switch (msg.type) {
      case 'hello':
      case 'update_identity': {
        this.updateIdentity(client, msg.identity);
        break;
      }
      case 'list_rooms': {
        this.send(client.ws, { type: 'rooms_list', rooms: this.getPublicRooms() });
        break;
      }
      case 'party_create': {
        this.createParty(client);
        break;
      }
      case 'party_join': {
        this.joinParty(client, msg.partyCode);
        break;
      }
      case 'party_leave': {
        this.removeFromParty(client);
        break;
      }
      case 'party_update_settings': {
        this.updatePartySettings(client, msg.lockSameTeam, msg.preferredTeam);
        break;
      }
      case 'create_room': {
        this.createRoom(client, msg);
        break;
      }
      case 'join_room': {
        this.joinRoom(client, msg.roomCodeOrId);
        break;
      }
      case 'leave_room': {
        this.removeFromRoom(client);
        break;
      }
      case 'switch_team': {
        this.switchTeam(client, msg.team);
        break;
      }
      case 'set_ready': {
        this.setReady(client, Boolean(msg.ready));
        break;
      }
      case 'update_room_rules': {
        this.updateRoomRules(client, msg);
        break;
      }
      case 'kick_bot': {
        this.kickBot(client, msg.botId);
        break;
      }
      case 'start_match': {
        this.startMatch(client);
        break;
      }
      case 'return_to_lobby': {
        this.returnToLobby(client);
        break;
      }
      case 'fast_forward_bot_turn': {
        this.fastForwardBotTurn(client);
        break;
      }
      case 'send_chat': {
        this.handleChat(client, msg.text);
        break;
      }
      case 'pose_update': {
        this.handlePoseUpdate(client, msg);
        break;
      }
      case 'fire_laser': {
        this.handleHumanFireLaser(client, msg.origin, msg.dir);
        break;
      }
      case 'race_progress': {
        this.handleRaceProgress(client, msg);
        break;
      }
      case 'submit_run_result': {
        this.handleSubmitRunResult(client, msg);
        break;
      }
    }
  }

  private updateIdentity(client: ClientSession, identity: MultiplayerIdentity): void {
    if (!identity || typeof identity !== 'object') return;
    const callsign = sanitizeText(identity.callsign, 18, client.identity.callsign).replace(
      /^\[BOT\]\s*/i,
      ''
    );
    client.identity = {
      callsign,
      frameId: BOT_FRAME_IDS.includes(identity.frameId)
        ? identity.frameId
        : client.identity.frameId,
      ledColor: sanitizeText(identity.ledColor, 16, '#f59e0b'),
      canopyColor: sanitizeText(identity.canopyColor, 16, '#f59e0b'),
      equippedBadgeId: identity.equippedBadgeId ?? null,
    };
    if (client.partyId) this.broadcastParty(client.partyId);
    if (client.roomId) {
      const room = this.rooms.get(client.roomId);
      const p = room?.participants.get(client.playerId);
      if (room && p) {
        p.callsign = client.identity.callsign;
        p.frameId = client.identity.frameId;
        p.ledColor = client.identity.ledColor;
        p.canopyColor = client.identity.canopyColor;
        p.equippedBadgeId = client.identity.equippedBadgeId;
        this.broadcastRoom(room);
      }
    }
  }

  private createParty(client: ClientSession): void {
    if (client.partyId) this.removeFromParty(client);
    const partyId = genId('pty');
    const party: InternalParty = {
      partyId,
      partyCode: genCode(6),
      leaderId: client.playerId,
      lockSameTeam: true,
      preferredTeam: 'red',
      memberIds: [client.playerId],
    };
    this.parties.set(partyId, party);
    client.partyId = partyId;
    this.broadcastParty(partyId);
  }

  private joinParty(client: ClientSession, rawCode: string): void {
    const code = sanitizeText(rawCode, 10, '').toUpperCase();
    const target = Array.from(this.parties.values()).find((p) => p.partyCode === code);
    if (!target) {
      this.sendError(client, `Party code "${code}" not found.`);
      return;
    }
    if (target.memberIds.length >= 4) {
      this.sendError(client, 'Squad party is full (max 4 pilots).');
      return;
    }
    if (client.partyId === target.partyId) return;
    if (client.partyId) this.removeFromParty(client);

    target.memberIds.push(client.playerId);
    client.partyId = target.partyId;
    this.broadcastParty(target.partyId);
  }

  private removeFromParty(client: ClientSession): void {
    const pid = client.partyId;
    if (!pid) return;
    client.partyId = null;
    const party = this.parties.get(pid);
    this.send(client.ws, { type: 'party_state', party: null });
    if (!party) return;

    party.memberIds = party.memberIds.filter((id) => id !== client.playerId);
    if (party.memberIds.length === 0) {
      this.parties.delete(pid);
      return;
    }
    if (party.leaderId === client.playerId) {
      party.leaderId = party.memberIds[0];
    }
    this.broadcastParty(pid);
  }

  private updatePartySettings(
    client: ClientSession,
    lockSameTeam?: boolean,
    preferredTeam?: 'red' | 'blue'
  ): void {
    if (!client.partyId) return;
    const party = this.parties.get(client.partyId);
    if (!party || party.leaderId !== client.playerId) return;
    if (typeof lockSameTeam === 'boolean') party.lockSameTeam = lockSameTeam;
    if (preferredTeam === 'red' || preferredTeam === 'blue') {
      party.preferredTeam = preferredTeam;
    }
    this.broadcastParty(party.partyId);
  }

  private pickTeamForJoin(room: InternalRoom, party: InternalParty | null): TeamId {
    if (room.rules.teamMode === 'ffa') return 'solo';
    if (party && party.lockSameTeam) {
      return party.preferredTeam;
    }
    const list = Array.from(room.participants.values());
    const redCount = list.filter((p) => p.team === 'red').length;
    const blueCount = list.filter((p) => p.team === 'blue').length;
    return redCount <= blueCount ? 'red' : 'blue';
  }

  private createParticipant(
    client: ClientSession,
    isHost: boolean,
    team: TeamId
  ): InternalParticipant {
    return {
      id: client.playerId,
      callsign: client.identity.callsign,
      isBot: false,
      isHost,
      team,
      partyId: client.partyId,
      ready: isHost,
      frameId: client.identity.frameId,
      ledColor: client.identity.ledColor,
      canopyColor: client.identity.canopyColor,
      equippedBadgeId: client.identity.equippedBadgeId ?? null,
      score: 0,
      hits: 0,
      deaths: 0,
      tagsCount: 0,
      tagHoldSec: 0,
      shieldHp: 3,
      maxShieldHp: 3,
      eliminated: false,
      respawnInvulnUntilMs: 0,
      isIt: false,
      lap: 1,
      gateIndex: 0,
      finishedRace: false,
      finishTimeMs: null,
      lastTurnTimeMs: null,
      turnPassed: null,
      lastFireMs: 0,
      tagImmunityUntilMs: 0,
      pose: {
        x: 0,
        y: 1,
        z: 0,
        qx: 0,
        qy: 0,
        qz: 0,
        qw: 1,
        vx: 0,
        vy: 0,
        vz: 0,
        ts: Date.now(),
      },
    };
  }

  private syncBotsForRoom(room: InternalRoom): void {
    const humans = Array.from(room.participants.values()).filter((p) => !p.isBot);
    const existingBots = Array.from(room.participants.values()).filter((p) => p.isBot);
    const maxBotsAllowed = Math.max(0, room.rules.maxPlayers - humans.length);
    const desiredBots = Math.min(room.rules.botCount, maxBotsAllowed);

    // Trim excess bots
    if (existingBots.length > desiredBots) {
      const toRemove = existingBots.slice(desiredBots);
      for (const b of toRemove) {
        room.participants.delete(b.id);
      }
    }

    // Add missing bots
    let currentBots = Array.from(room.participants.values()).filter((p) => p.isBot).length;
    while (currentBots < desiredBots) {
      const botIdx = room.lastBotIndex++;
      const callsign = BOT_CALLSIGNS[botIdx % BOT_CALLSIGNS.length];
      const botId = genId('bot');
      let team: TeamId = 'solo';
      if (room.rules.teamMode === 'teams') {
        const all = Array.from(room.participants.values());
        const redCount = all.filter((p) => p.team === 'red').length;
        const blueCount = all.filter((p) => p.team === 'blue').length;
        team = redCount <= blueCount ? 'red' : 'blue';
      }
      const spawn = getGridSpawn(room.trackSnapshot, room.participants.size);
      const bot: InternalParticipant = {
        id: botId,
        callsign,
        isBot: true,
        botSkill: room.rules.botSkill,
        isHost: false,
        team,
        partyId: null,
        ready: true,
        frameId: BOT_FRAME_IDS[botIdx % BOT_FRAME_IDS.length],
        ledColor: team === 'red' ? '#ef4444' : team === 'blue' ? '#06b6d4' : '#f59e0b',
        canopyColor: team === 'red' ? '#ef4444' : team === 'blue' ? '#06b6d4' : '#f59e0b',
        equippedBadgeId: null,
        score: 0,
        hits: 0,
        deaths: 0,
        tagsCount: 0,
        tagHoldSec: 0,
        shieldHp: room.rules.shieldHits,
        maxShieldHp: room.rules.shieldHits,
        eliminated: false,
        respawnInvulnUntilMs: 0,
        isIt: false,
        lap: 1,
        gateIndex: 0,
        finishedRace: false,
        finishTimeMs: null,
        lastTurnTimeMs: null,
        turnPassed: null,
        lastFireMs: 0,
        tagImmunityUntilMs: 0,
        pose: {
          ...spawn,
          vx: 0,
          vy: 0,
          vz: 0,
          ts: Date.now(),
        },
        botSim: {
          ...spawn,
          vx: 0,
          vy: 0,
          vz: 0,
          targetGateIdx: 0,
          lap: 1,
          cleanGates: 0,
          lastFireMs: 0,
          lastGhostMs: 0,
          runStartMs: 0,
          phaseOffset: botIdx * 1.37,
          orbitRadius: 42 + (botIdx % 3) * 18,
        },
      };
      room.participants.set(botId, bot);
      currentBots++;
    }

    // Rebalance teams on remaining bots in lobby
    if (room.status === 'lobby') {
      for (const p of room.participants.values()) {
        if (room.rules.teamMode === 'ffa') {
          p.team = 'solo';
        } else if (p.team === 'solo') {
          const all = Array.from(room.participants.values());
          const redC = all.filter((x) => x.team === 'red').length;
          const blueC = all.filter((x) => x.team === 'blue').length;
          p.team = redC <= blueC ? 'red' : 'blue';
        }
        if (p.isBot) {
          p.botSkill = room.rules.botSkill;
          p.ledColor =
            p.team === 'red' ? '#ef4444' : p.team === 'blue' ? '#06b6d4' : '#f59e0b';
        }
      }
    }
  }

  private createRoom(
    client: ClientSession,
    msg: Extract<ClientWsMessage, { type: 'create_room' }>
  ): void {
    if (client.roomId) this.removeFromRoom(client);

    const mode: MultiplayerModeId =
      msg.mode === 'drone-tag' ||
      msg.mode === 'follow-leader' ||
      msg.mode === 'team-race'
        ? msg.mode
        : 'laser-tag';

    const rules = sanitizeRoomRules(mode, msg.rules);
    const trackSnapshot = sanitizeTrackSnapshot(msg.trackSnapshot);
    const roomId = genId('rm');
    const roomCode = genCode(6);

    const room: InternalRoom = {
      roomId,
      roomCode,
      roomName: sanitizeText(msg.roomName, 28, `${client.identity.callsign}'s Arena`),
      visibility: msg.visibility === 'private' ? 'private' : 'public',
      mode,
      trackSnapshot,
      rules,
      status: 'lobby',
      hostId: client.playerId,
      countdownEndsAtMs: 0,
      matchStartedAtMs: 0,
      matchEndsAtMs: 0,
      firstRaceFinishAtMs: null,
      teamScores: { red: 0, blue: 0 },
      itPlayerId: null,
      itPulseEndsAtMs: 0,
      tagImmunityEndsAtMs: 0,
      lastTagHoldTickMs: 0,
      followLeader: null,
      participants: new Map(),
      feed: [],
      chat: [],
      winnerTeam: null,
      winnerPlayerId: null,
      winnerReason: null,
      lastBotIndex: 0,
    };

    const party = client.partyId ? this.parties.get(client.partyId) ?? null : null;
    const hostTeam = this.pickTeamForJoin(room, party);
    room.participants.set(
      client.playerId,
      this.createParticipant(client, true, hostTeam)
    );
    client.roomId = roomId;

    // Pull party members automatically if client is Party Leader
    if (party && party.leaderId === client.playerId) {
      for (const mId of party.memberIds) {
        if (mId === client.playerId) continue;
        if (room.participants.size >= room.rules.maxPlayers) break;
        const member = this.clients.get(mId);
        if (!member || member.roomId) continue;
        const mTeam = this.pickTeamForJoin(room, party);
        room.participants.set(
          member.playerId,
          this.createParticipant(member, false, mTeam)
        );
        member.roomId = roomId;
      }
    }

    this.rooms.set(roomId, room);
    this.syncBotsForRoom(room);
    this.pushFeed(room, 'system', `${client.identity.callsign} opened room ${roomCode}`, 'amber');
    this.broadcastRoom(room);
    this.broadcastDirectory();
  }

  private joinRoom(client: ClientSession, rawCodeOrId: string): void {
    const key = sanitizeText(rawCodeOrId, 32, '').toUpperCase();
    const room = Array.from(this.rooms.values()).find(
      (r) => r.roomCode === key || r.roomId.toUpperCase() === key
    );
    if (!room) {
      this.sendError(client, `Match "${key}" was not found.`);
      return;
    }
    if (room.status !== 'lobby') {
      this.sendError(client, 'Match is already underway. Try joining in lobby.');
      return;
    }
    if (client.roomId === room.roomId) return;
    if (client.roomId) this.removeFromRoom(client);

    const party = client.partyId ? this.parties.get(client.partyId) ?? null : null;
    const incomingClients: ClientSession[] = [client];
    if (party && party.leaderId === client.playerId) {
      for (const mId of party.memberIds) {
        if (mId === client.playerId) continue;
        const member = this.clients.get(mId);
        if (member && !member.roomId) incomingClients.push(member);
      }
    }

    const humansInRoom = Array.from(room.participants.values()).filter((p) => !p.isBot).length;
    const botsInRoom = Array.from(room.participants.values()).filter((p) => p.isBot).length;
    const availableWithBotReplace = room.rules.autoReplaceBots
      ? room.rules.maxPlayers - humansInRoom
      : room.rules.maxPlayers - (humansInRoom + botsInRoom);

    if (availableWithBotReplace < 1) {
      this.sendError(client, 'Room is full.');
      return;
    }

    let joinedCount = 0;
    for (const c of incomingClients) {
      const curHumans = Array.from(room.participants.values()).filter((p) => !p.isBot).length;
      const curTotal = room.participants.size;
      if (curTotal >= room.rules.maxPlayers) {
        if (room.rules.autoReplaceBots && room.rules.botCount > 0) {
          room.rules.botCount = Math.max(0, room.rules.botCount - 1);
          this.syncBotsForRoom(room);
        } else {
          break;
        }
      } else if (room.rules.autoReplaceBots && room.rules.botCount > 0 && curHumans > 0) {
        room.rules.botCount = Math.max(0, room.rules.botCount - 1);
        this.syncBotsForRoom(room);
      }
      const team = this.pickTeamForJoin(room, party);
      room.participants.set(c.playerId, this.createParticipant(c, false, team));
      c.roomId = room.roomId;
      joinedCount++;
    }

    if (joinedCount === 0) {
      this.sendError(client, 'Not enough open slots in room.');
      return;
    }

    this.syncBotsForRoom(room);
    this.pushFeed(room, 'system', `${client.identity.callsign} joined the lobby`, 'cyan');
    this.broadcastRoom(room);
    this.broadcastDirectory();
  }

  private removeFromRoom(client: ClientSession): void {
    const rid = client.roomId;
    if (!rid) return;
    client.roomId = null;
    this.send(client.ws, { type: 'room_state', room: null });

    const room = this.rooms.get(rid);
    if (!room) return;
    room.participants.delete(client.playerId);

    const remainingHumans = Array.from(room.participants.values()).filter((p) => !p.isBot);
    if (remainingHumans.length === 0) {
      this.rooms.delete(rid);
      this.broadcastDirectory();
      return;
    }

    if (room.hostId === client.playerId) {
      room.hostId = remainingHumans[0].id;
      const newHost = room.participants.get(room.hostId);
      if (newHost) {
        newHost.isHost = true;
        newHost.ready = true;
      }
    }

    if (room.itPlayerId === client.playerId) {
      const alive = Array.from(room.participants.values()).filter((p) => !p.eliminated);
      room.itPlayerId = alive[0]?.id ?? null;
      if (room.itPlayerId) {
        const nextIt = room.participants.get(room.itPlayerId);
        if (nextIt) nextIt.isIt = true;
      }
    }

    if (room.status === 'lobby') {
      this.syncBotsForRoom(room);
    }

    this.pushFeed(room, 'system', `${client.identity.callsign} left the match`, 'amber');
    this.broadcastRoom(room);
    this.broadcastDirectory();
  }

  private switchTeam(client: ClientSession, team: TeamId): void {
    const room = client.roomId ? this.rooms.get(client.roomId) : null;
    if (!room || room.status !== 'lobby' || room.rules.teamMode !== 'teams') return;
    if (team !== 'red' && team !== 'blue') return;
    const p = room.participants.get(client.playerId);
    if (!p) return;

    const party = client.partyId ? this.parties.get(client.partyId) : null;
    if (party && party.lockSameTeam) {
      if (party.leaderId !== client.playerId) {
        this.sendError(client, 'Party team lock is active. Ask your Party Leader to switch teams.');
        return;
      }
      party.preferredTeam = team;
      for (const mId of party.memberIds) {
        const mp = room.participants.get(mId);
        if (mp) mp.team = team;
      }
      this.broadcastParty(party.partyId);
    } else {
      p.team = team;
    }

    this.broadcastRoom(room);
  }

  private setReady(client: ClientSession, ready: boolean): void {
    const room = client.roomId ? this.rooms.get(client.roomId) : null;
    if (!room || room.status !== 'lobby') return;
    const p = room.participants.get(client.playerId);
    if (!p) return;
    p.ready = ready;
    this.broadcastRoom(room);
  }

  private updateRoomRules(
    client: ClientSession,
    msg: Extract<ClientWsMessage, { type: 'update_room_rules' }>
  ): void {
    const room = client.roomId ? this.rooms.get(client.roomId) : null;
    if (!room || room.hostId !== client.playerId || room.status !== 'lobby') return;

    if (msg.mode && DEFAULT_RULES_BY_MODE[msg.mode]) {
      room.mode = msg.mode;
    }
    if (msg.roomName) {
      room.roomName = sanitizeText(msg.roomName, 28, room.roomName);
    }
    if (msg.visibility === 'public' || msg.visibility === 'private') {
      room.visibility = msg.visibility;
    }
    if (msg.trackSnapshot) {
      room.trackSnapshot = sanitizeTrackSnapshot(msg.trackSnapshot);
    }
    room.rules = sanitizeRoomRules(room.mode, {
      ...room.rules,
      ...(msg.rules ?? {}),
    });

    this.syncBotsForRoom(room);
    this.broadcastRoom(room);
    this.broadcastDirectory();
  }

  private kickBot(client: ClientSession, botId: string): void {
    const room = client.roomId ? this.rooms.get(client.roomId) : null;
    if (!room || room.hostId !== client.playerId || room.status !== 'lobby') return;
    const bot = room.participants.get(botId);
    if (!bot || !bot.isBot) return;
    room.participants.delete(botId);
    room.rules.botCount = Math.max(0, room.rules.botCount - 1);
    this.broadcastRoom(room);
    this.broadcastDirectory();
  }

  private handleChat(client: ClientSession, rawText: string): void {
    const room = client.roomId ? this.rooms.get(client.roomId) : null;
    if (!room) return;
    const p = room.participants.get(client.playerId);
    if (!p) return;
    const text = sanitizeText(rawText, 160, '');
    if (!text) return;

    room.chat.push({
      id: genId('ch'),
      senderCallsign: p.callsign,
      team: p.team,
      text,
      timestampMs: Date.now(),
    });
    if (room.chat.length > 30) room.chat = room.chat.slice(-30);
    this.broadcastRoom(room);
  }

  private startMatch(client: ClientSession): void {
    const room = client.roomId ? this.rooms.get(client.roomId) : null;
    if (!room || room.hostId !== client.playerId) return;
    if (room.status !== 'lobby' && room.status !== 'results') return;

    if (room.participants.size < 2) {
      this.sendError(client, 'Add at least 1 [BOT] rival or wait for another pilot to start.');
      return;
    }

    if (room.rules.teamMode === 'teams') {
      const list = Array.from(room.participants.values());
      const redCount = list.filter((p) => p.team === 'red').length;
      const blueCount = list.filter((p) => p.team === 'blue').length;
      if (redCount === 0 || blueCount === 0) {
        this.sendError(client, 'Both Red and Blue teams need at least 1 pilot (or switch to Free-For-All).');
        return;
      }
    }

    const now = Date.now();
    room.status = 'countdown';
    room.countdownEndsAtMs = now + 3000;
    room.matchStartedAtMs = now + 3000;
    room.matchEndsAtMs = now + 3000 + room.rules.timeLimitSec * 1000;
    room.firstRaceFinishAtMs = null;
    room.teamScores = { red: 0, blue: 0 };
    room.winnerTeam = null;
    room.winnerPlayerId = null;
    room.winnerReason = null;
    room.itPlayerId = null;
    room.followLeader = null;
    room.feed = [];

    const all = Array.from(room.participants.values());
    all.forEach((p, idx) => {
      p.score = 0;
      p.hits = 0;
      p.deaths = 0;
      p.tagsCount = 0;
      p.tagHoldSec = 0;
      p.shieldHp = room.rules.shieldHits;
      p.maxShieldHp = room.rules.shieldHits;
      p.eliminated = false;
      p.respawnInvulnUntilMs = 0;
      p.isIt = false;
      p.lap = 1;
      p.gateIndex = 0;
      p.finishedRace = false;
      p.finishTimeMs = null;
      p.lastTurnTimeMs = null;
      p.turnPassed = null;
      p.lastFireMs = 0;
      p.tagImmunityUntilMs = 0;

      const spawn =
        room.mode === 'laser-tag' || room.mode === 'drone-tag'
          ? getArenaSpawn(room.trackSnapshot, idx, all.length)
          : getGridSpawn(room.trackSnapshot, idx);

      p.pose = { ...spawn, vx: 0, vy: 0, vz: 0, ts: now };
      if (p.isBot) {
        p.botSim = {
          ...spawn,
          vx: 0,
          vy: 0,
          vz: 0,
          targetGateIdx: 0,
          lap: 1,
          cleanGates: 0,
          lastFireMs: 0,
          lastGhostMs: -100,
          runStartMs: now + 3000,
          phaseOffset: idx * 1.45,
          orbitRadius: 42 + (idx % 3) * 18,
        };
      }
    });

    if (room.mode === 'drone-tag') {
      const initialIt = all[Math.floor(Math.random() * all.length)];
      if (initialIt) {
        initialIt.isIt = true;
        room.itPlayerId = initialIt.id;
        this.pushFeed(room, 'tag', `${initialIt.callsign} starts with the IT Beacon!`, 'amber');
      }
    } else if (room.mode === 'follow-leader') {
      this.setupFollowLeaderRound(room, 1, all.map((p) => p.id), now + 3000);
    } else {
      this.pushFeed(
        room,
        'system',
        `${room.mode === 'laser-tag' ? 'Laser Tag' : 'Team Race'} launch sequence initiated`,
        'cyan'
      );
    }

    this.broadcastRoom(room);
    this.broadcastDirectory();
  }

  private setupFollowLeaderRound(
    room: InternalRoom,
    roundNumber: number,
    survivorIds: string[],
    startAtMs: number
  ): void {
    const survivors = survivorIds
      .map((id) => room.participants.get(id))
      .filter((p): p is InternalParticipant => Boolean(p));
    if (survivors.length === 0) return;

    // Pick leader rotating by roundNumber, preferring human first on round 1
    const ordered = [
      ...survivors.filter((p) => !p.isBot),
      ...survivors.filter((p) => p.isBot),
    ];
    const leader = ordered[(roundNumber - 1) % ordered.length];

    for (const p of room.participants.values()) {
      p.lastTurnTimeMs = null;
      p.turnPassed = null;
      p.lap = 1;
      p.gateIndex = 0;
      p.finishedRace = false;
      p.eliminated = !survivorIds.includes(p.id);
      if (p.isBot && p.botSim) {
        const spawn = getGridSpawn(room.trackSnapshot, 0);
        Object.assign(p.botSim, {
          ...spawn,
          vx: 0,
          vy: 0,
          vz: 0,
          targetGateIdx: 0,
          lap: 1,
          cleanGates: 0,
          lastGhostMs: -100,
          runStartMs: startAtMs,
        });
      }
    }

    const lapFactor = Math.max(1, room.rules.lapCount) / Math.max(1, room.trackSnapshot.lapCount);
    const maxLeaderMs = Math.max(35000, Math.round(room.trackSnapshot.parTimeSec * lapFactor * 1650));

    room.followLeader = {
      roundNumber,
      phase: 'leader-turn',
      leaderId: leader.id,
      leaderCallsign: leader.callsign,
      leaderTeam: leader.team,
      leaderTargetMs: null,
      leaderCutoffMs: null,
      phaseEndsAtMs: startAtMs + maxLeaderMs,
      survivorIds: [...survivorIds],
      eliminatedThisRoundIds: [],
      completedTurnIds: [],
      ghostFrames: [],
    };
    this.pushFeed(
      room,
      'leader',
      `Round ${roundNumber}: ${leader.callsign} is Leader — setting target line!`,
      'amber'
    );
  }

  private returnToLobby(client: ClientSession): void {
    const room = client.roomId ? this.rooms.get(client.roomId) : null;
    if (!room || room.hostId !== client.playerId) return;
    room.status = 'lobby';
    room.followLeader = null;
    room.itPlayerId = null;
    room.winnerTeam = null;
    room.winnerPlayerId = null;
    room.winnerReason = null;
    for (const p of room.participants.values()) {
      p.ready = p.isHost || p.isBot;
      p.eliminated = false;
      p.isIt = false;
      p.shieldHp = room.rules.shieldHits;
      p.maxShieldHp = room.rules.shieldHits;
    }
    this.syncBotsForRoom(room);
    this.broadcastRoom(room);
    this.broadcastDirectory();
  }

  private fastForwardBotTurn(client: ClientSession): void {
    const room = client.roomId ? this.rooms.get(client.roomId) : null;
    if (!room || room.hostId !== client.playerId || room.status !== 'playing') return;
    if (room.mode !== 'follow-leader' || !room.followLeader) return;

    const fl = room.followLeader;
    if (fl.phase === 'leader-turn') {
      const leader = room.participants.get(fl.leaderId);
      if (!leader || !leader.isBot) return;
      const { totalTimeMs, ghostFrames } = this.synthesizeBotTrackRun(
        room.trackSnapshot,
        room.rules.lapCount,
        leader.botSkill ?? room.rules.botSkill
      );
      this.completeLeaderTurn(room, leader, totalTimeMs, ghostFrames);
    } else if (fl.phase === 'challenger-turn') {
      // Complete any remaining unfinished bots immediately
      const pendingHumans = fl.survivorIds.filter((id) => {
        const p = room.participants.get(id);
        return p && !p.isBot && id !== fl.leaderId && !fl.completedTurnIds.includes(id);
      });
      if (pendingHumans.length > 0) return;

      for (const id of fl.survivorIds) {
        if (id === fl.leaderId || fl.completedTurnIds.includes(id)) continue;
        const bot = room.participants.get(id);
        if (!bot || !bot.isBot) continue;
        const { totalTimeMs } = this.synthesizeBotTrackRun(
          room.trackSnapshot,
          room.rules.lapCount,
          bot.botSkill ?? room.rules.botSkill
        );
        this.recordChallengerRun(room, bot, totalTimeMs);
      }
      this.finalizeFollowLeaderRound(room);
    }
  }

  private synthesizeBotTrackRun(
    track: TrackDef,
    lapCount: number,
    skill: BotSkill
  ): { totalTimeMs: number; ghostFrames: GhostKeyframe[] } {
    const gates = track.gates;
    const speedMs = skill === 'ace' ? 39 : skill === 'pro' ? 32 : 24;
    const jitter = 0.96 + Math.random() * 0.08;
    const effSpeed = speedMs * jitter;

    const frames: GhostKeyframe[] = [];
    const first = gates[0];
    let curX = first ? first.position[0] - Math.sin(first.headingRad) * 16 : 0;
    let curY = first ? first.position[1] : 5;
    let curZ = first ? first.position[2] - Math.cos(first.headingRad) * 16 : 0;
    let elapsedMs = 0;
    let lastSampleMs = -100;

    const waypoints: Array<[number, number, number]> = [];
    for (let l = 0; l < lapCount; l++) {
      for (const g of gates) {
        waypoints.push(g.position);
      }
    }

    for (const wp of waypoints) {
      const dx = wp[0] - curX;
      const dy = wp[1] - curY;
      const dz = wp[2] - curZ;
      const dist = Math.hypot(dx, dy, dz);
      const segMs = Math.max(120, (dist / effSpeed) * 1000);
      const yaw = Math.atan2(dx, dz) + Math.PI;
      const [qx, qy, qz, qw] = yawPitchToQuat(yaw, -0.22, 0);

      const steps = Math.max(1, Math.ceil(segMs / 66));
      for (let s = 1; s <= steps; s++) {
        const f = s / steps;
        const tMs = Math.round(elapsedMs + segMs * f);
        if (tMs - lastSampleMs >= 66 && frames.length < 1800) {
          lastSampleMs = tMs;
          frames.push([
            tMs,
            Number((curX + dx * f).toFixed(2)),
            Number((curY + dy * f).toFixed(2)),
            Number((curZ + dz * f).toFixed(2)),
            Number(qx.toFixed(4)),
            Number(qy.toFixed(4)),
            Number(qz.toFixed(4)),
            Number(qw.toFixed(4)),
          ]);
        }
      }
      curX = wp[0];
      curY = wp[1];
      curZ = wp[2];
      elapsedMs += segMs;
    }

    return { totalTimeMs: Math.round(elapsedMs), ghostFrames: frames };
  }

  private handlePoseUpdate(
    client: ClientSession,
    msg: Extract<ClientWsMessage, { type: 'pose_update' }>
  ): void {
    const room = client.roomId ? this.rooms.get(client.roomId) : null;
    if (!room) return;
    const p = room.participants.get(client.playerId);
    if (!p) return;

    p.pose = {
      x: clampFinite(msg.x, -600, 600, p.pose.x),
      y: clampFinite(msg.y, 0, 300, p.pose.y),
      z: clampFinite(msg.z, -600, 600, p.pose.z),
      qx: clampFinite(msg.qx, -1, 1, 0),
      qy: clampFinite(msg.qy, -1, 1, 0),
      qz: clampFinite(msg.qz, -1, 1, 0),
      qw: clampFinite(msg.qw, -1, 1, 1),
      vx: clampFinite(msg.vx, -150, 150, 0),
      vy: clampFinite(msg.vy, -150, 150, 0),
      vz: clampFinite(msg.vz, -150, 150, 0),
      ts: Date.now(),
    };
    p.lap = clampFinite(msg.lap, 1, 10, p.lap);
    p.gateIndex = clampFinite(msg.gateIndex, 0, 60, p.gateIndex);
  }

  private handleHumanFireLaser(
    client: ClientSession,
    originRaw: [number, number, number],
    dirRaw: [number, number, number]
  ): void {
    const room = client.roomId ? this.rooms.get(client.roomId) : null;
    if (!room || room.status !== 'playing') return;
    if (room.mode !== 'laser-tag' && room.mode !== 'drone-tag') return;
    const shooter = room.participants.get(client.playerId);
    if (!shooter || shooter.eliminated) return;

    const origin: [number, number, number] = [
      clampFinite(originRaw?.[0], -600, 600, shooter.pose.x),
      clampFinite(originRaw?.[1], 0, 300, shooter.pose.y),
      clampFinite(originRaw?.[2], -600, 600, shooter.pose.z),
    ];
    let dx = clampFinite(dirRaw?.[0], -1, 1, 0);
    let dy = clampFinite(dirRaw?.[1], -1, 1, 0);
    let dz = clampFinite(dirRaw?.[2], -1, 1, -1);
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len;
    dy /= len;
    dz /= len;

    this.processLaserShot(room, shooter, origin, [dx, dy, dz]);
  }

  private processLaserShot(
    room: InternalRoom,
    shooter: InternalParticipant,
    origin: [number, number, number],
    dir: [number, number, number]
  ): void {
    const now = Date.now();
    if (now - shooter.lastFireMs < room.rules.laserCooldownMs - 30) return;
    shooter.lastFireMs = now;

    // In drone-tag, only the IT carrier can fire a short-range 28m Tag Pulse!
    if (room.mode === 'drone-tag') {
      if (!shooter.isIt || now < room.tagImmunityEndsAtMs) return;
      const range = 28;
      let hitTarget: InternalParticipant | null = null;
      let bestT = range;

      for (const target of room.participants.values()) {
        if (target.id === shooter.id || target.eliminated) continue;
        if (room.rules.teamMode === 'teams' && target.team === shooter.team) continue;
        const res = raySphereDistance(
          origin,
          dir,
          [target.pose.x, target.pose.y, target.pose.z],
          range
        );
        if (res.hit && res.dist < bestT) {
          bestT = res.dist;
          hitTarget = target;
        }
      }

      const end: [number, number, number] = [
        origin[0] + dir[0] * bestT,
        origin[1] + dir[1] * bestT,
        origin[2] + dir[2] * bestT,
      ];
      this.broadcastRoomMessage(room, {
        type: 'laser_fired',
        shooterId: shooter.id,
        team: shooter.team,
        start: origin,
        end,
        hitPlayerId: hitTarget?.id ?? null,
        eliminated: false,
      });

      if (hitTarget) {
        this.transferItBeacon(room, shooter, hitTarget);
      }
      return;
    }

    // Laser Tag Battle
    const maxRange = 95;
    let bestTarget: InternalParticipant | null = null;
    let bestT = maxRange;

    for (const target of room.participants.values()) {
      if (target.id === shooter.id || target.eliminated) continue;
      if (now < target.respawnInvulnUntilMs) continue;
      if (
        room.rules.teamMode === 'teams' &&
        !room.rules.friendlyFire &&
        target.team === shooter.team
      ) {
        continue;
      }
      const res = raySphereDistance(
        origin,
        dir,
        [target.pose.x, target.pose.y, target.pose.z],
        maxRange
      );
      if (res.hit && res.dist < bestT) {
        bestT = res.dist;
        bestTarget = target;
      }
    }

    const end: [number, number, number] = [
      origin[0] + dir[0] * bestT,
      origin[1] + dir[1] * bestT,
      origin[2] + dir[2] * bestT,
    ];

    let eliminatedTarget = false;
    if (bestTarget) {
      bestTarget.shieldHp = Math.max(0, bestTarget.shieldHp - 1);
      shooter.hits += 1;

      if (bestTarget.shieldHp <= 0) {
        eliminatedTarget = true;
        bestTarget.deaths += 1;
        bestTarget.shieldHp = room.rules.shieldHits;
        bestTarget.respawnInvulnUntilMs = now + 2600;

        const isFriendly =
          room.rules.teamMode === 'teams' && bestTarget.team === shooter.team;
        if (!isFriendly) {
          shooter.score += 1;
          if (room.rules.teamMode === 'teams') {
            if (shooter.team === 'red') room.teamScores.red += 1;
            else if (shooter.team === 'blue') room.teamScores.blue += 1;
          }
        }

        if (bestTarget.isBot && bestTarget.botSim) {
          const all = Array.from(room.participants.values());
          const sp = getArenaSpawn(
            room.trackSnapshot,
            Math.floor(Math.random() * all.length),
            all.length
          );
          Object.assign(bestTarget.botSim, { ...sp, vx: 0, vy: 0, vz: 0 });
          bestTarget.pose = { ...sp, vx: 0, vy: 0, vz: 0, ts: now };
        }

        this.pushFeed(
          room,
          'elim',
          `${shooter.callsign} zapped ${bestTarget.callsign}!`,
          shooter.team === 'red' ? 'red' : shooter.team === 'blue' ? 'blue' : 'amber'
        );
      } else {
        this.pushFeed(
          room,
          'hit',
          `${shooter.callsign} cracked ${bestTarget.callsign}'s shield (${bestTarget.shieldHp}/${bestTarget.maxShieldHp})`,
          'cyan'
        );
      }
    }

    this.broadcastRoomMessage(room, {
      type: 'laser_fired',
      shooterId: shooter.id,
      team: shooter.team,
      start: origin,
      end,
      hitPlayerId: bestTarget?.id ?? null,
      eliminated: eliminatedTarget,
    });

    if (bestTarget) {
      this.checkLaserTagWin(room);
      this.broadcastRoom(room);
    }
  }

  private checkLaserTagWin(room: InternalRoom): void {
    if (room.status !== 'playing') return;
    if (room.rules.teamMode === 'teams') {
      if (room.teamScores.red >= room.rules.scoreLimit) {
        this.finishMatch(room, 'red', null, `Red Team reached ${room.rules.scoreLimit} eliminations`);
      } else if (room.teamScores.blue >= room.rules.scoreLimit) {
        this.finishMatch(room, 'blue', null, `Blue Team reached ${room.rules.scoreLimit} eliminations`);
      }
    } else {
      for (const p of room.participants.values()) {
        if (p.score >= room.rules.scoreLimit) {
          this.finishMatch(room, p.team, p.id, `${p.callsign} hit ${room.rules.scoreLimit} eliminations`);
          break;
        }
      }
    }
  }

  private transferItBeacon(
    room: InternalRoom,
    from: InternalParticipant | null,
    to: InternalParticipant
  ): void {
    const now = Date.now();
    if (from) {
      from.isIt = false;
      from.tagsCount += 1;
      if (room.rules.tagVariant === 'hot-potato') {
        from.score += 1;
      }
    }
    for (const p of room.participants.values()) {
      if (p.id !== to.id) p.isIt = false;
    }
    to.isIt = true;
    room.itPlayerId = to.id;
    room.tagImmunityEndsAtMs = now + room.rules.tagImmunitySec * 1000;

    this.pushFeed(
      room,
      'tag',
      from
        ? `${from.callsign} tagged ${to.callsign}!`
        : `${to.callsign} is now IT!`,
      'amber'
    );
    this.broadcastRoomMessage(room, {
      type: 'tag_transferred',
      fromPlayerId: from?.id ?? null,
      toPlayerId: to.id,
      toCallsign: to.callsign,
    });
    this.broadcastRoom(room);
  }

  private handleRaceProgress(
    client: ClientSession,
    msg: Extract<ClientWsMessage, { type: 'race_progress' }>
  ): void {
    const room = client.roomId ? this.rooms.get(client.roomId) : null;
    if (!room || room.status !== 'playing') return;
    const p = room.participants.get(client.playerId);
    if (!p) return;
    p.lap = clampFinite(msg.lap, 1, 10, p.lap);
    p.gateIndex = clampFinite(msg.gateIndex, 0, 60, p.gateIndex);
  }

  private handleSubmitRunResult(
    client: ClientSession,
    msg: Extract<ClientWsMessage, { type: 'submit_run_result' }>
  ): void {
    const room = client.roomId ? this.rooms.get(client.roomId) : null;
    if (!room || room.status !== 'playing') return;
    const p = room.participants.get(client.playerId);
    if (!p) return;

    const totalTimeMs = clampFinite(msg.totalTimeMs, 1500, 600000, 30000);
    const frames: GhostKeyframe[] = Array.isArray(msg.ghostFrames)
      ? msg.ghostFrames
          .slice(0, 1800)
          .filter((f): f is GhostKeyframe => Array.isArray(f) && f.length === 8)
      : [];

    if (room.mode === 'follow-leader' && room.followLeader) {
      const fl = room.followLeader;
      if (fl.phase === 'leader-turn' && p.id === fl.leaderId) {
        this.completeLeaderTurn(room, p, totalTimeMs, frames);
      } else if (
        fl.phase === 'challenger-turn' &&
        fl.survivorIds.includes(p.id) &&
        p.id !== fl.leaderId &&
        !fl.completedTurnIds.includes(p.id)
      ) {
        this.recordChallengerRun(room, p, totalTimeMs);
        this.checkAllChallengersFinished(room);
      }
      return;
    }

    if (room.mode === 'team-race' && !p.finishedRace) {
      this.recordRaceFinisher(room, p, totalTimeMs);
    }
  }

  private completeLeaderTurn(
    room: InternalRoom,
    leader: InternalParticipant,
    totalTimeMs: number,
    ghostFrames: GhostKeyframe[]
  ): void {
    const fl = room.followLeader;
    if (!fl || fl.phase !== 'leader-turn') return;

    const now = Date.now();
    fl.leaderTargetMs = totalTimeMs;
    fl.leaderCutoffMs = Math.round(totalTimeMs * (1 + room.rules.leaderMarginPct / 100));
    fl.ghostFrames = ghostFrames;
    fl.phase = 'challenger-turn';
    fl.completedTurnIds = [];
    fl.phaseEndsAtMs = now + Math.max(22000, Math.round(fl.leaderCutoffMs * 1.18 + 8000));
    leader.lastTurnTimeMs = totalTimeMs;
    leader.turnPassed = true;
    leader.score += 1;

    // Reset challengers to start grid for the live ghost showdown
    let slot = 0;
    for (const id of fl.survivorIds) {
      if (id === fl.leaderId) continue;
      const ch = room.participants.get(id);
      if (!ch) continue;
      ch.lastTurnTimeMs = null;
      ch.turnPassed = null;
      ch.lap = 1;
      ch.gateIndex = 0;
      const sp = getGridSpawn(room.trackSnapshot, slot++);
      ch.pose = { ...sp, vx: 0, vy: 0, vz: 0, ts: now };
      if (ch.isBot && ch.botSim) {
        Object.assign(ch.botSim, {
          ...sp,
          vx: 0,
          vy: 0,
          vz: 0,
          targetGateIdx: 0,
          lap: 1,
          cleanGates: 0,
          runStartMs: now + 2200,
        });
      }
    }

    this.pushFeed(
      room,
      'leader',
      `${leader.callsign} set ${(totalTimeMs / 1000).toFixed(2)}s! Beat ${(fl.leaderCutoffMs / 1000).toFixed(2)}s to survive.`,
      'cyan'
    );
    this.broadcastRoom(room);
  }

  private recordChallengerRun(
    room: InternalRoom,
    challenger: InternalParticipant,
    totalTimeMs: number
  ): void {
    const fl = room.followLeader;
    if (!fl || fl.phase !== 'challenger-turn' || !fl.leaderCutoffMs || !fl.leaderTargetMs) return;
    if (fl.completedTurnIds.includes(challenger.id)) return;

    fl.completedTurnIds.push(challenger.id);
    challenger.lastTurnTimeMs = totalTimeMs;
    const passed = totalTimeMs <= fl.leaderCutoffMs;
    challenger.turnPassed = passed;
    if (passed) {
      challenger.score += totalTimeMs <= fl.leaderTargetMs ? 3 : 2;
      if (room.rules.teamMode === 'teams') {
        if (challenger.team === 'red') room.teamScores.red += 1;
        else if (challenger.team === 'blue') room.teamScores.blue += 1;
      }
    }

    this.pushFeed(
      room,
      'leader',
      `${challenger.callsign} clocked ${(totalTimeMs / 1000).toFixed(2)}s (${passed ? 'SAFE' : 'OVER CUT-OFF'})`,
      passed ? 'emerald' : 'red'
    );
    this.broadcastRoom(room);
  }

  private checkAllChallengersFinished(room: InternalRoom): void {
    const fl = room.followLeader;
    if (!fl || fl.phase !== 'challenger-turn') return;
    const challengers = fl.survivorIds.filter((id) => id !== fl.leaderId);
    const allDone = challengers.every((id) => fl.completedTurnIds.includes(id));
    if (allDone) {
      this.finalizeFollowLeaderRound(room);
    }
  }

  private finalizeFollowLeaderRound(room: InternalRoom): void {
    const fl = room.followLeader;
    if (!fl || fl.phase !== 'challenger-turn') return;

    const cutoff = fl.leaderCutoffMs ?? Number.MAX_SAFE_INTEGER;
    const challengers = fl.survivorIds
      .filter((id) => id !== fl.leaderId)
      .map((id) => room.participants.get(id))
      .filter((p): p is InternalParticipant => Boolean(p));

    // Rank failing challengers slowest/DNF first
    const failed = challengers
      .filter((p) => p.lastTurnTimeMs === null || p.lastTurnTimeMs > cutoff)
      .sort((a, b) => {
        if (a.lastTurnTimeMs === null && b.lastTurnTimeMs === null) return 0;
        if (a.lastTurnTimeMs === null) return -1;
        if (b.lastTurnTimeMs === null) return 1;
        return b.lastTurnTimeMs - a.lastTurnTimeMs;
      });

    const maxCanElim = Math.max(0, fl.survivorIds.length - 1);
    const elimTargets = failed.slice(0, Math.min(room.rules.elimPerRound, maxCanElim));

    fl.eliminatedThisRoundIds = elimTargets.map((p) => p.id);
    for (const p of elimTargets) {
      p.eliminated = true;
      p.turnPassed = false;
      this.pushFeed(room, 'elim', `${p.callsign} eliminated from Follow the Leader!`, 'red');
    }

    fl.survivorIds = fl.survivorIds.filter(
      (id) => !fl.eliminatedThisRoundIds.includes(id)
    );
    fl.phase = 'round-summary';
    fl.phaseEndsAtMs = Date.now() + 3600;

    // Check immediate winner
    if (fl.survivorIds.length <= 1) {
      const winner = fl.survivorIds[0]
        ? room.participants.get(fl.survivorIds[0]) ?? null
        : null;
      this.finishMatch(
        room,
        winner?.team ?? 'draw',
        winner?.id ?? null,
        winner ? `${winner.callsign} is the last pilot standing!` : 'Match complete'
      );
      return;
    }

    if (room.rules.teamMode === 'teams') {
      const aliveTeams = new Set(
        fl.survivorIds
          .map((id) => room.participants.get(id)?.team)
          .filter((t): t is 'red' | 'blue' => t === 'red' || t === 'blue')
      );
      if (aliveTeams.size === 1) {
        const winTeam = Array.from(aliveTeams)[0];
        this.finishMatch(
          room,
          winTeam,
          null,
          `${winTeam === 'red' ? 'Red' : 'Blue'} Team eliminated all rivals!`
        );
        return;
      }
    }

    this.broadcastRoom(room);
  }

  private recordRaceFinisher(
    room: InternalRoom,
    p: InternalParticipant,
    totalTimeMs: number
  ): void {
    if (p.finishedRace) return;
    p.finishedRace = true;
    p.finishTimeMs = totalTimeMs;

    const finishersCount = Array.from(room.participants.values()).filter(
      (x) => x.finishedRace
    ).length;
    const ptsTable = [10, 7, 5, 4, 3, 2, 1, 1];
    const pts = ptsTable[Math.min(ptsTable.length - 1, finishersCount - 1)];
    p.score += pts;
    if (room.rules.teamMode === 'teams') {
      if (p.team === 'red') room.teamScores.red += pts;
      else if (p.team === 'blue') room.teamScores.blue += pts;
    }

    if (room.firstRaceFinishAtMs === null) {
      room.firstRaceFinishAtMs = Date.now();
    }

    this.pushFeed(
      room,
      'race',
      `P${finishersCount} ${p.callsign} finished in ${(totalTimeMs / 1000).toFixed(2)}s (+${pts} pts)`,
      p.team === 'red' ? 'red' : p.team === 'blue' ? 'blue' : 'emerald'
    );

    const allHumansDone = Array.from(room.participants.values())
      .filter((x) => !x.isBot)
      .every((x) => x.finishedRace);

    if (
      finishersCount >= room.participants.size ||
      (allHumansDone && room.participants.size <= 4)
    ) {
      this.finishTeamRace(room);
    } else {
      this.broadcastRoom(room);
    }
  }

  private finishTeamRace(room: InternalRoom): void {
    if (room.status !== 'playing') return;
    if (room.rules.teamMode === 'teams') {
      const winnerTeam: TeamId | 'draw' =
        room.teamScores.red > room.teamScores.blue
          ? 'red'
          : room.teamScores.blue > room.teamScores.red
            ? 'blue'
            : 'draw';
      this.finishMatch(
        room,
        winnerTeam,
        null,
        winnerTeam === 'draw'
          ? 'Tied on team placement points'
          : `${winnerTeam === 'red' ? 'Red' : 'Blue'} Team won ${room.teamScores.red} - ${room.teamScores.blue}`
      );
    } else {
      const sorted = Array.from(room.participants.values()).sort((a, b) => b.score - a.score);
      const top = sorted[0];
      this.finishMatch(room, top?.team ?? 'solo', top?.id ?? null, `${top?.callsign ?? 'Pilot'} won the circuit`);
    }
  }

  private finishMatch(
    room: InternalRoom,
    winnerTeam: TeamId | 'draw',
    winnerPlayerId: string | null,
    winnerReason: string
  ): void {
    if (room.status === 'results') return;
    room.status = 'results';
    room.winnerTeam = winnerTeam;
    room.winnerPlayerId = winnerPlayerId;
    room.winnerReason = winnerReason;
    this.pushFeed(room, 'system', winnerReason, 'amber');
    this.broadcastRoom(room);
    this.broadcastDirectory();
  }

  private tick(): void {
    const now = Date.now();
    const dt = Math.min(0.1, Math.max(0.01, (now - this.lastTickMs) / 1000));
    this.lastTickMs = now;

    for (const room of this.rooms.values()) {
      if (room.status === 'countdown') {
        if (now >= room.countdownEndsAtMs) {
          room.status = 'playing';
          room.lastTagHoldTickMs = now;
          if (room.mode === 'drone-tag') {
            const potatoSec = Math.min(24, Math.max(12, Math.floor(room.rules.timeLimitSec / 4)));
            room.itPulseEndsAtMs = now + potatoSec * 1000;
            room.tagImmunityEndsAtMs = now + room.rules.tagImmunitySec * 1000;
          }
          this.broadcastRoom(room);
        }
        continue;
      }

      if (room.status !== 'playing') continue;

      // Step bots
      this.stepBots(room, dt, now);

      // Mode ticks
      if (room.mode === 'drone-tag') {
        this.tickDroneTag(room, now);
      } else if (room.mode === 'follow-leader') {
        this.tickFollowLeader(room, now);
      } else if (room.mode === 'team-race') {
        if (
          room.firstRaceFinishAtMs !== null &&
          now - room.firstRaceFinishAtMs >= 14000
        ) {
          this.finishTeamRace(room);
        }
      }

      // Global timer expiration
      if (room.status === 'playing' && room.mode !== 'follow-leader' && now >= room.matchEndsAtMs) {
        if (room.mode === 'laser-tag' || room.mode === 'drone-tag') {
          if (room.rules.teamMode === 'teams') {
            const winTeam: TeamId | 'draw' =
              room.teamScores.red > room.teamScores.blue
                ? 'red'
                : room.teamScores.blue > room.teamScores.red
                  ? 'blue'
                  : 'draw';
            this.finishMatch(
              room,
              winTeam,
              null,
              winTeam === 'draw'
                ? 'Time expired — Draw!'
                : `${winTeam === 'red' ? 'Red' : 'Blue'} Team wins on time!`
            );
          } else {
            const top = Array.from(room.participants.values())
              .filter((p) => !p.eliminated)
              .sort((a, b) => b.score - a.score)[0];
            this.finishMatch(
              room,
              top?.team ?? 'solo',
              top?.id ?? null,
              top ? `${top.callsign} leads when clock expired!` : 'Time expired'
            );
          }
        } else {
          this.finishTeamRace(room);
        }
      }

      // Broadcast 20 Hz pose batch to room humans
      const poses: MultiplayerPose[] = Array.from(room.participants.values()).map((p) => ({
        playerId: p.id,
        x: p.pose.x,
        y: p.pose.y,
        z: p.pose.z,
        qx: p.pose.qx,
        qy: p.pose.qy,
        qz: p.pose.qz,
        qw: p.pose.qw,
        vx: p.pose.vx,
        vy: p.pose.vy,
        vz: p.pose.vz,
        shieldHp: p.shieldHp,
        maxShieldHp: p.maxShieldHp,
        isIt: p.isIt,
        eliminated: p.eliminated,
        respawnInvuln: now < p.respawnInvulnUntilMs,
        team: p.team,
        callsign: p.callsign,
        isBot: p.isBot,
        ts: now,
      }));
      this.broadcastRoomMessage(room, { type: 'pose_batch', poses });
    }
  }

  private stepBots(room: InternalRoom, dt: number, now: number): void {
    const gates = room.trackSnapshot.gates;
    if (gates.length === 0) return;

    const all = Array.from(room.participants.values());

    for (const bot of all) {
      if (!bot.isBot || !bot.botSim || bot.eliminated) continue;
      const sim = bot.botSim;

      // In Follow the Leader, only active runner bot(s) fly
      if (room.mode === 'follow-leader' && room.followLeader) {
        const fl = room.followLeader;
        if (fl.phase === 'leader-turn' && bot.id !== fl.leaderId) continue;
        if (
          fl.phase === 'challenger-turn' &&
          (bot.id === fl.leaderId ||
            fl.completedTurnIds.includes(bot.id) ||
            now < sim.runStartMs)
        ) {
          continue;
        }
        if (fl.phase === 'round-summary') continue;
      }

      const skill = bot.botSkill ?? room.rules.botSkill;
      const baseSpeed = skill === 'ace' ? 40 : skill === 'pro' ? 32 : 24;

      let targetX = gates[sim.targetGateIdx % gates.length].position[0];
      let targetY = gates[sim.targetGateIdx % gates.length].position[1];
      let targetZ = gates[sim.targetGateIdx % gates.length].position[2];
      let desiredSpeed = baseSpeed;

      if (room.mode === 'laser-tag') {
        // Steer toward nearest valid target if within 85m, else patrol orbit/gates
        let nearestEnemy: InternalParticipant | null = null;
        let nearestDist = 90;
        for (const other of all) {
          if (other.id === bot.id || other.eliminated || now < other.respawnInvulnUntilMs) continue;
          if (room.rules.teamMode === 'teams' && other.team === bot.team) continue;
          const d = Math.hypot(
            other.pose.x - sim.x,
            other.pose.y - sim.y,
            other.pose.z - sim.z
          );
          if (d < nearestDist) {
            nearestDist = d;
            nearestEnemy = other;
          }
        }
        if (nearestEnemy) {
          // Orbit intercept offset so bots don't collide head-on statically
          const leadT = Math.min(0.6, nearestDist / baseSpeed);
          targetX = nearestEnemy.pose.x + nearestEnemy.pose.vx * leadT + Math.sin(now * 0.002 + sim.phaseOffset) * 5;
          targetY = Math.max(4, nearestEnemy.pose.y + nearestEnemy.pose.vy * leadT + 1.2);
          targetZ = nearestEnemy.pose.z + nearestEnemy.pose.vz * leadT + Math.cos(now * 0.002 + sim.phaseOffset) * 5;
        } else {
          const ang = (now * 0.00055 + sim.phaseOffset) % (Math.PI * 2);
          targetX = Math.cos(ang) * sim.orbitRadius;
          targetZ = Math.sin(ang) * sim.orbitRadius;
          targetY = sampleTrackTerrainHeight(targetX, targetZ, room.trackSnapshot) + 11;
        }

        // Fire laser if lined up & off cooldown
        if (
          nearestEnemy &&
          nearestDist <= 78 &&
          now - bot.lastFireMs >= room.rules.laserCooldownMs * (skill === 'ace' ? 1.15 : skill === 'pro' ? 1.5 : 2.1)
        ) {
          const ex = nearestEnemy.pose.x - sim.x;
          const ey = nearestEnemy.pose.y - sim.y;
          const ez = nearestEnemy.pose.z - sim.z;
          const ed = Math.hypot(ex, ey, ez) || 1;
          const jitter = skill === 'ace' ? 0.03 : skill === 'pro' ? 0.065 : 0.11;
          const jx = ex / ed + (Math.random() - 0.5) * jitter;
          const jy = ey / ed + (Math.random() - 0.5) * jitter;
          const jz = ez / ed + (Math.random() - 0.5) * jitter;
          const jLen = Math.hypot(jx, jy, jz) || 1;
          this.processLaserShot(room, bot, [sim.x, sim.y, sim.z], [jx / jLen, jy / jLen, jz / jLen]);
        }
      } else if (room.mode === 'drone-tag') {
        const itPilot = room.itPlayerId ? room.participants.get(room.itPlayerId) : null;
        if (bot.isIt) {
          let prey: InternalParticipant | null = null;
          let preyDist = Infinity;
          for (const other of all) {
            if (other.id === bot.id || other.eliminated) continue;
            if (room.rules.teamMode === 'teams' && other.team === bot.team) continue;
            const d = Math.hypot(other.pose.x - sim.x, other.pose.y - sim.y, other.pose.z - sim.z);
            if (d < preyDist) {
              preyDist = d;
              prey = other;
            }
          }
          if (prey) {
            targetX = prey.pose.x;
            targetY = Math.max(3, prey.pose.y);
            targetZ = prey.pose.z;
            desiredSpeed = baseSpeed * 1.08;
            if (
              preyDist <= 24 &&
              now >= room.tagImmunityEndsAtMs &&
              now - bot.lastFireMs >= 900
            ) {
              const ex = prey.pose.x - sim.x;
              const ey = prey.pose.y - sim.y;
              const ez = prey.pose.z - sim.z;
              const ed = Math.hypot(ex, ey, ez) || 1;
              this.processLaserShot(room, bot, [sim.x, sim.y, sim.z], [ex / ed, ey / ed, ez / ed]);
            }
          }
        } else if (itPilot) {
          const dToIt = Math.hypot(itPilot.pose.x - sim.x, itPilot.pose.z - sim.z);
          if (dToIt < 38) {
            // Evade away from IT carrier
            const awayX = sim.x - itPilot.pose.x;
            const awayZ = sim.z - itPilot.pose.z;
            const len = Math.hypot(awayX, awayZ) || 1;
            targetX = sim.x + (awayX / len) * 55;
            targetZ = sim.z + (awayZ / len) * 55;
            targetY = sampleTrackTerrainHeight(targetX, targetZ, room.trackSnapshot) + 12;
          }
        }
      }

      const dx = targetX - sim.x;
      const dy = targetY - sim.y;
      const dz = targetZ - sim.z;
      const dist = Math.hypot(dx, dy, dz) || 1;

      const steerRate = Math.min(1, dt * 4.5);
      sim.vx += ((dx / dist) * desiredSpeed - sim.vx) * steerRate;
      sim.vy += ((dy / dist) * desiredSpeed - sim.vy) * steerRate;
      sim.vz += ((dz / dist) * desiredSpeed - sim.vz) * steerRate;

      sim.x += sim.vx * dt;
      sim.y += sim.vy * dt;
      sim.z += sim.vz * dt;

      const ground = sampleTrackTerrainHeight(sim.x, sim.z, room.trackSnapshot);
      if (sim.y < ground + 1.5) sim.y = ground + 1.5;

      const horizSpeed = Math.hypot(sim.vx, sim.vz);
      const yaw = horizSpeed > 0.5 ? Math.atan2(sim.vx, sim.vz) + Math.PI : sim.phaseOffset;
      const pitch = -Math.min(0.42, horizSpeed * 0.011);
      const [qx, qy, qz, qw] = yawPitchToQuat(yaw, pitch, 0);
      sim.qx = qx;
      sim.qy = qy;
      sim.qz = qz;
      sim.qw = qw;

      bot.pose = {
        x: sim.x,
        y: sim.y,
        z: sim.z,
        qx,
        qy,
        qz,
        qw,
        vx: sim.vx,
        vy: sim.vy,
        vz: sim.vz,
        ts: now,
      };

      // Gate tracking for circuit modes
      if (room.mode === 'team-race' || room.mode === 'follow-leader' || (room.mode === 'drone-tag' && !bot.isIt)) {
        const g = gates[sim.targetGateIdx % gates.length];
        const gd = Math.hypot(g.position[0] - sim.x, g.position[1] - sim.y, g.position[2] - sim.z);
        if (gd <= 8.5) {
          sim.targetGateIdx += 1;
          sim.cleanGates += 1;
          const totalGatesPerLap = gates.length;
          if (sim.targetGateIdx >= totalGatesPerLap) {
            sim.targetGateIdx = 0;
            const targetLaps =
              room.mode === 'follow-leader' ? room.rules.lapCount : room.rules.lapCount;
            if (sim.lap >= targetLaps) {
              const runMs = Math.max(2500, now - sim.runStartMs);
              if (room.mode === 'team-race' && !bot.finishedRace) {
                this.recordRaceFinisher(room, bot, runMs);
              } else if (room.mode === 'follow-leader' && room.followLeader) {
                if (
                  room.followLeader.phase === 'leader-turn' &&
                  bot.id === room.followLeader.leaderId
                ) {
                  this.completeLeaderTurn(
                    room,
                    bot,
                    runMs,
                    this.synthesizeBotTrackRun(
                      room.trackSnapshot,
                      room.rules.lapCount,
                      skill
                    ).ghostFrames
                  );
                } else if (
                  room.followLeader.phase === 'challenger-turn' &&
                  bot.id !== room.followLeader.leaderId
                ) {
                  this.recordChallengerRun(room, bot, runMs);
                  this.checkAllChallengersFinished(room);
                }
              }
            } else {
              sim.lap += 1;
            }
          }
          bot.lap = sim.lap;
          bot.gateIndex = sim.targetGateIdx;
        }
      }
    }
  }

  private tickDroneTag(room: InternalRoom, now: number): void {
    const itPilot = room.itPlayerId ? room.participants.get(room.itPlayerId) : null;
    if (!itPilot || itPilot.eliminated) {
      const alive = Array.from(room.participants.values()).filter((p) => !p.eliminated);
      if (alive[0]) {
        this.transferItBeacon(room, null, alive[0]);
      }
      return;
    }

    // Proximity ram/tag check (<= 4.8m)
    if (now >= room.tagImmunityEndsAtMs) {
      for (const other of room.participants.values()) {
        if (other.id === itPilot.id || other.eliminated) continue;
        if (room.rules.teamMode === 'teams' && other.team === itPilot.team) continue;
        const d = Math.hypot(
          other.pose.x - itPilot.pose.x,
          other.pose.y - itPilot.pose.y,
          other.pose.z - itPilot.pose.z
        );
        if (d <= 4.8) {
          this.transferItBeacon(room, itPilot, other);
          break;
        }
      }
    }

    // Scoring / Hot-Potato countdown
    if (room.rules.tagVariant === 'hunter-hold') {
      if (now - room.lastTagHoldTickMs >= 1000) {
        room.lastTagHoldTickMs = now;
        itPilot.score += 1;
        itPilot.tagHoldSec += 1;
        if (room.rules.teamMode === 'teams') {
          if (itPilot.team === 'red') room.teamScores.red += 1;
          else if (itPilot.team === 'blue') room.teamScores.blue += 1;
        }
        if (room.rules.teamMode === 'teams') {
          if (room.teamScores.red >= room.rules.scoreLimit) {
            this.finishMatch(room, 'red', null, 'Red Team held the IT Beacon to victory!');
          } else if (room.teamScores.blue >= room.rules.scoreLimit) {
            this.finishMatch(room, 'blue', null, 'Blue Team held the IT Beacon to victory!');
          }
        } else if (itPilot.score >= room.rules.scoreLimit) {
          this.finishMatch(room, itPilot.team, itPilot.id, `${itPilot.callsign} hit ${room.rules.scoreLimit}s Beacon Hold!`);
        }
        this.broadcastRoom(room);
      }
    } else if (now >= room.itPulseEndsAtMs) {
      // Hot Potato overload eliminates IT carrier!
      itPilot.eliminated = true;
      itPilot.isIt = false;
      this.pushFeed(room, 'elim', `${itPilot.callsign} overloaded with the IT Beacon!`, 'red');

      const alive = Array.from(room.participants.values()).filter((p) => !p.eliminated);
      if (alive.length <= 1) {
        const winner = alive[0] ?? null;
        this.finishMatch(
          room,
          winner?.team ?? 'draw',
          winner?.id ?? null,
          winner ? `${winner.callsign} survived Hot Potato!` : 'Hot Potato complete'
        );
        return;
      }
      if (room.rules.teamMode === 'teams') {
        const aliveTeams = new Set(alive.map((p) => p.team));
        if (aliveTeams.size === 1) {
          const winTeam = Array.from(aliveTeams)[0];
          this.finishMatch(
            room,
            winTeam,
            null,
            `${winTeam === 'red' ? 'Red' : 'Blue'} Team survived Hot Potato!`
          );
          return;
        }
      }
      const nextIt = alive[Math.floor(Math.random() * alive.length)];
      const potatoSec = Math.min(24, Math.max(12, Math.floor(room.rules.timeLimitSec / 4)));
      room.itPulseEndsAtMs = now + potatoSec * 1000;
      this.transferItBeacon(room, null, nextIt);
    }
  }

  private tickFollowLeader(room: InternalRoom, now: number): void {
    const fl = room.followLeader;
    if (!fl) return;

    if (fl.phase === 'leader-turn' && now >= fl.phaseEndsAtMs) {
      const leader = room.participants.get(fl.leaderId);
      if (leader) {
        const fallback = this.synthesizeBotTrackRun(
          room.trackSnapshot,
          room.rules.lapCount,
          'pro'
        );
        this.completeLeaderTurn(room, leader, fallback.totalTimeMs + 4000, fallback.ghostFrames);
      }
    } else if (fl.phase === 'challenger-turn' && now >= fl.phaseEndsAtMs) {
      this.finalizeFollowLeaderRound(room);
    } else if (fl.phase === 'round-summary' && now >= fl.phaseEndsAtMs) {
      this.setupFollowLeaderRound(room, fl.roundNumber + 1, fl.survivorIds, now);
      this.broadcastRoom(room);
    }
  }
}
