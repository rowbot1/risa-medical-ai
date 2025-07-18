const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { dbAsync } = require('../utils/database');
const { sendEmail } = require('../utils/email');
const { verifyToken, canAccessPatient } = require('../middleware/auth');
const nerService = require('../services/nerService');

// Get patient profile
router.get('/profile',
    verifyToken,
    async (req, res) => {
        try {
            const patientId = req.user.id;
            
            const patient = await dbAsync.get(
                `SELECT id, email, first_name, last_name, phone, date_of_birth, 
                        gender, address, city, postcode, emergency_contact_name, 
                        emergency_contact_phone, medical_conditions, medications, 
                        allergies, marketing_consent, created_at, last_login
                 FROM patients WHERE id = ?`,
                [patientId]
            );
            
            if (!patient) {
                return res.status(404).json({ message: 'Patient not found' });
            }
            
            res.json({ patient });
        } catch (error) {
            console.error('Error fetching patient profile:', error);
            res.status(500).json({ message: 'Failed to fetch profile' });
        }
    }
);

// Update patient profile
router.put('/profile',
    verifyToken,
    [
        body('phone').optional().notEmpty(),
        body('address').optional().trim(),
        body('city').optional().trim(),
        body('postcode').optional().trim(),
        body('emergencyContactName').optional().trim(),
        body('emergencyContactPhone').optional().trim(),
        body('marketingConsent').optional().isBoolean()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            
            const patientId = req.user.id;
            const updates = [];
            const values = [];
            
            const allowedFields = {
                phone: 'phone',
                address: 'address',
                city: 'city',
                postcode: 'postcode',
                emergencyContactName: 'emergency_contact_name',
                emergencyContactPhone: 'emergency_contact_phone',
                marketingConsent: 'marketing_consent'
            };
            
            for (const [key, dbField] of Object.entries(allowedFields)) {
                if (req.body.hasOwnProperty(key)) {
                    updates.push(`${dbField} = ?`);
                    values.push(req.body[key]);
                }
            }
            
            if (updates.length === 0) {
                return res.status(400).json({ message: 'No valid fields to update' });
            }
            
            values.push(patientId);
            
            await dbAsync.run(
                `UPDATE patients SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                values
            );
            
            // Log profile update
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patientId, 'patient', 'profile_updated', 'Patient updated profile information']
            );
            
            res.json({ message: 'Profile updated successfully' });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ message: 'Failed to update profile' });
        }
    }
);

// Update medical information
router.put('/medical-info',
    verifyToken,
    [
        body('medicalConditions').optional().trim(),
        body('medications').optional().trim(),
        body('allergies').optional().trim()
    ],
    async (req, res) => {
        try {
            const patientId = req.user.id;
            const { medicalConditions, medications, allergies } = req.body;
            
            await dbAsync.run(
                `UPDATE patients SET 
                    medical_conditions = ?, 
                    medications = ?, 
                    allergies = ?,
                    updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [medicalConditions, medications, allergies, patientId]
            );
            
            // Log medical info update for GDPR
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patientId, 'patient', 'medical_info_updated', 'Patient updated medical information']
            );
            
            // Process medical information with NER (async - don't wait)
            const textToAnalyze = [
                medicalConditions && `Medical Conditions: ${medicalConditions}`,
                medications && `Medications: ${medications}`,
                allergies && `Allergies: ${allergies}`
            ].filter(Boolean).join('\n');
            
            if (textToAnalyze) {
                nerService.analyzeText(textToAnalyze, ['condition', 'medication', 'anatomy'])
                    .then(async (results) => {
                        for (const result of results) {
                            if (result && result.entities && result.entities.length > 0) {
                                await nerService.saveEntities(
                                    patientId,
                                    null, // No specific medical record
                                    result.entities,
                                    result.model,
                                    textToAnalyze
                                );
                            }
                        }
                    })
                    .catch(err => {
                        console.error('Error processing medical info with NER:', err);
                    });
            }
            
            res.json({ message: 'Medical information updated successfully' });
        } catch (error) {
            console.error('Error updating medical info:', error);
            res.status(500).json({ message: 'Failed to update medical information' });
        }
    }
);

