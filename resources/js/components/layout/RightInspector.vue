<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from '@/components/common/Button.vue';
import Icon from '@/components/common/Icon.vue';
import { useJsonStore } from '@/composables/useJsonStore';
import { useToasts } from '@/composables/useToasts';
import { useUiState } from '@/composables/useUiState';
import { formatBytes } from '@/lib/format';
import { getAtPath, parseEditedValue, pathToDisplay } from '@/lib/jsonPath';
import type { JsonValueKind } from '@/lib/types';

const store = useJsonStore();
const toasts = useToasts();
const ui = useUiState();

const selectedRow = computed(() => {
    const id = store.selectedId.value;

    if (!id) {
        return null;
    }

    return store.rows.value.find((r) => r.id === id) ?? null;
});

const value = computed(() => {
    if (!selectedRow.value) {
        return undefined;
    }

    if (store.document.value === null) {
        return undefined;
    }

    return getAtPath(store.document.value, selectedRow.value.path);
});

const valueKind = computed<JsonValueKind | null>(() => {
    return selectedRow.value ? selectedRow.value.kind : null;
});

const pathStr = computed(() =>
    selectedRow.value ? pathToDisplay(selectedRow.value.path) : '$',
);

const valueLength = computed<string | null>(() => {
    if (!selectedRow.value) {
        return null;
    }

    if (selectedRow.value.kind === 'string') {
        return `${(selectedRow.value.rawValue as string).length} chars`;
    }

    if (selectedRow.value.kind === 'array') {
        return `${selectedRow.value.childCount} items`;
    }

    if (selectedRow.value.kind === 'object') {
        return `${selectedRow.value.childCount} keys`;
    }

    return null;
});

const valueBytes = computed<string | null>(() => {
    if (value.value === undefined) {
        return null;
    }

    try {
        return formatBytes(
            new TextEncoder().encode(JSON.stringify(value.value)).length,
        );
    } catch {
        return null;
    }
});

const arrayIndex = computed<number | null>(() => {
    if (!selectedRow.value) {
        return null;
    }

    if (selectedRow.value.parentKind !== 'array') {
        return null;
    }

    const last = selectedRow.value.path[selectedRow.value.path.length - 1];

    return typeof last === 'number' ? last : null;
});

function copyPath() {
    navigator.clipboard
        .writeText(pathStr.value)
        .then(() => toasts.success('Path copied'))
        .catch(() => toasts.error('Clipboard unavailable'));
}

function copyValue() {
    if (value.value === undefined) {
        return;
    }

    const text =
        typeof value.value === 'string'
            ? value.value
            : JSON.stringify(value.value, null, 2);
    navigator.clipboard
        .writeText(text)
        .then(() => toasts.success('Value copied'))
        .catch(() => toasts.error('Clipboard unavailable'));
}

function deleteSelected() {
    if (!selectedRow.value) {
        return;
    }

    if (selectedRow.value.path.length === 0) {
        return;
    }

    store.deleteNode(selectedRow.value.path);
    toasts.info('Node deleted');
}

function duplicateSelected() {
    if (!selectedRow.value || selectedRow.value.path.length === 0) {
        return;
    }

    store.duplicateNode(selectedRow.value.path);
    toasts.success('Node duplicated');
}

function addChild() {
    if (!selectedRow.value || !selectedRow.value.isContainer) {
        return;
    }

    if (selectedRow.value.kind === 'array') {
        const raw = window.prompt('New item value (JSON literal):', '""');

        if (raw === null) {
            return;
        }

        store.appendItem(selectedRow.value.path, parseEditedValue(raw));
        toasts.success('Item appended');
    } else {
        const key = window.prompt('New key:');

        if (!key) {
            return;
        }

        const raw = window.prompt('New value (JSON literal):', '""');

        if (raw === null) {
            return;
        }

        store.addProperty(selectedRow.value.path, key, parseEditedValue(raw));
        toasts.success('Property added');
    }
}

function editValue() {
    if (!selectedRow.value || selectedRow.value.isContainer) {
        return;
    }

    const next = window.prompt(
        'New value (JSON literal):',
        String(selectedRow.value.preview),
    );

    if (next === null) {
        return;
    }

    store.updateValue(selectedRow.value.path, parseEditedValue(next));
    toasts.success('Value updated');
}

const sectionMeta = ref(true);
const sectionActions = ref(true);
const sectionPreview = ref(true);

const previewText = computed(() => {
    if (value.value === undefined) {
        return '';
    }

    if (typeof value.value === 'string') {
        return value.value;
    }

    try {
        const s = JSON.stringify(value.value, null, 2);

        return s.length > 4000 ? s.slice(0, 4000) + '\n…' : s;
    } catch {
        return '';
    }
});
</script>

