# Running RISA Medical Servers

## Quick Start

To run both frontend and backend servers:

```bash
./start-servers.sh
```

This will start:
- Backend server on http://localhost:5001
- Frontend proxy server on http://localhost:8080

## Manual Start

### Backend Server
```bash
cd server
npm start
```

### Frontend Server
```bash
npm run dev
```

## Using PM2 (Recommended for stability)

First, install PM2 globally:
```bash
npm install -g pm2
```

Then start both servers:
```bash
pm2 start ecosystem.config.js
```

Monitor servers:
```bash
pm2 status
pm2 logs
```

Stop servers:
```bash
pm2 stop all
```

## Troubleshooting

If servers crash frequently:
1. Check if ports 5001 and 8080 are available
2. Ensure all dependencies are installed
3. Check logs in terminal or PM2 logs
4. Restart with: `./start-servers.sh`