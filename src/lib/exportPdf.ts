import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PayPeriodDisplay } from "@/types";
import { DAY_TYPE_LABELS } from "@/domain/hoursboard";

interface ExportOptions {
  period: PayPeriodDisplay;
  employerName: string;
}

export function exportPayPeriodPdf({ period, employerName }: ExportOptions) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;

  // ── Header ──
  doc.setFontSize(10);
  doc.setTextColor(120, 115, 105);
  doc.text("COREBOARD — HOURSBOARD", margin, 18);

  doc.setFontSize(18);
  doc.setTextColor(35, 33, 28);
  doc.text(period.displayName, margin, 28);

  doc.setFontSize(10);
  doc.setTextColor(87, 79, 68);
  doc.text(employerName, margin, 35);
  doc.text(period.label, margin, 41);

  // ── Summary cards ──
  const summaryY = 50;
  const cardWidth = (pageWidth - margin * 2 - 6) / 3;

  const summaryItems = [
    { label: "Total Hours", value: `${period.summary.totalHours.toFixed(1)} h` },
    { label: "Estimated Gross", value: formatMoney(period.summary.estimatedGross) },
    { label: "Days Worked", value: `${period.summary.workedDays} of ${period.days.length}` },
  ];

  summaryItems.forEach((item, i) => {
    const x = margin + i * (cardWidth + 3);
    doc.setFillColor(243, 239, 231);
    doc.roundedRect(x, summaryY, cardWidth, 20, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(154, 148, 134);
    doc.text(item.label.toUpperCase(), x + 4, summaryY + 7);
    doc.setFontSize(13);
    doc.setTextColor(35, 33, 28);
    doc.text(item.value, x + 4, summaryY + 15);
  });

  // ── Day-by-day table ──
  const tableData = period.days.map((d) => [
    `${d.dayLabel} ${d.dayNumber} ${d.monthLabel}`,
    d.workHours > 0 ? d.workHours.toFixed(1) : "—",
    d.awardLevelCode ?? "—",
    DAY_TYPE_LABELS[d.dayType as keyof typeof DAY_TYPE_LABELS] ?? d.dayType,
    d.payRate > 0 ? formatMoney(d.payRate) : "—",
    d.estimatedPay > 0 ? formatMoney(d.estimatedPay) : "—",
    d.notes ?? "",
  ]);

  autoTable(doc, {
    startY: summaryY + 28,
    margin: { left: margin, right: margin },
    head: [["Date", "Hours", "Award", "Day Type", "Rate", "Est. Pay", "Notes"]],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [35, 33, 28],
      lineColor: [226, 220, 207],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [62, 91, 77],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [250, 247, 241],
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { halign: "center", cellWidth: 16 },
      2: { halign: "center", cellWidth: 16 },
      4: { halign: "right", cellWidth: 18 },
      5: { halign: "right", cellWidth: 20, fontStyle: "bold" },
      6: { cellWidth: "auto", textColor: [119, 111, 99] },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 0) {
        const day = period.days[data.row.index];
        if (day?.isWeekend) {
          data.cell.styles.textColor = [154, 148, 134];
        }
      }
    },
  });

  // ── Footer ──
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(7);
  doc.setTextColor(179, 172, 158);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} — Coreboard`,
    margin,
    Math.min(finalY, 280)
  );

  // ── Totals row ──
  const totalsY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFillColor(243, 239, 231);
  doc.roundedRect(margin, totalsY + 2, pageWidth - margin * 2, 10, 1.5, 1.5, "F");
  doc.setFontSize(8);
  doc.setTextColor(62, 91, 77);
  doc.text("TOTAL", margin + 4, totalsY + 8);
  doc.setFontSize(10);
  doc.text(`${period.summary.totalHours.toFixed(1)} h`, margin + 40, totalsY + 8);
  doc.setTextColor(35, 33, 28);
  doc.text(formatMoney(period.summary.estimatedGross), pageWidth - margin - 4, totalsY + 8, { align: "right" });

  // Download
  const filename = `hoursboard-${period.startDate}-to-${period.endDate}.pdf`;
  doc.save(filename);
}

function formatMoney(amount: number): string {
  return `A$${amount.toFixed(2)}`;
}
