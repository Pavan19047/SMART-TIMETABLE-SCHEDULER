import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

interface TimetableData {
  name: string;
  semester: number;
  entries: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    batch: { name: string };
    subject: { name: string; code: string; type: string };
    faculty: { name: string };
    classroom: { roomId: string };
  }[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = [
  { label: 'HOUR 1', start: '09:00', end: '10:00' },
  { label: 'HOUR 2', start: '10:00', end: '11:00' },
  { label: 'SHORT BREAK', start: '11:00', end: '11:15', isBreak: true },
  { label: 'HOUR 3', start: '11:15', end: '12:15' },
  { label: 'HOUR 4', start: '12:15', end: '13:15' },
  { label: 'LUNCH BREAK', start: '13:15', end: '14:00', isBreak: true },
  { label: 'HOUR 5', start: '14:00', end: '15:00' },
  { label: 'HOUR 6', start: '15:00', end: '16:00' },
  { label: 'SHORT BREAK', start: '16:00', end: '16:15', isBreak: true },
  { label: 'HOUR 7', start: '16:15', end: '17:15' },
];

export const exportToPDF = async (timetable: TimetableData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 20, size: 'A2', layout: 'landscape' });
    const buffers: Buffer[] = [];

    doc.on('data', (buffer) => buffers.push(buffer));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text(timetable.name, { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`Semester: ${timetable.semester}`, { align: 'center' });
    doc.moveDown();

    // Create grid structure
    const startX = 30;
    const startY = 100;
    const dayColumnWidth = 80;
    const slotColumnWidth = 135;
    const rowHeight = 95;

    // Group entries by day and time slot
    // Also track which slots are occupied by multi-period classes
    const grid = new Map<number, Map<number, typeof timetable.entries[0]>>();
    const occupiedSlots = new Map<number, Set<number>>();
    
    timetable.entries.forEach((entry) => {
      if (!grid.has(entry.dayOfWeek)) {
        grid.set(entry.dayOfWeek, new Map());
        occupiedSlots.set(entry.dayOfWeek, new Set());
      }
      
      // Find the starting slot
      const startSlotIndex = TIME_SLOTS.findIndex(slot => 
        !slot.isBreak && slot.start === entry.startTime
      );
      
      if (startSlotIndex >= 0) {
        grid.get(entry.dayOfWeek)!.set(startSlotIndex, entry);
        occupiedSlots.get(entry.dayOfWeek)!.add(startSlotIndex);
        
        // Mark additional slots as occupied for multi-period classes
        const duration = calculateDuration(entry.startTime, entry.endTime);
        if (duration > 60) {
          // Find all slots this class occupies
          for (let i = startSlotIndex + 1; i < TIME_SLOTS.length; i++) {
            const slot = TIME_SLOTS[i];
            if (!slot.isBreak && slot.start < entry.endTime) {
              occupiedSlots.get(entry.dayOfWeek)!.add(i);
            } else if (slot.start >= entry.endTime) {
              break;
            }
          }
        }
      }
    });
    
    // Helper function to calculate duration in minutes
    function calculateDuration(start: string, end: string): number {
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      return (endHour * 60 + endMin) - (startHour * 60 + startMin);
    }

    // Draw table headers
    doc.fontSize(9).font('Helvetica-Bold');
    
    // Day/Hour header
    doc.rect(startX, startY, dayColumnWidth, 30).stroke();
    doc.text('DAY/HOUR', startX + 5, startY + 10, { width: dayColumnWidth - 10 });

    // Time slot headers
    TIME_SLOTS.forEach((slot, index) => {
      const x = startX + dayColumnWidth + (index * slotColumnWidth);
      doc.rect(x, startY, slotColumnWidth, 30).stroke();
      doc.fillColor(slot.isBreak ? '#FFA500' : '#000000');
      doc.text(slot.label, x + 5, startY + 5, { width: slotColumnWidth - 10, align: 'center' });
      if (!slot.isBreak) {
        doc.fontSize(7).text(`${slot.start} - ${slot.end}`, x + 5, startY + 18, { 
          width: slotColumnWidth - 10, 
          align: 'center' 
        });
      }
      doc.fillColor('#000000');
      doc.fontSize(9).font('Helvetica-Bold');
    });

    // Draw rows for each day
    DAYS.slice(0, 5).forEach((day, dayIndex) => {
      const y = startY + 30 + (dayIndex * rowHeight);
      
      // Day column
      doc.rect(startX, y, dayColumnWidth, rowHeight).stroke();
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(day, startX + 5, y + rowHeight / 2 - 5, { width: dayColumnWidth - 10 });

      // Track which slots we've already drawn (for multi-period classes)
      const drawnSlots = new Set<number>();

      // Time slot columns
      TIME_SLOTS.forEach((slot, slotIndex) => {
        const x = startX + dayColumnWidth + (slotIndex * slotColumnWidth);
        
        if (slot.isBreak) {
          doc.rect(x, y, slotColumnWidth, rowHeight).fillAndStroke('#FFF8DC', '#000000');
          doc.fillColor('#FFA500').fontSize(8).font('Helvetica-Bold');
          doc.text(slot.label, x + 5, y + rowHeight / 2 - 10, { 
            width: slotColumnWidth - 10, 
            align: 'center' 
          });
          doc.fontSize(7);
          doc.text(`${slot.start} - ${slot.end}`, x + 5, y + rowHeight / 2 + 2, { 
            width: slotColumnWidth - 10, 
            align: 'center' 
          });
          doc.fillColor('#000000');
        } else {
          // Check if this slot was already drawn as part of a multi-period class
          if (drawnSlots.has(slotIndex)) {
            // Skip drawing, but still draw the border
            doc.rect(x, y, slotColumnWidth, rowHeight).stroke();
            return;
          }
          
          // Check if there's a class starting in this slot
          const entry = grid.get(dayIndex)?.get(slotIndex);
          if (entry) {
            // Calculate how many slots this class spans
            const duration = calculateDuration(entry.startTime, entry.endTime);
            let numSlots = 1;
            let totalWidth = slotColumnWidth;
            
            // Count non-break slots this class occupies
            for (let i = slotIndex + 1; i < TIME_SLOTS.length; i++) {
              const nextSlot = TIME_SLOTS[i];
              if (!nextSlot.isBreak && nextSlot.start < entry.endTime) {
                numSlots++;
                totalWidth += slotColumnWidth;
                drawnSlots.add(i);
              } else if (nextSlot.start >= entry.endTime) {
                break;
              }
            }
            
            // Draw colored box for class spanning multiple slots
            const bgColor = entry.subject.type === 'LAB' || entry.subject.type === 'PRACTICAL' || entry.subject.type === 'THEORY_CUM_PRACTICAL'
              ? '#90EE90' : '#E6F3FF';
            doc.rect(x + 5, y + 5, totalWidth - 10, rowHeight - 10).fillAndStroke(bgColor, '#000000');
            
            // Subject type badge
            const badge = entry.subject.type === 'LAB' || entry.subject.type === 'PRACTICAL' || entry.subject.type === 'THEORY_CUM_PRACTICAL' ? 'LAB' : 'TH';
            const badgeColor = entry.subject.type === 'LAB' || entry.subject.type === 'PRACTICAL' || entry.subject.type === 'THEORY_CUM_PRACTICAL'
              ? '#FF6347' : '#4169E1';
            doc.rect(x + totalWidth - 40, y + 10, 30, 15).fillAndStroke(badgeColor, badgeColor);
            doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold');
            doc.text(badge, x + totalWidth - 40, y + 13, { width: 30, align: 'center' });
            
            // Class details
            doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
            doc.text(entry.subject.code, x + 10, y + 12, { width: totalWidth - 50 });
            
            doc.fontSize(7).font('Helvetica');
            doc.text(entry.faculty.name, x + 10, y + 25, { width: totalWidth - 20 });
            doc.text(entry.batch.name, x + 10, y + 37, { width: totalWidth - 20 });
            doc.text(`${entry.startTime} - ${entry.endTime}`, x + 10, y + 62, { width: totalWidth - 20 });
            doc.text(`Room: ${entry.classroom.roomId}`, x + 10, y + 74, { width: totalWidth - 20 });
          } else {
            // Empty slot
            doc.rect(x, y, slotColumnWidth, rowHeight).stroke();
          }
        }
      });
    });

    doc.end();
  });
};

