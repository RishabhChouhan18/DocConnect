// services/deepseek.js
const DS_URL = "https://api.deepseek.com/chat/completions";

async function dsChat(messages, { model = process.env.DEEPSEEK_MODEL || "deepseek-chat", temperature = 0.2 } = {}) {
  const res = await fetch(DS_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, messages, temperature })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${JSON.stringify(data)}`);
  return data.choices?.[0]?.message?.content ?? "";
}

async function classifyIntent(userText) {
  const system = `You are a medical triage helper for India. Return STRICT JSON:
{ "intent": "triage"|"find_doctor"|"other",
  "symptoms": string[],
  "disease": string|null,
  "location": string|null,
  "specialty_hint": string|null }
No extra text. Never provide medical advice.`;

  const raw = await dsChat([
    { role: "system", content: system },
    { role: "user", content: userText }
  ]);

  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  const json = s >= 0 ? raw.slice(s, e + 1) : "{}";

  try { return JSON.parse(json); } catch { return { intent: "other" }; }
}

module.exports = { dsChat, classifyIntent };
