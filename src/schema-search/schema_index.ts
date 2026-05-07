// Schema indexing, search scoring, and search execution.

import {
    type GraphQLField,
    type GraphQLInputField,
    type GraphQLSchema,
    type GraphQLNamedType,
    getNamedType,
    isObjectType,
    isInputObjectType,
    isEnumType,
    isInterfaceType,
    isUnionType,
    isScalarType,
} from 'graphql';

// Synonym mappings for search. Keys are short/common terms, values are expansions.
const SYNONYMS: Record<string, string> = {
    biz: 'business',
    ads: 'ad',
    rev: 'review',
    org: 'organization',
    msg: 'message',
    auth: 'authentication',
    img: 'image',
    pic: 'photo',
    info: 'information',
    config: 'configuration',
    perm: 'permission',
    notif: 'notification',
    txn: 'transaction',
    usr: 'user',
    acct: 'account',
    cat: 'category',
    loc: 'location',
    appt: 'appointment',
    svc: 'service',
};

export interface TypeEntry {
    name: string;
    kind: string;
    description: string;
    type: GraphQLNamedType;
}

export interface FieldEntry {
    typeName: string;
    fieldName: string;
    field: GraphQLField<unknown, unknown> | GraphQLInputField;
    returnTypeName: string;
}

export interface ScoredTypeEntry extends TypeEntry {
    score: number;
}

export interface ScoredFieldEntry extends FieldEntry {
    score: number;
}

export interface SchemaIndex {
    types: TypeEntry[];
    fields: FieldEntry[];
    usedBy: Record<
        string,
        { typeName: string; fieldName: string; field: GraphQLField<unknown, unknown> | GraphQLInputField }[]
    >;
    rootFields: FieldEntry[];
    rootTypeNames: Set<string>;
}

export interface SearchResults {
    types: ScoredTypeEntry[];
    fields: ScoredFieldEntry[];
    rootFields: ScoredFieldEntry[];
}

export function getTypeKind(type: GraphQLNamedType): string {
    if (isObjectType(type)) return 'Object';
    if (isInputObjectType(type)) return 'Input';
    if (isEnumType(type)) return 'Enum';
    if (isInterfaceType(type)) return 'Interface';
    if (isUnionType(type)) return 'Union';
    if (isScalarType(type)) return 'Scalar';
    return 'Unknown';
}

/**
 * Build a searchable index from a GraphQLSchema.
 *
 * Walks every type in the schema and produces:
 *   - `types`: all named types (excluding introspection types prefixed with `__`)
 *   - `fields`: fields on non-root types (Object, Interface, Input)
 *   - `rootFields`: fields on Query/Mutation/Subscription (separated for UI grouping)
 *   - `usedBy`: reverse lookup — for a given type name, which fields return it?
 *
 * All arrays are sorted alphabetically for stable display order.
 */
export function buildSchemaIndex(schema: GraphQLSchema): SchemaIndex {
    const types: TypeEntry[] = [];
    const fields: FieldEntry[] = [];
    const rootFields: FieldEntry[] = [];
    const usedByMap: SchemaIndex['usedBy'] = {};

    const typeMap = schema.getTypeMap();

    // Identify root operation types so their fields go into `rootFields` instead of `fields`.
    const rootTypeNames = new Set(
        [schema.getQueryType(), schema.getMutationType(), schema.getSubscriptionType()]
            .filter(Boolean)
            .map(t => t!.name),
    );

    for (const typeName of Object.keys(typeMap)) {
        // Skip GraphQL introspection types (e.g. __Schema, __Type)
        if (typeName.startsWith('__')) {
            // eslint-disable-next-line no-continue
            continue;
        }

        const type = typeMap[typeName];
        const kind = getTypeKind(type);

        types.push({
            name: typeName,
            kind,
            description: type.description || '',
            type,
        });

        // Only Object, Interface, and Input types have fields to index.
        if (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)) {
            const typeFields = type.getFields();

            for (const fieldName of Object.keys(typeFields)) {
                const field = typeFields[fieldName];
                // istanbul ignore next -- getNamedType always resolves for valid schema fields
                const returnTypeName = getNamedType(field.type)?.name || '';

                const entry: FieldEntry = { typeName, fieldName, field, returnTypeName };

                if (rootTypeNames.has(typeName)) {
                    rootFields.push(entry);
                } else {
                    fields.push(entry);
                }

                // Build the reverse "used by" index: returnTypeName → fields that return it.
                // istanbul ignore else -- returnTypeName is always non-empty for valid schema fields
                if (returnTypeName) {
                    if (!usedByMap[returnTypeName]) {
                        usedByMap[returnTypeName] = [];
                    }
                    usedByMap[returnTypeName].push({ typeName, fieldName, field });
                }
            }
        }
    }

    // Sort everything alphabetically for deterministic order.
    types.sort((a, b) => a.name.localeCompare(b.name));

    const fieldSortKey = (e: FieldEntry) => `${e.typeName}.${e.fieldName}`;
    fields.sort((a, b) => fieldSortKey(a).localeCompare(fieldSortKey(b)));
    rootFields.sort((a, b) => fieldSortKey(a).localeCompare(fieldSortKey(b)));

    for (const key of Object.keys(usedByMap)) {
        usedByMap[key].sort((a, b) => `${a.typeName}.${a.fieldName}`.localeCompare(`${b.typeName}.${b.fieldName}`));
    }

    return { types, fields, usedBy: usedByMap, rootFields, rootTypeNames };
}

