# BuddyBox Development Guide

## Project Structure

```
buddybox/
├── backend/           # Backend API server
│   ├── src/
│   │   ├── config/   # Configuration files
│   │   ├── controllers/ # Route controllers
│   │   ├── middleware/ # Custom middleware
│   │   ├── models/    # Database models
│   │   ├── routes/    # API routes
│   │   ├── services/  # Business logic
│   │   ├── tests/     # Test files
│   │   └── utils/     # Utility functions
│   └── package.json
│
├── frontend/          # React frontend application
│   ├── public/        # Static files
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/     # Page components
│   │   ├── services/  # API services
│   │   ├── utils/     # Utility functions
│   │   └── tests/     # Test files
│   └── package.json
│
├── cli/              # Command-line interface
│   ├── src/
│   │   ├── commands/ # CLI commands
│   │   ├── config/   # Configuration
│   │   └── utils/    # Utility functions
│   └── package.json
│
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/buddybox/buddybox.git
cd buddybox
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run dev
```

3. **Frontend Setup**
```bash
cd frontend
npm install
cp .env.example .env  # Configure environment variables
npm start
```

4. **CLI Setup**
```bash
cd cli
npm install
npm link  # For development
```

## VM Installation

1. **SSH into your VM**
```bash
ssh user@your-vm-ip
```

2. **Clone the repository**
```bash
git clone https://github.com/buddybox/buddybox.git
cd buddybox
```

3. **Run the installation script**
```bash
sudo ./scripts/install.sh
```

4. **Run the setup script**
```bash
sudo ./scripts/setup.sh
```

The installation script will:
- Install required system packages
- Set up Node.js and npm
- Install and configure MongoDB
- Install PM2 for process management
- Set up the project structure
- Configure nginx
- Create necessary environment files
- Install all dependencies
- Build the frontend
- Start the services

The setup script will:
- Generate a secure JWT secret
- Configure the firewall
- Set up SSL with Let's Encrypt (if available)
- Create an admin user
- Restart all services

## Development Workflow

1. **Branch Strategy**
   - `main` - Production-ready code
   - `develop` - Development branch
   - Feature branches: `feature/feature-name`
   - Bug fixes: `fix/bug-name`

2. **Code Style**
   - ESLint for JavaScript/TypeScript
   - Prettier for code formatting
   - Follow existing code style

3. **Testing**
   - Write unit tests for new features
   - Run tests before committing
   - Maintain test coverage

4. **Documentation**
   - Update docs for new features
   - Include API documentation
   - Add usage examples

## Contributing

1. **Pull Request Process**
   - Create feature branch
   - Write tests
   - Update documentation
   - Submit PR to develop

2. **Code Review**
   - All PRs require review
   - Address review comments
   - Ensure CI passes

3. **Commit Messages**
   - Use conventional commits
   - Be descriptive
   - Reference issues

## Building

1. **Backend**
```bash
cd backend
npm run build
```

2. **Frontend**
```bash
cd frontend
npm run build
```

3. **CLI**
```bash
cd cli
npm run build
```

## Testing

1. **Backend Tests**
```bash
cd backend
npm test
```

2. **Frontend Tests**
```bash
cd frontend
npm test
```

3. **CLI Tests**
```bash
cd cli
npm test
```

## Deployment

1. **Backend**
   - Deploy to production server
   - Configure environment
   - Start with PM2

2. **Frontend**
   - Build static files
   - Deploy to CDN
   - Configure nginx

3. **CLI**
   - Publish to npm
   - Update documentation

## Troubleshooting

1. **Common Issues**
   - Check logs
   - Verify environment
   - Test locally

2. **Development Tools**
   - Use debugger
   - Check network
   - Monitor resources

## Resources

- [API Documentation](./api/README.md)
- [CLI Documentation](./cli/README.md)
- [User Guide](./user-guide/README.md)
- [Security Guide](./security/README.md) 