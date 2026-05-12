import { FastifyPluginAsync } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { tasks } from '../db/schema';

// FastifyPluginAsync is the pattern for grouping related routes
// The app registers this as a plugin with a prefix, e.g. /tasks
const taskRoutes: FastifyPluginAsync = async (fastify) => {

  // ─── GET /tasks ──────────────────────────────────────────────────────────────
  // No generics needed here — no params/body/query
  fastify.get('/', async () => {
    // db.select().from(table) → SELECT * FROM tasks
    // .orderBy(desc(...)) → ORDER BY created_at DESC
    return db.select().from(tasks).orderBy(desc(tasks.createdAt));
  });

  // ─── POST /tasks ──────────────────────────────────────────────────────────────
  // Generic: Body tells TypeScript the shape of request.body
  fastify.post<{ Body: { title: string } }>('/', async (req, reply) => {
    // .insert().values().returning() → INSERT ... RETURNING *
    // Destructure [task] because returning() gives an array
    const [task] = await db
      .insert(tasks)
      .values({ title: req.body.title })
      .returning();                   // ← Postgres-specific: gives back the created row

    reply.code(201);
    return task;
  });

  // ─── PATCH /tasks/:id/complete ────────────────────────────────────────────────
  // Generic: Params tells TypeScript the shape of request.params
  fastify.patch<{ Params: { id: string } }>('/:id/complete', async (req, reply) => {
    const [task] = await db
      .update(tasks)
      .set({ completed: true })
      .where(eq(tasks.id, req.params.id))  // eq() = equals, imported from drizzle-orm
      .returning();

    if (!task) {
      reply.code(404);
      return { error: 'Task not found' };
    }
    return task;
  });

  // ─── DELETE /tasks/:id ────────────────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    await db.delete(tasks).where(eq(tasks.id, req.params.id));
    reply.code(204);  // 204 No Content — success with no body
  });

};

export default taskRoutes;
