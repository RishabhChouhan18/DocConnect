const express = require('express');
const router = express.Router();
const {
    showDoctorDashboard,
    updateAppointmentStatus
} = require('../controllers/doctorController');

// Doctor routes
router.get('/dashboard', showDoctorDashboard);
router.post('/api/update-appointment', updateAppointmentStatus);

module.exports = router;