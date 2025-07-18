const http = require('http');
const httpProxy = require('http-proxy-middleware');
const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// Create proxy middleware for API requests
const apiProxy = httpProxy.createProxyMiddleware('/api', {
    target: 'http://localhost:5001',
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying ${req.method} ${req.url} to backend`);
    },
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Proxy error', message: err.message });
    }
});

// Use proxy for all /api routes
app.use('/api', apiProxy);

// Serve static files for everything else
app.use(express.static(path.join(__dirname)));

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log(`- Serving static files from: ${__dirname}`);
    console.log(`- Proxying /api/* requests to: http://localhost:5001`);
});