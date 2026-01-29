// gcode.js
// Minimal single-line vector font + text-to-G-code
// Supports A-Z, 0-9, space. Unknown characters are commented out in output.

require('dotenv').config();

const DEFAULTS = {
  safeZ: Number(process.env.SAFE_Z || 5),      // mm
  cutZ: Number(process.env.CUT_Z || -1),       // mm (engrave depth)
  feedXY: Number(process.env.FEED_XY || 300),  // mm/min
  feedZ: Number(process.env.FEED_Z || 100),    // mm/min
  charHeight: 10,          // mm height of capital letters
  charSpacing: 2,          // mm extra spacing between glyphs
  lineSpacing: 6,          // mm baseline-to-baseline spacing
  originX: 0,              // placement origin (bottom-left of first line)
  originY: 0
};

// Simple stick font: coordinates are in a unit box (height=1.0).
// We scale by charHeight and maintain aspect ratio (width ~0.6 * height).
// Each glyph is an array of strokes; a stroke is an array of [x,y] points.
// Lift between strokes.
const FONT = (() => {
  const W = 0.6;  // width relative to height
  const mid = 0.5;
  const top = 1.0;
  const bot = 0.0;

  const glyphs = {};

  // Helper to add glyphs succinctly
  function g(ch, strokes) { glyphs[ch] = strokes; }

  // A
  g('A', [
    [[0,0],[0.3,1.0],[0.6,0]],
    [[0.1,0.5],[0.5,0.5]],
  ]);
  // B (rough)
  g('B', [
    [[0,0],[0,1.0]],
    [[0,1.0],[0.45,0.85],[0.0,0.7]],
    [[0,0.7],[0.45,0.55],[0,0.4]],
    [[0,0.4],[0.45,0.2],[0,0]]
  ]);
  // C
  g('C', [
    [[0.6,0.9],[0.2,1.0],[0,0.8],[0,0.2],[0.2,0],[0.6,0.1]],
  ]);
  // D
  g('D', [
    [[0,0],[0,1.0]],
    [[0,1.0],[0.5,0.8],[0.5,0.2],[0,0]],
  ]);
  // E
  g('E', [
    [[0.6,1.0],[0,1.0],[0,0],[0.6,0]],
    [[0,0.5],[0.5,0.5]],
  ]);
  // F
  g('F', [
    [[0,1.0],[0,0]],
    [[0,1.0],[0.6,1.0]],
    [[0,0.5],[0.5,0.5]],
  ]);
  // G
  g('G', [
    [[0.6,0.9],[0.2,1.0],[0,0.8],[0,0.2],[0.2,0],[0.6,0.1],[0.6,0.5],[0.3,0.5]],
  ]);
    // H
  g('H', [
    [[0,1.0],[0,0]],
    [[0.6,1.0],[0.6,0]],
    [[0,0.5],[0.6,0.5]],
  ]);
  // I
  g('I', [
    [[0,1.0],[0.6,1.0]],
    [[0.3,1.0],[0.3,0]],
    [[0,0],[0.6,0]],
  ]);
  // J
  g('J', [
    [[0.6,1.0],[0.1,1.0]],
    [[0.35,1.0],[0.35,0.15],[0.25,0],[0.05,0.05]],
  ]);
  // K
  g('K', [
    [[0,1.0],[0,0]],
    [[0.6,1.0],[0,0.5],[0.6,0]],
  ]);
  // L
  g('L', [
    [[0,1.0],[0,0],[0.6,0]],
  ]);
  // M
  g('M', [
    [[0,0],[0,1.0],[0.3,0.5],[0.6,1.0],[0.6,0]],
  ]);
  // N
  g('N', [
    [[0,0],[0,1.0],[0.6,0]],
    [[0.6,0],[0.6,1.0]],
  ]);
  // O
  g('O', [
    [[0.1,0.9],[0.5,0.9],[0.6,0.5],[0.5,0.1],[0.1,0.1],[0,0.5],[0.1,0.9]],
  ]);
  // P
  g('P', [
    [[0,0],[0,1.0]],
    [[0,1.0],[0.5,1.0],[0.5,0.6],[0,0.6]],
  ]);
  // Q
  g('Q', [
    [[0.1,0.9],[0.5,0.9],[0.6,0.5],[0.5,0.1],[0.1,0.1],[0,0.5],[0.1,0.9]],
    [[0.35,0.25],[0.6,0]],
  ]);
  // R
  g('R', [
    [[0,0],[0,1.0]],
    [[0,1.0],[0.5,1.0],[0.5,0.6],[0,0.6]],
    [[0,0.6],[0.6,0]],
  ]);
  // S
  g('S', [
    [[0.55,0.9],[0.2,1.0],[0,0.8],[0.5,0.6],[0.6,0.4],[0.2,0.2],[0.05,0.0]],
  ]);
  // T
  g('T', [
    [[0,1.0],[0.6,1.0]],
    [[0.3,1.0],[0.3,0]],
  ]);
  // U
  g('U', [
    [[0,1.0],[0,0.2],[0.1,0.05],[0.5,0.05],[0.6,0.2],[0.6,1.0]],
  ]);
  // V
  g('V', [
    [[0,1.0],[0.3,0],[0.6,1.0]],
  ]);
  // W
  g('W', [
    [[0,1.0],[0.15,0],[0.3,0.6],[0.45,0],[0.6,1.0]],
  ]);
  // X
  g('X', [
    [[0,1.0],[0.6,0]],
    [[0.6,1.0],[0,0]],
  ]);
  // Y
  g('Y', [
    [[0,1.0],[0.3,0.6],[0.6,1.0]],
    [[0.3,0.6],[0.3,0]],
  ]);
  // Z
  g('Z', [
    [[0,1.0],[0.6,1.0],[0,0],[0.6,0]],
  ]);
  // 0–9 (rough)
  g('0', [[[0.1,0.9],[0.5,0.9],[0.6,0.5],[0.5,0.1],[0.1,0.1],[0,0.5],[0.1,0.9]]]);
  g('1', [[[0.2,0.8],[0.4,1.0],[0.4,0]]]);
  g('2', [[[0,0.8],[0.6,0.8],[0.6,0.5],[0,0],[0.6,0]]]);
  g('3', [[[0,0.8],[0.6,0.8],[0.3,0.5],[0.6,0.2],[0,0.2]]]);
  g('4', [[[0.6,0.6],[0,0.6],[0.5,1.0],[0.5,0]]]);
  g('5', [[[0.6,1.0],[0,1.0],[0,0.6],[0.5,0.6],[0.6,0.2],[0,0.2]]]);
  g('6', [[[0.6,0.8],[0.2,0.8],[0,0.5],[0.2,0.2],[0.6,0.2],[0.6,0.6],[0.2,0.6]]]);
  g('7', [[[0,1.0],[0.6,1.0],[0.2,0]]]);
  g('8', [[[0.2,0.5],[0,0.8],[0.2,1.0],[0.4,0.8],[0.2,0.5],[0.4,0.3],[0.2,0.0],[0,0.3],[0.2,0.5]]]);
  g('9', [[[0.6,0.5],[0.4,0.8],[0,0.8],[0,0.4],[0.4,0.4],[0.6,0.2]]]);

  glyphs[' '] = []; // space = no strokes

  return glyphs;
})();

