const { Client } = require('pg');

const supabaseUrl = 'postgresql://postgres.dmuyclcxmggabgxxtssw:Cualquiera89%26@aws-1-us-east-1.pooler.supabase.com:6543/postgres';

const pgClient = new Client({
  connectionString: supabaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function cleanProd() {
  try {
    await pgClient.connect();
    console.log('✅ Conectado a la base de datos de producción (Supabase)');
    
    console.log('🧹 Eliminando TODOS los préstamos (activos y devueltos)...');
    await pgClient.query('DELETE FROM book_loans');
    
    console.log('🧹 Eliminando TODOS los lectores registrados...');
    await pgClient.query('DELETE FROM readers');
    
    console.log('🔄 Reiniciando contadores de ID...');
    await pgClient.query('ALTER SEQUENCE book_loans_id_seq RESTART WITH 1');
    await pgClient.query('ALTER SEQUENCE readers_id_seq RESTART WITH 1');

    console.log('🎉 ¡LISTO! Todo el historial y los lectores han sido eliminados de la nube.');
    console.log('Tus Libros y Mochilas están a salvo. Puedes comenzar la etapa en productivo.');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR DURANTE LA LIMPIEZA:', err);
    process.exit(1);
  }
}

cleanProd();
