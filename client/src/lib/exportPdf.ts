import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Ticket } from '../types';

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  feature_request: 'Feature Request',
  billing: 'Billing',
  support: 'Support',
  other: 'Other',
};

export function exportTicketsPdf(tickets: Ticket[], options: {
  month?: string;
  prestataireLabel?: string;
  statusLabel?: string;
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TicketFlow', 14, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Ticket Export Report', pageWidth - 14, 13, { align: 'right' });

  // Subtitle / filters summary
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFontSize(9);
  const parts: string[] = [];
  if (options.month) parts.push(`Month: ${options.month}`);
  if (options.prestataireLabel && options.prestataireLabel !== 'All') parts.push(`Prestataire: ${options.prestataireLabel}`);
  if (options.statusLabel && options.statusLabel !== 'All') parts.push(`Status: ${options.statusLabel}`);
  parts.push(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`);
  doc.text(parts.join('   •   '), 14, 30);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.text(`${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`, pageWidth - 14, 30, { align: 'right' });

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Title', 'Description', 'Status', 'Priority', 'Category', 'Prestataire', 'Created']],
    body: tickets.map((t, i) => [
      String(i + 1),
      t.title,
      t.description,
      STATUS_LABELS[t.status] ?? t.status,
      PRIORITY_LABELS[t.priority] ?? t.priority,
      CATEGORY_LABELS[t.category ?? ''] ?? t.category ?? '—',
      t.prestataire?.name ?? '—',
      format(new Date(t.created_at), 'dd/MM/yyyy'),
    ]),
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 26 },
      4: { cellWidth: 22 },
      5: { cellWidth: 28 },
      6: { cellWidth: 38 },
      7: { cellWidth: 24, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    styles: { overflow: 'linebreak', cellPadding: 3 },
  });

  const monthSlug = options.month ? options.month.replace(/\s/g, '_') : 'all';
  doc.save(`tickets_${monthSlug}.pdf`);
}
