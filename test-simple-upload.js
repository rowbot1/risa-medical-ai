const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testSimpleUpload() {
    console.log('Testing simple dermatology upload...\n');
    
    try {
        // 1. Login to get token
        console.log('1. Logging in...');
        const loginResponse = await axios.post('http://localhost:5001/api/auth/admin/login', {
            email: 'admin@risamedical.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('Login successful\n');
        
        // 2. Create test image
        console.log('2. Creating test image...');
        const { createCanvas } = require('canvas');
        const canvas = createCanvas(200, 200);
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#FDB5A0';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = '#E85D75';
        ctx.beginPath();
        ctx.arc(100, 100, 30, 0, 2 * Math.PI);
        ctx.fill();
        
        const buffer = canvas.toBuffer('image/jpeg');
        const testImagePath = path.join(__dirname, 'test-upload.jpg');
        fs.writeFileSync(testImagePath, buffer);
        console.log('Test image created\n');
        
        // 3. Upload and analyze
        console.log('3. Uploading image for analysis...');
        const formData = new FormData();
        formData.append('image', fs.createReadStream(testImagePath));
        formData.append('bodyLocation', 'arm');
        formData.append('duration', '1-4 weeks');
        formData.append('patientAge', '35');
        formData.append('skinType', 'III');
        formData.append('symptoms', 'Red itchy patch');
        formData.append('additionalInfo', 'No previous treatment');
        
        try {
            const response = await axios.post('http://localhost:5001/api/dermatology/analyze', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('Upload successful!');
            console.log('Response:', JSON.stringify(response.data, null, 2));
            
        } catch (uploadError) {
            console.error('Upload failed:');
            console.error('Status:', uploadError.response?.status);
            console.error('Error:', uploadError.response?.data || uploadError.message);
            
            // Additional debugging
            if (uploadError.response?.status === 500) {
                console.log('\nServer error details:', uploadError.response.data);
            }
        }
        
        // Clean up
        fs.unlinkSync(testImagePath);
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testSimpleUpload().catch(console.error);