const https = require('https');

https.get('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyCqNoUQxfyvVW3pFkBSeKcE5oaJkN6mQ8E', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const models = JSON.parse(data).models;
    models.forEach(m => console.log(m.name));
  });
});
