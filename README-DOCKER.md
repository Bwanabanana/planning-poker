# Planning Poker - Docker Deployment

This guide explains how to run the Planning Poker application in a single Docker container with Nginx and Node.js.

## Quick Start

### Prerequisites
- Docker installed on your system
- Docker Compose (optional, but recommended)

### Build and Run

#### Option 1: Using Docker Compose (Recommended)
```bash
# First time setup - build and start the application
docker-compose up -d

# After code changes - rebuild and restart with latest updates
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

**Important**: Use the `--build` flag whenever you make changes to the source code to ensure the Docker image includes your latest updates.

#### Option 2: Using Docker directly
```bash
# Build the image
docker build -t planning-poker .

# After code changes - rebuild the image
docker build -t planning-poker . --no-cache

# Run the container
docker run -d -p 80:80 --name planning-poker-app planning-poker

# View logs
docker logs -f planning-poker-app

# Stop the container
docker stop planning-poker-app
docker rm planning-poker-app
```

### Access the Application

Once running, open your browser and navigate to:
- **Application**: http://localhost
- **Health Check**: http://localhost/health

## Rebuilding After Code Changes

**Important**: Docker builds your application code into the image at build time. When you make changes to the source code, you must rebuild the Docker image to see those changes.

### When to Rebuild
- After modifying any source code (frontend or backend)
- After updating dependencies (package.json changes)
- After changing configuration files

### How to Rebuild

#### Using Docker Compose
```bash
# Stop current containers
docker-compose down

# Rebuild and start with latest code
docker-compose up -d --build
```

#### Using Docker directly
```bash
# Stop and remove old container
docker stop planning-poker-app
docker rm planning-poker-app

# Rebuild image with latest code
docker build -t planning-poker . --no-cache

# Start new container
docker run -d -p 80:80 --name planning-poker-app planning-poker
```

### Quick Rebuild Commands
```bash
# One-liner for Docker Compose
docker-compose down && docker-compose up -d --build

# One-liner for Docker direct
docker stop planning-poker-app && docker rm planning-poker-app && docker build -t planning-poker . && docker run -d -p 80:80 --name planning-poker-app planning-poker
```

## Architecture

The single container includes:
- **Nginx** (Port 80) - Serves React frontend and proxies API calls
- **Node.js Backend** (Port 3001) - Handles API and WebSocket connections
- **React Frontend** - Built and served as static files

```
┌─────────────────────────────────────┐
│           Docker Container          │
│  ┌─────────────┐  ┌───────────────┐ │
│  │    Nginx    │  │   Node.js     │ │
│  │   (Port 80) │  │  (Port 3001)  │ │
│  │             │  │               │ │
│  │ Static Files│◄─┤ API + WebSocket│ │
│  │ Proxy Rules │  │               │ │
│  └─────────────┘  └───────────────┘ │
└─────────────────────────────────────┘
```

## Configuration

### Environment Variables

You can customize the application using environment variables:

```bash
# Using docker run
docker run -d -p 80:80 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  --name planning-poker-app \
  planning-poker

# Using docker-compose (edit docker-compose.yml)
environment:
  - NODE_ENV=production
  - PORT=3001
```

### Custom Port

To run on a different port (e.g., 8080):

```bash
# Docker run
docker run -d -p 8080:80 --name planning-poker-app planning-poker

# Docker compose (edit docker-compose.yml)
ports:
  - "8080:80"
```

## Monitoring

### Health Checks

The container includes built-in health checks:
- **Endpoint**: http://localhost/health
- **Interval**: Every 30 seconds
- **Timeout**: 3 seconds

### Logs

View application logs:
```bash
# All logs
docker-compose logs -f

# Backend only
docker exec planning-poker-app tail -f /var/log/planning-poker/backend.log

# Nginx access logs
docker exec planning-poker-app tail -f /var/log/nginx/access.log

# Nginx error logs
docker exec planning-poker-app tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Error: bind: address already in use
# Solution: Use a different port
docker run -d -p 8080:80 --name planning-poker-app planning-poker
```

#### 2. Backend Not Starting
```bash
# Check backend logs
docker exec planning-poker-app cat /var/log/planning-poker/backend.log

# Check if Node.js process is running
docker exec planning-poker-app ps aux | grep node
```

#### 3. WebSocket Connection Issues
```bash
# Check nginx configuration
docker exec planning-poker-app nginx -t

# Restart nginx
docker exec planning-poker-app nginx -s reload
```

#### 4. Build Failures
```bash
# Clean build (remove cached layers)
docker build --no-cache -t planning-poker .

# Check build logs for specific errors
docker build -t planning-poker . 2>&1 | tee build.log
```

### Debug Mode

Run the container interactively for debugging:
```bash
# Start container with shell access
docker run -it --rm -p 80:80 planning-poker /bin/sh

# Or exec into running container
docker exec -it planning-poker-app /bin/sh
```

## Production Considerations

### Security
- The container runs with default security settings
- Consider using a non-root user for production
- Add SSL/TLS termination with a reverse proxy

### Scaling
- This single-container approach is suitable for small to medium loads
- For high availability, consider:
  - Load balancer in front of multiple containers
  - External database (Redis/PostgreSQL) for session persistence
  - Container orchestration (Kubernetes, Docker Swarm)

### Persistence
- Current setup uses in-memory storage
- Room data is lost when container restarts
- Consider adding Redis or PostgreSQL for persistence

### Monitoring
- Add application monitoring (Prometheus, Grafana)
- Set up log aggregation (ELK stack, Fluentd)
- Configure alerting for health check failures

## Development

### Local Development with Docker

```bash
# Build development image
docker build -t planning-poker:dev .

# Run with volume mounts for development
docker run -d -p 80:80 \
  -v $(pwd)/backend/src:/app/backend/src \
  --name planning-poker-dev \
  planning-poker:dev
```

### Updating the Application

When you have new code changes:

```bash
# Pull latest code from repository
git pull

# Rebuild and restart (see "Rebuilding After Code Changes" section above)
docker-compose down
docker-compose up -d --build
```

For detailed rebuild instructions, see the **"Rebuilding After Code Changes"** section above.

## Support

If you encounter issues:
1. Check the logs using the commands above
2. Verify your Docker installation
3. Ensure no other services are using port 80
4. Check the GitHub repository for known issues

## File Structure

```
├── Dockerfile              # Multi-stage build configuration
├── docker-compose.yml      # Docker Compose configuration
├── nginx.conf             # Nginx server configuration
├── start.sh              # Container startup script
├── .dockerignore         # Files to exclude from build
└── README-DOCKER.md      # This file
```