const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const { cors } = require('hono/cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const emergencyRoutes = require('./routes/emergency');
const complaintRoutes = require('./routes/complaint');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

// Create Hono app
const app = new Hono();

// Middleware
app.use('/*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));

// Global middleware for JSON parsing
app.use('/*', async (c, next) => {
  if (c.req.header('content-type')?.includes('application/json')) {
    try {
      const body = await c.req.json();
      c.set('body', body);
    } catch (error) {
      console.error('JSON parsing error:', error);
    }
  }
  await next();
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/emergency', emergencyRoutes);
app.route('/api/complaint', complaintRoutes);
app.route('/api/user', userRoutes);
app.route('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'OK', 
    message: 'SafeZone API is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({ 
    message: 'SafeZone Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      emergency: '/api/emergency',
      complaint: '/api/complaint',
      user: '/api/user',
      admin: '/api/admin'
    }
  });
});

// Error handling middleware
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ 
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong'
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', message: 'Route not found' }, 404);
});

const port = process.env.PORT || 3001;

console.log(`🚀 SafeZone Backend starting on port ${port}`);
console.log(`📊 Health check: http://localhost:${port}/api/health`);

serve({
  fetch: app.fetch,
  port: port,
});
