import type { AnalysisExportSchema, ExportSection, TableContent } from './schema';

export class ExportMapper {
    static mapToSchema(
        analysisResult: any,
        interpretation: string | null,
        user: any,
        _chartImages: Record<string, string>, // key: chartId, value: base64
        researchContext?: any
    ): AnalysisExportSchema {

        const title = researchContext?.title || activeAnalysisTitle(analysisResult) || "Statistical Analysis Report";
        const author = user?.displayName || "Researcher";
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const sections: ExportSection[] = [];

        // 1. Introduction / Research Context
        if (researchContext) {
            sections.push({
                type: 'heading',
                level: 1,
                content: 'Gambaran Penelitian'
            });
            if (researchContext.hypothesis) {
                sections.push({
                    type: 'paragraph',
                    content: `Hipotesis: ${researchContext.hypothesis}`
                });
            }
        }

        // 2. Statistical Conclusion (PALING ATAS)
        if (analysisResult.statistical_insight) {
            sections.push({
                type: 'heading',
                level: 1,
                content: 'Kesimpulan Analisis Data'
            });
            sections.push({
                type: 'paragraph',
                content: analysisResult.statistical_insight,
                source: 'Manual'
            });
        }

        // 3. Summary Table (HASIL UJI)
        if (analysisResult.summary_table && analysisResult.summary_table.length > 0) {
            const analysisName = activeAnalysisTitle(analysisResult);
            sections.push({
                type: 'heading',
                level: 1,
                content: `Hasil Uji ${analysisName}`
            });

            const summaryHeaders = Object.keys(analysisResult.summary_table[0]);
            const summaryRows = analysisResult.summary_table.map((row: any) =>
                summaryHeaders.map(col => {
                    const val = row[col];
                    return typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(3) : val;
                })
            );

            sections.push({
                type: 'table',
                caption: analysisName,
                content: {
                    headers: summaryHeaders.map(h => h.replace(/_/g, ' ')),
                    rows: summaryRows
                } as TableContent
            });
        }

        // 4. AI Interpretation (AI INSIGHT DI BAWAH TABLE)
        if (interpretation) {
            sections.push({
                type: 'heading',
                level: 1,
                content: 'Interpretasi AI (Analysis Insight)'
            });

            const paragraphs = interpretation.split('\n\n');
            paragraphs.forEach(p => {
                const cleanP = p.trim();
                if (cleanP) {
                    sections.push({
                        type: 'paragraph',
                        content: cleanP,
                        source: 'AI'
                    });
                }
            });
        }

        return {
            meta: {
                title,
                author,
                institution: "OnThesis.pro",
                date,
                style: 'APA'
            },
            sections
        };
    }
}

// Helper to guess title
function activeAnalysisTitle(result: any): string {
    if (result.title) return result.title;

    // Check type and apply mapping
    const type = (result.type || result.analysis_type || '').toLowerCase();

    const types: Record<string, string> = {
        'normality': 'Normality Test',
        'normality_test': 'Normality Test',
        'sw': 'Shapiro-Wilk Normality Test',
        'ks': 'Kolmogorov-Smirnov Normality Test',
        'regression': 'Regression Analysis',
        'linear_regression': 'Linear Regression Analysis',
        'correlation': 'Correlation Analysis',
        'pearson': 'Pearson Correlation',
        'spearman': 'Spearman Correlation',
        'descriptive': 'Descriptive Statistics',
        't-test': 'T-Test Analysis',
        'independent_t_test': 'Independent Samples T-Test',
        'paired_t_test': 'Paired Samples T-Test',
        'anova': 'ANOVA Analysis',
        'one_way_anova': 'One-Way ANOVA Analysis',
        'reliability': 'Reliability Analysis',
        'cronbach': 'Cronbach\'s Alpha Reliability'
    };

    return types[type] || result.title || result.name || "Statistical Analysis Results";
}
