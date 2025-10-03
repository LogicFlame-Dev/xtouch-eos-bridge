const { previousFaderLevels, activeBumps, currentFaderPage } = require('../eos/state');
const {
  setFaderVal,
  getPanValue,
  getTiltValue,
  setPanValue,
  setTiltValue
} = require('../functions/osc');

// ---------- FADER PICKUP ----------
const latchState  = {};
const lastPhys    = {};
const PICKUP_TOL  = 0.03;
const clamp01 = x => Math.max(0, Math.min(1, x));
const crossedTarget = (prev, curr, target, tol = PICKUP_TOL) => {
  if (target == null) return true;
  if (prev == null)   return Math.abs(curr - target) <= tol;
  const min = Math.min(prev, curr) - tol;
  const max = Math.max(prev, curr) + tol;
  return target >= min && target <= max;
};

// ---------- ENCODER STATE ----------
const prevEncoder = { 18: null, 19: null, 20: null, 21: null }; // last raw MIDI value per encoder
let panScratch  = null;    // 0..1 working value
let tiltScratch = null;    // 0..1 working value
let syncingPan = false, syncingTilt = false;

// public: call this whenever a NEW FIXTURE selection happens
function resetPanTiltForNewSelection() {
  // reset encoder tracking so first move uses relative-from-center
  prevEncoder[18] = prevEncoder[19] = prevEncoder[20] = prevEncoder[21] = null;
  // default to mid so encoders always “have room” both ways
  panScratch  = 0.5;
  tiltScratch = 0.5;
  // optionally kick off an async sync from Eos in the background (doesn't block)
  if (!syncingPan)  { syncingPan  = true; getPanValue (v => { panScratch  = clamp01(v); syncingPan  = false; }); }
  if (!syncingTilt) { syncingTilt = true; getTiltValue(v => { tiltScratch = clamp01(v); syncingTilt = false; }); }
}

// initial sync if needed
function ensurePanInit() {
  if (panScratch === null) panScratch = 0.5; // start mid immediately
  if (!syncingPan) {
    syncingPan = true;
    getPanValue(v => { panScratch = clamp01(v); syncingPan = false; });
  }
}
function ensureTiltInit() {
  if (tiltScratch === null) tiltScratch = 0.5;
  if (!syncingTilt) {
    syncingTilt = true;
    getTiltValue(v => { tiltScratch = clamp01(v); syncingTilt = false; });
  }
}

// works for absolute (0..127) and relative (center=64) encoders
function ccToDelta(curr, prev) {
  if (prev === null) return curr - 64; // first move: assume relative
  let d = curr - prev;                 // absolute step
  if (d > 64)  d -= 128;               // wrap forward
  if (d < -64) d += 128;               // wrap backward
  return d;
}

// tune speeds
const PAN_STEP       = 0.015; // coarse
const TILT_STEP      = 0.015;
const PAN_FINE_STEP  = 0.003; // fine
const TILT_FINE_STEP = 0.003;

function handleCC(msg) {
  const { controller, value } = msg;

  // ---------- FADERS (1–9, 23→10) with pickup ----------
  if ((controller >= 1 && controller <= 9) || controller === 23) {
    const fader = controller === 23 ? 10 : controller;
    const phys = clamp01(value / 127);
    const prev = lastPhys[fader];
    lastPhys[fader] = phys;

    if (!latchState[fader]) {
      const target = Number.isFinite(previousFaderLevels[fader]) ? clamp01(previousFaderLevels[fader]) : null;
      if (target == null || crossedTarget(prev, phys, target)) {
        latchState[fader] = true;
      } else {
        return; // still picking up; prevent snap
      }
    }

    previousFaderLevels[fader] = phys;
    setFaderVal(1, fader, phys);
    return;
  }

  // ---------- PAN (CC 18) ----------
  if (controller === 18) {
    ensurePanInit();
    const d = ccToDelta(value, prevEncoder[18]);
    prevEncoder[18] = value;
    if (d !== 0) {
      panScratch = clamp01(panScratch + d * PAN_STEP);
      setPanValue(panScratch);
    }
    return;
  }

  // ---------- TILT (CC 19) ----------
  if (controller === 19) {
    ensureTiltInit();
    const d = ccToDelta(value, prevEncoder[19]);
    prevEncoder[19] = value;
    if (d !== 0) {
      tiltScratch = clamp01(tiltScratch + d * TILT_STEP);
      setTiltValue(tiltScratch);
    }
    return;
  }

  // ---------- FINE PAN (CC 20) ----------
  if (controller === 20) {
    ensurePanInit();
    const d = ccToDelta(value, prevEncoder[20]);
    prevEncoder[20] = value;
    if (d !== 0) {
      panScratch = clamp01(panScratch + d * PAN_FINE_STEP);
      setPanValue(panScratch);
    }
    return;
  }

  // ---------- FINE TILT (CC 21) ----------
  if (controller === 21) {
    ensureTiltInit();
    const d = ccToDelta(value, prevEncoder[21]);
    prevEncoder[21] = value;
    if (d !== 0) {
      tiltScratch = clamp01(tiltScratch + d * TILT_FINE_STEP);
      setTiltValue(tiltScratch);
    }
    return;
  }
}

module.exports = { handleCC, resetPanTiltForNewSelection };
