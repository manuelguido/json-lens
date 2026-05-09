<script setup lang="ts">
/**
 * Single global context menu, mounted once at the app root.
 * Repositions to stay inside the viewport. Closes on outside click / Escape.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useContextMenu } from '@/composables/useContextMenu';
import Icon from './Icon.vue';

const ctx = useContextMenu();
const root = ref<HTMLElement | null>(null);
const adjusted = ref({ x: 0, y: 0 });

const visible = computed(() => ctx.state.open);

watch(
    () => [ctx.state.open, ctx.state.x, ctx.state.y] as const,
    async ([open, x, y]) => {
        if (!open) {
return;
}

        adjusted.value = { x, y };
        await new Promise((r) => requestAnimationFrame(r));

        if (!root.value) {
return;
}

        const rect = root.value.getBoundingClientRect();
        const margin = 8;
        let nx = x;
        let ny = y;

        if (nx + rect.width + margin > window.innerWidth) {
            nx = Math.max(margin, window.innerWidth - rect.width - margin);
        }

        if (ny + rect.height + margin > window.innerHeight) {
            ny = Math.max(margin, window.innerHeight - rect.height - margin);
        }

        adjusted.value = { x: nx, y: ny };
    },
);

function onDocClick(e: MouseEvent) {
    if (!ctx.state.open) {
return;
}

    if (root.value && root.value.contains(e.target as Node)) {
return;
}

    ctx.close();
}

function onKey(e: KeyboardEvent) {
    if (!ctx.state.open) {
return;
}

    if (e.key === 'Escape') {
        e.preventDefault();
        ctx.close();
    }
}

function activate(item: { disabled?: boolean; onClick?: () => void; separator?: boolean }) {
    if (item.disabled || item.separator) {
return;
}

    ctx.close();
    item.onClick?.();
}

onMounted(() => {
    document.addEventListener('mousedown', onDocClick, true);
    document.addEventListener('keydown', onKey, true);
});

onBeforeUnmount(() => {
    document.removeEventListener('mousedown', onDocClick, true);
    document.removeEventListener('keydown', onKey, true);
});
</script>

<template>
    <Teleport to="body">
        <div
            v-if="visible"
            ref="root"
            class="jl-menu"
            role="menu"
            :style="{ left: `${adjusted.x}px`, top: `${adjusted.y}px` }"
            @contextmenu.prevent
        >
            <template v-for="(item, idx) in ctx.state.items" :key="idx">
                <div v-if="item.separator" class="jl-menu-sep" />
                <button
                    v-else
                    type="button"
                    class="jl-menu-item w-full text-left"
                    :data-disabled="item.disabled || undefined"
                    :data-danger="item.danger || undefined"
                    role="menuitem"
                    @click="activate(item)"
                >
                    <Icon v-if="item.icon" :name="item.icon" :size="14" />
                    <span class="flex-1">{{ item.label }}</span>
                    <span v-if="item.kbd" class="menu-kbd">{{ item.kbd }}</span>
                </button>
            </template>
        </div>
    </Teleport>
</template>
