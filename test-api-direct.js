const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testDermatologyAPI() {
    console.log('Testing dermatology API directly...\n');
    
    try {
        // First login to get token
        console.log('1. Logging in as admin...');
        const loginResponse = await axios.post('http://localhost:5001/api/auth/admin/login', {
            email: 'admin@risamedical.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('Login successful, token received\n');
        
        // Check if dermatology route exists
        console.log('2. Testing dermatology history endpoint...');
        try {
            const historyResponse = await axios.get('http://localhost:5001/api/dermatology/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('History endpoint response:', historyResponse.data);
        } catch (error) {
            console.log('History endpoint error:', error.response?.status, error.response?.data || error.message);
        }
        
        console.log('\n3. Testing analyze endpoint...');
        
        // Create a simple test image
        const Canvas = require('canvas');
        const canvas = Canvas.createCanvas(200, 200);
        const ctx = canvas.getContext('2d');
        
        // Draw a simple skin-like pattern
        ctx.fillStyle = '#FDB5A0';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = '#E85D75';
        ctx.beginPath();
        ctx.arc(100, 100, 30, 0, 2 * Math.PI);
        ctx.fill();
        
        const buffer = canvas.toBuffer('image/png');
        const testImagePath = path.join(__dirname, 'test-skin-api.png');
        fs.writeFileSync(testImagePath, buffer);
        console.log('Test image created:', testImagePath);
        
        // Test direct service call
        console.log('\n4. Testing dermatology service directly...');
        const dermatologyService = require('./server/services/dermatologyService');
        
        try {
            const analysisResult = await dermatologyService.analyzeSkinImage(
                testImagePath,
                2, // admin user ID
                'Test patient, age 35, arm lesion'
            );
            console.log('Service analysis result:', JSON.stringify(analysisResult, null, 2));
        } catch (error) {
            console.error('Service error:', error);
        }
        
        // Clean up
        fs.unlinkSync(testImagePath);
        
    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

testDermatologyAPI().catch(console.error);