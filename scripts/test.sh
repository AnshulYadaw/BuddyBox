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

print_success() {
    echo -e "${GREEN}Success:${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root"
    exit 1
fi

# Function to check service status
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        print_success "$service is running"
        return 0
    else
        print_error "$service is not running"
        return 1
    fi
}

# Function to check port
check_port() {
    local port=$1
    if netstat -tuln | grep -q ":$port "; then
        print_success "Port $port is open"
        return 0
    else
        print_error "Port $port is not open"
        return 1
    fi
}

# Function to check command exists
check_command() {
    local cmd=$1
    if command -v $cmd &> /dev/null; then
        print_success "$cmd is installed"
        return 0
    else
        print_error "$cmd is not installed"
        return 1
    fi
}

# Function to check version
check_version() {
    local cmd=$1
    local expected_version=$2
    local actual_version=$($cmd --version 2>&1 | head -n 1)
    print_step "Checking $cmd version: $actual_version"
}

# Start testing
print_step "Starting automated testing..."

# Check system requirements
print_step "Checking system requirements..."
check_command node
check_command npm
check_command mongod
check_command nginx
check_command pm2

# Check versions
print_step "Checking software versions..."
check_version node "v18"
check_version npm
check_version mongod
check_version nginx

# Check services
print_step "Checking services..."
check_service mongod
check_service nginx

# Check ports
print_step "Checking ports..."
check_port 80
check_port 443
check_port 5000

# Check PM2 processes
print_step "Checking PM2 processes..."
if pm2 list | grep -q "buddybox-backend"; then
    print_success "Backend service is running in PM2"
else
    print_error "Backend service is not running in PM2"
fi

# Check MongoDB connection
print_step "Testing MongoDB connection..."
if mongosh --eval "db.runCommand({ ping: 1 })" &> /dev/null; then
    print_success "MongoDB connection successful"
else
    print_error "MongoDB connection failed"
fi

# Check nginx configuration
print_step "Testing nginx configuration..."
if nginx -t &> /dev/null; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors"
fi

# Check application files
print_step "Checking application files..."
if [ -d "/opt/buddybox/frontend/build" ]; then
    print_success "Frontend build exists"
else
    print_error "Frontend build not found"
fi

if [ -f "/opt/buddybox/backend/.env" ]; then
    print_success "Backend environment file exists"
else
    print_error "Backend environment file not found"
fi

# Check logs
print_step "Checking log files..."
if [ -f "/var/log/buddybox/backend.log" ]; then
    print_success "Backend log file exists"
    print_step "Last 5 lines of backend log:"
    tail -n 5 /var/log/buddybox/backend.log
else
    print_error "Backend log file not found"
fi

# Check SSL certificate (if exists)
print_step "Checking SSL certificate..."
if [ -f "/etc/letsencrypt/live/$(hostname)/fullchain.pem" ]; then
    print_success "SSL certificate exists"
    print_step "Certificate details:"
    openssl x509 -in /etc/letsencrypt/live/$(hostname)/fullchain.pem -text -noout | grep "Subject:"
else
    print_warning "SSL certificate not found"
fi

# Check system resources
print_step "Checking system resources..."
print_step "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'

print_step "Memory Usage:"
free -m | awk 'NR==2{printf "Memory Usage: %s/%sMB (%.2f%%)\n", $3,$2,$3*100/$2 }'

print_step "Disk Usage:"
df -h | grep "/$" | awk '{print "Disk Usage: " $5 " of " $2}'

# Test API endpoints
print_step "Testing API endpoints..."
if curl -s http://localhost:5000/api/health &> /dev/null; then
    print_success "Health check endpoint is responding"
else
    print_error "Health check endpoint is not responding"
fi

# Generate test report
print_step "Generating test report..."
{
    echo "BuddyBox Test Report"
    echo "==================="
    echo "Date: $(date)"
    echo "Hostname: $(hostname)"
    echo "IP Address: $(hostname -I | awk '{print $1}')"
    echo ""
    echo "System Information:"
    echo "------------------"
    echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "Kernel: $(uname -r)"
    echo "CPU: $(grep "model name" /proc/cpuinfo | head -n1 | cut -d':' -f2 | sed 's/^[ \t]*//')"
    echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
    echo ""
    echo "Service Status:"
    echo "--------------"
    systemctl status mongod | grep "Active:"
    systemctl status nginx | grep "Active:"
    pm2 list | grep "buddybox-backend"
    echo ""
    echo "Port Status:"
    echo "-----------"
    netstat -tuln | grep -E ':80|:443|:5000'
    echo ""
    echo "Resource Usage:"
    echo "--------------"
    top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU Usage: " (100 - $1) "%"}'
    free -m | awk 'NR==2{printf "Memory Usage: %s/%sMB (%.2f%%)\n", $3,$2,$3*100/$2 }'
    df -h | grep "/$" | awk '{print "Disk Usage: " $5 " of " $2}'
} > /opt/buddybox/test-report.txt

print_success "Test report generated at /opt/buddybox/test-report.txt"

# Print summary
print_step "Test Summary:"
echo "All tests completed. Check /opt/buddybox/test-report.txt for detailed results."
echo "If any tests failed, please check the error messages above and fix the issues." 