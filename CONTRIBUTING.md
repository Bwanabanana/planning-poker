# Contributing to Planning Poker

Thank you for your interest in contributing to Planning Poker! This document provides guidelines for contributing to the project.

## 🚀 Quick Start

1. **Fork the repository**
2. **Clone your fork**: `git clone https://github.com/yourusername/planning-poker.git`
3. **Install dependencies**: `npm install`
4. **Start development**: See README.md for setup instructions

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose
- Git

### Local Development
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend  
cd frontend
npm install
npm run dev
```

### Docker Development
```bash
docker-compose up --build
```

## 📝 Making Changes

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages
Follow conventional commits:
- `feat: add new card selection feature`
- `fix: resolve WebSocket reconnection issue`
- `docs: update installation instructions`
- `test: add unit tests for room service`

### Code Style
- **TypeScript**: Use strict typing
- **React**: Functional components with hooks
- **CSS**: Follow existing naming conventions
- **Backend**: Follow existing service patterns

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test

# E2E tests
npm run test:e2e
```

### Test Requirements
- Add tests for new features
- Ensure existing tests pass
- Aim for good test coverage

## 📋 Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** with clear, focused commits
3. **Add/update tests** as needed
4. **Update documentation** if required
5. **Test thoroughly** (unit, integration, manual)
6. **Submit pull request** with clear description

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes
```

## 🐛 Reporting Issues

### Bug Reports
Include:
- **Environment**: OS, browser, Docker version
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Screenshots/logs** if helpful

### Feature Requests
Include:
- **Use case**: Why is this needed?
- **Proposed solution**: How should it work?
- **Alternatives considered**

## 📚 Documentation

- Update README.md for user-facing changes
- Add inline code comments for complex logic
- Update API documentation if applicable

## 🎯 Areas for Contribution

### High Priority
- [ ] Persistent storage (Redis/PostgreSQL)
- [ ] User authentication
- [ ] Room templates/presets
- [ ] Export estimation results
- [ ] Mobile responsiveness improvements

### Medium Priority  
- [ ] Keyboard shortcuts
- [ ] Dark mode theme
- [ ] Estimation history
- [ ] Custom card decks
- [ ] Room moderation features

### Low Priority
- [ ] Internationalization (i18n)
- [ ] Advanced statistics
- [ ] Integration with project management tools
- [ ] Voice/video chat integration

## 💬 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check README.md and docs/

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributors page

Thank you for helping make Planning Poker better! 🎉