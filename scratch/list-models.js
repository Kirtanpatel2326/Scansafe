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
    env[key] = val.trim();
  }
});

const geminiApiKey = env.GEMINI_API_KEY;

async function listModels() {
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`
    );
    console.log('Available Models:');
    response.data.models.forEach(model => {
      console.log(`- ${model.name} (${model.displayName})`);
    });
  } catch (err) {
    console.error('Error listing models:', err.response?.data || err.message);
  }
}

listModels();
