import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LoadingProvider, useLoading } from '../LoadingContext';

// Test component that uses the loading context
function TestComponent() {
  const { isGlobalLoading, startLoading, stopLoading } = useLoading();
  
  return (
    <div>
      <div data-testid="loading-status">
        {isGlobalLoading ? 'Loading' : 'Not Loading'}
      </div>
      <button onClick={startLoading} data-testid="start-loading">
        Start Loading
      </button>
      <button onClick={stopLoading} data-testid="stop-loading">
        Stop Loading
      </button>
    </div>
  );
}

// Test component that uses the hook outside provider (for error testing)
function TestComponentOutsideProvider() {
  return <div>Should not render</div>;
}

describe('LoadingContext', () => {
  describe('LoadingProvider', () => {
    it('renders children correctly', () => {
      render(
        <LoadingProvider>
          <div data-testid="child">Child Component</div>
        </LoadingProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Component')).toBeInTheDocument();
    });

    it('provides initial loading state as false', () => {
      render(
        <LoadingProvider>
          <TestComponent />
        </LoadingProvider>
      );
      
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not Loading');
    });
  });

  describe('useLoading hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponentOutsideProvider />);
      }).toThrow('useLoading must be used within a LoadingProvider');
      
      consoleSpy.mockRestore();
    });

    it('provides loading state and functions when used within provider', () => {
      render(
        <LoadingProvider>
          <TestComponent />
        </LoadingProvider>
      );
      
      expect(screen.getByTestId('loading-status')).toBeInTheDocument();
      expect(screen.getByTestId('start-loading')).toBeInTheDocument();
      expect(screen.getByTestId('stop-loading')).toBeInTheDocument();
    });
  });

  describe('Loading state management', () => {
    it('starts loading when startLoading is called', () => {
      render(
        <LoadingProvider>
          <TestComponent />
        </LoadingProvider>
      );
      
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not Loading');
      
      act(() => {
        screen.getByTestId('start-loading').click();
      });
      
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading');
    });

    it('stops loading when stopLoading is called', () => {
      render(
        <LoadingProvider>
          <TestComponent />
        </LoadingProvider>
      );
      
      // Start loading first
      act(() => {
        screen.getByTestId('start-loading').click();
      });
      
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading');
      
      // Stop loading
      act(() => {
        screen.getByTestId('stop-loading').click();
      });
      
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not Loading');
    });

    it('can toggle loading state multiple times', () => {
      render(
        <LoadingProvider>
          <TestComponent />
        </LoadingProvider>
      );
      
      // Initial state
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not Loading');
      
      // Start loading
      act(() => {
        screen.getByTestId('start-loading').click();
      });
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading');
      
      // Stop loading
      act(() => {
        screen.getByTestId('stop-loading').click();
      });
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not Loading');
      
      // Start loading again
      act(() => {
        screen.getByTestId('start-loading').click();
      });
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading');
    });
  });

  describe('Multiple consumers', () => {
    it('shares loading state across multiple components', () => {
      function SecondTestComponent() {
        const { isGlobalLoading } = useLoading();
        return (
          <div data-testid="second-loading-status">
            {isGlobalLoading ? 'Loading' : 'Not Loading'}
          </div>
        );
      }

      render(
        <LoadingProvider>
          <TestComponent />
          <SecondTestComponent />
        </LoadingProvider>
      );
      
      // Both components should show same initial state
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not Loading');
      expect(screen.getByTestId('second-loading-status')).toHaveTextContent('Not Loading');
      
      // Start loading from first component
      act(() => {
        screen.getByTestId('start-loading').click();
      });
      
      // Both components should show loading state
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading');
      expect(screen.getByTestId('second-loading-status')).toHaveTextContent('Loading');
    });
  });
}); 