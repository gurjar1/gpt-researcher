'use client';

// Export chat/answer to PDF
export const exportToPDF = async (
    content: string,
    sources: Array<{ title: string; url: string }>,
    filename: string = 'vernix-export'
) => {
    // Dynamically import html2pdf to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default;

    // Create HTML content for the PDF
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
            <div style="border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 20px;">
                <h1 style="color: #0d9488; margin: 0;">Vernix Research Export</h1>
                <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">${new Date().toLocaleString()}</p>
            </div>
            
            <div style="line-height: 1.6; color: #333;">
                ${content.replace(/\n/g, '<br>')}
            </div>
            
            ${sources.length > 0 ? `
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <h3 style="color: #0d9488; margin-bottom: 10px;">References</h3>
                    <ol style="color: #666; font-size: 14px;">
                        ${sources.map((s, i) => `
                            <li style="margin-bottom: 8px;">
                                <strong>${s.title}</strong><br>
                                <a href="${s.url}" style="color: #0d9488; text-decoration: none;">${s.url}</a>
                            </li>
                        `).join('')}
                    </ol>
                </div>
            ` : ''}
        </div>
    `;

    // Create temporary element
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    document.body.appendChild(element);

    // Generate PDF
    try {
        await html2pdf()
            .set({
                margin: [10, 10, 10, 10],
                filename: `${filename}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            })
            .from(element)
            .save();
    } finally {
        document.body.removeChild(element);
    }
};

export default exportToPDF;
