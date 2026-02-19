
import { BookOpen, Users, Activity, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select } from '../ui/Select'
import { getFieldTemplates } from '../../lib/smartGenerator'

interface Step1Props {
    data: any
    updateData: (key: string, value: any) => void
}

export const Step1Context = ({ data, updateData }: Step1Props) => {

    const researchTypes = [
        { id: 'descriptive', label: 'Descriptive', icon: BookOpen, desc: 'Describe characteristics of a population' },
        { id: 'correlation', label: 'Correlation', icon: Users, desc: 'Relationship between two variables' },
        { id: 'experiment', label: 'Experiment', icon: Activity, desc: 'Cause and effect with interventions' }
    ]

    const fields = [
        'Education', 'Management', 'Psychology', 'Health', 'Social Science', 'Marketing'
    ]

    const goals = [
        'Difference Test (T-Test/ANOVA)',
        'Relationship (Correlation)',
        'Influence (Regression)',
        'Descriptive Stats'
    ]

    const handleFieldChange = (val: string) => {
        updateData('field', val);

        // Smart Template Trigger
        // Only apply if variables are empty to avoid overwriting user work
        if (!data.variables || data.variables.length === 0) {
            const templates = getFieldTemplates(val);
            if (templates.length > 0) {
                // Add unique IDs
                const varsWithIds = templates.map(t => ({
                    ...t,
                    id: Math.random().toString(36).substr(2, 9)
                }));
                updateData('variables', varsWithIds);

                // Add default relationship if correlation design
                if (data.research_type === 'correlation' && varsWithIds.length >= 2) {
                    updateData('relationships', [{
                        var1_id: varsWithIds[0].id,
                        var2_id: varsWithIds[1].id,
                        correlation: 0.6
                    }]);
                }
            }
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-600">
                    Tell us about your research
                </h3>
                <p className="text-muted-foreground text-sm">
                    We will tailor the data patterns based on your research context.
                </p>
            </div>

            {/* Research Type */}
            <div className="space-y-4">
                <label className="text-sm font-semibold text-foreground">Research Design</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {researchTypes.map((type) => (
                        <div
                            key={type.id}
                            onClick={() => updateData('research_type', type.id)}
                            className={cn(
                                "cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg flex flex-col gap-3",
                                data.research_type === type.id
                                    ? "border-cyan-500/50 bg-cyan-500/5 shadow-cyan-500/10"
                                    : "border-border/50 bg-card hover:bg-secondary/50 hover:border-border"
                            )}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                data.research_type === type.id ? "bg-cyan-500 text-white" : "bg-secondary text-muted-foreground"
                            )}>
                                <type.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">{type.label}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{type.desc}</p>
                            </div>

                            {data.research_type === type.id && (
                                <div className="absolute top-3 right-3 text-cyan-500">
                                    <Check className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Field & Goals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <Select
                        label="Field of Study"
                        value={data.field || ''}
                        onChange={handleFieldChange}
                        options={fields.map(f => ({ value: f.toLowerCase(), label: f }))}
                        placeholder="Select a field..."
                    />
                </div>

                <div className="space-y-4">
                    <label className="text-sm font-semibold text-foreground">Analysis Goals</label>
                    <div className="flex flex-wrap gap-2">
                        {goals.map(goal => {
                            const isSelected = (data.analysis_goal || []).includes(goal);
                            return (
                                <button
                                    key={goal}
                                    onClick={() => {
                                        const current = data.analysis_goal || [];
                                        const newVal = isSelected
                                            ? current.filter((g: string) => g !== goal)
                                            : [...current, goal];
                                        updateData('analysis_goal', newVal);
                                    }}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                        isSelected
                                            ? "bg-cyan-500/10 text-cyan-600 border-cyan-500/20"
                                            : "bg-background text-muted-foreground border-border/50 hover:border-border"
                                    )}
                                >
                                    {goal}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
