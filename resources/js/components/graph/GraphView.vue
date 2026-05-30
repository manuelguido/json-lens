<script setup lang="ts">
/**
 * Main graph canvas. Pan/zoom via wheel + drag, custom hierarchical layout,
 * SVG edges, HTML node cards, optional minimap, breadcrumbs, edit-mode banner.
 *
 * The graph reads & writes the same `useJsonStore` selection / expanded state
 * as the tree view, so the two views stay perfectly in sync.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Icon from '@/components/common/Icon.vue';
import { useContextMenu } from '@/composables/useContextMenu';
import { useGraphViewport } from '@/composables/useGraphViewport';
import { useHotkeys } from '@/composables/useHotkeys';
import { useJsonSearch } from '@/composables/useJsonSearch';
import { useJsonStore } from '@/composables/useJsonStore';
import { useToasts } from '@/composables/useToasts';
import { useUiState } from '@/composables/useUiState';
import {
    edgePath,
    GRAPH_NODE_H,
    GRAPH_NODE_W,
    layoutGraph,
} from '@/lib/graphLayout';
import type { GraphNode as GraphNodeT } from '@/lib/graphLayout';
import { getAtPath, parseEditedValue, pathToId } from '@/lib/jsonPath';
import type { JsonValue } from '@/lib/types';
import GraphBreadcrumbs from './GraphBreadcrumbs.vue';
import GraphMinimap from './GraphMinimap.vue';
import GraphNode from './GraphNode.vue';

const store = useJsonStore();
const ui = useUiState();
const search = useJsonSearch();
const ctx = useContextMenu();
const toasts = useToasts();
const viewport = useGraphViewport();

const canvas = ref<HTMLDivElement | null>(null);
const viewportSize = ref({ w: 0, h: 0 });
const isPanning = ref(false);

let panStart: { x: number; y: number; px: number; py: number } | null = null;
let resizeObserver: ResizeObserver | null = null;
let didInitialFit = false;

/* ---------- Layout (cached, recomputed only on document/expanded change) ---------- */

const layout = computed(() => {
    const doc = store.document.value;

    if (doc === null) {
        return {
            nodes: [],
            edges: [],
            bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        };
    }

    let rootValue: JsonValue = doc;
    let rootPath: ReadonlyArray<string | number> = [];

    if (ui.state.focusedRootId) {
        // Re-derive the focused subtree from the current document.
        const focusedNode = findNodeIdToPath(ui.state.focusedRootId, doc);

        if (focusedNode !== null) {
            const v = getAtPath(doc, focusedNode);

            if (v !== undefined) {
                rootValue = v;
                rootPath = focusedNode;
            }
        }
    }

    return layoutGraph(rootValue, rootPath, store.expanded.value);
});

/** Decode a node id back to a path by linear scan of the full doc. */
function findNodeIdToPath(
    id: string,
    doc: JsonValue,
): ReadonlyArray<string | number> | null {
    if (id === '$') {
        return [];
    }

    let result: ReadonlyArray<string | number> | null = null;

    function walk(v: JsonValue, p: ReadonlyArray<string | number>): boolean {
        if (pathToId(p) === id) {
            result = p;

            return true;
        }

        if (Array.isArray(v)) {
            for (let i = 0; i < v.length; i++) {
                if (walk(v[i], [...p, i])) {
                    return true;
                }
            }
        } else if (v !== null && typeof v === 'object') {
            const obj = v as Record<string, JsonValue>;

            for (const k of Object.keys(obj)) {
                if (walk(obj[k], [...p, k])) {
                    return true;
                }
            }
        }

        return false;
    }

    walk(doc, []);

    return result;
}

const matchedIds = computed(() => search.matchedRowIds.value);

/* ---------- Culling ---------- */

const visibleNodes = computed(() => {
    const { w, h } = viewportSize.value;

    if (w === 0 || h === 0) {
        return layout.value.nodes;
    }

    // Convert viewport (in screen px) to world AABB.
    const z = viewport.zoom.value;
    const minX = -viewport.panX.value / z - GRAPH_NODE_W;
    const maxX = (w - viewport.panX.value) / z + GRAPH_NODE_W;
    const minY = -viewport.panY.value / z - GRAPH_NODE_H;
    const maxY = (h - viewport.panY.value) / z + GRAPH_NODE_H;

    return layout.value.nodes.filter(
        (n) => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY,
    );
});

