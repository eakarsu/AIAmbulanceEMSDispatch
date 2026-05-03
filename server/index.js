const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Load environment variables from project root .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 4000;

// ---------------------------------------------------------------------------
// Security Middleware
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      fontSrc: ["'self'", "cdnjs.cloudflare.com", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));

// ---------------------------------------------------------------------------
// General rate limiter — applied to all API routes
// ---------------------------------------------------------------------------
app.use('/api', generalLimiter);

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/units',          require('./routes/units'));
app.use('/api/calls',          require('./routes/calls'));
app.use('/api/crew',           require('./routes/crew'));
app.use('/api/schedules',      require('./routes/schedules'));
app.use('/api/pcr',            require('./routes/pcr'));
app.use('/api/hospitals',      require('./routes/hospitals'));
app.use('/api/equipment',      require('./routes/equipment'));
app.use('/api/medications',    require('./routes/medications'));
app.use('/api/maintenance',    require('./routes/maintenance'));
app.use('/api/certifications', require('./routes/certifications'));
app.use('/api/billing',        require('./routes/billing'));
app.use('/api/incidents',      require('./routes/incidents'));
app.use('/api/metrics',        require('./routes/metrics'));
app.use('/api/protocols',      require('./routes/protocols'));
app.use('/api/comm-logs',      require('./routes/commLogs'));
app.use('/api/exposure',       require('./routes/exposure'));
app.use('/api/qa-reviews',     require('./routes/qaReviews'));
app.use('/api/mutual-aid',     require('./routes/mutualAid'));
app.use('/api/mutual-aid-agencies', require('./routes/mutualAidAgencies'));
app.use('/api/ai',             require('./routes/ai'));
app.use('/api/dispatch',       require('./routes/dispatch'));
// Dashboard summary shortcut (dispatched from dispatch router at /summary)
// The route is GET /api/dispatch/summary

// ---------------------------------------------------------------------------
// Error-handling middleware
// ---------------------------------------------------------------------------
// 404 – no route matched
app.use((_req, res, _next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.stack || err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`EMS Dispatch Server running on port ${PORT}`);
});

module.exports = app;
