import React, { useState } from 'react';
import { ArrowLeft, Check, Lock, Play, Sliders, Sparkles, Wrench, Zap } from 'lucide-react';
import {
  COLOR_SWATCHES,
  DRONE_FRAMES,
  UPGRADE_CATALOG,
  computeDroneStats,
  getFrameSpec,
} from '../data/drones';
import type {
  DroneCustomization,
  DroneFrameId,
  FlightMode,
  PlayerGarageState,
  RatesProfile,
  StickMode,
  UpgradeCategory,
} from '../types/game';

interface GarageModalProps {
  garage: PlayerGarageState;
  onSelectFrame: (id: DroneFrameId) => void;
  onUnlockFrame: (id: DroneFrameId, cost: number) => void;
  onUpgradePart: (cat: UpgradeCategory, cost: number) => void;
  onUpdateCustomization: (patch: Partial<DroneCustomization>) => void;
  onUpdateRates: (patch: Partial<RatesProfile>) => void;
  onChangeFlightMode: (mode: FlightMode) => void;
  onChangeStickMode: (mode: StickMode) => void;
  onClose: () => void;
  onLaunchFlight: () => void;
}

type GarageTab = 'frames' | 'upgrades' | 'livery' | 'rates';

export const GarageModal: React.FC<GarageModalProps> = ({
  garage,
  onSelectFrame,
  onUnlockFrame,
  onUpgradePart,
  onUpdateCustomization,
  onUpdateRates,
  onChangeFlightMode,
  onChangeStickMode,
  onClose,
  onLaunchFlight,
}) => {
  const [tab, setTab] = useState<GarageTab>('upgrades');

  const activeFrame = getFrameSpec(garage.selectedFrame);
  const activeUpgrades = garage.upgradesByFrame[garage.selectedFrame];
  const activeCustom = garage.customizationByFrame[garage.selectedFrame];
  const stats = computeDroneStats(
    garage.selectedFrame,
    activeUpgrades,
    garage.rates
  );

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar: Back + Drone Specs Readout + Launch */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="pointer-events-auto flex items-center gap-3 bg-zinc-950/92 border border-zinc-800 rounded-lg px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="h-4 w-px bg-zinc-800" />
          <div>
            <div className="text-sm font-display font-bold text-white">
              {activeFrame.name}
            </div>
            <div className="text-[11px] text-zinc-400">
              {activeFrame.classLabel}
            </div>
          </div>
        </div>

        {/* Live Physics Stat Strip */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-4 bg-zinc-950/92 border border-zinc-800 rounded-lg px-4 py-2">
          <div>
            <div className="text-[10px] text-zinc-400">TWR</div>
            <div className="text-sm font-mono-tabular font-bold text-amber-400">
              {stats.thrustToWeight}:1
            </div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-400">Top Speed</div>
            <div className="text-sm font-mono-tabular font-bold text-cyan-400">
              {stats.topSpeedKmh} km/h
            </div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-400">Mass</div>
            <div className="text-sm font-mono-tabular font-bold text-zinc-100">
              {Math.round(stats.massKg * 1000)}g
            </div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-400">Max Rate</div>
            <div className="text-sm font-mono-tabular font-bold text-zinc-100">
              {stats.maxRateDegS}°/s
            </div>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <div className="text-[10px] text-zinc-400">Credits</div>
            <div className="text-sm font-mono-tabular font-bold text-amber-400">
              {garage.credits.toLocaleString()} CR
            </div>
          </div>
          <button
            type="button"
            onClick={onLaunchFlight}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-display font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Fly Rig</span>
          </button>
        </div>
      </div>

      {/* Bottom Workshop Dock (Leaves center 3D drone 100% visible above) */}
      <div className="pointer-events-auto w-full max-w-5xl mx-auto bg-zinc-950/92 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Segmented Tab Strip */}
        <div className="flex items-center gap-1 p-1.5 bg-zinc-900/90 border-b border-zinc-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab('frames')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'frames'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Airframes</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('upgrades')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'upgrades'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Component Upgrades</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('livery')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'livery'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Livery & Optics</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('rates')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'rates'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Rates & Radio</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 max-h-[40vh] overflow-y-auto">
          {tab === 'frames' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {DRONE_FRAMES.map((f) => {
                const unlocked = garage.unlockedFrames.includes(f.id);
                const selected = garage.selectedFrame === f.id;
                const canAfford = garage.credits >= f.unlockCost;
                return (
                  <div
                    key={f.id}
                    className={`flex flex-col justify-between p-3.5 rounded-lg border transition-colors ${
                      selected
                        ? 'bg-zinc-900 border-amber-500'
                        : 'bg-zinc-900/60 border-zinc-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-display font-bold text-white">
                          {f.name}
                        </h3>
                        {selected && (
                          <Check className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-cyan-400 mt-0.5">
                        {f.classLabel}
                      </div>
                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        {f.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono-tabular text-zinc-400">
                        {Math.round(f.baseMassKg * 1000)}g · {f.baseThrustN}N
                      </span>
                      {unlocked ? (
                        <button
                          type="button"
                          onClick={() => onSelectFrame(f.id)}
                          disabled={selected}
                          className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            selected
                              ? 'bg-zinc-800 text-zinc-400 cursor-default'
                              : 'bg-zinc-100 hover:bg-white text-zinc-950'
                          }`}
                        >
                          {selected ? 'Equipped' : 'Equip'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onUnlockFrame(f.id, f.unlockCost)}
                          disabled={!canAfford}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          <Lock className="w-3 h-3" />
                          <span>{f.unlockCost} CR</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'upgrades' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(Object.keys(UPGRADE_CATALOG) as UpgradeCategory[]).map((cat) => {
                const spec = UPGRADE_CATALOG[cat];
                const curLvl = activeUpgrades[cat];
                const curSpec = spec.levels[curLvl];
                const nextSpec = spec.levels[curLvl + 1];
                const canAfford = nextSpec ? garage.credits >= nextSpec.cost : false;

                return (
                  <div
                    key={cat}
                    className="flex flex-col justify-between p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-400">
                          {spec.title}
                        </span>
                        <span className="text-[11px] font-mono-tabular text-amber-400">
                          Lv {curLvl + 1}/5
                        </span>
                      </div>
                      <div className="text-sm font-display font-bold text-white mt-1">
                        {curSpec.label}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-1">
                        {curSpec.detail}
                      </div>

                      {/* Level indicator bars */}
                      <div className="grid grid-cols-5 gap-1 mt-3">
                        {[0, 1, 2, 3, 4].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-1.5 rounded-sm ${
                              lvl <= curLvl ? 'bg-amber-500' : 'bg-zinc-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-800">
                      {nextSpec ? (
                        <button
                          type="button"
                          onClick={() => onUpgradePart(cat, nextSpec.cost)}
                          disabled={!canAfford}
                          className={`w-full py-1.5 px-2.5 rounded text-xs font-semibold transition-colors whitespace-nowrap ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          Upgrade · {nextSpec.cost} CR
                        </button>
                      ) : (
                        <div className="w-full py-1.5 text-center text-xs font-semibold text-emerald-400">
                          Max Spec Installed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'livery' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {(
                [
                  { key: 'canopyColor', label: 'Canopy Shell' },
                  { key: 'armAccentColor', label: 'Motor Bells' },
                  { key: 'propColor', label: 'Propellers' },
                  { key: 'ledColor', label: 'Arm LEDs' },
                ] as const
              ).map(({ key, label }) => (
                <div
                  key={key}
                  className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800"
                >
                  <div className="text-xs font-semibold text-zinc-300 mb-2.5">
                    {label}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_SWATCHES.map((sw) => {
                      const active = activeCustom[key] === sw.hex;
                      return (
                        <button
                          key={sw.hex}
                          type="button"
                          onClick={() =>
                            onUpdateCustomization({ [key]: sw.hex })
                          }
                          title={sw.name}
                          className={`w-8 h-8 rounded-md border-2 transition-transform cursor-pointer ${
                            active
                              ? 'border-white scale-110'
                              : 'border-zinc-700 hover:scale-105'
                          }`}
                          style={{ backgroundColor: sw.hex }}
                          aria-label={`${label}: ${sw.name}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                    <span>FPV Cam Uptilt</span>
                    <span className="font-mono-tabular text-amber-400">
                      {activeCustom.cameraTiltDeg}°
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Higher uptilt levels the horizon at top race speeds.
                  </p>
                </div>
                <input
                  type="range"
                  min={5}
                  max={55}
                  step={1}
                  value={activeCustom.cameraTiltDeg}
                  onChange={(e) =>
                    onUpdateCustomization({
                      cameraTiltDeg: Number(e.target.value),
                    })
                  }
                  className="fpv-slider w-full mt-3"
                />
              </div>
            </div>
          )}

          {tab === 'rates' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300">RC Rate</span>
                    <span className="font-mono-tabular text-amber-400">
                      {garage.rates.rcRate.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={1.8}
                    step={0.05}
                    value={garage.rates.rcRate}
                    onChange={(e) =>
                      onUpdateRates({ rcRate: Number(e.target.value) })
                    }
                    className="fpv-slider w-full mt-1.5"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300">Super Rate</span>
                    <span className="font-mono-tabular text-amber-400">
                      {garage.rates.superRate.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={0.82}
                    step={0.02}
                    value={garage.rates.superRate}
                    onChange={(e) =>
                      onUpdateRates({ superRate: Number(e.target.value) })
                    }
                    className="fpv-slider w-full mt-1.5"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300">Stick Expo</span>
                    <span className="font-mono-tabular text-cyan-400">
                      {garage.rates.expo.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.55}
                    step={0.05}
                    value={garage.rates.expo}
                    onChange={(e) =>
                      onUpdateRates({ expo: Number(e.target.value) })
                    }
                    className="fpv-slider w-full mt-1.5"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300">Throttle Expo</span>
                    <span className="font-mono-tabular text-cyan-400">
                      {garage.rates.throttleExpo.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.55}
                    step={0.05}
                    value={garage.rates.throttleExpo}
                    onChange={(e) =>
                      onUpdateRates({ throttleExpo: Number(e.target.value) })
                    }
                    className="fpv-slider w-full mt-1.5"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div>
                  <div className="text-xs text-zinc-300 mb-1.5">
                    Flight Controller Mode
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-md border border-zinc-800">
                    {(['acro', 'airmode', 'angle'] as FlightMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => onChangeFlightMode(m)}
                        className={`py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                          garage.flightMode === m
                            ? 'bg-amber-500 text-zinc-950'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {m === 'acro'
                          ? 'Acro'
                          : m === 'airmode'
                            ? 'Airmode'
                            : 'Angle'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-zinc-300 mb-1.5">
                    Transmitter Stick Mapping
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-md border border-zinc-800">
                    {(['mode2', 'mode1'] as StickMode[]).map((sm) => (
                      <button
                        key={sm}
                        type="button"
                        onClick={() => onChangeStickMode(sm)}
                        className={`py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                          garage.stickMode === sm
                            ? 'bg-cyan-500 text-zinc-950'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {sm === 'mode2' ? 'Mode 2 (Standard)' : 'Mode 1'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
