const jwt = require('jsonwebtoken');
const { dbAsync } = require('../utils/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
    try {
        // Check for token in multiple places
        let token = req.cookies.token; // First check cookies
        
        // If no cookie, check Authorization header
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7); // Remove 'Bearer ' prefix
            }
        }
        
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        
        // Check if user still exists and is active
        if (decoded.type === 'patient') {
            const patient = await dbAsync.get(
                'SELECT id, is_active FROM patients WHERE id = ?',
                [decoded.id]
            );
            
            if (!patient || !patient.is_active) {
                return res.status(401).json({ message: 'Invalid or inactive account' });
            }
        } else if (decoded.type === 'admin') {
            const admin = await dbAsync.get(
                'SELECT id, is_active FROM admin_users WHERE id = ?',
                [decoded.id]
            );
            
            if (!admin || !admin.is_active) {
                return res.status(401).json({ message: 'Invalid or inactive account' });
            }
        }
        
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Check if user is admin
const isAdmin = async (req, res, next) => {
    if (req.user.type !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
};

// Check if user is patient
const isPatient = async (req, res, next) => {
    if (req.user.type !== 'patient') {
        return res.status(403).json({ message: 'Access denied. Patient account required.' });
    }
    next();
};

// Check if user can access patient data
const canAccessPatient = async (req, res, next) => {
    const patientId = req.params.patientId || req.body.patientId;
    
    // Admins can access any patient
    if (req.user.type === 'admin') {
        return next();
    }
    
    // Patients can only access their own data
    if (req.user.type === 'patient' && req.user.id === parseInt(patientId)) {
        return next();
    }
    
    return res.status(403).json({ message: 'Access denied to this patient data' });
};

module.exports = {
    verifyToken,
    isAdmin,
    isPatient,
    canAccessPatient
};