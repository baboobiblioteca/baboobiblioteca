const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');

const localDbPath = './babbo_biblioteca.db';
const supabaseUrl = 'postgresql://postgres.dmuyclcxmggabgxxtssw:Cualquiera89%26@aws-1-us-east-1.pooler.supabase.com:6543/postgres';

const sqliteDb = new sqlite3.Database(localDbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening local SQLite DB', err.message);
    process.exit(1);
  }
});

const pgClient = new Client({
  connectionString: supabaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await pgClient.connect();
    console.log('✅ Connected to Supabase PostgreSQL');

    // 1. Create Tables in PostgreSQL
    console.log('🛠️ Creating tables in Supabase...');
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        telefono TEXT,
        password_hash TEXT NOT NULL,
        created_by INTEGER REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS sectors (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        created_by INTEGER REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS schools (
        id SERIAL PRIMARY KEY,
        sector_id INTEGER NOT NULL REFERENCES sectors (id),
        nombre TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('Rural', 'Urbana')),
        created_by INTEGER REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS pavilions (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools (id),
        nombre TEXT NOT NULL,
        teacher_name TEXT NOT NULL,
        teacher_phone TEXT,
        student_count INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS backpacks (
        id SERIAL PRIMARY KEY,
        internal_number TEXT NOT NULL UNIQUE,
        graphic_identifier TEXT,
        color TEXT,
        book_count INTEGER NOT NULL DEFAULT 0,
        image_url TEXT,
        created_by INTEGER REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        backpack_id INTEGER NOT NULL REFERENCES backpacks (id),
        pavilion_id INTEGER REFERENCES pavilions (id),
        action TEXT NOT NULL CHECK(action IN ('Delivered', 'Picked_Up')),
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER NOT NULL REFERENCES users (id)
      );
    `);
    console.log('✅ Tables created/verified in Supabase.');

    // Helper to fetch all rows from SQLite
    const fetchSqlite = (table) => {
      return new Promise((resolve, reject) => {
        sqliteDb.all(`SELECT * FROM ${table}`, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };

    // 2. Migrate Users
    console.log('📦 Migrating users...');
    const users = await fetchSqlite('users');
    for (const u of users) {
      await pgClient.query(
        'INSERT INTO users (id, nombre, telefono, password_hash, created_by) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
        [u.id, u.nombre, u.telefono, u.password_hash, u.created_by]
      );
    }
    // Update sequences
    await pgClient.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));`);

    // 3. Migrate Sectors
    console.log('📦 Migrating sectors...');
    const sectors = await fetchSqlite('sectors');
    for (const s of sectors) {
      await pgClient.query(
        'INSERT INTO sectors (id, nombre, created_by) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [s.id, s.nombre, s.created_by]
      );
    }
    if (sectors.length) await pgClient.query(`SELECT setval('sectors_id_seq', (SELECT MAX(id) FROM sectors));`);

    // 4. Migrate Schools
    console.log('📦 Migrating schools...');
    const schools = await fetchSqlite('schools');
    for (const s of schools) {
      await pgClient.query(
        'INSERT INTO schools (id, sector_id, nombre, type, created_by) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
        [s.id, s.sector_id, s.nombre, s.type, s.created_by]
      );
    }
    if (schools.length) await pgClient.query(`SELECT setval('schools_id_seq', (SELECT MAX(id) FROM schools));`);

    // 5. Migrate Pavilions
    console.log('📦 Migrating pavilions...');
    const pavilions = await fetchSqlite('pavilions');
    for (const p of pavilions) {
      await pgClient.query(
        'INSERT INTO pavilions (id, school_id, nombre, teacher_name, teacher_phone, student_count, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
        [p.id, p.school_id, p.nombre, p.teacher_name, p.teacher_phone, p.student_count, p.created_by]
      );
    }
    if (pavilions.length) await pgClient.query(`SELECT setval('pavilions_id_seq', (SELECT MAX(id) FROM pavilions));`);

    // 6. Migrate Backpacks
    console.log('📦 Migrating backpacks...');
    const backpacks = await fetchSqlite('backpacks');
    for (const b of backpacks) {
      await pgClient.query(
        'INSERT INTO backpacks (id, internal_number, graphic_identifier, color, book_count, image_url, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
        [b.id, b.internal_number, b.graphic_identifier, b.color, b.book_count, b.image_url, b.created_by]
      );
    }
    if (backpacks.length) await pgClient.query(`SELECT setval('backpacks_id_seq', (SELECT MAX(id) FROM backpacks));`);

    // 7. Migrate Transactions
    console.log('📦 Migrating transactions...');
    const transactions = await fetchSqlite('transactions');
    for (const t of transactions) {
      let dateStr = t.transaction_date;
      if (typeof dateStr === 'string' && dateStr.trim() !== '') {
        const parts = dateStr.split(':');
        if (parts.length > 3) {
           dateStr = parts.slice(0, 3).join(':'); // remove extra seconds
        }
      }
      await pgClient.query(
        'INSERT INTO transactions (id, backpack_id, pavilion_id, action, transaction_date, created_by) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
        [t.id, t.backpack_id, t.pavilion_id, t.action, dateStr, t.created_by]
      );
    }
    if (transactions.length) await pgClient.query(`SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions));`);

    console.log('🎉 MIGRATION COMPLETE! All data from SQLite has been moved to Supabase.');
    process.exit(0);

  } catch (err) {
    console.error('❌ MIGRATION ERROR:', err);
    process.exit(1);
  }
}

migrate();
