import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageDisplay from '../MessageDisplay';

describe('MessageDisplay', () => {
  const mockOnClearError = jest.fn();
  const mockOnClearSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when no error or success message', () => {
    render(<MessageDisplay error="" success="" onClearError={mockOnClearError} onClearSuccess={mockOnClearSuccess} />);
    
    expect(screen.queryByText('✕')).not.toBeInTheDocument();
  });

  it('renders error message when error is provided', () => {
    const errorMessage = 'This is an error message';
    render(<MessageDisplay error={errorMessage} success="" onClearError={mockOnClearError} onClearSuccess={mockOnClearSuccess} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('renders success message when success is provided', () => {
    const successMessage = 'This is a success message';
    render(<MessageDisplay error="" success={successMessage} onClearError={mockOnClearError} onClearSuccess={mockOnClearSuccess} />);
    
    expect(screen.getByText(successMessage)).toBeInTheDocument();
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('calls onClearError when error clear button is clicked', () => {
    render(<MessageDisplay error="Test error" success="" onClearError={mockOnClearError} onClearSuccess={mockOnClearSuccess} />);
    
    const clearButton = screen.getByText('✕');
    fireEvent.click(clearButton);
    
    expect(mockOnClearError).toHaveBeenCalledTimes(1);
  });

  it('calls onClearSuccess when success clear button is clicked', () => {
    render(<MessageDisplay error="" success="Test success" onClearError={mockOnClearError} onClearSuccess={mockOnClearSuccess} />);
    
    const clearButton = screen.getByText('✕');
    fireEvent.click(clearButton);
    
    expect(mockOnClearSuccess).toHaveBeenCalledTimes(1);
  });

  it('renders both error and success messages when both are provided', () => {
    render(<MessageDisplay error="Error message" success="Success message" onClearError={mockOnClearError} onClearSuccess={mockOnClearSuccess} />);
    
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getAllByText('✕')).toHaveLength(2);
  });

  it('handles long error messages', () => {
    const longErrorMessage = 'This is a very long error message that might wrap to multiple lines and should still be displayed properly without breaking the layout or causing any rendering issues';
    render(<MessageDisplay error={longErrorMessage} success="" onClearError={mockOnClearError} onClearSuccess={mockOnClearSuccess} />);
    
    expect(screen.getByText(longErrorMessage)).toBeInTheDocument();
  });

  it('handles long success messages', () => {
    const longSuccessMessage = 'This is a very long success message that might wrap to multiple lines and should still be displayed properly without breaking the layout or causing any rendering issues';
    render(<MessageDisplay error="" success={longSuccessMessage} onClearError={mockOnClearError} onClearSuccess={mockOnClearSuccess} />);
    
    expect(screen.getByText(longSuccessMessage)).toBeInTheDocument();
  });

  it('handles special characters in messages', () => {
    const specialCharMessage = 'Error with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
    render(<MessageDisplay error={specialCharMessage} success="" onClearError={mockOnClearError} onClearSuccess={mockOnClearSuccess} />);
    
    expect(screen.getByText(specialCharMessage)).toBeInTheDocument();
  });

  it('handles HTML-like content in messages', () => {
    const htmlLikeMessage = 'Error with <script>alert("test")</script> content';
    render(<MessageDisplay error={htmlLikeMessage} success="" onClearError={mockOnClearError} onClearSuccess={mockOnClearSuccess} />);
    
    expect(screen.getByText(htmlLikeMessage)).toBeInTheDocument();
  });

  it('handles null callback functions', () => {
    render(<MessageDisplay error="Test error" success="" onClearError={null} onClearSuccess={null} />);
    
    const clearButton = screen.getByText('✕');
    expect(() => {
      fireEvent.click(clearButton);
    }).not.toThrow();
  });

  it('handles undefined callback functions', () => {
    render(<MessageDisplay error="Test error" success="" onClearError={undefined} onClearSuccess={undefined} />);
    
    const clearButton = screen.getByText('✕');
    expect(() => {
      fireEvent.click(clearButton);
    }).not.toThrow();
  });

  it('handles empty string messages', () => {
    render(<MessageDisplay error="" success="" onClearError={mockOnClearError} onClearSuccess={mockOnClearSuccess} />);
    
    expect(screen.queryByText('✕')).not.toBeInTheDocument();
  });

  it('handles whitespace-only messages', () => {
    render(<MessageDisplay error="   " success="   " onClearError={mockOnClearError} onClearSuccess={mockOnClearSuccess} />);
    
    // Should still render the clear buttons for whitespace-only messages
    expect(screen.getAllByText('✕')).toHaveLength(2);
  });
}); 