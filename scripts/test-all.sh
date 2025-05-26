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

# Function to run tests and check status
run_tests() {
    local dir=$1
    local name=$2
    print_step "Running $name tests..."
    cd $dir
    if npm test; then
        print_success "$name tests passed"
    else
        print_error "$name tests failed"
        return 1
    fi
    cd ..
}

# Function to check service health
check_service() {
    local url=$1
    local name=$2
    print_step "Checking $name health..."
    if curl -s $url > /dev/null; then
        print_success "$name is healthy"
    else
        print_error "$name is not responding"
        return 1
    fi
}

# Function to run database tests
run_db_tests() {
    print_step "Running database tests..."
    cd backend
    if npx sequelize-cli db:migrate:status; then
        print_success "Database migrations are up to date"
    else
        print_error "Database migration check failed"
        return 1
    fi
    cd ..
}

# Function to run CLI tests
run_cli_tests() {
    print_step "Running CLI tests..."
    if bbox --version > /dev/null; then
        print_success "CLI is working"
    else
        print_error "CLI test failed"
        return 1
    fi
}

# Function to run security tests
run_security_tests() {
    print_step "Running security tests..."
    
    # Check for exposed sensitive files
    if [ -f "backend/.env" ]; then
        print_warning "Found .env file in backend directory"
    fi
    
    # Check for proper permissions
    if [ -O "/usr/local/buddybox" ]; then
        print_success "Installation directory has correct ownership"
    else
        print_warning "Installation directory ownership might need review"
    fi
}

# Function to run performance tests
run_performance_tests() {
    print_step "Running performance tests..."
    
    # Test API response time
    start_time=$(date +%s.%N)
    curl -s http://localhost:5000/api/health > /dev/null
    end_time=$(date +%s.%N)
    
    response_time=$(echo "$end_time - $start_time" | bc)
    if (( $(echo "$response_time < 1.0" | bc -l) )); then
        print_success "API response time is good: ${response_time}s"
    else
        print_warning "API response time is slow: ${response_time}s"
    fi
}

# Main test execution
print_step "Starting BuddyBox test suite..."

# Run backend tests
run_tests "backend" "Backend"

# Run frontend tests
run_tests "frontend" "Frontend"

# Run CLI tests
run_cli_tests

# Run database tests
run_db_tests

# Check service health
check_service "http://localhost:5000/api/health" "Backend API"
check_service "http://localhost:8090" "Frontend"

# Run security tests
run_security_tests

# Run performance tests
run_performance_tests

# Print test summary
print_step "Test Summary:"
echo "All tests completed. Check the output above for any errors or warnings."
echo "For detailed test results, check the test reports in each component's directory."

# Generate test report
{
    echo "BuddyBox Test Report"
    echo "==================="
    echo "Date: $(date)"
    echo "Hostname: $(hostname)"
    echo ""
    echo "Test Results:"
    echo "------------"
    echo "Backend Tests: $([ $? -eq 0 ] && echo "PASSED" || echo "FAILED")"
    echo "Frontend Tests: $([ $? -eq 0 ] && echo "PASSED" || echo "FAILED")"
    echo "CLI Tests: $([ $? -eq 0 ] && echo "PASSED" || echo "FAILED")"
    echo "Database Tests: $([ $? -eq 0 ] && echo "PASSED" || echo "FAILED")"
    echo ""
    echo "Service Health:"
    echo "--------------"
    echo "Backend API: $([ $? -eq 0 ] && echo "HEALTHY" || echo "UNHEALTHY")"
    echo "Frontend: $([ $? -eq 0 ] && echo "HEALTHY" || echo "UNHEALTHY")"
    echo ""
    echo "Security Checks:"
    echo "---------------"
    echo "Environment Files: $([ -f "backend/.env" ] && echo "WARNING" || echo "OK")"
    echo "Directory Permissions: $([ -O "/usr/local/buddybox" ] && echo "OK" || echo "WARNING")"
    echo ""
    echo "Performance Metrics:"
    echo "------------------"
    echo "API Response Time: ${response_time}s"
} > test-report.txt

print_success "Test report generated at test-report.txt" 