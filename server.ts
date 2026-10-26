import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as queries from './src/db/queries.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// ---------------------------------------------------------------------------
// CLOUD SQL POSTGRESQL REST API ROUTES
// ---------------------------------------------------------------------------

// 1. Fetch entire studio data
app.get('/api/studio/data', async (_req, res) => {
  try {
    const data = await queries.getAllStudioData();
    res.json(data);
  } catch (err: any) {
    console.error('API /api/studio/data error:', err);
    res.status(500).json({ error: 'Failed to fetch studio data from Cloud SQL' });
  }
});

// Diagnostic & Environment Health Check
app.get('/api/health/env', async (_req, res) => {
  const envReport = {
    timestamp: new Date().toISOString(),
    status: 'ok',
    database: {
      neonDatabaseUrlConfigured: Boolean(
        process.env.DATABASE_URL || process.env.spdmanager_DATABASE_URL || process.env.POSTGRES_URL
      ),
    },
    platform: {
      port: process.env.PORT || 3000,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      appUrlConfigured: Boolean(process.env.APP_URL),
    },
    client: {
      googleClientConfigured: Boolean(process.env.VITE_GOOGLE_CLIENT_ID),
      supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
    },
  };
  res.json(envReport);
});

// 1b. Batch sync push: persist local or offline projects & clients into Cloud SQL
app.post('/api/studio/sync-push', async (req, res) => {
  try {
    const {
      projects: localProjects,
      clients: localClients,
      quotes: localQuotes,
      inventory: localInventory,
      priceCatalog: localPriceCatalog,
      financials: localFinancials,
      settings: localSettings,
    } = req.body;
    let syncedProjects = 0;
    let syncedClients = 0;
    let syncedOtherRecords = 0;

    if (Array.isArray(localClients)) {
      for (const client of localClients) {
        try {
          await queries.insertClientRecord(client);
          syncedClients++;
        } catch (e) {
          console.warn('Sync push client warning:', e);
        }
      }
    }

    if (Array.isArray(localProjects)) {
      for (const proj of localProjects) {
        try {
          await queries.createProjectRecord(proj, proj.tasks || []);
          for (const proof of proj.proofs || []) {
            try {
              await queries.insertProofRecord(proof);
              for (const feedback of proof.feedback || []) {
                await queries.insertFeedbackRecord(feedback);
              }
            } catch (e) {
              console.warn('Sync push proof warning:', e);
            }
          }
          syncedProjects++;
        } catch (e) {
          console.warn('Sync push project warning:', e);
        }
      }
    }

    if (Array.isArray(localQuotes)) {
      for (const quote of localQuotes) {
        try {
          await queries.insertQuoteRecord(quote, quote.items || []);
          syncedOtherRecords++;
        } catch (e) { console.warn('Sync push quote warning:', e); }
      }
    }
    if (Array.isArray(localInventory)) {
      for (const item of localInventory) {
        try {
          await queries.insertInventoryRecord(item);
          syncedOtherRecords++;
        } catch (e) { console.warn('Sync push inventory warning:', e); }
      }
    }
    if (Array.isArray(localPriceCatalog)) {
      for (const item of localPriceCatalog) {
        try {
          await queries.insertPriceCatalogRecord(item);
          syncedOtherRecords++;
        } catch (e) { console.warn('Sync push price catalog warning:', e); }
      }
    }
    if (Array.isArray(localFinancials)) {
      for (const record of localFinancials) {
        try {
          await queries.insertFinancialRecord(record);
          syncedOtherRecords++;
        } catch (e) { console.warn('Sync push financial record warning:', e); }
      }
    }
    if (localSettings && typeof localSettings === 'object') {
      await queries.updateStudioSettingsRecord(localSettings);
      syncedOtherRecords++;
    }

    const freshData = await queries.getAllStudioData();
    res.json({ success: true, syncedProjects, syncedClients, syncedOtherRecords, data: freshData });
  } catch (err: any) {
    console.error('API POST /api/studio/sync-push error:', err);
    res.status(500).json({ error: 'Failed to sync local data to Cloud SQL' });
  }
});

