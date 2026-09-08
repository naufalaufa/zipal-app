import { useEffect, useState } from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import { CloseOutlined, CustomerServiceOutlined, MailOutlined, WhatsAppOutlined } from '@ant-design/icons';
import api from '../api';

const contacts = {
    zihra: { name: 'Zihra Angelina', phone: '628811807586', email: 'zihraangelina07@gmail.com' },
    naufal: { name: 'Naufal Aufa', phone: '6285156802452', email: 'muhammadnaufalaufarifqi@gmail.com' },
};
const linkFor = (contact, channel) => channel === 'whatsapp'
    ? `https://wa.me/${contact.phone}?text=${encodeURIComponent(`Halo ${contact.name}, saya menghubungi kamu melalui Zipal.`)}`
    : `mailto:${contact.email}`;

export default function FooterContacts() {
    const [user, setUser] = useState(null);
    const [open, setOpen] = useState(false);
    useEffect(() => {
        let active = true;
        api.get('/auth/me').then(({ data }) => { if (active) setUser(data.data); }).catch(() => {});
        return () => { active = false; };
    }, []);
    const recipient = ['naufalaufa', 'naufal'].includes(user?.username) ? contacts.zihra
        : ['zihraangelina', 'zihra'].includes(user?.username) ? contacts.naufal : null;
    const isAdmin = user?.username === 'zipaladmin' && user?.role === 'admin';
    const channels = [
        { key: 'email', title: 'Email', icon: <MailOutlined /> },
        { key: 'whatsapp', title: 'WhatsApp', icon: <WhatsAppOutlined /> },
    ];
    if (!recipient && !isAdmin) return <span className="footer-brand">Zihra Naufal (Zipal)</span>;

    return <>
        <span className="footer-brand">Zihra Naufal (Zipal)</span>
        <div className={`contact-fab ${open ? 'contact-fab--open' : ''}`}>
            <div className="contact-fab__items" aria-hidden={!open}>
                {channels.map((channel, index) => {
                    const button = <Button className={`contact-fab__item contact-fab__item--${channel.key}`} shape="circle" size="large" icon={channel.icon}
                        tabIndex={open ? 0 : -1} aria-label={isAdmin ? `Pilih kontak ${channel.title}` : `${channel.title} ${recipient.name}`}
                        href={!isAdmin ? linkFor(recipient, channel.key) : undefined} target={channel.key === 'whatsapp' && !isAdmin ? '_blank' : undefined}
                        rel="noopener noreferrer" style={{ '--contact-index': index }} />;
                    if (!isAdmin) return <Tooltip key={channel.key} placement="left" title={`${channel.title} ${recipient.name}`}>{button}</Tooltip>;
                    return <Dropdown key={channel.key} trigger={['click']} placement="topRight" menu={{ items: Object.entries(contacts).map(([key, contact]) => ({
                        key, label: <a href={linkFor(contact, channel.key)} target={channel.key === 'whatsapp' ? '_blank' : undefined} rel="noopener noreferrer">{channel.title} {contact.name}</a>
                    })) }}>{button}</Dropdown>;
                })}
            </div>
            <Tooltip placement="left" title={open ? 'Tutup kontak' : 'Hubungi kami'}>
                <Button type="primary" shape="circle" size="large" className="contact-fab__toggle"
                    icon={open ? <CloseOutlined /> : <CustomerServiceOutlined />} onClick={() => setOpen(value => !value)}
                    aria-expanded={open} aria-label={open ? 'Tutup menu kontak' : 'Buka menu kontak'} />
            </Tooltip>
        </div>
    </>;
}
