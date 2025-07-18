const { gql } = require('@apollo/client');

class FamilyGroupObject {
  constructor(twentyClient, logger) {
    this.client = twentyClient;
    this.logger = logger;
  }

  async create() {
    this.logger.info('Creating Family Group custom object...');

    try {
      // Create the Family Group custom object
      const familyGroupObject = await this.client.createCustomObject({
        nameSingular: 'familyGroup',
        namePlural: 'familyGroups',
        labelSingular: 'Family Group',
        labelPlural: 'Family Groups',
        description: 'Manage family relationships and shared medical history',
        icon: 'IconUsers',
        isActive: true
      });

      this.logger.info('Family Group object created:', familyGroupObject);

      // Create fields for the Family Group object
      const fields = [
        {
          name: 'groupName',
          label: 'Family Name',
          type: 'TEXT',
          description: 'Family surname or group name',
          isRequired: true,
          objectMetadataId: familyGroupObject.id
        },
        {
          name: 'primaryContactId',
          label: 'Primary Contact ID',
          type: 'TEXT',
          description: 'ID of the primary family contact',
          objectMetadataId: familyGroupObject.id
        },
        {
          name: 'sharedAddress',
          label: 'Shared Address',
          type: 'TEXT',
          description: 'Family home address',
          objectMetadataId: familyGroupObject.id
        },
        {
          name: 'sharedPhone',
          label: 'Shared Phone',
          type: 'PHONE',
          description: 'Family home phone number',
          objectMetadataId: familyGroupObject.id
        },
        {
          name: 'hereditaryConditions',
          label: 'Hereditary Conditions',
          type: 'LONG_TEXT',
          description: 'Known hereditary conditions in the family',
          objectMetadataId: familyGroupObject.id
        },
        {
          name: 'familyMedicalHistory',
          label: 'Family Medical History',
          type: 'JSON',
          description: 'Structured family medical history data',
          objectMetadataId: familyGroupObject.id
        },
        {
          name: 'emergencyPlan',
          label: 'Family Emergency Plan',
          type: 'LONG_TEXT',
          description: 'Emergency contact and care instructions',
          objectMetadataId: familyGroupObject.id
        }
      ];

      // Create each field
      for (const field of fields) {
        await this.client.createCustomField(field);
        this.logger.info(`Created field: ${field.name}`);
      }

      // Now extend the Person object with family relationship fields
      await this.extendPersonObjectForFamily();

      this.logger.info('Family Group object setup completed');
      return familyGroupObject;
    } catch (error) {
      this.logger.error('Failed to create Family Group object:', error);
      throw error;
    }
  }

  async extendPersonObjectForFamily() {
    this.logger.info('Extending Person object with family relationship fields...');

    const familyFields = [
      {
        name: 'familyGroupId',
        label: 'Family Group',
        type: 'TEXT', // Will store the family group ID
        description: 'Family group this person belongs to',
        targetColumnMap: {
          object: 'person'
        }
      },
      {
        name: 'relationshipType',
        label: 'Family Relationship',
        type: 'SELECT',
        description: 'Relationship within the family',
        options: [
          { value: 'parent', label: 'Parent', color: 'blue', position: 0 },
          { value: 'child', label: 'Child', color: 'green', position: 1 },
          { value: 'spouse', label: 'Spouse', color: 'purple', position: 2 },
          { value: 'sibling', label: 'Sibling', color: 'orange', position: 3 },
          { value: 'guardian', label: 'Guardian', color: 'red', position: 4 },
          { value: 'other', label: 'Other', color: 'gray', position: 5 }
        ],
        targetColumnMap: {
          object: 'person'
        }
      },
      {
        name: 'isPrimaryContact',
        label: 'Is Primary Contact',
        type: 'BOOLEAN',
        description: 'Is this person the primary family contact?',
        defaultValue: false,
        targetColumnMap: {
          object: 'person'
        }
      },
      {
        name: 'sharesMedicalHistory',
        label: 'Share Medical History',
        type: 'BOOLEAN',
        description: 'Can family members view this person\'s medical history?',
        defaultValue: false,
        targetColumnMap: {
          object: 'person'
        }
      },
      {
        name: 'authorizedForMinor',
        label: 'Authorized for Minor',
        type: 'BOOLEAN',
        description: 'Can make medical decisions for minor family members',
        defaultValue: false,
        targetColumnMap: {
          object: 'person'
        }
      },
      {
        name: 'relatedPersonIds',
        label: 'Related Family Members',
        type: 'JSON',
        description: 'Array of IDs for related family members',
        defaultValue: [],
        targetColumnMap: {
          object: 'person'
        }
      }
    ];

    for (const field of familyFields) {
      await this.client.createCustomField(field);
      this.logger.info(`Added family field to Person: ${field.name}`);
    }
  }

