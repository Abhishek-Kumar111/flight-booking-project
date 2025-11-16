import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'flight_booking2';

let connection;

export const initDatabase = async () => {
  try {
    console.log('🔄 Initializing database connection...');
    
    // First, connect without database to create it if needed
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL server');

    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    console.log(`✅ Database '${DB_NAME}' ready`);

    // Use the database
    await connection.query(`USE \`${DB_NAME}\``);
    console.log(`✅ Using database '${DB_NAME}'`);

    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Remove CREATE DATABASE and USE statements (already handled)
    schema = schema.replace(/CREATE\s+DATABASE[^;]+;/gi, '');
    schema = schema.replace(/USE\s+[^;]+;/gi, '');
    
    console.log('🔄 Creating tables...');
    
    // Execute the entire schema (multiple statements)
    try {
      await connection.query(schema);
      console.log('  ✅ Schema executed successfully');
    } catch (err) {
      // If it fails, try executing statements one by one
      console.log('  ⚠️  Batch execution failed, trying individual statements...');
      
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.length > 0) {
          try {
            await connection.query(statement);
            if (statement.toLowerCase().includes('create table')) {
              const tableMatch = statement.match(/CREATE\s+TABLE[^`]*`?(\w+)`?/i);
              if (tableMatch && tableMatch[1]) {
                console.log(`  ✅ Table '${tableMatch[1]}' created`);
              }
            }
          } catch (err2) {
            if (!err2.message.includes('already exists') && 
                !err2.code === 'ER_TABLE_EXISTS_ERROR' &&
                !err2.message.includes('Duplicate')) {
              console.error(`  ❌ Error: ${err2.message}`);
            }
          }
        }
      }
    }

    // Verify tables were created
    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [DB_NAME]
    );
    
    console.log(`\n✅ Database initialization complete. Found ${tables.length} tables:`);
    if (tables.length > 0) {
      tables.forEach(table => {
        console.log(`   - ${table.TABLE_NAME}`);
      });
    } else {
      console.log(`   ⚠️  No tables found! Check the schema.sql file.`);
    }

    // Test connection with the pool
    const pool = (await import('./database.js')).default;
    const [rows] = await pool.execute('SELECT 1 as test');
    console.log('✅ Database connection pool tested successfully\n');

    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    console.error('Full error:', error);
    if (connection) {
      await connection.end();
    }
    throw error;
  }
};

// Test database connection
export const testConnection = async () => {
  try {
    const pool = (await import('./database.js')).default;
    const [rows] = await pool.execute('SELECT 1 as test');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};
