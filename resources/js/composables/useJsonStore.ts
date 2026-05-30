import { computed, ref, shallowRef, watch } from 'vue';
import {
    deleteAtPath,
    getAtPath,
    kindOf,
    pathToId,
    previewOf,
    renameKey,
    setAtPath,
} from '@/lib/jsonPath';
import type { DocumentMeta, JsonPath, JsonValue, TreeRow } from '@/lib/types';

/**
 * Single-file SPA store. Module-scoped so all components share the same
 * reactive state without a heavyweight state library.
 */

const STORAGE_KEY = 'json-lens:state:v1';
const HISTORY_LIMIT = 100;

interface PersistedState {
    document: JsonValue | null;
    expanded: string[];
    selectedId: string | null;
    sourceLabel: string | null;
}

/* ---------- Reactive state ---------- */

// shallowRef for the document — the data tree itself is plain JS, we only
// need reactivity on the *reference*, not deep tracking. This keeps perf
// excellent for very large documents.
const document = shallowRef<JsonValue | null>(null);
const sourceLabel = ref<string | null>(null);
const error = ref<string | null>(null);
const selectedId = ref<string | null>(null);
const expanded = ref<Set<string>>(new Set(['$']));

// Undo/redo stacks store snapshots of (document + expanded + selection).
interface Snapshot {
    document: JsonValue | null;
    expanded: string[];
    selectedId: string | null;
}
const undoStack: Snapshot[] = [];
const redoStack: Snapshot[] = [];

// "Dirty" flag to suppress persistence during initial hydration.
let hydrated = false;

/* ---------- Flattening ---------- */

const expandedVersion = ref(0); // bump to recompute flatten cheaply

function bumpExpanded() {
    expandedVersion.value++;
}

function flatten(root: JsonValue | null): TreeRow[] {
    if (root === null || root === undefined) {
        return [];
    }

    const rows: TreeRow[] = [];
    walk(root, [], 'root', null, 0, rows);

    return rows;
}

function walk(
    value: JsonValue,
    path: JsonPath,
    parentKind: 'object' | 'array' | 'root',
    keyLabel: string | null,
    depth: number,
    out: TreeRow[],
): void {
    const kind = kindOf(value);
    const id = pathToId(path);
    const isContainer = kind === 'object' || kind === 'array';
    const childCount = isContainer
        ? kind === 'array'
            ? (value as JsonValue[]).length
            : Object.keys(value as Record<string, JsonValue>).length
        : 0;
    const isExpanded = isContainer && expanded.value.has(id);
    out.push({
        id,
        path,
        keyLabel,
        parentKind,
        kind,
        depth,
        isContainer,
        childCount,
        expanded: isExpanded,
        preview: previewOf(value, kind),
        rawValue: isContainer
            ? undefined
            : (value as string | number | boolean | null),
    });

    if (!isContainer || !isExpanded) {
        return;
    }

    if (kind === 'array') {
        const arr = value as JsonValue[];

        for (let i = 0; i < arr.length; i++) {
            walk(arr[i], [...path, i], 'array', String(i), depth + 1, out);
        }
    } else {
        const obj = value as Record<string, JsonValue>;

        for (const k of Object.keys(obj)) {
            walk(obj[k], [...path, k], 'object', k, depth + 1, out);
        }
    }
}

const rows = computed<TreeRow[]>(() => {
    // Track both: direct ref change and in-place mutation bumps.
    void expanded.value;
    void expandedVersion.value;

    return flatten(document.value);
});

/* ---------- Document meta ---------- */

const meta = computed<DocumentMeta>(() => {
    const m: DocumentMeta = {
        bytes: 0,
        nodeCount: 0,
        objectCount: 0,
        arrayCount: 0,
        primitiveCount: 0,
        maxDepth: 0,
    };

    if (document.value === null) {
        return m;
    }

    try {
        m.bytes = new TextEncoder().encode(
            JSON.stringify(document.value),
        ).length;
    } catch {
        m.bytes = 0;
    }

    countNodes(document.value, 0, m);

    return m;
});

function countNodes(v: JsonValue, depth: number, m: DocumentMeta): void {
    m.nodeCount++;

    if (depth > m.maxDepth) {
        m.maxDepth = depth;
    }

    if (Array.isArray(v)) {
        m.arrayCount++;

        for (const item of v) {
            countNodes(item, depth + 1, m);
        }
    } else if (v !== null && typeof v === 'object') {
        m.objectCount++;

        for (const k of Object.keys(v)) {
            countNodes((v as Record<string, JsonValue>)[k], depth + 1, m);
        }
    } else {
        m.primitiveCount++;
    }
}

