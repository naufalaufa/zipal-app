const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const integerMoney = value => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const validDate = value => {
    if (typeof value !== 'string' || !datePattern.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const validatePeriod = (year, month) => {
    const y = Number(year); const m = Number(month);
    if (!Number.isSafeInteger(y) || y < 2000 || y > 2200 || !Number.isSafeInteger(m) || m < 1 || m > 12)
        throw fail('Periode Daily tidak valid.');
    return { year:y, month:m };
};

const validateExpense = input => {
    if (!integerMoney(input.amount)) throw fail('Nominal harus berupa bilangan bulat positif.');
    if (!Number.isSafeInteger(Number(input.category_id)) || Number(input.category_id) <= 0) throw fail('Kategori tidak valid.');
    if (!validDate(input.transaction_date)) throw fail('Tanggal transaksi tidak valid.');
    if (typeof input.description !== 'string' || !input.description.trim() || input.description.trim().length > 255)
        throw fail('Deskripsi wajib diisi dan maksimal 255 karakter.');
    if (input.notes != null && (typeof input.notes !== 'string' || input.notes.length > 2000)) throw fail('Catatan maksimal 2.000 karakter.');
};

const balanceQuery = `SELECT COALESCE(SUM(CASE WHEN type='CREDIT' THEN amount ELSE -amount END),0) balance FROM daily_transactions`;

async function mutateDailyTransaction(pool, actorId, input, mode = 'expense-create') {
    const userId = Number(actorId);
    if (!Number.isSafeInteger(userId) || userId <= 0) throw fail('Pengguna tidak valid.', 403);
    if (mode === 'topup') {
        if (!integerMoney(input.amount)) throw fail('Nominal harus berupa bilangan bulat positif.');
        if (!validDate(input.transaction_date)) throw fail('Tanggal transaksi tidak valid.');
        if (input.notes != null && (typeof input.notes !== 'string' || input.notes.length > 2000)) throw fail('Catatan maksimal 2.000 karakter.');
    } else if (mode !== 'delete') validateExpense(input);

    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('SELECT id FROM daily_ledger_lock WHERE id=1 FOR UPDATE');
        let previous;
        if (mode === 'expense-update' || mode === 'delete') {
            const [rows] = await connection.query("SELECT * FROM daily_transactions WHERE id=? AND type='EXPENSE' FOR UPDATE", [Number(input.id)]);
            previous = rows[0];
            if (!previous) throw fail('Pengeluaran tidak ditemukan.', 404);
        }
        let category;
        if (mode !== 'delete' && mode !== 'topup') {
            const [rows] = await connection.query('SELECT id FROM daily_categories WHERE id=? AND is_active=1', [Number(input.category_id)]);
            category = rows[0];
            if (!category) throw fail('Kategori Daily tidak valid.', 422);
        }
        const [balances] = await connection.query(balanceQuery);
        const before = Number(balances[0].balance || 0);
        const availableForChange = before + Number(previous?.amount || 0);
        if ((mode === 'expense-create' || mode === 'expense-update') && Number(input.amount) > availableForChange)
            throw fail('Saldo Daily tidak mencukupi.', 422);

        let id = previous?.id;
        if (mode === 'topup') {
            const [result] = await connection.query(`INSERT INTO daily_transactions
                (type,category_id,amount,description,notes,transaction_date,created_by)
                VALUES ('CREDIT',NULL,?,'Isi Saldo Daily',?,?,?)`, [input.amount,input.notes?.trim() || null,input.transaction_date,userId]);
            id = result.insertId;
        } else if (mode === 'expense-create') {
            const [result] = await connection.query(`INSERT INTO daily_transactions
                (type,category_id,amount,description,notes,transaction_date,created_by)
                VALUES ('EXPENSE',?,?,?,?,?,?)`, [Number(input.category_id),input.amount,input.description.trim(),input.notes?.trim() || null,input.transaction_date,userId]);
            id = result.insertId;
        } else if (mode === 'expense-update') {
            await connection.query(`UPDATE daily_transactions SET category_id=?,amount=?,description=?,notes=?,transaction_date=? WHERE id=?`,
                [Number(input.category_id),input.amount,input.description.trim(),input.notes?.trim() || null,input.transaction_date,id]);
        } else if (mode === 'delete') {
            await connection.query('DELETE FROM daily_transactions WHERE id=?', [id]);
        } else throw fail('Operasi transaksi tidak valid.');
        const [afterRows] = await connection.query(balanceQuery);
        const balance = Number(afterRows[0].balance || 0);
        if (balance < 0) throw fail('Saldo Daily tidak mencukupi.', 422);
        await connection.commit();
        return { id, balance };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally { connection.release(); }
}

async function replaceDailyAllocations(pool, actorId, input) {
    const userId=Number(actorId);
    if (!Number.isSafeInteger(userId) || userId <= 0) throw fail('Pengguna tidak valid.',403);
    const period=validatePeriod(input.year,input.month);
    if (!Array.isArray(input.allocations)) throw fail('Daftar pembagian saldo tidak valid.');
    const allocations=input.allocations.map(item=>({category_id:Number(item.category_id),amount:Number(item.amount)}));
    if (allocations.some(item=>!Number.isSafeInteger(item.category_id)||item.category_id<=0||!Number.isSafeInteger(item.amount)||item.amount<0))
        throw fail('Nominal pembagian harus berupa bilangan bulat nol atau positif.');
    if (new Set(allocations.map(item=>item.category_id)).size!==allocations.length) throw fail('Kategori pembagian tidak boleh duplikat.');

    const connection=await pool.promise().getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('SELECT id FROM daily_ledger_lock WHERE id=1 FOR UPDATE');
        const [categories]=await connection.query('SELECT id FROM daily_categories WHERE is_active=1 FOR UPDATE');
        const activeIds=new Set(categories.map(item=>Number(item.id)));
        if (allocations.some(item=>!activeIds.has(item.category_id))) throw fail('Kategori Daily tidak valid.',422);
        const start=`${period.year}-${String(period.month).padStart(2,'0')}-01`;
        const next=period.month===12?`${period.year+1}-01-01`:`${period.year}-${String(period.month+1).padStart(2,'0')}-01`;
        const [[wallet],[spentRows]]=await Promise.all([
            connection.query(balanceQuery),
            connection.query("SELECT COALESCE(SUM(amount),0) spent FROM daily_transactions WHERE type='EXPENSE' AND transaction_date>=? AND transaction_date<?",[start,next]),
        ]);
        const capacity=Number(wallet[0].balance||0)+Number(spentRows[0].spent||0);
        const total=allocations.reduce((sum,item)=>sum+item.amount,0);
        if (total>capacity) throw fail('Total pembagian melebihi saldo Daily yang tersedia untuk bulan ini.',422);
        await connection.query('DELETE FROM daily_budgets WHERE budget_year=? AND budget_month=?',[period.year,period.month]);
        for (const item of allocations.filter(item=>item.amount>0)) {
            await connection.query(`INSERT INTO daily_budgets (category_id,budget_year,budget_month,budget_amount,updated_by)
                VALUES (?,?,?,?,?)`,[item.category_id,period.year,period.month,item.amount,userId]);
        }
        await connection.commit();
        return {total_allocated:total,allocation_capacity:capacity,unallocated:capacity-total};
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally { connection.release(); }
}

module.exports = { mutateDailyTransaction, replaceDailyAllocations, integerMoney, validDate, validateExpense, validatePeriod, fail };
