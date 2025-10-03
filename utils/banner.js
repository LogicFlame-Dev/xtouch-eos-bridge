// utils/banner.js

function supportsTrueColor() {
    return /\btruecolor|\b24bit/i.test(process.env.COLORTERM || '') ||
           process.platform === 'win32';
  }
  
  function stripAnsi(s){ return s.replace(/\x1b\[[0-9;]*m/g,''); }
  function rgb(r,g,b, s){ return `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`; }
  function bold(s){ return `\x1b[1m${s}\x1b[0m`; }
  
  function gradient(text, colors) {
    const steps = text.length;
    const out = [];
    for (let i = 0; i < steps; i++) {
      const t = i / Math.max(1, steps - 1);
      const idx = Math.min(colors.length - 2, Math.floor(t * (colors.length - 1)));
      const localT = (t * (colors.length - 1)) - idx;
      const [r1,g1,b1] = colors[idx], [r2,g2,b2] = colors[idx+1];
      const r = Math.round(r1 + (r2 - r1) * localT);
      const g = Math.round(g1 + (g2 - g1) * localT);
      const b = Math.round(b1 + (b2 - b1) * localT);
      out.push(rgb(r,g,b, text[i]));
    }
    return out.join('');
  }
  
  function centerLine(s, padChar=' ') {
    const width = Math.max(60, process.stdout.columns || 80);
    const pad = Math.max(0, Math.floor((width - stripAnsi(s).length) / 2));
    return padChar.repeat(pad) + s;
  }
  
  function printBanner() {
    const name = 'LogicFlameDevelopment';
    const sub  = 'X-Touch Compact ↔ ETC Eos OSC Bridge'; // no emoji arrow for safety
    const bar  = '─'.repeat(Math.min(Math.max(40, name.length + 6), 72));
  
    const use24 = supportsTrueColor();
    const fireCols = use24
      ? [[255,75,0],[255,140,0],[255,200,0],[255,255,80]] // orange→yellow
      : null;
  
    const title = use24 ? gradient(name, fireCols) : name;
  
    const line1 = centerLine(bold(title));
    const line2 = centerLine(sub);
    const line3 = centerLine(bar);
  
    console.log('\n' + line3 + '\n' + line1 + '\n' + line2 + '\n' + line3 + '\n');
  }
  
  module.exports = { printBanner };
  