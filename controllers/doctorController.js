// controllers/doctorController.js
const {
  get,
  getAppointmentsByDoctorForUser,
  updateAppointmentStatus: updateStatusModel,
  listNotificationsByDoctor,
  markNotificationRead,
} = require('../models/database');

/* ===================== Helper ===================== */
async function mapDoctorIdFromUser(user) {
  if (!user) return null;
  const row = await get(`SELECT id FROM doctors WHERE user_id = ?`, [user.id]);
  return row ? row.id : null;
}

/* ===================== Dashboard ===================== */
const showDoctorDashboard = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'doctor') {
      return res.redirect('/auth/login?role=doctor');
    }

    const appointments = await getAppointmentsByDoctorForUser(user);
    const doctorId = await mapDoctorIdFromUser(user);

    return res.render('pages/doctor/dashboard', {
      appointments,
      doctor_id: doctorId || 0,
    });
  } catch (e) {
    console.error('Doctor dashboard error:', e);
    return res.status(500).send('Database error');
  }
};

/* ===================== Update Appointment Status ===================== */
const updateAppointmentStatus = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'doctor') {
      return res.status(401).json({ error: 'Login required' });
    }

    const { appointmentId, status } = req.body;
    if (!appointmentId || !status) {
      return res.status(400).json({ error: 'Missing appointmentId or status' });
    }

    // UI sends accepted/rejected → convert them
    const map = { accepted: 'success', rejected: 'cancelled' };
    const normalized = (map[status] || status).toLowerCase();

    if (!['pending', 'success', 'cancelled'].includes(normalized)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await updateStatusModel({
      id: Number(appointmentId),
      doctorGuard: { doctorUserId: user.id },
      status: normalized,
    });

    // ✅ Trigger real-time update for patient
    const io = req.app.get("io");
    io.emit("appointment:statusUpdate", {
      id: appointmentId,
      status: normalized,
    });

    return res.json({ success: true, message: `Appointment ${normalized}` });

  } catch (e) {
    console.error('Update status error:', e);
    return res.status(400).json({ error: e.message || 'Failed to update status' });
  }
};

/* ===================== Notifications ===================== */
const showNotifications = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'doctor')
      return res.redirect('/auth/login?role=doctor');

    const doctorId = await mapDoctorIdFromUser(user);
    if (!doctorId) return res.status(404).send('Doctor profile not linked');

    const notifications = await listNotificationsByDoctor(doctorId);
    return res.render('pages/doctor/notifications', { notifications });
  } catch (e) {
    console.error('Show notifications error:', e);
    return res.status(500).send('Failed to load notifications');
  }
};

const getNotificationsJson = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'doctor') {
      return res.status(401).json({ error: 'Login required' });
    }

    const doctorId = await mapDoctorIdFromUser(user);
    if (!doctorId) return res.status(404).json({ error: 'Doctor not found' });

    const onlyUnread = req.query.unread === '1';
    const notifications = await listNotificationsByDoctor(doctorId, { onlyUnread });
    const count = notifications.filter(n => !n.is_read).length;

    return res.json({ success: true, notifications, count });
  } catch (e) {
    console.error('Get notifications error:', e);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

const markNotifRead = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'doctor') {
      return res.status(401).json({ error: 'Login required' });
    }

    const doctorId = await mapDoctorIdFromUser(user);
    if (!doctorId) return res.status(404).json({ error: 'Doctor not found' });

    const ok = await markNotificationRead(Number(req.params.id), doctorId);
    return res.json({ success: ok });

  } catch (e) {
    console.error('Mark notif read error:', e);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
};

module.exports = {
  showDoctorDashboard,
  updateAppointmentStatus,
  showNotifications,
  getNotificationsJson,
  markNotifRead,
};
