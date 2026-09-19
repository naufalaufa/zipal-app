import { Alert, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { rupiah, safeNumber } from '../features/daily';

const moneyInputProps={ min:1,precision:0,step:1000,style:{width:'100%'},formatter:value=>value==null?'':`Rp ${String(value).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}`,parser:value=>Number(String(value||'').replace(/[^0-9]/g,'')) };

export function DailyTopUpForm({ open, saving, onCancel, onSubmit }) {
  const [form]=Form.useForm();
  const submit=async()=>{const values=await form.validateFields();await onSubmit({...values,transaction_date:values.transaction_date.format('YYYY-MM-DD')});form.resetFields();};
  return <Modal title="Isi Saldo Daily" open={open} onCancel={onCancel} onOk={submit} confirmLoading={saving} okText="Isi Saldo" cancelText="Batal" destroyOnHidden>
    <Form form={form} layout="vertical" initialValues={{transaction_date:dayjs()}} requiredMark="optional">
      <Form.Item name="amount" label="Nominal" rules={[{required:true,message:'Nominal wajib diisi.'},{type:'number',min:1,message:'Nominal harus lebih dari nol.'}]}><InputNumber {...moneyInputProps}/></Form.Item>
      <Form.Item name="transaction_date" label="Tanggal" rules={[{required:true,message:'Tanggal wajib diisi.'}]}><DatePicker format="DD MMMM YYYY" style={{width:'100%'}}/></Form.Item>
      <Form.Item name="notes" label="Catatan"><Input.TextArea maxLength={2000} showCount rows={3} placeholder="Contoh: Saldo kebutuhan bulan ini"/></Form.Item>
    </Form>
  </Modal>;
}

export function DailyAllocationForm({ open, saving, categories, period, balance, expenses, onCancel, onSubmit }) {
  const [form]=Form.useForm();
  const values=Form.useWatch('allocations',form)||{};
  const capacity=safeNumber(balance)+safeNumber(expenses);
  const total=categories.reduce((sum,item)=>sum+safeNumber(values[item.id]),0);
  const over=total>capacity;
  const initial={allocations:Object.fromEntries(categories.map(item=>[item.id,safeNumber(item.budget_amount)]))};
  const submit=async()=>{const result=await form.validateFields();await onSubmit({allocations:categories.map(item=>({category_id:item.id,amount:safeNumber(result.allocations?.[item.id])}))});};
  return <Modal width={720} title={`Bagi Saldo Daily · ${period}`} open={open} onCancel={onCancel} onOk={submit} confirmLoading={saving} okText="Simpan Pembagian" cancelText="Batal" okButtonProps={{disabled:over}} destroyOnHidden afterOpenChange={visible=>visible&&form.setFieldsValue(initial)}>
    <Alert type={over?'error':'info'} showIcon title={`Kapasitas alokasi ${rupiah(capacity)}`} description={`Terbagi ${rupiah(total)} · Belum dibagi ${rupiah(Math.max(capacity-total,0))}`} style={{marginBottom:16}}/>
    <Form form={form} layout="vertical" className="daily-allocation-form">
      {categories.map(item=><Form.Item key={item.id} name={['allocations',item.id]} label={item.name} rules={[{type:'number',min:0,message:'Nominal tidak boleh negatif.'}]}><InputNumber {...moneyInputProps} min={0} placeholder="Rp 0"/></Form.Item>)}
    </Form>
  </Modal>;
}

export function DailyExpenseForm({ open, saving, categories, initial, presetCategoryId, onCancel, onSubmit }) {
  const [form]=Form.useForm();
  const lockedCategory=!initial&&Number.isSafeInteger(Number(presetCategoryId));
  const lockedCategoryName=categories.find(item=>item.id===Number(presetCategoryId))?.name||'Kategori dipilih';
  const submit=async()=>{const values=await form.validateFields();await onSubmit({...values,transaction_date:values.transaction_date.format('YYYY-MM-DD')});form.resetFields();};
  return <Modal title={initial?'Edit Pengeluaran':'Catat Pemakaian'} open={open} onCancel={onCancel} onOk={submit} confirmLoading={saving} okText={initial?'Simpan Perubahan':'Catat Pemakaian'} cancelText="Batal" destroyOnHidden afterOpenChange={visible=>{if(visible) form.setFieldsValue(initial?{...initial,transaction_date:dayjs(initial.transaction_date)}:{transaction_date:dayjs(),category_id:presetCategoryId});}}>
    <Form form={form} layout="vertical" requiredMark="optional">
      <Form.Item name="transaction_date" label="Tanggal" rules={[{required:true,message:'Tanggal wajib diisi.'}]}><DatePicker format="DD MMMM YYYY" style={{width:'100%'}}/></Form.Item>
      {lockedCategory?<><Form.Item name="category_id" hidden><Input/></Form.Item><Form.Item label="Kategori"><Input value={lockedCategoryName} readOnly aria-label="Kategori pemakaian"/></Form.Item></>:<Form.Item name="category_id" label="Kategori" rules={[{required:true,message:'Kategori wajib dipilih.'}]}><Select options={categories.map(item=>({value:item.id,label:item.name}))} placeholder="Pilih kategori"/></Form.Item>}
      <Form.Item name="amount" label="Nominal" rules={[{required:true,message:'Nominal wajib diisi.'},{type:'number',min:1,message:'Nominal harus lebih dari nol.'}]}><InputNumber {...moneyInputProps}/></Form.Item>
      <Form.Item name="description" label="Deskripsi" rules={[{required:true,whitespace:true,message:'Deskripsi wajib diisi.'},{max:255,message:'Maksimal 255 karakter.'}]}><Input maxLength={255} placeholder="Contoh: Makan siang"/></Form.Item>
      <Form.Item name="notes" label="Catatan"><Input.TextArea maxLength={2000} showCount rows={3}/></Form.Item>
    </Form>
  </Modal>;
}

export function DailyBudgetForm({ category, period, saving, onCancel, onSubmit }) {
  const [form]=Form.useForm();
  return <Modal title={`Alokasi ${category?.name||''}`} open={!!category} onCancel={onCancel} onOk={async()=>{const values=await form.validateFields();await onSubmit(values);}} confirmLoading={saving} okText="Simpan Alokasi" cancelText="Batal" destroyOnHidden afterOpenChange={visible=>visible&&form.setFieldsValue({budget_amount:category?.budget_amount||0})}>
    <p>Alokasi saldo untuk {period}.</p><Form form={form} layout="vertical"><Form.Item name="budget_amount" label="Nominal alokasi" rules={[{required:true},{type:'number',min:0,message:'Alokasi tidak boleh negatif.'}]}><InputNumber {...moneyInputProps} min={0}/></Form.Item></Form>
  </Modal>;
}
