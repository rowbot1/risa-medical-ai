const { gql } = require('@apollo/client');

class LabResultObject {
  constructor(twentyClient, logger) {
    this.client = twentyClient;
    this.logger = logger;
  }

  async create() {
    this.logger.info('Creating Lab Result custom object...');

    try {
      // Create the Lab Result custom object
      const labResultObject = await this.client.createCustomObject({
        nameSingular: 'labResult',
        namePlural: 'labResults',
        labelSingular: 'Lab Result',
        labelPlural: 'Lab Results',
        description: 'Store and track patient test results',
        icon: 'IconTestPipe',
        isActive: true
      });

      this.logger.info('Lab Result object created:', labResultObject);

      // Create fields for the Lab Result object
      const fields = [
        {
          name: 'testName',
          label: 'Test Name',
          type: 'TEXT',
          description: 'Name of the test performed',
          isRequired: true,
          objectMetadataId: labResultObject.id
        },
        {
          name: 'testDate',
          label: 'Test Date',
          type: 'DATE_TIME',
          description: 'Date and time the test was performed',
          isRequired: true,
          objectMetadataId: labResultObject.id
        },
        {
          name: 'category',
          label: 'Test Category',
          type: 'SELECT',
          description: 'Category of the test',
          options: [
            { value: 'blood_test', label: 'Blood Test', color: 'red', position: 0 },
            { value: 'imaging', label: 'Imaging', color: 'blue', position: 1 },
            { value: 'urinalysis', label: 'Urinalysis', color: 'yellow', position: 2 },
            { value: 'biopsy', label: 'Biopsy', color: 'purple', position: 3 },
            { value: 'genetic', label: 'Genetic Test', color: 'green', position: 4 },
            { value: 'cardiac', label: 'Cardiac Test', color: 'orange', position: 5 },
            { value: 'other', label: 'Other', color: 'gray', position: 6 }
          ],
          defaultValue: 'blood_test',
          objectMetadataId: labResultObject.id
        },
        {
          name: 'results',
          label: 'Test Results',
          type: 'JSON',
          description: 'Structured test results data',
          objectMetadataId: labResultObject.id
        },
        {
          name: 'resultsSummary',
          label: 'Results Summary',
          type: 'LONG_TEXT',
          description: 'Human-readable summary of results',
          objectMetadataId: labResultObject.id
        },
        {
          name: 'normalRange',
          label: 'Normal Range',
          type: 'TEXT',
          description: 'Normal reference range for this test',
          objectMetadataId: labResultObject.id
        },
        {
          name: 'status',
          label: 'Result Status',
          type: 'SELECT',
          description: 'Status of the test results',
          options: [
            { value: 'normal', label: 'Normal', color: 'green', position: 0 },
            { value: 'abnormal', label: 'Abnormal', color: 'yellow', position: 1 },
            { value: 'critical', label: 'Critical', color: 'red', position: 2 },
            { value: 'pending', label: 'Pending', color: 'gray', position: 3 }
          ],
          defaultValue: 'pending',
          objectMetadataId: labResultObject.id
        },
        {
          name: 'clinicalNotes',
          label: 'Clinical Notes',
          type: 'LONG_TEXT',
          description: 'Doctor\'s notes and interpretation',
          objectMetadataId: labResultObject.id
        },
        {
          name: 'reportUrl',
          label: 'Report File URL',
          type: 'LINK',
          description: 'URL to the full report file',
          objectMetadataId: labResultObject.id
        },
        {
          name: 'labName',
          label: 'Laboratory Name',
          type: 'TEXT',
          description: 'Name of the laboratory that performed the test',
          objectMetadataId: labResultObject.id
        },
        {
          name: 'orderingPhysician',
          label: 'Ordering Physician',
          type: 'TEXT',
          description: 'Doctor who ordered the test',
          objectMetadataId: labResultObject.id
        },
        {
          name: 'urgency',
          label: 'Urgency Level',
          type: 'SELECT',
          description: 'Urgency of the test',
          options: [
            { value: 'routine', label: 'Routine', color: 'gray', position: 0 },
            { value: 'urgent', label: 'Urgent', color: 'orange', position: 1 },
            { value: 'stat', label: 'STAT', color: 'red', position: 2 }
          ],
          defaultValue: 'routine',
          objectMetadataId: labResultObject.id
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
        description: 'Patient this lab result belongs to',
        targetObjectMetadata: { nameSingular: 'person' },
        relationType: 'MANY_TO_ONE',
        isRequired: true,
        objectMetadataId: labResultObject.id
      });

      // Create relationship to Opportunity (Appointment)
      await this.client.createCustomField({
        name: 'appointment',
        label: 'Related Appointment',
        type: 'RELATION',
        description: 'Appointment where this test was ordered',
        targetObjectMetadata: { nameSingular: 'opportunity' },
        relationType: 'MANY_TO_ONE',
        objectMetadataId: labResultObject.id
      });

      this.logger.info('Lab Result object setup completed');
      return labResultObject;
    } catch (error) {
      this.logger.error('Failed to create Lab Result object:', error);
      throw error;
    }
  }

