/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React, { useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Fan,
  Hammer,
  Layers,
  Lock,
  Palette,
  Plus,
  RotateCcw,
  Trash2,
  Zap,
} from 'lucide-react';
import { COLOR_SWATCHES } from '../data/drones';
import {
  BUILDER_BATTERIES,
  BUILDER_CAMERAS,
  BUILDER_FRAMES,
  BUILDER_MOTORS,
  BUILDER_PROPS,
  BUILDER_STACKS,
  MAX_CUSTOM_BUILD_SLOTS,
  PAINT_SHOP_PRESETS,
  evaluateCustomDroneBuild,
  getBuilderPartMaps,
} from '../data/droneBuilder';
import type {
  BuildPartCategory,
  ComputedDroneStats,
  CustomDroneBuild,
  CustomDronePartsSelection,
  DroneCustomization,
  FirmwareLevel,
  FrameFinish,
  RatesProfile,
} from '../types/game';

interface BuildBenchPanelProps {
  credits: number;
  unlockedPartIds: string[];
  customBuilds: CustomDroneBuild[];
  activeCustomBuildId: string | null;
  draftParts: CustomDronePartsSelection;
  draftCustom: DroneCustomization;
  draftName: string;
  editingSlotId: string | null;
  benchExploded: boolean;
  currentActiveStats: ComputedDroneStats;
  rates: RatesProfile;
  firmwareLevel: FirmwareLevel;
  onChangeDraftParts: (next: CustomDronePartsSelection) => void;
  onChangeDraftCustom: (patch: Partial<DroneCustomization>) => void;
  onChangeDraftName: (name: string) => void;
  onSelectSlotToEdit: (build: CustomDroneBuild) => void;
  onStartNewDraft: () => void;
  onEquipSlot: (buildId: string) => void;
  onDuplicateSlot: (buildId: string) => void;
  onDeleteSlot: (buildId: string) => void;
  onSaveAndEquipBuild: () => void;
  onToggleExploded: () => void;
  onResetBenchCamera: () => void;
}

type BenchSubTab = BuildPartCategory | 'paint';

const PART_CATEGORIES: Array<{
  id: BenchSubTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'frame', label: 'Frame', icon: Layers },
  { id: 'motors', label: 'Motors', icon: Zap },
  { id: 'props', label: 'Propellers', icon: Fan },
  { id: 'stack', label: 'FC / ESC Stack', icon: Cpu },
  { id: 'battery', label: 'Battery', icon: BatteryCharging },
  { id: 'camera', label: 'Camera & VTX', icon: Camera },
  { id: 'paint', label: 'Paint Shop', icon: Palette },
];

type PaintColorChannelKey =
  | 'frameColor'
  | 'armAccentColor'
  | 'propColor'
  | 'canopyColor'
  | 'ledColor';

const PAINT_CHANNELS: Array<{
  key: PaintColorChannelKey;
  label: string;
  hint: string;
  fallbackHex: string;
}> = [
  {
    key: 'frameColor',
    label: 'Frame & Arms',
    hint: 'Carbon plates & arm booms',
    fallbackHex: '#27272a',
  },
  {
    key: 'armAccentColor',
    label: 'Motor Bells',
    hint: 'Stator bells & hardware rings',
    fallbackHex: '#f59e0b',
  },
  {
    key: 'propColor',
    label: 'Propellers',
    hint: 'Blades, hubs & aero trails',
    fallbackHex: '#06b6d4',
  },
  {
    key: 'canopyColor',
    label: 'Canopy Shell',
    hint: 'Top pod & cinewhoop ducts',
    fallbackHex: '#f59e0b',
  },
  {
    key: 'ledColor',
    label: 'Arm LEDs',
    hint: 'Under-arm race strip glow',
    fallbackHex: '#f59e0b',
  },
];

const FINISH_OPTIONS: Array<{ id: FrameFinish; label: string }> = [
  { id: 'matte', label: 'Matte Carbon' },
  { id: 'gloss', label: 'Gloss Clear' },
  { id: 'metallic', label: 'Anodized Metal' },
];

