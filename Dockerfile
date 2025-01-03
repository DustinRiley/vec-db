# Use a Debian-based Node.js image
FROM node:18-bullseye-slim

# Install necessary system libraries for PDFNet
RUN apt-get update && apt-get install -y \
    libc6 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the application
COPY . .

# Build the TypeScript project
RUN yarn build

# Expose the port
EXPOSE 8000

# Command to start the application
CMD ["yarn", "dev"]
