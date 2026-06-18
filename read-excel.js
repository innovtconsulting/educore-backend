const ExcelJS = require('exceljs');
async function readExcel() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('base.xlsx');
  const worksheet = workbook.getWorksheet(1);
  for (let i = 1; i <= 5; i++) {
    const row = worksheet.getRow(i);
    console.log(row.values.join(' | '));
  }
}
readExcel();
