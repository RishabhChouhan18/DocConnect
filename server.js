const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

// Import routes
const appointmentRoutes = require('./routes/appointmentRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');

// Import database initialization
const { initializeDatabase } = require('./models/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration (minimal - only for storing temp data)
app.use(session({
    secret: 'docconnect-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// Routes
app.use('/', appointmentRoutes);
app.use('/doctor', doctorRoutes);
app.use('/chatbot', chatbotRoutes);

// Home route - redirect to patient view
app.get('/', (req, res) => {
    res.redirect('/patient');
});

// Initialize database and start server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 DocConnect+ server running on http://localhost:${PORT}`);
        console.log('📱 Patient view: http://localhost:3000/patient');
        console.log('👨‍⚕️ Doctor dashboard: http://localhost:3000/doctor/dashboard');
        console.log('🤖 Chatbot: http://localhost:3000/chatbot');
    });
}).catch(err => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
});