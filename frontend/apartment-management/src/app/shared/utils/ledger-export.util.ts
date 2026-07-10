import { LedgerEntry } from '../../core/models/financial-report.model';

export interface LedgerMetaRow {
  label: string;
  value: string;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(value: number | null): string {
  return value == null ? '—' : value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export async function exportLedgerToExcel(
  title: string, meta: LedgerMetaRow[], entries: LedgerEntry[], filename: string,
): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet((title || 'Ledger').slice(0, 31));

  const titleRow = sheet.addRow([title]);
  titleRow.font = { bold: true, size: 14 };
  for (const m of meta) sheet.addRow([m.label, m.value]);
  sheet.addRow([]);

  const headerRow = sheet.addRow(['Date', 'Description', 'Debit (INR)', 'Credit (INR)', 'Balance (INR)']);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  });

  for (const entry of entries) {
    sheet.addRow([formatDate(entry.date), entry.description, entry.debit, entry.credit, entry.balance]);
  }

  sheet.columns = [{ width: 14 }, { width: 44 }, { width: 16 }, { width: 16 }, { width: 16 }];
  for (const col of [3, 4, 5]) sheet.getColumn(col).numFmt = '#,##0';

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
  );
}

export async function exportLedgerToPdf(
  title: string, meta: LedgerMetaRow[], entries: LedgerEntry[], filename: string,
): Promise<void> {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);

  doc.setFontSize(10);
  let y = 24;
  for (const m of meta) {
    doc.text(`${m.label}: ${m.value}`, 14, y);
    y += 6;
  }

  autoTable(doc, {
    startY: y + 2,
    head: [['Date', 'Description', 'Debit (INR)', 'Credit (INR)', 'Balance (INR)']],
    body: entries.map(e => [
      formatDate(e.date),
      e.description,
      formatAmount(e.debit),
      formatAmount(e.credit),
      formatAmount(e.balance),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59] },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  });

  doc.save(filename);
}
