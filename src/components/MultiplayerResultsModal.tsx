/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React from 'react';
import { Award, Bot, Home, RotateCcw, Trophy } from 'lucide-react';
import { MODE_DESCRIPTIONS } from '../data/multiplayerPresets';
import { PilotBadgeEmblem } from './PilotBadgeEmblem';
import type { RoomStateSnapshot } from '../types/multiplayer';
import { formatRaceTime } from './FpvOsdHud';

interface MultiplayerResultsModalProps {
  room: RoomStateSnapshot;
  playerId: string | null;
  creditsAwarded: number;
  onReturnToLobby: () => void;
  onExitToTitle: () => void;
}

export const MultiplayerResultsModal: React.FC<MultiplayerResultsModalProps> = ({
  room,
  playerId,
  creditsAwarded,
  onReturnToLobby,
  onExitToTitle,
}) => {
  const isHost = Boolean(playerId && room.hostId === playerId);
  const sorted = [...room.participants].sort((a, b) => {
    if (room.mode === 'follow-leader' || (room.mode === 'drone-tag' && room.rules.tagVariant === 'hot-potato')) {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    }
    if (b.score !== a.score) return b.score - a.score;
    if (a.finishTimeMs !== null && b.finishTimeMs !== null) {
      return a.finishTimeMs - b.finishTimeMs;
    }
    return a.deaths - b.deaths;
  });

  return (
    <div
      data-gp-scope="true"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/84 p-3 sm:p-6 safe-inset-container"
    >
      <div className="w-full max-w-3xl max-h-[90dvh] flex flex-col rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                {room.winnerTeam === 'red'
                  ? 'RED TEAM VICTORY'
                  : room.winnerTeam === 'blue'
                    ? 'BLUE TEAM VICTORY'
                    : room.winnerTeam === 'draw'
                      ? 'MATCH DRAW'
                      : 'MATCH COMPLETE'}
              </h2>
              <p className="text-xs text-zinc-400">
                {MODE_DESCRIPTIONS[room.mode].title} · {room.winnerReason ?? room.trackSnapshot.name}
              </p>
            </div>
          </div>

          {creditsAwarded > 0 && (
            <div className="text-right font-mono-tabular">
              <div className="text-xs text-zinc-400">Match Payout</div>
              <div className="text-base font-display font-bold text-amber-400">
                +{creditsAwarded} CR
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {room.rules.teamMode === 'teams' && (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 py-3">
                <div className="text-xs font-semibold text-rose-300">RED TEAM</div>
                <div className="text-2xl font-display font-bold font-mono-tabular text-white">
                  {room.teamScores.red}
                </div>
              </div>
              <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 py-3">
                <div className="text-xs font-semibold text-cyan-300">BLUE TEAM</div>
                <div className="text-2xl font-display font-bold font-mono-tabular text-white">
                  {room.teamScores.blue}
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">#</th>
                  <th className="px-3 py-2.5 font-semibold">Pilot</th>
                  <th className="px-3 py-2.5 font-semibold">Team</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Score</th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    {room.mode === 'laser-tag'
                      ? 'Hits / Deaths'
                      : room.mode === 'drone-tag'
                        ? 'Tags / Status'
                        : 'Time / Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 bg-zinc-950">
                {sorted.map((p, idx) => {
                  const isMe = p.id === playerId;
                  return (
                    <tr
                      key={p.id}
                      className={isMe ? 'bg-amber-500/10' : ''}
                    >
                      <td className="px-3 py-2.5 font-mono-tabular font-bold text-zinc-400">
                        {idx === 0 ? <Award className="w-4 h-4 text-amber-400" /> : idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {p.isBot ? (
                            <Bot className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <PilotBadgeEmblem
                              badgeId={p.equippedBadgeId}
                              size="xs"
                              locked={!p.equippedBadgeId}
                            />
                          )}
                          <span className="font-semibold text-white">
                            {p.callsign}
                            {isMe ? ' (You)' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold uppercase text-[11px]">
                        <span
                          className={
                            p.team === 'red'
                              ? 'text-rose-400'
                              : p.team === 'blue'
                                ? 'text-cyan-400'
                                : 'text-amber-400'
                          }
                        >
                          {p.team}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular font-bold text-white">
                        {p.score}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular text-zinc-300">
                        {room.mode === 'laser-tag'
                          ? `${p.hits} / ${p.deaths}`
                          : room.mode === 'drone-tag'
                            ? `${p.tagsCount} tags · ${p.eliminated ? 'OUT' : 'SURVIVED'}`
                            : p.finishTimeMs !== null
                              ? formatRaceTime(p.finishTimeMs)
                              : p.eliminated
                                ? 'ELIMINATED'
                                : 'SURVIVED'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onExitToTitle}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Exit to Title</span>
          </button>

          {isHost ? (
            <button
              type="button"
              onClick={onReturnToLobby}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-xs sm:text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Return to Room Lobby</span>
            </button>
          ) : (
            <span className="text-xs text-zinc-400">
              Waiting for Host to return to room lobby...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
