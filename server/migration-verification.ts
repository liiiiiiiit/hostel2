import type { AppStoreState } from './domain.js';
import { rootCollections, stableJSON } from './relational-store.js';
import { tables } from './relational-schema.js';

/** Missing and explicitly empty favorites both mean no saved places in the API.
 * SQL represents that relationship with zero rows. No nonempty list is changed. */
export function comparableMigrationState(state: AppStoreState) {
    return {
        ...state,
        unitBlocks: state.unitBlocks ?? [],
        bookingChanges: state.bookingChanges ?? [],
        supportThreads: state.supportThreads ?? [],
        financeEntries: state.financeEntries ?? [],
        savedPlaces: Object.fromEntries(Object.entries(state.savedPlaces ?? {}).filter(([, places]) => !Array.isArray(places) || places.length !== 0)),
    };
}

const fieldNames = new Set([
    ...Object.keys(rootCollections), 'currentUser', 'credentials', 'savedPlaces', 'settings',
    ...tables.flatMap(table => table.columns.map(column => column.field)),
    'name', 'title', 'description', 'address', 'roomTypes', 'photos', 'media', 'physicalUnits',
    'history', 'assignedUnitIds', 'unitIds', 'translations', 'messages', 'assignedHostelIds',
    'emergencyHotline', 'telegramSupport', 'supportWorkingHoursFa', 'immediateTimeoutMinutes',
    'fa', 'en', 'ru', 'hy',
]);
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Describe schema paths only: never print values, account IDs, tokens, content or
 * arbitrary object keys from a private snapshot. Used when an upgrade aborts. */
export function migrationDifferences(expected: unknown, actual: unknown, limit = 8): string[] {
    const paths: string[] = [];
    const walk = (before: unknown, after: unknown, path: string) => {
        if (paths.length >= limit || stableJSON(before) === stableJSON(after)) return;
        if (Array.isArray(before) && Array.isArray(after)) {
            if (before.length !== after.length) paths.push(`${path} (item count differs)`);
            for (let i = 0; i < Math.min(before.length, after.length) && paths.length < limit; i++)
                walk(before[i], after[i], `${path}[${i}]`);
            return;
        }
        if (isObject(before) && isObject(after)) {
            const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
            for (let i = 0; i < keys.length && paths.length < limit; i++) {
                const key = keys[i];
                const label = path === 'credentials' || path === 'savedPlaces' || !fieldNames.has(key) ? `[field${i}]` : key;
                const next = path ? label.startsWith('[') ? path + label : `${path}.${label}` : label;
                if (!Object.hasOwn(before, key) || !Object.hasOwn(after, key)) paths.push(`${next} (field presence differs)`);
                else walk(before[key], after[key], next);
            }
            return;
        }
        paths.push(`${path || 'state'} (value differs)`);
    };
    walk(expected, actual, '');
    return paths;
}

export class MigrationVerificationError extends Error {
    constructor(paths: string[]) {
        super(`Relational migration verification failed. Original data and schema were rolled back. Differences: ${paths.join('; ') || 'state'}. No private values are included.`);
        this.name = 'MigrationVerificationError';
    }
}
