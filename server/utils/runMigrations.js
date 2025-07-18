const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database', 'clinic.db');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');

// Create migrations tracking table if it doesn't exist
const createMigrationsTable = `
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

async function runMigrations() {
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        // Create migrations table
        await new Promise((resolve, reject) => {
            db.run(createMigrationsTable, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Get list of migration files
        const files = await fs.readdir(MIGRATIONS_DIR);
        const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
        
        // Get already executed migrations
        const executedMigrations = await new Promise((resolve, reject) => {
            db.all('SELECT filename FROM migrations', (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(r => r.filename));
            });
        });
        
        // Run pending migrations
        for (const file of sqlFiles) {
            if (executedMigrations.includes(file)) {
                console.log(`Skipping already executed migration: ${file}`);
                continue;
            }
            
            console.log(`Running migration: ${file}`);
            const sqlContent = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf-8');
            
            // Execute migration in a transaction
            await new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');
                    
                    // Split by semicolons but be careful with triggers/procedures
                    const statements = sqlContent
                        .split(';')
                        .filter(stmt => stmt.trim())
                        .map(stmt => stmt.trim() + ';');
                    
                    let completed = 0;
                    statements.forEach((statement, index) => {
                        db.run(statement, (err) => {
                            if (err) {
                                console.error(`Error in statement ${index + 1}:`, err);
                                db.run('ROLLBACK');
                                reject(err);
                            } else {
                                completed++;
                                if (completed === statements.length) {
                                    // Record migration as executed
                                    db.run('INSERT INTO migrations (filename) VALUES (?)', [file], (err) => {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            reject(err);
                                        } else {
                                            db.run('COMMIT');
                                            resolve();
                                        }
                                    });
                                }
                            }
                        });
                    });
                });
            });
            
            console.log(`Completed migration: ${file}`);
        }
        
        console.log('All migrations completed successfully');
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run migrations
runMigrations();