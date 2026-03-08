import { useState, useEffect } from 'react';
import Login from './components/Login';
import Chat from './components/Chat';

function App() {
  // If user is null, they are not logged in.
  // user obj will be: { nickname, password }
  const [user, setUser] = useState(null);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('cimento_theme');
    if (savedTheme === 'light') {
      document.body.classList.add('theme-light');
    }
  }, []);

  // Floating emojis setup
  const emojis = ['🔥', '✨', '🌈', '🎉', '💖', '🎵', '💫', '☀️', '🌸', '🚀', '😎', '🍕', 'c', 'i', 'm', 'e', 'n', 't', 'o'];
  const floatingEmojis = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    left: `${Math.random() * 100}vw`,
    animationDuration: `${15 + Math.random() * 20}s`,
    animationDelay: `-${Math.random() * 20}s`,
    fontSize: `${1 + Math.random() * 2}rem`
  }));

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <>
      <div className="emoji-bg">
        {floatingEmojis.map(item => (
          <span 
            key={item.id} 
            className="floating-emoji"
            style={{ 
              left: item.left, 
              animationDuration: item.animationDuration,
              animationDelay: item.animationDelay,
              fontSize: item.fontSize
            }}
          >
            {item.emoji}
          </span>
        ))}
      </div>
      
      {!user ? (
        <Login onLogin={setUser} />
      ) : (
        <Chat user={user} onLogout={() => setUser(null)} onUpdateUser={updateUser} />
      )}
    </>
  );
}

export default App;
