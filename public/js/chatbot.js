// chatbot.js — handles frontend chatbot UI + backend communication

const chatWindow = document.getElementById('chatWindow');
const chatForm = document.getElementById('chatForm');
const symptomInput = document.getElementById('symptomInput');

// Function to add a message to chat window
function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', `${sender}-message`);

    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    avatar.innerHTML = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';

    const content = document.createElement('div');
    content.classList.add('message-content');
    content.innerHTML = `<p>${text}</p>`;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    chatWindow.appendChild(messageDiv);

    // Scroll to bottom
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Handle form submit
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userText = symptomInput.value.trim();
    if (!userText) return;

    // Show user message
    addMessage('user', userText);
    symptomInput.value = '';

    // Show typing indicator
    const typing = document.createElement('div');
    typing.classList.add('chat-message', 'bot-message');
    typing.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content"><p>Soch raha hoon... 🤔</p></div>`;
    chatWindow.appendChild(typing);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        // Send API request
        const res = await fetch('/chatbot/api/symptoms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symptoms: userText })
        });

        const data = await res.json();
        chatWindow.removeChild(typing); // remove typing indicator

        if (data.error) {
            addMessage('bot', `⚠️ ${data.error}`);
            return;
        }

        // Show Hinglish response
        addMessage('bot', `🩺 ${data.message}`);
        addMessage('bot', `<i>${data.explain}</i>`);

        // Show available doctors (if any)
        if (data.doctors && data.doctors.length > 0) {
            let doctorList = '<b>Available Doctors:</b><ul>';
            data.doctors.forEach(d => {
                doctorList += `<li>${d.name} (${d.specialization}) — ${d.location} 📞 ${d.phone}</li>`;
            });
            doctorList += '</ul>';
            addMessage('bot', doctorList);
        } else {
            addMessage('bot', '😕 Koi available doctor nahi mila abhi. Thoda baad me try karna.');
        }

    } catch (err) {
        console.error(err);
        chatWindow.removeChild(typing);
        addMessage('bot', '❌ Sorry, server se baat nahi ho paayi. Thoda der baad try karo.');
    }
});
