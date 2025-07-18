const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');

class SyncService {
  constructor({ twentyClient, risaClient, queueService, logger }) {
    this.twentyClient = twentyClient;
    this.risaClient = risaClient;
    this.queueService = queueService;
    this.logger = logger;
    
    // Sync mapping cache
    this.syncMap = new Map();
    this.lastSyncTimes = {};
  }

  // Full system sync
  async performFullSync() {
    this.logger.info('Starting full system sync...');
    const results = {
      patients: { synced: 0, errors: 0 },
      appointments: { synced: 0, errors: 0 },
      medicalRecords: { synced: 0, errors: 0 },
      messages: { synced: 0, errors: 0 },
      tasks: { synced: 0, errors: 0 }
    };

    try {
      // Sync patients first (as other entities depend on them)
      const patientResult = await this.syncPatients();
      results.patients = patientResult;

      // Sync appointments
      const appointmentResult = await this.syncAppointments();
      results.appointments = appointmentResult;

      // Sync medical records
      const recordResult = await this.syncMedicalRecords();
      results.medicalRecords = recordResult;

      // Sync messages
      const messageResult = await this.syncMessages();
      results.messages = messageResult;

      // Create follow-up tasks
      const taskResult = await this.createFollowUpTasks();
      results.tasks = taskResult;

      this.logger.info('Full sync completed', results);
      return results;
    } catch (error) {
      this.logger.error('Full sync failed:', error);
      throw error;
    }
  }

