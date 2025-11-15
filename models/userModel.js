const bcrypt = require("bcryptjs");
const { db } = require("./database");

// create user
function createUser({ role, name, email, phone, specialization, password }) {
  return new Promise((resolve, reject) => {
    const password_hash = bcrypt.hashSync(password, 10);
    const sql = `INSERT INTO users (role, name, email, phone, specialization, password_hash)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [role, name, email, phone || null, specialization || null, password_hash], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
}

function findByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.password_hash);
}

module.exports = { createUser, findByEmail, verifyPassword };
