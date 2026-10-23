/**
 * Script di validazione delle variabili d'ambiente e dei servizi cloud
 * Eseguibile con: npm run validate-env oppure npx tsx scripts/validate-env.ts
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const { Pool } = pg;

interface EnvCheck {
  key: string;
  category: 'Database SQL' | 'API & AI' | 'Cloud & Firebase' | 'Client Frontend (VITE_)';
  required: boolean;
  isSet: boolean;
  maskedValue?: string;
  note?: string;
}

function maskSecret(val: string | undefined): string {
  if (!val) return '—';
  if (val.length <= 6) return '******';
  return `${val.slice(0, 3)}...${val.slice(-3)} (${val.length} caratteri)`;
}

async function validate() {
  console.log('\n================================================================');
  console.log('   🔍 SAGE PAPER STUDIO · VALIDAZIONE VARIABILI D\'AMBIENTE');
  console.log('================================================================\n');

  const checks: EnvCheck[] = [
    // 1. Database Cloud SQL
    {
      key: 'SQL_HOST',
      category: 'Database SQL',
      required: true,
      isSet: Boolean(process.env.SQL_HOST),
      maskedValue: process.env.SQL_HOST || '—',
      note: 'Socket / host proxy Cloud SQL Auth',
    },
    {
      key: 'SQL_DB_NAME',
      category: 'Database SQL',
      required: true,
      isSet: Boolean(process.env.SQL_DB_NAME),
      maskedValue: process.env.SQL_DB_NAME || '—',
      note: 'Database relazionale PostgreSQL',
    },
    {
      key: 'SQL_USER',
      category: 'Database SQL',
      required: true,
      isSet: Boolean(process.env.SQL_USER),
      maskedValue: process.env.SQL_USER || '—',
      note: 'Utente runtime per connection pooling',
    },
    {
      key: 'SQL_PASSWORD',
      category: 'Database SQL',
      required: true,
      isSet: Boolean(process.env.SQL_PASSWORD),
      maskedValue: maskSecret(process.env.SQL_PASSWORD),
      note: 'Password utente runtime',
    },
    {
      key: 'SQL_ADMIN_USER',
      category: 'Database SQL',
      required: true,
      isSet: Boolean(process.env.SQL_ADMIN_USER),
      maskedValue: process.env.SQL_ADMIN_USER || '—',
      note: 'Utente per migrazioni Drizzle Kit',
    },
    {
      key: 'SQL_ADMIN_PASSWORD',
      category: 'Database SQL',
      required: true,
      isSet: Boolean(process.env.SQL_ADMIN_PASSWORD),
      maskedValue: maskSecret(process.env.SQL_ADMIN_PASSWORD),
      note: 'Password migrazioni Drizzle Kit',
    },

    // 2. Server & AI
    {
      key: 'PORT',
      category: 'API & AI',
      required: false,
      isSet: Boolean(process.env.PORT),
      maskedValue: process.env.PORT || '3000 (default)',
      note: 'Porta di ascolto server Express',
    },
    {
      key: 'GEMINI_API_KEY',
      category: 'API & AI',
      required: false,
      isSet: Boolean(process.env.GEMINI_API_KEY),
      maskedValue: maskSecret(process.env.GEMINI_API_KEY),
      note: 'API Key per generazioni e stime con Gemini',
    },
    {
      key: 'APP_URL',
      category: 'API & AI',
      required: false,
      isSet: Boolean(process.env.APP_URL),
      maskedValue: process.env.APP_URL || '—',
      note: 'URL pubblico host applicativo',
    },

    // 3. Client & Frontend
    {
      key: 'VITE_GOOGLE_CLIENT_ID',
      category: 'Client Frontend (VITE_)',
      required: false,
      isSet: Boolean(process.env.VITE_GOOGLE_CLIENT_ID),
      maskedValue: maskSecret(process.env.VITE_GOOGLE_CLIENT_ID),
      note: 'OAuth 2.0 Client ID per Google Calendar (fallback in firebase config)',
    },
    {
      key: 'VITE_SUPABASE_URL',
      category: 'Client Frontend (VITE_)',
      required: false,
      isSet: Boolean(process.env.VITE_SUPABASE_URL),
      maskedValue: process.env.VITE_SUPABASE_URL || '—',
      note: 'Opzionale per snapshot esterni',
    },
    {
      key: 'VITE_SUPABASE_ANON_KEY',
      category: 'Client Frontend (VITE_)',
      required: false,
      isSet: Boolean(process.env.VITE_SUPABASE_ANON_KEY),
      maskedValue: maskSecret(process.env.VITE_SUPABASE_ANON_KEY),
      note: 'Opzionale per snapshot esterni',
    },
  ];

  // Raggruppa per categoria
  const categories = Array.from(new Set(checks.map((c) => c.category)));

  let criticalMissing = 0;

  for (const cat of categories) {
    console.log(`📌 CATEGORIA: ${cat}`);
    console.log('----------------------------------------------------------------');
    const catChecks = checks.filter((c) => c.category === cat);
    for (const c of catChecks) {
      const icon = c.isSet ? '✅' : c.required ? '❌' : '⚠️ ';
      const statusText = c.isSet
        ? 'IMPOSTATA'
        : c.required
        ? 'MANCANTE (Richiesta!)'
        : 'NON IMPOSTATA (Opzionale)';

      if (!c.isSet && c.required) {
        criticalMissing++;
      }

      console.log(`  ${icon} ${c.key.padEnd(22)} : [${statusText}]`);
      console.log(`     Valore mascherato : ${c.maskedValue}`);
      if (c.note) console.log(`     Dettaglio         : ${c.note}`);
    }
    console.log('');
  }

  // 4. Verifica Firebase Applet Config
  console.log('📌 CATEGORIA: Cloud & Firebase Configuration');
  console.log('----------------------------------------------------------------');
  const firebaseConfigPath = path.join(rootDir, 'firebase-applet-config.json');
  let firebaseOk = false;
  if (fs.existsSync(firebaseConfigPath)) {
    try {
      const raw = fs.readFileSync(firebaseConfigPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.projectId && parsed.projectId !== 'remixed-project-id') {
        firebaseOk = true;
        console.log('  ✅ firebase-applet-config.json : [VALIDO]');
        console.log(`     Project ID      : ${parsed.projectId}`);
        console.log(`     Firestore DB ID : ${parsed.firestoreDatabaseId || 'default'}`);
        console.log(`     OAuth Client ID : ${parsed.oAuthClientId ? maskSecret(parsed.oAuthClientId) : 'non impostato'}`);
      } else {
        console.log('  ⚠️  firebase-applet-config.json : Presente ma non configurato (valori placeholder).');
      }
    } catch (e: any) {
      console.log(`  ❌ Errore parsing firebase-applet-config.json: ${e.message}`);
    }
  } else {
    console.log('  ❌ firebase-applet-config.json NON TROVATO!');
    criticalMissing++;
  }
  console.log('');

  // 5. Test Live Connessione Cloud SQL
  console.log('📌 TEST DIRETTO CONNESSIONE POSTGRESQL');
  console.log('----------------------------------------------------------------');
  if (process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_PASSWORD && process.env.SQL_DB_NAME) {
    let pool: pg.Pool | null = null;
    try {
      pool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        connectionTimeoutMillis: 5000,
      });

      const start = Date.now();
      const res = await pool.query(
        'SELECT current_database() as db, current_user as usr, version() as ver;'
      );
      const elapsed = Date.now() - start;

      const tablesRes = await pool.query(
        "SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public';"
      );
      const tableCount = tablesRes.rows[0]?.count || 0;

      console.log(`  ✅ Connessione PostgreSQL riuscita in ${elapsed}ms!`);
      console.log(`     Database corrente : ${res.rows[0]?.db}`);
      console.log(`     Utente attivo     : ${res.rows[0]?.usr}`);
      console.log(`     Tabelle 'public'  : ${tableCount} tabelle create`);
      console.log(`     Versione motore   : ${res.rows[0]?.ver?.slice(0, 45)}...`);
    } catch (dbErr: any) {
      console.log(`  ❌ Test di connessione fallito: ${dbErr.message}`);
      criticalMissing++;
    } finally {
      if (pool) {
        await pool.end().catch(() => {});
      }
    }
  } else {
    console.log('  ⚠️  Test saltato: una o più variabili SQL_* obbligatorie non sono impostate.');
  }

  console.log('\n================================================================');
  if (criticalMissing === 0) {
    console.log('  🎉 RISULTATO: TUTTE LE VARIABILI CRITICHE SONO CORRETTAMENTE IMPOSTATE!');
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.log(`  🚨 RISULTATO: RISCONTRATI ${criticalMissing} ERRORI NELLE VARIABILI RICHIESTE.`);
    console.log('================================================================\n');
    process.exit(1);
  }
}

validate().catch((err) => {
  console.error('Errore fatale nello script di validazione:', err);
  process.exit(1);
});
