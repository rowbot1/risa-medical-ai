const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { dbAsync } = require('../utils/database');

class DermatologyService {
    constructor() {
        this.apiToken = process.env.HUGGING_FACE_API_TOKEN;
        this.models = {
            // Main skin cancer classification model (available via Inference API)
            skinCancer: 'Anwarkh1/Skin_Cancer-Image_Classification',
            // LLaVA model for comprehensive analysis
            llava: 'llava-hf/llava-1.5-7b-hf',
            // Acne detection model
            acne: 'imfarzanansari/skintelligent-acne',
            // Skin type detection
            skinType: 'dima806/skin_types_image_detection'
        };
    }

    // Analyze skin image with multiple models
    async analyzeSkinImage(imagePath, patientId, additionalInfo = '') {
        console.log('Analyzing skin image:', imagePath);
        console.log('API Token available:', !!this.apiToken);
        console.log('Patient ID:', patientId);
        
        try {
            // Read image file
            const imageBuffer = await fs.promises.readFile(imagePath);
            const base64Image = imageBuffer.toString('base64');
            
            // Prepare analysis results
            const results = {
                timestamp: new Date().toISOString(),
                imagePath: imagePath,
                analyses: []
            };

            // 1. General skin condition analysis with LLaVA
            try {
                const llavaAnalysis = await this.analyzewithLLaVA(base64Image, additionalInfo);
                results.analyses.push({
                    model: 'LLaVA Dermatology',
                    type: 'comprehensive',
                    ...llavaAnalysis
                });
            } catch (error) {
                console.error('LLaVA analysis error:', error.response?.status, error.response?.data || error.message);
                results.analyses.push({
                    model: 'LLaVA Dermatology',
                    type: 'comprehensive',
                    diagnosis: 'Analysis temporarily unavailable',
                    confidence: 'N/A',
                    message: `Model error: ${error.response?.data?.error || error.message}`,
                    recommendations: ['Please try again later or contact support']
                });
            }

            // 2. Skin cancer screening
            try {
                const cancerScreening = await this.screenForSkinCancer(base64Image);
                results.analyses.push({
                    model: 'Skin Cancer Detection',
                    type: 'cancer_screening',
                    ...cancerScreening
                });
            } catch (error) {
                console.error('Cancer screening error:', error.response?.status, error.response?.data || error.message);
                results.analyses.push({
                    model: 'Skin Cancer Detection',
                    type: 'cancer_screening',
                    screening: 'unavailable',
                    message: `Screening error: ${error.response?.data?.error || error.message}`
                });
            }

            // Save analysis to database
            await this.saveAnalysis(patientId, results);

            return results;
        } catch (error) {
            console.error('Dermatology analysis error:', error);
            throw error;
        }
    }

    // Analyze with LLaVA Dermatology model
    async analyzewithLLaVA(base64Image, additionalInfo) {
        console.log('analyzewithLLaVA called with image size:', base64Image.length);
        const prompt = `You are a dermatologist. Analyze this skin image and provide:
1. Most likely diagnosis (with confidence level)
2. Differential diagnoses (list 3-5 possibilities)
3. Key visual features observed
4. Recommended next steps
5. Red flags or urgent concerns

Additional patient information: ${additionalInfo || 'None provided'}

Please be thorough but concise. Format your response clearly.`;

        // For now, return a mock response while we debug the API
        const USE_MOCK = true;
        
        if (USE_MOCK) {
            console.log('Using mock response for testing');
            return {
                diagnosis: 'Eczema (Atopic Dermatitis) - Mock Analysis',
                confidence: 'Moderate to High',
                fullAnalysis: `Based on the image analysis:

1. Primary Diagnosis: Eczema (Atopic Dermatitis)
   - Confidence: 75%
   - Characterized by red, inflamed patches
   - Typical distribution pattern observed

2. Key Visual Features:
   - Erythematous (red) patches
   - Mild scaling present
   - Well-demarcated borders
   - No signs of infection

3. Differential Diagnoses:
   - Contact Dermatitis (25%)
   - Psoriasis (15%)
   - Fungal infection (10%)

4. Recommendations:
   - Apply moisturizer regularly
   - Use topical corticosteroids as prescribed
   - Avoid known triggers
   - Follow up if symptoms worsen

5. Red Flags: None identified

Note: This is a mock analysis for testing purposes.`,
                differentials: [
                    'Contact Dermatitis - Consider if exposure to irritants',
                    'Psoriasis - Less likely due to lack of silvery scales',
                    'Fungal infection - Consider if no response to treatment'
                ],
                visualFeatures: [
                    'Red, inflamed patches',
                    'Mild scaling',
                    'Well-demarcated borders'
                ],
                recommendations: [
                    'Apply fragrance-free moisturizer 2-3 times daily',
                    'Use prescribed topical corticosteroids',
                    'Avoid hot water and harsh soaps',
                    'Schedule follow-up in 2 weeks'
                ],
                redFlags: []
            };
        }
        
        try {
            const response = await axios.post(
                `https://api-inference.huggingface.co/models/${this.models.llava}`,
                {
                    inputs: {
                        image: base64Image,
                        text: prompt
                    },
                    options: { wait_for_model: true }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 60 seconds for larger model
                }
            );

            return this.parseLLaVAResponse(response.data);
        } catch (error) {
            if (error.response?.status === 429) {
                return {
                    diagnosis: 'Analysis temporarily unavailable',
                    confidence: 'N/A',
                    message: 'Model is loading or rate limited. Please try again in a moment.',
                    differentials: [],
                    recommendations: ['Please retry analysis in 30 seconds']
                };
            }
            throw error;
        }
    }

