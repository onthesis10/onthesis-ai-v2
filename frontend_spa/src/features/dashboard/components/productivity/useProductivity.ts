import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface LevelInfo {
    current_level: string;
    icon: string; // e.g., "🥉"
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

export const useProductivity = () => {
    const [stats, setStats] = useState<ProductivityStats | null>(null);
    const [heatmapData, setHeatmapData] = useState<{ date: string, count: number }[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const response = await axios.get('/api/productivity/stats');
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching productivity stats:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchHeatmap = useCallback(async () => {
        try {
            const response = await axios.get('/api/productivity/heatmap');
            setHeatmapData(response.data);
        } catch (error) {
            console.error("Error fetching heatmap:", error);
        }
    }, []);

    const syncSession = async (seconds: number) => {
        if (seconds <= 0) return;
        try {
            await axios.post('/api/productivity/sync', { duration: seconds });
            // Refresh stats after sync
            fetchStats();
            fetchHeatmap();
        } catch (error) {
            console.error("Error syncing session:", error);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchHeatmap();
    }, [fetchStats, fetchHeatmap]);

    return {
        stats,
        heatmapData,
        loading,
        syncSession,
        refresh: () => { fetchStats(); fetchHeatmap(); }
    };
};
