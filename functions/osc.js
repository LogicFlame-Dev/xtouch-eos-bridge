/*
* functions/osc.js
*/
const osc = require('osc');
const { debuger, eos } = require("../config");
const CONSOLE_HOST = (eos && eos.host) || '127.0.0.1';
const CONSOLE_PORT = (eos && eos.port) || 8082;
const USER_MAP     = (eos && eos.userMap) || 1;

// ---- UDP setup ----
const udpPort = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: 8081,
});

try { udpPort.setMaxListeners(50); } catch {}

let isPortOpen = false;
const lastParam = { pan: null, tilt: null };

// --- Simple subscription API for fader updates coming from Eos ---
let faderLevelCb = null;
function onFaderLevel(cb) { faderLevelCb = typeof cb === 'function' ? cb : null; }


// Cache + log incoming
udpPort.on('message', (oscMessage) => {
  if (debuger) console.log('Received OSC message:', oscMessage);
  if (!oscMessage || !oscMessage.address) return;

  // existing PAN/TILT cache...
  if (oscMessage.address.indexOf('/eos/out/param/pan') === 0 ||
      oscMessage.address === `/eos/out/user/${USER_MAP}/selected/param/pan`) {
    const v = Number(oscMessage.args?.[0]);
    if (Number.isFinite(v)) lastParam.pan = Math.max(0, Math.min(1, v / 100));
  }
  if (oscMessage.address.indexOf('/eos/out/param/tilt') === 0 ||
      oscMessage.address === `/eos/out/user/${USER_MAP}/selected/param/tilt`) {
    const v = Number(oscMessage.args?.[0]);
    if (Number.isFinite(v)) lastParam.tilt = Math.max(0, Math.min(1, v / 100));
  }

  // NEW: fader follow from Eos -> surface
  const m = oscMessage.address.match(/^\/eos\/(?:out\/)?fader\/1\/(\d+)$/);
  if (m && faderLevelCb) {
    const fader = parseInt(m[1], 10);                // 1..10
    const raw   = Number(oscMessage.args?.[0]);      // 0..1 or 0..100 depending on build
    if (Number.isFinite(raw)) {
      const level01 = Math.max(0, Math.min(1, raw > 1 ? raw / 100 : raw));
      try { faderLevelCb(fader, level01); } catch (_) {}
    }
  }
});


udpPort.on('error', (err) => console.error('OSC Error:', err));
udpPort.on('close', () => {
  isPortOpen = false;
  if (debuger) console.log('OSC UDP port closed');
});

udpPort.on('ready', () => {
  isPortOpen = true;
  udpPort.send({ address: '/eos/subscribe', args: [{ type: 'i', value: 1 }] }, CONSOLE_HOST, CONSOLE_PORT);
  udpPort.send({ address: '/eos/ping', args: [] }, CONSOLE_HOST, CONSOLE_PORT);
  if (debuger) console.log(`OSC ready. Subscribed to Eos at ${CONSOLE_HOST}:${CONSOLE_PORT} (userMap ${USER_MAP})`);
});

udpPort.open();

// ---------- Helpers ----------
function toPercent(v) {
  const n = Number(v);
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n <= 1 ? n * 100 : n));
}
function toZeroOne(percent) {
  const n = Number(percent);
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n / 100));
}
function addrMatches(msgAddr, patterns) {
  return patterns.some(p => p === msgAddr);
}

// zero all faders on a bank (defaults to bank 1, 10 faders)
function zeroAllFaders(bank = 1, count = 10) {
  return new Promise((resolve) => {
    for (let i = 1; i <= count; i++) {
      udpPort.send({
        address: `/eos/fader/${bank}/${i}`,
        args: [{ type: 'f', value: 0 }]
      }, CONSOLE_HOST, CONSOLE_PORT);
    }
    setTimeout(resolve, 150);
  });
}

// Graceful shutdown
let shuttingDown = false;
async function gracefulShutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    if (isPortOpen) await zeroAllFaders(1, 10);
  } catch (e) {
    if (debuger) console.warn('Error zeroing faders on shutdown:', e?.message || e);
  }
  try { if (isPortOpen) udpPort.close(); } catch (_) {}
  process.exit(0);
}
process.once('SIGINT', gracefulShutdown);
process.once('SIGTERM', gracefulShutdown);

