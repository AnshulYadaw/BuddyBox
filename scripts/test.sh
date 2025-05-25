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