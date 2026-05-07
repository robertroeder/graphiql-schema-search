// URL hash navigation helpers for the schema search plugin.

// Capture hash at module load time, before any effects can clear it
// istanbul ignore next -- SSR branch untestable in jsdom
export const INITIAL_HASH = typeof window !== 'undefined' ? window.location.hash : '';

let _navCounter = 0;
let _hasInitializedHistory = false;

export interface NavState {
    typeName?: string | null;
    fieldName?: string | null;
    query?: string;
    kindFilter?: string | null;
    sectionFilter?: string | null;
}

export function hasInitializedHistory(): boolean {
    return _hasInitializedHistory;
}

export function setInitializedHistory(value: boolean): void {
    _hasInitializedHistory = value;
}

export function getNavCounter(): number {
    return _navCounter;
}

export function setNavCounter(value: number): void {
    _navCounter = value;
}

function paramKeys(prefix: string) {
    return {
        type: `${prefix}type`,
        field: `${prefix}field`,
        query: `${prefix}q`,
        kind: `${prefix}kind`,
        section: `${prefix}section`,
    };
}

export function encodeNavHash(state: NavState = {}, prefix = ''): string {
    const keys = paramKeys(prefix);
    const params = new URLSearchParams();
    if (state.typeName) params.set(keys.type, state.typeName);
    if (state.fieldName) params.set(keys.field, state.fieldName);
    if (state.query) params.set(keys.query, state.query);
    if (state.kindFilter) params.set(keys.kind, state.kindFilter);
    if (state.sectionFilter) params.set(keys.section, state.sectionFilter);
    const str = params.toString();
    return str ? `#${str}` : '';
}

export function decodeNavHash(hashStr?: string, prefix = ''): NavState {
    const hash = (hashStr !== undefined ? hashStr : window.location.hash).replace(/^#/, '');
    if (!hash) return {};
    const keys = paramKeys(prefix);
    const params = new URLSearchParams(hash);
    return {
        typeName: params.get(keys.type) || null,
        fieldName: params.get(keys.field) || null,
        query: params.get(keys.query) || '',
        kindFilter: params.get(keys.kind) || null,
        sectionFilter: params.get(keys.section) || null,
    };
}

export function hasSchemaSearchHash(hashStr?: string, prefix = ''): boolean {
    const hash = (hashStr !== undefined ? hashStr : window.location.hash).replace(/^#/, '');
    if (!hash) return false;
    const keys = paramKeys(prefix);
    const params = new URLSearchParams(hash);
    const validKeys = new Set(Object.values(keys));
    for (const key of params.keys()) {
        if (validKeys.has(key)) return true;
    }
    return false;
}

export function pushNavState(state: NavState = {}, prefix = ''): void {
    const hash = encodeNavHash(state, prefix);
    _navCounter++;
    window.history.pushState({ schemaSearchDepth: _navCounter }, '', hash || window.location.pathname);
}

export function replaceNavState(state: NavState = {}, prefix = ''): void {
    const hash = encodeNavHash(state, prefix);
    const depth = (window.history.state as { schemaSearchDepth?: number } | null)?.schemaSearchDepth || 0;
    window.history.replaceState({ schemaSearchDepth: depth }, '', hash || window.location.pathname);
}
