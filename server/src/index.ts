import Fastify from 'fastify';
import cors from '@fastify/cors';
import taskRoutes from './routes/tasks';

// Fastify({ logger: true }) enables built-in request/response logging via pino
const app = Fastify({ logger: true });

// Plugins are registered async — Fastify guarantees load order
// CORS must be registered before routes that need it
app.register(cors, {
  origin: 'http://localhost:5173',  // Vite's default dev port
});

// Register our task routes under the /tasks prefix
// All routes inside taskRoutes.ts will be prefixed: GET /tasks, POST /tasks, etc.
app.register(taskRoutes, { prefix: '/tasks' });

// Health check — useful to verify the server is up
app.get('/health', async () => ({ status: 'ok' }));

app.listen({ port: 3000 }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
