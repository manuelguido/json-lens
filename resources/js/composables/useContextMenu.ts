import { reactive } from 'vue';

export interface ContextMenuItem {
    label: string;
    icon?: string;
    kbd?: string;
    danger?: boolean;
    disabled?: boolean;
    separator?: boolean;
    onClick?: () => void;
}

interface ContextMenuState {
    open: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
}

const state = reactive<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    items: [],
});

export function useContextMenu() {
    return {
        state,
        open(x: number, y: number, items: ContextMenuItem[]) {
            state.x = x;
            state.y = y;
            state.items = items;
            state.open = true;
        },
        close() {
            state.open = false;
            state.items = [];
        },
    };
}
