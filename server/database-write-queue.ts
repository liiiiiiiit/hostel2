import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface WriteGate { tail: Promise<void>; clients: number }
const gates = new Map<string, WriteGate>();
function databaseKey(url: string) {
  if (!url.startsWith('file:')) return url;
  const file = url.startsWith('file://') ? fileURLToPath(url) : decodeURIComponent(url.slice(5));
  return 'file:' + path.resolve(file);
}

/** libSQL's local BEGIN uses synchronous SQLite locking. Two independent queues
 * in one event loop can block the writer that needs that same loop to commit. */
export function databaseWriteQueue(url: string) {
  const key = databaseKey(url);
  const gate = gates.get(key) ?? { tail: Promise.resolve(), clients: 0 };
  gates.set(key, gate); gate.clients++;
  let released = false;
  return {
    run<T>(operation: () => Promise<T>): Promise<T> {
      const task = gate.tail.then(operation, operation);
      gate.tail = task.then(() => {}, () => {});
      return task;
    },
    release() {
      if (released) return;
      released = true; gate.clients--;
      void gate.tail.then(() => {
        if (gate.clients === 0 && gates.get(key) === gate) gates.delete(key);
      });
    },
  };
}
