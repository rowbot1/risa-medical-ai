const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { dbAsync } = require('../utils/database');
const { sendEmail } = require('../utils/email');
const { verifyToken, isAdmin } = require('../middleware/auth');
const nerService = require('../services/nerService');

// Get all appointments (with filtering)
router.get('/appointments',
    verifyToken,
    isAdmin,
    async (req, res) => {
        try {
            const { date, status, patientId } = req.query;
            
            let query = `
                SELECT a.*, p.first_name, p.last_name, p.email, p.phone
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                WHERE 1=1
            `;
            const params = [];
            
            if (date) {
                query += ' AND a.appointment_date = ?';
                params.push(date);
            }
            
            if (status) {
                query += ' AND a.status = ?';
                params.push(status);
            }
            
            if (patientId) {
                query += ' AND a.patient_id = ?';
                params.push(patientId);
            }
            
            query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';
            
            const appointments = await dbAsync.all(query, params);
            
            res.json({ appointments });
        } catch (error) {
            console.error('Error fetching appointments:', error);
            res.status(500).json({ message: 'Failed to fetch appointments' });
        }
    }
);

// Update appointment status
router.put('/appointments/:appointmentId/status',
    verifyToken,
    isAdmin,
    [
        body('status').isIn(['pending', 'confirmed', 'completed', 'cancelled', 'no-show']),
        body('adminNotes').optional().trim()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            
            const { appointmentId } = req.params;
            const { status, adminNotes } = req.body;
            
            // Get appointment details
            const appointment = await dbAsync.get(
                `SELECT a.*, p.email, p.first_name, p.last_name
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.id
                 WHERE a.id = ?`,
                [appointmentId]
            );
            
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            
            // Update appointment
            await dbAsync.run(
                'UPDATE appointments SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, adminNotes || appointment.admin_notes, appointmentId]
            );
            
            // Send email notification for status changes
            if (status === 'confirmed' && appointment.status !== 'confirmed') {
                await sendEmail({
                    to: appointment.email,
                    subject: 'Appointment Confirmed - Risa Medical',
                    html: `
                        <h2>Appointment Confirmed</h2>
                        <p>Dear ${appointment.first_name} ${appointment.last_name},</p>
                        <p>Your appointment has been confirmed.</p>
                        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0;">
                            <p><strong>Date:</strong> ${appointment.appointment_date}</p>
                            <p><strong>Time:</strong> ${appointment.appointment_time}</p>
                            <p><strong>Service:</strong> ${appointment.service_type}</p>
                        </div>
                        <p>Please arrive 10 minutes early.</p>
                        <p>Best regards,<br>Dr. Leanne Sheridan</p>
                    `
                });
            }
            
            // Log status update
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [req.user.id, 'admin', 'appointment_status_updated', 
                 `Appointment ${appointmentId} status changed to ${status}`]
            );
            
            res.json({ message: 'Appointment status updated successfully' });
        } catch (error) {
            console.error('Error updating appointment status:', error);
            res.status(500).json({ message: 'Failed to update appointment status' });
        }
    }
);

