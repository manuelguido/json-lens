export function formatBytes(n: number): string {
    if (!Number.isFinite(n) || n <= 0) {
return '0 B';
}

    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let v = n;

    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }

    return `${v < 10 && i > 0 ? v.toFixed(2) : v.toFixed(0)} ${units[i]}`;
}

export function formatNumber(n: number): string {
    return new Intl.NumberFormat('en-US').format(n);
}
