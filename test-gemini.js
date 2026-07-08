const axios = require('axios');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function test() {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: "Return a JSON object with { \"hello\": \"world\" }." }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      },
      { headers: { 'content-type': 'application/json' } }
    );
    console.log("SUCCESS:", JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("ERROR:", err.response ? err.response.data : err.message);
  }
}

test();
