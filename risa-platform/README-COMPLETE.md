# 🏥 Risa Medical Enhanced Platform with Twenty CRM

## Overview

This is the enhanced version of Risa Medical that integrates Twenty CRM to provide a comprehensive, enterprise-grade healthcare management platform. The integration brings advanced CRM capabilities, workflow automation, and modern UI/UX to the existing medical practice system.

## 🚀 Key Features

### Enhanced Patient Management
- **360° Patient View**: Complete patient history, appointments, communications, and medical records in one place
- **Advanced Search & Filtering**: Find patients quickly with powerful search capabilities
- **Patient Journey Tracking**: Monitor patient progress through treatment pipelines
- **Automated Follow-ups**: Scheduled reminders and check-ins

### Appointment & Scheduling
- **Visual Calendar Management**: Kanban boards and calendar views for appointments
- **Smart Scheduling**: Conflict detection and optimization
- **Automated Reminders**: SMS and email notifications
- **Multi-Provider Support**: Manage multiple practitioners' schedules

### Medical Records & Documentation
- **Unified Record System**: All patient documents in one secure location
- **Version Control**: Track changes and maintain audit trails
- **Template Management**: Standardized forms and documents
- **File Attachments**: Support for images, PDFs, and other medical files

### Communication Hub
- **Unified Messaging**: Email, SMS, and in-app messaging in one place
- **Secure Patient Portal**: HIPAA-compliant communications
- **Automated Campaigns**: Health reminders and educational content
- **Team Collaboration**: Internal notes and task assignments

### Analytics & Reporting
- **Practice Analytics**: Revenue, patient retention, appointment metrics
- **Health Outcomes**: Track treatment effectiveness
- **Custom Reports**: Build your own dashboards
- **Predictive Insights**: AI-powered recommendations

### Workflow Automation
- **Custom Workflows**: Automate routine tasks
- **Trigger-Based Actions**: Set up rules for automatic responses
- **Task Management**: Assign and track team tasks
- **Integration APIs**: Connect with other healthcare systems

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/HTML/JS)                 │
│                         Port: 8080                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    Proxy Server (Express)                    │
│                  Routes API calls to services                │
└──────────────┬─────────────────────────┬────────────────────┘
               │                         │
┌──────────────┴───────────┐  ┌─────────┴────────────────────┐
│   Risa Medical Backend   │  │   Integration Service        │
│   (Node.js/Express)      │  │   (Node.js/Express)          │
│   Port: 5001             │  │   Port: 4000                 │
│   - Patient Management   │  │   - Data Sync                │
│   - Appointments         │  │   - Webhook Processing       │
│   - Medical Records      │  │   - Queue Management         │
│   - Authentication       │  │   - Real-time Updates        │
└──────────┬───────────────┘  └─────────┬────────────────────┘
           │                             │
┌──────────┴───────────────┐  ┌─────────┴────────────────────┐
│   SQLite Database        │  │   Twenty CRM                 │
│   - Patient Data         │  │   (GraphQL API)              │
│   - Appointments         │  │   Port: 3000                 │
│   - Medical Records      │  │   - CRM Features             │
│   - Audit Logs           │  │   - Workflow Engine          │
└──────────────────────────┘  │   - Analytics                │
                              └──────────┬────────────────────┘
                                         │
                              ┌──────────┴────────────────────┐
                              │   PostgreSQL + Redis          │
                              │   - Twenty Data              │
                              │   - Queue Storage            │
                              └───────────────────────────────┘
