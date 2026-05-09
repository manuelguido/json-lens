import type { JsonValue } from './types';

export const SAMPLE_DATASETS: { name: string; description: string; value: JsonValue }[] = [
    {
        name: 'API response',
        description: 'A typical paginated REST response with nested resources.',
        value: {
            meta: {
                request_id: '01HX7K3Q9P2F9V3M2Y4G6N1B7C',
                duration_ms: 124,
                page: { current: 1, per_page: 25, total: 314, last_page: 13 },
            },
            data: [
                {
                    id: 'usr_8XJ2lkA',
                    type: 'user',
                    attributes: {
                        email: 'avery@example.com',
                        name: 'Avery Chen',
                        verified: true,
                        signup_at: '2024-09-12T08:14:11Z',
                        roles: ['admin', 'billing'],
                        preferences: {
                            theme: 'dark',
                            density: 'compact',
                            notifications: { email: true, push: false, sms: null },
                        },
                    },
                },
                {
                    id: 'usr_QmZx7Yp',
                    type: 'user',
                    attributes: {
                        email: 'rio@example.com',
                        name: 'Rio Patel',
                        verified: false,
                        signup_at: '2025-01-04T19:02:48Z',
                        roles: ['member'],
                        preferences: {
                            theme: 'system',
                            density: 'comfortable',
                            notifications: { email: true, push: true, sms: false },
                        },
                    },
                },
            ],
            links: {
                self: 'https://api.example.com/users?page=1',
                next: 'https://api.example.com/users?page=2',
                prev: null,
            },
        },
    },
    {
        name: 'Package manifest',
        description: 'A package.json-style document with dependencies.',
        value: {
            name: 'json-lens',
            version: '1.0.0',
            private: true,
            scripts: {
                dev: 'vite',
                build: 'vite build',
                'types:check': 'vue-tsc --noEmit',
            },
            dependencies: {
                vue: '^3.5.0',
                '@inertiajs/vue3': '^3.0.0',
                tailwindcss: '^4.1.0',
            },
            keywords: ['json', 'viewer', 'developer-tool'],
            engines: { node: '>=20' },
        },
    },
    {
        name: 'Geo collection',
        description: 'A small GeoJSON FeatureCollection.',
        value: {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: { name: 'Point A', score: 0.84 },
                    geometry: { type: 'Point', coordinates: [-3.703, 40.416] },
                },
                {
                    type: 'Feature',
                    properties: { name: 'Point B', score: 0.62 },
                    geometry: { type: 'Point', coordinates: [2.349, 48.864] },
                },
            ],
        },
    },
];
