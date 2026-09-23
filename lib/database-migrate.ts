/**
 * Schema migrations.
 *
 * `lib/database-setup.ts` defines the schema a brand-new database gets.
 * That is not enough on its own: a database created by an earlier revision
 * still has the old shape, and CREATE TABLE IF NOT EXISTS will not change
 * it. Migrations here bring an existing database up to date.
 *
 * Run with: npm run db:migrate
 *
 * Rules for adding one:
 *  - Never edit or renumber an existing migration; add a new one.
 *  - Make each `up` safe to run twice. Applied ids are recorded, but a
 *    partial failure should not leave the database unrepairable.
 *  - Remember that PostgreSQL lower-cases unquoted identifiers, so
 *    information_schema holds `userid`, not `userId`.
 */

import { Database } from './database';

interface Migration {
  id: string;
  description: string;
  up: () => Promise<void>;
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await Database.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_name = ?
     LIMIT 1`,
    [table.toLowerCase()]
  );

  return rows.length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await Database.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?
     LIMIT 1`,
    [table.toLowerCase(), column.toLowerCase()]
  );

  return rows.length > 0;
}

async function columnIsNullable(table: string, column: string): Promise<boolean> {
  const rows = await Database.query(
    `SELECT is_nullable FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?
     LIMIT 1`,
    [table.toLowerCase(), column.toLowerCase()]
  );

  return rows.length > 0 && rows[0].is_nullable === 'YES';
}

/**
 * Replaces the allowed-value list on a column.
 *
 * Enumerations are TEXT with a CHECK constraint, so widening one means
 * dropping the old constraint and adding the new list. The constraint is
 * named explicitly to make that possible; an anonymous constraint would have
 * a generated name that is awkward to find.
 */
