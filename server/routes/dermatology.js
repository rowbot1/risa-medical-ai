const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { verifyToken } = require('../middleware/auth');
const dermatologyService = require('../services/dermatologyService');
const { dbAsync } = require('../utils/database');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/dermatology');
        const patientDir = path.join(uploadDir, req.user.id.toString());
        
        try {
            await fs.mkdir(patientDir, { recursive: true });
            cb(null, patientDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'skin-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB max
    }
});

// Upload and analyze skin image
router.post('/analyze',
    verifyToken,
    upload.single('image'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No image uploaded' });
            }

            const {
                bodyLocation,
                duration,
                symptoms,
                additionalInfo,
                patientAge,
                skinType
            } = req.body;

            // Prepare context for AI
            const contextInfo = [
                patientAge && `Patient age: ${patientAge}`,
                skinType && `Skin type: ${skinType}`,
                bodyLocation && `Location: ${bodyLocation}`,
                duration && `Duration: ${duration}`,
                symptoms && `Symptoms: ${symptoms}`,
                additionalInfo && `Additional info: ${additionalInfo}`
            ].filter(Boolean).join('. ');

            // Analyze the image
            const analysis = await dermatologyService.analyzeSkinImage(
                req.file.path,
                req.user.role === 'admin' ? req.body.patientId || req.user.id : req.user.id,
                contextInfo
            );

            // Return analysis results
            res.json({
                success: true,
                message: 'Skin image analyzed successfully',
                analysisId: analysis.id,
                results: analysis,
                imageUrl: `/uploads/dermatology/${req.user.id}/${req.file.filename}`
            });

        } catch (error) {
            console.error('Dermatology analysis error:', error);
            
            // Clean up uploaded file on error
            if (req.file) {
                try {
                    await fs.unlink(req.file.path);
                } catch (unlinkError) {
                    console.error('Error deleting uploaded file:', unlinkError);
                }
            }
            
            res.status(500).json({ 
                error: 'Analysis failed', 
                message: error.message || 'Unknown error' 
            });
        }
    }
);

// Get patient's analysis history
router.get('/history/:patientId?',
    verifyToken,
    async (req, res) => {
        try {
            const patientId = req.params.patientId || req.user.id;
            
            // Check permissions
            if (req.params.patientId && req.user.role !== 'admin' && req.user.id !== parseInt(patientId)) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const analyses = await dermatologyService.getPatientAnalyses(patientId);
            
            res.json({
                success: true,
                analyses: analyses
            });

        } catch (error) {
            console.error('Error fetching analysis history:', error);
            res.status(500).json({ 
                error: 'Failed to fetch history', 
                message: error.message 
            });
        }
    }
);

// Get specific analysis details
router.get('/analysis/:id',
    verifyToken,
    async (req, res) => {
        try {
            const analysis = await dbAsync.get(
                `SELECT * FROM dermatology_analyses WHERE id = ?`,
                [req.params.id]
            );

            if (!analysis) {
                return res.status(404).json({ error: 'Analysis not found' });
            }

            // Check permissions
            if (req.user.role !== 'admin' && req.user.id !== analysis.patient_id) {
                return res.status(403).json({ error: 'Access denied' });
            }

            res.json({
                success: true,
                analysis: {
                    ...analysis,
                    analysis_results: JSON.parse(analysis.analysis_results)
                }
            });

        } catch (error) {
            console.error('Error fetching analysis:', error);
            res.status(500).json({ 
                error: 'Failed to fetch analysis', 
                message: error.message 
            });
        }
    }
);

module.exports = router;