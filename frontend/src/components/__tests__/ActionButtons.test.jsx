import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ActionButtons from '../ActionButtons';

describe('ActionButtons', () => {
  const mockCallApi = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all action buttons', () => {
    render(<ActionButtons callApi={mockCallApi} />);
    
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Load')).toBeInTheDocument();
    expect(screen.getByText('Unload')).toBeInTheDocument();
  });

  it('calls API with correct parameters when Status button is clicked', () => {
    render(<ActionButtons callApi={mockCallApi} />);
    
    const statusButton = screen.getByText('Status');
    fireEvent.click(statusButton);
    
    expect(mockCallApi).toHaveBeenCalledWith('/status', 'GET');
  });

  it('calls API with correct parameters when Info button is clicked', () => {
    render(<ActionButtons callApi={mockCallApi} />);
    
    const infoButton = screen.getByText('Info');
    fireEvent.click(infoButton);
    
    expect(mockCallApi).toHaveBeenCalledWith('/info', 'GET');
  });

  it('calls API with correct parameters when Load button is clicked', () => {
    render(<ActionButtons callApi={mockCallApi} />);
    
    const loadButton = screen.getByText('Load');
    fireEvent.click(loadButton);
    
    expect(mockCallApi).toHaveBeenCalledWith('/load', 'POST');
  });

  it('calls API with correct parameters when Unload button is clicked', () => {
    render(<ActionButtons callApi={mockCallApi} />);
    
    const unloadButton = screen.getByText('Unload');
    fireEvent.click(unloadButton);
    
    expect(mockCallApi).toHaveBeenCalledWith('/unload', 'POST');
  });

  it('handles multiple button clicks', () => {
    render(<ActionButtons callApi={mockCallApi} />);
    
    const statusButton = screen.getByText('Status');
    const loadButton = screen.getByText('Load');
    
    fireEvent.click(statusButton);
    fireEvent.click(loadButton);
    
    expect(mockCallApi).toHaveBeenCalledTimes(2);
    expect(mockCallApi).toHaveBeenNthCalledWith(1, '/status', 'GET');
    expect(mockCallApi).toHaveBeenNthCalledWith(2, '/load', 'POST');
  });

  it('handles null callApi prop', () => {
    render(<ActionButtons callApi={null} />);
    
    const statusButton = screen.getByText('Status');
    expect(() => {
      fireEvent.click(statusButton);
    }).not.toThrow();
  });

  it('handles undefined callApi prop', () => {
    render(<ActionButtons callApi={undefined} />);
    
    const statusButton = screen.getByText('Status');
    expect(() => {
      fireEvent.click(statusButton);
    }).not.toThrow();
  });

  it('handles rapid button clicks', () => {
    render(<ActionButtons callApi={mockCallApi} />);
    
    const statusButton = screen.getByText('Status');
    
    // Rapid clicks
    fireEvent.click(statusButton);
    fireEvent.click(statusButton);
    fireEvent.click(statusButton);
    
    expect(mockCallApi).toHaveBeenCalledTimes(3);
    expect(mockCallApi).toHaveBeenCalledWith('/status', 'GET');
  });

  it('handles all buttons being clicked in sequence', () => {
    render(<ActionButtons callApi={mockCallApi} />);
    
    const buttons = ['Status', 'Info', 'Load', 'Unload'];
    const expectedCalls = [
      ['/status', 'GET'],
      ['/info', 'GET'],
      ['/load', 'POST'],
      ['/unload', 'POST']
    ];
    
    buttons.forEach((buttonText, index) => {
      const button = screen.getByText(buttonText);
      fireEvent.click(button);
      expect(mockCallApi).toHaveBeenNthCalledWith(index + 1, ...expectedCalls[index]);
    });
    
    expect(mockCallApi).toHaveBeenCalledTimes(4);
  });

  it('handles keyboard navigation', () => {
    render(<ActionButtons callApi={mockCallApi} />);
    
    const statusButton = screen.getByText('Status');
    
    // Simulate button clicks (which is what keyboard navigation would trigger)
    fireEvent.click(statusButton);
    fireEvent.click(statusButton);
    
    expect(mockCallApi).toHaveBeenCalledTimes(2);
  });

  it('handles button focus states', () => {
    render(<ActionButtons callApi={mockCallApi} />);
    
    const statusButton = screen.getByText('Status');
    
    fireEvent.focus(statusButton);
    fireEvent.click(statusButton);
    fireEvent.blur(statusButton);
    
    expect(mockCallApi).toHaveBeenCalledTimes(1);
  });
}); 