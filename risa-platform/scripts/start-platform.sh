#!/bin/bash

echo "🚀 Starting Risa Medical Enhanced Platform with Twenty CRM Integration"
echo "===================================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|302"; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to start after $max_attempts attempts"
    return 1
}

# Navigate to the platform directory
cd "$(dirname "$0")/.." || exit 1

# Start existing Risa Medical backend
echo ""
echo "1️⃣  Starting Risa Medical Backend..."
cd ../server
npm start &
RISA_PID=$!
cd ../risa-platform

# Wait for Risa Medical backend
wait_for_service "Risa Medical Backend" "http://localhost:5001/api/health"

# Start the Docker services
echo ""
echo "2️⃣  Starting Twenty CRM and Integration Services..."
cd docker
docker-compose up -d

# Wait for services to be ready
wait_for_service "Twenty CRM" "http://localhost:3000"
wait_for_service "Integration Service" "http://localhost:4000/health"

# Start the frontend proxy
echo ""
echo "3️⃣  Starting Frontend Proxy Server..."
cd ../..
npm start &
PROXY_PID=$!

# Wait for frontend
wait_for_service "Frontend" "http://localhost:8080"

echo ""
echo "✅ All services are running!"
echo ""
echo "🌐 Access Points:"
echo "   - Risa Medical Frontend: http://localhost:8080"
echo "   - Twenty CRM: http://localhost:3002"
echo "   - Integration Dashboard: http://localhost:4000"
echo "   - Risa Medical API: http://localhost:5001"
echo ""
echo "📊 Service Status:"
echo "   - Risa Medical Backend (PID: $RISA_PID)"
echo "   - Frontend Proxy (PID: $PROXY_PID)"
echo "   - Docker Services: Use 'docker-compose ps' to check"
echo ""
echo "🛑 To stop all services, press Ctrl+C"

# Wait for user to stop
wait

# Cleanup
echo ""
echo "Stopping services..."
kill $RISA_PID $PROXY_PID 2>/dev/null
cd risa-platform/docker
docker-compose down
echo "✅ All services stopped"
