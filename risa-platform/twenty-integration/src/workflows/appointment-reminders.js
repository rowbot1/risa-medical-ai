const { gql } = require('@apollo/client');

class AppointmentReminderWorkflow {
  constructor(twentyClient, logger) {
    this.client = twentyClient;
    this.logger = logger;
  }

  async create() {
    this.logger.info('Creating Appointment Reminder workflows...');

    try {
      // Appointment reminder sequence workflow
      const reminderWorkflow = await this.client.createWorkflow({
        name: 'Appointment Reminder Sequence',
        description: 'Automated reminder sequence for scheduled appointments',
        trigger: {
          type: 'RECORD_CREATED',
          object: 'opportunity',
          conditions: [
            { field: 'stage', operator: 'equals', value: 'Scheduled' }
          ]
        },
        isActive: true
      });

      this.logger.info('Created appointment reminder workflow:', reminderWorkflow);

      // Create workflow steps
      const steps = [
        {
          workflowId: reminderWorkflow.id,
          name: '48 Hour Reminder',
          type: 'WAIT_THEN_EXECUTE',
          config: {
            waitUntil: '48 hours before appointment',
            action: {
              type: 'SEND_EMAIL',
              template: 'appointment_reminder_48h',
              to: '{{person.email}}',
              subject: 'Appointment Reminder - {{appointment.serviceType}}',
              variables: {
                patientName: '{{person.firstName}} {{person.lastName}}',
                appointmentDate: '{{appointment.closeDate}}',
                appointmentTime: '{{appointment.customFields.appointmentTime}}',
                serviceType: '{{appointment.customFields.serviceType}}',
                doctorName: 'Dr. Leanne Sheridan'
              }
            }
          },
          position: 1
        },
        {
          workflowId: reminderWorkflow.id,
          name: '24 Hour Reminder',
          type: 'WAIT_THEN_EXECUTE',
          config: {
            waitUntil: '24 hours before appointment',
            action: {
              type: 'MULTI_ACTION',
              actions: [
                {
                  type: 'SEND_EMAIL',
                  template: 'appointment_reminder_24h',
                  to: '{{person.email}}'
                },
                {
                  type: 'SEND_SMS',
                  template: 'appointment_reminder_sms',
                  to: '{{person.phone}}',
                  condition: 'person.customFields.smsOptIn === true'
                }
              ]
            }
          },
          position: 2
        },
        {
          workflowId: reminderWorkflow.id,
          name: '2 Hour Reminder',
          type: 'WAIT_THEN_EXECUTE',
          config: {
            waitUntil: '2 hours before appointment',
            action: {
              type: 'SEND_SMS',
              template: 'appointment_final_reminder',
              to: '{{person.phone}}',
              message: 'Reminder: Your appointment is in 2 hours. Reply C to confirm or R to reschedule.'
            }
          },
          position: 3
        },
        {
          workflowId: reminderWorkflow.id,
          name: 'Create Follow-up Task',
          type: 'WAIT_THEN_EXECUTE',
          config: {
            waitUntil: '1 day after appointment',
            action: {
              type: 'CREATE_TASK',
              data: {
                title: 'Follow up with {{person.firstName}} {{person.lastName}}',
                body: 'Check on patient recovery and schedule any necessary follow-up appointments.',
                dueAt: '2 days after appointment',
                assigneeId: '{{appointment.ownerId}}',
                targetableType: 'Person',
                targetableId: '{{person.id}}'
              }
            }
          },
          position: 4
        }
      ];

      // Create each workflow step
      for (const step of steps) {
        await this.createWorkflowStep(step);
        this.logger.info(`Created workflow step: ${step.name}`);
      }

      // Create no-show workflow
      await this.createNoShowWorkflow();

      // Create appointment confirmation workflow
      await this.createConfirmationWorkflow();

      this.logger.info('Appointment reminder workflows setup completed');
      return reminderWorkflow;
    } catch (error) {
      this.logger.error('Failed to create appointment reminder workflows:', error);
      throw error;
    }
  }

  async createWorkflowStep(stepData) {
    const mutation = gql`
      mutation CreateWorkflowStep($data: WorkflowStepCreateInput!) {
        createWorkflowStep(data: $data) {
          id
          name
          type
          position
        }
      }
    `;

    try {
      const result = await this.client.client.mutate({
        mutation,
        variables: { data: stepData }
      });
      return result.data.createWorkflowStep;
    } catch (error) {
      this.logger.error('Failed to create workflow step:', error);
      throw error;
    }
  }

