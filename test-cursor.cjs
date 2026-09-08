const { Pool } = require('pg');
const Cursor = require('pg-cursor');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

(async () => {
  const client = await pool.connect();
  const cursor = client.query(new Cursor('SELECT * FROM users'));
  
  cursor.read(100, (err, rows) => {
    if (err) throw err;
    console.log(rows);
    cursor.close(() => {
      client.release();
      pool.end();
    });
  });
})();