const visibleEdges = computed(() => {
    const visibleSet = new Set(visibleNodes.value.map((n) => n.id));

    return layout.value.edges.filter(
        (e) => visibleSet.has(e.fromId) || visibleSet.has(e.toId),
    );
});

/* ---------- Selected path (for breadcrumbs) ---------- */

const selectedPath = computed(() => {
    const id = store.selectedId.value;

    if (!id || store.document.value === null) {
        return [];
    }

    return findNodeIdToPath(id, store.document.value) ?? [];
});

/* ---------- Pan / zoom interactions ---------- */

function onWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = canvas.value!.getBoundingClientRect();
    const ax = e.clientX - rect.left;
    const ay = e.clientY - rect.top;
    // Smoother zoom curve.
    const factor = Math.exp(-e.deltaY * 0.0015);
    viewport.zoomAt(factor, ax, ay);
}

function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) {
        return;
    }

    // Skip if we clicked on a node (its own handler will fire).
    const target = e.target as HTMLElement;

    if (
        target.closest('.gv-node') ||
        target.closest('.gv-toolbar') ||
        target.closest('.gv-minimap')
    ) {
        return;
    }

    isPanning.value = true;
    panStart = {
        x: e.clientX,
        y: e.clientY,
        px: viewport.panX.value,
        py: viewport.panY.value,
    };
    canvas.value?.setPointerCapture(e.pointerId);
    ctx.close();
    store.select(null);
}

function onPointerMove(e: PointerEvent) {
    if (!isPanning.value || !panStart) {
        return;
    }

    viewport.panX.value = panStart.px + (e.clientX - panStart.x);
    viewport.panY.value = panStart.py + (e.clientY - panStart.y);
}

function onPointerUp(e: PointerEvent) {
    if (!isPanning.value) {
        return;
    }

    isPanning.value = false;
    panStart = null;
    canvas.value?.releasePointerCapture(e.pointerId);
}

function onCanvasContext(e: MouseEvent) {
    e.preventDefault();
    ctx.open(e.clientX, e.clientY, [
        { label: 'Fit to screen', icon: 'fit', kbd: 'F', onClick: doFit },
        {
            label: 'Reset zoom',
            icon: 'target',
            kbd: '0',
            onClick: () => viewport.reset(),
        },
        { separator: true, label: '' },
        {
            label: 'Expand all',
            icon: 'expand-all',
            onClick: () => store.expandAll(),
        },
        {
            label: 'Collapse all',
            icon: 'collapse-all',
            onClick: () => store.collapseAll(),
        },
        ui.state.focusedRootId
            ? {
                  label: 'Clear focus',
                  icon: 'arrow-left',
                  onClick: () => ui.setFocusedRoot(null),
              }
            : { label: 'Clear focus', icon: 'arrow-left', disabled: true },
    ]);
}

/* ---------- Node interactions ---------- */

function onSelect(node: GraphNodeT) {
    store.select(node.id);
    ctx.close();
}

function onToggle(node: GraphNodeT) {
    if (!node.isContainer) {
        return;
    }

    store.toggleExpand(node.id);
}

