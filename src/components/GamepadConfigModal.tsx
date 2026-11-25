/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React, { useEffect, useRef, useState } from 'react';
import { Gamepad2, RotateCcw, X } from 'lucide-react';
import {
  createDefaultGamepadConfig,
  getGamepadGlyphs,
  sampleLiveGamepadSnapshot,
  type LiveGamepadSnapshot,
} from '../engine/gamepad';
import type {
  GamepadConfig,
  GamepadPresetId,
  StickMode,
} from '../types/game';

interface GamepadConfigModalProps {
  config: GamepadConfig;
  stickMode: StickMode;
  onChange: (next: GamepadConfig) => void;
  onCapturingChange?: (capturing: boolean) => void;
  onClose: () => void;
}

type AxisChannel = keyof GamepadConfig['axes'];
type ActionButton = keyof GamepadConfig['buttons'];

const AXIS_LABELS: Array<{ key: AxisChannel; label: string; hint: string }> = [
  { key: 'throttle', label: 'Throttle', hint: 'Vertical thrust' },
  { key: 'yaw', label: 'Yaw', hint: 'Rudder rotation' },
  { key: 'pitch', label: 'Pitch', hint: 'Forward / back tilt' },
  { key: 'roll', label: 'Roll', hint: 'Left / right bank' },
];

const BUTTON_LABELS: Array<{ key: ActionButton; label: string }> = [
  { key: 'switchCam', label: 'Switch Cam' },
  { key: 'cycleMode', label: 'Flight Mode' },
  { key: 'reset', label: 'Reset Drone' },
  { key: 'pause', label: 'Pause Menu' },
];

function applyDeadzonePreview(val: number, deadzone: number): number {
  const abs = Math.abs(val);
  if (abs <= deadzone) return 0;
  const scaled = (abs - deadzone) / Math.max(0.01, 1 - deadzone);
  return Math.sign(val) * Math.min(1, scaled);
}

