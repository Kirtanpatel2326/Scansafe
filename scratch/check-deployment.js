const https = require('https');

function getUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function check() {
  console.log('Fetching auth page...');
  const { status, data } = await getUrl('https://scansafe-o31d.vercel.app/auth');
  console.log('Status code:', status);
  
  // Find all JS script tags
  const scriptRegex = /src="(\/_next\/static\/chunks\/[^"]+\.js)"/g;
  let match;
  const scriptUrls = [];
  while ((match = scriptRegex.exec(data)) !== null) {
    scriptUrls.push('https://scansafe-o31d.vercel.app' + match[1]);
  }
  
  console.log('Found JS bundles:', scriptUrls.length);
  
  let foundDebug = false;
  for (const url of scriptUrls) {
    console.log('Checking bundle:', url);
    const { data: jsData } = await getUrl(url);
    if (jsData.includes('Debug Info') || jsData.includes('Configuration Error on Vercel')) {
      console.log('=== SUCCESS: FOUND LATEST BUILD ===');
      foundDebug = true;
      break;
    }
  }
  
  if (!foundDebug) {
    console.log('=== WARNING: LATEST DEPLOYMENT IS NOT ACTIVE ON VERCEL ===');
    console.log('Vercel is still serving an old build of your application.');
  }
}

check().catch(console.error);
