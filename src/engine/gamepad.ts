/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import type {
  GamepadConfig,
  GamepadPresetId,
  StickInputs,
} from '../types/game';

const RC_RADIO_PATTERN =
  /radiomaster|edgetx|opentx|taranis|frsky|tbs|tango|mambo|jumper|betafpv|flysky|spektrum|futaba|commando/i;
const PLAYSTATION_PATTERN =
  /054c|sony|dualsense|dualshock|ps4|ps5|playstation/i;
const NINTENDO_PATTERN =
  /057e|nintendo|switch|pro controller|joy-con|joycon/i;
const XBOX_PATTERN =
  /045e|xbox|xinput|microsoft|steam|rog ally|legion go|razer/i;

export type GamepadBrandFamily =
  | 'xbox'
  | 'playstation'
  | 'nintendo'
  | 'rc-radio'
  | 'generic';

export interface GamepadGlyphSet {
  family: GamepadBrandFamily;
  brandLabel: string;
  dpad: string;
  confirm: string;
  back: string;
  cam: string;
  mode: string;
  tabPrev: string;
  tabNext: string;
  start: string;
}

export function detectGamepadBrand(gamepadId: string): GamepadBrandFamily {
  if (!gamepadId) return 'generic';
  if (RC_RADIO_PATTERN.test(gamepadId)) return 'rc-radio';
  if (PLAYSTATION_PATTERN.test(gamepadId)) return 'playstation';
  if (NINTENDO_PATTERN.test(gamepadId)) return 'nintendo';
  if (XBOX_PATTERN.test(gamepadId)) return 'xbox';
  return 'generic';
}

export function getGamepadGlyphs(gamepadId: string): GamepadGlyphSet {
  const family = detectGamepadBrand(gamepadId);
  switch (family) {
    case 'playstation':
      return {
        family,
        brandLabel: 'PlayStation',
        dpad: 'D-Pad',
        confirm: '✕',
        back: '◯',
        cam: '△',
        mode: '□',
        tabPrev: 'L1',
        tabNext: 'R1',
        start: 'Options',
      };
    case 'nintendo':
      return {
        family,
        brandLabel: 'Nintendo',
        dpad: 'D-Pad',
        confirm: 'B',
        back: 'A',
        cam: 'X',
        mode: 'Y',
        tabPrev: 'L',
        tabNext: 'R',
        start: '+',
      };
    case 'rc-radio':
      return {
        family,
        brandLabel: 'RC Radio',
        dpad: 'Stick',
        confirm: 'SW-A',
        back: 'SW-B',
        cam: 'SW-C',
        mode: 'SW-D',
        tabPrev: 'CH5',
        tabNext: 'CH6',
        start: 'ARM',
      };
    case 'xbox':
    case 'generic':
    default:
      return {
        family,
        brandLabel: family === 'xbox' ? 'Xbox' : 'Controller',
        dpad: 'D-Pad',
        confirm: 'A',
        back: 'B',
        cam: 'Y',
        mode: 'X',
        tabPrev: 'LB',
        tabNext: 'RB',
        start: 'Menu',
      };
  }
}

export function detectGamepadPreset(gamepadId: string): GamepadPresetId {
  return RC_RADIO_PATTERN.test(gamepadId) ? 'rc-radio' : 'gamepad-standard';
}

export function createDefaultGamepadConfig(
  preset: GamepadPresetId = 'gamepad-standard'
): GamepadConfig {
  if (preset === 'rc-radio') {
    // Standard EdgeTX / OpenTX USB HID Joystick channel order (AETR: Ch1=Roll, Ch2=Pitch, Ch3=Throttle, Ch4=Yaw)
    return {
      enabled: true,
      preset: 'rc-radio',
      autoDetectPreset: true,
      deadzone: 0.02,
      throttleBipolar: true,
      axes: {
        throttle: { index: 2, invert: false },
        yaw: { index: 3, invert: false },
        pitch: { index: 1, invert: false },
        roll: { index: 0, invert: false },
      },
      buttons: {
        switchCam: 0,
        cycleMode: 1,
        reset: 2,
        pause: 3,
      },
    };
  }

  // Standard Mode 2 Xbox / DualSense / Switch Pro layout
  // Left Stick: X=0 (Yaw), Y=1 (Throttle, up is -1 so invert: true)
  // Right Stick: X=2 (Roll), Y=3 (Pitch, up is -1 so invert: true)
  return {
    enabled: true,
    preset: 'gamepad-standard',
    autoDetectPreset: true,
    deadzone: 0.06,
    throttleBipolar: true,
    axes: {
      throttle: { index: 1, invert: true },
      yaw: { index: 0, invert: false },
      pitch: { index: 3, invert: true },
      roll: { index: 2, invert: false },
    },
    buttons: {
      switchCam: 3, // Y / Triangle
      cycleMode: 2, // X / Square
      reset: 1, // B / Circle
      pause: 9, // Start / Options
    },
  };
}

export function normalizeGamepadConfig(
  cfg?: Partial<GamepadConfig> | null
): GamepadConfig {
  const base = createDefaultGamepadConfig(
    cfg?.preset === 'rc-radio' ? 'rc-radio' : 'gamepad-standard'
  );
  if (!cfg) return base;
  return {
    enabled: cfg.enabled ?? base.enabled,
    preset: cfg.preset ?? base.preset,
    autoDetectPreset: cfg.autoDetectPreset ?? base.autoDetectPreset,
    deadzone: cfg.deadzone ?? base.deadzone,
    throttleBipolar: cfg.throttleBipolar ?? base.throttleBipolar,
    axes: {
      throttle: cfg.axes?.throttle ?? base.axes.throttle,
      yaw: cfg.axes?.yaw ?? base.axes.yaw,
      pitch: cfg.axes?.pitch ?? base.axes.pitch,
      roll: cfg.axes?.roll ?? base.axes.roll,
    },
    buttons: {
      switchCam: cfg.buttons?.switchCam ?? base.buttons.switchCam,
      cycleMode: cfg.buttons?.cycleMode ?? base.buttons.cycleMode,
      reset: cfg.buttons?.reset ?? base.buttons.reset,
      pause: cfg.buttons?.pause ?? base.buttons.pause,
    },
  };
}

