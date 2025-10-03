// eos/selection.js
const { udpPort, CONSOLE_HOST, CONSOLE_PORT, USER_MAP } = require('../functions/osc')._transport;

let currentCount = 0;
const listeners = new Set();

function notify() { listeners.forEach(fn => { try { fn(currentCount > 0); } catch(_){} }); }

function setCount(n) {
  const v = Math.max(0, Number(n) | 0);
  if (v !== currentCount) { currentCount = v; notify(); }
}

function requestSelectionOnce() {
  try { udpPort.send({ address: '/eos/get/selected/count', args: [] }, CONSOLE_HOST, CONSOLE_PORT); } catch {}
}

function start() {
  // subscribe to multiple “selection-ish” outputs
  const expected = new Set([
    `/eos/out/selected/count`,
    `/eos/out/user/${USER_MAP}/selected/count`,
    `/eos/out/active/chan/count`
  ]);

  udpPort.on('message', (msg) => {
    if (!msg || !msg.address) return;
    if (expected.has(msg.address) && msg.args?.length) {
      const n = Number(msg.args[0]);
      if (Number.isFinite(n)) setCount(n);
    }
    // some Eos builds emit list of selected channels:
    if (msg.address === `/eos/out/user/${USER_MAP}/selected/channels` && Array.isArray(msg.args)) {
      setCount(msg.args.length);
    }
  });

  // initial query
  requestSelectionOnce();
  // light re-poll just in case the out stream isn’t configured
  setInterval(requestSelectionOnce, 1500);
}

function onContextChange(cb) {
  if (typeof cb === 'function') listeners.add(cb);
  return () => listeners.delete(cb);
}

function isFixtureMode() { return currentCount > 0; }

module.exports = { start, onContextChange, isFixtureMode };
