require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://dmuyclcxmggabgxxtssw.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdXljbGN4bWdnYWJneHh0c3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTk3NzQsImV4cCI6MjA4OTU5NTc3NH0.PE1gaa1tHpkc7KCfbHjTKr-qDGvKSwGGraTc-Nhbsdc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Subiendo a 'Mochilas' Capital M:");
  const { data: d3, error: e3 } = await supabase.storage.from('Mochilas').upload('test3.txt', 'hola', { contentType: 'text/plain' });
  console.log(e3 ? e3.message : 'Exito');
}

check();
