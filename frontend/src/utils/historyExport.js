const DEFAULT_GOAL_NAME = 'Transaksi lama (belum dialokasikan)';

const USER_DISPLAY_NAMES = {
    naufalaufa: 'Naufal Aufa',
    zihraangelina: 'Zihra Angelina',
    zipaladmin: 'Admin Investasi',
};

const TRANSACTION_LABELS = {
    deposit: 'Uang Masuk (Deposit)',
    withdraw: 'Uang Keluar (Withdraw)',
};

export const getHistoryUserDisplayName = (username) => USER_DISPLAY_NAMES[username] || username || '-';

export const getHistoryTransactionLabel = (type) => TRANSACTION_LABELS[type] || type || '-';

const isFilterActive = (values) => Array.isArray(values) && values.length > 0;

const compareHistoryValues = (left, right, field) => {
    if (field === 'date') {
        return new Date(left.date).getTime() - new Date(right.date).getTime();
    }

    if (field === 'amount') {
        return Number(left.amount) - Number(right.amount);
    }

    return String(left[field] ?? '').localeCompare(String(right[field] ?? ''), 'id');
};

export const applyHistoryTableState = (rows, filters = {}, sorter = {}) => {
    const usernameFilters = filters.username;
    const typeFilters = filters.type;

    const filteredRows = rows.filter((row) => {
        const matchesUsername = !isFilterActive(usernameFilters) || usernameFilters.includes(row.username);
        const matchesType = !isFilterActive(typeFilters) || typeFilters.includes(row.type);
        return matchesUsername && matchesType;
    });

    if (!sorter.order) return filteredRows;

    const field = sorter.field || sorter.columnKey;
    if (!field) return filteredRows;

    const direction = sorter.order === 'ascend' ? 1 : -1;
    return filteredRows
        .map((row, index) => ({ row, index }))
        .sort((left, right) => {
            const comparison = compareHistoryValues(left.row, right.row, field);
            return comparison === 0 ? left.index - right.index : comparison * direction;
        })
        .map(({ row }) => row);
};

const toExcelDate = (value) => {
    const dateMatch = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) throw new Error('Tanggal transaksi tidak valid.');
    return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
};

const toNumericAmount = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) throw new Error('Nominal transaksi tidak valid.');
    return amount;
};

const formatFileDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const createHistoryWorkbook = async (rows) => {
    const excelModule = await import('exceljs');
    const ExcelJS = excelModule.default || excelModule;
    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'Zipal Application';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Zipal History', {
        views: [{ state: 'frozen', ySplit: 1 }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    worksheet.columns = [
        { header: 'No', key: 'number', width: 8 },
        { header: 'Tanggal', key: 'date', width: 22 },
        { header: 'User / Pelaku', key: 'username', width: 22 },
        { header: 'Tipe Transaksi', key: 'type', width: 26 },
        { header: 'Nominal', key: 'amount', width: 20 },
        { header: 'Tabungan', key: 'goal', width: 34 },
        { header: 'Keterangan', key: 'description', width: 42 },
    ];

    rows.forEach((row, index) => {
        worksheet.addRow({
            number: index + 1,
            date: toExcelDate(row.date),
            username: getHistoryUserDisplayName(row.username),
            type: getHistoryTransactionLabel(row.type),
            amount: toNumericAmount(row.amount),
            goal: row.goal_name || DEFAULT_GOAL_NAME,
            description: row.description || '',
        });
    });

    worksheet.autoFilter = { from: 'A1', to: 'G1' };
    worksheet.getColumn('date').numFmt = '[$-409]dd mmmm yyyy';
    worksheet.getColumn('amount').numFmt = '"Rp" #,##0;[Red]-"Rp" #,##0';

    const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    };

    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6750A4' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = thinBorder;
    });

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.alignment = { vertical: 'top', wrapText: true };
        row.eachCell((cell) => {
            cell.border = thinBorder;
        });
    });

    worksheet.getColumn('number').alignment = { horizontal: 'center' };
    worksheet.getColumn('date').alignment = { horizontal: 'center' };
    worksheet.getColumn('amount').alignment = { horizontal: 'right' };

    return workbook;
};

export const exportHistoryToExcel = async (rows, now = new Date()) => {
    const workbook = await createHistoryWorkbook(rows);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `Zipal_History_${formatFileDate(now)}.xlsx`;

    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);

    return fileName;
};
