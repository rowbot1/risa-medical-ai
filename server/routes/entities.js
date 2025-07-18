const express = require('express');
const router = express.Router();
const { verifyToken: authenticateToken } = require('../middleware/auth');
const nerService = require('../services/nerService');
const { body, param, query, validationResult } = require('express-validator');
const { monitorNER, handleNERError } = require('../middleware/monitoring');

// Analyze text for medical entities
router.post('/analyze',
    authenticateToken,
    monitorNER('analyze_text'),
    [
        body('text').notEmpty().trim().withMessage('Text is required'),
        body('models').optional().isArray().withMessage('Models must be an array'),
        body('models.*').optional().isIn(['anatomy', 'medication', 'condition', 'oncology', 'protein', 'genome'])
            .withMessage('Invalid model specified')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { text, models } = req.body;
            const modelKeys = models || ['medication', 'condition'];
            
            const results = await nerService.analyzeText(text, modelKeys);
            
            res.json({
                success: true,
                results: results,
                totalEntities: results.reduce((sum, r) => sum + (r.entities ? r.entities.length : 0), 0)
            });
        } catch (error) {
            const errorResponse = handleNERError(error, 'analyze_text');
            res.status(errorResponse.status).json(errorResponse);
        }
    }
);

// Analyze a specific medical record
router.post('/analyze-record/:recordId',
    authenticateToken,
    monitorNER('analyze_record'),
    [
        param('recordId').isInt().withMessage('Invalid record ID')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const recordId = parseInt(req.params.recordId);
            
            // Process the medical record
            const results = await nerService.processMedicalRecord(recordId);
            
            res.json({
                success: true,
                message: 'Medical record analyzed successfully',
                results: results
            });
        } catch (error) {
            const errorResponse = handleNERError(error, 'analyze_record');
            res.status(errorResponse.status).json(errorResponse);
        }
    }
);

// Get entities for a patient
router.get('/patient/:patientId',
    authenticateToken,
    monitorNER('get_patient_entities'),
    [
        param('patientId').isInt().withMessage('Invalid patient ID'),
        query('entityType').optional().isIn(['anatomy', 'medication', 'condition', 'oncology', 'protein', 'genome'])
            .withMessage('Invalid entity type')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const patientId = parseInt(req.params.patientId);
            const { entityType } = req.query;
            
            // Check if user has access to this patient's data
            if (req.user.role !== 'admin' && req.user.patientId !== patientId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            
            const entities = await nerService.getPatientEntities(patientId, entityType);
            
            res.json({
                success: true,
                patientId: patientId,
                entities: entities,
                totalCount: entities.length
            });
        } catch (error) {
            const errorResponse = handleNERError(error, 'get_patient_entities');
            res.status(errorResponse.status).json(errorResponse);
        }
    }
);

// Search patients by entity
router.get('/search',
    authenticateToken,
    monitorNER('search_by_entity'),
    [
        query('entityValue').notEmpty().trim().withMessage('Entity value is required'),
        query('entityType').optional().isIn(['anatomy', 'medication', 'condition', 'oncology', 'protein', 'genome'])
            .withMessage('Invalid entity type')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            // Only admins can search across all patients
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }
            
            const { entityValue, entityType } = req.query;
            
            const patients = await nerService.searchPatientsByEntity(entityValue, entityType);
            
            res.json({
                success: true,
                searchTerm: entityValue,
                entityType: entityType || 'all',
                patients: patients,
                totalCount: patients.length
            });
        } catch (error) {
            const errorResponse = handleNERError(error, 'search_by_entity');
            res.status(errorResponse.status).json(errorResponse);
        }
    }
);

// Get entity statistics
router.get('/statistics',
    authenticateToken,
    monitorNER('get_statistics'),
    [
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],
    async (req, res) => {
        try {
            // Only admins can view statistics
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }
            
            const limit = parseInt(req.query.limit) || 20;
            
            const statistics = await nerService.getEntityStatistics(limit);
            
            res.json({
                success: true,
                statistics: statistics,
                limit: limit
            });
        } catch (error) {
            const errorResponse = handleNERError(error, 'get_statistics');
            res.status(errorResponse.status).json(errorResponse);
        }
    }
);

// Get NER operation statistics (admin only)
router.get('/monitoring/stats',
    authenticateToken,
    async (req, res) => {
        try {
            // Only admins can view monitoring stats
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }
            
            const { getNERStats } = require('../middleware/monitoring');
            const days = parseInt(req.query.days) || 7;
            
            const stats = await getNERStats(days);
            
            res.json({
                success: true,
                period: `Last ${days} days`,
                statistics: stats
            });
        } catch (error) {
            console.error('Error fetching NER stats:', error);
            res.status(500).json({ error: 'Failed to fetch monitoring statistics' });
        }
    }
);

// Get available models
router.get('/models',
    authenticateToken,
    (req, res) => {
        const models = [
            {
                key: 'anatomy',
                name: 'Anatomy Detection',
                description: 'Detects anatomical entities (body parts, organs)',
                entityType: 'anatomy'
            },
            {
                key: 'medication',
                name: 'Medication Detection',
                description: 'Detects pharmaceutical/medication entities',
                entityType: 'medication'
            },
            {
                key: 'condition',
                name: 'Medical Condition Detection',
                description: 'Detects medical conditions and diseases',
                entityType: 'condition'
            },
            {
                key: 'oncology',
                name: 'Oncology Detection',
                description: 'Detects cancer-related entities',
                entityType: 'oncology'
            },
            {
                key: 'protein',
                name: 'Protein Detection',
                description: 'Detects protein entities',
                entityType: 'protein'
            },
            {
                key: 'genome',
                name: 'Genome Detection',
                description: 'Detects genomic entities',
                entityType: 'genome'
            }
        ];
        
        res.json({
            success: true,
            models: models
        });
    }
);

module.exports = router;