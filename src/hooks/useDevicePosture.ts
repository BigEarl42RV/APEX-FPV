/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import { useEffect, useState } from 'react';

export interface DevicePosture {
  width: number;
  height: number;
  isNarrowCover: boolean;
  isShortLandscape: boolean;
  isTablet: boolean;
  isTouchPrimary: boolean;
  isFoldDualH: boolean;
  isFoldDualV: boolean;
  isConsoleBrowser: boolean;
  recommendedMaxDpr: number;
}

interface VisualViewportWithSegments extends VisualViewport {
  segments?: Array<{ x: number; y: number; width: number; height: number }>;
}

const CONSOLE_UA_PATTERN =
  /xbox|playstation|nintendobrowser|nintendo|smart-tv|smarttv|tizen|web0s|webos|bravia|viera|aft[a-z0-9]/i;

function computePosture(): DevicePosture {
  if (typeof window === 'undefined') {
    return {
      width: 1280,
      height: 720,
      isNarrowCover: false,
      isShortLandscape: false,
      isTablet: false,
      isTouchPrimary: false,
      isFoldDualH: false,
      isFoldDualV: false,
      isConsoleBrowser: false,
      recommendedMaxDpr: 2,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const minDim = Math.min(width, height);
  const coarsePointer =
    window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const touchPoints =
    typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0;
  const isTouchPrimary = coarsePointer || (touchPoints > 0 && minDim <= 1100);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isConsoleBrowser = CONSOLE_UA_PATTERN.test(ua);

  const vv = window.visualViewport as VisualViewportWithSegments | null;
  const segments = vv?.segments;
  const mediaFoldH =
    window.matchMedia?.('(horizontal-viewport-segments: 2)').matches ?? false;
  const mediaFoldV =
    window.matchMedia?.('(vertical-viewport-segments: 2)').matches ?? false;

  const isFoldDualH =
    mediaFoldH ||
    (Array.isArray(segments) &&
      segments.length === 2 &&
      Math.abs(segments[0].x - segments[1].x) > 10);

  const isFoldDualV =
    mediaFoldV ||
    (Array.isArray(segments) &&
      segments.length === 2 &&
      Math.abs(segments[0].y - segments[1].y) > 10);

  const isNarrowCover = width <= 395;
  const isShortLandscape = height <= 500 && width > height;
  const isTablet = isTouchPrimary && minDim >= 600 && width >= 600;

  const recommendedMaxDpr = isConsoleBrowser
    ? 1.25
    : isTouchPrimary
      ? 1.5
      : 2;

  return {
    width,
    height,
    isNarrowCover,
    isShortLandscape,
    isTablet,
    isTouchPrimary,
    isFoldDualH,
    isFoldDualV,
    isConsoleBrowser,
    recommendedMaxDpr,
  };
}

export function useDevicePosture(): DevicePosture {
  const [posture, setPosture] = useState<DevicePosture>(() => computePosture());

  useEffect(() => {
    const update = () => {
      const next = computePosture();
      setPosture(next);
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.consoleBrowser = next.isConsoleBrowser
          ? 'true'
          : 'false';
      }
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);

    const coarseMql = window.matchMedia?.('(pointer: coarse)');
    const foldHMql = window.matchMedia?.('(horizontal-viewport-segments: 2)');
    const foldVMql = window.matchMedia?.('(vertical-viewport-segments: 2)');
    coarseMql?.addEventListener?.('change', update);
    foldHMql?.addEventListener?.('change', update);
    foldVMql?.addEventListener?.('change', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      coarseMql?.removeEventListener?.('change', update);
      foldHMql?.removeEventListener?.('change', update);
      foldVMql?.removeEventListener?.('change', update);
    };
  }, []);

  return posture;
}