function onContext(node: GraphNodeT, x: number, y: number) {
    const isRoot = node.path.length === 0;
    const isContainer = node.isContainer;

    ctx.open(x, y, [
        {
            label: isContainer && node.expanded ? 'Collapse' : 'Expand',
            icon: isContainer
                ? node.expanded
                    ? 'collapse-all'
                    : 'expand-all'
                : 'dot',
            disabled: !isContainer,
            onClick: () => store.toggleExpand(node.id),
        },
        {
            label: 'Focus subtree',
            icon: 'focus',
            disabled: isRoot || !isContainer,
            onClick: () => ui.setFocusedRoot(node.id),
        },
        { separator: true, label: '' },
        {
            label: 'Copy path',
            icon: 'copy',
            onClick: () => copyText(formatPath(node.path)),
        },
        { label: 'Copy value', icon: 'copy', onClick: () => copyValue(node) },
        { separator: true, label: '' },
        {
            label: 'Edit value',
            icon: 'edit',
            disabled: isContainer || !ui.state.editMode,
            onClick: () => onEdit(node),
        },
        {
            label: 'Add child',
            icon: 'plus',
            disabled: !isContainer || !ui.state.editMode,
            onClick: () => onAddChild(node),
        },
        {
            label: 'Duplicate',
            icon: 'copy',
            disabled: isRoot || !ui.state.editMode,
            onClick: () => store.duplicateNode(node.path),
        },
        { separator: true, label: '' },
        {
            label: 'Delete',
            icon: 'trash',
            danger: true,
            disabled: isRoot || !ui.state.editMode,
            onClick: () => store.deleteNode(node.path),
        },
    ]);
}

function onEdit(node: GraphNodeT) {
    if (node.isContainer) {
        return;
    }

    const next = window.prompt(
        'New value (JSON literal):',
        String(node.preview),
    );

    if (next === null) {
        return;
    }

    store.updateValue(node.path, parseEditedValue(next));
    toasts.success('Value updated');
}

function onDelete(node: GraphNodeT) {
    if (node.path.length === 0) {
        return;
    }

    store.deleteNode(node.path);
}

function onAddChild(node: GraphNodeT) {
    if (!node.isContainer) {
        return;
    }

    if (node.kind === 'array') {
        const raw = window.prompt('New item value (JSON literal):', '""');

        if (raw === null) {
            return;
        }

        store.appendItem(node.path, parseEditedValue(raw));
    } else {
        const key = window.prompt('New key:');

        if (!key) {
            return;
        }

        const raw = window.prompt('New value (JSON literal):', '""');

        if (raw === null) {
            return;
        }

        store.addProperty(node.path, key, parseEditedValue(raw));
    }
}

function copyText(text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).then(
            () => toasts.success('Copied to clipboard'),
            () => toasts.error('Failed to copy'),
        );
    }
}

function copyValue(node: GraphNodeT) {
    if (store.document.value === null) {
        return;
    }

    const v = getAtPath(store.document.value, node.path);

    try {
        copyText(JSON.stringify(v, null, 2));
    } catch {
        copyText(String(v));
    }
}

function formatPath(path: ReadonlyArray<string | number>): string {
    if (path.length === 0) {
        return '$';
    }

    return (
        '$' +
        path.map((s) => (typeof s === 'number' ? `[${s}]` : `.${s}`)).join('')
    );
}

/* ---------- Toolbar actions ---------- */

function doFit() {
    const { w, h } = viewportSize.value;

    if (w > 0 && h > 0) {
        viewport.fitToBounds(layout.value.bounds, w, h);
    }
}

function zoomIn() {
    const { w, h } = viewportSize.value;
    viewport.zoomAt(1.2, w / 2, h / 2);
}

function zoomOut() {
    const { w, h } = viewportSize.value;
    viewport.zoomAt(1 / 1.2, w / 2, h / 2);
}

/* ---------- Selection / search auto-centering ---------- */

watch(
    () => store.selectedId.value,
    async (id) => {
        if (!id) {
            return;
        }

        await new Promise((r) => requestAnimationFrame(r));
        const node = layout.value.nodes.find((n) => n.id === id);

        if (!node) {
            return;
        }

        const { w, h } = viewportSize.value;

        if (w === 0 || h === 0) {
            return;
        }

        // Only re-center if the node is outside the visible area.
        const screenX = node.x * viewport.zoom.value + viewport.panX.value;
        const screenY = node.y * viewport.zoom.value + viewport.panY.value;
        const margin = 80;

        if (
            screenX < margin ||
            screenX > w - margin ||
            screenY < margin ||
            screenY > h - margin
        ) {
            viewport.centerOn(node.x, node.y, w, h);
        }
    },
);

watch(
    () => search.activeMatch.value,
    async (m) => {
        if (!m) {
            return;
        }

        store.expandAncestors(m.path);
        await new Promise((r) => requestAnimationFrame(r));
        const node = layout.value.nodes.find((n) => n.id === m.rowId);

        if (!node) {
            return;
        }

        const { w, h } = viewportSize.value;
        viewport.centerOn(node.x, node.y, w, h);
    },
);

