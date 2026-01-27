import React, { useState, useEffect } from 'react';
import ScorePanel from './ScorePanel';
import StructureNameDisplay from './StructureNameDisplay';

/**
 * ScorePanelWrapper listens for dice score updates and displays the ScorePanel.
 * This component is designed to be integrated into the OHIF viewer layout.
 */
const ScorePanelWrapper: React.FC = () => {
  const [diceScore, setDiceScore] = useState<number | null>(null);

  useEffect(() => {
    // Listen for dice score update events
    const handleScoreUpdate = (event: CustomEvent) => {
      const { diceScore } = event.detail;
      setDiceScore(diceScore);
    };

    window.addEventListener('ohif:diceScoreUpdated', handleScoreUpdate as EventListener);

    // Check if there's already a score in the global state
    if ((window as any).ohifDiceScore !== undefined) {
      setDiceScore((window as any).ohifDiceScore);
    }

    return () => {
      window.removeEventListener('ohif:diceScoreUpdated', handleScoreUpdate as EventListener);
    };
  }, []);

  const handleSubmitToLMS = () => {
    // Invoke the command via the custom event used by commandsModule or simply re-dispatch
    // Since we don't have direct access to commandsManager here easily without prop drilling,
    // and we want this to work reliably, we can trigger the command if we had it.
    // However, the cleanest way without refactoring the whole extension panel registration
    // is to replicate the postMessage logic here since we have the score.

    if (diceScore !== null) {
      // Use the same logic as the command
      const percentageScore = diceScore * 100;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'SCORE_SUBMITTED',
            score: percentageScore,
            details: {
              dice: diceScore,
              timestamp: new Date().toISOString(),
            },
          },
          '*'
        );
        // Optimistic UI update or alert
        // We can't easily use uiNotificationService here without props.
        // alert("Score submitted to LMS!"); // Removed blocking popup per user request
      } else {
        alert('No LMS parent window detected.');
      }
    }
  };

  return (
    <div>
      <div style={{ margin: '8px 16px' }}>
        <StructureNameDisplay />
      </div>
      <ScorePanel diceScore={diceScore} />
      {diceScore !== null && (
        <div style={{ padding: '0 16px 16px 16px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleSubmitToLMS}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 'bold',
              width: '100%',
            }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = '#0056b3')}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = '#007bff')}
          >
            Submit Score
          </button>
        </div>
      )}
      {diceScore !== null && (
        <div style={{ padding: '0 16px 16px 16px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: 'transparent',
              color: '#d1d5db',
              border: '1px solid #4b5563',
              borderRadius: '4px',
              padding: '8px 20px',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: '500',
              width: '100%',
              marginTop: '0px',
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = '#9ca3af';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = '#4b5563';
              e.currentTarget.style.color = '#d1d5db';
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default ScorePanelWrapper;
