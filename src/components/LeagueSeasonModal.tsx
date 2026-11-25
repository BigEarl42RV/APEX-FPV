/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React, { useState } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  Flag,
  Lock,
  Play,
  Shield,
  Trophy,
  X,
} from 'lucide-react';
import {
  LEAGUE_SPONSOR_OFFERS,
  buildSeasonStandings,
  getActiveSponsorOffer,
  getPilotRepTierLabel,
  getQualifiedRoundCount,
  isSponsorOfferUnlocked,
} from '../data/league';
import { BUILTIN_TRACKS } from '../data/tracks';
import type {
  LeagueRoundState,
  LeagueSeasonState,
  LeagueStage,
} from '../types/game';
import { formatRaceTime } from './FpvOsdHud';

interface LeagueSeasonModalProps {
  season: LeagueSeasonState;
  pilotCallsign: string;
  credits: number;
  rigName: string;
  onLaunchLeagueRace: (round: LeagueRoundState, stage: LeagueStage) => void;
  onSignSponsor: (sponsorId: string) => void;
  onStartNextSeason: () => void;
  onClose: () => void;
}

const TIER_LABELS = {
  club: 'Club Tier',
  'pro-am': 'Pro-Am',
  factory: 'Factory Works',
  vip: 'VIP High-Roller',
} as const;