/* ---------- Keyboard navigation ---------- */

function moveToParent() {
    if (!store.selectedId.value) {
        return;
    }

    const node = layout.value.nodes.find(
        (n) => n.id === store.selectedId.value,
    );

    if (!node || !node.parentId) {
        return;
    }

    store.select(node.parentId);
}

function moveToFirstChild() {
    if (!store.selectedId.value) {
        return;
    }

    const node = layout.value.nodes.find(
        (n) => n.id === store.selectedId.value,
    );

    if (!node) {
        return;
    }

    if (node.isContainer && !node.expanded) {
        store.toggleExpand(node.id);

        return;
    }

    const child = layout.value.nodes.find((n) => n.parentId === node.id);

    if (child) {
        store.select(child.id);
    }
}

function moveToSibling(direction: 1 | -1) {
    if (!store.selectedId.value) {
        return;
    }

    const node = layout.value.nodes.find(
        (n) => n.id === store.selectedId.value,
    );

    if (!node) {
        return;
    }

    const siblings = layout.value.nodes
        .filter((n) => n.parentId === node.parentId)
        .sort((a, b) => a.y - b.y);
    const idx = siblings.findIndex((n) => n.id === node.id);
    const next = siblings[idx + direction];

    if (next) {
        store.select(next.id);
    }
}

useHotkeys([
    { keys: 'arrowleft', handler: () => moveToParent() },
    { keys: 'arrowright', handler: () => moveToFirstChild() },
    { keys: 'arrowup', handler: () => moveToSibling(-1) },
    { keys: 'arrowdown', handler: () => moveToSibling(1) },
    {
        keys: 'enter',
        handler: () => {
            if (!store.selectedId.value) {
                return;
            }

            const node = layout.value.nodes.find(
                (n) => n.id === store.selectedId.value,
            );

            if (node?.isContainer) {
                store.toggleExpand(node.id);
            }
        },
    },
    { keys: 'f', handler: () => doFit() },
    { keys: '0', handler: () => viewport.reset() },
    { keys: '+', handler: () => zoomIn() },
    { keys: '=', handler: () => zoomIn() },
    { keys: '-', handler: () => zoomOut() },
    {
        keys: 'delete',
        handler: () => {
            if (!ui.state.editMode || !store.selectedId.value) {
                return;
            }

            const node = layout.value.nodes.find(
                (n) => n.id === store.selectedId.value,
            );

            if (node && node.path.length > 0) {
                store.deleteNode(node.path);
            }
        },
    },
]);

/* ---------- Lifecycle ---------- */

onMounted(() => {
    if (!canvas.value) {
        return;
    }

    resizeObserver = new ResizeObserver((entries) => {
        const r = entries[0]?.contentRect;

        if (!r) {
            return;
        }

        viewportSize.value = { w: r.width, h: r.height };

        if (
            !didInitialFit &&
            r.width > 0 &&
            r.height > 0 &&
            layout.value.nodes.length > 0
        ) {
            doFit();
            didInitialFit = true;
        }
    });
    resizeObserver.observe(canvas.value);
});

onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
});

/* Re-fit when the document is replaced. */
watch(
    () => store.document.value,
    () => {
        didInitialFit = false;
        // Defer to next frame so layout has the new tree.
        requestAnimationFrame(() => {
            const { w, h } = viewportSize.value;

            if (w > 0 && h > 0 && layout.value.nodes.length > 0) {
                doFit();
                didInitialFit = true;
            }
        });
    },
);

const transformStyle = computed(
    () =>
        `translate3d(${viewport.panX.value}px, ${viewport.panY.value}px, 0) scale(${viewport.zoom.value})`,
);

const edgesViewBox = computed(() => {
    const b = layout.value.bounds;
    const pad = 200;
    const w = b.maxX - b.minX + pad * 2;
    const h = b.maxY - b.minY + pad * 2;

    return {
        x: b.minX - pad,
        y: b.minY - pad,
        w: Math.max(w, 1),
        h: Math.max(h, 1),
    };
});