  // CRUD operations for Family Groups
  async createFamilyGroup(data) {
    const mutation = gql`
      mutation CreateFamilyGroup($data: FamilyGroupCreateInput!) {
        createFamilyGroup(data: $data) {
          id
          groupName
          primaryContactId
          sharedAddress
          hereditaryConditions
        }
      }
    `;

    try {
      const result = await this.client.client.mutate({
        mutation,
        variables: { data }
      });
      return result.data.createFamilyGroup;
    } catch (error) {
      this.logger.error('Failed to create family group:', error);
      throw error;
    }
  }

  async linkFamilyMembers(personId, familyGroupId, relationshipType) {
    const mutation = gql`
      mutation UpdatePerson($id: ID!, $data: PersonUpdateInput!) {
        updatePerson(id: $id, data: $data) {
          id
          firstName
          lastName
          customFields
        }
      }
    `;

    const data = {
      customFields: {
        familyGroupId,
        relationshipType
      }
    };

    try {
      const result = await this.client.client.mutate({
        mutation,
        variables: { id: personId, data }
      });
      return result.data.updatePerson;
    } catch (error) {
      this.logger.error('Failed to link family member:', error);
      throw error;
    }
  }

  async getFamilyMembers(familyGroupId) {
    const query = gql`
      query GetFamilyMembers($filter: PersonFilterInput!) {
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

    const filter = {
      customFields: {
        familyGroupId: { eq: familyGroupId }
      }
    };

    try {
      const result = await this.client.client.query({
        query,
        variables: { filter }
      });
      return result.data.people.edges.map(edge => edge.node);
    } catch (error) {
      this.logger.error('Failed to get family members:', error);
      throw error;
    }
  }

  async getFamilyMedicalHistory(familyGroupId) {
    const query = gql`
      query GetFamilyMedicalHistory($groupId: ID!) {
        familyGroup(id: $groupId) {
          id
          groupName
          hereditaryConditions
          familyMedicalHistory
        }
        people(filter: { customFields: { familyGroupId: { eq: $groupId } } }) {
          edges {
            node {
              id
              firstName
              lastName
              customFields
            }
          }
        }
      }
    `;

    try {
      const result = await this.client.client.query({
        query,
        variables: { groupId: familyGroupId }
      });
      return {
        familyGroup: result.data.familyGroup,
        members: result.data.people.edges.map(edge => edge.node)
      };
    } catch (error) {
      this.logger.error('Failed to get family medical history:', error);
      throw error;
    }
  }

  // Get all families with hereditary conditions
  async getFamiliesWithHereditaryConditions() {
    const query = gql`
      query GetFamiliesWithConditions {
        familyGroups(
          filter: {
            hereditaryConditions: { isNotNull: true }
          }
        ) {
          edges {
            node {
              id
              groupName
              hereditaryConditions
              primaryContactId
            }
          }
        }
      }
    `;

    try {
      const result = await this.client.client.query({ query });
      return result.data.familyGroups.edges.map(edge => edge.node);
    } catch (error) {
      this.logger.error('Failed to get families with hereditary conditions:', error);
      throw error;
    }
  }

  // Check if family members need screening based on hereditary conditions
  async checkFamilyScreeningNeeds(familyGroupId) {
    const familyData = await this.getFamilyMedicalHistory(familyGroupId);
    const screeningNeeds = [];

    if (familyData.familyGroup.hereditaryConditions) {
      const conditions = familyData.familyGroup.hereditaryConditions.toLowerCase();
      
      // Define screening rules based on conditions
      const screeningRules = {
        'diabetes': {
          test: 'HbA1c',
          frequency: 'Annual',
          startAge: 40
        },
        'heart disease': {
          test: 'Cardiac Risk Assessment',
          frequency: 'Every 2 years',
          startAge: 35
        },
        'cancer': {
          test: 'Genetic Screening',
          frequency: 'Once',
          startAge: 25
        },
        'hypertension': {
          test: 'Blood Pressure Monitoring',
          frequency: 'Annual',
          startAge: 30
        }
      };

      for (const [condition, rule] of Object.entries(screeningRules)) {
        if (conditions.includes(condition)) {
          screeningNeeds.push({
            condition,
            ...rule,
            affectedMembers: familyData.members.filter(m => {
              // Logic to determine if member needs screening
              return m.customFields.sharesMedicalHistory;
            })
          });
        }
      }
    }

    return screeningNeeds;
  }
}

module.exports = { FamilyGroupObject };