function buildTextGcode(text, opts = {}) {
  const {
    safeZ, cutZ, feedXY, feedZ,
    charHeight, charSpacing, lineSpacing,
    originX, originY
  } = { ...DEFAULTS, ...opts };

  const lines = (text || '').toUpperCase().split('\n');
  const scale = charHeight; // height is 1.0 units → charHeight mm
  const charWidth = 0.6 * scale; // from FONT width ratio

  const out = [];
  out.push(`(; text-to-gcode)`);
  out.push(`G21        ; mm`);
  out.push(`G90        ; absolute`);
  out.push(`G94        ; units/min feed`);
  out.push(`G17        ; XY plane`);
  out.push(`G0 Z${safeZ.toFixed(3)}`);

  let y = originY;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let x = originX;

    for (const ch of line) {
      const strokes = FONT[ch] || null;
      if (!strokes) {
        out.push(`(; unsupported char: ${ch})`);
        x += (charWidth + charSpacing);
        continue;
      }

      // For each stroke: rapid to first point @ safeZ, plunge, cut, retract
      for (const stroke of strokes) {
        if (!stroke.length) continue;
        const [sx, sy] = stroke[0];
        const absX = x + sx * scale;
        const absY = y + sy * scale;

        out.push(`G0 Z${safeZ.toFixed(3)}`);
        out.push(`G0 X${absX.toFixed(3)} Y${absY.toFixed(3)}`);
        out.push(`G1 Z${cutZ.toFixed(3)} F${feedZ}`);
        for (let i = 1; i < stroke.length; i++) {
          const [px, py] = stroke[i];
          const ax = x + px * scale;
          const ay = y + py * scale;
          out.push(`G1 X${ax.toFixed(3)} Y${ay.toFixed(3)} F${feedXY}`);
        }
        out.push(`G0 Z${safeZ.toFixed(3)}`);
      }

      x += (charWidth + charSpacing);
    }

    // next line goes downward (increase Y) or upward depending on your origin.
    // Here we’ll decrease Y to go "down the page".
    y -= (charHeight + lineSpacing);
  }

  out.push(`M5`);
  out.push(`M2`);
  return out.join('\n');
}

/**
 * Convenience generator for two messages positioned with a simple layout.
 * message1 on first line, message2 on second line.
 */
function makeTwoLineGcode({ message1 = '', message2 = '' }, opts = {}) {
  const text = `${(message1||'').toString()}\n${(message2||'').toString()}`;
  return buildTextGcode(text, opts);
}

module.exports = {
  buildTextGcode,
  makeTwoLineGcode
};
