// ─── CommandRegistry — Dynamic Command System ───
// VSCode-like command registry with self-register API for plugins.
// Principle: "Plugins, Not Monoliths" — plugins register their own commands.

/**
 * @typedef {Object} Command
 * @property {string} id - Unique command ID (e.g. 'ai.continue')
 * @property {string} label - Human-readable label
 * @property {string} group - Category: 'AI Actions' | 'Navigation' | 'Format' | 'Academic' | 'Layout' | 'Project'
 * @property {string} [shortcut] - Display shortcut (e.g. '⌘K')
 * @property {string} [icon] - Lucide icon name (e.g. 'sparkles')
 * @property {string} [description] - Optional description for palette
 * @property {(ctx: Object) => void} handler - Execution handler
 */

class CommandRegistryClass {
    constructor() {
        /** @type {Map<string, Command>} */
        this._commands = new Map();
        this._listeners = new Set();
    }

    /**
     * Register a command. Plugins call this to add their commands.
     * @param {Command} command
     */
    register(command) {
        if (!command.id || !command.handler) {
            console.warn('[CommandRegistry] Command must have id and handler:', command);
            return;
        }
        this._commands.set(command.id, command);
        this._notify();
    }

    /**
     * Register multiple commands at once.
     * @param {Command[]} commands
     */
    registerMany(commands) {
        commands.forEach((cmd) => this._commands.set(cmd.id, cmd));
        this._notify();
    }

    /**
     * Unregister a command (for plugin deactivation).
     * @param {string} id
     */
    unregister(id) {
        this._commands.delete(id);
        this._notify();
    }

    /**
     * Execute a command by ID.
     * @param {string} id
     * @param {Object} ctx - Runtime context
     */
    execute(id, ctx) {
        const cmd = this._commands.get(id);
        if (cmd?.handler) {
            cmd.handler(ctx);
        } else {
            console.warn(`[CommandRegistry] Command not found: ${id}`);
        }
    }

    /** Get all commands as array. */
    getAll() {
        return Array.from(this._commands.values());
    }

    /** Get commands filtered by group. */
    getByGroup(group) {
        return this.getAll().filter((cmd) => cmd.group === group);
    }

    /** Get a single command. */
    get(id) {
        return this._commands.get(id);
    }

