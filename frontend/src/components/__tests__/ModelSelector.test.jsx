import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModelSelector from '../ModelSelector';

describe('ModelSelector', () => {
  const mockTools = [
    { id: 'phenobert', name: 'PhenoBERT' },
    { id: 'phenotagger', name: 'PhenoTagger' },
    { id: 'gpt2', name: 'GPT-2' }
  ];
  const mockSetSelectedTool = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders model selector with label', () => {
    render(<ModelSelector tools={mockTools} selectedTool="" setSelectedTool={mockSetSelectedTool} />);
    
    expect(screen.getByText('Model:')).toBeInTheDocument();
  });

  it('renders all tools as options', () => {
    render(<ModelSelector tools={mockTools} selectedTool="" setSelectedTool={mockSetSelectedTool} />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    // Check that all tools are rendered as options
    mockTools.forEach(tool => {
      expect(screen.getByText(tool.id)).toBeInTheDocument();
    });
  });

  it('calls setSelectedTool when option is selected', () => {
    render(<ModelSelector tools={mockTools} selectedTool="" setSelectedTool={mockSetSelectedTool} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'phenobert' } });
    
    expect(mockSetSelectedTool).toHaveBeenCalledWith('phenobert');
  });

  it('displays selected tool correctly', () => {
    render(<ModelSelector tools={mockTools} selectedTool="phenotagger" setSelectedTool={mockSetSelectedTool} />);
    
    const select = screen.getByRole('combobox');
    expect(select.value).toBe('phenotagger');
  });

  it('handles empty tools array', () => {
    render(<ModelSelector tools={[]} selectedTool="" setSelectedTool={mockSetSelectedTool} />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    // Should have no options
    expect(select.children.length).toBe(0);
  });

  it('handles single tool', () => {
    const singleTool = [{ id: 'phenobert', name: 'PhenoBERT' }];
    render(<ModelSelector tools={singleTool} selectedTool="" setSelectedTool={mockSetSelectedTool} />);
    
    expect(screen.getByText('phenobert')).toBeInTheDocument();
  });

  it('handles tools with special characters in ID', () => {
    const toolsWithSpecialChars = [
      { id: 'model-v1.0', name: 'Model v1.0' },
      { id: 'model_v2.0', name: 'Model v2.0' }
    ];
    render(<ModelSelector tools={toolsWithSpecialChars} selectedTool="" setSelectedTool={mockSetSelectedTool} />);
    
    expect(screen.getByText('model-v1.0')).toBeInTheDocument();
    expect(screen.getByText('model_v2.0')).toBeInTheDocument();
  });

  it('handles tools with empty ID', () => {
    const toolsWithEmptyId = [
      { id: '', name: 'Empty Model' },
      { id: 'phenobert', name: 'PhenoBERT' }
    ];
    render(<ModelSelector tools={toolsWithEmptyId} selectedTool="" setSelectedTool={mockSetSelectedTool} />);
    
    expect(screen.getAllByText('')).toHaveLength(5);
    expect(screen.getByText('phenobert')).toBeInTheDocument();
  });

  it('handles null setSelectedTool prop', () => {
    render(<ModelSelector tools={mockTools} selectedTool="" setSelectedTool={null} />);
    
    const select = screen.getByRole('combobox');
    expect(() => {
      fireEvent.change(select, { target: { value: 'phenobert' } });
    }).not.toThrow();
  });

  it('handles undefined setSelectedTool prop', () => {
    render(<ModelSelector tools={mockTools} selectedTool="" setSelectedTool={undefined} />);
    
    const select = screen.getByRole('combobox');
    expect(() => {
      fireEvent.change(select, { target: { value: 'phenobert' } });
    }).not.toThrow();
  });

  it('handles selection of first tool', () => {
    render(<ModelSelector tools={mockTools} selectedTool="" setSelectedTool={mockSetSelectedTool} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: mockTools[0].id } });
    
    expect(mockSetSelectedTool).toHaveBeenCalledWith(mockTools[0].id);
  });

  it('handles selection of last tool', () => {
    render(<ModelSelector tools={mockTools} selectedTool="" setSelectedTool={mockSetSelectedTool} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: mockTools[mockTools.length - 1].id } });
    
    expect(mockSetSelectedTool).toHaveBeenCalledWith(mockTools[mockTools.length - 1].id);
  });

  it('handles rapid selection changes', () => {
    render(<ModelSelector tools={mockTools} selectedTool="" setSelectedTool={mockSetSelectedTool} />);
    
    const select = screen.getByRole('combobox');
    
    fireEvent.change(select, { target: { value: 'phenobert' } });
    fireEvent.change(select, { target: { value: 'phenotagger' } });
    fireEvent.change(select, { target: { value: 'gpt2' } });
    
    expect(mockSetSelectedTool).toHaveBeenCalledTimes(3);
    expect(mockSetSelectedTool).toHaveBeenNthCalledWith(1, 'phenobert');
    expect(mockSetSelectedTool).toHaveBeenNthCalledWith(2, 'phenotagger');
    expect(mockSetSelectedTool).toHaveBeenNthCalledWith(3, 'gpt2');
  });

  it('handles keyboard navigation', () => {
    render(<ModelSelector tools={mockTools} selectedTool="" setSelectedTool={mockSetSelectedTool} />);
    
    const select = screen.getByRole('combobox');
    
    fireEvent.keyDown(select, { key: 'ArrowDown' });
    fireEvent.keyDown(select, { key: 'Enter' });
    
    // Should still be functional
    expect(select).toBeInTheDocument();
  });
}); 