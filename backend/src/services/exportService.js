// Export service — generates Excel (.xlsx) and PDF reports for sales.
// Arabic column headers. Integer amounts formatted with commas.
// PDF uses IBM Plex Sans Arabic font if available at backend/assets/fonts/IBMPlexSansArabic-Regular.ttf

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARABIC_FONT_PATH = path.resolve(__dirname, '..', '..', 'assets', 'fonts', 'IBMPlexSansArabic-Regular.ttf');

// Column definitions — key maps to a value extractor
const COLUMN_DEFS = [
  { key: 'car_name',            headerAr: 'العربية',         type: 'text' },
  { key: 'listing_price',       headerAr: 'سعر العرض',       type: 'number' },
  { key: 'final_sale_price',    headerAr: 'السعر النهائي',   type: 'number' },
  { key: 'seller_received',     headerAr: 'للبائع',           type: 'number' },
  { key: 'dealership_revenue',  headerAr: 'للمعرض',           type: 'number' },
  { key: 'employee_commission', headerAr: 'العمولة',          type: 'number' },
  { key: 'tax_amount',          headerAr: 'الضريبة',          type: 'number' },
  { key: 'net_profit',          headerAr: 'صافي الربح',      type: 'number' },
  { key: 'employee_name',       headerAr: 'الموظف',           type: 'text' },
  { key: 'sale_date',           headerAr: 'تاريخ البيعة',    type: 'text' },
  { key: 'buyer_name',          headerAr: 'اسم المشتري',     type: 'text' },
  { key: 'buyer_phone',         headerAr: 'رقم المشتري',     type: 'text' },
  { key: 'seller_name',         headerAr: 'اسم البائع',      type: 'text' },
  { key: 'seller_phone',        headerAr: 'رقم البائع',      type: 'text' },
  { key: 'payment_method',      headerAr: 'طريقة الدفع',     type: 'text' },
  { key: 'notes',               headerAr: 'ملاحظات',          type: 'text' },
];

const DEFAULT_COLUMNS = [
  'car_name', 'final_sale_price', 'seller_received', 'dealership_revenue',
  'employee_commission', 'net_profit', 'employee_name', 'sale_date',
  'buyer_name', 'buyer_phone',
];

function getCellValue(sale, key) {
  switch (key) {
    case 'car_name':            return `${sale.car?.carType ?? ''} ${sale.car?.model ?? ''}`.trim();
    case 'listing_price':       return sale.car?.listingPrice ?? 0;
    case 'final_sale_price':    return sale.finalSalePrice;
    case 'seller_received':     return sale.sellerReceived;
    case 'dealership_revenue':  return sale.dealershipRevenue;
    case 'employee_commission': return sale.employeeCommission;
    case 'tax_amount':          return sale.taxAmount;
    case 'net_profit':          return sale.dealershipRevenue - sale.taxAmount - sale.employeeCommission;
    case 'employee_name':       return sale.employee?.fullName ?? '';
    case 'sale_date':           return sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('ar-EG') : '';
    case 'buyer_name':          return sale.buyerName ?? '';
    case 'buyer_phone':         return sale.buyerPhone ?? '';
    case 'seller_name':         return sale.car?.sellerName ?? '';
    case 'seller_phone':        return sale.car?.sellerPhone ?? '';
    case 'payment_method':      return sale.paymentMethod ?? '';
    case 'notes':               return sale.notes ?? '';
    default:                    return '';
  }
}

function resolveColumns(selectedKeys) {
  const keys = selectedKeys?.length ? selectedKeys : DEFAULT_COLUMNS;
  return COLUMN_DEFS.filter((c) => keys.includes(c.key));
}

