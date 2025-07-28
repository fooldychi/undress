const http = require('http'); 
 
console.log('Starting health check...'); 
 
const options = { 
  hostname: 'localhost', 
  port: 3007, 
  path: '/api/health', 
  method: 'GET', 
  timeout: 5000 
}; 
 
const req = http.request(options, (res) => { 
  if (res.statusCode === 200) { 
    console.log('Health check passed'); 
    process.exit(0); 
  } else { 
    console.log('Health check failed:', res.statusCode); 
    process.exit(1); 
  } 
}); 
 
req.on('error', (err) => { 
  console.error('Health check error:', err.message); 
  process.exit(1); 
}); 
 
req.setTimeout(5000); 
req.end(); 
