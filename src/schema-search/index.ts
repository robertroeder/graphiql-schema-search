import type { GraphiQLPlugin } from '@graphiql/react';
import React from 'react';

import { SchemaSearchConfigContext, type SchemaSearchConfig } from './config';
import { SchemaSearchContent } from './SchemaSearchContent';
import { createSchemaSearchIcon } from './SchemaSearchIcon';

export function getSchemaSearchPlugin(hashPrefix = ''): GraphiQLPlugin {
    const config: SchemaSearchConfig = { hashPrefix };

    return {
        title: 'Schema Search',
        icon: createSchemaSearchIcon(hashPrefix),
        content: () =>
            React.createElement(
                SchemaSearchConfigContext.Provider,
                { value: config },
                React.createElement(SchemaSearchContent),
            ),
    };
}
