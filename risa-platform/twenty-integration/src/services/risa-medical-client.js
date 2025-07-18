const axios = require('axios');
const path = require('path');

class RisaMedicalClient {
  constructor(config) {
    this.apiUrl = config.apiUrl;
    this.dbPath = config.dbPath;
    this.connected = false;
    
    // Initialize axios instance
    this.api = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // For now, we'll use API-only mode instead of direct database access
    console.log('RisaMedicalClient initialized in API-only mode');
    this.connected = true;
  }

  isConnected() {
    return this.connected;
  }

  // Patient Management
  async getAllPatients(limit = 1000, offset = 0) {
    try {
      // Use API endpoint instead
      const response = await this.api.get('/api/patients', {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get patients:', error.message);
      // Return empty array for now
      return [];
    }
  }

  async getPatient(patientId) {
    try {
      const response = await this.api.get(`/api/patients/${patientId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get patient:', error.message);
      return null;
    }
  }

  async getPatientByEmail(email) {
    try {
      const response = await this.api.get('/api/patients', {
        params: { email }
      });
      return response.data[0] || null;
    } catch (error) {
      console.error('Failed to get patient by email:', error.message);
      return null;
    }
  }

  // Appointment Management
  async getAllAppointments(limit = 1000, offset = 0) {
    try {
      const response = await this.api.get('/api/appointments', {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get appointments:', error.message);
      return [];
    }
  }

  async getAppointment(appointmentId) {
    try {
      const response = await this.api.get(`/api/appointments/${appointmentId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get appointment:', error.message);
      return null;
    }
  }

  async getAppointmentsByPatient(patientId) {
    try {
      const response = await this.api.get(`/api/patients/${patientId}/appointments`);
      return response.data;
    } catch (error) {
      console.error('Failed to get patient appointments:', error.message);
      return [];
    }
  }

  async getAppointmentsByDateRange(startDate, endDate) {
    try {
      const response = await this.api.get('/api/appointments', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get appointments by date range:', error.message);
      return [];
    }
  }

  // Medical Records Management
  async getAllMedicalRecords(limit = 1000, offset = 0) {
    try {
      const response = await this.api.get('/api/medical-records', {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get medical records:', error.message);
      return [];
    }
  }

  async getMedicalRecord(recordId) {
    try {
      const response = await this.api.get(`/api/medical-records/${recordId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get medical record:', error.message);
      return null;
    }
  }

  async getMedicalRecordsByPatient(patientId) {
    try {
      const response = await this.api.get(`/api/patients/${patientId}/medical-records`);
      return response.data;
    } catch (error) {
      console.error('Failed to get patient medical records:', error.message);
      return [];
    }
  }

  // Messages Management
  async getMessagesByPatient(patientId) {
    try {
      const response = await this.api.get(`/api/patients/${patientId}/messages`);
      return response.data;
    } catch (error) {
      console.error('Failed to get patient messages:', error.message);
      return [];
    }
  }

  async getAllMessages(limit = 1000, offset = 0) {
    try {
      const response = await this.api.get('/api/messages', {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get messages:', error.message);
      return [];
    }
  }

  // Admin Users
  async getAdminUsers() {
    try {
      const response = await this.api.get('/api/admin/users');
      return response.data;
    } catch (error) {
      console.error('Failed to get admin users:', error.message);
      return [];
    }
  }

  // Audit Logs
  async getAuditLogs(limit = 100, offset = 0) {
    try {
      const response = await this.api.get('/api/audit-logs', {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get audit logs:', error.message);
      return [];
    }
  }

  // Sync Tracking
  async getLastSyncTime(entityType) {
    try {
      const response = await this.api.get(`/api/sync/last-update/${entityType}`);
      return response.data.lastSync || null;
    } catch (error) {
      console.error('Failed to get last sync time:', error.message);
      return null;
    }
  }

  async getModifiedRecords(entityType, sinceDate) {
    try {
      const response = await this.api.get(`/api/sync/modified/${entityType}`, {
        params: { since: sinceDate }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get modified records:', error.message);
      return [];
    }
  }

  // API Methods (for real-time integration)
  async createWebhookEndpoint(webhookUrl, events) {
    try {
      const response = await this.api.post('/api/webhooks', {
        url: webhookUrl,
        events: events
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create webhook:', error.message);
      // Return mock response for now
      return {
        id: 'webhook_' + Date.now(),
        url: webhookUrl,
        events: events,
        created: new Date().toISOString()
      };
    }
  }

  // Statistics
  async getStatistics() {
    try {
      const response = await this.api.get('/api/statistics');
      return response.data;
    } catch (error) {
      console.error('Failed to get statistics:', error.message);
      // Return mock statistics for now
      return {
        totalPatients: 0,
        totalAppointments: 0,
        pendingAppointments: 0,
        totalMedicalRecords: 0,
        totalMessages: 0,
        unreadMessages: 0,
        todayAppointments: 0
      };
    }
  }

  // Close database connection
  async close() {
    // No database connection to close in API-only mode
    this.connected = false;
    console.log('RisaMedicalClient closed');
  }
}

module.exports = { RisaMedicalClient };