const QUICK_PAINT_SWATCHES = [
  '#27272a',
  '#f4f4f5',
  '#f59e0b',
  '#06b6d4',
  '#ef4444',
  '#84cc16',
  '#3b82f6',
  '#a855f7',
];

const PaintChannelCard: React.FC<{
  label: string;
  hint: string;
  value: string;
  onChange: (hex: string) => void;
}> = ({ label, hint, value, onChange }) => {
  const normalizedValue = /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toLowerCase()
    : '#27272a';
  const [hexDraft, setHexDraft] = useState(normalizedValue.toUpperCase());

  React.useEffect(() => {
    setHexDraft(normalizedValue.toUpperCase());
  }, [normalizedValue]);

  const handleHexTextChange = (raw: string) => {
    const cleaned = raw.startsWith('#') ? raw : `#${raw}`;
    setHexDraft(cleaned.toUpperCase().slice(0, 7));
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
      onChange(cleaned.toLowerCase());
    }
  };

  return (
    <div className="p-3 rounded-lg bg-zinc-900/65 border border-zinc-800 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-display font-bold text-white truncate">
            {label}
          </div>
          <div className="text-[11px] text-zinc-400 truncate">{hint}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <label
            className="relative w-8 h-8 rounded-md border border-zinc-700 overflow-hidden cursor-pointer shrink-0 hover:border-amber-400 transition-colors"
            style={{ backgroundColor: normalizedValue }}
            title={`Pick ${label} color`}
          >
            <input
              type="color"
              value={normalizedValue}
              onChange={(e) => onChange(e.target.value.toLowerCase())}
              aria-label={`${label} color picker`}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
          <input
            type="text"
            value={hexDraft}
            maxLength={7}
            onChange={(e) => handleHexTextChange(e.target.value)}
            onBlur={() => setHexDraft(normalizedValue.toUpperCase())}
            aria-label={`${label} hex code`}
            className="w-[74px] px-2 py-1 rounded bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-[11px] font-mono-tabular text-zinc-100 uppercase focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {QUICK_PAINT_SWATCHES.map((hex) => {
          const active = normalizedValue === hex.toLowerCase();
          const swatchName =
            COLOR_SWATCHES.find((s) => s.hex.toLowerCase() === hex)?.name ?? hex;
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex.toLowerCase())}
              title={swatchName}
              aria-label={`${label} swatch ${swatchName}`}
              className={`w-6 h-6 sm:w-5 sm:h-5 rounded border transition-transform cursor-pointer ${
                active
                  ? 'border-white scale-110'
                  : 'border-zinc-700 hover:border-zinc-400'
              }`}
              style={{ backgroundColor: hex }}
            />
          );
        })}
      </div>
    </div>
  );
};

