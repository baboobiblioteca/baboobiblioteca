const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.dmuyclcxmggabgxxtssw:Cualquiera89%26@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    // 1. check if we have any backpack
    const bRes = await pool.query('SELECT id FROM backpacks LIMIT 1');
    if (bRes.rows.length === 0) { console.log('No backpacks'); return; }
    const backpack_id = bRes.rows[0].id;

    // 2. check if we have any school
    const sRes = await pool.query('SELECT id FROM schools LIMIT 1');
    if (sRes.rows.length === 0) { console.log('No schools'); return; }
    const school_id = sRes.rows[0].id;

    // 3. get user
    const uRes = await pool.query('SELECT id FROM users LIMIT 1');
    if (uRes.rows.length === 0) { console.log('No users'); return; }
    const user_id = uRes.rows[0].id;

    // test insert pavilion
    console.log('Testing insert pavilion...');
    const pavRes = await pool.query(
      'INSERT INTO pavilions (school_id, nombre, teacher_name, teacher_phone, student_count, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [String(school_id), 'Test Pavilion', 'Test Teacher', '123456', 10, String(user_id)]
    );
    const pavilion_id = pavRes.rows[0].id;
    console.log('Pavilion inserted:', pavilion_id);

    // test insert transaction
    console.log('Testing insert transaction...');
    const txRes = await pool.query(
      'INSERT INTO transactions (backpack_id, pavilion_id, action, transaction_date, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [String(backpack_id), String(pavilion_id), 'Delivered', '2026-03-26 12:28:00', String(user_id)]
    );
    console.log('Transaction inserted:', txRes.rows[0].id);

    // cleanup
    await pool.query('DELETE FROM transactions WHERE id = $1', [txRes.rows[0].id]);
    await pool.query('DELETE FROM pavilions WHERE id = $1', [pavilion_id]);
    console.log('Cleanup done');
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    pool.end();
  }
}

test();
