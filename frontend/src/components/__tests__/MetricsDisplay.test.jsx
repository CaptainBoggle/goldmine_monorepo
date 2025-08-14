import React from 'react';
import { render, screen } from '@testing-library/react';
import MetricsDisplay from '../MetricsDisplay';

describe('MetricsDisplay', () => {
  const defaultProps = {
    metrics: {
      accuracy: 0.85,
      precision: 0.92,
      recall: 0.78,
      f1: 0.84,
      jaccard: 0.72
    },
    dataSource: 'fresh'
  };

  const renderMetricsDisplay = (props = {}) => {
    return render(<MetricsDisplay {...defaultProps} {...props} />);
  };

  describe('Basic rendering', () => {
    it('renders nothing when metrics is null', () => {
      const { container } = renderMetricsDisplay({ metrics: null });
      
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when metrics is undefined', () => {
      const { container } = renderMetricsDisplay({ metrics: undefined });
      
      expect(container.firstChild).toBeNull();
    });

    it('renders metrics when provided', () => {
      renderMetricsDisplay();
      
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('85.00%')).toBeInTheDocument(); // accuracy
      expect(screen.getByText('92.00%')).toBeInTheDocument(); // precision
      expect(screen.getByText('78.00%')).toBeInTheDocument(); // recall
      expect(screen.getByText('84.00%')).toBeInTheDocument(); // f1
      expect(screen.getByText('72.00%')).toBeInTheDocument(); // jaccard
    });

    it('renders all metric labels', () => {
      renderMetricsDisplay();
      
      expect(screen.getByText('Accuracy')).toBeInTheDocument();
      expect(screen.getByText('Precision')).toBeInTheDocument();
      expect(screen.getByText('Recall')).toBeInTheDocument();
      expect(screen.getByText('F1 Score')).toBeInTheDocument();
      expect(screen.getByText('Jaccard')).toBeInTheDocument();
    });
  });

  describe('Metric formatting', () => {
    it('formats decimal values as percentages with 2 decimal places', () => {
      const metrics = {
        accuracy: 0.1234,
        precision: 0.5678,
        recall: 0.9012,
        f1: 0.3456,
        jaccard: 0.7890
      };
      
      renderMetricsDisplay({ metrics });
      
      expect(screen.getByText('12.34%')).toBeInTheDocument(); // accuracy
      expect(screen.getByText('56.78%')).toBeInTheDocument(); // precision
      expect(screen.getByText('90.12%')).toBeInTheDocument(); // recall
      expect(screen.getByText('34.56%')).toBeInTheDocument(); // f1
      expect(screen.getByText('78.90%')).toBeInTheDocument(); // jaccard
    });

    it('shows N/A for null metric values', () => {
      const metrics = {
        accuracy: null,
        precision: 0.92,
        recall: null,
        f1: 0.84,
        jaccard: null
      };
      
      renderMetricsDisplay({ metrics });
      
      expect(screen.getAllByText('N/A')).toHaveLength(3);
      expect(screen.getByText('92.00%')).toBeInTheDocument();
      expect(screen.getByText('84.00%')).toBeInTheDocument();
    });

    it('shows N/A for undefined metric values', () => {
      const metrics = {
        accuracy: undefined,
        precision: 0.92,
        recall: undefined,
        f1: 0.84,
        jaccard: undefined
      };
      
      renderMetricsDisplay({ metrics });
      
      expect(screen.getAllByText('N/A')).toHaveLength(3);
      expect(screen.getByText('92.00%')).toBeInTheDocument();
      expect(screen.getByText('84.00%')).toBeInTheDocument();
    });

    it('shows N/A for zero values', () => {
      const metrics = {
        accuracy: 0,
        precision: 0.92,
        recall: 0,
        f1: 0.84,
        jaccard: 0
      };
      
      renderMetricsDisplay({ metrics });
      
      expect(screen.getAllByText('N/A')).toHaveLength(3); // accuracy, recall, jaccard
      expect(screen.getByText('92.00%')).toBeInTheDocument(); // precision
      expect(screen.getByText('84.00%')).toBeInTheDocument(); // f1
    });

    it('handles values greater than 1', () => {
      const metrics = {
        accuracy: 1.5,
        precision: 2.0,
        recall: 1.25,
        f1: 1.75,
        jaccard: 1.1
      };
      
      renderMetricsDisplay({ metrics });
      
      expect(screen.getByText('150.00%')).toBeInTheDocument(); // accuracy
      expect(screen.getByText('200.00%')).toBeInTheDocument(); // precision
      expect(screen.getByText('125.00%')).toBeInTheDocument(); // recall
      expect(screen.getByText('175.00%')).toBeInTheDocument(); // f1
      expect(screen.getByText('110.00%')).toBeInTheDocument(); // jaccard
    });
  });

  describe('Data source indicator', () => {
    it('shows "Fresh Data" badge when dataSource is "fresh"', () => {
      renderMetricsDisplay({ dataSource: 'fresh' });
      
      const badge = screen.getByText('Fresh Data');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('shows "Cached Data" badge when dataSource is "cached"', () => {
      renderMetricsDisplay({ dataSource: 'cached' });
      
      const badge = screen.getByText('Cached Data');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('does not show data source badge when dataSource is null', () => {
      renderMetricsDisplay({ dataSource: null });
      
      expect(screen.queryByText('Fresh Data')).not.toBeInTheDocument();
      expect(screen.queryByText('Cached Data')).not.toBeInTheDocument();
    });

    it('does not show data source badge when dataSource is undefined', () => {
      renderMetricsDisplay({ dataSource: undefined });
      
      expect(screen.queryByText('Fresh Data')).not.toBeInTheDocument();
      expect(screen.queryByText('Cached Data')).not.toBeInTheDocument();
    });

    it('does not show data source badge when dataSource is empty string', () => {
      renderMetricsDisplay({ dataSource: '' });
      
      expect(screen.queryByText('Fresh Data')).not.toBeInTheDocument();
      expect(screen.queryByText('Cached Data')).not.toBeInTheDocument();
    });

    it('shows "Fresh Data" badge for unknown dataSource values', () => {
      renderMetricsDisplay({ dataSource: 'unknown' });
      
      const badge = screen.getByText('Fresh Data');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  describe('Metric colors', () => {
    it('applies correct color classes to metric values', () => {
      renderMetricsDisplay();
      
      const accuracyValue = screen.getByText('85.00%');
      const precisionValue = screen.getByText('92.00%');
      const recallValue = screen.getByText('78.00%');
      const f1Value = screen.getByText('84.00%');
      const jaccardValue = screen.getByText('72.00%');
      
      expect(accuracyValue).toHaveClass('text-blue-600');
      expect(precisionValue).toHaveClass('text-green-600');
      expect(recallValue).toHaveClass('text-purple-600');
      expect(f1Value).toHaveClass('text-orange-600');
      expect(jaccardValue).toHaveClass('text-violet-600');
    });
  });

  describe('Layout and styling', () => {
    it('renders with correct container classes', () => {
      renderMetricsDisplay();
      
      const container = screen.getByText('Performance Metrics').closest('.performance-card');
      expect(container).toHaveClass('performance-card');
    });

    it('renders header with correct classes', () => {
      renderMetricsDisplay();
      
      const header = screen.getByText('Performance Metrics').closest('div');
      expect(header).toHaveClass('flex', 'justify-between', 'items-center', 'mb-4');
    });

    it('renders title with correct classes', () => {
      renderMetricsDisplay();
      
      const title = screen.getByText('Performance Metrics');
      expect(title).toHaveClass('performance-section-title');
    });

    it('renders metrics grid with correct classes', () => {
      renderMetricsDisplay();
      
      const grid = screen.getByText('Accuracy').closest('.performance-metrics-grid');
      expect(grid).toHaveClass('performance-metrics-grid');
    });

    it('renders individual metrics with correct classes', () => {
      renderMetricsDisplay();
      
      const accuracyMetric = screen.getByText('Accuracy').closest('.performance-metric');
      const precisionMetric = screen.getByText('Precision').closest('.performance-metric');
      const recallMetric = screen.getByText('Recall').closest('.performance-metric');
      const f1Metric = screen.getByText('F1 Score').closest('.performance-metric');
      const jaccardMetric = screen.getByText('Jaccard').closest('.performance-metric');
      
      expect(accuracyMetric).toHaveClass('performance-metric', 'performance-metric-accuracy');
      expect(precisionMetric).toHaveClass('performance-metric', 'performance-metric-precision');
      expect(recallMetric).toHaveClass('performance-metric', 'performance-metric-recall');
      expect(f1Metric).toHaveClass('performance-metric', 'performance-metric-f1');
      expect(jaccardMetric).toHaveClass('performance-metric', 'performance-metric-jaccard');
    });

    it('renders metric values and labels with correct classes', () => {
      renderMetricsDisplay();
      
      const accuracyValue = screen.getByText('85.00%');
      const accuracyLabel = screen.getByText('Accuracy');
      
      expect(accuracyValue).toHaveClass('performance-metric-value');
      expect(accuracyLabel).toHaveClass('performance-metric-label');
    });
  });

  describe('Edge cases', () => {
    it('handles empty metrics object', () => {
      renderMetricsDisplay({ metrics: {} });
      
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      // Should show N/A for all metrics
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });

    it('handles metrics with only some properties', () => {
      const partialMetrics = {
        accuracy: 0.85,
        precision: 0.92
        // missing recall, f1, jaccard
      };
      
      renderMetricsDisplay({ metrics: partialMetrics });
      
      expect(screen.getByText('85.00%')).toBeInTheDocument();
      expect(screen.getByText('92.00%')).toBeInTheDocument();
      expect(screen.getAllByText('N/A')).toHaveLength(3);
    });

    it('handles very small decimal values', () => {
      const smallMetrics = {
        accuracy: 0.0001,
        precision: 0.00001,
        recall: 0.000001,
        f1: 0.0000001,
        jaccard: 0.00000001
      };
      
      renderMetricsDisplay({ metrics: smallMetrics });
      
      expect(screen.getByText('0.01%')).toBeInTheDocument(); // accuracy
      expect(screen.getAllByText('0.00%')).toHaveLength(4); // precision, recall, f1, jaccard
    });

    it('handles very large values', () => {
      const largeMetrics = {
        accuracy: 999.999,
        precision: 1000.001,
        recall: 999999.999,
        f1: 1000000.001,
        jaccard: 999999999.999
      };
      
      renderMetricsDisplay({ metrics: largeMetrics });
      
      expect(screen.getByText('99999.90%')).toBeInTheDocument(); // accuracy
      expect(screen.getByText('100000.10%')).toBeInTheDocument(); // precision
      expect(screen.getByText('99999999.90%')).toBeInTheDocument(); // recall
      expect(screen.getByText('100000000.10%')).toBeInTheDocument(); // f1
      expect(screen.getByText('99999999999.90%')).toBeInTheDocument(); // jaccard
    });

    it('handles string values in metrics', () => {
      const stringMetrics = {
        accuracy: '0.85',
        precision: 'invalid',
        recall: null,
        f1: undefined,
        jaccard: 0.72
      };
      
      renderMetricsDisplay({ metrics: stringMetrics });
      
      expect(screen.getByText('85.00%')).toBeInTheDocument(); // accuracy (converted)
      expect(screen.getAllByText('N/A')).toHaveLength(2); // recall, f1
      expect(screen.getByText('72.00%')).toBeInTheDocument(); // jaccard (valid)
    });
  });
});
