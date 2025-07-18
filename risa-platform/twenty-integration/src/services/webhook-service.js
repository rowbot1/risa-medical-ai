const crypto = require('crypto');

class WebhookService {
  constructor({ syncService, logger, webhookSecret }) {
    this.syncService = syncService;
    this.logger = logger;
    this.webhookSecret = webhookSecret;
  }

  // Verify webhook signature
  verifySignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === expectedSignature;
  }

  // Handle Twenty CRM webhooks
  async handleTwentyWebhook(payload, headers) {
    try {
      // Verify signature if provided
      const signature = headers['x-webhook-signature'];
      if (signature && !this.verifySignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      this.logger.info('Received Twenty webhook:', {
        event: payload.event,
        objectType: payload.objectType,
        objectId: payload.objectId
      });

      // Handle different event types
      switch (payload.event) {
        case 'person.created':
        case 'person.updated':
          // Sync person back to Risa Medical if needed
          break;
        
        case 'opportunity.created':
        case 'opportunity.updated':
          // Handle appointment updates
          break;
        
        case 'activity.created':
          // Handle new activities
          break;
        
        default:
          this.logger.warn(`Unhandled Twenty webhook event: ${payload.event}`);
      }
    } catch (error) {
      this.logger.error('Twenty webhook processing failed:', error);
      throw error;
    }
  }

  // Handle Risa Medical webhooks
  async handleRisaWebhook(payload, headers) {
    try {
      // Verify signature if provided
      const signature = headers['x-webhook-signature'];
      if (signature && !this.verifySignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      this.logger.info('Received Risa webhook:', {
        event: payload.event,
        entityType: payload.entityType,
        entityId: payload.entityId
      });

      // Handle different event types
      switch (payload.event) {
        case 'patient.created':
        case 'patient.updated':
          // Trigger patient sync
          await this.syncService.syncPatientById(payload.entityId);
          break;
        
        case 'appointment.created':
        case 'appointment.updated':
          // Trigger appointment sync
          await this.syncService.syncAppointmentById(payload.entityId);
          break;
        
        case 'medical_record.created':
          // Trigger medical record sync
          await this.syncService.syncMedicalRecordById(payload.entityId);
          break;
        
        default:
          this.logger.warn(`Unhandled Risa webhook event: ${payload.event}`);
      }
    } catch (error) {
      this.logger.error('Risa webhook processing failed:', error);
      throw error;
    }
  }
}

module.exports = { WebhookService };
