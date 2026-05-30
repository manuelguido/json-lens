import { computed, ref, watch } from 'vue';
import { pathToId } from '@/lib/jsonPath';
import type { JsonPath, SearchMatch, TreeRow } from '@/lib/types';
import { useJsonStore } from './useJsonStore';

/**
 * Search engine — debounced, case-insensitive, scans both keys and values.
 * Operates on the *full* tree (not just the visible/flattened rows) so the
 * user can find matches even inside collapsed branches.
 */

const query = ref('');
const debounced = ref('');
const activeIndex = ref(0);

let debounceTimer: number | undefined;

watch(query, (v) => {
    if (typeof window === 'undefined') {
        return;
    }

    if (debounceTimer) {
        window.clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(() => {
        debounced.value = v;
        activeIndex.value = 0;
    }, 80);
});

const store = useJsonStore();

const matches = computed<SearchMatch[]>(() => {
    const q = debounced.value.trim().toLowerCase();

    if (!q || store.document.value === null) {
        return [];
    }

    const out: SearchMatch[] = [];
    scan(store.document.value, [], q, out);

    return out;
});

function scan(value: unknown, path: JsonPath, q: string, out: SearchMatch[]) {
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            scan(value[i], [...path, i], q, out);
        }

        return;
    }

    if (value !== null && typeof value === 'object') {
        for (const k of Object.keys(value as Record<string, unknown>)) {
            const childPath: JsonPath = [...path, k];

            if (k.toLowerCase().includes(q)) {
                out.push({
                    rowId: pathToId(childPath),
                    path: childPath,
                    field: 'key',
                });
            }

            scan((value as Record<string, unknown>)[k], childPath, q, out);
        }

        return;
    }

    // Primitive
    let str: string;

    if (value === null) {
        str = 'null';
    } else if (typeof value === 'string') {
        str = value;
    } else {
        str = String(value);
    }

    if (str.toLowerCase().includes(q)) {
        out.push({ rowId: pathToId(path), path, field: 'value' });
    }
}

const matchedRowIds = computed(() => {
    const set = new Set<string>();

    for (const m of matches.value) {
        set.add(m.rowId);
    }

    return set;
});

function next() {
    if (matches.value.length === 0) {
        return;
    }

    activeIndex.value = (activeIndex.value + 1) % matches.value.length;
}

function prev() {
    if (matches.value.length === 0) {
        return;
    }

    activeIndex.value =
        (activeIndex.value - 1 + matches.value.length) % matches.value.length;
}

function clear() {
    query.value = '';
    debounced.value = '';
    activeIndex.value = 0;
}

const activeMatch = computed<SearchMatch | null>(() => {
    return matches.value[activeIndex.value] ?? null;
});

/** Highlight a haystack: returns segments to render, with `match` flags. */
export function highlightSegments(
    haystack: string,
    needle: string,
): { text: string; match: boolean }[] {
    if (!needle) {
        return [{ text: haystack, match: false }];
    }

    const out: { text: string; match: boolean }[] = [];
    const lower = haystack.toLowerCase();
    const q = needle.toLowerCase();
    let i = 0;

    while (i < haystack.length) {
        const idx = lower.indexOf(q, i);

        if (idx === -1) {
            out.push({ text: haystack.slice(i), match: false });
            break;
        }

        if (idx > i) {
            out.push({ text: haystack.slice(i, idx), match: false });
        }

        out.push({ text: haystack.slice(idx, idx + q.length), match: true });
        i = idx + q.length;
    }

    return out;
}

/** Filter visible rows when a "filter mode" toggle is on (future). */
export function rowsMatching(rows: TreeRow[], q: string): TreeRow[] {
    if (!q) {
        return rows;
    }

    const ql = q.toLowerCase();

    return rows.filter((r) => {
        if (r.keyLabel && r.keyLabel.toLowerCase().includes(ql)) {
            return true;
        }

        if (r.preview.toLowerCase().includes(ql)) {
            return true;
        }

        return false;
    });
}

export function useJsonSearch() {
    return {
        query,
        debounced,
        matches,
        matchedRowIds,
        activeMatch,
        activeIndex,
        next,
        prev,
        clear,
    };
}
