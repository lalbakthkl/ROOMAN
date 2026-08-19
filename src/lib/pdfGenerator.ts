import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MonthlySnapshot, RoomSettings, Member, Expense } from '../types';

export interface GeneratePdfOptions {
  snapshot: MonthlySnapshot;
  settings: RoomSettings;
  members: Member[];
  expenses?: Expense[];
}

/**
 * Generates a clean, vector-based, high-resolution, multi-page capable PDF report
 * that works across all devices, mobile browsers, and desktop without canvas bugs.
 */
export function generateRoomexPdfReport({
  snapshot,
  settings,
  members,
  expenses = [],
}: GeneratePdfOptions): { doc: jsPDF; blob: Blob; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const memberMap = new Map<string, Member>(members.map(m => [m.id, m]));
  const currency = settings.currencySymbol || '₹';
  const cleanMonth = snapshot.monthYear.replace(/\s+/g, '_');
  const filename = `ROOMEX_${settings.roomCode}_${cleanMonth}_Report.pdf`;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // --- 1. HEADER BANNER (Indigo gradient bar) ---
  doc.setFillColor(30, 27, 75); // Dark Indigo #1e1b4b
  doc.roundedRect(margin, 12, pageWidth - margin * 2, 28, 4, 4, 'F');

  // Logo Icon Box
  doc.setFillColor(99, 102, 241); // Accent Indigo #6366f1
  doc.roundedRect(margin + 5, 17, 18, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RX', margin + 14, 29, { align: 'center' });

  // App Title
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('ROOMEX', margin + 28, 25);
  doc.setFontSize(8);
  doc.setTextColor(199, 210, 254);
  doc.setFont('helvetica', 'normal');
  doc.text('Smart Room & Mess Expense Management', margin + 28, 31);

  // Month & Room Info (Right aligned)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - margin - 52, 17, 47, 8, 2, 2, 'F');
  doc.setTextColor(67, 56, 202);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(snapshot.monthYear, pageWidth - margin - 28, 22.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(224, 231, 255);
  doc.text(`Room: ${settings.name} (${settings.roomCode})`, pageWidth - margin - 5, 31, { align: 'right' });

  // --- 2. SUMMARY METRICS CARDS ---
  let startY = 46;
  const cardWidth = (pageWidth - margin * 2 - 8) / 3;
  const cardHeight = 20;

  // Box 1: Total Room Spend
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, startY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL ROOM SPEND', margin + 4, startY + 5);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${currency}${snapshot.totalSpend.toFixed(2)}`, margin + 4, startY + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${expenses.length} bills recorded`, margin + 4, startY + 17);

  // Box 2: Mess Food Pool
  const box2X = margin + cardWidth + 4;
  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(254, 215, 170);
  doc.roundedRect(box2X, startY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(194, 65, 12);
  doc.text('MESS FOOD POOL', box2X + 4, startY + 5);
  doc.setFontSize(12);
  doc.setTextColor(154, 52, 18);
  doc.text(`${currency}${snapshot.totalMessExpense.toFixed(2)}`, box2X + 4, startY + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(234, 88, 12);
  doc.text(`Daily Rate: ${currency}${snapshot.dailyMessRate.toFixed(2)}/day`, box2X + 4, startY + 17);

  // Box 3: Total Room Rent
  const box3X = box2X + cardWidth + 4;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(box3X, startY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61);
  doc.text('ROOM RENT', box3X + 4, startY + 5);
  doc.setFontSize(12);
  doc.setTextColor(22, 101, 52);
  doc.text(`${currency}${snapshot.totalRentExpense.toFixed(2)}`, box3X + 4, startY + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(21, 128, 61);
  doc.text('Equal or custom split', box3X + 4, startY + 17);

  // --- 3. ROOMMATE BREAKDOWN TABLE ---
  startY += 26;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 27, 75);
  doc.text('Roommate Monthly Breakdown & Settlement Balances', margin, startY);

  const tableBody = snapshot.memberSummaries.map(m => {
    const isPlus = m.netBalance > 0.01;
    const isMinus = m.netBalance < -0.01;
    const netStatusStr = isPlus 
      ? `+ ${currency}${m.netBalance.toFixed(2)} (GETS BACK)` 
      : isMinus 
        ? `- ${currency}${Math.abs(m.netBalance).toFixed(2)} (TO PAY)` 
        : `Settled (${currency}0.00)`;

    const membershipStr = m.membershipType === 'both' 
      ? 'Rent + Mess' 
      : m.membershipType === 'rent_only' 
        ? 'Rent Only' 
        : 'Mess Only';

    const daysStr = m.membershipType === 'rent_only' ? '-' : `${m.daysStayed}d`;
    const messStr = m.membershipType === 'rent_only' ? `${currency}0.00` : `${currency}${m.messBill.toFixed(2)}`;

    return [
      m.name,
      membershipStr,
      daysStr,
      messStr,
      `${currency}${m.rentShare.toFixed(2)}`,
      `${currency}${m.totalPaid.toFixed(2)}`,
      netStatusStr,
    ];
  });

  autoTable(doc, {
    startY: startY + 3,
    head: [['Roommate', 'Plan', 'Days', 'Mess Bill', 'Rent Share', 'Total Paid', 'Net Balance']],
    body: tableBody,
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [30, 27, 75],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 'auto' },
      1: { cellWidth: 24 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'right', cellWidth: 22 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 44 },
    },
    didParseCell: (data) => {
      // Color-code Net Balance column: Green for Owes/Minus, Blue for Gets Back/Plus
      if (data.section === 'body' && data.column.index === 6) {
        const text = String(data.cell.raw || '');
        if (text.includes('GETS BACK')) {
          data.cell.styles.textColor = [30, 64, 175]; // Blue
          data.cell.styles.fillColor = [219, 234, 254]; // Light Blue
        } else if (text.includes('TO PAY')) {
          data.cell.styles.textColor = [21, 128, 61]; // Green
          data.cell.styles.fillColor = [220, 252, 231]; // Light Green
        }
      }
    },
  });

  // --- 4. SIMPLIFIED SETTLE-UP TRANSFERS ---
  let finalY = (doc as any).lastAutoTable?.finalY || 140;

  if (snapshot.simplifiedDebts.length > 0) {
    if (finalY > pageHeight - 55) {
      doc.addPage();
      finalY = 15;
    } else {
      finalY += 8;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 27, 75);
    doc.text('Direct Settle-Up Transfers (Optimized Debts)', margin, finalY);

    const debtBody = snapshot.simplifiedDebts.map(d => {
      const fromM = memberMap.get(d.fromMemberId);
      const toM = memberMap.get(d.toMemberId);
      const upiStr = toM?.upiId ? ` (UPI: ${toM.upiId})` : '';
      return [
        fromM?.name || 'Roommate',
        'pays',
        `${toM?.name || 'Roommate'}${upiStr}`,
        `${currency}${d.amount.toFixed(2)}`,
      ];
    });

    autoTable(doc, {
      startY: finalY + 3,
      head: [['From Roommate', '', 'To Roommate', 'Amount to Pay']],
      body: debtBody,
      theme: 'plain',
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 23, 42],
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        1: { halign: 'center', textColor: [100, 116, 139], cellWidth: 15 },
        2: { fontStyle: 'bold', cellWidth: 65 },
        3: { halign: 'right', fontStyle: 'bold', textColor: [79, 70, 229], cellWidth: 35 },
      },
    });

    finalY = (doc as any).lastAutoTable?.finalY || finalY + 25;
  }

  // --- 5. EXPENSE LOG BREAKDOWN (IF PRESENT) ---
  if (expenses.length > 0) {
    if (finalY > pageHeight - 65) {
      doc.addPage();
      finalY = 15;
    } else {
      finalY += 8;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 27, 75);
    doc.text('Recorded Room Purchases & Expenses', margin, finalY);

    const recentExp = expenses.slice(0, 15);
    const expBody = recentExp.map(e => {
      const payer = memberMap.get(e.paidBy)?.name || 'Unknown';
      const cat = e.category.replace('_', ' ').toUpperCase();
      return [
        e.date || '-',
        e.title,
        cat,
        payer,
        `${currency}${e.amount.toFixed(2)}`,
      ];
    });

    autoTable(doc, {
      startY: finalY + 3,
      head: [['Date', 'Description', 'Category', 'Paid By', 'Amount']],
      body: expBody,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7,
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 25 },
      },
    });

    finalY = (doc as any).lastAutoTable?.finalY || finalY + 30;
  }

  // --- 6. FOOTER (ON ALL PAGES) ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated by ROOMEX App • Room: ${settings.roomCode} • Page ${i} of ${totalPages}`, margin, pageHeight - 7);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('App developed by sakeerputhan', pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  const blob = doc.output('blob');
  return { doc, blob, filename };
}

