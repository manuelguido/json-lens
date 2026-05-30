import { reactive } from 'vue';

export interface Toast {
    id: number;
    text: string;
    kind: 'info' | 'success' | 'error';
}

const state = reactive<{ items: Toast[] }>({ items: [] });
let nextId = 1;

function push(text: string, kind: Toast['kind'] = 'info', ttl = 2200) {
    const id = nextId++;
    state.items.push({ id, text, kind });

    if (typeof window !== 'undefined') {
        window.setTimeout(() => {
            const i = state.items.findIndex((t) => t.id === id);

            if (i >= 0) {
                state.items.splice(i, 1);
            }
        }, ttl);
    }
}

export function useToasts() {
    return {
        toasts: state.items,
        info: (t: string) => push(t, 'info'),
        success: (t: string) => push(t, 'success'),
        error: (t: string) => push(t, 'error', 3500),
    };
}