  async createNoShowWorkflow() {
    const noShowWorkflow = await this.client.createWorkflow({
      name: 'No-Show Follow-up',
      description: 'Handle patients who miss appointments',
      trigger: {
        type: 'FIELD_UPDATE',
        object: 'opportunity',
        conditions: [
          { field: 'stage', oldValue: 'Scheduled', newValue: 'No-show' }
        ]
      },
      isActive: true
    });

    const noShowSteps = [
      {
        workflowId: noShowWorkflow.id,
        name: 'Send No-Show Email',
        type: 'IMMEDIATE',
        config: {
          action: {
            type: 'SEND_EMAIL',
            template: 'appointment_no_show',
            to: '{{person.email}}',
            subject: 'We Missed You Today'
          }
        },
        position: 1
      },
      {
        workflowId: noShowWorkflow.id,
        name: 'Create Reschedule Task',
        type: 'IMMEDIATE',
        config: {
          action: {
            type: 'CREATE_TASK',
            data: {
              title: 'Contact {{person.firstName}} to reschedule missed appointment',
              body: 'Patient missed appointment on {{appointment.closeDate}}. Please contact to reschedule.',
              dueAt: 'tomorrow',
              priority: 'HIGH'
            }
          }
        },
        position: 2
      }
    ];

    for (const step of noShowSteps) {
      await this.createWorkflowStep(step);
    }

    return noShowWorkflow;
  }

  async createConfirmationWorkflow() {
    const confirmationWorkflow = await this.client.createWorkflow({
      name: 'Appointment Confirmation',
      description: 'Send confirmation when appointment is booked',
      trigger: {
        type: 'RECORD_CREATED',
        object: 'opportunity',
        conditions: [
          { field: 'stage', operator: 'equals', value: 'Scheduled' }
        ]
      },
      isActive: true
    });

    await this.createWorkflowStep({
      workflowId: confirmationWorkflow.id,
      name: 'Send Confirmation',
      type: 'IMMEDIATE',
      config: {
        action: {
          type: 'MULTI_ACTION',
          actions: [
            {
              type: 'SEND_EMAIL',
              template: 'appointment_confirmation',
              to: '{{person.email}}',
              attachments: ['appointment_details.pdf']
            },
            {
              type: 'CREATE_ACTIVITY',
              data: {
                type: 'Note',
                title: 'Appointment Confirmed',
                body: 'Appointment confirmation sent to patient'
              }
            }
          ]
        }
      },
      position: 1
    });

    return confirmationWorkflow;
  }

  // Helper methods for workflow management
  async pauseWorkflow(workflowId) {
    const mutation = gql`
      mutation UpdateWorkflow($id: ID!, $data: WorkflowUpdateInput!) {
        updateWorkflow(id: $id, data: $data) {
          id
          isActive
        }
      }
    `;

    try {
      const result = await this.client.client.mutate({
        mutation,
        variables: { 
          id: workflowId, 
          data: { isActive: false } 
        }
      });
      return result.data.updateWorkflow;
    } catch (error) {
      this.logger.error('Failed to pause workflow:', error);
      throw error;
    }
  }

  async resumeWorkflow(workflowId) {
    const mutation = gql`
      mutation UpdateWorkflow($id: ID!, $data: WorkflowUpdateInput!) {
        updateWorkflow(id: $id, data: $data) {
          id
          isActive
        }
      }
    `;

    try {
      const result = await this.client.client.mutate({
        mutation,
        variables: { 
          id: workflowId, 
          data: { isActive: true } 
        }
      });
      return result.data.updateWorkflow;
    } catch (error) {
      this.logger.error('Failed to resume workflow:', error);
      throw error;
    }
  }

  async getWorkflowStats() {
    const query = gql`
      query GetWorkflowStats {
        workflows {
          edges {
            node {
              id
              name
              isActive
              executionCount
              lastExecutedAt
              successRate
            }
          }
        }
      }
    `;

    try {
      const result = await this.client.client.query({ query });
      return result.data.workflows.edges.map(edge => edge.node);
    } catch (error) {
      this.logger.error('Failed to get workflow stats:', error);
      throw error;
    }
  }
}

module.exports = { AppointmentReminderWorkflow };
