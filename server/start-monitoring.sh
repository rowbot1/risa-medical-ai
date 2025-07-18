#!/bin/bash

# RISA Medical Server Monitoring Launcher
# This script launches the monitor in a screen session for persistence

SCRIPT_DIR="/Users/row/Downloads/_ORGANIZED/Projects/WebApps/risa/server"
MONITOR_SCRIPT="$SCRIPT_DIR/monitor-servers.sh"
SCREEN_NAME="risa-monitor"

# Function to check if screen is installed
check_screen() {
    if ! command -v screen &> /dev/null; then
        echo "Screen is not installed. Using nohup instead."
        return 1
    fi
    return 0
}

# Function to stop existing monitor
stop_monitor() {
    # Kill existing screen session
    screen -S "$SCREEN_NAME" -X quit 2>/dev/null
    
    # Kill any existing monitor script
    pkill -f "monitor-servers.sh" 2>/dev/null
    
    # Kill servers on ports
    lsof -ti :5001 | xargs kill -9 2>/dev/null
    lsof -ti :8080 | xargs kill -9 2>/dev/null
    
    echo "Stopped existing monitors and servers"
    sleep 2
}

# Function to start monitor with screen
start_with_screen() {
    echo "Starting monitor in screen session: $SCREEN_NAME"
    screen -dmS "$SCREEN_NAME" "$MONITOR_SCRIPT"
    echo "Monitor started in background"
    echo "To view monitor: screen -r $SCREEN_NAME"
    echo "To detach: Ctrl+A then D"
}

# Function to start monitor with nohup
start_with_nohup() {
    echo "Starting monitor with nohup"
    nohup "$MONITOR_SCRIPT" > "$SCRIPT_DIR/monitor-nohup.log" 2>&1 &
    echo $! > "$SCRIPT_DIR/monitor.pid"
    echo "Monitor started in background (PID: $(cat $SCRIPT_DIR/monitor.pid))"
}

# Main execution
echo "=== RISA Medical Server Monitoring System ==="
echo

# Stop any existing monitors
stop_monitor

# Start the monitor
if check_screen; then
    start_with_screen
else
    start_with_nohup
fi

echo
echo "Monitor is now running and will keep servers alive"
echo "Check logs at: $SCRIPT_DIR/monitor.log"
echo
echo "Server status:"
sleep 10  # Give servers time to start

# Check final status
echo -n "Backend (port 5001): "
lsof -i :5001 > /dev/null 2>&1 && echo "RUNNING" || echo "NOT RUNNING"

echo -n "Frontend (port 8080): "
lsof -i :8080 > /dev/null 2>&1 && echo "RUNNING" || echo "NOT RUNNING"

echo
echo "Monitor will check servers every 30 seconds and restart them if needed"