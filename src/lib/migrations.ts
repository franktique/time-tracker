import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from './db';

export const runMigrations = async () => {
  try {
    console.log('Starting database migrations...');
    
    // Read the schema file
    const schemaPath = join(process.cwd(), 'src/lib/db-schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await query(schema);
    
    console.log('Database migrations completed successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
};

export const createMigrationTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

export const checkDatabaseConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};