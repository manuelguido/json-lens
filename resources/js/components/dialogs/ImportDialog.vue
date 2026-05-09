<script setup lang="ts">
import { ref } from 'vue';
import Icon from '@/components/common/Icon.vue';
import { useJsonStore } from '@/composables/useJsonStore';
import { useToasts } from '@/composables/useToasts';
import { SAMPLE_DATASETS } from '@/lib/sampleData';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const store = useJsonStore();
const toasts = useToasts();

const tab = ref<'paste' | 'sample'>('paste');
const buffer = ref('');
const localError = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

function pickFile() {
    fileInput.value?.click();
}

async function onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];

    if (!f) {
return;
}

    const text = await f.text();

    if (store.loadFromString(text, f.name)) {
        toasts.success(`Loaded ${f.name}`);
        emit('close');
    } else {
        localError.value = store.error.value;
    }

    input.value = '';
}

function applyPaste() {
    localError.value = null;
    const ok = store.loadFromString(buffer.value, 'pasted.json');

    if (ok) {
        toasts.success('JSON loaded');
        buffer.value = '';
        emit('close');
    } else {
        localError.value = store.error.value;
    }
}

function loadSample(i: number) {
    const s = SAMPLE_DATASETS[i];
    store.setDocument(s.value, s.name);
    toasts.success(`Loaded ${s.name}`);
    emit('close');
}

function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
emit('close');
}
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
            @keydown="onKey"
        >
            <div
                class="surface w-[640px] max-w-[92vw] rounded-xl border bg-[var(--color-surface-2)] shadow-2xl"
            >
                <header class="flex items-center justify-between px-5 pt-4">
                    <div>
                        <h2 class="text-[14px] font-semibold tracking-tight text-[var(--color-fg)]">Import JSON</h2>
                        <p class="mt-0.5 text-[12px] text-[var(--color-fg-muted)]">
                            Paste, upload, or load a sample document.
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

                <!-- Tabs -->
                <nav class="mt-3 flex gap-1 border-b border-[var(--color-divider)] px-3">
                    <button
                        v-for="t in [
                            { id: 'paste', label: 'Paste / Upload', icon: 'paste' },
                            { id: 'sample', label: 'Samples', icon: 'sparkles' },
                        ] as const"
                        :key="t.id"
                        type="button"
                        class="jl-focus relative flex items-center gap-1.5 px-3 py-2 text-[12px] transition"
                        :class="tab === t.id
                            ? 'text-[var(--color-fg)]'
                            : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'"
                        @click="tab = t.id"
                    >
                        <Icon :name="t.icon" :size="12" />
                        {{ t.label }}
                        <span
                            v-if="tab === t.id"
                            class="absolute -bottom-px left-2 right-2 h-px bg-[var(--color-accent)]"
                        />
                    </button>
                </nav>

                <!-- Body -->
                <div class="p-4">
                    <template v-if="tab === 'paste'">
                        <textarea
                            v-model="buffer"
                            placeholder='{ "hello": "world" }'
                            spellcheck="false"
                            class="surface h-56 w-full resize-none rounded-md bg-[var(--color-surface)] p-3 font-mono text-[12px] leading-relaxed text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"
                        />
                        <p
                            v-if="localError"
                            class="mt-2 flex items-center gap-1.5 text-[11.5px] text-[var(--color-danger)]"
                        >
                            <Icon name="warning" :size="12" /> {{ localError }}
                        </p>
                        <div class="mt-3 flex items-center justify-between gap-2">
                            <button
                                type="button"
                                class="jl-focus inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] text-[var(--color-fg)] transition hover:bg-[var(--color-surface-3)]"
                                @click="pickFile"
                            >
                                <Icon name="upload" :size="12" /> Upload .json file
                            </button>
                            <input
                                ref="fileInput"
                                type="file"
                                accept="application/json,.json"
                                class="hidden"
                                @change="onFile"
                            />
                            <button
                                type="button"
                                class="jl-focus inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3.5 py-1.5 text-[12px] font-medium text-[#0e1014] transition hover:bg-[#a5bbff] disabled:cursor-not-allowed disabled:opacity-40"
                                :disabled="!buffer.trim()"
                                @click="applyPaste"
                            >
                                Load JSON
                                <Icon name="arrow" :size="12" />
                            </button>
                        </div>
                    </template>

                    <template v-else>
                        <ul class="grid gap-1.5">
                            <li v-for="(s, i) in SAMPLE_DATASETS" :key="s.name">
                                <button
                                    type="button"
                                    class="jl-focus group flex w-full items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-3)]"
                                    @click="loadSample(i)"
                                >
                                    <div>
                                        <div class="text-[13px] font-medium text-[var(--color-fg)]">{{ s.name }}</div>
                                        <div class="text-[11.5px] text-[var(--color-fg-muted)]">{{ s.description }}</div>
                                    </div>
                                    <Icon
                                        name="arrow"
                                        :size="14"
                                        class="text-[var(--color-fg-faint)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-fg-muted)]"
                                    />
                                </button>
                            </li>
                        </ul>
                    </template>
                </div>
            </div>
        </div>
    </Transition>
</template>
