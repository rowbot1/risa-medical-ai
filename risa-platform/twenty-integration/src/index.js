const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const winston = require('winston');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Import services
const { TwentyClient } = require('./services/twenty-client');
const { RisaMedicalClient } = require('./services/risa-medical-client');
const { SyncService } = require('./services/sync-service');
const { WebhookService } = require('./services/webhook-service');
const { QueueService } = require('./services/queue-service');
const { setupTwentyCustomObjects } = require('./setup/twenty-setup');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Initialize services
let twentyClient;
let risaClient;
let syncService;
let webhookService;
let queueService;

async function initializeServices() {
  try {
    logger.info('Initializing integration services...');

    // Initialize clients
    twentyClient = new TwentyClient({
      apiUrl: process.env.TWENTY_API_URL,
      apiKey: process.env.TWENTY_API_KEY
    });

    risaClient = new RisaMedicalClient({
      apiUrl: process.env.RISA_API_URL,
      dbPath: process.env.RISA_DB_PATH
    });

    // Initialize queue service
    queueService = new QueueService({
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    // Initialize sync service
    syncService = new SyncService({
      twentyClient,
      risaClient,
      queueService,
      logger
    });

    // Initialize webhook service
    webhookService = new WebhookService({
      syncService,
      logger,
      webhookSecret: process.env.WEBHOOK_SECRET
    });

    // Set up Twenty CRM custom objects for healthcare
    await setupTwentyCustomObjects(twentyClient, logger);

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// API Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      twenty: twentyClient?.isConnected() || false,
      risa: risaClient?.isConnected() || false,
      queue: queueService?.isConnected() || false
    }
  });
});

// Manual sync endpoints
app.post('/sync/patients', async (req, res) => {
  try {
    const result = await syncService.syncPatients();
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Patient sync failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/sync/appointments', async (req, res) => {
  try {
    const result = await syncService.syncAppointments();
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Appointment sync failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/sync/medical-records', async (req, res) => {
  try {
    const result = await syncService.syncMedicalRecords();
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Medical records sync failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Full sync endpoint
app.post('/sync/full', async (req, res) => {
  try {
    const result = await syncService.performFullSync();
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Full sync failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoints
app.post('/webhooks/twenty', async (req, res) => {
  try {
    await webhookService.handleTwentyWebhook(req.body, req.headers);
    res.json({ success: true });
  } catch (error) {
    logger.error('Twenty webhook processing failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhooks/risa', async (req, res) => {
  try {
    await webhookService.handleRisaWebhook(req.body, req.headers);
    res.json({ success: true });
  } catch (error) {
    logger.error('Risa webhook processing failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Queue status endpoint
app.get('/queue/status', async (req, res) => {
  try {
    const status = await queueService.getQueueStatus();
    res.json(status);
  } catch (error) {
    logger.error('Failed to get queue status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Integration statistics endpoint
app.get('/stats', async (req, res) => {
  try {
    const stats = await syncService.getStatistics();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Configure scheduled sync tasks
function setupScheduledTasks() {
  const syncInterval = process.env.SYNC_INTERVAL_MINUTES || 5;
  
  // Schedule regular sync
  cron.schedule(`*/${syncInterval} * * * *`, async () => {
    logger.info('Starting scheduled sync...');
    try {
      await syncService.performIncrementalSync();
      logger.info('Scheduled sync completed successfully');
    } catch (error) {
      logger.error('Scheduled sync failed:', error);
    }
  });

  // Schedule daily full sync at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting daily full sync...');
    try {
      await syncService.performFullSync();
      logger.info('Daily full sync completed successfully');
    } catch (error) {
      logger.error('Daily full sync failed:', error);
    }
  });

  // Schedule hourly health check
  cron.schedule('0 * * * *', async () => {
    logger.info('Performing hourly health check...');
    try {
      await syncService.performHealthCheck();
    } catch (error) {
      logger.error('Health check failed:', error);
    }
  });

  logger.info('Scheduled tasks configured');
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function startServer() {
  try {
    // Initialize services
    await initializeServices();

    // Set up scheduled tasks
    if (process.env.ENABLE_REALTIME_SYNC === 'true') {
      setupScheduledTasks();
    }

    // Perform initial sync
    if (process.env.PERFORM_INITIAL_SYNC === 'true') {
      logger.info('Performing initial sync...');
      await syncService.performFullSync();
    }

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Integration service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Sync interval: ${process.env.SYNC_INTERVAL_MINUTES} minutes`);
      logger.info(`Realtime sync: ${process.env.ENABLE_REALTIME_SYNC}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  // Close connections
  if (queueService) await queueService.close();
  if (twentyClient) await twentyClient.close();
  if (risaClient) await risaClient.close();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  
  // Close connections
  if (queueService) await queueService.close();
  if (twentyClient) await twentyClient.close();
  if (risaClient) await risaClient.close();
  
  process.exit(0);
});

// Start the server
startServer();