// Get all patients
router.get('/patients',
    verifyToken,
    isAdmin,
    async (req, res) => {
        try {
            const { search, active } = req.query;
            
            let query = `
                SELECT id, email, first_name, last_name, phone, date_of_birth,
                       city, postcode, created_at, last_login, is_active
                FROM patients
                WHERE 1=1
            `;
            const params = [];
            
            if (search) {
                query += ` AND (
                    first_name LIKE ? OR 
                    last_name LIKE ? OR 
                    email LIKE ? OR 
                    phone LIKE ?
                )`;
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
            
            if (active !== undefined) {
                query += ' AND is_active = ?';
                params.push(active === 'true' ? 1 : 0);
            }
            
            query += ' ORDER BY last_name, first_name';
            
            const patients = await dbAsync.all(query, params);
            
            res.json({ patients });
        } catch (error) {
            console.error('Error fetching patients:', error);
            res.status(500).json({ message: 'Failed to fetch patients' });
        }
    }
);

// Get patient details
router.get('/patients/:patientId',
    verifyToken,
    isAdmin,
    async (req, res) => {
        try {
            const { patientId } = req.params;
            
            const patient = await dbAsync.get(
                'SELECT * FROM patients WHERE id = ?',
                [patientId]
            );
            
            if (!patient) {
                return res.status(404).json({ message: 'Patient not found' });
            }
            
            // Get patient's appointments
            const appointments = await dbAsync.all(
                'SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC',
                [patientId]
            );
            
            // Get medical records
            const medicalRecords = await dbAsync.all(
                'SELECT * FROM medical_records WHERE patient_id = ? ORDER BY created_at DESC',
                [patientId]
            );
            
            res.json({ 
                patient,
                appointments,
                medicalRecords
            });
        } catch (error) {
            console.error('Error fetching patient details:', error);
            res.status(500).json({ message: 'Failed to fetch patient details' });
        }
    }
);

// Add medical record
router.post('/patients/:patientId/medical-records',
    verifyToken,
    isAdmin,
    [
        body('recordType').notEmpty(),
        body('title').notEmpty().trim(),
        body('content').notEmpty().trim(),
        body('appointmentId').optional().isNumeric()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            
            const { patientId } = req.params;
            const { recordType, title, content, appointmentId } = req.body;
            
            const result = await dbAsync.run(
                `INSERT INTO medical_records 
                 (patient_id, appointment_id, record_type, title, content, created_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [patientId, appointmentId || null, recordType, title, content, req.user.email]
            );
            
            // Log medical record creation
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [req.user.id, 'admin', 'medical_record_created', 
                 `Medical record created for patient ${patientId}`]
            );
            
            // Process the medical record with NER (async - don't wait)
            nerService.processMedicalRecord(result.lastID).catch(err => {
                console.error('Error processing medical record with NER:', err);
            });
            
            res.status(201).json({ 
                message: 'Medical record created successfully',
                recordId: result.lastID,
                nerProcessing: 'initiated'
            });
        } catch (error) {
            console.error('Error creating medical record:', error);
            res.status(500).json({ message: 'Failed to create medical record' });
        }
    }
);

// Get all messages
router.get('/messages',
    verifyToken,
    isAdmin,
    async (req, res) => {
        try {
            const { unreadOnly, patientId } = req.query;
            
            let query = `
                SELECT m.*, p.first_name, p.last_name, p.email as patient_email
                FROM messages m
                JOIN patients p ON m.patient_id = p.id
                WHERE 1=1
            `;
            const params = [];
            
            if (unreadOnly === 'true') {
                query += ' AND m.is_read = 0';
            }
            
            if (patientId) {
                query += ' AND m.patient_id = ?';
                params.push(patientId);
            }
            
            query += ' ORDER BY m.created_at DESC';
            
            const messages = await dbAsync.all(query, params);
            
            res.json({ messages });
        } catch (error) {
            console.error('Error fetching messages:', error);
            res.status(500).json({ message: 'Failed to fetch messages' });
        }
    }
);

// Reply to message
router.post('/messages/:messageId/reply',
    verifyToken,
    isAdmin,
    [
        body('subject').notEmpty().trim(),
        body('message').notEmpty().trim()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            
            const { messageId } = req.params;
            const { subject, message } = req.body;
            
            // Get original message and patient info
            const originalMessage = await dbAsync.get(
                `SELECT m.*, p.email, p.first_name, p.last_name
                 FROM messages m
                 JOIN patients p ON m.patient_id = p.id
                 WHERE m.id = ?`,
                [messageId]
            );
            
            if (!originalMessage) {
                return res.status(404).json({ message: 'Message not found' });
            }
            
            // Create reply message
            const result = await dbAsync.run(
                'INSERT INTO messages (patient_id, sender_type, subject, message) VALUES (?, ?, ?, ?)',
                [originalMessage.patient_id, 'admin', `Re: ${subject}`, message]
            );
            
            // Mark original message as read
            await dbAsync.run(
                'UPDATE messages SET is_read = 1 WHERE id = ?',
                [messageId]
            );
            
            // Send email notification to patient
            await sendEmail({
                to: originalMessage.email,
                subject: `Re: ${subject} - Risa Medical`,
                html: `
                    <h2>Message from Dr. Sheridan</h2>
                    <p>Dear ${originalMessage.first_name} ${originalMessage.last_name},</p>
                    <p>You have received a reply to your message.</p>
                    <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0;">
                        <p><strong>Original Message:</strong></p>
                        <p>${originalMessage.message}</p>
                    </div>
                    <div style="background-color: #e8f4fd; padding: 15px; margin: 20px 0;">
                        <p><strong>Reply:</strong></p>
                        <p>${message}</p>
                    </div>
                    <p>Please log in to your patient portal to continue the conversation.</p>
                    <p>Best regards,<br>Dr. Leanne Sheridan</p>
                `
            });
            
            res.status(201).json({ 
                message: 'Reply sent successfully',
                messageId: result.id
            });
        } catch (error) {
            console.error('Error sending reply:', error);
            res.status(500).json({ message: 'Failed to send reply' });
        }
    }
);

// Get dashboard statistics
router.get('/dashboard',
    verifyToken,
    isAdmin,
    async (req, res) => {
        try {
            // Today's appointments
            const todayAppointments = await dbAsync.all(
                `SELECT a.*, p.first_name, p.last_name
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.id
                 WHERE a.appointment_date = date('now')
                 ORDER BY a.appointment_time`,
                []
            );
            
            // Upcoming appointments (next 7 days)
            const upcomingAppointments = await dbAsync.get(
                `SELECT COUNT(*) as count
                 FROM appointments
                 WHERE appointment_date > date('now')
                   AND appointment_date <= date('now', '+7 days')
                   AND status != 'cancelled'`,
                []
            );
            
            // Total active patients
            const activePatients = await dbAsync.get(
                'SELECT COUNT(*) as count FROM patients WHERE is_active = 1',
                []
            );
            
            // Unread messages
            const unreadMessages = await dbAsync.get(
                'SELECT COUNT(*) as count FROM messages WHERE sender_type = ? AND is_read = 0',
                ['patient']
            );
            
            // Recent registrations (last 7 days)
            const recentRegistrations = await dbAsync.get(
                `SELECT COUNT(*) as count 
                 FROM patients 
                 WHERE created_at >= datetime('now', '-7 days')`,
                []
            );
            
            res.json({
                todayAppointments,
                upcomingAppointments: upcomingAppointments.count,
                activePatients: activePatients.count,
                unreadMessages: unreadMessages.count,
                recentRegistrations: recentRegistrations.count
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            res.status(500).json({ message: 'Failed to fetch dashboard data' });
        }
    }
);

// Get audit logs (GDPR compliance)
router.get('/audit-logs',
    verifyToken,
    isAdmin,
    async (req, res) => {
        try {
            const { userId, userType, action, startDate, endDate } = req.query;
            
            let query = 'SELECT * FROM audit_logs WHERE 1=1';
            const params = [];
            
            if (userId) {
                query += ' AND user_id = ?';
                params.push(userId);
            }
            
            if (userType) {
                query += ' AND user_type = ?';
                params.push(userType);
            }
            
            if (action) {
                query += ' AND action = ?';
                params.push(action);
            }
            
            if (startDate) {
                query += ' AND created_at >= ?';
                params.push(startDate);
            }
            
            if (endDate) {
                query += ' AND created_at <= ?';
                params.push(endDate);
            }
            
            query += ' ORDER BY created_at DESC LIMIT 1000';
            
            const logs = await dbAsync.all(query, params);
            
            res.json({ logs });
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            res.status(500).json({ message: 'Failed to fetch audit logs' });
        }
    }
);

module.exports = router;