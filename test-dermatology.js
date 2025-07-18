const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testDermatologyAnalysis() {
    console.log('Starting dermatology analysis test...');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500 
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        console.log('Browser console:', msg.type(), msg.text());
    });
    
    // Monitor network requests
    page.on('request', request => {
        if (request.url().includes('dermatology')) {
            console.log('Request:', request.method(), request.url());
        }
    });
    
    page.on('response', response => {
        if (response.url().includes('dermatology')) {
            console.log('Response:', response.status(), response.url());
            response.text().then(text => {
                console.log('Response body:', text.substring(0, 200));
            }).catch(e => {});
        }
    });
    
    try {
        // First login as admin
        console.log('Navigating to admin login...');
        await page.goto('http://localhost:8080/admin-login.html');
        
        // Login
        await page.fill('#email', 'admin@risamedical.com');
        await page.fill('#password', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for redirect to dashboard
        await page.waitForURL('**/admin-dashboard.html', { timeout: 5000 });
        console.log('Logged in successfully');
        
        // Navigate to dermatology analysis
        console.log('Navigating to dermatology analysis...');
        await page.goto('http://localhost:8080/dermatology-analysis.html');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Create a test image
        const testImagePath = path.join(__dirname, 'test-skin-image.jpg');
        if (!fs.existsSync(testImagePath)) {
            console.log('Creating test image...');
            // Create a simple test image using canvas
            const { createCanvas } = require('canvas');
            const canvas = createCanvas(200, 200);
            const ctx = canvas.getContext('2d');
            
            // Draw a simple skin-like pattern
            ctx.fillStyle = '#FDB5A0';
            ctx.fillRect(0, 0, 200, 200);
            ctx.fillStyle = '#E85D75';
            ctx.beginPath();
            ctx.arc(100, 100, 30, 0, 2 * Math.PI);
            ctx.fill();
            
            const buffer = canvas.toBuffer('image/jpeg');
            fs.writeFileSync(testImagePath, buffer);
            console.log('Test image created');
        }
        
        // Upload image
        console.log('Uploading test image...');
        const fileInput = await page.locator('input[type="file"]');
        await fileInput.setInputFiles(testImagePath);
        
        // Fill in additional information
        await page.selectOption('#bodyLocation', 'arm');
        await page.selectOption('#duration', '1_week');
        await page.fill('#patientAge', '35');
        await page.selectOption('#skinType', 'type_3');
        await page.fill('#symptoms', 'Itchy, red patch');
        await page.fill('#additionalInfo', 'No previous treatment');
        
        // Click analyze button
        console.log('Clicking analyze button...');
        await page.click('#analyzeBtn');
        
        // Wait for results or error
        await page.waitForTimeout(5000);
        
        // Check for results
        const resultsVisible = await page.isVisible('#analysisResults');
        if (resultsVisible) {
            console.log('Analysis results displayed');
            const resultsText = await page.textContent('#analysisResults');
            console.log('Results preview:', resultsText.substring(0, 200));
        }
        
        // Check for errors
        const errorElement = await page.locator('.error, .alert-danger').first();
        if (await errorElement.isVisible()) {
            const errorText = await errorElement.textContent();
            console.log('Error found:', errorText);
        }
        
        // Take screenshot
        await page.screenshot({ path: 'dermatology-test.png', fullPage: true });
        console.log('Screenshot saved as dermatology-test.png');
        
    } catch (error) {
        console.error('Test failed:', error);
        await page.screenshot({ path: 'dermatology-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testDermatologyAnalysis().catch(console.error);