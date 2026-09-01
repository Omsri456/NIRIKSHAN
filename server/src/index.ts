import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import worksRoutes from './routes/works.routes';
import riskRoutes from './routes/risk.routes';
import investigationsRoutes from './routes/investigations.routes';
import dataImportsRoutes from './routes/dataImports.routes';

const app = express();

// ── Global Middleware ────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// ── Health Check ─────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'nirikshan-backend' } });
});

// ── API Routes (matching 05-API.md) ──────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/works', worksRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/investigations', investigationsRoutes);
app.use('/api/data-imports', dataImportsRoutes);

// ── 404 Handler ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
  });
});

// ── Error Handler ────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(parseInt(env.PORT), () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║   NIRIKSHAN Backend                      ║
    ║   Port: ${env.PORT}                            ║
    ║   Env:  ${env.NODE_ENV}                  ║
    ╚══════════════════════════════════════════╝
    `);
  });
}

start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
