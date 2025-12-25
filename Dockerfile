# Use official Node.js LTS (Long Term Support) image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy the rest of the application code
# Note: client/ folder is excluded via .dockerignore as it's deployed separately
COPY . .

# Expose port (Cloud Run defaults to 8080, but we can configure it)
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
