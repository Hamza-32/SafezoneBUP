/**
 * Schema migrations.
 *
 * `lib/database-setup.ts` defines the schema a brand-new database gets.
 * That is not enough on its own: an existing database created by an earlier
 * version still has the old shape, and `CREATE TABLE IF NOT EXISTS` will not
 * change it. Migrations here bring an existing database up to date.
 *
 * Run with: npm run db:migrate
 *
 * Rules for adding one:
 *  - Never edit or renumber an existing migration; add a new one.
 *  - Make each `up` safe to run twice. Applied ids are recorded, but a
 *    partial failure should not leave the database unrepairable.
 */

import { Database } from './database';

interface Migration {
  id: string;
  description: string;
  up: () => Promise<void>;
}

/** True when `table`.`column` exists in the current database. */
async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await Database.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );

  return rows.length > 0;
}

/** True when `table`.`column` currently accepts NULL. */
async function columnIsNullable(table: string, column: string): Promise<boolean> {
  const rows = await Database.query(
    `SELECT IS_NULLABLE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );

  return rows.length > 0 && rows[0].IS_NULLABLE === 'YES';
}

/** True when `table` exists in the current database. */
async function tableExists(table: string): Promise<boolean> {
  const rows = await Database.query(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     LIMIT 1`,
    [table]
  );

  return rows.length > 0;
}

const migrations: Migration[] = [
  {
    id: '001-allow-anonymous-reports',
    description:
      'Allow NULL userId on emergency_reports and complaints so a report from someone who is not signed in can be stored',
    up: async () => {
      // Both endpoints accept anonymous submissions and insert NULL for
      // userId, but the column was NOT NULL, so every anonymous emergency
      // report and complaint failed with a constraint error.
      for (const table of ['emergency_reports', 'complaints']) {
        if (!(await tableExists(table))) {
          console.log(`   skipped ${table} (table does not exist yet)`);
          continue;
        }

        if (await columnIsNullable(table, 'userId')) {
          console.log(`   ${table}.userId already nullable`);
          continue;
        }

        await Database.query(`ALTER TABLE ${table} MODIFY COLUMN userId INT NULL`);
        console.log(`   ${table}.userId is now nullable`);
      }
    },
  },
  {
    id: '002-store-report-reference-id',
    description:
      'Store the generated reference id on emergency_reports and complaints so the code shown to a reporter can be looked up again',
    up: async () => {
      // Both endpoints generate a reference such as EMG-ABC123 and return it
      // to the reporter, but never stored it, so the code could not be used
      // to find the report afterwards.
      for (const table of ['emergency_reports', 'complaints']) {
        if (!(await tableExists(table))) {
          console.log(`   skipped ${table} (table does not exist yet)`);
          continue;
        }

        if (await columnExists(table, 'referenceId')) {
          console.log(`   ${table}.referenceId already present`);
          continue;
        }

        await Database.query(
          `ALTER TABLE ${table} ADD COLUMN referenceId VARCHAR(64) NULL AFTER id`
        );
        await Database.query(
          `ALTER TABLE ${table} ADD UNIQUE INDEX idx_${table}_reference_id (referenceId)`
        );

        console.log(`   ${table}.referenceId added`);
      }
    },
  },
  {
    id: '003-emergency-category-enum',
    description:
      "Add 'accident' and 'violence' to the emergency_reports category enum so every choice offered by the report form can be saved",
    up: async () => {
      if (!(await tableExists('emergency_reports'))) {
        console.log('   skipped (emergency_reports does not exist yet)');
        return;
      }

      // The report form offers six categories but the column only accepted
      // four, so an accident or violence report was rejected by the database.
      await Database.query(
        `ALTER TABLE emergency_reports
         MODIFY COLUMN category
         ENUM('medical', 'security', 'fire', 'accident', 'violence', 'other') NOT NULL`
      );

      console.log('   emergency_reports.category now accepts all six values');
    },
  },
  {
    id: '004-complaint-category-enum',
    description:
      'Widen the complaints category enum to cover every option the complaint form offers',
    up: async () => {
      if (!(await tableExists('complaints'))) {
        console.log('   skipped (complaints does not exist yet)');
        return;
      }

      // The form offers bullying, discrimination, misconduct, property and
      // noise, none of which the column accepted. The original four values
      // are kept so existing rows stay valid.
      await Database.query(
        `ALTER TABLE complaints
         MODIFY COLUMN category
         ENUM('facility', 'service', 'academic', 'harassment', 'bullying',
              'discrimination', 'misconduct', 'property', 'noise', 'other') NOT NULL`
      );

      console.log('   complaints.category widened');
    },
  },
];

/** Where the DB_* variables currently point. */
export function describeTarget(): { host: string; database: string; isLocal: boolean } {
  const host = process.env.DB_HOST || 'localhost';
  const database = process.env.DB_NAME || 'safezone_db';
  const isLocal = ['localhost', '127.0.0.1', '::1', ''].includes(host.toLowerCase());

  return { host, database, isLocal };
}

/**
 * Refuse to migrate a remote database unless the caller says so explicitly.
 *
 * Running migrations is how the production database gets fixed, so it has to
 * be possible. But the DB_* variables in a local .env are easy to leave
 * pointing somewhere unintended, and an ALTER against the wrong database is
 * not something you can undo. Requiring a flag makes the target a conscious
 * choice rather than whatever the shell happened to have loaded.
 *
 * Returns false when the caller should stop.
 */
export function confirmTarget(argv: string[]): boolean {
  const target = describeTarget();
  const confirmed = argv.includes('--yes') || process.env.MIGRATE_CONFIRM === '1';

  console.log(`   target: ${target.database} on ${target.host}`);

  if (target.isLocal || confirmed) {
    return true;
  }

  console.error('');
  console.error(`❌ Refusing to migrate the remote database "${target.database}" on ${target.host}`);
  console.error('   without confirmation. Check that the DB_* variables point where you intend,');
  console.error('   then re-run with an explicit confirmation:');
  console.error('');
  console.error('     npm run db:migrate -- --yes');
  console.error('');

  return false;
}

async function ensureMigrationsTable(): Promise<void> {
  await Database.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(191) PRIMARY KEY,
      description TEXT,
      appliedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/** Applies every migration that has not been recorded as applied. */
export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();

  const applied = await Database.query('SELECT id FROM schema_migrations');
  const appliedIds = new Set(applied.map((row: { id: string }) => row.id));

  let ran = 0;

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      continue;
    }

    console.log(`→ ${migration.id}: ${migration.description}`);

    await migration.up();

    await Database.query(
      'INSERT INTO schema_migrations (id, description) VALUES (?, ?)',
      [migration.id, migration.description]
    );

    ran += 1;
  }

  if (ran === 0) {
    console.log('✅ Database schema is already up to date');
  } else {
    console.log(`✅ Applied ${ran} migration${ran === 1 ? '' : 's'}`);
  }
}

/** Reports which migrations are outstanding without applying them. */
export async function migrationStatus(): Promise<void> {
  await ensureMigrationsTable();

  const applied = await Database.query('SELECT id FROM schema_migrations');
  const appliedIds = new Set(applied.map((row: { id: string }) => row.id));

  for (const migration of migrations) {
    const mark = appliedIds.has(migration.id) ? '✅ applied' : '⏳ pending';
    console.log(`${mark}  ${migration.id}  ${migration.description}`);
  }
}
