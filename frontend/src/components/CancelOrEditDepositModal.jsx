import { useState } from 'react';
import { Button, Modal, message } from 'antd';
import { RollbackOutlined, EditOutlined } from '@ant-design/icons';
import api from '../api';
import InputCancelOrEdit from './InputCancelOrEditDeposit';

const CancelOrEditDepositModal = ({ username, type, onSuccess, disabled }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [lastItem, setLastItem] = useState(null);
    const [fetching, setFetching] = useState(false);

    const showModal = async () => {
        setFetching(true);
        try {
            const res = await api.get(`/transaction/last/${username}?type=${type}`);
            if (res.data.data) {
                setLastItem(res.data.data);
                setIsModalOpen(true);
            } else {
                message.warning(`Tidak ada data ${type} untuk user ini.`);
            }
        } catch (error) {
            message.warning(`Belum ada riwayat ${type}.`);
        } finally {
            setFetching(false);
        }
    };

    const handleCancel = () => setIsModalOpen(false);

    return (
        <>
            <Button 
                danger 
                type="primary" 
                icon={<RollbackOutlined />} 
                onClick={showModal} 
                loading={fetching}
                disabled={disabled}
            >
                    Cancel or Edit Last {type}
            </Button>

            <Modal
                title={<span><EditOutlined /> Manage Last {type === 'deposit' ? 'Deposit' : 'Withdraw'}</span>}
                open={isModalOpen}
                onCancel={handleCancel}
                footer={null}
                centered
                destroyOnClose // Agar form reset saat tutup/buka
            >
                <InputCancelOrEdit 
                    lastItem={lastItem}
                    type={type}
                    username={username}
                    onSuccess={onSuccess}
                    closeModal={handleCancel}
                />
            </Modal>
        </>
    );
};

export default CancelOrEditDepositModal;