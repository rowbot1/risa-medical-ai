const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { dbAsync } = require('../utils/database');
const { sendEmail } = require('../utils/email');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/auth');
const { getCookieOptions } = require('../config/cors');
const { validate, validationRules } = require('../middleware/validation');

// Generate JWT token
const generateToken = (user, type) => {
    return jwt.sign(
        { id: user.id, email: user.email, type },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Patient Registration
router.post('/register',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('firstName').notEmpty().trim(),
        body('lastName').notEmpty().trim(),
        body('phone').notEmpty().trim(),
        body('dateOfBirth').isDate(),
        body('gdprConsent').isBoolean().equals('true').withMessage('GDPR consent is required')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const {
                email, password, firstName, lastName, phone,
                dateOfBirth, gender, address, city, postcode,
                emergencyContactName, emergencyContactPhone,
                medicalConditions, medications, allergies,
                gdprConsent, marketingConsent
            } = req.body;

            // Check if email already exists
            const existingUser = await dbAsync.get(
                'SELECT id FROM patients WHERE email = ?',
                [email]
            );

            if (existingUser) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new patient
            const result = await dbAsync.run(
                `INSERT INTO patients (
                    email, password, first_name, last_name, phone,
                    date_of_birth, gender, address, city, postcode,
                    emergency_contact_name, emergency_contact_phone,
                    medical_conditions, medications, allergies,
                    gdpr_consent, marketing_consent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    email, hashedPassword, firstName, lastName, phone,
                    dateOfBirth, gender, address, city, postcode,
                    emergencyContactName, emergencyContactPhone,
                    medicalConditions, medications, allergies,
                    gdprConsent ? 1 : 0, marketingConsent ? 1 : 0
                ]
            );

            // Log registration for GDPR
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [result.id, 'patient', 'registration', 'New patient registered']
            );

            // Send welcome email
            await sendEmail({
                to: email,
                subject: 'Welcome to Risa Medical',
                html: `
                    <h2>Welcome to Risa Medical, ${firstName}!</h2>
                    <p>Your account has been successfully created.</p>
                    <p>You can now log in to book appointments and access your medical records.</p>
                    <p>If you have any questions, please don't hesitate to contact us.</p>
                    <p>Best regards,<br>Dr. Leanne Sheridan</p>
                `
            });

            // Generate token and log in user
            const token = generateToken({ id: result.id, email }, 'patient');

            res.cookie('token', token, getCookieOptions());

            res.status(201).json({
                message: 'Registration successful',
                user: {
                    id: result.id,
                    email,
                    firstName,
                    lastName
                },
                token: token // Include token in response
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Registration failed' });
        }
    }
);

// Patient Login
router.post('/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password } = req.body;

            // Find patient
            const patient = await dbAsync.get(
                'SELECT * FROM patients WHERE email = ? AND is_active = 1',
                [email]
            );

            if (!patient) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, patient.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Update last login
            await dbAsync.run(
                'UPDATE patients SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [patient.id]
            );

            // Log login
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patient.id, 'patient', 'login', 'Patient logged in']
            );

            // Generate token
            const token = generateToken(patient, 'patient');

            res.cookie('token', token, getCookieOptions());

            res.json({
                message: 'Login successful',
                user: {
                    id: patient.id,
                    email: patient.email,
                    firstName: patient.first_name,
                    lastName: patient.last_name
                },
                token: token // Include token in response for Authorization header
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Login failed' });
        }
    }
);

// Admin Login
router.post('/admin/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password } = req.body;
            
            console.log('Admin login attempt:', { email, passwordLength: password?.length });

            // Find admin
            const admin = await dbAsync.get(
                'SELECT * FROM admin_users WHERE email = ? AND is_active = 1',
                [email]
            );
            
            console.log('Admin found:', admin ? { id: admin.id, email: admin.email } : 'No admin found');

            if (!admin) {
                console.log('Admin not found for email:', email);
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, admin.password);
            console.log('Password verification result:', isValidPassword);
            
            if (!isValidPassword) {
                console.log('Password verification failed for admin:', email);
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Update last login
            await dbAsync.run(
                'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [admin.id]
            );

            // Log login
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [admin.id, 'admin', 'login', 'Admin logged in']
            );

            // Generate token
            const token = generateToken(admin, 'admin');

            res.cookie('token', token, getCookieOptions());

            res.json({
                message: 'Login successful',
                user: {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role
                },
                token: token // Include token in response
            });
        } catch (error) {
            console.error('Admin login error:', error);
            res.status(500).json({ message: 'Login failed' });
        }
    }
);

// Check authentication status
router.get('/check', verifyToken, async (req, res) => {
    try {
        // Return user info if authenticated
        if (req.user.type === 'patient') {
            const patient = await dbAsync.get(
                'SELECT id, email, first_name, last_name FROM patients WHERE id = ?',
                [req.user.id]
            );
            res.json({ 
                authenticated: true,
                userType: 'patient',
                user: patient
            });
        } else if (req.user.type === 'admin') {
            const admin = await dbAsync.get(
                'SELECT id, email, name FROM admin_users WHERE id = ?',
                [req.user.id]
            );
            res.json({ 
                authenticated: true,
                userType: 'admin',
                user: admin
            });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error checking authentication' });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    // Clear cookie with same options as when it was set
    const cookieOptions = getCookieOptions();
    res.clearCookie('token', {
        path: cookieOptions.path,
        domain: cookieOptions.domain
    });
    res.json({ message: 'Logged out successfully' });
});

// Password Reset Request
router.post('/forgot-password',
    [body('email').isEmail().normalizeEmail()],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email } = req.body;

            // Check if user exists
            const patient = await dbAsync.get(
                'SELECT id, first_name FROM patients WHERE email = ?',
                [email]
            );

            if (!patient) {
                // Don't reveal if email exists
                return res.json({ message: 'If the email exists, a reset link has been sent' });
            }

            // Generate reset token
            const token = uuidv4();
            const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

            // Save token
            await dbAsync.run(
                'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
                [email, token, expiresAt]
            );

            // Send reset email
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
            await sendEmail({
                to: email,
                subject: 'Password Reset Request',
                html: `
                    <h2>Password Reset Request</h2>
                    <p>Hi ${patient.first_name},</p>
                    <p>You requested to reset your password. Click the link below to reset it:</p>
                    <p><a href="${resetUrl}">${resetUrl}</a></p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                `
            });

            res.json({ message: 'If the email exists, a reset link has been sent' });
        } catch (error) {
            console.error('Password reset error:', error);
            res.status(500).json({ message: 'Password reset failed' });
        }
    }
);

// Reset Password
router.post('/reset-password',
    [
        body('token').notEmpty(),
        body('password').isLength({ min: 8 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { token, password } = req.body;

            // Verify token
            const reset = await dbAsync.get(
                'SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime("now")',
                [token]
            );

            if (!reset) {
                return res.status(400).json({ message: 'Invalid or expired token' });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Update password
            await dbAsync.run(
                'UPDATE patients SET password = ? WHERE email = ?',
                [hashedPassword, reset.email]
            );

            // Mark token as used
            await dbAsync.run(
                'UPDATE password_resets SET used = 1 WHERE id = ?',
                [reset.id]
            );

            // Log password reset
            const patient = await dbAsync.get(
                'SELECT id FROM patients WHERE email = ?',
                [reset.email]
            );

            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patient.id, 'patient', 'password_reset', 'Password reset completed']
            );

            res.json({ message: 'Password reset successful' });
        } catch (error) {
            console.error('Password reset error:', error);
            res.status(500).json({ message: 'Password reset failed' });
        }
    }
);

module.exports = router;