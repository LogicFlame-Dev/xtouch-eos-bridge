// midi.js
const easymidi = require('easymidi');
const { midi } = require('./config');

const input = new easymidi.Input(midi.inputName);
const output = new easymidi.Output(midi.outputName);

module.exports = {
    input,
    output
};
