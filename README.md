# 🃏 Planning Poker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A real-time collaborative web application for agile story point estimation using the Planning Poker technique. Built with React, Node.js, and WebSockets for seamless team collaboration.

![Planning Poker Demo](https://via.placeholder.com/800x400/007bff/ffffff?text=Planning+Poker+Demo)

## ✨ Features

- 🚀 **Real-time collaboration** - Instant updates across all connected players
- 🎯 **Standard Planning Poker deck** - Fibonacci sequence (0.5, 1, 2, 3, 5, 8, 13, 21) + special cards (?, ☕)
- 📊 **Rich statistics** - Average, median, variance detection with visual charts
- 🔄 **Robust reconnection** - Automatic reconnection and room rejoining
- 👥 **Player management** - Remove disconnected players, track connection status
- 🎨 **Modern UI** - Clean, responsive design with visual feedback
- 🐳 **Docker ready** - Single-container deployment with Nginx + Node.js
- 📱 **Mobile friendly** - Works on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/planning-poker.git
cd planning-poker

# Start the application
docker-compose up -d

# Open your browser
open http://localhost
```

### Local Development

```bash
# Install dependencies
npm run install:all

# Start backend (Terminal 1)
cd backend && npm run dev

# Start frontend (Terminal 2)  
cd frontend && npm run dev

# Open your browser
open http://localhost:3000
```

## 📖 How to Use

1. **Create or Join a Room**
   - Enter a room name to create a new session
   - Share the room ID with your team members

2. **Start Estimation**
   - Click "Start New Round" to begin estimation
   - Each player selects their story point estimate
   - Cards remain hidden until all players have voted

3. **Reveal Results**
   - Click "Reveal Cards" when everyone has voted
   - View individual estimates and team statistics
   - Discuss any significant variance in estimates

4. **Repeat**
   - Start new rounds for additional stories
   - Players can join/leave at any time

## 🏗️ Architecture

```
┌──────────────────────────────────────┐
│           Docker Container           │
│  ┌─────────────┐  ┌────────────────┐ │
│  │    Nginx    │  │   Node.js      │ │
│  │   (Port 80) │  │  (Port 3001)   │ │
│  │             │  │                │ │
│  │ React App   │◄─┤ API + WebSocket│ │
│  │ Static Files│  │                │ │
│  └─────────────┘  └────────────────┘ │
└──────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Node.js, Express, Socket.IO
- **Database**: In-memory (Redis/PostgreSQL ready)
- **Deployment**: Docker, Nginx
- **Testing**: Jest, Property-based testing

## 🛠️ Development

### Project Structure

```
planning-poker/
├── frontend/          # React application
├── backend/           # Node.js API server  
├── shared/            # Shared TypeScript types
├── Dockerfile         # Multi-stage Docker build
├── docker-compose.yml # Container orchestration
└── nginx.conf         # Production web server config
```

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run install:all      # Install all dependencies

# Testing  
npm test                # Run all tests
npm run test:backend    # Backend tests only
npm run test:frontend   # Frontend tests only

# Building
npm run build           # Build for production
npm run build:backend   # Build backend only
npm run build:frontend  # Build frontend only

# Docker
docker-compose up -d    # Start in production mode
docker-compose logs -f  # View logs
docker-compose down     # Stop containers
```

### Environment Variables

```bash
# Backend (.env)
NODE_ENV=development
PORT=3001

# Frontend (.env)
VITE_API_URL=http://localhost:3001
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 🚢 Deployment

### Docker (Production)

```bash
# Build and deploy
docker-compose up -d --build

# Health check
curl http://localhost/health

# View logs
docker-compose logs -f planning-poker
```

### Manual Deployment

1. **Build applications**:
   ```bash
   npm run build
   ```

2. **Deploy backend**:
   ```bash
   cd backend
   npm start
   ```

3. **Serve frontend**:
   ```bash
   # Serve frontend/dist with your web server
   ```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the Planning Poker estimation technique
- Built with modern web technologies
- Designed for agile development teams

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/planning-poker/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/planning-poker/discussions)
- 📖 **Documentation**: [Wiki](https://github.com/yourusername/planning-poker/wiki)

---

**Made with ❤️ for agile teams worldwide**