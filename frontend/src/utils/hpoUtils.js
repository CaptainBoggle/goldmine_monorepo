/**
 * Utility functions for HPO (Human Phenotype Ontology) operations
 */

/**
 * Fetch HPO details from the JAX API
 * @param {string} id - HPO ID
 * @returns {Promise<Object>} HPO details or error object
 */
export const fetchHpoDetails = async (id) => {
  try {
    const res = await fetch(`https://ontology.jax.org/api/hp/terms/${id}`);
    if (res.ok) {
      const data = await res.json();
      return { ...data, valid: true };
    } else {
      return { valid: false };
    }
  } catch {
    return { valid: false };
  }
};

/**
 * Get unique HPO IDs from matches array
 * @param {Array} matches - Array of match objects
 * @returns {Array} Array of unique HPO IDs
 */
export const getUniqueHpoIds = (matches) => {
  if (!matches || matches.length === 0) return [];
  return Array.from(new Set(matches.map(m => m.id)));
};

/**
 * Remove duplicate HPO matches based on ID
 * @param {Array} matches - Array of match objects
 * @returns {Array} Array of unique matches
 */
export const getUniqueMatches = (matches) => {
  if (!matches || matches.length === 0) return [];
  return Array.from(
    matches.reduce((map, m) => map.set(m.id, m), new Map()).values()
  );
};

/**
 * Parse result JSON and extract matches
 * @param {string|Object} result - Result from API call
 * @returns {Object} Object containing parsed result and matches
 */
export const parseResultAndMatches = (result) => {
  let parsedResult = null;
  let matches = [];
  
  try {
    parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
    // Flatten all matches from all sentences
    matches = (parsedResult?.results || []).flat();
  } catch (e) {
    console.warn('Failed to parse result:', e);
  }
  
  return { parsedResult, matches };
};

/**
 * Get CSS class for annotated text based on validation state
 * @param {boolean} fetching - Whether currently fetching
 * @param {boolean} isValid - Whether HPO ID is valid
 * @returns {string} CSS class name
 */
export const getAnnotatedTextClass = (fetching, isValid) => {
  if (fetching) return 'annotated-text-loading';
  return isValid ? 'annotated-text-valid' : 'annotated-text-invalid';
};

/**
 * Get color for HPO term based on validation state
 * @param {boolean} fetching - Whether currently fetching
 * @param {boolean} isValid - Whether HPO ID is valid
 * @returns {string} Color hex code
 */
export const getHpoTermColor = (fetching, isValid) => {
  if (fetching) return '#facc15'; // orange while loading
  return isValid ? '#4ade80' : '#f87171'; // green if valid, red if invalid
};
