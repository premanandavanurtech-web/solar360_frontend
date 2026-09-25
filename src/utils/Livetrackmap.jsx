// utils/Livetrackmap.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import {
  startTracking,
  stopTracking,
  getTrackPoints,
  isCurrentlyTracking,
} from "./Locationtracker";
import { useSocket } from "./Usesocket.js";
import { toast } from "../components/useToast.jsx";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API_ORIGIN } from "./apiConfig";

if (typeof window !== "undefined") {
  window.gm_authFailure = function() {
    console.warn("Google Maps auth notice handled cleanly.");
    if (typeof window.onGMapAuthError === "function") {
      window.onGMapAuthError();
    }
  };
}

const API  = API_ORIGIN;
const GKEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyBtLSQIyNMFIy5PzrnzP3pGstDkLViwxiw";

const MIN_MOVE_METRES = 15;
const MIN_STATIONARY_MOVE_METRES = 50; // 50 meters (0.05 km) minimum threshold to ignore indoor drift
const SNAP_TO_ROADS_MAX_POINTS = 100;
const SNAP_TO_ROADS_MAX_GAP_METRES = 500;
const MAX_COUNTED_SEGMENT_METRES = 1000;
const MAX_LIVE_SEGMENT_METRES = 1000;
const MAX_COUNTED_SPEED_KMH = 100;
const ROUTE_MODE_RAW = "raw";
const ROUTE_MODE_ROAD = "road";
const MAX_VISIBLE_GPS_DOTS = 1000;

function getGpsNoiseRadiusMetres(currentAccuracy = 0, previousAccuracy = 0) {
  const current = Number(currentAccuracy) || 0;
  const previous = Number(previousAccuracy) || 0;
  return Math.max(12, Math.max(current, previous) * 0.8);
}

function getEffectiveMoveThreshold(currentAccuracy = 0, previousAccuracy = 0) {
  const current = Number(currentAccuracy) || 0;
  const previous = Number(previousAccuracy) || 0;
  const maxAccuracy = Math.max(current, previous);

  return Math.min(
    45,
    Math.max(
      MIN_MOVE_METRES,
      (current + previous) * 0.45,
      maxAccuracy * 0.8
    )
  );
}

const getToken = () =>
  localStorage.getItem("token")       ||
  localStorage.getItem("authToken")   ||
  localStorage.getItem("accessToken") || "";

const getLocalDateString = (value = null) => {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().split("T")[0];
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const extractLocationPoints = (payload) => {
  const candidates = [
    payload?.result,
    payload?.data,
    payload?.points,
    payload?.path,
    payload?.locations,
    payload?.result?.points,
    payload?.result?.path,
    payload?.result?.locations,
    payload?.data?.points,
    payload?.data?.path,
    payload?.data?.locations,
  ];

  return candidates.find(Array.isArray) || [];
};

const filterPointsFromPunchInTime = (points = [], punchInTime = null, punchOutTime = null) => {
  if (!Array.isArray(points) || !points.length) return [];
  if (!punchInTime) return [];

  const punchInMs = new Date(punchInTime).getTime();
  if (!Number.isFinite(punchInMs)) return [];

  const punchOutMs = punchOutTime ? new Date(punchOutTime).getTime() : null;

  return points.filter((point) => {
    const pointMs = new Date(point?.recordedAt || point?.time || 0).getTime();
    if (!Number.isFinite(pointMs)) return false;
    if (pointMs < punchInMs) return false;
    if (punchOutMs && Number.isFinite(punchOutMs) && pointMs > punchOutMs) return false;
    return true;
  });
};

const extractVisitTrailPoints = (visits = [], punchInLocation = null) => {
  const points = [];
  const seen = new Set();

  const pushPoint = (latValue, lngValue, extra = {}) => {
    const lat = Number(latValue);
    const lng = Number(lngValue);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (Math.abs(lat) < 0.1 && Math.abs(lng) < 0.1) return; // Guard against Null Island / (0, 0)
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (seen.has(key)) return;
    seen.add(key);
    points.push({ lat, lng, ...extra });
  };

  if (punchInLocation && Number.isFinite(Number(punchInLocation.lat)) && Number.isFinite(Number(punchInLocation.lng))) {
    if (!(Math.abs(Number(punchInLocation.lat)) < 0.1 && Math.abs(Number(punchInLocation.lng)) < 0.1)) {
      pushPoint(punchInLocation.lat, punchInLocation.lng, { source: "punch-in" });
    }
  }

  [...visits]
    .filter(Boolean)
    .sort((a, b) => {
      const timeA = new Date(a?.checkInTime || a?.createdAt || a?.visitDate || 0).getTime();
      const timeB = new Date(b?.checkInTime || b?.createdAt || b?.visitDate || 0).getTime();
      return timeA - timeB;
    })
    .forEach((visit) => {
      pushPoint(
        visit.coordinates?.lat ??
          visit.location?.lat ??
          visit.location?.latitude ??
          visit.lat ??
          visit.latitude,
        visit.coordinates?.lng ??
          visit.coordinates?.longitude ??
          visit.location?.lng ??
          visit.location?.longitude ??
          visit.lng ??
          visit.longitude,
        { source: "visit" }
      );
    });

  return points;
};

const ensureTrailStartsAtPunchIn = (points = [], punchInLocation = null) => {
  if (!punchInLocation?.lat || !punchInLocation?.lng) return points;
  const pLat = Number(punchInLocation.lat);
  const pLng = Number(punchInLocation.lng);
  if (!Number.isFinite(pLat) || !Number.isFinite(pLng) || (Math.abs(pLat) < 0.1 && Math.abs(pLng) < 0.1)) {
    return points;
  }
  if (!Array.isArray(points) || points.length === 0) {
    return [{
      lat: pLat,
      lng: pLng,
      accuracy: Number(punchInLocation.accuracy ?? 0),
      source: "punch-in",
    }];
  }

  const punchPoint = {
    lat: pLat,
    lng: pLng,
    accuracy: Number(punchInLocation.accuracy ?? 0),
    source: "punch-in",
  };

  if (!Number.isFinite(punchPoint.lat) || !Number.isFinite(punchPoint.lng)) {
    return points;
  }

  const first = points[0];
  const d = distMetres(punchPoint.lat, punchPoint.lng, first.lat, first.lng);
  
  // If punch-in is within 40m of first GPS point, keep first GPS point as it's already aligned with movement
  if (d <= 40) {
    return points;
  }

  // If points are valid GPS points recorded after punch-in, do not insert artificial straight chords
  return points;
};

const roadSnapCache = new Map();

async function snapPointsToRoads(points = []) {
  if (!Array.isArray(points) || points.length < 2) return points;

  // 1. Filter redundant stationary/jitter points (< 10m)
  const simplified = [];
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (simplified.length === 0) {
      simplified.push(pt);
      continue;
    }
    const prev = simplified[simplified.length - 1];
    const d = distMetres(prev.lat, prev.lng, pt.lat, pt.lng);
    if (d >= 10 || i === points.length - 1) {
      simplified.push(pt);
    }
  }

  if (simplified.length < 2) return points;

  // 2. Check in-memory cache
  const cacheKey = simplified.length + "_" + 
    simplified[0].lat.toFixed(4) + "," + simplified[0].lng.toFixed(4) + "_" +
    simplified[simplified.length - 1].lat.toFixed(4) + "," + simplified[simplified.length - 1].lng.toFixed(4);
  
  if (roadSnapCache.has(cacheKey)) {
    return roadSnapCache.get(cacheKey);
  }

  const snappedResult = [];
  // Small chunk size (8 to 10 points) is 100% reliable on public OSRM without 400 Bad Request
  const chunkSize = 10;

  for (let i = 0; i < simplified.length; i += chunkSize - 1) {
    const chunk = simplified.slice(i, i + chunkSize);
    if (chunk.length < 2) break;

    let chunkSnapped = null;

    try {
      const coords = chunk
        .map((p) => `${Number(p.lng).toFixed(6)},${Number(p.lat).toFixed(6)}`)
        .join(";");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const rRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&continue_straight=true&steps=false`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (rRes.ok) {
        const rData = await rRes.json();
        if (rData.code === "Ok" && rData.routes && rData.routes[0]?.geometry?.coordinates?.length > 1) {
          chunkSnapped = rData.routes[0].geometry.coordinates.map(([lng, lat]) => ({
            lat,
            lng,
          }));
        }
      }
    } catch {
      // Graceful fallback to original chunk points if network/server is busy
    }

    if (chunkSnapped && chunkSnapped.length > 0) {
      if (snappedResult.length > 0) {
        snappedResult.push(...chunkSnapped.slice(1));
      } else {
        snappedResult.push(...chunkSnapped);
      }
    } else {
      if (snappedResult.length > 0) {
        snappedResult.push(...chunk.slice(1));
      } else {
        snappedResult.push(...chunk);
      }
    }
  }

  const finalSnapped = snappedResult.length >= 2 ? snappedResult : points;
  if (roadSnapCache.size > 50) {
    const firstKey = roadSnapCache.keys().next().value;
    roadSnapCache.delete(firstKey);
  }
  roadSnapCache.set(cacheKey, finalSnapped);

  return finalSnapped;
}

function appendSequentialPoint(points, point, minDuplicateMetres = 2) {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return points;
  if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) return points;

  const normalized = {
    ...point,
    lat,
    lng,
    accuracy: Number(point?.accuracy ?? 0),
  };
  const last = points[points.length - 1];
  if (last && distMetres(last.lat, last.lng, lat, lng) < minDuplicateMetres) {
    return points;
  }

  points.push(normalized);
  return points;
}

function getPointTimestamp(point) {
  const timestamp = new Date(point?.recordedAt || point?.time || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function orderPointsByTime(points = []) {
  return points
    .map((point, index) => ({ point, index, timestamp: getPointTimestamp(point) }))
    .sort((a, b) => {
      if (a.timestamp !== null && b.timestamp !== null && a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      if (a.timestamp !== null && b.timestamp === null) return -1;
      if (a.timestamp === null && b.timestamp !== null) return 1;
      return a.index - b.index;
    })
    .map(({ point }) => point);
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLng = ((Number(lng2) - Number(lng1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((Number(lat1) * Math.PI) / 180) *
    Math.cos((Number(lat2) * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcKm(points) {
  if (!points || points.length < 2) return 0;
  const R = 6371;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dLat = ((curr.lat - prev.lat) * Math.PI) / 180;
    const dLng = ((curr.lng - prev.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((prev.lat * Math.PI) / 180) *
      Math.cos((curr.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return Math.round(total * 1000) / 1000;
}

function calcFilteredKm(points) {
  if (!points || !Array.isArray(points) || points.length < 2) return 0;
  let totalKm = 0;
  let anchor = null;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const lat = Number(pt.lat);
    const lng = Number(pt.lng);
    const accuracy = Number(pt.accuracy ?? 0);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) continue; // Filter out zero (0, 0) coordinates
    if (accuracy && accuracy > 50) continue; // Filter out low-accuracy (> 50m)

    if (!anchor) {
      anchor = { lat, lng, time: pt.time || pt.recordedAt };
      continue;
    }

    const distM = distMetres(anchor.lat, anchor.lng, lat, lng);

    // If movement from stationary anchor is less than 25 meters, consider user stationary (indoor jitter returns strictly 0.00 km)
    if (distM < MIN_STATIONARY_MOVE_METRES) {
      continue;
    }

    // Teleportation / speed filter guard
    const prevTime = new Date(anchor.time || 0).getTime();
    const currTime = new Date(pt.time || pt.recordedAt || 0).getTime();
    const elapsedHours =
      Number.isFinite(prevTime) && Number.isFinite(currTime) && currTime > prevTime
        ? (currTime - prevTime) / 3600000
        : null;
    const maxBySpeed = elapsedHours
      ? Math.max(150, elapsedHours * MAX_COUNTED_SPEED_KMH * 1000)
      : MAX_COUNTED_SEGMENT_METRES;

    if (distM > Math.min(MAX_COUNTED_SEGMENT_METRES, maxBySpeed)) continue;

    // Accumulate distance from anchor and advance anchor to current point
    totalKm += distM / 1000;
    anchor = { lat, lng, time: pt.time || pt.recordedAt };
  }

  return Math.round(totalKm * 1000) / 1000;
}

function hasConfirmedMovement(points) {
  if (!Array.isArray(points) || points.length < 2) return false;

  let significantSegments = 0;
  let travelledMetres = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const distM = distMetres(prev.lat, prev.lng, curr.lat, curr.lng);
    const minMoveRequired = getEffectiveMoveThreshold(curr.accuracy, prev.accuracy);
    const gpsNoiseRadius = getGpsNoiseRadiusMetres(curr.accuracy, prev.accuracy);
    if (distM >= minMoveRequired && distM >= gpsNoiseRadius) {
      significantSegments += 1;
      travelledMetres += distM;
    }
  }

  return significantSegments >= 2 || travelledMetres >= 80;
}

function distMetres(lat1, lng1, lat2, lng2) {
  return calcKm([{ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }]) * 1000;
}

function resolvePunchInMarkerPosition(punchInLocation, trailPoints = []) {
  if (!punchInLocation?.lat || !punchInLocation?.lng) return null;

  const trailStart = Array.isArray(trailPoints) && trailPoints.length > 0 ? trailPoints[0] : null;
  if (!trailStart?.lat || !trailStart?.lng) return punchInLocation;

  const mismatchMetres = distMetres(
    punchInLocation.lat,
    punchInLocation.lng,
    trailStart.lat,
    trailStart.lng
  );

  if (mismatchMetres >= 60) {
    return {
      ...punchInLocation,
      lat: trailStart.lat,
      lng: trailStart.lng,
    };
  }

  return punchInLocation;
}

const RADAR_DISC_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <defs>
    <radialGradient id="radarPulse" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2563eb" stop-opacity="0.95" />
      <stop offset="65%" stop-color="#3b82f6" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#60a5fa" stop-opacity="0" />
    </radialGradient>
  </defs>
  <circle cx="22" cy="22" r="20" fill="url(#radarPulse)" />
  <circle cx="22" cy="22" r="14" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.9" />
  <circle cx="22" cy="22" r="8" fill="#ffffff" />
  <circle cx="22" cy="22" r="5.5" fill="#2563eb" />
  <circle cx="22" cy="22" r="2" fill="#ffffff" />
</svg>`;

function getRadarDiscIcon(G) {
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(RADAR_DISC_SVG)}`,
    size: new G.Size(44, 44),
    anchor: new G.Point(22, 22),
    scaledSize: new G.Size(44, 44),
  };
}

function animateMarkerSmooth(marker, targetLat, targetLng, durationMs = 600) {
  if (!marker || !targetLat || !targetLng) return;
  const currentPos = marker.getPosition();
  if (!currentPos) {
    marker.setPosition({ lat: targetLat, lng: targetLng });
    return;
  }
  const startLat = currentPos.lat();
  const startLng = currentPos.lng();
  if (Math.abs(startLat - targetLat) < 0.000001 && Math.abs(startLng - targetLng) < 0.000001) return;

  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const lat = startLat + (targetLat - startLat) * ease;
    const lng = startLng + (targetLng - startLng) * ease;
    marker.setPosition({ lat, lng });
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

let gmapsPromise = null;
function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve();
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve, reject) => {
    const s   = document.createElement("script");
    s.src     = `https://maps.googleapis.com/maps/api/js?key=${GKEY}`;
    s.async   = true;
    s.onload  = resolve;
    s.onerror = () => reject(new Error("Google Maps failed to load. Check your API key."));
    document.head.appendChild(s);
  });
  return gmapsPromise;
}

