<script setup lang="ts">
import Icon from '@/components/common/Icon.vue';
import { modSymbol } from '@/composables/useHotkeys';
import { useUiState } from '@/composables/useUiState';

const ui = useUiState();
const mod = modSymbol();
</script>

<template>
    <div
        class="flex h-full flex-col items-center justify-center px-6 text-center"
    >
        <div
            class="mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-inner"
        >
            <Icon
                name="lens"
                :size="22"
                class="text-[var(--color-accent)]"
                :stroke-width="1.6"
            />
        </div>
        <h2
            class="text-[18px] font-semibold tracking-tight text-[var(--color-fg)]"
        >
            Drop JSON here
        </h2>
        <p
            class="mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--color-fg-muted)]"
        >
            Drag a
            <span class="font-mono text-[var(--color-fg)]">.json</span> file
            anywhere in this window, or import from text or a sample.
        </p>
        <div class="mt-6 flex items-center gap-2">
            <button
                type="button"
                class="jl-focus inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3.5 py-1.5 text-[12px] font-medium text-[#0e1014] transition hover:bg-[#a5bbff]"
                @click="ui.open('import')"
            >
                <Icon name="upload" :size="12" /> Import JSON
                <span
                    class="ml-1 rounded bg-[#0e1014]/15 px-1 font-mono text-[10px]"
                    >{{ mod }} O</span
                >
            </button>
        </div>
        <div
            class="pointer-events-none mt-12 flex items-center gap-1 text-[11px] text-[var(--color-fg-faint)]"
        >
            <Icon name="info" :size="11" />
            Everything stays in your browser. No data is uploaded.
        </div>
    </div>
</template>
