const crypto = require('crypto');
const db = require('../utils/database');

// OpenMed model configurations
const OPENMED_MODELS = {
    anatomy: {
        name: 'OpenMed/OpenMed-NER-AnatomyDetect-PubMed-v2-109M',
        entityType: 'anatomy',
        description: 'Detects anatomical entities (body parts, organs)'
    },
    medication: {
        name: 'OpenMed/OpenMed-NER-PharmaDetect-ModernClinical-109M',
        entityType: 'medication',
        description: 'Detects pharmaceutical/medication entities'
    },
    condition: {
        name: 'OpenMed/OpenMed-NER-MedicalConditionDetect-ClinicalBERT-85M',
        entityType: 'condition',
        description: 'Detects medical conditions and diseases'
    },
    oncology: {
        name: 'OpenMed/OpenMed-NER-OncologyDetect-SuperClinical-434M',
        entityType: 'oncology',
        description: 'Detects cancer-related entities'
    },
    protein: {
        name: 'OpenMed/OpenMed-NER-ProteinDetect-ModernClinical-149M',
        entityType: 'protein',
        description: 'Detects protein entities'
    },
    genome: {
        name: 'OpenMed/OpenMed-NER-GenomeDetect-ModernClinical-395M',
        entityType: 'genome',
        description: 'Detects genomic entities'
    }
};

class NERService {
    constructor() {
        this.apiToken = process.env.HUGGING_FACE_API_TOKEN;
        this.apiUrl = 'https://api-inference.huggingface.co/models/';
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    }

    // Generate hash for caching
    generateTextHash(text, modelName) {
        return crypto.createHash('sha256')
            .update(`${text}:${modelName}`)
            .digest('hex');
    }

