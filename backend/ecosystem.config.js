module.exports = {
  apps: [
    {
      name: "psychologist-api",
      script: "./server.js",
      cwd: "./backend",
      env: {
        NODE_ENV: "production",
        PORT: 5050,
        MONGO_URI: "mongodb+srv://admin:admin2025@institution.hdquoso.mongodb.net/institution?retryWrites=true&w=majority&appName=institution"
      }
    }
  ]
};