function formatInteger(n) {
  if (n == null || n === '') return '';
  return Number(n).toLocaleString('en-US');
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export async function exportToExcel(sales, selectedColumns) {
  const cols = resolveColumns(selectedColumns);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AutoZain';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('المبيعات', { views: [{ rightToLeft: true }] });

  // Header row styling
  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1A1A2E' },
  };

  sheet.columns = cols.map((c) => ({
    header: c.headerAr,
    key: c.key,
    width: c.type === 'number' ? 16 : 22,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rightToLeft' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF00C853' } },
    };
  });
  headerRow.height = 24;

  // Data rows
  sales.forEach((sale, idx) => {
    const rowData = {};
    cols.forEach((c) => {
      rowData[c.key] = getCellValue(sale, c.key);
    });
    const row = sheet.addRow(rowData);

    // Zebra striping
    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      });
    }

    // Format integer cells with commas
    row.eachCell((cell, colNumber) => {
      const colDef = cols[colNumber - 1];
      if (colDef?.type === 'number' && typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
      }
      cell.alignment = { horizontal: colDef?.type === 'number' ? 'left' : 'right', readingOrder: 'rightToLeft' };
    });
  });

  // Empty state row
  if (sales.length === 0) {
    const row = sheet.addRow({});
    row.getCell(1).value = 'لا توجد بيانات';
    row.getCell(1).font = { italic: true, color: { argb: 'FF9CA3AF' } };
  }

  return workbook.xlsx.writeBuffer();
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export async function exportToPdf(sales, selectedColumns) {
  const cols = resolveColumns(selectedColumns);
  const hasArabicFont = existsSync(ARABIC_FONT_PATH);

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (hasArabicFont) {
      doc.registerFont('Arabic', ARABIC_FONT_PATH);
      doc.font('Arabic');
    }

    const pageWidth = doc.page.width - 60; // margins
    const colWidth = Math.floor(pageWidth / cols.length);
    const rowHeight = 22;
    let y = 30;

    // Title
    doc.fontSize(14).text('تقرير المبيعات — أوتوزين', 30, y, {
      width: pageWidth,
      align: 'right',
    });
    y += 30;

    // Generated date
    doc.fontSize(9).fillColor('#6B7280').text(
      `تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}  |  عدد السجلات: ${sales.length}`,
      30, y, { width: pageWidth, align: 'right' },
    );
    y += 20;
    doc.fillColor('#000000');

    // Header row background
    doc.rect(30, y, pageWidth, rowHeight).fill('#1A1A2E');

    cols.forEach((col, i) => {
      const x = 30 + i * colWidth;
      doc.fillColor('#FFFFFF').fontSize(9).text(col.headerAr, x + 2, y + 6, {
        width: colWidth - 4,
        align: 'center',
        lineBreak: false,
      });
    });
    y += rowHeight;
    doc.fillColor('#000000');

    // Data rows
    if (sales.length === 0) {
      doc.fontSize(10).fillColor('#9CA3AF').text('لا توجد بيانات', 30, y + 10, {
        width: pageWidth,
        align: 'center',
      });
    }

    sales.forEach((sale, rowIdx) => {
      // Page break guard
      if (y + rowHeight > doc.page.height - 40) {
        doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
        y = 30;
      }

      if (rowIdx % 2 === 1) {
        doc.rect(30, y, pageWidth, rowHeight).fill('#F5F5F5');
      }

      cols.forEach((col, i) => {
        const x = 30 + i * colWidth;
        const raw = getCellValue(sale, col.key);
        const text = col.type === 'number' ? formatInteger(raw) : String(raw);

        doc.fillColor('#1A1A2E').fontSize(8).text(text, x + 2, y + 6, {
          width: colWidth - 4,
          align: col.type === 'number' ? 'left' : 'right',
          lineBreak: false,
        });
      });

      // Row border
      doc.moveTo(30, y + rowHeight).lineTo(30 + pageWidth, y + rowHeight)
        .strokeColor('#E5E7EB').lineWidth(0.5).stroke();
      y += rowHeight;
    });

    doc.end();
  });
}
