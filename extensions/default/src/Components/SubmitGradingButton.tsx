import React from 'react';

/**
 * Placeholder component for the Submit Contour button.
 * It renders a simple button with the provided label.
 * Props are passed through to allow future extensions.
 */
interface SubmitGradingButtonProps {
  id?: string;
  label?: string;
  onClick?: () => void;
}

const SubmitGradingButton: React.FC<SubmitGradingButtonProps> = ({
  id,
  label = 'Submit Contour',
  onClick,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    // Placeholder: no action implemented yet.
    console.log('Submit Contour button clicked');
  };

  return (
    <button
      id={id}
      onClick={handleClick}
      className="submit-grading-button"
    >
      {label}
    </button>
  );
};

export default SubmitGradingButton;
