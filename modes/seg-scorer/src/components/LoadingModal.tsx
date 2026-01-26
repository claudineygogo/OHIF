import React from 'react';
import './LoadingModal.css';

interface LoadingModalProps {
  message?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-modal">
      <div className="loading-spinner"></div>
      <div className="loading-text">{message}</div>
    </div>
  );
};

export default LoadingModal;
