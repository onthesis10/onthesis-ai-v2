import { useEffect } from 'react';
import { create } from 'zustand';
import axios from 'axios';

interface LevelInfo {
    current_level: string;
    icon: string;
    total_hours: number;
    progress_percent: number;
    next_level: string | null;
    hours_to_next: number;
}

interface StreakInfo {
    current_streak: number;
    active_dates: string[];
}

interface ProductivityStats {
    total_seconds: number;
    level: LevelInfo;
    streak: StreakInfo;
}

interface ProductivityState {
    stats: ProductivityStats | null;
    heatmapData: { date: string, count: number }[];
    loading: boolean;
    hasFetched: boolean;
    fetchStats: () => Promise<void>;
    fetchHeatmap: () => Promise<void>;
    syncSession: (seconds: number) => Promise<void>;
    refresh: () => Promise<void>;
    setHasFetched: (val: boolean) => void;
}

export const useProductivityStore = create<ProductivityState>((set, get) => ({
    stats: null,
    heatmapData: [],
    loading: true,
    hasFetched: false,

    setHasFetched: (val) => set({ hasFetched: val }),

    fetchStats: async () => {
        try {
            const response = await axios.get('/api/productivity/stats');
            set({ stats: response.data, loading: false });
        } catch (error) {
            console.error("Error fetching productivity stats:", error);
            set({ loading: false });
        }
    },

    fetchHeatmap: async () => {
        try {
            const response = await axios.get('/api/productivity/heatmap');
            set({ heatmapData: response.data });
        } catch (error) {
            console.error("Error fetching heatmap:", error);
        }
    },

    syncSession: async (seconds: number) => {
        if (seconds <= 0) return;
        try {
            await axios.post('/api/productivity/sync', { duration: seconds });
            await get().refresh();
        } catch (error) {
            console.error("Error syncing session:", error);
        }
    },

    refresh: async () => {
        await Promise.all([get().fetchStats(), get().fetchHeatmap()]);
    }
}));

export const useProductivity = () => {
    const store = useProductivityStore();

    useEffect(() => {
        if (!store.hasFetched) {
            store.setHasFetched(true);
            store.refresh();
        }
    }, [store.hasFetched, store.refresh]);

    return {
        stats: store.stats,
        heatmapData: store.heatmapData,
        loading: store.loading,
        syncSession: store.syncSession,
        refresh: store.refresh
    };
};
