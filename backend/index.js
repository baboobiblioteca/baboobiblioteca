const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

const app = express();
const port = process.env.PORT || 3001;

// Configurar Supabase PostgreSQL Database (Wrapper para mantener compatibilidad con sintaxis de SQLite)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.dmuyclcxmggabgxxtssw:Cualquiera89%26@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

pool.connect((err) => {
  if (err) console.error('Error connecting to Supabase', err.stack);
  else {
    console.log('Connected to Supabase PostgreSQL database.');
    pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        autor VARCHAR(255),
        isbn VARCHAR(100),
        editorial VARCHAR(255),
        anio VARCHAR(50),
        edicion VARCHAR(50),
        cantidad INTEGER DEFAULT 1,
        portada_url TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS readers (
        id SERIAL PRIMARY KEY,
        cedula VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        telefono VARCHAR(50),
        direccion TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS book_loans (
        id SERIAL PRIMARY KEY,
        book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
        reader_id INTEGER REFERENCES readers(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Returned')),
        loan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        return_date TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      );
    `, (err) => {
      if (err) console.error("Error creating tables:", err);
      else {
          console.log("Books, readers and book_loans tables ensured.");
          pool.query(`ALTER TABLE book_loans ADD COLUMN IF NOT EXISTS returned_by INTEGER REFERENCES users(id);`, (err) => {
              if (err) console.error("Error adding returned_by column:", err);
          });
      }
    });
  }
});

const db = {
  _convertQuery: (sql) => {
    let i = 1;
    // Convierte ? en $1, $2, etc. Además, SQLite usa INSERT OR IGNORE, en Postgres es ON CONFLICT DO NOTHING
    let finalSql = sql.replace(/\?/g, () => '$' + (i++));
    finalSql = finalSql.replace(/INSERT OR IGNORE INTO users/ig, 'INSERT INTO users'); // Simplification for the admin initial insert if we ever run it
    return finalSql;
  },
  
  get: (sql, params, callback) => {
    if (typeof params === 'function') { callback = params; params = []; }
    if (!params) params = [];
    const sanitizedParams = params.map(p => p === undefined ? null : p);
    try {
        pool.query(db._convertQuery(sql), sanitizedParams, (err, res) => {
          if (err) callback(err, null);
          else callback(null, res.rows[0]);
        });
    } catch(err) {
        if(callback) callback(err, null);
    }
  },
  
  all: (sql, params, callback) => {
    if (typeof params === 'function') { callback = params; params = []; }
    if (!params) params = [];
    const sanitizedParams = params.map(p => p === undefined ? null : p);
    try {
        pool.query(db._convertQuery(sql), sanitizedParams, (err, res) => {
          if (err) callback(err, null);
          else callback(null, res.rows);
        });
    } catch(err) {
        if(callback) callback(err, null);
    }
  },
  
  run: function(sql, params, callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    if (!params) params = [];
    
    // Sanitize params: pg library throws server-crashing errors if any param is undefined
    const sanitizedParams = params.map(p => p === undefined ? null : p);
    
    let isInsert = sql.trim().toUpperCase().startsWith('INSERT');
    let pgSql = db._convertQuery(sql);
    if (isInsert && !pgSql.toUpperCase().includes('RETURNING ID')) {
      pgSql += ' RETURNING id';
    }

    try {
        pool.query(pgSql, sanitizedParams, (err, res) => {
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
    } catch (err) {
        if (callback) callback.call(this, err);
    }
  }
};

// Middlewares
app.use(cors());
app.use(express.json());

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || 'https://dmuyclcxmggabgxxtssw.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdXljbGN4bWdnYWJneHh0c3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTk3NzQsImV4cCI6MjA4OTU5NTc3NH0.PE1gaa1tHpkc7KCfbHjTKr-qDGvKSwGGraTc-Nhbsdc';
const supabase = createClient(supabaseUrl, supabaseKey);

// Set up static files for uploads (retrocompatibilidad)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración Multer en MEMORIA para mandarlo a Supabase directamente
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function para enviar DB global a las rutas (por simplicidad en fase inicial Mínimo Producto Viable)
app.use((req, res, next) => {
    req.db = db;
    next();
});

// Middleware de Autenticación JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.sendStatus(401);
  
    jwt.verify(token, 'babbo_secret_key_12345', (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
};

// --- RUTAS DE AUTENTICACION ---
app.post('/api/auth/login', (req, res) => {
    const { nombre, password } = req.body;
    db.get('SELECT * FROM users WHERE nombre = ?', [nombre], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

        bcrypt.compare(password, user.password_hash, (err, result) => {
            if (result) {
                const token = jwt.sign({ id: user.id, nombre: user.nombre }, 'babbo_secret_key_12345', { expiresIn: '8h' });
                res.json({ token, user: { id: user.id, nombre: user.nombre } });
            } else {
                res.status(401).json({ error: 'Contraseña incorrecta' });
            }
        });
    });
});

// --- RUTAS DE USUARIOS ---
app.post('/api/users', authenticateToken, (req, res) => {
    // Solo permitir que el Admin (o usuarios creados que tengan ese rol conceptualmente) creen usuarios.
    const { nombre, telefono, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.run('INSERT INTO users (nombre, telefono, password_hash, created_by) VALUES (?, ?, ?, ?)', 
        [nombre, telefono, hash, req.user.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, nombre, telefono });
      });
    });
});

app.get('/api/users', authenticateToken, (req, res) => {
    db.all('SELECT id, nombre, telefono FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { nombre, telefono, password } = req.body;
    
    // Si envían password, se encripta de nuevo y se actualiza todo. 
    // Si no, solo actualizan datos básicos.
    if (password) {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ error: err.message });
            db.run('UPDATE users SET nombre = ?, telefono = ?, password_hash = ? WHERE id = ?',
                [nombre, telefono, hash, id], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true });
            });
        });
    } else {
        db.run('UPDATE users SET nombre = ?, telefono = ? WHERE id = ?',
            [nombre, telefono, id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
        });
    }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    // Evitar borrar el usuario 1 (Admin root)
    if (parseInt(id) === 1) {
        return res.status(403).json({ error: 'No se puede eliminar el usuario administrador raíz.' });
    }
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- RUTAS DE SECTORES ---
app.get('/api/sectors', authenticateToken, (req, res) => {
    db.all('SELECT * FROM sectors', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/sectors', authenticateToken, (req, res) => {
    const { nombre } = req.body;
    db.run('INSERT INTO sectors (nombre, created_by) VALUES (?, ?)', [nombre, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, nombre });
    });
});

app.put('/api/sectors/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { nombre } = req.body;
    db.run('UPDATE sectors SET nombre = ? WHERE id = ?', [nombre, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/sectors/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM sectors WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});


// --- RUTAS DE ESCUELAS ---
app.get('/api/schools', authenticateToken, (req, res) => {
    db.all(`SELECT schools.*, sectors.nombre as sector_nombre 
            FROM schools 
            JOIN sectors ON schools.sector_id = sectors.id`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/schools', authenticateToken, (req, res) => {
    const { sector_id, nombre, type } = req.body;
    db.run('INSERT INTO schools (sector_id, nombre, type, created_by) VALUES (?, ?, ?, ?)', 
      [sector_id, nombre, type, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, sector_id, nombre, type });
    });
});

app.put('/api/schools/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { sector_id, nombre, type } = req.body;
    db.run('UPDATE schools SET sector_id = ?, nombre = ?, type = ? WHERE id = ?', 
      [sector_id, nombre, type, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/schools/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM schools WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});


// --- RUTAS DE PABELLONES ---
app.get('/api/pavilions', authenticateToken, (req, res) => {
    db.all(`SELECT pavilions.*, schools.nombre as school_nombre 
            FROM pavilions 
            JOIN schools ON pavilions.school_id = schools.id`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/pavilions', authenticateToken, (req, res) => {
    const { school_id, nombre, teacher_name, teacher_phone, student_count } = req.body;
    db.run('INSERT INTO pavilions (school_id, nombre, teacher_name, teacher_phone, student_count, created_by) VALUES (?, ?, ?, ?, ?, ?)', 
      [school_id, nombre, teacher_name, teacher_phone, student_count, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, school_id, nombre, teacher_name, teacher_phone, student_count });
    });
});

app.put('/api/pavilions/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { school_id, nombre, teacher_name, teacher_phone, student_count } = req.body;
    db.run('UPDATE pavilions SET school_id = ?, nombre = ?, teacher_name = ?, teacher_phone = ?, student_count = ? WHERE id = ?', 
      [school_id, nombre, teacher_name, teacher_phone, student_count, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/pavilions/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM pavilions WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- RUTAS DE LIBROS ---
app.get('/api/books', authenticateToken, (req, res) => {
    db.all(`
        SELECT b.*, 
               (SELECT COUNT(*) FROM book_loans WHERE book_id = b.id AND status = 'Active') as prestados
        FROM books b 
        ORDER BY b.id DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/books', authenticateToken, (req, res) => {
    const { titulo, autor, isbn, editorial, anio, edicion, cantidad, portada_url } = req.body;
    db.run('INSERT INTO books (titulo, autor, isbn, editorial, anio, edicion, cantidad, portada_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [titulo, autor, isbn, editorial, anio, edicion, cantidad, portada_url, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, titulo, autor, isbn, editorial, anio, edicion, cantidad, portada_url });
    });
});

app.put('/api/books/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { titulo, autor, isbn, editorial, anio, edicion, cantidad, portada_url } = req.body;
    db.run('UPDATE books SET titulo = ?, autor = ?, isbn = ?, editorial = ?, anio = ?, edicion = ?, cantidad = ?, portada_url = ? WHERE id = ?', 
      [titulo, autor, isbn, editorial, anio, edicion, cantidad, portada_url, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/books/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM books WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/books/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);
        
        let count = 0;
        
        data.forEach(row => {
            const getVal = (keys) => {
                for (let k of keys) {
                    let found = Object.keys(row).find(x => x.toLowerCase().trim() === k);
                    if (found && row[found]) return String(row[found]);
                }
                return null;
            };

            const titulo = getVal(['titulo', 'título', 'title', 'nombre', 'name', 'titulos', 'titles']) || 'Sin Título';
            const autor = getVal(['autor', 'author', 'escritor', 'autores', 'authors', 'escritores']);
            const isbn = getVal(['isbn', 'código', 'codigo', 'identificador']);
            const editorial = getVal(['editorial', 'publisher', 'editoriales']);
            const anio = getVal(['año', 'anio', 'year', 'fecha']);
            const edicion = getVal(['edición', 'edicion', 'edition', 'ediciones']);
            let cantidad = getVal(['cantidad', 'ejemplares', 'stock', 'quantity', 'cantidades']);
            cantidad = cantidad ? parseInt(cantidad) : 1;

            db.run('INSERT INTO books (titulo, autor, isbn, editorial, anio, edicion, cantidad, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [titulo, autor, isbn, editorial, anio, edicion, cantidad, req.user.id], function(err) {
                if (err) console.error("Error inserting book from excel:", err);
            });
            count++;
        });

        res.json({ success: true, message: `Se procesaron ${count} libros encontrados en el archivo.` });

    } catch(err) {
        console.error("Error processing excel file:", err);
        return res.status(500).json({ error: 'Error procesando el archivo Excel: ' + err.message });
    }
});

