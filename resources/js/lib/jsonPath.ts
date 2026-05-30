import type { JsonPath, JsonValue, JsonValueKind } from './types';

export function kindOf(v: unknown): JsonValueKind {
    if (v === null) {
        return 'null';
    }

    if (Array.isArray(v)) {
        return 'array';
    }

    const t = typeof v;

    if (t === 'string' || t === 'number' || t === 'boolean') {
        return t;
    }

    if (t === 'object') {
        return 'object';
    }

    return 'null';
}

export function isContainerKind(k: JsonValueKind): boolean {
    return k === 'object' || k === 'array';
}

/** Encode a path to a stable, unique row id. */
export function pathToId(path: JsonPath): string {
    if (path.length === 0) {
        return '$';
    }

    return (
        '$' +
        path
            .map((seg) =>
                typeof seg === 'number'
                    ? `[${seg}]`
                    : `.${String(seg).replace(/[\\.[\]]/g, (c) => '\\' + c)}`,
            )
            .join('')
    );
}

/** Render a JSONPath-ish string for display in the inspector. */
export function pathToDisplay(path: JsonPath): string {
    if (path.length === 0) {
        return '$';
    }

    return (
        '$' +
        path
            .map((seg) => {
                if (typeof seg === 'number') {
                    return `[${seg}]`;
                }

                if (/^[A-Za-z_$][\w$]*$/.test(seg)) {
                    return `.${seg}`;
                }

                return `[${JSON.stringify(seg)}]`;
            })
            .join('')
    );
}

/** Read a value by path. Returns undefined if path is invalid. */
export function getAtPath(
    root: JsonValue,
    path: JsonPath,
): JsonValue | undefined {
    let cur: JsonValue | undefined = root;

    for (const seg of path) {
        if (cur === null || cur === undefined) {
            return undefined;
        }

        if (typeof seg === 'number') {
            if (!Array.isArray(cur)) {
                return undefined;
            }

            cur = cur[seg];
        } else {
            if (typeof cur !== 'object' || Array.isArray(cur)) {
                return undefined;
            }

            cur = (cur as Record<string, JsonValue>)[seg];
        }
    }

    return cur;
}

/** Immutably set a value at a path. */
export function setAtPath(
    root: JsonValue,
    path: JsonPath,
    value: JsonValue,
): JsonValue {
    if (path.length === 0) {
        return value;
    }

    return setRecursive(root, path, 0, value);
}

function setRecursive(
    node: JsonValue,
    path: JsonPath,
    i: number,
    value: JsonValue,
): JsonValue {
    if (i === path.length) {
        return value;
    }

    const seg = path[i];

    if (typeof seg === 'number') {
        const arr = Array.isArray(node) ? node.slice() : [];
        arr[seg] = setRecursive(arr[seg] ?? null, path, i + 1, value);

        return arr;
    }

    const obj =
        node && typeof node === 'object' && !Array.isArray(node)
            ? { ...(node as Record<string, JsonValue>) }
            : {};
    obj[seg] = setRecursive(obj[seg] ?? null, path, i + 1, value);

    return obj;
}

/** Immutably remove a value at a path. */
export function deleteAtPath(root: JsonValue, path: JsonPath): JsonValue {
    if (path.length === 0) {
        return null;
    }

    return deleteRecursive(root, path, 0);
}

function deleteRecursive(
    node: JsonValue,
    path: JsonPath,
    i: number,
): JsonValue {
    const seg = path[i];

    if (i === path.length - 1) {
        if (typeof seg === 'number' && Array.isArray(node)) {
            const arr = node.slice();
            arr.splice(seg, 1);

            return arr;
        }

        if (
            typeof seg === 'string' &&
            node &&
            typeof node === 'object' &&
            !Array.isArray(node)
        ) {
            const obj = { ...(node as Record<string, JsonValue>) };
            delete obj[seg];

            return obj;
        }

        return node;
    }

    if (typeof seg === 'number' && Array.isArray(node)) {
        const arr = node.slice();
        arr[seg] = deleteRecursive(arr[seg], path, i + 1);

        return arr;
    }

    if (
        typeof seg === 'string' &&
        node &&
        typeof node === 'object' &&
        !Array.isArray(node)
    ) {
        const obj = { ...(node as Record<string, JsonValue>) };
        obj[seg] = deleteRecursive(obj[seg], path, i + 1);

        return obj;
    }

    return node;
}

/** Rename a key on the parent object at the given parent path. */
export function renameKey(
    root: JsonValue,
    parentPath: JsonPath,
    oldKey: string,
    newKey: string,
): JsonValue {
    if (oldKey === newKey) {
        return root;
    }

    const parent = getAtPath(root, parentPath);

    if (!parent || typeof parent !== 'object' || Array.isArray(parent)) {
        return root;
    }

    // Preserve insertion order: rebuild the object swapping the key in place.
    const next: Record<string, JsonValue> = {};

    for (const [k, v] of Object.entries(parent as Record<string, JsonValue>)) {
        next[k === oldKey ? newKey : k] = v;
    }

    return setAtPath(root, parentPath, next);
}

/** Build a one-line preview for any value. */
export function previewOf(
    value: JsonValue,
    kind: JsonValueKind,
    max = 60,
): string {
    if (kind === 'object') {
        const keys = Object.keys(value as Record<string, JsonValue>);

        if (keys.length === 0) {
            return '{ }';
        }

        return `{ ${keys.length} ${keys.length === 1 ? 'key' : 'keys'} }`;
    }

    if (kind === 'array') {
        const len = (value as JsonValue[]).length;

        return `[ ${len} ${len === 1 ? 'item' : 'items'} ]`;
    }

    if (kind === 'null') {
        return 'null';
    }

    if (kind === 'string') {
        const s = value as string;
        const trimmed = s.length > max ? s.slice(0, max) + '…' : s;

        return JSON.stringify(trimmed);
    }

    return String(value);
}

/**
 * Try to parse a JSON literal entered by the user as the new value for a
 * primitive node. Falls back to a string for non-JSON input.
 */
export function parseEditedValue(raw: string): JsonValue {
    const trimmed = raw.trim();

    if (trimmed === '') {
        return '';
    }

    if (trimmed === 'null') {
        return null;
    }

    if (trimmed === 'true') {
        return true;
    }

    if (trimmed === 'false') {
        return false;
    }

    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
        const n = Number(trimmed);

        if (Number.isFinite(n)) {
            return n;
        }
    }

    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        trimmed.startsWith('[') ||
        trimmed.startsWith('{')
    ) {
        try {
            return JSON.parse(trimmed) as JsonValue;
        } catch {
            /* fall through */
        }
    }

    return raw;
}
