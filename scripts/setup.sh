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

# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Update backend .env with new JWT secret
print_step "Updating JWT secret..."
sed -i "s/your-secret-key-here/$JWT_SECRET/" /opt/buddybox/backend/.env

# Configure firewall
print_step "Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
fi

# Set up SSL with Let's Encrypt
print_step "Setting up SSL with Let's Encrypt..."
if command -v certbot &> /dev/null; then
    read -p "Enter your domain name: " DOMAIN_NAME
    certbot --nginx -d $DOMAIN_NAME
fi

# Create admin user
print_step "Creating admin user..."
cd /opt/buddybox/backend
node -e "
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const mongoose = require('mongoose');
require('dotenv').config();

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await User.create({
            email: 'admin@buddybox.com',
            password: hashedPassword,
            name: 'Admin',
            role: 'admin'
        });
        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        mongoose.disconnect();
    }
}

createAdmin();
"

# Restart services
print_step "Restarting services..."
pm2 restart all

print_step "Setup completed!"
echo -e "\n${GREEN}BuddyBox has been configured successfully!${NC}"
echo -e "\nDefault admin credentials:"
echo "Email: admin@buddybox.com"
echo "Password: admin123"
echo -e "\nPlease change these credentials immediately after first login!" 