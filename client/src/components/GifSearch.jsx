import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

// Using GIPHY public beta key for demonstration (rate limited, but fine for small apps)
const GIPHY_API_KEY = 'dc6zaTOxFJmzC';

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
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=12&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=12&rating=g`;

      const response = await fetch(endpoint);
      const data = await response.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Error fetching GIFs:', err);
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
              src={gif.images.fixed_height_small.url}
              alt={gif.title}
              className="gif-thumbnail"
              onClick={() => onSelect(gif.images.downsized.url)}
            />
          ))
        )}
      </div>
    </div>
  );
}