    // Screen for skin cancer
    async screenForSkinCancer(base64Image) {
        // Mock response for testing
        const USE_MOCK = false;
        
        if (USE_MOCK) {
            console.log('Using mock cancer screening response');
            return {
                screening: 'completed',
                riskLevel: 'Low',
                topFindings: [
                    { label: 'Benign Nevus', confidence: '85.2%' },
                    { label: 'Seborrheic Keratosis', confidence: '10.3%' },
                    { label: 'Melanoma', confidence: '2.1%' }
                ],
                recommendation: 'Low risk detected. The lesion appears benign. Continue routine skin monitoring and use sun protection. Schedule regular dermatology check-ups annually.'
            };
        }
        try {
            const response = await axios.post(
                `https://api-inference.huggingface.co/models/${this.models.skinCancer}`,
                {
                    inputs: base64Image,
                    options: { wait_for_model: true }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            return this.parseCancerScreeningResults(response.data);
        } catch (error) {
            console.error('Cancer screening API error:', error);
            return {
                screening: 'unavailable',
                message: 'Cancer screening temporarily unavailable'
            };
        }
    }

    // Parse LLaVA response
    parseLLaVAResponse(response) {
        // Handle different response formats
        if (typeof response === 'string') {
            // Parse structured text response
            const lines = response.split('\n');
            const result = {
                diagnosis: 'See detailed analysis',
                confidence: 'Moderate to High',
                fullAnalysis: response,
                differentials: [],
                visualFeatures: [],
                recommendations: [],
                redFlags: []
            };

            // Extract key information
            lines.forEach(line => {
                if (line.includes('diagnosis:') || line.includes('Diagnosis:')) {
                    result.diagnosis = line.split(':')[1]?.trim() || result.diagnosis;
                }
                if (line.includes('Differential') || line.includes('differential')) {
                    result.differentials.push(line.trim());
                }
                if (line.includes('recommend') || line.includes('Recommend')) {
                    result.recommendations.push(line.trim());
                }
                if (line.includes('red flag') || line.includes('urgent') || line.includes('immediate')) {
                    result.redFlags.push(line.trim());
                }
            });

            return result;
        }

        // Handle structured response
        if (response.generated_text) {
            return this.parseLLaVAResponse(response.generated_text);
        }

        return {
            diagnosis: 'Analysis completed',
            fullAnalysis: JSON.stringify(response),
            differentials: [],
            recommendations: ['Please review the full analysis']
        };
    }

    // Parse cancer screening results
    parseCancerScreeningResults(response) {
        if (Array.isArray(response)) {
            // Classification results
            const topResults = response.slice(0, 3).map(r => ({
                label: this.formatCancerLabel(r.label),
                confidence: (r.score * 100).toFixed(1) + '%'
            }));

            const highestRisk = response[0];
            const riskLevel = highestRisk.score > 0.7 ? 'High' : 
                            highestRisk.score > 0.4 ? 'Moderate' : 'Low';

            return {
                screening: 'completed',
                riskLevel: riskLevel,
                topFindings: topResults,
                recommendation: riskLevel === 'High' ? 
                    'Urgent dermatology referral recommended' :
                    riskLevel === 'Moderate' ?
                    'Consider dermatology referral for further evaluation' :
                    'Low risk detected, routine monitoring advised'
            };
        }

        return {
            screening: 'completed',
            results: response
        };
    }

    // Format cancer type labels
    formatCancerLabel(label) {
        const labelMap = {
            'mel': 'Melanoma',
            'nv': 'Melanocytic Nevus',
            'bcc': 'Basal Cell Carcinoma',
            'akiec': 'Actinic Keratosis',
            'bkl': 'Benign Keratosis',
            'df': 'Dermatofibroma',
            'vasc': 'Vascular Lesion'
        };
        return labelMap[label.toLowerCase()] || label;
    }

    // Save analysis to database
    async saveAnalysis(patientId, results) {
        try {
            const analysisRecord = await dbAsync.run(
                `INSERT INTO dermatology_analyses 
                 (patient_id, image_path, analysis_results, created_at)
                 VALUES (?, ?, ?, ?)`,
                [
                    patientId,
                    results.imagePath,
                    JSON.stringify(results),
                    results.timestamp
                ]
            );

            // Log for audit
            await dbAsync.run(
                'INSERT INTO audit_logs (user_id, user_type, action, details) VALUES (?, ?, ?, ?)',
                [patientId, 'patient', 'dermatology_analysis', `Analyzed skin image: ${path.basename(results.imagePath)}`]
            );

            return analysisRecord.lastID;
        } catch (error) {
            console.error('Error saving analysis:', error);
            throw error;
        }
    }

    // Get patient's analysis history
    async getPatientAnalyses(patientId, limit = 10) {
        try {
            const analyses = await dbAsync.all(
                `SELECT * FROM dermatology_analyses 
                 WHERE patient_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ?`,
                [patientId, limit]
            );

            return analyses.map(a => ({
                ...a,
                analysis_results: JSON.parse(a.analysis_results)
            }));
        } catch (error) {
            console.error('Error fetching analyses:', error);
            throw error;
        }
    }
}

module.exports = new DermatologyService();