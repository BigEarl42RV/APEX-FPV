/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import { useEffect, useRef } from 'react';
import { getFirstConnectedGamepad } from '../engine/gamepad';

interface UseGamepadMenuNavOptions {
  enabled: boolean;
  onBack?: () => void;
  onStart?: () => void;
}

type NavDir = 'up' | 'down' | 'left' | 'right';

function isElementVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') {
    return false;
  }
  const style = getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none' || style.pointerEvents === 'none') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 4 && rect.height > 4;
}

function getActiveNavContainer(): HTMLElement {
  const scopes = Array.from(
    document.querySelectorAll<HTMLElement>('[data-gp-scope="true"]')
  );
  if (scopes.length > 0) {
    // Pick the topmost scope by z-index / DOM order
    let best = scopes[scopes.length - 1];
    let bestZ = -Infinity;
    for (const s of scopes) {
      const zRaw = Number.parseInt(getComputedStyle(s).zIndex || '0', 10);
      const z = Number.isNaN(zRaw) ? 0 : zRaw;
      if (z >= bestZ) {
        bestZ = z;
        best = s;
      }
    }
    return best;
  }
  return document.body;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const raw = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input[type="range"]:not(:disabled), input[type="checkbox"]:not(:disabled), input[type="text"]:not(:disabled), a[href]'
    )
  );
  return raw.filter((el) => {
    if (el.dataset.gpSkip === 'true') return false;
    return isElementVisible(el);
  });
}

function findNextSpatialTarget(
  current: HTMLElement | null,
  candidates: HTMLElement[],
  dir: NavDir
): HTMLElement | null {
  if (candidates.length === 0) return null;
  if (!current || !candidates.includes(current)) {
    return candidates[0];
  }

  const curRect = current.getBoundingClientRect();
  const cx = curRect.left + curRect.width * 0.5;
  const cy = curRect.top + curRect.height * 0.5;

  let bestEl: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of candidates) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const tx = r.left + r.width * 0.5;
    const ty = r.top + r.height * 0.5;
    const dx = tx - cx;
    const dy = ty - cy;

    let primary = 0;
    let ortho = 0;

    if (dir === 'right') {
      if (dx <= 6) continue;
      primary = dx;
      ortho = Math.abs(dy);
    } else if (dir === 'left') {
      if (dx >= -6) continue;
      primary = -dx;
      ortho = Math.abs(dy);
    } else if (dir === 'down') {
      if (dy <= 6) continue;
      primary = dy;
      ortho = Math.abs(dx);
    } else if (dir === 'up') {
      if (dy >= -6) continue;
      primary = -dy;
      ortho = Math.abs(dx);
    }

    // Weight orthogonal deviation so same-row / same-column moves feel crisp
    const score = primary + ortho * 2.15;
    if (score < bestScore) {
      bestScore = score;
      bestEl = el;
    }
  }

  return bestEl;
}

