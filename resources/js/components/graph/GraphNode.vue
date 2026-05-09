<script setup lang="ts">
/**
 * Single graph node card. Type-coded left accent bar, key label, kind badge,
 * preview value. Hover actions appear when edit mode is active.
 *
 * The component is rendered inside the transformed graph layer, so its
 * positioning is in world coordinates (not viewport).
 */
import { computed } from 'vue';
import Icon from '@/components/common/Icon.vue';
import { GRAPH_NODE_H, GRAPH_NODE_W } from '@/lib/graphLayout';
import type { GraphNode } from '@/lib/graphLayout';

const props = defineProps<{
    node: GraphNode;
    selected: boolean;
    matched: boolean;
    activeMatch: boolean;
    editMode: boolean;
}>();

const emit = defineEmits<{
    (e: 'select', node: GraphNode): void;
    (e: 'toggle', node: GraphNode): void;
    (e: 'context', node: GraphNode, x: number, y: number): void;
    (e: 'edit', node: GraphNode): void;
    (e: 'delete', node: GraphNode): void;
    (e: 'add-child', node: GraphNode): void;
}>();

const left = computed(() => `${props.node.x - GRAPH_NODE_W / 2}px`);
const top = computed(() => `${props.node.y - GRAPH_NODE_H / 2}px`);

const kindBadge = computed(() => {
    const k = props.node.kind;

    if (k === 'object') {
return `obj · ${props.node.childCount}`;
}

    if (k === 'array') {
return `arr · ${props.node.childCount}`;
}

    return k;
});

const keyLabelDisplay = computed(() => {
    if (props.node.keyLabel === null) {
return 'root';
}

    if (props.node.parentKind === 'array') {
return `[${props.node.keyLabel}]`;
}

    return props.node.keyLabel;
});

function onClick(e: MouseEvent) {
    e.stopPropagation();
    emit('select', props.node);
}

function onDouble(e: MouseEvent) {
    e.stopPropagation();

    if (props.node.isContainer) {
emit('toggle', props.node);
} else if (props.editMode) {
emit('edit', props.node);
}
}

function onContext(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    emit('select', props.node);
    emit('context', props.node, e.clientX, e.clientY);
}

function onChevron(e: MouseEvent) {
    e.stopPropagation();
    emit('toggle', props.node);
}
</script>

<template>
    <div
        class="gv-node"
        :data-kind="node.kind"
        :data-selected="selected || undefined"
        :data-match="matched || undefined"
        :data-match-active="activeMatch || undefined"
        :style="{
            left,
            top,
            width: GRAPH_NODE_W + 'px',
            height: GRAPH_NODE_H + 'px',
        }"
        @click="onClick"
        @dblclick="onDouble"
        @contextmenu="onContext"
    >
        <div class="flex h-full flex-col justify-center pl-3.5 pr-2">
            <div class="flex items-center gap-1.5 text-[11px] leading-none">
                <span class="tok-meta uppercase tracking-wide" style="font-size: 9.5px">{{ kindBadge }}</span>
                <span v-if="node.kind === 'array'" class="tok-bracket">[</span>
                <span v-else-if="node.kind === 'object'" class="tok-bracket">{</span>
            </div>
            <div class="mt-1 flex items-center gap-1.5">
                <button
                    v-if="node.isContainer"
                    type="button"
                    class="grid h-4 w-4 place-items-center rounded text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
                    :aria-label="node.expanded ? 'Collapse' : 'Expand'"
                    @click="onChevron"
                >
                    <Icon :name="node.expanded ? 'chevron-down' : 'chevron-right'" :size="11" />
                </button>
                <span
                    class="truncate text-[13px] font-medium tok-key"
                    :title="String(keyLabelDisplay)"
                >{{ keyLabelDisplay }}</span>
                <span
                    v-if="!node.isContainer"
                    class="truncate text-[12px] font-mono"
                    :class="{
                        'tok-string': node.kind === 'string',
                        'tok-number': node.kind === 'number',
                        'tok-boolean': node.kind === 'boolean',
                        'tok-null': node.kind === 'null',
                    }"
                    :title="node.preview"
                >{{ node.preview }}</span>
                <span
                    v-else
                    class="truncate text-[11px] tok-meta"
                    :title="node.preview"
                >{{ node.preview }}</span>
            </div>
        </div>

        <div v-if="editMode" class="gv-node-actions">
            <button
                v-if="!node.isContainer"
                type="button"
                class="gv-node-action"
                title="Edit value"
                @click.stop="emit('edit', node)"
            >
                <Icon name="edit" :size="12" />
            </button>
            <button
                v-if="node.isContainer"
                type="button"
                class="gv-node-action"
                title="Add child"
                @click.stop="emit('add-child', node)"
            >
                <Icon name="plus" :size="12" />
            </button>
            <button
                v-if="node.path.length > 0"
                type="button"
                class="gv-node-action"
                data-danger="true"
                title="Delete"
                @click.stop="emit('delete', node)"
            >
                <Icon name="trash" :size="12" />
            </button>
        </div>
    </div>
</template>
