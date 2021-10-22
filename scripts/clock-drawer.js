function getBounds(sheet) {
    let sheetWidth = sheet.width();
    let sheetHeight = sheet.height();
    let sheetBorderRight = sheet.offset().left + sheetWidth;
    let sheetBorderBottom = sheet.offset().top + sheetHeight;
}

function showClockCard(event) {
    getBounds();
    event.preventDefault();
}
