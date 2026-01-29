// cnc.js
require('dotenv').config();
const { SerialPort } = require('serialport');

const CNC_PORT = process.env.CNC_PORT || '/dev/ttyUSB0';
const CNC_BAUD = Number(process.env.CNC_BAUD || 115200);
const DRY      = process.env.CNC_DRY_RUN === '1';

let port = null;
let buffer = '';
let lineListeners = [];

function onData(chunk) {
  buffer += chunk.toString();
  let idx;
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).replace(/\r/g, '').trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    // notify listeners waiting for next line
    const listeners = lineListeners;
    lineListeners = [];
    listeners.forEach(fn => fn(line));
    // also echo to console for debug
    process.stdout.write(`[CNC] ${line}\n`);
  }
}

function waitForLine(predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout waiting for expected CNC response'));
    }, timeoutMs);

    function handler(line) {
      if (!predicate || predicate(line)) {
        cleanup();
        resolve(line);
      } else {
        // not matched, keep waiting: re-queue the handler
        lineListeners.push(handler);
      }
    }

    function cleanup() {
      clearTimeout(timer);
    }

    lineListeners.push(handler);
  });
}

async function ensureOpen() {
  if (DRY) {
    console.log('[CNC] DRY RUN enabled - no serial port will be opened');
    return;
  }
  if (port && port.isOpen) return;

  port = new SerialPort({ path: CNC_PORT, baudRate: CNC_BAUD });
  // Wire the data handler once
  port.on('data', onData);

  // Wait for open event
  await new Promise((resolve, reject) => {
    port.once('open', resolve);
    port.once('error', reject);
  });
  console.log(`[CNC] Serial open ${CNC_PORT} @ ${CNC_BAUD}`);

  // Reset GRBL and wait for banner
  port.write('\r\n\r\n');
  try {
    await waitForLine((line) => /grbl/i.test(line), 4000);
    console.log('[CNC] GRBL banner received');
  } catch {
    console.log('[CNC] No GRBL banner detected; proceeding');
  }

  // Set to absolute, mm, etc. (redundant with program prologue, but fine)
  port.write('G90\nG21\n');
  await waitForOk();
}

function waitForOk(timeoutMs = 5000) {
  return waitForLine((line) => line.toLowerCase() === 'ok' || line.toLowerCase().startsWith('error'), timeoutMs);
}

async function sendGcode(gcode) {
  if (DRY) {
    console.log('----- CNC DRY RUN START -----\n' + gcode + '\n----- CNC DRY RUN END -----');
    return;
  }

  await ensureOpen();

  const lines = gcode
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0); // keep comments; GRBL ignores ( ... )

  for (const line of lines) {
    port.write(line + '\n');
    const resp = await waitForOk(10000);
    if (resp.toLowerCase().startsWith('error')) {
      throw new Error(`GRBL error on line "${line}": ${resp}`);
    }
  }

  console.log('[CNC] Job streamed successfully');
}

module.exports = { sendGcode };
