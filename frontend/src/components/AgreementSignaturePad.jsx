import { useRef, useState } from 'react';
import { Button, Space, Typography } from 'antd';
import { ClearOutlined, CheckOutlined } from '@ant-design/icons';

export default function AgreementSignaturePad({ name, consent, loading, onApply }) {
    const canvas = useRef(null);
    const pointer = useRef(null);
    const [hasInk, setHasInk] = useState(false);
    const position = event => {
        const rect = canvas.current.getBoundingClientRect();
        return { x: (event.clientX - rect.left) * 800 / rect.width, y: (event.clientY - rect.top) * 240 / rect.height };
    };
    const start = event => {
        if (loading || pointer.current !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        const { x, y } = position(event), context = canvas.current.getContext('2d');
        context.lineWidth = 4; context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#172b4d'; context.fillStyle = '#172b4d';
        context.beginPath(); context.arc(x, y, 2, 0, Math.PI * 2); context.fill();
        context.beginPath(); context.moveTo(x, y);
        setHasInk(true);
    };
    const move = event => {
        if (loading || pointer.current !== event.pointerId) return;
        const { x, y } = position(event), context = canvas.current.getContext('2d');
        context.lineTo(x, y); context.stroke();
    };
    const stop = event => { if (pointer.current === event.pointerId) pointer.current = null; };
    return <Space orientation="vertical" style={{ width: '100%' }}>
        <canvas ref={canvas} width={800} height={240} aria-label={`Canvas tanda tangan ${name}`} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
            style={{ display: 'block', width: '100%', aspectRatio: '10 / 3', background: '#fff', border: '1px dashed #91caff', borderRadius: 8, touchAction: 'none', cursor: loading ? 'wait' : 'crosshair', opacity: loading ? 0.6 : 1 }} />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Gambar dengan mouse, pena, atau sentuhan. Tanda tangan dikunci setelah Apply.</Typography.Text>
        <Space wrap>
            <Button icon={<ClearOutlined />} disabled={loading || !hasInk} onClick={() => { canvas.current.getContext('2d').clearRect(0, 0, 800, 240); setHasInk(false); }}>Hapus</Button>
            <Button type="primary" icon={<CheckOutlined />} loading={loading} disabled={!hasInk || !consent} onClick={() => onApply(canvas.current.toDataURL('image/png'))}>Apply</Button>
        </Space>
    </Space>;
}
