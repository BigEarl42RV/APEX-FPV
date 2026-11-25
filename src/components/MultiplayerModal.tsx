/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React, { useMemo, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  Crosshair,
  Flag,
  Lock,
  Play,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Sliders,
  Unlock,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { BUILTIN_TRACKS } from '../data/tracks';
import {
  DEFAULT_RULES_BY_MODE,
  MODE_DESCRIPTIONS,
  MODE_PRESETS,
} from '../data/multiplayerPresets';
import { PilotBadgeEmblem } from './PilotBadgeEmblem';
import type { TrackDef } from '../types/game';
import type {
  BotSkill,
  MultiplayerModeId,
  PartyState,
  PublicRoomSummary,
  RoomRulesConfig,
  RoomStateSnapshot,
  RoomVisibility,
  TeamId,
} from '../types/multiplayer';
import type { WsConnectionStatus } from '../engine/multiplayerClient';

interface MultiplayerModalProps {
  wsStatus: WsConnectionStatus;
  playerId: string | null;
  callsign: string;
  publicRooms: PublicRoomSummary[];
  party: PartyState | null;
  room: RoomStateSnapshot | null;
  errorMessage: string | null;
  savedCustomTracks: TrackDef[];
  selectedTrack: TrackDef;
  onClearError: () => void;
  onRefreshRooms: () => void;
  onCreateParty: () => void;
  onJoinParty: (code: string) => void;
  onLeaveParty: () => void;
  onUpdatePartySettings: (lockSameTeam?: boolean, preferredTeam?: 'red' | 'blue') => void;
  onCreateRoom: (params: {
    roomName: string;
    mode: MultiplayerModeId;
    visibility: RoomVisibility;
    trackSnapshot: TrackDef;
    rules: Partial<RoomRulesConfig>;
  }) => void;
  onJoinRoom: (codeOrId: string) => void;
  onLeaveRoom: () => void;
  onSwitchTeam: (team: TeamId) => void;
  onSetReady: (ready: boolean) => void;
  onUpdateRoomRules: (patch: {
    mode?: MultiplayerModeId;
    trackSnapshot?: TrackDef;
    rules?: Partial<RoomRulesConfig>;
    visibility?: RoomVisibility;
  }) => void;
  onKickBot: (botId: string) => void;
  onStartMatch: () => void;
  onSendChat: (text: string) => void;
  onClose: () => void;
}

const MODE_ORDER: MultiplayerModeId[] = [
  'laser-tag',
  'drone-tag',
  'follow-leader',
  'team-race',
];

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  wsStatus,
  playerId,
  callsign,
  publicRooms,
  party,
  room,
  errorMessage,
  savedCustomTracks,
  selectedTrack,
  onClearError,
  onRefreshRooms,
  onCreateParty,
  onJoinParty,
  onLeaveParty,
  onUpdatePartySettings,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onSwitchTeam,
  onSetReady,
  onUpdateRoomRules,
  onKickBot,
  onStartMatch,
  onSendChat,
  onClose,
}) => {
  const allTracks = useMemo(() => {
    const map = new Map<string, TrackDef>();
    for (const t of BUILTIN_TRACKS) map.set(t.id, t);
    for (const t of savedCustomTracks) map.set(t.id, t);
    return Array.from(map.values());
  }, [savedCustomTracks]);

  const [hubTab, setHubTab] = useState<'browse' | 'create'>('browse');
  const [modeFilter, setModeFilter] = useState<MultiplayerModeId | 'all'>('all');
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [joinPartyInput, setJoinPartyInput] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  // Create Match form state
  const [draftRoomName, setDraftRoomName] = useState(`${callsign}'s Arena`);
  const [draftMode, setDraftMode] = useState<MultiplayerModeId>('laser-tag');
  const [draftVisibility, setDraftVisibility] = useState<RoomVisibility>('public');
  const [draftTrackId, setDraftTrackId] = useState<string>(selectedTrack.id);
  const [draftRules, setDraftRules] = useState<RoomRulesConfig>(() => ({
    ...DEFAULT_RULES_BY_MODE['laser-tag'],
  }));
  const [showCustomRules, setShowCustomRules] = useState(false);

  const handleSelectDraftMode = (mode: MultiplayerModeId) => {
    setDraftMode(mode);
    setDraftRules({ ...DEFAULT_RULES_BY_MODE[mode] });
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = MODE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDraftMode(preset.mode);
    setDraftRules({ ...preset.rules });
  };

  const handleCopyCode = (code: string) => {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(null), 1600);
  };

  const filteredRooms = useMemo(() => {
    if (modeFilter === 'all') return publicRooms;
    return publicRooms.filter((r) => r.mode === modeFilter);
  }, [publicRooms, modeFilter]);

  const localParticipant = room
    ? room.participants.find((p) => p.id === playerId) ?? null
    : null;
  const isRoomHost = Boolean(room && playerId && room.hostId === playerId);
  const isPartyLeader = Boolean(party && playerId && party.leaderId === playerId);

  const handleSubmitCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const tr = allTracks.find((t) => t.id === draftTrackId) ?? allTracks[0];
    onCreateRoom({
      roomName: draftRoomName.trim() || `${callsign}'s Arena`,
      mode: draftMode,
      visibility: draftVisibility,
      trackSnapshot: tr,
      rules: draftRules,
    });
  };

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    onSendChat(text);
    setChatInput('');
  };

  return (
    <div
      data-gp-scope="true"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/82 p-2 sm:p-4 safe-inset-container"
    >
      <div className="w-full max-w-5xl max-h-[92dvh] flex flex-col rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden">
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 border-b border-zinc-800 bg-zinc-900/70">
          <div className="flex items-center gap-3 min-w-0">
            <Users className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-display font-bold text-white truncate">
                  {room ? room.roomName : 'Multiplayer Hangar & Match Hub'}
                </h2>
                <span className="text-zinc-600">·</span>
                <span
                  className={`text-[11px] font-mono-tabular font-semibold ${
                    wsStatus === 'connected'
                      ? 'text-emerald-400'
                      : wsStatus === 'connecting'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  {wsStatus === 'connected'
                    ? 'Server Live'
                    : wsStatus === 'connecting'
                      ? 'Connecting...'
                      : 'Reconnecting'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate">
                {room
                  ? `${MODE_DESCRIPTIONS[room.mode].title} · ${room.trackSnapshot.name}`
                  : 'Create rooms, form squad parties, fill practice grids with [BOT] wingmen, or join live arenas.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
            aria-label="Close Multiplayer Hub"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Squad Party Strip */}
        <div className="px-4 py-2.5 sm:px-6 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {party ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold text-amber-400">
                  SQUAD PARTY {party.partyCode}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(party.partyCode)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-200 cursor-pointer"
                >
                  {copiedCode === party.partyCode ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedCode === party.partyCode ? 'Copied' : 'Copy'}</span>
                </button>
                <span className="text-zinc-600">·</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {party.members.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 text-zinc-200 font-medium"
                    >
                      <PilotBadgeEmblem
                        badgeId={m.equippedBadgeId}
                        size="xs"
                        locked={!m.equippedBadgeId}
                      />
                      <span>{m.callsign}</span>
                      {m.isLeader && (
                        <span className="text-[10px] text-amber-400 font-mono-tabular">
                          (Lead)
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isPartyLeader && (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdatePartySettings(!party.lockSameTeam)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[11px] font-medium cursor-pointer ${
                        party.lockSameTeam
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                      }`}
                    >
                      {party.lockSameTeam ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Unlock className="w-3 h-3" />
                      )}
                      <span>
                        {party.lockSameTeam ? 'Same-Team Locked' : 'Free Team Split'}
                      </span>
                    </button>
                    {party.lockSameTeam && (
                      <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded border border-zinc-800">
                        <button
                          type="button"
                          onClick={() => onUpdatePartySettings(undefined, 'red')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                            party.preferredTeam === 'red'
                              ? 'bg-rose-500 text-zinc-950'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Red
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdatePartySettings(undefined, 'blue')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                            party.preferredTeam === 'blue'
                              ? 'bg-cyan-500 text-zinc-950'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Blue
                        </button>
                      </div>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={onLeaveParty}
                  className="px-2.5 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-rose-300 text-[11px] cursor-pointer"
                >
                  Leave Party
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-zinc-400">
                <UserPlus className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong className="text-zinc-200">Squad Party:</strong> Group up before joining matches so your squad stays on the same team.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onCreateParty}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-xs cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Party</span>
                </button>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (joinPartyInput.trim()) {
                      onJoinParty(joinPartyInput.trim().toUpperCase());
                      setJoinPartyInput('');
                    }
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={joinPartyInput}
                    maxLength={6}
                    onChange={(e) => setJoinPartyInput(e.target.value.toUpperCase())}
                    placeholder="Party Code"
                    className="w-28 px-2.5 py-1.5 min-h-[36px] rounded bg-zinc-900 border border-zinc-700 text-xs font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 min-h-[36px] rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-100 cursor-pointer"
                  >
                    Join
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Error Alert Strip */}
        {errorMessage && (
          <div className="px-4 py-2 sm:px-6 bg-rose-950/70 border-b border-rose-500/40 flex items-center justify-between gap-3 text-xs text-rose-200">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={onClearError}
              className="text-rose-300 hover:text-white font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!room ? (
            <div className="space-y-5">
              {/* Top Tabs: Browse & Join vs Create Match */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-gp-tab="true"
                    onClick={() => setHubTab('browse')}
                    className={`px-4 py-2 min-h-[44px] rounded-lg font-display font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      hubTab === 'browse'
                        ? 'bg-cyan-500 text-zinc-950'
                        : 'bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Browse &amp; Join Match
                  </button>
                  <button
                    type="button"
                    data-gp-tab="true"
                    onClick={() => setHubTab('create')}
                    className={`px-4 py-2 min-h-[44px] rounded-lg font-display font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      hubTab === 'create'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Create Match
                  </button>
                </div>

                {/* Direct Room Code Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (joinRoomInput.trim()) {
                      onJoinRoom(joinRoomInput.trim().toUpperCase());
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={joinRoomInput}
                    maxLength={6}
                    onChange={(e) => setJoinRoomInput(e.target.value.toUpperCase())}
                    placeholder="Room Code (6 chars)"
                    className="w-40 px-3 py-2 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 min-h-[44px] rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-xs cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Join Code
                  </button>
                </form>
              </div>

              {hubTab === 'browse' ? (
                <div className="space-y-4">
                  {/* Mode Filters & Refresh */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(['all', ...MODE_ORDER] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setModeFilter(m)}
                          className={`px-3 py-1.5 min-h-[36px] rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            modeFilter === m
                              ? 'bg-zinc-100 text-zinc-950'
                              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                          }`}
                        >
                          {m === 'all' ? 'All Modes' : MODE_DESCRIPTIONS[m].shortLabel}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={onRefreshRooms}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {/* Public Room Directory Table */}
                  {filteredRooms.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center space-y-3">
                      <p className="text-sm font-medium text-zinc-200">
                        No public rooms are open right now.
                      </p>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        Create a match room and fill empty slots with labeled [BOT] wingmen for immediate solo or party practice — humans can drop in anytime.
                      </p>
                      <button
                        type="button"
                        onClick={() => setHubTab('create')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-xs sm:text-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Host a Match Room</span>
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-zinc-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                          <tr>
                            <th className="px-3 py-2.5 font-semibold">Room</th>
                            <th className="px-3 py-2.5 font-semibold">Mode</th>
                            <th className="px-3 py-2.5 font-semibold">Circuit</th>
                            <th className="px-3 py-2.5 font-semibold">Pilots</th>
                            <th className="px-3 py-2.5 font-semibold">Status</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/80 bg-zinc-950">
                          {filteredRooms.map((r) => (
                            <tr key={r.roomId} className="hover:bg-zinc-900/50">
                              <td className="px-3 py-2.5">
                                <div className="font-semibold text-white">{r.roomName}</div>
                                <div className="text-[11px] font-mono-tabular text-zinc-400">
                                  {r.roomCode} · Host {r.hostCallsign}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-cyan-300 font-medium">
                                {MODE_DESCRIPTIONS[r.mode].shortLabel} ·{' '}
                                {r.teamMode === 'teams' ? 'Red/Blue' : 'FFA'}
                              </td>
                              <td className="px-3 py-2.5 text-zinc-300">{r.trackName}</td>
                              <td className="px-3 py-2.5 font-mono-tabular text-zinc-200">
                                {r.humanCount} Human
                                {r.botCount > 0 ? ` + ${r.botCount} [BOT]` : ''} / {r.maxPlayers}
                              </td>
                              <td className="px-3 py-2.5 font-mono-tabular capitalize text-amber-300">
                                {r.status}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <button
                                  type="button"
                                  disabled={r.status !== 'lobby'}
                                  onClick={() => onJoinRoom(r.roomId)}
                                  className="px-3 py-1.5 min-h-[36px] rounded bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-display font-bold text-xs cursor-pointer"
                                >
                                  {r.status === 'lobby' ? 'Join' : 'In Match'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* Create Match Tab */
                <form onSubmit={handleSubmitCreateRoom} className="space-y-5">
                  {/* 4 Game Modes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {MODE_ORDER.map((m) => {
                      const info = MODE_DESCRIPTIONS[m];
                      const active = draftMode === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelectDraftMode(m)}
                          className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer space-y-1.5 ${
                            active
                              ? 'bg-zinc-900 border-amber-500 text-white'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display font-bold text-sm">
                              {info.shortLabel}
                            </span>
                            {m === 'laser-tag' && <Crosshair className="w-4 h-4 text-rose-400" />}
                            {m === 'drone-tag' && <Shield className="w-4 h-4 text-amber-400" />}
                            {m === 'follow-leader' && <Flag className="w-4 h-4 text-cyan-400" />}
                            {m === 'team-race' && <Play className="w-4 h-4 text-emerald-400" />}
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-snug">
                            {info.summary}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Mode Presets */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-400">Presets:</span>
                    {MODE_PRESETS.filter((p) => p.mode === draftMode).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset.id)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-left cursor-pointer"
                      >
                        <div className="text-xs font-semibold text-cyan-300">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-zinc-400">{preset.tagline}</div>
                      </button>
                    ))}
                  </div>

                  {/* Core Room Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <label className="space-y-1">
                      <span className="text-zinc-400 block">Room Name</span>
                      <input
                        type="text"
                        value={draftRoomName}
                        maxLength={28}
                        onChange={(e) => setDraftRoomName(e.target.value)}
                        className="w-full px-3 py-2 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-amber-500"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-zinc-400 block">Circuit / Arena</span>
                      <select
                        value={draftTrackId}
                        onChange={(e) => setDraftTrackId(e.target.value)}
                        className="w-full px-3 py-2 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-amber-500"
                      >
                        {allTracks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.gates.length} gates)
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="space-y-1">
                      <span className="text-zinc-400 block">Teams &amp; Visibility</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setDraftRules((r) => ({
                              ...r,
                              teamMode: r.teamMode === 'teams' ? 'ffa' : 'teams',
                            }))
                          }
                          className="flex-1 px-2.5 py-2 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-semibold cursor-pointer"
                        >
                          {draftRules.teamMode === 'teams' ? 'Red vs Blue' : 'Free-For-All'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftVisibility((v) =>
                              v === 'public' ? 'private' : 'public'
                            )
                          }
                          className="flex-1 px-2.5 py-2 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-700 text-cyan-300 font-semibold capitalize cursor-pointer"
                        >
                          {draftVisibility}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-400 block">
                        [BOT] Wingmen ({draftRules.botCount}) · {draftRules.botSkill.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-2 min-h-[44px] px-2.5 rounded-lg bg-zinc-900 border border-zinc-700">
                        <Bot className="w-4 h-4 text-amber-400 shrink-0" />
                        <input
                          type="range"
                          min={0}
                          max={draftRules.maxPlayers - 1}
                          value={draftRules.botCount}
                          onChange={(e) =>
                            setDraftRules((r) => ({
                              ...r,
                              botCount: Number(e.target.value),
                            }))
                          }
                          className="flex-1 accent-amber-400"
                        />
                        <select
                          value={draftRules.botSkill}
                          onChange={(e) =>
                            setDraftRules((r) => ({
                              ...r,
                              botSkill: e.target.value as BotSkill,
                            }))
                          }
                          className="bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-[11px] text-white"
                        >
                          <option value="rookie">Rookie</option>
                          <option value="pro">Pro</option>
                          <option value="ace">Ace</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Custom Match Rules */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCustomRules((s) => !s)}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-200 hover:text-amber-300 cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {showCustomRules ? 'Hide Custom Match Rules' : 'Customize Match Rules'}
                        </span>
                      </button>

                      <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draftRules.autoReplaceBots}
                          onChange={(e) =>
                            setDraftRules((r) => ({
                              ...r,
                              autoReplaceBots: e.target.checked,
                            }))
                          }
                          className="accent-cyan-400"
                        />
                        <span>Auto-replace [BOT] slots when humans join</span>
                      </label>
                    </div>

                    {showCustomRules && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-800 text-xs">
                        <label className="space-y-1">
                          <span className="text-zinc-400 block">
                            Time Limit ({draftRules.timeLimitSec}s)
                          </span>
                          <input
                            type="range"
                            min={60}
                            max={420}
                            step={15}
                            value={draftRules.timeLimitSec}
                            onChange={(e) =>
                              setDraftRules((r) => ({
                                ...r,
                                timeLimitSec: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-cyan-400"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-zinc-400 block">
                            Max Pilots ({draftRules.maxPlayers})
                          </span>
                          <input
                            type="range"
                            min={2}
                            max={8}
                            value={draftRules.maxPlayers}
                            onChange={(e) => {
                              const mp = Number(e.target.value);
                              setDraftRules((r) => ({
                                ...r,
                                maxPlayers: mp,
                                botCount: Math.min(r.botCount, mp - 1),
                              }));
                            }}
                            className="w-full accent-cyan-400"
                          />
                        </label>

                        {draftMode === 'laser-tag' && (
                          <>
                            <label className="space-y-1">
                              <span className="text-zinc-400 block">
                                Shield Hits ({draftRules.shieldHits})
                              </span>
                              <input
                                type="range"
                                min={1}
                                max={5}
                                value={draftRules.shieldHits}
                                onChange={(e) =>
                                  setDraftRules((r) => ({
                                    ...r,
                                    shieldHits: Number(e.target.value),
                                  }))
                                }
                                className="w-full accent-rose-400"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="text-zinc-400 block">
                                Elim Score Cap ({draftRules.scoreLimit})
                              </span>
                              <input
                                type="range"
                                min={5}
                                max={40}
                                step={5}
                                value={draftRules.scoreLimit}
                                onChange={(e) =>
                                  setDraftRules((r) => ({
                                    ...r,
                                    scoreLimit: Number(e.target.value),
                                  }))
                                }
                                className="w-full accent-rose-400"
                              />
                            </label>
                          </>
                        )}

                        {draftMode === 'drone-tag' && (
                          <>
                            <label className="space-y-1">
                              <span className="text-zinc-400 block">Tag Ruleset</span>
                              <select
                                value={draftRules.tagVariant}
                                onChange={(e) =>
                                  setDraftRules((r) => ({
                                    ...r,
                                    tagVariant: e.target.value as 'hot-potato' | 'hunter-hold',
                                  }))
                                }
                                className="w-full px-2 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-white"
                              >
                                <option value="hot-potato">Hot Potato Overload</option>
                                <option value="hunter-hold">Hunter Hold Points</option>
                              </select>
                            </label>
                            <label className="space-y-1">
                              <span className="text-zinc-400 block">
                                Tag Immunity ({draftRules.tagImmunitySec}s)
                              </span>
                              <input
                                type="range"
                                min={1}
                                max={6}
                                value={draftRules.tagImmunitySec}
                                onChange={(e) =>
                                  setDraftRules((r) => ({
                                    ...r,
                                    tagImmunitySec: Number(e.target.value),
                                  }))
                                }
                                className="w-full accent-amber-400"
                              />
                            </label>
                          </>
                        )}

                        {draftMode === 'follow-leader' && (
                          <>
                            <label className="space-y-1">
                              <span className="text-zinc-400 block">
                                Survival Margin (+{draftRules.leaderMarginPct}%)
                              </span>
                              <input
                                type="range"
                                min={0}
                                max={25}
                                value={draftRules.leaderMarginPct}
                                onChange={(e) =>
                                  setDraftRules((r) => ({
                                    ...r,
                                    leaderMarginPct: Number(e.target.value),
                                  }))
                                }
                                className="w-full accent-cyan-400"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="text-zinc-400 block">
                                Elims / Round ({draftRules.elimPerRound})
                              </span>
                              <input
                                type="range"
                                min={1}
                                max={2}
                                value={draftRules.elimPerRound}
                                onChange={(e) =>
                                  setDraftRules((r) => ({
                                    ...r,
                                    elimPerRound: Number(e.target.value),
                                  }))
                                }
                                className="w-full accent-rose-400"
                              />
                            </label>
                          </>
                        )}

                        {(draftMode === 'team-race' || draftMode === 'follow-leader') && (
                          <label className="space-y-1">
                            <span className="text-zinc-400 block">
                              Laps ({draftRules.lapCount})
                            </span>
                            <input
                              type="range"
                              min={1}
                              max={5}
                              value={draftRules.lapCount}
                              onChange={(e) =>
                                setDraftRules((r) => ({
                                  ...r,
                                  lapCount: Number(e.target.value),
                                }))
                              }
                              className="w-full accent-emerald-400"
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Open Match Lobby</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Staging Room Lobby */
            <div className="space-y-4">
              {/* Room Code & Leave Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <span className="font-mono-tabular font-bold text-sm text-amber-400">
                    ROOM {room.roomCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(room.roomCode)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 cursor-pointer"
                  >
                    {copiedCode === room.roomCode ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedCode === room.roomCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-300 capitalize">
                    {room.visibility} · {room.rules.teamMode === 'teams' ? 'Red vs Blue' : 'Free-For-All'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="px-3.5 py-2 min-h-[40px] rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-rose-300 cursor-pointer"
                >
                  Leave Room
                </button>
              </div>

              {/* Dual-Pane Lobby Roster & Rules/Chat */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 fold-split-h">
                {/* Left Pane: Teams & Participants */}
                <div className="lg:col-span-7 space-y-3 fold-pane-left">
                  {room.rules.teamMode === 'teams' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(['red', 'blue'] as const).map((team) => {
                        const members = room.participants.filter((p) => p.team === team);
                        const isMine = localParticipant?.team === team;
                        return (
                          <div
                            key={team}
                            className={`rounded-xl border p-3.5 space-y-2.5 ${
                              team === 'red'
                                ? 'border-rose-500/40 bg-rose-950/15'
                                : 'border-cyan-500/40 bg-cyan-950/15'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`font-display font-bold text-sm ${
                                  team === 'red' ? 'text-rose-400' : 'text-cyan-400'
                                }`}
                              >
                                {team === 'red' ? 'RED TEAM' : 'BLUE TEAM'} ({members.length})
                              </span>
                              {!isMine && (
                                <button
                                  type="button"
                                  onClick={() => onSwitchTeam(team)}
                                  className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-zinc-200 cursor-pointer"
                                >
                                  Join {team === 'red' ? 'Red' : 'Blue'}
                                </button>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              {members.map((m) => (
                                <div
                                  key={m.id}
                                  className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-zinc-950/85 border border-zinc-800 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {m.isBot ? (
                                      <Bot className="w-4 h-4 text-amber-400 shrink-0" />
                                    ) : (
                                      <PilotBadgeEmblem
                                        badgeId={m.equippedBadgeId}
                                        size="xs"
                                        locked={!m.equippedBadgeId}
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <div className="font-semibold text-white truncate">
                                        {m.callsign}
                                      </div>
                                      <div className="text-[10px] text-zinc-400 font-mono-tabular">
                                        {m.isBot
                                          ? `AI Wingman (${m.botSkill ?? 'pro'})`
                                          : m.isHost
                                            ? 'Room Host'
                                            : m.ready
                                              ? 'Ready'
                                              : 'Staging'}
                                      </div>
                                    </div>
                                  </div>
                                  {isRoomHost && m.isBot ? (
                                    <button
                                      type="button"
                                      onClick={() => onKickBot(m.id)}
                                      className="text-[11px] text-zinc-400 hover:text-rose-400 cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  ) : (
                                    <span
                                      className={`text-[11px] font-semibold ${
                                        m.ready ? 'text-emerald-400' : 'text-zinc-500'
                                      }`}
                                    >
                                      {m.ready ? 'READY' : 'WAIT'}
                                    </span>
                                  )}
                                </div>
                              ))}
                              {members.length === 0 && (
                                <div className="text-[11px] text-zinc-500 py-3 text-center">
                                  Empty squad slot
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 space-y-2">
                      <div className="font-display font-bold text-sm text-amber-400">
                        FREE-FOR-ALL GRID ({room.participants.length}/{room.rules.maxPlayers})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {room.participants.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {m.isBot ? (
                                <Bot className="w-4 h-4 text-amber-400 shrink-0" />
                              ) : (
                                <PilotBadgeEmblem
                                  badgeId={m.equippedBadgeId}
                                  size="xs"
                                  locked={!m.equippedBadgeId}
                                />
                              )}
                              <span className="font-semibold text-white truncate">
                                {m.callsign}
                              </span>
                            </div>
                            {isRoomHost && m.isBot ? (
                              <button
                                type="button"
                                onClick={() => onKickBot(m.id)}
                                className="text-[11px] text-zinc-400 hover:text-rose-400 cursor-pointer"
                              >
                                Remove
                              </button>
                            ) : (
                              <span
                                className={`text-[11px] font-semibold ${
                                  m.ready ? 'text-emerald-400' : 'text-zinc-500'
                                }`}
                              >
                                {m.ready ? 'READY' : 'WAIT'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Pane: Active Rules + Host Quick Controls + Squad Chat */}
                <div className="lg:col-span-5 space-y-3 fold-pane-right">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-white">
                        Match Rules &amp; [BOT] Fill
                      </span>
                      <span className="text-cyan-300 font-semibold">
                        {MODE_DESCRIPTIONS[room.mode].shortLabel}
                      </span>
                    </div>

                    {isRoomHost ? (
                      <div className="space-y-2.5 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-1">
                            <span className="text-[11px] text-zinc-400 block">Mode</span>
                            <select
                              value={room.mode}
                              onChange={(e) => {
                                const nextM = e.target.value as MultiplayerModeId;
                                onUpdateRoomRules({
                                  mode: nextM,
                                  rules: DEFAULT_RULES_BY_MODE[nextM],
                                });
                              }}
                              className="w-full px-2 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-white"
                            >
                              {MODE_ORDER.map((m) => (
                                <option key={m} value={m}>
                                  {MODE_DESCRIPTIONS[m].shortLabel}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] text-zinc-400 block">Teams</span>
                            <select
                              value={room.rules.teamMode}
                              onChange={(e) =>
                                onUpdateRoomRules({
                                  rules: {
                                    teamMode: e.target.value as 'teams' | 'ffa',
                                  },
                                })
                              }
                              className="w-full px-2 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-white"
                            >
                              <option value="teams">Red vs Blue</option>
                              <option value="ffa">Free-For-All</option>
                            </select>
                          </label>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] text-zinc-300">
                            [BOT] Practice Pilots: <strong>{room.rules.botCount}</strong>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateRoomRules({
                                  rules: {
                                    botCount: Math.max(0, room.rules.botCount - 1),
                                  },
                                })
                              }
                              className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-700 text-white cursor-pointer"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateRoomRules({
                                  rules: {
                                    botCount: Math.min(
                                      room.rules.maxPlayers - 1,
                                      room.rules.botCount + 1
                                    ),
                                  },
                                })
                              }
                              className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-700 text-white cursor-pointer"
                            >
                              +
                            </button>
                            <select
                              value={room.rules.botSkill}
                              onChange={(e) =>
                                onUpdateRoomRules({
                                  rules: { botSkill: e.target.value as BotSkill },
                                })
                              }
                              className="px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-[11px] text-amber-300"
                            >
                              <option value="rookie">Rookie</option>
                              <option value="pro">Pro</option>
                              <option value="ace">Ace</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono-tabular text-zinc-300">
                        <div>Clock: {room.rules.timeLimitSec}s</div>
                        <div>Score Cap: {room.rules.scoreLimit}</div>
                        <div>Shields: {room.rules.shieldHits} hits</div>
                        <div>
                          Bots: {room.rules.botCount} ({room.rules.botSkill})
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Squad Chat */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 flex flex-col gap-2">
                    <div className="text-[11px] font-semibold text-zinc-400">
                      Squad Comms
                    </div>
                    <div className="h-28 overflow-y-auto space-y-1 text-xs pr-1">
                      {room.chat.length === 0 ? (
                        <div className="text-zinc-500 text-[11px]">
                          Say hello or call out a circuit strategy...
                        </div>
                      ) : (
                        room.chat.map((c) => (
                          <div key={c.id} className="leading-snug">
                            <span
                              className={`font-semibold mr-1.5 ${
                                c.team === 'red'
                                  ? 'text-rose-400'
                                  : c.team === 'blue'
                                    ? 'text-cyan-400'
                                    : 'text-amber-400'
                              }`}
                            >
                              {c.senderCallsign}:
                            </span>
                            <span className="text-zinc-200">{c.text}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <form onSubmit={handleSubmitChat} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={chatInput}
                        maxLength={160}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Send squad message..."
                        className="flex-1 px-2.5 py-1.5 min-h-[36px] rounded bg-zinc-950 border border-zinc-700 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="submit"
                        className="p-2 min-h-[36px] rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300 cursor-pointer"
                        aria-label="Send message"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Lobby Action Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800">
                <div className="text-xs text-zinc-400">
                  {MODE_DESCRIPTIONS[room.mode].objective}
                </div>
                <div className="flex items-center gap-2.5">
                  {!isRoomHost && localParticipant && (
                    <button
                      type="button"
                      onClick={() => onSetReady(!localParticipant.ready)}
                      className={`px-5 py-2.5 min-h-[44px] rounded-lg font-display font-bold text-xs sm:text-sm cursor-pointer ${
                        localParticipant.ready
                          ? 'bg-emerald-500 text-zinc-950'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                      }`}
                    >
                      {localParticipant.ready ? 'Ready ✓' : 'Mark Ready'}
                    </button>
                  )}

                  {isRoomHost && (
                    <button
                      type="button"
                      onClick={onStartMatch}
                      className="flex items-center gap-2 px-6 py-2.5 min-h-[44px] rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm cursor-pointer shadow-lg"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Launch Match</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
