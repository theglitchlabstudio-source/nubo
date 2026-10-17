// The ONLY place an adapter is chosen (docs/ARCHITECTURE.md §6.4).
// Later: `import.meta.env.VITE_DATA_ADAPTER === 'pocketbase' ? pocketbaseAdapter : mockAdapter`.
import type { DataAdapter } from './ports';
import { mockAdapter } from './adapters/mock/adapter';

export const data: DataAdapter = mockAdapter;
