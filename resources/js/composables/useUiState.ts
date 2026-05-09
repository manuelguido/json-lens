import { reactive } from 'vue';

export type DialogId = 'import' | 'export' | 'shortcuts' | null;

const state = reactive<{
    dialog: DialogId;
    searchOpen: boolean;
}>({
    dialog: null,
    searchOpen: false,
});

export function useUiState() {
    return {
        state,
        open(id: Exclude<DialogId, null>) {
            state.dialog = id;
        },
        closeDialog() {
            state.dialog = null;
        },
        toggleSearch(v?: boolean) {
            state.searchOpen = v ?? !state.searchOpen;
        },
    };
}
