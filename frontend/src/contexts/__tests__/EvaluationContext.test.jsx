import React from 'react';
import { render, screen } from '@testing-library/react';
import { EvaluationProvider, useEvaluationContext } from '../EvaluationContext';

// Test component that uses the evaluation context
function TestComponent() {
  const evaluationData = useEvaluationContext();
  
  return (
    <div>
      <div data-testid="evaluation-data">
        {JSON.stringify(evaluationData)}
      </div>
      <div data-testid="tools-count">
        Tools: {evaluationData.tools?.length || 0}
      </div>
      <div data-testid="corpora-count">
        Corpora: {evaluationData.corpora?.length || 0}
      </div>
    </div>
  );
}

// Test component that uses the hook outside provider (for error testing)
function TestComponentOutsideProvider() {
  return <div>Should not render</div>;
}

describe('EvaluationContext', () => {
  const mockEvaluationData = {
    tools: [
      { id: 'tool1', name: 'Tool 1' },
      { id: 'tool2', name: 'Tool 2' }
    ],
    corpora: [
      { id: 'corpus1', name: 'Corpus 1' },
      { id: 'corpus2', name: 'Corpus 2' },
      { id: 'corpus3', name: 'Corpus 3' }
    ],
    metricsData: {
      tool1: { accuracy: 0.95, precision: 0.92 }
    },
    isLoading: false,
    error: null
  };

  describe('EvaluationProvider', () => {
    it('renders children correctly', () => {
      render(
        <EvaluationProvider evaluationData={mockEvaluationData}>
          <div data-testid="child">Child Component</div>
        </EvaluationProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Component')).toBeInTheDocument();
    });

    it('provides evaluation data to children', () => {
      render(
        <EvaluationProvider evaluationData={mockEvaluationData}>
          <TestComponent />
        </EvaluationProvider>
      );
      
      expect(screen.getByTestId('evaluation-data')).toHaveTextContent(JSON.stringify(mockEvaluationData));
      expect(screen.getByTestId('tools-count')).toHaveTextContent('Tools: 2');
      expect(screen.getByTestId('corpora-count')).toHaveTextContent('Corpora: 3');
    });



    it('handles empty evaluation data', () => {
      const emptyData = {
        tools: [],
        corpora: [],
        metricsData: {},
        isLoading: false,
        error: null
      };

      render(
        <EvaluationProvider evaluationData={emptyData}>
          <TestComponent />
        </EvaluationProvider>
      );
      
      expect(screen.getByTestId('evaluation-data')).toHaveTextContent(JSON.stringify(emptyData));
      expect(screen.getByTestId('tools-count')).toHaveTextContent('Tools: 0');
      expect(screen.getByTestId('corpora-count')).toHaveTextContent('Corpora: 0');
    });
  });

  describe('useEvaluationContext hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponentOutsideProvider />);
      }).toThrow('useEvaluationContext must be used within an EvaluationProvider');
      
      consoleSpy.mockRestore();
    });

    it('returns evaluation data when used within provider', () => {
      render(
        <EvaluationProvider evaluationData={mockEvaluationData}>
          <TestComponent />
        </EvaluationProvider>
      );
      
      expect(screen.getByTestId('evaluation-data')).toBeInTheDocument();
      expect(screen.getByTestId('tools-count')).toBeInTheDocument();
      expect(screen.getByTestId('corpora-count')).toBeInTheDocument();
    });
  });

  describe('Data propagation', () => {
    it('updates when evaluation data changes', () => {
      const { rerender } = render(
        <EvaluationProvider evaluationData={mockEvaluationData}>
          <TestComponent />
        </EvaluationProvider>
      );
      
      expect(screen.getByTestId('tools-count')).toHaveTextContent('Tools: 2');
      
      const updatedData = {
        ...mockEvaluationData,
        tools: [
          { id: 'tool1', name: 'Tool 1' },
          { id: 'tool2', name: 'Tool 2' },
          { id: 'tool3', name: 'Tool 3' }
        ]
      };
      
      rerender(
        <EvaluationProvider evaluationData={updatedData}>
          <TestComponent />
        </EvaluationProvider>
      );
      
      expect(screen.getByTestId('tools-count')).toHaveTextContent('Tools: 3');
    });

    it('handles complex nested data structures', () => {
      const complexData = {
        tools: [
          { id: 'tool1', name: 'Tool 1', config: { model: 'gpt-4', temperature: 0.7 } }
        ],
        corpora: [
          { id: 'corpus1', name: 'Corpus 1', metadata: { size: 1000, language: 'en' } }
        ],
        metricsData: {
          tool1: {
            corpus1: {
              accuracy: 0.95,
              precision: 0.92,
              recall: 0.88,
              f1: 0.90
            }
          }
        },
        isLoading: false,
        error: null
      };

      render(
        <EvaluationProvider evaluationData={complexData}>
          <TestComponent />
        </EvaluationProvider>
      );
      
      expect(screen.getByTestId('evaluation-data')).toHaveTextContent(JSON.stringify(complexData));
      expect(screen.getByTestId('tools-count')).toHaveTextContent('Tools: 1');
      expect(screen.getByTestId('corpora-count')).toHaveTextContent('Corpora: 1');
    });
  });
}); 