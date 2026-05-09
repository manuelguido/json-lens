<script setup lang="ts">
import { computed } from 'vue';
import Icon from '@/components/common/Icon.vue';
import { useJsonSearch } from '@/composables/useJsonSearch';
import { useJsonStore } from '@/composables/useJsonStore';
import { formatBytes, formatNumber } from '@/lib/format';
import { pathToDisplay } from '@/lib/jsonPath';

const store = useJsonStore();
const search = useJsonSearch();

const selectedPath = computed(() => {
    const id = store.selectedId.value;

    if (!id) {
return null;
}

    const r = store.rows.value.find((x) => x.id === id);

    return r ? pathToDisplay(r.path) : null;
});

const status = computed(() => {
    if (store.error.value) {
return { kind: 'error' as const, text: store.error.value };
}

    if (store.document.value === null) {
return { kind: 'empty' as const, text: 'No document loaded' };
}

    return { kind: 'ok' as const, text: 'Ready' };
});
</script>

<template>
    <footer
        class="flex h-7 shrink-0 items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-app-bg-2)] px-3 text-[11px] text-[var(--color-fg-muted)]"
    >
        <!-- Status -->
        <div class="flex items-center gap-1.5">
            <span
                class="inline-block h-1.5 w-1.5 rounded-full"
                :class="{
                    'bg-[var(--color-success)]': status.kind === 'ok',
                    'bg-[var(--color-fg-faint)]': status.kind === 'empty',
                    'bg-[var(--color-danger)]': status.kind === 'error',
                }"
            />
            <span>{{ status.text }}</span>
        </div>

        <div class="h-3 w-px bg-[var(--color-border)]" />

        <!-- Doc stats -->
        <span class="flex items-center gap-1">
            <Icon name="braces" :size="11" />
            {{ formatNumber(store.meta.value.nodeCount) }} nodes
        </span>
        <span>{{ formatBytes(store.meta.value.bytes) }}</span>

        <!-- Search status -->
        <template v-if="search.matches.value.length > 0">
            <div class="h-3 w-px bg-[var(--color-border)]" />
            <span class="flex items-center gap-1 text-[var(--color-fg)]">
                <Icon name="search" :size="11" />
                {{ search.activeIndex.value + 1 }} of
                {{ search.matches.value.length }}
            </span>
        </template>

        <div class="flex-1" />

        <!-- Path -->
        <span v-if="selectedPath" class="truncate font-mono text-[var(--color-fg-muted)]">
            {{ selectedPath }}
        </span>
        <div class="h-3 w-px bg-[var(--color-border)]" />
        <span class="font-mono text-[var(--color-fg-faint)]">UTF-8</span>
        <span class="font-mono text-[var(--color-fg-faint)]">JSON</span>
    </footer>
</template>