  // CRUD operations for Lab Results
  async createLabResult(data) {
    const mutation = gql`
      mutation CreateLabResult($data: LabResultCreateInput!) {
        createLabResult(data: $data) {
          id
          testName
          testDate
          category
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
      return result.data.createLabResult;
    } catch (error) {
      this.logger.error('Failed to create lab result:', error);
      throw error;
    }
  }

  async updateLabResult(id, updates) {
    const mutation = gql`
      mutation UpdateLabResult($id: ID!, $data: LabResultUpdateInput!) {
        updateLabResult(id: $id, data: $data) {
          id
          testName
          status
          resultsSummary
        }
      }
    `;

    try {
      const result = await this.client.client.mutate({
        mutation,
        variables: { id, data: updates }
      });
      return result.data.updateLabResult;
    } catch (error) {
      this.logger.error('Failed to update lab result:', error);
      throw error;
    }
  }

  async getPatientLabResults(patientId, category = null) {
    const query = gql`
      query GetPatientLabResults($filter: LabResultFilterInput!) {
        labResults(filter: $filter, orderBy: { testDate: DESC }) {
          edges {
            node {
              id
              testName
              testDate
              category
              status
              resultsSummary
              normalRange
              clinicalNotes
              reportUrl
              orderingPhysician
              urgency
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

    if (category) {
      filter.category = { eq: category };
    }

    try {
      const result = await this.client.client.query({
        query,
        variables: { filter }
      });
      return result.data.labResults.edges.map(edge => edge.node);
    } catch (error) {
      this.logger.error('Failed to get patient lab results:', error);
      throw error;
    }
  }

  // Get critical results that need immediate attention
  async getCriticalResults() {
    const query = gql`
      query GetCriticalLabResults {
        labResults(
          filter: {
            AND: [
              { status: { eq: "critical" } },
              { createdAt: { gte: "24 hours ago" } }
            ]
          },
          orderBy: { testDate: DESC }
        ) {
          edges {
            node {
              id
              testName
              testDate
              category
              resultsSummary
              urgency
              patient {
                id
                firstName
                lastName
                email
                phone
              }
              orderingPhysician
            }
          }
        }
      }
    `;

    try {
      const result = await this.client.client.query({ query });
      return result.data.labResults.edges.map(edge => edge.node);
    } catch (error) {
      this.logger.error('Failed to get critical results:', error);
      throw error;
    }
  }

  // Get pending results
  async getPendingResults() {
    const query = gql`
      query GetPendingLabResults {
        labResults(
          filter: { status: { eq: "pending" } },
          orderBy: { testDate: ASC }
        ) {
          edges {
            node {
              id
              testName
              testDate
              category
              urgency
              patient {
                id
                firstName
                lastName
              }
              labName
            }
          }
        }
      }
    `;

    try {
      const result = await this.client.client.query({ query });
      return result.data.labResults.edges.map(edge => edge.node);
    } catch (error) {
      this.logger.error('Failed to get pending results:', error);
      throw error;
    }
  }

  // Compare results over time for trending
  async getResultTrends(patientId, testName, limit = 10) {
    const query = gql`
      query GetResultTrends($filter: LabResultFilterInput!, $limit: Int!) {
        labResults(
          filter: $filter,
          orderBy: { testDate: DESC },
          first: $limit
        ) {
          edges {
            node {
              id
              testDate
              results
              status
              normalRange
            }
          }
        }
      }
    `;

    const filter = {
      AND: [
        { patient: { id: { eq: patientId } } },
        { testName: { ilike: `%${testName}%` } }
      ]
    };

    try {
      const result = await this.client.client.query({
        query,
        variables: { filter, limit }
      });
      return result.data.labResults.edges.map(edge => edge.node);
    } catch (error) {
      this.logger.error('Failed to get result trends:', error);
      throw error;
    }
  }
}

module.exports = { LabResultObject };
