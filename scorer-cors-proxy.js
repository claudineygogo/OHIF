const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 5001; // Proxy will run on 5001, forward to Flask on 5000

// CORS middleware - allow all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Proxy all requests to Flask backend
app.use(
  '/',
  createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
    logLevel: 'info',
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[Proxy] ${req.method} ${req.url} -> http://localhost:5002${req.url}`);
    },
    onError: (err, req, res) => {
      console.error('[Proxy Error]', err);
      res.status(500).json({ error: 'Proxy error', details: err.message });
    },
  })
);

app.listen(PORT, () => {
  console.log('========================================');
  console.log('CORS Proxy Server for Python Scorer');
  console.log('========================================');
  console.log(`Proxy running on: http://localhost:${PORT}`);
  console.log('Forwarding to:    http://localhost:5002');
  console.log('');
  console.log('Update your OHIF configuration to use:');
  console.log(`  http://localhost:${PORT}/grade_submission`);
  console.log('========================================');
});
