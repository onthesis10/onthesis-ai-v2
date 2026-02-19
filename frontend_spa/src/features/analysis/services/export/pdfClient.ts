import type { AnalysisExportSchema } from './schema';

export class PdfClient {
    static async generate(schema: AnalysisExportSchema): Promise<void> {
        try {
            console.log("PDF Client: Initiating Direct Request to 127.0.0.1:5000 via FETCH...");

            const response = await fetch('http://127.0.0.1:5000/api/export/pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Accept': 'application/pdf' // Explicitly accept PDF
                },
                body: JSON.stringify(schema)
            });

            console.log("PDF Client: Response Received.");
            console.log("PDF Client: Status:", response.status, response.statusText);

            // Log all headers for debugging
            const headersObj: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                headersObj[key] = value;
            });
            console.log("PDF Client: Headers:", headersObj);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }

            if (response.status === 204) {
                throw new Error("Received 204 No Content from server, but expected PDF.");
            }

            const blob = await response.blob();
            console.log("PDF Client: Blob received. Size:", blob.size, "Type:", blob.type);

            if (blob.size === 0) {
                console.error("PDF Client: Received 0 bytes! Check backend or network.");
                return;
            }

            // Create URL and Download
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Analysis_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('PDF Generation failed:', error);
            throw error;
        }
    }
}
