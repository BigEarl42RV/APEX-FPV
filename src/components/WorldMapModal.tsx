/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useApiIsLoaded,
  useApiLoadingStatus,
  APILoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Award,
  ArrowLeft,
  Compass,
  Eye,
  Layers,
  MapPin,
  Mountain,
  Play,
  Search,
  Trash2,
  Trophy,
  Wand2,
  X,
} from 'lucide-react';
import { BUILTIN_TRACKS, buildTrackFromGoogleMaps } from '../data/tracks';
import { MEDAL_LABELS } from '../data/progression';
import type {
  CareerMedalTier,
  CircuitLeaderboardEntry,
  TrackDef,
} from '../types/game';
import { formatRaceTime } from './FpvOsdHud';

interface WorldMapModalProps {
  activeTrack: TrackDef;
  savedCustomTracks: TrackDef[];
  bestTimesByTrack: Record<string, number>;
  medalsByTrack: Record<string, CareerMedalTier>;
  leaderboardsByTrack: Record<string, CircuitLeaderboardEntry[]>;
  onSelectTrack: (track: TrackDef, launchImmediately: boolean) => void;
  onSaveCustomTrack: (track: TrackDef) => void;
  onClose: () => void;
}

const MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
  (typeof process !== 'undefined' ? process.env.GOOGLE_MAPS_API_KEY : undefined) ||
  '';

function isQuotaError(err: unknown): boolean {
  const msg = String(err ?? '');
  return (
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('429') ||
    msg.includes('Quota')
  );
}

interface DiscoveredPlace {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
}

interface MapBuilderWorkspaceProps {
  activeTrack: TrackDef;
  savedCustomTracks: TrackDef[];
  bestTimesByTrack: Record<string, number>;
  medalsByTrack: Record<string, CareerMedalTier>;
  leaderboardsByTrack: Record<string, CircuitLeaderboardEntry[]>;
  onSelectTrack: (track: TrackDef, launchImmediately: boolean) => void;
  onSaveCustomTrack: (track: TrackDef) => void;
}

function computeBearingDeg(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const DISCOVERY_CATEGORIES = [
  { label: 'Raceways & Circuits', query: 'motorsport raceway circuit' },
  { label: 'Mountain Passes', query: 'mountain pass scenic overlook' },
  { label: 'Coastal Headlands', query: 'coastal cliff lighthouse park' },
  { label: 'Urban Parks & Plazas', query: 'large civic plaza stadium park' },
];

/**
 * Draws the closed race circuit polyline directly on the Google Map instance
 */
const CircuitPolylineLayer: React.FC<{
  waypoints: Array<{ lat: number; lng: number }>;
}> = ({ waypoints }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const polyRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !mapsLib) return;
    if (polyRef.current) {
      polyRef.current.setMap(null);
      polyRef.current = null;
    }
    if (waypoints.length < 2) return;

    const closedPath =
      waypoints.length >= 3 ? [...waypoints, waypoints[0]] : waypoints;

    const poly = new mapsLib.Polyline({
      path: closedPath,
      strokeColor: '#f59e0b',
      strokeOpacity: 0.92,
      strokeWeight: 3.5,
      geodesic: true,
      map,
    });
    polyRef.current = poly;

    return () => {
      poly.setMap(null);
    };
  }, [map, mapsLib, waypoints]);

  return null;
};

