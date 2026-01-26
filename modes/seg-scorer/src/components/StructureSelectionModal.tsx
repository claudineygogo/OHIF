import React, { useState } from 'react';
import { Button, ButtonEnums } from '@ohif/ui';

import './StructureSelectionModal.css';

interface StructureSelectionModalProps {
  onSelect: (data: { patientId: string; structureName: string; selectedSegId: string }) => void;
  onClose: () => void;
  segDisplaySets: any[];
  patientId: string;
}

const StructureSelectionModal: React.FC<StructureSelectionModalProps> = ({
  onSelect,
  onClose,
  segDisplaySets = [],
  patientId,
}) => {
  const [selectedSegId, setSelectedSegId] = useState('');

  const handleSubmit = () => {
    // Derive structure name from selected SEG
    const seg = segDisplaySets.find(ds => ds.displaySetInstanceUID === selectedSegId);
    if (patientId && selectedSegId && seg) {
      onSelect({
        patientId,
        structureName: seg.SeriesDescription || '',
        selectedSegId,
      });
    }
  };

  const handleSegSelection = evt => {
    const segId = evt.target.value;
    setSelectedSegId(segId);
  };

  return (
    <div className="structure-selection-modal">
      <h3 className="modal-title">Select Context</h3>

      <div className="modal-content">
        <div className="input-group">
          <label className="text-gray-400 text-sm">Patient ID</label>
          <div className="text-white text-lg font-bold p-2 bg-secondary-dark rounded">
            {patientId || 'Unknown'}
          </div>
        </div>

        <div className="input-group">
          <label className="text-gray-400 text-sm">Reference Structure</label>
          <select
            value={selectedSegId}
            onChange={handleSegSelection}
            className="custom-select mt-1"
          >
            <option value="">-- Select Structure --</option>
            {segDisplaySets.map(ds => (
              <option
                key={ds.displaySetInstanceUID}
                value={ds.displaySetInstanceUID}
              >
                {ds.SeriesDescription || `Series ${ds.SeriesNumber}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="modal-actions">
        <Button
          onClick={handleSubmit}
          type={ButtonEnums.type.primary}
          disabled={!selectedSegId}
          className="modal-btn"
        >
          Start
        </Button>
      </div>
    </div>
  );
};

export default StructureSelectionModal;
