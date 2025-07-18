-- Add medical files table
CREATE TABLE IF NOT EXISTS medical_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size INTEGER NOT NULL,
    category TEXT DEFAULT 'general',
    description TEXT,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    is_deleted INTEGER DEFAULT 0,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_medical_files_patient ON medical_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_files_category ON medical_files(category);
CREATE INDEX IF NOT EXISTS idx_medical_files_deleted ON medical_files(is_deleted);