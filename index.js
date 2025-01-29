const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');

// Create a proxy server
const proxy = httpProxy.createProxyServer({
  secure: true,         // Ensures secure connections (SSL/TLS)
  changeOrigin: true,   // Modifies the origin header for cross-origin requests
  followRedirects: true // Automatically follows redirects to the destination
});

// Create a basic HTTP server to handle incoming requests
const server = http.createServer((req, res) => {
  // Default target URL
  let target = 'https://proxyium.com';

  // Adjust target based on the host header (subdomain logic can be expanded here)
  if (req.headers.host.includes('proxyium.com')) {
    target = 'https://' + req.headers.host;  // Dynamically set the target based on incoming request
  }

  // Log the request details for debugging purposes
  console.log(`Proxying request for ${req.url} to ${target}`);

  // Forward the request to the target (proxy the request)
  proxy.web(req, res, { target }, (err) => {
    if (err) {
      console.error('Error occurred while proxying the request:', err);

      // Enhanced error handling: respond with a generic message and log the error
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Internal Server Error occurred while processing the request');

      // Optionally log the error in a more structured way
      // Example: Log to a file or use an external logging service
    }
  });
});

// Start the proxy server
const port = 8080;
server.listen(port, () => {
  console.log(`Proxy server is running on http://localhost:${port}`);
});
