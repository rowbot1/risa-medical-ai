const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { db, dbAsync } = require('./database');

async function initDatabase() {
    try {
        console.log('Initializing database...');
        
        // Read and execute schema
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Split schema into individual statements
        const statements = schema.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            await dbAsync.run(statement);
        }
        
        console.log('Database schema created successfully');
        
        // Create default admin user
        const adminEmail = 'admin@risamedical.co.uk';
        const existingAdmin = await dbAsync.get('SELECT id FROM admin_users WHERE email = ?', [adminEmail]);
        
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await dbAsync.run(
                'INSERT INTO admin_users (email, password, name, role) VALUES (?, ?, ?, ?)',
                [adminEmail, hashedPassword, 'Dr. Leanne Sheridan', 'admin']
            );
            console.log('Default admin user created');
            console.log('Email: admin@risamedical.co.uk');
            console.log('Password: admin123 (please change immediately)');
        }
        
        console.log('Database initialization complete');
        process.exit(0);
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
}

initDatabase();