export const GamepadConfigModal: React.FC<GamepadConfigModalProps> = ({
  config,
  stickMode,
  onChange,
  onCapturingChange,
  onClose,
}) => {
  const [live, setLive] = useState<LiveGamepadSnapshot>(() =>
    sampleLiveGamepadSnapshot()
  );
  const [capturingAxis, setCapturingAxis] = useState<AxisChannel | null>(null);
  const [capturingButton, setCapturingButton] = useState<ActionButton | null>(null);
  const baselineAxesRef = useRef<number[]>([]);

  useEffect(() => {
    onCapturingChange?.(Boolean(capturingAxis || capturingButton));
    return () => onCapturingChange?.(false);
  }, [capturingAxis, capturingButton, onCapturingChange]);

  // Escape key closes modal unless actively capturing input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (capturingAxis || capturingButton) {
          setCapturingAxis(null);
          setCapturingButton(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [capturingAxis, capturingButton, onClose]);

  useEffect(() => {
    let raf = 0;
    const poll = () => {
      const snap = sampleLiveGamepadSnapshot();
      setLive(snap);

      if (capturingAxis && snap.connected) {
        if (baselineAxesRef.current.length !== snap.axes.length) {
          baselineAxesRef.current = [...snap.axes];
        } else {
          for (let i = 0; i < snap.axes.length; i++) {
            const delta = Math.abs(snap.axes[i] - baselineAxesRef.current[i]);
            if (delta > 0.35) {
              onChange({
                ...config,
                preset: 'custom',
                axes: {
                  ...config.axes,
                  [capturingAxis]: {
                    ...config.axes[capturingAxis],
                    index: i,
                  },
                },
              });
              setCapturingAxis(null);
              baselineAxesRef.current = [];
              break;
            }
          }
        }
      }

      if (capturingButton && snap.connected && snap.pressedButtons.length > 0) {
        const btnIdx = snap.pressedButtons[0];
        onChange({
          ...config,
          preset: 'custom',
          buttons: {
            ...config.buttons,
            [capturingButton]: btnIdx,
          },
        });
        setCapturingButton(null);
      }

      raf = requestAnimationFrame(poll);
    };

    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [capturingAxis, capturingButton, config, onChange]);

  const applyPreset = (preset: GamepadPresetId) => {
    const fresh = createDefaultGamepadConfig(preset);
    onChange({
      ...fresh,
      enabled: config.enabled,
      autoDetectPreset: config.autoDetectPreset,
    });
    setCapturingAxis(null);
    setCapturingButton(null);
  };

  const getProcessedAxis = (channel: AxisChannel): number => {
    const map = config.axes[channel];
    const raw = live.axes[map.index] ?? 0;
    const val = map.invert ? -raw : raw;
    if (channel === 'throttle') {
      return config.throttleBipolar
        ? Math.max(0, Math.min(1, (val + 1) * 0.5))
        : Math.max(0, Math.min(1, val));
    }
    return applyDeadzonePreview(val, config.deadzone);
  };

  const thrOut = getProcessedAxis('throttle'); // 0..1
  const yawOut = getProcessedAxis('yaw'); // -1..1
  const pitchOut = getProcessedAxis('pitch'); // -1..1
  const rollOut = getProcessedAxis('roll'); // -1..1

  // Map channels onto Left / Right physical gimbals according to Mode 2 or Mode 1
  const leftGimbal =
    stickMode === 'mode2'
      ? {
          title: 'Left Gimbal (Throttle / Yaw)',
          xVal: yawOut,
          yVal: thrOut * 2 - 1, // map 0..1 -> -1..1 for gimbal display
          xLabel: 'Yaw',
          yLabel: `Thr ${Math.round(thrOut * 100)}%`,
        }
      : {
          title: 'Left Gimbal (Pitch / Yaw)',
          xVal: yawOut,
          yVal: pitchOut,
          xLabel: 'Yaw',
          yLabel: 'Pitch',
        };

  const rightGimbal =
    stickMode === 'mode2'
      ? {
          title: 'Right Gimbal (Pitch / Roll)',
          xVal: rollOut,
          yVal: pitchOut,
          xLabel: 'Roll',
          yLabel: 'Pitch',
        }
      : {
          title: 'Right Gimbal (Throttle / Roll)',
          xVal: rollOut,
          yVal: thrOut * 2 - 1,
          xLabel: 'Roll',
          yLabel: `Thr ${Math.round(thrOut * 100)}%`,
        };

  const dzRadiusPct = Math.round(config.deadzone * 50);

  return (
    <div
      data-gp-scope="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 overflow-y-auto safe-inset-container"
    >
      <div className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
              <Gamepad2
                className={`w-5 h-5 ${
                  live.connected ? 'text-emerald-400' : 'text-zinc-400'
                }`}
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-display font-bold text-white truncate">
                Controller &amp; USB Radio Configuration
              </h2>
              <p className="text-xs text-zinc-400 truncate">
                {live.connected
                  ? `${getGamepadGlyphs(live.id).brandLabel} · ${live.id} · ${live.axes.length} axes detected`
                  : 'Connect a USB RC transmitter (EdgeTX/OpenTX/TBS) or Xbox/DualSense/Switch gamepad and move any stick'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Top Preset & Calibration Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-zinc-400 mr-1">
                Profile Preset
              </span>
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-md border border-zinc-800">
                <button
                  type="button"
                  onClick={() => applyPreset('rc-radio')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    config.preset === 'rc-radio'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  RC Radio (AETR)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('gamepad-standard')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    config.preset === 'gamepad-standard'
                      ? 'bg-cyan-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Standard Gamepad
                </button>
                {config.preset === 'custom' && (
                  <span className="px-2.5 py-1 text-xs font-semibold text-amber-400">
                    Custom
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoDetectPreset}
                  onChange={(e) =>
                    onChange({ ...config, autoDetectPreset: e.target.checked })
                  }
                  className="accent-cyan-500"
                />
                <span>Auto-Detect Radio</span>
              </label>

              <button
                type="button"
                onClick={() => onChange({ ...config, enabled: !config.enabled })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  config.enabled
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-700 text-zinc-400'
                }`}
              >
                {config.enabled ? 'Controller Active' : 'Controller Bypassed'}
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset(
                    config.preset === 'rc-radio' ? 'rc-radio' : 'gamepad-standard'
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

          {/* Main 2-Column Workspace: Left = Live Stick Test Display, Right = Axis & Button Mapper */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 fold-split-h">
            {/* Left Column: Live Visual Stick Verification Display */}
            <div className="lg:col-span-5 flex flex-col gap-4 fold-pane-left">
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-display font-bold text-white">
                    Live Stick Input Verification
                  </h3>
                  <span className="text-[11px] font-mono-tabular text-zinc-400">
                    {stickMode === 'mode2' ? 'Mode 2' : 'Mode 1'}
                  </span>
                </div>

                {/* Dual 2D Gimbal Visualizers */}
                <div className="grid grid-cols-2 gap-4">
                  {[leftGimbal, rightGimbal].map((g) => {
                    const dotX = 50 + g.xVal * 44;
                    const dotY = 50 - g.yVal * 44;
                    return (
                      <div key={g.title} className="space-y-2">
                        <div className="text-[11px] font-medium text-zinc-300 text-center truncate">
                          {g.title}
                        </div>
                        <div className="relative aspect-square w-full max-w-[168px] mx-auto rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                          {/* Gimbal crosshairs */}
                          <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-800" />
                          <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-800" />
                          {/* Outer calibrated ring */}
                          <div className="absolute inset-3 rounded-full border border-zinc-800/80" />
                          {/* Deadzone ring */}
                          {dzRadiusPct > 0 && (
                            <div
                              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-500/40 bg-amber-500/5"
                              style={{
                                width: `${dzRadiusPct * 2}%`,
                                height: `${dzRadiusPct * 2}%`,
                              }}
                            />
                          )}
                          {/* Live Stick Puck */}
                          <div
                            className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-amber-400 border-2 border-zinc-950 shadow-md"
                            style={{
                              left: `${dotX}%`,
                              top: `${dotY}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono-tabular text-zinc-400 px-1">
                          <span>
                            {g.xLabel} {g.xVal >= 0 ? '+' : ''}
                            {g.xVal.toFixed(2)}
                          </span>
                          <span>
                            {g.yLabel}
                            {g.yLabel.startsWith('Thr')
                              ? ''
                              : ` ${g.yVal >= 0 ? '+' : ''}${g.yVal.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Raw Hardware Axes & Buttons Diagnostic Inspector */}
                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Raw Hardware Telemetry</span>
                    <span className="font-mono-tabular">
                      {live.connected
                        ? `${live.axes.length} Axes · ${live.pressedButtons.length} Pressed`
                        : 'Offline'}
                    </span>
                  </div>
                  {live.connected ? (
                    <div className="flex flex-wrap gap-1.5">
                      {live.axes.slice(0, 8).map((ax, idx) => (
                        <div
                          key={idx}
                          className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-[10px] font-mono-tabular text-zinc-300"
                        >
                          A{idx}: {ax >= 0 ? '+' : ''}
                          {ax.toFixed(2)}
                        </div>
                      ))}
                      {live.pressedButtons.map((bIdx) => (
                        <div
                          key={`b-${bIdx}`}
                          className="px-2 py-1 rounded bg-amber-500 text-zinc-950 font-bold text-[10px] font-mono-tabular"
                        >
                          Btn {bIdx}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500">
                      Waiting for browser Gamepad API input event. Move any stick or press a switch on your controller.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Axis & Switch Mapping Controls */}
            <div className="lg:col-span-7 space-y-4 fold-pane-right">
              {/* Stick Axes Mapping */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-display font-bold text-white">
                    Channel Axis Assignments
                  </h3>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.throttleBipolar}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          throttleBipolar: e.target.checked,
                        })
                      }
                      className="accent-amber-500"
                    />
                    <span>Full-Range Throttle (-1..+1 → 0..100%)</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AXIS_LABELS.map(({ key, label, hint }) => {
                    const map = config.axes[key];
                    const isCap = capturingAxis === key;
                    const outVal = getProcessedAxis(key);
                    const pct =
                      key === 'throttle'
                        ? Math.round(outVal * 100)
                        : Math.round((outVal + 1) * 50);

                    return (
                      <div
                        key={key}
                        className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold text-white">
                              {label}
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              {hint}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                baselineAxesRef.current = [...live.axes];
                                setCapturingButton(null);
                                setCapturingAxis(isCap ? null : key);
                              }}
                              className={`px-2.5 py-1 text-[11px] font-mono-tabular rounded transition-colors cursor-pointer whitespace-nowrap ${
                                isCap
                                  ? 'bg-amber-500 text-zinc-950 font-bold'
                                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700'
                              }`}
                            >
                              {isCap ? 'Move Stick...' : `Axis ${map.index}`}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onChange({
                                  ...config,
                                  preset: 'custom',
                                  axes: {
                                    ...config.axes,
                                    [key]: { ...map, invert: !map.invert },
                                  },
                                })
                              }
                              className={`px-2 py-1 text-[11px] rounded border transition-colors cursor-pointer ${
                                map.invert
                                  ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {map.invert ? 'Inverted' : 'Normal'}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-zinc-900 rounded overflow-hidden">
                            <div
                              className={`h-full transition-none ${
                                key === 'throttle'
                                  ? 'bg-amber-400'
                                  : 'bg-cyan-400'
                              }`}
                              style={{
                                width: `${Math.max(0, Math.min(100, pct))}%`,
                              }}
                            />
                          </div>
                          <span className="w-12 text-right text-[11px] font-mono-tabular text-zinc-300">
                            {key === 'throttle'
                              ? `${Math.round(outVal * 100)}%`
                              : `${outVal >= 0 ? '+' : ''}${outVal.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Deadzone Slider */}
                <div className="pt-2 border-t border-zinc-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-zinc-300 font-medium">
                      Center Stick Deadzone (Yaw / Pitch / Roll)
                    </span>
                    <span className="font-mono-tabular text-amber-400 font-semibold">
                      {Math.round(config.deadzone * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.2}
                    step={0.01}
                    value={config.deadzone}
                    onChange={(e) =>
                      onChange({ ...config, deadzone: Number(e.target.value) })
                    }
                    className="fpv-slider w-full"
                  />
                </div>
              </div>

              {/* Physical Button / Switch Mappings */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-display font-bold text-white">
                    Switch &amp; Action Button Mapping
                  </h3>
                  <span className="text-[11px] text-zinc-400">
                    Click any action then press a physical switch
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {BUTTON_LABELS.map(({ key, label }) => {
                    const isCap = capturingButton === key;
                    const mappedIdx = config.buttons[key];
                    const isCurrentlyPressed = live.pressedButtons.includes(mappedIdx);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setCapturingAxis(null);
                          setCapturingButton(isCap ? null : key);
                        }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                          isCap
                            ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                            : isCurrentlyPressed
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                              : 'bg-zinc-950 hover:bg-zinc-900 text-zinc-200 border-zinc-800'
                        }`}
                      >
                        <span className="font-medium">{label}</span>
                        <span className="font-mono-tabular text-[11px]">
                          {isCap
                            ? 'Press Button...'
                            : isCurrentlyPressed
                              ? `Btn ${mappedIdx} Active`
                              : `Btn ${mappedIdx}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
