import { usePluginContext } from '@graphiql/react';
import { useEffect } from 'react';

import { hasSchemaSearchHash } from './navigation';

export function createSchemaSearchIcon(hashPrefix: string) {
    return function SchemaSearchIcon() {
        const pluginContext = usePluginContext();
        const setVisiblePlugin = pluginContext?.setVisiblePlugin;

        useEffect(() => {
            if (!setVisiblePlugin) return;
            if (hasSchemaSearchHash(window.location.hash, hashPrefix)) {
                setVisiblePlugin('Schema Search');
            }

            const onHashChange = () => {
                if (hasSchemaSearchHash(window.location.hash, hashPrefix)) {
                    setVisiblePlugin('Schema Search');
                }
            };
            window.addEventListener('hashchange', onHashChange);
            return () => window.removeEventListener('hashchange', onHashChange);
        }, [setVisiblePlugin]);

        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: '1.3em', height: '1.3em' }}
            >
                <circle cx={11} cy={11} r={8} />
                <line x1={21} y1={21} x2={16.65} y2={16.65} />
            </svg>
        );
    };
}
