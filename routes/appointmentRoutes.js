const express = require('express');
const router = express.Router();

const requireAuth = require("../middleware/authMiddleware");

// ✅ Import ALL controller functions, including myAppointments
const {
    getAllDoctors,
    showPatientHome,
    showBookingForm,
    bookAppointment,
    myAppointments
    
} = require('../controllers/appointmentController');

// ✅ Protect all routes starting with /patient
router.use("/patient", requireAuth);

// Patient pages
router.get('/patient', showPatientHome);
router.get('/patient/doctors', getAllDoctors);
router.get('/patient/book/:id', showBookingForm);

// ✅ Patient sees only their own appointments
router.get('/patient/appointments', myAppointments);

// ✅ Book appointment (also protected)
router.post('/api/book-appointment', requireAuth, bookAppointment);

module.exports = router;
