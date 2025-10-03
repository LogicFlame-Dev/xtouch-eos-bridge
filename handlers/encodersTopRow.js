// handlers/encodersTopRow.js
const {
    setZoomValue, setHueValue, setSatValue, setCCTValue,
  } = require('../functions/osc');
  
  const { isFixtureMode, onContextChange } = require('../eos/selection');
  const { resetPanTiltForNewSelection } = require('./midiCC'); // we reuse your reset for consistency
  
  // --- Only use the 8 top-row encoders you said are free ---
  // 18,19,20,21 are already pan/tilt (coarse/fine)
  // 22 has the page light ring
  const TOP_ROW_CC = [10, 11, 12, 13, 14, 15, 16, 17];
  
  // utils
  const clamp01 = x => Math.max(0, Math.min(1, x));
  
  // per-encoder scratch to accumulate relative moves (start at mid)
  const scratch = Object.fromEntries(TOP_ROW_CC.map(cc => [cc, 0.5]));
  const lastVal = Object.fromEntries(TOP_ROW_CC.map(cc => [cc, null]));
  
  // Relative-detent math that works with absolute 0..127 or relative (center=64)
  function ccToDelta(curr, prev) {
    if (prev === null) return curr - 64; // first move: treat as relative from center
    let d = curr - prev;
    if (d > 64)  d -= 128;
    if (d < -64) d += 128;
    return d;
  }
  
  // Tuning
  const STEP_COARSE = 0.020;
  const STEP_FINE   = 0.005;
  
  // --- FIXTURE MODE MAPPING (only active when fixtures are selected) ---
  // Pairs: coarse / fine
  const FIXTURE_MAP = {
    10: { label: 'Zoom (C)', set: setZoomValue, step: STEP_COARSE },
    11: { label: 'Zoom (F)', set: setZoomValue, step: STEP_FINE   },
  
    12: { label: 'Hue (C)',  set: setHueValue,  step: STEP_COARSE },
    13: { label: 'Hue (F)',  set: setHueValue,  step: STEP_FINE   },
  
    14: { label: 'Sat (C)',  set: setSatValue,  step: STEP_COARSE },
    15: { label: 'Sat (F)',  set: setSatValue,  step: STEP_FINE   },
  
    16: { label: 'CCT (C)',  set: setCCTValue,  step: STEP_COARSE },
    17: { label: 'CCT (F)',  set: setCCTValue,  step: STEP_FINE   },
  };
  
  // Reset deltas when context flips so there’s no “edge lock” or jump.
  // We also center scratch to 0.5 so you always have travel both ways.
  onContextChange((fixtureSelected) => {
    TOP_ROW_CC.forEach(cc => {
      lastVal[cc] = null;
      scratch[cc] = 0.5;
    });
    if (fixtureSelected) {
      // Optional: keep behavior consistent with your current encoder reset
      try { resetPanTiltForNewSelection(); } catch {}
    }
  });
  
  // Public: call from your MIDI "cc" stream AFTER your main handleCC
  function handleTopRowCC(msg) {
    const { controller, value } = msg;
  
    // ignore if this CC isn't one of our 10–17 encoders
    if (!TOP_ROW_CC.includes(controller)) return;
  
    // Only act when fixtures are actually selected (no subs / no global behavior)
    if (!isFixtureMode()) return;
  
    const mapping = FIXTURE_MAP[controller];
    if (!mapping) return;
  
    const d = ccToDelta(value, lastVal[controller]);
    lastVal[controller] = value;
    if (d === 0) return;
  
    const step = mapping.step || STEP_COARSE;
    scratch[controller] = clamp01((scratch[controller] ?? 0.5) + d * step);
    mapping.set(scratch[controller]);
  }
  
  module.exports = { handleTopRowCC, TOP_ROW_CC };
  