const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./babbo_biblioteca.db');

db.serialize(() => {
    db.run("DELETE FROM transactions");
    db.run("DELETE FROM backpacks");
    db.run("DELETE FROM pavilions");
    db.run("DELETE FROM schools");
    db.run("DELETE FROM sectors");
    
    // Reset auto-increment counters
    db.run("DELETE FROM sqlite_sequence WHERE name IN ('transactions', 'backpacks', 'pavilions', 'schools', 'sectors')");

    console.log("Database cleared successfully (except users).");
});

db.close();
