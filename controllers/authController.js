
// controllers/authController.js
const { createUser, findByEmail, verifyPassword } = require("../models/userModel");
const { run, get } = require("../models/database"); // ✅ add: DB helpers to write into doctors table

const okRoles = new Set(["patient", "doctor"]);
const norm = (s) => (typeof s === "string" ? s.trim() : "");
const enc = encodeURIComponent;

// GET /auth/login
exports.getLogin = (req, res) => {
  const role = okRoles.has((req.query.role || "").toLowerCase())
    ? (req.query.role || "patient").toLowerCase()
    : "patient";
  res.render("auth/login", { role, error: req.query.error || null, msg: req.query.msg || null });
};

// GET /auth/signup
exports.getSignup = (req, res) => {
  const role = okRoles.has((req.query.role || "").toLowerCase())
    ? (req.query.role || "patient").toLowerCase()
    : "patient";
  res.render("auth/signup", { role, error: req.query.error || null, msg: req.query.msg || null });
};

// ✅ POST /auth/signup  (NO auto-login; then redirect to login)
//    If role === 'doctor' → also insert into doctors table (linked via user_id)
exports.postSignup = async (req, res) => {
  try {
    const role = okRoles.has((req.body.role || "").toLowerCase())
      ? req.body.role.toLowerCase()
      : "patient";

    const name = norm(req.body.name);
    const phone = norm(req.body.phone);
    const email = norm(req.body.email).toLowerCase();
    const password = norm(req.body.password);
    const confirm = norm(req.body.confirm);
    const specialization = role === "doctor" ? norm(req.body.specialization) : null;
    const location = role === "doctor" ? norm(req.body.location || "Unknown") : null; // optional field

    if (!name || !email || !password || !confirm) {
      return res.redirect(`/auth/signup?role=${role}&error=${enc("Please fill all required fields")}`);
    }
    if (password.length < 6) {
      return res.redirect(`/auth/signup?role=${role}&error=${enc("Password must be at least 6 characters")}`);
    }
    if (password !== confirm) {
      return res.redirect(`/auth/signup?role=${role}&error=${enc("Passwords do not match")}`);
    }

    const existing = await findByEmail(email);
    if (existing) {
      return res.redirect(`/auth/signup?role=${role}&error=${enc("Email already registered")}`);
    }

    // Create user in users table
    await createUser({ role, name, email, phone, specialization, password });

    // Fetch newly created user
    const newUser = await findByEmail(email);

    // ✅ If doctor: ensure row exists in doctors directory, linked via user_id
    if (role === "doctor" && newUser?.id) {
      const already = await get(`SELECT id FROM doctors WHERE user_id = ?`, [newUser.id]);
      if (!already) {
        await run(
          `INSERT INTO doctors (name, specialization, location, phone, user_id, available)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [
            name,
            specialization || "General Medicine",
            location || "Unknown",
            phone || "",
            newUser.id
          ]
        );
      }
    }

    // 🔒 ensure user is not auto-logged-in after signup
    req.session.regenerate(() => {
      return res.redirect(303, `/auth/login?role=${role}&msg=${enc("Account created. Please sign in.")}`);
    });
  } catch (e) {
    console.error("Signup error:", e);
    const role = okRoles.has((req.body.role || "").toLowerCase()) ? req.body.role.toLowerCase() : "patient";
    return res.redirect(`/auth/signup?role=${role}&error=${enc("Signup failed")}`);
  }
};

// POST /auth/login
exports.postLogin = async (req, res) => {
  try {
    const role = okRoles.has((req.body.role || "").toLowerCase()) ? req.body.role.toLowerCase() : "patient";
    const email = norm(req.body.email).toLowerCase();
    const password = norm(req.body.password);

    const user = await findByEmail(email);
    if (!user || user.role !== role || !verifyPassword(user, password)) {
      return res.redirect(`/auth/login?role=${role}&error=${enc("Invalid credentials")}`);
    }

    req.session.user = { id: user.id, role: user.role, name: user.name, email: user.email };

    // (Keep your existing redirect; change if you prefer role-based)
    return res.redirect("/patient");
    // Example role-based:
    // if (user.role === "doctor") return res.redirect("/doctor/dashboard");
    // return res.redirect("/patient");
  } catch (e) {
    console.error("Login error:", e);
    const role = okRoles.has((req.body.role || "").toLowerCase()) ? req.body.role.toLowerCase() : "patient";
    return res.redirect(`/auth/login?role=${role}&error=${enc("Login failed")}`);
  }
};

exports.postLogout = (req, res) => {
  req.session.destroy(() => res.redirect("/"));
};
