# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend Development
```bash
# Start frontend development server
npm run dev  # Runs proxy server with backend integration
# OR for static serving only:
npm run start:static  # Serves static files on port 8080
```

### Backend Development
```bash
# Navigate to backend
cd server

# Install dependencies
npm install

# Initialize database (creates tables and admin account)
node utils/initDatabase.js

# Seed database with test data
node seed-database.js

# Start backend server
npm start  # Runs on port 5001
# OR for development with auto-reload:
npm run dev
```

### Twenty CRM Integration
```bash
# Navigate to integration service
cd risa-platform/twenty-integration

# Install dependencies
npm install

# Start integration service
npm start
# OR for development:
npm run dev
```

### Deployment
```bash
# Deploy frontend to Netlify
npm run deploy
```

## Architecture Overview

### Frontend (Root Directory)
Static HTML/CSS/JavaScript website with no build process:
- **Entry Points**: `index.html` (main site), `patient-portal.html` (patient login)
- **API Communication**: `api.js` handles all backend calls with JWT authentication
- **Auth Flow**: `auth-check.js` manages session state and redirects
- **Proxy Server**: `proxy-server.js` provides development server with API forwarding

### Backend (`/server`)
Express.js REST API with SQLite database:
- **Authentication**: JWT-based with middleware in `/middleware/auth.js`
- **Database**: SQLite with schema in `/database/schema.sql`, accessed via `/utils/database.js`
- **Routes Structure**:
  - `/routes/auth.js`: Registration, login, password reset
  - `/routes/appointments.js`: Booking, viewing, cancellation
  - `/routes/patients.js`: Profile management, medical records
  - `/routes/admin.js`: Admin-only operations
  - `/routes/payments.js`: Stripe payment processing
- **Email Service**: Nodemailer configuration in `/utils/email.js`

### Twenty CRM Integration (`/risa-platform/twenty-integration`)
Microservice for CRM synchronization:
- **GraphQL Client**: Apollo Client for Twenty CRM API communication
- **Queue Processing**: Bull/Redis for async job handling
- **Webhook Handler**: Real-time updates from Twenty CRM
- **Data Sync**: Bidirectional synchronization of patients and appointments

### Key Patterns

1. **Authentication Flow**:
   - Frontend stores JWT in localStorage
   - `api.js` automatically includes token in headers
   - Backend validates token via middleware

2. **Database Access**:
   - All database operations go through `/server/utils/database.js`
   - Use prepared statements for security
   - Transactions for multi-step operations

3. **Error Handling**:
   - Consistent error response format: `{ error: "message" }`
   - Frontend displays errors via toast notifications
   - Backend logs errors with context

4. **GDPR Compliance**:
   - Audit logging for all data access
   - Explicit consent tracking
   - Data export/deletion endpoints

### Testing

Currently no automated tests are configured. Manual testing via:
- `test-api.html`: API endpoint testing
- `test-login.html`: Authentication flow testing
- `test-dashboard.html`: Patient portal testing

### Security Considerations

- Always use prepared statements for database queries
- Validate all inputs with express-validator
- Rate limiting on sensitive endpoints
- CORS configured for specific origins only
- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 24 hours