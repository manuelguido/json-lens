<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/components/common/Button.vue';
import Icon from '@/components/common/Icon.vue';
import { modSymbol } from '@/composables/useHotkeys';
import { useJsonStore } from '@/composables/useJsonStore';
import { useToasts } from '@/composables/useToasts';
import { useUiState } from '@/composables/useUiState';

const emit = defineEmits<{
    (e: 'open-search'): void;
    (e: 'open-import'): void;
    (e: 'open-export'): void;
    (e: 'open-shortcuts'): void;
}>();

const store = useJsonStore();
const ui = useUiState();
const toasts = useToasts();
const mod = modSymbol();

const docTitle = computed(() => store.sourceLabel.value ?? 'untitled.json');

function copyAll() {
    if (store.document.value === null) {
        toasts.info('Nothing to copy');

        return;
    }

    navigator.clipboard
        .writeText(JSON.stringify(store.document.value, null, 2))
        .then(() => toasts.success('Copied formatted JSON'))
        .catch(() => toasts.error('Clipboard unavailable'));
}
</script>

<template>
    <div
        class="flex h-11 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-app-bg-2)] px-3"
    >
        <!-- Brand -->
        <div class="flex items-center gap-2 pr-2 pl-1">
            <div
                class="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-[#7c9cff] to-[#5a78d8] text-[#0e1014]"
            >
                <Icon name="lens" :size="14" :stroke-width="1.8" />
            </div>
            <div class="flex flex-col leading-none">
                <span
                    class="text-[12px] font-semibold tracking-tight text-[var(--color-fg)]"
                    >JSON Lens</span
                >
                <span class="text-[10px] text-[var(--color-fg-faint)]"
                    >v1.0</span
                >
            </div>
        </div>

        <div class="h-5 w-px bg-[var(--color-border)]" />

        <!-- Document title -->
        <div class="flex min-w-0 items-center gap-1.5">
            <Icon name="file" :size="13" class="text-[var(--color-fg-faint)]" />
            <span
                class="truncate text-[12px] text-[var(--color-fg-muted)]"
                :title="docTitle"
                >{{ docTitle }}</span
            >
        </div>

        <div class="flex-1" />

        <!-- View mode switcher -->
        <div class="jl-segmented" role="tablist" aria-label="View mode">
            <button
                type="button"
                role="tab"
                :data-active="ui.state.viewMode === 'tree' || undefined"
                :title="`Tree view (${mod} 1)`"
                @click="ui.setViewMode('tree')"
            >
                <Icon name="tree" :size="12" />
                Tree
            </button>
            <button
                type="button"
                role="tab"
                :data-active="ui.state.viewMode === 'graph' || undefined"
                :title="`Graph view (${mod} 2)`"
                @click="ui.setViewMode('graph')"
            >
                <Icon name="graph" :size="12" />
                Graph
            </button>
        </div>

        <!-- Edit mode toggle -->
        <button
            type="button"
            class="jl-segmented"
            :title="`Toggle edit mode (${mod} E)`"
            style="cursor: pointer"
            @click="ui.toggleEditMode()"
        >
            <span
                class="flex items-center gap-1.5 px-2 py-1 text-[12px]"
                :style="
                    ui.state.editMode
                        ? 'color: var(--color-warning);'
                        : 'color: var(--color-fg-muted);'
                "
            >
                <Icon
                    :name="ui.state.editMode ? 'unlock' : 'lock'"
                    :size="12"
                />
                {{ ui.state.editMode ? 'Edit mode' : 'View mode' }}
            </span>
        </button>

        <!-- Actions cluster -->
        <div class="flex items-center gap-1">
            <Button
                variant="ghost"
                :title="`Import (${mod} O)`"
                @click="emit('open-import')"
            >
                <Icon name="upload" :size="13" /> Import
            </Button>
            <Button
                variant="ghost"
                :title="`Search (${mod} F)`"
                @click="emit('open-search')"
            >
                <Icon name="search" :size="13" /> Search
                <span
                    class="ml-1 rounded border border-[var(--color-border)] bg-[var(--color-app-bg)] px-1.5 py-px text-[10px] text-[var(--color-fg-faint)]"
                    >{{ mod }} F</span
                >
            </Button>
            <Button
                variant="ghost"
                title="Copy formatted JSON"
                @click="copyAll"
            >
                <Icon name="copy" :size="13" /> Copy
            </Button>
            <Button
                variant="ghost"
                :title="`Export (${mod} S)`"
                @click="emit('open-export')"
            >
                <Icon name="download" :size="13" /> Export
            </Button>

            <div class="mx-1 h-5 w-px bg-[var(--color-border)]" />

            <Button
                variant="ghost"
                :disabled="!store.canUndo.value"
                :title="`Undo (${mod} Z)`"
                @click="store.undo()"
            >
                <Icon name="undo" :size="13" />
            </Button>
            <Button
                variant="ghost"
                :disabled="!store.canRedo.value"
                :title="`Redo (${mod} ⇧ Z)`"
                @click="store.redo()"
            >
                <Icon name="redo" :size="13" />
            </Button>

            <div class="mx-1 h-5 w-px bg-[var(--color-border)]" />

            <Button
                variant="ghost"
                title="Keyboard shortcuts"
                @click="emit('open-shortcuts')"
            >
                <Icon name="keyboard" :size="13" />
            </Button>
        </div>
    </div>
</template>
