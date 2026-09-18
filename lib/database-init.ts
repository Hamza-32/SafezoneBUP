/**
 * Database initialization script for SafeZone
 * This script sets up the database tables and seeds initial data
 */

import dotenv from 'dotenv';

// Load environment variables
// .env.local is loaded first on purpose. dotenv never overwrites a variable
// that is already set, so whichever file is read first wins. Loading .env
// first meant a stale value there silently beat the real one in .env.local,
// which is the opposite of how Next.js itself resolves them.
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

import { Database } from './database';
import { createTables, dropTables } from './database-setup';
import { seedData, clearData } from './database-seed';
import { runMigrations, migrationStatus, confirmTarget, describeTarget } from './database-migrate';

/** Prints which database the DB_* variables currently point at. */
function describeTargetLine(): void {
  const target = describeTarget();
  console.log(`   target: ${target.database} on ${target.host}\n`);
}

const args = process.argv.slice(2);
const command = args[0];

/** Commands that change schema or data and so need a confirmed target. */
const DESTRUCTIVE_COMMANDS = new Set(['migrate', 'setup', 'init', 'reset', 'clear', 'drop', 'seed']);

async function main() {
  console.log('🚀 SafezoneBUP Database Initialization\n');

  // Confirm the target before connecting, so a stale .env.local pointing at
  // production is caught before anything touches that database.
  if (DESTRUCTIVE_COMMANDS.has(command) && !confirmTarget(args)) {
    process.exit(1);
  }

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
        await runMigrations();
        break;

      case 'init':
        console.log('Initializing database (setup + migrate + seed)...');
        await createTables();
        await runMigrations();
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

      case 'migrate':
        console.log('Applying pending schema migrations...');
        await runMigrations();
        break;

      case 'migrate:status':
        console.log('Migration status:\n');
        describeTargetLine();
        await migrationStatus();
        break;

      default:
        console.log('Usage: npm run db [command]');
        console.log('');
        console.log('Commands:');
        console.log('  setup           - Create database tables');
        console.log('  seed            - Seed database with sample data');
        console.log('  init            - Initialize database (setup + seed + migrate)');
        console.log('  migrate         - Apply pending schema migrations');
        console.log('  migrate:status  - Show which migrations are pending');
        console.log('  reset           - Drop and recreate all tables');
        console.log('  clear           - Clear all data from tables');
        console.log('  drop            - Drop all tables');
        console.log('');
        console.log('Examples:');
        console.log('  npm run db init      # Full database initialization');
        console.log('  npm run db setup     # Just create tables');
        console.log('  npm run db migrate   # Bring an existing database up to date');
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
