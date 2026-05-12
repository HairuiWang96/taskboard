import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

type Props = {
  onSubmit: (title: string) => Promise<void>;
};

// Controlled form: React owns the input value via useState
// (vs uncontrolled where you'd use useRef and read .current.value)
export function TaskForm({ onSubmit }: Props) {
  const [title, setTitle]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();           // prevent browser page reload
    if (!title.trim()) return;    // guard: don't submit empty strings

    setLoading(true);
    await onSubmit(title.trim()); // wait for server round-trip
    setTitle('');                 // clear input after success
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="New task..."
        className="flex-1"
        disabled={loading}
      />
      <Button type="submit" disabled={loading || !title.trim()}>
        {loading ? 'Adding...' : 'Add Task'}
      </Button>
    </form>
  );
}
