import type { Task } from '../hooks/useTasks';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

type Props = {
  tasks: Task[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
};

export function TaskList({ tasks, onComplete, onDelete }: Props) {
  if (tasks.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-10">
        No tasks yet. Add one above.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map(task => (
        // key prop: React uses this to track items in a list — always use a stable unique ID
        <li
          key={task.id}
          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
        >
          {/* Conditional class: line-through when completed */}
          <span className={`flex-1 text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </span>

          {/* Badge variant changes based on state */}
          <Badge variant={task.completed ? 'secondary' : 'default'}>
            {task.completed ? 'Done' : 'Open'}
          </Badge>

          {/* Only show Complete button if not already done */}
          {!task.completed && (
            <Button size="sm" variant="outline" onClick={() => onComplete(task.id)}>
              Complete
            </Button>
          )}

          <Button size="sm" variant="destructive" onClick={() => onDelete(task.id)}>
            Delete
          </Button>
        </li>
      ))}
    </ul>
  );
}
