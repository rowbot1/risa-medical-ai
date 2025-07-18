const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const moment = require('moment');

// Database path
const dbPath = path.join(__dirname, 'database', 'risa_medical.db');

// Test data
const testPatients = [
  {
    email: 'john.doe@email.com',
    password: 'patient123',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+44 7700 900001',
    date_of_birth: '1985-03-15',
    gender: 'Male',
    address: '123 High Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    emergency_contact_name: 'Jane Doe',
    emergency_contact_phone: '+44 7700 900002',
    medical_conditions: 'None',
    medications: 'None',
    allergies: 'None',
    gdpr_consent: 1,
    marketing_consent: 1
  },
  {
    email: 'jane.smith@email.com',
    password: 'patient123',
    first_name: 'Jane',
    last_name: 'Smith',
    phone: '+44 7700 900003',
    date_of_birth: '1990-07-22',
    gender: 'Female',
    address: '456 Park Lane',
    city: 'Manchester',
    postcode: 'M1 1AA',
    emergency_contact_name: 'Bob Smith',
    emergency_contact_phone: '+44 7700 900004',
    medical_conditions: 'Asthma',
    medications: 'Ventolin inhaler',
    allergies: 'Pollen',
    gdpr_consent: 1,
    marketing_consent: 0
  },
  {
    email: 'robert.johnson@email.com',
    password: 'patient123',
    first_name: 'Robert',
    last_name: 'Johnson',
    phone: '+44 7700 900005',
    date_of_birth: '1978-11-08',
    gender: 'Male',
    address: '789 Queen Street',
    city: 'Birmingham',
    postcode: 'B1 1BB',
    emergency_contact_name: 'Mary Johnson',
    emergency_contact_phone: '+44 7700 900006',
    medical_conditions: 'Type 2 Diabetes',
    medications: 'Metformin',
    allergies: 'Penicillin',
    gdpr_consent: 1,
    marketing_consent: 1
  },
  {
    email: 'sarah.williams@email.com',
    password: 'patient123',
    first_name: 'Sarah',
    last_name: 'Williams',
    phone: '+44 7700 900007',
    date_of_birth: '1995-02-28',
    gender: 'Female',
    address: '321 Kings Road',
    city: 'Edinburgh',
    postcode: 'EH1 1AA',
    emergency_contact_name: 'Tom Williams',
    emergency_contact_phone: '+44 7700 900008',
    medical_conditions: 'None',
    medications: 'Birth control',
    allergies: 'None',
    gdpr_consent: 1,
    marketing_consent: 1
  },
  {
    email: 'michael.brown@email.com',
    password: 'patient123',
    first_name: 'Michael',
    last_name: 'Brown',
    phone: '+44 7700 900009',
    date_of_birth: '1982-09-12',
    gender: 'Male',
    address: '654 Victoria Street',
    city: 'Cardiff',
    postcode: 'CF1 1AA',
    emergency_contact_name: 'Lisa Brown',
    emergency_contact_phone: '+44 7700 900010',
    medical_conditions: 'High blood pressure',
    medications: 'Lisinopril',
    allergies: 'Shellfish',
    gdpr_consent: 1,
    marketing_consent: 0
  }
];

const serviceTypes = [
  'Initial Consultation',
  'Follow-up Consultation',
  'Telehealth Consultation',
  'Minor Procedure',
  'Blood Test',
  'Vaccination',
  'Health Check-up'
];

// Open database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Function to hash password
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Function to generate appointments
function generateAppointments(patientId, patientName) {
  const appointments = [];
  
  // Past appointments
  for (let i = 0; i < 3; i++) {
    const date = moment().subtract(i * 30 + 10, 'days');
    appointments.push({
      patient_id: patientId,
      appointment_date: date.format('YYYY-MM-DD'),
      appointment_time: ['09:00', '10:30', '14:00', '15:30'][Math.floor(Math.random() * 4)],
      service_type: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
      status: 'completed',
      notes: 'Routine check-up completed successfully.'
    });
  }
  
  // Current appointments
  for (let i = 0; i < 2; i++) {
    const date = moment().add(i * 7 + 1, 'days');
    appointments.push({
      patient_id: patientId,
      patient_first_name: patientName.split(' ')[0],
      patient_last_name: patientName.split(' ')[1],
      appointment_date: date.format('YYYY-MM-DD'),
      appointment_time: ['09:00', '10:30', '14:00', '15:30'][Math.floor(Math.random() * 4)],
      service_type: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
      status: i === 0 ? 'confirmed' : 'pending',
      notes: i === 0 ? 'Confirmed via phone.' : 'Awaiting confirmation.'
    });
  }
  
  return appointments;
}

// Function to generate medical records
function generateMedicalRecords(patientId, appointments) {
  const records = [];
  const recordTypes = ['Consultation Notes', 'Test Results', 'Prescription', 'Treatment Plan'];
  
  appointments.filter(a => a.status === 'completed').forEach((appointment, index) => {
    records.push({
      patient_id: patientId,
      appointment_id: null, // Will be set after appointment is inserted
      record_type: recordTypes[index % recordTypes.length],
      content: `Medical record for appointment on ${appointment.appointment_date}. Patient presented with routine concerns. All vitals normal. Follow-up recommended in 3 months.`,
      created_date: appointment.appointment_date
    });
  });
  
  return records;
}

