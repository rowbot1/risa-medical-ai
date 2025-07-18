const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const API_TARGET = 'http://localhost:5001';

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;
    
    // Proxy API requests (only /api/ paths, not /api.js)
    if (pathname.startsWith('/api/')) {
        console.log(`Proxying ${req.method} ${pathname} to backend`);
        
        const options = {
            hostname: 'localhost',
            port: 5001,
            path: pathname + (parsedUrl.search || ''),
            method: req.method,
            headers: {
                ...req.headers,
                host: 'localhost:5001'
            }
        };
        
        const proxyReq = http.request(options, (proxyRes) => {
            // Forward status and headers
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            // Pipe the response
            proxyRes.pipe(res);
        });
        
        proxyReq.on('error', (err) => {
            console.error('Proxy error:', err);
            res.writeHead(502);
            res.end('Bad Gateway');
        });
        
        // Pipe the request body
        req.pipe(proxyReq);
        return;
    }
    
    // Serve static files
    let filePath = '.' + pathname;
    if (filePath === './') {
        filePath = './index.html';
    }
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Try adding .html extension
                fs.readFile(filePath + '.html', (error2, content2) => {
                    if (error2) {
                        res.writeHead(404);
                        res.end('Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content2, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Development server running at http://localhost:${PORT}/`);
    console.log(`API requests will be proxied to ${API_TARGET}`);
});