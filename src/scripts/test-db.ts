#!/usr/bin/env tsx

// Load environment variables from .env.local
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first (highest priority), then .env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { getPool, query } from '../lib/db';
import { config } from '../lib/config';

async function testDatabaseConnection() {
  console.log('🔄 Testing database connection...');
  console.log('DATABASE_URL env var:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  console.log('Config database URL:', config.database.url ? 'Yes' : 'No');
  
  if (process.env.DATABASE_URL) {
    // Mask password in URL for logging
    const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
    console.log('Connection string:', maskedUrl);
  }
  
  try {
    // Test basic connection
    console.log('\n1. Testing basic connection...');
    const result = await query('SELECT NOW() as current_time, version()');
    console.log('✅ Database connected successfully!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].version);
    
    // Test database name
    console.log('\n2. Checking database name...');
    const dbResult = await query('SELECT current_database()');
    console.log('Current database:', dbResult.rows[0].current_database);
    
    // Test if we can create tables (permissions check)
    console.log('\n3. Testing permissions...');
    await query(`
      CREATE TABLE IF NOT EXISTS _test_table (
        id SERIAL PRIMARY KEY,
        test_column VARCHAR(50)
      )
    `);
    console.log('✅ Create table permission: OK');
    
    // Clean up test table
    await query('DROP TABLE IF EXISTS _test_table');
    console.log('✅ Drop table permission: OK');
    
    console.log('\n🎉 All database tests passed! Ready to run migrations.');
    
  } catch (error: any) {
    console.error('\n❌ Database connection failed:');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    // Common error diagnostics
    if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 This looks like a DNS/hostname issue. Check:');
      console.error('   - Database hostname is correct');
      console.error('   - Internet connection is working');
      console.error('   - Database service is running');
    }
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 This looks like an authentication issue. Check:');
      console.error('   - Username is correct');
      console.error('   - Password is correct');
      console.error('   - User has access to the database');
    }
    
    if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('\n💡 This looks like a database name issue. Check:');
      console.error('   - Database name in connection string is correct');
      console.error('   - Database has been created');
    }
    
    if (error.message.includes('connection refused')) {
      console.error('\n💡 This looks like a connection issue. Check:');
      console.error('   - Database server is running');
      console.error('   - Port number is correct (usually 5432)');
      console.error('   - Firewall is not blocking the connection');
    }
    
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();