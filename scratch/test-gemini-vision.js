const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Parse .env.local manually
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val.trim();
  }
});

const geminiApiKey = env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error('Error: GEMINI_API_KEY is not defined in .env.local');
  process.exit(1);
}

// 1x1 transparent pixel base64 image
const dummyBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Clean base64 extract logic
let mediaType = 'image/jpeg'
let base64Data = dummyBase64Image
if (dummyBase64Image.startsWith('data:')) {
  const match = dummyBase64Image.match(/^data:([^;]+);base64,(.+)$/)
  if (match) {
    mediaType = match[1]
    base64Data = match[2]
  }
}

const promptText = `
You are ScanSafe ULTRA, an advanced product intelligence scanner, food scientist, and toxicology expert.
Analyze the provided image of a food product. Reconstruct and estimate the ingredients list, nutrition facts, additives, allergens, and overall health index. 

You must return a single JSON object. Ensure it matches the JSON specification below:
{
  "product_name": "Test Product",
  "brand": "Test Brand",
  "health_score": 85,
  "safety_level": "safe",
  "description": "Safe test description",
  "ingredients": [
    {
      "name": "Water",
      "status": "safe",
      "reason": "Safe hydration"
    }
  ],
  "additives": [],
  "allergens": [],
  "nutrition_facts": {
    "serving_size": "100g",
    "calories": 100,
    "calories_100g": 100,
    "fat": "0g",
    "fat_100g": "0g",
    "saturated_fat": "0g",
    "saturated_fat_100g": "0g",
    "trans_fat": "0g",
    "trans_fat_100g": "0g",
    "cholesterol": "0mg",
    "cholesterol_100g": "0mg",
    "sodium": "0mg",
    "sodium_100g": "0mg",
    "carbs": "0g",
    "carbs_100g": "0g",
    "fiber": "0g",
    "fiber_100g": "0g",
    "sugar": "0g",
    "sugar_100g": "0g",
    "protein": "0g",
    "protein_100g": "0g"
  },
  "recommendations": [],
  "alternatives_detailed": [],
  "upf_score": 1,
  "microplastics_risk": "low",
  "microplastics_reason": "none",
  "sustainability_grade": "A",
  "sustainability_reason": "none",
  "glycemic_index_estimate": "low",
  "glycemic_reason": "none",
  "health_risk_breakdown": {
    "heart": "low",
    "diabetes": "low",
    "inflammation": "low",
    "gut_health": "low"
  }
}

Do NOT wrap the response in markdown formatting (like \`\`\`json). Return only the raw JSON string.
`;

async function testGeminiVision() {
  console.log('Sending request to Gemini API...');
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`,
      {
        contents: [
          {
            parts: [
              { inlineData: { mimeType: mediaType, data: base64Data } },
              { text: promptText }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      },
      { headers: { 'content-type': 'application/json' } }
    );

    const candidate = response.data?.candidates?.[0];
    const responseText = candidate?.content?.parts?.[0]?.text?.trim();
    console.log('API Status: Success!');
    console.log('Response text:', responseText);
  } catch (err) {
    console.error('API Error:', err.response?.data || err.message);
  }
}

testGeminiVision();
