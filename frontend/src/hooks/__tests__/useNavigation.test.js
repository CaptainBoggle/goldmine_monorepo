import { renderHook, act } from '@testing-library/react';
import { useNavigation } from '../useNavigation';

describe('useNavigation', () => {
  it('initializes with default active tab', () => {
    const { result } = renderHook(() => useNavigation());
    
    expect(result.current.activeTab).toBe('Inference');
  });

  it('navigates to a new tab', () => {
    const { result } = renderHook(() => useNavigation());
    
    act(() => {
      result.current.navigateTo('Evaluation');
    });
    
    expect(result.current.activeTab).toBe('Evaluation');
  });

  it('correctly identifies active tab', () => {
    const { result } = renderHook(() => useNavigation());
    
    // Default tab should be active
    expect(result.current.isActive('Inference')).toBe(true);
    expect(result.current.isActive('Evaluation')).toBe(false);
    
    // Navigate to new tab
    act(() => {
      result.current.navigateTo('Evaluation');
    });
    
    // New tab should be active
    expect(result.current.isActive('Evaluation')).toBe(true);
    expect(result.current.isActive('Inference')).toBe(false);
  });

  it('allows setting active tab directly', () => {
    const { result } = renderHook(() => useNavigation());
    
    act(() => {
      result.current.setActiveTab('About');
    });
    
    expect(result.current.activeTab).toBe('About');
    expect(result.current.isActive('About')).toBe(true);
  });

  it('handles multiple navigation calls', () => {
    const { result } = renderHook(() => useNavigation());
    
    act(() => {
      result.current.navigateTo('Evaluation');
    });
    
    act(() => {
      result.current.navigateTo('About');
    });
    
    act(() => {
      result.current.navigateTo('Inference');
    });
    
    expect(result.current.activeTab).toBe('Inference');
    expect(result.current.isActive('Inference')).toBe(true);
  });

  it('maintains state across re-renders', () => {
    const { result, rerender } = renderHook(() => useNavigation());
    
    act(() => {
      result.current.navigateTo('Evaluation');
    });
    
    expect(result.current.activeTab).toBe('Evaluation');
    
    // Re-render the hook
    rerender();
    
    // State should be maintained
    expect(result.current.activeTab).toBe('Evaluation');
    expect(result.current.isActive('Evaluation')).toBe(true);
  });
}); 