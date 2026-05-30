<script setup lang="ts">
/**
 * Virtualized JSON tree.
 *
 * The store flattens the visible tree into a 1D list of TreeRows. We render
 * only the rows currently in the viewport (plus a buffer above/below). This
 * keeps the DOM small and scrolling smooth even for very large documents.
 */
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
} from 'vue';
import EmptyState from '@/components/layout/EmptyState.vue';
import { useHotkeys } from '@/composables/useHotkeys';
import { useJsonSearch } from '@/composables/useJsonSearch';
import { useJsonStore } from '@/composables/useJsonStore';
import { pathToId } from '@/lib/jsonPath';
import JsonRow from './JsonRow.vue';

const ROW_HEIGHT = 28; // px — must match JsonRow `h-7` (28px)
const BUFFER = 10;

const store = useJsonStore();
const search = useJsonSearch();

const rootEl = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const viewportH = ref(0);

const total = computed(() => store.rows.value.length);
const totalHeight = computed(() => total.value * ROW_HEIGHT);

const startIndex = computed(() =>
    Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - BUFFER),
);
const endIndex = computed(() =>
    Math.min(
        total.value,
        Math.ceil((scrollTop.value + viewportH.value) / ROW_HEIGHT) + BUFFER,
    ),
);

const visibleRows = computed(() =>
    store.rows.value.slice(startIndex.value, endIndex.value),
);
const offsetY = computed(() => startIndex.value * ROW_HEIGHT);

function onScroll(e: Event) {
    scrollTop.value = (e.target as HTMLElement).scrollTop;
}

function measure() {
    if (!rootEl.value) {
        return;
    }

    viewportH.value = rootEl.value.clientHeight;
}

let ro: ResizeObserver | null = null;
onMounted(() => {
    measure();

    if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
        ro = new ResizeObserver(measure);
        ro.observe(rootEl.value);
    } else {
        window.addEventListener?.('resize', measure);
    }
});
onBeforeUnmount(() => {
    ro?.disconnect();
});

/* ---------- Scroll helpers ---------- */

function scrollRowIntoView(rowId: string) {
    const idx = store.rows.value.findIndex((r) => r.id === rowId);

    if (idx < 0 || !rootEl.value) {
        return;
    }

    const top = idx * ROW_HEIGHT;
    const bottom = top + ROW_HEIGHT;
    const scrollerTop = rootEl.value.scrollTop;
    const scrollerBottom = scrollerTop + rootEl.value.clientHeight;

    if (top < scrollerTop) {
        rootEl.value.scrollTo({ top: top - 40, behavior: 'smooth' });
    } else if (bottom > scrollerBottom) {
        rootEl.value.scrollTo({
            top: bottom - rootEl.value.clientHeight + 40,
            behavior: 'smooth',
        });
    }
}

/* When active search match changes, expand its ancestors and scroll. */
watch(
    () => search.activeMatch.value,
    async (m) => {
        if (!m) {
            return;
        }

        store.expandAncestors(m.path);
        store.select(m.rowId);
        await nextTick();
        scrollRowIntoView(m.rowId);
    },
);

/* ---------- Keyboard navigation within tree ---------- */

function moveSelection(delta: number) {
    if (total.value === 0) {
        return;
    }

    const cur = store.selectedId.value;
    const idx = cur ? store.rows.value.findIndex((r) => r.id === cur) : -1;
    const next = Math.max(
        0,
        Math.min(total.value - 1, (idx < 0 ? 0 : idx) + delta),
    );
    const row = store.rows.value[next];

    if (!row) {
        return;
    }

    store.select(row.id);
    nextTick(() => scrollRowIntoView(row.id));
}

useHotkeys([
    {
        keys: 'arrowdown',
        handler: () => moveSelection(1),
    },
    {
        keys: 'arrowup',
        handler: () => moveSelection(-1),
    },
    {
        keys: 'arrowright',
        handler: () => {
            const id = store.selectedId.value;

            if (!id) {
                return;
            }

            const row = store.rows.value.find((r) => r.id === id);

            if (row?.isContainer && !row.expanded) {
                store.toggleExpand(id);
            } else {
                moveSelection(1);
            }
        },
    },
    {
        keys: 'arrowleft',
        handler: () => {
            const id = store.selectedId.value;

            if (!id) {
                return;
            }

            const row = store.rows.value.find((r) => r.id === id);

            if (row?.isContainer && row.expanded) {
                store.toggleExpand(id);
            } else if (row && row.path.length > 0) {
                store.select(pathToId(row.path.slice(0, -1)));
                nextTick(() =>
                    scrollRowIntoView(pathToId(row.path.slice(0, -1))),
                );
            }
        },
    },
    {
        keys: 'enter',
        handler: () => {
            const id = store.selectedId.value;

            if (!id) {
                return;
            }

            const row = store.rows.value.find((r) => r.id === id);

            if (row?.isContainer) {
                store.toggleExpand(id);
            }
        },
    },
    {
        keys: 'delete',
        handler: () => {
            const id = store.selectedId.value;

            if (!id) {
                return;
            }

            const row = store.rows.value.find((r) => r.id === id);

            if (row && row.path.length > 0) {
                store.deleteNode(row.path);
            }
        },
    },
    {
        keys: 'backspace',
        handler: () => {
            const id = store.selectedId.value;

            if (!id) {
                return;
            }

            const row = store.rows.value.find((r) => r.id === id);

            if (row && row.path.length > 0) {
                store.deleteNode(row.path);
            }
        },
    },
]);
</script>

<template>
    <div
        ref="rootEl"
        class="relative h-full overflow-auto bg-[var(--color-surface)]"
        @scroll.passive="onScroll"
    >
        <EmptyState v-if="total === 0" />

        <template v-else>
            <div
                class="relative w-full"
                :style="{ height: totalHeight + 'px' }"
            >
                <div
                    class="absolute top-0 right-0 left-0 will-change-transform"
                    :style="{ transform: `translateY(${offsetY}px)` }"
                >
                    <JsonRow
                        v-for="row in visibleRows"
                        :key="row.id"
                        :row="row"
                    />
                </div>
            </div>
        </template>
    </div>
</template>
