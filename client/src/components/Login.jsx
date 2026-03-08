import { useState } from 'react';

export default function Login({ onLogin }) {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!nickname.trim() || !password.trim()) {
      setError('Please fill in both fields.');
      return;
    }

    setIsLoading(true);
    try {
      // Connect to our backend API to verify password
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ nickname, password })
      });
      
      const data = await res.json();
      
      if (data.success) {
        onLogin({ nickname, password });
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Could not connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">cimento chat</h1>
        
        {error && <div className="error-msg">{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="input-group">
            <label htmlFor="nickname">Nickname</label>
            <input 
              id="nickname"
              className="custom-input"
              type="text" 
              placeholder="How should we call you?"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Secret Password</label>
            <input 
              id="password"
              className="custom-input"
              type="password" 
              placeholder="Enter the shared password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="primary-btn" disabled={isLoading}>
            {isLoading ? 'Joining...' : 'Join Chat'}
          </button>
        </form>
      </div>
    </div>
  );
}
