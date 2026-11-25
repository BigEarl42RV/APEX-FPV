/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React from 'react';
import type { CareerBadgeId } from '../types/game';
import { getBadgeById } from '../data/career';

interface PilotBadgeEmblemProps {
  badgeId?: CareerBadgeId | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  locked?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<PilotBadgeEmblemProps['size']>, string> = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

export const PilotBadgeEmblem: React.FC<PilotBadgeEmblemProps> = ({
  badgeId,
  size = 'md',
  locked = false,
}) => {
  const badge = getBadgeById(badgeId);
  const accent = locked ? '#52525b' : badge?.accentHex ?? '#71717a';
  const dimAccent = locked ? '#27272a' : '#18181b';

  return (
    <svg
      viewBox="0 0 48 48"
      className={`${SIZE_CLASSES[size]} shrink-0`}
      aria-label={badge ? `${badge.name} emblem` : 'Unassigned pilot crest'}
    >
      {/* Shield Hex Backing */}
      <polygon
        points="24,3 42,12 40,34 24,45 8,34 6,12"
        fill={dimAccent}
        stroke={accent}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <polygon
        points="24,8 37,15 35.5,31.5 24,40 12.5,31.5 11,15"
        fill="none"
        stroke={accent}
        strokeOpacity="0.35"
        strokeWidth="1.1"
      />

      {/* Distinct Aviation / FPV Crest Geometry */}
      {badgeId === 'cadet-wings' && (
        <g fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 22 L24 27 L35 22" />
          <path d="M16 28 L24 32 L32 28" />
          <circle cx="24" cy="17" r="2.2" fill={accent} stroke="none" />
        </g>
      )}

      {badgeId === 'gate-centurion' && (
        <g fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 32 V20 A9 9 0 0 1 33 20 V32" />
          <path d="M19 32 V22 A5 5 0 0 1 29 22 V32" strokeOpacity="0.65" />
          <circle cx="24" cy="24" r="2.2" fill={accent} stroke="none" />
        </g>
      )}

      {badgeId === 'gate-master' && (
        <g fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 33 L18 16 L24 23 L30 16 L35 33" />
          <path d="M15 28 H33" strokeOpacity="0.65" />
          <circle cx="24" cy="14" r="2.2" fill={accent} stroke="none" />
        </g>
      )}

      {badgeId === 'flight-hour' && (
        <g fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="24" r="8.5" />
          <path d="M24 19 V24 L28 27" />
          <path d="M11 22 L15 24 M37 22 L33 24" />
        </g>
      )}

      {badgeId === 'endurance-ace' && (
        <g fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 24 C16 17, 32 17, 36 24" />
          <path d="M14 29 L24 14 L34 29 L24 25 Z" fill={accent} fillOpacity="0.22" />
        </g>
      )}

      {badgeId === 'mach-pilot' && (
        <g fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 12 L34 32 L24 27 L14 32 Z" fill={accent} fillOpacity="0.25" />
          <path d="M17 35 H31" strokeOpacity="0.65" />
        </g>
      )}

      {badgeId === 'medal-collector' && (
        <g fill="none" stroke={accent} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 32 C12 27, 13 20, 17 16" />
          <path d="M33 32 C36 27, 35 20, 31 16" />
          <polygon
            points="24,14 26.8,20 33,20.8 28.4,25 29.5,31.2 24,28.2 18.5,31.2 19.6,25 15,20.8 21.2,20"
            fill={accent}
            fillOpacity="0.3"
          />
        </g>
      )}

      {badgeId === 'league-champion' && (
        <g fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 30 L13 18 L20 23 L24 14 L28 23 L35 18 L34 30 Z" fill={accent} fillOpacity="0.28" />
          <path d="M16 34 H32" />
        </g>
      )}

      {!badgeId && (
        <g fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round">
          <path d="M18 24 H30 M24 18 V30" strokeOpacity="0.5" />
        </g>
      )}
    </svg>
  );
};
