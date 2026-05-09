import { ref } from 'vue';

/**
 * Pan / zoom state for the graph canvas.
 *
 * The transform is applied as `translate(panX, panY) scale(zoom)` to a single
 * inner layer; both edges (SVG) and nodes (HTML) live in that layer so they
 * stay perfectly aligned at any zoom level.
 */

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 2.0;

export function useGraphViewport() {
    const panX = ref(0);
    const panY = ref(0);
    const zoom = ref(1);

    function clampZoom(z: number) {
        if (z < ZOOM_MIN) {
return ZOOM_MIN;
}

        if (z > ZOOM_MAX) {
return ZOOM_MAX;
}

        return z;
    }

    function panBy(dx: number, dy: number) {
        panX.value += dx;
        panY.value += dy;
    }

    /** Zoom around a viewport-relative anchor point (e.g. cursor). */
    function zoomAt(factor: number, anchorX: number, anchorY: number) {
        const next = clampZoom(zoom.value * factor);

        if (next === zoom.value) {
return;
}

        // Keep the world point under the anchor stationary.
        const worldX = (anchorX - panX.value) / zoom.value;
        const worldY = (anchorY - panY.value) / zoom.value;
        zoom.value = next;
        panX.value = anchorX - worldX * next;
        panY.value = anchorY - worldY * next;
    }

    function setZoom(z: number, viewportW: number, viewportH: number) {
        zoomAt(clampZoom(z) / zoom.value, viewportW / 2, viewportH / 2);
    }

    /** Center a world-space point in the viewport at current zoom. */
    function centerOn(worldX: number, worldY: number, viewportW: number, viewportH: number) {
        panX.value = viewportW / 2 - worldX * zoom.value;
        panY.value = viewportH / 2 - worldY * zoom.value;
    }

    function fitToBounds(
        bounds: { minX: number; minY: number; maxX: number; maxY: number },
        viewportW: number,
        viewportH: number,
        padding = 64,
    ) {
        const w = bounds.maxX - bounds.minX;
        const h = bounds.maxY - bounds.minY;

        if (w <= 0 || h <= 0 || viewportW <= 0 || viewportH <= 0) {
            reset();

            return;
        }

        const z = clampZoom(
            Math.min((viewportW - padding * 2) / w, (viewportH - padding * 2) / h, 1),
        );
        zoom.value = z;
        const cx = (bounds.minX + bounds.maxX) / 2;
        const cy = (bounds.minY + bounds.maxY) / 2;
        panX.value = viewportW / 2 - cx * z;
        panY.value = viewportH / 2 - cy * z;
    }

    function reset() {
        panX.value = 0;
        panY.value = 0;
        zoom.value = 1;
    }

    return { panX, panY, zoom, panBy, zoomAt, setZoom, centerOn, fitToBounds, reset };
}

export const ZOOM_LIMITS = { min: ZOOM_MIN, max: ZOOM_MAX };
