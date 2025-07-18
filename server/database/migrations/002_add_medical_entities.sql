-- Migration: Add medical entities tables for NER integration
-- Date: 2025-01-18
-- Description: Adds tables to store extracted medical entities from OpenMed NER models

-- Table to store extracted medical entities
CREATE TABLE IF NOT EXISTS medical_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    record_id INTEGER,
    entity_type TEXT NOT NULL, -- anatomy, medication, condition, oncology, protein, genome, species
    entity_value TEXT NOT NULL, -- The actual extracted entity (e.g., "insulin", "diabetes", "liver")
    entity_category TEXT, -- Additional categorization from the model
    confidence REAL, -- Confidence score from the model
    context TEXT, -- Surrounding text context
    source_text TEXT, -- Original text where entity was found
    model_used TEXT NOT NULL, -- Which OpenMed model was used
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT, -- JSON string for additional model output
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE SET NULL
);

-- Index for fast searching
CREATE INDEX idx_medical_entities_patient ON medical_entities(patient_id);
CREATE INDEX idx_medical_entities_type ON medical_entities(entity_type);
CREATE INDEX idx_medical_entities_value ON medical_entities(entity_value);
CREATE INDEX idx_medical_entities_record ON medical_entities(record_id);

-- Table to cache NER analysis results
CREATE TABLE IF NOT EXISTS ner_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_hash TEXT UNIQUE NOT NULL, -- SHA-256 hash of the input text
    model_name TEXT NOT NULL,
    analysis_result TEXT NOT NULL, -- JSON string of the full analysis result
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_ner_cache_hash ON ner_cache(text_hash);
CREATE INDEX idx_ner_cache_expires ON ner_cache(expires_at);

-- Table to track NER processing status
CREATE TABLE IF NOT EXISTS ner_processing_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    record_type TEXT NOT NULL, -- 'medical_record', 'appointment_note', 'patient_condition'
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE CASCADE
);

CREATE INDEX idx_ner_queue_status ON ner_processing_queue(status);
CREATE INDEX idx_ner_queue_created ON ner_processing_queue(created_at);

-- Table to store entity statistics for dashboard
CREATE TABLE IF NOT EXISTS entity_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_value TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    patient_count INTEGER DEFAULT 1,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_type, entity_value)
);

CREATE INDEX idx_entity_stats_type ON entity_statistics(entity_type);
CREATE INDEX idx_entity_stats_count ON entity_statistics(occurrence_count DESC);