// Type detail view — shows fields, enum values, possible types, and usage for a single GraphQL type.
//
// Renders a tabbed interface with up to four tabs depending on the type kind:
//   - Fields: for Object, Interface, and Input types (expandable rows showing args)
//   - Values: for Enum types
//   - Types: for Union (member types) and Interface (implementing types)
//   - Used By: reverse-lookup of fields across the schema that return this type

import {
    type GraphQLSchema,
    type GraphQLField,
    type GraphQLArgument,
    getNamedType,
    isObjectType,
    isInterfaceType,
    isInputObjectType,
    isEnumType,
    isUnionType,
} from 'graphql';
import { Div, Span } from 'lemon-reset';
import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { getTypeKind, type SchemaIndex } from './schema_index';
import * as styles from './styles';
import { VirtualList } from './VirtualList';

/** Render a GraphQL type as its full string representation (e.g. "[Business!]!") */
function formatType(gqlType: { toString(): string }): string {
    return String(gqlType);
}

interface TypeDetailViewProps {
    typeName: string;
    schema: GraphQLSchema;
    index: SchemaIndex;
    navigateToType: (typeName: string, fieldName?: string) => void;
    goBack: () => void;
    initialField?: string;
    onFieldSelect: (fieldName: string | null) => void;
}

export function TypeDetailView({
    typeName,
    schema,
    index,
    navigateToType,
    goBack,
    initialField,
    onFieldSelect,
}: TypeDetailViewProps) {
    // If we arrived via a deep-link to a specific field, open the Fields tab and highlight it.
    const [activeTab, setActiveTab] = useState<string | null>(initialField ? 'Fields' : null);
    const [selectedField, _setSelectedField] = useState<string | null>(initialField || null);

    // When browser navigation changes initialField (back/forward), sync local state.
    useEffect(() => {
        _setSelectedField(initialField || null);
        if (initialField) setActiveTab('Fields');
    }, [initialField]);

    // Wrapper around _setSelectedField that also notifies the parent (for URL hash sync).
    const setSelectedField = useCallback(
        (fieldName: string | null) => {
            _setSelectedField(fieldName);
            // istanbul ignore else -- onFieldSelect is a required prop
            if (onFieldSelect) onFieldSelect(fieldName);
        },
        [onFieldSelect],
    );

    const typeObj = schema.getType(typeName);

    const kind = typeObj ? getTypeKind(typeObj) : 'Unknown';
    const description = typeObj?.description || '';
    const interfaces =
        typeObj && (isObjectType(typeObj) || isInterfaceType(typeObj)) && typeof typeObj.getInterfaces === 'function'
            ? typeObj
                  .getInterfaces()
                  .map(i => i.name)
                  .sort()
            : [];

    // Determine which tabs to show based on type kind.
    const hasFields = !!typeObj && (isObjectType(typeObj) || isInterfaceType(typeObj) || isInputObjectType(typeObj));
    const hasValues = !!typeObj && isEnumType(typeObj);
    const hasTypes = !!typeObj && (isUnionType(typeObj) || isInterfaceType(typeObj));
    // Reverse lookup: all fields across the schema that return this type.
    const usedByEntries = useMemo(() => index.usedBy[typeName] || [], [index, typeName]);

    /* eslint-disable react-hooks/exhaustive-deps -- typeObj/hasX are derived from schema+typeName within the same render */
    const fieldsList = useMemo((): readonly GraphQLField<unknown, unknown>[] => {
        if (!typeObj || !hasFields) return [];
        const typeFields = typeObj.getFields();
        return Object.keys(typeFields)
            .sort((a, b) => a.localeCompare(b))
            .map(name => typeFields[name]) as GraphQLField<unknown, unknown>[];
    }, [schema, typeName]);

    const enumValues = useMemo(() => {
        if (!typeObj || !hasValues) return [];
        return typeObj.getValues();
    }, [schema, typeName]);

    const possibleTypes = useMemo(() => {
        if (!typeObj || !hasTypes) return [];
        if (isUnionType(typeObj)) {
            return typeObj
                .getTypes()
                .map(t => t.name)
                .sort();
        }
        // istanbul ignore else -- unreachable else: only unions and interfaces reach here, and unions return above
        if (isInterfaceType(typeObj)) {
            const impls = schema.getPossibleTypes(typeObj);
            return impls
                ? impls.map(t => t.name).sort()
                : // istanbul ignore next -- defensive, getPossibleTypes always returns array for valid interfaces
                  [];
        }
        // istanbul ignore next -- unreachable
        return [];
    }, [schema, typeName]);
    /* eslint-enable react-hooks/exhaustive-deps */

    // Build the tab list dynamically — only include tabs with content.
    const tabsList: { key: string; label: string }[] = [];
    if (hasFields) tabsList.push({ key: 'Fields', label: `Fields (${fieldsList.length})` });
    if (hasValues) tabsList.push({ key: 'Values', label: `Values (${enumValues.length})` });
    if (hasTypes) tabsList.push({ key: 'Types', label: `Types (${possibleTypes.length})` });
    if (usedByEntries.length > 0) tabsList.push({ key: 'Used By', label: `Used By (${usedByEntries.length})` });

    // Default to the first available tab if activeTab is invalid (e.g. type changed).
    const tabKeys = tabsList.map(t => t.key);
    const currentTab = activeTab && tabKeys.includes(activeTab) ? activeTab : tabsList[0]?.key || null;

    // Renders a single field row. Collapsed: shows name, arg count, and return type.
    // Expanded (when clicked): additionally shows description and full argument list.
    // Return type and argument types are clickable to navigate to that type.
    const renderFieldItem = useCallback(
        (field: GraphQLField<unknown, unknown>) => {
            // istanbul ignore next -- getNamedType always resolves for valid schema fields
            const returnTypeName = getNamedType(field.type)?.name || '';
            const argCount = field.args ? field.args.length : 0;
            const isExpanded = field.name === selectedField;

            return (
                <Div
                    css={[styles.fieldItem, isExpanded && styles.fieldItemExpanded]}
                    onClick={() => setSelectedField(selectedField === field.name ? null : field.name)}
                >
                    <Div css={styles.fieldItemRow}>
                        <Span css={styles.fieldName}>{field.name}</Span>
                        {argCount > 0 && <Span css={styles.fieldArgs}>({argCount} args)</Span>}
                        {': '}
                        <Span
                            css={styles.fieldReturn}
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                navigateToType(returnTypeName);
                            }}
                        >
                            {formatType(field.type)}
                        </Span>
                    </Div>
                    {!isExpanded && field.description && <Div css={styles.fieldItemDesc}>{field.description}</Div>}
                    {isExpanded && (
                        <>
                            {field.description && <Div css={styles.fieldItemDesc}>{field.description}</Div>}
                            {field.args && field.args.length > 0 && (
                                <Div css={styles.fieldDetailArgs}>
                                    <Div css={styles.argsHeader}>Arguments ({field.args.length})</Div>
                                    {field.args.map((arg: GraphQLArgument) => (
                                        <Div key={arg.name} css={styles.fieldDetailArg}>
                                            <Span css={styles.fieldName}>{arg.name}</Span>
                                            {': '}
                                            <Span
                                                css={styles.fieldReturn}
                                                onClick={(e: React.MouseEvent) => {
                                                    e.stopPropagation();
                                                    // istanbul ignore next -- getNamedType always resolves for valid arg types
                                                    navigateToType(getNamedType(arg.type)?.name || '');
                                                }}
                                            >
                                                {String(arg.type)}
                                            </Span>
                                            {arg.defaultValue !== undefined && (
                                                <Span css={styles.fieldDefault}>
                                                    {` = ${JSON.stringify(arg.defaultValue)}`}
                                                </Span>
                                            )}
                                            {arg.description && (
                                                <Div css={styles.fieldDetailArgDesc}>{arg.description}</Div>
                                            )}
                                        </Div>
                                    ))}
                                </Div>
                            )}
                        </>
                    )}
                </Div>
            );
        },
        [navigateToType, selectedField, setSelectedField],
    );

    const renderEnumValue = useCallback(
        (value: { name: string; description?: string | null }) => (
            <Div css={styles.enumValue}>
                <Div css={styles.fieldName}>{value.name}</Div>
                {value.description && <Div css={styles.fieldItemDesc}>{value.description}</Div>}
            </Div>
        ),
        [],
    );

    const renderPossibleType = useCallback(
        (name: string) => (
            <Div css={styles.possibleType} onClick={() => navigateToType(name)}>
                {name}
            </Div>
        ),
        [navigateToType],
    );

    // Used By rows include section headers to separate root operations from regular fields.
    type UsedByItem =
        | { rowKind: 'section-header'; label: string }
        | { rowKind?: undefined; typeName: string; fieldName: string };

    const renderUsedByItem = useCallback(
        (item: UsedByItem) => {
            if (item.rowKind === 'section-header') {
                return <Div css={styles.sectionHeader}>{item.label}</Div>;
            }
            return (
                <Div css={styles.item} onClick={() => navigateToType(item.typeName, item.fieldName)}>
                    <Span css={styles.itemTypePrefix}>{`${item.typeName}.`}</Span>
                    <Span css={styles.itemName}>{item.fieldName}</Span>
                </Div>
            );
        },
        [navigateToType],
    );

    // Group usedBy entries into "Root Operations" and "Fields" sections
    // so users can quickly see if a type is reachable from top-level queries.
    const usedByItems: UsedByItem[] = useMemo(() => {
        if (usedByEntries.length === 0) return [];
        const rootTypeNames = index.rootTypeNames;
        const rootOps = usedByEntries.filter(e => rootTypeNames.has(e.typeName));
        const fields = usedByEntries.filter(e => !rootTypeNames.has(e.typeName));
        const items: UsedByItem[] = [];
        if (rootOps.length > 0) {
            items.push({ rowKind: 'section-header', label: `Root Operations (${rootOps.length})` });
            for (const entry of rootOps) items.push(entry);
        }
        if (fields.length > 0) {
            items.push({ rowKind: 'section-header', label: `Fields (${fields.length})` });
            for (const entry of fields) items.push(entry);
        }
        return items;
    }, [usedByEntries, index]);

    if (!typeObj) {
        return (
            <Div css={styles.detail}>
                <Div css={styles.detailHeader}>
                    <button type="button" css={styles.backBtn} onClick={goBack}>
                        {'< Back'}
                    </button>
                    <Span css={styles.typeName}>{typeName}</Span>
                </Div>
                <Div css={styles.noResults}>Type not found</Div>
            </Div>
        );
    }

    // Render the content for the active tab. For the Fields tab, scroll to the
    // deep-linked field if one was specified via URL hash.
    let tabContent: React.ReactNode = null;
    const initialFieldIndex = initialField ? fieldsList.findIndex(f => f.name === initialField) : -1;

    if (currentTab === 'Fields') {
        tabContent = (
            <VirtualList
                items={fieldsList}
                renderItem={renderFieldItem}
                initialScrollIndex={initialFieldIndex > 0 ? initialFieldIndex : undefined}
            />
        );
    } else if (currentTab === 'Values') {
        tabContent = <VirtualList items={enumValues} renderItem={renderEnumValue} />;
    } else if (currentTab === 'Types') {
        tabContent = <VirtualList items={possibleTypes} renderItem={renderPossibleType} />;
    } else if (currentTab === 'Used By') {
        tabContent = <VirtualList items={usedByItems} renderItem={renderUsedByItem} />;
    }

    return (
        <Div css={styles.detail}>
            <Div css={styles.detailHeader}>
                <button type="button" css={styles.backBtn} onClick={goBack}>
                    {'< Back'}
                </button>
                <Div>
                    <Span css={styles.typeName}>{typeName}</Span>
                    <Span css={styles.typeKindBadge}>{kind}</Span>
                </Div>
                {interfaces.length > 0 && (
                    <Div css={styles.typeImplements}>
                        {'implements '}
                        {interfaces.map((name, i) => (
                            <React.Fragment key={name}>
                                {i > 0 && ', '}
                                <Span css={styles.fieldReturn} onClick={() => navigateToType(name)}>
                                    {name}
                                </Span>
                            </React.Fragment>
                        ))}
                    </Div>
                )}
            </Div>
            {description && <Div css={styles.typeDescription}>{description}</Div>}
            {tabsList.length > 0 && (
                <Div css={styles.tabs}>
                    {tabsList.map(t => (
                        <button
                            type="button"
                            key={t.key}
                            css={[styles.tab, currentTab === t.key && styles.tabActive]}
                            onClick={() => setActiveTab(t.key)}
                        >
                            {t.label}
                        </button>
                    ))}
                </Div>
            )}
            {tabContent}
        </Div>
    );
}
