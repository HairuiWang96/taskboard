import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// cn() is the standard shadcn utility:
// - clsx: handles conditional classes { 'foo': true, 'bar': false } → 'foo'
// - twMerge: resolves Tailwind conflicts: 'px-2 px-4' → 'px-4' (last wins)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
