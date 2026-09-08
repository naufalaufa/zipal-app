import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Button, Checkbox, Typography, Divider, Alert, message, Space, Row, Col, Tag, Spin, Upload } from 'antd';
import { FileProtectOutlined, CheckCircleOutlined, DownloadOutlined, UploadOutlined, ReloadOutlined } from '@ant-design/icons';
import { HeadNavbar } from '../components';
import AgreementSignaturePad from '../components/AgreementSignaturePad';
import api from '../api';

const { Title, Text } = Typography;
const formatDate = value => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value)) + ' WIB' : '';
const partyFor = username => ({ zihraangelina: 'zihra', zihra: 'zihra', naufalaufa: 'naufal', naufal: 'naufal' })[username];

export default function Agreement() {
  const [agreement, setAgreement] = useState(null);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [action, setAction] = useState('');
  const [file, setFile] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const loadVersion = useRef(0);
  const fetchAgreement = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const response = await api.get('/agreement/status');
      if (mounted.current && version === loadVersion.current) { setAgreement(response.data.data); setError(''); }
    } catch (failure) {
      if (mounted.current && version === loadVersion.current) setError(failure.response?.data?.message || 'Gagal memuat perjanjian.');
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    fetchAgreement();
    const timer = setInterval(fetchAgreement, 15000);
    const onFocus = () => fetchAgreement();
    window.addEventListener('focus', onFocus);
    return () => { mounted.current = false; clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [fetchAgreement]);

  const mutate = async (name, request, success) => {
    if (inFlight.current) return;
    inFlight.current = true; setAction(name);
    try {
      await request(); message.success(success);
      if (name === 'upload') { setFile(null); setConfirmed(false); }
    } catch (failure) { message.error(failure.response?.data?.message || 'Permintaan gagal. Silakan coba lagi.'); }
    finally { await fetchAgreement(); inFlight.current = false; if (mounted.current) setAction(''); }
  };
  const download = async variant => {
    if (inFlight.current) return;
    inFlight.current = true; setAction(`download-${variant}`);
    try {
      const response = await api.get(`/agreement/pdf/${variant}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `Zipal-Agreement-${variant}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      message.success('PDF siap diunduh.');
    } catch (failure) {
      let detail = 'Gagal mengunduh PDF.';
      try { detail = JSON.parse(await failure.response.data.text()).message || detail; } catch { /* Network failures have no response body. */ }
      message.error(detail);
    } finally { inFlight.current = false; if (mounted.current) setAction(''); }
  };
  const isAdmin = agreement?.viewer.username === 'zipaladmin' && agreement?.viewer.role === 'admin';
  const myParty = partyFor(agreement?.viewer.username);
  const signatures = agreement?.signatures || [];
  const ready = ['zihra', 'naufal'].every(party => signatures.some(item => item.party === party && Number(item.applied) === 1));
  const draft = agreement?.status === 'DRAFT';
  const mySignature = signatures.find(item => item.party === myParty);
  const apply = image => mutate('sign', () => api.post('/agreement/sign', { signatureImage: image, agreement_id: Number(agreement.id), content_hash: agreement.content_hash, consent: agreed }), 'Tanda tangan berhasil Apply dan dikunci.');
  const uploadFinal = () => {
    const body = new FormData(); body.append('document', file); body.append('confirmed', String(confirmed));
    return mutate('upload', () => api.post('/agreement/final', body), 'Dokumen FINAL tersimpan dan dikunci.');
  };

  return <div>
    <HeadNavbar title="Zipal Agreement" icon={<FileProtectOutlined />} description="Dokumen legalitas tabungan bersama (Joint Account Agreement)" />
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 20px 40px' }}>
      <Alert title="Dokumen Resmi Internal" description="Harap baca setiap pasal dengan teliti. Kesepakatan ini mengikat kedua belah pihak demi kenyamanan finansial bersama." type="info" showIcon style={{ marginBottom: 20, border: '1px solid #91d5ff', backgroundColor: '#e6f7ff' }} />
      {error && <Alert type="error" title={error} showIcon action={<Button onClick={fetchAgreement} icon={<ReloadOutlined />}>Coba lagi</Button>} style={{ marginBottom: 16 }} />}
      {!agreement && !error && <div style={{ textAlign: 'center', padding: 48 }}><Spin tip="Memuat perjanjian..." /></div>}
      {agreement && <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)', borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: 24, borderBottom: '1px solid #f0f0f0', textAlign: 'center', backgroundColor: '#fafafa', borderRadius: '12px 12px 0 0' }}>
          <Title level={3} style={{ margin: 0 }}>{agreement.content.title}</Title>
          <Text type="secondary">Nomor: {agreement.agreement_number}</Text>
          <div style={{ marginTop: 12 }}><Tag color={draft ? 'default' : agreement.status === 'FINAL' ? 'green' : 'gold'}>{draft ? 'Menunggu tanda tangan' : agreement.status === 'FINAL' ? 'FINAL' : 'WAITING_EMETERAI'}</Tag></div>
        </div>
        <div style={{ maxHeight: 500, overflowY: 'auto', padding: 24, backgroundColor: '#fff' }}>
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div><Text>{agreement.content.introduction}</Text>
              <ul style={{ paddingLeft: 20, marginTop: 10 }}>{agreement.content.parties.map(party => <li key={party.key}><b>{party.label}:</b> {party.name}</li>)}</ul>
              <Text>{agreement.content.preamble}</Text>
            </div>
            {agreement.content.clauses.map((clause, index) => <Card key={index} type="inner" title={<span style={{ fontWeight: 'bold', color: '#1890ff', whiteSpace: 'normal' }}>{clause.title}</span>} style={{ backgroundColor: '#fff', border: '1px solid #f0f0f0' }}>
              <Text style={{ whiteSpace: 'pre-line', color: '#595959', lineHeight: 1.6 }}>{clause.content}</Text>
            </Card>)}
          </Space>
        </div>
        <div style={{ padding: 24 }}>
          <Divider style={{ margin: '16px 0 24px' }}>TANDA TANGAN DIGITAL</Divider>
          {draft && myParty && !mySignature && <Checkbox checked={agreed} disabled={!!action || !!error} onChange={event => setAgreed(event.target.checked)} style={{ marginBottom: 24 }}>Saya telah membaca, memahami, dan menyetujui seluruh pasal di atas tanpa paksaan dari pihak manapun.</Checkbox>}
          <Row gutter={[20, 24]}>
            {agreement.content.parties.map(party => {
              const signature = signatures.find(item => item.party === party.key && Number(item.applied) === 1);
              return <Col xs={24} md={12} key={party.key}>
                <Card size="small" title={party.name} style={{ height: '100%' }}>
                  <Text type="secondary">{party.label}</Text>
                  {signature ? <div style={{ marginTop: 12 }}>
                    <img src={signature.signature_image} alt={`Tanda tangan ${party.name}`} style={{ display: 'block', width: '100%', height: 110, objectFit: 'contain', background: '#fff' }} />
                    <Tag color="success" icon={<CheckCircleOutlined />}>Telah menandatangani</Tag>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>{formatDate(signature.signed_at)}</Text></div>
                  </div> : draft && myParty === party.key ? <div style={{ marginTop: 12 }}><AgreementSignaturePad name={party.name} consent={agreed && !error} loading={!!action} onApply={apply} /></div>
                    : <div style={{ minHeight: 150, display: 'grid', placeContent: 'center' }}><Tag>Menunggu tanda tangan</Tag><Text type="secondary" style={{ fontSize: 12 }}>Hanya {party.name} yang dapat Apply.</Text></div>}
                </Card>
              </Col>;
            })}
          </Row>
        </div>
        <div style={{ padding: '20px 24px', borderTop: '1px solid #f0f0f0', backgroundColor: '#fafafa', borderRadius: '0 0 12px 12px' }}>
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {draft ? <>
              <Text type="secondary">{!ready ? 'Menunggu kedua pihak Apply tanda tangan.' : !isAdmin ? 'Hanya ZipalAdmin yang dapat mengesahkan perjanjian.' : 'Kedua tanda tangan lengkap. Perjanjian siap disahkan.'}</Text>
              <Button type="primary" size="large" block disabled={!ready || !isAdmin || !!error || (!!action && action !== 'approve')} loading={action === 'approve'} onClick={() => mutate('approve', () => api.post('/agreement/approve'), 'Perjanjian disahkan. PDF siap untuk e-Meterai.')} icon={<CheckCircleOutlined />} style={{ minHeight: 50, fontSize: 16, fontWeight: 'bold' }}>SAH-KAN PERJANJIAN</Button>
            </> : <>
              <Alert type="success" showIcon title={agreement.status === 'FINAL' ? 'Dokumen FINAL tersimpan dan terkunci' : 'Perjanjian disahkan - menunggu e-Meterai'} description={`Disahkan oleh ZipalAdmin pada ${formatDate(agreement.approved_at)}${agreement.finalized_at ? `. Dokumen final diunggah ${formatDate(agreement.finalized_at)}.` : '.'}`} />
              <Button icon={<DownloadOutlined />} loading={action === 'download-draft'} disabled={!!action && action !== 'download-draft'} onClick={() => download('draft')}>Download Untuk e-Meterai</Button>
              {agreement.status === 'WAITING_EMETERAI' && isAdmin && <>
                <Text>Download PDF, bubuhkan e-Meterai secara manual di <a href="https://ezmeterai.id/document?action=stamp" target="_blank" rel="noopener noreferrer">EZMeterai</a>, lalu unggah hasilnya di sini.</Text>
                <Upload accept=".pdf,application/pdf" maxCount={1} fileList={file ? [file] : []} disabled={!!action} beforeUpload={candidate => {
                  if (!/\.pdf$/i.test(candidate.name) || candidate.type !== 'application/pdf') { message.error('Pilih file PDF.'); return Upload.LIST_IGNORE; }
                  if (candidate.size > 4 * 1024 * 1024) { message.error('Ukuran PDF maksimum 4 MB.'); return Upload.LIST_IGNORE; }
                  setFile(candidate); setConfirmed(false); return false;
                }} onRemove={() => { setFile(null); setConfirmed(false); }}><Button icon={<UploadOutlined />} disabled={!!action}>Pilih Dokumen Bermeterai</Button></Upload>
                <Checkbox checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={!!action}>Saya sudah memeriksa isi perjanjian, kedua tanda tangan, dan e-Meterai pada PDF ini. Dokumen tidak dapat diganti setelah diunggah.</Checkbox>
                <Button type="primary" icon={<UploadOutlined />} loading={action === 'upload'} disabled={!file || !confirmed || !!error || (!!action && action !== 'upload')} onClick={uploadFinal}>Upload Dokumen Bermeterai</Button>
              </>}
              {agreement.status === 'FINAL' && <Button type="primary" icon={<DownloadOutlined />} loading={action === 'download-final'} disabled={!!action && action !== 'download-final'} onClick={() => download('final')}>Lihat / Download Perjanjian Final</Button>}
            </>}
          </Space>
        </div>
      </Card>}
    </div>
  </div>;
}
