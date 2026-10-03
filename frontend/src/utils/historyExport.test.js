import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyHistoryTableState, createHistoryWorkbook } from './historyExport.js';

const historyRows = [
    { id: 1, date: '2026-09-01', username: 'naufalaufa', type: 'deposit', amount: '1000000', goal_name: null, description: 'Awal' },
    { id: 2, date: '2026-10-01', username: 'zihraangelina', type: 'deposit', amount: '150000', goal_name: 'Dana Darurat', description: 'Oktober' },
    { id: 3, date: '2026-09-15', username: 'naufalaufa', type: 'withdraw', amount: '250000', goal_name: 'Rumah', description: 'Kebutuhan' },
];

test('History export uses every row matching active table filters and sorting', () => {
    const result = applyHistoryTableState(
        historyRows,
        { username: ['naufalaufa'], type: ['deposit'] },
        { field: 'date', order: 'descend' },
    );

    assert.deepEqual(result.map((row) => row.id), [1]);

    const sortedResult = applyHistoryTableState(
        historyRows,
        { username: ['naufalaufa'] },
        { field: 'date', order: 'descend' },
    );
    assert.deepEqual(sortedResult.map((row) => row.id), [3, 1]);
});

test('History workbook keeps nominal numeric and configures the requested Excel presentation', async () => {
    const workbook = await createHistoryWorkbook(historyRows);
    const buffer = await workbook.xlsx.writeBuffer();
    const reloadedWorkbook = new workbook.constructor();
    await reloadedWorkbook.xlsx.load(buffer);
    const worksheet = reloadedWorkbook.getWorksheet('Zipal History');

    assert.ok(buffer.byteLength > 0);
    assert.equal(worksheet.rowCount, historyRows.length + 1);
    assert.equal(worksheet.getCell('A1').font.bold, true);
    assert.equal(worksheet.getCell('E2').value, 1000000);
    assert.equal(typeof worksheet.getCell('E2').value, 'number');
    assert.equal(worksheet.getCell('E2').numFmt, '"Rp" #,##0;[Red]-"Rp" #,##0');
    assert.equal(worksheet.getCell('B2').value instanceof Date, true);
    assert.equal(worksheet.getCell('B2').numFmt, '[$-409]dd mmmm yyyy');
    assert.equal(worksheet.getCell('C2').value, 'Naufal Aufa');
    assert.equal(worksheet.getCell('D2').value, 'Uang Masuk (Deposit)');
    assert.equal(worksheet.getCell('F2').value, 'Transaksi lama (belum dialokasikan)');
    assert.equal(worksheet.autoFilter, 'A1:G1');
    assert.equal(worksheet.views[0].state, 'frozen');
    assert.equal(worksheet.views[0].ySplit, 1);
});
