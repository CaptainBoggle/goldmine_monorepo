import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SelectionForm from '../SelectionForm';

describe('SelectionForm', () => {
  const defaultProps = {
    tools: [
      { id: 'tool1', name: 'Tool 1' },
      { id: 'tool2', name: 'Tool 2' },
      { id: 'tool3', name: 'Tool 3' }
    ],
    corpora: [
      { name: 'corpus1', corpus_version: 'v1.0' },
      { name: 'corpus1', corpus_version: 'v1.1' },
      { name: 'corpus2', corpus_version: 'v2.0' }
    ],
    selectedTool: '',
    selectedCorpus: '',
    selectedCorpusVersion: '',
    onToolChange: jest.fn(),
    onCorpusChange: jest.fn(),
    onCorpusVersionChange: jest.fn(),
    isOperationRunning: false
  };

  const renderSelectionForm = (props = {}) => {
    return render(<SelectionForm {...defaultProps} {...props} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders all form labels', () => {
      renderSelectionForm();
      
      expect(screen.getByText('Select Tool')).toBeInTheDocument();
      expect(screen.getByText('Select Corpus')).toBeInTheDocument();
      expect(screen.getByText('Corpus Version')).toBeInTheDocument();
    });

    it('renders all select elements', () => {
      renderSelectionForm();
      
      expect(screen.getByDisplayValue('Choose a tool...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Choose a corpus...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Choose version...')).toBeInTheDocument();
    });

    it('renders with correct container classes', () => {
      renderSelectionForm();
      
      const container = screen.getByText('Select Tool').closest('.performance-form-grid');
      expect(container).toHaveClass('performance-form-grid');
    });
  });

  describe('Tool selection', () => {
    it('renders all tools as options', () => {
      renderSelectionForm();
      
      expect(screen.getByText('tool1')).toBeInTheDocument();
      expect(screen.getByText('tool2')).toBeInTheDocument();
      expect(screen.getByText('tool3')).toBeInTheDocument();
    });

    it('calls onToolChange when tool is selected', () => {
      const onToolChange = jest.fn();
      renderSelectionForm({ onToolChange });
      
      const toolSelect = screen.getByDisplayValue('Choose a tool...');
      fireEvent.change(toolSelect, { target: { value: 'tool2' } });
      
      expect(onToolChange).toHaveBeenCalledWith('tool2');
    });

    it('shows selected tool value', () => {
      renderSelectionForm({ selectedTool: 'tool2' });
      
      expect(screen.getByDisplayValue('tool2')).toBeInTheDocument();
    });

    it('handles empty tools array', () => {
      renderSelectionForm({ tools: [] });
      
      const toolSelect = screen.getByDisplayValue('Choose a tool...');
      expect(toolSelect).toBeInTheDocument();
      
      // Should only have the default option
      const options = toolSelect.querySelectorAll('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveValue('');
    });
  });

  describe('Corpus selection', () => {
    it('renders all corpora as options', () => {
      renderSelectionForm();
      
      expect(screen.getAllByText('corpus1')).toHaveLength(2);
      expect(screen.getByText('corpus2')).toBeInTheDocument();
    });

    it('calls onCorpusChange when corpus is selected', () => {
      const onCorpusChange = jest.fn();
      renderSelectionForm({ onCorpusChange });
      
      const corpusSelect = screen.getByDisplayValue('Choose a corpus...');
      fireEvent.change(corpusSelect, { target: { value: 'corpus2' } });
      
      expect(onCorpusChange).toHaveBeenCalledWith('corpus2');
    });

    it('shows selected corpus value', () => {
      renderSelectionForm({ selectedCorpus: 'corpus2' });
      
      expect(screen.getByDisplayValue('corpus2')).toBeInTheDocument();
    });

    it('handles empty corpora array', () => {
      renderSelectionForm({ corpora: [] });
      
      const corpusSelect = screen.getByDisplayValue('Choose a corpus...');
      expect(corpusSelect).toBeInTheDocument();
      
      // Should only have the default option
      const options = corpusSelect.querySelectorAll('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveValue('');
    });
  });

  describe('Corpus version selection', () => {
    it('filters versions based on selected corpus', () => {
      renderSelectionForm({ selectedCorpus: 'corpus1' });
      
      const versionSelect = screen.getByDisplayValue('Choose version...');
      const options = versionSelect.querySelectorAll('option');
      
      // Should have default option + 2 versions for corpus1
      expect(options).toHaveLength(3);
      expect(screen.getByText('v1.0')).toBeInTheDocument();
      expect(screen.getByText('v1.1')).toBeInTheDocument();
      expect(screen.queryByText('v2.0')).not.toBeInTheDocument();
    });

    it('shows no versions when no corpus is selected', () => {
      renderSelectionForm({ selectedCorpus: '' });
      
      const versionSelect = screen.getByDisplayValue('Choose version...');
      const options = versionSelect.querySelectorAll('option');
      
      // Should only have the default option
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveValue('');
    });

    it('calls onCorpusVersionChange when version is selected', () => {
      const onCorpusVersionChange = jest.fn();
      renderSelectionForm({ 
        selectedCorpus: 'corpus1',
        onCorpusVersionChange 
      });
      
      const versionSelect = screen.getByDisplayValue('Choose version...');
      fireEvent.change(versionSelect, { target: { value: 'v1.1' } });
      
      expect(onCorpusVersionChange).toHaveBeenCalledWith('v1.1');
    });

    it('shows selected version value', () => {
      renderSelectionForm({ 
        selectedCorpus: 'corpus1',
        selectedCorpusVersion: 'v1.1' 
      });
      
      expect(screen.getByDisplayValue('v1.1')).toBeInTheDocument();
    });

    it('handles corpus with single version', () => {
      const singleVersionCorpora = [
        { name: 'corpus3', corpus_version: 'v3.0' }
      ];
      
      renderSelectionForm({ 
        corpora: singleVersionCorpora,
        selectedCorpus: 'corpus3'
      });
      
      expect(screen.getByText('v3.0')).toBeInTheDocument();
    });
  });

  describe('Disabled state', () => {
    it('disables all selects when isOperationRunning is true', () => {
      renderSelectionForm({ isOperationRunning: true });
      
      const toolSelect = screen.getByDisplayValue('Choose a tool...');
      const corpusSelect = screen.getByDisplayValue('Choose a corpus...');
      const versionSelect = screen.getByDisplayValue('Choose version...');
      
      expect(toolSelect).toBeDisabled();
      expect(corpusSelect).toBeDisabled();
      expect(versionSelect).toBeDisabled();
    });

    it('enables all selects when isOperationRunning is false', () => {
      renderSelectionForm({ isOperationRunning: false });
      
      const toolSelect = screen.getByDisplayValue('Choose a tool...');
      const corpusSelect = screen.getByDisplayValue('Choose a corpus...');
      const versionSelect = screen.getByDisplayValue('Choose version...');
      
      expect(toolSelect).not.toBeDisabled();
      expect(corpusSelect).not.toBeDisabled();
      expect(versionSelect).not.toBeDisabled();
    });
  });

  describe('Form styling', () => {
    it('renders form groups with correct classes', () => {
      renderSelectionForm();
      
      const formGroups = screen.getAllByText(/Select/);
      formGroups.forEach(group => {
        const container = group.closest('div');
        expect(container).toHaveClass('performance-form-group');
      });
    });

    it('renders labels with correct classes', () => {
      renderSelectionForm();
      
      const labels = screen.getAllByText(/Select/);
      labels.forEach(label => {
        expect(label).toHaveClass('performance-form-label');
      });
    });

    it('renders selects with correct classes', () => {
      renderSelectionForm();
      
      const selects = screen.getAllByDisplayValue(/Choose/);
      selects.forEach(select => {
        expect(select).toHaveClass('performance-form-select');
      });
    });
  });

  describe('Edge cases', () => {
    it('handles null callback functions', () => {
      expect(() => {
        renderSelectionForm({
          onToolChange: null,
          onCorpusChange: null,
          onCorpusVersionChange: null
        });
      }).not.toThrow();
    });

    it('handles undefined callback functions', () => {
      expect(() => {
        renderSelectionForm({
          onToolChange: undefined,
          onCorpusChange: undefined,
          onCorpusVersionChange: undefined
        });
      }).not.toThrow();
    });

    it('handles tools with missing id property', () => {
      const toolsWithMissingId = [
        { name: 'Tool 1' },
        { id: 'tool2', name: 'Tool 2' }
      ];
      
      renderSelectionForm({ tools: toolsWithMissingId });
      
      expect(screen.getByText('tool2')).toBeInTheDocument();
    });

    it('handles corpora with missing properties', () => {
      const corporaWithMissingProps = [
        { name: 'corpus1' },
        { corpus_version: 'v2.0' }
      ];
      
      renderSelectionForm({ corpora: corporaWithMissingProps });
      
      expect(screen.getByText('corpus1')).toBeInTheDocument();
    });

    it('handles very long tool names', () => {
      const toolsWithLongNames = [
        { id: 'tool1', name: 'This is a very long tool name that might exceed normal display limits and should still render correctly' }
      ];
      
      renderSelectionForm({ tools: toolsWithLongNames });
      
      expect(screen.getByText('tool1')).toBeInTheDocument();
    });

    it('handles special characters in names', () => {
      const toolsWithSpecialChars = [
        { id: 'tool1', name: 'Tool with special chars: !@#$%^&*()' }
      ];
      
      renderSelectionForm({ tools: toolsWithSpecialChars });
      
      expect(screen.getByText('tool1')).toBeInTheDocument();
    });
  });
});