/**
 * Robust Cross-Platform PDF Download
 * Handles sandboxed iframes, mobile Safari/Chrome, and Android download managers
 */
export async function downloadPdfFile(blob: Blob, filename: string): Promise<boolean> {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);

    return true;
  } catch (err) {
    console.error('Download link error:', err);
    // Fallback: Open Blob in new window/tab for user to save
    try {
      const url = URL.createObjectURL(blob);
      const newWin = window.open(url, '_blank');
      if (!newWin) {
        window.location.href = url;
      }
      return true;
    } catch (e) {
      console.error('Fallback download failed', e);
      return false;
    }
  }
}

/**
 * Share PDF Document via Web Share API or WhatsApp Fallback
 */
export async function sharePdfFile({
  blob,
  filename,
  title,
  text,
}: {
  blob: Blob;
  filename: string;
  title: string;
  text: string;
}): Promise<{ method: 'share_api' | 'whatsapp_link' | 'download_fallback'; success: boolean }> {
  // 1. Try Web Share API with File (Supported on Mobile Chrome, Safari, Android, iOS, Windows)
  try {
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return { method: 'share_api', success: true };
    }
  } catch (err: any) {
    // If user cancelled share, don't show error
    if (err?.name === 'AbortError') {
      return { method: 'share_api', success: true };
    }
    console.warn('Web share with files failed, attempting fallback...', err);
  }

  // 2. Fallback: Trigger PDF download AND open WhatsApp with the text summary
  try {
    await downloadPdfFile(blob, filename);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n📄 (PDF Report "${filename}" has been downloaded to your device)`)}`;
    window.open(waUrl, '_blank');
    return { method: 'whatsapp_link', success: true };
  } catch (err) {
    console.error('WhatsApp link fallback error:', err);
    return { method: 'download_fallback', success: false };
  }
}
