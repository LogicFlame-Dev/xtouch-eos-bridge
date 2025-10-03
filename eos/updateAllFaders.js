const {getFaderValue} = require('../functions/osc');
const { previousFaderLevels, activeBumps } = require('./state');
const {outputName} = require("../config").midi;
const easymidi = require('easymidi');
const output = new easymidi.Output(outputName); // or export from shared config

const faderToCC = {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 23  // Fader 10 mapped to CC 23
};

function updateAllFaders() {
    for (let fader = 1; fader <= 10; fader++) {
        getFaderValue(fader, (val) => {
            if (!activeBumps.has(fader)) {
                previousFaderLevels[fader] = val;
            }

            const midiVal = Math.round(val * 127);
            output.send('cc', {
                controller: faderToCC[fader],
                value: midiVal,
                channel: 0
            });
        });
    }
}

module.exports = { updateAllFaders };
