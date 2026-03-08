import { useState, useRef, useEffect } from 'react';
import { X, Camera, User, Sun, Moon } from 'lucide-react';

export default function Settings({ user, onUpdateUser, onClose, socket }) {
  const [nickname, setNickname] = useState(user.nickname);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar || null);
  const [theme, setTheme] = useState('dark');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setTheme(document.body.classList.contains('theme-light') ? 'light' : 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('cimento_theme', newTheme);
    if (newTheme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Upload to server
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', user.password);
    formData.append('nickname', user.nickname);
    formData.append('type', 'avatar');

    fetch('/api/upload', { method: 'POST', body: formData })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const avatarUrl = data.message.content;
          setAvatarPreview(avatarUrl);
          onUpdateUser({ avatar: avatarUrl });
          if (socket) socket.emit('update_profile', { avatar: avatarUrl });
        }
      })
      .catch(err => console.error('Avatar upload failed:', err));
  };

  const handleSave = () => {
    const updates = {};
    if (nickname.trim() && nickname !== user.nickname) {
      updates.nickname = nickname.trim();
    }
    if (Object.keys(updates).length > 0) {
      onUpdateUser(updates);
      if (socket) socket.emit('update_profile', { nickname: updates.nickname, avatar: avatarPreview });
    }
    onClose();
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-body">
          {/* Avatar */}
          <div className="settings-avatar-section">
            <div 
              className="settings-avatar" 
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" />
              ) : (
                <User size={40} />
              )}
              <div className="avatar-overlay">
                <Camera size={18} />
              </div>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleAvatarChange} 
              style={{ display: 'none' }} 
            />
            <span className="settings-avatar-hint">Click to change photo</span>
          </div>

          {/* Nickname */}
          <div className="settings-field">
            <label>Nickname</label>
            <input
              className="custom-input"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter nickname"
              maxLength={20}
            />
          </div>

          {/* Theme Toggle */}
          <div className="settings-field" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
            <label style={{ margin: 0 }}>Appearance</label>
            <button 
              className="icon-btn" 
              onClick={toggleTheme} 
              style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <div className="settings-footer">
          <button className="primary-btn settings-save-btn" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
