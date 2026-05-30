<script setup lang="ts">
/**
 * Editor — root page for JSON Lens. Composes the IDE-like shell:
 *
 *   ┌──────────────── TopToolbar ────────────────┐
 *   │ Explorer │      JsonTree       │ Inspector │
 *   │          │ (virtualized)       │           │
 *   ├────────────────── StatusBar ───────────────┤
 *
 * Plus: search palette overlay, import/export/shortcut dialogs, drag-and-drop
 * file overlay, and a global toast stack.
 */
import { Head } from '@inertiajs/vue3';
import { onMounted, ref } from 'vue';

import ContextMenu from '@/components/common/ContextMenu.vue';
import Icon from '@/components/common/Icon.vue';
import ToastStack from '@/components/common/ToastStack.vue';
import ExportDialog from '@/components/dialogs/ExportDialog.vue';
import ImportDialog from '@/components/dialogs/ImportDialog.vue';
import ShortcutsDialog from '@/components/dialogs/ShortcutsDialog.vue';
import GraphView from '@/components/graph/GraphView.vue';
import JsonTree from '@/components/json/JsonTree.vue';
import LeftExplorer from '@/components/layout/LeftExplorer.vue';
import RightInspector from '@/components/layout/RightInspector.vue';
import StatusBar from '@/components/layout/StatusBar.vue';
import TopToolbar from '@/components/layout/TopToolbar.vue';
import SearchPalette from '@/components/search/SearchPalette.vue';

import { useHotkeys } from '@/composables/useHotkeys';
import { useJsonSearch } from '@/composables/useJsonSearch';
import { useJsonStore } from '@/composables/useJsonStore';
import { useToasts } from '@/composables/useToasts';
import { useUiState } from '@/composables/useUiState';

const store = useJsonStore();
const search = useJsonSearch();
const ui = useUiState();
const toasts = useToasts();

/* ---- Hydrate persistence ---- */
onMounted(() => {
    store.hydrate();
    store.startPersistence();
    ui.hydrate();
});

/* ---- Global hotkeys ---- */
useHotkeys([
    { keys: 'mod+f', allowInInput: true, handler: () => ui.toggleSearch(true) },
    { keys: 'mod+o', allowInInput: true, handler: () => ui.open('import') },
    { keys: 'mod+s', allowInInput: true, handler: () => ui.open('export') },
    { keys: 'mod+1', handler: () => ui.setViewMode('tree') },
    { keys: 'mod+2', handler: () => ui.setViewMode('graph') },
    { keys: 'mod+e', handler: () => ui.toggleEditMode() },
    { keys: 'mod+z', allowInInput: false, handler: () => store.undo() },
    { keys: 'mod+shift+z', allowInInput: false, handler: () => store.redo() },
    {
        keys: 'escape',
        allowInInput: true,
        handler: () => {
            if (ui.state.searchOpen) {
                ui.toggleSearch(false);
                search.clear();

                return;
            }

            if (ui.state.dialog) {
                ui.closeDialog();

                return;
            }

            store.select(null);
        },
    },
    {
        keys: '?',
        allowInInput: false,
        handler: () => ui.open('shortcuts'),
    },
]);

/* ---- Drag and drop ---- */
const dragActive = ref(false);
let dragDepth = 0;

function onDragEnter(e: DragEvent) {
    if (!hasFiles(e)) {
        return;
    }

    dragDepth++;
    dragActive.value = true;
}
function onDragLeave() {
    dragDepth = Math.max(0, dragDepth - 1);

    if (dragDepth === 0) {
        dragActive.value = false;
    }
}
function onDragOver(e: DragEvent) {
    if (hasFiles(e)) {
        e.preventDefault();
    }
}
async function onDrop(e: DragEvent) {
    e.preventDefault();
    dragDepth = 0;
    dragActive.value = false;
    const file = e.dataTransfer?.files?.[0];

    if (!file) {
        return;
    }

    const text = await file.text();

    if (store.loadFromString(text, file.name)) {
        toasts.success(`Loaded ${file.name}`);
    } else {
        toasts.error(store.error.value ?? 'Invalid JSON');
    }
}

function hasFiles(e: DragEvent): boolean {
    return Array.from(e.dataTransfer?.types ?? []).includes('Files');
}
</script>

<template>
    <Head title="Editor" />

    <div
        class="flex h-screen w-screen flex-col overflow-hidden bg-[var(--color-app-bg)] text-[var(--color-fg)]"
        @dragenter="onDragEnter"
        @dragleave="onDragLeave"
        @dragover="onDragOver"
        @drop="onDrop"
    >
        <TopToolbar
            @open-search="ui.toggleSearch(true)"
            @open-import="ui.open('import')"
            @open-export="ui.open('export')"
            @open-shortcuts="ui.open('shortcuts')"
        />

        <main class="flex min-h-0 flex-1 overflow-hidden">
            <LeftExplorer @open-import="ui.open('import')" />

            <section
                class="relative flex min-w-0 flex-1 flex-col bg-[var(--color-surface)]"
            >
                <!-- Tab strip / breadcrumb header -->
                <header
                    class="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-app-bg-2)] pr-2 pl-3"
                >
                    <Icon
                        name="braces"
                        :size="13"
                        class="text-[var(--color-fg-faint)]"
                    />
                    <span
                        class="text-[12px] font-medium text-[var(--color-fg)]"
                    >
                        {{ store.sourceLabel.value ?? 'untitled.json' }}
                    </span>
                    <span
                        v-if="store.canUndo.value"
                        class="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
                        title="Unsaved changes"
                    />
                    <div class="flex-1" />
                    <button
                        type="button"
                        class="jl-focus inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[var(--color-fg-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
                        title="Search"
                        @click="ui.toggleSearch(true)"
                    >
                        <Icon name="search" :size="12" /> Find
                    </button>
                </header>

                <div class="relative min-h-0 flex-1">
                    <JsonTree v-if="ui.state.viewMode === 'tree'" />
                    <GraphView v-else />
                    <SearchPalette
                        :open="ui.state.searchOpen"
                        @close="
                            ui.toggleSearch(false);
                            search.clear();
                        "
                    />
                </div>
            </section>

            <RightInspector />
        </main>

        <StatusBar />

        <!-- Dialogs -->
        <ImportDialog
            :open="ui.state.dialog === 'import'"
            @close="ui.closeDialog()"
        />
        <ExportDialog
            :open="ui.state.dialog === 'export'"
            @close="ui.closeDialog()"
        />
        <ShortcutsDialog
            :open="ui.state.dialog === 'shortcuts'"
            @close="ui.closeDialog()"
        />

        <!-- Drag overlay -->
        <Transition
            enter-from-class="opacity-0"
            enter-active-class="transition duration-150 ease-out"
            leave-active-class="transition duration-150 ease-in"
            leave-to-class="opacity-0"
        >
            <div
                v-if="dragActive"
                class="jl-drop-overlay pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
            >
                <div
                    class="flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-accent)] bg-[var(--color-surface-2)]/80 px-10 py-8 text-center backdrop-blur"
                >
                    <Icon
                        name="upload"
                        :size="22"
                        class="mb-3 text-[var(--color-accent)]"
                    />
                    <div class="text-[14px] font-medium text-[var(--color-fg)]">
                        Drop to load
                    </div>
                    <div class="mt-1 text-[12px] text-[var(--color-fg-muted)]">
                        Release to import this JSON file
                    </div>
                </div>
            </div>
        </Transition>

        <ContextMenu />
        <ToastStack />
    </div>
</template>
