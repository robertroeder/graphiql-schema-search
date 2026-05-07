// Schema Search Plugin — main content component.
//
// Two views: a search/browse list (default) and a type detail view (when a type is selected).
// URL hash is used as the source of truth for navigation state, enabling deep-linking and
// browser back/forward support within the plugin panel.

import { useGraphiQL } from '@graphiql/react';
import type { GraphQLSchema } from 'graphql';
import { Div, Span } from 'lemon-reset';
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

import { useSchemaSearchConfig } from './config';
import {
    INITIAL_HASH,
    decodeNavHash,
    pushNavState,
    replaceNavState,
    hasInitializedHistory,
    setInitializedHistory,
    setNavCounter,
} from './navigation';
import { buildSchemaIndex, searchIndex, type SchemaIndex } from './schema_index';
import * as styles from './styles';
import { TypeDetailView } from './TypeDetailView';
import { VirtualList } from './VirtualList';

export const DEBOUNCE_MS = 200;

// Filter chips for narrowing results by GraphQL type kind.
const KIND_FILTERS = ['Object', 'Input', 'Enum', 'Interface', 'Union', 'Scalar'];
// Filter chips for narrowing results by result section (only shown during active search).
const SECTION_FILTERS = [
    { key: 'root', label: 'Root Operations' },
    { key: 'types', label: 'Types' },
    { key: 'fields', label: 'Fields' },
];

function formatCount(n: number): string {
    return n.toLocaleString();
}

// When a type is selected, it's either just the type name (string) or a deep-link
// to a specific field within a type ({ typeName, fieldName }).
type SelectedType = string | { typeName: string; fieldName: string } | null;

// Discriminated union for rows rendered in the virtual list.
type FlatItem =
    | { rowKind: 'section-header'; label: string }
    | { rowKind: 'type-result'; name: string; kind: string }
    | { rowKind: 'field-result'; typeName: string; fieldName: string };

