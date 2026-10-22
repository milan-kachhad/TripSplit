import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ping, initDatabase } from './config/db.js';
import authRoutes from './routes/auth.js';
import tripRoutes from './routes/trips.js';
import authMiddleware from './middleware/auth.js';
import { getDashboard } from './controllers/tripController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({ origin: true, credentials: true }));

// JSON Body Parser Middleware
app.use(express.json());

// Health Check Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'TripSplit API', time: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', database: 'MySQL', time: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.get('/api/dashboard', authMiddleware, getDashboard);

// 404 Route Not Found Handler
app.use((req, res, _next) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Error-Handling Middleware Fallback
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err.stack || err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.message,
  });
});

// Start Server & Check DB Connection
async function startServer() {
  try {
    const isConnected = await ping();
    if (isConnected) {
      await initDatabase();
    } else {
      console.error('[Server Warning] MySQL ping failed on startup. Please ensure your MySQL server (e.g. XAMPP) is running.');
    }

    app.listen(PORT, () => {
      console.log(`TripSplit server running on http://localhost:${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error('[Server Fatal] Failed to start server:', err);
    process.exit(1);
  }
}

// Start if executed directly
startServer();

export default app;
