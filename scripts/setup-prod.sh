#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print with color
print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_error() {
    echo -e "${RED}Error:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root"
    exit 1
fi

# Update system
print_step "Updating system packages..."
apt-get update && apt-get upgrade -y

# Install Node.js and npm
print_step "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PostgreSQL
print_step "Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Configure PostgreSQL
print_step "Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE USER buddybox WITH PASSWORD 'buddybox123';" || true
sudo -u postgres psql -c "CREATE DATABASE buddybox;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE buddybox TO buddybox;" || true

# Install PM2 globally
print_step "Installing PM2..."
npm install -g pm2

# Create project directory
print_step "Setting up project directory..."
mkdir -p /opt/buddybox
cd /opt/buddybox

# Create environment files
print_step "Creating environment files..."

# Backend .env
cat > backend/.env << 'EOL'
# Server Configuration
PORT=5000
NODE_ENV=production

# PostgreSQL Configuration
DATABASE_URL=postgres://buddybox:buddybox123@localhost:5432/buddybox

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/buddybox/backend.log

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
EOL

# Frontend .env
cat > frontend/.env << 'EOL'
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=production
EOL

# Install dependencies
print_step "Installing backend dependencies..."
cd backend
npm install --production

print_step "Installing frontend dependencies..."
cd ../frontend
npm install --production

print_step "Installing CLI dependencies..."
cd ../cli
npm install --production
npm link

# Run database migrations
print_step "Running database migrations..."
cd ../backend
npx sequelize-cli db:migrate

# Build frontend
print_step "Building frontend..."
cd ../frontend
npm run build

# Configure nginx
print_step "Configuring nginx..."
apt-get install -y nginx
cat > /etc/nginx/sites-available/buddybox << 'EOL'
server {
    listen 80;
    server_name _;

    location / {
        root /opt/buddybox/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL

ln -sf /etc/nginx/sites-available/buddybox /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Create log directory
mkdir -p /var/log/buddybox
chown -R www-data:www-data /var/log/buddybox

# Start services with PM2
print_step "Starting services..."
cd /opt/buddybox/backend
pm2 start src/index.js --name "buddybox-backend"
pm2 save
pm2 startup

# Print completion message
print_step "Production setup completed!"
echo -e "\n${GREEN}BuddyBox has been set up successfully!${NC}"
echo -e "\nAccess the web interface at: http://your-server-ip"
echo -e "CLI is available globally as: buddybox"
echo -e "\nNext steps:"
echo "1. Update the JWT_SECRET in backend/.env"
echo "2. Set up SSL certificates for secure access"
echo "3. Configure firewall rules"
echo -e "\nFor more information, check the documentation at /opt/buddybox/docs" 