    /** Subscribe to registry changes. Returns unsubscribe fn. */
    subscribe(listener) {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    _notify() {
        this._listeners.forEach((fn) => fn(this.getAll()));
    }
}

// ─── Singleton Instance ───
export const commandRegistry = new CommandRegistryClass();

// ─── Default Commands ───
// Built-in commands. Plugins add more via commandRegistry.register()
const defaultCommands = [
    // ── AI Actions ──
    {
        id: 'ai.run-draft',
        label: 'AI: Generate Draft',
        group: 'AI Actions',
        shortcut: '⌘↵',
        icon: 'sparkles',
        description: 'Jalankan AI untuk generate draft dari konteks saat ini',
        handler: (ctx) => ctx?.handleRunAI?.('general', { input_text: ctx?.getSelectionText?.() || '' }),
    },
    {
        id: 'ai.continue',
        label: 'AI: Lanjutkan Paragraf',
        group: 'AI Actions',
        icon: 'pen-line',
        description: 'AI melanjutkan paragraf yang sedang aktif',
        handler: (ctx) => ctx?.handleRunAI?.('continue', { input_text: ctx?.getSelectionText?.() || '' }),
    },
    {
        id: 'ai.improve',
        label: 'AI: Perbaiki Paragraf Ini',
        group: 'AI Actions',
        icon: 'wand-sparkles',
        description: 'AI memperbaiki gaya bahasa dan koherensi paragraf',
        handler: (ctx) => ctx?.handleRunAI?.('improve', { input_text: ctx?.getSelectionText?.() || '' }),
    },
    {
        id: 'ai.ask-selection',
        label: 'AI: Tanya tentang Seleksi',
        group: 'AI Actions',
        shortcut: '⌘/',
        icon: 'message-circle-question',
        description: 'Tanyakan sesuatu tentang teks yang diseleksi',
        handler: (ctx) => {
            const sel = ctx?.getSelectionText?.() || '';
            if (sel) ctx?.handleRunAI?.('chat', { input_text: `Jelaskan ini: ${sel}` });
        },
    },
    {
        id: 'ai.paraphrase',
        label: 'AI: Parafrase Seleksi',
        group: 'AI Actions',
        icon: 'repeat-2',
        description: 'Parafrase teks yang diseleksi tanpa mengubah makna',
        handler: (ctx) => ctx?.handleRunAI?.('paraphrase', { input_text: ctx?.getSelectionText?.() || '' }),
    },

    // ── Writing Tools (via Command Palette → Drawer) ──
    {
        id: 'tools.draft-generator',
        label: 'Draft Generator',
        group: 'AI Actions',
        icon: 'sparkles',
        description: 'Buka panel Draft Generator untuk generate konten bab',
        handler: (ctx) => ctx?.openToolDrawer?.('generator'),
    },
    {
        id: 'tools.writing-tools',
        label: 'Writing Tools',
        group: 'AI Actions',
        icon: 'book-open',
        description: 'Buka panel alat bantu penulisan akademis',
        handler: (ctx) => ctx?.openToolDrawer?.('tools'),
    },
    {
        id: 'tools.context-diagnostics',
        label: 'Context & Diagnostics',
        group: 'AI Actions',
        icon: 'scan-search',
        description: 'Lihat konteks paragraf aktif dan diagnostik penulisan',
        handler: (ctx) => ctx?.openToolDrawer?.('context'),
    },

    // ── Review Tools (via Command Palette → Drawer) ──
    {
        id: 'review.analysis',
        label: 'Review: Data Analysis',
        group: 'Academic',
        icon: 'bar-chart-2',
        description: 'Analisis data statistik bab aktif',
        handler: (ctx) => ctx?.openToolDrawer?.('analysis'),
    },
    {
        id: 'review.audit',
        label: 'Review: Logic Audit',
        group: 'Academic',
        icon: 'shield-check',
        description: 'Audit koherensi dan logika argumen',
        handler: (ctx) => ctx?.openToolDrawer?.('logic'),
    },
    {
        id: 'review.argument-graph',
        label: 'Review: Argument Graph',
        group: 'Academic',
        icon: 'git-branch',
        description: 'Visualisasi peta argumen bab aktif',
        handler: (ctx) => ctx?.openToolDrawer?.('thread'),
    },
    {
        id: 'review.duplicate-radar',
        label: 'Review: Duplicate Radar',
        group: 'Academic',
        icon: 'copy',
        description: 'Deteksi duplikasi semantik antar paragraf',
        handler: (ctx) => ctx?.openToolDrawer?.('dupes'),
    },
    {
        id: 'review.planner',
        label: 'Review: Thesis Graph Overview',
        group: 'Academic',
        icon: 'map',
        description: 'Lihat graph Thesis Brain dan status validasi bab',
        handler: (ctx) => ctx?.openToolDrawer?.('planner'),
    },
    {
        id: 'review.defense',
        label: 'Review: Sidang Prep',
        group: 'Academic',
        icon: 'graduation-cap',
        description: 'Persiapan dan simulasi sidang skripsi/tesis',
        handler: (ctx) => ctx?.openToolDrawer?.('defense'),
    },

    // ── Golden Thread (via Command Palette → Modal) ──
    {
        id: 'golden-thread.open',
        label: 'Golden Thread',
        group: 'Academic',
        icon: 'compass',
        description: 'Research coherence map — pastikan konsistensi alur riset',
        handler: (ctx) => ctx?.openGoldenThread?.(),
    },

    // ── Navigation ──
    {
        id: 'nav.chapter-next',
        label: 'Go to: Bab Selanjutnya',
        group: 'Navigation',
        icon: 'chevron-right',
        handler: (ctx) => ctx?.jumpChapter?.('next'),
    },
    {
        id: 'nav.chapter-prev',
        label: 'Go to: Bab Sebelumnya',
        group: 'Navigation',
        icon: 'chevron-left',
        handler: (ctx) => ctx?.jumpChapter?.('prev'),
    },
    {
        id: 'nav.focus-editor',
        label: 'Fokus ke Editor',
        group: 'Navigation',
        icon: 'text-cursor',
        handler: (ctx) => ctx?.focusEditor?.(),
    },

    // ── Layout ──
    {
        id: 'layout.toggle-left',
        label: 'Toggle Sidebar Kiri',
        group: 'Layout',
        shortcut: '⌘B',
        icon: 'panel-left-close',
        handler: (ctx) => ctx?.toggleLeftSidebar?.(),
    },
    {
        id: 'layout.toggle-agent',
        label: 'Toggle Agent Panel',
        group: 'Layout',
        shortcut: 'Ctrl+L',
        icon: 'panel-right-close',
        description: 'Buka/tutup panel Agent di sisi kanan',
        handler: (ctx) => ctx?.toggleRightSidebar?.(),
    },
    {
        id: 'layout.zen',
        label: 'Toggle Zen Mode',
        group: 'Layout',
        shortcut: 'Alt+Z',
        icon: 'maximize-2',
        handler: (ctx) => ctx?.toggleZen?.(),
    },
    {
        id: 'layout.preset-writer',
        label: 'Layout: Writer Mode',
        group: 'Layout',
        icon: 'pen-tool',
        description: 'Editor lebih lebar untuk fokus menulis',
        handler: (ctx) => ctx?.setLayoutPreset?.('writer'),
    },
    {
        id: 'layout.preset-review',
        label: 'Layout: Review Mode',
        group: 'Layout',
        icon: 'eye',
        description: 'Panel asisten lebih lebar untuk review',
        handler: (ctx) => ctx?.setLayoutPreset?.('review'),
    },
    {
        id: 'layout.preset-default',
        label: 'Layout: Balanced',
        group: 'Layout',
        icon: 'columns-2',
        description: 'Kembali ke layout seimbang default',
        handler: (ctx) => ctx?.setLayoutPreset?.('default'),
    },

    // ── Project ──
    {
        id: 'project.settings',
        label: 'Buka Project Settings',
        group: 'Project',
        icon: 'settings',
        handler: (ctx) => ctx?.openSettings?.(),
    },
    {
        id: 'project.save',
        label: 'Simpan Sekarang',
        group: 'Project',
        shortcut: '⌘S',
        icon: 'save',
        handler: (ctx) => ctx?.forceSave?.(),
    },

    // ── Academic ──
    {
        id: 'academic.insert-citation',
        label: 'Buka Citation Tools',
        group: 'Academic',
        shortcut: '⌘⇧C',
        icon: 'book-open',
        description: 'Buka panel tools sitasi dan audit referensi',
        handler: (ctx) => ctx?.openCitationModal?.(),
    },
    {
        id: 'academic.references',
        label: 'Kelola Referensi',
        group: 'Academic',
        icon: 'library',
        handler: (ctx) => ctx?.openReferences?.(),
    },

    // ── Editor ──
    {
        id: 'editor.split-right',
        label: 'Split Editor Right',
        group: 'Editor',
        icon: 'columns-2',
        description: 'Buka bab lain side by side di editor',
        handler: (ctx) => ctx?.splitRight?.(),
    },
    {
        id: 'editor.close-split',
        label: 'Close Split Editor',
        group: 'Editor',
        icon: 'x',
        description: 'Tutup split editor dan kembali ke mode single',
        handler: (ctx) => ctx?.closeSplit?.(),
    },

    // ── Session ──
    {
        id: 'session.start',
        label: 'Start Writing Session',
        group: 'Project',
        icon: 'zap',
        description: 'Mulai sesi menulis fokus (deep work mode)',
        handler: (ctx) => ctx?.openSession?.(),
    },
];

// Auto-register default commands
commandRegistry.registerMany(defaultCommands);

export default commandRegistry;
