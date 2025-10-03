const easymidi = require('easymidi');
const { midi } = require('../config');

const output = new easymidi.Output(midi.outputName);

// 16 defined steps to light 1 segment at a time
const pageLEDValues = [
    0, 8, 16, 24, 32, 40, 48, 56,
    64, 72, 80, 88, 96, 104, 112, 120
];

function setFaderPageLED(page) {
    if (typeof page !== 'number' || isNaN(page)) {
        console.warn(`⚠️ Invalid page value passed to LED updater:`, page);
        return;
    }

    const index = Math.max(0, Math.min(15, page - 1)); // Adjust for 1-based page input
    const ledVal = pageLEDValues[index];

    console.log(`🧭 Setting page LED ring (CC ${midi.pageLEDCCEncoder}) to ${ledVal} on channel ${midi.defaultChannel}`);

    output.send('cc', {
        controller: midi.pageLEDCCEncoder,
        value: ledVal,
        channel: midi.defaultChannel - 1
    });
}

module.exports = { setFaderPageLED };
