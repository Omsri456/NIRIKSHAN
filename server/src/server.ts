import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';

async function start() {
  // ── MongoDB ──
  await connectDB();

  const PORT = parseInt(env.PORT, 10);

  const server = app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║   NIRIKSHAN Backend                      ║
    ║   Port: ${PORT}                            ║
    ║   Env:  ${env.NODE_ENV}                  ║
    ╚══════════════════════════════════════════╝
    `);
  });

  // Allow long-running requests (data ingestion pipeline polls up to 10 min)
  server.keepAliveTimeout = 620_000;   // 10 min 20s
  server.headersTimeout = 625_000;     // slightly above keepAliveTimeout

}

start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
