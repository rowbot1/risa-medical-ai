# Risa Medical - OpenMed NER Integration Guide

This guide explains how the OpenMed Named Entity Recognition (NER) models from Hugging Face have been integrated into the Risa Medical platform.

## Overview

The integration adds AI-powered medical entity extraction capabilities to automatically identify and categorize medical information from patient records, including:
- Medical conditions and diseases
- Medications and pharmaceuticals
- Anatomical terms and body parts
- Oncology-related entities
- Proteins and genomic information

## Setup Instructions

### 1. Get a Hugging Face API Token

1. Visit https://huggingface.co/settings/tokens
2. Create a new token with "Make calls to Inference API" permission
3. Copy the token (starts with `hf_`)

### 2. Configure Environment

Add your token to the server's `.env` file:

```bash
cd server
# Edit .env file and add:
HUGGING_FACE_API_TOKEN=hf_your_token_here
```

### 3. Run Database Migrations

```bash
cd server
npm run migrate
```

### 4. Start the Server

```bash
npm start
# or for development:
npm run dev
```

## Features

### 1. Automatic Entity Extraction

- **Medical Records**: Entities are automatically extracted when new medical records are created
- **Patient Info**: Conditions, medications, and allergies are analyzed when updated
- **Manual Analysis**: Records can be analyzed on-demand via the "Analyze" button

### 2. Patient Dashboard

Patients can view their extracted medical entities:
- Organized by category (conditions, medications, anatomy, etc.)
- Shows occurrence frequency
- Color-coded for easy identification

### 3. Admin Features

**Entity-Based Patient Search**:
- Toggle between regular and entity search modes
- Search patients by medical conditions, medications, or anatomical terms
- Filter by specific entity types
- View matching entities in search results

**Entity Statistics**:
- View most common medical entities across all patients
- Track entity occurrence and patient counts
- Available in Reports & Analytics section

### 4. Batch Processing

Process existing records to extract entities:

```bash
cd server
npm run process-records
```

This will:
- Process all unanalyzed medical records
- Extract entities from patient medical information
- Handle rate limiting automatically
- Provide detailed progress and error reporting

## API Endpoints

### Entity Analysis

```javascript
// Analyze text
POST /api/entities/analyze
{
  "text": "Patient has diabetes and takes metformin",
  "models": ["condition", "medication"]  // optional
}

// Analyze medical record
POST /api/entities/analyze-record/:recordId

// Get patient entities
GET /api/entities/patient/:patientId?entityType=medication

// Search patients by entity
GET /api/entities/search?entityValue=diabetes&entityType=condition

// Get entity statistics
GET /api/entities/statistics?limit=20

// Get monitoring stats (admin only)
GET /api/entities/monitoring/stats?days=7
```

## Monitoring & Error Handling

### Monitoring Features

1. **Operation Logging**: All NER operations are logged with timing and success metrics
2. **API Usage Tracking**: Daily usage statistics per user
3. **Performance Monitoring**: Slow operations (>5s) are flagged
4. **Error Tracking**: Detailed error logging with categorization

### Error Handling

The system handles various error scenarios:
- **Rate Limiting**: Graceful handling of Hugging Face API limits
- **Service Unavailability**: Fallback messages when AI service is down
- **Configuration Errors**: Clear messages when API token is missing
- **Network Issues**: Retry logic and user-friendly error messages

### Monitoring Database Tables

- `ner_operation_logs`: Detailed logs of all NER operations
- `api_usage_stats`: Daily API usage statistics
- `ner_processing_queue`: Queue status for batch processing
- `ner_cache`: Cached analysis results (24-hour expiry)

## Cost Optimization

1. **Caching**: Results are cached for 24 hours to reduce API calls
2. **Batch Processing**: Process multiple records together during off-peak hours
3. **Selective Analysis**: Only analyze when content changes
4. **Model Selection**: Choose only necessary models for analysis

## Security Considerations

1. **API Token**: Store securely in environment variables
2. **Access Control**: Entity search limited to admin users
3. **Data Privacy**: All extracted entities linked to patient records with audit trails
4. **GDPR Compliance**: Entity data included in patient data exports/deletion

## Troubleshooting

### Common Issues

1. **"NER service not configured"**
   - Check if `HUGGING_FACE_API_TOKEN` is set in `.env`
   - Restart the server after adding the token

2. **"AI service rate limit exceeded"**
   - Wait a few minutes and try again
   - Consider upgrading to Hugging Face Pro ($9/month)

3. **"No entities extracted"**
   - Ensure medical text contains recognizable medical terms
   - Check if the correct models are being used

### Debug Mode

Enable detailed logging:
```javascript
// In server/services/nerService.js
console.log('API Response:', apiResults);
```

## Future Enhancements

Potential improvements to consider:
1. Real-time entity extraction during typing
2. Entity relationship mapping
3. Custom entity types for specific medical specialties
4. Integration with medical coding systems (ICD-10, SNOMED)
5. Multi-language support
6. On-premise model deployment for sensitive data

## Support

For issues or questions:
1. Check the monitoring stats: `/api/entities/monitoring/stats`
2. Review operation logs in the database
3. Check Hugging Face API status: https://status.huggingface.co/
4. Contact your system administrator