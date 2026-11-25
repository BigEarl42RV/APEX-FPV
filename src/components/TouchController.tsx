/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Crosshair, Eye, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useDevicePosture } from '../hooks/useDevicePosture';
import type {
  CameraView,
  FlightMode,
  HudDensityMode,
  StickInputs,
  StickMode,
  TouchSticksMode,
} from '../types/game';

interface TouchControllerProps {
  stickMode: StickMode;
  flightMode: FlightMode;
  cameraView: CameraView;
  hudDensity: HudDensityMode;
  touchSticksMode: TouchSticksMode;
  gamepadConnected: boolean;
  muted: boolean;
  showFireButton?: boolean;
  fireLabel?: string;
  touchSticksRef: React.MutableRefObject<StickInputs>;
  onFireLaser?: () => void;
  onCycleFlightMode: () => void;
  onToggleCamera: () => void;
  onToggleHudDensity: () => void;
  onResetDrone: () => void;
  onToggleMute: () => void;
  onPause: () => void;
}

export const TouchController: React.FC<TouchControllerProps> = ({
  stickMode,
  flightMode,
  cameraView,
  hudDensity,
  touchSticksMode,
  gamepadConnected,
  muted,
  showFireButton = false,
  fireLabel = 'FIRE',
  touchSticksRef,
  onFireLaser,
  onCycleFlightMode,
  onToggleCamera,
  onToggleHudDensity,
  onResetDrone,
  onToggleMute,
  onPause,
}) => {
  const posture = useDevicePosture();
  const padRadius = posture.isNarrowCover
    ? 34
    : posture.isTablet
      ? 50
      : 44;
  const padDiameterClass = posture.isNarrowCover
    ? 'w-[88px] h-[88px]'
    : posture.isTablet
      ? 'w-32 h-32'
      : 'w-28 h-28';

  const leftKnobRef = useRef<HTMLDivElement | null>(null);
  const rightKnobRef = useRef<HTMLDivElement | null>(null);
  const throttleReadoutRef = useRef<HTMLSpanElement | null>(null);

  const leftPointerId = useRef<number | null>(null);
  const rightPointerId = useRef<number | null>(null);

  // Auto-detect touch devices vs desktop keyboard/gamepad
  const [touchActive, setTouchActive] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(pointer: coarse)').matches
      : false
  );

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        setTouchActive(true);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'KeyW' ||
        e.code === 'KeyS' ||
        e.code === 'KeyA' ||
        e.code === 'KeyD' ||
        e.code.startsWith('Arrow')
      ) {
        setTouchActive(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const sticksVisible =
    touchSticksMode === 'always'
      ? true
      : touchSticksMode === 'hidden'
        ? false
        : (touchActive || posture.isTouchPrimary) && !gamepadConnected;

  // Normalized coordinates: x in [-1, 1], y in [-1, 1] (top = +1, bottom = -1)
  const leftPos = useRef({ x: 0, y: stickMode === 'mode2' ? -0.45 : 0 });
  const rightPos = useRef({ x: 0, y: stickMode === 'mode1' ? -0.45 : 0 });

  const syncRefsToSticks = useCallback(() => {
    const lx = leftPos.current.x;
    const ly = leftPos.current.y;
    const rx = rightPos.current.x;
    const ry = rightPos.current.y;

    const throttleRaw =
      stickMode === 'mode2' ? (ly + 1) * 0.5 : (ry + 1) * 0.5;
    const pitchRaw = stickMode === 'mode2' ? ry : ly;

    touchSticksRef.current.throttle = Math.max(0, Math.min(1, throttleRaw));
    touchSticksRef.current.yaw = lx;
    touchSticksRef.current.pitch = pitchRaw;
    touchSticksRef.current.roll = rx;

    if (leftKnobRef.current) {
      leftKnobRef.current.style.transform = `translate3d(${lx * padRadius}px, ${-ly * padRadius}px, 0)`;
    }
    if (rightKnobRef.current) {
      rightKnobRef.current.style.transform = `translate3d(${rx * padRadius}px, ${-ry * padRadius}px, 0)`;
    }
    if (throttleReadoutRef.current) {
      throttleReadoutRef.current.textContent = `${Math.round(touchSticksRef.current.throttle * 100)}%`;
    }
  }, [padRadius, stickMode, touchSticksRef]);

  useEffect(() => {
    leftPos.current = { x: 0, y: stickMode === 'mode2' ? -0.45 : 0 };
    rightPos.current = { x: 0, y: stickMode === 'mode1' ? -0.45 : 0 };
    syncRefsToSticks();
  }, [stickMode, sticksVisible, syncRefsToSticks]);

  const computeGimbalNorm = (
    el: HTMLElement,
    clientX: number,
    clientY: number
  ) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    let dx = (clientX - cx) / padRadius;
    let dy = -(clientY - cy) / padRadius;
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    return {
      x: Math.abs(dx) < 0.04 ? 0 : dx,
      y: dy,
    };
  };

  const handleLeftDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    leftPointerId.current = e.pointerId;
    const norm = computeGimbalNorm(e.currentTarget, e.clientX, e.clientY);
    leftPos.current.x = norm.x;
    leftPos.current.y = norm.y;
    syncRefsToSticks();
  };

  const handleLeftMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerId.current !== e.pointerId) return;
    const norm = computeGimbalNorm(e.currentTarget, e.clientX, e.clientY);
    leftPos.current.x = norm.x;
    leftPos.current.y = norm.y;
    syncRefsToSticks();
  };

  const handleLeftUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerId.current !== e.pointerId) return;
    leftPointerId.current = null;
    leftPos.current.x = 0;
    if (stickMode === 'mode1') {
      leftPos.current.y = 0;
    }
    syncRefsToSticks();
  };

  const handleRightDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    rightPointerId.current = e.pointerId;
    const norm = computeGimbalNorm(e.currentTarget, e.clientX, e.clientY);
    rightPos.current.x = norm.x;
    rightPos.current.y = norm.y;
    syncRefsToSticks();
  };

  const handleRightMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (rightPointerId.current !== e.pointerId) return;
    const norm = computeGimbalNorm(e.currentTarget, e.clientX, e.clientY);
    rightPos.current.x = norm.x;
    rightPos.current.y = norm.y;
    syncRefsToSticks();
  };

  const handleRightUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (rightPointerId.current !== e.pointerId) return;
    rightPointerId.current = null;
    rightPos.current.x = 0;
    if (stickMode === 'mode2') {
      rightPos.current.y = 0;
    }
    syncRefsToSticks();
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-end safe-inset-container">
      <div className="p-2 sm:p-4">
        {/* Bottom Slim Corner-Friendly Quick Bar + Auto-Hide Touch Gimbals */}
        <div className="relative flex items-end justify-between gap-1.5 sm:gap-2">
          {/* Left Translucent Touch Gimbal (Only shown on touch devices or manual override) */}
          {sticksVisible ? (
            <div className="pointer-events-auto flex flex-col items-center gap-1 shrink-0">
              <div className="text-[10px] font-mono-tabular text-zinc-300/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
                <span>{stickMode === 'mode2' ? 'THR' : 'PIT'}·YAW</span>
                {stickMode === 'mode2' && (
                  <span ref={throttleReadoutRef} className="text-amber-400 ml-1">
                    28%
                  </span>
                )}
              </div>
              <div
                onPointerDown={handleLeftDown}
                onPointerMove={handleLeftMove}
                onPointerUp={handleLeftUp}
                onPointerCancel={handleLeftUp}
                className={`relative ${padDiameterClass} rounded-full bg-zinc-950/35 border border-white/15 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing`}
              >
                <div
                  ref={leftKnobRef}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900/90 border border-amber-400/90 shadow flex items-center justify-center pointer-events-none"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </div>
              </div>
            </div>
          ) : (
            <div aria-hidden="true" />
          )}

          {/* Whisper-Quiet Compact Action Bar (Stays low out of flight corridor) */}
          <div
            className={`pointer-events-auto flex items-center gap-0.5 sm:gap-1 bg-zinc-950/55 hover:bg-zinc-950/90 border border-zinc-800/75 rounded-lg px-1 sm:px-1.5 py-1 transition-opacity ${
              hudDensity === 'pure'
                ? 'opacity-30 hover:opacity-100'
                : 'opacity-65 hover:opacity-100'
            }`}
          >
            {showFireButton && onFireLaser && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onFireLaser();
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-[11px] font-display font-bold text-zinc-950 bg-rose-500 hover:bg-rose-400 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Fire Pulse (F / Click / RB)"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>{fireLabel}</span>
              </button>
            )}
            {hudDensity !== 'pure' && (
              <>
                <button
                  type="button"
                  onClick={onCycleFlightMode}
                  className="px-1.5 sm:px-2 py-1.5 text-[10px] sm:text-[11px] font-semibold text-amber-400 hover:bg-zinc-800 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title="Switch Flight Mode (M)"
                >
                  {flightMode === 'acro'
                    ? 'Acro'
                    : flightMode === 'airmode'
                      ? 'Air'
                      : 'Angle'}
                </button>
                <button
                  type="button"
                  onClick={onToggleCamera}
                  className="flex items-center gap-1 px-1.5 sm:px-2 py-1.5 text-[10px] sm:text-[11px] font-medium text-zinc-200 hover:bg-zinc-800 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title="Switch Camera (C)"
                >
                  <Camera className="w-3 h-3 text-cyan-400" />
                  <span className="hidden xs:inline sm:inline">
                    {cameraView === 'fpv' ? 'FPV' : 'Chase'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onResetDrone}
                  className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  aria-label="Reset Drone"
                  title="Reset to Grid (R)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
                  title="Toggle Audio"
                >
                  {muted ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onToggleHudDensity}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1.5 text-[10px] sm:text-[11px] font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Toggle Minimal / Pure HUD (H)"
            >
              <Eye className="w-3 h-3 text-zinc-400" />
              <span className="hidden sm:inline">
                {hudDensity === 'minimal' ? 'HUD' : 'Pure'}
              </span>
            </button>

            <button
              type="button"
              onClick={onPause}
              className="flex items-center gap-1 px-2 py-1.5 text-[10px] sm:text-[11px] font-semibold text-zinc-100 bg-zinc-800/80 hover:bg-zinc-700 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Pause (Esc)"
            >
              <Pause className="w-3 h-3" />
              <span className="hidden sm:inline">Pause</span>
            </button>
          </div>

          {/* Right Translucent Touch Gimbal (Only shown on touch devices or manual override) */}
          {sticksVisible ? (
            <div className="pointer-events-auto flex flex-col items-center gap-1 shrink-0">
              <div className="text-[10px] font-mono-tabular text-zinc-300/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
                <span>{stickMode === 'mode2' ? 'PIT' : 'THR'}·ROLL</span>
              </div>
              <div
                onPointerDown={handleRightDown}
                onPointerMove={handleRightMove}
                onPointerUp={handleRightUp}
                onPointerCancel={handleRightUp}
                className={`relative ${padDiameterClass} rounded-full bg-zinc-950/35 border border-white/15 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing`}
              >
                <div
                  ref={rightKnobRef}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900/90 border border-cyan-400/90 shadow flex items-center justify-center pointer-events-none"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                </div>
              </div>
            </div>
          ) : (
            <div aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
};
