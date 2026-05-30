import { reactive } from 'vue';

export type DialogId = 'import' | 'export' | 'shortcuts' | null;
export type ViewMode = 'tree' | 'graph';

interface UiState {
    dialog: DialogId;
    searchOpen: boolean;
    viewMode: ViewMode;
    editMode: boolean;
    /** When non-null, the graph isolates the subtree rooted at this row id. */
    focusedRootId: string | null;
}

const STORAGE_KEY = 'json-lens:ui:v1';

const state = reactive<UiState>({
    dialog: null,
    searchOpen: false,
    viewMode: 'tree',
    editMode: false,
    focusedRootId: null,
});

let hydrated = false;

function persist() {
    if (!hydrated) {
        return;
    }

    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                viewMode: state.viewMode,
                editMode: state.editMode,
            }),
        );
    } catch {
        /* ignore */
    }
}

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
        setViewMode(mode: ViewMode) {
            state.viewMode = mode;
            persist();
        },
        setEditMode(v: boolean) {
            state.editMode = v;
            persist();
        },
        toggleEditMode() {
            state.editMode = !state.editMode;
            persist();
        },
        setFocusedRoot(id: string | null) {
            state.focusedRootId = id;
        },
        hydrate() {
            if (typeof window === 'undefined') {
                hydrated = true;

                return;
            }

            try {
                const raw = localStorage.getItem(STORAGE_KEY);

                if (raw) {
                    const parsed = JSON.parse(raw) as Partial<UiState>;

                    if (
                        parsed.viewMode === 'tree' ||
                        parsed.viewMode === 'graph'
                    ) {
                        state.viewMode = parsed.viewMode;
                    }

                    if (typeof parsed.editMode === 'boolean') {
                        state.editMode = parsed.editMode;
                    }
                }
            } catch {
                /* ignore */
            } finally {
                hydrated = true;
            }
        },
    };
}
