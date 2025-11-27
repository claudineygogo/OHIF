import React, { useState, useEffect } from 'react';
import ScorePanel from './ScorePanel';

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

  return <ScorePanel diceScore={diceScore} />;
};

export default ScorePanelWrapper;