<template>
    <aside
        class="flex h-full w-72 shrink-0 flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-app-bg-2)]"
    >
        <header
            class="flex h-9 items-center justify-between border-b border-[var(--color-divider)] px-3"
        >
            <div
                class="text-[10px] font-semibold tracking-[0.08em] text-[var(--color-fg-faint)] uppercase"
            >
                Inspector
            </div>
            <span
                v-if="valueKind"
                class="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-px font-mono text-[10px] text-[var(--color-fg-muted)]"
            >
                {{ valueKind }}
            </span>
        </header>

        <div
            v-if="!selectedRow"
            class="flex flex-1 items-center justify-center px-6"
        >
            <div
                class="text-center text-[12px] leading-relaxed text-[var(--color-fg-faint)]"
            >
                <Icon
                    name="layers"
                    :size="22"
                    class="mx-auto mb-3 text-[var(--color-fg-faint)]"
                />
                Select a node in the tree to inspect its details.
            </div>
        </div>

        <div v-else class="flex-1 overflow-y-auto">
            <!-- Path block -->
            <div class="border-b border-[var(--color-divider)] px-3 py-3">
                <div
                    class="mb-1.5 text-[10px] font-semibold tracking-[0.08em] text-[var(--color-fg-faint)] uppercase"
                >
                    Path
                </div>
                <div
                    class="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 font-mono text-[11.5px] leading-relaxed break-all text-[var(--color-fg)]"
                >
                    {{ pathStr }}
                </div>
                <button
                    type="button"
                    class="jl-focus mt-2 inline-flex items-center gap-1.5 text-[11px] text-[var(--color-fg-muted)] transition hover:text-[var(--color-fg)]"
                    @click="copyPath"
                >
                    <Icon name="copy" :size="11" /> Copy path
                </button>
            </div>

            <!-- Metadata -->
            <div class="border-b border-[var(--color-divider)] px-3 py-3">
                <button
                    type="button"
                    class="mb-2 flex w-full items-center justify-between text-[10px] font-semibold tracking-[0.08em] text-[var(--color-fg-faint)] uppercase"
                    @click="sectionMeta = !sectionMeta"
                >
                    <span>Metadata</span>
                    <Icon
                        :name="sectionMeta ? 'chevron-down' : 'chevron-right'"
                        :size="11"
                    />
                </button>
                <div v-if="sectionMeta" class="space-y-1.5 text-[12px]">
                    <div class="flex justify-between">
                        <span class="text-[var(--color-fg-muted)]">Type</span>
                        <span class="font-mono text-[var(--color-fg)]">{{
                            valueKind
                        }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-[var(--color-fg-muted)]">Depth</span>
                        <span class="font-mono text-[var(--color-fg)]">{{
                            selectedRow.depth
                        }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-[var(--color-fg-muted)]">Parent</span>
                        <span class="font-mono text-[var(--color-fg)]">{{
                            selectedRow.parentKind
                        }}</span>
                    </div>
                    <div
                        v-if="arrayIndex !== null"
                        class="flex justify-between"
                    >
                        <span class="text-[var(--color-fg-muted)]">Index</span>
                        <span class="font-mono text-[var(--color-fg)]">{{
                            arrayIndex
                        }}</span>
                    </div>
                    <div v-if="valueLength" class="flex justify-between">
                        <span class="text-[var(--color-fg-muted)]">Length</span>
                        <span class="font-mono text-[var(--color-fg)]">{{
                            valueLength
                        }}</span>
                    </div>
                    <div v-if="valueBytes" class="flex justify-between">
                        <span class="text-[var(--color-fg-muted)]">Bytes</span>
                        <span class="font-mono text-[var(--color-fg)]">{{
                            valueBytes
                        }}</span>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="border-b border-[var(--color-divider)] px-3 py-3">
                <button
                    type="button"
                    class="mb-2 flex w-full items-center justify-between text-[10px] font-semibold tracking-[0.08em] text-[var(--color-fg-faint)] uppercase"
                    @click="sectionActions = !sectionActions"
                >
                    <span>Actions</span>
                    <Icon
                        :name="
                            sectionActions ? 'chevron-down' : 'chevron-right'
                        "
                        :size="11"
                    />
                </button>
                <div v-if="sectionActions" class="grid grid-cols-2 gap-1.5">
                    <Button variant="subtle" size="xs" @click="copyValue">
                        <Icon name="copy" :size="11" /> Copy value
                    </Button>
                    <Button variant="subtle" size="xs" @click="copyPath">
                        <Icon name="copy" :size="11" /> Copy path
                    </Button>
                    <template v-if="ui.state.editMode">
                        <Button
                            variant="subtle"
                            size="xs"
                            :disabled="selectedRow.isContainer"
                            @click="editValue"
                        >
                            <Icon name="edit" :size="11" /> Edit
                        </Button>
                        <Button
                            variant="subtle"
                            size="xs"
                            :disabled="!selectedRow.isContainer"
                            @click="addChild"
                        >
                            <Icon name="plus" :size="11" /> Add child
                        </Button>
                        <Button
                            variant="subtle"
                            size="xs"
                            :disabled="selectedRow.path.length === 0"
                            @click="duplicateSelected"
                        >
                            <Icon name="copy" :size="11" /> Duplicate
                        </Button>
                        <Button
                            variant="subtle"
                            size="xs"
                            :disabled="selectedRow.path.length === 0"
                            @click="deleteSelected"
                        >
                            <Icon name="trash" :size="11" /> Delete
                        </Button>
                    </template>
                    <div
                        v-else
                        class="col-span-2 rounded-md border border-dashed border-[var(--color-border)] px-2 py-1.5 text-[11px] text-[var(--color-fg-muted)]"
                    >
                        Enable edit mode to modify structure.
                    </div>
                </div>
            </div>

            <!-- Preview -->
            <div class="px-3 py-3">
                <button
                    type="button"
                    class="mb-2 flex w-full items-center justify-between text-[10px] font-semibold tracking-[0.08em] text-[var(--color-fg-faint)] uppercase"
                    @click="sectionPreview = !sectionPreview"
                >
                    <span>Preview</span>
                    <Icon
                        :name="
                            sectionPreview ? 'chevron-down' : 'chevron-right'
                        "
                        :size="11"
                    />
                </button>
                <pre
                    v-if="sectionPreview"
                    class="max-h-72 overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 font-mono text-[11.5px] leading-[1.55] break-words whitespace-pre-wrap text-[var(--color-fg)]"
                    >{{ previewText }}</pre
                >
            </div>
        </div>
    </aside>
</template>
