import express from 'express';
import cors from 'cors';
import flightRoutes from './routes/flights.js';
import bookingRoutes from './routes/bookings.js';
import { initDatabase, testConnection } from './config/initDatabase.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database before starting server
const startServer = async () => {
  try {
    console.log('🚀 Starting Flight Booking Server...\n');
    
    // Initialize database and create tables
    await initDatabase();
    
    // Test connection
    await testConnection();

    // Routes
    app.use('/api/flights', flightRoutes);
    app.use('/api/bookings', bookingRoutes);

    // Health check
    app.get('/api/health', async (req, res) => {
      const dbStatus = await testConnection();
      res.json({ 
        status: 'OK', 
        message: 'Flight Booking API is running',
        database: dbStatus ? 'connected' : 'disconnected'
      });
    });

    // Database connection test endpoint
    app.get('/api/test-db', async (req, res) => {
      try {
        const pool = (await import('./config/database.js')).default;
        const [rows] = await pool.execute('SELECT DATABASE() as current_db, NOW() as server_time');
        res.json({ 
          success: true, 
          message: 'Database connection successful',
          data: rows[0]
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on port ${PORT}`);
      console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔍 DB test: http://localhost:${PORT}/api/test-db\n`);
    });
  } catch (error) {
    console.error('\n❌ Failed to start server:', error.message);
    console.error('Please check your database configuration and ensure MySQL is running');
    console.error('Make sure your .env file has correct database credentials\n');
    process.exit(1);
  }
};

startServer();