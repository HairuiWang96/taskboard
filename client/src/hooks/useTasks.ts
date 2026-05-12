import { useState, useEffect, useCallback } from 'react';

// Mirror the server's Task type (from Drizzle $inferSelect)
export type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;  // JSON serializes timestamps as strings
};

const API = 'http://localhost:3000/tasks';

// Custom hook pattern: all server communication lives here.
// Components stay "dumb" — they just receive data and call handlers.
export function useTasks() {
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // useCallback so fetchTasks is stable across renders (safe to use in useEffect deps)
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTasks(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once on mount
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = async (title: string) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const task: Task = await res.json();
    // Optimistic-style: append to local state without refetching
    setTasks(prev => [task, ...prev]);
  };

  const completeTask = async (id: string) => {
    const res = await fetch(`${API}/${id}/complete`, { method: 'PATCH' });
    const updated: Task = await res.json();
    // Replace the updated task in place — prev.map keeps order
    setTasks(prev => prev.map(t => (t.id === id ? updated : t)));
  };

  const deleteTask = async (id: string) => {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return { tasks, loading, error, createTask, completeTask, deleteTask };
}