export function SchemaSearchContent() {
    const schema = useGraphiQL(state => state.schema) as GraphQLSchema | null | undefined;
    const { hashPrefix } = useSchemaSearchConfig();

    // Restore UI state from the URL hash on first mount. On subsequent mounts
    // (plugin re-opened), read the live hash; on initial page load, use the
    // captured-at-module-load INITIAL_HASH since React effects may have cleared it.
    const [initialNav] = useState(() => {
        if (hasInitializedHistory()) {
            return decodeNavHash(window.location.hash, hashPrefix);
        }
        return decodeNavHash(INITIAL_HASH, hashPrefix);
    });
    const [query, setQuery] = useState(initialNav.query || '');
    const [debouncedQuery, setDebouncedQuery] = useState(initialNav.query || '');
    const [kindFilter, setKindFilter] = useState<string | null>(initialNav.kindFilter || null);
    const [sectionFilter, setSectionFilter] = useState<string | null>(initialNav.sectionFilter || null);
    const [selectedType, setSelectedType] = useState<SelectedType>(() => {
        if (initialNav.typeName) {
            return initialNav.fieldName
                ? { typeName: initialNav.typeName, fieldName: initialNav.fieldName }
                : initialNav.typeName;
        }
        return null;
    });

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query]);

    // Sync search/filter state to URL hash as the user types or toggles filters.
    // Skips the first render (state was just restored FROM the hash) and skips when
    // a type detail view is active (that has its own hash via navigateToType).
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (!selectedType) {
            replaceNavState({ query: debouncedQuery, kindFilter, sectionFilter }, hashPrefix);
        }
    }, [debouncedQuery, kindFilter, sectionFilter, selectedType]);

    const index: SchemaIndex | null = useMemo(() => {
        if (!schema) return null;
        return buildSchemaIndex(schema);
    }, [schema]);

    const results = useMemo(() => {
        if (!index) return { types: [], fields: [], rootFields: [] };
        return searchIndex(index, debouncedQuery, kindFilter);
    }, [index, debouncedQuery, kindFilter]);

    // Set up browser history integration on first mount.
    // Creates a "base" history entry (depth 0) so back-navigation can return to
    // the search list. Then listens for popstate to restore component state from
    // the URL hash when the user hits back/forward.
    useEffect(() => {
        if (!hasInitializedHistory()) {
            setInitializedHistory(true);
            if (window.location.hash) {
                // Page loaded with a deep-link hash — create a base entry behind it.
                const currentHash = window.location.hash;
                window.history.replaceState({ schemaSearchDepth: 0 }, '', window.location.pathname);
                window.history.pushState({ schemaSearchDepth: 1 }, '', currentHash);
                setNavCounter(1);
            } else {
                window.history.replaceState({ schemaSearchDepth: 0 }, '', window.location.pathname);
            }
        }
        // Update internal state any time history.go(), history.back(), or history.forward() is called
        const onPopState = () => {
            const nav = decodeNavHash(undefined, hashPrefix);
            if (nav.typeName) {
                setSelectedType(nav.fieldName ? { typeName: nav.typeName, fieldName: nav.fieldName } : nav.typeName);
            } else {
                setSelectedType(null);
            }
            setQuery(nav.query || '');
            setDebouncedQuery(nav.query || '');
            setKindFilter(nav.kindFilter || null);
            setSectionFilter(nav.sectionFilter || null);
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    // Navigate into a type detail view. Pushes a new history entry so the user
    // can go back. If we're already viewing this exact type+field, replace instead
    // to avoid duplicate history entries.
    const navigateToType = useCallback((typeName: string, fieldName?: string) => {
        const current = decodeNavHash(undefined, hashPrefix);
        if (current.typeName === typeName && current.fieldName === (fieldName || null)) {
            replaceNavState({ typeName, fieldName }, hashPrefix);
        } else {
            pushNavState({ typeName, fieldName }, hashPrefix);
        }
        setSelectedType(fieldName ? { typeName, fieldName } : typeName);
    }, [hashPrefix]);

    const goBack = useCallback(() => {
        window.history.back();
    }, []);

    // Called by TypeDetailView when the user scrolls to or selects a field.
    // Updates the URL hash to reflect the currently-visible field for deep-linking.
    const onFieldSelect = useCallback(
        // istanbul ignore next -- tested via TypeDetailView integration; callback not invoked through SchemaSearchContent tests
        (fieldName: string | null) => {
            const current = decodeNavHash(undefined, hashPrefix);
            const typeName = current.typeName;
            if (typeName) {
                replaceNavState({ typeName, fieldName: fieldName || undefined }, hashPrefix);
            }
        },
        [hashPrefix],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape' && query) {
                setQuery('');
            }
        },
        [query],
    );

    const isSearchMode = debouncedQuery.trim().length > 0;

    // Kind filters (Object, Enum, etc.) only apply to the "Types" section.
    // When entering search mode showing all sections, clear the kind filter
    // to avoid confusingly hiding results from other sections.
    useEffect(() => {
        if (isSearchMode && sectionFilter !== 'types') {
            setKindFilter(null);
        }
    }, [isSearchMode, sectionFilter]);

    // Flatten search results into a single list with section headers interleaved.
    // In browse mode (no query), only types are shown. In search mode, results are
    // grouped into Types / Root Operations / Fields sections, each gated by the
    // active section filter.
    const flatItems: FlatItem[] = useMemo(() => {
        if (!index) return [];
        const items: FlatItem[] = [];
        const showRoot = !sectionFilter || sectionFilter === 'root';
        const showTypes = !sectionFilter || sectionFilter === 'types';
        const showFields = !sectionFilter || sectionFilter === 'fields';

        if (showTypes && results.types.length > 0) {
            items.push({ rowKind: 'section-header', label: isSearchMode ? 'Types' : 'All Types' });
            for (const entry of results.types) {
                items.push({ rowKind: 'type-result', name: entry.name, kind: entry.kind });
            }
        }

        if (showRoot && isSearchMode && results.rootFields.length > 0) {
            items.push({ rowKind: 'section-header', label: 'Root Operations' });
            for (const entry of results.rootFields) {
                items.push({ rowKind: 'field-result', typeName: entry.typeName, fieldName: entry.fieldName });
            }
        }

        if (showFields && isSearchMode && results.fields.length > 0) {
            items.push({ rowKind: 'section-header', label: 'Fields' });
            for (const entry of results.fields) {
                items.push({ rowKind: 'field-result', typeName: entry.typeName, fieldName: entry.fieldName });
            }
        }

        return items;
    }, [index, results, isSearchMode, sectionFilter]);

    const renderItem = useCallback(
        (item: FlatItem) => {
            if (item.rowKind === 'section-header') {
                return <Div css={styles.sectionHeader}>{item.label}</Div>;
            }
            if (item.rowKind === 'type-result') {
                return (
                    <Div css={styles.item} onClick={() => navigateToType(item.name)}>
                        <Span css={styles.itemName}>{item.name}</Span>
                        <Span css={styles.itemKind}>{item.kind}</Span>
                    </Div>
                );
            }
            // istanbul ignore else -- exhaustive, all rowKinds handled above
            if (item.rowKind === 'field-result') {
                return (
                    <Div css={styles.item} onClick={() => navigateToType(item.typeName, item.fieldName)}>
                        <Span css={styles.itemTypePrefix}>{`${item.typeName}.`}</Span>
                        <Span css={styles.itemName}>{item.fieldName}</Span>
                    </Div>
                );
            }
            // istanbul ignore next
            return null;
        },
        [navigateToType],
    );

    const countText = useMemo(() => {
        if (!index) return '';
        const count = flatItems.filter(i => i.rowKind !== 'section-header').length;
        return `${formatCount(count)} results`;
    }, [index, flatItems]);

    if (!schema || !index) {
        return (
            <Div css={styles.schemaSearch}>
                <Div css={styles.noResults}>Loading schema...</Div>
            </Div>
        );
    }

    // When a type is selected, render the detail view instead of the search list.
    if (selectedType) {
        const isDeepLink = typeof selectedType === 'object';
        const typeName = isDeepLink ? selectedType.typeName : selectedType;
        const fieldName = isDeepLink ? selectedType.fieldName : undefined;
        return (
            <TypeDetailView
                key={typeName}
                typeName={typeName}
                schema={schema}
                index={index}
                navigateToType={navigateToType}
                goBack={goBack}
                initialField={fieldName}
                onFieldSelect={onFieldSelect}
            />
        );
    }

    return (
        <Div css={styles.schemaSearch}>
            <Div css={styles.header}>
                <input
                    css={styles.input}
                    placeholder="Search types and fields..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    // eslint-disable-next-line jsx-a11y/no-autofocus -- this is the primary input in a dev-tools panel
                    autoFocus
                />
            </Div>
            {isSearchMode && (
                <Div css={styles.filters}>
                    {SECTION_FILTERS.map(sf => (
                        <button
                            type="button"
                            key={sf.key}
                            css={[styles.filterChip, sectionFilter === sf.key && styles.filterChipActive]}
                            onClick={() => setSectionFilter(sectionFilter === sf.key ? null : sf.key)}
                        >
                            {sf.label}
                        </button>
                    ))}
                </Div>
            )}
            {(!isSearchMode || sectionFilter === 'types') && (
                <Div css={styles.filters}>
                    {KIND_FILTERS.map(kind => (
                        <button
                            type="button"
                            key={kind}
                            css={[styles.filterChip, kindFilter === kind && styles.filterChipActive]}
                            onClick={() => setKindFilter(kindFilter === kind ? null : kind)}
                        >
                            {kind}
                        </button>
                    ))}
                </Div>
            )}
            <Div css={styles.count}>{countText}</Div>
            <Div css={styles.results}>
                {flatItems.length > 0 ? (
                    <VirtualList items={flatItems} renderItem={renderItem} />
                ) : (
                    <Div css={styles.noResults}>No results found</Div>
                )}
            </Div>
        </Div>
    );
}
