# X-Touch Compact → ETC Eos OSC Bridge

[![GitHub release](https://img.shields.io/github/v/release/LogicFlame-Dev/xtouch-eos-bridge)](https://github.com/LogicFlame-Dev/xtouch-eos-bridge/releases)
![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
[![License](https://img.shields.io/github/license/LogicFlame-Dev/xtouch-eos-bridge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/LogicFlame-Dev/xtouch-eos-bridge?style=social)](https://github.com/LogicFlame-Dev/xtouch-eos-bridge/stargazers)

This project links a **Behringer X-Touch Compact** to ETC Eos consoles over **OSC**, giving you motorised fader control, encoder mapping for pan/tilt, bump buttons, and playback integration.  
Developed by [**LogicFlameDevelopment**](https://logicflame.dev).

---

## ✨ Features

- **10 faders total**  
  - 9 motorised faders on the X-Touch  
  - Fader 10 mapped to the encoder push (note 13)  
  - Pickup mode prevents snapping when physical position differs from Eos  
  - Faders sync back when values are changed directly in Eos  

- **Bump buttons**  
  - Notes **40–48** bump faders 1–9  
  - **Note 13** bumps fader 10  

- **Encoders**  
  - **CC 18**: Pan (coarse)  
  - **CC 19**: Tilt (coarse)  
  - **CC 20**: Pan (fine)  
  - **CC 21**: Tilt (fine)  
  - Encoders initialise to midpoint (0.5) on fixture selection and resync with Eos in the background  

- **Playback**  
  - **Note 54**: GO  
  - **Note 53**: STOP/BACK  

- **Fader bank paging**  
  - **Note 49**: Bank down  
  - **Note 50**: Bank up  
  - Fader page LEDs update correctly  

- **Shutdown safety**  
  - On `SIGINT`/`SIGTERM`, all faders reset to 0 before exit  

---

## 📂 Project Structure

```text
.
├── xtouch.js               # Main entry point
├── config.js               # MIDI and Eos connection settings
├── functions/
│   └── osc.js              # OSC transport + helpers (faders, pan/tilt)
├── handlers/
│   ├── midiCC.js           # Handles fader + encoder CC events
│   └── midiNote.js         # Handles bump buttons + GO/STOP/paging
├── eos/
│   ├── state.js            # Tracks current fader levels, bumps, page
│   └── updateAllFaders.js  # Refresh motorised faders from Eos
├── midi/
│   ├── index.js            # MIDI input/output setup
│   └── led.js              # LED helpers for page indication
└── logger.js               # Logging helper
```

---

## ⚙️ How It Works

- **OSC (`functions/osc.js`)**
  - Opens UDP port 8081 (RX) and talks to Eos on 8082 (TX)
  - Subscribes with `/eos/subscribe` so Eos pushes updates
  - Exposes helpers:
    - `setFaderVal(page, fader, value)`
    - `getFaderValue(fader, callback)`
    - `setPanValue(value) / getPanValue(callback)`
    - `setTiltValue(value) / getTiltValue(callback)`
    - `eosGo()`, `eosStopBack()`, `eosFaderBankUp()`, `eosFaderBankDown()`
  - Tracks last known pan/tilt to make encoder deltas smooth

- **MIDI CC Handling (`handlers/midiCC.js`)**
  - Faders (CC 1–9, 23 → fader 10) with pickup logic
  - Encoders (18–21) mapped to coarse/fine pan & tilt
  - Resets encoder state on fixture change

- **MIDI Note Handling (`handlers/midiNote.js`)**
  - Bump buttons (notes 40–48) trigger fader flash
  - Note 13 handles fader 10 bump
  - Playback control (GO/STOP) and fader paging
  - On bump release, restores fader to previous level

---

## 🚀 Setup & Usage

1. **Hardware**
   - Connect X-Touch Compact via USB
   - Ensure motorised fader mode is enabled on the X-Touch

2. **Eos Setup**
   - Enable OSC in **Setup > Show Control > OSC**
   - Configure:
     - OSC RX Port: `8082`
     - OSC TX Port: `8081`

3. **Config**
   - Edit `config.js` to set:
     - `midi.inputName` / `midi.outputName` to match your X-Touch
     - `eos.host` (usually console IP)
     - `eos.port` (default `8082`)

4. **Run**
   ```bash
   npm install
   node .
   ```

5. **Test**
   - Move a fader → Eos fader follows  
   - Move an encoder → Pan/Tilt changes  
   - Press GO/STOP → Eos reacts  
   - Change fader in Eos → motor moves on X-Touch  

---

## 🛠 Roadmap

- Fixture selection feedback → automatically reset encoders to midpoint  
- Smarter sync between Eos and X-Touch for faders  
- Additional encoder mappings (intensity, color wheels, custom params)  
- JSON-configurable mapping for different surfaces  

---

## 🧑‍💻 Credits

Built for ETC Eos integration with Behringer X-Touch Compact.  
Developed by [**LogicFlameDevelopment**](https://logicflame.dev).  

Uses:
- [`osc`](https://www.npmjs.com/package/osc) for Open Sound Control  
- [`midi`](https://www.npmjs.com/package/midi) for MIDI I/O  

---

## ⚠️ Troubleshooting

- **Faders don’t move with Eos**  
  - Check Eos OSC TX port = 8081  
  - Ensure `/eos/subscribe` messages are being received  

- **Encoders snap or stop at edges**  
  - Confirm encoders reset on fixture selection  
  - Check pan/tilt values are being cached (`lastParam`)  

- **Bump buttons one off**  
  - Note 40 → fader 1, Note 48 → fader 9, Note 13 → fader 10