// ====== EXPORTS ======
module.exports = {
  eosFaderBankConfig: async function() {
    return new Promise((resolve, reject) => {
      udpPort.send({ address: '/eos/fader/1/config/10', args: [] }, CONSOLE_HOST, CONSOLE_PORT, (err) => {
        if (err) reject(err); else resolve('Message sent successfully');
      });
    });
  },

  eosFaderBankUp: async function() {
    return new Promise((resolve, reject) => {
      udpPort.send({ address: '/eos/fader/1/page/1', args: [] }, CONSOLE_HOST, CONSOLE_PORT, (err) => {
        if (err) reject(err); else resolve('Message sent successfully');
      });
    });
  },

  eosFaderBankDown: async function() {
    return new Promise((resolve, reject) => {
      udpPort.send({ address: '/eos/fader/1/page/-1', args: [] }, CONSOLE_HOST, CONSOLE_PORT, (err) => {
        if (err) reject(err); else resolve('Message sent successfully');
      });
    });
  },

  eosGo: async function() {
    return new Promise((resolve, reject) => {
      udpPort.send({ address: '/eos/key/go_0', args: [] }, CONSOLE_HOST, CONSOLE_PORT, (err) => {
        if (err) reject(err); else resolve('Go command sent successfully');
      });
    });
  },

  eosStopBack: async function() {
    return new Promise((resolve, reject) => {
      udpPort.send({ address: '/eos/key/stop', args: [] }, CONSOLE_HOST, CONSOLE_PORT, (err) => {
        if (err) reject(err); else resolve('Stop Back command sent successfully');
      });
    });
  },

  eosPing: async function() {
    return new Promise((resolve, reject) => {
      udpPort.send({ address: '/eos/ping', args: [] }, CONSOLE_HOST, CONSOLE_PORT, (err) => {
        if (err) reject(err); else resolve('Message sent successfully');
      });
    });
  },

  getFaderValue: async function(faderNumber, actionFunction) {
    const req = { address: `/eos/out/fader/${faderNumber}`, args: [] };

    return new Promise((resolve, reject) => {
      udpPort.send(req, CONSOLE_HOST, CONSOLE_PORT, (err) => { if (err) reject(err); });

      const expected = `/eos/fader/1/${faderNumber}`;

      const onMsg = (msg) => {
        if (msg && msg.address === expected && typeof msg.args?.[0] !== 'undefined') {
          cleanup();
          const faderValue = msg.args[0];
          try { if (typeof actionFunction === 'function') actionFunction(faderValue, faderNumber); } catch {}
          resolve(faderValue);
        }
      };

      const cleanup = () => {
        try { udpPort.removeListener('message', onMsg); } catch {}
        clearTimeout(timer);
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 1200);

      udpPort.on('message', onMsg);
    });
  },

  setFaderVal: async function(pageNum, faderNumber, value) {
    udpPort.send({
      address: `/eos/fader/${pageNum}/${faderNumber}`,
      args: [{ type: 'f', value }]
    }, CONSOLE_HOST, CONSOLE_PORT);
  },

  bumpDown: async function(pageNum, faderNumber) {
    udpPort.send({ address: `/eos/key/bump_1`, args: [] }, CONSOLE_HOST, CONSOLE_PORT);
  },

  bumpUp: async function(pageNum, faderNumber) {
    udpPort.send({ address: `/eos/fader/${pageNum}/${faderNumber}/out`, args: [] }, CONSOLE_HOST, CONSOLE_PORT);
  },

  setSubLevel: async function(subNumb, level) {
    udpPort.send({
      address: `/eos/sub/${subNumb}/level`,
      args: [{ type: 'f', value: level }]
    }, CONSOLE_HOST, CONSOLE_PORT);
  },

  // ---- PAN/TILT ----
  setPanValue: function (value) {
    const percent = toPercent(value);
    udpPort.send({
      address: `/eos/param/pan`,
      args: [{ type: 'f', value: percent }]
    }, CONSOLE_HOST, CONSOLE_PORT);
  },

  getPanValue: function (callback) {
    if (typeof callback !== 'function') callback = () => {};
    udpPort.send({ address: `/eos/get/param/pan`, args: [] }, CONSOLE_HOST, CONSOLE_PORT);

    const expected = new Set([
      `/eos/out/param/pan`,
      `/eos/out/param/pan/percent`,
      `/eos/out/user/${USER_MAP}/selected/param/pan`
    ]);

    const onMsg = (msg) => {
      if (!msg || !expected.has(msg.address)) return;
      const raw = Number(msg.args?.[0]);
      if (!Number.isFinite(raw)) return;
      cleanup();
      const zeroToOne = toZeroOne(raw);
      lastParam.pan = zeroToOne;
      callback(zeroToOne);
    };

    const cleanup = () => {
      try { udpPort.removeListener('message', onMsg); } catch {}
      clearTimeout(timer);
    };

    const timer = setTimeout(() => {
      cleanup();
      if (lastParam.pan !== null) callback(lastParam.pan);
    }, 300);

    udpPort.on('message', onMsg);
  },

  setTiltValue: function (value) {
    const percent = toPercent(value);
    udpPort.send({
      address: `/eos/param/tilt`,
      args: [{ type: 'f', value: percent }]
    }, CONSOLE_HOST, CONSOLE_PORT);
  },

  getTiltValue: function (callback) {
    if (typeof callback !== 'function') callback = () => {};
    udpPort.send({ address: `/eos/get/param/tilt`, args: [] }, CONSOLE_HOST, CONSOLE_PORT);

    const expected = new Set([
      `/eos/out/param/tilt`,
      `/eos/out/param/tilt/percent`,
      `/eos/out/user/${USER_MAP}/selected/param/tilt`
    ]);

    const onMsg = (msg) => {
      if (!msg || !expected.has(msg.address)) return;
      const raw = Number(msg.args?.[0]);
      if (!Number.isFinite(raw)) return;
      cleanup();
      const zeroToOne = toZeroOne(raw);
      lastParam.tilt = zeroToOne;
      callback(zeroToOne);
    };

    const cleanup = () => {
      try { udpPort.removeListener('message', onMsg); } catch {}
      clearTimeout(timer);
    };

    const timer = setTimeout(() => {
      cleanup();
      if (lastParam.tilt !== null) callback(lastParam.tilt);
    }, 300);

    udpPort.on('message', onMsg);
  },
  onFaderLevel,
};
