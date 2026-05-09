<script setup lang="ts">
/**
 * Thin-stroke, dev-tool style icon set. Inline SVG so we ship zero
 * icon-library weight and we control every pixel.
 */
import { computed } from 'vue';

const props = defineProps<{
    name: string;
    size?: number | string;
    strokeWidth?: number;
}>();

const PATHS: Record<string, string> = {
    // navigation / chevrons
    'chevron-right': '<path d="M9 6l6 6-6 6"/>',
    'chevron-down': '<path d="M6 9l6 6 6-6"/>',
    'chevron-up': '<path d="M6 15l6-6 6 6"/>',
    'chevron-left': '<path d="M15 6l-6 6 6 6"/>',

    // file/io
    upload: '<path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 21h14"/>',
    download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    paste: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/>',
    sparkles:
        '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 14l.7 2L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-1z"/>',

    // actions
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    trash: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    edit: '<path d="M4 20h4l11-11-4-4L4 16z"/>',
    check: '<path d="M5 12l5 5L20 7"/>',

    // structural
    'expand-all': '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M4 18h16"/>',
    'collapse-all': '<path d="M4 8l4-4 4 4"/><path d="M4 16l4 4 4-4"/><path d="M14 12h6"/>',
    braces: '<path d="M8 4a4 4 0 0 0-4 4v2a2 2 0 0 1-2 2 2 2 0 0 1 2 2v2a4 4 0 0 0 4 4"/><path d="M16 4a4 4 0 0 1 4 4v2a2 2 0 0 0 2 2 2 2 0 0 0-2 2v2a4 4 0 0 1-4 4"/>',
    brackets: '<path d="M8 4H4v16h4"/><path d="M16 4h4v16h-4"/>',

    // misc
    undo: '<path d="M9 14l-5-5 5-5"/><path d="M4 9h11a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H8"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0-5 5v0a5 5 0 0 0 5 5h7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h0"/><path d="M11 12h1v5h1"/>',
    warning:
        '<path d="M12 3l10 18H2z"/><path d="M12 10v5"/><path d="M12 18h0"/>',
    arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
    lens: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><circle cx="11" cy="11" r="3"/>',
    keyboard: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h0M11 10h0M15 10h0M7 14h10"/>',
    pin: '<path d="M12 2v6"/><path d="M9 8h6l1 6H8z"/><path d="M12 14v8"/>',
    dot: '<circle cx="12" cy="12" r="3"/>',

    // graph view
    graph: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="12" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 7l8 4M8 17l8-4"/>',
    tree: '<path d="M5 4h14"/><path d="M5 12h7"/><path d="M5 20h10"/><path d="M5 4v16"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7-2.7"/>',
    'zoom-in': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M11 8v6M8 11h6"/>',
    'zoom-out': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 11h6"/>',
    fit: '<path d="M4 9V5h4"/><path d="M16 5h4v4"/><path d="M20 15v4h-4"/><path d="M8 19H4v-4"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    focus: '<path d="M4 7V4h3"/><path d="M17 4h3v3"/><path d="M20 17v3h-3"/><path d="M7 20H4v-3"/><circle cx="12" cy="12" r="3"/>',
    'arrow-left': '<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>',
};

const inner = computed(() => PATHS[props.name] ?? PATHS.dot);
const dimension = computed(() => props.size ?? 16);
const sw = computed(() => props.strokeWidth ?? 1.5);
</script>

<template>
    <svg
        :width="dimension"
        :height="dimension"
        viewBox="0 0 24 24"
        fill="none"
        :stroke-width="sw"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        v-html="inner"
    />
</template>
