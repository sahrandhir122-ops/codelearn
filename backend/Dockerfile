FROM node:18-alpine

# Install ffmpeg (needed by fluent-ffmpeg)
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy the rest of the source code
COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
