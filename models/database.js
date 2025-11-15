const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'docconnect.db');
const db = new sqlite3.Database(dbPath);

/* =====================================================
   PROMISE HELPERS
===================================================== */
const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    })
  );

const get = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  );

const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

/* =====================================================
   ADD COLUMN IF MISSING
===================================================== */
async function addColumnIfMissing(table, column, def) {
  const info = await all(`PRAGMA table_info(${table})`);
  const has = info.some(c => c.name === column);
  if (!has) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
}

/* =====================================================
   INIT + MIGRATIONS
===================================================== */
const initializeDatabase = () => {
  return new Promise(async (resolve, reject) => {
    try {
      db.serialize(async () => {
        await run(`PRAGMA foreign_keys = ON`);
        await run(`PRAGMA journal_mode = WAL`);

        /* ------------------------------------------------------
           USERS
        ------------------------------------------------------ */
        await run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL CHECK(role IN ('patient','doctor')),
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            specialization TEXT,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        /* ------------------------------------------------------
           DOCTORS
        ------------------------------------------------------ */
        await run(`
          CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            specialization TEXT NOT NULL,
            location TEXT NOT NULL,
            phone TEXT,
            available INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await addColumnIfMissing("doctors", "user_id", "INTEGER REFERENCES users(id)");

        /* ------------------------------------------------------
           APPOINTMENTS (legacy → upgraded)
        ------------------------------------------------------ */
        await run(`
          CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_id INTEGER,
            patient_name TEXT NOT NULL,
            patient_phone TEXT NOT NULL,
            appointment_date TEXT NOT NULL,
            appointment_time TEXT NOT NULL,
            symptoms TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
          )
        `);

        await addColumnIfMissing("appointments", "patient_id", "INTEGER REFERENCES users(id)");

        // New schema for video call etc.
        await run(`
          CREATE TABLE IF NOT EXISTS _appointments_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_id INTEGER,
            patient_id INTEGER,
            patient_name TEXT NOT NULL,
            patient_phone TEXT NOT NULL,
            appointment_date TEXT NOT NULL,
            appointment_time TEXT NOT NULL,
            symptoms TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','cancelled')),
            is_video_call INTEGER NOT NULL DEFAULT 0,
            token_amount INTEGER,
            payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid','failed')),
            priority INTEGER NOT NULL DEFAULT 0,
            rtc_room_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
            FOREIGN KEY(patient_id) REFERENCES users(id) ON DELETE CASCADE
          );
        `);

        const oldCols = await all(`PRAGMA table_info(appointments)`);
        const newCols = await all(`PRAGMA table_info(_appointments_new)`);

        if (oldCols.length !== newCols.length) {
          await run(`
            INSERT INTO _appointments_new
              (id, doctor_id, patient_id, patient_name, patient_phone, appointment_date, appointment_time, symptoms, status,
               is_video_call, token_amount, payment_status, priority, rtc_room_id, created_at)
            SELECT 
              id, doctor_id, patient_id, patient_name, patient_phone,
              appointment_date, appointment_time, symptoms,
              CASE WHEN status IN ('pending','success','cancelled') THEN status ELSE 'pending' END,
              0, NULL, 'unpaid', 0, NULL, created_at
            FROM appointments
          `);

          await run(`DROP TABLE appointments`);
          await run(`ALTER TABLE _appointments_new RENAME TO appointments`);
        } else {
          await run(`DROP TABLE IF EXISTS _appointments_new`);
        }

        /* ------------------------------------------------------
           INDEXES
        ------------------------------------------------------ */
        await run(`CREATE INDEX IF NOT EXISTS idx_appt_doctor ON appointments(doctor_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_appt_status ON appointments(status)`);

        /* ------------------------------------------------------
           ✅ NOTIFICATIONS TABLE (FINAL + PERFECT)
        ------------------------------------------------------ */
        await run(`
          CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            data TEXT,            -- JSON
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await run(`CREATE INDEX IF NOT EXISTS idx_notif_doctor ON notifications(doctor_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(doctor_id, is_read)`);

        /* ---------- Seed Doctors + Demo Users kept as-is ---------- */
        // (unchanged)
        // ... ✅ YOUR ORIGINAL SEED CODE KEPT EXACT SAME ...
        // (Skipping block here for space, but in your real file keep it SAME)

        resolve();
      });
    } catch (err) {
      console.log("❌ Database Error:", err);
      reject(err);
    }
  });
};

/* =====================================================
   HELPER FUNCTIONS
===================================================== */

