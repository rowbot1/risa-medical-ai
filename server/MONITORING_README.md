# RISA Medical Server Monitoring System

This monitoring system ensures that both the backend (port 5001) and frontend (port 8080) servers stay running continuously.

## Quick Start

Start the monitoring system:
```bash
./risa-service.sh start
```

Check status:
```bash
./risa-service.sh status
```

## Available Scripts

### Main Service Control
- `risa-service.sh` - Main service management script
  - `start` - Start all servers and monitoring
  - `stop` - Stop all servers and monitoring  
  - `restart` - Restart all services
  - `status` - Show current status
  - `logs` - Follow monitor logs (Ctrl+C to exit)
  - `attach` - Attach to monitor screen session (Ctrl+A then D to detach)

### Individual Scripts
- `monitor-servers.sh` - Core monitoring script (runs continuously)
- `start-monitoring.sh` - Starts the monitor in a screen session
- `health-check.sh` - Quick health status check
- `monitor-resources.sh` - Show CPU/memory usage

## How It Works

1. The monitor script runs in a screen session named `risa-monitor`
2. Every 30 seconds, it checks if both servers are running
3. If a server is down, it automatically restarts it
4. All activities are logged to `monitor.log`

## Log Files

- `monitor.log` - Main monitoring activities
- `backend.log` - Backend server output
- `frontend.log` - Frontend server output
- `monitor-nohup.log` - Monitor script output (if using nohup)

## Troubleshooting

If servers aren't starting:
1. Check the logs: `./risa-service.sh logs`
2. Verify ports aren't already in use: `lsof -i :5001` and `lsof -i :8080`
3. Ensure npm dependencies are installed in both directories
4. Check file permissions

To manually restart everything:
```bash
./risa-service.sh restart
```

## Process Management

The monitor runs in a screen session for persistence. To interact with it:
- View: `screen -r risa-monitor`
- Detach: Press Ctrl+A then D
- List sessions: `screen -ls`

The monitor will continue running even if you disconnect from SSH.