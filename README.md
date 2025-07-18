# Risa Medical - Private GP Practice Website

A professional, fully-functional website for Risa Medical private GP practice with integrated appointment booking system, patient portal, and GDPR-compliant data management.

## Features

### Frontend
- **Professional Medical Website**: Modern, trust-inspiring design optimized for healthcare
- **Appointment Booking System**: Real-time slot availability with automatic patient registration
- **Patient Portal**: Secure login area for patients to access their medical records
- **GDPR Compliance**: Privacy policy, terms of service, medical disclaimer, and cookie consent
- **Responsive Design**: Mobile-friendly layout that works on all devices
- **SEO Optimized**: Sitemap and proper meta tags for search engine visibility

### Backend
- **RESTful API**: Built with Node.js and Express.js
- **SQLite Database**: Stores patient information, appointments, and medical records
- **Authentication**: JWT-based secure authentication system
- **Email Notifications**: Automated appointment confirmations and reminders
- **Audit Logging**: GDPR-compliant activity tracking
- **Security**: Password hashing, CORS protection, rate limiting, and security headers

## Project Structure

```
risa/
├── index.html              # Main homepage
├── patient-portal.html     # Patient login page
├── privacy-policy.html     # GDPR privacy policy
├── terms.html             # Terms of service
├── disclaimer.html        # Medical disclaimer
├── 404.html              # Error page
├── styles.css            # Main stylesheet
├── scripts.js            # Frontend JavaScript
├── api.js               # API client for backend communication
├── cookie-consent.js    # Cookie consent management
├── sitemap.xml          # SEO sitemap
├── robots.txt           # Search engine directives
└── server/              # Backend application
    ├── server.js        # Express server
    ├── package.json     # Node dependencies
    ├── .env            # Environment variables
    ├── database/       # SQLite database files
    │   └── schema.sql  # Database schema
    ├── routes/         # API routes
    │   ├── auth.js     # Authentication endpoints
    │   ├── appointments.js  # Appointment management
    │   ├── patients.js      # Patient data management
    │   └── admin.js         # Admin functionality
    ├── middleware/     # Express middleware
    │   └── auth.js     # Authentication middleware
    └── utils/          # Utility functions
        ├── database.js # Database connection
        ├── email.js    # Email service
        └── initDatabase.js # Database initialization
```

## Booking System

The website uses **SimplyBook.me** for appointment booking and payment processing. This provides:
- Real-time availability
- Secure online payments via Stripe
- Automatic email confirmations
- SMS reminders
- GDPR compliance

See [SIMPLYBOOKME-SETUP.md](SIMPLYBOOKME-SETUP.md) for detailed setup instructions.

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)
- SimplyBook.me account (free tier available)

### Setup Instructions

1. **Clone or download the project**
   ```bash
   cd /Users/row/Downloads/risa
   ```

2. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Set up environment variables**
   - The `.env` file is already configured for development
   - For production, update with real values

4. **Initialize the database**
   ```bash
   node utils/initDatabase.js
   ```
   This creates the database and a default admin account:
   - Email: admin@risamedical.co.uk
   - Password: admin123 (change immediately)

5. **Configure SimplyBook.me**
   - Create account at [SimplyBook.me](https://simplybook.me)
   - Follow setup guide in [SIMPLYBOOKME-SETUP.md](SIMPLYBOOKME-SETUP.md)
   - Update widget URL in `booking-integrated.html`

## Test Accounts

For testing the platform, use these credentials:

**Admin Account:**
- Email: admin@risamedical.co.uk
- Password: admin123

**Patient Accounts:**
- john.doe@email.com / patient123
- jane.smith@email.com / patient123
- robert.johnson@email.com / patient123
- sarah.williams@email.com / patient123
- michael.brown@email.com / patient123

See [TEST_ACCOUNTS_GUIDE.md](TEST_ACCOUNTS_GUIDE.md) for full details.

## Running the Application

### Start the Backend Server
```bash
cd server
npm start
```
The API server will run on http://localhost:5001

### Start the Frontend Server
In a new terminal:
```bash
cd /Users/row/Downloads/risa
npx http-server -p 8080
```
The website will be available at http://localhost:8080

## Usage

### For Patients
1. Visit the website at http://localhost:8080
2. Book an appointment using the booking form
3. The system will automatically create an account
4. Check email for login credentials
5. Access the patient portal to view appointments and medical records

### For Administrators
1. Access admin features via API endpoints
2. Use the default admin credentials (change immediately)
3. Manage appointments, patients, and medical records

## Security Features

- **Password Security**: Bcrypt hashing with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **HTTPS Ready**: SSL/TLS configuration for production
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: All inputs are validated and sanitized
- **CORS Protection**: Configured for specific origins
- **Security Headers**: Helmet.js for additional protection

## GDPR Compliance

- **Explicit Consent**: Required during registration
- **Data Portability**: Patients can export their data
- **Right to Erasure**: Account deletion functionality
- **Audit Trail**: All actions are logged
- **Privacy by Design**: Minimal data collection
- **Cookie Consent**: Banner with opt-in/opt-out

## API Endpoints

### Authentication
- `POST /api/auth/register` - Patient registration
- `POST /api/auth/login` - Patient login
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password with token

### Appointments
- `GET /api/appointments/available-slots` - Check available times
- `POST /api/appointments/book` - Book appointment
- `GET /api/appointments/my-appointments` - View patient's appointments
- `PUT /api/appointments/:id/cancel` - Cancel appointment
- `PUT /api/appointments/:id/reschedule` - Reschedule appointment

### Patient Portal
- `GET /api/patients/profile` - Get patient profile
- `PUT /api/patients/profile` - Update profile
- `GET /api/patients/medical-records` - View medical records
- `POST /api/patients/messages` - Send message to practice
- `POST /api/patients/data-export` - Export personal data

### Admin Functions
- `GET /api/admin/appointments` - View all appointments
- `GET /api/admin/patients` - View all patients
- `POST /api/admin/medical-records` - Add medical records
- `GET /api/admin/audit-logs` - View audit logs

## Production Deployment

1. **Update Environment Variables**
   - Set strong JWT_SECRET
   - Configure real SMTP settings
   - Set NODE_ENV=production

2. **Enable SSL/TLS**
   - Obtain SSL certificate
   - Configure HTTPS in server

3. **Set Up Domain**
   - Point domain to server
   - Update FRONTEND_URL in .env

4. **Database Backup**
   - Set up regular backups
   - Test restore procedures

5. **Monitoring**
   - Set up error logging
   - Monitor server performance
   - Track API usage

## Maintenance

- Regularly update dependencies: `npm update`
- Review audit logs for suspicious activity
- Backup database regularly
- Monitor email delivery rates
- Update privacy policy as needed

## Support

For technical support or questions:
- Email: support@risamedical.co.uk
- Phone: 028 9335 2244

## License

This project is proprietary software for Risa Medical. All rights reserved.
