const { db } = require('../models/database');

// Show doctor dashboard with appointments
const showDoctorDashboard = (req, res) => {
    const query = `SELECT 
        a.*, 
        d.name as doctor_name, 
        d.specialization 
        FROM appointments a 
        JOIN doctors d ON a.doctor_id = d.id 
        ORDER BY a.created_at DESC`;

    db.all(query, (err, appointments) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }

        res.render('pages/doctor/dashboard', { appointments });
    });
};

// Update appointment status (accept/reject)
const updateAppointmentStatus = (req, res) => {
    const { appointmentId, status } = req.body;

    // Validate status
    if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const query = "UPDATE appointments SET status = ? WHERE id = ?";
    
    db.run(query, [status, appointmentId], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to update appointment' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json({ 
            success: true, 
            message: `Appointment ${status} successfully!` 
        });
    });
};

module.exports = {
    showDoctorDashboard,
    updateAppointmentStatus
};