export function useGamepadMenuNav({
  enabled,
  onBack,
  onStart,
}: UseGamepadMenuNavOptions): void {
  const focusedElRef = useRef<HTMLElement | null>(null);
  const callbacksRef = useRef({ onBack, onStart });
  callbacksRef.current = { onBack, onStart };

  useEffect(() => {
    const clearFocus = () => {
      if (focusedElRef.current) {
        focusedElRef.current.removeAttribute('data-gp-focus');
        focusedElRef.current = null;
      }
      document
        .querySelectorAll<HTMLElement>('[data-gp-focus="true"]')
        .forEach((el) => el.removeAttribute('data-gp-focus'));
    };

    if (!enabled) {
      clearFocus();
      return;
    }

    const setFocus = (el: HTMLElement | null) => {
      if (focusedElRef.current && focusedElRef.current !== el) {
        focusedElRef.current.removeAttribute('data-gp-focus');
      }
      focusedElRef.current = el;
      if (el) {
        el.setAttribute('data-gp-focus', 'true');
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    };

    const onMouseOrTouch = () => {
      // Clear controller highlight when user interacts with mouse or touch directly
      clearFocus();
    };
    window.addEventListener('pointerdown', onMouseOrTouch, { passive: true });

    let raf = 0;
    const prevButtons: boolean[] = [];
    let lastDirTime = 0;
    let lastHeldDir: NavDir | null = null;

    const cycleTabStrip = (delta: -1 | 1) => {
      const scope = getActiveNavContainer();
      const tabButtons = Array.from(
        scope.querySelectorAll<HTMLElement>('[data-gp-tab="true"]')
      ).filter((el) => isElementVisible(el));
      if (tabButtons.length < 2) return;
      let activeIdx = tabButtons.findIndex(
        (b) => b.dataset.gpTabActive === 'true' || b.getAttribute('aria-selected') === 'true'
      );
      if (activeIdx < 0) activeIdx = 0;
      const nextIdx = (activeIdx + delta + tabButtons.length) % tabButtons.length;
      const target = tabButtons[nextIdx];
      target.click();
      setFocus(target);
    };

    const adjustFocusedSlider = (deltaSign: -1 | 1): boolean => {
      const el = focusedElRef.current;
      if (!el || !(el instanceof HTMLInputElement) || el.type !== 'range') {
        return false;
      }
      const min = Number(el.min || '0');
      const max = Number(el.max || '100');
      const step = Number(el.step || '1') || (max - min) / 20;
      const cur = Number(el.value);
      const next = Math.max(min, Math.min(max, cur + deltaSign * step));
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(el, String(next));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };

    const loop = (now: number) => {
      const pad = getFirstConnectedGamepad();
      if (pad) {
        const btns = pad.buttons;
        const justPressed = (idx: number) =>
          Boolean(btns[idx]?.pressed) && !Boolean(prevButtons[idx]);

        const ax0 = pad.axes[0] ?? 0;
        const ax1 = pad.axes[1] ?? 0;

        let activeDir: NavDir | null = null;
        if (btns[12]?.pressed || ax1 < -0.58) activeDir = 'up';
        else if (btns[13]?.pressed || ax1 > 0.58) activeDir = 'down';
        else if (btns[14]?.pressed || ax0 < -0.58) activeDir = 'left';
        else if (btns[15]?.pressed || ax0 > 0.58) activeDir = 'right';

        if (activeDir) {
          const isNewDir = activeDir !== lastHeldDir;
          if (isNewDir || now - lastDirTime >= 200) {
            lastDirTime = now;
            lastHeldDir = activeDir;

            if (
              (activeDir === 'left' || activeDir === 'right') &&
              adjustFocusedSlider(activeDir === 'right' ? 1 : -1)
            ) {
              // Adjusted active slider
            } else {
              const scope = getActiveNavContainer();
              const candidates = getFocusableElements(scope);
              const cur =
                focusedElRef.current && candidates.includes(focusedElRef.current)
                  ? focusedElRef.current
                  : null;
              const next = findNextSpatialTarget(cur, candidates, activeDir);
              if (next) {
                setFocus(next);
              } else if (!cur && candidates[0]) {
                setFocus(candidates[0]);
              }
            }
          }
        } else {
          lastHeldDir = null;
        }

        // Confirm (A / Cross)
        if (justPressed(0)) {
          const scope = getActiveNavContainer();
          const candidates = getFocusableElements(scope);
          const cur =
            focusedElRef.current && candidates.includes(focusedElRef.current)
              ? focusedElRef.current
              : candidates[0] ?? null;
          if (cur) {
            setFocus(cur);
            if (cur instanceof HTMLInputElement && cur.type === 'text') {
              cur.focus();
            } else {
              cur.click();
            }
          }
        }

        // Back / Close (B / Circle)
        if (justPressed(1)) {
          callbacksRef.current.onBack?.();
        }

        // Bumper Tab Switch (LB/L1 & RB/R1)
        if (justPressed(4)) {
          cycleTabStrip(-1);
        } else if (justPressed(5)) {
          cycleTabStrip(1);
        }

        // Start / Options
        if (justPressed(9)) {
          callbacksRef.current.onStart?.();
        }

        for (let i = 0; i < btns.length; i++) {
          prevButtons[i] = Boolean(btns[i]?.pressed);
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', onMouseOrTouch);
      clearFocus();
    };
  }, [enabled]);
}
