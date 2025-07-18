const Bull = require('bull');
const Redis = require('ioredis');

class QueueService {
  constructor({ redisUrl }) {
    this.redisUrl = redisUrl;
    this.queues = {};
    this.redis = null;
    this.connected = false;
    
    // Initialize Redis connection
    this.initializeRedis();
    
    // Initialize queues
    this.initializeQueues();
  }

  initializeRedis() {
    try {
      this.redis = new Redis(this.redisUrl);
      
      this.redis.on('connect', () => {
        console.log('Connected to Redis');
        this.connected = true;
      });
      
      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error);
        this.connected = false;
      });
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
    }
  }

  initializeQueues() {
    // Sync queue for patient/appointment sync jobs
    this.queues.sync = new Bull('sync-queue', this.redisUrl);
    
    // Email queue for notifications
    this.queues.email = new Bull('email-queue', this.redisUrl);
    
    // Webhook queue for processing webhooks
    this.queues.webhook = new Bull('webhook-queue', this.redisUrl);
    
    // Task queue for follow-up tasks
    this.queues.task = new Bull('task-queue', this.redisUrl);
  }

  isConnected() {
    return this.connected;
  }

  // Add sync job
  async addSyncJob(type, data, options = {}) {
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    };
    
    return await this.queues.sync.add(type, data, {
      ...defaultOptions,
      ...options
    });
  }

  // Add email job
  async addEmailJob(data, options = {}) {
    const defaultOptions = {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    };
    
    return await this.queues.email.add('send-email', data, {
      ...defaultOptions,
      ...options
    });
  }

  // Add webhook processing job
  async addWebhookJob(data, options = {}) {
    const defaultOptions = {
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: false
    };
    
    return await this.queues.webhook.add('process-webhook', data, {
      ...defaultOptions,
      ...options
    });
  }

  // Add task job
  async addTaskJob(data, options = {}) {
    return await this.queues.task.add('create-task', data, options);
  }

  // Process sync jobs
  processSyncJobs(processor) {
    this.queues.sync.process(async (job) => {
      console.log(`Processing sync job: ${job.name}`, job.data);
      return await processor(job);
    });
  }

  // Process email jobs
  processEmailJobs(processor) {
    this.queues.email.process('send-email', async (job) => {
      console.log('Processing email job:', job.data);
      return await processor(job);
    });
  }

  // Process webhook jobs
  processWebhookJobs(processor) {
    this.queues.webhook.process('process-webhook', async (job) => {
      console.log('Processing webhook job:', job.data);
      return await processor(job);
    });
  }

  // Process task jobs
  processTaskJobs(processor) {
    this.queues.task.process('create-task', async (job) => {
      console.log('Processing task job:', job.data);
      return await processor(job);
    });
  }

  // Get queue statistics
  async getQueueStatus() {
    const status = {};
    
    for (const [name, queue] of Object.entries(this.queues)) {
      const jobCounts = await queue.getJobCounts();
      const isPaused = await queue.isPaused();
      
      status[name] = {
        name,
        isPaused,
        jobCounts,
        health: {
          active: jobCounts.active || 0,
          waiting: jobCounts.waiting || 0,
          completed: jobCounts.completed || 0,
          failed: jobCounts.failed || 0,
          delayed: jobCounts.delayed || 0
        }
      };
    }
    
    return status;
  }

  // Clean old jobs
  async cleanQueues(grace = 3600 * 1000) {
    const results = {};
    
    for (const [name, queue] of Object.entries(this.queues)) {
      const completed = await queue.clean(grace, 'completed');
      const failed = await queue.clean(grace * 24, 'failed'); // Keep failed jobs longer
      
      results[name] = {
        completed,
        failed
      };
    }
    
    return results;
  }

  // Pause/resume queues
  async pauseQueue(queueName) {
    if (this.queues[queueName]) {
      await this.queues[queueName].pause();
    }
  }

  async resumeQueue(queueName) {
    if (this.queues[queueName]) {
      await this.queues[queueName].resume();
    }
  }

  // Close connections
  async close() {
    try {
      // Close all queues
      for (const queue of Object.values(this.queues)) {
        await queue.close();
      }
      
      // Close Redis connection
      if (this.redis) {
        await this.redis.quit();
      }
      
      this.connected = false;
    } catch (error) {
      console.error('Error closing queue service:', error);
    }
  }
}

module.exports = { QueueService };
