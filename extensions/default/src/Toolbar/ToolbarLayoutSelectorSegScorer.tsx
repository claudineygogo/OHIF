import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { CommandsManager } from '@ohif/core';

import { LayoutSelector } from '@ohif/ui-next';
import { useTranslation } from 'react-i18next';

function ToolbarLayoutSelectorSegScorer({
  commandsManager,
  servicesManager,
  rows = 3,
  columns = 4,
  ...props
}) {
  const { customizationService } = servicesManager.services;
  const { t } = useTranslation('ToolbarLayoutSelector');

  // Get the presets from the customization service
  const commonPresets =
    customizationService?.getCustomization('layoutSelector.commonPresets') || [];

  // Get the advanced presets generator from the customization service
  const advancedPresetsGenerator = customizationService?.getCustomization(
    'layoutSelector.advancedPresetGenerator'
  );

  // Generate the advanced presets
  const advancedPresets = advancedPresetsGenerator
    ? advancedPresetsGenerator({ servicesManager })
    : [];

  // Unified selection handler that dispatches to the appropriate command
  const handleSelectionChange = useCallback(
    (commandOptions, isPreset) => {
      if (isPreset) {
        // Advanced preset selection
        // Allow commandOptions to specify a custom command name
        const { commandName = 'setHangingProtocol', ...options } = commandOptions;
        commandsManager.run({
          commandName,
          commandOptions: options,
        });
      } else {
        // Common preset or custom grid selection
        commandsManager.run({
          commandName: 'setViewportGridLayout',
          commandOptions,
        });
      }
    },
    [commandsManager]
  );

  return (
    <div
      id="Layout"
      data-cy="Layout"
    >
      <LayoutSelector
        onSelectionChange={handleSelectionChange}
        {...props}
      >
        <LayoutSelector.Trigger tooltip={t('Change layout')} />
        <LayoutSelector.Content>
          {/* Left side - Presets */}
          {(commonPresets.length > 0 || advancedPresets.length > 0) && (
            <div className="bg-popover flex flex-col gap-2 p-2">
              {/* Render Common Presets directly without title */}
              {commonPresets.map((preset, index) => (
                <LayoutSelector.Preset
                  key={`common-preset-${index}`}
                  icon={preset.icon}
                  commandOptions={preset.commandOptions}
                  isPreset={false}
                  className="justify-center"
                />
              ))}

              {/* Render Advanced Presets directly without title and without text labels */}
              {advancedPresets.map((preset, index) => (
                <LayoutSelector.Preset
                  key={`advanced-preset-${index}`}
                  // removed title prop to hide the legend
                  icon={preset.icon}
                  commandOptions={preset.commandOptions}
                  disabled={preset.disabled}
                  isPreset={true}
                  className="justify-center"
                />
              ))}
            </div>
          )}

          {/* Right Side - Grid Layout */}
          <div
            className="bg-muted flex flex-col gap-2.5 border-l-2 border-solid border-black p-2"
            data-cy="layout-custom-grid"
          >
            <div className="text-muted-foreground text-xs">{t('Custom')}</div>
            <LayoutSelector.GridSelector
              rows={rows}
              columns={columns}
            />
            <LayoutSelector.HelpText>
              {t('Hover to select')} <br />
              {t('rows and columns')} <br />
              {t('Click to apply')}
            </LayoutSelector.HelpText>
          </div>
        </LayoutSelector.Content>
      </LayoutSelector>
    </div>
  );
}

ToolbarLayoutSelectorSegScorer.propTypes = {
  commandsManager: PropTypes.instanceOf(CommandsManager),
  servicesManager: PropTypes.object,
  rows: PropTypes.number,
  columns: PropTypes.number,
};

export default ToolbarLayoutSelectorSegScorer;
