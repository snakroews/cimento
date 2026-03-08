import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { LogOut, Pin, MoreVertical, Reply, Heart, Trash2, Settings as SettingsIcon, ChevronRight, Users, Search } from 'lucide-react';
import MessageInput from './MessageInput';
import Settings from './Settings';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) {
    // Ignore errors
  }
};

export default function Chat({ user, onLogout, onUpdateUser }) {
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [offlineUsers, setOfflineUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const avatarCache = useRef({}); // persists avatars even after users log off
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Initialize Socket connection
    const newSocket = io('/', {
      auth: {
        password: user.password,
        nickname: user.nickname
      },
      extraHeaders: {
        'Bypass-Tunnel-Reminder': 'true'
      }
    });

    // Listen to events
    newSocket.on('chat_history', (history) => {
      setMessages(history);
      scrollToBottom();
    });

    newSocket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
      
      if (msg.sender_nickname !== user.nickname) {
        if (document.hidden) {
          setUnreadCount(prev => prev + 1);
        }
        
        playNotificationSound();
        if (document.hidden && Notification.permission === 'granted') {
          new Notification(msg.sender_nickname, {
            body: msg.text || 'Sent an attachment',
            icon: '/favicon.png'
          });
        }
      }
    });

    newSocket.on('message_updated', (updatedMsg) => {
      setMessages((prev) => 
        prev.map(msg => msg.id === updatedMsg.id ? updatedMsg : msg)
      );
    });

    newSocket.on('message_deleted', (id) => {
      setMessages((prev) => prev.filter(msg => msg.id !== id));
    });

    newSocket.on('user_list', (users) => {
      setOnlineUsers(users);
      // Cache avatars so they persist after logout
      users.forEach(u => {
        if (u.avatar) avatarCache.current[u.nickname] = u.avatar;
      });
      // Remove newly online users from offline list
      setOfflineUsers(prev => prev.filter(offline => !users.find(u => u.nickname === offline.nickname)));
    });

    newSocket.on('user_offline', ({ nickname, lastSeen }) => {
      setOfflineUsers(prev => {
        const withoutOld = prev.filter(u => u.nickname !== nickname);
        return [...withoutOld, { nickname, lastSeen }];
      });
    });

    // Send avatar to server if we have one
    if (user.avatar) {
      newSocket.on('connect', () => {
        newSocket.emit('update_profile', { nickname: user.nickname, avatar: user.avatar });
      });
    }

    newSocket.on('connect_error', (err) => {
      console.error(err.message);
      alert("Authentication error or server offline.");
      onLogout(); // kick user back to login
    });

    setSocket(newSocket);

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => newSocket.close();
  }, [user]);

  // Handle document title updates for unread count
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) cimento chat`;
    } else {
      document.title = 'cimento chat';
    }
  }, [unreadCount]);

  // Clear unread count when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setUnreadCount(0);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.context-menu') && !e.target.closest('.action-menu-btn')) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendText = (text) => {
    if (socket) {
      if (replyingTo) {
        socket.emit('send_message', { content: text, reply_to_id: replyingTo.id });
        setReplyingTo(null);
      } else {
        socket.emit('send_message', text);
      }
    }
  };

  const handleTogglePin = (id, currentPinState) => {
    if (socket) {
      socket.emit('toggle_pin', { id, isPinned: !currentPinState });
      setActiveMenu(null);
    }
  };

  const handleToggleLike = (id) => {
    if (socket) {
      socket.emit('toggle_like', id);
      setActiveMenu(null);
    }
  };

  const handleReplyClick = (msg) => {
    setReplyingTo(msg);
    setActiveMenu(null);
  };

  const handleDelete = (id) => {
    if (socket) {
      socket.emit('delete_message', id);
      setActiveMenu(null);
    }
  };

  const renderMessageContent = (msg) => {
    if (msg.type === 'image') {
      return (
        <img 
          src={msg.content} 
          alt="sent by user" 
          className="message-image" 
          onClick={() => window.open(msg.content, '_blank')}
        />
      );
    }
    if (msg.type === 'audio') {
      return (
        <audio controls controlsList="nodownload">
          <source src={msg.content} type="audio/webm" />
          Your browser does not support the audio element.
        </audio>
      );
    }
    // Check if it's a GIPHY or Tenor gif URL sent as text
    if (msg.type === 'text' && msg.content && msg.content.match(/^https?:\/\/((media\d*\.giphy\.com\/media\/.*\.gif)|(c\.tenor\.com\/.*\.gif)|(media\.tenor\.com\/.*\.gif))/i)) {
      return (
        <img 
          src={msg.content} 
          alt="GIF" 
          className="message-image" 
          onClick={() => window.open(msg.content, '_blank')}
        />
      );
    }
    
    // Default text type
    return <span>{msg.content}</span>;
  };

  return (
    <div className="chat-layout">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div>
            <h1>cimento chat</h1>
            <span className="user-badge">{user.nickname}</span>
          </div>
          <button 
            className={`members-toggle-btn ${showMembers ? 'active' : ''}`}
            onClick={() => setShowMembers(!showMembers)} 
            title="Members"
          >
            <Users size={16} />
            <span className="online-count">{onlineUsers.length}</span>
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="icon-btn" 
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery('');
            }} 
            title="Search Messages"
          >
            <Search size={20} />
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
            <SettingsIcon size={20} />
          </button>
          <button className="icon-btn" onClick={onLogout} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {showSearch && (
        <div style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--glass-border)' }}>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="custom-input"
            autoFocus
          />
        </div>
      )}

      {messages.some(m => m.is_pinned) && (
        <div className="pinned-messages-bar" onClick={() => {
          const pinnedMessages = messages.filter(m => m.is_pinned);
          const lastPinned = pinnedMessages[pinnedMessages.length - 1];
          const el = document.getElementById(`msg-${lastPinned.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}>
          <Pin size={16} className="pinned-icon" fill="currentColor" />
          <div className="pinned-content">
            <strong>Pinned Message</strong>
            <span>
              {(() => {
                const lastPinned = messages.filter(m => m.is_pinned).slice(-1)[0];
                return lastPinned.type === 'text' ? lastPinned.content : 
                       lastPinned.type === 'image' ? '📷 Image' : '🎤 Voice Message';
              })()}
            </span>
          </div>
        </div>
      )}

      <div className="chat-body">
        <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
            No messages yet. Say hello!
          </div>
        )}
        
        {messages.filter(msg => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          return (msg.content && msg.content.toLowerCase().includes(q)) || 
                 (msg.sender_nickname && msg.sender_nickname.toLowerCase().includes(q));
        }).map((msg) => {
          const isMine = msg.sender_nickname === user.nickname;
          let likesArr = [];
          try {
            likesArr = JSON.parse(msg.likes || '[]');
          } catch(e) {}
          const isLikedByMe = likesArr.includes(user.nickname);
          const replyMsg = msg.reply_to_id ? messages.find(m => m.id == msg.reply_to_id) : null;

          return (
            <div id={`msg-${msg.id}`} key={msg.id} className={`message-wrapper ${isMine ? 'mine' : 'other'} ${msg.is_pinned ? 'pinned' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMine ? 'flex-end' : 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {!isMine && (() => {
                  const senderAvatar = msg.sender_nickname === user.nickname 
                    ? user.avatar 
                    : onlineUsers.find(u => u.nickname === msg.sender_nickname)?.avatar 
                      || avatarCache.current[msg.sender_nickname];
                  return (
                    <div className="msg-avatar-small">
                      {senderAvatar ? (
                        <img src={senderAvatar} alt={msg.sender_nickname} />
                      ) : (
                        msg.sender_nickname.charAt(0).toUpperCase()
                      )}
                    </div>
                  );
                })()}
                <span className="message-sender">{msg.sender_nickname}</span>
                
                <div className="message-actions-container">
                  <button 
                    className="action-menu-btn"
                    onClick={() => setActiveMenu(activeMenu === msg.id ? null : msg.id)}
                  >
                    <MoreVertical size={14} />
                  </button>
                  
                  {activeMenu === msg.id && (
                    <div className="context-menu">
                      <button onClick={() => handleToggleLike(msg.id)}>
                        <Heart size={14} fill={isLikedByMe ? "var(--accent)" : "none"} color={isLikedByMe ? "var(--accent)" : "currentColor"} />
                        {isLikedByMe ? "Unlike" : "Like"}
                      </button>
                      <button onClick={() => handleReplyClick(msg)}>
                        <Reply size={14} /> Reply
                      </button>
                      <button onClick={() => handleTogglePin(msg.id, msg.is_pinned)}>
                        <Pin size={14} fill={msg.is_pinned ? "currentColor" : "none"} />
                        {msg.is_pinned ? "Unpin" : "Pin message"}
                      </button>
                      <button className="delete-btn" onClick={() => handleDelete(msg.id)}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="message-bubble">
                {replyMsg && (
                  <div className="reply-snippet">
                    <strong>{replyMsg.sender_nickname}</strong>
                    <div className="reply-content">
                       {replyMsg.type === 'image' ? '📷 Image' : replyMsg.type === 'audio' ? '🎤 Voice Message' : replyMsg.content}
                    </div>
                  </div>
                )}
                {renderMessageContent(msg)}
              </div>
              <div className="message-meta-footer">
                <span className="message-timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {likesArr.length > 0 && (
                  <div className="likes-counter" title={likesArr.join(', ')}>
                    <Heart size={10} fill="var(--accent)" color="var(--accent)" />
                    <span>{likesArr.length}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

        {showMembers && (
          <div className="members-panel">
            <div className="members-panel-header">
              <Users size={16} />
              <span>Online — {onlineUsers.length}</span>
            </div>
            <div className="members-list">
              {onlineUsers.map((u, i) => (
                <div key={i} className="member-item">
                  <div className="member-avatar">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.nickname} />
                    ) : (
                      u.nickname.charAt(0).toUpperCase()
                    )}
                    <span className="online-dot"></span>
                  </div>
                  <span className="member-name">{u.nickname}</span>
                </div>
              ))}
              
              {offlineUsers.sort((a,b) => b.lastSeen - a.lastSeen).map((u, i) => {
                const avatar = avatarCache.current[u.nickname];
                const minsAgo = Math.floor((Date.now() - u.lastSeen) / 60000);
                const timeStr = minsAgo < 1 ? 'just now' : minsAgo < 60 ? `${minsAgo}m ago` : `${Math.floor(minsAgo/60)}h ago`;
                
                return (
                  <div key={`off-${i}`} className="member-item offline">
                    <div className="member-avatar" style={{ opacity: 0.5 }}>
                      {avatar ? <img src={avatar} alt={u.nickname} /> : u.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span className="member-name" style={{ color: 'var(--text-muted)' }}>{u.nickname}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.8, fontWeight: 500 }}>
                        Last seen {timeStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <MessageInput 
        user={user} 
        onSendText={handleSendText} 
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      {showSettings && (
        <Settings 
          user={user} 
          onUpdateUser={onUpdateUser} 
          onClose={() => setShowSettings(false)}
          socket={socket}
        />
      )}
    </div>
  );
}