// Function to generate messages
function generateMessages(patientId, patientName) {
  const messages = [
    {
      patient_id: patientId,
      subject: 'Appointment Confirmation',
      message: 'Your appointment has been confirmed. Please arrive 10 minutes early.',
      sender: 'admin',
      sent_date: moment().subtract(2, 'days').format('YYYY-MM-DD HH:mm:ss'),
      is_read: 1
    },
    {
      patient_id: patientId,
      subject: 'Test Results Available',
      message: 'Your recent test results are now available. Please log in to view them.',
      sender: 'admin',
      sent_date: moment().subtract(5, 'days').format('YYYY-MM-DD HH:mm:ss'),
      is_read: 1
    },
    {
      patient_id: patientId,
      subject: 'Question about medication',
      message: 'I have a question about the medication prescribed last week. Can you please clarify the dosage?',
      sender: 'patient',
      sent_date: moment().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      is_read: 0
    }
  ];
  
  return messages;
}

// Seed database
async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Clear existing test data
    console.log('Clearing existing test data...');
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM messages WHERE patient_id IN (SELECT id FROM patients WHERE email LIKE '%@email.com')", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM medical_records WHERE patient_id IN (SELECT id FROM patients WHERE email LIKE '%@email.com')", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM appointments WHERE patient_id IN (SELECT id FROM patients WHERE email LIKE '%@email.com')", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM patients WHERE email LIKE '%@email.com'", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Insert test patients
    console.log('Inserting test patients...');
    for (const patient of testPatients) {
      const hashedPassword = await hashPassword(patient.password);
      
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO patients (email, password, first_name, last_name, phone, 
           date_of_birth, gender, address, city, postcode, 
           emergency_contact_name, emergency_contact_phone, medical_conditions,
           medications, allergies, gdpr_consent, marketing_consent, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            patient.email,
            hashedPassword,
            patient.first_name,
            patient.last_name,
            patient.phone,
            patient.date_of_birth,
            patient.gender,
            patient.address,
            patient.city,
            patient.postcode,
            patient.emergency_contact_name,
            patient.emergency_contact_phone,
            patient.medical_conditions,
            patient.medications,
            patient.allergies,
            patient.gdpr_consent,
            patient.marketing_consent
          ],
          function(err) {
            if (err) {
              reject(err);
            } else {
              const patientId = this.lastID;
              console.log(`✓ Created patient: ${patient.first_name} ${patient.last_name} (ID: ${patientId})`);
              
              // Generate appointments for this patient
              const appointments = generateAppointments(patientId, `${patient.first_name} ${patient.last_name}`);
              const appointmentIds = [];
              
              // Insert appointments
              Promise.all(appointments.map((appointment) => {
                return new Promise((resolveApp, rejectApp) => {
                  db.run(
                    `INSERT INTO appointments (patient_id, 
                     appointment_date, appointment_time, service_type, status, notes, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
                    [
                      appointment.patient_id,
                      appointment.appointment_date,
                      appointment.appointment_time,
                      appointment.service_type,
                      appointment.status,
                      appointment.notes
                    ],
                    function(appErr) {
                      if (appErr) {
                        rejectApp(appErr);
                      } else {
                        appointmentIds.push({ id: this.lastID, status: appointment.status });
                        resolveApp();
                      }
                    }
                  );
                });
              })).then(() => {
                console.log(`  ✓ Created ${appointments.length} appointments`);
                
                // Generate and insert medical records
                const records = generateMedicalRecords(patientId, appointments);
                const completedAppointmentIds = appointmentIds.filter(a => a.status === 'completed').map(a => a.id);
                
                Promise.all(records.map((record, index) => {
                  return new Promise((resolveRec, rejectRec) => {
                    db.run(
                      `INSERT INTO medical_records (patient_id, appointment_id, record_type, title, content, created_at) 
                       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                      [
                        record.patient_id,
                        completedAppointmentIds[index] || null,
                        record.record_type,
                        record.record_type,
                        record.content
                      ],
                      (recErr) => {
                        if (recErr) rejectRec(recErr);
                        else resolveRec();
                      }
                    );
                  });
                })).then(() => {
                  console.log(`  ✓ Created ${records.length} medical records`);
                  
                  // Generate and insert messages
                  const messages = generateMessages(patientId, `${patient.first_name} ${patient.last_name}`);
                  
                  Promise.all(messages.map((message) => {
                    return new Promise((resolveMsg, rejectMsg) => {
                      db.run(
                        `INSERT INTO messages (patient_id, sender_type, subject, message, is_read, created_at) 
                         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                        [
                          message.patient_id,
                          message.sender,
                          message.subject,
                          message.message,
                          message.is_read
                        ],
                        (msgErr) => {
                          if (msgErr) rejectMsg(msgErr);
                          else resolveMsg();
                        }
                      );
                    });
                  })).then(() => {
                    console.log(`  ✓ Created ${messages.length} messages\n`);
                    resolve();
                  }).catch(reject);
                }).catch(reject);
              }).catch(reject);
            }
          }
        );
      });
    }
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Test Accounts Created:');
    console.log('─────────────────────────');
    console.log('Admin Account:');
    console.log('  Email: admin@risamedical.co.uk');
    console.log('  Password: admin123');
    console.log('\nPatient Accounts:');
    testPatients.forEach(patient => {
      console.log(`  ${patient.first_name} ${patient.last_name}:`);
      console.log(`    Email: ${patient.email}`);
      console.log(`    Password: ${patient.password}`);
    });
    console.log('─────────────────────────\n');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    db.close(() => {
      console.log('Database connection closed.');
    });
  }
}

// Run the seeding
seedDatabase();