/* ---------- Mutations ---------- */

function snapshot(): Snapshot {
    return {
        document: document.value,
        expanded: [...expanded.value],
        selectedId: selectedId.value,
    };
}

function pushHistory() {
    undoStack.push(snapshot());

    if (undoStack.length > HISTORY_LIMIT) {
        undoStack.shift();
    }

    redoStack.length = 0;
}

function applySnapshot(s: Snapshot) {
    document.value = s.document;
    expanded.value = new Set(s.expanded);
    selectedId.value = s.selectedId;
    bumpExpanded();
}

function setDocument(value: JsonValue | null, label: string | null = null) {
    pushHistory();
    document.value = value;
    sourceLabel.value = label;
    error.value = null;
    // Auto-expand root + first level
    const next = new Set<string>();
    next.add('$');

    if (value !== null && typeof value === 'object') {
        if (Array.isArray(value)) {
            for (let i = 0; i < Math.min(value.length, 25); i++) {
                /* leave children collapsed */ void i;
            }
        }
    }

    expanded.value = next;
    selectedId.value = '$';
    bumpExpanded();
}

function loadFromString(raw: string, label: string | null = null): boolean {
    try {
        const parsed = JSON.parse(raw) as JsonValue;
        setDocument(parsed, label);

        return true;
    } catch (e) {
        error.value = e instanceof Error ? e.message : 'Invalid JSON';

        return false;
    }
}

function clear() {
    pushHistory();
    document.value = null;
    sourceLabel.value = null;
    selectedId.value = null;
    expanded.value = new Set(['$']);
    error.value = null;
    bumpExpanded();
}

function toggleExpand(id: string) {
    if (expanded.value.has(id)) {
        expanded.value.delete(id);
    } else {
        expanded.value.add(id);
    }

    bumpExpanded();
}

function expandAll() {
    if (document.value === null) {
        return;
    }

    const next = new Set<string>();
    walkContainerIds(document.value, [], next);
    expanded.value = next;
    bumpExpanded();
}

function collapseAll() {
    expanded.value = new Set(['$']);
    bumpExpanded();
}

function expandAncestors(path: JsonPath) {
    const next = new Set(expanded.value);

    for (let i = 0; i < path.length; i++) {
        next.add(pathToId(path.slice(0, i)));
    }

    expanded.value = next;
}

function walkContainerIds(v: JsonValue, path: JsonPath, out: Set<string>) {
    if (v !== null && typeof v === 'object') {
        out.add(pathToId(path));

        if (Array.isArray(v)) {
            for (let i = 0; i < v.length; i++) {
                walkContainerIds(v[i], [...path, i], out);
            }
        } else {
            for (const k of Object.keys(v)) {
                walkContainerIds(
                    (v as Record<string, JsonValue>)[k],
                    [...path, k],
                    out,
                );
            }
        }
    }
}

function select(id: string | null) {
    selectedId.value = id;
}

function updateValue(path: JsonPath, value: JsonValue) {
    if (document.value === null) {
        return;
    }

    pushHistory();
    document.value = setAtPath(document.value, path, value);
}

function deleteNode(path: JsonPath) {
    if (document.value === null || path.length === 0) {
        return;
    }

    pushHistory();
    document.value = deleteAtPath(document.value, path);
    // Move selection up to parent.
    selectedId.value = pathToId(path.slice(0, -1));
}

function renameNodeKey(parentPath: JsonPath, oldKey: string, newKey: string) {
    if (document.value === null || oldKey === newKey) {
        return;
    }

    pushHistory();
    document.value = renameKey(document.value, parentPath, oldKey, newKey);
    selectedId.value = pathToId([...parentPath, newKey]);
}

function addProperty(parentPath: JsonPath, key: string, value: JsonValue) {
    if (document.value === null) {
        return;
    }

    const parent = getAtPath(document.value, parentPath);

    if (!parent || typeof parent !== 'object' || Array.isArray(parent)) {
        return;
    }

    pushHistory();
    document.value = setAtPath(document.value, [...parentPath, key], value);
    expanded.value.add(pathToId(parentPath));
    selectedId.value = pathToId([...parentPath, key]);
    bumpExpanded();
}

