// routes/paymentsRoutes.js
const express = require("express");
const router = express.Router();
const { run, get } = require("../models/database");

// Simple auth guard
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: "Login required" });
}

/**
 * DEV ONLY: Mock token payment for video-call appointment
 * Client calls this right after /api/book-appointment returns needPayment=true
 * Body: { appointmentId, amount }
 */
router.post("/mock-pay", requireAuth, async (req, res) => {
  try {
    const { appointmentId, amount } = req.body;
    if (!appointmentId) return res.status(400).json({ error: "Missing appointmentId" });

    // Ensure this appointment belongs to the logged-in patient and is a video-call
    const appt = await get(
      `SELECT id, patient_id, is_video_call FROM appointments WHERE id = ?`,
      [appointmentId]
    );
    if (!appt || appt.patient_id !== req.session.user.id) {
      return res.status(403).json({ error: "Not your appointment" });
    }

    // Mark as PAID + keep video + bump priority (just in case)
    await run(
      `UPDATE appointments
         SET payment_status = 'paid',
             is_video_call = 1,
             priority = 10
       WHERE id = ?`,
      [appointmentId]
    );

    // (Optional) notify doctor in realtime – need doctor_id to target the room
    // If you want, fetch doctor_id and emit:
    // const appt2 = await get(`SELECT doctor_id FROM appointments WHERE id = ?`, [appointmentId]);
    // const io = req.app.get("io");
    // if (io && appt2?.doctor_id) {
    //   io.to('doctor:' + appt2.doctor_id).emit('appointment:paid', { appointmentId });
    // }

    return res.json({ success: true, message: "Payment successful (mock)", appointmentId });
  } catch (e) {
    console.error("Mock pay error:", e);
    return res.status(500).json({ error: "Payment failed" });
  }
});

module.exports = router;
