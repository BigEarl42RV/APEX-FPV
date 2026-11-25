/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React, { useState } from 'react';
import { Download, Gamepad2, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { getGamepadGlyphs } from '../engine/gamepad';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`flex items-center justify-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-display font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-0 ${
          compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center justify-center gap-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-cyan-500/50 text-cyan-300 font-display font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-0 ${
            compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            data-gp-scope="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 safe-inset-container"
          >
            <div className="w-full max-w-sm rounded-xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-display font-bold text-white">
                      Install on iPhone / iPad
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Fullscreen standalone cockpit
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                  aria-label="Close iOS install instructions"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol className="space-y-2 text-xs text-zinc-300 leading-relaxed bg-zinc-900/70 border border-zinc-800 rounded-lg p-3.5">
                <li>
                  <strong className="text-amber-400">1.</strong> Tap the{' '}
                  <strong className="text-white">Share</strong> button in Safari&apos;s bottom or top bar.
                </li>
                <li>
                  <strong className="text-amber-400">2.</strong> Scroll down and choose{' '}
                  <strong className="text-white">Add to Home Screen</strong>.
                </li>
                <li>
                  <strong className="text-amber-400">3.</strong> Tap{' '}
                  <strong className="text-white">Add</strong> to launch Stratum FPV without browser bars.
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-xs cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed z-50 pointer-events-none flex items-center gap-2 rounded-lg bg-zinc-950/95 border border-amber-500/60 px-3 py-1.5 text-xs font-medium text-amber-300 shadow-lg"
      style={{
        top: 'calc(var(--safe-top) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span className="whitespace-nowrap">
        Offline Mode · Local Tracks &amp; Hangar Ready
      </span>
    </div>
  );
};

interface ConsolePromptBarProps {
  gamepadConnected: boolean;
  gamepadId: string;
  showTabHint?: boolean;
  startLabel?: string;
}

export const ConsolePromptBar: React.FC<ConsolePromptBarProps> = ({
  gamepadConnected,
  gamepadId,
  showTabHint = false,
  startLabel = 'Launch',
}) => {
  if (!gamepadConnected) return null;
  const g = getGamepadGlyphs(gamepadId);

  return (
    <div
      aria-hidden="true"
      className="fixed z-50 pointer-events-none left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-zinc-950/94 border border-zinc-800 text-[11px] font-mono-tabular text-zinc-300 shadow-xl whitespace-nowrap"
      style={{
        bottom: 'calc(var(--safe-bottom) + var(--overscan-pad) + 8px)',
      }}
    >
      <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
        <Gamepad2 className="w-3.5 h-3.5" />
        <span>{g.brandLabel}</span>
      </span>
      <span className="text-zinc-600">·</span>
      <span>
        <strong className="text-amber-400">{g.dpad}</strong> Navigate
      </span>
      <span>
        <strong className="text-amber-400">{g.confirm}</strong> Select
      </span>
      <span>
        <strong className="text-zinc-100">{g.back}</strong> Back
      </span>
      {showTabHint && (
        <span>
          <strong className="text-cyan-400">
            {g.tabPrev}/{g.tabNext}
          </strong>{' '}
          Tabs
        </span>
      )}
      <span>
        <strong className="text-emerald-400">{g.start}</strong> {startLabel}
      </span>
    </div>
  );
};
