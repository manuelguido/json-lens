# JSON Lens

JSON Lens is a browser-based workspace for understanding and editing JSON payloads. It is for the moments when a document is too nested for a plain text editor but too ad hoc to justify writing a custom script.

The app lets you paste, upload, search, edit, visualize, and export JSON without sending the document to an external API. It works well for API responses, webhook bodies, exported settings, package manifests, fixture data, and other payloads that need quick inspection.

## Why It Exists

Large JSON payloads are easy to receive and awkward to understand. They usually lead to the same questions:

- Where is this field in the object?
- Is it inside an array?
- How deep is this branch?
- What does this subtree contain?
- Can I safely copy this value or path?
- Can I make a quick edit and export the result?

JSON Lens gives those answers in an IDE-like interface with a tree, graph view, inspector, search palette, and import/export workflow.

## What The App Supports

### Import

- Paste raw JSON into the import dialog.
- Upload a `.json` file.
- Drop a JSON file anywhere on the screen.
- Load bundled sample datasets for API responses, package manifests, and geo collections.

Invalid JSON is reported without replacing the current document.

### Explore

- Virtualized tree view for visible rows.
- Expand and collapse individual containers.
- Expand all and collapse all controls.
- Document statistics: byte size, node count, object count, array count, primitive count, and max depth.
- Right-side inspector with selected path, value metadata, byte size, preview, and copy actions.
- JSONPath-style display paths such as `$`, `$.data[0].id`, and bracket notation for keys that require escaping.

### Search

- Debounced case-insensitive search across the full document, including collapsed branches.
- Key and primitive-value matches.
- Active-match navigation.
- Automatic ancestor expansion and scrolling in tree view.
- Search-aware centering in graph view.

### Edit

- Primitive value editing from tree rows.
- Object key rename for object properties.
- Add object properties and array items from the inspector.
- Duplicate or delete nodes.
- Copy selected path or value.
- Undo and redo with a 100-snapshot history limit.

Values are stored as pure JSON. Editing helpers parse JSON literals where appropriate, so values such as `true`, `null`, `123`, and quoted strings retain their intended type.

### Visualize

- Switch between tree view and graph view.
- Pan and zoom the graph canvas.
- Fit or reset the graph viewport.
- Focus on a subtree.
- Use the minimap and breadcrumbs to stay oriented.
- Render large arrays in graph view with a cap so the layout remains usable.

### Export

- Copy formatted JSON.
- Export pretty JSON.
- Export minified JSON.
- Download the current document.

## Implementation Notes

Laravel serves the Inertia page; the document model, search index, graph layout, undo stack, and browser persistence live in the Vue application.

JSON Lens is intentionally client-heavy. The Laravel side has one route:

```php
Route::inertia('/', 'Editor')->name('home');
```

The important application logic lives in `resources/js`:

```text
resources/js/pages/Editor.vue
    Root workspace: toolbar, explorer, tree/graph viewport, inspector,
    dialogs, drag/drop overlay, search palette, and toasts.

resources/js/composables/useJsonStore.ts
    Shared document state, flattening, metadata, mutations, undo/redo,
    and localStorage persistence.

resources/js/composables/useJsonSearch.ts
    Full-document search for keys and primitive values.

resources/js/lib/jsonPath.ts
    Path encoding, path display, immutable get/set/delete helpers,
    key rename, value kind detection, and previews.

resources/js/lib/graphLayout.ts
    Hierarchical graph layout used by the graph canvas.

resources/js/components/json/
    Virtualized tree and individual row interactions.

resources/js/components/graph/
    Graph canvas, graph nodes, minimap, and breadcrumbs.

resources/js/components/dialogs/
    Import, export, and shortcut dialogs.
```

The document itself is held in a `shallowRef`. Mutations replace the document reference through immutable helper functions. That keeps Vue reactivity predictable while avoiding deep tracking on large JSON trees.

## Persistence Model

JSON Lens uses `localStorage` for convenience:

- `json-lens:state:v1` stores the document, expanded row ids, selected row, and source label.
- `json-lens:ui:v1` stores view mode and edit-mode preference.

There is no backend document storage, authentication, sharing, or sync. Refreshing the browser preserves the last local document; cloning the repository does not include any user documents.

## Stack

| Layer | Tools |
| --- | --- |
| Backend | Laravel 13, Inertia Laravel |
| Frontend | Vue 3, TypeScript, Vite, Tailwind CSS 4 |
| State | Vue composables and module-scoped refs |
| Quality | PHPUnit, Pint, ESLint, Prettier, vue-tsc |

## Requirements

- PHP 8.3+
- Composer
- Node.js and npm. The GitHub workflow uses Node 22.
- A database connection configured in `.env` for Laravel migrations.

## Install Locally

```bash
composer install
npm ci
cp .env.example .env
php artisan key:generate
```

Configure the database connection in `.env` before running migrations.

```bash
php artisan migrate
```

Build the frontend once:

```bash
npm run build
```

Run the full local development stack:

```bash
composer dev
```

Or run Laravel and Vite separately:

```bash
php artisan serve
npm run dev
```

## Useful Commands

Run backend tests and PHP style checks:

```bash
composer test
composer lint:check
```

Run frontend checks:

```bash
npm run lint:check
npm run format:check
npm run types:check
```

Apply local formatting fixes:

```bash
composer lint
npm run lint:fix
npm run format
```

Run the combined check script defined in `composer.json`:

```bash
composer ci:check
```

## Current Limits

- The app only accepts valid JSON, not JSON5 or JavaScript object literals.
- The graph view caps very large arrays to keep the canvas usable.
- Documents are local to the browser.
- There is no schema inference, validation, diffing, or collaboration layer in this repository.
- The JSON path, mutation, and graph-layout logic would benefit from focused unit coverage.

## Contributing

The most useful contributions keep the tool fast and predictable:

- add tests around JSON path mutation helpers
- improve graph layout behavior for large or wide documents
- extend import/export options without adding server persistence
- tighten keyboard and screen-reader behavior
- keep document operations JSON-safe and reversible

Before opening a pull request, run:

```bash
composer ci:check
npm run build
```

## License

JSON Lens is open-sourced under the MIT license. See `LICENSE`.