function matchesWordBoundary(name: string, queryLower: string): boolean {
    const boundaries: number[] = [];
    for (let i = 1; i < name.length; i++) {
        const prev = name[i - 1];
        const curr = name[i];

        if (prev === '_') {
            boundaries.push(i);
        } else if (prev >= 'a' && prev <= 'z' && curr >= 'A' && curr <= 'Z') {
            boundaries.push(i);
        }
    }

    for (const pos of boundaries) {
        const slice = name.slice(pos).toLowerCase();
        if (slice.startsWith(queryLower)) return true;
    }

    return false;
}

/**
 * Subsequence fuzzy match: returns true if every character in `queryLower`
 * appears in `nameLower` in the same order, but not necessarily contiguously.
 * e.g. fuzzyMatch("businessname", "bname") → true (b...n-a-m-e)
 *
 * Walks through the name with a sliding cursor; for each query character,
 * searches forward from the cursor. Fails if any character can't be found.
 */
function fuzzyMatch(nameLower: string, queryLower: string): boolean {
    let ni = 0;
    for (let qi = 0; qi < queryLower.length; qi++) {
        const ch = queryLower[qi];
        const found = nameLower.indexOf(ch, ni);
        if (found === -1) return false;
        ni = found + 1;
    }
    return true;
}

function expandSynonyms(query: string): string {
    let result = query;
    for (const [abbrev, expansion] of Object.entries(SYNONYMS)) {
        if (result.includes(abbrev)) {
            result = result.replace(abbrev, expansion);
        }
    }
    return result;
}

/**
 * Score how well `name` matches `query`.
 *
 * Returns a tier number (1 = best, 10 = worst) or 0 for no match.
 * Lower tier = stronger match. The tiers are:
 *
 *   1 — Exact match (case-insensitive)
 *   2 — Name starts with query (prefix match)
 *   3 — Query matches at a word boundary (camelCase or underscore_case split)
 *   4 — Query appears anywhere in name (substring match)
 *   5–8 — Same as 1–4 but after expanding synonyms (e.g. "biz" → "business")
 *   9 — Fuzzy match on original query (all chars appear in order)
 *  10 — Fuzzy match on synonym-expanded query
 *   0 — No match
 */
export function scoreMatch(name: string, query: string): number {
    const nameLower = name.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryAlpha = queryLower.replace(/[^a-z0-9]/g, '');
    if (!queryAlpha) return 0;

    // Direct matching (tiers 1–4): try the raw query against the name.
    if (nameLower === queryAlpha) return 1;
    if (nameLower.startsWith(queryAlpha)) return 2;
    if (matchesWordBoundary(name, queryAlpha)) return 3;
    if (nameLower.includes(queryAlpha)) return 4;

    // Synonym matching (tiers 5–8): expand abbreviations and retry.
    const expanded = expandSynonyms(queryAlpha);
    if (expanded !== queryAlpha) {
        if (nameLower === expanded) return 5;
        if (nameLower.startsWith(expanded)) return 6;
        if (matchesWordBoundary(name, expanded)) return 7;
        if (nameLower.includes(expanded)) return 8;
    }

    // Fuzzy matching (tiers 9–10): all query characters appear in order in the name.
    if (fuzzyMatch(nameLower, queryAlpha)) return 9;
    if (expanded !== queryAlpha && fuzzyMatch(nameLower, expanded)) return 10;

    return 0;
}

/**
 * Search the index for types and fields matching a query.
 *
 * When query is empty, returns all types (optionally filtered by kind) with no
 * field results — this powers the "browse all types" view.
 *
 * When a query is provided, scores every type name, root field name, and regular
 * field name against it using `scoreMatch`, then returns them sorted by relevance
 * (best score first, alphabetical tiebreaker).
 */
export function searchIndex(index: SchemaIndex, query: string, kindFilter: string | null): SearchResults {
    const trimmed = (query || '').trim();

    // No query: return the full type list for browsing (no field results).
    if (!trimmed) {
        let filteredTypes = index.types;
        if (kindFilter) {
            filteredTypes = filteredTypes.filter(t => t.kind === kindFilter);
        }
        return { types: filteredTypes as ScoredTypeEntry[], fields: [], rootFields: [] };
    }

    // Score types against the query, respecting the optional kind filter.
    const scoredTypes: ScoredTypeEntry[] = [];
    for (const entry of index.types) {
        if (kindFilter && entry.kind !== kindFilter) {
            // eslint-disable-next-line no-continue
            continue;
        }
        const score = scoreMatch(entry.name, trimmed);
        if (score > 0) {
            scoredTypes.push({ ...entry, score });
        }
    }

    // Score root operation fields (Query, Mutation, Subscription).
    const scoredRootFields: ScoredFieldEntry[] = [];
    for (const entry of index.rootFields) {
        const score = scoreMatch(entry.fieldName, trimmed);
        if (score > 0) {
            scoredRootFields.push({ ...entry, score });
        }
    }

    // Score regular (non-root) fields.
    const scoredFields: ScoredFieldEntry[] = [];
    for (const entry of index.fields) {
        const score = scoreMatch(entry.fieldName, trimmed);
        if (score > 0) {
            scoredFields.push({ ...entry, score });
        }
    }

    // Sort by score ascending (lower = better match), then alphabetically.
    const sortFn = (
        a: { score: number; name?: string; typeName?: string; fieldName?: string },
        b: { score: number; name?: string; typeName?: string; fieldName?: string },
    ) => {
        if (a.score !== b.score) return a.score - b.score;
        const aKey = a.name || `${a.typeName}.${a.fieldName}`;
        const bKey = b.name || `${b.typeName}.${b.fieldName}`;
        return aKey.localeCompare(bKey);
    };

    scoredTypes.sort(sortFn);
    scoredRootFields.sort(sortFn);
    scoredFields.sort(sortFn);

    return { types: scoredTypes, fields: scoredFields, rootFields: scoredRootFields };
}