// Get patient's medical records
router.get('/medical-records',
    verifyToken,
    async (req, res) => {
        try {
            const patientId = req.user.id;
            
            const records = await dbAsync.all(
                `SELECT mr.*, a.appointment_date, a.appointment_time, a.service_type
                 FROM medical_records mr
                 LEFT JOIN appointments a ON mr.appointment_id = a.id
                 WHERE mr.patient_id = ?
                 ORDER BY mr.created_at DESC`,
                [patientId]
            );
            
            res.json({ records });
        } catch (error) {
            console.error('Error fetching medical records:', error);
            res.status(500).json({ message: 'Failed to fetch medical records' });
        }
    }
);

// Get patient's messages
router.get('/messages',
    verifyToken,
    async (req, res) => {
        try {
            const patientId = req.user.id;
            const { unreadOnly } = req.query;
            
            let query = 'SELECT * FROM messages WHERE patient_id = ?';
            const params = [patientId];
            
            if (unreadOnly === 'true') {
                query += ' AND is_read = 0';
            }
            
            query += ' ORDER BY created_at DESC';
            
            const messages = await dbAsync.all(query, params);
            
            res.json({ messages });
        } catch (error) {
            console.error('Error fetching messages:', error);
            res.status(500).json({ message: 'Failed to fetch messages' });
        }
    }
);

// Send message to practice
router.post('/messages',
    verifyToken,
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
            
            const patientId = req.user.id;
            const { subject, message } = req.body;
            
            const result = await dbAsync.run(
                'INSERT INTO messages (patient_id, sender_type, subject, message) VALUES (?, ?, ?, ?)',
                [patientId, 'patient', subject, message]
            );
            
            // Get patient details
            const patient = await dbAsync.get(
                'SELECT email, first_name, last_name FROM patients WHERE id = ?',
                [patientId]
            );
            
            // Send notification email to practice
            await sendEmail({
                to: process.env.ADMIN_EMAIL || 'admin@risamedical.co.uk',
                subject: `New Message from Patient: ${subject}`,
                html: `
                    <h2>New Patient Message</h2>
                    <p><strong>From:</strong> ${patient.first_name} ${patient.last_name} (${patient.email})</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0;">
                        <p>${message}</p>
                    </div>
                    <p>Please log in to the admin portal to respond.</p>
                `
            });
            
            res.status(201).json({ 
                message: 'Message sent successfully',
                messageId: result.id
            });
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ message: 'Failed to send message' });
        }
    }
);

// Mark message as read
router.put('/messages/:messageId/read',
    verifyToken,
    async (req, res) => {
        try {
            const { messageId } = req.params;
            const patientId = req.user.id;
            
            await dbAsync.run(
                'UPDATE messages SET is_read = 1 WHERE id = ? AND patient_id = ?',
                [messageId, patientId]
            );
            
            res.json({ message: 'Message marked as read' });
        } catch (error) {
            console.error('Error marking message as read:', error);
            res.status(500).json({ message: 'Failed to mark message as read' });
        }
    }
);

// Change password
router.put('/change-password',
    verifyToken,
    [
        body('currentPassword').notEmpty(),
        body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            
            const patientId = req.user.id;
            const { currentPassword, newPassword } = req.body;
            
            // Get current password hash
            const patient = await dbAsync.get(
                'SELECT password FROM patients WHERE id = ?',
                [patientId]
            );
            
            // Verify current password
            const isValidPassword = await bcrypt.compare(currentPassword, patient.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }
            
            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            // Update password
            await dbAsync.run(
                'UPDATE patients SET password = ? WHERE id = ?',
                [hashedPassword, patientId]
            );
            
            // Log password change
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patientId, 'patient', 'password_changed', 'Patient changed password']
            );
            
            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ message: 'Failed to change password' });
        }
    }
);

