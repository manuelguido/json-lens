/**
 * Hierarchical horizontal layout for the graph view.
 *
 * Algorithm: classic recursive subtree-height layout (a simplified
 * Reingold–Tilford). We compute each container's vertical extent bottom-up,
 * then place each child centered within its allocated band so children of a
 * single parent sit visually grouped, and no two nodes overlap.
 *
 * The layout intentionally honors the store's `expanded` set — collapsed
 * containers contribute one node only, mirroring tree-view behavior.
 */

import { kindOf, pathToId, previewOf } from '@/lib/jsonPath';
import type { JsonPath, JsonValue, JsonValueKind } from '@/lib/types';

export const GRAPH_NODE_W = 224;
export const GRAPH_NODE_H = 56;
export const GRAPH_LEVEL_GAP = 72;
export const GRAPH_SIBLING_GAP = 14;

export interface GraphNode {
    id: string;
    parentId: string | null;
    path: JsonPath;
    keyLabel: string | null;
    parentKind: 'object' | 'array' | 'root';
    kind: JsonValueKind;
    depth: number;
    isContainer: boolean;
    expanded: boolean;
    childCount: number;
    preview: string;
    rawValue?: string | number | boolean | null;
    /** Center-x of node card. */
    x: number;
    /** Center-y of node card. */
    y: number;
}

export interface GraphEdge {
    id: string;
    fromId: string;
    toId: string;
    /** Endpoints (right side of parent, left side of child). */
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
}

export interface GraphLayout {
    nodes: GraphNode[];
    edges: GraphEdge[];
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface RawNode {
    out: GraphNode;
    children: RawNode[];
    height: number; // total vertical extent of subtree
}

export function layoutGraph(
    root: JsonValue,
    rootPath: JsonPath,
    expanded: ReadonlySet<string>,
): GraphLayout {
    const raw = build(root, rootPath, 'root', null, rootPath.length, expanded);
    position(raw, 0, 0);

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

    walk(raw, null, nodes, edges);

    for (const n of nodes) {
        if (n.x - GRAPH_NODE_W / 2 < minX) {
            minX = n.x - GRAPH_NODE_W / 2;
        }

        if (n.x + GRAPH_NODE_W / 2 > maxX) {
            maxX = n.x + GRAPH_NODE_W / 2;
        }

        if (n.y - GRAPH_NODE_H / 2 < minY) {
            minY = n.y - GRAPH_NODE_H / 2;
        }

        if (n.y + GRAPH_NODE_H / 2 > maxY) {
            maxY = n.y + GRAPH_NODE_H / 2;
        }
    }

    if (!Number.isFinite(minX)) {
        minX = -GRAPH_NODE_W / 2;
        maxX = GRAPH_NODE_W / 2;
        minY = -GRAPH_NODE_H / 2;
        maxY = GRAPH_NODE_H / 2;
    }

    return { nodes, edges, bounds: { minX, minY, maxX, maxY } };
}

function build(
    value: JsonValue,
    path: JsonPath,
    parentKind: 'object' | 'array' | 'root',
    keyLabel: string | null,
    rootDepth: number,
    expanded: ReadonlySet<string>,
): RawNode {
    const kind = kindOf(value);
    const id = pathToId(path);
    const isContainer = kind === 'object' || kind === 'array';
    const isExpanded = isContainer && expanded.has(id);
    const childCount = isContainer
        ? kind === 'array'
            ? (value as JsonValue[]).length
            : Object.keys(value as Record<string, JsonValue>).length
        : 0;

    const out: GraphNode = {
        id,
        parentId: null,
        path,
        keyLabel,
        parentKind,
        kind,
        depth: path.length - rootDepth,
        isContainer,
        expanded: isExpanded,
        childCount,
        preview: previewOf(value, kind),
        rawValue: isContainer
            ? undefined
            : (value as string | number | boolean | null),
        x: 0,
        y: 0,
    };

    const children: RawNode[] = [];

    if (isContainer && isExpanded) {
        if (kind === 'array') {
            const arr = value as JsonValue[];
            // Cap arrays in the graph view to keep layouts useful — the user
            // can drill in via tree view for the full range.
            const cap = 200;
            const limit = Math.min(arr.length, cap);

            for (let i = 0; i < limit; i++) {
                children.push(
                    build(
                        arr[i],
                        [...path, i],
                        'array',
                        String(i),
                        rootDepth,
                        expanded,
                    ),
                );
            }

            if (arr.length > cap) {
                children.push(makeOverflowNode(path, arr.length - cap));
            }
        } else {
            const obj = value as Record<string, JsonValue>;

            for (const k of Object.keys(obj)) {
                children.push(
                    build(
                        obj[k],
                        [...path, k],
                        'object',
                        k,
                        rootDepth,
                        expanded,
                    ),
                );
            }
        }
    }

    let height: number;

    if (children.length === 0) {
        height = GRAPH_NODE_H;
    } else {
        height =
            children.reduce((s, c) => s + c.height, 0) +
            GRAPH_SIBLING_GAP * (children.length - 1);

        if (height < GRAPH_NODE_H) {
            height = GRAPH_NODE_H;
        }
    }

    return { out, children, height };
}

function makeOverflowNode(parentPath: JsonPath, hidden: number): RawNode {
    const id = pathToId([...parentPath, '__overflow__']);

    return {
        out: {
            id,
            parentId: null,
            path: parentPath,
            keyLabel: `+${hidden} more`,
            parentKind: 'array',
            kind: 'null',
            depth: 0,
            isContainer: false,
            expanded: false,
            childCount: 0,
            preview: 'truncated',
            x: 0,
            y: 0,
        },
        children: [],
        height: GRAPH_NODE_H,
    };
}

function position(node: RawNode, x: number, yCenter: number): void {
    node.out.x = x;
    node.out.y = yCenter;

    if (node.children.length === 0) {
        return;
    }

    const childX = x + GRAPH_NODE_W + GRAPH_LEVEL_GAP;
    let cursor = yCenter - node.height / 2;

    for (const child of node.children) {
        const cy = cursor + child.height / 2;
        position(child, childX, cy);
        cursor += child.height + GRAPH_SIBLING_GAP;
    }
}

function walk(
    raw: RawNode,
    parentId: string | null,
    nodes: GraphNode[],
    edges: GraphEdge[],
): void {
    raw.out.parentId = parentId;
    nodes.push(raw.out);

    for (const c of raw.children) {
        edges.push({
            id: `${raw.out.id}->${c.out.id}`,
            fromId: raw.out.id,
            toId: c.out.id,
            fromX: raw.out.x + GRAPH_NODE_W / 2,
            fromY: raw.out.y,
            toX: c.out.x - GRAPH_NODE_W / 2,
            toY: c.out.y,
        });
        walk(c, raw.out.id, nodes, edges);
    }
}

/** Build an SVG cubic-bezier path between two points (right-to-left flow). */
export function edgePath(e: GraphEdge): string {
    const dx = Math.max(40, (e.toX - e.fromX) * 0.5);
    const c1x = e.fromX + dx;
    const c2x = e.toX - dx;

    return `M ${e.fromX} ${e.fromY} C ${c1x} ${e.fromY}, ${c2x} ${e.toY}, ${e.toX} ${e.toY}`;
}
