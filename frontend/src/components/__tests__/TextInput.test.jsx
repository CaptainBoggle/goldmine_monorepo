import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TextInput from '../TextInput';

describe('TextInput', () => {
  const mockSetInput = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders text input with label', () => {
    render(<TextInput input="" setInput={mockSetInput} />);
    
    expect(screen.getByText('Text Input:')).toBeInTheDocument();
  });

  it('renders textarea with correct value', () => {
    const testInput = 'This is test input text';
    render(<TextInput input={testInput} setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe(testInput);
  });

  it('calls setInput when text is changed', () => {
    render(<TextInput input="" setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New text' } });
    
    expect(mockSetInput).toHaveBeenCalledWith('New text');
  });

  it('handles empty input', () => {
    render(<TextInput input="" setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe('');
  });

  it('handles long input text', () => {
    const longText = 'a'.repeat(1000);
    render(<TextInput input={longText} setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe(longText);
  });

  it('handles input with special characters', () => {
    const specialText = 'Text with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
    render(<TextInput input={specialText} setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe(specialText);
  });

  it('handles input with newlines', () => {
    const multilineText = 'Line 1\nLine 2\nLine 3';
    render(<TextInput input={multilineText} setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe(multilineText);
  });

  it('handles input with tabs and spaces', () => {
    const spacedText = 'Text with\t tabs and    spaces';
    render(<TextInput input={spacedText} setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe(spacedText);
  });

  it('handles null setInput prop', () => {
    render(<TextInput input="" setInput={null} />);
    
    const textarea = screen.getByRole('textbox');
    expect(() => {
      fireEvent.change(textarea, { target: { value: 'Test' } });
    }).not.toThrow();
  });

  it('handles undefined setInput prop', () => {
    render(<TextInput input="" setInput={undefined} />);
    
    const textarea = screen.getByRole('textbox');
    expect(() => {
      fireEvent.change(textarea, { target: { value: 'Test' } });
    }).not.toThrow();
  });

  it('handles rapid text changes', () => {
    render(<TextInput input="" setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    
    fireEvent.change(textarea, { target: { value: 'First' } });
    fireEvent.change(textarea, { target: { value: 'Second' } });
    fireEvent.change(textarea, { target: { value: 'Third' } });
    
    expect(mockSetInput).toHaveBeenCalledTimes(3);
    expect(mockSetInput).toHaveBeenNthCalledWith(1, 'First');
    expect(mockSetInput).toHaveBeenNthCalledWith(2, 'Second');
    expect(mockSetInput).toHaveBeenNthCalledWith(3, 'Third');
  });

  it('handles keyboard events', () => {
    render(<TextInput input="" setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    
    fireEvent.keyDown(textarea, { key: 'Enter' });
    fireEvent.keyUp(textarea, { key: 'Enter' });
    fireEvent.keyPress(textarea, { key: 'a' });
    
    // Should still be functional
    expect(textarea).toBeInTheDocument();
  });

  it('handles focus and blur events', () => {
    render(<TextInput input="" setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    
    fireEvent.focus(textarea);
    fireEvent.change(textarea, { target: { value: 'Focused text' } });
    fireEvent.blur(textarea);
    
    expect(mockSetInput).toHaveBeenCalledWith('Focused text');
  });

  it('handles paste events', () => {
    render(<TextInput input="" setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    
    fireEvent.paste(textarea, { clipboardData: { getData: () => 'Pasted text' } });
    
    // Should still be functional
    expect(textarea).toBeInTheDocument();
  });

  it('handles cut events', () => {
    render(<TextInput input="Text to cut" setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    
    fireEvent.cut(textarea);
    
    // Should still be functional
    expect(textarea).toBeInTheDocument();
  });

  it('handles select events', () => {
    render(<TextInput input="Selectable text" setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    
    fireEvent.select(textarea);
    
    // Should still be functional
    expect(textarea).toBeInTheDocument();
  });

  it('handles input with HTML-like content', () => {
    const htmlText = '<script>alert("test")</script><div>Content</div>';
    render(<TextInput input={htmlText} setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe(htmlText);
  });

  it('handles input with unicode characters', () => {
    const unicodeText = 'Text with unicode: 你好世界 🌍 🚀';
    render(<TextInput input={unicodeText} setInput={mockSetInput} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe(unicodeText);
  });
}); 