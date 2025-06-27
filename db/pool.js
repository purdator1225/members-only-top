// db.js
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  database: process.env.DATABASE_DB_NAME,
  password: process.env.DATABASE_DB_PASSWORD, // optional if not using password auth
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;