function panToFromMinimap(worldX: number, worldY: number) {
    const { w, h } = viewportSize.value;
    viewport.centerOn(worldX, worldY, w, h);
}

function clearFocus() {
    ui.setFocusedRoot(null);
}
</script>

<template>
    <div
        ref="canvas"
        class="gv-canvas"
        :data-panning="isPanning || undefined"
        tabindex="0"
        @wheel.passive="false"
        @wheel="onWheel"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @contextmenu="onCanvasContext"
    >
        <!-- transformed layer -->
        <div class="gv-layer" :style="{ transform: transformStyle }">
            <svg
                class="gv-edges"
                :style="{
                    left: edgesViewBox.x + 'px',
                    top: edgesViewBox.y + 'px',
                    width: edgesViewBox.w + 'px',
                    height: edgesViewBox.h + 'px',
                }"
                :viewBox="`${edgesViewBox.x} ${edgesViewBox.y} ${edgesViewBox.w} ${edgesViewBox.h}`"
            >
                <path
                    v-for="e in visibleEdges"
                    :key="e.id"
                    :d="edgePath(e)"
                    :data-active="
                        e.fromId === store.selectedId.value ||
                        e.toId === store.selectedId.value ||
                        undefined
                    "
                />
            </svg>

            <GraphNode
                v-for="n in visibleNodes"
                :key="n.id"
                :node="n"
                :selected="n.id === store.selectedId.value"
                :matched="matchedIds.has(n.id)"
                :active-match="search.activeMatch.value?.rowId === n.id"
                :edit-mode="ui.state.editMode"
                @select="onSelect"
                @toggle="onToggle"
                @context="onContext"
                @edit="onEdit"
                @delete="onDelete"
                @add-child="onAddChild"
            />
        </div>

        <!-- Edit-mode banner -->
        <div v-if="ui.state.editMode" class="gv-edit-banner">
            <Icon name="unlock" :size="13" />
            <span>Edit mode</span>
        </div>

        <!-- Breadcrumbs -->
        <GraphBreadcrumbs
            v-if="selectedPath.length > 0"
            :path="selectedPath"
            @select="store.select"
        />

        <!-- Focus chip -->
        <button
            v-if="ui.state.focusedRootId"
            type="button"
            class="gv-edit-banner"
            style="top: 52px; cursor: pointer"
            @click="clearFocus"
        >
            <Icon name="focus" :size="13" />
            <span>Focused subtree · click to clear</span>
        </button>

        <!-- Floating toolbar -->
        <div class="gv-toolbar">
            <button type="button" title="Zoom out (-)" @click="zoomOut">
                <Icon name="zoom-out" :size="14" />
            </button>
            <span class="px-1 text-[11px] text-[var(--color-fg-muted)]"
                >{{ Math.round(viewport.zoom.value * 100) }}%</span
            >
            <button type="button" title="Zoom in (+)" @click="zoomIn">
                <Icon name="zoom-in" :size="14" />
            </button>
            <span class="mx-1 h-4 w-px bg-[var(--color-border)]" />
            <button type="button" title="Fit to screen (F)" @click="doFit">
                <Icon name="fit" :size="14" />
            </button>
            <button type="button" title="Reset (0)" @click="viewport.reset()">
                <Icon name="target" :size="14" />
            </button>
        </div>

        <!-- Minimap -->
        <GraphMinimap
            v-if="layout.nodes.length > 0"
            :layout="layout"
            :selected-id="store.selectedId.value"
            :pan-x="viewport.panX.value"
            :pan-y="viewport.panY.value"
            :zoom="viewport.zoom.value"
            :viewport-w="viewportSize.w"
            :viewport-h="viewportSize.h"
            @pan-to="panToFromMinimap"
        />

        <!-- Empty state -->
        <div
            v-if="layout.nodes.length === 0"
            class="absolute inset-0 grid place-items-center text-[var(--color-fg-muted)]"
        >
            <div class="text-center">
                <Icon name="graph" :size="32" />
                <p class="mt-3 text-sm">No data to graph</p>
            </div>
        </div>
    </div>
</template>
