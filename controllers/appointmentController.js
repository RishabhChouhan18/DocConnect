// controllers/appointmentController.js
const {
  db,
  createAppointment,
  getAppointmentsByPatient,
  cancelAppointmentByPatient,
  createNotificationForDoctor,          // ✅ NEW
} = require("../models/database");

/* -------------------- Doctors list (with filters) -------------------- */
const getAllDoctors = (req, res) => {
  const { location, specialization } = req.query;

  let query = "SELECT * FROM doctors WHERE available = 1";
  const params = [];

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
      return res.status(500).json({ error: "Database error" });
    }

    db.all("SELECT DISTINCT location FROM doctors ORDER BY location", (err, locations) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }
      db.all(
        "SELECT DISTINCT specialization FROM doctors ORDER BY specialization",
        (err, specializations) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error" });
          }

          res.render("pages/patient/doctors", {
            doctors,
            locations,
            specializations,
            selectedLocation: location || "",
            selectedSpecialization: specialization || "",
          });
        }
      );
    });
  });
};

/* -------------------- Patient Home -------------------- */
const showPatientHome = (req, res) => {
  res.render("pages/patient/index");
};

/* -------------------- Booking Form -------------------- */
const showBookingForm = (req, res) => {
  const doctorId = req.params.id;

  db.get("SELECT * FROM doctors WHERE id = ?", [doctorId], (err, doctor) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error");
    }
    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }
    res.render("pages/patient/book", { doctor });
  });
};

/* -------------------- Utils -------------------- */
function genRoomId() {
  return "room_" + Math.random().toString(36).slice(2, 10);
}
function toISODate(maybeDDMMYYYYorISO) {
  if (!maybeDDMMYYYYorISO) return "";
  if (maybeDDMMYYYYorISO.includes("-")) return maybeDDMMYYYYorISO;
  const p = maybeDDMMYYYYorISO.split("/");
  if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
  return maybeDDMMYYYYorISO;
}

/* -------------------- Book Appointment (includes video-call option) -------------------- */
const bookAppointment = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: "Login required" });

    const {
      doctor_id,
      patient_name,
      patient_phone,
      appointment_date,
      appointment_time,
      symptoms,
      is_video_call, // "on" if checked
      token_amount,  // optional; defaults to 99 if video call
    } = req.body;

    if (!doctor_id || !patient_name || !patient_phone || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const dateISO = toISODate(appointment_date);
    const isVideo = !!is_video_call;
    const tokenAmt = isVideo ? Number(token_amount || 99) : null;
    const roomId = isVideo ? genRoomId() : null;

    await createAppointment({
      doctorId: Number(doctor_id),
      patientId: user.id,
      dateISO,
      time: appointment_time,
      symptoms,
      patientName: patient_name,
      patientPhone: patient_phone,
      isVideoCall: isVideo ? 1 : 0,
      tokenAmount: tokenAmt,
      rtcRoomId: roomId,
    });

    // fetch last inserted id
    const row = await new Promise((resolve, reject) => {
      db.get(`SELECT last_insert_rowid() AS id`, [], (err, r) => (err ? reject(err) : resolve(r)));
    });
    const appointmentId = row?.id;

    /* ✅ 1) Persist a notification in DB (for bell icon / history) */
    try {
      await createNotificationForDoctor(Number(doctor_id),
        `New appointment from ${patient_name} at ${appointment_time} on ${dateISO}`,
        {
          appointment_id: appointmentId,
          date: dateISO,
          time: appointment_time,
          patient_name,
          patient_phone,
          is_video_call: isVideo ? 1 : 0
        }
      );
    } catch (e) {
      console.warn("⚠️ createNotificationForDoctor failed:", e.message || e);
    }

    /* ✅ 2) Realtime notify doctor via Socket.IO */
    const io = req.app.get("io");
    if (io) {
      io.to(`doctor_${doctor_id}`).emit("appointment:new", {
        id: appointmentId,
        doctor_id,
        patient_name,
        patient_phone,
        appointment_date: dateISO,
        appointment_time,
        symptoms,
        is_video_call: isVideo,
        token_amount: tokenAmt,
        rtc_room_id: roomId,
      });
    }

    if (isVideo) {
      return res.json({
        success: true,
        message: "Video call appointment created. Please complete token payment.",
        appointmentId,
        needPayment: true,
        tokenAmount: tokenAmt,
      });
    }

    return res.json({
      success: true,
      message: "Appointment booked successfully!",
      appointmentId,
      needPayment: false,
    });
  } catch (err) {
    console.error("Failed to book appointment:", err);
    return res.status(500).json({ error: "Failed to book appointment" });
  }
};

/* -------------------- Patient: My Appointments (only own) -------------------- */
const myAppointments = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/auth/login?role=patient");

    const appointments = await getAppointmentsByPatient(user.id);
    return res.render("pages/patient/appointments", { appointments });
  } catch (err) {
    console.error("Load my appointments error:", err);
    return res.status(500).send("Failed to load your appointments");
  }
};

/* -------------------- Patient: Cancel own pending appointment -------------------- */
const cancelMyAppointment = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: "Login required" });

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing appointment id" });

    if (typeof cancelAppointmentByPatient === "function") {
      await cancelAppointmentByPatient({ id, patientId: user.id });
    } else {
      const result = await new Promise((resolve, reject) =>
        db.run(
          `UPDATE appointments
             SET status = 'cancelled'
           WHERE id = ?
             AND patient_id = ?
             AND status = 'pending'`,
          [id, user.id],
          function (err) {
            if (err) return reject(err);
            resolve(this);
          }
        )
      );
      if (!result || result.changes === 0) {
        throw new Error("Cannot cancel: not found, not yours, or not pending");
      }
    }

    return res.json({ success: true, message: "Appointment cancelled" });
  } catch (err) {
    console.error("Cancel appointment error:", err.message || err);
    return res.status(400).json({ error: err.message || "Failed to cancel appointment" });
  }
};

module.exports = {
  getAllDoctors,
  showPatientHome,
  showBookingForm,
  bookAppointment,
  myAppointments,
  cancelMyAppointment,
};