export const BuildBenchPanel: React.FC<BuildBenchPanelProps> = ({
  credits,
  unlockedPartIds,
  customBuilds,
  activeCustomBuildId,
  draftParts,
  draftCustom,
  draftName,
  editingSlotId,
  benchExploded,
  currentActiveStats,
  rates,
  firmwareLevel,
  onChangeDraftParts,
  onChangeDraftCustom,
  onChangeDraftName,
  onSelectSlotToEdit,
  onStartNewDraft,
  onEquipSlot,
  onDuplicateSlot,
  onDeleteSlot,
  onSaveAndEquipBuild,
  onToggleExploded,
  onResetBenchCamera,
}) => {
  const [category, setCategory] = useState<BenchSubTab>('frame');

  const unlockedSet = new Set(unlockedPartIds);
  const evaluation = evaluateCustomDroneBuild(
    draftParts,
    rates,
    firmwareLevel,
    unlockedPartIds
  );
  const selectedPartMaps = getBuilderPartMaps(draftParts);

  const canAfford = credits >= evaluation.unlockCost;
  const slotsFull = !editingSlotId && customBuilds.length >= MAX_CUSTOM_BUILD_SLOTS;
  const canSaveBuild = !evaluation.hasHardError && canAfford && !slotsFull;

  const twrDelta = Number(
    (evaluation.stats.thrustToWeight - currentActiveStats.thrustToWeight).toFixed(2)
  );
  const speedDelta = evaluation.stats.topSpeedKmh - currentActiveStats.topSpeedKmh;
  const massDeltaG = Math.round(
    evaluation.totalMassGrams - currentActiveStats.massKg * 1000
  );

  const formatSigned = (val: number, unit: string) =>
    val === 0 ? `0${unit}` : `${val > 0 ? '+' : ''}${val}${unit}`;

  return (
    <div className="space-y-3">
      {/* Top Bench Strip: Saved Custom Build Slots + 3D Inspection Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-zinc-400 mr-1">
            Custom Slots ({customBuilds.length}/{MAX_CUSTOM_BUILD_SLOTS}):
          </span>

          {customBuilds.map((b) => {
            const isEditing = editingSlotId === b.id;
            const isActiveFlight = activeCustomBuildId === b.id;
            return (
              <div
                key={b.id}
                className={`flex items-center rounded-md border text-xs transition-colors ${
                  isEditing
                    ? 'bg-zinc-900 border-amber-500 text-white'
                    : isActiveFlight
                      ? 'bg-zinc-900 border-cyan-500/70 text-cyan-200'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectSlotToEdit(b)}
                  className="px-2.5 py-1 font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {isActiveFlight && (
                    <Check className="w-3 h-3 text-cyan-400 shrink-0" />
                  )}
                  <span className="max-w-[125px] truncate">{b.name}</span>
                </button>
                {!isActiveFlight && (
                  <button
                    type="button"
                    onClick={() => onEquipSlot(b.id)}
                    className="px-1.5 py-1 border-l border-zinc-800 text-[10px] font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                    title="Equip this build"
                  >
                    Equip
                  </button>
                )}
                {customBuilds.length < MAX_CUSTOM_BUILD_SLOTS && (
                  <button
                    type="button"
                    onClick={() => onDuplicateSlot(b.id)}
                    className="p-1 border-l border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                    title="Duplicate build"
                    aria-label={`Duplicate ${b.name}`}
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
                {customBuilds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteSlot(b.id)}
                    className="p-1 border-l border-zinc-800 text-zinc-500 hover:text-rose-400 cursor-pointer"
                    title="Delete build"
                    aria-label={`Delete ${b.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {customBuilds.length < MAX_CUSTOM_BUILD_SLOTS && (
            <button
              type="button"
              onClick={onStartNewDraft}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                editingSlotId === null
                  ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>New Build</span>
            </button>
          )}
        </div>

        {/* 3D Bench Camera Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden lg:inline text-[11px] text-zinc-500">
            Drag 3D view to orbit · Scroll to zoom
          </span>
          <button
            type="button"
            onClick={onToggleExploded}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              benchExploded
                ? 'bg-cyan-500 border-cyan-400 text-zinc-950'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{benchExploded ? 'Collapse Parts' : 'Exploded View'}</span>
          </button>
          <button
            type="button"
            onClick={onResetBenchCamera}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
            title="Reset 3D camera angle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 fold-split-h">
        {/* Left: Subsystem Tabs + Part Selection Grid */}
        <div className="lg:col-span-8 space-y-3 fold-pane-left">
          {/* 6 Subsystem Selector Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 overflow-x-auto">
            {PART_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Part Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {category === 'frame' &&
              BUILDER_FRAMES.map((part) => {
                const selected = draftParts.frameId === part.id;
                const owned = unlockedSet.has(part.id);
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() =>
                      onChangeDraftParts({ ...draftParts, frameId: part.id })
                    }
                    className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-zinc-900 border-amber-500'
                        : 'bg-zinc-900/55 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-display font-bold text-white truncate">
                        {part.name}
                      </span>
                      {owned ? (
                        <span
                          className={`text-[11px] font-semibold shrink-0 ${
                            part.milestoneUnlockId ? 'text-cyan-400' : 'text-emerald-400'
                          }`}
                        >
                          {selected
                            ? 'Selected'
                            : part.milestoneUnlockId
                              ? 'Prototype'
                              : 'Owned'}
                        </span>
                      ) : part.milestoneUnlockId ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 shrink-0">
                          <Lock className="w-3 h-3" />
                          <span>Milestone</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono-tabular font-semibold text-amber-400 shrink-0">
                          <Lock className="w-3 h-3" />
                          {part.cost} CR
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono-tabular text-cyan-400 mt-0.5">
                      {part.sizeClass}&quot; Class · {part.massGrams}g · Max{' '}
                      {part.maxCells}S
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-snug">
                      {!owned && part.milestoneUnlockTitle
                        ? `Unlock via Pilot Career: ${part.milestoneUnlockTitle}. ${part.detail}`
                        : part.detail}
                    </p>
                  </button>
                );
              })}

            {category === 'motors' &&
              BUILDER_MOTORS.map((part) => {
                const selected = draftParts.motorId === part.id;
                const owned = unlockedSet.has(part.id);
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() =>
                      onChangeDraftParts({ ...draftParts, motorId: part.id })
                    }
                    className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-zinc-900 border-amber-500'
                        : 'bg-zinc-900/55 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-display font-bold text-white truncate">
                        {part.name}
                      </span>
                      {owned ? (
                        <span
                          className={`text-[11px] font-semibold shrink-0 ${
                            part.milestoneUnlockId ? 'text-cyan-400' : 'text-emerald-400'
                          }`}
                        >
                          {selected
                            ? 'Selected'
                            : part.milestoneUnlockId
                              ? 'Prototype'
                              : 'Owned'}
                        </span>
                      ) : part.milestoneUnlockId ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 shrink-0">
                          <Lock className="w-3 h-3" />
                          <span>Milestone</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono-tabular font-semibold text-amber-400 shrink-0">
                          <Lock className="w-3 h-3" />
                          {part.cost} CR
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono-tabular text-cyan-400 mt-0.5">
                      {part.statorLabel} · {part.massGrams}g (x4) ·{' '}
                      {part.peakAmpsTotal}A Peak
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-snug">
                      {!owned && part.milestoneUnlockTitle
                        ? `Unlock via Pilot Career: ${part.milestoneUnlockTitle}. ${part.detail}`
                        : part.detail}
                    </p>
                  </button>
                );
              })}

            {category === 'props' &&
              BUILDER_PROPS.map((part) => {
                const selected = draftParts.propId === part.id;
                const owned = unlockedSet.has(part.id);
                const sizeConflict =
                  Number(part.sizeClass) > Number(selectedPartMaps.frame.sizeClass);
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() =>
                      onChangeDraftParts({ ...draftParts, propId: part.id })
                    }
                    className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      selected
                        ? sizeConflict
                          ? 'bg-zinc-900 border-rose-500'
                          : 'bg-zinc-900 border-amber-500'
                        : 'bg-zinc-900/55 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-display font-bold text-white truncate">
                        {part.name}
                      </span>
                      {owned ? (
                        <span
                          className={`text-[11px] font-semibold shrink-0 ${
                            part.milestoneUnlockId ? 'text-cyan-400' : 'text-emerald-400'
                          }`}
                        >
                          {selected
                            ? 'Selected'
                            : part.milestoneUnlockId
                              ? 'Prototype'
                              : 'Owned'}
                        </span>
                      ) : part.milestoneUnlockId ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 shrink-0">
                          <Lock className="w-3 h-3" />
                          <span>Milestone</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono-tabular font-semibold text-amber-400 shrink-0">
                          <Lock className="w-3 h-3" />
                          {part.cost} CR
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono-tabular text-cyan-400 mt-0.5">
                      {part.sizeClass}&quot; · {part.blades}-Blade · {part.massGrams}g
                      {sizeConflict && (
                        <span className="text-rose-400 ml-1.5">
                          (Too wide for {selectedPartMaps.frame.sizeClass}&quot;)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-snug">
                      {!owned && part.milestoneUnlockTitle
                        ? `Unlock via Pilot Career: ${part.milestoneUnlockTitle}. ${part.detail}`
                        : part.detail}
                    </p>
                  </button>
                );
              })}

            {category === 'stack' &&
              BUILDER_STACKS.map((part) => {
                const selected = draftParts.stackId === part.id;
                const owned = unlockedSet.has(part.id);
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() =>
                      onChangeDraftParts({ ...draftParts, stackId: part.id })
                    }
                    className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-zinc-900 border-amber-500'
                        : 'bg-zinc-900/55 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-display font-bold text-white truncate">
                        {part.name}
                      </span>
                      {owned ? (
                        <span
                          className={`text-[11px] font-semibold shrink-0 ${
                            part.milestoneUnlockId ? 'text-cyan-400' : 'text-emerald-400'
                          }`}
                        >
                          {selected
                            ? 'Selected'
                            : part.milestoneUnlockId
                              ? 'Prototype'
                              : 'Owned'}
                        </span>
                      ) : part.milestoneUnlockId ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 shrink-0">
                          <Lock className="w-3 h-3" />
                          <span>Milestone</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono-tabular font-semibold text-amber-400 shrink-0">
                          <Lock className="w-3 h-3" />
                          {part.cost} CR
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono-tabular text-cyan-400 mt-0.5">
                      {part.mountSize} · {part.escAmpsTotal}A Total · Max{' '}
                      {part.maxCells}S · {part.massGrams}g
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-snug">
                      {!owned && part.milestoneUnlockTitle
                        ? `Unlock via Pilot Career: ${part.milestoneUnlockTitle}. ${part.detail}`
                        : part.detail}
                    </p>
                  </button>
                );
              })}

            {category === 'battery' &&
              BUILDER_BATTERIES.map((part) => {
                const selected = draftParts.batteryId === part.id;
                const owned = unlockedSet.has(part.id);
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() =>
                      onChangeDraftParts({ ...draftParts, batteryId: part.id })
                    }
                    className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-zinc-900 border-amber-500'
                        : 'bg-zinc-900/55 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-display font-bold text-white truncate">
                        {part.name}
                      </span>
                      {owned ? (
                        <span
                          className={`text-[11px] font-semibold shrink-0 ${
                            part.milestoneUnlockId ? 'text-cyan-400' : 'text-emerald-400'
                          }`}
                        >
                          {selected
                            ? 'Selected'
                            : part.milestoneUnlockId
                              ? 'Prototype'
                              : 'Owned'}
                        </span>
                      ) : part.milestoneUnlockId ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 shrink-0">
                          <Lock className="w-3 h-3" />
                          <span>Milestone</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono-tabular font-semibold text-amber-400 shrink-0">
                          <Lock className="w-3 h-3" />
                          {part.cost} CR
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono-tabular text-cyan-400 mt-0.5">
                      {part.cells}S · {part.wh}Wh · {part.maxDischargeAmps}A Burst ·{' '}
                      {part.massGrams}g
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-snug">
                      {!owned && part.milestoneUnlockTitle
                        ? `Unlock via Pilot Career: ${part.milestoneUnlockTitle}. ${part.detail}`
                        : part.detail}
                    </p>
                  </button>
                );
              })}

            {category === 'camera' &&
              BUILDER_CAMERAS.map((part) => {
                const selected = draftParts.cameraId === part.id;
                const owned = unlockedSet.has(part.id);
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() =>
                      onChangeDraftParts({ ...draftParts, cameraId: part.id })
                    }
                    className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-zinc-900 border-amber-500'
                        : 'bg-zinc-900/55 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-display font-bold text-white truncate">
                        {part.name}
                      </span>
                      {owned ? (
                        <span
                          className={`text-[11px] font-semibold shrink-0 ${
                            part.milestoneUnlockId ? 'text-cyan-400' : 'text-emerald-400'
                          }`}
                        >
                          {selected
                            ? 'Selected'
                            : part.milestoneUnlockId
                              ? 'Prototype'
                              : 'Owned'}
                        </span>
                      ) : part.milestoneUnlockId ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 shrink-0">
                          <Lock className="w-3 h-3" />
                          <span>Milestone</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono-tabular font-semibold text-amber-400 shrink-0">
                          <Lock className="w-3 h-3" />
                          {part.cost} CR
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono-tabular text-cyan-400 mt-0.5">
                      {part.massGrams}g ·{' '}
                      {part.camStyle === 'action-4k'
                        ? 'Top 4K Cam + LR Whip'
                        : part.camStyle === 'o3-digital'
                          ? 'HD Air Unit + Lollipop'
                          : 'Ultralight Race Lens'}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-snug">
                      {!owned && part.milestoneUnlockTitle
                        ? `Unlock via Pilot Career: ${part.milestoneUnlockTitle}. ${part.detail}`
                        : part.detail}
                    </p>
                  </button>
                );
              })}

            {category === 'paint' && (
              <div className="sm:col-span-2 space-y-3">
                {/* Color Picker Channels */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PAINT_CHANNELS.map((ch) => (
                    <PaintChannelCard
                      key={ch.key}
                      label={ch.label}
                      hint={ch.hint}
                      value={draftCustom[ch.key] ?? ch.fallbackHex}
                      onChange={(hex) => onChangeDraftCustom({ [ch.key]: hex })}
                    />
                  ))}

                  {/* Frame Surface Finish Selector */}
                  <div className="p-3 rounded-lg bg-zinc-900/65 border border-zinc-800 flex flex-col justify-between space-y-2.5">
                    <div>
                      <div className="text-xs font-display font-bold text-white">
                        Frame Surface Finish
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Carbon weave sheen &amp; clearcoat response
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-md border border-zinc-800">
                      {FINISH_OPTIONS.map((opt) => {
                        const active =
                          (draftCustom.frameFinish ?? 'matte') === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              onChangeDraftCustom({ frameFinish: opt.id })
                            }
                            className={`py-1.5 px-1.5 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              active
                                ? 'bg-amber-500 text-zinc-950'
                                : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Pro Livery Schemes + Reset */}
                <div className="p-3 rounded-lg bg-zinc-900/65 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-display font-bold text-white">
                      Pro Team Livery Schemes
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const def = PAINT_SHOP_PRESETS[0];
                        onChangeDraftCustom({
                          frameColor: def.frameColor,
                          frameFinish: def.frameFinish,
                          armAccentColor: def.armAccentColor,
                          propColor: def.propColor,
                          canopyColor: def.canopyColor,
                          ledColor: def.ledColor,
                        });
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-medium text-zinc-300 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Paint</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 min-[420px]:grid-cols-3 lg:grid-cols-6 gap-2">
                    {PAINT_SHOP_PRESETS.map((preset) => {
                      const isMatch =
                        (draftCustom.frameColor ?? '#27272a').toLowerCase() ===
                          preset.frameColor.toLowerCase() &&
                        draftCustom.armAccentColor.toLowerCase() ===
                          preset.armAccentColor.toLowerCase() &&
                        draftCustom.propColor.toLowerCase() ===
                          preset.propColor.toLowerCase() &&
                        (draftCustom.frameFinish ?? 'matte') ===
                          preset.frameFinish;

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            onChangeDraftCustom({
                              frameColor: preset.frameColor,
                              frameFinish: preset.frameFinish,
                              armAccentColor: preset.armAccentColor,
                              propColor: preset.propColor,
                              canopyColor: preset.canopyColor,
                              ledColor: preset.ledColor,
                            })
                          }
                          className={`p-2 rounded-md border text-left transition-colors cursor-pointer ${
                            isMatch
                              ? 'bg-zinc-950 border-amber-500'
                              : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-600'
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-1.5">
                            {[
                              preset.frameColor,
                              preset.armAccentColor,
                              preset.propColor,
                              preset.canopyColor,
                            ].map((hex, i) => (
                              <span
                                key={`${preset.id}-${i}`}
                                className="w-3.5 h-3.5 rounded-sm border border-zinc-700"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                          <div className="text-[11px] font-semibold text-white truncate">
                            {preset.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Engineering Spec Sheet, Compatibility & Build Save CTA */}
        <div className="lg:col-span-4 p-3.5 rounded-lg bg-zinc-900/75 border border-zinc-800 flex flex-col justify-between space-y-3 fold-pane-right">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="custom-build-name"
                className="text-[11px] text-zinc-400 block mb-1"
              >
                Custom Rig Name
              </label>
              <input
                id="custom-build-name"
                type="text"
                value={draftName}
                maxLength={24}
                onChange={(e) => onChangeDraftName(e.target.value)}
                placeholder="e.g. Apex-Slam 6S"
                className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-xs font-display font-semibold text-white focus:outline-none"
              />
            </div>

            {/* Live Engineering Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">AUW Mass</div>
                <div className="font-mono-tabular font-bold text-white">
                  {evaluation.totalMassGrams}g{' '}
                  <span className="text-[10px] font-normal text-zinc-400">
                    ({formatSigned(massDeltaG, 'g')})
                  </span>
                </div>
              </div>
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Thrust-to-Weight</div>
                <div className="font-mono-tabular font-bold text-amber-400">
                  {evaluation.stats.thrustToWeight}:1{' '}
                  <span className="text-[10px] font-normal text-zinc-400">
                    ({formatSigned(twrDelta, '')})
                  </span>
                </div>
              </div>
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Top Speed</div>
                <div className="font-mono-tabular font-bold text-cyan-400">
                  {evaluation.stats.topSpeedKmh} km/h{' '}
                  <span className="text-[10px] font-normal text-zinc-400">
                    ({formatSigned(speedDelta, '')})
                  </span>
                </div>
              </div>
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Endurance</div>
                <div className="font-mono-tabular font-bold text-emerald-400">
                  {evaluation.stats.flightMinutes} min ·{' '}
                  {evaluation.stats.batteryWh}Wh
                </div>
              </div>
            </div>

            {/* ESC / Battery Amp Load Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                <span className="text-zinc-400">Peak Amp Load</span>
                <span
                  className={
                    evaluation.ampLoadPct > 100
                      ? 'text-rose-400 font-semibold'
                      : evaluation.ampLoadPct > 85
                        ? 'text-amber-400 font-semibold'
                        : 'text-emerald-400 font-semibold'
                  }
                >
                  {evaluation.estimatedPeakAmps}A /{' '}
                  {Math.min(evaluation.escMaxAmps, evaluation.batteryMaxAmps)}A (
                  {evaluation.ampLoadPct}%)
                </span>
              </div>
              <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className={`h-full transition-all ${
                    evaluation.ampLoadPct > 100
                      ? 'bg-rose-500'
                      : evaluation.ampLoadPct > 85
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, evaluation.ampLoadPct)}%` }}
                />
              </div>
            </div>

            {/* Compatibility & Fitment Check */}
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 space-y-1.5">
              {evaluation.issues.length === 0 ? (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>All clearances, voltage &amp; ESC specs verified</span>
                </div>
              ) : (
                evaluation.issues.slice(0, 2).map((iss, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-1.5 text-[11px] leading-snug ${
                      iss.severity === 'error'
                        ? 'text-rose-400'
                        : 'text-amber-300'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{iss.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Primary Save / Unlock & Equip Action */}
          <button
            type="button"
            onClick={onSaveAndEquipBuild}
            disabled={!canSaveBuild}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 min-h-[44px] sm:min-h-0 rounded-lg font-display font-bold text-xs transition-colors whitespace-nowrap ${
              canSaveBuild
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>
              {evaluation.hasHardError
                ? 'Resolve Fitment Error First'
                : slotsFull
                  ? 'All 6 Build Slots Full'
                  : evaluation.unlockCost > 0
                    ? canAfford
                      ? `Build & Equip (${evaluation.unlockCost} CR)`
                      : `Need ${evaluation.unlockCost} CR to Build`
                    : editingSlotId
                      ? 'Save & Equip Build'
                      : 'Assemble & Equip Build'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
