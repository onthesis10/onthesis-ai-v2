// ─── PluginRegistry — Phase 4: Extension System ───
// Formalized plugin architecture with activate/deactivate lifecycle.
// Contract: { id, name, description, version, activate(ctx), deactivate() }

class PluginRegistryClass {
    constructor() {
        /** @type {Map<string, Plugin>} */
        this._plugins = new Map();
        /** @type {Set<string>} */
        this._active = new Set();
        this._listeners = new Set();
    }

    /**
     * Register a plugin.
     * @param {{ id: string, name: string, description: string, version: string, category: string, activate: (ctx: Object) => void, deactivate: () => void }} plugin
     */
    register(plugin) {
        if (!plugin.id) {
            console.warn('[PluginRegistry] Plugin must have an id:', plugin);
            return;
        }
        this._plugins.set(plugin.id, plugin);
        this._notify();
    }

    /** Register multiple plugins at once. */
    registerMany(plugins) {
        plugins.forEach(p => this._plugins.set(p.id, p));
        this._notify();
    }

    /** Unregister a plugin. */
    unregister(id) {
        if (this._active.has(id)) this.deactivate(id);
        this._plugins.delete(id);
        this._notify();
    }

    /** Activate a plugin. */
    activate(id, ctx = {}) {
        const plugin = this._plugins.get(id);
        if (!plugin) return;
        if (this._active.has(id)) return; // already active
        try {
            plugin.activate?.(ctx);
            this._active.add(id);
            this._notify();
        } catch (err) {
            console.error(`[PluginRegistry] Failed to activate ${id}:`, err);
        }
    }

    /** Deactivate a plugin. */
    deactivate(id) {
        const plugin = this._plugins.get(id);
        if (!plugin || !this._active.has(id)) return;
        try {
            plugin.deactivate?.();
            this._active.delete(id);
            this._notify();
        } catch (err) {
            console.error(`[PluginRegistry] Failed to deactivate ${id}:`, err);
        }
    }

    /** Check if a plugin is active. */
    isActive(id) {
        return this._active.has(id);
    }

    /** Get all registered plugins. */
    getAll() {
        return Array.from(this._plugins.values()).map(p => ({
            ...p,
            isActive: this._active.has(p.id),
        }));
    }

    /** Get plugins grouped by category. */
    getByCategory(category) {
        return this.getAll().filter(p => p.category === category);
    }

    /** Subscribe to registry changes. Returns unsubscribe fn. */
    subscribe(listener) {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    _notify() {
        this._listeners.forEach(fn => fn(this.getAll()));
    }
}

// ─── Singleton Instance ───
export const pluginRegistry = new PluginRegistryClass();

// ─── Built-in Plugins ───
const builtInPlugins = [
    {
        id: 'plugin.ghost-text',
        name: 'Ghost Text',
        description: 'Inline AI completion yang muncul otomatis saat menulis. Tekan Tab untuk menerima.',
        version: '1.0.0',
        category: 'AI',
        activate: () => console.log('[Plugin] Ghost Text activated'),
        deactivate: () => console.log('[Plugin] Ghost Text deactivated'),
    },
    {
        id: 'plugin.diagnostics',
        name: 'Inline Diagnostics',
        description: 'Pengecekan otomatis: kalimat panjang, bahasa informal, klaim tanpa sitasi.',
        version: '1.0.0',
        category: 'Writing',
        activate: () => console.log('[Plugin] Diagnostics activated'),
        deactivate: () => console.log('[Plugin] Diagnostics deactivated'),
    },
    {
        id: 'plugin.argument-graph',
        name: 'Argument Graph',
        description: 'Visualisasi peta argumen dengan klaim dan relasi logis antar paragraf.',
        version: '1.0.0',
        category: 'Academic',
        activate: () => console.log('[Plugin] Argument Graph activated'),
        deactivate: () => console.log('[Plugin] Argument Graph deactivated'),
    },
    {
        id: 'plugin.voice-meter',
        name: 'Academic Voice Meter',
        description: 'Skor gaya bahasa akademik real-time: passive, hedging, formality, colloquial.',
        version: '1.0.0',
        category: 'Academic',
        activate: () => console.log('[Plugin] Voice Meter activated'),
        deactivate: () => console.log('[Plugin] Voice Meter deactivated'),
    },
    {
        id: 'plugin.golden-thread',
        name: 'Golden Thread',
        description: 'Research coherence map — 5 node utama (RQ, Hipotesis, Metodologi, Temuan, Kesimpulan).',
        version: '1.0.0',
        category: 'Academic',
        activate: () => console.log('[Plugin] Golden Thread activated'),
        deactivate: () => console.log('[Plugin] Golden Thread deactivated'),
    },
    {
        id: 'plugin.duplicate-radar',
        name: 'Duplicate Radar',
        description: 'Deteksi duplikasi semantik antar paragraf menggunakan AI.',
        version: '1.0.0',
        category: 'Academic',
        activate: () => console.log('[Plugin] Duplicate Radar activated'),
        deactivate: () => console.log('[Plugin] Duplicate Radar deactivated'),
    },
    {
        id: 'plugin.thesis-export',
        name: 'Thesis Exporter',
        description: 'Eksport bab atau keseluruhan skripsi ke format Word (DOCX) sesuai standar institusi.',
        version: '1.0.0',
        category: 'Tools',
        activate: () => console.log('[Plugin] Thesis Export activated'),
        deactivate: () => console.log('[Plugin] Thesis Export deactivated'),
    }
];

// Auto-register and activate all built-in plugins
pluginRegistry.registerMany(builtInPlugins);
builtInPlugins.forEach(p => pluginRegistry.activate(p.id));

export default pluginRegistry;
