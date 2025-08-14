import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModelStatusIndicator from '../ModelStatusIndicator';

describe('ModelStatusIndicator', () => {
  const defaultProps = {
    modelStatus: 'Model ready',
    selectedTool: 'test-tool',
    onReloadModel: jest.fn(),
    isOperationRunning: false
  };

  const renderModelStatusIndicator = (props = {}) => {
    return render(<ModelStatusIndicator {...defaultProps} {...props} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders nothing when modelStatus is null', () => {
      const { container } = renderModelStatusIndicator({ modelStatus: null });
      
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when modelStatus is undefined', () => {
      const { container } = renderModelStatusIndicator({ modelStatus: undefined });
      
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when modelStatus is empty string', () => {
      const { container } = renderModelStatusIndicator({ modelStatus: '' });
      
      expect(container.firstChild).toBeNull();
    });

    it('renders status text when modelStatus is provided', () => {
      renderModelStatusIndicator({ modelStatus: 'Model ready' });
      
      expect(screen.getByText('Model ready')).toBeInTheDocument();
    });
  });

  describe('Status color classes', () => {
    it('applies green color class for ready status', () => {
      renderModelStatusIndicator({ modelStatus: 'Model ready' });
      
      const statusElement = screen.getByText('Model ready');
      expect(statusElement).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('applies green color class for loaded status', () => {
      renderModelStatusIndicator({ modelStatus: 'Model loaded successfully' });
      
      const statusElement = screen.getByText('Model loaded successfully');
      expect(statusElement).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('applies red color class for failed status', () => {
      renderModelStatusIndicator({ modelStatus: 'Model failed to load' });
      
      const statusElement = screen.getByText('Model failed to load');
      expect(statusElement).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('applies blue color class for other statuses', () => {
      renderModelStatusIndicator({ modelStatus: 'Model initializing' });
      
      const statusElement = screen.getByText('Model initializing');
      expect(statusElement).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('applies blue color class for unknown status', () => {
      renderModelStatusIndicator({ modelStatus: 'Unknown status' });
      
      const statusElement = screen.getByText('Unknown status');
      expect(statusElement).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });

  describe('Reload button', () => {
    it('renders reload button when selectedTool is provided', () => {
      renderModelStatusIndicator({ selectedTool: 'test-tool' });
      
      expect(screen.getByText('Reload Model')).toBeInTheDocument();
    });

    it('does not render reload button when selectedTool is null', () => {
      renderModelStatusIndicator({ selectedTool: null });
      
      expect(screen.queryByText('Reload Model')).not.toBeInTheDocument();
    });

    it('does not render reload button when selectedTool is undefined', () => {
      renderModelStatusIndicator({ selectedTool: undefined });
      
      expect(screen.queryByText('Reload Model')).not.toBeInTheDocument();
    });

    it('does not render reload button when selectedTool is empty string', () => {
      renderModelStatusIndicator({ selectedTool: '' });
      
      expect(screen.queryByText('Reload Model')).not.toBeInTheDocument();
    });

    it('calls onReloadModel when reload button is clicked', () => {
      const onReloadModel = jest.fn();
      renderModelStatusIndicator({ onReloadModel });
      
      fireEvent.click(screen.getByText('Reload Model'));
      
      expect(onReloadModel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button states', () => {
    it('shows "Reload Model" text when not loading', () => {
      renderModelStatusIndicator({ modelStatus: 'Model ready' });
      
      expect(screen.getByText('Reload Model')).toBeInTheDocument();
    });

    it('shows "Loading..." text when status contains "Loading"', () => {
      renderModelStatusIndicator({ modelStatus: 'Model Loading...' });
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows "Loading..." text when status contains "Loading" (case sensitive)', () => {
      renderModelStatusIndicator({ modelStatus: 'Model Loading data' });
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Button disabled state', () => {
    it('disables button when status contains "Loading"', () => {
      renderModelStatusIndicator({ modelStatus: 'Model Loading...' });
      
      const reloadButton = screen.getByText('Loading...');
      expect(reloadButton).toBeDisabled();
    });

    it('disables button when isOperationRunning is true', () => {
      renderModelStatusIndicator({ isOperationRunning: true });
      
      const reloadButton = screen.getByText('Reload Model');
      expect(reloadButton).toBeDisabled();
    });

    it('enables button when not loading and operation not running', () => {
      renderModelStatusIndicator({ 
        modelStatus: 'Model ready',
        isOperationRunning: false 
      });
      
      const reloadButton = screen.getByText('Reload Model');
      expect(reloadButton).not.toBeDisabled();
    });

    it('applies disabled styling when button is disabled', () => {
      renderModelStatusIndicator({ isOperationRunning: true });
      
      const reloadButton = screen.getByText('Reload Model');
      expect(reloadButton).toHaveClass('disabled:opacity-50');
    });
  });

  describe('Layout and styling', () => {
    it('renders with correct container classes', () => {
      renderModelStatusIndicator();
      
      const container = screen.getByText('Model ready').closest('div').parentElement;
      expect(container).toHaveClass('mb-4', 'flex', 'items-center', 'justify-between');
    });

    it('renders status with correct classes', () => {
      renderModelStatusIndicator();
      
      const statusElement = screen.getByText('Model ready');
      expect(statusElement).toHaveClass('px-3', 'py-2', 'rounded-md', 'text-sm', 'font-medium');
    });

    it('renders reload button with correct classes', () => {
      renderModelStatusIndicator();
      
      const reloadButton = screen.getByText('Reload Model');
      expect(reloadButton).toHaveClass(
        'px-3', 'py-1', 'text-xs', 'bg-gray-100', 'text-gray-700', 
        'rounded', 'hover:bg-gray-200', 'disabled:opacity-50'
      );
    });
  });

  describe('Edge cases', () => {
    it('handles null onReloadModel function', () => {
      expect(() => {
        renderModelStatusIndicator({ onReloadModel: null });
      }).not.toThrow();
    });

    it('handles undefined onReloadModel function', () => {
      expect(() => {
        renderModelStatusIndicator({ onReloadModel: undefined });
      }).not.toThrow();
    });

    it('handles very long status text', () => {
      const longStatus = 'This is a very long model status message that might exceed normal length limits and should still render correctly without breaking the layout';
      renderModelStatusIndicator({ modelStatus: longStatus });
      
      expect(screen.getByText(longStatus)).toBeInTheDocument();
    });

    it('handles status with special characters', () => {
      const specialStatus = 'Model status with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      renderModelStatusIndicator({ modelStatus: specialStatus });
      
      expect(screen.getByText(specialStatus)).toBeInTheDocument();
    });
  });
});
