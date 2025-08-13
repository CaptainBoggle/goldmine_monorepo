import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileInput from '../FileInput';

// Mock FileReader
class MockFileReader {
  constructor() {
    this.readAsText = jest.fn((file) => {
      // Simulate the async nature of FileReader
      setTimeout(() => {
        if (this.onload) {
          this.onload({ target: { result: this.result } });
        }
      }, 0);
    });
    this.onload = null;
    this.onerror = null;
    this.result = 'test file content';
  }
}

global.FileReader = MockFileReader;

describe('FileInput', () => {
  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnFileSelect.mockClear();
    // Reset FileReader to default mock
    global.FileReader = MockFileReader;
  });

  it('renders file input with correct label', () => {
    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    expect(screen.getByText('File:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Select a TXT file')).toBeInTheDocument();
  });

  it('shows select button when no file is selected', () => {
    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    const selectButton = screen.getByTitle('Select file');
    expect(selectButton).toBeInTheDocument();
    expect(selectButton).toHaveTextContent('+');
  });

  it('shows clear button when file is selected', async () => {
    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    // Initially shows select button
    expect(screen.getByTitle('Select file')).toBeInTheDocument();
    
    // Simulate file selection
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByPlaceholderText('Select a TXT file').nextElementSibling;
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      // Should show clear button
      expect(screen.getByTitle('Clear file')).toBeInTheDocument();
      expect(screen.getByTitle('Clear file')).toHaveTextContent('×');
    });
  });

  it('handles valid TXT file selection', async () => {
    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByPlaceholderText('Select a TXT file').nextElementSibling;
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith('test file content', 'test.txt');
    });
    
    expect(screen.getByDisplayValue('test.txt')).toBeInTheDocument();
  });

  it('handles file with .txt extension but different MIME type', async () => {
    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'application/octet-stream' });
    const fileInput = screen.getByPlaceholderText('Select a TXT file').nextElementSibling;
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith('test file content', 'test.txt');
    });
  });

  it('rejects non-TXT files', () => {
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByPlaceholderText('Select a TXT file').nextElementSibling;
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(mockAlert).toHaveBeenCalledWith('Please select a TXT file.');
    expect(mockOnFileSelect).not.toHaveBeenCalled();
    
    mockAlert.mockRestore();
  });

  it('rejects files without .txt extension', () => {
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['test content'], 'test.doc', { type: 'application/msword' });
    const fileInput = screen.getByPlaceholderText('Select a TXT file').nextElementSibling;
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(mockAlert).toHaveBeenCalledWith('Please select a TXT file.');
    expect(mockOnFileSelect).not.toHaveBeenCalled();
    
    mockAlert.mockRestore();
  });

  it('handles file selection via button click', () => {
    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    const selectButton = screen.getByTitle('Select file');
    const fileInput = screen.getByPlaceholderText('Select a TXT file').nextElementSibling;
    
    // Mock click event on hidden file input
    const clickSpy = jest.spyOn(fileInput, 'click');
    
    fireEvent.click(selectButton);
    
    expect(clickSpy).toHaveBeenCalled();
  });

  it('clears file when clear button is clicked', async () => {
    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    // Simulate file selection first
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByPlaceholderText('Select a TXT file').nextElementSibling;
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      // Now click clear button
      const clearButton = screen.getByTitle('Clear file');
      fireEvent.click(clearButton);
      
      expect(mockOnFileSelect).toHaveBeenCalledWith('', '');
      expect(screen.getByPlaceholderText('Select a TXT file')).toBeInTheDocument();
      expect(screen.getByTitle('Select file')).toBeInTheDocument();
    });
  });

  it('handles FileReader errors gracefully', async () => {
    // Create a custom mock for this test to simulate error
    const ErrorMockFileReader = class extends MockFileReader {
      constructor() {
        super();
        this.readAsText = jest.fn((file) => {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('File read error'));
            }
          }, 0);
        });
      }
    };
    global.FileReader = ErrorMockFileReader;

    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByPlaceholderText('Select a TXT file').nextElementSibling;
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Should not call onFileSelect on error
    await waitFor(() => {
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });
  });

  it('handles empty file selection', () => {
    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    const fileInput = screen.getByPlaceholderText('Select a TXT file').nextElementSibling;
    
    fireEvent.change(fileInput, { target: { files: [] } });
    
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('handles null onFileSelect prop', () => {
    render(<FileInput onFileSelect={null} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByPlaceholderText('Select a TXT file').nextElementSibling;
    
    // Should not throw error when onFileSelect is null
    expect(() => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }).not.toThrow();
  });

  it('handles file with special characters in name', async () => {
    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['test content'], 'test-file_with.special_chars.txt', { type: 'text/plain' });
    const fileInput = screen.getByPlaceholderText('Select a TXT file').nextElementSibling;
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith('test file content', 'test-file_with.special_chars.txt');
    });
  });

  it('handles large file content', async () => {
    const largeContent = 'a'.repeat(10000); // 10KB content
    // Create a custom mock for this test
    const CustomMockFileReader = class extends MockFileReader {
      constructor() {
        super();
        this.result = largeContent;
      }
    };
    global.FileReader = CustomMockFileReader;
    
    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
    const fileInput = screen.getByPlaceholderText('Select a TXT file').nextElementSibling;
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith(largeContent, 'large.txt');
    });
  });

  it('maintains file input value after clear', async () => {
    render(<FileInput onFileSelect={mockOnFileSelect} />);
    
    // Simulate file selection
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByPlaceholderText('Select a TXT file').nextElementSibling;
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      // Clear file
      const clearButton = screen.getByTitle('Clear file');
      fireEvent.click(clearButton);
      
      // File input should be reset
      expect(fileInput.value).toBe('');
    });
  });
}); 