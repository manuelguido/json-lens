<script setup lang="ts">
/**
 * Minimap — a downscaled representation of the entire graph plus a draggable
 * viewport rectangle. Clicking or dragging the rectangle pans the main view.
 */
import { computed } from 'vue';
import { GRAPH_NODE_H, GRAPH_NODE_W } from '@/lib/graphLayout';
import type { GraphLayout } from '@/lib/graphLayout';

const props = defineProps<{
    layout: GraphLayout;
    selectedId: string | null;
    panX: number;
    panY: number;
    zoom: number;
    viewportW: number;
    viewportH: number;
}>();

const emit = defineEmits<{
    (e: 'pan-to', worldX: number, worldY: number): void;
}>();

const PAD = 6;
const MM_W = 200 - PAD * 2;
const MM_H = 140 - PAD * 2;

const scale = computed(() => {
    const w = props.layout.bounds.maxX - props.layout.bounds.minX || 1;
    const h = props.layout.bounds.maxY - props.layout.bounds.minY || 1;

    return Math.min(MM_W / w, MM_H / h);
});

const offsetX = computed(() => -props.layout.bounds.minX * scale.value + PAD);
const offsetY = computed(() => -props.layout.bounds.minY * scale.value + PAD);

const viewportRect = computed(() => {
    if (props.zoom <= 0 || props.viewportW <= 0) {
        return { x: 0, y: 0, w: 0, h: 0 };
    }

    const worldX = -props.panX / props.zoom;
    const worldY = -props.panY / props.zoom;
    const worldW = props.viewportW / props.zoom;
    const worldH = props.viewportH / props.zoom;

    return {
        x: worldX * scale.value + offsetX.value,
        y: worldY * scale.value + offsetY.value,
        w: worldW * scale.value,
        h: worldH * scale.value,
    };
});

function onPointer(e: PointerEvent) {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldX = (x - offsetX.value) / scale.value;
    const worldY = (y - offsetY.value) / scale.value;
    emit('pan-to', worldX, worldY);
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
}

function onMove(e: PointerEvent) {
    if (e.buttons !== 1) {
        return;
    }

    onPointer(e);
}
</script>

<template>
    <div class="gv-minimap">
        <svg
            :width="200"
            :height="140"
            viewBox="0 0 200 140"
            @pointerdown="onPointer"
            @pointermove="onMove"
        >
            <rect
                v-for="n in layout.nodes"
                :key="n.id"
                class="mm-node"
                :data-selected="n.id === selectedId || undefined"
                :x="(n.x - GRAPH_NODE_W / 2) * scale + offsetX"
                :y="(n.y - GRAPH_NODE_H / 2) * scale + offsetY"
                :width="Math.max(2, GRAPH_NODE_W * scale)"
                :height="Math.max(2, GRAPH_NODE_H * scale)"
                rx="1.5"
            />
            <rect
                class="mm-viewport"
                :x="viewportRect.x"
                :y="viewportRect.y"
                :width="Math.max(4, viewportRect.w)"
                :height="Math.max(4, viewportRect.h)"
                rx="2"
            />
        </svg>
    </div>
</template>
