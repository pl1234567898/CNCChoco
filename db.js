// db.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_FILE || './data/prox.db';
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  q1 TEXT,
  q2 TEXT,
  q3 TEXT,
  best_contact TEXT,
  contact_details TEXT,
  ok_to_reach_out INTEGER,   -- 0/1
  message1 TEXT,
  message2 TEXT,
  status TEXT,               -- Pending | Printing | Completed | Cancelled by User | Cancelled by Admin
  created_at INTEGER,        -- unix epoch (sec)
  updated_at INTEGER,
  completed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at);
`);

const insertJob = db.prepare(`
INSERT INTO jobs (
  id, first_name, last_name, email, phone, q1, q2, q3,
  best_contact, contact_details, ok_to_reach_out, message1, message2,
  status, created_at, updated_at, completed_at
) VALUES (
  @id, @first_name, @last_name, @email, @phone, @q1, @q2, @q3,
  @best_contact, @contact_details, @ok_to_reach_out, @message1, @message2,
  @status, @created_at, @updated_at, NULL
)`);

const getPendingJobsStmt  = db.prepare(`SELECT * FROM jobs WHERE status='Pending'  ORDER BY created_at ASC`);
const getPrintingJobsStmt = db.prepare(`SELECT * FROM jobs WHERE status='Printing' ORDER BY created_at ASC`);
const getJobStmt          = db.prepare(`SELECT * FROM jobs WHERE id=?`);
const updateJobStmt       = db.prepare(`
UPDATE jobs SET
  first_name = COALESCE(@first_name, first_name),
  last_name = COALESCE(@last_name, last_name),
  email = COALESCE(@email, email),
  phone = COALESCE(@phone, phone),
  q1 = COALESCE(@q1, q1),
  q2 = COALESCE(@q2, q2),
  q3 = COALESCE(@q3, q3),
  best_contact = COALESCE(@best_contact, best_contact),
  contact_details = COALESCE(@contact_details, contact_details),
  ok_to_reach_out = COALESCE(@ok_to_reach_out, ok_to_reach_out),
  message1 = COALESCE(@message1, message1),
  message2 = COALESCE(@message2, message2),
  status = COALESCE(@status, status),
  updated_at = @updated_at,
  completed_at = COALESCE(@completed_at, completed_at)
WHERE id = @id
`);
const setStatusStmt = db.prepare(`
UPDATE jobs SET status=@status, updated_at=@updated_at, completed_at=@completed_at
WHERE id=@id
`);

const now = () => Math.floor(Date.now()/1000);

module.exports = {
  createJob(data) {
    insertJob.run(data);
    return this.getJob(data.id);
  },
  getPendingJobs() {
    return getPendingJobsStmt.all();
  },
  getPrintingJobs() {
    return getPrintingJobsStmt.all();
  },
  getJob(id) {
    return getJobStmt.get(id);
  },
  updateJob(partial) {
    updateJobStmt.run({ ...partial, updated_at: now() });
    return this.getJob(partial.id);
  },
  setStatus(id, status, completedAt = null) {
    setStatusStmt.run({ id, status, updated_at: now(), completed_at: completedAt });
    return this.getJob(id);
  }
};
