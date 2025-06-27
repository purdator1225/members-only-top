// db.js
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD, // optional if not using password auth
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;
