const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { dbAsync } = require('../utils/database');
const { verifyToken } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { validate, validationRules } = require('../middleware/validation');

// Upload medical files
router.post('/upload',
    verifyToken,
    upload.array('files', 5),
    handleUploadError,
    async (req, res) => {
        console.log('Upload endpoint reached');
        console.log('User:', req.user);
        console.log('Files:', req.files ? req.files.length : 'No files');
        console.log('Body:', req.body);
        
        try {
            const patientId = req.user.id;
            const { category, description } = req.body;
            
            if (!req.files || req.files.length === 0) {
                console.log('No files in request');
                return res.status(400).json({ message: 'No files uploaded' });
            }
            
            const uploadedFiles = [];
            
            // Save file information to database
            for (const file of req.files) {
                const fileRecord = await dbAsync.run(
                    `INSERT INTO medical_files (
                        patient_id, filename, original_name, mimetype, 
                        size, category, description, upload_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [
                        patientId,
                        file.filename,
                        file.originalname,
                        file.mimetype,
                        file.size,
                        category || 'general',
                        description || ''
                    ]
                );
                
                uploadedFiles.push({
                    id: fileRecord.lastID,
                    filename: file.originalname,
                    size: file.size,
                    uploadDate: new Date()
                });
            }
            
            // Log file upload
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patientId, 'patient', 'files_uploaded', `Uploaded ${req.files.length} medical files`]
            );
            
            res.json({
                message: 'Files uploaded successfully',
                files: uploadedFiles
            });
        } catch (error) {
            console.error('File upload error:', error);
            console.error('Error stack:', error.stack);
            res.status(500).json({ 
                message: 'Failed to upload files',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// Get patient's medical files
router.get('/',
    verifyToken,
    async (req, res) => {
        try {
            const patientId = req.user.id;
            const { category } = req.query;
            
            let query = `
                SELECT id, original_name, mimetype, size, category, 
                       description, upload_date, created_by
                FROM medical_files 
                WHERE patient_id = ? AND is_deleted = 0
            `;
            const params = [patientId];
            
            if (category) {
                query += ' AND category = ?';
                params.push(category);
            }
            
            query += ' ORDER BY upload_date DESC';
            
            const files = await dbAsync.all(query, params);
            
            res.json({ files });
        } catch (error) {
            console.error('Error fetching files:', error);
            res.status(500).json({ message: 'Failed to fetch files' });
        }
    }
);

// Download medical file
router.get('/:fileId/download',
    verifyToken,
    async (req, res) => {
        try {
            const patientId = req.user.id;
            const { fileId } = req.params;
            
            // Get file information
            const file = await dbAsync.get(
                `SELECT * FROM medical_files 
                 WHERE id = ? AND patient_id = ? AND is_deleted = 0`,
                [fileId, patientId]
            );
            
            if (!file) {
                return res.status(404).json({ message: 'File not found' });
            }
            
            // Construct file path
            const filePath = path.join(
                __dirname, 
                '../../uploads/medical-files', 
                patientId.toString(), 
                file.filename
            );
            
            // Check if file exists
            try {
                await fs.access(filePath);
            } catch {
                return res.status(404).json({ message: 'File not found on server' });
            }
            
            // Log file access
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patientId, 'patient', 'file_downloaded', `Downloaded file: ${file.original_name}`]
            );
            
            // Send file
            res.download(filePath, file.original_name);
        } catch (error) {
            console.error('File download error:', error);
            res.status(500).json({ message: 'Failed to download file' });
        }
    }
);

// Delete medical file
router.delete('/:fileId',
    verifyToken,
    async (req, res) => {
        try {
            const patientId = req.user.id;
            const { fileId } = req.params;
            
            // Get file information
            const file = await dbAsync.get(
                `SELECT * FROM medical_files 
                 WHERE id = ? AND patient_id = ? AND is_deleted = 0`,
                [fileId, patientId]
            );
            
            if (!file) {
                return res.status(404).json({ message: 'File not found' });
            }
            
            // Soft delete in database
            await dbAsync.run(
                'UPDATE medical_files SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
                [fileId]
            );
            
            // Optionally delete physical file
            const filePath = path.join(
                __dirname, 
                '../../uploads/medical-files', 
                patientId.toString(), 
                file.filename
            );
            
            try {
                await fs.unlink(filePath);
            } catch (error) {
                console.error('Error deleting physical file:', error);
                // Continue even if physical deletion fails
            }
            
            // Log file deletion
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patientId, 'patient', 'file_deleted', `Deleted file: ${file.original_name}`]
            );
            
            res.json({ message: 'File deleted successfully' });
        } catch (error) {
            console.error('File deletion error:', error);
            res.status(500).json({ message: 'Failed to delete file' });
        }
    }
);

// Get file categories
router.get('/categories',
    verifyToken,
    async (req, res) => {
        const categories = [
            { value: 'general', label: 'General Documents' },
            { value: 'lab-results', label: 'Lab Results' },
            { value: 'imaging', label: 'Imaging/Scans' },
            { value: 'prescriptions', label: 'Prescriptions' },
            { value: 'referrals', label: 'Referral Letters' },
            { value: 'insurance', label: 'Insurance Documents' },
            { value: 'other', label: 'Other' }
        ];
        
        res.json({ categories });
    }
);

module.exports = router;