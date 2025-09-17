const { db } = require('../models/database');

// Get all doctors for patient view
const getAllDoctors = (req, res) => {
    const { location, specialization } = req.query;
    
    let query = "SELECT * FROM doctors WHERE available = 1";
    let params = [];

    // Add filters if provided
    if (location) {
        query += " AND location = ?";
        params.push(location);
    }
    if (specialization) {
        query += " AND specialization = ?";
        params.push(specialization);
    }

    query += " ORDER BY name";

    db.all(query, params, (err, doctors) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Get unique locations and specializations for filters
        db.all("SELECT DISTINCT location FROM doctors ORDER BY location", (err, locations) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            db.all("SELECT DISTINCT specialization FROM doctors ORDER BY specialization", (err, specializations) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Database error' });
                }

                res.render('pages/patient/doctors', {
                    doctors,
                    locations,
                    specializations,
                    selectedLocation: location || '',
                    selectedSpecialization: specialization || ''
                });
            });
        });
    });
};

// Show patient homepage
const showPatientHome = (req, res) => {
    res.render('pages/patient/index');
};

// Show booking form for specific doctor
const showBookingForm = (req, res) => {
    const doctorId = req.params.id;
    
    db.get("SELECT * FROM doctors WHERE id = ?", [doctorId], (err, doctor) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }
        
        if (!doctor) {
            return res.status(404).send('Doctor not found');
        }
        
        res.render('pages/patient/book', { doctor });
    });
};

// Book appointment
const bookAppointment = (req, res) => {
    const { doctor_id, patient_name, patient_phone, appointment_date, appointment_time, symptoms } = req.body;

    // Validate required fields
    if (!doctor_id || !patient_name || !patient_phone || !appointment_date || !appointment_time) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Insert appointment
    const stmt = db.prepare(`INSERT INTO appointments 
        (doctor_id, patient_name, patient_phone, appointment_date, appointment_time, symptoms) 
        VALUES (?, ?, ?, ?, ?, ?)`);
    
    stmt.run([doctor_id, patient_name, patient_phone, appointment_date, appointment_time, symptoms], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to book appointment' });
        }
        
        res.json({ 
            success: true, 
            message: 'Appointment booked successfully!',
            appointmentId: this.lastID 
        });
    });
};

module.exports = {
    getAllDoctors,
    showPatientHome,
    showBookingForm,
    bookAppointment
};