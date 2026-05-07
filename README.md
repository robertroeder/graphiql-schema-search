# graphiql-schema-search

A schema search plugin for [GraphiQL](https://github.com/graphql/graphiql). Browse and search types, fields, and root operations with virtual scrolling, deep-linking via URL hash, and browser back/forward support.

## Install

```bash
npm install graphiql-schema-search
```

### Peer dependencies

This package requires the following peer dependencies in your project:

- `react` >= 17
- `react-dom` >= 17
- `@emotion/react` >= 11
- `@graphiql/react` >= 0.20
- `graphql` >= 15

## Usage

```tsx
import { getSchemaSearchPlugin } from 'graphiql-schema-search';
import 'graphiql-schema-search/dist/index.css';

const { plugin, isSchemaSearchActive } = getSchemaSearchPlugin();

function App() {
  return (
    <GraphiQL
      plugins={[plugin]}
      visiblePlugin={isSchemaSearchActive() ? plugin : undefined}
    />
  );
}
```

### Hash prefix

If you need to namespace the URL hash parameters (e.g. to avoid collisions with other tools), pass a prefix:

```tsx
const { plugin, isSchemaSearchActive } = getSchemaSearchPlugin('myprefix_');
// Hash params will be: #myprefix_type=Query&myprefix_q=user
```

With no prefix (default), params are unprefixed: `#type=Query&q=user`.

## Features

- Full-text search across types and fields
- Filter by kind (Object, Input, Enum, Interface, Union, Scalar)
- Filter by section (Root Operations, Types, Fields)
- Type detail view with field list
- URL hash-based navigation with deep-linking
- Browser back/forward support
- Virtual scrolling for large schemas

## Development

```bash
npm install --legacy-peer-deps
npm run build        # one-time build
npm run dev          # watch mode
```

## Publishing

Tag a version and push — GitHub Actions will build and publish to npm:

```bash
npm version patch    # or minor, major
git push --follow-tags
```

## License

MIT