const MapBuilderWorkspace: React.FC<MapBuilderWorkspaceProps> = ({
  activeTrack,
  savedCustomTracks,
  bestTimesByTrack,
  medalsByTrack,
  leaderboardsByTrack,
  onSelectTrack,
  onSaveCustomTrack,
}) => {
  const map = useMap();
  const isLoaded = useApiIsLoaded();
  const loadingStatus = useApiLoadingStatus();
  const placesLib = useMapsLibrary('places');
  const elevationLib = useMapsLibrary('elevation');
  const streetViewLib = useMapsLibrary('streetView');

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    activeTrack.centerLatLng ?? { lat: 37.8267, lng: -122.4995 }
  );
  const [mapZoom, setMapZoom] = useState<number>(16);
  const [mapTypeId, setMapTypeId] = useState<'hybrid' | 'satellite' | 'terrain' | 'roadmap'>('hybrid');

  // Place Autocomplete state (modern AutocompleteSuggestion + SessionToken)
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Live Place.searchByText results
  const [discoveredPlaces, setDiscoveredPlaces] = useState<DiscoveredPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Course Waypoint & Elevation state
  const [waypoints, setWaypoints] = useState<Array<{ lat: number; lng: number }>>(
    activeTrack.waypointsLatLng ?? []
  );
  const [courseName, setCourseName] = useState<string>(
    activeTrack.source === 'google-maps' ? activeTrack.name : 'Custom Real-World Circuit'
  );
  const [locationLabel, setLocationLabel] = useState<string>(
    activeTrack.source === 'google-maps'
      ? activeTrack.locationLabel
      : 'Selected Google Maps Coordinates'
  );
  const [elevationSamples, setElevationSamples] = useState<number[]>(
    activeTrack.elevationProfileM ?? []
  );
  const [isSamplingElevation, setIsSamplingElevation] = useState(false);

  // Street View Scouting Preview state
  const [showStreetView, setShowStreetView] = useState(true);
  const [svStatus, setSvStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [svLabel, setSvLabel] = useState<string>('Gate 1 / Launch Sector');
  const [svHeading, setSvHeading] = useState<number>(0);
  const svContainerRef = useRef<HTMLDivElement | null>(null);
  const svPanoRef = useRef<google.maps.StreetViewPanorama | null>(null);

  // Sync mapTypeId imperatively on google.maps.Map
  useEffect(() => {
    if (map) {
      map.setMapTypeId(mapTypeId);
    }
  }, [map, mapTypeId]);

  // Trigger Place Autocomplete suggestions when searchInput changes
  useEffect(() => {
    if (!placesLib || searchInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
      }
      placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: searchInput,
        sessionToken: sessionTokenRef.current,
      })
        .then((res) => {
          setSuggestions(res.suggestions ?? []);
        })
        .catch((err: unknown) => {
          if (isQuotaError(err)) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          setSuggestions([]);
        });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [placesLib, searchInput]);

  // Sample real elevation along placed waypoints using ElevationService
  const sampleElevationForWaypoints = useCallback(
    async (pts: Array<{ lat: number; lng: number }>) => {
      if (!elevationLib || pts.length < 2) {
        setElevationSamples([]);
        return [] as number[];
      }
      setIsSamplingElevation(true);
      try {
        const elevator = new elevationLib.ElevationService();
        const loopPath = pts.length >= 3 ? [...pts, pts[0]] : pts;
        const { results } = await elevator.getElevationAlongPath({
          path: loopPath,
          samples: 32,
        });
        const elevations = (results ?? []).map((r) => Number(r.elevation.toFixed(1)));
        setElevationSamples(elevations);
        return elevations;
      } catch (err: unknown) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        return [] as number[];
      } finally {
        setIsSamplingElevation(false);
      }
    },
    [elevationLib]
  );

  // Scout a coordinate with Google Street View Panorama (75m search radius)
  const scoutCoordinate = useCallback(
    async (
      target: { lat: number; lng: number },
      headingDeg: number,
      label: string
    ) => {
      setSvLabel(label);
      setSvHeading(Math.round(headingDeg));
      if (!streetViewLib || !showStreetView) return;

      setSvStatus('loading');
      try {
        const svService = new streetViewLib.StreetViewService();
        const { data } = await svService.getPanorama({
          location: target,
          radius: 75,
        });
        const panoId = data.location?.pano;
        if (!panoId || !svContainerRef.current) {
          setSvStatus('unavailable');
          return;
        }
        if (!svPanoRef.current) {
          svPanoRef.current = new streetViewLib.StreetViewPanorama(
            svContainerRef.current,
            {
              pano: panoId,
              pov: { heading: headingDeg, pitch: 4 },
              zoom: 1,
              addressControl: false,
              fullscreenControl: false,
              motionTracking: false,
            }
          );
        } else {
          svPanoRef.current.setPano(panoId);
          svPanoRef.current.setPov({ heading: headingDeg, pitch: 4 });
          svPanoRef.current.setVisible(true);
        }
        setSvStatus('ready');
      } catch (err: unknown) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setSvStatus('unavailable');
      }
    },
    [streetViewLib, showStreetView]
  );

  // Trigger initial Street View scout once streetViewLib is ready
  useEffect(() => {
    if (!streetViewLib || !showStreetView || svStatus !== 'idle') return;
    const target = waypoints[0] ?? mapCenter;
    const nextPt = waypoints[1];
    const heading = nextPt ? computeBearingDeg(target, nextPt) : 0;
    void scoutCoordinate(
      target,
      heading,
      waypoints.length > 0 ? 'Gate 1 Scouting' : locationLabel
    );
  }, [streetViewLib, showStreetView, svStatus, waypoints, mapCenter, locationLabel, scoutCoordinate]);

  // Auto-generate an 8-gate technical FPV circuit around a target coordinate
  const generateCircuitAt = useCallback(
    async (center: { lat: number; lng: number }, name: string, label: string) => {
      const mPerDegLat = 111320;
      const mPerDegLng = 111320 * Math.cos((center.lat * Math.PI) / 180);
      const radiusM = 125;
      const pts: Array<{ lat: number; lng: number }> = [];
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const wobble = i % 2 === 0 ? 1.0 : 0.68;
        const dx = Math.cos(ang) * radiusM * wobble;
        const dz = Math.sin(ang) * radiusM * wobble;
        pts.push({
          lat: center.lat + dz / mPerDegLat,
          lng: center.lng + dx / mPerDegLng,
        });
      }
      setWaypoints(pts);
      setCourseName(`${name} GP`);
      setLocationLabel(label);
      setMapCenter(center);
      setMapZoom(17);
      if (map) {
        map.panTo(center);
        map.setZoom(17);
      }
      const startHeading = computeBearingDeg(pts[0], pts[1]);
      await Promise.all([
        sampleElevationForWaypoints(pts),
        scoutCoordinate(pts[0], startHeading, `${name} · Gate 1`),
      ]);
    },
    [map, sampleElevationForWaypoints, scoutCoordinate]
  );

  const handleSelectSuggestion = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !suggestion.placePrediction) return;
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
        });
        sessionTokenRef.current = null;
        setSuggestions([]);
        setSearchInput('');

        if (place.location) {
          const coords = {
            lat: place.location.lat(),
            lng: place.location.lng(),
          };
          const title = place.displayName || 'Custom Location';
          const addr = place.formattedAddress || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
          await generateCircuitAt(coords, title, addr);
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
    },
    [placesLib, generateCircuitAt]
  );

  const handleCategorySearch = useCallback(
    async (query: string) => {
      if (!placesLib) return;
      setIsSearching(true);
      setSearchError(null);
      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: query,
          fields: ['displayName', 'formattedAddress', 'location'],
          maxResultCount: 6,
          language: 'en-US',
        });

        const mapped: DiscoveredPlace[] = (places ?? [])
          .filter((p) => p.location != null)
          .map((p) => ({
            id: p.id,
            name: p.displayName || 'Race Location',
            address: p.formattedAddress || '',
            location: {
              lat: p.location!.lat(),
              lng: p.location!.lng(),
            },
          }));
        setDiscoveredPlaces(mapped);
        if (mapped.length === 0) {
          setSearchError('No matching locations returned.');
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setSearchError('Unable to fetch places right now. You can still click anywhere on the map to build a circuit.');
      } finally {
        setIsSearching(false);
      }
    },
    [placesLib]
  );

  const handleMapClick = useCallback(
    async (ev: { detail: { latLng?: { lat: number; lng: number } | null } }) => {
      const latLng = ev.detail.latLng;
      if (!latLng) return;
      const pt = { lat: latLng.lat, lng: latLng.lng };
      const next = [...waypoints, pt];
      setWaypoints(next);
      if (next.length === 1) {
        setLocationLabel(`${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`);
      }
      const prevPt = next.length >= 2 ? next[next.length - 2] : pt;
      const heading = next.length >= 2 ? computeBearingDeg(prevPt, pt) : 0;
      void scoutCoordinate(pt, heading, `Gate ${next.length}`);
      if (next.length >= 3) {
        await sampleElevationForWaypoints(next);
      }
    },
    [waypoints, sampleElevationForWaypoints, scoutCoordinate]
  );

  const handleLaunchBuiltCircuit = async () => {
    if (waypoints.length < 3) return;
    let elevs = elevationSamples;
    if (elevs.length < 2 && elevationLib) {
      elevs = await sampleElevationForWaypoints(waypoints);
    }

    const avgLat = waypoints.reduce((s, p) => s + p.lat, 0) / waypoints.length;
    const avgLng = waypoints.reduce((s, p) => s + p.lng, 0) / waypoints.length;

    const built = buildTrackFromGoogleMaps({
      name: courseName.trim() || 'Real-World Circuit',
      locationLabel,
      center: { lat: avgLat, lng: avgLng },
      waypoints,
      elevationProfileM: elevs,
    });
    onSaveCustomTrack(built);
    onSelectTrack(built, true);
  };

  // Compute elevation SVG path if samples exist
  const minElev = elevationSamples.length ? Math.min(...elevationSamples) : 0;
  const maxElev = elevationSamples.length ? Math.max(...elevationSamples) : 0;
  const elevSpan = Math.max(1, maxElev - minElev);
  const elevSvgPoints = elevationSamples
    .map((val, idx) => {
      const x = (idx / Math.max(1, elevationSamples.length - 1)) * 280;
      const y = 44 - ((val - minElev) / elevSpan) * 36;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-y-auto lg:overflow-hidden fold-split-h">
      {/* Left Column: Real-World Search, Built-In Tracks & Elevation Builder */}
      <div className="lg:col-span-4 flex flex-col gap-3 lg:overflow-y-auto pr-1 fold-pane-left">
        {/* Google Places Autocomplete Search */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
          <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Search Real Place to Race</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search city, mountain, stadium, park..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
            />
            {suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                {suggestions.map((sug, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => void handleSelectSuggestion(sug)}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      {sug.placePrediction?.text.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Live Category Discovery via Place.searchByText */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {DISCOVERY_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => void handleCategorySearch(cat.query)}
                disabled={!isLoaded || isSearching}
                className="px-2.5 py-1 text-[11px] font-medium bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {cat.label}
              </button>
            ))}
          </div>

          {searchError && (
            <div className="text-[11px] text-amber-400">{searchError}</div>
          )}

          {discoveredPlaces.length > 0 && (
            <div className="space-y-1.5 pt-1 max-h-40 overflow-y-auto">
              {discoveredPlaces.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    void generateCircuitAt(p.location, p.name, p.address)
                  }
                  className="w-full text-left p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 transition-colors flex items-start justify-between gap-2 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {p.address}
                    </div>
                  </div>
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom Course Gate Builder & Real Elevation Profile */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Mountain className="w-3.5 h-3.5 text-amber-400" />
              <span>Course Designer ({waypoints.length} Gates)</span>
            </span>
            {waypoints.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setWaypoints([]);
                  setElevationSamples([]);
                }}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="Circuit name"
            className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-md text-xs text-white focus:outline-none focus:border-amber-500"
          />

          <p className="text-[11px] text-zinc-400">
            Click on the satellite map to drop race gates (minimum 3), or auto-generate a loop at the current view.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const c = map?.getCenter();
                const target = c
                  ? { lat: c.lat(), lng: c.lng() }
                  : mapCenter;
                void generateCircuitAt(target, courseName || 'Custom Sector', locationLabel);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Auto-Loop Here</span>
            </button>

            <button
              type="button"
              onClick={() => void handleLaunchBuiltCircuit()}
              disabled={waypoints.length < 3 || isSamplingElevation}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-display font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                waypoints.length >= 3 && !isSamplingElevation
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {isSamplingElevation ? 'Sampling...' : 'Race Location'}
              </span>
            </button>
          </div>

          {/* Real Google Elevation Profile Preview */}
          {elevationSamples.length >= 2 && (
            <div className="pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between text-[11px] font-mono-tabular text-zinc-400 mb-1">
                <span>Google Elevation Profile</span>
                <span className="text-emerald-400">
                  {minElev.toFixed(0)}m – {maxElev.toFixed(0)}m ASL
                </span>
              </div>
              <svg
                viewBox="0 0 280 48"
                className="w-full h-12 bg-zinc-950 rounded border border-zinc-800"
              >
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  points={elevSvgPoints}
                />
              </svg>
            </div>
          )}
        </div>

        {/* Built-in & Saved Real-World Circuits */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
          <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>Championship & Saved Circuits</span>
          </div>

          <div className="space-y-1.5">
            {[...savedCustomTracks, ...BUILTIN_TRACKS].map((tr) => {
              const isSelected = tr.id === activeTrack.id;
              const best = bestTimesByTrack[tr.id];
              const medal = medalsByTrack[tr.id] ?? 'none';
              const topEntries = (leaderboardsByTrack[tr.id] ?? []).slice(0, 3);
              return (
                <div
                  key={tr.id}
                  className={`p-2.5 rounded-lg border space-y-1.5 ${
                    isSelected
                      ? 'bg-zinc-950 border-amber-500'
                      : 'bg-zinc-950/60 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-display font-bold text-white truncate">
                          {tr.name}
                        </span>
                        {medal !== 'none' && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-400 shrink-0">
                            <Award className="w-3 h-3" />
                            {MEDAL_LABELS[medal]}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono-tabular truncate">
                        {tr.source === 'google-maps' ? 'Google Maps' : 'Pro Arena'} ·{' '}
                        {tr.gates.length} gates ·{' '}
                        {best ? `Best ${(best / 1000).toFixed(2)}s` : `${tr.parTimeSec}s par`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectTrack(tr, true)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Race
                    </button>
                  </div>
                  {topEntries.length > 0 && (
                    <div className="pt-1.5 border-t border-zinc-800/80 space-y-0.5">
                      {topEntries.map((ent, idx) => (
                        <div
                          key={ent.id}
                          className="flex items-center justify-between text-[10px] font-mono-tabular text-zinc-400"
                        >
                          <span className="truncate">
                            <Trophy className="w-2.5 h-2.5 text-amber-400 inline mr-1" />
                            #{idx + 1} {ent.callsign}
                          </span>
                          <span className="text-zinc-200 shrink-0">
                            {formatRaceTime(ent.totalTimeMs)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Google Map + Street View Scouting Preview */}
      <div className="lg:col-span-8 relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 min-h-[260px] sm:min-h-[340px] h-full fold-pane-right">
        {/* Map Type & Street View Toggle Overlay */}
        <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1 bg-zinc-950/90 border border-zinc-800 rounded-lg p-1">
            <Layers className="w-3.5 h-3.5 text-zinc-400 ml-1.5 mr-1" />
            {(['hybrid', 'satellite', 'terrain', 'roadmap'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMapTypeId(t)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer capitalize ${
                  mapTypeId === t
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !showStreetView;
              if (!next) {
                svPanoRef.current = null;
              }
              setShowStreetView(next);
              if (next) setSvStatus('idle');
            }}
            className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showStreetView
                ? 'bg-cyan-500 text-zinc-950 border-cyan-400'
                : 'bg-zinc-950/90 text-zinc-200 border-zinc-800 hover:bg-zinc-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Street View Scout</span>
          </button>
        </div>

        {(loadingStatus === APILoadingStatus.FAILED ||
          loadingStatus === APILoadingStatus.AUTH_FAILURE) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center">
            <p className="text-sm font-semibold text-amber-400">
              Google Maps could not load with the current API key.
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-md">
              You can still select and race any Championship Arena from the circuit list on the left.
            </p>
          </div>
        )}

        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={mapCenter}
          defaultZoom={mapZoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          streetViewControl={false}
          mapTypeControl={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          onClick={handleMapClick}
          style={{ width: '100%', height: '100%' }}
        >
          <CircuitPolylineLayer waypoints={waypoints} />

          {waypoints.map((wp, idx) => (
            <AdvancedMarker
              key={`${idx}-${wp.lat}-${wp.lng}`}
              position={wp}
              title={`Gate ${idx + 1} · Click to Scout Street View`}
              onClick={() => {
                const nextPt = waypoints[(idx + 1) % waypoints.length] ?? wp;
                const heading =
                  waypoints.length > 1 ? computeBearingDeg(wp, nextPt) : 0;
                setShowStreetView(true);
                void scoutCoordinate(wp, heading, `Gate ${idx + 1} Line`);
              }}
            >
              <Pin
                background={idx === 0 ? '#10b981' : '#f59e0b'}
                borderColor="#09090b"
                glyphColor="#09090b"
                glyphText={String(idx + 1)}
              />
            </AdvancedMarker>
          ))}

          {discoveredPlaces.map((pl) => (
            <AdvancedMarker
              key={pl.id}
              position={pl.location}
              title={pl.name}
              onClick={() =>
                void generateCircuitAt(pl.location, pl.name, pl.address)
              }
            >
              <Pin
                background="#06b6d4"
                borderColor="#09090b"
                glyphColor="#09090b"
              />
            </AdvancedMarker>
          ))}
        </GoogleMap>

        {/* Street View Scouting Preview Panel */}
        {showStreetView && (
          <div className="absolute bottom-3 right-3 left-3 sm:left-auto sm:w-[340px] z-10 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-1.5 min-w-0">
                <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px] font-semibold text-white truncate">
                  {svLabel}
                </span>
                <span className="text-[10px] font-mono-tabular text-zinc-400 shrink-0">
                  {svHeading}°
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  svPanoRef.current = null;
                  setShowStreetView(false);
                }}
                className="p-0.5 rounded text-zinc-400 hover:text-white cursor-pointer"
                aria-label="Close Street View preview"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative w-full h-44 sm:h-48 bg-zinc-950">
              <div
                ref={svContainerRef}
                className={`w-full h-full ${
                  svStatus === 'ready' ? 'block' : 'hidden'
                }`}
              />
              {svStatus !== 'ready' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-xs font-medium text-zinc-300">
                    {svStatus === 'loading'
                      ? 'Scouting nearby Street View imagery...'
                      : 'No Street View coverage within 75m of this point.'}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Click a road, park, or gate pin to inspect street-level terrain.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  activeTrack,
  savedCustomTracks,
  bestTimesByTrack,
  medalsByTrack,
  leaderboardsByTrack,
  onSelectTrack,
  onSaveCustomTrack,
  onClose,
}) => {
  return (
    <div
      data-gp-scope="true"
      className="fixed inset-0 z-30 bg-zinc-950/96 flex flex-col p-3 sm:p-6 safe-inset-container"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-3 sm:pb-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h2 className="text-lg font-display font-bold text-white">
              Real-World Google Maps Circuit Builder
            </h2>
            <p className="text-xs text-zinc-400">
              Search any place on Earth, scout at street level, drop race gates, and sample real elevation for 3D flight.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col pt-4 min-h-0">
        {MAPS_API_KEY ? (
          <APIProvider
            apiKey={MAPS_API_KEY}
            libraries={['places', 'marker', 'elevation', 'streetView']}
            language="en"
            region="US"
          >
            <MapBuilderWorkspace
              activeTrack={activeTrack}
              savedCustomTracks={savedCustomTracks}
              bestTimesByTrack={bestTimesByTrack}
              medalsByTrack={medalsByTrack}
              leaderboardsByTrack={leaderboardsByTrack}
              onSelectTrack={onSelectTrack}
              onSaveCustomTrack={onSaveCustomTrack}
            />
          </APIProvider>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-start pt-4 overflow-y-auto">
            {BUILTIN_TRACKS.map((tr) => {
              const medal = medalsByTrack[tr.id] ?? 'none';
              return (
                <div
                  key={tr.id}
                  className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-amber-400 font-medium">
                        {tr.locationLabel}
                      </span>
                      {medal !== 'none' && (
                        <span className="text-xs font-semibold text-cyan-400">
                          {MEDAL_LABELS[medal]} Medal
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-display font-bold text-white mt-1">
                      {tr.name}
                    </h3>
                    <div className="text-xs text-zinc-400 font-mono-tabular mt-2">
                      {tr.gates.length} Gates · {tr.lapCount} Laps · {tr.parTimeSec}s Par
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectTrack(tr, true)}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm rounded-lg cursor-pointer"
                  >
                    Launch Circuit
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
