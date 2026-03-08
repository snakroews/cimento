const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'chat.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'text',
      content TEXT NOT NULL,
      sender_nickname TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_pinned BOOLEAN DEFAULT 0,
      likes TEXT DEFAULT '[]',
      reply_to_id INTEGER DEFAULT NULL
    )
  `);
});

const saveMessage = (type, content, sender_nickname, reply_to_id, callback) => {
  const stmt = db.prepare(`INSERT INTO messages (type, content, sender_nickname, reply_to_id) VALUES (?, ?, ?, ?)`);
  stmt.run(type, content, sender_nickname, reply_to_id, function(err) {
    if (err) {
      console.error("Error saving message:", err);
      return callback(err, null);
    }
    
    // Retrieve the inserted message to get the exact timestamp backing it
    db.get(`SELECT * FROM messages WHERE id = ?`, [this.lastID], (err, row) => {
      callback(err, row);
    });
  });
  stmt.finalize();
};

const getRecentMessages = (limit, callback) => {
  db.all(`SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?`, [limit], (err, rows) => {
    if (err) {
      console.error("Error fetching messages", err);
      return callback(err, []);
    }
    // Return them in ascending order (oldest first for the chat UI)
    callback(null, rows.reverse());
  });
};

const togglePinMessage = (id, isPinned, callback) => {
  db.run(`UPDATE messages SET is_pinned = ? WHERE id = ?`, [isPinned ? 1 : 0, id], function(err) {
    if (err) {
      console.error("Error pinning message:", err);
      return callback(err, null);
    }
    
    db.get(`SELECT * FROM messages WHERE id = ?`, [id], (err, row) => {
      callback(err, row);
    });
  });
};

const toggleLikeMessage = (id, nickname, callback) => {
  db.get(`SELECT likes FROM messages WHERE id = ?`, [id], (err, row) => {
    if (err || !row) return callback(err || new Error('Message not found'), null);
    
    let likesArr = [];
    try {
      likesArr = JSON.parse(row.likes || '[]');
    } catch(e) {}

    // Toggle logic
    if (likesArr.includes(nickname)) {
      likesArr = likesArr.filter(n => n !== nickname); // remove
    } else {
      likesArr.push(nickname); // add
    }

    const newLikesStr = JSON.stringify(likesArr);

    db.run(`UPDATE messages SET likes = ? WHERE id = ?`, [newLikesStr, id], function(err) {
      if (err) return callback(err, null);
      
      db.get(`SELECT * FROM messages WHERE id = ?`, [id], (err, updatedRow) => {
        callback(err, updatedRow);
      });
    });
  });
};

const deleteMessage = (id, callback) => {
  db.run(`DELETE FROM messages WHERE id = ?`, [id], function(err) {
    if (err) {
      console.error("Error deleting message:", err);
      return callback(err);
    }
    callback(null);
  });
};

module.exports = {
  saveMessage,
  getRecentMessages,
  togglePinMessage,
  toggleLikeMessage,
  deleteMessage
};
