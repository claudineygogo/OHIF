const http = require('http');
const url = require('url');

const ORTHANC_HOST = 'localhost';
const ORTHANC_PORT = 8042;
const PROXY_PORT = 8043;

const server = http.createServer((clientReq, clientRes) => {
  const parsedUrl = url.parse(clientReq.url);

  // Handle preflight OPTIONS requests
  if (clientReq.method === 'OPTIONS') {
    clientRes.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    });
    clientRes.end();
    return;
  }

  // Proxy the request to Orthanc
  const options = {
    hostname: ORTHANC_HOST,
    port: ORTHANC_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: clientReq.headers,
  };

  const proxyReq = http.request(options, proxyRes => {
    // Add CORS headers to the response
    const headers = {
      ...proxyRes.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Expose-Headers': 'Content-Type, Content-Length',
    };

    clientRes.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(clientRes);
  });

  proxyReq.on('error', err => {
    console.error('Proxy request error:', err);
    clientRes.writeHead(500, {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*',
    });
    clientRes.end('Proxy error: ' + err.message);
  });

  // Pipe the client request to the proxy request
  clientReq.pipe(proxyReq);
});

server.listen(PROXY_PORT, () => {
  console.log(`\n========================================`);
  console.log(`CORS Proxy Server for Orthanc`);
  console.log(`========================================`);
  console.log(`Proxy running on: http://localhost:${PROXY_PORT}`);
  console.log(`Forwarding to:    http://localhost:${ORTHANC_PORT}`);
  console.log(`\nUpdate your OHIF configuration to use:`);
  console.log(`  qidoRoot: 'http://localhost:${PROXY_PORT}/dicom-web'`);
  console.log(`  wadoRoot: 'http://localhost:${PROXY_PORT}/dicom-web'`);
  console.log(`========================================\n`);
});
