const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { dbAsync } = require('../utils/database');
const { sendEmail } = require('../utils/email');
const { verifyToken, canAccessPatient } = require('../middleware/auth');

// Get available appointment slots
router.get('/available-slots', async (req, res) => {
    try {
        const { date, serviceType } = req.query;
        
        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }
        
        // Get all appointments for the date
        const existingAppointments = await dbAsync.all(
            'SELECT appointment_time FROM appointments WHERE appointment_date = ? AND status != ?',
            [date, 'cancelled']
        );
        
        // Define available time slots (9 AM to 5 PM, 30-minute slots)
        const allSlots = [];
        for (let hour = 9; hour < 17; hour++) {
            allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
            allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        
        // Filter out taken slots
        const takenSlots = existingAppointments.map(apt => apt.appointment_time);
        const availableSlots = allSlots.filter(slot => !takenSlots.includes(slot));
        
        res.json({ availableSlots });
    } catch (error) {
        console.error('Error fetching available slots:', error);
        res.status(500).json({ message: 'Failed to fetch available slots' });
    }
});

// Book an appointment
router.post('/book',
    verifyToken,
    [
        body('appointmentDate').isDate().withMessage('Valid date required'),
        body('appointmentTime').matches(/^\d{2}:\d{2}$/).withMessage('Valid time required'),
        body('serviceType').notEmpty().withMessage('Service type required'),
        body('notes').optional().trim()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            
            const { appointmentDate, appointmentTime, serviceType, notes } = req.body;
            const patientId = req.user.id;
            
            // Check if slot is still available
            const existingAppointment = await dbAsync.get(
                'SELECT id FROM appointments WHERE appointment_date = ? AND appointment_time = ? AND status != ?',
                [appointmentDate, appointmentTime, 'cancelled']
            );
            
            if (existingAppointment) {
                return res.status(400).json({ message: 'This time slot is no longer available' });
            }
            
            // Create appointment
            const result = await dbAsync.run(
                `INSERT INTO appointments (
                    patient_id, appointment_date, appointment_time, 
                    service_type, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [patientId, appointmentDate, appointmentTime, serviceType, 'pending', notes]
            );
            
            // Get patient details for email
            const patient = await dbAsync.get(
                'SELECT email, first_name, last_name FROM patients WHERE id = ?',
                [patientId]
            );
            
            // Send confirmation email
            await sendEmail({
                to: patient.email,
                subject: 'Appointment Confirmation - Risa Medical',
                html: `
                    <h2>Appointment Confirmation</h2>
                    <p>Dear ${patient.first_name} ${patient.last_name},</p>
                    <p>Your appointment has been successfully booked.</p>
                    <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0;">
                        <p><strong>Date:</strong> ${appointmentDate}</p>
                        <p><strong>Time:</strong> ${appointmentTime}</p>
                        <p><strong>Service:</strong> ${serviceType}</p>
                        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                    </div>
                    <p>Please arrive 10 minutes early to complete any necessary paperwork.</p>
                    <p>If you need to cancel or reschedule, please contact us at least 24 hours in advance.</p>
                    <p>Best regards,<br>Dr. Leanne Sheridan<br>Risa Medical</p>
                `
            });
            
            // Log appointment booking
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patientId, 'patient', 'appointment_booked', `Appointment booked for ${appointmentDate} at ${appointmentTime}`]
            );
            
            res.status(201).json({
                message: 'Appointment booked successfully',
                appointment: {
                    id: result.id,
                    date: appointmentDate,
                    time: appointmentTime,
                    service: serviceType,
                    status: 'pending'
                }
            });
        } catch (error) {
            console.error('Error booking appointment:', error);
            res.status(500).json({ message: 'Failed to book appointment' });
        }
    }
);

// Get patient's appointments
router.get('/my-appointments',
    verifyToken,
    async (req, res) => {
        try {
            const patientId = req.user.id;
            const { status, upcoming } = req.query;
            
            let query = 'SELECT * FROM appointments WHERE patient_id = ?';
            const params = [patientId];
            
            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }
            
            if (upcoming === 'true') {
                query += ' AND appointment_date >= date("now")';
            }
            
            query += ' ORDER BY appointment_date DESC, appointment_time DESC';
            
            const appointments = await dbAsync.all(query, params);
            
            res.json({ appointments });
        } catch (error) {
            console.error('Error fetching appointments:', error);
            res.status(500).json({ message: 'Failed to fetch appointments' });
        }
    }
);

// Get single appointment details
router.get('/:appointmentId',
    verifyToken,
    async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const patientId = req.user.id;
            
            const appointment = await dbAsync.get(
                'SELECT * FROM appointments WHERE id = ? AND patient_id = ?',
                [appointmentId, patientId]
            );
            
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            
            res.json({ appointment });
        } catch (error) {
            console.error('Error fetching appointment:', error);
            res.status(500).json({ message: 'Failed to fetch appointment' });
        }
    }
);

// Cancel appointment
router.put('/:appointmentId/cancel',
    verifyToken,
    async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const patientId = req.user.id;
            const { reason } = req.body;
            
            // Get appointment details
            const appointment = await dbAsync.get(
                'SELECT * FROM appointments WHERE id = ? AND patient_id = ?',
                [appointmentId, patientId]
            );
            
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            
            if (appointment.status === 'cancelled') {
                return res.status(400).json({ message: 'Appointment already cancelled' });
            }
            
            // Check if appointment is at least 24 hours away
            const appointmentDateTime = new Date(`${appointment.appointment_date} ${appointment.appointment_time}`);
            const now = new Date();
            const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);
            
            if (hoursUntilAppointment < 24) {
                return res.status(400).json({ 
                    message: 'Appointments must be cancelled at least 24 hours in advance' 
                });
            }
            
            // Update appointment status
            await dbAsync.run(
                'UPDATE appointments SET status = ?, notes = ? WHERE id = ?',
                ['cancelled', reason || 'Cancelled by patient', appointmentId]
            );
            
            // Get patient details for email
            const patient = await dbAsync.get(
                'SELECT email, first_name, last_name FROM patients WHERE id = ?',
                [patientId]
            );
            
            // Send cancellation email
            await sendEmail({
                to: patient.email,
                subject: 'Appointment Cancellation Confirmation - Risa Medical',
                html: `
                    <h2>Appointment Cancellation</h2>
                    <p>Dear ${patient.first_name} ${patient.last_name},</p>
                    <p>Your appointment has been cancelled as requested.</p>
                    <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0;">
                        <p><strong>Date:</strong> ${appointment.appointment_date}</p>
                        <p><strong>Time:</strong> ${appointment.appointment_time}</p>
                        <p><strong>Service:</strong> ${appointment.service_type}</p>
                    </div>
                    <p>If you would like to book a new appointment, please visit our website or contact us.</p>
                    <p>Best regards,<br>Dr. Leanne Sheridan<br>Risa Medical</p>
                `
            });
            
            // Log cancellation
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patientId, 'patient', 'appointment_cancelled', `Appointment ${appointmentId} cancelled`]
            );
            
            res.json({ message: 'Appointment cancelled successfully' });
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            res.status(500).json({ message: 'Failed to cancel appointment' });
        }
    }
);

// Reschedule appointment
router.put('/:appointmentId/reschedule',
    verifyToken,
    [
        body('newDate').isDate().withMessage('Valid date required'),
        body('newTime').matches(/^\d{2}:\d{2}$/).withMessage('Valid time required')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            
            const { appointmentId } = req.params;
            const { newDate, newTime } = req.body;
            const patientId = req.user.id;
            
            // Get current appointment
            const appointment = await dbAsync.get(
                'SELECT * FROM appointments WHERE id = ? AND patient_id = ?',
                [appointmentId, patientId]
            );
            
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            
            if (appointment.status === 'cancelled') {
                return res.status(400).json({ message: 'Cannot reschedule cancelled appointment' });
            }
            
            // Check if new slot is available
            const existingAppointment = await dbAsync.get(
                'SELECT id FROM appointments WHERE appointment_date = ? AND appointment_time = ? AND status != ? AND id != ?',
                [newDate, newTime, 'cancelled', appointmentId]
            );
            
            if (existingAppointment) {
                return res.status(400).json({ message: 'This time slot is not available' });
            }
            
            // Update appointment
            await dbAsync.run(
                'UPDATE appointments SET appointment_date = ?, appointment_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newDate, newTime, appointmentId]
            );
            
            // Get patient details for email
            const patient = await dbAsync.get(
                'SELECT email, first_name, last_name FROM patients WHERE id = ?',
                [patientId]
            );
            
            // Send rescheduling confirmation email
            await sendEmail({
                to: patient.email,
                subject: 'Appointment Rescheduled - Risa Medical',
                html: `
                    <h2>Appointment Rescheduled</h2>
                    <p>Dear ${patient.first_name} ${patient.last_name},</p>
                    <p>Your appointment has been successfully rescheduled.</p>
                    <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0;">
                        <h4>Previous Appointment:</h4>
                        <p><strong>Date:</strong> ${appointment.appointment_date}</p>
                        <p><strong>Time:</strong> ${appointment.appointment_time}</p>
                    </div>
                    <div style="background-color: #e8f4fd; padding: 15px; margin: 20px 0;">
                        <h4>New Appointment:</h4>
                        <p><strong>Date:</strong> ${newDate}</p>
                        <p><strong>Time:</strong> ${newTime}</p>
                        <p><strong>Service:</strong> ${appointment.service_type}</p>
                    </div>
                    <p>Please arrive 10 minutes early to complete any necessary paperwork.</p>
                    <p>Best regards,<br>Dr. Leanne Sheridan<br>Risa Medical</p>
                `
            });
            
            // Log rescheduling
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patientId, 'patient', 'appointment_rescheduled', 
                 `Appointment ${appointmentId} rescheduled from ${appointment.appointment_date} ${appointment.appointment_time} to ${newDate} ${newTime}`]
            );
            
            res.json({ 
                message: 'Appointment rescheduled successfully',
                appointment: {
                    id: appointmentId,
                    date: newDate,
                    time: newTime,
                    service: appointment.service_type,
                    status: appointment.status
                }
            });
        } catch (error) {
            console.error('Error rescheduling appointment:', error);
            res.status(500).json({ message: 'Failed to reschedule appointment' });
        }
    }
);

module.exports = router;