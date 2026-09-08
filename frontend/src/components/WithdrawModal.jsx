import { useState } from 'react';
import { Button, Modal } from 'antd';
import InputWithdraw from './InputWithdraw';

const WithdrawModal = ({ name, username, role, isInvestment = false, onSuccess }) => {
  const currentUser = JSON.parse(sessionStorage.getItem('user')) || {};
  const [isModalOpen, setIsModalOpen] = useState(false);
  const showModal = () => setIsModalOpen(true);
  const handleOk = () => setIsModalOpen(false);
  const handleCancel = () => setIsModalOpen(false);
  const isOwner = currentUser.username === username;
  const isAdmin = role === 'admin';

  return (
    <>
      {!isInvestment && (
        <Button 
          disabled={!isOwner} 
          type="primary" 
          danger
          onClick={showModal}
        >
          Go Withdraw - 💴
        </Button>
      )}

      {isInvestment && isAdmin && (
        <Button 
          type="primary" 
          style={{ backgroundColor: 'green', borderColor: 'green' }} 
          onClick={showModal}
        >
          Go Withdraw For Investment - 💴
        </Button>
      )}

      <Modal
        title={isInvestment ? "Investment Withdraw" : name}
        closable={{ 'aria-label': 'Custom Close Button' }}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        destroyOnHidden
        footer={null} 
      >
        <InputWithdraw 

            username={username} 
            isAdmin={isAdmin} 
            onSuccess={onSuccess} 
            closeModal={handleOk}
        />
      </Modal>
    </>
  );
};

export default WithdrawModal;
