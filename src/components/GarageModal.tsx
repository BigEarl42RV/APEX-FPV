/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Check,
  Cpu,
  Eye,
  Gamepad2,
  Hammer,
  Lock,
  Play,
  Radar,
  Sliders,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  COLOR_SWATCHES,
  DRONE_FRAMES,
  UPGRADE_CATALOG,
} from '../data/drones';
import {
  FIRMWARE_CATALOG,
  GOGGLE_FEED_CATALOG,
  HUD_MODULES_CATALOG,
  normalizeSoftwareLoadout,
} from '../data/progression';
import { normalizeGamepadConfig } from '../engine/gamepad';
import {
  evaluateCustomDroneBuild,
} from '../data/droneBuilder';
import { GamepadCalibrationPanel } from './GamepadCalibrationPanel';
import { BuildBenchPanel } from './BuildBenchPanel';
import type {
  ComputedDroneStats,
  CustomDroneBuild,
  CustomDronePartsSelection,
  DroneCustomization,
  DroneFrameId,
  FirmwareLevel,
  FlightMode,
  GamepadConfig,
  GoggleFeedMode,
  GraphicsQuality,
  HudModuleId,
  PlayerGarageState,
  RatesProfile,
  StickMode,
  UpgradeCategory,
} from '../types/game';

interface GarageModalProps {
  garage: PlayerGarageState;
  activeRigName: string;
  activeRigClass: string;
  activeRigStats: ComputedDroneStats;
  activeRigCustom: DroneCustomization;
  benchDraftParts: CustomDronePartsSelection;
  benchDraftCustom: DroneCustomization;
  benchDraftName: string;
  benchEditingSlotId: string | null;
  benchExploded: boolean;
  onSelectFrame: (id: DroneFrameId) => void;
  onUnlockFrame: (id: DroneFrameId, cost: number) => void;
  onUpgradePart: (cat: UpgradeCategory, cost: number) => void;
  onUpdateCustomization: (patch: Partial<DroneCustomization>) => void;
  onUpdateRates: (patch: Partial<RatesProfile>) => void;
  onChangeFlightMode: (mode: FlightMode) => void;
  onChangeStickMode: (mode: StickMode) => void;
  onUpdateGamepad: (config: GamepadConfig) => void;
  onOpenGamepadConfig: () => void;
  onChangeGraphicsQuality: (q: GraphicsQuality) => void;
  onUnlockFirmware: (level: FirmwareLevel, cost: number) => void;
  onSelectFirmware: (level: FirmwareLevel) => void;
  onUnlockHudModule: (id: HudModuleId, cost: number) => void;
  onToggleHudModule: (id: HudModuleId) => void;
  onUnlockGoggleMode: (mode: GoggleFeedMode, cost: number) => void;
  onSelectGoggleMode: (mode: GoggleFeedMode) => void;
  onToggleAnalogFx: () => void;
  onChangeBenchTabActive: (active: boolean) => void;
  onChangeBenchDraftParts: (next: CustomDronePartsSelection) => void;
  onChangeBenchDraftCustom: (patch: Partial<DroneCustomization>) => void;
  onChangeBenchDraftName: (name: string) => void;
  onSelectBenchSlotToEdit: (build: CustomDroneBuild) => void;
  onStartNewBenchDraft: () => void;
  onEquipCustomBuild: (buildId: string) => void;
  onDuplicateCustomBuild: (buildId: string) => void;
  onDeleteCustomBuild: (buildId: string) => void;
  onSaveAndEquipCustomBuild: () => void;
  onToggleBenchExploded: () => void;
  onResetBenchCamera: () => void;
  onOpenCareer: () => void;
  onClose: () => void;
  onLaunchFlight: () => void;
}

type GarageTab =
  | 'build'
  | 'frames'
  | 'upgrades'
  | 'software'
  | 'livery'
  | 'rates'
  | 'controller';

