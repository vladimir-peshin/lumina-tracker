import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, X, Plus, Image as ImageIcon, Trash2, Upload, Check, Globe, Eye, EyeOff, ChevronDown } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from './cropUtils';

const API_URL = '/api/games';

export default function App() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const STATUSES = useMemo(() => ['None', 'Playing', 'Played', 'Finished', 'Dropped'], []);

  // Fetch games from backend on mount
  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setGames(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching games:', err);
        setLoading(false);
      });
  }, []);

  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showHidden, setShowHidden] = useState(false);

  const [selectedGame, setSelectedGame] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [visibleCount, setVisibleCount] = useState(200);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  // Reset scroll when filters change
  useEffect(() => {
    setVisibleCount(200);
  }, [search, platformFilter, tagFilter, collectionFilter, statusFilter, showHidden]);

  // Extract unique platforms and tags for filters
  const platforms = useMemo(() => {
    const allPlatforms = games.flatMap(g => (g.platform || '').split(',').map(p => p.trim()).filter(Boolean));
    return [...new Set(allPlatforms)].sort((a, b) => a.localeCompare(b));
  }, [games]);

  const tags = useMemo(() => {
    const allTags = games.flatMap(g => (g.tags || '').split(',').map(t => t.trim()).filter(Boolean));
    return [...new Set(allTags)].sort((a, b) => a.localeCompare(b));
  }, [games]);

  const collections = useMemo(() => {
    const allColls = games.flatMap(g => (g.collections || '').split(',').map(c => c.trim()).filter(Boolean));
    return [...new Set(allColls)].sort((a, b) => a.localeCompare(b));
  }, [games]);

  // Filter games based on criteria
  const filteredGames = useMemo(() => {
    const filtered = games.filter(game => {
      const searchLower = search.toLowerCase();
      const matchSearch = !search ||
        (game.title || '').toLowerCase().includes(searchLower) ||
        (game.developer || '').toLowerCase().includes(searchLower);

      const matchPlatform = platformFilter
        ? (game.platform || '').split(',').map(p => p.trim().toLowerCase()).includes(platformFilter.toLowerCase())
        : true;

      const gameTagsArray = (game.tags || '').split(',').map(t => t.trim().toLowerCase());
      const matchTag = tagFilter ? gameTagsArray.includes(tagFilter.toLowerCase()) : true;

      const gameCollsArray = (game.collections || '').split(',').map(c => c.trim().toLowerCase());
      const matchCollection = collectionFilter ? gameCollsArray.includes(collectionFilter.toLowerCase()) : true;

      const matchStatus = statusFilter ? (game.status || '').toLowerCase() === statusFilter.toLowerCase() : true;

      // Visibility logic: show if (!hidden AND matches filter) OR (showHidden AND matches filter) OR (search matches hidden game)
      const isHidden = !!game.hidden;
      const shouldShowByVisibility = !isHidden || showHidden || (search && matchSearch);

      return matchSearch && matchPlatform && matchTag && matchCollection && matchStatus && shouldShowByVisibility;
    });

    // Sort: prioritize titles starting with search text, then alphabetically
    return filtered.sort((a, b) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      if (search) {
        const searchLower = search.toLowerCase();
        const aStarts = titleA.startsWith(searchLower);
        const bStarts = titleB.startsWith(searchLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }
      return titleA.localeCompare(titleB);
    });
  }, [games, search, platformFilter, tagFilter, collectionFilter, statusFilter, showHidden]);

  useEffect(() => {
    if (sentinelRef.current) {
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + 100);
        }
      }, { rootMargin: '400px' });

      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, filteredGames.length]);

  const handleAddClick = useCallback(() => {
    setSelectedGame({
      title: '',
      developer: '',
      year: '',
      platform: '',
      tags: '',
      collections: '',
      status: 'None',
      comment: '',
      cover: '',
      hidden: false
    });
    setIsModalOpen(true);
  }, []);

  const handleEditClick = useCallback((game) => {
    setSelectedGame(game);
    setIsModalOpen(true);
  }, []);

  const handleSaveGame = useCallback(async (updatedGame) => {
    const isNew = !games.find(g => g.id === updatedGame.id);

    // Duplicate title validation
    const duplicate = games.find(g =>
      g.title.toLowerCase().trim() === (updatedGame.title || '').toLowerCase().trim() &&
      g.id !== updatedGame.id
    );

    if (duplicate) {
      alert(`A game with the title "${updatedGame.title}" already exists in your collection.`);
      return;
    }

    try {
      if (isNew) {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedGame)
        });
        const savedGame = await res.json();
        setGames(prev => [savedGame, ...prev]);
      } else {
        const res = await fetch(`${API_URL}/${updatedGame.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedGame)
        });
        const savedGame = await res.json();
        setGames(prev => prev.map(g => g.id === savedGame.id ? savedGame : g));
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving game:', err);
      alert('Failed to save game. Make sure the backend server is running.');
    }
  }, [games]);

  const handleDeleteGame = useCallback(async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });
      setGames(prev => prev.filter(g => g.id !== id));
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error deleting game:', err);
      alert('Failed to delete game.');
    }
  }, []);

  const closeModal = useCallback(() => setIsModalOpen(false), []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading your collection...</div>;
  }

  return (
    <>
      <header className="app-header">
        <h1 className="app-title">Lumina Tracker</h1>
        <button className="btn btn-primary btn-icon" onClick={handleAddClick}>
          <Plus size={18} /> Add Game
        </button>
      </header>

      <div className="controls">
        <div className="search-input-wrapper" style={{ flex: '1 1 300px' }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by title or developer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <FilterDropdown value={platformFilter} onChange={setPlatformFilter} options={platforms} allLabel="All Platforms" />
        <FilterDropdown value={tagFilter} onChange={setTagFilter} options={tags} allLabel="All Tags" />
        <FilterDropdown value={collectionFilter} onChange={setCollectionFilter} options={collections} allLabel="All Collections" />
        <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={STATUSES} allLabel="All Statuses" />

        <button
          className={`btn ${showHidden ? 'btn-primary' : 'btn-secondary'} btn-icon`}
          onClick={() => setShowHidden(!showHidden)}
          title={showHidden ? "Hide hidden games" : "Show hidden games"}
        >
          {showHidden ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>

      <div className="game-grid">
        {filteredGames.slice(0, visibleCount).map(game => (
          <div
            key={game.id}
            className={`game-card ${game.hidden ? 'is-hidden' : ''}`}
            onClick={() => handleEditClick(game)}
            data-tooltip={game.title || 'Untitled'}
          >
            <div className="cover-wrapper">
              {game.cover ? (
                <img src={game.cover} alt={game.title} className="cover-image" loading="lazy" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                  <ImageIcon size={48} color="rgba(255,255,255,0.2)" />
                </div>
              )}
            </div>
            <div className="game-title">{game.title || 'Untitled'}</div>
          </div>
        ))}

        {filteredGames.length > visibleCount && (
          <div ref={sentinelRef} style={{ gridColumn: '1 / -1', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Loading more games...
          </div>
        )}

        {filteredGames.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            No games found matching your filters.
          </div>
        )}
      </div>

      {isModalOpen && selectedGame && createPortal(
        <GameModal
          game={selectedGame}
          onClose={closeModal}
          onSave={handleSaveGame}
          onDelete={handleDeleteGame}
          platforms={platforms}
          tags={tags}
          collections={collections}
          statuses={STATUSES}
        />,
        document.body
      )}
    </>
  );
}

const GameModal = memo(({ game, onClose, onSave, onDelete, platforms, tags, collections, statuses }) => {
  const [formData, setFormData] = useState({ ...game });

  // Handle Esc key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  const fileInputRef = useRef(null);

  // SteamGrid search states
  const [isSearchingGrid, setIsSearchingGrid] = useState(false);
  const [searchQuery, setSearchQuery] = useState(game.title || '');
  const [searchResults, setSearchResults] = useState([]);
  const [gridResults, setGridResults] = useState([]);
  const [searchingStatus, setSearchingStatus] = useState('');

  // Cropper states
  const [cropMode, setCropMode] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const processImageForCrop = (imageUrl) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const ratio = img.width / img.height;
      if (Math.abs(ratio - (2 / 3)) < 0.05) {
        // Skip Cropper, it's already a portrait poster
        try {
          const fullImageBase64 = await getCroppedImg(imageUrl, { x: 0, y: 0, width: img.width, height: img.height });
          setFormData(prev => ({ ...prev, cover: fullImageBase64 }));
          setIsSearchingGrid(false);
          setCropMode(false);
          setImageToCrop(null);
        } catch (e) {
          console.error('Fast crop error', e);
        }
      } else {
        setImageToCrop(imageUrl);
        setIsSearchingGrid(false);
        setCropMode(true);
      }
    };
    img.src = imageUrl;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        processImageForCrop(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApplyCrop = async () => {
    try {
      const croppedImageBase64 = await getCroppedImg(imageToCrop, croppedAreaPixels);
      setFormData(prev => ({ ...prev, cover: croppedImageBase64 }));
      setCropMode(false);
      setImageToCrop(null);
    } catch (e) {
      console.error(e);
      alert('Failed to crop image');
    }
  };

  const handleSearchSteamGrid = async () => {
    if (!searchQuery) return;
    setSearchingStatus('Searching games...');
    setGridResults([]);
    try {
      const res = await fetch(`/api/search-games?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) setSearchingStatus('No games found.');
      else setSearchingStatus('');
    } catch (e) {
      setSearchingStatus('Error searching games.');
    }
  };

  const handleSelectSteamGridGame = async (gameId) => {
    setSearchingStatus('Fetching covers...');
    setSearchResults([]);
    try {
      const res = await fetch(`/api/game-grids/${gameId}`);
      const data = await res.json();
      setGridResults(data);
      if (data.length === 0) setSearchingStatus('No covers found for this game.');
      else setSearchingStatus('');
    } catch (e) {
      setSearchingStatus('Error fetching covers.');
    }
  };

  const handleSelectGrid = (gridUrl) => {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(gridUrl)}`;
    processImageForCrop(proxyUrl);
  };

  const handleToggleSearch = () => {
    if (!isSearchingGrid) {
      setSearchQuery(formData.title || '');
    }
    setIsSearchingGrid(!isSearchingGrid);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const isExistingGame = Boolean(game.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={cropMode ? { maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column' } : {}}
      >
        <button className="modal-close" onClick={onClose} title="Close" type="button" style={{ zIndex: 100 }}>
          <X size={20} />
        </button>

        {cropMode ? (
          <div className="cropper-container" style={{ borderRadius: '12px', overflow: 'hidden', flex: 1 }}>
            <div className="cropper-area">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={2 / 3}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="cropper-controls">
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-label="Zoom"
                onChange={(e) => setZoom(e.target.value)}
                style={{ width: '200px' }}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCropMode(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleApplyCrop}>
                  <Check size={18} /> Apply Crop
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-left">
              {!isSearchingGrid && (
                <div className="cover-upload-container" onClick={() => fileInputRef.current?.click()} style={{ flex: 'none', height: formData.cover ? 'auto' : '350px' }}>
                  {formData.cover ? (
                    <>
                      <img src={formData.cover} alt="Cover Preview" className="modal-cover" />
                      <div className="cover-upload-overlay">
                        <Upload size={32} />
                        <span>Click to upload local</span>
                      </div>
                    </>
                  ) : (
                    <div className="empty-cover-placeholder">
                      <ImageIcon size={48} />
                      <span>Upload Local Image</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                    title="Upload cover image"
                  />
                </div>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 1rem', alignSelf: 'center' }}
                onClick={handleToggleSearch}
              >
                <Globe size={16} /> {isSearchingGrid ? 'Cancel' : 'SteamGridDB'}
              </button>

              {isSearchingGrid && (
                <div className="steamgrid-search-container">
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-main)', opacity: 0.9 }}>Search SteamGridDB</h3>
                  <div className="steamgrid-search-input-wrapper">
                    <input
                      type="text"
                      placeholder="Search game..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearchSteamGrid())}
                      autoFocus
                    />
                    <button type="button" className="btn btn-primary" onClick={handleSearchSteamGrid}>
                      Search
                    </button>
                  </div>

                  {searchingStatus && <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '1rem' }}>{searchingStatus}</div>}

                  <div className="steamgrid-results-wrapper">
                    {searchResults.length > 0 && (
                      <div className="steamgrid-results">
                        {searchResults.map(res => (
                          <div key={res.id} className="steamgrid-result-item" onClick={() => handleSelectSteamGridGame(res.id)}>
                            {res.name}
                          </div>
                        ))}
                      </div>
                    )}

                    {gridResults.length > 0 && (
                      <div className="steamgrid-grids-container">
                        {gridResults.map(grid => (
                          <img
                            key={grid.id}
                            src={grid.thumb}
                            alt="grid thumb"
                            className="steamgrid-grid-image"
                            onClick={() => handleSelectGrid(grid.url)}
                            title="Click to select and crop"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-right">
              <h2>{isExistingGame ? 'Edit Game Details' : 'Add New Game'}</h2>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Cyberpunk 2077"
                    autoComplete="off"
                    autoFocus={!isExistingGame}
                    onKeyDown={(e) => {
                      if (e.key === ' ' && e.target.selectionStart === 0) {
                        e.preventDefault();
                      }
                    }}
                    onBlur={(e) => {
                      setFormData(prev => ({ ...prev, title: e.target.value.trim() }));
                    }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Developer</label>
                    <input
                      name="developer"
                      value={formData.developer}
                      onChange={handleChange}
                      placeholder="e.g. CD Projekt Red"
                      autoComplete="off"
                      onKeyDown={(e) => {
                        if (e.key === ' ' && e.target.selectionStart === 0) {
                          e.preventDefault();
                        }
                      }}
                      onBlur={(e) => {
                        setFormData(prev => ({ ...prev, developer: e.target.value.trim() }));
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Year</label>
                    <input
                      name="year"
                      type="number"
                      value={formData.year}
                      onChange={handleChange}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Platform</label>
                    <AutocompleteInput
                      name="platform"
                      value={formData.platform}
                      onChange={handleChange}
                      placeholder="e.g. PC, PS5"
                      options={platforms}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tags</label>
                    <AutocompleteInput
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      placeholder="e.g. RPG, Sci-Fi"
                      options={tags}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Collections</label>
                    <AutocompleteInput
                      name="collections"
                      value={formData.collections}
                      onChange={handleChange}
                      placeholder="e.g. Favorites, Masterpieces"
                      options={collections}
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <SingleSelectDropdown
                      name="status"
                      value={formData.status || 'None'}
                      onChange={handleChange}
                      options={statuses}
                      placeholder="Select status"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Comment</label>
                  <textarea
                    name="comment"
                    value={formData.comment}
                    onChange={handleChange}
                    placeholder="Your thoughts on this game..."
                  />
                </div>

                <div className="modal-actions" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <div style={{ flex: '1 1 0px', textAlign: 'left' }}>
                    {isExistingGame && (
                      <button type="button" className="btn btn-danger btn-icon btn-modal-fixed" onClick={() => onDelete(game.id)}>
                        <Trash2 size={16} /> Delete
                      </button>
                    )}
                  </div>

                  <div style={{ flex: '1 1 0px', display: 'flex', justifyContent: 'center' }}>
                    <div className="toggle-wrapper" title="Hide/Show game in collection">
                      <input
                        type="checkbox"
                        id="game-hidden-toggle"
                        name="hidden"
                        checked={!!formData.hidden}
                        onChange={(e) => setFormData(prev => ({ ...prev, hidden: e.target.checked }))}
                      />
                      <label htmlFor="game-hidden-toggle" className="toggle-label">
                        <div className="toggle-switch"></div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Hidden</span>
                      </label>
                    </div>
                  </div>

                  <div style={{ flex: '1 1 0px', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary btn-modal-fixed" onClick={onClose}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-modal-fixed">
                      Save
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

function AutocompleteInput({ name, value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedValues = (value || '').split(',').map(s => s.trim()).filter(Boolean);

  const filteredOptions = Array.from(new Set(options))
    .filter(opt => {
      if (selectedValues.some(s => s.toLowerCase() === opt.toLowerCase())) return false;
      if (!inputText) return true;
      const words = opt.toLowerCase().split(/\s+/);
      return words.some(w => w.startsWith(inputText.toLowerCase()));
    })
    .sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    setHighlightIndex(-1);
  }, [inputText, isOpen]);

  useEffect(() => {
    if (highlightIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.children[highlightIndex];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleSelect = (opt) => {
    const newValues = [...selectedValues, opt].sort((a, b) => a.localeCompare(b));
    onChange({ target: { name, value: newValues.join(', ') } });
    setInputText('');
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleRemove = (idx, e) => {
    e.stopPropagation();
    const newValues = selectedValues.filter((_, i) => i !== idx);
    onChange({ target: { name, value: newValues.join(', ') } });
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    setIsOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) { setIsOpen(true); return; }
      setHighlightIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) return;
      setHighlightIndex(prev => prev > 0 ? prev - 1 : filteredOptions.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightIndex >= 0 && filteredOptions[highlightIndex]) {
        handleSelect(filteredOptions[highlightIndex]);
      } else if (inputText.trim()) {
        const newValues = [...selectedValues, inputText.trim()].sort((a, b) => a.localeCompare(b));
        onChange({ target: { name, value: newValues.join(', ') } });
        setInputText('');
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightIndex(-1);
    } else if (e.key === 'Backspace' && !inputText && selectedValues.length > 0) {
      const newValues = selectedValues.slice(0, -1);
      onChange({ target: { name, value: newValues.join(', ') } });
    }
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef} onBlur={(e) => { if (!wrapperRef.current?.contains(e.relatedTarget)) { setIsOpen(false); setHighlightIndex(-1); } }}>
      <div className="multi-input-container" onClick={() => { wrapperRef.current?.querySelector('input')?.focus(); setIsOpen(true); }}>
        {selectedValues.map((val, i) => (
          <span key={i} className="multi-tag" onClick={(e) => e.stopPropagation()}>
            {val}
            <span className="multi-tag-remove" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(i, e); }}>×</span>
          </span>
        ))}
        <input
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedValues.length === 0 ? placeholder : ''}
          autoComplete="off"
          className="multi-input-field"
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            color: 'var(--text-main)',
            flex: '1 1 0px',
            minWidth: '0',
            padding: '2px 0',
            fontFamily: 'inherit',
            fontSize: 'inherit'
          }}
        />
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <div className="autocomplete-dropdown" ref={dropdownRef} onMouseMove={() => setHighlightIndex(-1)}>
          {filteredOptions.map((opt, i) => (
            <div
              key={opt}
              className={`autocomplete-item${i === highlightIndex ? ' is-highlighted' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SingleSelectDropdown({ name, value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (highlightIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.children[highlightIndex];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleSelect = (opt) => {
    onChange({ target: { name, value: opt } });
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) { setIsOpen(true); setHighlightIndex(options.indexOf(value)); return; }
      setHighlightIndex(prev => prev < options.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) return;
      setHighlightIndex(prev => prev > 0 ? prev - 1 : options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen && highlightIndex >= 0 && options[highlightIndex]) {
        handleSelect(options[highlightIndex]);
      } else {
        setIsOpen(true);
        setHighlightIndex(options.indexOf(value));
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef} onBlur={(e) => { if (!wrapperRef.current?.contains(e.relatedTarget)) { setIsOpen(false); setHighlightIndex(-1); } }}>
      <div
        className="single-select-trigger"
        tabIndex={0}
        onClick={() => { setIsOpen(!isOpen); setHighlightIndex(options.indexOf(value)); }}
        onKeyDown={handleKeyDown}
      >
        <span className={value ? '' : 'placeholder-text'}>{value || placeholder || 'Select...'}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {isOpen && (
        <div className="autocomplete-dropdown" ref={dropdownRef} onMouseMove={() => setHighlightIndex(-1)}>
          {options.map((opt, i) => (
            <div
              key={opt}
              className={`autocomplete-item${i === highlightIndex ? ' is-highlighted' : ''}${opt === value ? ' is-selected' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterDropdown({ value, onChange, options, allLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const allOptions = ['', ...options];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (highlightIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.children[highlightIndex];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleSelect = (opt) => {
    onChange(opt);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) { setIsOpen(true); setHighlightIndex(allOptions.indexOf(value)); return; }
      setHighlightIndex(prev => prev < allOptions.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) return;
      setHighlightIndex(prev => prev > 0 ? prev - 1 : allOptions.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen && highlightIndex >= 0 && highlightIndex < allOptions.length) {
        handleSelect(allOptions[highlightIndex]);
      } else {
        setIsOpen(true);
        setHighlightIndex(allOptions.indexOf(value));
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  const displayLabel = value || allLabel;

  return (
    <div className="autocomplete-wrapper filter-dropdown-wrapper" ref={wrapperRef} onBlur={(e) => { if (!wrapperRef.current?.contains(e.relatedTarget)) { setIsOpen(false); setHighlightIndex(-1); } }}>
      <div
        className="filter-select-trigger"
        tabIndex={0}
        onClick={() => { setIsOpen(!isOpen); setHighlightIndex(allOptions.indexOf(value)); }}
        onKeyDown={handleKeyDown}
      >
        <Filter size={16} style={{ flexShrink: 0, opacity: 0.5 }} />
        <span className={value ? '' : 'placeholder-text'}>{displayLabel}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.5, marginLeft: 'auto', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {isOpen && (
        <div className="autocomplete-dropdown" ref={dropdownRef} onMouseMove={() => setHighlightIndex(-1)}>
          {allOptions.map((opt, i) => (
            <div
              key={opt || '__all__'}
              className={`autocomplete-item${i === highlightIndex ? ' is-highlighted' : ''}${opt === value ? ' is-selected' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
            >
              {opt || allLabel}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

