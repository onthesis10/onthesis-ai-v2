import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    BorderStyle,
    Header,
    ImageRun,
} from "docx";
import { saveAs } from "file-saver";
import type { AnalysisExportSchema, ExportSection, TableContent } from "./schema";

export class DocxGenerator {
    private static async getLogoBuffer(): Promise<ArrayBuffer | null> {
        try {
            const svg = `
            <svg width="560" height="140" viewBox="0 0 560 140" xmlns="http://www.w3.org/2000/svg">
                <g>
                    <rect x="40" y="42" width="40" height="8" rx="4" fill="#0284c7" />
                    <rect x="30" y="56" width="60" height="8" rx="4" fill="#0284c7" />
                    <rect x="26" y="70" width="68" height="8" rx="4" fill="#0284c7" />
                    <rect x="30" y="84" width="60" height="8" rx="4" fill="#0284c7" />
                    <rect x="40" y="98" width="40" height="8" rx="4" fill="#0284c7" />
                </g>
                <text x="110" y="92" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="#0284c7">OnThesis</text>
            </svg>`;

            return new Promise((resolve) => {
                const img = new Image();
                const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 560;
                    canvas.height = 140;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        canvas.toBlob((blob) => {
                            if (blob) {
                                blob.arrayBuffer().then(resolve);
                            } else {
                                resolve(null);
                            }
                            URL.revokeObjectURL(url);
                        }, 'image/png');
                    } else {
                        resolve(null);
                    }
                };
                img.onerror = () => resolve(null);
                img.src = url;
            });
        } catch (e) {
            console.error("Error generating logo buffer", e);
            return null;
        }
    }

    static async generate(schema: AnalysisExportSchema): Promise<void> {
        const logoBuffer = await this.getLogoBuffer();

        const headerChildren: Paragraph[] = [];
        if (logoBuffer) {
            headerChildren.push(new Paragraph({
                children: [
                    new ImageRun({
                        data: new Uint8Array(logoBuffer),
                        type: "png",
                        transformation: {
                            width: 100,
                            height: 25,
                        },
                    }),
                ],
                alignment: AlignmentType.RIGHT,
            }));
        } else {
            headerChildren.push(new Paragraph({
                children: [
                    new TextRun({
                        text: "OnThesis.pro",
                        bold: true,
                        color: "0284c7",
                        font: "Arial",
                        size: 20,
                    }),
                ],
                alignment: AlignmentType.RIGHT,
            }));
        }

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: "Times New Roman",
                            size: 24, // 12pt default
                        },
                        paragraph: {
                            spacing: {
                                line: 360, // 1.5 spacing
                            },
                        },
                    },
                },
            },
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 1440,
                            right: 1440,
                            bottom: 1440,
                            left: 1440,
                        },
                    },
                },
                headers: {
                    default: new Header({
                        children: headerChildren,
                    }),
                },
                children: [
                    // 1. Title (Centered)
                    new Paragraph({
                        text: `Laporan ${schema.meta.title}`,
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 400 },
                    }),

                    // 2. Conclusion (Interpretasi)
                    ...this.getConclusions(schema),

                    // 3. Tables
                    ...this.getTables(schema),

                    // 4. AI Insight
                    ...this.getAIInsights(schema),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Analysis_Report_${new Date().toISOString().split('T')[0]}.docx`);
    }

    private static getConclusions(schema: AnalysisExportSchema): Paragraph[] {
        const conclusions = schema.sections.filter(s => s.type === 'paragraph' && s.source === 'Manual');
        return conclusions.map(c => new Paragraph({
            children: [
                new TextRun({ text: "Interpretasi: ", bold: true, font: "Times New Roman" }),
                new TextRun({ text: String(c.content), font: "Times New Roman" })
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
        }));
    }

    private static getTables(schema: AnalysisExportSchema): (Paragraph | Table)[] {
        const tables = schema.sections.filter(s => s.type === 'table');
        const elements: (Paragraph | Table)[] = [];
        tables.forEach(t => elements.push(...this.createTable(t)));
        return elements;
    }

    private static getAIInsights(schema: AnalysisExportSchema): (Paragraph)[] {
        const aiSections = schema.sections.filter(s => s.type === 'paragraph' && s.source === 'AI');
        const elements: Paragraph[] = [];
        if (aiSections.length > 0) {
            elements.push(new Paragraph({
                children: [new TextRun({ text: "Analisis Insight (AI)", bold: true, font: "Arial", size: 28, color: "0284c7" })],
                spacing: { before: 400, after: 200 },
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: "0284c7" } }
            }));
            aiSections.forEach(s => elements.push(new Paragraph({
                text: String(s.content),
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 200 }
            })));
        }
        return elements;
    }

    private static createTable(section: ExportSection): (Paragraph | Table)[] {
        const tableData = section.content as TableContent;
        const elements: (Paragraph | Table)[] = [];

        const rows = [];

        // Title Row (Blue Background)
        if (section.caption) {
            rows.push(new TableRow({
                children: [
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: section.caption, bold: true, color: "FFFFFF", font: "Arial", size: 18 })],
                                alignment: AlignmentType.CENTER,
                            })
                        ],
                        columnSpan: tableData.headers.length,
                        shading: { fill: "0284c7" },
                        borders: {
                            top: { style: BorderStyle.NONE },
                            bottom: { style: BorderStyle.NONE },
                            left: { style: BorderStyle.NONE },
                            right: { style: BorderStyle.NONE },
                        }
                    })
                ]
            }));
        }

        // Header Row (Blue Background)
        rows.push(new TableRow({
            children: tableData.headers.map(header => new TableCell({
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: String(header), bold: true, color: "FFFFFF", font: "Arial", size: 18 })],
                        alignment: AlignmentType.CENTER,
                    })
                ],
                shading: { fill: "0284c7" },
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "FFFFFF" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "FFFFFF" },
                }
            }))
        }));

        // Data Rows
        tableData.rows.forEach((row, i) => {
            rows.push(new TableRow({
                children: row.map((cell, cellIndex) => new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({ text: String(cell), font: "Times New Roman", size: 18, bold: cellIndex === 0 })],
                        alignment: cellIndex === 0 ? AlignmentType.LEFT : AlignmentType.CENTER
                    })],
                    shading: { fill: i % 2 === 0 ? "FFFFFF" : "F3F4F6" },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
                    },
                    margins: { left: 100, right: 100 }
                }))
            }));
        });

        const table = new Table({
            rows: rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            alignment: AlignmentType.CENTER,
            borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
            }
        });

        elements.push(table);
        elements.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        return elements;
    }
}
