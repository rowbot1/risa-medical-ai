#!/bin/bash

# Start backend server
echo "Starting backend server..."
cd /Users/row/Downloads/_ORGANIZED/Projects/WebApps/risa/server
npm start &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend server
echo "Starting frontend server..."
cd /Users/row/Downloads/_ORGANIZED/Projects/WebApps/risa
npm run dev &
FRONTEND_PID=$!

echo "Servers started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Access the application at: http://localhost:8080"
echo ""
echo "To stop servers, press Ctrl+C"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait