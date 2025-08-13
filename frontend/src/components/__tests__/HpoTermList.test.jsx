import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HpoTermList from '../HpoTermList';

// Mock fetch for HPO API calls
global.fetch = jest.fn();

describe('HpoTermList', () => {
  const mockMatches = [
    { id: 'HP:0004322', match_text: 'short stature' },
    { id: 'HP:0001249', match_text: 'intellectual disability' },
    { id: 'HP:0004322', match_text: 'short stature' } // Duplicate
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  it('renders nothing when no matches provided', () => {
    render(<HpoTermList matches={[]} />);
    
    expect(screen.queryByText('short stature')).not.toBeInTheDocument();
  });

  it('renders unique HPO terms (removes duplicates)', async () => {
    render(<HpoTermList matches={mockMatches} />);
    
    // Initially shows loading state
    expect(screen.getAllByText('Loading...')).toHaveLength(2);
    
    // Wait for API calls to complete and check for unique terms
    await waitFor(() => {
      expect(screen.getByText('HP:0004322')).toBeInTheDocument();
      expect(screen.getByText('HP:0001249')).toBeInTheDocument();
    });
  });

  it('shows loading state for HPO terms', () => {
    render(<HpoTermList matches={mockMatches} />);
    
    // Should show loading state initially
    expect(screen.getAllByText('Loading...')).toHaveLength(2); // One for each unique term
  });

  it('fetches and displays HPO details successfully', async () => {
    // Mock successful API responses
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Short stature', id: 'HP:0004322', definition: 'Height below normal' })
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Intellectual disability', id: 'HP:0001249', definition: 'Reduced mental capacity' })
    });

    render(<HpoTermList matches={mockMatches} />);
    
    // Wait for API calls to complete
    await waitFor(() => {
      expect(screen.getByText('Short stature')).toBeInTheDocument();
      expect(screen.getByText('Intellectual disability')).toBeInTheDocument();
    });
  });

  it('handles HPO API errors gracefully', async () => {
    // Mock failed API response
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Not found' })
    });

    render(<HpoTermList matches={[mockMatches[0]]} />);
    
    // Should still show the HPO ID even if API fails
    await waitFor(() => {
      expect(screen.getByText('HP:0004322')).toBeInTheDocument();
    });
  });

  it('handles network errors for HPO API', async () => {
    // Mock network error
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<HpoTermList matches={[mockMatches[0]]} />);
    
    // Should still show the HPO ID even if network fails
    await waitFor(() => {
      expect(screen.getByText('HP:0004322')).toBeInTheDocument();
    });
  });

  it('expands and collapses HPO term details', async () => {
    // Mock successful API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        name: 'Short stature', 
        id: 'HP:0004322', 
        definition: 'Height below normal',
        synonyms: ['Small stature', 'Reduced height']
      })
    });

    render(<HpoTermList matches={[mockMatches[0]]} />);
    
    // Wait for API call to complete
    await waitFor(() => {
      expect(screen.getByText('Short stature')).toBeInTheDocument();
    });
    
    // Click to expand
    const expandButton = screen.getByRole('button', { name: /short stature/i });
    fireEvent.click(expandButton);
    
    // Should show expanded details
    expect(screen.getByText('Height below normal')).toBeInTheDocument();
    expect(screen.getByText('Synonym:')).toBeInTheDocument();
    expect(screen.getByText('Small stature')).toBeInTheDocument();
    expect(screen.getByText('Reduced height')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(expandButton);
    
    // Should hide expanded details
    expect(screen.queryByText('Height below normal')).not.toBeInTheDocument();
  });

  it('handles HPO terms with missing name in API response', async () => {
    // Mock API response without name
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'HP:0004322' }) // No name field
    });

    render(<HpoTermList matches={[mockMatches[0]]} />);
    
    // Should fall back to showing the HPO ID
    await waitFor(() => {
      expect(screen.getByText('HP:0004322')).toBeInTheDocument();
    });
  });

  it('handles HPO terms with missing definition', async () => {
    // Mock API response without definition
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Short stature', id: 'HP:0004322' }) // No definition
    });

    render(<HpoTermList matches={[mockMatches[0]]} />);
    
    await waitFor(() => {
      expect(screen.getByText('Short stature')).toBeInTheDocument();
    });
    
    // Click to expand
    const expandButton = screen.getByRole('button', { name: /short stature/i });
    fireEvent.click(expandButton);
    
    // Should show empty definition area (no specific message)
    expect(screen.getByText('Short stature')).toBeInTheDocument();
  });

  it('handles HPO terms with missing synonyms', async () => {
    // Mock API response without synonyms
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        name: 'Short stature', 
        id: 'HP:0004322', 
        definition: 'Height below normal'
      }) // No synonyms
    });

    render(<HpoTermList matches={[mockMatches[0]]} />);
    
    await waitFor(() => {
      expect(screen.getByText('Short stature')).toBeInTheDocument();
    });
    
    // Click to expand
    const expandButton = screen.getByRole('button', { name: /short stature/i });
    fireEvent.click(expandButton);
    
    // Should show definition but no synonyms section
    expect(screen.getByText('Height below normal')).toBeInTheDocument();
    expect(screen.queryByText('Synonym:')).not.toBeInTheDocument();
  });

  it('handles multiple HPO terms with different expansion states', async () => {
    // Mock successful API responses
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Short stature', id: 'HP:0004322', definition: 'Height below normal' })
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Intellectual disability', id: 'HP:0001249', definition: 'Reduced mental capacity' })
    });

    render(<HpoTermList matches={mockMatches} />);
    
    await waitFor(() => {
      expect(screen.getByText('Short stature')).toBeInTheDocument();
      expect(screen.getByText('Intellectual disability')).toBeInTheDocument();
    });
    
    // Expand first term
    const firstButton = screen.getByRole('button', { name: /short stature/i });
    fireEvent.click(firstButton);
    
    // Expand second term
    const secondButton = screen.getByRole('button', { name: /intellectual disability/i });
    fireEvent.click(secondButton);
    
    // Both should be expanded
    expect(screen.getByText('Reduced mental capacity')).toBeInTheDocument();
    
    // Collapse first term
    fireEvent.click(firstButton);
    
    // First should be collapsed, second should still be expanded
    expect(screen.getByText('Intellectual disability')).toBeInTheDocument();
  });

  it('handles matches with missing id property', () => {
    const matchesWithoutId = [
      { match_text: 'short stature' } // Missing id
    ];

    render(<HpoTermList matches={matchesWithoutId} />);
    
    // Should not render anything since we need IDs for HPO terms
    expect(screen.queryByText('short stature')).not.toBeInTheDocument();
  });

  it('handles matches with missing match_text property', () => {
    const matchesWithoutText = [
      { id: 'HP:0004322' } // Missing match_text
    ];

    render(<HpoTermList matches={matchesWithoutText} />);
    
    // Should show loading state initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('prevents duplicate API calls for same HPO ID', async () => {
    render(<HpoTermList matches={mockMatches} />);
    
    // Should only make 2 API calls (for unique IDs), not 3
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
    
    // Verify the calls were made for the unique IDs
    expect(fetch).toHaveBeenCalledWith('https://ontology.jax.org/api/hp/terms/HP:0004322');
    expect(fetch).toHaveBeenCalledWith('https://ontology.jax.org/api/hp/terms/HP:0001249');
  });
}); 