export default function LiveTrackingMap({
  isPunchedIn     = false,
  hasPunchedOut   = false,
  userId          = null,
  height          = "400px",
  locateTrigger   = 0,
  onPointsChange,
  onDistanceChange,
  onCurrentLocationChange,
  isOwner         = true,
  punchInLocation = null,
  punchOutLocation = null,
  punchBatteryInfo = null,
  resolvedAddress  = "",
  selectedDate    = null,
  visits          = [],
  preferVisitTrail = false,
  punchInPopupTrigger = 0,
  onReplayUpdate = null,
}) {
  const mapDivRef  = useRef(null);
  const gMapRef    = useRef(null);
  const leafletMapRef = useRef(null);
  const polyRef    = useRef({ casing: null, main: null });
  const startMkRef = useRef(null);
  const liveMkRef  = useRef(null);
  const endMkRef   = useRef(null);
  const dotsRef    = useRef([]);
  const allPtsRef  = useRef([]);
  const rawPtsRef  = useRef([]);
  const visitsRef = useRef(visits);
  const punchInLocationRef = useRef(punchInLocation);
  const punchOutLocationRef = useRef(punchOutLocation);
  const snappedTrailCacheRef = useRef({ key: "", path: [] });
  const drawRequestSeqRef = useRef(0);
  const lastEmittedLocationRef = useRef(null);
  const visitMkRef = useRef([]);
  const userAdjustedViewportRef = useRef(false);
  const suppressViewportEventsRef = useRef(false);
  const [mapLoaded,  setMapLoaded]  = useState(false);
  const [accuracy,   setAccuracy]   = useState(null);
  const [sockAck,    setSockAck]    = useState(null);
  const [totalKm,    setTotalKm]    = useState(0);
  const [pointCount, setPointCount] = useState(0);
  const [replayPointsVersion, setReplayPointsVersion] = useState(0);
  const [gpsDotCount, setGpsDotCount] = useState(0);
  const [routeMode, setRouteMode] = useState(ROUTE_MODE_ROAD);
  const [roadTravel, setRoadTravel] = useState({
    totalKm: null,
    segmentCount: 0,
    loading: false,
  });
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [mapTileType, setMapTileType] = useState("roadmap");
  const [punchInPopupOpen, setPunchInPopupOpen] = useState(false);
  const tileLayerRef = useRef(null);

  const prevPunchedIn  = useRef(false);
  const prevPunchedOut = useRef(false);

  const { socket, socketRef, connected } = useSocket();

  const [geofences,      setGeofences]      = useState([]);
  const [geofenceAlerts, setGeofenceAlerts] = useState([]);
  const fenceLayersRef = useRef({});

  const onDistanceChangeRef = useRef(onDistanceChange);
  const onPointsChangeRef = useRef(onPointsChange);
  const onCurrentLocationChangeRef = useRef(onCurrentLocationChange);
  const onReplayUpdateRef = useRef(onReplayUpdate);
  const lastDistanceStatsRef = useRef({ totalKm: null, totalPoints: null });

  useEffect(() => { onDistanceChangeRef.current = onDistanceChange; }, [onDistanceChange]);
  useEffect(() => { onPointsChangeRef.current = onPointsChange; }, [onPointsChange]);
  useEffect(() => { onCurrentLocationChangeRef.current = onCurrentLocationChange; }, [onCurrentLocationChange]);
  useEffect(() => { onReplayUpdateRef.current = onReplayUpdate; }, [onReplayUpdate]);

  const isTodaySelected =
    !selectedDate || selectedDate === "today" || selectedDate === new Date().toISOString().split("T")[0];
  const hasValidPunchIn = Boolean(
    isPunchedIn ||
    hasPunchedOut ||
    (punchInLocation && (punchInLocation.lat || punchInLocation.latitude))
  );
  const isLive = isPunchedIn && !hasPunchedOut && isTodaySelected;

  const withProgrammaticViewport = useCallback((fn) => {
    suppressViewportEventsRef.current = true;
    fn();
    window.setTimeout(() => {
      suppressViewportEventsRef.current = false;
    }, 0);
  }, []);

  // ── Route Replay Simulator ──────────────────────────────────────────────
  const replayMarkerRef = useRef(null);
  const replayPolyRef = useRef(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1);

  const cumulativeDistancesRef = useRef([]);
  const lastReplayEmitTimeRef = useRef(0);
  const replayMarkerHeadingRef = useRef(0);

  const getSegmentHeading = (p1, p2) => {
    if (!p1 || !p2) return 0;
    const lat1 = (Number(p1.lat) * Math.PI) / 180;
    const lat2 = (Number(p2.lat) * Math.PI) / 180;
    const dLng = ((Number(p2.lng) - Number(p1.lng)) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  };

  const moveReplay = useCallback((index, points = allPtsRef.current) => {
    const lMap = leafletMapRef.current;
    if (!lMap || !Array.isArray(points) || points.length === 0) return;

    const clampedIdx = Math.max(0, Math.min(index, points.length - 1));
    const targetPt = points[clampedIdx];
    if (!targetPt || !Number.isFinite(Number(targetPt.lat)) || !Number.isFinite(Number(targetPt.lng))) return;

    const latlng = [Number(targetPt.lat), Number(targetPt.lng)];

    // Compute heading / road orientation
    let heading = replayMarkerHeadingRef.current;
    if (clampedIdx > 0 && points[clampedIdx - 1]) {
      heading = getSegmentHeading(points[clampedIdx - 1], targetPt);
      replayMarkerHeadingRef.current = heading;
    } else if (points.length > 1 && points[1]) {
      heading = getSegmentHeading(targetPt, points[1]);
      replayMarkerHeadingRef.current = heading;
    }

    const timeLabel = targetPt.recordedAt || targetPt.time
      ? new Date(targetPt.recordedAt || targetPt.time).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
      : "";
    const speedVal = Number(targetPt.speed || 0);
    const speedLabel = speedVal > 0 ? `${Math.round(speedVal * 3.6)} km/h` : "Driving";
    
    let pointLocationName = "Moving on route";
    if (clampedIdx === 0) {
      pointLocationName = "Punch In";
    } else if (clampedIdx >= points.length - 1) {
      pointLocationName = hasPunchedOut ? "Punch Out" : "Current Location";
    } else {
      const currentVisits = visitsRef.current || [];
      const matchedVisit = currentVisits.find((v) => {
        const vLat = Number(v.lat || v.coordinates?.lat || v.location?.lat);
        const vLng = Number(v.lng || v.coordinates?.lng || v.location?.lng);
        if (Number.isFinite(vLat) && Number.isFinite(vLng)) {
          return distMetres(targetPt.lat, targetPt.lng, vLat, vLng) < 80;
        }
        return false;
      });
      if (matchedVisit) {
        pointLocationName = matchedVisit.partyName || matchedVisit.locationName || "Stop";
      } else {
        pointLocationName = `Stop #${clampedIdx + 1}`;
      }
    }

    if (!replayMarkerRef.current) {
      const vehicleHtml = `
        <div style="position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center;">
          <div style="
            position:absolute; width:48px; height:48px; border-radius:50%;
            background: radial-gradient(circle, rgba(56,189,248,0.4) 0%, rgba(37,99,235,0.15) 50%, rgba(37,99,235,0) 75%);
          "></div>
          <div id="replay-car-pointer" style="
            width:36px; height:36px; border-radius:50%;
            background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #38bdf8 100%);
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.6), 0 2px 4px rgba(0,0,0,0.25);
            display: flex; align-items: center; justify-content: center;
            transform: rotate(${Math.round(heading)}deg);
            transition: transform 0.18s cubic-bezier(0.2, 0, 0, 1);
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));">
              <path d="M12 2L4 20L12 16.5L20 20L12 2Z"/>
            </svg>
          </div>
        </div>
      `;

      const vehicleIcon = L.divIcon({
        className: "replay-car-icon",
        html: vehicleHtml,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      const hudHtml = `
        <div style="
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #ffffff;
          border-radius: 20px;
          padding: 5px 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.18);
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        ">
          <span id="replay-hud-loc" style="color:#38bdf8; display:flex; align-items:center; gap:3px;">
            📍 ${pointLocationName}
          </span>
          <span style="color:rgba(255,255,255,0.25);">•</span>
          <span id="replay-hud-time" style="color:#fde047; display:flex; align-items:center; gap:3px;">
            🕒 ${timeLabel || "Punch In"}
          </span>
          <span style="color:rgba(255,255,255,0.25);">•</span>
          <span id="replay-hud-spd" style="color:#4ade80; display:flex; align-items:center; gap:3px;">
            ⚡ ${speedLabel}
          </span>
        </div>
      `;

      replayMarkerRef.current = L.marker(latlng, { icon: vehicleIcon, zIndexOffset: 1000 })
        .addTo(lMap)
        .bindTooltip(hudHtml, { permanent: true, direction: "top", offset: [0, -26], className: "custom-clean-tooltip", opacity: 1 });
    } else {
      replayMarkerRef.current.setLatLng(latlng);
      
      // Update heading and HUD via lightweight DOM updates without destroying Leaflet icon
      const pointer = document.getElementById("replay-car-pointer");
      if (pointer) pointer.style.transform = `rotate(${Math.round(heading)}deg)`;

      const hudLoc = document.getElementById("replay-hud-loc");
      if (hudLoc) hudLoc.innerHTML = `📍 ${pointLocationName}`;
      const hudTime = document.getElementById("replay-hud-time");
      if (hudTime) hudTime.innerHTML = `🕒 ${timeLabel || "Punch In"}`;
      const hudSpd = document.getElementById("replay-hud-spd");
      if (hudSpd) hudSpd.innerHTML = `⚡ ${speedLabel}`;
    }

    // Step polyline efficiently
    const coveredLatLngs = points.slice(0, clampedIdx + 1).map((p) => [Number(p.lat), Number(p.lng)]);
    if (!replayPolyRef.current) {
      replayPolyRef.current = L.polyline(coveredLatLngs, {
        color: "#0284c7",
        weight: 6,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(lMap);
    } else {
      replayPolyRef.current.setLatLngs(coveredLatLngs);
      replayPolyRef.current.setStyle({ color: "#0284c7" });
    }

    // Smooth viewport keeping: Only pan when marker nears the map edge
    try {
      const bounds = lMap.getBounds();
      if (!bounds.pad(-0.12).contains(latlng)) {
        withProgrammaticViewport(() => {
          lMap.panTo(latlng, { animate: false });
        });
      }
    } catch {}
  }, [withProgrammaticViewport]);

  useEffect(() => {
    if (!isReplaying) return;
    const points = allPtsRef.current;
    if (!Array.isArray(points) || points.length < 2) {
      setIsReplaying(false);
      return;
    }

    // Frame rate: 60fps pacing
    const intervalMs = Math.max(25, Math.floor(180 / replaySpeed));
    const timer = setInterval(() => {
      setReplayIndex((prev) => {
        const next = prev + 1;
        if (next >= points.length) {
          setIsReplaying(false);
          return points.length - 1;
        }
        moveReplay(next, points);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isReplaying, replaySpeed, moveReplay]);

  const toggleReplay = useCallback(() => {
    const points = allPtsRef.current;
    if (!Array.isArray(points) || points.length < 2) {
      toast.error("Not enough route points to simulate replay");
      return;
    }

    if (isReplaying) {
      setIsReplaying(false);
    } else {
      if (replayIndex >= points.length - 1) {
        setReplayIndex(0);
        moveReplay(0, points);
      } else {
        moveReplay(replayIndex, points);
      }
      setIsReplaying(true);
    }
  }, [isReplaying, replayIndex, moveReplay]);

  const handleSliderSeek = useCallback((percentage) => {
    const points = allPtsRef.current;
    if (!Array.isArray(points) || points.length < 2) return;

    const targetIdx = Math.round((percentage / 100) * (points.length - 1));
    setReplayIndex(targetIdx);
    moveReplay(targetIdx, points);
  }, [moveReplay]);

  const stepReplay = useCallback((direction = 1) => {
    const points = allPtsRef.current;
    if (!Array.isArray(points) || points.length < 2) return;
    const nextIdx = Math.max(0, Math.min(points.length - 1, replayIndex + direction));
    setReplayIndex(nextIdx);
    moveReplay(nextIdx, points);
  }, [replayIndex, moveReplay]);

  // Throttled Replay Updates to Parent (Eliminates React rendering bottlenecks)
  const toggleReplayRef = useRef(toggleReplay);
  toggleReplayRef.current = toggleReplay;
  const handleSliderSeekRef = useRef(handleSliderSeek);
  handleSliderSeekRef.current = handleSliderSeek;
  const stepReplayRef = useRef(stepReplay);
  stepReplayRef.current = stepReplay;
  const setReplaySpeedRef = useRef(setReplaySpeed);
  setReplaySpeedRef.current = setReplaySpeed;

  const stableToggleReplay = useCallback(() => toggleReplayRef.current(), []);
  const stableSeek = useCallback((p) => handleSliderSeekRef.current(p), []);
  const stableSetSpeed = useCallback((s) => setReplaySpeedRef.current(s), []);
  const stableStepForward = useCallback(() => stepReplayRef.current(1), []);
  const stableStepBackward = useCallback(() => stepReplayRef.current(-1), []);

  useEffect(() => {
    if (typeof onReplayUpdateRef.current !== "function") return;

    const now = Date.now();
    const isPlaybackBoundary = !isReplaying || replayIndex === 0 || replayIndex >= (allPtsRef.current?.length || 1) - 1;
    
    // Emit instantly on boundary/pause/seek, or throttled every 120ms during playback
    if (!isPlaybackBoundary && (now - lastReplayEmitTimeRef.current) < 120) {
      return;
    }
    lastReplayEmitTimeRef.current = now;

    const points = allPtsRef.current || [];
    const currentPt = points[replayIndex] || points[0] || null;
    const progress = points.length > 1 ? Math.round((replayIndex / (points.length - 1)) * 100) : 0;
    const timeStr = currentPt?.recordedAt || currentPt?.time
      ? new Date(currentPt.recordedAt || currentPt?.time).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
      : "00:00";
    
    const officialTotalKm = Number(totalKm > 0 ? totalKm : lastDistanceStatsRef.current.totalKm || 0);
    const precalcKm = cumulativeDistancesRef.current[replayIndex];
    let resolvedKm = 0;
    if (precalcKm != null) {
      resolvedKm = precalcKm;
    } else if (officialTotalKm > 0 && points.length > 1) {
      resolvedKm = (replayIndex / (points.length - 1)) * officialTotalKm;
    } else {
      resolvedKm = officialTotalKm;
    }
    if (officialTotalKm > 0 && (replayIndex >= points.length - 1 || resolvedKm > officialTotalKm)) {
      resolvedKm = officialTotalKm;
    }
    const kmStr = `${resolvedKm.toFixed(2)} km`;

    let waypointLabel = "Point A";
    if (replayIndex === 0) {
      waypointLabel = "Punch In";
    } else if (replayIndex >= points.length - 1) {
      waypointLabel = hasPunchedOut ? "Punch Out" : "Point B";
    } else if (currentPt) {
      const currentVisits = visitsRef.current || [];
      const matchedVisit = currentVisits.find((v) => {
        const vLat = Number(v.lat || v.coordinates?.lat || v.location?.lat);
        const vLng = Number(v.lng || v.coordinates?.lng || v.location?.lng);
        if (Number.isFinite(vLat) && Number.isFinite(vLng)) {
          return distMetres(currentPt.lat, currentPt.lng, vLat, vLng) < 80;
        }
        return false;
      });
      if (matchedVisit) {
        waypointLabel = matchedVisit.partyName || matchedVisit.locationName || "Stop";
      } else {
        waypointLabel = `Point ${String.fromCharCode(65 + Math.min(25, Math.floor((replayIndex / Math.max(1, points.length)) * 5)))}`;
      }
    }

    onReplayUpdateRef.current({
      isReplaying,
      replayIndex,
      replaySpeed,
      replayTimeStr: timeStr,
      replayKmStr: kmStr,
      replayWaypointLabel: waypointLabel,
      replayProgress: progress,
      totalPoints: points.length,
      hasPoints: points.length >= 1,
      toggleReplay: stableToggleReplay,
      seek: stableSeek,
      setSpeed: stableSetSpeed,
      stepForward: stableStepForward,
      stepBackward: stableStepBackward,
    });
  }, [
    isReplaying,
    replayIndex,
    replaySpeed,
    hasPunchedOut,
    replayPointsVersion,
    stableToggleReplay,
    stableSeek,
    stableSetSpeed,
    stableStepForward,
    stableStepBackward,
  ]);

  const syncStartMarker = useCallback((points = allPtsRef.current) => {
    const lMap = leafletMapRef.current;
    if (!mapLoaded || !lMap) return;

    let pos = null;
    if (punchInLocationRef.current?.lat && punchInLocationRef.current?.lng) {
      const pLat = Number(punchInLocationRef.current.lat);
      const pLng = Number(punchInLocationRef.current.lng);
      if (Number.isFinite(pLat) && Number.isFinite(pLng) && !(Math.abs(pLat) < 0.1 && Math.abs(pLng) < 0.1)) {
        pos = [pLat, pLng];
      }
    } else if (Array.isArray(points) && points.length > 0) {
      const firstValid = points.find(p => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)) && !(Math.abs(Number(p.lat)) < 0.1 && Math.abs(Number(p.lng)) < 0.1));
      if (firstValid) {
        pos = [Number(firstValid.lat), Number(firstValid.lng)];
      }
    }

    if (!pos || (!hasValidPunchIn && (!points || points.length === 0))) {
      if (startMkRef.current) {
        startMkRef.current.remove();
        startMkRef.current = null;
      }
      return;
    }

    if (!userAdjustedViewportRef.current && isTodaySelected && !points?.length) {
      withProgrammaticViewport(() => {
        lMap.setView(pos, 15);
      });
    }

    const punchInDotHtml = `
      <div class="marker-dot" style="
        width:22px;height:22px;border-radius:50%;background:#16a34a;
        border:3.5px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.35);
        cursor:pointer;
      "></div>
    `;

    const punchInIcon = L.divIcon({
      className: "clean-circle-marker",
      html: punchInDotHtml,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const tooltipHtml = `
      <div style="
        background:#16a34a;color:#ffffff;font-size:11px;font-weight:800;
        padding:4px 10px;border-radius:20px;box-shadow:0 4px 14px rgba(22,163,74,0.45);
        border:2px solid #ffffff;white-space:nowrap;display:flex;align-items:center;gap:5px;
      ">
        <span style="width:6px;height:6px;border-radius:50%;background:#ffffff;"></span>
        PUNCH IN
      </div>
    `;

    if (!startMkRef.current) {
      startMkRef.current = L.marker(pos, { icon: punchInIcon, zIndexOffset: 500, title: "Punch-in Location" })
        .addTo(lMap)
        .bindTooltip(tooltipHtml, { permanent: false, direction: "top", offset: [0, -12], className: "custom-clean-tooltip", opacity: 1 })
        .on("click", () => setPunchInPopupOpen(true));
    } else {
      startMkRef.current.setLatLng(pos);
      startMkRef.current.setIcon(punchInIcon);
      startMkRef.current.unbindTooltip().bindTooltip(tooltipHtml, { permanent: false, direction: "top", offset: [0, -12], className: "custom-clean-tooltip", opacity: 1 });
    }
  }, [mapLoaded, hasValidPunchIn, isTodaySelected, withProgrammaticViewport]);

  const updateDistanceStats = useCallback((km, points = 0) => {
    const normalizedKm = Number.isFinite(Number(km)) ? Number(km) : 0;
    const normalizedPoints = Number.isFinite(Number(points)) ? Number(points) : 0;
    
    if (
      lastDistanceStatsRef.current.totalKm === normalizedKm &&
      lastDistanceStatsRef.current.totalPoints === normalizedPoints
    ) {
      return;
    }
    lastDistanceStatsRef.current = { totalKm: normalizedKm, totalPoints: normalizedPoints };

    // Align cumulative replay distances so the simulator exactly matches the official attendance distance
    if (normalizedKm > 0 && Array.isArray(cumulativeDistancesRef.current) && cumulativeDistancesRef.current.length > 0) {
      const distArr = cumulativeDistancesRef.current;
      const rawEnd = distArr[distArr.length - 1] || 0;
      if (rawEnd > 0) {
        const scale = normalizedKm / rawEnd;
        cumulativeDistancesRef.current = distArr.map((v) => Math.round(v * scale * 100) / 100);
      }
    }

    setTotalKm(normalizedKm);
    setPointCount(normalizedPoints);
    if (typeof onDistanceChangeRef.current === "function") {
      onDistanceChangeRef.current({ totalKm: normalizedKm, totalPoints: normalizedPoints });
    }
  }, []);

  useEffect(() => {
    visitsRef.current = visits;
  }, [visits]);

  useEffect(() => {
    punchInLocationRef.current = punchInLocation;
  }, [punchInLocation]);

  useEffect(() => {
    punchOutLocationRef.current = punchOutLocation;
  }, [punchOutLocation]);

  const [mapAuthError, setMapAuthError] = useState(false);

  useEffect(() => {
    window.gm_authFailure = () => {
      setMapAuthError(true);
      toast.warn("Google Maps API key billing error. Switched to OpenStreetMap.", { id: "gmap-billing-err", duration: 8000 });
    };
  }, []);

  useEffect(() => {
    if (mapAuthError && mapDivRef.current && !leafletMapRef.current) {
      if (gMapRef.current) {
        gMapRef.current = null;
      }
      try {
        mapDivRef.current.innerHTML = "";
        const lMap = L.map(mapDivRef.current).setView([20.29044, 85.86197], 15);
        L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          maxZoom: 20,
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
          attribution: "Google Maps",
        }).addTo(lMap);
        leafletMapRef.current = lMap;
        setMapLoaded(true);
      } catch { /* non-fatal */ }
    }
  }, [mapAuthError]);

  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch { /* non-fatal */ }
        leafletMapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapDivRef.current) return;
    const observer = new MutationObserver(() => {
      if (!mapDivRef.current) return;
      const errNodes = mapDivRef.current.querySelectorAll(
        '.gm-err-container, .gm-style-moc, div[style*="z-index: 1000001"], div[style*="z-index: 1000000"]'
      );
      errNodes.forEach((node) => {
        try { node.remove(); } catch {}
      });
    });
    observer.observe(mapDivRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    window.onGMapAuthError = () => {
      if (mapDivRef.current && !leafletMapRef.current) {
        try {
          if (gMapRef.current) gMapRef.current = null;
          mapDivRef.current.innerHTML = "";
          const lMap = L.map(mapDivRef.current).setView([20.2961, 85.8245], 13);
          L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
            maxZoom: 20,
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
            attribution: "© Google Maps",
          }).addTo(lMap);
          leafletMapRef.current = lMap;
          setMapLoaded(true);
        } catch { /* non-fatal */ }
      }
    };
    return () => {
      window.onGMapAuthError = null;
    };
  }, []);

  // ── Init Google Map Tiles via Leaflet ──────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || leafletMapRef.current) return;
    try {
      mapDivRef.current.innerHTML = "";
      const lMap = L.map(mapDivRef.current).setView([20.2961, 85.8245], 13);
      L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        attribution: "&copy; Google Maps",
      }).addTo(lMap);

      lMap.on("dragstart", () => {
        if (!suppressViewportEventsRef.current) userAdjustedViewportRef.current = true;
      });
      lMap.on("zoomstart", () => {
        if (!suppressViewportEventsRef.current) userAdjustedViewportRef.current = true;
      });

      leafletMapRef.current = lMap;
      setMapLoaded(true);
    } catch (e) {
      console.error("Map initialization error:", e);
    }
  }, []);

  useEffect(() => {
    if (!leafletMapRef.current || !mapLoaded) return;

    if (tileLayerRef.current) {
      try {
        leafletMapRef.current.removeLayer(tileLayerRef.current);
      } catch {}
    }

    let lyrs = "m";
    if (mapTileType === "satellite") lyrs = "s";
    if (mapTileType === "hybrid") lyrs = "y";

    tileLayerRef.current = L.tileLayer(
      `https://{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`,
      {
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        attribution: "&copy; Google Maps",
      }
    ).addTo(leafletMapRef.current);
  }, [mapTileType, mapLoaded]);

  // ── Place punch-in marker ───────────────────────────────────────────────────
  useEffect(() => {
    syncStartMarker();
  }, [mapLoaded, punchInLocation, syncStartMarker]);

  // ── Draw visit markers ──────────────────────────────────────────────────────
  useEffect(() => {
    const lMap = leafletMapRef.current;
    if (!mapLoaded || !lMap) return;

    visitMkRef.current.forEach((m) => m.remove());
    visitMkRef.current = [];

    (visits || []).forEach((v, idx) => {
      const lat = v.coordinates?.lat ?? v.location?.lat ?? v.location?.latitude ?? v.lat ?? v.latitude;
      const lng = v.coordinates?.lng ?? v.coordinates?.longitude ?? v.location?.lng ?? v.location?.longitude ?? v.lng ?? v.longitude;
      if (!lat || !lng) return;

      const isCompleted = v.status === "completed" || v.completedAt;
      const color = isCompleted ? "#16a34a" : "#f59e0b";
      const visitIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:26px;height:26px;border-radius:50%;
          background:${color};border:2px solid #ffffff;
          box-shadow:0 2px 6px rgba(0,0,0,0.25);
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-size:10px;font-weight:700;
        ">${idx + 1}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const mk = L.marker([Number(lat), Number(lng)], { icon: visitIcon, zIndexOffset: 400 })
        .addTo(lMap)
        .bindPopup(`
          <div style="font-family:sans-serif;padding:4px;max-width:200px">
            <strong style="font-size:13px">${v.partyName || "Visit #" + (idx + 1)}</strong><br/>
            <span style="font-size:11px;color:#64748b">${v.address || ""}</span><br/>
            <span style="font-size:11px;font-weight:700;color:${color}">
              ${isCompleted ? "Completed" : "Pending"}
            </span>
          </div>
        `);

      visitMkRef.current.push(mk);
    });
  }, [mapLoaded, visits]);

  const syncEndMarker = useCallback((points = allPtsRef.current) => {
    const lMap = leafletMapRef.current;
    if (!mapLoaded || !lMap) return;

    let pos = null;
    let isExplicitPunchOut = false;

    if (punchOutLocationRef.current?.lat && punchOutLocationRef.current?.lng) {
      pos = [Number(punchOutLocationRef.current.lat), Number(punchOutLocationRef.current.lng)];
      isExplicitPunchOut = true;
    } else if (!isLive && Array.isArray(points) && points.length >= 2) {
      const lastPt = points[points.length - 1];
      if (lastPt?.lat && lastPt?.lng) {
        pos = [Number(lastPt.lat), Number(lastPt.lng)];
      }
    }

    if (!pos || (!hasPunchedOut && isLive)) {
      if (endMkRef.current) {
        endMkRef.current.remove();
        endMkRef.current = null;
      }
      return;
    }

    const labelText = isExplicitPunchOut || hasPunchedOut ? "PUNCH OUT" : "END POINT";
    const punchOutDotHtml = `
      <div class="marker-dot" style="
        width:22px;height:22px;border-radius:50%;background:#dc2626;
        border:3.5px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.35);
        cursor:pointer;
      "></div>
    `;

    const punchOutIcon = L.divIcon({
      className: "clean-circle-marker",
      html: punchOutDotHtml,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const tooltipHtml = `
      <div style="
        background:#dc2626;color:#ffffff;font-size:11px;font-weight:800;
        padding:4px 10px;border-radius:20px;box-shadow:0 4px 14px rgba(220,38,38,0.45);
        border:2px solid #ffffff;white-space:nowrap;display:flex;align-items:center;gap:5px;
      ">
        <span style="width:6px;height:6px;border-radius:50%;background:#ffffff;"></span>
        ${labelText}
      </div>
    `;

    if (!endMkRef.current) {
      endMkRef.current = L.marker(pos, { icon: punchOutIcon, zIndexOffset: 450, title: labelText })
        .addTo(lMap)
        .bindTooltip(tooltipHtml, { permanent: false, direction: "top", offset: [0, -12], className: "custom-clean-tooltip", opacity: 1 });
    } else {
      endMkRef.current.setLatLng(pos);
      endMkRef.current.setIcon(punchOutIcon);
      endMkRef.current.unbindTooltip().bindTooltip(tooltipHtml, { permanent: false, direction: "top", offset: [0, -12], className: "custom-clean-tooltip", opacity: 1 });
    }
  }, [hasPunchedOut, isLive, mapLoaded]);

  function clearGpsDots() {
    dotsRef.current.forEach((d) => d.remove());
    dotsRef.current = [];
    setGpsDotCount(0);
  }

  function getGpsDotColor(accuracyValue = 0) {
    const value = Number(accuracyValue) || 0;
    if (!value || value <= 20) return "#16a34a";
    if (value <= 50) return "#d97706";
    return "#dc2626";
  }

  function getLineStyle(mode) {
    if (mode === ROUTE_MODE_RAW) {
      return {
        casingColor: "rgba(255, 255, 255, 0.8)",
        casingWeight: 4.5,
        mainColor: "#38bdf8",
        mainWeight: 3,
        mainOpacity: 0.9,
      };
    }

    return {
      casingColor: "#ffffff",
      casingWeight: 7,
      mainColor: "#2563eb",
      mainWeight: 4.5,
      mainOpacity: 0.95,
    };
  }

  function drawGpsDots(rawPoints = []) {
    const lMap = leafletMapRef.current;
    if (!lMap) return;

    dotsRef.current.forEach((d) => d.remove());
    dotsRef.current = [];

    if (routeMode !== ROUTE_MODE_RAW) {
      setGpsDotCount(prev => (prev === 0 ? prev : 0));
      return;
    }

    const candidatePoints = Array.isArray(rawPoints) && rawPoints.length > 0
      ? rawPoints
      : allPtsRef.current;

    const visiblePoints = candidatePoints.slice(-MAX_VISIBLE_GPS_DOTS);

    dotsRef.current = visiblePoints.map((p, idx) => {
      const isLatest = idx === visiblePoints.length - 1;
      const dotColor = getGpsDotColor(p.accuracy);
      const radius = isLatest ? 6 : 4;
      const marker = L.circleMarker([p.lat, p.lng], {
        radius,
        color: "#ffffff",
        weight: isLatest ? 2 : 1,
        fillColor: dotColor,
        fillOpacity: isLatest ? 0.95 : 0.75,
      }).addTo(lMap);

      const timeStr = p.recordedAt || p.time
        ? new Date(p.recordedAt || p.time).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
        : "Point #" + (idx + 1);
      const speedStr = p.speed ? `${Math.round(p.speed * 3.6)} km/h` : "--";
      const accStr = p.accuracy ? `±${Math.round(p.accuracy)}m` : "--";

      const popupHtml = `
        <div style="font-family:sans-serif;padding:6px;min-width:180px">
          <div style="font-size:12px;font-weight:800;color:#2563eb;margin-bottom:4px;display:flex;align-items:center;gap:4px">
            <span>📍 Road Location Ping</span>
          </div>
          <div style="font-size:11px;color:#1e293b;font-weight:700;margin-bottom:2px">
            🕒 Time: <span style="font-weight:600">${timeStr}</span>
          </div>
          <div style="font-size:11px;color:#64748b;display:flex;gap:8px;margin-top:4px">
            <span>🚗 Speed: ${speedStr}</span>
            <span>🎯 Acc: ${accStr}</span>
          </div>
          <div id="dot-addr-${idx}" style="font-size:10.5px;color:#475569;margin-top:6px;border-top:1px solid #e2e8f0;padding-top:4px">
            Loading street name...
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on("click", async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.lat}&lon=${p.lng}&zoom=18&addressdetails=1`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.display_name || data.name || "Street Location";
            const el = document.getElementById(`dot-addr-${idx}`);
            if (el) el.innerText = addr;
          }
        } catch {}
      });

      return marker;
    });

    setGpsDotCount(prev => (prev === candidatePoints.length ? prev : candidatePoints.length));
  }

  function drawTrail(points, options = {}) {
    const { autoFit = false, autoPanLive = false, rawPoints = [] } = options;
    const lMap = leafletMapRef.current;
    if (!lMap) return;

    const effectivePoints = (hasValidPunchIn ? points : []).filter(
      (p) =>
        p &&
        Number.isFinite(Number(p.lat)) &&
        Number.isFinite(Number(p.lng)) &&
        !(Math.abs(Number(p.lat)) < 0.1 && Math.abs(Number(p.lng)) < 0.1)
    );
    allPtsRef.current = effectivePoints;
    setReplayPointsVersion((prev) => prev + 1);

    const arr = [0];
    let cum = 0;
    for (let i = 1; i < effectivePoints.length; i++) {
      const p1 = effectivePoints[i - 1];
      const p2 = effectivePoints[i];
      if (p1 && p2 && Number.isFinite(p1.lat) && Number.isFinite(p2.lat)) {
        cum += haversineKm(p1.lat, p1.lng, p2.lat, p2.lng);
      }
      arr.push(Math.round(cum * 100) / 100);
    }
    cumulativeDistancesRef.current = arr;

    if (typeof onPointsChangeRef.current === "function") onPointsChangeRef.current(effectivePoints);

    const lineStyle = getLineStyle(routeMode);
    const latlngs = effectivePoints.map((p) => [p.lat, p.lng]);
    const shouldDrawLine = hasValidPunchIn && latlngs.length >= 2;

    if (shouldDrawLine) {
      if (!polyRef.current.casing) {
        const casing = L.polyline(latlngs, {
          color: lineStyle.casingColor,
          weight: lineStyle.casingWeight,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
          smoothFactor: 1.0,
        }).addTo(lMap);

        const main = L.polyline(latlngs, {
          color: lineStyle.mainColor,
          weight: lineStyle.mainWeight,
          opacity: lineStyle.mainOpacity,
          lineCap: "round",
          lineJoin: "round",
          smoothFactor: 1.0,
        }).addTo(lMap);

        main.on("click", async (e) => {
          const clickLat = e.latlng.lat;
          const clickLng = e.latlng.lng;
          const pop = L.popup()
            .setLatLng(e.latlng)
            .setContent(`
              <div style="font-family:sans-serif;padding:6px;min-width:180px">
                <div style="font-size:12px;font-weight:800;color:#2563eb;margin-bottom:4px">
                  🛣️ Traveled Road Path
                </div>
                <div id="route-click-addr" style="font-size:11px;color:#1e293b;font-weight:600">
                  Loading street details...
                </div>
                <div style="font-size:10px;color:#64748b;margin-top:4px">
                  Lat: ${clickLat.toFixed(5)}, Lng: ${clickLng.toFixed(5)}
                </div>
              </div>
            `)
            .openOn(lMap);

          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickLat}&lon=${clickLng}&zoom=18&addressdetails=1`);
            if (res.ok) {
              const data = await res.json();
              const addr = data.display_name || data.name || "Street Location";
              const el = document.getElementById("route-click-addr");
              if (el) el.innerText = addr;
            }
          } catch {}
        });

        polyRef.current = { casing, main };
      } else {
        polyRef.current.casing.setLatLngs(latlngs);
        polyRef.current.main.setLatLngs(latlngs);
        polyRef.current.casing.setStyle({
          color: lineStyle.casingColor,
          weight: lineStyle.casingWeight,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        });
        polyRef.current.main.setStyle({
          color: lineStyle.mainColor,
          opacity: lineStyle.mainOpacity,
          weight: lineStyle.mainWeight,
          lineCap: "round",
          lineJoin: "round",
        });
      }
    } else {
      if (polyRef.current.casing) { polyRef.current.casing.remove(); }
      if (polyRef.current.main)   { polyRef.current.main.remove(); }
      polyRef.current = { casing: null, main: null };
    }

    drawGpsDots(hasValidPunchIn ? rawPoints : []);

    const last = effectivePoints[effectivePoints.length - 1];
    if (last) {
      const prevLoc = lastEmittedLocationRef.current;
      if (
        typeof onCurrentLocationChange === "function" &&
        (!prevLoc || prevLoc.lat !== last.lat || prevLoc.lng !== last.lng)
      ) {
        lastEmittedLocationRef.current = last;
        onCurrentLocationChange(last);
      }
      if (isLive) {
        const radarHtml = `<div style="
          width:44px;height:44px;border-radius:50%;
          background:radial-gradient(circle,rgba(37,99,235,0.95) 0%,rgba(59,130,246,0.45) 65%,transparent 100%);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 0 0 rgba(37,99,235,0.4);
          animation:radarPing 1.5s ease-out infinite;
        "><div style="width:16px;height:16px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center">
          <div style="width:11px;height:11px;border-radius:50%;background:#2563eb"></div></div></div>`;
        const liveIcon = L.divIcon({ className: "", html: radarHtml, iconSize: [44, 44], iconAnchor: [22, 22] });
        if (liveMkRef.current) {
          liveMkRef.current.setLatLng([last.lat, last.lng]);
        } else {
          liveMkRef.current = L.marker([last.lat, last.lng], { icon: liveIcon, zIndexOffset: 600, title: "User Live Position" })
            .addTo(lMap)
            .on("click", () => {
              withProgrammaticViewport(() => lMap.setView([last.lat, last.lng], 18));
              toast.success("Zoomed to Live Location", { id: "locate-toast" });
            });
        }
      } else if (liveMkRef.current) {
        liveMkRef.current.remove();
        liveMkRef.current = null;
      }
      if (isLive && autoPanLive && !userAdjustedViewportRef.current) {
        withProgrammaticViewport(() => lMap.panTo([last.lat, last.lng]));
      }
    } else {
      if (liveMkRef.current) {
        liveMkRef.current.remove();
        liveMkRef.current = null;
      }
    }

    syncEndMarker(effectivePoints);
    syncStartMarker(effectivePoints);

    if (shouldDrawLine && !isLive && autoFit && !userAdjustedViewportRef.current) {
      withProgrammaticViewport(() => lMap.fitBounds(latlngs, { padding: [40, 40] }));
    }

    const km = hasValidPunchIn ? calcFilteredKm(effectivePoints) : 0;
    const targetKm = (lastDistanceStatsRef.current.totalKm > 0 ? lastDistanceStatsRef.current.totalKm : km);
    
    // Calibrate cumulative replay distance to match verified official distance
    const rawTotal = arr[arr.length - 1] || 0;
    if (targetKm > 0 && rawTotal > 0) {
      const scale = targetKm / rawTotal;
      cumulativeDistancesRef.current = arr.map((v) => Math.round(v * scale * 100) / 100);
    }

    if (!isLive && effectivePoints.length >= 2 && !replayMarkerRef.current) {
      moveReplay(0, effectivePoints);
    }

    updateDistanceStats(km, effectivePoints.length);
  }

  function perpendicularDistance(pt, lineStart, lineEnd) {
    const dx = lineEnd.lng - lineStart.lng;
    const dy = lineEnd.lat - lineStart.lat;
    if (dx === 0 && dy === 0) {
      return distMetres(pt.lat, pt.lng, lineStart.lat, lineStart.lng);
    }
    const meanLat = (lineStart.lat + lineEnd.lat + pt.lat) / 3;
    const kx = 111320 * Math.cos((meanLat * Math.PI) / 180);
    const ky = 110540;

    const x = pt.lng * kx;
    const y = pt.lat * ky;
    const x1 = lineStart.lng * kx;
    const y1 = lineStart.lat * ky;
    const x2 = lineEnd.lng * kx;
    const y2 = lineEnd.lat * ky;

    const num = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
    const den = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
    return den === 0 ? 0 : num / den;
  }

  function ramerDouglasPeucker(points = [], epsilonMetres = 16) {
    if (!Array.isArray(points) || points.length <= 2) return points;

    let dmax = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
      const d = perpendicularDistance(points[i], points[0], points[end]);
      if (d > dmax) {
        index = i;
        dmax = d;
      }
    }

    if (dmax > epsilonMetres) {
      const recResults1 = ramerDouglasPeucker(points.slice(0, index + 1), epsilonMetres);
      const recResults2 = ramerDouglasPeucker(points.slice(index), epsilonMetres);
      return [...recResults1.slice(0, recResults1.length - 1), ...recResults2];
    } else {
      return [points[0], points[end]];
    }
  }

  function pruneRetracingSpurs(points = []) {
    if (!Array.isArray(points) || points.length < 5) return points;
    const result = [];
    let i = 0;
    while (i < points.length) {
      let spurFound = false;
      for (let k = 3; k <= Math.min(14, points.length - i - 1); k++) {
        const startPt = points[i];
        const endPt = points[i + k];
        const d = distMetres(startPt.lat, startPt.lng, endPt.lat, endPt.lng);
        if (d < 18) {
          let maxDetour = 0;
          for (let j = i + 1; j < i + k; j++) {
            maxDetour = Math.max(maxDetour, distMetres(startPt.lat, startPt.lng, points[j].lat, points[j].lng));
          }
          if (maxDetour < 70) {
            result.push(startPt);
            i = i + k;
            spurFound = true;
            break;
          }
        }
      }
      if (!spurFound) {
        result.push(points[i]);
        i++;
      }
    }
    return result;
  }

  function removeLateralSpikes(points = []) {
    if (!Array.isArray(points) || points.length < 3) return points;

    let current = [...points];
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 3) {
      changed = false;
      iterations++;
      const filtered = [current[0]];

      for (let i = 1; i < current.length - 1; i++) {
        const prev = filtered[filtered.length - 1];
        const curr = current[i];
        const next = current[i + 1];

        const dPrevCurr = distMetres(prev.lat, prev.lng, curr.lat, curr.lng);
        const dCurrNext = distMetres(curr.lat, curr.lng, next.lat, next.lng);
        const dPrevNext = distMetres(prev.lat, prev.lng, next.lat, next.lng);

        const totalDetour = dPrevCurr + dCurrNext;
        const isAcuteSpike = totalDetour >= 12 && dPrevNext < totalDetour * 0.6;

        const prevTime = new Date(prev.recordedAt || prev.time || 0).getTime();
        const nextTime = new Date(next.recordedAt || next.time || 0).getTime();
        const timeSpanSec = (nextTime - prevTime) / 1000;

        if (isAcuteSpike && (!Number.isFinite(timeSpanSec) || timeSpanSec < 180)) {
          changed = true;
          continue;
        }

        filtered.push(curr);
      }

      filtered.push(current[current.length - 1]);
      current = filtered;
    }

    return pruneRetracingSpurs(current);
  }

  function cleanPoints(raw, options = {}) {
    const { allowSparse = false, preserveDetail = false } = options;
    if (!Array.isArray(raw)) return [];
    const cleaned = [];
    for (const p of orderPointsByTime(raw)) {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      const accuracy = Number(p.accuracy ?? 0);
      const distanceFromPrevious = Number(p.distanceFromPrevious ?? 0);
      const recordedAt = p.recordedAt || p.time || null;
      const accuracyLimit = allowSparse ? 150 : preserveDetail ? 100 : 80;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (accuracy && accuracy > accuracyLimit) continue;

      if (cleaned.length === 0) {
        cleaned.push({ lat, lng, accuracy, distanceFromPrevious, recordedAt });
        continue;
      }

      const prev = cleaned[cleaned.length - 1];
      const distM = distMetres(prev.lat, prev.lng, lat, lng);
      const requiredMove = allowSparse
        ? Math.max(5, Math.min(getEffectiveMoveThreshold(accuracy, prev.accuracy), 18))
        : preserveDetail
          ? Math.max(3, Math.min(getEffectiveMoveThreshold(accuracy, prev.accuracy), 12))
        : Math.max(
            getEffectiveMoveThreshold(accuracy, prev.accuracy),
            distanceFromPrevious > 0 ? 10 : 14
          );
      const gpsNoiseRadius = allowSparse
        ? Math.max(5, Math.min(getGpsNoiseRadiusMetres(accuracy, prev.accuracy), 18))
        : preserveDetail
          ? 0
        : getGpsNoiseRadiusMetres(accuracy, prev.accuracy);

      if (distanceFromPrevious <= 0 && distM < (allowSparse ? 5 : preserveDetail ? 3 : 8)) continue;
      if (distM < requiredMove && distanceFromPrevious <= 0) continue;
      if (!allowSparse && !preserveDetail && distM < gpsNoiseRadius) continue;
      const prevTime = new Date(prev.recordedAt || prev.time || 0).getTime();
      const currTime = new Date(recordedAt || 0).getTime();
      const elapsedHours =
        Number.isFinite(prevTime) && Number.isFinite(currTime) && currTime > prevTime
          ? (currTime - prevTime) / 3600000
          : null;
      const maxBySpeed = elapsedHours
        ? Math.max(150, elapsedHours * MAX_COUNTED_SPEED_KMH * 1000)
        : MAX_COUNTED_SEGMENT_METRES;
      if (!allowSparse && distM > Math.min(MAX_COUNTED_SEGMENT_METRES, maxBySpeed)) continue;

      cleaned.push({ lat, lng, accuracy, distanceFromPrevious, recordedAt });
    }

    return removeLateralSpikes(cleaned);
  }

  const fetchRoadTravelDistance = useCallback(async () => {
    if (!userId || !hasValidPunchIn) {
      setRoadTravel({ totalKm: null, segmentCount: 0, loading: false });
      return;
    }
    setRoadTravel((prev) => ({ ...prev, loading: true }));
    try {
      const dateParam = getLocalDateString(selectedDate);
      const res = await fetch(
        `${API}/api/v1/location/travel-distance?salesmanId=${userId}&date=${dateParam}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (!res.ok) {
        setRoadTravel({ totalKm: null, segmentCount: 0, loading: false });
        return;
      }

      const data = await res.json();
      const payload = data?.data || data?.result || data;
      const parsedKm = Number(payload?.totalKm);
      const parsedSegments = Number(payload?.segmentCount);

      setRoadTravel({
        totalKm: Number.isFinite(parsedKm) ? Math.round(parsedKm * 1000) / 1000 : null,
        segmentCount: Number.isFinite(parsedSegments) ? parsedSegments : 0,
        loading: false,
      });

    } catch {
      setRoadTravel({ totalKm: null, segmentCount: 0, loading: false });
    }
  }, [userId, selectedDate, hasValidPunchIn]);

  const fetchBackendDistanceStats = useCallback(async () => {
    if (!userId || !hasValidPunchIn) {
      updateDistanceStats(0, 0);
      return;
    }
    try {
      const dateParam = getLocalDateString(selectedDate);
      const res = await fetch(
        `${API}/api/v1/location/distance?salesmanId=${userId}&date=${dateParam}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (!res.ok) {
        if (allPtsRef.current.length >= 2) {
          updateDistanceStats(calcFilteredKm(allPtsRef.current), allPtsRef.current.length);
        }
        return;
      }
      const data = await res.json();
      const dbKm = Number(data?.data?.totalKm ?? data?.result?.totalKm ?? data?.totalKm ?? 0);
      const dbPoints = Number(data?.data?.totalPoints ?? data?.result?.totalPoints ?? data?.totalPoints ?? 0);
      
      const finalKm = dbKm > 0 ? Math.round(dbKm * 1000) / 1000 : calcFilteredKm(allPtsRef.current);
      const finalPoints = dbPoints > 0 ? dbPoints : allPtsRef.current.length;
      updateDistanceStats(finalKm, finalPoints);
    } catch { /* non-fatal */ }
  }, [userId, selectedDate, updateDistanceStats, hasValidPunchIn]);

  const loadTrailFromDB = useCallback(async (options = {}) => {
    const { autoFit = false } = options;
    if (!userId || !mapLoaded) return;
    if (preferVisitTrail) return;

    if (!hasValidPunchIn) {
      rawPtsRef.current = [];
      allPtsRef.current = [];
      drawTrail([], { autoFit: false, rawPoints: [] });
      updateDistanceStats(0, 0);
      return;
    }

    try {
      let since, until;
      if (selectedDate && selectedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [yyyy, mm, dd] = selectedDate.split("-").map(Number);
        since = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
        until = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999);
      } else {
        const now = new Date();
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        until = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      }

      const dateParam = getLocalDateString(selectedDate);
      const url = `${API}/api/v1/location/today?salesmanId=${userId}&date=${dateParam}&startTime=${since.toISOString()}&endTime=${until.toISOString()}`;

      const res     = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data    = await res.json();

      const raw = extractLocationPoints(data);
      const validRaw = (Array.isArray(raw) ? raw : [])
        .map((p) => ({
          lat: Number(p.lat ?? p.latitude),
          lng: Number(p.lng ?? p.longitude),
          accuracy: Number(p.accuracy ?? 0),
          speed: Number(p.speed ?? 0),
          recordedAt: p.recordedAt || p.time || null,
        }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(Math.abs(p.lat) < 0.001 && Math.abs(p.lng) < 0.001));

      rawPtsRef.current = validRaw;
      const preserveDetail = routeMode === ROUTE_MODE_RAW;
      const cleaned = cleanPoints(validRaw, { preserveDetail, allowSparse: true });
      const finalTrail = cleaned.length >= 2 ? cleaned : validRaw;

      const visitFallbackTrail = extractVisitTrailPoints(
        visitsRef.current,
        punchInLocationRef.current
      );

      const baseTrail =
        finalTrail.length >= 2
          ? finalTrail
          : visitFallbackTrail.length >= 2
            ? visitFallbackTrail
            : finalTrail.length > 0
              ? finalTrail
              : visitFallbackTrail;

      if (baseTrail.length > 0) {
        const merged = ensureTrailStartsAtPunchIn(
          [...baseTrail],
          punchInLocationRef.current
        );
        if (isLive && isTodaySelected) {
          for (const lp of allPtsRef.current) {
            appendSequentialPoint(merged, lp);
          }
        }
        if (routeMode === ROUTE_MODE_ROAD && merged.length >= 2) {
          const corridorSimplified = ramerDouglasPeucker(merged, 16);
          const snapped = await snapPointsToRoads(corridorSimplified.length >= 2 ? corridorSimplified : merged);
          const cleanRoute = pruneRetracingSpurs(snapped);
          drawTrail(cleanRoute.length >= 2 ? cleanRoute : snapped, { autoFit, autoPanLive: isLive, rawPoints: validRaw });
        } else {
          drawTrail(merged, { autoFit, autoPanLive: isLive, rawPoints: validRaw });
        }
        fetchBackendDistanceStats();
      } else {
        drawTrail([], { autoFit: false, rawPoints: [] });
        fetchBackendDistanceStats();
      }
    } catch (err) {
      toast.error(err.message, { title: "Error Fetching Trail" });
    }
  }, [userId, mapLoaded, isLive, isTodaySelected, preferVisitTrail, routeMode, selectedDate, updateDistanceStats, fetchBackendDistanceStats, hasValidPunchIn]);

  const loadTrailFromDBRef = useRef(loadTrailFromDB);
  loadTrailFromDBRef.current = loadTrailFromDB;

  useEffect(() => {
    if (!mapLoaded) return;

    if (preferVisitTrail) {
      const currentVisits = visitsRef.current || [];
      if (!hasValidPunchIn && currentVisits.length === 0) {
        rawPtsRef.current = [];
        allPtsRef.current = [];
        drawTrail([], { autoFit: false, rawPoints: [] });
        updateDistanceStats(0, 0);
        return;
      }
      const visitTrail = ensureTrailStartsAtPunchIn(
        extractVisitTrailPoints(currentVisits, punchInLocationRef.current),
        punchInLocationRef.current
      );
      rawPtsRef.current = visitTrail;
      drawTrail(visitTrail, { autoFit: true, rawPoints: visitTrail });
      return;
    }

    loadTrailFromDBRef.current({ autoFit: true });
  }, [mapLoaded, userId, selectedDate, preferVisitTrail, routeMode, hasValidPunchIn]);

  useEffect(() => {
    if (routeMode === ROUTE_MODE_ROAD) {
      fetchRoadTravelDistance();
    }
  }, [routeMode, fetchRoadTravelDistance]);

  useEffect(() => {
    if (!isOwner) return;

    const wasIn  = prevPunchedIn.current;
    const wasOut = prevPunchedOut.current;
    prevPunchedIn.current  = isPunchedIn;
    prevPunchedOut.current = hasPunchedOut;

    if (isPunchedIn && !hasPunchedOut && !wasIn) {
      allPtsRef.current = [];
      rawPtsRef.current = [];
      clearGpsDots();
      userAdjustedViewportRef.current = false;
      drawTrail([], { autoFit: false, rawPoints: [] });

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const pt = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            time: new Date().toISOString(),
          };
          allPtsRef.current = [pt];
          rawPtsRef.current = [pt];
          syncStartMarker([pt]);
          drawTrail([pt], { autoFit: false, autoPanLive: true, rawPoints: [pt] });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10_000 }
      );

      startTracking(
        (pt) => {
          const currentPts = [...allPtsRef.current];
          const rawPts = [...rawPtsRef.current];
          appendSequentialPoint(rawPts, pt, 1);
          rawPtsRef.current = rawPts;
          setAccuracy(pt.accuracy);

          const minMoveRequired = routeMode === ROUTE_MODE_RAW
            ? 3
            : getEffectiveMoveThreshold(
                pt.accuracy,
                currentPts[currentPts.length - 1]?.accuracy
              );

          const lastPt = currentPts[currentPts.length - 1];
          const moved = lastPt ? distMetres(lastPt.lat, lastPt.lng, pt.lat, pt.lng) : 0;
          if (!lastPt || (moved >= minMoveRequired && moved <= MAX_LIVE_SEGMENT_METRES)) {
            const updated = appendSequentialPoint(currentPts, pt);
            allPtsRef.current = updated;
            drawTrail(updated, { autoFit: false, autoPanLive: true, rawPoints: rawPts });
          } else {
            drawGpsDots(rawPts);
            if (liveMkRef.current) {
              liveMkRef.current.setLatLng([pt.lat, pt.lng]);
            }
          }
        },
        socketRef,
        userId
      );
    }

    if (hasPunchedOut && !wasOut) {
      if (isCurrentlyTracking()) stopTracking();
      setTimeout(() => loadTrailFromDB({ autoFit: false }), 2000);
    }
  }, [isPunchedIn, hasPunchedOut, socketRef, mapLoaded, loadTrailFromDB, userId, routeMode]);

  useEffect(() => {
    const lMap = leafletMapRef.current;
    if (!isOwner || !isPunchedIn || hasPunchedOut || !mapLoaded || !lMap) return;

    const updateDot = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = pos.coords.accuracy ?? 0;

          if (acc > 150) return;

          if (liveMkRef.current) {
            liveMkRef.current.setLatLng([lat, lng]);
          } else {
            const radarHtml = `<div style="
              width:44px;height:44px;border-radius:50%;
              background:radial-gradient(circle,rgba(37,99,235,0.95) 0%,rgba(59,130,246,0.45) 65%,transparent 100%);
              display:flex;align-items:center;justify-content:center;
            "><div style="width:16px;height:16px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center">
              <div style="width:11px;height:11px;border-radius:50%;background:#2563eb"></div></div></div>`;
            const liveIcon = L.divIcon({ className: "", html: radarHtml, iconSize: [44, 44], iconAnchor: [22, 22] });
            liveMkRef.current = L.marker([lat, lng], { icon: liveIcon, zIndexOffset: 600, title: "Live Location" }).addTo(lMap);
          }

          const livePoint = { lat, lng, accuracy: acc };
          const rawMerged = [...rawPtsRef.current];
          appendSequentialPoint(rawMerged, livePoint, 1);
          rawPtsRef.current = rawMerged;

          const lastTrailPt = allPtsRef.current[allPtsRef.current.length - 1];
          if (lastTrailPt) {
            const moved = distMetres(lastTrailPt.lat, lastTrailPt.lng, lat, lng);
            const minMoveRequired = routeMode === ROUTE_MODE_RAW
              ? 3
              : getEffectiveMoveThreshold(acc, lastTrailPt.accuracy);
            if (moved >= minMoveRequired && moved <= MAX_LIVE_SEGMENT_METRES) {
              const updated = appendSequentialPoint([...allPtsRef.current], livePoint);
              allPtsRef.current = updated;
              drawTrail(updated, { autoFit: false, autoPanLive: false, rawPoints: rawMerged });
            } else if (!userAdjustedViewportRef.current) {
              withProgrammaticViewport(() => lMap.panTo([lat, lng]));
            }
          } else {
            if (!userAdjustedViewportRef.current) {
              withProgrammaticViewport(() => lMap.panTo([lat, lng]));
            }
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 5_000 }
      );
    };

    updateDot();
    const id = setInterval(updateDot, 10_000);
    return () => clearInterval(id);
  }, [isOwner, isPunchedIn, hasPunchedOut, mapLoaded, routeMode]);

  useEffect(() => {
    return () => { if (isCurrentlyTracking()) stopTracking(); };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onAck   = (data) => setSockAck(data.timestamp);
    const onError = (data) => toast.error(data.message || "Socket error.", { title: "Live Sync Error" });

    const onGeofenceAlert = (data) => {
      const msg = `${data.event === "entered" ? "🟠 Entered" : "⚪ Exited"} "${data.name}"`;
      toast[data.event === "entered" ? "warn" : "info"](msg, { title: "Geofence Alert" });
      setGeofenceAlerts((prev) => [{ ...data, id: Date.now() }, ...prev.slice(0, 19)]);
    };

    const onLiveUpdate = (data) => {
      if (data.userId && userId && String(data.userId) !== String(userId)) return;
      if (!data.lat || !data.lng) return;
      const livePoint = { lat: data.lat, lng: data.lng, accuracy: data.accuracy };
      const rawMerged = [...rawPtsRef.current];
      appendSequentialPoint(rawMerged, livePoint, 1);
      rawPtsRef.current = rawMerged;

      const last = allPtsRef.current[allPtsRef.current.length - 1];
      if (last) {
        const dist = distMetres(last.lat, last.lng, data.lat, data.lng);
        const minMoveRequired = routeMode === ROUTE_MODE_RAW
          ? 3
          : getEffectiveMoveThreshold(data.accuracy, last.accuracy);
        if (dist < minMoveRequired || dist > MAX_LIVE_SEGMENT_METRES) {
          if (liveMkRef.current && dist <= MAX_LIVE_SEGMENT_METRES) {
            animateMarkerSmooth(liveMkRef.current, data.lat, data.lng, 600);
          }
          return;
        }
      }

      const merged = [...allPtsRef.current, livePoint];
      const finalTrail = cleanPoints(merged, { preserveDetail: routeMode === ROUTE_MODE_RAW });
      allPtsRef.current = finalTrail;
      drawTrail(finalTrail, { autoFit: false, autoPanLive: false, rawPoints: rawPtsRef.current });
    };

    socket.on("location:ack",         onAck);
    socket.on("location:error",       onError);
    socket.on("location:live_update", onLiveUpdate);
    socket.on("geofence:alert",       onGeofenceAlert);

    return () => {
      socket.off("location:ack",         onAck);
      socket.off("location:error",       onError);
      socket.off("location:live_update", onLiveUpdate);
      socket.off("geofence:alert",       onGeofenceAlert);
    };
  }, [socket, userId, routeMode]);

  useEffect(() => {
    if (!socket || !userId || isOwner) return;
    socket.emit("location:watch_user", { userId });
  }, [socket, userId, isOwner]);

  // ── Pan and Zoom to User Location when Live Location button is clicked ──────
  useEffect(() => {
    const lMap = leafletMapRef.current;
    if (!locateTrigger || !lMap || !mapLoaded) return;

    userAdjustedViewportRef.current = false;

    let targetLat = null;
    let targetLng = null;

    if (liveMkRef.current) {
      const pos = liveMkRef.current.getLatLng();
      targetLat = pos.lat;
      targetLng = pos.lng;
    } else if (allPtsRef.current.length > 0) {
      const last = allPtsRef.current[allPtsRef.current.length - 1];
      targetLat = last.lat;
      targetLng = last.lng;
    } else if (rawPtsRef.current.length > 0) {
      const last = rawPtsRef.current[rawPtsRef.current.length - 1];
      targetLat = last.lat;
      targetLng = last.lng;
    } else if (punchInLocationRef.current?.lat && punchInLocationRef.current?.lng) {
      targetLat = Number(punchInLocationRef.current.lat);
      targetLng = Number(punchInLocationRef.current.lng);
    } else if (visitsRef.current && visitsRef.current.length > 0) {
      const v = visitsRef.current[0];
      targetLat = Number(v.coordinates?.lat || v.lat);
      targetLng = Number(v.coordinates?.lng || v.lng);
    }

    if (targetLat && targetLng && Number.isFinite(targetLat) && Number.isFinite(targetLng)) {
      withProgrammaticViewport(() => lMap.setView([targetLat, targetLng], 18));
      toast.success("Centered on user location", { id: "locate-toast" });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          withProgrammaticViewport(() => lMap.setView([lat, lng], 18));
          toast.success("Centered on device location", { id: "locate-toast" });
        },
        () => toast.error("Could not determine current location.")
      );
    }
  }, [locateTrigger, mapLoaded, withProgrammaticViewport]);

  // ── punchInPopupTrigger: pan to punch-in + open popup ─────────────────────
  useEffect(() => {
    if (!punchInPopupTrigger || !mapLoaded) return;
    const lMap = leafletMapRef.current;
    const pi = punchInLocationRef.current;
    if (lMap && pi?.lat && pi?.lng) {
      withProgrammaticViewport(() => {
        lMap.setView([Number(pi.lat), Number(pi.lng)], 16, { animate: true });
      });
    }
    setPunchInPopupOpen(true);
  }, [punchInPopupTrigger, mapLoaded, withProgrammaticViewport]);

  const accuracyColor =
      accuracy == null ? "#94a3b8"
    : accuracy <= 20   ? "#16a34a"
    : accuracy <= 50   ? "#d97706"
    :                    "#dc2626";

  const accuracyLabel =
      accuracy == null ? ""
    : accuracy <= 20   ? "High Precision"
    : accuracy <= 50   ? "Fair"
    :                    "Poor";

  const fmtTime = (iso) =>
    iso
      ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : null;

  const replayPoints = allPtsRef.current || [];
  const currentReplayPoint = replayPoints[replayIndex] || replayPoints[0] || null;
  const replayProgress = replayPoints.length > 1 ? Math.round((replayIndex / (replayPoints.length - 1)) * 100) : 0;

  const replayTimeStr = currentReplayPoint?.recordedAt || currentReplayPoint?.time
    ? new Date(currentReplayPoint.recordedAt || currentReplayPoint.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "00:00";

  const replayKmStr = replayPoints.length > 1
    ? `${calcFilteredKm(replayPoints.slice(0, replayIndex + 1)).toFixed(2)} km`
    : "0.00 km";

  let replayWaypointLabel = "Point A";
  if (replayIndex === 0) {
    replayWaypointLabel = "Punch In";
  } else if (replayIndex >= replayPoints.length - 1) {
    replayWaypointLabel = hasPunchedOut ? "Punch Out" : "Point B";
  } else {
    const pt = replayPoints[replayIndex];
    if (pt) {
      const matchedVisit = (visits || []).find((v) => {
        const vLat = Number(v.lat || v.coordinates?.lat || v.location?.lat);
        const vLng = Number(v.lng || v.coordinates?.lng || v.location?.lng);
        if (Number.isFinite(vLat) && Number.isFinite(vLng)) {
          return distMetres(pt.lat, pt.lng, vLat, vLng) < 80;
        }
        return false;
      });
      if (matchedVisit) {
        replayWaypointLabel = matchedVisit.partyName || matchedVisit.locationName || "Stop";
      } else {
        replayWaypointLabel = `Point ${String.fromCharCode(65 + Math.min(25, Math.floor((replayIndex / Math.max(1, replayPoints.length)) * 5)))}`;
      }
    }
  }

  return (
    <div style={{
      position: isMapFullscreen ? "fixed" : "relative",
      top: isMapFullscreen ? 0 : "auto",
      left: isMapFullscreen ? 0 : "auto",
      width: isMapFullscreen ? "100vw" : "100%",
      height: isMapFullscreen ? "100vh" : height,
      zIndex: isMapFullscreen ? 99999 : "auto",
      borderRadius: isMapFullscreen ? 0 : "inherit",
      background: "#ffffff",
    }}>
      <div ref={mapDivRef} style={{ width: "100%", height: "100%", borderRadius: "inherit" }} />

      {!mapLoaded && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", background: "#f8fafc", borderRadius: "inherit", zIndex: 10,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 36, height: 36, border: "3px solid #e2e8f0",
              borderTopColor: "#0f1f3d", borderRadius: "50%",
              animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
            }} />
            <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>Loading Google Maps…</div>
          </div>
        </div>
      )}



      {/* Floating Status Pill */}
      <div style={{
        position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
        zIndex: 1000, background: "rgba(255,255,255,0.97)", borderRadius: 999,
        padding: "5px 16px", fontSize: 12, fontWeight: 700,
        boxShadow: "0 2px 10px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 7,
        border: `1px solid ${isLive ? "#bbf7d0" : hasPunchedOut ? "#fde68a" : (hasValidPunchIn && (allPtsRef.current.length > 0 || isPunchedIn)) ? "#bfdbfe" : "#e2e8f0"}`,
        color: isLive ? "#16a34a" : hasPunchedOut ? "#d97706" : (hasValidPunchIn && (allPtsRef.current.length > 0 || isPunchedIn)) ? "#2563eb" : "#94a3b8",
        pointerEvents: "none",
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%", display: "inline-block",
          background: isLive ? "#22c55e" : hasPunchedOut ? "#f59e0b" : (hasValidPunchIn && (allPtsRef.current.length > 0 || isPunchedIn)) ? "#2563eb" : "#cbd5e1",
          animation: isLive ? "livePulse 1.5s ease-in-out infinite" : "none",
        }} />
        {isLive
          ? `Live Tracking${connected ? "" : " (socket offline)"}`
          : hasPunchedOut
          ? "Day Completed"
          : isPunchedIn
          ? "Punch In Active"
          : (hasValidPunchIn && allPtsRef.current.length > 0)
          ? "Route Tracked"
          : "Not Punched In"}
      </div>

      {/* ── Punch-in Info Popup Card ─────────────────────────────────── */}
      {punchInPopupOpen && (() => {
        const pi = punchInLocationRef.current;
        const timeStr = pi?.time
          ? new Date(pi.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : null;
        const addrStr = resolvedAddress ||
          (typeof pi?.address === "string" ? pi.address : pi?.address?.full || pi?.address?.short) ||
          null;
        const coordStr = pi?.lat
          ? `${Number(pi.lat).toFixed(5)}, ${Number(pi.lng).toFixed(5)}`
          : null;
        const bat = punchBatteryInfo?.percentage ?? null;
        const batColor = bat === null ? "#94a3b8" : bat > 60 ? "#16a34a" : bat > 20 ? "#d97706" : "#dc2626";
        const batBg   = bat === null ? "#f8fafc"  : bat > 60 ? "rgba(22,163,74,0.1)" : bat > 20 ? "rgba(217,119,6,0.1)" : "rgba(220,38,38,0.1)";
        const batLabel = bat === null ? "—" : `${bat}%${punchBatteryInfo?.isCharging ? " · Charging" : ""}`;
        return (
          <>
            <div onClick={() => setPunchInPopupOpen(false)}
              style={{ position: "absolute", inset: 0, zIndex: 1999 }} />
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -60%)", zIndex: 2000,
              background: "#fff", borderRadius: 16,
              boxShadow: "0 12px 48px rgba(0,0,0,0.22)",
              overflow: "hidden", minWidth: 240, maxWidth: 300,
              fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
            }}>
              <div style={{ background: "#0f1f3d", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,0.35)", flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: "#fff", flex: 1 }}>Punched In</span>
                {timeStr && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{timeStr}</span>}
                <button onClick={() => setPunchInPopupOpen(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4, flexShrink: 0 }}>×</button>
              </div>
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: batBg, borderRadius: 10, padding: "8px 12px" }}>
                  <span style={{ fontSize: 18 }}>{bat === null ? "🔋" : bat > 60 ? "🔋" : bat > 20 ? "🪫" : "🔴"}</span>
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 1 }}>Battery</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: batColor }}>{batLabel}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>📍</span>
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>Location</div>
                    <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{addrStr || coordStr || "Location not available"}</div>
                    {addrStr && coordStr && <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace", marginTop: 3 }}>{coordStr}</div>}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
      {geofenceAlerts.length > 0 && (
        <div style={{
          position: "absolute", top: 50, left: 10, zIndex: 1000,
          maxHeight: 120, overflowY: "auto", display: "flex",
          flexDirection: "column", gap: 4, pointerEvents: "none",
        }}>
          {geofenceAlerts.slice(0, 4).map((a) => (
            <div key={a.id} style={{
              background: "rgba(255,255,255,0.96)", borderRadius: 7,
              padding: "4px 10px", fontSize: 11, fontWeight: 600,
              boxShadow: "0 1px 6px rgba(0,0,0,0.1)",
              color:   a.event === "entered" ? "#c2410c" : "#64748b",
              border: `1px solid ${a.event === "entered" ? "#fed7aa" : "#e2e8f0"}`,
            }}>
              {a.event === "entered" ? "🟠" : "⚪"} {a.name}
            </div>
          ))}
        </div>
      )}


      {accuracy != null && (
        <div style={{
          position: "absolute", top: 10, right: 10, zIndex: 1000,
          background: "rgba(255,255,255,0.97)", borderRadius: 8,
          padding: "4px 10px", fontSize: 11, fontWeight: 700,
          boxShadow: "0 1px 6px rgba(0,0,0,0.1)",
          color: accuracyColor, border: `1px solid ${accuracyColor}40`, pointerEvents: "none",
        }}>
          GPS ±{Math.round(accuracy)} m · {accuracyLabel}
        </div>
      )}

      {/* Route Mode & Fullscreen Controls */}
      <div style={{
        position: "absolute", top: accuracy != null ? 44 : 10, right: 10, zIndex: 1000,
        background: "rgba(255,255,255,0.97)", borderRadius: 8,
        padding: 3, boxShadow: "0 1px 6px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0", display: "flex", gap: 3, alignItems: "center",
      }}>
        {[
          { label: "Map", value: "roadmap" },
          { label: "Satellite", value: "satellite" },
          { label: "Hybrid", value: "hybrid" },
        ].map((layer) => {
          const active = mapTileType === layer.value;
          return (
            <button
              key={layer.value}
              type="button"
              onClick={() => setMapTileType(layer.value)}
              style={{
                border: 0,
                borderRadius: 6,
                padding: "5px 8px",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                color: active ? "#ffffff" : "#475569",
                background: active ? "#0f172a" : "transparent",
                whiteSpace: "nowrap",
              }}
            >
              {layer.label}
            </button>
          );
        })}
        <span style={{ color: "#cbd5e1" }}>|</span>
        {[
          { value: ROUTE_MODE_ROAD, label: "Road Route" },
          { value: ROUTE_MODE_RAW, label: "Raw GPS" },
        ].map((mode) => {
          const active = routeMode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => setRouteMode(mode.value)}
              style={{
                border: 0,
                borderRadius: 6,
                padding: "5px 8px",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                color: active ? "#ffffff" : "#475569",
                background: active ? "#2563eb" : "transparent",
                whiteSpace: "nowrap",
              }}
            >
              {mode.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setIsMapFullscreen((prev) => !prev);
            setTimeout(() => {
              if (leafletMapRef.current) {
                leafletMapRef.current.invalidateSize();
              }
            }, 100);
          }}
          title={isMapFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          style={{
            border: 0,
            borderRadius: 6,
            padding: "5px 8px",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
            color: "#0f172a",
            background: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {isMapFullscreen ? "🗗 Exit" : "⛶ Fullscreen"}
        </button>
      </div>

      {sockAck && (
        <div style={{
          position: "absolute", bottom: 10, right: 10, zIndex: 999,
          background: "rgba(255,255,255,0.95)", borderRadius: 6,
          padding: "4px 10px", fontSize: 10, color: "#16a34a",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)", pointerEvents: "none",
        }}>
          ✓ Saved {fmtTime(sockAck)}
        </div>
      )}

      <div style={{
        position: "absolute", bottom: 10, left: 10, zIndex: 999,
        background: "rgba(255,255,255,0.97)", borderRadius: 10,
        padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#0f172a",
        boxShadow: "0 2px 10px rgba(0,0,0,0.12)", pointerEvents: "none",
        display: "flex", alignItems: "center", gap: 10, border: "1px solid #e2e8f0",
      }}>
        {routeMode === ROUTE_MODE_RAW ? (
          <>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#16a34a",
                border: "2px solid #ffffff",
                boxSizing: "border-box",
              }} />
              GPS points
            </span>
            <span style={{ color: "#e2e8f0" }}>|</span>
            {(gpsDotCount || pointCount) > 0
              ? <span>{gpsDotCount || pointCount} point{(gpsDotCount || pointCount) !== 1 ? "s" : ""}</span>
              : <span style={{ color: "#94a3b8" }}>Waiting for movement...</span>}
          </>
        ) : (
          <>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 18,
                height: 0,
                borderTop: "4px solid #2563eb",
                borderRadius: 999,
              }} />
              Route
            </span>
            <span style={{ color: "#e2e8f0" }}>|</span>
            <span style={{ color: "#475569", fontSize: 11 }}>
              Clean road view
            </span>
          </>
        )}
        {isLive && (
          <>
            <span style={{ color: "#e2e8f0" }}>|</span>
            <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 700 }}>● live</span>
          </>
        )}
      </div>

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes radarPing { 0%{box-shadow:0 0 0 0 rgba(37,99,235,0.4)} 70%{box-shadow:0 0 0 14px rgba(37,99,235,0)} 100%{box-shadow:0 0 0 0 rgba(37,99,235,0)} }
        .punch-in-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          border: none;
        }
        .punch-in-popup .leaflet-popup-content {
          margin: 0;
          line-height: 1;
        }
        .punch-in-popup .leaflet-popup-tip {
          background: #fff;
        }
        .leaflet-tooltip.custom-clean-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          pointer-events: none !important;
        }
        .leaflet-tooltip.custom-clean-tooltip::before,
        .leaflet-tooltip.custom-clean-tooltip::after {
          display: none !important;
        }
        .clean-circle-marker .marker-dot {
          transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.18s ease;
          pointer-events: auto;
        }
        .clean-circle-marker:hover .marker-dot {
          transform: scale(1.25);
          box-shadow: 0 4px 14px rgba(0,0,0,0.45);
        }
      `}</style>
    </div>
  );
}