  // Helper Methods
  mapAppointmentStatus(status) {
    const statusMap = {
      'pending': 'Scheduled',
      'confirmed': 'Confirmed',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || 'Scheduled';
  }

  getServicePrice(serviceType) {
    const priceMap = {
      'Initial Consultation': 180,
      'Follow-up Consultation': 120,
      'Telehealth Consultation': 150,
      'Minor Procedure': 250
    };
    return priceMap[serviceType] || 180;
  }

  async findPatientInTwenty(email) {
    try {
      const patients = await this.twentyClient.searchPatients(email);
      return patients.find(p => p.email === email);
    } catch (error) {
      this.logger.error('Failed to find patient in Twenty:', error);
      return null;
    }
  }

  async findAppointmentInTwenty(appointmentId) {
    // Simplified implementation - in production would use actual search
    return null;
  }

  // Perform health check
  async performHealthCheck() {
    const results = {
      twenty: false,
      risa: false,
      queue: false
    };

    try {
      await this.twentyClient.testConnection();
      results.twenty = true;
    } catch (error) {
      this.logger.error('Twenty health check failed:', error);
    }

    try {
      await this.risaClient.getStatistics();
      results.risa = true;
    } catch (error) {
      this.logger.error('Risa health check failed:', error);
    }

    results.queue = this.queueService?.isConnected() || false;

    return results;
  }

  // Get sync statistics
  async getStatistics() {
    const stats = {
      lastSync: this.lastSyncTimes,
      mappings: {
        patients: 0,
        appointments: 0
      },
      risaStats: {},
      twentyStats: {}
    };

    // Count mappings
    for (const [key] of this.syncMap) {
      if (key.startsWith('patient_')) stats.mappings.patients++;
      if (key.startsWith('appointment_')) stats.mappings.appointments++;
    }

    // Get Risa stats
    try {
      stats.risaStats = await this.risaClient.getStatistics();
    } catch (error) {
      this.logger.error('Failed to get Risa statistics:', error);
    }

    return stats;
  }

  // Incremental sync
  async performIncrementalSync() {
    // Implementation would be similar to performFullSync but with date filtering
    return this.performFullSync();
  }

  // Sync patients
  async syncPatients() {
    const results = { synced: 0, errors: 0, created: 0, updated: 0 };
    
    try {
      this.logger.info('Starting patient sync...');
      
      // Fetch all patients from Risa Medical
      const risaPatients = await this.risaClient.getAllPatients();
      this.logger.info(`Found ${risaPatients.length} patients in Risa Medical`);
      
      for (const patient of risaPatients) {
        try {
          // Check if patient already exists in Twenty
          const existingPatient = await this.findPatientInTwenty(patient.email);
          
          if (existingPatient) {
            // Update existing patient
            const updates = {
              firstName: patient.first_name,
              lastName: patient.last_name,
              phone: patient.phone,
              customFields: {
                dateOfBirth: patient.date_of_birth,
                gender: patient.gender,
                medicalRecordNumber: patient.id.toString(),
                emergencyContact: patient.emergency_contact_name,
                emergencyPhone: patient.emergency_contact_phone
              }
            };
            
            await this.twentyClient.updatePatient(existingPatient.id, updates);
            this.syncMap.set(`patient_${patient.id}`, existingPatient.id);
            results.updated++;
            this.logger.info(`Updated patient: ${patient.email}`);
          } else {
            // Create new patient in Twenty
            const patientData = {
              firstName: patient.first_name,
              lastName: patient.last_name,
              email: patient.email,
              phone: patient.phone,
              dateOfBirth: patient.date_of_birth,
              gender: patient.gender,
              id: patient.id,
              emergencyContactName: patient.emergency_contact_name,
              emergencyContactPhone: patient.emergency_contact_phone
            };
            
            const newPatient = await this.twentyClient.createPatient(patientData);
            this.syncMap.set(`patient_${patient.id}`, newPatient.id);
            results.created++;
            this.logger.info(`Created patient: ${patient.email}`);
          }
          
          results.synced++;
        } catch (error) {
          this.logger.error(`Failed to sync patient ${patient.email}:`, error);
          results.errors++;
        }
      }
      
      this.lastSyncTimes.patients = new Date().toISOString();
      this.logger.info('Patient sync completed', results);
    } catch (error) {
      this.logger.error('Patient sync failed:', error);
      throw error;
    }
    
    return results;
  }

  // Sync appointments
  async syncAppointments() {
    const results = { synced: 0, errors: 0, created: 0, updated: 0 };
    
    try {
      this.logger.info('Starting appointment sync...');
      
      // Fetch all appointments from Risa Medical
      const risaAppointments = await this.risaClient.getAllAppointments();
      this.logger.info(`Found ${risaAppointments.length} appointments in Risa Medical`);
      
      for (const appointment of risaAppointments) {
        try {
          // Get patient Twenty ID from sync map
          const patientTwentyId = this.syncMap.get(`patient_${appointment.patient_id}`);
          if (!patientTwentyId) {
            this.logger.warn(`Patient ${appointment.patient_id} not found in sync map, skipping appointment`);
            continue;
          }
          
          // Check if appointment already exists
          const existingAppointment = await this.findAppointmentInTwenty(appointment.id);
          
          const appointmentData = {
            id: appointment.id,
            patientName: `${appointment.patient_first_name} ${appointment.patient_last_name}`,
            patientId: patientTwentyId,
            serviceType: appointment.service_type || 'General Consultation',
            appointmentDate: appointment.appointment_date,
            appointmentTime: appointment.appointment_time,
            status: this.mapAppointmentStatus(appointment.status),
            notes: appointment.notes,
            price: this.getServicePrice(appointment.service_type),
            duration: 30
          };
          
          if (existingAppointment) {
            // Update existing appointment
            const updates = {
              name: `${appointmentData.serviceType} - ${appointmentData.patientName}`,
              stage: appointmentData.status,
              closeDate: appointmentData.appointmentDate,
              amount: appointmentData.price,
              customFields: {
                appointmentTime: appointmentData.appointmentTime,
                serviceType: appointmentData.serviceType,
                duration: appointmentData.duration,
                notes: appointmentData.notes
              }
            };
            
            await this.twentyClient.updateAppointment(existingAppointment.id, updates);
            results.updated++;
          } else {
            // Create new appointment
            const newAppointment = await this.twentyClient.createAppointment(appointmentData);
            this.syncMap.set(`appointment_${appointment.id}`, newAppointment.id);
            results.created++;
          }
          
          results.synced++;
        } catch (error) {
          this.logger.error(`Failed to sync appointment ${appointment.id}:`, error);
          results.errors++;
        }
      }
      
      this.lastSyncTimes.appointments = new Date().toISOString();
      this.logger.info('Appointment sync completed', results);
    } catch (error) {
      this.logger.error('Appointment sync failed:', error);
      throw error;
    }
    
    return results;
  }

  // Sync medical records
  async syncMedicalRecords() {
    const results = { synced: 0, errors: 0, created: 0 };
    
    try {
      this.logger.info('Starting medical records sync...');
      
      // Fetch all medical records
      const risaRecords = await this.risaClient.getAllMedicalRecords();
      this.logger.info(`Found ${risaRecords.length} medical records in Risa Medical`);
      
      for (const record of risaRecords) {
        try {
          // Get patient Twenty ID
          const patientTwentyId = this.syncMap.get(`patient_${record.patient_id}`);
          if (!patientTwentyId) {
            this.logger.warn(`Patient ${record.patient_id} not found in sync map, skipping record`);
            continue;
          }
          
          // Create medical record as a note in Twenty
          const recordData = {
            title: record.record_type || 'Medical Record',
            content: record.content || '',
            patientId: patientTwentyId,
            recordType: record.record_type,
            appointmentId: record.appointment_id,
            attachments: []
          };
          
          await this.twentyClient.createMedicalRecord(recordData);
          results.created++;
          results.synced++;
          
        } catch (error) {
          this.logger.error(`Failed to sync medical record ${record.id}:`, error);
          results.errors++;
        }
      }
      
      this.lastSyncTimes.medicalRecords = new Date().toISOString();
      this.logger.info('Medical records sync completed', results);
    } catch (error) {
      this.logger.error('Medical records sync failed:', error);
      throw error;
    }
    
    return results;
  }

  // Sync messages
  async syncMessages() {
    const results = { synced: 0, errors: 0, created: 0 };
    
    try {
      this.logger.info('Starting messages sync...');
      
      // Fetch all messages
      const risaMessages = await this.risaClient.getAllMessages();
      this.logger.info(`Found ${risaMessages.length} messages in Risa Medical`);
      
      for (const message of risaMessages) {
        try {
          // Get patient Twenty ID
          const patientTwentyId = this.syncMap.get(`patient_${message.patient_id}`);
          if (!patientTwentyId) {
            this.logger.warn(`Patient ${message.patient_id} not found in sync map, skipping message`);
            continue;
          }
          
          // Create message as an activity in Twenty
          const activityData = {
            title: message.subject || 'Patient Message',
            body: message.message || '',
            type: 'Message',
            targetableType: 'Person',
            targetableId: patientTwentyId,
            authorId: message.sender === 'patient' ? patientTwentyId : null
          };
          
          await this.twentyClient.createActivity(activityData);
          results.created++;
          results.synced++;
          
        } catch (error) {
          this.logger.error(`Failed to sync message ${message.id}:`, error);
          results.errors++;
        }
      }
      
      this.lastSyncTimes.messages = new Date().toISOString();
      this.logger.info('Messages sync completed', results);
    } catch (error) {
      this.logger.error('Messages sync failed:', error);
      throw error;
    }
    
    return results;
  }

  // Create follow-up tasks
  async createFollowUpTasks() {
    const results = { synced: 0, errors: 0, created: 0 };
    
    try {
      this.logger.info('Creating follow-up tasks...');
      
      // Get upcoming appointments
      const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
      const nextWeek = moment().add(7, 'days').format('YYYY-MM-DD');
      
      const upcomingAppointments = await this.risaClient.getAppointmentsByDateRange(tomorrow, nextWeek);
      
      for (const appointment of upcomingAppointments) {
        try {
          const patientTwentyId = this.syncMap.get(`patient_${appointment.patient_id}`);
          if (!patientTwentyId) continue;
          
          // Create reminder task
          const taskData = {
            title: `Appointment Reminder: ${appointment.patient_first_name} ${appointment.patient_last_name}`,
            body: `Upcoming ${appointment.service_type} on ${appointment.appointment_date} at ${appointment.appointment_time}`,
            dueAt: moment(`${appointment.appointment_date} ${appointment.appointment_time}`).subtract(1, 'day').toISOString(),
            assigneeId: null,
            targetableType: 'Person',
            targetableId: patientTwentyId
          };
          
          await this.twentyClient.createTask(taskData);
          results.created++;
          results.synced++;
          
        } catch (error) {
          this.logger.error(`Failed to create task for appointment ${appointment.id}:`, error);
          results.errors++;
        }
      }
      
      this.logger.info('Follow-up tasks created', results);
    } catch (error) {
      this.logger.error('Failed to create follow-up tasks:', error);
      throw error;
    }
    
    return results;
  }
}

module.exports = { SyncService };
