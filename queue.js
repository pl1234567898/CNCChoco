// queue.js
const db = require('./db');
const { makeTwoLineGcode } = require('./gcode');
const { sendGcode } = require('./cnc');

let engineLock = false;

async function runNextIfIdle() {
  // Prevent concurrent runs
  if (engineLock) return { status: 'busy', message: 'Engine locked' };

  // Respect existing Printing job
  const printing = db.getPrintingJobs();
  if (printing.length > 0) return { status: 'busy', message: 'A job is already Printing' };

  const pending = db.getPendingJobs();
  if (pending.length === 0) return { status: 'empty', message: 'No Pending jobs' };

  const job = pending[0];
  engineLock = true;

  try {
    // Set job to Printing
    db.setStatus(job.id, 'Printing');

    // Generate G-code from messages + current template
    const nc = makeTwoLineGcode({ message1: job.message1, message2: job.message2 });

    // Stream to CNC (DRY mode respected inside cnc.js)
    await sendGcode(nc);

    // Fake completion after 10s (TODO: replace with real signal)
    setTimeout(() => {
      db.setStatus(job.id, 'Completed', Math.floor(Date.now()/1000));
      engineLock = false;
    }, 10_000);

    return { status: 'started', jobId: job.id };
  } catch (err) {
    console.error('[ENGINE] Error:', err.message);
    // Revert to Pending for retry
    db.setStatus(job.id, 'Pending');
    engineLock = false;
    return { status: 'error', error: err.message };
  }
}

module.exports = { runNextIfIdle };
