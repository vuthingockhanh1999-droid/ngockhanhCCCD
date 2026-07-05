import ExcelJS from 'exceljs';
import { CCCDData } from '@/types';

export const exportToExcel = async (data: CCCDData[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Danh sách CCCD');

  // Freeze Header
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1 }
  ];

  // Define columns
  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Họ và tên', key: 'fullName', width: 30 },
    { header: 'Ngày sinh', key: 'birthDate', width: 15 },
    { header: 'Địa chỉ', key: 'address', width: 50 },
    { header: 'Ngày cấp', key: 'issueDate', width: 15 },
    { header: 'Cơ quan cấp', key: 'issuedBy', width: 45 },
  ];

  // Style header
  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' } // Blue 600
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Enable AutoFilter for the header row
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 6 }
  };

  // Add data
  data.forEach((item, index) => {
    const row = worksheet.addRow({
      stt: index + 1,
      fullName: item.fullName,
      birthDate: item.birthDate,
      address: item.address,
      issueDate: item.issueDate,
      issuedBy: item.issuedBy,
    });

    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
  });

  // Generate blob and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'CCCD.xlsx';
  a.click();
  
  window.URL.revokeObjectURL(url);
};
