import { useState, useRef } from 'react';
import { Image as ImageIcon, Mic, Send, X, Loader2, Square, Smile, Film } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import GifSearch from './GifSearch';

export default function MessageInput({ onSendText, onSendFile, user, replyingTo, onCancelReply }) {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifSearch, setShowGifSearch] = useState(false);
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedImage) {
      handleFileUpload(selectedImage, 'image');
      setSelectedImage(null);
    }

    if (text.trim()) {
      onSendText(text);
      setText('');
      setShowEmojiPicker(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedImage(file);
      } else {
        alert("Please select an image file.");
      }
    }
    // reset the input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileUpload = async (file, type) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', user.password);
    formData.append('nickname', user.nickname);
    formData.append('type', type);
    if (replyingTo) {
      formData.append('reply_to_id', replyingTo.id);
    }

    try {
      // Send file to Express backend
      await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: formData
      });
      // the server will broadcast it via socket, no need to do anything here
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const file = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
          handleFileUpload(file, 'audio');
          
          // Stop all audio tracks
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access denied or error:", err);
        alert("Could not access microphone.");
      }
    }
  };

  return (
    <div className="chat-input-area">
      {replyingTo && (
        <div className="active-reply-banner">
          <div className="reply-content">
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>Replying to {replyingTo.sender_nickname}</span>
            <span style={{ fontSize: '0.85rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {replyingTo.type === 'text' ? replyingTo.content : replyingTo.type === 'image' ? '📷 Image' : '🎤 Voice Info'}
            </span>
          </div>
          <button type="button" className="icon-btn" style={{ padding: '0.25rem' }} onClick={onCancelReply}>
            <X size={16} />
          </button>
        </div>
      )}

      {selectedImage && (
        <div className="image-preview-container">
          <img src={URL.createObjectURL(selectedImage)} alt="Preview" />
          <span style={{ fontSize: '0.875rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedImage.name}
          </span>
          <button type="button" className="icon-btn" onClick={() => setSelectedImage(null)}>
            <X size={18} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input 
          type="file" 
          accept="image/*" 
          style={{ display: 'none' }} 
          ref={fileInputRef}
          onChange={handleImageSelect}
        />

        <button 
          type="button" 
          className="icon-btn" 
          onClick={() => setShowEmojiPicker(val => !val)}
          disabled={isUploading || isRecording}
          title="Emoji"
        >
          <Smile size={20} />
        </button>

        {showEmojiPicker && (
          <div className="emoji-picker-wrapper">
            <EmojiPicker 
              onEmojiClick={(emojiData) => setText(prev => prev + emojiData.emoji)} 
              theme="dark" 
              emojiStyle="apple" 
              lazyLoadEmojis={true}
            />
          </div>
        )}
        
        <button 
          type="button" 
          className="icon-btn" 
          onClick={() => { setShowGifSearch(val => !val); setShowEmojiPicker(false); fileInputRef.current?.blur(); }}
          disabled={isUploading || isRecording}
          title="Send GIF"
        >
          <Film size={20} />
        </button>

        {showGifSearch && (
          <div className="gif-picker-wrapper">
            <GifSearch 
              onSelect={(url) => {
                onSendText(url);
                setShowGifSearch(false);
              }}
              onClose={() => setShowGifSearch(false)}
            />
          </div>
        )}
        
        <button 
          type="button" 
          className="icon-btn" 
          onClick={() => { fileInputRef.current?.click(); setShowEmojiPicker(false); }}
          disabled={isUploading || isRecording}
          title="Send Image"
        >
          <ImageIcon size={20} />
        </button>

        <button 
          type="button" 
          className={`icon-btn ${isRecording ? 'recording' : ''}`}
          onClick={toggleRecording}
          disabled={isUploading}
          title={isRecording ? "Stop Recording" : "Record Voice Message"}
        >
          {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
        </button>

        <input 
          type="text" 
          className="chat-input-field" 
          placeholder={isRecording ? "Recording..." : "Type a message..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isRecording || isUploading}
          autoComplete="off"
        />

        <button 
          type="submit" 
          className="send-btn"
          disabled={(!text.trim() && !selectedImage) || isRecording || isUploading}
        >
          {isUploading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
