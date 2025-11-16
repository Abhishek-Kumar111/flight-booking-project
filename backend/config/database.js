import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'flight_booking2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection on import
pool.getConnection()
  .then(connection => {
    console.log('✅ Database pool connection established');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database pool connection error:', err.message);
    console.error('Please check your database credentials in .env file');
  });

export default pool;