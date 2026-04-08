const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.dmuyclcxmggabgxxtssw:Cualquiera89%26@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const db = {
  _convertQuery: (sql) => {
    let i = 1;
    let finalSql = sql.replace(/\?/g, () => '$' + (i++));
    return finalSql;
  },
  
  run: function(sql, params, callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    if (!params) params = [];
    
    let isInsert = sql.trim().toUpperCase().startsWith('INSERT');
    let pgSql = db._convertQuery(sql);
    if (isInsert && !pgSql.toUpperCase().includes('RETURNING ID')) {
      pgSql += ' RETURNING id';
    }

    pool.query(pgSql, params, (err, res) => {
      if (err) {
        if (callback) callback.call(this, err);
      } else {
        let lastID = null;
        if (isInsert && res.rows && res.rows.length > 0) {
          lastID = res.rows[0].id;
        }
        const context = { lastID };
        if (callback) callback.call(context, null);
      }
    });
  }
};

db.run('INSERT INTO pavilions (school_id, nombre, teacher_name, teacher_phone, student_count, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
  [1, 'Testing Run', 'Testing Run Teacher', '123123', 0, 1], function(err) {
    if (err) {
        console.error('Error in db.run:', err);
    } else {
        console.log('Success! lastID is:', this.lastID);
    }
});
