async function setupTwentyCustomObjects(twentyClient, logger) {
  logger.info('Setting up Twenty CRM custom objects for healthcare...');

  try {
    // Create custom fields for Person object (Patients)
    const patientFields = [
      {
        name: 'dateOfBirth',
        label: 'Date of Birth',
        type: 'DATE',
        description: 'Patient date of birth',
        isRequired: false,
        targetColumnMap: {
          object: 'person'
        }
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'SELECT',
        description: 'Patient gender',
        options: [
          { value: 'male', label: 'Male', color: 'blue' },
          { value: 'female', label: 'Female', color: 'pink' },
          { value: 'other', label: 'Other', color: 'gray' }
        ],
        targetColumnMap: {
          object: 'person'
        }
      },
      {
        name: 'medicalRecordNumber',
        label: 'Medical Record Number',
        type: 'TEXT',
        description: 'Unique medical record identifier',
        targetColumnMap: {
          object: 'person'
        }
      },
      {
        name: 'emergencyContact',
        label: 'Emergency Contact Name',
        type: 'TEXT',
        description: 'Emergency contact person name',
        targetColumnMap: {
          object: 'person'
        }
      },
      {
        name: 'emergencyPhone',
        label: 'Emergency Contact Phone',
        type: 'PHONE',
        description: 'Emergency contact phone number',
        targetColumnMap: {
          object: 'person'
        }
      },
      {
        name: 'medicalConditions',
        label: 'Medical Conditions',
        type: 'MULTI_LINE_TEXT',
        description: 'Existing medical conditions',
        targetColumnMap: {
          object: 'person'
        }
      },
      {
        name: 'medications',
        label: 'Current Medications',
        type: 'MULTI_LINE_TEXT',
        description: 'Current medications',
        targetColumnMap: {
          object: 'person'
        }
      },
      {
        name: 'allergies',
        label: 'Allergies',
        type: 'MULTI_LINE_TEXT',
        description: 'Known allergies',
        targetColumnMap: {
          object: 'person'
        }
      }
    ];

    // Create custom fields for Opportunity object (Appointments)
    const appointmentFields = [
      {
        name: 'appointmentTime',
        label: 'Appointment Time',
        type: 'TEXT',
        description: 'Time of the appointment',
        targetColumnMap: {
          object: 'opportunity'
        }
      },
      {
        name: 'serviceType',
        label: 'Service Type',
        type: 'SELECT',
        description: 'Type of medical service',
        options: [
          { value: 'initial', label: 'Initial Consultation', color: 'blue' },
          { value: 'followup', label: 'Follow-up Consultation', color: 'green' },
          { value: 'telehealth', label: 'Telehealth Consultation', color: 'purple' },
          { value: 'procedure', label: 'Minor Procedure', color: 'red' }
        ],
        targetColumnMap: {
          object: 'opportunity'
        }
      },
      {
        name: 'duration',
        label: 'Duration (minutes)',
        type: 'NUMBER',
        description: 'Appointment duration in minutes',
        defaultValue: 30,
        targetColumnMap: {
          object: 'opportunity'
        }
      },
      {
        name: 'medicalRecordId',
        label: 'Medical Record ID',
        type: 'TEXT',
        description: 'Link to medical record system',
        targetColumnMap: {
          object: 'opportunity'
        }
      }
    ];

    // Create custom fields for Note object (Medical Records)
    const medicalRecordFields = [
      {
        name: 'recordType',
        label: 'Record Type',
        type: 'SELECT',
        description: 'Type of medical record',
        options: [
          { value: 'consultation', label: 'Consultation Notes', color: 'blue' },
          { value: 'prescription', label: 'Prescription', color: 'green' },
          { value: 'test_result', label: 'Test Result', color: 'purple' },
          { value: 'referral', label: 'Referral', color: 'orange' },
          { value: 'other', label: 'Other', color: 'gray' }
        ],
        targetColumnMap: {
          object: 'note'
        }
      },
      {
        name: 'appointmentId',
        label: 'Related Appointment',
        type: 'TEXT',
        description: 'Related appointment ID',
        targetColumnMap: {
          object: 'note'
        }
      },
      {
        name: 'attachments',
        label: 'Attachments',
        type: 'MULTI_LINE_TEXT',
        description: 'List of attached files',
        targetColumnMap: {
          object: 'note'
        }
      }
    ];

    // Create custom activity types
    const activityTypes = [
      {
        type: 'InboundMessage',
        label: 'Patient Message',
        icon: 'IconMessage',
        color: 'blue'
      },
      {
        type: 'OutboundMessage',
        label: 'Practice Message',
        icon: 'IconMessageReply',
        color: 'green'
      },
      {
        type: 'AppointmentReminder',
        label: 'Appointment Reminder',
        icon: 'IconClock',
        color: 'orange'
      }
    ];

    // Create workflows for automation
    const workflows = [
      {
        name: 'Appointment Reminder Workflow',
        trigger: {
          type: 'EVENT',
          event: 'opportunity.created',
          filter: {
            stage: 'Scheduled'
          }
        },
        actions: [
          {
            type: 'CREATE_TASK',
            config: {
              title: 'Send appointment reminder',
              dueAtOffset: '-1d',
              assignToCreator: true
            }
          }
        ],
        isActive: true
      },
      {
        name: 'New Patient Welcome Workflow',
        trigger: {
          type: 'EVENT',
          event: 'person.created',
          filter: {
            position: 'Patient'
          }
        },
        actions: [
          {
            type: 'SEND_EMAIL',
            config: {
              template: 'welcome_patient',
              to: '{{email}}'
            }
          },
          {
            type: 'CREATE_ACTIVITY',
            config: {
              type: 'Note',
              title: 'Welcome email sent',
              body: 'Automated welcome email sent to new patient'
            }
          }
        ],
        isActive: true
      }
    ];

    // Configure views
    const views = [
      {
        name: 'Today\'s Appointments',
        objectType: 'opportunity',
        type: 'TABLE',
        filters: [
          {
            field: 'closeDate',
            operator: 'eq',
            value: 'TODAY'
          },
          {
            field: 'stage',
            operator: 'in',
            value: ['Scheduled', 'Confirmed']
          }
        ],
        sort: {
          field: 'customFields.appointmentTime',
          direction: 'ASC'
        }
      },
      {
        name: 'Active Patients',
        objectType: 'person',
        type: 'TABLE',
        filters: [
          {
            field: 'position',
            operator: 'eq',
            value: 'Patient'
          }
        ],
        sort: {
          field: 'lastName',
          direction: 'ASC'
        }
      }
    ];

    logger.info('Twenty CRM healthcare setup completed successfully');
    
    return {
      patientFields,
      appointmentFields,
      medicalRecordFields,
      activityTypes,
      workflows,
      views
    };
  } catch (error) {
    logger.error('Failed to setup Twenty CRM:', error);
    throw error;
  }
}

module.exports = { setupTwentyCustomObjects };
