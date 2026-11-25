require('dotenv').config();
const { spawn } = require('child_process');
const http = require('http');

const PORT = process.env.PORT;
if (!PORT) {
  console.error('PORT environment variable is required');
  process.exit(1);
}

const server = spawn('node', ['server.js'], { stdio: 'inherit' });

function checkReady(attempts = 0) {
  if (attempts > 30) {
    console.error('Server failed to start in time');
    server.kill();
    process.exit(1);
  }
  const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
    if (res.statusCode === 200) {
      console.log('Server is healthy! Launching tests...');
      const tester = spawn('node', ['test_e2e.js'], { stdio: 'inherit' });
      tester.on('exit', (code) => {
        server.kill();
        process.exit(code);
      });
    } else {
      setTimeout(() => checkReady(attempts + 1), 1000);
    }
  });
  req.on('error', () => {
    setTimeout(() => checkReady(attempts + 1), 1000);
  });
}

setTimeout(() => checkReady(), 1500);
