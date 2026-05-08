import { useGraphiQL } from '@graphiql/react';
import type { GraphQLSchema } from 'graphql';
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

const KIND_FILTERS = ['Object', 'Input', 'Enum', 'Interface', 'Union', 'Scalar'];
const SECTION_FILTERS = [
    { key: 'root', label: 'Root Operations' },
    { key: 'types', label: 'Types' },
    { key: 'fields', label: 'Fields' },
];

function formatCount(n: number): string {
    return n.toLocaleString();
}

function cx(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}

type SelectedType = string | { typeName: string; fieldName: string } | null;

type FlatItem =
    | { rowKind: 'section-header'; label: string }
    | { rowKind: 'type-result'; name: string; kind: string }
    | { rowKind: 'field-result'; typeName: string; fieldName: string };

export function SchemaSearchContent() {
    const schema = useGraphiQL(state => state.schema) as GraphQLSchema | null | undefined;
    const { hashPrefix } = useSchemaSearchConfig();

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

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query]);

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

    useEffect(() => {
        if (!hasInitializedHistory()) {
            setInitializedHistory(true);
            if (window.location.hash) {
                const currentHash = window.location.hash;
                window.history.replaceState({ schemaSearchDepth: 0 }, '', window.location.pathname);
                window.history.pushState({ schemaSearchDepth: 1 }, '', currentHash);
                setNavCounter(1);
            } else {
                window.history.replaceState({ schemaSearchDepth: 0 }, '', window.location.pathname);
            }
        }
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

    const onFieldSelect = useCallback(
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

    useEffect(() => {
        if (isSearchMode && sectionFilter !== 'types') {
            setKindFilter(null);
        }
    }, [isSearchMode, sectionFilter]);

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
                return <div className={styles.sectionHeader}>{item.label}</div>;
            }
            if (item.rowKind === 'type-result') {
                return (
                    <div className={styles.item} onClick={() => navigateToType(item.name)}>
                        <span className={styles.itemName}>{item.name}</span>
                        <span className={styles.itemKind}>{item.kind}</span>
                    </div>
                );
            }
            if (item.rowKind === 'field-result') {
                return (
                    <div className={styles.item} onClick={() => navigateToType(item.typeName, item.fieldName)}>
                        <span className={styles.itemTypePrefix}>{`${item.typeName}.`}</span>
                        <span className={styles.itemName}>{item.fieldName}</span>
                    </div>
                );
            }
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
            <div className={styles.schemaSearch}>
                <div className={styles.noResults}>Loading schema...</div>
            </div>
        );
    }

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
        <div className={styles.schemaSearch}>
            <div className={styles.header}>
                <input
                    className={styles.input}
                    placeholder="Search types and fields..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            </div>
            {isSearchMode && (
                <div className={styles.filters}>
                    {SECTION_FILTERS.map(sf => (
                        <button
                            type="button"
                            key={sf.key}
                            className={cx(styles.filterChip, sectionFilter === sf.key && styles.filterChipActive)}
                            onClick={() => setSectionFilter(sectionFilter === sf.key ? null : sf.key)}
                        >
                            {sf.label}
                        </button>
                    ))}
                </div>
            )}
            {(!isSearchMode || sectionFilter === 'types') && (
                <div className={styles.filters}>
                    {KIND_FILTERS.map(kind => (
                        <button
                            type="button"
                            key={kind}
                            className={cx(styles.filterChip, kindFilter === kind && styles.filterChipActive)}
                            onClick={() => setKindFilter(kindFilter === kind ? null : kind)}
                        >
                            {kind}
                        </button>
                    ))}
                </div>
            )}
            <div className={styles.count}>{countText}</div>
            <div className={styles.results}>
                {flatItems.length > 0 ? (
                    <VirtualList items={flatItems} renderItem={renderItem} />
                ) : (
                    <div className={styles.noResults}>No results found</div>
                )}
            </div>
        </div>
    );
}
