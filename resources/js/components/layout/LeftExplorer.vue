<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/components/common/Button.vue';
import Icon from '@/components/common/Icon.vue';
import { useJsonStore } from '@/composables/useJsonStore';
import { formatBytes, formatNumber } from '@/lib/format';
import { SAMPLE_DATASETS } from '@/lib/sampleData';

const store = useJsonStore();

const emit = defineEmits<{ (e: 'open-import'): void }>();

const stats = computed(() => store.meta.value);
const recent = computed(() => SAMPLE_DATASETS);

function loadSample(i: number) {
    const sample = SAMPLE_DATASETS[i];
    store.setDocument(sample.value, sample.name);
}
</script>

<template>
    <aside
        class="flex h-full w-64 shrink-0 flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-app-bg-2)]"
    >
        <!-- Section: Document -->
        <div class="border-b border-[var(--color-divider)] px-3 py-3">
            <div
                class="mb-2 flex items-center justify-between text-[10px] font-semibold tracking-[0.08em] text-[var(--color-fg-faint)] uppercase"
            >
                <span>Document</span>
            </div>
            <div class="space-y-1.5 text-[12px]">
                <div class="flex justify-between text-[var(--color-fg-muted)]">
                    <span>Size</span>
                    <span class="font-mono text-[var(--color-fg)]">
                        {{ formatBytes(stats.bytes) }}
                    </span>
                </div>
                <div class="flex justify-between text-[var(--color-fg-muted)]">
                    <span>Nodes</span>
                    <span class="font-mono text-[var(--color-fg)]">
                        {{ formatNumber(stats.nodeCount) }}
                    </span>
                </div>
                <div class="flex justify-between text-[var(--color-fg-muted)]">
                    <span>Max depth</span>
                    <span class="font-mono text-[var(--color-fg)]">
                        {{ stats.maxDepth }}
                    </span>
                </div>
                <div class="flex justify-between text-[var(--color-fg-muted)]">
                    <span>Objects</span>
                    <span class="font-mono text-[var(--color-fg)]">
                        {{ formatNumber(stats.objectCount) }}
                    </span>
                </div>
                <div class="flex justify-between text-[var(--color-fg-muted)]">
                    <span>Arrays</span>
                    <span class="font-mono text-[var(--color-fg)]">
                        {{ formatNumber(stats.arrayCount) }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Section: Tree controls -->
        <div class="border-b border-[var(--color-divider)] px-3 py-3">
            <div
                class="mb-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--color-fg-faint)] uppercase"
            >
                Tree
            </div>
            <div class="flex gap-1">
                <Button
                    variant="subtle"
                    size="xs"
                    title="Expand all"
                    @click="store.expandAll()"
                >
                    <Icon name="expand-all" :size="12" /> Expand
                </Button>
                <Button
                    variant="subtle"
                    size="xs"
                    title="Collapse all"
                    @click="store.collapseAll()"
                >
                    <Icon name="collapse-all" :size="12" /> Collapse
                </Button>
            </div>
        </div>

        <!-- Section: Samples -->
        <div class="flex-1 overflow-y-auto px-3 py-3">
            <div
                class="mb-2 flex items-center justify-between text-[10px] font-semibold tracking-[0.08em] text-[var(--color-fg-faint)] uppercase"
            >
                <span>Samples</span>
                <button
                    type="button"
                    class="jl-focus -mr-1 rounded p-1 text-[var(--color-fg-faint)] transition hover:text-[var(--color-fg-muted)]"
                    title="Import"
                    @click="emit('open-import')"
                >
                    <Icon name="plus" :size="11" />
                </button>
            </div>
            <ul class="flex flex-col gap-0.5">
                <li v-for="(s, i) in recent" :key="s.name">
                    <button
                        type="button"
                        class="jl-focus group flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition hover:bg-[var(--color-surface)]"
                        @click="loadSample(i)"
                    >
                        <span
                            class="text-[12px] font-medium text-[var(--color-fg)] group-hover:text-[var(--color-fg)]"
                            >{{ s.name }}</span
                        >
                        <span
                            class="line-clamp-1 text-[11px] text-[var(--color-fg-faint)]"
                            >{{ s.description }}</span
                        >
                    </button>
                </li>
            </ul>
        </div>

        <!-- Footer hint -->
        <div
            class="border-t border-[var(--color-divider)] px-3 py-2.5 text-[11px] leading-snug text-[var(--color-fg-faint)]"
        >
            <div class="flex items-center gap-1.5">
                <Icon name="info" :size="11" />
                <span>Drop a .json file anywhere</span>
            </div>
        </div>
    </aside>
</template>