function applyDeadzone(val: number, deadzone: number): number {
  const abs = Math.abs(val);
  if (abs <= deadzone) return 0;
  const scaled = (abs - deadzone) / Math.max(0.01, 1 - deadzone);
  return Math.sign(val) * Math.min(1, scaled);
}

export interface GamepadPollOut {
  connected: boolean;
  id: string;
  active: boolean;
  sticks: StickInputs;
  triggerSwitchCam: boolean;
  triggerCycleMode: boolean;
  triggerReset: boolean;
  triggerPause: boolean;
  triggerFire: boolean;
}

export function createGamepadPollOut(): GamepadPollOut {
  return {
    connected: false,
    id: '',
    active: false,
    sticks: { throttle: 0, yaw: 0, pitch: 0, roll: 0 },
    triggerSwitchCam: false,
    triggerCycleMode: false,
    triggerReset: false,
    triggerPause: false,
    triggerFire: false,
  };
}

export function getFirstConnectedGamepad(): Gamepad | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  const pads = navigator.getGamepads();
  for (let i = 0; i < pads.length; i++) {
    const p = pads[i];
    if (p && p.connected) return p;
  }
  return null;
}

/**
 * Zero-GC 60fps gamepad polling into a pre-allocated GamepadPollOut object.
 */
export function pollGamepadInto(
  config: GamepadConfig,
  prevButtons: boolean[],
  out: GamepadPollOut
): void {
  out.triggerSwitchCam = false;
  out.triggerCycleMode = false;
  out.triggerReset = false;
  out.triggerPause = false;
  out.triggerFire = false;
  out.active = false;

  const pad = getFirstConnectedGamepad();
  if (!pad || !config.enabled) {
    out.connected = Boolean(pad);
    out.id = pad?.id ?? '';
    return;
  }

  out.connected = true;
  out.id = pad.id;

  const axes = pad.axes;
  const dz = config.deadzone;

  const readAxis = (idx: number, invert: boolean): number => {
    if (idx < 0 || idx >= axes.length) return 0;
    const raw = axes[idx] ?? 0;
    return invert ? -raw : raw;
  };

  const rawThr = readAxis(config.axes.throttle.index, config.axes.throttle.invert);
  const thrNorm = config.throttleBipolar
    ? Math.max(0, Math.min(1, (rawThr + 1) * 0.5))
    : Math.max(0, Math.min(1, rawThr));

  const yawVal = applyDeadzone(
    readAxis(config.axes.yaw.index, config.axes.yaw.invert),
    dz
  );
  const pitchVal = applyDeadzone(
    readAxis(config.axes.pitch.index, config.axes.pitch.invert),
    dz
  );
  const rollVal = applyDeadzone(
    readAxis(config.axes.roll.index, config.axes.roll.invert),
    dz
  );

  out.sticks.throttle = thrNorm;
  out.sticks.yaw = yawVal;
  out.sticks.pitch = pitchVal;
  out.sticks.roll = rollVal;

  // Consider controller actively commanding if sticks move beyond deadzone or throttle raised (> 4%)
  if (
    Math.abs(yawVal) > 0.01 ||
    Math.abs(pitchVal) > 0.01 ||
    Math.abs(rollVal) > 0.01 ||
    (config.preset === 'rc-radio' ? thrNorm > 0.03 : Math.abs(rawThr) > dz + 0.05)
  ) {
    out.active = true;
  }

  // Edge-detect mapped action buttons
  const btns = pad.buttons;
  const isJustPressed = (btnIdx: number): boolean => {
    if (btnIdx < 0 || btnIdx >= btns.length) return false;
    const pressed = Boolean(btns[btnIdx]?.pressed);
    const wasPressed = Boolean(prevButtons[btnIdx]);
    return pressed && !wasPressed;
  };

  out.triggerSwitchCam = isJustPressed(config.buttons.switchCam);
  out.triggerCycleMode = isJustPressed(config.buttons.cycleMode);
  out.triggerReset = isJustPressed(config.buttons.reset);
  out.triggerPause = isJustPressed(config.buttons.pause);
  out.triggerFire = isJustPressed(5) || isJustPressed(7);

  for (let i = 0; i < btns.length; i++) {
    prevButtons[i] = Boolean(btns[i]?.pressed);
  }
}

export interface LiveGamepadSnapshot {
  connected: boolean;
  id: string;
  axes: number[];
  pressedButtons: number[];
}

export function sampleLiveGamepadSnapshot(): LiveGamepadSnapshot {
  const pad = getFirstConnectedGamepad();
  if (!pad) {
    return { connected: false, id: '', axes: [], pressedButtons: [] };
  }
  const pressedButtons: number[] = [];
  for (let i = 0; i < pad.buttons.length; i++) {
    if (pad.buttons[i]?.pressed) pressedButtons.push(i);
  }
  return {
    connected: true,
    id: pad.id,
    axes: Array.from(pad.axes, (v) => Number(v.toFixed(3))),
    pressedButtons,
  };
}
