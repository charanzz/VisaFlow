// @ts-ignore
import PDFDocument from "pdfkit";
import { Readable } from "stream";
// @ts-ignore
import QRCode from "qrcode";

interface VisaData {
  visaNumber: string;
  applicationId: number;
  fullName: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  visaType: string;
  destinationCountry: string;
  intendedEntryDate: string | null;
  intendedExitDate: string | null;
  purposeOfVisit: string;
  grantedAt: Date | string | null;
  expiryDate: string | null;
  riskLevel: string | null;
}

export async function generateVisaPDF(visaData: VisaData): Promise<Readable> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  const verificationUrl = `${process.env.BASE_URL || "http://localhost:5000"}/verify/${visaData.visaNumber}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 140,
    margin: 1,
    color: { dark: "#1a2e5a", light: "#ffffff" },
  });

  const pageWidth = doc.page.width;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  // ─── Navy header bar ────────────────────────────────────────────────
  doc.rect(0, 0, pageWidth, 90).fill("#1a2e5a");

  doc.fillColor("#ffffff").fontSize(9).font("Helvetica")
    .text("IMMIGRATION AUTHORITY — OFFICIAL DIGITAL DOCUMENT", margin, 18, { align: "center", width: contentWidth });

  const visaTypeLabel = (visaData.visaType.charAt(0).toUpperCase() + visaData.visaType.slice(1)).toUpperCase();
  doc.fillColor("#f0c040").fontSize(22).font("Helvetica-Bold")
    .text(`${visaTypeLabel} VISA — DEMO DOCUMENT`, margin, 34, { align: "center", width: contentWidth });

  doc.fillColor("#a8c4e8").fontSize(8).font("Helvetica")
    .text(`${visaData.destinationCountry.toUpperCase()} • DIGITAL ENTRY PERMIT`, margin, 66, { align: "center", width: contentWidth });

  // ─── Gold accent line ────────────────────────────────────────────────
  doc.rect(0, 90, pageWidth, 4).fill("#f0c040");

  // ─── APPROVED stamp (top-right) ──────────────────────────────────────
  doc.save();
  doc.translate(pageWidth - 120, 130);
  doc.rotate(-20);
  doc.rect(-55, -22, 110, 44).stroke("#22c55e").lineWidth(3);
  doc.fillColor("#22c55e").fontSize(20).font("Helvetica-Bold")
    .text("APPROVED", -52, -12, { width: 104, align: "center" });
  doc.restore();

  // ─── Visa Number & Dates block ───────────────────────────────────────
  const topY = 105;
  doc.fillColor("#1a2e5a").fontSize(11).font("Helvetica-Bold")
    .text("VISA NUMBER", margin, topY);
  doc.fillColor("#f0c040").fontSize(16).font("Helvetica-Bold")
    .text(visaData.visaNumber, margin, topY + 16);

  doc.fillColor("#555555").fontSize(9).font("Helvetica")
    .text(`Application ID: #${visaData.applicationId}`, margin, topY + 38);

  doc.fillColor("#1a2e5a").fontSize(9).font("Helvetica-Bold")
    .text("ISSUE DATE", margin, topY + 56);
  doc.fillColor("#333333").fontSize(9).font("Helvetica")
    .text(formatDate(visaData.grantedAt), margin, topY + 68);

  doc.fillColor("#1a2e5a").fontSize(9).font("Helvetica-Bold")
    .text("EXPIRY DATE", margin + 120, topY + 56);
  doc.fillColor("#333333").fontSize(9).font("Helvetica")
    .text(visaData.expiryDate || "N/A", margin + 120, topY + 68);

  // ─── Divider ─────────────────────────────────────────────────────────
  doc.moveTo(margin, 210).lineTo(pageWidth - margin, 210)
    .stroke("#e0e0e0").lineWidth(1);

  // ─── Applicant Information ───────────────────────────────────────────
  const section1Y = 222;
  drawSectionHeader(doc, "APPLICANT INFORMATION", margin, section1Y, contentWidth);

  const applicantRows = [
    ["Full Name", visaData.fullName],
    ["Passport Number", visaData.passportNumber],
    ["Nationality", visaData.nationality],
    ["Date of Birth", visaData.dateOfBirth],
  ];

  drawInfoGrid(doc, applicantRows, margin, section1Y + 22, contentWidth);

  // ─── Visa Details ─────────────────────────────────────────────────────
  const section2Y = section1Y + 22 + applicantRows.length * 28 + 14;
  drawSectionHeader(doc, "VISA & TRAVEL DETAILS", margin, section2Y, contentWidth);

  const visaRows = [
    ["Visa Category", visaTypeLabel],
    ["Destination Country", visaData.destinationCountry],
    ["Entry Date", visaData.intendedEntryDate || "N/A"],
    ["Exit Date", visaData.intendedExitDate || "N/A"],
    ["Purpose of Travel", visaData.purposeOfVisit],
  ];

  drawInfoGrid(doc, visaRows, margin, section2Y + 22, contentWidth);

  // ─── Security Verification ────────────────────────────────────────────
  const section3Y = section2Y + 22 + visaRows.length * 28 + 14;
  drawSectionHeader(doc, "SECURITY VERIFICATION SUMMARY", margin, section3Y, contentWidth);

  const riskLabel = visaData.riskLevel
    ? visaData.riskLevel.charAt(0).toUpperCase() + visaData.riskLevel.slice(1) + " Risk"
    : "Assessed";

  const checks = [
    { label: "AI Document Verification", value: "✓ Passed", ok: true },
    { label: "Security Background Check", value: "✓ Cleared", ok: true },
    { label: "Risk Assessment", value: `✓ ${riskLabel}`, ok: true },
    { label: "Final Decision", value: "✓ APPROVED", ok: true },
  ];

  let checkY = section3Y + 26;
  const colW = contentWidth / 2;
  checks.forEach((item, i) => {
    const x = margin + (i % 2) * colW;
    const y = checkY + Math.floor(i / 2) * 24;
    doc.rect(x, y, colW - 8, 20).fill("#f0fdf4");
    doc.fillColor("#16a34a").fontSize(9).font("Helvetica-Bold")
      .text(item.value, x + 8, y + 5, { width: 80, continued: true });
    doc.fillColor("#555555").font("Helvetica")
      .text(`  ${item.label}`, { width: colW - 100 });
  });

  // ─── QR Code ──────────────────────────────────────────────────────────
  const qrY = checkY + Math.ceil(checks.length / 2) * 24 + 20;
  doc.moveTo(margin, qrY).lineTo(pageWidth - margin, qrY).stroke("#e0e0e0");

  const qrX = (pageWidth - 140) / 2;
  doc.fillColor("#1a2e5a").fontSize(10).font("Helvetica-Bold")
    .text("VERIFICATION QR CODE", margin, qrY + 12, { align: "center", width: contentWidth });

  const qrImageBuffer = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");
  doc.image(qrImageBuffer, qrX, qrY + 30, { width: 140, height: 140 });

  doc.fillColor("#888888").fontSize(8).font("Helvetica")
    .text("Scan to verify visa authenticity at any border point", margin, qrY + 178, { align: "center", width: contentWidth });

  // ─── Footer ────────────────────────────────────────────────────────────
  const footerY = qrY + 200;
  doc.rect(0, footerY, pageWidth, 60).fill("#1a2e5a");

  doc.fillColor("#a8c4e8").fontSize(7.5).font("Helvetica")
    .text("⚠  THIS IS A DEMO DOCUMENT GENERATED BY VISAFLOW FOR DEMONSTRATION PURPOSES ONLY  ⚠", margin, footerY + 10, { align: "center", width: contentWidth });

  doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold")
    .text("IMMIGRATION AUTHORITY DIGITAL SEAL — VISAFLOW SYSTEM", margin, footerY + 26, { align: "center", width: contentWidth });

  doc.fillColor("#a8c4e8").fontSize(7.5).font("Helvetica")
    .text(`Generated: ${new Date().toLocaleString()} | Visa No: ${visaData.visaNumber}`, margin, footerY + 42, { align: "center", width: contentWidth });

  doc.end();
  return doc;
}

function drawSectionHeader(doc: any, title: string, x: number, y: number, width: number) {
  doc.rect(x, y, width, 18).fill("#1a2e5a");
  doc.fillColor("#ffffff").fontSize(8.5).font("Helvetica-Bold")
    .text(title, x + 8, y + 4, { width: width - 16 });
}

function drawInfoGrid(doc: any, rows: [string, string][], x: number, y: number, width: number) {
  const colW = width / 2;
  rows.forEach((row, i) => {
    const col = i % 2;
    const rowY = y + Math.floor(i / 2) * 28;
    const cellX = x + col * colW;

    doc.rect(cellX, rowY, colW - 4, 24).fill(i % 4 < 2 ? "#f8fafc" : "#ffffff").stroke("#e5e7eb");
    doc.fillColor("#888888").fontSize(7.5).font("Helvetica-Bold")
      .text(row[0].toUpperCase(), cellX + 6, rowY + 4, { width: colW - 16 });
    doc.fillColor("#1a2e5a").fontSize(9.5).font("Helvetica-Bold")
      .text(row[1], cellX + 6, rowY + 13, { width: colW - 16 });
  });
}

function formatDate(dateString: string | Date | null): string {
  if (!dateString) return "N/A";
  try {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return String(dateString);
  }
}
