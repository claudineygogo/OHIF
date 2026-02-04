import React, { useState } from 'react';

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

  const handleSegSelection = evt => {
    const segId = evt.target.value;
    setSelectedSegId(segId);

    // Auto-submit immediately upon selection
    if (segId) {
      const seg = segDisplaySets.find(ds => ds.displaySetInstanceUID === segId);
      if (seg) {
        onSelect({
          patientId,
          structureName: seg.SeriesDescription || '',
          selectedSegId: segId,
        });
      }
    }
  };

  return (
    <div className="structure-selection-modal">
      <div className="modal-content">
        <div className="input-group">
          <label className="text-gray-400 text-sm">Select Reference Structure</label>
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
    </div>
  );
};

export default StructureSelectionModal;
