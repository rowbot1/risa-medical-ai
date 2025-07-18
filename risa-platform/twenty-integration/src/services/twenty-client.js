const { ApolloClient, InMemoryCache, gql, createHttpLink } = require('@apollo/client');
const { setContext } = require('@apollo/client/link/context');
const fetch = require('cross-fetch');

class TwentyClient {
  constructor(config) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.connected = false;
    
    // Initialize Apollo Client
    const httpLink = createHttpLink({
      uri: `${this.apiUrl}/graphql`,
      fetch
    });

    const authLink = setContext((_, { headers }) => {
      return {
        headers: {
          ...headers,
          authorization: this.apiKey ? `Bearer ${this.apiKey}` : "",
        }
      }
    });

    this.client = new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'no-cache',
          errorPolicy: 'all',
        },
        query: {
          fetchPolicy: 'no-cache',
          errorPolicy: 'all',
        },
      }
    });
  }

  async testConnection() {
    try {
      const result = await this.client.query({
        query: gql`
          query GetWorkspace {
            currentWorkspace {
              id
              displayName
              createdAt
            }
          }
        `
      });
      this.connected = true;
      return result.data;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to Twenty CRM: ${error.message}`);
    }
  }

  isConnected() {
    return this.connected;
  }

  // Patient Management
  async createPatient(patientData) {
    const mutation = gql`
      mutation CreatePerson($data: PersonCreateInput!) {
        createPerson(data: $data) {
          id
          firstName
          lastName
          email
          phone
          createdAt
        }
      }
    `;

    const variables = {
      data: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        email: patientData.email,
        phone: patientData.phone,
        position: 'Patient',
        customFields: {
          dateOfBirth: patientData.dateOfBirth,
          gender: patientData.gender,
          medicalRecordNumber: patientData.id.toString(),
          emergencyContact: patientData.emergencyContactName,
          emergencyPhone: patientData.emergencyContactPhone
        }
      }
    };

    const result = await this.client.mutate({ mutation, variables });
    return result.data.createPerson;
  }

  async updatePatient(patientId, updates) {
    const mutation = gql`
      mutation UpdatePerson($id: ID!, $data: PersonUpdateInput!) {
        updatePerson(id: $id, data: $data) {
          id
          firstName
          lastName
          email
          phone
          updatedAt
        }
      }
    `;

    const result = await this.client.mutate({ 
      mutation, 
      variables: { id: patientId, data: updates } 
    });
    return result.data.updatePerson;
  }

  async getPatient(patientId) {
    const query = gql`
      query GetPerson($id: ID!) {
        person(id: $id) {
          id
          firstName
          lastName
          email
          phone
          position
          customFields
          activities {
            edges {
              node {
                id
                title
                type
                createdAt
              }
            }
          }
        }
      }
    `;

    const result = await this.client.query({ 
      query, 
      variables: { id: patientId } 
    });
    return result.data.person;
  }

  // Appointment Management
  async createAppointment(appointmentData) {
    const mutation = gql`
      mutation CreateOpportunity($data: OpportunityCreateInput!) {
        createOpportunity(data: $data) {
          id
          name
          stage
          closeDate
          amount
          createdAt
        }
      }
    `;

    const variables = {
      data: {
        name: `${appointmentData.serviceType} - ${appointmentData.patientName}`,
        stage: appointmentData.status || 'Scheduled',
        closeDate: appointmentData.appointmentDate,
        amount: appointmentData.price || 0,
        customFields: {
          appointmentTime: appointmentData.appointmentTime,
          serviceType: appointmentData.serviceType,
          duration: appointmentData.duration || 30,
          notes: appointmentData.notes,
          medicalRecordId: appointmentData.id.toString()
        }
      }
    };

    const result = await this.client.mutate({ mutation, variables });
    return result.data.createOpportunity;
  }

  async updateAppointment(appointmentId, updates) {
    const mutation = gql`
      mutation UpdateOpportunity($id: ID!, $data: OpportunityUpdateInput!) {
        updateOpportunity(id: $id, data: $data) {
          id
          name
          stage
          closeDate
          updatedAt
        }
      }
    `;

    const result = await this.client.mutate({ 
      mutation, 
      variables: { id: appointmentId, data: updates } 
    });
    return result.data.updateOpportunity;
  }

  // Activity and Timeline Management
  async createActivity(activityData) {
    const mutation = gql`
      mutation CreateActivity($data: ActivityCreateInput!) {
        createActivity(data: $data) {
          id
          title
          body
          type
          createdAt
        }
      }
    `;

    const variables = {
      data: {
        title: activityData.title,
        body: activityData.body,
        type: activityData.type || 'Note',
        targetableType: activityData.targetableType,
        targetableId: activityData.targetableId,
        authorId: activityData.authorId
      }
    };

    const result = await this.client.mutate({ mutation, variables });
    return result.data.createActivity;
  }

  // Medical Records Management
  async createMedicalRecord(recordData) {
    const mutation = gql`
      mutation CreateNote($data: NoteCreateInput!) {
        createNote(data: $data) {
          id
          title
          body
          createdAt
        }
      }
    `;

    const variables = {
      data: {
        title: recordData.title,
        body: recordData.content,
        targetableType: 'Person',
        targetableId: recordData.patientId,
        customFields: {
          recordType: recordData.recordType,
          appointmentId: recordData.appointmentId,
          attachments: recordData.attachments || []
        }
      }
    };

    const result = await this.client.mutate({ mutation, variables });
    return result.data.createNote;
  }

  // Task Management for Follow-ups
  async createTask(taskData) {
    const mutation = gql`
      mutation CreateTask($data: TaskCreateInput!) {
        createTask(data: $data) {
          id
          title
          body
          dueAt
          status
          createdAt
        }
      }
    `;

    const variables = {
      data: {
        title: taskData.title,
        body: taskData.body,
        dueAt: taskData.dueAt,
        status: 'TODO',
        assigneeId: taskData.assigneeId,
        targetableType: taskData.targetableType,
        targetableId: taskData.targetableId
      }
    };

    const result = await this.client.mutate({ mutation, variables });
    return result.data.createTask;
  }

  // Workflow Management
  async createWorkflow(workflowData) {
    const mutation = gql`
      mutation CreateWorkflow($data: WorkflowCreateInput!) {
        createWorkflow(data: $data) {
          id
          name
          trigger
          actions
          isActive
        }
      }
    `;

    const result = await this.client.mutate({ 
      mutation, 
      variables: { data: workflowData } 
    });
    return result.data.createWorkflow;
  }

  // Custom Object Management
  async createCustomObject(objectData) {
    const mutation = gql`
      mutation CreateCustomObject($data: CustomObjectCreateInput!) {
        createCustomObject(data: $data) {
          id
          name
          labelSingular
          labelPlural
          description
          icon
        }
      }
    `;

    const result = await this.client.mutate({ 
      mutation, 
      variables: { data: objectData } 
    });
    return result.data.createCustomObject;
  }

  async createCustomField(fieldData) {
    const mutation = gql`
      mutation CreateCustomField($data: FieldMetadataCreateInput!) {
        createFieldMetadata(data: $data) {
          id
          name
          label
          type
          description
        }
      }
    `;

    const result = await this.client.mutate({ 
      mutation, 
      variables: { data: fieldData } 
    });
    return result.data.createFieldMetadata;
  }

  // Bulk Operations
  async bulkCreateRecords(objectType, records) {
    const mutation = gql`
      mutation BulkCreate${objectType}($data: [${objectType}CreateInput!]!) {
        bulkCreate${objectType}(data: $data) {
          id
        }
      }
    `;

    const result = await this.client.mutate({ 
      mutation, 
      variables: { data: records } 
    });
    return result.data[`bulkCreate${objectType}`];
  }

  // Search and Query
  async searchPatients(searchTerm) {
    const query = gql`
      query SearchPeople($filter: PersonFilterInput!) {
        people(filter: $filter) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              customFields
            }
          }
        }
      }
    `;

    const variables = {
      filter: {
        or: [
          { firstName: { ilike: `%${searchTerm}%` } },
          { lastName: { ilike: `%${searchTerm}%` } },
          { email: { ilike: `%${searchTerm}%` } }
        ]
      }
    };

    const result = await this.client.query({ query, variables });
    return result.data.people.edges.map(edge => edge.node);
  }

  async getAppointmentsByDateRange(startDate, endDate) {
    const query = gql`
      query GetOpportunities($filter: OpportunityFilterInput!) {
        opportunities(filter: $filter) {
          edges {
            node {
              id
              name
              stage
              closeDate
              amount
              customFields
            }
          }
        }
      }
    `;

    const variables = {
      filter: {
        closeDate: {
          gte: startDate,
          lte: endDate
        }
      }
    };

    const result = await this.client.query({ query, variables });
    return result.data.opportunities.edges.map(edge => edge.node);
  }

  // Webhook Management
  async createWebhook(webhookData) {
    const mutation = gql`
      mutation CreateWebhook($data: WebhookCreateInput!) {
        createWebhook(data: $data) {
          id
          targetUrl
          operation
          objectType
        }
      }
    `;

    const result = await this.client.mutate({ 
      mutation, 
      variables: { data: webhookData } 
    });
    return result.data.createWebhook;
  }

  async close() {
    // Clean up any resources
    this.connected = false;
  }
}

module.exports = { TwentyClient };
