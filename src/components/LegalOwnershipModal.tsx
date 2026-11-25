/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */

import React, { useEffect } from 'react';
import {
  CheckCircle2,
  Copyright,
  FileText,
  Lock,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  BRAND_IDENTITY,
  type RuntimeIntegrityReport,
} from '../engine/ownershipGuard';

interface LegalOwnershipModalProps {
  integrity: RuntimeIntegrityReport;
  onClose: () => void;
}

export const LegalOwnershipModal: React.FC<LegalOwnershipModalProps> = ({
  integrity,
  onClose,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      data-gp-scope="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-3 sm:p-6 overflow-y-auto safe-inset-container"
    >
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-white">
                Ownership, Copyright &amp; Legal Notice
              </h2>
              <p className="text-xs text-zinc-400">
                {BRAND_IDENTITY.appTitle} · Designed &amp; Operated by{' '}
                <span className="text-amber-400 font-semibold">
                  {BRAND_IDENTITY.studioName}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
            aria-label="Close legal notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 text-xs text-zinc-300 leading-relaxed max-h-[68dvh] overflow-y-auto flex-1">
          {/* Primary Ownership Banner */}
          <div className="p-4 rounded-lg bg-zinc-900/85 border border-amber-500/35 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-display font-bold text-white">
                <Copyright className="w-4 h-4 text-amber-400" />
                <span>{BRAND_IDENTITY.copyrightNotice}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-[10px] font-mono-tabular font-semibold text-amber-300">
                {BRAND_IDENTITY.licenseTag}
              </span>
            </div>
            <p className="text-zinc-300">
              <strong className="text-white">{BRAND_IDENTITY.appTitle}</strong>,
              including its 6-DOF aerodynamic flight physics engine, procedural 3D
              drone &amp; circuit architecture, avionics HUD software systems,
              audio synthesis, and user interface, is original proprietary software
              owned and operated exclusively by{' '}
              <strong className="text-amber-300">
                {BRAND_IDENTITY.studioName}
              </strong>
              .
            </p>
          </div>

          {/* Active Technical Protections */}
          <div className="space-y-2">
            <div className="text-xs font-display font-semibold text-zinc-100 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Active Build &amp; Anti-Theft Verification</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                <div className="text-[11px] text-zinc-400">Authorized Host</div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono-tabular font-medium truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{integrity.hostname}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                <div className="text-[11px] text-zinc-400">
                  Build Signature &amp; Integrity
                </div>
                <div className="flex items-center justify-between gap-2 font-mono-tabular">
                  <span className="text-cyan-300 font-semibold">
                    {integrity.fingerprint}
                  </span>
                  <span className="text-emerald-400">
                    {integrity.integrityValid ? 'Verified' : 'Alert'}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                <div className="text-[11px] text-zinc-400">
                  Production Bundle Protection
                </div>
                <div className="text-zinc-200">
                  Source maps disabled · Debugger stripped · Proprietary chunk headers
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                <div className="text-[11px] text-zinc-400">
                  Mirror &amp; Viewport Guard
                </div>
                <div className="text-zinc-200">
                  Domain lock active ({integrity.customOriginsCount} custom{' '}
                  {integrity.customOriginsCount === 1 ? 'origin' : 'origins'}) ·
                  Canvas context lock
                </div>
              </div>
            </div>
          </div>

          {/* End-User License Terms */}
          <div className="space-y-2">
            <div className="text-xs font-display font-semibold text-zinc-100 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Proprietary Software License &amp; Terms of Use</span>
            </div>
            <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2 text-zinc-300">
              <p>
                <strong className="text-white">1. Permitted Use:</strong>{' '}
                {BRAND_IDENTITY.studioName} grants end users a limited,
                non-exclusive, non-transferable, revocable license to access and
                play {BRAND_IDENTITY.appTitle} on authorized domains solely for
                lawful personal entertainment and flight simulation practice.
              </p>
              <p>
                <strong className="text-white">2. Prohibited Conduct:</strong>{' '}
                {BRAND_IDENTITY.proprietaryNotice}
              </p>
              <p>
                <strong className="text-white">
                  3. Commercial Rights &amp; IP Enforcement:
                </strong>{' '}
                All trademarks, trade dress, studio branding, source modules, and
                derivative commercial licensing inquiries belong solely to{' '}
                {BRAND_IDENTITY.studioName}. For maximum statutory enforcement prior
                to commercial distribution, official copyright registration may be
                recorded with the U.S. Copyright Office (copyright.gov).
              </p>
            </div>
          </div>

          {/* Third-party notices */}
          <div className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-3">
            Third-Party Services &amp; Libraries: Real-world map tiles, elevation
            sampling, and Street View scouting are powered by Google Maps Platform
            subject to Google Terms of Service. 3D rendering uses Three.js (MIT
            License).
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between gap-4 shrink-0">
          <span className="text-[11px] text-zinc-400 font-mono-tabular">
            {BRAND_IDENTITY.copyrightNotice}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-xs cursor-pointer"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

interface UnauthorizedMirrorGateProps {
  integrity: RuntimeIntegrityReport;
}

export const UnauthorizedMirrorGate: React.FC<UnauthorizedMirrorGateProps> = ({
  integrity,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 p-6 text-zinc-100 safe-inset-container">
      <div className="w-full max-w-lg bg-zinc-900/90 border border-rose-500/40 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-rose-500/15 border border-rose-500/40 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <div className="text-xs font-mono-tabular text-rose-400 font-semibold">
              UNAUTHORIZED DEPLOYMENT DETECTED
            </div>
            <h1 className="text-xl font-display font-bold text-white">
              {BRAND_IDENTITY.appTitle} — Protected Property
            </h1>
          </div>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed">
          This build of <strong className="text-white">{BRAND_IDENTITY.appTitle}</strong>{' '}
          is proprietary software owned and operated by{' '}
          <strong className="text-amber-400">{BRAND_IDENTITY.studioName}</strong>.
          Execution has been halted because runtime verification failed on this
          host.
        </p>

        <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5 text-xs font-mono-tabular">
          <div className="flex justify-between gap-2">
            <span className="text-zinc-500">Host</span>
            <span className="text-rose-300">{integrity.hostname}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-zinc-500">Reason</span>
            <span className="text-zinc-200 text-right">{integrity.reason}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-zinc-500">Signature</span>
            <span className="text-amber-400">{integrity.fingerprint}</span>
          </div>
        </div>

        <div className="text-xs text-zinc-400 pt-1">
          {BRAND_IDENTITY.copyrightNotice} If you are the legitimate owner deploying
          to a custom domain, authorize the hostname via{' '}
          <code className="text-cyan-300">VITE_ALLOWED_ORIGINS</code>.
        </div>
      </div>
    </div>
  );
};
