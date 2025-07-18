const { body, param, query, validationResult } = require('express-validator');
const validator = require('validator');

// Custom sanitizers
const sanitizeHtml = (value) => {
  if (!value) return value;
  // Remove any HTML tags and scripts
  return validator.escape(value.toString());
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
};

// Common validation rules
const validationRules = {
  // User registration
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('First name must contain only letters, spaces, hyphens and apostrophes'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Last name must contain only letters, spaces, hyphens and apostrophes'),
    body('dateOfBirth')
      .isDate()
      .custom((value) => {
        const date = new Date(value);
        const minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - 120);
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() - 18);
        return date >= minDate && date <= maxDate;
      })
      .withMessage('Must be between 18 and 120 years old'),
    body('phone')
      .optional()
      .isMobilePhone('en-GB')
      .withMessage('Valid UK phone number required')
  ],

  // Login
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('password')
      .notEmpty()
      .withMessage('Password required')
  ],

  // Appointment booking
  createAppointment: [
    body('serviceType')
      .isIn(['initial-consultation', 'follow-up', 'extended-consultation', 'urgent-appointment'])
      .withMessage('Invalid service type'),
    body('appointmentDate')
      .isDate()
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      })
      .withMessage('Appointment date must be today or in the future'),
    body('appointmentTime')
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Valid time format required (HH:MM)'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .customSanitizer(sanitizeHtml)
      .withMessage('Notes must be less than 500 characters')
  ],

  // Profile update
  updateProfile: [
    body('phone')
      .optional()
      .isMobilePhone('en-GB')
      .withMessage('Valid UK phone number required'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .customSanitizer(sanitizeHtml),
    body('city')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('City must contain only letters, spaces, hyphens and apostrophes'),
    body('postcode')
      .optional()
      .trim()
      .matches(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i)
      .withMessage('Valid UK postcode required'),
    body('emergencyContactName')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .customSanitizer(sanitizeHtml),
    body('emergencyContactPhone')
      .optional()
      .isMobilePhone('en-GB')
      .withMessage('Valid UK phone number required')
  ],

  // Medical info update
  updateMedicalInfo: [
    body('medicalConditions')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .customSanitizer(sanitizeHtml),
    body('medications')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .customSanitizer(sanitizeHtml),
    body('allergies')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .customSanitizer(sanitizeHtml)
  ],

  // Message
  sendMessage: [
    body('subject')
      .trim()
      .isLength({ min: 1, max: 200 })
      .customSanitizer(sanitizeHtml)
      .withMessage('Subject required (max 200 characters)'),
    body('message')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .customSanitizer(sanitizeHtml)
      .withMessage('Message required (max 2000 characters)')
  ],

  // ID parameter
  idParam: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Valid ID required')
  ],

  // Pagination
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]
};

module.exports = {
  validate,
  validationRules
};