#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up environment for Context Bank MCP Server${NC}"

# Check if .env file exists
if [ -f .env ]; then
  echo -e "${YELLOW}An .env file already exists. Do you want to overwrite it? (y/n)${NC}"
  read -r answer
  if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo "Setup cancelled. Existing .env file was not modified."
    exit 0
  fi
fi

# Copy example file if it exists
if [ -f .env.example ]; then
  cp .env.example .env
  echo "Created .env file from .env.example"
else
  # Create .env file from scratch
  cat > .env << EOL
# AtherOS API Configuration
ONYX_API_KEY=
ONYX_API_BASE=http://172.30.22.52:3000

# Server Configuration
PORT=3000
NODE_ENV=development

# Optional: Logging Configuration
LOG_LEVEL=info
EOL
  echo "Created new .env file"
fi

# Prompt for API key
echo -e "${YELLOW}Please enter your AtherOS API key:${NC}"
read -r api_key

# Update API key in .env file
if [ -n "$api_key" ]; then
  sed -i '' "s|ONYX_API_KEY=.*|ONYX_API_KEY=$api_key|" .env
  echo "API key updated in .env file"
fi

# Prompt for API base URL
echo -e "${YELLOW}Please enter your AtherOS API base URL (press Enter to use default: http://172.30.22.52:3000):${NC}"
read -r api_base

# Update API base URL in .env file if provided
if [ -n "$api_base" ]; then
  sed -i '' "s|ONYX_API_BASE=.*|ONYX_API_BASE=$api_base|" .env
  echo "API base URL updated in .env file"
fi

# Make the script executable
chmod +x setup-env.sh

echo -e "${GREEN}Environment setup complete!${NC}"
echo "You can now run 'npm run build' and 'npm start' to start the server." 