-- Add payment columns to appointments table
ALTER TABLE appointments ADD COLUMN payment_intent_id TEXT;
ALTER TABLE appointments ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE appointments ADD COLUMN payment_amount INTEGER DEFAULT 0;

-- Add payments table for payment history
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    payment_intent_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'gbp',
    status TEXT NOT NULL,
    payment_method TEXT,
    receipt_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- Create index for faster lookups
CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_appointments_payment_intent ON appointments(payment_intent_id);
