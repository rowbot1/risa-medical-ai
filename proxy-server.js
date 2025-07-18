// Development proxy server to handle cross-origin cookie issues
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 8080;
const API_URL = 'http://localhost:5001';

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    cookieDomainRewrite: {
        '*': 'localhost' // Rewrite all cookie domains to localhost
    },
    onProxyReq: (proxyReq, req, res) => {
        // Log the request for debugging
        console.log(`Proxying ${req.method} ${req.url} to ${API_URL}${req.url}`);
        
        // Forward cookies from the client to backend
        if (req.headers.cookie) {
            proxyReq.setHeader('cookie', req.headers.cookie);
        }
    },
    onProxyRes: (proxyRes, req, res) => {
        // Ensure cookies work properly
        const cookies = proxyRes.headers['set-cookie'];
        if (cookies) {
            console.log('Original cookies:', cookies);
            proxyRes.headers['set-cookie'] = cookies.map(cookie => {
                // Parse and modify cookie attributes for proxy compatibility
                let modifiedCookie = cookie
                    .replace(/Domain=localhost:5001/gi, 'Domain=localhost')
                    .replace(/Domain=localhost/gi, '') // Remove domain to use default (current domain)
                    .replace(/SameSite=None/gi, 'SameSite=Lax')
                    .replace(/Secure;?/gi, ''); // Remove Secure flag for HTTP development
                
                console.log('Modified cookie:', modifiedCookie);
                return modifiedCookie;
            });
        }
    }
}));

// Serve static files
app.use(express.static('.', {
    extensions: ['html', 'css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg']
}));

// Serve specific HTML files
app.get('/*.html', (req, res) => {
    const filePath = path.join(__dirname, req.path);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('File not found:', req.path);
            res.status(404).send('Page not found');
        }
    });
});

// Fallback to index.html only for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Development server running on http://localhost:${PORT}`);
    console.log(`Proxying API requests to ${API_URL}`);
});
