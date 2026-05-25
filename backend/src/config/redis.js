const Redis = require("ioredis");

let client;

const connectRedis = () => {
  client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  client.on("connect", () => console.log("✅ Redis connected"));
  client.on("error", (err) => console.error("❌ Redis error:", err.message));

  return client;
};

const getRedis = () => {
  if (!client) throw new Error("Redis not initialized. Call connectRedis() first.");
  return client;
};

module.exports = connectRedis;
module.exports.getRedis = getRedis;
