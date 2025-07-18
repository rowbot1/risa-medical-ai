# 🏥 Risa Medical + Twenty CRM Platform - Test Accounts & Usage Guide

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Node.js v18+ installed
- Port availability: 3000, 3002, 4000, 5001, 8080

### Installation & Setup

1. **Install dependencies:**
   ```bash
   # Install main dependencies
   cd /Users/row/Downloads/risa
   npm install
   
   # Install server dependencies
   cd server && npm install && cd ..
   
   # Install integration dependencies
   cd risa-platform/twenty-integration && npm install && cd ../..
   ```

2. **Seed the database with test data:**
   ```bash
   cd server && node seed-database.js
   ```

3. **Start the platform:**
   ```bash
   ./risa-platform/scripts/start-platform.sh
   ```

## 📋 Test Accounts

### Admin Account
- **Email:** admin@risamedical.co.uk
- **Password:** admin123
- **Access:** Full administrative access to patient management system

### Patient Accounts

#### 1. John Doe
- **Email:** john.doe@email.com
- **Password:** patient123
- **Details:**
  - DOB: 15/03/1985
  - Phone: +44 7700 900001
  - Medical Conditions: None
  - Has 3 past appointments and 2 upcoming appointments

#### 2. Jane Smith
- **Email:** jane.smith@email.com
- **Password:** patient123
- **Details:**
  - DOB: 22/07/1990
  - Phone: +44 7700 900003
  - Medical Conditions: Asthma
  - Medications: Ventolin inhaler
  - Allergies: Pollen

#### 3. Robert Johnson
- **Email:** robert.johnson@email.com
- **Password:** patient123
- **Details:**
  - DOB: 08/11/1978
  - Phone: +44 7700 900005
  - Medical Conditions: Type 2 Diabetes
  - Medications: Metformin
  - Allergies: Penicillin

#### 4. Sarah Williams
- **Email:** sarah.williams@email.com
- **Password:** patient123
- **Details:**
  - DOB: 28/02/1995
  - Phone: +44 7700 900007
  - Medical Conditions: None
  - Medications: Birth control

#### 5. Michael Brown
- **Email:** michael.brown@email.com
- **Password:** patient123
- **Details:**
  - DOB: 12/09/1982
  - Phone: +44 7700 900009
  - Medical Conditions: High blood pressure
  - Medications: Lisinopril
  - Allergies: Shellfish

## 🌐 Access Points

### 1. Patient Portal
**URL:** http://localhost:8080

**Features:**
- Patient login/registration
- Book appointments
- View medical records
- Secure messaging with practice
- View test results
- Update personal information

**How to test:**
1. Navigate to http://localhost:8080
2. Click "Patient Login"
3. Use any patient test account above
4. Explore features:
   - Dashboard shows upcoming appointments
   - Book new appointments
   - View past medical records
   - Send messages to admin

### 2. Admin Dashboard
**URL:** http://localhost:8080/admin-login.html

**Features:**
- View all patients
- Manage appointments
- Access medical records
- Respond to patient messages
- Generate reports

**How to test:**
1. Navigate to http://localhost:8080/admin-login.html
2. Login with admin@risamedical.co.uk / admin123
3. Manage patient data and appointments

### 3. Twenty CRM Interface
**URL:** http://localhost:3002

**Features:**
- 360° patient view
- Advanced CRM features
- Workflow automation
- Analytics dashboards
- Task management

### 4. Integration Dashboard
**URL:** http://localhost:4000

**Endpoints:**
- `/health` - System health check
- `/sync/patients` - Manual patient sync
- `/sync/appointments` - Manual appointment sync
- `/sync/full` - Full system sync
- `/stats` - Integration statistics

## 🧪 Testing Scenarios

### Scenario 1: Patient Books Appointment
1. Login as John Doe (john.doe@email.com)
2. Click "Book Appointment"
3. Select date and time
4. Choose service type
5. Confirm booking
6. Check dashboard for confirmation

### Scenario 2: Admin Manages Appointments
1. Login as admin
2. View appointments list
3. Update appointment status
4. Add admin notes
5. Send confirmation to patient

### Scenario 3: Medical Records Access
1. Login as any patient
2. Navigate to "Medical Records"
3. View past consultation notes
4. Download test results
5. Check prescription history

### Scenario 4: Secure Messaging
1. Login as Sarah Williams
2. Click "Messages"
3. Send question to admin
4. Switch to admin account
5. Reply to patient message

### Scenario 5: Data Synchronization
1. Access Integration Dashboard (http://localhost:4000)
2. Check `/health` endpoint
3. Trigger manual sync with `/sync/full`
4. Verify data in Twenty CRM

## 🔧 Troubleshooting

### Common Issues

1. **Cannot login:**
   - Ensure database is seeded: `cd server && node seed-database.js`
   - Check server is running: `cd server && npm run dev`

2. **Appointments not showing:**
   - Run sync: `curl -X POST http://localhost:4000/sync/full`
   - Check integration logs

3. **Docker issues:**
   - Ensure Docker Desktop is running
   - Check ports are free: `lsof -i :3000,3002,4000,5001,8080`
   - Restart Docker if needed

4. **Database errors:**
   - Reset database: `rm server/database/risa_medical.db`
   - Re-initialize: `cd server && node utils/initDatabase.js`
   - Re-seed: `cd server && node seed-database.js`

## 📊 Test Data Overview

Each test patient has:
- **3 completed appointments** (past 3 months)
- **2 upcoming appointments** (next 2 weeks)
- **3 medical records** linked to past appointments
- **3 messages** (2 from admin, 1 from patient)

## 🔒 Security Notes

- All test passwords are set to simple values for testing only
- In production, enforce strong password policies
- Test data includes GDPR consent flags
- No real patient data is used

## 📝 Additional Commands

```bash
# View server logs
cd server && npm run dev

# View integration logs
cd risa-platform/twenty-integration && npm start

# Check database content
sqlite3 server/database/risa_medical.db "SELECT * FROM patients;"

# Reset everything
./risa-platform/scripts/reset-platform.sh
```

## 🎯 Next Steps

1. Test all patient accounts to ensure functionality
2. Verify data sync between systems
3. Configure email settings for production
4. Set up SSL certificates
5. Deploy to production environment

---

**Need Help?** Check the logs in:
- Server logs: Terminal running `npm run dev`
- Integration logs: `risa-platform/twenty-integration/logs/`
- Docker logs: `docker-compose logs -f`
