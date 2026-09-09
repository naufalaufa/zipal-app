const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const validAmount = value => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

// All balance mutations use the same connection and lock order.
async function mutateTransaction(pool, actor, input, mode = 'create') {
    if (!['naufalaufa', 'zihraangelina', 'zipaladmin'].includes(actor)) throw fail('Akun tidak diizinkan.', 403);
    if (mode !== 'delete' && !validAmount(input.amount)) throw fail('Nominal harus bilangan bulat positif.');
    if (input.description != null && typeof input.description !== 'string') throw fail('Catatan tidak valid.');
    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();
        // Serialize monetary writes, including edits/cancellations across different goals.
        await connection.query('SELECT id FROM users ORDER BY id FOR UPDATE');
        let previous;
        if (mode !== 'create') {
            const [rows] = await connection.query(mode === 'delete'
                ? 'SELECT * FROM transactions WHERE username = ? AND type = ? ORDER BY id DESC LIMIT 1 FOR UPDATE'
                : 'SELECT * FROM transactions WHERE id = ? FOR UPDATE',
            mode === 'delete' ? [actor, input.type] : [input.id]);
            previous = rows[0];
            if (!previous) throw fail('Transaksi tidak ditemukan.', 404);
            if (previous.username !== actor) throw fail('Transaksi bukan milik akun ini.', 403);
        }
        const type = previous?.type || input.type;
        if (!['deposit', 'withdraw'].includes(type)) throw fail('Tipe transaksi tidak valid.');
        const goalId = previous ? previous.goal_id : input.goal_id;
        if (mode === 'create' && (!Number.isSafeInteger(goalId) || goalId <= 0)) throw fail('Pilih tabungan dari Purpose.');
        let goal;
        if (goalId != null) {
            const [goals] = await connection.query('SELECT * FROM financial_goals WHERE id = ? FOR UPDATE', [goalId]);
            goal = goals[0];
            if (!goal) throw fail('Tabungan tidak ditemukan.', 404);
        }
        const sign = type === 'deposit' ? 1 : -1;
        const delta = sign * ((mode === 'delete' ? 0 : input.amount) - Number(previous?.amount || 0));
        if (goal && Number(goal.collected_amount) + delta < 0) throw fail('Saldo tabungan tidak mencukupi untuk perubahan ini.');
        const [balances] = await connection.query("SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS balance FROM transactions WHERE username = ?", [actor]);
        const before = Number(balances[0].balance);
        const date = new Date().toISOString();
        let id = previous?.id;
        if (mode === 'create') {
            const [result] = await connection.query('INSERT INTO transactions (username, type, amount, date, description, goal_id) VALUES (?, ?, ?, ?, ?, ?)', [actor, type, input.amount, date.slice(0, 10), input.description || '', goalId]);
            id = result.insertId;
        } else if (mode === 'delete') {
            await connection.query('DELETE FROM transactions WHERE id = ?', [id]);
        } else {
            await connection.query('UPDATE transactions SET amount = ?, description = ? WHERE id = ?', [input.amount, input.description || '', id]);
        }
        if (goal) {
            try {
                await connection.query(`UPDATE financial_goals
                    SET collected_amount = collected_amount + ?,
                        target_reached_at = CASE
                            WHEN target_reached_at IS NULL AND collected_amount + ? >= target_amount THEN CURRENT_TIMESTAMP
                            ELSE target_reached_at END
                    WHERE id = ?`, [delta, delta, goalId]);
            } catch (error) {
                // Rolling-deployment compatibility: keep existing transactions usable until migration 003 is applied.
                if (error.code !== 'ER_BAD_FIELD_ERROR') throw error;
                await connection.query('UPDATE financial_goals SET collected_amount = collected_amount + ? WHERE id = ?', [delta, goalId]);
            }
        }
        await connection.commit();
        return { id, username: actor, type, amount: input.amount, description: input.description, date, goalName: goal?.title, saldoSebelum: before, saldoSesudah: before + delta };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = { mutateTransaction, validAmount };
