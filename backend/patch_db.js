const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./babbo_biblioteca.db');

db.serialize(() => {
  db.run(`DELETE FROM transactions;`, function(err) {
    if (err) {
      console.error('Error al borrar la tabla de transacciones:', err);
    } else {
      console.log(`Tabla de transacciones vaciada exitosamente. Registros borrados: ${this.changes}`);
    }
  });
  
  // Opcional: Reiniciar el contador del ID autoincremental para que empiece desde 1 de nuevo
  db.run(`DELETE FROM sqlite_sequence WHERE name='transactions';`);
});

db.close();
