const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");

/* --------- middlewares --------- */
// If already logged in, don't show login/signup
function ensureGuest(req, res, next) {
  const u = req.session && req.session.user;
  if (u) {
    // role-aware redirect
    if (u.role === "doctor") return res.redirect("/doctor/dashboard");
    return res.redirect("/patient");
  }
  next();
}

// Require login for protected auth actions like logout
function ensureAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect("/auth/login?role=patient&error=" + encodeURIComponent("Please login first"));
}

/* --------- optional convenience --------- */
// Hitting /auth directly -> go to login
router.get("/", (req, res) => res.redirect("/auth/login?role=patient"));

/* --------- views --------- */
router.get("/login", ensureGuest, auth.getLogin);
router.get("/signup", ensureGuest, auth.getSignup);

/* --------- actions --------- */
router.post("/login", auth.postLogin);
router.post("/signup", auth.postSignup);

// Support both GET and POST for logout (easier for header links)
router.get("/logout", ensureAuth, auth.postLogout);
router.post("/logout", ensureAuth, auth.postLogout);

module.exports = router;
