# Use Node.js LTS (Long Term Support) version with slim base
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install system dependencies required for pdf-poppler and sharp
RUN apt-get update && apt-get install -y \
    poppler-utils \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

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