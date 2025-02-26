# Use Node.js as base image
FROM node:20-bullseye

# Create app directory
WORKDIR /usr/src/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    poppler-utils \
    build-essential \
    pkg-config \
    libpoppler-dev \
    libpoppler-cpp-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create directories for uploads and output
RUN mkdir -p uploads output && chmod 777 uploads output

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy app source
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production \
    PORT=5000

# Start the application
CMD ["npm", "start"]
