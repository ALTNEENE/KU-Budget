const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT UNIQUE,
                password TEXT,
                role TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT,
                amount REAL,
                date TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS revenues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT,
                amount REAL,
                date TEXT
            )`);

            // Check if admin exists, if not create one
            db.get(`SELECT * FROM users WHERE email = ?`, ['admin@karary.edu.sd'], (err, row) => {
                if (!row) {
                    const salt = bcrypt.genSaltSync(10);
                    const hash = bcrypt.hashSync('admin123', salt);
                    db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`, 
                        ['Admin', 'admin@karary.edu.sd', hash, 'admin']
                    );
                    console.log('Default admin user created: admin@karary.edu.sd / admin123');
                }
            });
        });
    }
});

module.exports = db;
