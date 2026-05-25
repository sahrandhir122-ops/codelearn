FROM node:18-alpine

# Install ffmpeg (needed by fluent-ffmpeg)
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies (legacy peer deps to avoid conflicts)
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
