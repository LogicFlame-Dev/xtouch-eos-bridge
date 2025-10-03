const { logging } = require('./config');

function log(...args) {
    if (!logging.enabled) return;
    console.log(...args);
}

function logEvent(label, message) {
    if (!logging.enabled) return;
    const output = logging.color
        ? `\x1b[36m${label}\x1b[0m ${message}` // cyan label
        : `${label} ${message}`;
    console.log(output);
}

function warn(message) {
    if (!logging.enabled) return;
    const output = logging.color
        ? `\x1b[33m⚠️ ${message}\x1b[0m`
        : `⚠️ ${message}`;
    console.warn(output);
}

function error(message) {
    const output = logging.color
        ? `\x1b[31m❌ ${message}\x1b[0m`
        : `❌ ${message}`;
    console.error(output);
}

module.exports = {
    log,
    logEvent,
    warn,
    error
};
