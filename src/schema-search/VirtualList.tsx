// Thin wrapper around virtua's VList for consistent styling across the plugin.

import React, { useRef, useEffect } from 'react';
import { VList, type VListHandle } from 'virtua';

interface VirtualListProps<T> {
    items: readonly T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    initialScrollIndex?: number;
}

export function VirtualList<T>({ items, renderItem, initialScrollIndex }: VirtualListProps<T>) {
    const ref = useRef<VListHandle>(null);

    // Scroll to initialScrollIndex on mount
    useEffect(() => {
        if (initialScrollIndex != null && initialScrollIndex > 0 && ref.current) {
            ref.current.scrollToIndex(initialScrollIndex);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs only on mount
    }, []);

    return (
        <VList ref={ref} style={{ flex: '1 1 0', minHeight: 0 }}>
            {items.map((item, i) => (
                // eslint-disable-next-line react/no-array-index-key -- generic items have no stable key
                <React.Fragment key={i}>{renderItem(item, i)}</React.Fragment>
            ))}
        </VList>
    );
}
