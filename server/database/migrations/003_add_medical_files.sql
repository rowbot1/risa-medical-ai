-- Create medical_files table for storing uploaded documents
CREATE TABLE IF NOT EXISTS medical_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size INTEGER NOT NULL,
    category TEXT DEFAULT 'general',
    description TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_medical_files_patient ON medical_files(patient_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_medical_files_category ON medical_files(category);
CREATE INDEX IF NOT EXISTS idx_medical_files_upload_date ON medical_files(upload_date);