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
    subject: { name: string; code: string };
    faculty: { name: string };
    classroom: { roomId: string };
  }[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const exportToPDF = async (timetable: TimetableData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const buffers: Buffer[] = [];

    doc.on('data', (buffer) => buffers.push(buffer));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text(timetable.name, { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`Semester: ${timetable.semester}`, { align: 'center' });
    doc.moveDown();

    // Group entries by day
    const entriesByDay = new Map<number, typeof timetable.entries>();
    timetable.entries.forEach((entry) => {
      if (!entriesByDay.has(entry.dayOfWeek)) {
        entriesByDay.set(entry.dayOfWeek, []);
      }
      entriesByDay.get(entry.dayOfWeek)!.push(entry);
    });

    // Render each day
    entriesByDay.forEach((entries, dayOfWeek) => {
      doc.fontSize(14).font('Helvetica-Bold').text(DAYS[dayOfWeek], { underline: true });
      doc.moveDown(0.5);

      entries.sort((a, b) => a.startTime.localeCompare(b.startTime));

      entries.forEach((entry) => {
        doc.fontSize(10).font('Helvetica');
        doc.text(
          `${entry.startTime} - ${entry.endTime} | ${entry.batch.name} | ${entry.subject.code} - ${entry.subject.name}`,
          { continued: true }
        );
        doc.text(` | ${entry.faculty.name} | Room: ${entry.classroom.roomId}`);
      });

      doc.moveDown();
    });

    doc.end();
  });
};

export const exportToExcel = async (timetable: TimetableData): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Timetable');

  // Title
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = timetable.name;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:H2');
  const semesterCell = worksheet.getCell('A2');
  semesterCell.value = `Semester: ${timetable.semester}`;
  semesterCell.alignment = { horizontal: 'center' };

  worksheet.addRow([]);

  // Headers
  const headerRow = worksheet.addRow([
    'Day',
    'Time',
    'Batch',
    'Subject Code',
    'Subject Name',
    'Faculty',
    'Classroom',
  ]);

  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Data rows
  const sortedEntries = [...timetable.entries].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });

  sortedEntries.forEach((entry) => {
    worksheet.addRow([
      DAYS[entry.dayOfWeek],
      `${entry.startTime} - ${entry.endTime}`,
      entry.batch.name,
      entry.subject.code,
      entry.subject.name,
      entry.faculty.name,
      entry.classroom.roomId,
    ]);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const length = cell.value ? cell.value.toString().length : 10;
      if (length > maxLength) maxLength = length;
    });
    column.width = Math.min(maxLength + 2, 50);
  });

  return await workbook.xlsx.writeBuffer() as Buffer;
};
