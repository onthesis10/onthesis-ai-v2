import React from 'react';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, ListFilter } from 'lucide-react';

interface ParaphraseStyleSelectProps {
    value: string;
    onChange: (value: string) => void;
    isHappy?: boolean;
}

const PARAPHRASE_STYLES = [
    {
        group: "Academic Core",
        items: [
            { value: "academic", label: "Standar Akademis", description: "Formal, objektif, ilmiah" },
            { value: "academic_kritis", label: "Analisis Kritis", description: "Evaluatif, tajam, analitis" },
            { value: "anti_plagiarisme", label: "Anti-Plagiarisme", description: "Rombak struktur sintaksis total" },
        ]
    },
    {
        group: "Scientific Styles",
        items: [
            { value: "filosofis", label: "Filosofis & Konseptual", description: "Abstrak dan mendalam" },
            { value: "deskriptif", label: "Faktual Deskriptif", description: "Naratif kronologis dan mendetail" },
            { value: "persuasif", label: "Argumentatif Persuasif", description: "Meyakinkan dan berbobot" },
            { value: "eksak", label: "Eksak / Matematis", description: "Lugas, kering, tepat sasaran" },
        ]
    },
    {
        group: "Other Styles",
        items: [
            { value: "puitis", label: "Puitis / Sastrawi", description: "Estetis dan menggunakan metafora" },
            { value: "jurnalistis", label: "Jurnalistik", description: "Populer dan menarik (Rilis media)" },
            { value: "formal", label: "Resmi & Administratif", description: "Baku, sopan, PUEBI ketat" },
            { value: "simple", label: "Sederhana & Lugas", description: "Santai, jelas, to-the-point" },
            { value: "creative", label: "Kreatif / Bebas", description: "Naratif, mengalir, imajinatif" },
        ]
    }
];

export const ParaphraseStyleSelect: React.FC<ParaphraseStyleSelectProps> = ({ value, onChange, isHappy }) => {

    const themeTrigger = isHappy
        ? 'bg-orange-50/80 border-orange-200 text-stone-700 hover:bg-orange-100 hover:border-orange-300 focus:ring-orange-500/30'
        : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20 focus:ring-primary/30';

    const themeContent = isHappy
        ? 'bg-white/95 border-orange-100 shadow-[0_10px_40px_-10px_rgba(251,146,60,0.3)]'
        : 'bg-[#111827]/95 border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]';

    const themeLabel = isHappy ? 'text-orange-500/80' : 'text-primary/70';

    // Find selected item to display its label in the trigger correctly
    let selectedLabel = "Standar Akademis";
    PARAPHRASE_STYLES.forEach(group => {
        const item = group.items.find(i => i.value === value);
        if (item) selectedLabel = item.label;
    });

    return (
        <Select.Root value={value} onValueChange={onChange}>
            <Select.Trigger
                className={`
                    flex items-center gap-2 justify-between px-3 py-1.5 rounded-lg border outline-none 
                    transition-all duration-200 text-xs font-semibold backdrop-blur-md relative
                    focus:ring-2 focus:ring-offset-0 whitespace-nowrap min-w-[180px] group
                    ${themeTrigger}
                `}
                aria-label="Writing Style"
            >
                <div className="flex items-center gap-2">
                    <ListFilter className="w-3.5 h-3.5 opacity-70" />
                    <Select.Value>{selectedLabel}</Select.Value>
                </div>
                <Select.Icon>
                    <ChevronDown className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
                <Select.Content
                    className={`
                        z-[100] overflow-hidden rounded-xl border backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200
                        ${themeContent}
                    `}
                    position="popper"
                    sideOffset={8}
                    align="start"
                >
                    <Select.ScrollUpButton className="flex items-center justify-center p-1 cursor-default text-muted-foreground">
                        <ChevronDown className="w-4 h-4 rotate-180" />
                    </Select.ScrollUpButton>

                    <Select.Viewport className="p-2 max-h-[400px]">
                        {PARAPHRASE_STYLES.map((group, groupIdx) => (
                            <Select.Group key={group.group}>
                                <Select.Label className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider ${themeLabel}`}>
                                    {group.group}
                                </Select.Label>

                                {group.items.map((item) => {
                                    const isSelected = value === item.value;
                                    const itemThemeClasses = isHappy
                                        ? `data-[highlighted]:bg-orange-50 data-[highlighted]:text-orange-700 ${isSelected ? 'bg-orange-100/50 text-orange-900' : 'text-stone-600'}`
                                        : `data-[highlighted]:bg-white/10 data-[highlighted]:text-white ${isSelected ? 'bg-primary/20 text-primary-foreground' : 'text-slate-300'}`;

                                    return (
                                        <Select.Item
                                            key={item.value}
                                            value={item.value}
                                            className={`
                                                relative flex w-full cursor-pointer select-none items-center rounded-md py-2 px-2.5 text-xs outline-none transition-colors
                                                ${itemThemeClasses}
                                            `}
                                        >
                                            <div className="flex flex-col gap-0.5 w-full pr-6">
                                                <span className={`font-semibold ${isSelected ? (isHappy ? 'text-orange-900' : 'text-white') : ''}`}>
                                                    {item.label}
                                                </span>
                                                <span className={`text-[10px] ${isSelected ? (isHappy ? 'text-orange-700/70' : 'text-white/70') : 'opacity-60'}`}>
                                                    {item.description}
                                                </span>
                                            </div>

                                            <Select.ItemIndicator className="absolute right-2 flex items-center justify-center">
                                                <Check className={`w-4 h-4 ${isHappy ? 'text-orange-600' : 'text-primary'}`} />
                                            </Select.ItemIndicator>
                                        </Select.Item>
                                    );
                                })}

                                {groupIdx < PARAPHRASE_STYLES.length - 1 && (
                                    <Select.Separator className={`my-1 h-[1px] ${isHappy ? 'bg-orange-100' : 'bg-white/10'}`} />
                                )}
                            </Select.Group>
                        ))}
                    </Select.Viewport>

                    <Select.ScrollDownButton className="flex items-center justify-center p-1 cursor-default text-muted-foreground">
                        <ChevronDown className="w-4 h-4" />
                    </Select.ScrollDownButton>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    );
};
