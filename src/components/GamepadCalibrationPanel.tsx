/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React, { useEffect, useRef, useState } from 'react';
import { Gamepad2, RotateCcw } from 'lucide-react';
import {
  createDefaultGamepadConfig,
  sampleLiveGamepadSnapshot,
  type LiveGamepadSnapshot,
} from '../engine/gamepad';
import type { GamepadConfig, GamepadPresetId } from '../types/game';

interface GamepadCalibrationPanelProps {
  config: GamepadConfig;
  onChange: (next: GamepadConfig) => void;
  compact?: boolean;
}

type AxisChannel = keyof GamepadConfig['axes'];
type ActionButton = keyof GamepadConfig['buttons'];

const AXIS_LABELS: Array<{ key: AxisChannel; label: string }> = [
  { key: 'throttle', label: 'Throttle' },
  { key: 'yaw', label: 'Yaw' },
  { key: 'pitch', label: 'Pitch' },
  { key: 'roll', label: 'Roll' },
];

const BUTTON_LABELS: Array<{ key: ActionButton; label: string }> = [
  { key: 'switchCam', label: 'Switch Cam' },
  { key: 'cycleMode', label: 'Flight Mode' },
  { key: 'reset', label: 'Reset Drone' },
  { key: 'pause', label: 'Pause Menu' },
];

export const GamepadCalibrationPanel: React.FC<GamepadCalibrationPanelProps> = ({
  config,
  onChange,
  compact = false,
}) => {
  const [live, setLive] = useState<LiveGamepadSnapshot>(() =>
    sampleLiveGamepadSnapshot()
  );
  const [capturingAxis, setCapturingAxis] = useState<AxisChannel | null>(null);
  const [capturingButton, setCapturingButton] = useState<ActionButton | null>(null);
  const baselineAxesRef = useRef<number[]>([]);

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
    });
    setCapturingAxis(null);
    setCapturingButton(null);
  };

  const getAxisOutput = (channel: AxisChannel): number => {
    const map = config.axes[channel];
    const raw = live.axes[map.index] ?? 0;
    const val = map.invert ? -raw : raw;
    if (channel === 'throttle' && config.throttleBipolar) {
      return Math.max(0, Math.min(1, (val + 1) * 0.5));
    }
    return Math.max(-1, Math.min(1, val));
  };

  return (
    <div className="space-y-3">
      {/* Connection Banner & Preset Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-zinc-900/70 border border-zinc-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <Gamepad2
            className={`w-4 h-4 shrink-0 ${
              live.connected ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {live.connected
                ? live.id
                : 'No USB Radio or Gamepad Detected'}
            </div>
            <div className="text-[11px] text-zinc-400">
              {live.connected
                ? 'Active on 60Hz input bus · Move sticks to verify channels'
                : 'Plug in RadioMaster, TBS Tango, Xbox, or DualSense and press any button'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-md border border-zinc-800">
            <button
              type="button"
              onClick={() => applyPreset('rc-radio')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
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
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                config.preset === 'gamepad-standard'
                  ? 'bg-cyan-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Standard Gamepad
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              onChange({ ...config, enabled: !config.enabled })
            }
            className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              config.enabled
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                : 'bg-zinc-950 border-zinc-700 text-zinc-400'
            }`}
          >
            {config.enabled ? 'Enabled' : 'Bypassed'}
          </button>
        </div>
      </div>

      {/* Axes + Action Switches */}
      <div
        className={`grid gap-3 ${
          compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
        }`}
      >
        {/* 4-Channel Axis Calibration */}
        <div
          className={`${
            compact ? '' : 'lg:col-span-7'
          } p-3 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-2.5`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-200">
              Stick Axis Mapping
            </span>
            <div className="flex items-center gap-3 text-[11px] text-zinc-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
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
                <span>Full-Range Throttle</span>
              </label>
              <span className="font-mono-tabular">
                DZ {Math.round(config.deadzone * 100)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AXIS_LABELS.map(({ key, label }) => {
              const map = config.axes[key];
              const isCap = capturingAxis === key;
              const val = getAxisOutput(key);
              const pct =
                key === 'throttle' && config.throttleBipolar
                  ? Math.round(val * 100)
                  : Math.round(((val + 1) * 0.5) * 100);

              return (
                <div
                  key={key}
                  className="p-2.5 rounded-md bg-zinc-950 border border-zinc-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-white">
                      {label}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          baselineAxesRef.current = [...live.axes];
                          setCapturingButton(null);
                          setCapturingAxis(isCap ? null : key);
                        }}
                        className={`px-2 py-0.5 text-[10px] font-mono-tabular rounded transition-colors cursor-pointer ${
                          isCap
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
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
                        className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                          map.invert
                            ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                        }`}
                        title="Invert axis direction"
                      >
                        Inv
                      </button>
                    </div>
                  </div>

                  {/* Live Bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-900 rounded overflow-hidden">
                      <div
                        className={`h-full transition-none ${
                          key === 'throttle' ? 'bg-amber-400' : 'bg-cyan-400'
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-[10px] font-mono-tabular text-zinc-400">
                      {key === 'throttle' && config.throttleBipolar
                        ? `${Math.round(val * 100)}%`
                        : `${val >= 0 ? '+' : ''}${val.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deadzone & Switch Bindings */}
        <div
          className={`${
            compact ? '' : 'lg:col-span-5'
          } p-3 rounded-lg bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between space-y-2.5`}
        >
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-200">
                Center Deadzone
              </span>
              <span className="font-mono-tabular text-amber-400">
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-zinc-200">
                Action Switches
              </span>
              <button
                type="button"
                onClick={() =>
                  applyPreset(
                    config.preset === 'rc-radio'
                      ? 'rc-radio'
                      : 'gamepad-standard'
                  )
                }
                className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {BUTTON_LABELS.map(({ key, label }) => {
                const isCap = capturingButton === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setCapturingAxis(null);
                      setCapturingButton(isCap ? null : key);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] border transition-colors cursor-pointer ${
                      isCap
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                        : 'bg-zinc-950 hover:bg-zinc-900 text-zinc-200 border-zinc-800'
                    }`}
                  >
                    <span className="truncate">{label}</span>
                    <span className="font-mono-tabular text-[10px] opacity-80 ml-1 shrink-0">
                      {isCap ? 'Press...' : `Btn ${config.buttons[key]}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
