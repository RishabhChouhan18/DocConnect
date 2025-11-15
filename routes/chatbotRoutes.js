// const express = require('express');
// const router = express.Router();
// const {
//     showChatbot,
//     procesSymptoms
// } = require('../controllers/chatbotController');

// // Chatbot routes
// router.get('/', showChatbot);
// router.post('/api/analyze-symptoms', procesSymptoms);

// module.exports = router;



const express = require('express');
const router = express.Router();
const { showChatbot, processSymptoms } = require('../controllers/chatbotController');

router.get('/', showChatbot);
router.post('/api/symptoms', processSymptoms);

module.exports = router;
