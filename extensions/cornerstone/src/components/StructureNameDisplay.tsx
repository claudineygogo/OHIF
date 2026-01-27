import React, { useState, useEffect } from 'react';

const StructureNameDisplay = () => {
  const [structureName, setStructureName] = useState<string | null>(null);

  useEffect(() => {
    const checkStorage = () => {
      try {
        const context = sessionStorage.getItem('OHIF_SCORER_CONTEXT');
        if (context) {
          const { structureName } = JSON.parse(context);
          setStructureName(structureName);
        }
      } catch (e) {
        console.error('Error reading scorer context', e);
      }
    };

    checkStorage();

    const handleUpdate = (e: any) => {
      if (e.detail?.structureName) {
        setStructureName(e.detail.structureName);
      } else {
        checkStorage();
      }
    };

    window.addEventListener('ohif:scorerContextUpdated', handleUpdate);
    return () => window.removeEventListener('ohif:scorerContextUpdated', handleUpdate);
  }, []);

  if (!structureName) {
    return null;
  }

  // Dynamic font size logic to prevent line wrapping
  const getFontSize = (name: string) => {
    const len = name.length;
    if (len > 30) {
      return '14px';
    }
    if (len > 20) {
      return '16px';
    }
    if (len > 15) {
      return '19px';
    }
    if (len > 10) {
      return '22px';
    }
    return '25px';
  };

  return (
    <div
      style={{
        backgroundColor: '#090c29',
        marginTop: '4px',
        marginBottom: '4px',
        padding: '8px',
        borderRadius: '4px',
        textAlign: 'center',
        border: '1px solid #3a3f99',
      }}
    >
      <div
        style={{
          color: '#9ca3af',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          fontWeight: 'bold',
        }}
      >
        Structure:
      </div>
      <div
        style={{
          color: '#60a5fa', // Blueish tint
          fontSize: getFontSize(structureName),
          fontWeight: '500',
          marginTop: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={structureName}
      >
        {structureName}
      </div>
    </div>
  );
};

export default StructureNameDisplay;