// --- RUTAS DE MOCHILAS ---
app.get('/api/backpacks', authenticateToken, (req, res) => {
    db.all('SELECT * FROM backpacks', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/backpacks', authenticateToken, upload.single('image'), async (req, res) => {
    const { internal_number, graphic_identifier, color, book_count } = req.body;
    let image_url = null;
    
    if (req.file) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(req.file.originalname);
        const { data, error } = await supabase.storage.from('Mochilas').upload(uniqueName, req.file.buffer, {
            contentType: req.file.mimetype
        });
        if (error) return res.status(500).json({ error: 'Supabase Storage Error: ' + error.message });
        const { data: publicData } = supabase.storage.from('Mochilas').getPublicUrl(uniqueName);
        image_url = publicData.publicUrl;
    }

    db.run('INSERT INTO backpacks (internal_number, graphic_identifier, color, book_count, image_url, created_by) VALUES (?, ?, ?, ?, ?, ?)', 
      [internal_number, graphic_identifier, color, book_count, image_url, req.user.id], function(err) {
        if (err) {
            if (err.message.includes('unique constraint') || err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Ese Identificador ya está registrado. Para hacer cambios, busca la mochila abajo y presiona Editar (lápiz).' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, internal_number, graphic_identifier, color, book_count, image_url });
    });
});

// Update Backpack
app.put('/api/backpacks/:id', authenticateToken, upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { internal_number, graphic_identifier, color, book_count } = req.body;
    
    if (req.file) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(req.file.originalname);
        const { data, error } = await supabase.storage.from('Mochilas').upload(uniqueName, req.file.buffer, {
            contentType: req.file.mimetype
        });
        if (error) return res.status(500).json({ error: 'Supabase Storage Error: ' + error.message });
        const { data: publicData } = supabase.storage.from('Mochilas').getPublicUrl(uniqueName);
        const image_url = publicData.publicUrl;

        db.run(`UPDATE backpacks SET internal_number = ?, graphic_identifier = ?, color = ?, book_count = ?, image_url = ? WHERE id = ?`,
            [internal_number, graphic_identifier, color, book_count, image_url, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, image_url });
        });
    } else {
        // Just update textual data
        db.run(`UPDATE backpacks SET internal_number = ?, graphic_identifier = ?, color = ?, book_count = ? WHERE id = ?`,
            [internal_number, graphic_identifier, color, book_count, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    }
});