function appendItem(arrayPath: JsonPath, value: JsonValue) {
    if (document.value === null) {
        return;
    }

    const arr = getAtPath(document.value, arrayPath);

    if (!Array.isArray(arr)) {
        return;
    }

    pushHistory();
    document.value = setAtPath(
        document.value,
        [...arrayPath, arr.length],
        value,
    );
    expanded.value.add(pathToId(arrayPath));
    bumpExpanded();
}

function duplicateNode(path: JsonPath) {
    if (document.value === null || path.length === 0) {
        return;
    }

    const parentPath = path.slice(0, -1);
    const parent = getAtPath(document.value, parentPath);
    const value = getAtPath(document.value, path);

    if (value === undefined || parent === undefined || parent === null) {
        return;
    }

    // Deep clone via JSON round-trip — values are pure JSON.
    let clone: JsonValue;

    try {
        clone = JSON.parse(JSON.stringify(value)) as JsonValue;
    } catch {
        return;
    }

    pushHistory();
    const lastSeg = path[path.length - 1];

    if (Array.isArray(parent) && typeof lastSeg === 'number') {
        const arr = parent.slice();
        arr.splice(lastSeg + 1, 0, clone);
        document.value = setAtPath(document.value, parentPath, arr);
        selectedId.value = pathToId([...parentPath, lastSeg + 1]);
    } else if (
        parent &&
        typeof parent === 'object' &&
        !Array.isArray(parent) &&
        typeof lastSeg === 'string'
    ) {
        let candidate = `${lastSeg}_copy`;
        const obj = parent as Record<string, JsonValue>;
        let i = 2;

        while (Object.prototype.hasOwnProperty.call(obj, candidate)) {
            candidate = `${lastSeg}_copy_${i++}`;
        }

        document.value = setAtPath(
            document.value,
            [...parentPath, candidate],
            clone,
        );
        selectedId.value = pathToId([...parentPath, candidate]);
    }

    bumpExpanded();
}

function undo() {
    if (undoStack.length === 0) {
        return;
    }

    redoStack.push(snapshot());
    const prev = undoStack.pop()!;
    applySnapshot(prev);
}

function redo() {
    if (redoStack.length === 0) {
        return;
    }

    undoStack.push(snapshot());
    const next = redoStack.pop()!;
    applySnapshot(next);
}

const canUndo = computed(() => undoStack.length > 0);
const canRedo = computed(() => redoStack.length > 0);

/* ---------- Persistence ---------- */

function persist() {
    if (!hydrated) {
        return;
    }

    if (typeof window === 'undefined') {
        return;
    }

    try {
        const data: PersistedState = {
            document: document.value,
            expanded: [...expanded.value],
            selectedId: selectedId.value,
            sourceLabel: sourceLabel.value,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        /* quota exceeded — silently ignore */
    }
}

function hydrate() {
    if (typeof window === 'undefined') {
        hydrated = true;

        return;
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (raw) {
            const parsed = JSON.parse(raw) as PersistedState;
            document.value = parsed.document ?? null;
            expanded.value = new Set(parsed.expanded ?? ['$']);
            selectedId.value = parsed.selectedId ?? null;
            sourceLabel.value = parsed.sourceLabel ?? null;
        }
    } catch {
        /* corrupt state — ignore */
    } finally {
        hydrated = true;
    }
}

let watcherStarted = false;
function startPersistence() {
    if (watcherStarted) {
        return;
    }

    watcherStarted = true;
    watch([document, selectedId, sourceLabel, expandedVersion], persist, {
        flush: 'post',
    });
}

/* ---------- Public API ---------- */

export function useJsonStore() {
    return {
        // state
        document,
        sourceLabel,
        error,
        selectedId,
        expanded,
        rows,
        meta,
        canUndo,
        canRedo,
        // actions
        setDocument,
        loadFromString,
        clear,
        toggleExpand,
        expandAll,
        collapseAll,
        expandAncestors,
        select,
        updateValue,
        deleteNode,
        renameNodeKey,
        addProperty,
        appendItem,
        duplicateNode,
        undo,
        redo,
        // lifecycle
        hydrate,
        startPersistence,
    };
}

export function getDocumentSnapshot(): JsonValue | null {
    return document.value;
}