// Request data export (GDPR compliance)
router.post('/data-export',
    verifyToken,
    async (req, res) => {
        try {
            const patientId = req.user.id;
            
            // Gather all patient data
            const patientData = await dbAsync.get(
                'SELECT * FROM patients WHERE id = ?',
                [patientId]
            );
            
            const appointments = await dbAsync.all(
                'SELECT * FROM appointments WHERE patient_id = ?',
                [patientId]
            );
            
            const medicalRecords = await dbAsync.all(
                'SELECT * FROM medical_records WHERE patient_id = ?',
                [patientId]
            );
            
            const messages = await dbAsync.all(
                'SELECT * FROM messages WHERE patient_id = ?',
                [patientId]
            );
            
            const dataExport = {
                personalInformation: patientData,
                appointments: appointments,
                medicalRecords: medicalRecords,
                messages: messages,
                exportDate: new Date().toISOString()
            };
            
            // Log data export request
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patientId, 'patient', 'data_export_requested', 'Patient requested data export']
            );
            
            // In a real implementation, this would be saved to a secure file and emailed
            res.json({ 
                message: 'Data export completed',
                data: dataExport
            });
        } catch (error) {
            console.error('Error exporting data:', error);
            res.status(500).json({ message: 'Failed to export data' });
        }
    }
);

// Request account deletion (GDPR compliance)
router.post('/delete-account',
    verifyToken,
    [
        body('password').notEmpty(),
        body('confirmDeletion').equals('true').withMessage('Please confirm account deletion')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            
            const patientId = req.user.id;
            const { password } = req.body;
            
            // Verify password
            const patient = await dbAsync.get(
                'SELECT password, email, first_name FROM patients WHERE id = ?',
                [patientId]
            );
            
            const isValidPassword = await bcrypt.compare(password, patient.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Incorrect password' });
            }
            
            // Mark account as inactive (soft delete for data retention requirements)
            await dbAsync.run(
                'UPDATE patients SET is_active = 0, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [`deleted_${patientId}_${patient.email}`, patientId]
            );
            
            // Log account deletion
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patientId, 'patient', 'account_deleted', 'Patient requested account deletion']
            );
            
            // Send confirmation email
            await sendEmail({
                to: patient.email,
                subject: 'Account Deletion Confirmation - Risa Medical',
                html: `
                    <h2>Account Deletion Confirmation</h2>
                    <p>Dear ${patient.first_name},</p>
                    <p>Your account has been successfully deleted as requested.</p>
                    <p>Your medical records will be retained for the legally required period but your account is no longer active.</p>
                    <p>If you have any questions, please contact us.</p>
                    <p>Best regards,<br>Dr. Leanne Sheridan<br>Risa Medical</p>
                `
            });
            
            // Clear authentication
            res.clearCookie('token');
            
            res.json({ message: 'Account deleted successfully' });
        } catch (error) {
            console.error('Error deleting account:', error);
            res.status(500).json({ message: 'Failed to delete account' });
        }
    }
);

// Get payment history
router.get('/payment-history',
    verifyToken,
    async (req, res) => {
        try {
            const patientId = req.user.id;
            
            // Get all appointments with payment information
            const payments = await dbAsync.all(
                `SELECT 
                    a.id as appointment_id,
                    a.appointment_date,
                    a.appointment_time,
                    a.service_type,
                    a.payment_status,
                    a.payment_amount,
                    a.payment_intent_id,
                    a.created_at as appointment_created,
                    p.id as payment_id,
                    p.transaction_date,
                    p.payment_method,
                    p.last_four_digits,
                    p.receipt_url
                FROM appointments a
                LEFT JOIN payments p ON a.id = p.appointment_id
                WHERE a.patient_id = ? AND a.payment_status IS NOT NULL
                ORDER BY COALESCE(p.transaction_date, a.created_at) DESC`,
                [patientId]
            );
            
            // Calculate summary statistics
            const totalPaid = payments
                .filter(p => p.payment_status === 'paid')
                .reduce((sum, p) => sum + (p.payment_amount || 0), 0);
            
            const paymentCount = payments.filter(p => p.payment_status === 'paid').length;
            
            const lastPayment = payments.find(p => p.payment_status === 'paid');
            const lastPaymentDate = lastPayment 
                ? new Date(lastPayment.transaction_date || lastPayment.appointment_created).toLocaleDateString('en-GB')
                : null;
            
            res.json({
                payments,
                summary: {
                    totalPaid,
                    paymentCount,
                    lastPaymentDate
                }
            });
        } catch (error) {
            console.error('Error fetching payment history:', error);
            res.status(500).json({ message: 'Failed to fetch payment history' });
        }
    }
);

module.exports = router;