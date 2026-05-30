<script setup lang="ts">
import Icon from '@/components/common/Icon.vue';
import { modSymbol } from '@/composables/useHotkeys';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();
const mod = modSymbol();

const groups = [
    {
        title: 'General',
        items: [
            { keys: [mod, 'F'], label: 'Open search' },
            { keys: [mod, 'O'], label: 'Import JSON' },
            { keys: [mod, 'S'], label: 'Export JSON' },
            { keys: [mod, '1'], label: 'Tree view' },
            { keys: [mod, '2'], label: 'Graph view' },
            { keys: [mod, 'E'], label: 'Toggle edit mode' },
            { keys: [mod, 'Z'], label: 'Undo' },
            { keys: [mod, '⇧', 'Z'], label: 'Redo' },
            { keys: ['?'], label: 'This help' },
            { keys: ['Esc'], label: 'Close overlay' },
        ],
    },
    {
        title: 'Navigation',
        items: [
            { keys: ['↑', '↓'], label: 'Move selection' },
            { keys: ['→'], label: 'Expand / move down' },
            { keys: ['←'], label: 'Collapse / move up' },
            { keys: ['↵'], label: 'Toggle expand' },
            { keys: ['⌫', 'Del'], label: 'Delete selected node' },
        ],
    },
    {
        title: 'Graph view',
        items: [
            { keys: ['F'], label: 'Fit to screen' },
            { keys: ['0'], label: 'Reset zoom' },
            { keys: ['+', '−'], label: 'Zoom in / out' },
            { keys: ['Wheel'], label: 'Zoom (cursor-anchored)' },
            { keys: ['Drag'], label: 'Pan canvas' },
            { keys: ['Right-click'], label: 'Context menu' },
        ],
    },
    {
        title: 'Search',
        items: [
            { keys: ['↵'], label: 'Next match' },
            { keys: ['⇧', '↵'], label: 'Previous match' },
        ],
    },
];
</script>

<template>
    <Transition
        enter-from-class="opacity-0"
        enter-active-class="transition duration-150 ease-out"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0"
    >
        <div
            v-if="open"
            class="fixed inset-0 z-40 flex items-center justify-center bg-[#06080b]/70 backdrop-blur-[2px]"
            @click.self="emit('close')"
            @keydown.esc="emit('close')"
        >
            <div
                class="surface w-[560px] max-w-[92vw] rounded-xl border bg-[var(--color-surface-2)] shadow-2xl"
            >
                <header
                    class="flex items-center justify-between px-5 pt-4 pb-3"
                >
                    <div class="flex items-center gap-2">
                        <Icon
                            name="keyboard"
                            :size="14"
                            class="text-[var(--color-fg-muted)]"
                        />
                        <h2
                            class="text-[14px] font-semibold tracking-tight text-[var(--color-fg)]"
                        >
                            Keyboard shortcuts
                        </h2>
                    </div>
                    <button
                        type="button"
                        class="jl-focus rounded p-1 text-[var(--color-fg-faint)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
                        @click="emit('close')"
                    >
                        <Icon name="x" :size="14" />
                    </button>
                </header>
                <div class="grid grid-cols-2 gap-x-6 gap-y-5 px-5 pb-5">
                    <section v-for="g in groups" :key="g.title">
                        <h3
                            class="mb-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--color-fg-faint)] uppercase"
                        >
                            {{ g.title }}
                        </h3>
                        <ul class="space-y-1.5">
                            <li
                                v-for="item in g.items"
                                :key="item.label"
                                class="flex items-center justify-between gap-3 text-[12px]"
                            >
                                <span class="text-[var(--color-fg-muted)]">{{
                                    item.label
                                }}</span>
                                <span class="flex items-center gap-1">
                                    <kbd
                                        v-for="k in item.keys"
                                        :key="k"
                                        class="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--color-fg)]"
                                        >{{ k }}</kbd
                                    >
                                </span>
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    </Transition>
</template>
