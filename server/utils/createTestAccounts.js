const bcrypt = require('bcryptjs');
const { dbAsync } = require('./database');

async function createTestAccounts() {
    console.log('Creating test accounts...\n');
    
    try {
        // Create Admin/Doctor account
        const adminEmail = 'doctor@risamedical.com';
        const adminPassword = 'doctor123';
        const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
        
        // Check if admin already exists
        const existingAdmin = await dbAsync.get('SELECT id FROM admin_users WHERE email = ?', [adminEmail]);
        
        if (!existingAdmin) {
            await dbAsync.run(
                `INSERT INTO admin_users (email, password, name, role, is_active, created_at)
                 VALUES (?, ?, 'Dr. Sarah Johnson', 'admin', 1, datetime('now'))`,
                [adminEmail, hashedAdminPassword]
            );
            console.log('✅ Admin account created:');
            console.log('   Email: doctor@risamedical.com');
            console.log('   Password: doctor123');
            console.log('   Name: Dr. Sarah Johnson\n');
        } else {
            console.log('ℹ️  Admin account already exists: doctor@risamedical.com\n');
        }
        
        // Create Patient account
        const patientEmail = 'patient@example.com';
        const patientPassword = 'patient123';
        const hashedPatientPassword = await bcrypt.hash(patientPassword, 10);
        
        // Check if patient already exists
        const existingPatient = await dbAsync.get('SELECT id FROM patients WHERE email = ?', [patientEmail]);
        
        if (!existingPatient) {
            const result = await dbAsync.run(
                `INSERT INTO patients (
                    email, password, first_name, last_name, phone, 
                    date_of_birth, gender, address, city, postcode,
                    emergency_contact_name, emergency_contact_phone,
                    medical_conditions, medications, allergies,
                    gdpr_consent, marketing_consent, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, datetime('now'))`,
                [
                    patientEmail,
                    hashedPatientPassword,
                    'John',
                    'Doe',
                    '+44 20 7946 0958',
                    '1985-06-15',
                    'male',
                    '123 Main Street',
                    'London',
                    'SW1A 1AA',
                    'Jane Doe',
                    '+44 20 7946 0959',
                    'Type 2 Diabetes, Hypertension',
                    'Metformin 500mg twice daily, Lisinopril 10mg once daily',
                    'Penicillin'
                ]
            );
            
            console.log('✅ Patient account created:');
            console.log('   Email: patient@example.com');
            console.log('   Password: patient123');
            console.log('   Name: John Doe');
            console.log('   Medical Conditions: Type 2 Diabetes, Hypertension');
            console.log('   Medications: Metformin, Lisinopril');
            console.log('   Allergies: Penicillin\n');
            
            // Create a sample medical record for the patient
            await dbAsync.run(
                `INSERT INTO medical_records (
                    patient_id, record_type, title, content, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                [
                    result.lastID,
                    'Consultation',
                    'Annual Health Check',
                    'Patient presented for annual health check. Blood pressure 140/90 (elevated). HbA1c 7.2% indicating suboptimal diabetes control. Discussed lifestyle modifications including diet and exercise. Increased Metformin dosage to 1000mg twice daily. Follow-up in 3 months to reassess.',
                    'Dr. Sarah Johnson'
                ]
            );
            console.log('   ✅ Sample medical record created\n');
        } else {
            console.log('ℹ️  Patient account already exists: patient@example.com\n');
        }
        
        console.log('=================================');
        console.log('LOGIN CREDENTIALS SUMMARY:');
        console.log('=================================');
        console.log('\n🏥 DOCTOR/ADMIN LOGIN:');
        console.log('   URL: http://localhost:8080/admin-login.html');
        console.log('   Email: doctor@risamedical.com');
        console.log('   Password: doctor123');
        console.log('\n👤 PATIENT LOGIN:');
        console.log('   URL: http://localhost:8080/patient-portal.html');
        console.log('   Email: patient@example.com');
        console.log('   Password: patient123');
        console.log('\n✨ The patient account includes medical data that will be automatically analyzed by the NER system!');
        
    } catch (error) {
        console.error('Error creating accounts:', error);
    }
}

// Run if called directly
if (require.main === module) {
    createTestAccounts()
        .then(() => {
            console.log('\n✅ Test accounts setup complete!');
            process.exit(0);
        })
        .catch(err => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}

module.exports = createTestAccounts;