// utils/Locationtracker.js

import { toast } from "../components/useToast.jsx";
import { API_ORIGIN } from "./apiConfig";

const API = API_ORIGIN;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function distanceMetres(lat1, lng1, lat2, lng2) {
  const R    = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function reverseGeocode(lat, lng) {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data) {
      const a         = data.address || {};
      const name      = data.name || data.namedetails?.name || null;
      const placeName = name || a.office || a.company || a.shop || a.amenity || a.tourism || a.leisure || a.building || null;
      const fullAddress = [
        a.house_number && a.road ? `${a.house_number} ${a.road}` : (a.road || a.pedestrian || a.footway),
        a.suburb || a.neighbourhood || a.quarter,
        a.city || a.town || a.village || a.county,
        a.state, a.postcode, a.country,
      ].filter(Boolean).join(", ");
      const shortName =
        placeName ||
        [a.road || a.pedestrian, a.suburb || a.neighbourhood, a.city || a.town || a.village]
          .filter(Boolean).join(", ") ||
        data.display_name?.split(",").slice(0, 2).join(",").trim() ||
        `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
      return { name: shortName, address: fullAddress || data.display_name || shortName };
    }
  } catch (e) {
    console.warn("[Tracker] Reverse geocode failed:", e.message);
  }
  return { name: `Stop at ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`, address: "" };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DWELL_RADIUS_M  = 50;
const DWELL_TIME_MS   = 15 * 60 * 1000;  // 15 minutes
const COOLDOWN_MS     = 30 * 60 * 1000;  // 30 minutes
const MIN_MOVE_METRES = 12;               // filter out small indoor movements < 12 meters
const MAX_REASONABLE_ACCURACY_METRES = 100; // filter out low accuracy GPS points > 100 meters
const TRACKING_POLL_MS = 10_000;          // backup GPS poll for browsers that throttle watchPosition

function getEffectiveMoveThreshold(currentAccuracy = 0, lastAccuracy = 0) {
  return Math.min(
    45,
    Math.max(
      MIN_MOVE_METRES,
      ((Number(currentAccuracy) || 0) + (Number(lastAccuracy) || 0)) * 0.35
    )
  );
}

// ─── Module-level state ───────────────────────────────────────────────────────
let dwellAnchor      = null;
let recentVisitSpots = [];
let watchId          = null;
let buffer           = [];
let allPoints        = [];
let flushTimer       = null;
let pollTimer        = null;
let isTracking       = false;
let onPointCallback  = null;
let socketRef        = null;

let _userId            = null;
let _shownPoorGpsToast = false;
let _shownOfflineToast = false;
let _flushFailCount    = 0;

const getToken = () =>
  localStorage.getItem("token")      ||
  localStorage.getItem("authToken")  ||
  localStorage.getItem("accessToken") || "";

// ── safeEmit ─────────────────────────────────────────────────────────────────
function getSocket() {
  if (!socketRef) return null;
  if (typeof socketRef === "object" && "current" in socketRef) return socketRef.current;
  return socketRef;
}

function safeEmit(event, data) {
  const sock = getSocket();
  if (sock?.connected) sock.emit(event, data);
}

// ─── startTracking ────────────────────────────────────────────────────────────
export function startTracking(onPoint = null, socket = null, userId = null) {
  if (isTracking) {
    console.warn("[Tracker] Already tracking — ignoring duplicate startTracking call.");
    return;
  }

  if (!navigator.geolocation) {
    toast.error("GPS not supported on this device.", { title: "Tracker Error" });
    return;
  }

  if (!userId) {
    console.error(
      "[Tracker] ❌ startTracking called WITHOUT userId! " +
      "Points will NOT be saved to DB. Fix: pass userId as 3rd argument."
    );
  }

  console.log("🟢 TRACKING STARTED — userId:", userId, "| 12 m indoor filter | DB flush every 30 s");

  isTracking         = true;
  buffer             = [];
  allPoints          = [];
  onPointCallback    = onPoint;
  socketRef          = socket;
  dwellAnchor        = null;
  recentVisitSpots   = [];
  _shownPoorGpsToast = false;
  _shownOfflineToast = false;
  _flushFailCount    = 0;
  _userId            = userId;

  // ── Emit location:start with the initial position ────────────────────────
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) {
        console.warn("[GPS] Initial position is zero (0,0) — skipping location:start");
        return;
      }
      safeEmit("location:start", {
        userId,
        lat,
        lng,
        accuracy: pos.coords.accuracy ?? 0,
      });
    },
    () => {},
    { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
  );

  // ── watchPosition — high accuracy live GPS ─────────────────────────────────
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const pt = {
        lat:      pos.coords.latitude,
        lng:      pos.coords.longitude,
        speed:    pos.coords.speed    ?? 0,
        accuracy: pos.coords.accuracy ?? 0,
        time:     new Date(pos.timestamp).toISOString(),
      };

      // 0. Zero coordinate gate: filter out invalid (0, 0) default coordinates
      if (Math.abs(pt.lat) < 0.001 && Math.abs(pt.lng) < 0.001) {
        console.log(`[GPS] ⏭ Skipped — zero coordinate (0, 0)`);
        return;
      }

      // 1. Accuracy gate: filter out low-accuracy GPS points (> 100 meters)
      if (pt.accuracy > MAX_REASONABLE_ACCURACY_METRES) {
        console.log(`[GPS] ⏭ Skipped — accuracy ±${Math.round(pt.accuracy)} m too poor (> 100m)`);
        return;
      }

      // 2. Distance gate — 12 m minimum indoor movement filter
      const last = allPoints[allPoints.length - 1];
      if (last) {
        const dist = distanceMetres(last.lat, last.lng, pt.lat, pt.lng);
        const minMoveRequired = getEffectiveMoveThreshold(pt.accuracy, last.accuracy);
        if (dist < minMoveRequired) {
          console.log(`[GPS] ⏭ Small movement ${dist.toFixed(1)} m < ${minMoveRequired.toFixed(1)} m — skipped`);
          return;
        }

        // 3. Teleportation guard
        const jumpKm = dist / 1000;
        if (jumpKm > 10) {
          console.warn(`[GPS] ❌ Jump ${jumpKm.toFixed(1)} km — skipped`);
          toast.warn(`GPS jumped ${jumpKm.toFixed(1)} km — point skipped.`, { title: "GPS Jump Detected" });
          return;
        }
      }

      // 4. Warn on weak signal
      if (pt.accuracy > 70 && !_shownPoorGpsToast) {
        toast.warn(`GPS accuracy is poor (±${Math.round(pt.accuracy)} m). Move to open sky.`, {
          title: "Weak GPS Signal",
        });
        _shownPoorGpsToast = true;
        setTimeout(() => { _shownPoorGpsToast = false; }, 5 * 60 * 1000);
      }

      allPoints.push(pt);

      const moveDist = last
        ? distanceMetres(last.lat, last.lng, pt.lat, pt.lng).toFixed(0) + " m"
        : "first point";
      console.log(`[GPS] ✅ Real movement ${moveDist} — buffer:${buffer.length} total:${allPoints.length}`);

      // ── Emit live update via socket ─────────────────────────────────────
      const sock = getSocket();
      if (sock?.connected) {
        safeEmit("location:update", {
          userId,
          lat:      pt.lat,
          lng:      pt.lng,
          speed:    pt.speed,
          accuracy: pt.accuracy,
          time:     pt.time,
        });
      } else if (!_shownOfflineToast) {
        buffer.push(pt);
        toast.warn("Socket offline — location not syncing live.", { title: "Live Sync Paused" });
        _shownOfflineToast = true;
        setTimeout(() => { _shownOfflineToast = false; }, 5 * 60 * 1000);
      } else {
        buffer.push(pt);
      }

      if (typeof onPointCallback === "function") {
        onPointCallback([...allPoints]);
      }

      handleAutoVisit(pt);
    },
    (err) => {
      const msgs = {
        1: "Location permission denied. Please allow location access in your browser settings.",
        2: "GPS signal unavailable. Check if location is enabled on your device.",
        3: "GPS timed out. Signal too weak — try moving to an open area.",
      };
      toast.error(msgs[err.code] || `GPS error: ${err.message}`, { title: "Location Error" });
      console.warn("[Tracker] GPS error:", err.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge:         0,      // always fresh position
      timeout:            20_000,
    }
  );

  // ── Backup poll timer ─────────────────────────────────────────────────────
  pollTimer = setInterval(() => {
    if (!isTracking) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt = {
          lat:      pos.coords.latitude,
          lng:      pos.coords.longitude,
          speed:    pos.coords.speed    ?? 0,
          accuracy: pos.coords.accuracy ?? 0,
          time:     new Date(pos.timestamp || Date.now()).toISOString(),
        };

        if (Math.abs(pt.lat) < 0.001 && Math.abs(pt.lng) < 0.001) {
          return;
        }

        if (pt.accuracy > MAX_REASONABLE_ACCURACY_METRES) {
          return;
        }

        const last = allPoints[allPoints.length - 1];
        if (last) {
          const dist = distanceMetres(last.lat, last.lng, pt.lat, pt.lng);
          const minMoveRequired = getEffectiveMoveThreshold(pt.accuracy, last.accuracy);
          if (dist < minMoveRequired) {
            return;
          }
          if (dist / 1000 > 10) {
            return;
          }
        }

        allPoints.push(pt);

        const sock = getSocket();
        if (sock?.connected) {
          safeEmit("location:update", {
            userId,
            lat:      pt.lat,
            lng:      pt.lng,
            speed:    pt.speed,
            accuracy: pt.accuracy,
            time:     pt.time,
          });
        } else {
          buffer.push(pt);
        }

        if (typeof onPointCallback === "function") {
          onPointCallback([...allPoints]);
        }

        handleAutoVisit(pt);
      },
      (err) => console.warn("[GPS Poll] failed:", err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 }
    );
  }, TRACKING_POLL_MS);

  flushTimer = setInterval(() => flushBuffer(), 30_000);

  window.addEventListener("requestDwellInfo", handleDwellInfoRequest);
  toast.success("Location tracking started.", { title: "Tracking Active" });
  console.log("[Tracker] ▶ Started — watchId:", watchId, "| userId:", _userId);
}

// ─── stopTracking ─────────────────────────────────────────────────────────────
export function stopTracking() {
  if (!isTracking) return;

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (flushTimer !== null) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  window.removeEventListener("requestDwellInfo", handleDwellInfoRequest);
  safeEmit("location:stop", { userId: _userId });
  socketRef = null;

  flushBuffer();

  isTracking      = false;
  onPointCallback = null;
  dwellAnchor     = null;
  recentVisitSpots = [];
  _userId         = null;

  toast.info("Location tracking stopped.", { title: "Tracking Ended" });
  console.log("[Tracker] ■ Stopped");
}

// ─── Public helpers ───────────────────────────────────────────────────────────
export function getTrackPoints()      { return [...allPoints]; }
export function clearTrackPoints()    { allPoints = []; buffer = []; }
export function isCurrentlyTracking() { return isTracking; }

// ─── flushBuffer ──────────────────────────────────────────────────────────────
async function flushBuffer() {
  if (!buffer.length) return;
  if (!_userId) return;

  const token  = getToken();
  const points = [...buffer];
  buffer = [];

  try {
    const res = await fetch(`${API}/api/v1/location/track/bulk`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ points, userId: _userId }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    _flushFailCount = 0;
  } catch (err) {
    buffer = [...points, ...buffer];
    _flushFailCount++;
    if (_flushFailCount === 3) {
      toast.error("Location data not reaching server. Check your connection.", {
        title: "Sync Failed",
      });
    }
  }
}

// ─── Auto-visit (dwell detection) ─────────────────────────────────────────────
function handleDwellInfoRequest() {
  if (!dwellAnchor) return;
  const mins = Math.floor((Date.now() - dwellAnchor.since) / 60000);
  window.dispatchEvent(new CustomEvent("dwellInfoResponse", { detail: { mins } }));
}

async function handleAutoVisit(pt) {
  const now = Date.now();
  if (!dwellAnchor) {
    dwellAnchor = { lat: pt.lat, lng: pt.lng, since: now };
    return;
  }
  const dist = distanceMetres(pt.lat, pt.lng, dwellAnchor.lat, dwellAnchor.lng);
  if (dist > DWELL_RADIUS_M) {
    dwellAnchor = { lat: pt.lat, lng: pt.lng, since: now };
    return;
  }
  const dwellMs = now - dwellAnchor.since;
  if (dwellMs >= DWELL_TIME_MS) {
    const tooRecent = recentVisitSpots.some(
      (s) =>
        distanceMetres(s.lat, s.lng, dwellAnchor.lat, dwellAnchor.lng) < DWELL_RADIUS_M &&
        now - s.time < COOLDOWN_MS
    );
    if (tooRecent) return;
    const dwellMins = Math.round(dwellMs / 60000);
    await createAutoVisit(dwellAnchor.lat, dwellAnchor.lng, dwellMins);
    dwellAnchor = null;
  }
}

async function createAutoVisit(lat, lng, dwellMins = 15) {
  const token = getToken();
  if (!token) return;
  const geo = await reverseGeocode(lat, lng);
  try {
    const fd = new FormData();
    fd.append("latitude",      lat.toString());
    fd.append("longitude",     lng.toString());
    fd.append("locationName",  geo.name);
    fd.append("address",       geo.address);
    fd.append("isLeadCreated", "no");
    fd.append(
      "remarks",
      `Auto-detected stop · stayed ${dwellMins} min · https://maps.google.com/?q=${lat},${lng}`
    );
    const res = await fetch(`${API}/api/v1/visit`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}` },
      body:    fd,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    recentVisitSpots.push({ lat, lng, time: Date.now() });
    recentVisitSpots = recentVisitSpots.filter((s) => Date.now() - s.time < 2 * 60 * 60 * 1000);
    toast.info(`Auto-visit logged: "${geo.name}" (${dwellMins} min)`, { title: "Visit Detected" });
    console.log(`[AutoVisit] ✅ Created: "${geo.name}"`);
    window.dispatchEvent(
      new CustomEvent("autoVisitCreated", {
        detail: {
          visitId:      json?.data?._id || null,
          locationName: geo.name,
          address:      geo.address,
          lat, lng, dwellMins,
        },
      })
    );
  } catch (err) {
    toast.error(`Could not save visit at "${geo.name}". Will retry next stop.`, {
      title: "Visit Save Failed",
    });
    console.warn("[AutoVisit] Failed:", err.message);
  }
}

export function simulateTrackingMovement(coords = {}) {
  if (!coords?.lat || !coords?.lng) return;
  console.log("[Tracker] Simulated tracking movement:", coords);
  if (typeof onPointCallback === "function") {
    const simulatedPoint = {
      lat: Number(coords.lat),
      lng: Number(coords.lng),
      accuracy: Number(coords.accuracy ?? 10),
      speed: Number(coords.speed ?? 0),
      time: new Date().toISOString(),
    };
    onPointCallback(simulatedPoint);
    safeEmit(simulatedPoint);
  }
}
