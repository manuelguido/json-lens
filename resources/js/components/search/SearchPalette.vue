<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import Icon from '@/components/common/Icon.vue';
import { useJsonSearch } from '@/composables/useJsonSearch';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const search = useJsonSearch();
const inputEl = ref<HTMLInputElement | null>(null);

watch(
    () => props.open,
    (v) => {
        if (v) {
            nextTick(() => inputEl.value?.focus());
        }
    },
);

function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        emit('close');
    } else if (e.key === 'Enter') {
        e.preventDefault();

        if (e.shiftKey) {
            search.prev();
        } else {
            search.next();
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        search.next();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        search.prev();
    }
}
</script>

<template>
    <Transition
        enter-from-class="opacity-0 -translate-y-1"
        enter-active-class="transition duration-150 ease-out"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0 -translate-y-1"
    >
        <div
            v-if="open"
            class="surface absolute top-3 right-3 z-30 flex w-[420px] items-center gap-2 rounded-lg border bg-[var(--color-surface-2)] px-2.5 py-2 shadow-2xl"
        >
            <Icon
                name="search"
                :size="14"
                class="text-[var(--color-fg-faint)]"
            />
            <input
                ref="inputEl"
                v-model="search.query.value"
                placeholder="Search keys and values…"
                class="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-faint)]"
                spellcheck="false"
                @keydown="onKey"
            />
            <span
                class="rounded-sm bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-fg-muted)] tabular-nums"
            >
                <template v-if="search.query.value">
                    {{
                        search.matches.value.length === 0
                            ? 0
                            : search.activeIndex.value + 1
                    }}
                    /
                    {{ search.matches.value.length }}
                </template>
                <template v-else>—</template>
            </span>
            <button
                type="button"
                class="jl-focus rounded p-1 text-[var(--color-fg-faint)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
                title="Previous (⇧↵)"
                @click="search.prev()"
            >
                <Icon name="chevron-up" :size="13" />
            </button>
            <button
                type="button"
                class="jl-focus rounded p-1 text-[var(--color-fg-faint)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
                title="Next (↵)"
                @click="search.next()"
            >
                <Icon name="chevron-down" :size="13" />
            </button>
            <div class="h-4 w-px bg-[var(--color-border)]" />
            <button
                type="button"
                class="jl-focus rounded p-1 text-[var(--color-fg-faint)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
                title="Close (Esc)"
                @click="emit('close')"
            >
                <Icon name="x" :size="13" />
            </button>
        </div>
    </Transition>
</template>