// 2. Projects
app.post('/api/projects', async (req, res) => {
  try {
    const { project, tasks } = req.body;
    await queries.createProjectRecord(project, tasks || []);
    res.status(201).json({ success: true, project });
  } catch (err: any) {
    console.error('API POST /api/projects error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    await queries.updateProjectRecord(req.params.id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API PUT /api/projects/:id error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    await queries.deleteProjectRecord(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API DELETE /api/projects/:id error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// 3. Tasks
app.post('/api/tasks', async (req, res) => {
  try {
    await queries.insertTaskRecord(req.body);
    res.status(201).json({ success: true, task: req.body });
  } catch (err: any) {
    console.error('API POST /api/tasks error:', err);
    res.status(500).json({ error: 'Failed to insert task' });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    await queries.updateTaskRecord(req.params.id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API PUT /api/tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await queries.deleteTaskRecord(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API DELETE /api/tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// 4. Proofs & Feedback
app.post('/api/proofs', async (req, res) => {
  try {
    await queries.insertProofRecord(req.body);
    res.status(201).json({ success: true, proof: req.body });
  } catch (err: any) {
    console.error('API POST /api/proofs error:', err);
    res.status(500).json({ error: 'Failed to insert proof' });
  }
});

app.put('/api/proofs/:id', async (req, res) => {
  try {
    await queries.updateProofRecord(req.params.id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API PUT /api/proofs/:id error:', err);
    res.status(500).json({ error: 'Failed to update proof' });
  }
});

app.post('/api/proofs/:id/feedback', async (req, res) => {
  try {
    await queries.insertFeedbackRecord({ ...req.body, proofId: req.params.id });
    res.status(201).json({ success: true, feedback: req.body });
  } catch (err: any) {
    console.error('API POST /api/proofs/:id/feedback error:', err);
    res.status(500).json({ error: 'Failed to insert feedback' });
  }
});

// 5. Clients
app.post('/api/clients', async (req, res) => {
  try {
    await queries.insertClientRecord(req.body);
    res.status(201).json({ success: true, client: req.body });
  } catch (err: any) {
    console.error('API POST /api/clients error:', err);
    res.status(500).json({ error: 'Failed to insert client' });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    await queries.updateClientRecord(req.params.id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API PUT /api/clients/:id error:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    await queries.deleteClientRecord(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API DELETE /api/clients/:id error:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// 6. Quotes
app.post('/api/quotes', async (req, res) => {
  try {
    const { quote, items } = req.body;
    await queries.insertQuoteRecord(quote, items || []);
    res.status(201).json({ success: true, quote });
  } catch (err: any) {
    console.error('API POST /api/quotes error:', err);
    res.status(500).json({ error: 'Failed to insert quote' });
  }
});

app.put('/api/quotes/:id', async (req, res) => {
  try {
    const { quote, items } = req.body;
    await queries.updateQuoteRecord(req.params.id, quote || req.body, items);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API PUT /api/quotes/:id error:', err);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

app.delete('/api/quotes/:id', async (req, res) => {
  try {
    await queries.deleteQuoteRecord(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API DELETE /api/quotes/:id error:', err);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

// 7. Inventory
app.post('/api/inventory', async (req, res) => {
  try {
    await queries.insertInventoryRecord(req.body);
    res.status(201).json({ success: true, item: req.body });
  } catch (err: any) {
    console.error('API POST /api/inventory error:', err);
    res.status(500).json({ error: 'Failed to insert inventory' });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  try {
    await queries.updateInventoryRecord(req.params.id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API PUT /api/inventory/:id error:', err);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await queries.deleteInventoryRecord(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API DELETE /api/inventory/:id error:', err);
    res.status(500).json({ error: 'Failed to delete inventory' });
  }
});

// 8. Settings
app.put('/api/settings', async (req, res) => {
  try {
    await queries.updateStudioSettingsRecord(req.body);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API PUT /api/settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// 9. Price Catalog
app.post('/api/price-catalog', async (req, res) => {
  try {
    await queries.insertPriceCatalogRecord(req.body);
    res.status(201).json({ success: true, item: req.body });
  } catch (err: any) {
    console.error('API POST /api/price-catalog error:', err);
    res.status(500).json({ error: 'Failed to insert price catalog item' });
  }
});

app.put('/api/price-catalog/:id', async (req, res) => {
  try {
    await queries.updatePriceCatalogRecord(req.params.id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API PUT /api/price-catalog/:id error:', err);
    res.status(500).json({ error: 'Failed to update price catalog item' });
  }
});

app.delete('/api/price-catalog/:id', async (req, res) => {
  try {
    await queries.deletePriceCatalogRecord(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API DELETE /api/price-catalog/:id error:', err);
    res.status(500).json({ error: 'Failed to delete price catalog item' });
  }
});

// 10. Financial Records (Entrate, Spese, Bilancio)
app.post('/api/finances', async (req, res) => {
  try {
    await queries.insertFinancialRecord(req.body);
    res.status(201).json({ success: true, record: req.body });
  } catch (err: any) {
    console.error('API POST /api/finances error:', err);
    res.status(500).json({ error: 'Failed to insert financial record' });
  }
});

app.put('/api/finances/:id', async (req, res) => {
  try {
    await queries.updateFinancialRecord(req.params.id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API PUT /api/finances/:id error:', err);
    res.status(500).json({ error: 'Failed to update financial record' });
  }
});

app.delete('/api/finances/:id', async (req, res) => {
  try {
    await queries.deleteFinancialRecord(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API DELETE /api/finances/:id error:', err);
    res.status(500).json({ error: 'Failed to delete financial record' });
  }
});

// 11. Meetings & Couple Consultations (Incontri Sposi)
app.post('/api/meetings', async (req, res) => {
  try {
    await queries.insertMeetingRecord(req.body);
    res.status(201).json({ success: true, meeting: req.body });
  } catch (err: any) {
    console.error('API POST /api/meetings error:', err);
    res.status(500).json({ error: 'Failed to insert meeting record' });
  }
});

app.put('/api/meetings/:id', async (req, res) => {
  try {
    await queries.updateMeetingRecord(req.params.id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API PUT /api/meetings/:id error:', err);
    res.status(500).json({ error: 'Failed to update meeting record' });
  }
});

app.delete('/api/meetings/:id', async (req, res) => {
  try {
    await queries.deleteMeetingRecord(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('API DELETE /api/meetings/:id error:', err);
    res.status(500).json({ error: 'Failed to delete meeting record' });
  }
});

// 12. Weekly Availability
app.post('/api/weekly-availability', async (req, res) => {
  try {
    await queries.upsertWeeklyAvailabilityRecord(req.body);
    res.json({ success: true, availability: req.body });
  } catch (err: any) {
    console.error('API POST /api/weekly-availability error:', err);
    res.status(500).json({ error: 'Failed to update weekly availability' });
  }
});

// ---------------------------------------------------------------------------
// VITE DEV SERVER / STATIC ASSETS MOUNT
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sage Paper Studio Manager running on http://0.0.0.0:${PORT}`);
  });
}

// Start HTTP server in dev and standalone runtimes
if (!process.env.VERCEL) {
  startServer();
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API error:', err);
  res.status(500).json({ error: 'Database service is temporarily unavailable' });
});

export default app;
