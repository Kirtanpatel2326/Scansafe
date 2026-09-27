const { UniversalEdgeTTS } = require('edge-tts-universal');
const fs = require('fs');

async function test() {
  try {
    const tts = new UniversalEdgeTTS('नमस्ते, आप कैसे हैं?');
    tts.voice = 'hi-IN-SwaraNeural';
    console.log('Calling synthesize...');
    const result = await tts.synthesize();
    const arrayBuffer = await result.audio.arrayBuffer();
    fs.writeFileSync('scratch/test_voice_universal.mp3', Buffer.from(arrayBuffer));
    console.log('Success! Saved to scratch/test_voice_universal.mp3, size:', arrayBuffer.byteLength);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
