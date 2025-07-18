const nerService = require('../services/nerService');
const db = require('./database');

/**
 * Batch process existing medical records to extract entities
 * This utility can be run manually or scheduled via cron
 */

// Configuration
const BATCH_SIZE = 10; // Process 10 records at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between batches

async function getAllUnprocessedRecords() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT mr.id, mr.patient_id, mr.content, mr.title
             FROM medical_records mr
             LEFT JOIN ner_processing_queue npq ON mr.id = npq.record_id
             WHERE npq.id IS NULL OR npq.status = 'failed'
             ORDER BY mr.created_at DESC`,
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

async function getPatientMedicalInfo() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT id, medical_conditions, medications, allergies
             FROM patients
             WHERE (medical_conditions IS NOT NULL AND medical_conditions != '')
                OR (medications IS NOT NULL AND medications != '')
                OR (allergies IS NOT NULL AND allergies != '')`,
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

async function processRecordBatch(records) {
    const results = {
        successful: 0,
        failed: 0,
        errors: []
    };
    
    for (const record of records) {
        try {
            console.log(`Processing record ${record.id}: ${record.title}`);
            await nerService.processMedicalRecord(record.id);
            results.successful++;
            console.log(`✓ Successfully processed record ${record.id}`);
        } catch (error) {
            console.error(`✗ Error processing record ${record.id}:`, error.message);
            results.failed++;
            results.errors.push({
                recordId: record.id,
                error: error.message
            });
        }
    }
    
    return results;
}

async function processPatientMedicalInfo(patients) {
    const results = {
        successful: 0,
        failed: 0,
        errors: []
    };
    
    for (const patient of patients) {
        try {
            console.log(`Processing patient ${patient.id} medical info`);
            
            const textToAnalyze = [
                patient.medical_conditions && `Medical Conditions: ${patient.medical_conditions}`,
                patient.medications && `Medications: ${patient.medications}`,
                patient.allergies && `Allergies: ${patient.allergies}`
            ].filter(Boolean).join('\n');
            
            if (textToAnalyze) {
                const analysisResults = await nerService.analyzeText(textToAnalyze, ['condition', 'medication', 'anatomy']);
                
                for (const result of analysisResults) {
                    if (result && result.entities && result.entities.length > 0) {
                        await nerService.saveEntities(
                            patient.id,
                            null, // No specific medical record
                            result.entities,
                            result.model,
                            textToAnalyze
                        );
                    }
                }
                
                results.successful++;
                console.log(`✓ Successfully processed patient ${patient.id} medical info`);
            }
        } catch (error) {
            console.error(`✗ Error processing patient ${patient.id}:`, error.message);
            results.failed++;
            results.errors.push({
                patientId: patient.id,
                error: error.message
            });
        }
    }
    
    return results;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function batchProcessAllRecords() {
    console.log('========================================');
    console.log('Starting batch processing of medical records');
    console.log(`Batch size: ${BATCH_SIZE}`);
    console.log(`Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`);
    console.log('========================================\n');
    
    try {
        // First, clean expired cache
        console.log('Cleaning expired cache entries...');
        await nerService.cleanCache();
        
        // Process medical records
        console.log('\n1. Processing medical records...');
        const records = await getAllUnprocessedRecords();
        console.log(`Found ${records.length} unprocessed medical records\n`);
        
        let totalRecordResults = {
            successful: 0,
            failed: 0,
            errors: []
        };
        
        // Process in batches
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(records.length / BATCH_SIZE)}`);
            
            const batchResults = await processRecordBatch(batch);
            totalRecordResults.successful += batchResults.successful;
            totalRecordResults.failed += batchResults.failed;
            totalRecordResults.errors.push(...batchResults.errors);
            
            // Delay between batches to avoid overwhelming the API
            if (i + BATCH_SIZE < records.length) {
                console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
                await sleep(DELAY_BETWEEN_BATCHES);
            }
        }
        
        // Process patient medical info
        console.log('\n\n2. Processing patient medical information...');
        const patients = await getPatientMedicalInfo();
        console.log(`Found ${patients.length} patients with medical information\n`);
        
        let totalPatientResults = {
            successful: 0,
            failed: 0,
            errors: []
        };
        
        // Process patients in batches
        for (let i = 0; i < patients.length; i += BATCH_SIZE) {
            const batch = patients.slice(i, i + BATCH_SIZE);
            console.log(`\nProcessing patient batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(patients.length / BATCH_SIZE)}`);
            
            const batchResults = await processPatientMedicalInfo(batch);
            totalPatientResults.successful += batchResults.successful;
            totalPatientResults.failed += batchResults.failed;
            totalPatientResults.errors.push(...batchResults.errors);
            
            // Delay between batches
            if (i + BATCH_SIZE < patients.length) {
                console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
                await sleep(DELAY_BETWEEN_BATCHES);
            }
        }
        
        // Summary
        console.log('\n========================================');
        console.log('BATCH PROCESSING COMPLETED');
        console.log('========================================');
        console.log('\nMedical Records Summary:');
        console.log(`✓ Successful: ${totalRecordResults.successful}`);
        console.log(`✗ Failed: ${totalRecordResults.failed}`);
        
        console.log('\nPatient Medical Info Summary:');
        console.log(`✓ Successful: ${totalPatientResults.successful}`);
        console.log(`✗ Failed: ${totalPatientResults.failed}`);
        
        if (totalRecordResults.errors.length > 0 || totalPatientResults.errors.length > 0) {
            console.log('\nErrors encountered:');
            [...totalRecordResults.errors, ...totalPatientResults.errors].forEach(err => {
                console.log(`- Record/Patient ${err.recordId || err.patientId}: ${err.error}`);
            });
        }
        
        console.log('\n✅ Batch processing complete!');
        
    } catch (error) {
        console.error('\n❌ Fatal error during batch processing:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    batchProcessAllRecords()
        .then(() => {
            console.log('\nExiting...');
            process.exit(0);
        })
        .catch(err => {
            console.error('\nFatal error:', err);
            process.exit(1);
        });
}

module.exports = {
    batchProcessAllRecords,
    processRecordBatch,
    processPatientMedicalInfo
};