```

## 📋 Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose
- 8GB RAM minimum
- 10GB free disk space

## 🛠️ Installation

1. **Clone the repository** (if not already done):
   ```bash
   cd /Users/row/Downloads/risa
   ```

2. **Install dependencies**:
   ```bash
   # Install main project dependencies
   npm install
   
   # Install server dependencies
   cd server
   npm install
   cd ..
   
   # Install integration service dependencies
   cd risa-platform/twenty-integration
   npm install
   cd ../..
   ```

3. **Set up environment variables**:
   - The `.env` files have been pre-configured for development
   - For production, update with real values

4. **Start the platform**:
   ```bash
   # Make the start script executable (already done)
   chmod +x risa-platform/scripts/start-platform.sh
   
   # Start all services
   ./risa-platform/scripts/start-platform.sh
   ```

## 🌐 Accessing the Platform

Once all services are running:

- **Risa Medical Frontend**: http://localhost:8080
  - Patient portal and appointment booking
  - Default admin: admin@risamedical.co.uk / admin123

- **Twenty CRM Interface**: http://localhost:3001
  - Advanced CRM features and analytics
  - Staff-facing interface for patient management

- **Integration Dashboard**: http://localhost:4000
  - Monitor sync status and queue health
  - View integration statistics

## 📚 Usage Guide

### For Patients

1. **Book Appointments**: 
   - Visit http://localhost:8080
   - Fill out the booking form
   - Receive confirmation email

2. **Access Patient Portal**:
   - Login with credentials sent via email
   - View appointments and medical records
   - Send secure messages to the practice

### For Staff

1. **Access Twenty CRM**:
   - Navigate to http://localhost:3001
   - Login with staff credentials
   - Access full CRM features

2. **Manage Patients**:
   - 360° view of patient information
   - Track patient journeys
   - Manage appointments and communications

3. **Use Workflows**:
   - Automated appointment reminders
   - Follow-up task creation
   - Custom automation rules

## 🔧 Configuration

### Sync Settings

Edit `risa-platform/docker/.env` to configure:
- `SYNC_INTERVAL_MINUTES`: How often to sync data (default: 5)
- `ENABLE_AUTO_SYNC`: Enable/disable automatic sync (default: true)

### Email Configuration

Update SMTP settings in:
- `server/.env` for Risa Medical emails
- `risa-platform/docker/docker-compose.yml` for Twenty CRM emails

### Database Backups

The platform uses:
- SQLite for Risa Medical data (located at `server/database/risa_medical.db`)
- PostgreSQL for Twenty CRM data (managed by Docker)

Regular backups are recommended for both databases.

## 🛡️ Security Features

- **HIPAA Compliance**: Encrypted data storage and transmission
- **Role-Based Access**: Granular permissions for staff
- **Audit Trails**: Complete activity logging
- **GDPR Compliance**: Data export and deletion capabilities
- **Secure Communications**: End-to-end encryption for messages

## 📊 API Documentation

### Risa Medical API (Port 5001)

- `/api/auth/*` - Authentication endpoints
- `/api/appointments/*` - Appointment management
- `/api/patients/*` - Patient data access
- `/api/admin/*` - Administrative functions

### Integration API (Port 4000)

- `/health` - Service health check
- `/sync/full` - Trigger full system sync
- `/sync/patients` - Sync patient data
- `/queue/status` - View queue status
- `/stats` - Integration statistics

### Twenty CRM GraphQL API (Port 3000)

Access the GraphQL playground at http://localhost:3000/graphql

## 🚨 Troubleshooting

### Common Issues

1. **Docker not running**:
   ```bash
   # Start Docker Desktop or Docker daemon
   sudo systemctl start docker  # Linux
   ```

2. **Port conflicts**:
   - Check if ports 3000, 3001, 4000, 5001, 5432, 6379, 8080 are available
   - Modify port mappings in `docker-compose.yml` if needed

3. **Database connection errors**:
   ```bash
   # Reset the database
   cd server
   node utils/initDatabase.js
   ```

4. **Sync not working**:
   - Check integration service logs: `docker logs risa-platform_risa-integration_1`
   - Verify Redis is running: `docker ps | grep redis`

### Viewing Logs

```bash
# View all Docker service logs
cd risa-platform/docker
docker-compose logs -f

# View specific service logs
docker-compose logs -f twenty-server
docker-compose logs -f risa-integration
```

## 🔄 Updates and Maintenance

### Updating Twenty CRM

```bash
cd risa-platform/docker
docker-compose pull
docker-compose up -d
```

### Database Migrations

Twenty CRM handles migrations automatically. For Risa Medical:
```bash
cd server
node utils/initDatabase.js
```

## 📞 Support

For issues or questions:
- Create an issue in the repository
- Contact: support@risamedical.co.uk
- Documentation: See `/docs` directory

## 📄 License

This project is proprietary software for Risa Medical. All rights reserved.

## 🙏 Acknowledgments

- Built on top of [Twenty CRM](https://twenty.com)
- Powered by Node.js, Express, React, and PostgreSQL
- Integrated with modern healthcare standards

---

## 🎉 Congratulations!

You now have a fully functional, enterprise-grade healthcare management platform that combines:
- The reliability and compliance of Risa Medical
- The power and flexibility of Twenty CRM
- Modern workflow automation and analytics
- Seamless integration between both systems

This platform represents a significant upgrade from a basic medical practice website to a comprehensive healthcare CRM solution that can scale with your practice's growth.
