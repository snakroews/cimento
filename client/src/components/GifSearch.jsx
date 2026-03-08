import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

// Using Tenor public search API as a fallback since Giphy public beta key frequently rate-limits (403)
const TENOR_API_KEY = 'LIVDSRZULELA'; // Tenor's well-known testing key, or standard v1 default

export default function GifSearch({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus input on mount
    if (inputRef.current) inputRef.current.focus();
    // Load trending by default
    fetchGifs('');
  }, []);

  const fetchGifs = async (searchQuery) => {
    setLoading(true);
    try {
      const endpoint = searchQuery.trim()
        ? `https://g.tenor.com/v1/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=15`
        : `https://g.tenor.com/v1/trending?key=${TENOR_API_KEY}&limit=15`;

      const response = await fetch(endpoint);
      const data = await response.json();
      
      // Tenor returns data.results array
      setGifs(data.results || []);
    } catch (err) {
      console.error('Error fetching GIFs from Tenor:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchGifs(query);
  };

  let debounceTimer;
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchGifs(val), 500);
  };

  return (
    <div className="gif-search-container">
      <div className="gif-search-header">
        <form onSubmit={handleSearch} className="gif-search-form">
          <Search size={16} className="gif-search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search GIFs..."
            value={query}
            onChange={handleInputChange}
            className="gif-search-input"
          />
        </form>
        <button className="gif-close-btn" onClick={onClose} type="button">
          <X size={18} />
        </button>
      </div>

      <div className="gif-grid">
        {loading ? (
          <div className="gif-loading">Loading...</div>
        ) : gifs.length === 0 ? (
          <div className="gif-loading">No GIFs found</div>
        ) : (
          gifs.map(gif => (
            <img
              key={gif.id}
              src={gif.media[0].tinygif.url}
              alt={gif.title || 'GIF'}
              className="gif-thumbnail"
              onClick={() => onSelect(gif.media[0].gif.url)}
            />
          ))
        )}
      </div>
    </div>
  );
}
