const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

// Configurar SQLite Database
const db = new sqlite3.Database('./babbo_biblioteca.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Inicializar Esquema de Base de Datos
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        telefono TEXT,
        password_hash TEXT NOT NULL,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS sectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS schools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sector_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('Rural', 'Urbana')),
        created_by INTEGER,
        FOREIGN KEY (sector_id) REFERENCES sectors (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS pavilions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        teacher_name TEXT NOT NULL,
        teacher_phone TEXT,
        student_count INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER,
        FOREIGN KEY (school_id) REFERENCES schools (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS backpacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        internal_number TEXT NOT NULL UNIQUE,
        graphic_identifier TEXT,
        color TEXT,
        book_count INTEGER NOT NULL DEFAULT 0,
        image_url TEXT,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backpack_id INTEGER NOT NULL,
        pavilion_id INTEGER,
        action TEXT NOT NULL CHECK(action IN ('Delivered', 'Picked_Up')),
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER NOT NULL,
        FOREIGN KEY (backpack_id) REFERENCES backpacks (id),
        FOREIGN KEY (pavilion_id) REFERENCES pavilions (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`);

      // Crear Usuario Admin inicial si no existe
      bcrypt.hash('Something89&', 10, (err, hash) => {
        if (!err) {
          db.run(`INSERT OR IGNORE INTO users (id, nombre, telefono, password_hash)
                  VALUES (1, 'Admin', '0000000000', ?)`, [hash]);
        }
      });
    });
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Set up static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración Multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
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

// --- RUTAS DE MOCHILAS ---
app.get('/api/backpacks', authenticateToken, (req, res) => {
    db.all('SELECT * FROM backpacks', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/backpacks', authenticateToken, upload.single('image'), (req, res) => {
    // Cuando hay un archivo subido con Multer, los campos de string vienen en req.body y el archivo en req.file
    const { internal_number, graphic_identifier, color, book_count } = req.body;
    
    // Si req.file existe, guardamos la URL estática relativa, sino dejamos el campo vacío
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    db.run('INSERT INTO backpacks (internal_number, graphic_identifier, color, book_count, image_url, created_by) VALUES (?, ?, ?, ?, ?, ?)', 
      [internal_number, graphic_identifier, color, book_count, image_url, req.user.id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed: backpacks.internal_number')) {
                return res.status(400).json({ error: 'Ese Identificador ya está registrado. Para hacer cambios, busca la mochila abajo y presiona Editar (lápiz).' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, internal_number, graphic_identifier, color, book_count, image_url });
    });
});

// Update Backpack
app.put('/api/backpacks/:id', authenticateToken, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { internal_number, graphic_identifier, color, book_count } = req.body;
    
    // If a new file is uploaded, update query includes image_url
    if (req.file) {
        const image_url = `/uploads/${req.file.filename}`;
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

app.listen(port, () => {
  console.log(`Babbo Biblioteca Backend listening at http://localhost:${port}`);
});
