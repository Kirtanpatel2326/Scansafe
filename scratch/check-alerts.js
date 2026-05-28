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
  
  const scriptRegex = /src="(\/_next\/static\/chunks\/[^"]+\.js)"/g;
  let match;
  const scriptUrls = [];
  while ((match = scriptRegex.exec(data)) !== null) {
    scriptUrls.push('https://scansafe-o31d.vercel.app' + match[1]);
  }
  
  console.log('Found JS bundles:', scriptUrls.length);
  
  let foundDebugAlert = false;
  for (const url of scriptUrls) {
    const { data: jsData } = await getUrl(url);
    if (jsData.includes('Debug Info') || jsData.includes('alert(')) {
      foundDebugAlert = true;
      console.log('Found old debug alert in:', url);
    }
  }
  
  if (foundDebugAlert) {
    console.log('=== Vercel is still serving the OLD build (with alerts) ===');
  } else {
    console.log('=== Vercel is serving the NEW build (alerts removed) ===');
  }
}

check().catch(console.error);
