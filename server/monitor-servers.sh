#!/bin/bash

# RISA Medical Server Monitor
# This script monitors and maintains both backend and frontend servers

# Configuration
BACKEND_PORT=5001
FRONTEND_PORT=8080
BACKEND_DIR="/Users/row/Downloads/_ORGANIZED/Projects/WebApps/risa/server"
FRONTEND_DIR="/Users/row/Downloads/_ORGANIZED/Projects/WebApps/risa"
LOG_FILE="/Users/row/Downloads/_ORGANIZED/Projects/WebApps/risa/server/monitor.log"
CHECK_INTERVAL=30

# Create log file if it doesn't exist
touch "$LOG_FILE"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if a port is in use
is_port_in_use() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        log_message "Killing processes on port $port: $pids"
        kill -9 $pids 2>/dev/null
        sleep 2
    fi
}

# Function to start backend server
start_backend() {
    log_message "Starting backend server..."
    cd "$BACKEND_DIR"
    
    # Kill any existing processes on the port
    kill_port $BACKEND_PORT
    
    # Start the server in background with nohup
    nohup npm start > backend.log 2>&1 &
    local pid=$!
    
    # Wait a moment for server to start
    sleep 5
    
    # Check if server started successfully
    if is_port_in_use $BACKEND_PORT; then
        log_message "Backend server started successfully (PID: $pid)"
        echo $pid > backend.pid
        return 0
    else
        log_message "ERROR: Backend server failed to start"
        return 1
    fi
}

# Function to start frontend server
start_frontend() {
    log_message "Starting frontend server..."
    cd "$FRONTEND_DIR"
    
    # Kill any existing processes on the port
    kill_port $FRONTEND_PORT
    
    # Start the server in background with nohup
    nohup npm run dev > frontend.log 2>&1 &
    local pid=$!
    
    # Wait a moment for server to start
    sleep 5
    
    # Check if server started successfully
    if is_port_in_use $FRONTEND_PORT; then
        log_message "Frontend server started successfully (PID: $pid)"
        echo $pid > frontend.pid
        return 0
    else
        log_message "ERROR: Frontend server failed to start"
        return 1
    fi
}

# Function to check and restart servers if needed
check_and_restart_servers() {
    # Check backend server
    if ! is_port_in_use $BACKEND_PORT; then
        log_message "Backend server is down. Restarting..."
        start_backend
    fi
    
    # Check frontend server
    if ! is_port_in_use $FRONTEND_PORT; then
        log_message "Frontend server is down. Restarting..."
        start_frontend
    fi
}

# Main monitoring loop
main() {
    log_message "=== RISA Medical Server Monitor Started ==="
    log_message "Monitoring Backend (port $BACKEND_PORT) and Frontend (port $FRONTEND_PORT)"
    log_message "Check interval: $CHECK_INTERVAL seconds"
    
    # Initial server start
    check_and_restart_servers
    
    # Continuous monitoring loop
    while true; do
        sleep $CHECK_INTERVAL
        check_and_restart_servers
    done
}

# Handle script termination
cleanup() {
    log_message "Monitor script terminated. Servers will continue running."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start monitoring
main