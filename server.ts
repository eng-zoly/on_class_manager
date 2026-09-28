import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_STUDENTS, INITIAL_PAYROLL_REPORTS } from './src/data/demoData';
import { COURSE_CONFIG } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // SSE Clients registry
  let clients: { id: number; res: any }[] = [];

  // Setup DB file
  const DATA_DIR = path.join(process.cwd(), 'data');
  const DB_FILE = path.join(DATA_DIR, 'db.json');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Load / initialize DB
  function loadDB() {
    if (fs.existsSync(DB_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      } catch (e) {
        console.error('Error reading db.json, resetting to initial state:', e);
      }
    }
    const initialState = {
      students: INITIAL_STUDENTS,
      payrollReports: INITIAL_PAYROLL_REPORTS,
      referenceDate: '2026-07-16',
      courseConfig: COURSE_CONFIG
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2), 'utf-8');
    return initialState;
  }

  function saveDB(state: any) {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    broadcast(state);
  }

  // Broadcast function to SSE clients
  function broadcast(state: any) {
    clients.forEach(client => {
      try {
        client.res.write(`data: ${JSON.stringify(state)}\n\n`);
      } catch (e) {
        console.error('Error broadcasting to client:', client.id, e);
      }
    });
  }

  // REST API: Get full DB state
  app.get('/api/db', (req, res) => {
    res.json(loadDB());
  });

  // REST API: Update full DB state
  app.post('/api/db/update', (req, res) => {
    const currentState = loadDB();
    const updatedState = {
      ...currentState,
      ...req.body
    };
    saveDB(updatedState);
    res.json({ success: true, state: updatedState });
  });

  // SSE Real-time updates endpoint
  app.get('/api/live', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Prevent response buffering in reverse proxies/nginx
    });

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    // Prompt client to retry connection every 2 seconds if connection is lost
    res.write('retry: 2000\n\n');

    // Send the current DB state immediately upon connection
    const currentState = loadDB();
    res.write(`data: ${JSON.stringify(currentState)}\n\n`);

    req.on('close', () => {
      clients = clients.filter(client => client.id !== clientId);
    });
  });

  // Heartbeat interval to prevent proxy idle timeouts (Cloud Run, Nginx, etc.)
  setInterval(() => {
    clients.forEach(client => {
      try {
        client.res.write(': ping\n\n');
      } catch (e) {
        // Will be cleaned up by req.on('close')
      }
    });
  }, 15000);

  // Serve static assets and Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
