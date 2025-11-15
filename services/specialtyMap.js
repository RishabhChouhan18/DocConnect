// services/specialtyMap.js
function ruleSuggestSpecialization(text) {
  const t = (text || "").toLowerCase();

  const MAP = [
    { keys: ["chest pain","shortness of breath","palpitations","bp"], value: "Cardiology" },
    { keys: ["fever","cough","cold","throat","flu"],                   value: "General Medicine" },
    { keys: ["skin","rash","acne","itch","eczema"],                    value: "Dermatology" },
    { keys: ["child","kids","pediatric","baby","infant"],              value: "Pediatrics" },
    { keys: ["bone","fracture","knee","back pain","sprain"],           value: "Orthopedics" },
    { keys: ["breathless","asthma","lung","wheezing"],                 value: "Pulmonology" },
    { keys: ["headache","migraine","seizure","numbness","stroke"],     value: "Neurology" }
  ];

  for (const row of MAP) {
    if (row.keys.some(k => t.includes(k))) return row.value;
  }
  return null;
}

module.exports = { ruleSuggestSpecialization };
