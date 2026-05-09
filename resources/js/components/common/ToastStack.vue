<script setup lang="ts">
import { useToasts } from '@/composables/useToasts';

const { toasts } = useToasts();
</script>

<template>
    <div
        class="pointer-events-none fixed bottom-9 left-1/2 z-50 -translate-x-1/2"
    >
        <TransitionGroup
            tag="div"
            class="flex flex-col items-center gap-2"
            enter-from-class="opacity-0 translate-y-1"
            enter-active-class="transition duration-150 ease-out"
            leave-active-class="transition duration-150 ease-in"
            leave-to-class="opacity-0 -translate-y-1"
            move-class="transition duration-150"
        >
            <div
                v-for="t in toasts"
                :key="t.id"
                class="surface flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px] shadow-lg"
                :class="{
                    'border-[var(--color-border)]': t.kind === 'info',
                    'border-[#3a4d3f]': t.kind === 'success',
                    'border-[#4d3a3a]': t.kind === 'error',
                }"
            >
                <span
                    class="inline-block h-1.5 w-1.5 rounded-full"
                    :class="{
                        'bg-[var(--color-fg-subtle)]': t.kind === 'info',
                        'bg-[var(--color-success)]': t.kind === 'success',
                        'bg-[var(--color-danger)]': t.kind === 'error',
                    }"
                />
                <span class="text-[var(--color-fg)]">{{ t.text }}</span>
            </div>
        </TransitionGroup>
    </div>
</template>
