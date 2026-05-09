<script setup lang="ts">
import { computed } from 'vue';

interface Props {
    variant?: 'default' | 'primary' | 'ghost' | 'subtle';
    size?: 'xs' | 'sm' | 'md';
    disabled?: boolean;
    type?: 'button' | 'submit';
    title?: string;
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'default',
    size: 'sm',
    type: 'button',
});

const cls = computed(() => {
    const base =
        'inline-flex items-center gap-1.5 font-medium tracking-tight ' +
        'rounded-md transition-colors duration-100 ease-out select-none ' +
        'jl-focus disabled:opacity-40 disabled:cursor-not-allowed';
    const sz =
        props.size === 'xs'
            ? 'h-6 px-2 text-[11px]'
            : props.size === 'md'
              ? 'h-9 px-3.5 text-[13px]'
              : 'h-7 px-2.5 text-[12px]';
    const v =
        props.variant === 'primary'
            ? 'bg-[var(--color-accent)] text-[#0e1014] hover:bg-[#a5bbff]'
            : props.variant === 'ghost'
              ? 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]'
              : props.variant === 'subtle'
                ? 'bg-[var(--color-surface-2)] text-[var(--color-fg)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)]'
                : 'bg-[var(--color-surface)] text-[var(--color-fg)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)]';

    return `${base} ${sz} ${v}`;
});
</script>

<template>
    <button :type="type" :disabled="disabled" :title="title" :class="cls">
        <slot />
    </button>
</template>
