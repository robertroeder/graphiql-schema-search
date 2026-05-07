import type { GraphiQLPlugin } from '@graphiql/react';
import React from 'react';

import { SchemaSearchConfigContext, type SchemaSearchConfig } from './config';
import { SchemaSearchContent } from './SchemaSearchContent';
import { SchemaSearchIcon } from './SchemaSearchIcon';
import { hasSchemaSearchHash } from './navigation';

export interface SchemaSearchResult {
    plugin: GraphiQLPlugin;
    isSchemaSearchActive: () => boolean;
}

export function getSchemaSearchPlugin(hashPrefix = ''): SchemaSearchResult {
    const config: SchemaSearchConfig = { hashPrefix };

    const plugin: GraphiQLPlugin = {
        title: 'Schema Search',
        icon: SchemaSearchIcon,
        content: () =>
            React.createElement(
                SchemaSearchConfigContext.Provider,
                { value: config },
                React.createElement(SchemaSearchContent),
            ),
    };

    const isSchemaSearchActive = (): boolean => {
        if (typeof window === 'undefined') return false;
        return hasSchemaSearchHash(window.location.hash, hashPrefix);
    };

    return { plugin, isSchemaSearchActive };
}
