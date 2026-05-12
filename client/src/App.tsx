import { useTasks } from './hooks/useTasks';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';

// App is thin: just wires the hook to the components
// All data logic lives in useTasks, all UI logic in the components
export default function App() {
  const { tasks, loading, error, createTask, completeTask, deleteTask } = useTasks();

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Taskboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Fastify · Drizzle · Postgres · React · Tailwind · shadcn
        </p>
      </div>

      <TaskForm onSubmit={createTask} />

      {loading && <p className="text-muted-foreground text-sm">Loading...</p>}
      {error   && <p className="text-destructive text-sm">Error: {error}</p>}
      {!loading && !error && (
        <TaskList
          tasks={tasks}
          onComplete={completeTask}
          onDelete={deleteTask}
        />
      )}
    </main>
  );
}
