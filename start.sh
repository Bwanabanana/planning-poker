#!/bin/sh

# Planning Poker Application Startup Script
echo "Starting Planning Poker Application..."

# Function to handle shutdown gracefully
shutdown() {
    echo "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    nginx -s quit
    exit 0
}

# Trap SIGTERM and SIGINT for graceful shutdown
trap shutdown SIGTERM SIGINT

# Start Node.js backend in background
echo "Starting Node.js backend on port 3001..."
cd /app/backend
NODE_ENV=production PORT=3001 node dist/index.js > /var/log/planning-poker/backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "ERROR: Backend failed to start"
    cat /var/log/planning-poker/backend.log
    exit 1
fi

echo "Backend started successfully (PID: $BACKEND_PID)"

# Start Nginx in foreground
echo "Starting Nginx on port 80..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# Wait for either process to exit
wait $NGINX_PID $BACKEND_PID