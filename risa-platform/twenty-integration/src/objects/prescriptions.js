const { gql } = require('@apollo/client');

class PrescriptionObject {
  constructor(twentyClient, logger) {
    this.client = twentyClient;
    this.logger = logger;
  }

  async create() {
    this.logger.info('Creating Prescription custom object...');

    try {
      // Create the Prescription custom object
      const prescriptionObject = await this.client.createCustomObject({
        nameSingular: 'prescription',
        namePlural: 'prescriptions',
        labelSingular: 'Prescription',
        labelPlural: 'Prescriptions',
        description: 'Track patient medications and refills',
        icon: 'IconPills',
        isActive: true
      });

      this.logger.info('Prescription object created:', prescriptionObject);

      // Create fields for the Prescription object
      const fields = [
        {
          name: 'medicationName',
          label: 'Medication Name',
          type: 'TEXT',
          description: 'Name of the prescribed medication',
          isRequired: true,
          objectMetadataId: prescriptionObject.id
        },
        {
          name: 'dosage',
          label: 'Dosage',
          type: 'TEXT',
          description: 'Medication dosage (e.g., 500mg)',
          isRequired: true,
          objectMetadataId: prescriptionObject.id
        },
        {
          name: 'frequency',
          label: 'Frequency',
          type: 'TEXT',
          description: 'How often to take (e.g., twice daily)',
          isRequired: true,
          objectMetadataId: prescriptionObject.id
        },
        {
          name: 'startDate',
          label: 'Start Date',
          type: 'DATE',
          description: 'When to start taking the medication',
          isRequired: true,
          objectMetadataId: prescriptionObject.id
        },
        {
          name: 'endDate',
          label: 'End Date',
          type: 'DATE',
          description: 'When to stop taking the medication',
          objectMetadataId: prescriptionObject.id
        },
        {
          name: 'refillsRemaining',
          label: 'Refills Remaining',
          type: 'NUMBER',
          description: 'Number of refills remaining',
          defaultValue: 0,
          objectMetadataId: prescriptionObject.id
        },
        {
          name: 'prescribedBy',
          label: 'Prescribed By',
          type: 'TEXT',
          description: 'Doctor who prescribed the medication',
          isRequired: true,
          objectMetadataId: prescriptionObject.id
        },
        {
          name: 'pharmacy',
          label: 'Pharmacy',
          type: 'TEXT',
          description: 'Pharmacy where prescription is filled',
          objectMetadataId: prescriptionObject.id
        },
        {
          name: 'instructions',
          label: 'Special Instructions',
          type: 'LONG_TEXT',
          description: 'Special instructions for taking the medication',
          objectMetadataId: prescriptionObject.id
        },
        {
          name: 'sideEffects',
          label: 'Side Effects',
          type: 'LONG_TEXT',
          description: 'Potential side effects to watch for',
          objectMetadataId: prescriptionObject.id
        },
        {
          name: 'status',
          label: 'Status',
          type: 'SELECT',
          description: 'Current prescription status',
          options: [
            { value: 'active', label: 'Active', color: 'green', position: 0 },
            { value: 'paused', label: 'Paused', color: 'yellow', position: 1 },
            { value: 'completed', label: 'Completed', color: 'blue', position: 2 },
            { value: 'cancelled', label: 'Cancelled', color: 'red', position: 3 }
          ],
          defaultValue: 'active',
          objectMetadataId: prescriptionObject.id
        }
      ];

      // Create each field
      for (const field of fields) {
        await this.client.createCustomField(field);
        this.logger.info(`Created field: ${field.name}`);
      }

      // Create relationship to Person (Patient)
      await this.client.createCustomField({
        name: 'patient',
        label: 'Patient',
        type: 'RELATION',
        description: 'Patient this prescription belongs to',
        targetObjectMetadata: { nameSingular: 'person' },
        relationType: 'MANY_TO_ONE',
        isRequired: true,
        objectMetadataId: prescriptionObject.id
      });

      // Create relationship to Opportunity (Appointment)
      await this.client.createCustomField({
        name: 'appointment',
        label: 'Related Appointment',
        type: 'RELATION',
        description: 'Appointment where this was prescribed',
        targetObjectMetadata: { nameSingular: 'opportunity' },
        relationType: 'MANY_TO_ONE',
        objectMetadataId: prescriptionObject.id
      });

      this.logger.info('Prescription object setup completed');
      return prescriptionObject;
    } catch (error) {
      this.logger.error('Failed to create Prescription object:', error);
      throw error;
    }
  }

  // CRUD operations for Prescriptions
  async createPrescription(data) {
    const mutation = gql`
      mutation CreatePrescription($data: PrescriptionCreateInput!) {
        createPrescription(data: $data) {
          id
          medicationName
          dosage
          frequency
          startDate
          endDate
          refillsRemaining
          prescribedBy
          status
          patient {
            id
            firstName
            lastName
          }
        }
      }
    `;

    try {
      const result = await this.client.client.mutate({
        mutation,
        variables: { data }
      });
      return result.data.createPrescription;
    } catch (error) {
      this.logger.error('Failed to create prescription:', error);
      throw error;
    }
  }

  async updatePrescription(id, updates) {
    const mutation = gql`
      mutation UpdatePrescription($id: ID!, $data: PrescriptionUpdateInput!) {
        updatePrescription(id: $id, data: $data) {
          id
          medicationName
          status
          refillsRemaining
        }
      }
    `;

    try {
      const result = await this.client.client.mutate({
        mutation,
        variables: { id, data: updates }
      });
      return result.data.updatePrescription;
    } catch (error) {
      this.logger.error('Failed to update prescription:', error);
      throw error;
    }
  }

  async getPatientPrescriptions(patientId, activeOnly = false) {
    const query = gql`
      query GetPatientPrescriptions($filter: PrescriptionFilterInput!) {
        prescriptions(filter: $filter, orderBy: { startDate: DESC }) {
          edges {
            node {
              id
              medicationName
              dosage
              frequency
              startDate
              endDate
              refillsRemaining
              prescribedBy
              pharmacy
              instructions
              status
              appointment {
                id
                name
                closeDate
              }
            }
          }
        }
      }
    `;

    const filter = {
      patient: { id: { eq: patientId } }
    };

    if (activeOnly) {
      filter.status = { eq: 'active' };
    }

    try {
      const result = await this.client.client.query({
        query,
        variables: { filter }
      });
      return result.data.prescriptions.edges.map(edge => edge.node);
    } catch (error) {
      this.logger.error('Failed to get patient prescriptions:', error);
      throw error;
    }
  }

  // Check for prescriptions needing refill
  async checkRefillsNeeded() {
    const query = gql`
      query GetLowRefillPrescriptions {
        prescriptions(
          filter: {
            AND: [
              { status: { eq: "active" } },
              { refillsRemaining: { lte: 1 } }
            ]
          }
        ) {
          edges {
            node {
              id
              medicationName
              refillsRemaining
              patient {
                id
                firstName
                lastName
                email
                phone
              }
            }
          }
        }
      }
    `;

    try {
      const result = await this.client.client.query({ query });
      return result.data.prescriptions.edges.map(edge => edge.node);
    } catch (error) {
      this.logger.error('Failed to check refills:', error);
      throw error;
    }
  }
}

module.exports = { PrescriptionObject };
