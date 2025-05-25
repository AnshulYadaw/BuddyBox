#!/bin/bash
set -e

echo "Setting up BuddyBox test environment..."

# 1. Check if we're in the project root
if [ ! -d "server" ] || [ ! -d "cli" ]; then
  echo "Error: Must be run from project root directory"
  exit 1
fi

# 2. Install server dependencies
echo "Installing server dependencies..."
cd server
npm install express mongoose jsonwebtoken bcrypt dotenv cors helmet express-rate-limit winston yup
npm install --save-dev jest supertest cross-env nodemon eslint

# 3. Install CLI dependencies
echo "Installing CLI dependencies..."
cd ../cli
npm install commander inquirer chalk ora axios conf
npm install --save-dev jest nodemon

# 4. Create test directories if they don't exist
echo "Creating test directories..."
cd ../server
mkdir -p src/tests
cd ../cli
mkdir -p src/tests

# 5. Create Docker test environment
echo "Setting up Docker test environment..."
cd ..
cat > docker-compose.test.yml << 'EOF'
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=buddybox-test
    volumes:
      - mongodb_test_data:/data/db

volumes:
  mongodb_test_data:
EOF

# 6. Create test script
echo "Creating test script..."
mkdir -p scripts
cat > scripts/test.sh << 'EOF'
#!/bin/bash

# Start MongoDB container
docker-compose -f docker-compose.test.yml up -d

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
sleep 5

# Run tests
cd server && npm test

# Stop MongoDB container
cd .. && docker-compose -f docker-compose.test.yml down
EOF

chmod +x scripts/test.sh

# 7. Create server test setup
echo "Creating server test setup..."
cd server
cat > src/tests/setup.js << 'EOF'
// Set test environment
process.env.NODE_ENV = 'test';

// Set test database URI
process.env.MONGODB_URI_TEST = 'mongodb://localhost:27017/buddybox-test';

// Set JWT secret for testing
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

// Set token expiration times for testing
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Increase timeout for tests
jest.setTimeout(30000);
EOF

# 8. Update server package.json scripts
echo "Updating server package.json scripts..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json'));
pkg.scripts = {
  ...pkg.scripts,
  'test': 'jest --detectOpenHandles',
  'test:watch': 'jest --watch',
  'test:coverage': 'jest --coverage',
  'test:docker': '../scripts/test.sh',
  'test:unit': 'jest src/tests/iam.test.js',
  'test:integration': 'jest src/tests/commands.test.js',
  'test:performance': 'jest src/tests/performance.test.js',
  'test:all': 'jest --detectOpenHandles --runInBand'
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# 9. Create Jest config
echo "Creating Jest configuration..."
cat > jest.config.js << 'EOF'
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/config/**/*.js',
    '!src/tests/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFiles: ['<rootDir>/src/tests/setup.js']
};
EOF

echo "Test environment setup complete!"
echo ""
echo "To run tests:"
echo "1. Start Docker Desktop"
echo "2. Run: cd server && npm run test:docker"
echo ""
echo "Available test commands:"
echo "- npm test              : Run all tests"
echo "- npm run test:watch    : Run tests in watch mode"
echo "- npm run test:coverage : Generate coverage report"
echo "- npm run test:unit     : Run unit tests only"
echo "- npm run test:integration : Run integration tests only"
echo "- npm run test:performance : Run performance tests only"
echo "- npm run test:all      : Run all tests in sequence" 