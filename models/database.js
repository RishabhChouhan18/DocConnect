const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in project directory to avoid OneDrive issues
const dbPath = path.join(__dirname, '..', 'docconnect.db');
const db = new sqlite3.Database(dbPath);

// Initialize database with tables and sample data
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Create doctors table
            db.run(`CREATE TABLE IF NOT EXISTS doctors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                specialization TEXT NOT NULL,
                location TEXT NOT NULL,
                phone TEXT,
                available BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Create appointments table
            db.run(`CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doctor_id INTEGER,
                patient_name TEXT NOT NULL,
                patient_phone TEXT NOT NULL,
                appointment_date TEXT NOT NULL,
                appointment_time TEXT NOT NULL,
                symptoms TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (doctor_id) REFERENCES doctors (id)
            )`);

            // Seed sample doctors data
            const sampleDoctors = [
                ['Dr. Rajesh Kumar', 'General Medicine', 'Delhi', '9876543210'],
                ['Dr. Priya Sharma', 'Cardiology', 'Mumbai', '9876543211'],
                ['Dr. Amit Singh', 'Dermatology', 'Delhi', '9876543212'],
                ['Dr. Sunita Gupta', 'Pediatrics', 'Bangalore', '9876543213'],
                ['Dr. Vikash Patel', 'Orthopedics', 'Mumbai', '9876543214'],
                ['Dr. Neha Agarwal', 'Pulmonology', 'Delhi', '9876543215'],
                ['Dr. Ravi Verma', 'Neurology', 'Chennai', '9876543216'],
                ['Dr. Kavita Jain', 'General Medicine', 'Pune', '9876543217']
            ];

            // Check if doctors already exist
            db.get("SELECT COUNT(*) as count FROM doctors", (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (row.count === 0) {
                    // Insert sample doctors
                    const stmt = db.prepare("INSERT INTO doctors (name, specialization, location, phone) VALUES (?, ?, ?, ?)");
                    sampleDoctors.forEach(doctor => {
                        stmt.run(doctor);
                    });
                    stmt.finalize();
                    console.log("✅ Database initialized with sample doctors");
                }
                
                resolve();
            });
        });
    });
};

module.exports = { db, initializeDatabase };