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

# Define installation paths
INSTALL_DIR="/usr/local/buddybox"
CONFIG_DIR="/etc/buddybox"
LOG_DIR="/var/log/buddybox"
DATA_DIR="/var/lib/buddybox"
TEMP_DIR="/tmp/buddybox"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run as root"
    exit 1
fi

# Create buddybox user if it doesn't exist
print_step "Checking for buddybox user..."
if ! id "buddybox" &>/dev/null; then
    print_step "Creating buddybox user..."
    sudo dscl . -create /Users/buddybox
    sudo dscl . -create /Users/buddybox UserShell /bin/bash
    sudo dscl . -create /Users/buddybox RealName "BuddyBox User"
    sudo dscl . -create /Users/buddybox UniqueID "1001"
    sudo dscl . -create /Users/buddybox PrimaryGroupID 20
    sudo dscl . -passwd /Users/buddybox buddybox123
    sudo dscl . -append /Groups/admin GroupMembership buddybox
    print_success "Created buddybox user"
else
    print_step "buddybox user already exists"
fi

# Create necessary directories
print_step "Creating installation directories..."
sudo mkdir -p $INSTALL_DIR
sudo mkdir -p $CONFIG_DIR
sudo mkdir -p $LOG_DIR
sudo mkdir -p $DATA_DIR
sudo mkdir -p $TEMP_DIR

# Set permissions
sudo chown -R buddybox:buddybox $INSTALL_DIR
sudo chown -R buddybox:buddybox $CONFIG_DIR
sudo chown -R buddybox:buddybox $LOG_DIR
sudo chown -R buddybox:buddybox $DATA_DIR
sudo chown -R buddybox:buddybox $TEMP_DIR

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    print_step "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Node.js and npm if not installed
if ! command -v node &> /dev/null; then
    print_step "Installing Node.js and npm..."
    brew install node@18
    echo 'export PATH="/usr/local/opt/node@18/bin:$PATH"' >> ~/.zshrc
    source ~/.zshrc
fi

# Install PostgreSQL if not installed
if ! command -v psql &> /dev/null; then
    print_step "Installing PostgreSQL..."
    brew install postgresql@14
    brew services start postgresql@14
fi

# Create PostgreSQL database and user
print_step "Setting up PostgreSQL database..."
createdb buddybox_dev || true
psql -d buddybox_dev -c "CREATE USER buddybox WITH PASSWORD 'buddybox123';" || true
psql -d buddybox_dev -c "GRANT ALL PRIVILEGES ON DATABASE buddybox_dev TO buddybox;" || true

# Install global npm packages
print_step "Installing global npm packages..."
npm install -g nodemon typescript ts-node

# Install project dependencies
print_step "Installing project dependencies..."

# Backend setup
print_step "Setting up backend..."
cd backend
npm install
cp .env.example .env

# Update .env with development settings
cat > .env << EOL
# Server Configuration
PORT=5000
NODE_ENV=development

# Installation Paths
INSTALL_DIR=$INSTALL_DIR
CONFIG_DIR=$CONFIG_DIR
LOG_DIR=$LOG_DIR
DATA_DIR=$DATA_DIR
TEMP_DIR=$TEMP_DIR

# PostgreSQL Configuration
DATABASE_URL=postgres://buddybox:buddybox123@localhost:5432/buddybox_dev

# JWT Configuration
JWT_SECRET=dev-secret-key-here
JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=debug
LOG_FILE=$LOG_DIR/backend.log

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=1000
EOL

# Frontend setup
print_step "Setting up frontend..."
cd ../frontend
npm install
cp .env.example .env

# Update frontend .env
cat > .env << EOL
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
PORT=8090
INSTALL_DIR=$INSTALL_DIR
CONFIG_DIR=$CONFIG_DIR
EOL

# CLI setup
print_step "Setting up CLI..."
cd ../cli
npm install
npm link

# Create symbolic links
print_step "Creating symbolic links..."
sudo ln -sf $INSTALL_DIR/bin/bbox /usr/local/bin/bbox

# Return to root directory
cd ..

# Print completion message
print_step "Development setup completed!"
echo -e "\n${GREEN}BuddyBox development environment has been set up successfully!${NC}"
echo -e "\nInstallation locations:"
echo "Main installation: $INSTALL_DIR"
echo "Configuration: $CONFIG_DIR"
echo "Logs: $LOG_DIR"
echo "Data: $DATA_DIR"
echo -e "\nNext steps:"
echo "1. Start the backend server: cd $INSTALL_DIR/backend && npm run dev"
echo "2. Start the frontend development server: cd $INSTALL_DIR/frontend && npm start"
echo "3. Test the CLI: bbox --help"
echo -e "\nFor more information, check the documentation in $INSTALL_DIR/docs" 