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

const geminiKey = env.GEMINI_API_KEY;
const claudeKey = env.ANTHROPIC_API_KEY;

console.log('Testing Google Gemini Key:', geminiKey ? 'Present' : 'Missing');
console.log('Testing Anthropic Claude Key:', claudeKey ? 'Present' : 'Missing');

async function testGemini() {
  if (!geminiKey) return;
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      { contents: [{ parts: [{ text: "Hello! Respond with the single word: working." }] }] },
      { headers: { 'content-type': 'application/json' } }
    );
    console.log('Gemini Status: Success!', res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
  } catch (err) {
    console.error('Gemini Error:', err.response?.data || err.message);
  }
}

async function testClaude() {
  if (!claudeKey) return;
  try {
    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: "Hello! Respond with the single word: working." }]
      },
      {
        headers: {
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        }
      }
    );
    console.log('Claude Status: Success!', res.data.content[0].text.trim());
  } catch (err) {
    console.error('Claude Error:', err.response?.data || err.message);
  }
}

async function run() {
  await testGemini();
  await testClaude();
}

run();
