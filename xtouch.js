const {printBanner} = require('./utils/banner');
const {eosFaderBankConfig, onFaderLevel} = require('./functions/osc');
const { updateAllFaders } = require('./eos/updateAllFaders');
const { logEvent } = require('./logger');
const { midi } = require('./config');
// --- Startup Banner ---
printBanner();
  
logEvent("Startup", `Listening on ${midi.inputName}`);

const selection = require('./eos/selection');
selection.start();


const { input, output } = require('./midi');
//emitter.setMaxListeners(20)

// Map incoming fader moves (CC 0-7) to Eos fader levels
const {handleCC} = require('./handlers/midiCC');
const {handleTopRowCC} = require('./handlers/encodersTopRow');
input.on('cc', (msg) => {
    // First, let your existing CC handler run (faders, dedicated pan/tilt encoders)
    handleCC(msg);
    // Then, route top-row encoders (will ignore CCs that aren’t in TOP_ROW_CC)
    handleTopRowCC(msg);
  });

const { handleNoteOn, handleNoteOff } = require('./handlers/midiNote');
input.on('noteon', handleNoteOn);
input.on('noteoff', handleNoteOff);


// Send GO buttons LED feedback (optional)
function sendGoFeedback() {
    output.send('cc', { controller: 64, value: 127 });
    output.send('cc', { controller: 65, value: 64 });
}


eosFaderBankConfig();
updateAllFaders();
sendGoFeedback();

// Mirror Eos fader changes back to the X-TOUCH motors
onFaderLevel((fader, level01) => {
    // Your mapping: faders 1..9 are CC 1..9, fader 10 is CC 23
    const controller = (fader === 10) ? 23 : fader;
    const value127 = Math.max(0, Math.min(127, Math.round(level01 * 127)));
  
    output.send('cc', { controller, value: value127, channel: 0 });
  
    // Keep your pickup cache aligned so moving the physical fader doesn't "snap"
    previousFaderLevels[fader] = level01;
  });
  

process.on('SIGINT', () => {
    console.log("Shutting down: resetting all faders...");

    // Set all faders to 0 on X-Touch
    for (let controller = 1; controller <= 9; controller++) {
        output.send('cc', {
            controller,
            value: 0,
            channel: 0
        });
    }

    input.close();
    output.close();
    //stopSineWave(); // Stop animation on shutdown
    console.log("Exited cleanly.");
    process.exit(0);
});