    // Check cache for existing analysis
    async checkCache(textHash) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT analysis_result FROM ner_cache 
                 WHERE text_hash = ? AND expires_at > datetime('now')`,
                [textHash],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? JSON.parse(row.analysis_result) : null);
                }
            );
        });
    }

    // Save analysis to cache
    async saveToCache(textHash, modelName, result) {
        return new Promise((resolve, reject) => {
            const expiresAt = new Date(Date.now() + this.cacheExpiry).toISOString();
            db.run(
                `INSERT OR REPLACE INTO ner_cache (text_hash, model_name, analysis_result, expires_at)
                 VALUES (?, ?, ?, ?)`,
                [textHash, modelName, JSON.stringify(result), expiresAt],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Clean expired cache entries
    async cleanCache() {
        return new Promise((resolve, reject) => {
            db.run(
                `DELETE FROM ner_cache WHERE expires_at < datetime('now')`,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Call Hugging Face API
    async callHuggingFaceAPI(modelName, text) {
        if (!this.apiToken) {
            throw new Error('Hugging Face API token not configured');
        }

        try {
            const response = await fetch(this.apiUrl + modelName, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: text,
                    options: { wait_for_model: true }
                })
            });

            if (!response.ok) {
                const error = await response.text();
                if (response.status === 429) {
                    console.warn('Hugging Face API rate limit reached. Using cached results only.');
                    return [];
                }
                throw new Error(`Hugging Face API error: ${response.status} - ${error}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error calling Hugging Face API:', error);
            throw error;
        }
    }

    // Process NER results and extract entities
    processNERResults(results, entityType, text) {
        const entities = [];
        
        // Handle different response formats from various models
        if (Array.isArray(results)) {
            results.forEach(result => {
                if (result.entity_group || result.entity) {
                    entities.push({
                        entityType: entityType,
                        entityValue: result.word || result.entity_group || result.entity,
                        entityCategory: result.entity_group || result.entity,
                        confidence: result.score || 0,
                        start: result.start,
                        end: result.end,
                        context: this.extractContext(text, result.start, result.end)
                    });
                }
            });
        }

        return entities;
    }

    // Extract context around an entity
    extractContext(text, start, end, contextLength = 50) {
        const contextStart = Math.max(0, start - contextLength);
        const contextEnd = Math.min(text.length, end + contextLength);
        return text.substring(contextStart, contextEnd);
    }

    // Analyze text with a specific model
    async analyzeWithModel(text, modelKey) {
        const model = OPENMED_MODELS[modelKey];
        if (!model) {
            throw new Error(`Unknown model key: ${modelKey}`);
        }

        const textHash = this.generateTextHash(text, model.name);
        
        // Check cache first
        const cached = await this.checkCache(textHash);
        if (cached) {
            console.log(`Using cached result for ${modelKey}`);
            return cached;
        }

        // Call API
        console.log(`Calling Hugging Face API for ${modelKey}`);
        const apiResults = await this.callHuggingFaceAPI(model.name, text);
        
        // Process results
        const entities = this.processNERResults(apiResults, model.entityType, text);
        
        const result = {
            model: model.name,
            modelKey: modelKey,
            entityType: model.entityType,
            entities: entities,
            analyzedAt: new Date().toISOString()
        };

        // Save to cache
        await this.saveToCache(textHash, model.name, result);
        
        return result;
    }

    // Analyze text with multiple models
    async analyzeText(text, modelKeys = ['anatomy', 'medication', 'condition']) {
        const results = [];
        
        // Process models sequentially with delay to avoid rate limiting
        for (const key of modelKeys) {
            try {
                const result = await this.analyzeWithModel(text, key);
                if (result) {
                    results.push(result);
                }
                // Add small delay between API calls
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                console.error(`Error analyzing with ${key}:`, err);
            }
        }
        
        return results;
    }

    // Save entities to database
    async saveEntities(patientId, recordId, entities, modelUsed, sourceText) {
        const stmt = db.prepare(
            `INSERT INTO medical_entities 
             (patient_id, record_id, entity_type, entity_value, entity_category, 
              confidence, context, source_text, model_used, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        return new Promise((resolve, reject) => {
            db.serialize(() => {
                entities.forEach(entity => {
                    stmt.run(
                        patientId,
                        recordId,
                        entity.entityType,
                        entity.entityValue,
                        entity.entityCategory,
                        entity.confidence,
                        entity.context,
                        sourceText,
                        modelUsed,
                        JSON.stringify({ start: entity.start, end: entity.end })
                    );
                });
                
                stmt.finalize((err) => {
                    if (err) reject(err);
                    else {
                        // Update entity statistics
                        this.updateEntityStatistics(entities);
                        resolve();
                    }
                });
            });
        });
    }

    // Update entity statistics
    async updateEntityStatistics(entities) {
        const stmt = db.prepare(
            `INSERT INTO entity_statistics (entity_type, entity_value, occurrence_count, patient_count)
             VALUES (?, ?, 1, 1)
             ON CONFLICT(entity_type, entity_value) 
             DO UPDATE SET 
                occurrence_count = occurrence_count + 1,
                last_seen = CURRENT_TIMESTAMP`
        );

        entities.forEach(entity => {
            stmt.run(entity.entityType, entity.entityValue);
        });
        
        stmt.finalize();
    }

    // Get entities for a patient
    async getPatientEntities(patientId, entityType = null) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT DISTINCT entity_type, entity_value, MAX(confidence) as confidence,
                       COUNT(*) as occurrence_count, MAX(extracted_at) as last_seen
                FROM medical_entities 
                WHERE patient_id = ?`;
            
            const params = [patientId];
            
            if (entityType) {
                query += ' AND entity_type = ?';
                params.push(entityType);
            }
            
            query += ' GROUP BY entity_type, entity_value ORDER BY confidence DESC';
            
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Search patients by entity
    async searchPatientsByEntity(entityValue, entityType = null) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT DISTINCT p.id, p.first_name, p.last_name, p.email, 
                       GROUP_CONCAT(DISTINCT me.entity_value) as matching_entities
                FROM patients p
                JOIN medical_entities me ON p.id = me.patient_id
                WHERE LOWER(me.entity_value) LIKE LOWER(?)`;
            
            const params = [`%${entityValue}%`];
            
            if (entityType) {
                query += ' AND me.entity_type = ?';
                params.push(entityType);
            }
            
            query += ' GROUP BY p.id';
            
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Process a medical record
    async processMedicalRecord(recordId) {
        return new Promise(async (resolve, reject) => {
            try {
                // Get record details
                db.get(
                    `SELECT mr.*, p.id as patient_id 
                     FROM medical_records mr
                     JOIN patients p ON mr.patient_id = p.id
                     WHERE mr.id = ?`,
                    [recordId],
                    async (err, record) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        if (!record) {
                            reject(new Error('Record not found'));
                            return;
                        }
                        
                        // Add to processing queue
                        await this.addToProcessingQueue(recordId, 'medical_record');
                        
                        // Analyze the content
                        const analysisResults = await this.analyzeText(record.content);
                        
                        // Save entities for each model result
                        for (const result of analysisResults) {
                            if (result.entities.length > 0) {
                                await this.saveEntities(
                                    record.patient_id,
                                    recordId,
                                    result.entities,
                                    result.model,
                                    record.content
                                );
                            }
                        }
                        
                        // Update processing status
                        await this.updateProcessingStatus(recordId, 'completed');
                        
                        resolve(analysisResults);
                    }
                );
            } catch (error) {
                await this.updateProcessingStatus(recordId, 'failed', error.message);
                reject(error);
            }
        });
    }

    // Add record to processing queue
    async addToProcessingQueue(recordId, recordType) {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO ner_processing_queue (record_id, record_type, status)
                 VALUES (?, ?, 'processing')`,
                [recordId, recordType],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Update processing status
    async updateProcessingStatus(recordId, status, errorMessage = null) {
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE ner_processing_queue 
                 SET status = ?, error_message = ?, processed_at = CURRENT_TIMESTAMP
                 WHERE record_id = ?`,
                [status, errorMessage, recordId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Get entity statistics
    async getEntityStatistics(limit = 20) {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT entity_type, entity_value, occurrence_count, patient_count, last_seen
                 FROM entity_statistics
                 ORDER BY occurrence_count DESC
                 LIMIT ?`,
                [limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }
}

// Export singleton instance
module.exports = new NERService();