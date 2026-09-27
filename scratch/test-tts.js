const { EdgeTTS } = require('@travisvn/edge-tts');
const fs = require('fs');

async function test() {
  try {
    console.log('Initializing EdgeTTS...');
    const tts = new EdgeTTS('परीक्षण', 'hi-IN-SwaraNeural');
    console.log('Synthesizing...');
    const result = await tts.synthesize();
    console.log('Result received. Audio size:', result.audio.size);
    const arrayBuffer = await result.audio.arrayBuffer();
    fs.writeFileSync('scratch/test_voice.mp3', Buffer.from(arrayBuffer));
    console.log('Success! Saved to scratch/test_voice.mp3');
  } catch (e) {
    console.error('Error during EdgeTTS synthesis:', e);
  }
}

test();
