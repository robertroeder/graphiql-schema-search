import { createContext, useContext } from 'react';

export interface SchemaSearchConfig {
    hashPrefix: string;
}

export const SchemaSearchConfigContext = createContext<SchemaSearchConfig>({ hashPrefix: '' });

export function useSchemaSearchConfig(): SchemaSearchConfig {
    return useContext(SchemaSearchConfigContext);
}
