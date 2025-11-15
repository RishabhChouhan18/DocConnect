✅ DOCCONNECT – Telemedicine & Appointment Booking Platform

A Full Stack Node.js + Express + EJS + SQLite Project

DocConnect is a telemedicine and smart appointment booking platform that allows patients to book appointments with doctors, chat using an AI medical assistant, and manage healthcare interactions online.

🚀 Features
👨‍⚕️ For Patients

Register/Login

Book doctor appointments

View upcoming appointments

Access doctor list

Smart medical AI chatbot (DeepSeek / OpenAI)

Live notifications  Socket.io

🩺 For Doctors

Login Dashboard

View appointments

Manage patient status

Notification system

Profile specialization mapping

🤖 AI Medical Chatbot

Ask health-related questions

Uses DeepSeek/OpenAI-like API

Secure & .env managed API Key

🔐 Authentication

Secure auth using JWT

Middleware-protected doctor/patient routes

🗃️ Database

SQLite-based lightweight DB

Works on ALL laptops without setup

📁 Project Structure
DocConnect/
│── controllers/
│── middleware/
│── models/
│── public/
│── routes/
│── services/
│── views/
│── server.js
│── package.json
│── .gitignore
│── docconnect.db   

🔧 Tech Stack
Tech	Used For
Node.js + Express	Backend REST routes
EJS	Frontend templating
SQLite3	Lightweight database
Socket.io	Real-time notifications
JWT	Authentication
DeepSeek/OpenAI API	AI chatbot
CSS / JS	Styling & client logic
🛠️ Installation (For Any Laptop)

Follow these steps:

1️⃣ Clone the repo
git clone https://github.com/RishabhChouhan18/DocConnect
cd DocConnect

2️⃣ Install dependencies
npm install

3️⃣ Create a .env file

Inside the project folder:

PORT=3000
JWT_SECRET=your_secret_key
DEEPSEEK_API_KEY=your_api_key_here

4️⃣ Start the server
node server.js


or

npm start

5️⃣ Open in browser
http://localhost:3000

🗄️ Database (SQLite)

SQLite file is included as docconnect.db.

👉 No installation needed.
👉 Automatically works on any laptop.

🔐 Routes Overview
Auth Routes

/login

/signup

/logout

Patient Routes

/patient/dashboard

/patient/doctors

/patient/book/:id

/patient/appointments

Doctor Routes

/doctor/dashboard

/doctor/notifications

/doctor/appointments

Chatbot Route

/chatbot

💡 How AI Chatbot Works

Uses DeepSeek/OpenAI API:

services/deepseek.js


Controlled via:

controllers/chatbotController.js

🧩 Key Middleware
middleware/authMiddleware.js


Protects routes based on user type (doctor/patient)

🔥 Screenshots (optional)

You can upload images on GitHub:

Patient Dashboard

Doctor Dashboard

Chatbot UI

Appointment UI

👨‍💻 Author

Rishabh Chouhan
B.Tech CSE Student
Skills: MERN, Node.js, AWS, ML, SQL

📜 License

This project is free to use for academic and learning purposes.
