import React from 'react';
import { render, screen } from '@testing-library/react';
import ModelActionOutput from '../ModelActionOutput';

describe('ModelActionOutput', () => {
  describe('Loading State', () => {
    it('renders loading message when loading is true', () => {
      render(<ModelActionOutput loading={true} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toHaveClass('model-action-output-loading');
    });

    it('renders loading message regardless of result prop when loading is true', () => {
      const mockResult = { state: 'ready' };
      render(<ModelActionOutput loading={true} result={mockResult} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText(/Model is/)).not.toBeInTheDocument();
    });
  });

  describe('No Result State', () => {
    it('renders nothing when result is null and loading is false', () => {
      const { container } = render(<ModelActionOutput loading={false} result={null} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when result is undefined and loading is false', () => {
      const { container } = render(<ModelActionOutput loading={false} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when result is empty string and loading is false', () => {
      const { container } = render(<ModelActionOutput loading={false} result="" />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Status Action Type', () => {
    it('renders status output when result has state property', () => {
      const statusResult = {
        state: 'ready',
        message: 'Model is ready for use'
      };
      
      render(<ModelActionOutput loading={false} result={statusResult} />);
      
      expect(screen.getByText('ready')).toBeInTheDocument();
      expect(screen.getByText('Model is ready for use')).toBeInTheDocument();
      expect(screen.getByText('Model is ready for use')).toHaveClass('status-message');
      
      // Check for status text specifically
      const statusTexts = screen.getAllByText(/Model is/);
      const statusTextElement = statusTexts.find(element => element.classList.contains('status-text'));
      expect(statusTextElement).toBeInTheDocument();
    });

    it('renders status output with different states', () => {
      const statusResult = {
        state: 'loading',
        message: 'Model is currently loading'
      };
      
      render(<ModelActionOutput loading={false} result={statusResult} />);
      
      expect(screen.getByText('loading')).toBeInTheDocument();
      expect(screen.getByText('Model is currently loading')).toBeInTheDocument();
      
      // Check that "Model is" appears in the status text
      const statusTexts = screen.getAllByText(/Model is/);
      expect(statusTexts.length).toBeGreaterThan(0);
    });

    it('renders status output without message', () => {
      const statusResult = {
        state: 'ready'
      };
      
      render(<ModelActionOutput loading={false} result={statusResult} />);
      
      expect(screen.getByText(/Model is/)).toBeInTheDocument();
      expect(screen.getByText('ready')).toBeInTheDocument();
      expect(screen.queryByText(/Model is ready for use/)).not.toBeInTheDocument();
    });

    it('renders status output from JSON string', () => {
      const statusResult = JSON.stringify({
        state: 'ready',
        message: 'Model is ready for use'
      });
      
      render(<ModelActionOutput loading={false} result={statusResult} />);
      
      expect(screen.getByText('ready')).toBeInTheDocument();
      expect(screen.getByText('Model is ready for use')).toBeInTheDocument();
      
      // Check that "Model is" appears in the status text
      const statusTexts = screen.getAllByText(/Model is/);
      expect(statusTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Info Action Type', () => {
    it('renders info output when result has name property', () => {
      const infoResult = {
        name: 'Test Model',
        version: '1.0.0',
        description: 'A test model for evaluation',
        author: 'Test Author'
      };
      
      render(<ModelActionOutput loading={false} result={infoResult} />);
      
      expect(screen.getByText('Test Model')).toBeInTheDocument();
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      expect(screen.getByText('A test model for evaluation')).toBeInTheDocument();
      expect(screen.getByText('by Test Author')).toBeInTheDocument();
    });

    it('renders info output with proper CSS classes', () => {
      const infoResult = {
        name: 'Test Model',
        version: '1.0.0',
        description: 'A test model for evaluation',
        author: 'Test Author'
      };
      
      render(<ModelActionOutput loading={false} result={infoResult} />);
      
      expect(screen.getByText('Test Model')).toHaveClass('info-name');
      expect(screen.getByText('v1.0.0')).toHaveClass('info-version');
      expect(screen.getByText('A test model for evaluation')).toHaveClass('info-description');
      expect(screen.getByText('by Test Author')).toHaveClass('info-author');
    });

    it('renders info output from JSON string', () => {
      const infoResult = JSON.stringify({
        name: 'Test Model',
        version: '1.0.0',
        description: 'A test model for evaluation',
        author: 'Test Author'
      });
      
      render(<ModelActionOutput loading={false} result={infoResult} />);
      
      expect(screen.getByText('Test Model')).toBeInTheDocument();
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      expect(screen.getByText('A test model for evaluation')).toBeInTheDocument();
      expect(screen.getByText('by Test Author')).toBeInTheDocument();
    });
  });

  describe('Load Action Type', () => {
    it('renders load output when result has only loading_time property', () => {
      const loadResult = {
        loading_time: 2.5,
        message: 'Model loaded successfully'
      };
      
      render(<ModelActionOutput loading={false} result={loadResult} />);
      
      expect(screen.getByText(/Model is/)).toBeInTheDocument();
      expect(screen.getByText(/Loading time:/)).toBeInTheDocument();
      expect(screen.getByText('2.5s')).toBeInTheDocument();
      expect(screen.getByText('Model loaded successfully')).toBeInTheDocument();
    });

    it('renders load output without message', () => {
      const loadResult = {
        loading_time: 1.8
      };
      
      render(<ModelActionOutput loading={false} result={loadResult} />);
      
      expect(screen.getByText(/Model is/)).toBeInTheDocument();
      expect(screen.getByText(/Loading time:/)).toBeInTheDocument();
      expect(screen.getByText('1.8s')).toBeInTheDocument();
      expect(screen.queryByText(/Model loaded successfully/)).not.toBeInTheDocument();
    });

    it('renders load output with decimal loading time', () => {
      const loadResult = {
        loading_time: 3.14159
      };
      
      render(<ModelActionOutput loading={false} result={loadResult} />);
      
      expect(screen.getByText(/Loading time:/)).toBeInTheDocument();
      expect(screen.getByText('3.1s')).toBeInTheDocument();
    });

    it('renders load output from JSON string', () => {
      const loadResult = JSON.stringify({
        loading_time: 2.5,
        message: 'Model loaded successfully'
      });
      
      render(<ModelActionOutput loading={false} result={loadResult} />);
      
      expect(screen.getByText(/Model is/)).toBeInTheDocument();
      expect(screen.getByText(/Loading time:/)).toBeInTheDocument();
      expect(screen.getByText('2.5s')).toBeInTheDocument();
      expect(screen.getByText('Model loaded successfully')).toBeInTheDocument();
    });
  });

  describe('Unknown Action Type', () => {
    it('renders unknown output for unrecognized result structure', () => {
      const unknownResult = {
        someProperty: 'someValue',
        anotherProperty: 123
      };
      
      render(<ModelActionOutput loading={false} result={unknownResult} />);
      
      // Use a more flexible text matcher for JSON
      expect(screen.getByText(/someProperty/)).toBeInTheDocument();
      expect(screen.getByText(/someValue/)).toBeInTheDocument();
      expect(screen.getByText(/anotherProperty/)).toBeInTheDocument();
      expect(screen.getByText(/123/)).toBeInTheDocument();
    });

    it('renders unknown output from JSON string', () => {
      const unknownResult = JSON.stringify({
        someProperty: 'someValue',
        anotherProperty: 123
      });
      
      render(<ModelActionOutput loading={false} result={unknownResult} />);
      
      expect(screen.getByText(/someProperty/)).toBeInTheDocument();
      expect(screen.getByText(/someValue/)).toBeInTheDocument();
      expect(screen.getByText(/anotherProperty/)).toBeInTheDocument();
      expect(screen.getByText(/123/)).toBeInTheDocument();
    });

    it('renders unknown output for empty object', () => {
      const unknownResult = {};
      
      render(<ModelActionOutput loading={false} result={unknownResult} />);
      
      expect(screen.getByText('{}')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('renders raw result when JSON parsing fails', () => {
      const invalidJson = 'This is not valid JSON';
      
      render(<ModelActionOutput loading={false} result={invalidJson} />);
      
      expect(screen.getByText('This is not valid JSON')).toBeInTheDocument();
      expect(screen.getByText('This is not valid JSON')).toHaveClass('model-action-output-raw');
    });

    it('renders raw result for malformed JSON', () => {
      const malformedJson = '{"incomplete": json';
      
      render(<ModelActionOutput loading={false} result={malformedJson} />);
      
      expect(screen.getByText('{"incomplete": json')).toBeInTheDocument();
      expect(screen.getByText('{"incomplete": json')).toHaveClass('model-action-output-raw');
    });

    it('handles empty string result gracefully', () => {
      render(<ModelActionOutput loading={false} result="" />);
      
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('CSS Classes and Structure', () => {
    it('renders with correct container class', () => {
      const result = { state: 'ready' };
      
      const { container } = render(<ModelActionOutput loading={false} result={result} />);
      
      expect(container.firstChild).toHaveClass('model-action-output-container');
    });

    it('renders status with correct CSS classes', () => {
      const statusResult = { state: 'ready' };
      
      render(<ModelActionOutput loading={false} result={statusResult} />);
      
      const statusContainer = screen.getByText(/Model is/).closest('.model-action-output-status');
      expect(statusContainer).toBeInTheDocument();
      
      const statusDot = statusContainer.querySelector('.status-dot');
      expect(statusDot).toHaveClass('status-ready');
    });

    it('renders info with correct CSS classes', () => {
      const infoResult = {
        name: 'Test Model',
        version: '1.0.0',
        description: 'A test model',
        author: 'Test Author'
      };
      
      render(<ModelActionOutput loading={false} result={infoResult} />);
      
      const infoContainer = screen.getByText('Test Model').closest('.model-action-output-info');
      expect(infoContainer).toBeInTheDocument();
    });

    it('renders load with correct CSS classes', () => {
      const loadResult = {
        loading_time: 2.5
      };
      
      render(<ModelActionOutput loading={false} result={loadResult} />);
      
      const loadContainer = screen.getByText(/Loading time:/).closest('.model-action-output-load');
      expect(loadContainer).toBeInTheDocument();
    });

    it('renders unknown with correct CSS classes', () => {
      const unknownResult = { test: 'value' };
      
      render(<ModelActionOutput loading={false} result={unknownResult} />);
      
      const unknownContainer = screen.getByText(/test/).closest('.model-action-output-unknown');
      expect(unknownContainer).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles result with only state property', () => {
      const result = { state: 'ready' };
      
      render(<ModelActionOutput loading={false} result={result} />);
      
      expect(screen.getByText(/Model is/)).toBeInTheDocument();
      expect(screen.getByText('ready')).toBeInTheDocument();
    });

    it('handles result with only name property', () => {
      const result = { name: 'Test Model' };
      
      render(<ModelActionOutput loading={false} result={result} />);
      
      expect(screen.getByText('Test Model')).toBeInTheDocument();
      expect(screen.getByText('v')).toBeInTheDocument();
      expect(screen.getByText('by')).toBeInTheDocument();
    });

    it('handles result with only loading_time property', () => {
      const result = { loading_time: 2.5 };
      
      render(<ModelActionOutput loading={false} result={result} />);
      
      expect(screen.getByText(/Loading time:/)).toBeInTheDocument();
      expect(screen.getByText('2.5s')).toBeInTheDocument();
    });

    it('handles empty object result', () => {
      const result = {};
      
      render(<ModelActionOutput loading={false} result={result} />);
      
      expect(screen.getByText('{}')).toBeInTheDocument();
    });

    it('handles null result when loading is false', () => {
      const { container } = render(<ModelActionOutput loading={false} result={null} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('prioritizes loading state over result', () => {
      const result = { state: 'ready' };
      
      render(<ModelActionOutput loading={true} result={result} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText(/Model is/)).not.toBeInTheDocument();
    });

    it('handles result with message but no specific type', () => {
      const result = { message: 'Some message' };
      
      render(<ModelActionOutput loading={false} result={result} />);
      
      expect(screen.getByText(/Some message/)).toBeInTheDocument();
    });
  });
}); 