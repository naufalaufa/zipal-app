import { Button, Result, Space } from 'antd';
import { useRouteError } from 'react-router-dom';
import { useEffect } from 'react';

export default function RouteError() {
  const error = useRouteError();
  useEffect(() => { console.error('Page rendering failed:', error); }, [error]);
  return <Result status="warning" title="Halaman belum bisa ditampilkan"
    subTitle="Terjadi kendala saat menampilkan halaman. Muat ulang untuk mencoba lagi."
    extra={<Space wrap><Button type="primary" onClick={() => window.location.reload()}>Muat ulang</Button><Button href="/dashboard">Kembali ke dashboard</Button></Space>} />;
}
