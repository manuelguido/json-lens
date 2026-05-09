<script setup lang="ts">
import { computed, ref } from 'vue';
import Icon from '@/components/common/Icon.vue';
import { useJsonStore } from '@/composables/useJsonStore';
import { useToasts } from '@/composables/useToasts';
import { formatBytes } from '@/lib/format';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const store = useJsonStore();
const toasts = useToasts();

const mode = ref<'pretty' | 'minified'>('pretty');

const text = computed(() => {
    if (store.document.value === null) {
return '';
}

    return mode.value === 'pretty'
        ? JSON.stringify(store.document.value, null, 2)
        : JSON.stringify(store.document.value);
});

const sizeLabel = computed(() =>
    formatBytes(new TextEncoder().encode(text.value).length),
);

function copy() {
    navigator.clipboard
        .writeText(text.value)
        .then(() => toasts.success(`Copied ${mode.value} JSON`))
        .catch(() => toasts.error('Clipboard unavailable'));
}

function download() {
    const blob = new Blob([text.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (store.sourceLabel.value ?? 'document') + (mode.value === 'minified' ? '.min.json' : '.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toasts.success('Downloaded');
}
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
            class="fixed inset-0 z-40 flex items-start justify-center bg-[#06080b]/70 backdrop-blur-[2px] pt-[12vh]"
            @click.self="emit('close')"
            @keydown.esc="emit('close')"
        >
            <div class="surface w-[640px] max-w-[92vw] rounded-xl border bg-[var(--color-surface-2)] shadow-2xl">
                <header class="flex items-center justify-between px-5 pt-4">
                    <div>
                        <h2 class="text-[14px] font-semibold tracking-tight text-[var(--color-fg)]">Export</h2>
                        <p class="mt-0.5 text-[12px] text-[var(--color-fg-muted)]">
                            Download or copy the current document.
                        </p>
                    </div>
                    <button
                        type="button"
                        class="jl-focus rounded p-1 text-[var(--color-fg-faint)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
                        @click="emit('close')"
                    >
                        <Icon name="x" :size="14" />
                    </button>
                </header>

                <div class="flex items-center gap-2 px-5 pt-4">
                    <div
                        class="inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
                    >
                        <button
                            v-for="m in (['pretty', 'minified'] as const)"
                            :key="m"
                            type="button"
                            class="jl-focus rounded px-2.5 py-1 text-[11.5px] capitalize transition"
                            :class="mode === m
                                ? 'bg-[var(--color-surface-3)] text-[var(--color-fg)]'
                                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'"
                            @click="mode = m"
                        >
                            {{ m }}
                        </button>
                    </div>
                    <span class="text-[11.5px] text-[var(--color-fg-faint)]">{{ sizeLabel }}</span>
                </div>

                <div class="p-4">
                    <pre
                        class="surface max-h-[40vh] overflow-auto rounded-md bg-[var(--color-surface)] p-3 font-mono text-[12px] leading-relaxed text-[var(--color-fg)] whitespace-pre-wrap break-words"
                    >{{ text || '— empty —' }}</pre>

                    <div class="mt-3 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            class="jl-focus inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] text-[var(--color-fg)] transition hover:bg-[var(--color-surface-3)] disabled:opacity-40"
                            :disabled="!text"
                            @click="copy"
                        >
                            <Icon name="copy" :size="12" /> Copy
                        </button>
                        <button
                            type="button"
                            class="jl-focus inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3.5 py-1.5 text-[12px] font-medium text-[#0e1014] transition hover:bg-[#a5bbff] disabled:cursor-not-allowed disabled:opacity-40"
                            :disabled="!text"
                            @click="download"
                        >
                            <Icon name="download" :size="12" /> Download
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>
