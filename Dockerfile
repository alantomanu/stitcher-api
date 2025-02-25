# Use Ubuntu as base image
FROM ubuntu:22.04

# Set Node.js version
ENV NODE_VERSION=20.x

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    curl \
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
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Create directories for uploads and output
RUN mkdir -p uploads output

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose the port your app runs on
EXPOSE 5000

# Add environment variables that Render will provide
ENV PORT=5000
ENV NODE_ENV=production
ENV CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
ENV CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
ENV CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}

# Start the application using the built version
CMD ["npm", "start"] 