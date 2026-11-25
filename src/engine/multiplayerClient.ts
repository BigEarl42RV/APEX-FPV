/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import type { GhostKeyframe, TrackDef } from '../types/game';
import type {
  ClientWsMessage,
  LaserBeamVisual,
  MultiplayerIdentity,
  MultiplayerModeId,
  MultiplayerPose,
  PartyState,
  PublicRoomSummary,
  RoomRulesConfig,
  RoomStateSnapshot,
  RoomVisibility,
  ServerWsMessage,
  TeamId,
} from '../types/multiplayer';

export type WsConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface MultiplayerClientState {
  status: WsConnectionStatus;
  playerId: string | null;
  publicRooms: PublicRoomSummary[];
  party: PartyState | null;
  room: RoomStateSnapshot | null;
  errorMessage: string | null;
  hitBanner: { text: string; accent: 'emerald' | 'rose' | 'amber'; ts: number } | null;
}

class MultiplayerClientManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private shouldStayConnected = false;
  private latestIdentity: MultiplayerIdentity | null = null;

  public state: MultiplayerClientState = {
    status: 'disconnected',
    playerId: null,
    publicRooms: [],
    party: null,
    room: null,
    errorMessage: null,
    hitBanner: null,
  };

  // Zero-GC mutable refs read directly by FpvViewport 60fps loop
  public remotePoses = new Map<string, MultiplayerPose>();
  public pendingLaserBeams: LaserBeamVisual[] = [];
  public onAudioEvent:
    | ((
        kind:
          | 'laser_fire'
          | 'laser_hit'
          | 'laser_elim'
          | 'shield_damaged'
          | 'tag_transferred'
      ) => void)
    | null = null;

  private listeners = new Set<() => void>();

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.state = { ...this.state };
    for (const fn of this.listeners) fn();
  }

  public clearError(): void {
    if (this.state.errorMessage) {
      this.state.errorMessage = null;
      this.emit();
    }
  }

  public connect(identity: MultiplayerIdentity): void {
    this.latestIdentity = identity;
    this.shouldStayConnected = true;

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'update_identity', identity });
      }
      return;
    }

    if (typeof window === 'undefined') return;
    this.state.status = 'connecting';
    this.emit();

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;
    const socket = new WebSocket(url);
    this.ws = socket;

    socket.onopen = () => {
      this.state.status = 'connected';
      this.state.errorMessage = null;
      if (this.latestIdentity) {
        this.send({ type: 'hello', identity: this.latestIdentity });
      }
      this.emit();
    };

    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as ServerWsMessage;
        this.handleServerMessage(msg);
      } catch {
        // Ignore malformed
      }
    };

    socket.onclose = () => {
      this.ws = null;
      this.state.status = 'disconnected';
      this.emit();
      if (this.shouldStayConnected && this.reconnectTimer === null) {
        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectTimer = null;
          if (this.shouldStayConnected && this.latestIdentity) {
            this.connect(this.latestIdentity);
          }
        }, 2000);
      }
    };

    socket.onerror = () => {
      // Handled by onclose
    };
  }

  public disconnect(): void {
    this.shouldStayConnected = false;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.remotePoses.clear();
    this.pendingLaserBeams = [];
    this.state = {
      status: 'disconnected',
      playerId: null,
      publicRooms: [],
      party: null,
      room: null,
      errorMessage: null,
      hitBanner: null,
    };
    this.emit();
  }

  public updateIdentity(identity: MultiplayerIdentity): void {
    this.latestIdentity = identity;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'update_identity', identity });
    }
  }

  private send(msg: ClientWsMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleServerMessage(msg: ServerWsMessage): void {
    switch (msg.type) {
      case 'welcome': {
        this.state.playerId = msg.playerId;
        this.state.publicRooms = msg.rooms;
        this.emit();
        break;
      }
      case 'rooms_list': {
        this.state.publicRooms = msg.rooms;
        this.emit();
        break;
      }
      case 'party_state': {
        this.state.party = msg.party;
        this.emit();
        break;
      }
      case 'room_state': {
        this.state.room = msg.room;
        if (!msg.room) {
          this.remotePoses.clear();
          this.pendingLaserBeams = [];
        } else {
          // Prune poses of players no longer in room
          const validIds = new Set(msg.room.participants.map((p) => p.id));
          for (const key of this.remotePoses.keys()) {
            if (!validIds.has(key)) this.remotePoses.delete(key);
          }
        }
        this.emit();
        break;
      }
      case 'pose_batch': {
        for (const p of msg.poses) {
          if (p.playerId === this.state.playerId) continue;
          this.remotePoses.set(p.playerId, p);
        }
        break;
      }
      case 'laser_fired': {
        this.pendingLaserBeams.push({
          id: `${msg.shooterId}-${performance.now()}`,
          shooterId: msg.shooterId,
          team: msg.team,
          start: msg.start,
          end: msg.end,
          hitPlayerId: msg.hitPlayerId,
          createdAtPerfMs: performance.now(),
        });
        if (this.pendingLaserBeams.length > 24) {
          this.pendingLaserBeams.shift();
        }
        if (msg.shooterId === this.state.playerId) {
          if (msg.hitPlayerId) {
            this.onAudioEvent?.(msg.eliminated ? 'laser_elim' : 'laser_hit');
            this.state.hitBanner = {
              text: msg.eliminated ? 'TARGET ZAPPED +1' : 'SHIELD HIT',
              accent: msg.eliminated ? 'emerald' : 'amber',
              ts: Date.now(),
            };
            this.emit();
          }
        } else if (msg.hitPlayerId === this.state.playerId) {
          this.onAudioEvent?.('shield_damaged');
          this.state.hitBanner = {
            text: msg.eliminated ? 'ZAPPED! RESPAWN SHIELD ACTIVE' : 'SHIELD DAMAGED!',
            accent: 'rose',
            ts: Date.now(),
          };
          this.emit();
        }
        break;
      }
      case 'tag_transferred': {
        this.onAudioEvent?.('tag_transferred');
        this.state.hitBanner = {
          text:
            msg.toPlayerId === this.state.playerId
              ? 'YOU ARE IT! TAG A RIVAL!'
              : `${msg.toCallsign} IS NOW IT`,
          accent: msg.toPlayerId === this.state.playerId ? 'rose' : 'amber',
          ts: Date.now(),
        };
        this.emit();
        break;
      }
      case 'error': {
        this.state.errorMessage = msg.message;
        this.emit();
        break;
      }
    }
  }

  // Client Actions
  public refreshRooms(): void {
    this.send({ type: 'list_rooms' });
  }
  public createParty(): void {
    this.send({ type: 'party_create' });
  }
  public joinParty(partyCode: string): void {
    this.send({ type: 'party_join', partyCode });
  }
  public leaveParty(): void {
    this.send({ type: 'party_leave' });
  }
  public updatePartySettings(lockSameTeam?: boolean, preferredTeam?: 'red' | 'blue'): void {
    this.send({ type: 'party_update_settings', lockSameTeam, preferredTeam });
  }
  public createRoom(params: {
    roomName: string;
    mode: MultiplayerModeId;
    visibility: RoomVisibility;
    trackSnapshot: TrackDef;
    rules: Partial<RoomRulesConfig>;
  }): void {
    this.send({ type: 'create_room', ...params });
  }
  public joinRoom(roomCodeOrId: string): void {
    this.send({ type: 'join_room', roomCodeOrId });
  }
  public leaveRoom(): void {
    this.send({ type: 'leave_room' });
  }
  public switchTeam(team: TeamId): void {
    this.send({ type: 'switch_team', team });
  }
  public setReady(ready: boolean): void {
    this.send({ type: 'set_ready', ready });
  }
  public updateRoomRules(patch: {
    mode?: MultiplayerModeId;
    trackSnapshot?: TrackDef;
    rules?: Partial<RoomRulesConfig>;
    roomName?: string;
    visibility?: RoomVisibility;
  }): void {
    this.send({ type: 'update_room_rules', ...patch });
  }
  public kickBot(botId: string): void {
    this.send({ type: 'kick_bot', botId });
  }
  public startMatch(): void {
    this.send({ type: 'start_match' });
  }
  public returnToLobby(): void {
    this.send({ type: 'return_to_lobby' });
  }
  public fastForwardBotTurn(): void {
    this.send({ type: 'fast_forward_bot_turn' });
  }
  public sendChat(text: string): void {
    this.send({ type: 'send_chat', text });
  }

  // High-frequency flight telemetry & combat emitters
  public publishPose(pose: {
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
  }): void {
    this.send({ type: 'pose_update', ...pose });
  }

  public fireLaser(
    origin: [number, number, number],
    dir: [number, number, number]
  ): void {
    this.onAudioEvent?.('laser_fire');
    this.send({ type: 'fire_laser', origin, dir });
  }

  public reportRaceProgress(lap: number, gateIndex: number, cleanGates: number): void {
    this.send({ type: 'race_progress', lap, gateIndex, cleanGates });
  }

  public submitRunResult(
    totalTimeMs: number,
    cleanGates: number,
    ghostFrames: GhostKeyframe[]
  ): void {
    this.send({
      type: 'submit_run_result',
      totalTimeMs,
      cleanGates,
      ghostFrames,
    });
  }
}

export const mpClient = new MultiplayerClientManager();
