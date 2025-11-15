const { db } = require("./database");

// search doctors with optional filters
function searchDoctors({ specialization, location, name } = {}) {
  return new Promise((resolve, reject) => {
    let sql = "SELECT * FROM doctors WHERE 1=1";
    const params = [];
    if (specialization) { sql += " AND specialization LIKE ?"; params.push(`%${specialization}%`); }
    if (location)      { sql += " AND location LIKE ?";       params.push(`%${location}%`); }
    if (name)          { sql += " AND name LIKE ?";           params.push(`%${name}%`); }

    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function getDoctorById(id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM doctors WHERE id = ?", [id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

// create appointment
function createAppointment({ doctor_id, patient_name, patient_phone, appointment_date, appointment_time, symptoms }) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO appointments
      (doctor_id, patient_name, patient_phone, appointment_date, appointment_time, symptoms)
      VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [doctor_id, patient_name, patient_phone, appointment_date, appointment_time, symptoms || null];
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
}

module.exports = { searchDoctors, getDoctorById, createAppointment };
