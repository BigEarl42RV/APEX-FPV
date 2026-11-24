import React, { useCallback, useEffect, useRef } from 'react';
import { Camera, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { CameraView, FlightMode, StickInputs, StickMode } from '../types/game';

interface TouchControllerProps {
  stickMode: StickMode;
  flightMode: FlightMode;
  cameraView: CameraView;
  muted: boolean;
  touchSticksRef: React.MutableRefObject<StickInputs>;
  onCycleFlightMode: () => void;
  onToggleCamera: () => void;
  onResetDrone: () => void;
  onToggleMute: () => void;
  onPause: () => void;
}

const PAD_RADIUS = 58; // px travel radius inside 144x144 gimbal housing

export const TouchController: React.FC<TouchControllerProps> = ({
  stickMode,
  flightMode,
  cameraView,
  muted,
  touchSticksRef,
  onCycleFlightMode,
  onToggleCamera,
  onResetDrone,
  onToggleMute,
  onPause,
}) => {
  const leftKnobRef = useRef<HTMLDivElement | null>(null);
  const rightKnobRef = useRef<HTMLDivElement | null>(null);
  const throttleReadoutRef = useRef<HTMLSpanElement | null>(null);

  const leftPointerId = useRef<number | null>(null);
  const rightPointerId = useRef<number | null>(null);

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
      leftKnobRef.current.style.transform = `translate3d(${lx * PAD_RADIUS}px, ${-ly * PAD_RADIUS}px, 0)`;
    }
    if (rightKnobRef.current) {
      rightKnobRef.current.style.transform = `translate3d(${rx * PAD_RADIUS}px, ${-ry * PAD_RADIUS}px, 0)`;
    }
    if (throttleReadoutRef.current) {
      throttleReadoutRef.current.textContent = `${Math.round(touchSticksRef.current.throttle * 100)}%`;
    }
  }, [stickMode, touchSticksRef]);

  useEffect(() => {
    leftPos.current = { x: 0, y: stickMode === 'mode2' ? -0.45 : 0 };
    rightPos.current = { x: 0, y: stickMode === 'mode1' ? -0.45 : 0 };
    syncRefsToSticks();
  }, [stickMode, syncRefsToSticks]);

  const computeGimbalNorm = (
    el: HTMLElement,
    clientX: number,
    clientY: number
  ) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    let dx = (clientX - cx) / PAD_RADIUS;
    let dy = -(clientY - cy) / PAD_RADIUS; // up is positive
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    // Subtle 4% center deadzone on self-centering axes
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
    leftPos.current.x = 0; // Yaw always self-centers
    // In Mode 2, throttle (left Y) stays at set position! In Mode 1, left Y is pitch (self-centers)
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
    rightPos.current.x = 0; // Roll always self-centers
    if (stickMode === 'mode2') {
      rightPos.current.y = 0; // Pitch self-centers in Mode 2
    }
    syncRefsToSticks();
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 sm:p-5">
      {/* Top Action Strip (Shoulder Switches) */}
      <div className="flex items-start justify-between gap-3">
        <div className="pointer-events-auto flex items-center gap-1.5 bg-zinc-950/85 border border-zinc-800 rounded-lg p-1">
          <button
            type="button"
            onClick={onCycleFlightMode}
            className="px-3 py-1.5 text-xs font-semibold tracking-wide text-amber-400 hover:bg-zinc-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Switch Flight Mode (M)"
          >
            {flightMode === 'acro'
              ? 'Acro Rate'
              : flightMode === 'airmode'
                ? 'Airmode'
                : 'Angle Level'}
          </button>
          <span className="text-zinc-700" aria-hidden="true">
            |
          </span>
          <button
            type="button"
            onClick={onToggleCamera}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Switch Camera (C)"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>{cameraView === 'fpv' ? 'FPV Cam' : 'Chase Cam'}</span>
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 bg-zinc-950/85 border border-zinc-800 rounded-lg p-1">
          <button
            type="button"
            onClick={onResetDrone}
            className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
            aria-label="Reset Drone"
            title="Reset to Grid (R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            title="Toggle Audio"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
          <button
            type="button"
            onClick={onPause}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>
        </div>
      </div>

      {/* Bottom Dual-Gimbal RC Transmitter Sticks */}
      <div className="flex items-end justify-between gap-4 pb-1 sm:pb-2">
        {/* Left Gimbal */}
        <div className="pointer-events-auto flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-zinc-300 bg-zinc-950/80 px-2.5 py-0.5 rounded border border-zinc-800">
            <span>{stickMode === 'mode2' ? 'THR' : 'PIT'}</span>
            <span className="text-zinc-600">·</span>
            <span>YAW</span>
            {stickMode === 'mode2' && (
              <>
                <span className="text-zinc-600">·</span>
                <span ref={throttleReadoutRef} className="text-amber-400 font-semibold">
                  28%
                </span>
              </>
            )}
          </div>
          <div
            onPointerDown={handleLeftDown}
            onPointerMove={handleLeftMove}
            onPointerUp={handleLeftUp}
            onPointerCancel={handleLeftUp}
            className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-2xl bg-zinc-950/80 border border-zinc-700/80 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
          >
            {/* Gimbal guide rails & throttle notches */}
            <svg
              viewBox="0 0 144 144"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <circle
                cx="72"
                cy="72"
                r="58"
                fill="none"
                stroke="#27272a"
                strokeWidth="1.5"
              />
              <line x1="72" y1="14" x2="72" y2="130" stroke="#3f3f46" strokeWidth="1" />
              <line x1="14" y1="72" x2="130" y2="72" stroke="#3f3f46" strokeWidth="1" />
              {[28, 50, 72, 94, 116].map((yPos) => (
                <line
                  key={yPos}
                  x1="65"
                  y1={yPos}
                  x2="79"
                  y2={yPos}
                  stroke="#52525b"
                  strokeWidth="1"
                />
              ))}
            </svg>
            {/* Machined aluminum gimbal stick head */}
            <div
              ref={leftKnobRef}
              className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-amber-500/90 shadow-lg flex items-center justify-center pointer-events-none"
            >
              <div className="w-5 h-5 rounded-full border border-zinc-500 bg-zinc-900 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Center subtle hint on desktop */}
        <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-400 bg-zinc-950/75 border border-zinc-800/80 px-3 py-1 rounded">
          <span>W/S Throttle</span>
          <span aria-hidden="true">·</span>
          <span>A/D Yaw</span>
          <span aria-hidden="true">·</span>
          <span>Arrows Pitch/Roll</span>
          <span aria-hidden="true">·</span>
          <span>Drag Gimbals</span>
        </div>

        {/* Right Gimbal */}
        <div className="pointer-events-auto flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-zinc-300 bg-zinc-950/80 px-2.5 py-0.5 rounded border border-zinc-800">
            <span>{stickMode === 'mode2' ? 'PIT' : 'THR'}</span>
            <span className="text-zinc-600">·</span>
            <span>ROLL</span>
          </div>
          <div
            onPointerDown={handleRightDown}
            onPointerMove={handleRightMove}
            onPointerUp={handleRightUp}
            onPointerCancel={handleRightUp}
            className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-2xl bg-zinc-950/80 border border-zinc-700/80 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
          >
            <svg
              viewBox="0 0 144 144"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <circle
                cx="72"
                cy="72"
                r="58"
                fill="none"
                stroke="#27272a"
                strokeWidth="1.5"
              />
              <circle
                cx="72"
                cy="72"
                r="14"
                fill="none"
                stroke="#3f3f46"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <line x1="72" y1="14" x2="72" y2="130" stroke="#3f3f46" strokeWidth="1" />
              <line x1="14" y1="72" x2="130" y2="72" stroke="#3f3f46" strokeWidth="1" />
            </svg>
            <div
              ref={rightKnobRef}
              className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-cyan-400/90 shadow-lg flex items-center justify-center pointer-events-none"
            >
              <div className="w-5 h-5 rounded-full border border-zinc-500 bg-zinc-900 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