export const LeagueSeasonModal: React.FC<LeagueSeasonModalProps> = ({
  season,
  pilotCallsign,
  credits,
  rigName,
  onLaunchLeagueRace,
  onSignSponsor,
  onStartNextSeason,
  onClose,
}) => {
  const [rightTab, setRightTab] = useState<'sponsors' | 'standings'>('sponsors');

  const activeSponsor = getActiveSponsorOffer(season);
  const qualifiedCount = getQualifiedRoundCount(season);
  const repTierLabel = getPilotRepTierLabel(season.pilotRep);
  const standings = buildSeasonStandings(season, pilotCallsign);
  const playerRank = Math.max(1, standings.findIndex((s) => s.isPlayer) + 1);
  const unlockedSponsors = LEAGUE_SPONSOR_OFFERS.filter((o) =>
    isSponsorOfferUnlocked(o, season)
  );
  const payoutMult = activeSponsor ? activeSponsor.podiumMultiplier : 1;

  return (
    <div
      data-gp-scope="true"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3 sm:p-6 overflow-y-auto safe-inset-container"
    >
      <div className="w-full max-w-6xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        {/* Top League Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-white">
                Stratum Pro League · Season {season.seasonNumber}
              </h2>
              <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-2">
                <span>Active Rig: {rigName}</span>
                <span aria-hidden="true">·</span>
                <span>Qualified: {qualifiedCount}/4 Rounds</span>
                <span aria-hidden="true">·</span>
                <span className="text-cyan-400 font-medium">
                  {season.pilotRep} REP ({repTierLabel})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-zinc-400">Signed Sponsor</div>
              <div className="text-xs font-display font-bold text-white">
                {activeSponsor
                  ? `${activeSponsor.teamName} (${activeSponsor.podiumMultiplier}x)`
                  : 'Free Agent (1.0x)'}
              </div>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="text-right">
              <div className="text-[10px] text-zinc-400">Bankroll</div>
              <div className="text-sm font-mono-tabular font-bold text-amber-400">
                {credits.toLocaleString()} CR
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              aria-label="Close League Hub"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Season Complete Championship Banner */}
        {season.seasonCompleted && (
          <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm">
              <Award className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-display font-bold text-white">
                  Season {season.seasonNumber} Complete · Finished P{playerRank} Overall
                </span>
                <span className="text-xs text-zinc-300 ml-2">
                  ({season.championshipsWon} League{' '}
                  {season.championshipsWon === 1 ? 'Title' : 'Titles'} Won)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onStartNextSeason}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              Start Season {season.seasonNumber + 1} (+25% Purses)
            </button>
          </div>
        )}

        {/* Main 2-Column Workspace */}
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto flex-1 min-h-0 fold-split-h">
          {/* Left 7 Cols: 4-Round Season Calendar */}
          <div className="lg:col-span-7 space-y-3 fold-pane-left">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-white">
                Championship Calendar (Qualifier → Main Event Final)
              </h3>
              <span className="text-xs text-zinc-400">
                Pass 1-Lap Qualifier to grid the Final
              </span>
            </div>

            <div className="space-y-3">
              {season.rounds.map((round) => {
                const track =
                  BUILTIN_TRACKS.find((t) => t.id === round.trackId) ??
                  BUILTIN_TRACKS[0];
                const isLocked = round.status === 'locked';
                const canRunFinal =
                  round.status === 'qualified' || round.status === 'completed';
                const maxPurseWithSponsor = Math.round(
                  round.baseFinalPurseCr * payoutMult +
                    (activeSponsor ? activeSponsor.vipFinalBonusCr : 0)
                );

                return (
                  <div
                    key={round.roundId}
                    className={`p-4 rounded-lg border transition-colors ${
                      isLocked
                        ? 'bg-zinc-900/35 border-zinc-800/70 opacity-75'
                        : round.status === 'completed'
                          ? 'bg-zinc-900/75 border-emerald-500/40'
                          : round.status === 'qualified'
                            ? 'bg-zinc-900/85 border-cyan-500/50'
                            : 'bg-zinc-900/85 border-amber-500/60'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-display font-bold text-white">
                            {round.title}
                          </span>
                          <span className="text-xs text-zinc-400">
                            · {track.name}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {round.subtitle}
                        </p>
                      </div>

                      <div className="text-right text-xs font-semibold shrink-0">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 text-zinc-500">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Locked</span>
                          </span>
                        ) : round.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Final Best: P{round.finalPlacement}</span>
                          </span>
                        ) : round.status === 'qualified' ? (
                          <span className="inline-flex items-center gap-1 text-cyan-400">
                            <Flag className="w-3.5 h-3.5" />
                            <span>Qualified · Grid P{round.gridSeed}</span>
                          </span>
                        ) : (
                          <span className="text-amber-400">
                            Qualifier Open
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Telemetry & Purse Metrics */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono-tabular">
                      <div>
                        <div className="text-zinc-500">Qualify Cut-Off</div>
                        <div className="text-cyan-300 font-semibold">
                          {formatRaceTime(round.qualifyingCutOffMs)} (1 Lap)
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-500">Your Best Qual</div>
                        <div className="text-white font-semibold">
                          {round.bestQualifyingMs !== null
                            ? formatRaceTime(round.bestQualifyingMs)
                            : '--:--.--'}
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-500">Pole Benchmark</div>
                        <div className="text-amber-400 font-semibold">
                          {formatRaceTime(round.poleTimeMs)}
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-500">Final P1 Purse</div>
                        <div className="text-emerald-400 font-semibold">
                          {maxPurseWithSponsor.toLocaleString()} CR
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {!isLocked && (
                      <div className="mt-3 flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => onLaunchLeagueRace(round, 'qualifier')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-display font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            canRunFinal
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                              : 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950'
                          }`}
                        >
                          <Flag className="w-3.5 h-3.5" />
                          <span>
                            {canRunFinal
                              ? 'Re-Run Qualifier (1 Lap)'
                              : 'Run Qualifier (1 Lap)'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onLaunchLeagueRace(round, 'final')}
                          disabled={!canRunFinal}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-display font-bold transition-colors whitespace-nowrap shrink-0 ${
                            canRunFinal
                              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>
                            {round.status === 'completed'
                              ? 'Replay Main Event Final'
                              : canRunFinal
                                ? 'Start Main Event Final (3 Laps)'
                                : 'Qualify First to Unlock Final'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 5 Cols: Sponsor Selection Desk & Championship Standings */}
          <div className="lg:col-span-5 space-y-3 fold-pane-right">
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                data-gp-tab="true"
                data-gp-tab-active={String(rightTab === 'sponsors')}
                onClick={() => setRightTab('sponsors')}
                className={`flex-1 py-2 sm:py-1.5 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap min-h-[40px] sm:min-h-0 ${
                  rightTab === 'sponsors'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Sponsor Offers ({unlockedSponsors.length}/4)
              </button>
              <button
                type="button"
                data-gp-tab="true"
                data-gp-tab-active={String(rightTab === 'standings')}
                onClick={() => setRightTab('standings')}
                className={`flex-1 py-2 sm:py-1.5 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap min-h-[40px] sm:min-h-0 ${
                  rightTab === 'standings'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Season Standings (P{playerRank})
              </button>
            </div>

            {rightTab === 'sponsors' && (
              <div className="space-y-2.5">
                <div className="text-xs text-zinc-400 leading-relaxed">
                  Qualify in League rounds and grow your REP to unlock competing team offers. Signing pays an instant lump-sum bonus plus podium purse multipliers.
                </div>

                {LEAGUE_SPONSOR_OFFERS.map((offer) => {
                  const unlocked = isSponsorOfferUnlocked(offer, season);
                  const isSigned = season.activeSponsorId === offer.id;
                  const bonusClaimed = season.claimedSponsorIds.includes(offer.id);
                  const repPct = Math.min(
                    100,
                    Math.round((season.pilotRep / offer.minRep) * 100)
                  );

                  return (
                    <div
                      key={offer.id}
                      className={`p-3.5 rounded-lg border space-y-2.5 ${
                        isSigned
                          ? 'bg-zinc-900 border-amber-500'
                          : unlocked
                            ? 'bg-zinc-900/75 border-zinc-700'
                            : 'bg-zinc-900/40 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-xs shrink-0"
                              style={{ backgroundColor: offer.accentHex }}
                            />
                            <span className="text-sm font-display font-bold text-white">
                              {offer.teamName}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            {TIER_LABELS[offer.tier]} · {offer.tagline}
                          </div>
                        </div>
                        {isSigned && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 shrink-0">
                            <Check className="w-3.5 h-3.5" />
                            <span>Signed</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono-tabular bg-zinc-950 p-2 rounded border border-zinc-800/80">
                        <div>
                          <div className="text-zinc-500">Sign Bonus</div>
                          <div className="text-emerald-400 font-bold">
                            +{offer.signingBonusCr.toLocaleString()} CR
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500">Podium Mult</div>
                          <div className="text-amber-400 font-bold">
                            {offer.podiumMultiplier.toFixed(2)}x
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500">Final P1 VIP</div>
                          <div className="text-cyan-400 font-bold">
                            +{offer.vipFinalBonusCr.toLocaleString()} CR
                          </div>
                        </div>
                      </div>

                      {unlocked ? (
                        <button
                          type="button"
                          onClick={() => onSignSponsor(offer.id)}
                          disabled={isSigned}
                          className={`w-full py-2 px-3 rounded-md text-xs font-display font-bold transition-colors whitespace-nowrap ${
                            isSigned
                              ? 'bg-zinc-800 text-zinc-400 cursor-default'
                              : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
                          }`}
                        >
                          {isSigned
                            ? 'Active Factory Contract'
                            : bonusClaimed
                              ? `Switch Back to ${offer.teamName}`
                              : `Sign Contract (+${offer.signingBonusCr.toLocaleString()} CR)`}
                        </button>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono-tabular">
                            <span className="inline-flex items-center gap-1">
                              <Shield className="w-3 h-3 text-zinc-500" />
                              <span>
                                Needs {offer.minQualifiedRounds} Qual{' '}
                                {offer.minQualifiedRounds === 1
                                  ? 'Round'
                                  : 'Rounds'}{' '}
                                · {offer.minRep} REP
                              </span>
                            </span>
                            <span>
                              {season.pilotRep}/{offer.minRep}
                            </span>
                          </div>
                          <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                            <div
                              className="h-full bg-cyan-500"
                              style={{ width: `${repPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {rightTab === 'standings' && (
              <div className="rounded-lg bg-zinc-900/70 border border-zinc-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-[11px] text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">Pos</th>
                      <th className="py-2.5 px-3 font-medium">Pilot</th>
                      <th className="py-2.5 px-3 font-medium text-right">
                        Pod
                      </th>
                      <th className="py-2.5 px-3 font-medium text-right">
                        Pts
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {standings.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={
                          row.isPlayer
                            ? 'bg-amber-500/15 text-white font-semibold'
                            : 'text-zinc-300'
                        }
                      >
                        <td className="py-2 px-3 font-mono-tabular text-zinc-400">
                          P{idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div className="truncate max-w-[165px]">
                            {row.name}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate max-w-[165px]">
                            {row.team}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono-tabular">
                          {row.podiums}
                        </td>
                        <td className="py-2 px-3 text-right font-mono-tabular font-bold text-amber-400">
                          {row.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
