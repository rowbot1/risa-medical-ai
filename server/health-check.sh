#!/bin/bash

# RISA Medical Server Health Check

echo "=== RISA Medical Server Health Check ==="
echo "Time: $(date)"
echo

# Check backend
echo "Backend Server (port 5001):"
if lsof -i :5001 > /dev/null 2>&1; then
    echo "✓ Process is running"
    # Try to make a health request
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/health 2>/dev/null | grep -q "200\|404"; then
        echo "✓ Server is responding"
    else
        echo "✗ Server not responding to requests"
    fi
else
    echo "✗ No process on port 5001"
fi

echo
echo "Frontend Server (port 8080):"
if lsof -i :8080 > /dev/null 2>&1; then
    echo "✓ Process is running"
    # Try to make a request
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null | grep -q "200\|404"; then
        echo "✓ Server is responding"
    else
        echo "✗ Server not responding to requests"
    fi
else
    echo "✗ No process on port 8080"
fi

echo
echo "Monitor Status:"
if pgrep -f "monitor-servers.sh" > /dev/null; then
    echo "✓ Monitor script is running"
else
    echo "✗ Monitor script is not running"
fi

# Check if screen session exists
if screen -ls | grep -q "risa-monitor"; then
    echo "✓ Screen session 'risa-monitor' exists"
fi

echo
echo "Recent monitor logs:"
if [ -f "/Users/row/Downloads/_ORGANIZED/Projects/WebApps/risa/server/monitor.log" ]; then
    tail -n 10 /Users/row/Downloads/_ORGANIZED/Projects/WebApps/risa/server/monitor.log
else
    echo "No monitor log found"
fi