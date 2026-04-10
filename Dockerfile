FROM node:20-alpine

WORKDIR /app

# Copy all files
COPY . .

# Install all dependencies (including dev) to build and run
RUN npm install

# Build the frontend
RUN npm run build

# Install tsx globally for the runtime
RUN npm install -g tsx

# Expose the port
EXPOSE 3000

# Start the application directly with tsx
CMD ["tsx", "server.ts"]
