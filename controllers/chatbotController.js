// Simple rule-based symptom to specialization mapping
const symptomSpecializationMap = {
    // General Medicine
    'fever': ['General Medicine'],
    'headache': ['General Medicine', 'Neurology'],
    'cold': ['General Medicine'],
    'flu': ['General Medicine'],
    'body pain': ['General Medicine'],
    'weakness': ['General Medicine'],
    'fatigue': ['General Medicine'],
    
    // Cardiology
    'chest pain': ['Cardiology'],
    'heart pain': ['Cardiology'],
    'breathing problem': ['Cardiology', 'Pulmonology'],
    'shortness of breath': ['Cardiology', 'Pulmonology'],
    'palpitations': ['Cardiology'],
    
    // Dermatology
    'skin rash': ['Dermatology'],
    'skin problem': ['Dermatology'],
    'acne': ['Dermatology'],
    'hair fall': ['Dermatology'],
    'skin allergy': ['Dermatology'],
    
    // Orthopedics
    'bone pain': ['Orthopedics'],
    'joint pain': ['Orthopedics'],
    'back pain': ['Orthopedics'],
    'knee pain': ['Orthopedics'],
    'shoulder pain': ['Orthopedics'],
    'fracture': ['Orthopedics'],
    
    // Pulmonology
    'cough': ['Pulmonology', 'General Medicine'],
    'asthma': ['Pulmonology'],
    'breathing difficulty': ['Pulmonology'],
    
    // Neurology
    'dizziness': ['Neurology', 'General Medicine'],
    'migraine': ['Neurology'],
    'seizure': ['Neurology'],
    'memory loss': ['Neurology'],
    
    // Pediatrics (for children-related symptoms)
    'child fever': ['Pediatrics'],
    'vaccination': ['Pediatrics'],
    'growth problem': ['Pediatrics']
};

// Show chatbot page
const showChatbot = (req, res) => {
    res.render('pages/chatbot');
};

// Process symptoms and suggest specialization
const procesSymptoms = (req, res) => {
    const { symptoms } = req.body;
    
    if (!symptoms || symptoms.trim() === '') {
        return res.json({ 
            error: 'Please enter your symptoms',
            suggestions: []
        });
    }

    // Convert symptoms to lowercase and find matches
    const userSymptoms = symptoms.toLowerCase();
    const matchedSpecializations = new Set();
    
    // Check each keyword in symptom map
    Object.keys(symptomSpecializationMap).forEach(keyword => {
        if (userSymptoms.includes(keyword)) {
            symptomSpecializationMap[keyword].forEach(spec => 
                matchedSpecializations.add(spec)
            );
        }
    });

    // Convert Set to Array
    const suggestions = Array.from(matchedSpecializations);

    // If no specific match, suggest General Medicine
    if (suggestions.length === 0) {
        suggestions.push('General Medicine');
    }

    // Get doctors for suggested specializations
    const placeholders = suggestions.map(() => '?').join(',');
    const query = `SELECT * FROM doctors WHERE specialization IN (${placeholders}) AND available = 1 ORDER BY specialization, name`;
    
    db.all(query, suggestions, (err, doctors) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({
            symptoms: symptoms,
            suggestions: suggestions,
            recommendedDoctors: doctors,
            message: suggestions.length === 1 
                ? `Based on your symptoms, I recommend consulting a ${suggestions[0]} specialist.`
                : `Based on your symptoms, you may need to consult: ${suggestions.join(' or ')} specialist.`
        });
    });
};

module.exports = {
    showChatbot,
    procesSymptoms
};