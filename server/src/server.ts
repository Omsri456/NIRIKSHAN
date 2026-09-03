import app from './app';
import { env } from './config/env';
// import { connectDB } from './config/db';

async function start() {
  // ── MongoDB (disabled until foundation is verified) ──
  // await connectDB();

  const PORT = parseInt(env.PORT, 10);

  app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║   NIRIKSHAN Backend                      ║
    ║   Port: ${PORT}                            ║
    ║   Env:  ${env.NODE_ENV}                  ║
    ╚══════════════════════════════════════════╝
    `);
  });
}

start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
