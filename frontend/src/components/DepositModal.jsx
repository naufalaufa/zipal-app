import { useState } from 'react';
import { Button, Modal } from 'antd';
import InputDeposit from './InputDeposit';

const DepositModal = ({ name, username, onSuccess }) => {
  const users = JSON.parse(localStorage.getItem('user')) || {};
  const [isModalOpen, setIsModalOpen] = useState(false);
  const showModal = () => setIsModalOpen(true);
  const handleOk = () => setIsModalOpen(false);
  const handleCancel = () => setIsModalOpen(false);

  return (
    <>
      <Button 
        disabled={users.username !== username} 
        type="primary" 
        onClick={showModal}
      >
        Go Deposit + 💴
      </Button>

      <Modal
        title={name}
        closable={{ 'aria-label': 'Custom Close Button' }}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={null} 
      >
        <InputDeposit 
            username={username} 
            onSuccess={onSuccess}
            closeModal={handleOk} 
        />
      </Modal>
    </>
  );
};

export default DepositModal;