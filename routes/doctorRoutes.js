const express = require('express');
const router = express.Router();
const requireAuth = require("../middleware/authMiddleware");

const {
  showDoctorDashboard,
  updateAppointmentStatus,
  showNotifications,
  getNotificationsJson,
  markNotifRead,
} = require('../controllers/doctorController');

// ✅ Middleware: Allow only doctors
function requireDoctor(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'doctor') {
    return res.redirect('/auth/login?role=doctor');
  }
  next();
}

// ✅ Doctor Dashboard
router.get('/dashboard', requireAuth, requireDoctor, showDoctorDashboard);

// ✅ Update Appointment Status
router.post('/api/update-appointment', requireAuth, requireDoctor, updateAppointmentStatus);

// ✅ Notifications Page
router.get('/notifications', requireAuth, requireDoctor, showNotifications);

// ✅ Notifications JSON
router.get('/api/notifications', requireAuth, requireDoctor, getNotificationsJson);

// ✅ Mark notification as read
router.post('/api/notifications/:id/read', requireAuth, requireDoctor, markNotifRead);

module.exports = router;