export const exportToExcel = async (timetable: TimetableData): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Timetable');

  // Title
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = timetable.name;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:G2');
  const semesterCell = worksheet.getCell('A2');
  semesterCell.value = `Semester: ${timetable.semester}`;
  semesterCell.alignment = { horizontal: 'center' };

  worksheet.addRow([]);

  // Create grid structure
  const grid = new Map<number, Map<number, typeof timetable.entries[0]>>();
  const occupiedSlotsExcel = new Map<number, Set<number>>();
  
  timetable.entries.forEach((entry) => {
    if (!grid.has(entry.dayOfWeek)) {
      grid.set(entry.dayOfWeek, new Map());
      occupiedSlotsExcel.set(entry.dayOfWeek, new Set());
    }
    
    const startSlotIndex = TIME_SLOTS.findIndex(slot => 
      !slot.isBreak && slot.start === entry.startTime
    );
    
    if (startSlotIndex >= 0) {
      grid.get(entry.dayOfWeek)!.set(startSlotIndex, entry);
      occupiedSlotsExcel.get(entry.dayOfWeek)!.add(startSlotIndex);
      
      // Mark additional slots as occupied for multi-period classes
      const duration = calculateDurationExcel(entry.startTime, entry.endTime);
      if (duration > 60) {
        for (let i = startSlotIndex + 1; i < TIME_SLOTS.length; i++) {
          const slot = TIME_SLOTS[i];
          if (!slot.isBreak && slot.start < entry.endTime) {
            occupiedSlotsExcel.get(entry.dayOfWeek)!.add(i);
          } else if (slot.start >= entry.endTime) {
            break;
          }
        }
      }
    }
  });
  
  function calculateDurationExcel(start: string, end: string): number {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    return (endHour * 60 + endMin) - (startHour * 60 + startMin);
  }

  // Headers row
  const headerRow = worksheet.addRow([
    'DAY/HOUR',
    ...TIME_SLOTS.map(slot => slot.label)
  ]);

  headerRow.font = { bold: true, size: 11 };
  headerRow.height = 25;
  headerRow.eachCell((cell, colNumber) => {
    const slot = TIME_SLOTS[colNumber - 2];
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: slot?.isBreak ? 'FFFFA500' : 'FF4472C4' },
    };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Add time slot info row
  const timeRow = worksheet.addRow([
    '',
    ...TIME_SLOTS.map(slot => slot.isBreak ? `${slot.start} - ${slot.end}` : '')
  ]);
  timeRow.font = { size: 9, italic: true };
  timeRow.eachCell((cell) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Data rows for each day
  DAYS.slice(0, 5).forEach((day, dayIndex) => {
    const currentRowNumber = worksheet.lastRow!.number + 1;
    const mergeInfo: Array<{startCol: number, endCol: number, content: string, isLab: boolean}> = [];
    
    // Track processed slots to handle multi-period classes
    const processedSlots = new Set<number>();
    const rowData: any[] = [day]; // Start with day column
    
    // Build row data maintaining column alignment
    let currentCol = 2; // Start from column 2 (after day column)
    
    TIME_SLOTS.forEach((slot, slotIndex) => {
      if (slot.isBreak) {
        rowData.push(`${slot.label}\n${slot.start} - ${slot.end}`);
        currentCol++;
      } else {
        // Check if this slot was already processed as part of a multi-period class
        if (processedSlots.has(slotIndex)) {
          // Add empty placeholder for merged cell continuation
          rowData.push('');
          currentCol++;
          return;
        }
        
        const entry = grid.get(dayIndex)?.get(slotIndex);
        if (entry) {
          const type = entry.subject.type === 'LAB' || entry.subject.type === 'PRACTICAL' || entry.subject.type === 'THEORY_CUM_PRACTICAL' ? 'LAB' : 'TH';
          const content = `${entry.subject.code} [${type}]\n` +
            `${entry.faculty.name}\n` +
            `${entry.batch.name}\n` +
            `${entry.startTime} - ${entry.endTime}\n` +
            `Room: ${entry.classroom.roomId}`;
          
          // Calculate how many non-break slots this class spans
          let spannedCols = 1;
          const startCol = currentCol;
          
          for (let i = slotIndex + 1; i < TIME_SLOTS.length; i++) {
            const nextSlot = TIME_SLOTS[i];
            if (!nextSlot.isBreak && nextSlot.start < entry.endTime) {
              processedSlots.add(i);
              spannedCols++;
            } else if (nextSlot.start >= entry.endTime) {
              break;
            }
          }
          
          rowData.push(content);
          
          // Store merge info if spans multiple columns
          if (spannedCols > 1) {
            const endCol = startCol + spannedCols - 1;
            
            mergeInfo.push({
              startCol, 
              endCol, 
              content, 
              isLab: type === 'LAB'
            });
          }
          currentCol++;
        } else {
          rowData.push('');
          currentCol++;
        }
      }
    });

    const row = worksheet.addRow(rowData);
    row.height = 100; // Increased height for better visibility
    
    // Apply cell merges for multi-period classes BEFORE styling
    mergeInfo.forEach(({startCol, endCol, content, isLab}) => {
      const startCell = worksheet.getCell(currentRowNumber, startCol);
      const endCell = worksheet.getCell(currentRowNumber, endCol);
      worksheet.mergeCells(startCell.address, endCell.address);
      // Ensure content is in the merged cell
      startCell.value = content;
      startCell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle', 
        wrapText: true 
      };
      startCell.font = { size: 10, bold: true };
      startCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isLab ? 'FF90EE90' : 'FFE6F3FF' }
      };
      startCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Style all cells in the row
    let colOffset = 1; // Start from column 1 (day column)
    
    row.eachCell((cell, colNumber) => {
      // Skip if already styled (merged cells)
      const isMergedCell = mergeInfo.some(m => 
        colNumber >= m.startCol && colNumber <= m.endCol
      );
      
      if (isMergedCell) {
        return; // Skip merged cells as they're already styled
      }
      
      const slotIndex = colNumber - 2;
      const slot = TIME_SLOTS[slotIndex];
      
      cell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle', 
        wrapText: true 
      };
      
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      if (colNumber === 1) {
        // Day column
        cell.font = { bold: true, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        };
      } else if (slot?.isBreak) {
        // Break columns
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF8DC' }
        };
        cell.font = { color: { argb: 'FFFFA500' }, bold: true, size: 10 };
      } else {
        // Check if this is a regular (non-merged) class cell
        const entry = grid.get(dayIndex)?.get(slotIndex);
        if (entry && cell.value) {
          const isLab = entry.subject.type === 'LAB' || entry.subject.type === 'PRACTICAL' || entry.subject.type === 'THEORY_CUM_PRACTICAL';
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isLab ? 'FF90EE90' : 'FFE6F3FF' }
          };
          cell.font = { size: 10, bold: true };
        }
      }
    });
  });

  // Set column widths - make them wider to show all content
  worksheet.getColumn(1).width = 18; // Day column
  for (let i = 2; i <= TIME_SLOTS.length + 1; i++) {
    worksheet.getColumn(i).width = 30; // Wider columns for better readability
  }

  return await workbook.xlsx.writeBuffer() as Buffer;
};
