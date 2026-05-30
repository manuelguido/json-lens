import { onBeforeUnmount, onMounted } from 'vue';

export type Modifier = 'mod' | 'shift' | 'alt';
export interface HotkeyDef {
    keys: string; // e.g. "mod+k", "mod+shift+z", "Escape"
    handler: (e: KeyboardEvent) => void;
    /** Allow firing even when focus is in an input. */
    allowInInput?: boolean;
}

const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);

function matches(e: KeyboardEvent, spec: string): boolean {
    const parts = spec
        .toLowerCase()
        .split('+')
        .map((p) => p.trim());
    const key = parts[parts.length - 1];
    const want = new Set(parts.slice(0, -1));

    const wantMod = want.has('mod');
    const wantShift = want.has('shift');
    const wantAlt = want.has('alt');

    const modPressed = isMac ? e.metaKey : e.ctrlKey;

    if (wantMod !== modPressed) {
        return false;
    }

    if (wantShift !== e.shiftKey) {
        return false;
    }

    if (wantAlt !== e.altKey) {
        return false;
    }

    const eKey = e.key.toLowerCase();

    if (key === 'space') {
        return e.code === 'Space';
    }

    return eKey === key;
}

function isEditable(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) {
        return false;
    }

    const tag = el.tagName;

    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return true;
    }

    if (el.isContentEditable) {
        return true;
    }

    return false;
}

export function useHotkeys(defs: HotkeyDef[]) {
    function onKey(e: KeyboardEvent) {
        for (const d of defs) {
            if (!matches(e, d.keys)) {
                continue;
            }

            if (!d.allowInInput && isEditable(e.target)) {
                continue;
            }

            e.preventDefault();
            d.handler(e);

            return;
        }
    }
    onMounted(() => window.addEventListener('keydown', onKey));
    onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
}

export function modSymbol(): string {
    return isMac ? '⌘' : 'Ctrl';
}
