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
import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { getTypeKind, type SchemaIndex } from './schema_index';
import * as styles from './styles';
import { VirtualList } from './VirtualList';

function cx(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}

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
    const [activeTab, setActiveTab] = useState<string | null>(initialField ? 'Fields' : null);
    const [selectedField, _setSelectedField] = useState<string | null>(initialField || null);

    useEffect(() => {
        _setSelectedField(initialField || null);
        if (initialField) setActiveTab('Fields');
    }, [initialField]);

    const setSelectedField = useCallback(
        (fieldName: string | null) => {
            _setSelectedField(fieldName);
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

    const hasFields = !!typeObj && (isObjectType(typeObj) || isInterfaceType(typeObj) || isInputObjectType(typeObj));
    const hasValues = !!typeObj && isEnumType(typeObj);
    const hasTypes = !!typeObj && (isUnionType(typeObj) || isInterfaceType(typeObj));
    const usedByEntries = useMemo(() => index.usedBy[typeName] || [], [index, typeName]);

    /* eslint-disable react-hooks/exhaustive-deps */
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
        if (isInterfaceType(typeObj)) {
            const impls = schema.getPossibleTypes(typeObj);
            return impls ? impls.map(t => t.name).sort() : [];
        }
        return [];
    }, [schema, typeName]);
    /* eslint-enable react-hooks/exhaustive-deps */

    const tabsList: { key: string; label: string }[] = [];
    if (hasFields) tabsList.push({ key: 'Fields', label: `Fields (${fieldsList.length})` });
    if (hasValues) tabsList.push({ key: 'Values', label: `Values (${enumValues.length})` });
    if (hasTypes) tabsList.push({ key: 'Types', label: `Types (${possibleTypes.length})` });
    if (usedByEntries.length > 0) tabsList.push({ key: 'Used By', label: `Used By (${usedByEntries.length})` });

    const tabKeys = tabsList.map(t => t.key);
    const currentTab = activeTab && tabKeys.includes(activeTab) ? activeTab : tabsList[0]?.key || null;

    const renderFieldItem = useCallback(
        (field: GraphQLField<unknown, unknown>) => {
            const returnTypeName = getNamedType(field.type)?.name || '';
            const argCount = field.args ? field.args.length : 0;
            const isExpanded = field.name === selectedField;

            return (
                <div
                    className={cx(styles.fieldItem, isExpanded && styles.fieldItemExpanded)}
                    onClick={() => setSelectedField(selectedField === field.name ? null : field.name)}
                >
                    <div className={styles.fieldItemRow}>
                        <span className={styles.fieldName}>{field.name}</span>
                        {argCount > 0 && <span className={styles.fieldArgs}>({argCount} args)</span>}
                        {': '}
                        <span
                            className={styles.fieldReturn}
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                navigateToType(returnTypeName);
                            }}
                        >
                            {formatType(field.type)}
                        </span>
                    </div>
                    {!isExpanded && field.description && <div className={styles.fieldItemDesc}>{field.description}</div>}
                    {isExpanded && (
                        <>
                            {field.description && <div className={styles.fieldItemDesc}>{field.description}</div>}
                            {field.args && field.args.length > 0 && (
                                <div className={styles.fieldDetailArgs}>
                                    <div className={styles.argsHeader}>Arguments ({field.args.length})</div>
                                    {field.args.map((arg: GraphQLArgument) => (
                                        <div key={arg.name} className={styles.fieldDetailArg}>
                                            <span className={styles.fieldName}>{arg.name}</span>
                                            {': '}
                                            <span
                                                className={styles.fieldReturn}
                                                onClick={(e: React.MouseEvent) => {
                                                    e.stopPropagation();
                                                    navigateToType(getNamedType(arg.type)?.name || '');
                                                }}
                                            >
                                                {String(arg.type)}
                                            </span>
                                            {arg.defaultValue !== undefined && (
                                                <span className={styles.fieldDefault}>
                                                    {` = ${JSON.stringify(arg.defaultValue)}`}
                                                </span>
                                            )}
                                            {arg.description && (
                                                <div className={styles.fieldDetailArgDesc}>{arg.description}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            );
        },
        [navigateToType, selectedField, setSelectedField],
    );

    const renderEnumValue = useCallback(
        (value: { name: string; description?: string | null }) => (
            <div className={styles.enumValue}>
                <div className={styles.fieldName}>{value.name}</div>
                {value.description && <div className={styles.fieldItemDesc}>{value.description}</div>}
            </div>
        ),
        [],
    );

    const renderPossibleType = useCallback(
        (name: string) => (
            <div className={styles.possibleType} onClick={() => navigateToType(name)}>
                {name}
            </div>
        ),
        [navigateToType],
    );

    type UsedByItem =
        | { rowKind: 'section-header'; label: string }
        | { rowKind?: undefined; typeName: string; fieldName: string };

    const renderUsedByItem = useCallback(
        (item: UsedByItem) => {
            if (item.rowKind === 'section-header') {
                return <div className={styles.sectionHeader}>{item.label}</div>;
            }
            return (
                <div className={styles.item} onClick={() => navigateToType(item.typeName, item.fieldName)}>
                    <span className={styles.itemTypePrefix}>{`${item.typeName}.`}</span>
                    <span className={styles.itemName}>{item.fieldName}</span>
                </div>
            );
        },
        [navigateToType],
    );

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
            <div className={styles.detail}>
                <div className={styles.detailHeader}>
                    <button type="button" className={styles.backBtn} onClick={goBack}>
                        {'< Back'}
                    </button>
                    <span className={styles.typeName}>{typeName}</span>
                </div>
                <div className={styles.noResults}>Type not found</div>
            </div>
        );
    }

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
        <div className={styles.detail}>
            <div className={styles.detailHeader}>
                <button type="button" className={styles.backBtn} onClick={goBack}>
                    {'< Back'}
                </button>
                <div>
                    <span className={styles.typeName}>{typeName}</span>
                    <span className={styles.typeKindBadge}>{kind}</span>
                </div>
                {interfaces.length > 0 && (
                    <div className={styles.typeImplements}>
                        {'implements '}
                        {interfaces.map((name, i) => (
                            <React.Fragment key={name}>
                                {i > 0 && ', '}
                                <span className={styles.fieldReturn} onClick={() => navigateToType(name)}>
                                    {name}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
            {description && <div className={styles.typeDescription}>{description}</div>}
            {tabsList.length > 0 && (
                <div className={styles.tabs}>
                    {tabsList.map(t => (
                        <button
                            type="button"
                            key={t.key}
                            className={cx(styles.tab, currentTab === t.key && styles.tabActive)}
                            onClick={() => setActiveTab(t.key)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            )}
            {tabContent}
        </div>
    );
}
