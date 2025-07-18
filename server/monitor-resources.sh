#!/bin/bash

# RISA Medical Resource Monitor
# Shows CPU and memory usage of the servers

echo "=== RISA Medical Server Resource Usage ==="
echo "Time: $(date)"
echo

# Function to get process info
get_process_info() {
    local port=$1
    local name=$2
    local pid=$(lsof -ti :$port 2>/dev/null | head -1)
    
    if [ ! -z "$pid" ]; then
        echo "$name (PID: $pid, Port: $port):"
        ps aux | grep "^[^ ]*  *$pid " | awk '{printf "  CPU: %s%%, Memory: %s%%, VSZ: %s, RSS: %s\n", $3, $4, $5, $6}'
    else
        echo "$name: Not running"
    fi
}

# Get backend info
get_process_info 5001 "Backend Server"
echo

# Get frontend info  
get_process_info 8080 "Frontend Server"
echo

# Get monitor script info
monitor_pid=$(pgrep -f "monitor-servers.sh" | head -1)
if [ ! -z "$monitor_pid" ]; then
    echo "Monitor Script (PID: $monitor_pid):"
    ps aux | grep "^[^ ]*  *$monitor_pid " | awk '{printf "  CPU: %s%%, Memory: %s%%\n", $3, $4}'
else
    echo "Monitor Script: Not running"
fi

echo
echo "System Load Average: $(uptime | awk -F'load averages:' '{print $2}')"
echo

# Show disk usage for log files
echo "Log File Sizes:"
ls -lh "$SCRIPT_DIR"/*.log 2>/dev/null | awk '{print "  " $9 ": " $5}'