async function setAllowedValues(
  table: string,
  column: string,
  values: readonly string[]
): Promise<void> {
  const constraint = `${table}_${column}_allowed`.toLowerCase();
  const list = values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');

  // Drop both the explicit name and the one PostgreSQL generates for an
  // inline CHECK, so this works whichever way the column was created.
  await Database.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraint}`);
  await Database.query(
    `ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_${column}_check`.toLowerCase()
  );

  await Database.query(
    `ALTER TABLE ${table}
     ADD CONSTRAINT ${constraint} CHECK (${column} IN (${list}))`
  );
}

const migrations: Migration[] = [
  {
    id: '001-baseline-postgres',
    description:
      'Bring a database created by an earlier schema revision up to the current shape: nullable report owners, stored reference ids, and the full category lists',
    up: async () => {
      // On a database created by the current database-setup.ts every step
      // here is already true and does nothing. It exists for one created by
      // an earlier revision, where these three things were wrong:
      //
      //   - userId was NOT NULL on reports, so anonymous submissions failed
      //   - referenceId did not exist, so the code shown to a reporter was
      //     never stored and could not be looked up
      //   - the category lists were narrower than the report forms offered

      for (const table of ['emergency_reports', 'complaints']) {
        if (!(await tableExists(table))) {
          console.log(`   skipped ${table} (table does not exist yet)`);
          continue;
        }

        if (await columnIsNullable(table, 'userId')) {
          console.log(`   ${table}.userId already nullable`);
        } else {
          await Database.query(`ALTER TABLE ${table} ALTER COLUMN userId DROP NOT NULL`);
          console.log(`   ${table}.userId is now nullable`);
        }

        if (await columnExists(table, 'referenceId')) {
          console.log(`   ${table}.referenceId already present`);
        } else {
          await Database.query(`ALTER TABLE ${table} ADD COLUMN referenceId VARCHAR(64)`);
          await Database.query(
            `ALTER TABLE ${table} ADD CONSTRAINT ${table}_referenceid_key UNIQUE (referenceId)`
          );
          console.log(`   ${table}.referenceId added`);
        }
      }

      if (await tableExists('emergency_reports')) {
        await setAllowedValues('emergency_reports', 'category', [
          'medical',
          'security',
          'fire',
          'accident',
          'violence',
          'other',
        ]);
        console.log('   emergency_reports.category accepts all six values');
      }

      if (await tableExists('complaints')) {
        await setAllowedValues('complaints', 'category', [
          'facility',
          'service',
          'academic',
          'harassment',
          'bullying',
          'discrimination',
          'misconduct',
          'property',
          'noise',
          'other',
        ]);
        console.log('   complaints.category accepts all ten values');
      }
    },
  },
  {
    id: '002-replace-invented-contact-numbers',
    description:
      'Replace seeded contact numbers that reach nobody with the published national services and BUP main line',
    up: async () => {
      // The original seed invented a +88024-9870-57xx range for campus
      // security, the medical centre and counselling, and listed 199 for the
      // fire service. Those rows are already in every database that has been
      // seeded, and the seed uses INSERT IGNORE, so correcting the seed file
      // alone leaves them in place.
      //
      // On a safety application a number that reaches nobody is worse than no
      // number at all: it is dialled in the one situation where a second
      // attempt costs the most. Sources: bup.edu.bd/contact for the
      // university line, and the national service numbers published by the
      // Bangladesh government (999, 102, 109, 333, 16263).

      if (!(await tableExists('emergency_contacts'))) {
        console.log('   skipped emergency_contacts (table does not exist yet)');
      } else {
        const invented = await Database.query(
          `SELECT id FROM emergency_contacts
           WHERE phoneNumber LIKE '%9870-5%' OR phoneNumber = '199'`
        );

        if (invented.length === 0) {
          console.log('   emergency_contacts holds no invented numbers');
        } else {
          // Removed rather than rewritten: there is no correct BUP extension
          // to put in their place, and inventing a second one would repeat
          // the original mistake. An administrator adds the real extensions
          // through the contacts screen.
          await Database.query(
            `DELETE FROM emergency_contacts
             WHERE phoneNumber LIKE '%9870-5%' OR phoneNumber = '199'`
          );
          console.log(`   removed ${invented.length} unreachable contact(s)`);
        }

        const verified: Array<[string, string, string | null, string, number]> = [
          ['National Emergency Service', '999', null, 'Police, Fire and Ambulance', 1],
          [
            'Bangladesh University of Professionals',
            '+8809666790799',
            'info@bup.edu.bd',
            'University main line',
            2,
          ],
          ['Fire Service & Civil Defence', '102', null, 'Emergency Services', 3],
          ['Shastho Batayon health line', '16263', null, 'Health Services', 4],
          [
            'Violence against women and children helpline',
            '109',
            null,
            'Support Services',
            5,
          ],
          ['Government information helpline', '333', null, 'Support Services', 6],
        ];

        for (const [name, phoneNumber, email, department, displayOrder] of verified) {
          const existing = await Database.query(
            'SELECT id FROM emergency_contacts WHERE phoneNumber = ?',
            [phoneNumber]
          );

          if (existing.length > 0) continue;

          await Database.query(
            `INSERT INTO emergency_contacts
               (name, phoneNumber, email, department, isActive, displayOrder)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, phoneNumber, email, department, true, displayOrder]
          );
          console.log(`   added ${name} (${phoneNumber})`);
        }
      }

      if (!(await tableExists('safety_resources'))) {
        console.log('   skipped safety_resources (table does not exist yet)');
        return;
      }

      // contactInfo is JSONB holding the same invented numbers.
      const stale = await Database.query(
        `SELECT id FROM safety_resources WHERE contactInfo::text LIKE '%9870-5%'`
      );

      if (stale.length === 0) {
        console.log('   safety_resources holds no invented numbers');
        return;
      }

      await Database.query(
        `UPDATE safety_resources
         SET contactInfo = jsonb_build_object(
               'phone', '999',
               'campusPhone', '+8809666790799',
               'hours', 'Call 999 at any hour, toll free'
             )
         WHERE contactInfo::text LIKE '%9870-5%'`
      );
      console.log(`   corrected ${stale.length} safety resource contact block(s)`);
    },
  },
  {
    id: '003-add-assigned-to',
    description:
      'Add the assignedTo column three report-listing endpoints already join on',
    up: async () => {
      // Three routes LEFT JOIN users ON <table>.assignedTo, and the column
      // exists in no schema revision. Postgres answers "column er.assignedto
      // does not exist", so GET /api/emergency/reports,
      // /api/emergency/my-reports and /api/complaint/reports returned 500 on
      // every call — the student's own report list and the responder's
      // report list both among them.
      //
      // Added rather than removed from the queries, because taking ownership
      // of a report is the behaviour the interface and the README describe,
      // and the routes already select assignedAdminFirstName/LastName from
      // the join. The column was simply never created.
      for (const table of ['emergency_reports', 'complaints']) {
        if (!(await tableExists(table))) {
          console.log(`   skipped ${table} (table does not exist yet)`);
          continue;
        }

        if (await columnExists(table, 'assignedTo')) {
          console.log(`   ${table}.assignedTo already present`);
          continue;
        }

        // ON DELETE SET NULL, not CASCADE: removing a staff account must
        // orphan the assignment, never delete the report.
        await Database.query(
          `ALTER TABLE ${table}
             ADD COLUMN assignedTo INTEGER REFERENCES users(id) ON DELETE SET NULL`
        );
        await Database.query(
          `CREATE INDEX IF NOT EXISTS idx_${table}_assignedto ON ${table} (assignedTo)`
        );
        console.log(`   ${table}.assignedTo added`);
      }
    },
  },
];

/** Where the connection settings currently point. */
export function describeTarget(): { host: string; database: string; isLocal: boolean } {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      const host = url.hostname;

      return {
        host,
        database: url.pathname.replace(/^\//, '') || 'postgres',
        isLocal: ['localhost', '127.0.0.1', '::1'].includes(host),
      };
    } catch {
      return { host: 'unknown', database: 'unknown', isLocal: false };
    }
  }

  const host = process.env.DB_HOST || 'localhost';
  const database = process.env.DB_NAME || 'postgres';
  const isLocal = ['localhost', '127.0.0.1', '::1', ''].includes(host.toLowerCase());

  return { host, database, isLocal };
}

/**
 * Refuse to touch a remote database unless the caller says so explicitly.
 *
 * Migrating production is how the live schema gets fixed, so it has to be
 * possible. But the connection settings in a local env file are easy to
 * leave pointing somewhere unintended, and an ALTER against the wrong
 * database is not something you can undo. Requiring a flag makes the target
 * a conscious choice rather than whatever the shell happened to load.
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
  console.error(`❌ Refusing to change the remote database "${target.database}" on ${target.host}`);
  console.error('   without confirmation. Check that the connection settings point where you');
  console.error('   intend, then re-run with an explicit confirmation:');
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
      appliedAt TIMESTAMPTZ DEFAULT NOW()
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

    await Database.query('INSERT INTO schema_migrations (id, description) VALUES (?, ?)', [
      migration.id,
      migration.description,
    ]);

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
