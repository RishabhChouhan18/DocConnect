const express = require('express');
const router = express.Router();
const {
    getAllDoctors,
    showPatientHome,
    showBookingForm,
    bookAppointment
} = require('../controllers/appointmentController');

// Patient routes
router.get('/patient', showPatientHome);
router.get('/patient/doctors', getAllDoctors);
router.get('/patient/book/:id', showBookingForm);
router.post('/api/book-appointment', bookAppointment);

module.exports = router;