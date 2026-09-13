const test = require('node:test');
const assert = require('node:assert/strict');
const template = require('../data/agreementTemplate.json');

test('agreement returns funds by recorded contribution without equal split or forfeiture', () => {
    const separation = template.clauses.find(clause => clause.title.startsWith('Pasal 4:'));
    const infidelity = template.clauses.find(clause => clause.title.startsWith('Pasal 7:'));

    assert.ok(separation?.content.includes('sesuai dengan jumlah total nominal yang telah disetorkan'));
    assert.doesNotMatch(separation.content, /setoran dianggap lebur|dibagi rata/i);
    assert.ok(infidelity?.content.includes('berdasarkan jumlah total nominal kontribusi'));
    assert.match(infidelity.content, /Tidak berlaku pembagian rata 50:50/i);
    assert.doesNotMatch(infidelity.content, /Kehilangan hak|dana denda|dialihkan sepenuhnya/i);
});
