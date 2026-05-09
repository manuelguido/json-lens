/**
 * Core types for JSON Lens.
 *
 * We intentionally keep a single source of truth — these types are used by
 * the flattener, search engine, inspector, and edit operations.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
    | JsonPrimitive
    | JsonValue[]
    | { [key: string]: JsonValue };

export type JsonValueKind =
    | 'object'
    | 'array'
    | 'string'
    | 'number'
    | 'boolean'
    | 'null';

/**
 * A path into a JSON document, expressed as the sequence of keys/indexes
 * traversed from the root. The empty array refers to the root itself.
 */
export type JsonPath = ReadonlyArray<string | number>;

/**
 * A flattened, render-ready row produced by the flattener.
 * One row corresponds to one visible line in the visualizer.
 */
export interface TreeRow {
    /** Stable id derived from the path — used as Vue key. */
    id: string;
    /** Path to the value this row represents. */
    path: JsonPath;
    /** The key under the parent (string for objects, number for arrays). Null for root. */
    keyLabel: string | null;
    /** Whether parent is array (affects key rendering). */
    parentKind: 'object' | 'array' | 'root';
    /** Kind of the value on this row. */
    kind: JsonValueKind;
    /** Indentation depth (root = 0). */
    depth: number;
    /** Whether this is a container (object/array). */
    isContainer: boolean;
    /** Number of children (containers only). */
    childCount: number;
    /** Whether this container is currently expanded. */
    expanded: boolean;
    /** Inline preview for collapsed containers / leaves. */
    preview: string;
    /** Raw primitive value for leaves (used by inline editor). */
    rawValue?: JsonPrimitive;
}

export interface SearchMatch {
    /** Row id this match belongs to. */
    rowId: string;
    /** Path of the matching row. */
    path: JsonPath;
    /** Field where match occurred. */
    field: 'key' | 'value';
}

export interface DocumentMeta {
    bytes: number;
    nodeCount: number;
    objectCount: number;
    arrayCount: number;
    primitiveCount: number;
    maxDepth: number;
}