export const GarageModal: React.FC<GarageModalProps> = ({
  garage,
  activeRigName,
  activeRigClass,
  activeRigStats,
  activeRigCustom,
  benchDraftParts,
  benchDraftCustom,
  benchDraftName,
  benchEditingSlotId,
  benchExploded,
  onSelectFrame,
  onUnlockFrame,
  onUpgradePart,
  onUpdateCustomization,
  onUpdateRates,
  onChangeFlightMode,
  onChangeStickMode,
  onUpdateGamepad,
  onOpenGamepadConfig,
  onChangeGraphicsQuality,
  onUnlockFirmware,
  onSelectFirmware,
  onUnlockHudModule,
  onToggleHudModule,
  onUnlockGoggleMode,
  onSelectGoggleMode,
  onToggleAnalogFx,
  onChangeBenchTabActive,
  onChangeBenchDraftParts,
  onChangeBenchDraftCustom,
  onChangeBenchDraftName,
  onSelectBenchSlotToEdit,
  onStartNewBenchDraft,
  onEquipCustomBuild,
  onDuplicateCustomBuild,
  onDeleteCustomBuild,
  onSaveAndEquipCustomBuild,
  onToggleBenchExploded,
  onResetBenchCamera,
  onOpenCareer,
  onClose,
  onLaunchFlight,
}) => {
  const [tab, setTab] = useState<GarageTab>('build');
  const gamepadConfig = normalizeGamepadConfig(garage.gamepad);
  const software = normalizeSoftwareLoadout(garage.software);
  const graphicsQuality: GraphicsQuality = garage.graphicsQuality ?? 'ultra';

  const activeUpgrades = garage.upgradesByFrame[garage.selectedFrame];
  const isCustomActive = Boolean(garage.activeCustomBuildId);

  useEffect(() => {
    onChangeBenchTabActive(tab === 'build');
    return () => onChangeBenchTabActive(false);
  }, [tab, onChangeBenchTabActive]);

  const switchTab = (next: GarageTab) => {
    setTab(next);
  };

  const benchPreviewEval =
    tab === 'build'
      ? evaluateCustomDroneBuild(
          benchDraftParts,
          garage.rates,
          software.firmwareLevel,
          garage.unlockedPartIds ?? []
        )
      : null;

  const stats = benchPreviewEval ? benchPreviewEval.stats : activeRigStats;
  const activeCustom = activeRigCustom;

  return (
    <div
      data-gp-scope="true"
      className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 sm:p-6 safe-inset-container"
    >
      {/* Top Bar: Back + Rig Readout + Quality Selector + Launch */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
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
              {tab === 'build' ? benchDraftName.trim() || 'Custom Build Draft' : activeRigName}
            </div>
            <div className="text-[11px] text-zinc-400">
              {tab === 'build'
                ? 'Build Bench Live 3D Preview'
                : isCustomActive
                  ? `Custom Build · ${activeRigClass}`
                  : activeRigClass}
            </div>
          </div>
        </div>

        {/* Live Physics Stat Strip + Graphics Preset Selector */}
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
            <div className="text-[10px] text-zinc-400">PID Lock</div>
            <div className="text-sm font-mono-tabular font-bold text-emerald-400">
              {stats.pidResponsiveness.toFixed(2)}x
            </div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-400">Max Rate</div>
            <div className="text-sm font-mono-tabular font-bold text-zinc-100">
              {stats.maxRateDegS}°/s
            </div>
          </div>
          <div className="h-6 w-px bg-zinc-800 hidden md:block" />
          <div className="hidden md:flex items-center gap-1 bg-zinc-900 p-1 rounded-md border border-zinc-800">
            {(['ultra', 'high', 'performance'] as GraphicsQuality[]).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onChangeGraphicsQuality(q)}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors cursor-pointer capitalize ${
                  graphicsQuality === q
                    ? 'bg-cyan-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {q === 'performance' ? 'Perf' : q}
              </button>
            ))}
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
            onClick={onOpenCareer}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] sm:min-h-0 bg-zinc-900 hover:bg-zinc-800 border border-cyan-500/50 text-cyan-300 text-xs font-display font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pilot Career</span>
          </button>
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

      {/* Bottom Workshop Dock (Leaves center 3D drone visible above) */}
      <div className="pointer-events-auto w-full max-w-5xl mx-auto bg-zinc-950/92 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl fold-tabletop-dock">
        {/* Segmented Tab Strip */}
        <div className="flex items-center gap-1 p-1.5 bg-zinc-900/90 border-b border-zinc-800 overflow-x-auto">
          <button
            type="button"
            data-gp-tab="true"
            data-gp-tab-active={String(tab === 'build')}
            onClick={() => switchTab('build')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] sm:min-h-0 ${
              tab === 'build'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>Build Bench</span>
          </button>
          <button
            type="button"
            data-gp-tab="true"
            data-gp-tab-active={String(tab === 'frames')}
            onClick={() => switchTab('frames')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] sm:min-h-0 ${
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
            data-gp-tab="true"
            data-gp-tab-active={String(tab === 'upgrades')}
            onClick={() => switchTab('upgrades')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] sm:min-h-0 ${
              tab === 'upgrades'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Hardware Parts</span>
          </button>
          <button
            type="button"
            data-gp-tab="true"
            data-gp-tab-active={String(tab === 'software')}
            onClick={() => switchTab('software')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] sm:min-h-0 ${
              tab === 'software'
                ? 'bg-cyan-500 text-zinc-950'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Avionics &amp; Software</span>
          </button>
          <button
            type="button"
            data-gp-tab="true"
            data-gp-tab-active={String(tab === 'livery')}
            onClick={() => switchTab('livery')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] sm:min-h-0 ${
              tab === 'livery'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Livery &amp; Optics</span>
          </button>
          <button
            type="button"
            data-gp-tab="true"
            data-gp-tab-active={String(tab === 'rates')}
            onClick={() => switchTab('rates')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] sm:min-h-0 ${
              tab === 'rates'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Rates &amp; Radio</span>
          </button>
          <button
            type="button"
            data-gp-tab="true"
            data-gp-tab-active={String(tab === 'controller')}
            onClick={() => switchTab('controller')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] sm:min-h-0 ${
              tab === 'controller'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Controller &amp; USB</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-3 sm:p-4 max-h-[50dvh] sm:max-h-[45dvh] overflow-y-auto">
          {tab === 'build' && (
            <BuildBenchPanel
              credits={garage.credits}
              unlockedPartIds={garage.unlockedPartIds ?? []}
              customBuilds={garage.customBuilds ?? []}
              activeCustomBuildId={garage.activeCustomBuildId ?? null}
              draftParts={benchDraftParts}
              draftCustom={benchDraftCustom}
              draftName={benchDraftName}
              editingSlotId={benchEditingSlotId}
              benchExploded={benchExploded}
              currentActiveStats={activeRigStats}
              rates={garage.rates}
              firmwareLevel={software.firmwareLevel}
              onChangeDraftParts={onChangeBenchDraftParts}
              onChangeDraftCustom={onChangeBenchDraftCustom}
              onChangeDraftName={onChangeBenchDraftName}
              onSelectSlotToEdit={onSelectBenchSlotToEdit}
              onStartNewDraft={onStartNewBenchDraft}
              onEquipSlot={onEquipCustomBuild}
              onDuplicateSlot={onDuplicateCustomBuild}
              onDeleteSlot={onDeleteCustomBuild}
              onSaveAndEquipBuild={onSaveAndEquipCustomBuild}
              onToggleExploded={onToggleBenchExploded}
              onResetBenchCamera={onResetBenchCamera}
            />
          )}

          {tab === 'frames' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {DRONE_FRAMES.map((f) => {
                const unlocked = garage.unlockedFrames.includes(f.id);
                const selected = !isCustomActive && garage.selectedFrame === f.id;
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

          {tab === 'software' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Column 1: Flight Controller Firmware */}
              <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>FC Gyro Firmware</span>
                  </div>
                  <span className="text-[11px] font-mono-tabular text-zinc-400">
                    Active: {FIRMWARE_CATALOG[software.firmwareLevel].tag}
                  </span>
                </div>

                <div className="space-y-2">
                  {FIRMWARE_CATALOG.map((fw) => {
                    const unlocked = software.unlockedFirmwareLevel >= fw.level;
                    const active = software.firmwareLevel === fw.level;
                    const canBuy =
                      fw.level === software.unlockedFirmwareLevel + 1 &&
                      garage.credits >= fw.cost;

                    return (
                      <div
                        key={fw.level}
                        className={`p-2.5 rounded-md border flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-zinc-950 border-amber-500'
                            : 'bg-zinc-950/60 border-zinc-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-display font-bold text-white">
                            {fw.name}
                          </div>
                          <div className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                            {fw.detail}
                          </div>
                        </div>
                        {unlocked ? (
                          <button
                            type="button"
                            onClick={() => onSelectFirmware(fw.level)}
                            disabled={active}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded shrink-0 cursor-pointer ${
                              active
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                            }`}
                          >
                            {active ? 'Flashed' : 'Flash'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onUnlockFirmware(fw.level, fw.cost)}
                            disabled={!canBuy}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded shrink-0 whitespace-nowrap ${
                              canBuy
                                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            {fw.cost} CR
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: Tactical HUD Software Modules */}
              <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                  <Radar className="w-3.5 h-3.5" />
                  <span>Tactical HUD Software</span>
                </div>

                <div className="space-y-2">
                  {HUD_MODULES_CATALOG.map((mod) => {
                    const unlocked = software.unlockedHudModules.includes(mod.id);
                    const enabled = software.enabledHudModules[mod.id];
                    const canBuy = garage.credits >= mod.cost;

                    return (
                      <div
                        key={mod.id}
                        className={`p-2.5 rounded-md border flex items-center justify-between gap-2 ${
                          unlocked && enabled
                            ? 'bg-zinc-950 border-cyan-500/60'
                            : 'bg-zinc-950/60 border-zinc-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-display font-bold text-white">
                            {mod.name}
                          </div>
                          <div className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                            {mod.detail}
                          </div>
                        </div>
                        {unlocked ? (
                          <button
                            type="button"
                            onClick={() => onToggleHudModule(mod.id)}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded shrink-0 cursor-pointer ${
                              enabled
                                ? 'bg-cyan-500 text-zinc-950'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                          >
                            {enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onUnlockHudModule(mod.id, mod.cost)}
                            disabled={!canBuy}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded shrink-0 whitespace-nowrap ${
                              canBuy
                                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            {mod.cost} CR
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Column 3: Goggle Video Link Modes */}
              <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Goggle Video Link</span>
                  </div>
                  {software.goggleMode === 'analog-raceband' && (
                    <button
                      type="button"
                      onClick={onToggleAnalogFx}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                        software.analogFxEnabled
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-zinc-950 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      Scanlines: {software.analogFxEnabled ? 'On' : 'Off'}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {GOGGLE_FEED_CATALOG.map((gf) => {
                    const unlocked = software.unlockedGoggleModes.includes(gf.mode);
                    const active = software.goggleMode === gf.mode;
                    const canBuy = garage.credits >= gf.cost;

                    return (
                      <div
                        key={gf.mode}
                        className={`p-2.5 rounded-md border flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-zinc-950 border-emerald-500'
                            : 'bg-zinc-950/60 border-zinc-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-display font-bold text-white">
                            {gf.name}
                          </div>
                          <div className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                            {gf.detail}
                          </div>
                        </div>
                        {unlocked ? (
                          <button
                            type="button"
                            onClick={() => onSelectGoggleMode(gf.mode)}
                            disabled={active}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded shrink-0 cursor-pointer ${
                              active
                                ? 'bg-emerald-500 text-zinc-950 cursor-default'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                            }`}
                          >
                            {active ? 'Linked' : 'Select'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onUnlockGoggleMode(gf.mode, gf.cost)}
                            disabled={!canBuy}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded shrink-0 whitespace-nowrap ${
                              canBuy
                                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            {gf.cost} CR
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
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

                <div className="md:hidden">
                  <div className="text-xs text-zinc-300 mb-1.5">
                    Render Quality Preset
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-md border border-zinc-800">
                    {(['ultra', 'high', 'performance'] as GraphicsQuality[]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => onChangeGraphicsQuality(q)}
                        className={`py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer capitalize ${
                          graphicsQuality === q
                            ? 'bg-cyan-500 text-zinc-950'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {q === 'performance' ? 'Perf' : q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'controller' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onOpenGamepadConfig}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Open Visual Stick Tester &amp; Mapper</span>
                </button>
              </div>
              <GamepadCalibrationPanel
                config={gamepadConfig}
                onChange={onUpdateGamepad}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
