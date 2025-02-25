# Use Ubuntu as base image
FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Set Node.js version
ENV NODE_VERSION=20.x

# Install Node.js, npm, and required dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} | bash - \
    && apt-get install -y \
    nodejs \
    poppler-utils \
    build-essential \
    poppler-data \
    pkg-config \
    libpoppler-dev \
    libpoppler-cpp-dev \
    python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Create directories for uploads and output with proper permissions
RUN mkdir -p uploads output && chmod 777 uploads output

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Start the application
CMD ["npm", "start"]
