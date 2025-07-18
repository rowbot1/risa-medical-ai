-- Create dermatology analyses table
CREATE TABLE IF NOT EXISTS dermatology_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    analysis_results TEXT NOT NULL, -- JSON containing all analysis results
    primary_diagnosis TEXT,
    confidence_level TEXT,
    risk_level TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    notes TEXT,
    follow_up_required INTEGER DEFAULT 0,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dermatology_patient ON dermatology_analyses(patient_id);
CREATE INDEX IF NOT EXISTS idx_dermatology_date ON dermatology_analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_dermatology_diagnosis ON dermatology_analyses(primary_diagnosis);

-- Add dermatology images table
CREATE TABLE IF NOT EXISTS dermatology_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    body_location TEXT,
    lesion_size TEXT,
    duration TEXT,
    symptoms TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES dermatology_analyses(id) ON DELETE CASCADE
);