/**
 * Database initialization script for SafeZone
 * This script sets up the database tables and seeds initial data
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

import { Database } from './database';
import { createTables, dropTables } from './database-setup';
import { seedData, clearData } from './database-seed';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log('🚀 SafezoneBUP Database Initialization\n');

  try {
    // Test database connection first
    const isConnected = await Database.testConnection();
    if (!isConnected) {
      console.error('❌ Cannot connect to database. Please check your database configuration.');
      process.exit(1);
    }

    switch (command) {
      case 'setup':
        console.log('Setting up database tables...');
        await createTables();
        break;

      case 'seed':
        console.log('Seeding database with sample data...');
        await seedData();
        break;

      case 'reset':
        console.log('Resetting database (dropping tables and recreating)...');
        await dropTables();
        await createTables();
        break;

      case 'init':
        console.log('Initializing database (setup + seed)...');
        await createTables();
        await seedData();
        break;

      case 'clear':
        console.log('Clearing all data from database...');
        await clearData();
        break;

      case 'drop':
        console.log('Dropping all tables...');
        await dropTables();
        break;

      default:
        console.log('Usage: npm run db [command]');
        console.log('');
        console.log('Commands:');
        console.log('  setup  - Create database tables');
        console.log('  seed   - Seed database with sample data');
        console.log('  init   - Initialize database (setup + seed)');
        console.log('  reset  - Drop and recreate all tables');
        console.log('  clear  - Clear all data from tables');
        console.log('  drop   - Drop all tables');
        console.log('');
        console.log('Examples:');
        console.log('  npm run db init    # Full database initialization');
        console.log('  npm run db setup   # Just create tables');
        console.log('  npm run db seed    # Just add sample data');
        process.exit(0);
    }

    console.log('\n✅ Database operation completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database operation failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await Database.closePool();
  }
}

// Run the script
main();