app.delete('/api/backpacks/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM backpacks WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});


// --- RUTAS DE TRANSACCIONES ---
app.get('/api/transactions', authenticateToken, (req, res) => {
    db.all(`
        SELECT 
            t.id, t.action, t.transaction_date, t.pavilion_id, t.backpack_id,
            b.internal_number as backpack_number, b.color as backpack_color, b.graphic_identifier as backpack_graphic,
            p.nombre as pavilion_nombre, p.teacher_name as teacher_nombre, p.teacher_phone as teacher_phone, p.student_count as student_count,
            s.nombre as school_nombre,
            u.nombre as registered_by
        FROM transactions t
        JOIN backpacks b ON t.backpack_id = b.id
        LEFT JOIN pavilions p ON t.pavilion_id = p.id
        LEFT JOIN schools s ON p.school_id = s.id
        JOIN users u ON t.created_by = u.id
        ORDER BY t.transaction_date DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/transactions', authenticateToken, (req, res) => {
    const { backpack_id, pavilion_id, action, transaction_date } = req.body;
    
    if (transaction_date) {
        db.run('INSERT INTO transactions (backpack_id, pavilion_id, action, transaction_date, created_by) VALUES (?, ?, ?, ?, ?)', 
          [backpack_id, pavilion_id, action, transaction_date, req.user.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, backpack_id, pavilion_id, action, transaction_date });
        });
    } else {
        db.run('INSERT INTO transactions (backpack_id, pavilion_id, action, created_by) VALUES (?, ?, ?, ?)', 
          [backpack_id, pavilion_id, action, req.user.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, backpack_id, pavilion_id, action });
        });
    }
});

app.put('/api/transactions/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { backpack_id, pavilion_id, action, transaction_date } = req.body;
    db.run('UPDATE transactions SET backpack_id = ?, pavilion_id = ?, action = ?, transaction_date = ? WHERE id = ?', 
      [backpack_id, pavilion_id, action, transaction_date, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM transactions WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- RUTAS DE LECTORES Y PRESTAMOS INDIVIDUALES ---

app.get('/api/readers/:cedula', authenticateToken, (req, res) => {
    db.get('SELECT * FROM readers WHERE cedula = ?', [req.params.cedula], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Lector no encontrado" });
        res.json(row);
    });
});

app.post('/api/book-loans/lend', authenticateToken, (req, res) => {
    const { book_id, cedula, nombre, apellido, telefono, direccion } = req.body;
    
    // First find or create reader
    db.get('SELECT id FROM readers WHERE cedula = ?', [cedula], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let readerId = row ? row.id : null;
        
        const createLoan = (rId) => {
            db.run('INSERT INTO book_loans (book_id, reader_id, created_by) VALUES (?, ?, ?)',
                [book_id, rId, req.user.id], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, loan_id: this.lastID });
            });
        };

        if (readerId) {
            createLoan(readerId);
        } else {
            db.run('INSERT INTO readers (cedula, nombre, apellido, telefono, direccion, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                [cedula, nombre, apellido, telefono, direccion, req.user.id], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    createLoan(this.lastID);
            });
        }
    });
});

app.post('/api/book-loans/return/:id', authenticateToken, (req, res) => {
    db.run("UPDATE book_loans SET status = 'Returned', return_date = CURRENT_TIMESTAMP, returned_by = ? WHERE id = ?", [req.user.id, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/book-loans/active', authenticateToken, (req, res) => {
    db.all(`
        SELECT bl.id as loan_id, bl.loan_date, 
               b.titulo as book_title, b.autor as book_author, b.isbn,
               r.cedula, r.nombre, r.apellido, r.telefono, r.direccion
        FROM book_loans bl
        JOIN books b ON bl.book_id = b.id
        JOIN readers r ON bl.reader_id = r.id
        WHERE bl.status = 'Active'
        ORDER BY bl.loan_date DESC
    `, [], (err, rows) => {
         if (err) return res.status(500).json({ error: err.message });
         res.json(rows);
    });
});

app.get('/api/book-loans/book/:book_id', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM book_loans WHERE book_id = ? AND status = 'Active'`, [req.params.book_id], (err, rows) => {
         if (err) return res.status(500).json({ error: err.message });
         res.json(rows);
    });
});

app.get('/api/book-loans/history', authenticateToken, (req, res) => {
    db.all(`
        SELECT bl.id as loan_id, bl.status, bl.loan_date, bl.return_date,
               b.titulo as book_title, b.autor as book_author, b.isbn,
               r.cedula, r.nombre, r.apellido, r.telefono, r.direccion,
               u1.nombre as admin_prestamo,
               u2.nombre as admin_recepcion
        FROM book_loans bl
        JOIN books b ON bl.book_id = b.id
        JOIN readers r ON bl.reader_id = r.id
        LEFT JOIN users u1 ON bl.created_by = u1.id
        LEFT JOIN users u2 ON bl.returned_by = u2.id
        ORDER BY bl.loan_date DESC
    `, [], (err, rows) => {
         if (err) return res.status(500).json({ error: err.message });
         res.json(rows);
    });
});

app.get('/api/book-loans/history/book/:book_id', authenticateToken, (req, res) => {
    db.all(`
        SELECT bl.id as loan_id, bl.status, bl.loan_date, bl.return_date,
               r.cedula, r.nombre, r.apellido,
               u1.nombre as admin_prestamo,
               u2.nombre as admin_recepcion
        FROM book_loans bl
        JOIN readers r ON bl.reader_id = r.id
        LEFT JOIN users u1 ON bl.created_by = u1.id
        LEFT JOIN users u2 ON bl.returned_by = u2.id
        WHERE bl.book_id = ?
        ORDER BY bl.loan_date DESC
    `, [req.params.book_id], (err, rows) => {
         if (err) return res.status(500).json({ error: err.message });
         res.json(rows);
    });
});

app.listen(port, () => {
  console.log(`Babbo Biblioteca Backend listening at http://localhost:${port}`);
});
