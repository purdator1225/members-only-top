const { Pool } = require("pg");

const pool = new Pool({
  database: "top_members_only",
  host: "localhost",
  user: "brianooi",
});

console.log(pool);

module.exports = pool;
