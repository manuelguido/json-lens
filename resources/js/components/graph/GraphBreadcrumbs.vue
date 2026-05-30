<script setup lang="ts">
/**
 * Breadcrumb trail of the currently selected node's path. Clicking a crumb
 * selects the corresponding ancestor node.
 */
import { computed } from 'vue';
import { pathToId } from '@/lib/jsonPath';
import type { JsonPath } from '@/lib/types';

const props = defineProps<{ path: JsonPath }>();
const emit = defineEmits<{ (e: 'select', id: string): void }>();

interface Crumb {
    label: string;
    id: string;
}

const crumbs = computed<Crumb[]>(() => {
    const out: Crumb[] = [{ label: 'root', id: '$' }];

    for (let i = 0; i < props.path.length; i++) {
        const seg = props.path[i];
        const slice = props.path.slice(0, i + 1);
        out.push({
            label: typeof seg === 'number' ? `[${seg}]` : String(seg),
            id: pathToId(slice),
        });
    }

    return out;
});
</script>

<template>
    <div v-if="crumbs.length > 1" class="gv-breadcrumbs">
        <template v-for="(c, i) in crumbs" :key="c.id">
            <span v-if="i > 0" class="crumb-sep">›</span>
            <button
                type="button"
                class="truncate"
                @click="emit('select', c.id)"
            >
                {{ c.label }}
            </button>
        </template>
    </div>
</template>
