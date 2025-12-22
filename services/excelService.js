/**
 * Excel Service - Generate Excel files for export
 * Using ExcelJS (secure alternative to xlsx)
 */

const ExcelJS = require('exceljs');

/**
 * Generate Excel file from prospect data
 */
async function generateExcel(data) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ProspectApp';
    workbook.created = new Date();

    // === Prospects Sheet ===
    const sheet = workbook.addWorksheet('Prospects', {
        properties: { tabColor: { argb: '3B82F6' } }
    });

    // Define columns with headers
    sheet.columns = [
        { header: 'Nom', key: 'nom', width: 15 },
        { header: 'Prénom', key: 'prenom', width: 15 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Entreprise', key: 'entreprise', width: 20 },
        { header: 'Poste', key: 'poste', width: 20 },
        { header: 'Téléphone', key: 'telephone', width: 15 },
        { header: 'Site Web', key: 'siteWeb', width: 25 },
        { header: 'LinkedIn', key: 'linkedin', width: 30 },
        { header: 'Message Généré', key: 'messageGenere', width: 50 },
        { header: 'Statut', key: 'status', width: 12 },
        { header: 'Date Création', key: 'createdAt', width: 14 }
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '3B82F6' }
    };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    data.forEach(item => {
        sheet.addRow({
            nom: item.nom || '',
            prenom: item.prenom || '',
            email: item.email || '',
            entreprise: item.entreprise || '',
            poste: item.poste || '',
            telephone: item.telephone || '',
            siteWeb: item.siteWeb || '',
            linkedin: item.linkedin || '',
            messageGenere: item.messageGenere || '',
            status: item.status || 'new',
            createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : ''
        });
    });

    // === Summary Sheet ===
    const summarySheet = workbook.addWorksheet('Résumé', {
        properties: { tabColor: { argb: '10B981' } }
    });

    summarySheet.columns = [
        { header: 'Information', key: 'label', width: 25 },
        { header: 'Valeur', key: 'value', width: 30 }
    ];

    // Style summary header
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    summarySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '10B981' }
    };

    summarySheet.addRow({ label: 'Total prospects', value: data.length });
    summarySheet.addRow({ label: 'Date export', value: new Date().toLocaleDateString('fr-FR') });
    summarySheet.addRow({ label: 'Heure export', value: new Date().toLocaleTimeString('fr-FR') });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

/**
 * Generate CSV from prospect data
 */
async function generateCSV(data) {
    const headers = ['Nom', 'Prénom', 'Email', 'Entreprise', 'Poste', 'Téléphone', 'Site Web', 'Message Généré'];

    const rows = data.map(item => [
        escapeCSV(item.nom || ''),
        escapeCSV(item.prenom || ''),
        escapeCSV(item.email || ''),
        escapeCSV(item.entreprise || ''),
        escapeCSV(item.poste || ''),
        escapeCSV(item.telephone || ''),
        escapeCSV(item.siteWeb || ''),
        escapeCSV(item.messageGenere || '')
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
}

/**
 * Escape CSV value
 */
function escapeCSV(value) {
    if (!value) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

module.exports = {
    generateExcel,
    generateCSV
};
