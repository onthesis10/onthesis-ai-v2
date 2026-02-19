
type Variant = 'A' | 'B';

const STORAGE_KEY_PREFIX = 'onthesis_ab_';

export const getExperimentVariant = (experimentId: string, defaultVariant: Variant = 'A'): Variant => {
    const key = `${STORAGE_KEY_PREFIX}${experimentId}`;
    try {
        const stored = localStorage.getItem(key);
        if (stored === 'A' || stored === 'B') {
            return stored as Variant;
        }

        // Random assignment
        const variant: Variant = Math.random() > 0.5 ? 'B' : 'A';
        localStorage.setItem(key, variant);
        return variant;
    } catch (e) {
        return defaultVariant;
    }
};

// Debug helper to force a variant
export const forceExperimentVariant = (experimentId: string, variant: Variant) => {
    const key = `${STORAGE_KEY_PREFIX}${experimentId}`;
    localStorage.setItem(key, variant);
};

export const Experiments = {
    BADGE_PLACEMENT: 'badge_placement_v1'
};
