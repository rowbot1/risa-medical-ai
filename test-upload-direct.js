const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testUploadDirect() {
    console.log('Testing dermatology upload directly...');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000,
        devtools: true  // Open developer tools
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable detailed console logging
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error' || text.includes('error') || text.includes('Error')) {
            console.log(`[${type.toUpperCase()}]`, text);
        }
    });
    
    // Log all failed requests
    page.on('requestfailed', request => {
        console.log('REQUEST FAILED:', request.url(), request.failure());
    });
    
    // Monitor API responses
    page.on('response', async response => {
        if (response.url().includes('/api/')) {
            console.log(`API Response: ${response.status()} ${response.url()}`);
            if (response.status() >= 400) {
                try {
                    const body = await response.text();
                    console.log('Error response body:', body);
                } catch (e) {}
            }
        }
    });
    
    try {
        // Login first
        console.log('1. Logging in...');
        await page.goto('http://localhost:8080/admin-login.html');
        await page.fill('#email', 'admin@risamedical.com');
        await page.fill('#password', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/admin-dashboard.html', { timeout: 5000 });
        
        // Navigate to dermatology page
        console.log('2. Going to dermatology page...');
        await page.goto('http://localhost:8080/dermatology-analysis.html');
        await page.waitForLoadState('networkidle');
        
        // Check if page loaded correctly
        const pageTitle = await page.textContent('h1');
        console.log('Page title:', pageTitle);
        
        // Check if form elements exist
        const hasUploadArea = await page.isVisible('#uploadArea');
        const hasAnalyzeBtn = await page.isVisible('#analyzeBtn');
        console.log('Upload area visible:', hasUploadArea);
        console.log('Analyze button visible:', hasAnalyzeBtn);
        
        // Create test image
        const testImagePath = path.join(__dirname, 'test-skin-upload.jpg');
        if (!fs.existsSync(testImagePath)) {
            const { createCanvas } = require('canvas');
            const canvas = createCanvas(300, 300);
            const ctx = canvas.getContext('2d');
            
            // Create a more realistic skin-like image
            const gradient = ctx.createRadialGradient(150, 150, 0, 150, 150, 150);
            gradient.addColorStop(0, '#E85D75');
            gradient.addColorStop(1, '#FDB5A0');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 300, 300);
            
            const buffer = canvas.toBuffer('image/jpeg');
            fs.writeFileSync(testImagePath, buffer);
        }
        
        // Upload image
        console.log('3. Uploading image...');
        const fileInput = await page.locator('input[type="file"]');
        await fileInput.setInputFiles(testImagePath);
        
        // Wait for preview
        await page.waitForTimeout(1000);
        
        // Check if image was loaded
        const imagePreviewVisible = await page.isVisible('#previewImage');
        console.log('Image preview visible:', imagePreviewVisible);
        
        // Fill form fields
        console.log('4. Filling form fields...');
        
        // Find and fill select elements by name
        await page.selectOption('select[name="bodyLocation"]', 'arm');
        await page.selectOption('select[name="duration"]', '1-4 weeks');
        await page.fill('input[name="patientAge"]', '35');
        await page.selectOption('select[name="skinType"]', 'type_3');
        await page.fill('textarea[name="symptoms"]', 'Red, itchy patch on arm');
        await page.fill('textarea[name="additionalInfo"]', 'No previous treatment');
        
        // Check if button is enabled
        const buttonEnabled = await page.isEnabled('#analyzeBtn');
        console.log('Analyze button enabled:', buttonEnabled);
        
        // Open network tab in devtools
        console.log('5. Clicking analyze button...');
        
        // Set up promise to catch the API request
        const responsePromise = page.waitForResponse(
            response => response.url().includes('/api/dermatology/analyze'),
            { timeout: 30000 }
        );
        
        // Click analyze
        await page.click('#analyzeBtn');
        
        // Wait for and log the response
        try {
            const response = await responsePromise;
            console.log('API Response received:', response.status());
            const responseBody = await response.text();
            console.log('Response body:', responseBody);
        } catch (error) {
            console.log('No API response received:', error.message);
        }
        
        // Wait a bit to see results or errors
        await page.waitForTimeout(5000);
        
        // Check for error messages
        const errorVisible = await page.isVisible('.error, .alert-danger, [role="alert"]');
        if (errorVisible) {
            const errorText = await page.textContent('.error, .alert-danger, [role="alert"]');
            console.log('ERROR DISPLAYED:', errorText);
        }
        
        // Check for results
        const resultsVisible = await page.isVisible('#analysisResults');
        if (resultsVisible) {
            console.log('Results are visible');
        }
        
        // Take screenshot
        await page.screenshot({ path: 'dermatology-debug.png', fullPage: true });
        console.log('Screenshot saved as dermatology-debug.png');
        
        // Keep browser open for inspection
        console.log('\nTest complete. Browser will stay open for 30 seconds for inspection...');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('Test failed:', error);
        await page.screenshot({ path: 'dermatology-error-debug.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testUploadDirect().catch(console.error);