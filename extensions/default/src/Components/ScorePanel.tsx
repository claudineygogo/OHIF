import React from 'react';

/**
 * ScorePanel component displays the Dice Score result after contour submission.
 * It shows the score prominently with appropriate formatting and styling.
 */
interface ScorePanelProps {
  diceScore: number | null;
}

const ScorePanel: React.FC<ScorePanelProps> = ({ diceScore }) => {
  if (diceScore === null || diceScore === undefined) {
    return null;
  }

  // Determine color based on score quality
  const getScoreColor = (score: number): string => {
    if (score >= 0.9) {
      return '#22c55e';
    } // Green for excellent
    if (score >= 0.7) {
      return '#eab308';
    } // Yellow for good
    if (score >= 0.5) {
      return '#f97316';
    } // Orange for fair
    return '#ef4444'; // Red for poor
  };

  const scoreColor = getScoreColor(diceScore);
  const scorePercentage = (diceScore * 100).toFixed(2);

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#1a1a1a',
        border: `2px solid ${scoreColor}`,
        borderRadius: '8px',
        margin: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div
        style={{
          fontSize: '14px',
          color: '#9ca3af',
          marginBottom: '8px',
          fontWeight: 500,
        }}
      >
        Grading Result
      </div>
      <div
        style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: scoreColor,
          marginBottom: '4px',
        }}
      >
        {diceScore.toFixed(4)}
      </div>
      <div
        style={{
          fontSize: '16px',
          color: '#d1d5db',
        }}
      >
        Dice Score: {scorePercentage}%
      </div>
      <div
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #374151',
          fontSize: '12px',
          color: '#9ca3af',
        }}
      >
        <div style={{ marginBottom: '4px' }}>
          <span style={{ color: '#1E19E2', fontWeight: 'bold' }}>●</span> Your Contour
        </div>
        <div>
          <span style={{ color: '#22c55e', fontWeight: 'bold' }}>●</span> Reference Contour
        </div>
      </div>
    </div>
  );
};

export default ScorePanel;
