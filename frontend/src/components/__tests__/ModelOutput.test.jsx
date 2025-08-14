import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ModelOutput from '../ModelOutput';

// Mock Material-UI components
jest.mock('@mui/material/Tooltip', () => {
  return function MockTooltip({ children, title }) {
    return (
      <div data-testid="tooltip" title={title}>
        {children}
      </div>
    );
  };
});

jest.mock('@mui/material/CircularProgress', () => {
  return function MockCircularProgress() {
    return <div data-testid="circular-progress">Loading...</div>;
  };
});

// Mock fetch for HPO API calls
global.fetch = jest.fn();

describe('ModelOutput', () => {
  const mockOriginalText = 'The patient has short stature and intellectual disability.';

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  it('renders loading state when loading is true', () => {
    render(<ModelOutput loading={true} result={null} originalText={mockOriginalText} hasRunAnalysis={false} />);
    
    expect(screen.getByText('loading...')).toBeInTheDocument();
  });

  it('renders original text when no result and hasRunAnalysis is true', () => {
    render(<ModelOutput loading={false} result={null} originalText={mockOriginalText} hasRunAnalysis={true} />);
    
    // Should not render anything when no result
    expect(screen.queryByText(mockOriginalText)).not.toBeInTheDocument();
  });

  it('renders nothing when no result and hasRunAnalysis is false', () => {
    render(<ModelOutput loading={false} result={null} originalText={mockOriginalText} hasRunAnalysis={false} />);
    
    expect(screen.queryByText(mockOriginalText)).not.toBeInTheDocument();
  });

  it('handles invalid JSON result gracefully', () => {
    const invalidResult = 'invalid json';
    render(<ModelOutput loading={false} result={invalidResult} originalText={mockOriginalText} hasRunAnalysis={true} />);
    
    // Should not render anything for invalid JSON
    expect(screen.queryByText(mockOriginalText)).not.toBeInTheDocument();
  });

  it('renders annotated text with matches', async () => {
    const mockResult = {
      results: [
        [
          { id: 'HP:0004322', match_text: 'short stature' },
          { id: 'HP:0001249', match_text: 'intellectual disability' }
        ]
      ]
    };

    // Mock successful HPO API responses
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Short stature', id: 'HP:0004322' })
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Intellectual disability', id: 'HP:0001249' })
    });

    render(<ModelOutput loading={false} result={JSON.stringify(mockResult)} originalText={mockOriginalText} hasRunAnalysis={true} />);
    
    // Should show annotated text with highlighted terms
    expect(screen.getByText('short stature')).toBeInTheDocument();
    expect(screen.getByText('intellectual disability')).toBeInTheDocument();
  });

  it('handles empty results array', () => {
    const mockResult = { results: [] };
    render(<ModelOutput loading={false} result={JSON.stringify(mockResult)} originalText={mockOriginalText} hasRunAnalysis={true} />);
    
    // Should show original text when no matches
    expect(screen.getByText(mockOriginalText)).toBeInTheDocument();
  });

  it('handles null results', () => {
    const mockResult = { results: null };
    render(<ModelOutput loading={false} result={JSON.stringify(mockResult)} originalText={mockOriginalText} hasRunAnalysis={true} />);
    
    // Should not render anything when results is null
    expect(screen.queryByText(mockOriginalText)).not.toBeInTheDocument();
  });

  it('handles HPO API errors gracefully', async () => {
    const mockResult = {
      results: [
        [{ id: 'HP:0004322', match_text: 'short stature' }]
      ]
    };

    // Mock failed HPO API response
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Not found' })
    });

    render(<ModelOutput loading={false} result={JSON.stringify(mockResult)} originalText={mockOriginalText} hasRunAnalysis={true} />);
    
    // Should still render the annotated text even if HPO API fails
    await waitFor(() => {
      expect(screen.getByText('short stature')).toBeInTheDocument();
    });
  });

  it('handles network errors for HPO API', async () => {
    const mockResult = {
      results: [
        [{ id: 'HP:0004322', match_text: 'short stature' }]
      ]
    };

    // Mock network error
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ModelOutput loading={false} result={JSON.stringify(mockResult)} originalText={mockOriginalText} hasRunAnalysis={true} />);
    
    // Should still render the annotated text even if network fails
    await waitFor(() => {
      expect(screen.getByText('short stature')).toBeInTheDocument();
    });
  });

  it('removes duplicate matches', () => {
    const mockResult = {
      results: [
        [
          { id: 'HP:0004322', match_text: 'short stature' },
          { id: 'HP:0004322', match_text: 'short stature' } // Duplicate
        ]
      ]
    };

    render(<ModelOutput loading={false} result={JSON.stringify(mockResult)} originalText={mockOriginalText} hasRunAnalysis={true} />);
    
    // Should only show one instance of the match
    const matches = screen.getAllByText('short stature');
    expect(matches).toHaveLength(1);
  });

  it('handles matches with special characters', () => {
    const mockResult = {
      results: [
        [{ id: 'HP:0004322', match_text: 'short-stature' }]
      ]
    };

    const textWithSpecialChars = 'The patient has short-stature.';
    render(<ModelOutput loading={false} result={JSON.stringify(mockResult)} originalText={textWithSpecialChars} hasRunAnalysis={true} />);
    
    expect(screen.getByText('short-stature')).toBeInTheDocument();
  });

  it('handles overlapping matches correctly', () => {
    const mockResult = {
      results: [
        [
          { id: 'HP:0004322', match_text: 'short stature' },
          { id: 'HP:0004323', match_text: 'stature' }
        ]
      ]
    };

    const textWithOverlap = 'The patient has short stature.';
    render(<ModelOutput loading={false} result={JSON.stringify(mockResult)} originalText={textWithOverlap} hasRunAnalysis={true} />);
    
    // Should handle overlapping matches (longer match takes precedence)
    expect(screen.getByText('short stature')).toBeInTheDocument();
  });

  it('handles result as object instead of string', () => {
    const mockResult = {
      results: [
        [{ id: 'HP:0004322', match_text: 'short stature' }]
      ]
    };

    render(<ModelOutput loading={false} result={mockResult} originalText={mockOriginalText} hasRunAnalysis={true} />);
    
    expect(screen.getByText('short stature')).toBeInTheDocument();
  });

  it('handles missing match_text property', () => {
    const mockResult = {
      results: [
        [{ id: 'HP:0004322' }] // Missing match_text
      ]
    };

    render(<ModelOutput loading={false} result={JSON.stringify(mockResult)} originalText={mockOriginalText} hasRunAnalysis={true} />);
    
    // Should show original text when match_text is missing
    expect(screen.getByText(mockOriginalText)).toBeInTheDocument();
  });

  it('handles missing id property', () => {
    const mockResult = {
      results: [
        [{ match_text: 'short stature' }] // Missing id
      ]
    };

    render(<ModelOutput loading={false} result={JSON.stringify(mockResult)} originalText={mockOriginalText} hasRunAnalysis={true} />);
    
    // Should still show the match even without id
    expect(screen.getByText('short stature')).toBeInTheDocument();
  });
}); 