const bcrypt = require('bcryptjs');
const { dbAsync } = require('./utils/database');

async function testAdminLogin() {
    try {
        // Get the stored admin user
        const admin = await dbAsync.get('SELECT * FROM admin_users WHERE email = ?', ['admin@risamedical.co.uk']);
        
        if (!admin) {
            console.log('No admin user found');
            return;
        }
        
        console.log('Admin user found:', {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            is_active: admin.is_active
        });
        
        // Test password
        const isValid = await bcrypt.compare('admin123', admin.password);
        console.log('Password test result:', isValid);
        
        if (!isValid) {
            console.log('Password hash in database:', admin.password);
            
            // Create new hash for comparison
            const newHash = await bcrypt.hash('admin123', 10);
            console.log('New hash generated:', newHash);
            
            // Update the password
            await dbAsync.run('UPDATE admin_users SET password = ? WHERE email = ?', [newHash, 'admin@risamedical.co.uk']);
            console.log('Password updated in database');
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testAdminLogin();