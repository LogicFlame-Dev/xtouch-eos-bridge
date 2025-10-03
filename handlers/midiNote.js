const { previousFaderLevels, activeBumps, getCurrentFaderPage, setCurrentFaderPage } = require('../eos/state');
const { updateAllFaders } = require('../eos/updateAllFaders');
const { output } = require('../midi');
const { setFaderPageLED } = require('../midi/led');

const {
  eosFaderBankUp,
  eosFaderBankDown,
  getFaderValue,
  setFaderVal,
  eosStopBack,
  eosGo
} = require('../functions/osc');

// helper: map logical fader -> MIDI CC controller id used on your surface
function faderToController(fader) {
  // your CC handler expects 1..9 and 23 for the 10th
  return (fader === 10) ? 23 : fader; // 1..9 => 1..9, 10 => 23
}

function handleNoteOn(msg) {
  const { note, velocity } = msg;
  console.log(`[NOTE] Note ${note} → Vel ${velocity}`);

  // Buttons under faders 1..9
  if (note >= 40 && note <= 48) {
    const fader = note - 39; // 40->1 ... 48->9
    if (activeBumps.has(fader)) return;
    activeBumps.add(fader);

    console.log(`⚡️ Bump ON → Fader ${fader}`);

    const sendMotor = (level01) => {
      output.send('cc', {
        controller: faderToController(fader),
        value: Math.max(0, Math.min(127, Math.round(level01 * 127))),
        channel: 1
      });
    };

    if (previousFaderLevels[fader] === undefined) {
      // prime cache from Eos once
      getFaderValue(fader, (val) => {
        if (previousFaderLevels[fader] === undefined) {
          const n = Number(val);
          previousFaderLevels[fader] = Number.isFinite(n)
            ? (n > 1 ? Math.min(1, Math.max(0, n / 100)) : Math.min(1, Math.max(0, n)))
            : 0;
          console.log(`💾 Storing Fader ${fader} = ${previousFaderLevels[fader]} before bump`);
        }
        setFaderVal(1, fader, 1.0);
        sendMotor(1.0);
      });
    } else {
      setFaderVal(1, fader, 1.0);
      sendMotor(1.0);
    }
    return;
  }

  // Encoder push as bump for Fader 10 (note 13)
  if (note === 13) {
    const fader = 10;
    if (activeBumps.has(fader)) return;
    activeBumps.add(fader);

    console.log(`⚡️ Bump ON → Fader ${fader}`);

    const sendMotor = (level01) => {
      output.send('cc', {
        controller: faderToController(fader), // 23
        value: Math.max(0, Math.min(127, Math.round(level01 * 127))),
        channel: 1
      });
    };

    if (previousFaderLevels[fader] === undefined) {
      getFaderValue(fader, (val) => {
        if (previousFaderLevels[fader] === undefined) {
          const n = Number(val);
          previousFaderLevels[fader] = Number.isFinite(n)
            ? (n > 1 ? Math.min(1, Math.max(0, n / 100)) : Math.min(1, Math.max(0, n)))
            : 0;
          console.log(`💾 Storing Fader ${fader} = ${previousFaderLevels[fader]} before bump`);
        }
        setFaderVal(1, fader, 1.0);
        sendMotor(1.0);
      });
    } else {
      setFaderVal(1, fader, 1.0);
      sendMotor(1.0);
    }
    return;
  }

  // Transport
  if (note === 54) eosGo();
  if (note === 53) eosStopBack();

  // Bank down (49) / up (50)
  if (note === 49) {
    eosFaderBankDown();
    const newPage = Math.max(1, getCurrentFaderPage() - 1);
    setCurrentFaderPage(newPage);
    console.log(`🔄 Fader bank DOWN → Page ${newPage}`);
    setFaderPageLED(getCurrentFaderPage());
    setTimeout(updateAllFaders, 200);
    return;
  }

  if (note === 50) {
    eosFaderBankUp();
    const newPage = getCurrentFaderPage() + 1;
    setCurrentFaderPage(newPage);
    console.log(`🔄 Fader bank UP → Page ${newPage}`);
    setFaderPageLED(getCurrentFaderPage());
    setTimeout(updateAllFaders, 200);
    return;
  }
}

function handleNoteOff(msg) {
  const { note } = msg;
  console.log(`[NOTE OFF] Note ${note}`);

  if (note >= 40 && note <= 48) {
    const fader = note - 39; // 1..9
    activeBumps.delete(fader);

    const previous = previousFaderLevels[fader] ?? 0.0;
    console.log(`🔁 Restoring Fader ${fader} to ${previous}`);
    setFaderVal(1, fader, previous);

    output.send('cc', {
      controller: faderToController(fader),
      value: Math.max(0, Math.min(127, Math.round(previous * 127))),
      channel: 1
    });
    return;
  }

  if (note === 13) {
    const fader = 10;
    activeBumps.delete(fader);

    const previous = previousFaderLevels[fader] ?? 0.0;
    console.log(`🔁 Restoring Fader ${fader} to ${previous}`);
    setFaderVal(1, fader, previous);

    output.send('cc', {
      controller: faderToController(fader), // 23
      value: Math.max(0, Math.min(127, Math.round(previous * 127))),
      channel: 1
    });
    return;
  }
}

module.exports = {
  handleNoteOn,
  handleNoteOff
};
