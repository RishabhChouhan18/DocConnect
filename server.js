// server.js (CommonJS)
require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const http = require("http");
const { Server } = require("socket.io");

// DB init
const { initializeDatabase } = require("./models/database");

// Routes
const appointmentRoutes = require("./routes/appointmentRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const authRoutes = require("./routes/authRoutes");
const paymentsRoutes = require("./routes/paymentsRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------- Core App Setup -------------------- */

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static + Body parsers
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.set("trust proxy", 1);
app.use(
  session({
    name: "dc.sid",
    secret: process.env.SESSION_SECRET || "docconnect-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      sameSite: "lax",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

// Expose session + role flags to EJS
app.use((req, res, next) => {
  res.locals.session = req.session;
  const u = req.session?.user || null;
  res.locals.user = u;
  res.locals.patient = u && u.role === "patient" ? u : null;
  res.locals.doctor = u && u.role === "doctor" ? u : null;
  next();
});

/* -------------------- Routes -------------------- */

app.get("/", (req, res) => {
  const u = req.session?.user;
  if (u) {
    if (u.role === "doctor") return res.redirect("/doctor/dashboard");
    return res.redirect("/patient");
  }
  return res.redirect("/auth/login");
});

app.use("/auth", authRoutes);
app.use("/doctor", doctorRoutes);
app.use("/chatbot", chatbotRoutes);
app.use("/payments", paymentsRoutes);
app.use("/", appointmentRoutes);

// 404
app.use((req, res) => res.status(404).send("404 - Page Not Found"));

/* -------------------- Start Server + Socket.IO -------------------- */

initializeDatabase()
  .then(() => {
    // Create HTTP server
    const server = http.createServer(app);

    // Create socket.io instance
    const io = new Server(server, {
      cors: { origin: "*" },
    });

    // Make io available to controllers
    app.set("io", io);

    /* ----------- Socket.IO Real-Time Logic ----------- */

    io.on("connection", (socket) => {
      console.log("✅ Socket connected:", socket.id);

      // Doctor room join
      socket.on("join-doctor", (doctorId) => {
        if (doctorId) {
          const roomName = `doctor_${doctorId}`;
          socket.join(roomName);
          console.log(`👨‍⚕️ Doctor joined room: ${roomName}`);
        }
      });

      socket.on("disconnect", () => {
        console.log("❌ Socket disconnected:", socket.id);
      });
    });

    /* -------------------- Start Server -------------------- */

    server.listen(PORT, () => {
      console.log(`✅ DocConnect+ running:  http://localhost:${PORT}`);
      console.log(`🔐 Login:               http://localhost:${PORT}/auth/login?role=patient`);
      console.log(`🧑‍⚕️ Patient view:        http://localhost:${PORT}/patient`);
      console.log(`📊 Doctor dashboard:    http://localhost:${PORT}/doctor/dashboard`);
      console.log(`🤖 Chatbot:             http://localhost:${PORT}/chatbot`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1);
  });
