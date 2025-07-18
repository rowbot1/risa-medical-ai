#!/bin/bash

# RISA Medical Service Management Script
# Provides start, stop, restart, and status commands

SCRIPT_DIR="/Users/row/Downloads/_ORGANIZED/Projects/WebApps/risa/server"
MONITOR_SCRIPT="$SCRIPT_DIR/monitor-servers.sh"
START_SCRIPT="$SCRIPT_DIR/start-monitoring.sh"
HEALTH_SCRIPT="$SCRIPT_DIR/health-check.sh"
SCREEN_NAME="risa-monitor"

case "$1" in
    start)
        echo "Starting RISA Medical services..."
        "$START_SCRIPT"
        ;;
        
    stop)
        echo "Stopping RISA Medical services..."
        
        # Stop monitor
        screen -S "$SCREEN_NAME" -X quit 2>/dev/null
        pkill -f "monitor-servers.sh" 2>/dev/null
        
        # Stop servers
        lsof -ti :5001 | xargs kill -9 2>/dev/null
        lsof -ti :8080 | xargs kill -9 2>/dev/null
        
        # Clean up pid files
        rm -f "$SCRIPT_DIR/backend.pid" "$SCRIPT_DIR/frontend.pid" "$SCRIPT_DIR/monitor.pid" 2>/dev/null
        
        echo "All services stopped"
        ;;
        
    restart)
        echo "Restarting RISA Medical services..."
        "$0" stop
        sleep 3
        "$0" start
        ;;
        
    status)
        "$HEALTH_SCRIPT"
        ;;
        
    logs)
        echo "=== Monitor Logs ==="
        tail -f "$SCRIPT_DIR/monitor.log"
        ;;
        
    attach)
        echo "Attaching to monitor screen session..."
        echo "Press Ctrl+A then D to detach"
        screen -r "$SCREEN_NAME"
        ;;
        
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|attach}"
        echo
        echo "Commands:"
        echo "  start   - Start all servers and monitoring"
        echo "  stop    - Stop all servers and monitoring"
        echo "  restart - Restart all services"
        echo "  status  - Show current status"
        echo "  logs    - Follow monitor logs"
        echo "  attach  - Attach to monitor screen session"
        exit 1
        ;;
esac