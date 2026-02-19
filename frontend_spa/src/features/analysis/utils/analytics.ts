
type EventCategory = 'Mode' | 'Chat' | 'Visualization' | 'System';

interface AnalyticsEvent {
    category: EventCategory;
    action: string;
    label?: string;
    value?: number;
    timestamp: number;
}

const LOG_PREFIX = '[Analytics] ';

export const trackEvent = (category: EventCategory, action: string, label?: string, value?: number) => {
    const event: AnalyticsEvent = {
        category,
        action,
        label,
        value,
        timestamp: Date.now()
    };

    // In a real app, this would send to GA/Mixpanel
    // For now, we log to console in dev mode
    console.debug(LOG_PREFIX, event);

    // Optionally persist to localStorage for simple auditing
    try {
        const history = JSON.parse(localStorage.getItem('onthesis_analytics_log') || '[]');
        history.push(event);
        // Keep last 100 events
        if (history.length > 100) history.shift();
        localStorage.setItem('onthesis_analytics_log', JSON.stringify(history));
    } catch (e) {
        // Ignore storage errors
    }
};

export const Analytics = {
    trackModeChange: (mode: string) => trackEvent('Mode', 'change_mode', mode),
    trackMessageSent: (length: number) => trackEvent('Chat', 'send_message', undefined, length),
    trackActionClicked: (actionLabel: string) => trackEvent('Chat', 'click_action', actionLabel),
    trackChartDownload: (chartTitle: string) => trackEvent('Visualization', 'download_chart', chartTitle),
    trackError: (error: string) => trackEvent('System', 'error', error),
};
