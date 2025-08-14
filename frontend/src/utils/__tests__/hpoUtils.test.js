import { 
  fetchHpoDetails, 
  getUniqueHpoIds, 
  getUniqueMatches, 
  parseResultAndMatches, 
  getAnnotatedTextClass, 
  getHpoTermColor 
} from '../hpoUtils';

// Mock fetch globally
global.fetch = jest.fn();

describe('hpoUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchHpoDetails', () => {
    it('should return valid data for successful API call', async () => {
      const mockHpoData = {
        id: 'HP:0001234',
        name: 'Test phenotype',
        definition: 'Test definition'
      };
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockHpoData)
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      
      const result = await fetchHpoDetails('HP:0001234');
      
      expect(result).toEqual({
        ...mockHpoData,
        valid: true
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ontology.jax.org/api/hp/terms/HP:0001234'
      );
    });

    it('should return valid false for failed API call', async () => {
      const mockResponse = {
        ok: false,
        status: 404
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      
      const result = await fetchHpoDetails('HP:0001234');
      
      expect(result).toEqual({ valid: false });
    });

    it('should return valid false for network error', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      const result = await fetchHpoDetails('HP:0001234');
      
      expect(result).toEqual({ valid: false });
    });
  });

  describe('getUniqueHpoIds', () => {
    it('should return unique HPO IDs from matches array', () => {
      const matches = [
        { id: 'HP:0001234', name: 'Phenotype 1' },
        { id: 'HP:0005678', name: 'Phenotype 2' },
        { id: 'HP:0001234', name: 'Phenotype 1 duplicate' }
      ];
      
      const result = getUniqueHpoIds(matches);
      
      expect(result).toEqual(['HP:0001234', 'HP:0005678']);
    });

    it('should return empty array for empty matches', () => {
      const result = getUniqueHpoIds([]);
      
      expect(result).toEqual([]);
    });

    it('should return empty array for null matches', () => {
      const result = getUniqueHpoIds(null);
      
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined matches', () => {
      const result = getUniqueHpoIds(undefined);
      
      expect(result).toEqual([]);
    });

    it('should handle matches without id property', () => {
      const matches = [
        { name: 'Phenotype 1' },
        { id: 'HP:0001234', name: 'Phenotype 2' }
      ];
      
      const result = getUniqueHpoIds(matches);
      
      expect(result).toEqual([undefined, 'HP:0001234']);
    });
  });

  describe('getUniqueMatches', () => {
    it('should return unique matches based on ID', () => {
      const matches = [
        { id: 'HP:0001234', name: 'Phenotype 1', score: 0.9 },
        { id: 'HP:0005678', name: 'Phenotype 2', score: 0.8 },
        { id: 'HP:0001234', name: 'Phenotype 1 updated', score: 0.95 }
      ];
      
      const result = getUniqueMatches(matches);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'HP:0001234' }),
          expect.objectContaining({ id: 'HP:0005678' })
        ])
      );
    });

    it('should return empty array for empty matches', () => {
      const result = getUniqueMatches([]);
      
      expect(result).toEqual([]);
    });

    it('should return empty array for null matches', () => {
      const result = getUniqueMatches(null);
      
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined matches', () => {
      const result = getUniqueMatches(undefined);
      
      expect(result).toEqual([]);
    });

    it('should keep the last match when duplicates exist', () => {
      const matches = [
        { id: 'HP:0001234', name: 'Phenotype 1', score: 0.8 },
        { id: 'HP:0001234', name: 'Phenotype 1 updated', score: 0.9 }
      ];
      
      const result = getUniqueMatches(matches);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 'HP:0001234', name: 'Phenotype 1 updated', score: 0.9 });
    });
  });

  describe('parseResultAndMatches', () => {
    it('should parse JSON string and extract matches', () => {
      const jsonString = JSON.stringify({
        results: [
          [{ id: 'HP:0001234', name: 'Phenotype 1' }],
          [{ id: 'HP:0005678', name: 'Phenotype 2' }]
        ]
      });
      
      const result = parseResultAndMatches(jsonString);
      
      expect(result.parsedResult).toEqual({
        results: [
          [{ id: 'HP:0001234', name: 'Phenotype 1' }],
          [{ id: 'HP:0005678', name: 'Phenotype 2' }]
        ]
      });
      expect(result.matches).toEqual([
        { id: 'HP:0001234', name: 'Phenotype 1' },
        { id: 'HP:0005678', name: 'Phenotype 2' }
      ]);
    });

    it('should handle object input', () => {
      const objectInput = {
        results: [
          [{ id: 'HP:0001234', name: 'Phenotype 1' }]
        ]
      };
      
      const result = parseResultAndMatches(objectInput);
      
      expect(result.parsedResult).toEqual(objectInput);
      expect(result.matches).toEqual([
        { id: 'HP:0001234', name: 'Phenotype 1' }
      ]);
    });

    it('should handle empty results array', () => {
      const objectInput = {
        results: []
      };
      
      const result = parseResultAndMatches(objectInput);
      
      expect(result.parsedResult).toEqual(objectInput);
      expect(result.matches).toEqual([]);
    });

    it('should handle missing results property', () => {
      const objectInput = {
        otherProperty: 'value'
      };
      
      const result = parseResultAndMatches(objectInput);
      
      expect(result.parsedResult).toEqual(objectInput);
      expect(result.matches).toEqual([]);
    });

    it('should handle JSON parse error', () => {
      const invalidJson = 'invalid json string';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = parseResultAndMatches(invalidJson);
      
      expect(result.parsedResult).toBeNull();
      expect(result.matches).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse result:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle null input', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = parseResultAndMatches(null);
      
      expect(result.parsedResult).toBeNull();
      expect(result.matches).toEqual([]);
      
      consoleSpy.mockRestore();
    });
  });

  describe('getAnnotatedTextClass', () => {
    it('should return loading class when fetching', () => {
      const result = getAnnotatedTextClass(true, false);
      
      expect(result).toBe('annotated-text-loading');
    });

    it('should return valid class when not fetching and valid', () => {
      const result = getAnnotatedTextClass(false, true);
      
      expect(result).toBe('annotated-text-valid');
    });

    it('should return invalid class when not fetching and invalid', () => {
      const result = getAnnotatedTextClass(false, false);
      
      expect(result).toBe('annotated-text-invalid');
    });

    it('should prioritize loading over validation state', () => {
      const result = getAnnotatedTextClass(true, true);
      
      expect(result).toBe('annotated-text-loading');
    });
  });

  describe('getHpoTermColor', () => {
    it('should return orange when fetching', () => {
      const result = getHpoTermColor(true, false);
      
      expect(result).toBe('#facc15');
    });

    it('should return green when not fetching and valid', () => {
      const result = getHpoTermColor(false, true);
      
      expect(result).toBe('#4ade80');
    });

    it('should return red when not fetching and invalid', () => {
      const result = getHpoTermColor(false, false);
      
      expect(result).toBe('#f87171');
    });

    it('should prioritize loading over validation state', () => {
      const result = getHpoTermColor(true, true);
      
      expect(result).toBe('#facc15');
    });
  });
});
