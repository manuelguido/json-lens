<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import Icon from '@/components/common/Icon.vue';
import {
    highlightSegments,
    useJsonSearch,
} from '@/composables/useJsonSearch';
import { useJsonStore } from '@/composables/useJsonStore';
import { parseEditedValue, previewOf } from '@/lib/jsonPath';
import type { TreeRow } from '@/lib/types';

const props = defineProps<{ row: TreeRow }>();

const store = useJsonStore();
const search = useJsonSearch();

const editing = ref(false);
const editBuffer = ref('');
const inputEl = ref<HTMLInputElement | null>(null);

const isSelected = computed(() => store.selectedId.value === props.row.id);

const isActiveMatch = computed(
    () => search.activeMatch.value?.rowId === props.row.id,
);

const indent = computed(() => `${props.row.depth * 14 + 8}px`);

const keyText = computed(() => {
    if (props.row.parentKind === 'root') {
return null;
}

    if (props.row.parentKind === 'array') {
return props.row.keyLabel;
}

    return props.row.keyLabel;
});

function onClick(e: MouseEvent) {
    store.select(props.row.id);

    if (props.row.isContainer && !e.shiftKey) {
        store.toggleExpand(props.row.id);
    }
}

function startEdit() {
    if (props.row.isContainer) {
return;
}

    editing.value = true;
    const v = props.row.rawValue;
    editBuffer.value =
        typeof v === 'string' ? v : v === null ? 'null' : String(v);
    nextTick(() => inputEl.value?.focus());
}

function commitEdit() {
    if (!editing.value) {
return;
}

    const newValue = parseEditedValue(editBuffer.value);
    store.updateValue(props.row.path, newValue);
    editing.value = false;
}

function cancelEdit() {
    editing.value = false;
}

function onValueKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
    }
}

function onKeyEdit() {
    if (props.row.parentKind !== 'object') {
return;
}

    const oldKey = props.row.keyLabel ?? '';
    const newKey = window.prompt('Rename key', oldKey);

    if (newKey === null || newKey === oldKey || newKey === '') {
return;
}

    const parentPath = props.row.path.slice(0, -1);
    store.renameNodeKey(parentPath, oldKey, newKey);
}

const tokenClass = computed(() => {
    switch (props.row.kind) {
        case 'string':
            return 'tok-string';
        case 'number':
            return 'tok-number';
        case 'boolean':
            return 'tok-boolean';
        case 'null':
            return 'tok-null';
        default:
            return 'tok-meta';
    }
});

function valueText(): string {
    if (props.row.isContainer) {
return '';
}

    return previewOf(
        props.row.rawValue ?? null,
        props.row.kind,
        160,
    );
}

const keySegments = computed(() => {
    if (!keyText.value) {
return [];
}

    if (search.debounced.value) {
        return highlightSegments(keyText.value, search.debounced.value);
    }

    return [{ text: keyText.value, match: false }];
});

const valueSegments = computed(() => {
    if (props.row.isContainer) {
return [];
}

    const text = valueText();

    if (search.debounced.value) {
        return highlightSegments(text, search.debounced.value);
    }

    return [{ text, match: false }];
});
</script>

<template>
    <div
        class="jl-row group flex h-7 cursor-pointer items-center gap-1 pr-3 text-[12.5px] leading-none"
        :class="{ 'jl-pulse': isActiveMatch }"
        :data-selected="isSelected || undefined"
        :data-row-id="row.id"
        @click="onClick"
        @dblclick.stop="startEdit"
    >
        <!-- Indent + chevron column -->
        <span
            class="flex items-center"
            :style="{ paddingLeft: indent }"
        >
            <span class="mr-1 inline-flex h-4 w-4 items-center justify-center">
                <button
                    v-if="row.isContainer"
                    type="button"
                    class="jl-focus rounded text-[var(--color-fg-faint)] transition-transform duration-150 ease-out hover:text-[var(--color-fg-muted)]"
                    :class="{ 'rotate-90': row.expanded }"
                    @click.stop="store.toggleExpand(row.id)"
                    :title="row.expanded ? 'Collapse' : 'Expand'"
                >
                    <Icon name="chevron-right" :size="12" />
                </button>
                <span
                    v-else
                    class="block h-1 w-1 rounded-full bg-[var(--color-fg-faint)]/50"
                />
            </span>
        </span>

        <!-- Key -->
        <template v-if="keyText !== null">
            <span
                v-if="row.parentKind === 'array'"
                class="font-mono text-[var(--color-fg-faint)]"
            >
                {{ keyText }}
            </span>
            <span
                v-else
                class="tok-key font-mono"
                :title="`Rename key`"
                @dblclick.stop="onKeyEdit"
            >
                <template v-for="(seg, i) in keySegments" :key="i">
                    <mark
                        v-if="seg.match"
                        class="jl-match"
                        :data-active="isActiveMatch && search.activeMatch.value?.field === 'key' || undefined"
                        >{{ seg.text }}</mark
                    >
                    <span v-else>{{ seg.text }}</span>
                </template>
            </span>
            <span class="tok-meta font-mono">:</span>
        </template>

        <!-- Container preview -->
        <template v-if="row.isContainer">
            <span class="tok-bracket font-mono">
                {{ row.kind === 'array' ? '[' : '{' }}
            </span>
            <span
                v-if="!row.expanded"
                class="font-mono text-[var(--color-fg-faint)]"
            >
                {{ row.childCount }}
                {{
                    row.kind === 'array'
                        ? row.childCount === 1
                            ? 'item'
                            : 'items'
                        : row.childCount === 1
                          ? 'key'
                          : 'keys'
                }}
            </span>
            <span
                v-if="!row.expanded"
                class="tok-bracket font-mono"
            >
                {{ row.kind === 'array' ? ']' : '}' }}
            </span>
        </template>

        <!-- Primitive value -->
        <template v-else>
            <input
                v-if="editing"
                ref="inputEl"
                v-model="editBuffer"
                class="font-mono text-[12.5px] min-w-0 flex-1 rounded border border-[var(--color-accent)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[var(--color-fg)] outline-none"
                spellcheck="false"
                @keydown="onValueKeydown"
                @blur="commitEdit"
                @click.stop
            />
            <span
                v-else
                :class="['font-mono', tokenClass, 'truncate']"
                :title="'Double-click to edit'"
            >
                <template v-for="(seg, i) in valueSegments" :key="i">
                    <mark
                        v-if="seg.match"
                        class="jl-match"
                        :data-active="isActiveMatch && search.activeMatch.value?.field === 'value' || undefined"
                        >{{ seg.text }}</mark
                    >
                    <span v-else>{{ seg.text }}</span>
                </template>
            </span>
        </template>

        <!-- Trailing meta on hover -->
        <span class="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
                v-if="!row.isContainer && !editing"
                type="button"
                class="jl-focus rounded p-0.5 text-[var(--color-fg-faint)] hover:text-[var(--color-fg)]"
                title="Edit value"
                @click.stop="startEdit"
            >
                <Icon name="edit" :size="11" />
            </button>
            <button
                v-if="row.path.length > 0"
                type="button"
                class="jl-focus rounded p-0.5 text-[var(--color-fg-faint)] hover:text-[var(--color-danger)]"
                title="Delete"
                @click.stop="store.deleteNode(row.path)"
            >
                <Icon name="trash" :size="11" />
            </button>
        </span>
    </div>
</template>