// CREATE APPOINTMENT
async function createAppointment(params) {
  const {
    doctorId, patientId,
    dateISO, time,
    symptoms, patientName, patientPhone,
    isVideoCall = 0, tokenAmount = null, rtcRoomId = null
  } = params;

  const priority = isVideoCall ? 10 : 0;

  await run(`
    INSERT INTO appointments (
      doctor_id, patient_id, patient_name, patient_phone,
      appointment_date, appointment_time, symptoms, status,
      is_video_call, token_amount, payment_status, priority, rtc_room_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, 'unpaid', ?, ?)
  `, [
    doctorId, patientId, patientName, patientPhone,
    dateISO, time, symptoms,
    isVideoCall ? 1 : 0,
    tokenAmount, priority, rtcRoomId
  ]);
}

/* ---------- Patient Appointments ---------- */
function getAppointmentsByPatient(id) {
  return all(`
    SELECT a.*, d.name AS doctor_name, d.specialization AS doctor_specialization
    FROM appointments a
    LEFT JOIN doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = ?
    ORDER BY datetime(a.appointment_date || 'T' || a.appointment_time) DESC,
             datetime(a.created_at) DESC
  `, [id]);
}

/* ---------- Doctor Appointments ---------- */
async function getAppointmentsByDoctorForUser(user) {
  const rows = await all(`
    SELECT a.*, u.name AS patient_name_real, u.email AS patient_email, d.name AS doctor_name
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    LEFT JOIN users u ON u.id = a.patient_id
    WHERE d.user_id = ?
    ORDER BY a.priority DESC,
             datetime(a.appointment_date || 'T' || a.appointment_time) ASC,
             datetime(a.created_at) DESC
  `, [user.id]);

  if (rows.length) return rows;

  return all(`
    SELECT a.*, u.name AS patient_name_real, u.email AS patient_email, d.name AS doctor_name
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    LEFT JOIN users u ON u.id = a.patient_id
    WHERE d.name = ?
    ORDER BY a.priority DESC,
             datetime(a.appointment_date || 'T' || a.appointment_time) ASC,
             datetime(a.created_at) DESC
  `, [user.name]);
}

/* ---------- Appointment Status Update ---------- */
async function updateAppointmentStatus({ id, doctorGuard, status }) {
  let res;

  if (doctorGuard.doctorUserId) {
    res = await run(`
      UPDATE appointments
      SET status = ?
      WHERE id = ?
      AND doctor_id IN (SELECT id FROM doctors WHERE user_id = ?)
    `, [status, id, doctorGuard.doctorUserId]);
  }

  if (!res || res.changes === 0) {
    throw new Error("Appointment not found or unauthorized");
  }
  return true;
}

/* ---------- Cancel Appointment (patient only) ---------- */
async function cancelAppointmentByPatient({ id, patientId }) {
  const res = await run(`
    UPDATE appointments
    SET status='cancelled'
    WHERE id=? AND patient_id=? AND status='pending'
  `, [id, patientId]);

  if (res.changes === 0) throw new Error("Cannot cancel");

  return true;
}

/* =====================================================
   ✅ NOTIFICATION SYSTEM (FINAL + FIXED)
===================================================== */

// CREATE NEW NOTIFICATION
async function createNotificationForDoctor(doctorId, message, data = null) {
  const json = data ? JSON.stringify(data) : null;

  const result = await run(`
    INSERT INTO notifications(doctor_id, message, data, is_read)
    VALUES (?, ?, ?, 0)
  `, [doctorId, message, json]);

  return result.lastID;
}

/* ---------- LIST NOTIFICATIONS ---------- */
async function listNotificationsByDoctor(doctorId, options = {}) {
  const unreadOnly = options.onlyUnread ? "AND is_read = 0" : "";

  const rows = await all(`
    SELECT * FROM notifications
    WHERE doctor_id = ?
    ${unreadOnly}
    ORDER BY created_at DESC, id DESC
  `, [doctorId]);

  // ✅ Parse JSON safely
  return rows.map(r => ({
    ...r,
    data: (() => {
      try { return JSON.parse(r.data || "{}"); }
      catch { return {}; }
    })()
  }));
}

/* ---------- MARK READ ---------- */
async function markNotificationRead(id, doctorId) {
  const res = await run(`
    UPDATE notifications
    SET is_read=1
    WHERE id=? AND doctor_id=?
  `, [id, doctorId]);

  return res.changes > 0;
}
async function deleteAppointmentByPatient(id, patientId) {
  return run(
    `DELETE FROM appointments WHERE id = ? AND patient_id = ? AND status = 'pending'`,
    [id, patientId]
  );
}


module.exports = {
  db,
  initializeDatabase,
  run, get, all,
  createAppointment,
  getAppointmentsByPatient,
  getAppointmentsByDoctorForUser,
  updateAppointmentStatus,
  cancelAppointmentByPatient,
  createNotificationForDoctor,
  listNotificationsByDoctor,
  markNotificationRead,
  deleteAppointmentByPatient,

};
