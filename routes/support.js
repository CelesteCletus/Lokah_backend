import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import { formLimiter, chatPollLimiter, chatMessageLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────

/** True when an agent had a heartbeat within the last 90 seconds */
const PRESENCE_TIMEOUT_SECONDS = 90;

async function isAnyAgentOnline(db) {
  const cutoff = new Date(Date.now() - PRESENCE_TIMEOUT_SECONDS * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
  const row = await db.get(
    `SELECT id FROM agent_presence WHERE is_online = true AND last_seen >= ? LIMIT 1`,
    [cutoff]
  );
  return !!row;
}

// ── Public Visitor Routes ──────────────────────────────────────────────────

// GET /api/support/presence  — visitor polls team availability
router.get('/presence', chatPollLimiter, async (req, res) => {
  try {
    const db = await getDb();
    const online = await isAnyAgentOnline(db);
    res.json({ online });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/support/conversations  — visitor starts or resumes a conversation
router.post('/conversations', formLimiter, async (req, res) => {
  try {
    const db = await getDb();
    const { visitor_name, visitor_phone, visitor_email, property_context, existing_conversation_id } = req.body;

    if (!visitor_name || !visitor_name.trim()) {
      return res.status(400).json({ error: 'Visitor name is required.' });
    }

    // Resume existing conversation if ID provided and valid
    if (existing_conversation_id) {
      const existing = await db.get(
        'SELECT * FROM support_conversations WHERE id = ?',
        [existing_conversation_id]
      );
      if (existing) {
        return res.json({ conversation: existing });
      }
    }

    // Create new conversation
    const conversationId = uuidv4();
    await db.run(
      `INSERT INTO support_conversations (id, visitor_name, visitor_phone, visitor_email, property_context, status, unread_count)
       VALUES (?, ?, ?, ?, ?, 'waiting', 0)`,
      [conversationId, visitor_name.trim(), visitor_phone || '', visitor_email || '', property_context || '']
    );

    const conversation = await db.get(
      'SELECT * FROM support_conversations WHERE id = ?',
      [conversationId]
    );

    // Add auto-greeting message from system
    const greetMsg = `Thank you for reaching out, ${visitor_name.trim()}. A member of the Lokah team will be with you shortly.`;
    const msgId = uuidv4();
    await db.run(
      `INSERT INTO support_messages (id, conversation_id, sender, sender_name, content) VALUES (?, ?, 'agent', 'Lokah Concierge', ?)`,
      [msgId, conversationId, greetMsg]
    );

    res.status(201).json({ conversation });
  } catch (err) {
    console.error('Support conv create error:', err);
    res.status(500).json({ error: 'Failed to create conversation.' });
  }
});

// GET /api/support/conversations/:id/messages  — visitor polls messages
router.get('/conversations/:id/messages', chatPollLimiter, async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { after } = req.query; // ISO timestamp to get only new messages

    // Validate conversation exists (no auth needed — ID is secret)
    const conv = await db.get('SELECT id, status, visitor_name FROM support_conversations WHERE id = ?', [id]);
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

    let sql = 'SELECT * FROM support_messages WHERE conversation_id = ?';
    const params = [id];

    if (after) {
      sql += ' AND created_at > ?';
      params.push(after);
    }
    sql += ' ORDER BY created_at ASC';

    const messages = await db.all(sql, params);
    const online = await isAnyAgentOnline(db);

    res.json({ messages, conversation: conv, agentOnline: online });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// POST /api/support/conversations/:id/messages  — visitor sends a message
router.post('/conversations/:id/messages', chatMessageLimiter, async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { content, visitor_name } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const conv = await db.get('SELECT * FROM support_conversations WHERE id = ?', [id]);
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });
    if (conv.status === 'closed') return res.status(400).json({ error: 'This conversation has been closed.' });

    const msgId = uuidv4();
    await db.run(
      `INSERT INTO support_messages (id, conversation_id, sender, sender_name, content) VALUES (?, ?, 'visitor', ?, ?)`,
      [msgId, id, conv.visitor_name || visitor_name || 'Visitor', content.trim()]
    );

    // Update conversation: set status to active if it was waiting; bump unread count
    await db.run(
      `UPDATE support_conversations SET status = CASE WHEN status = 'resolved' THEN 'active' ELSE CASE WHEN status = 'waiting' THEN 'waiting' ELSE status END END, unread_count = unread_count + 1, updated_at = NOW() WHERE id = ?`,
      [id]
    );

    const msg = await db.get('SELECT * FROM support_messages WHERE id = ?', [msgId]);
    res.status(201).json({ message: msg });
  } catch (err) {
    console.error('Send visitor message error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// ── Authenticated Staff Routes ─────────────────────────────────────────────

// POST /api/support/heartbeat  — agent pings to stay "online"
router.post('/heartbeat', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const email = req.admin?.email;
    if (!email) return res.status(401).json({ error: 'Unauthorized' });

    const existing = await db.get('SELECT id FROM agent_presence WHERE admin_email = ?', [email]);
    if (existing) {
      await db.run(
        `UPDATE agent_presence SET last_seen = NOW(), is_online = true WHERE admin_email = ?`,
        [email]
      );
    } else {
      await db.run(
        `INSERT INTO agent_presence (admin_email, is_online) VALUES (?, true)`,
        [email]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Heartbeat failed.' });
  }
});

// POST /api/support/agent-offline  — agent marks themselves offline
router.post('/agent-offline', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const email = req.admin?.email;
    await db.run(`UPDATE agent_presence SET is_online = false WHERE admin_email = ?`, [email]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update presence.' });
  }
});

// GET /api/support/admin/conversations  — list all conversations for staff
router.get('/admin/conversations', verifyToken, chatPollLimiter, async (req, res) => {
  try {
    const db = await getDb();
    const conversations = await db.all(
      `SELECT * FROM support_conversations ORDER BY updated_at DESC`
    );
    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

// GET /api/support/admin/conversations/:id  — conversation detail with messages
router.get('/admin/conversations/:id', verifyToken, chatPollLimiter, async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const conv = await db.get('SELECT * FROM support_conversations WHERE id = ?', [id]);
    if (!conv) return res.status(404).json({ error: 'Not found.' });

    const messages = await db.all(
      'SELECT * FROM support_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [id]
    );

    // Mark messages as read by staff
    await db.run(
      `UPDATE support_conversations SET unread_count = 0 WHERE id = ?`,
      [id]
    );

    res.json({ conversation: conv, messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversation.' });
  }
});

// POST /api/support/admin/conversations/:id/messages  — staff sends reply
router.post('/admin/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { content } = req.body;
    const agentName = req.admin?.username || req.admin?.email || 'Lokah Team';

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const conv = await db.get('SELECT id, status FROM support_conversations WHERE id = ?', [id]);
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

    const msgId = uuidv4();
    await db.run(
      `INSERT INTO support_messages (id, conversation_id, sender, sender_name, content, is_read) VALUES (?, ?, 'agent', ?, ?, true)`,
      [msgId, id, agentName, content.trim()]
    );

    // Update conversation status to active and timestamp
    await db.run(
      `UPDATE support_conversations SET status = 'active', assigned_agent = ?, updated_at = NOW() WHERE id = ?`,
      [agentName, id]
    );

    const msg = await db.get('SELECT * FROM support_messages WHERE id = ?', [msgId]);
    res.status(201).json({ message: msg });
  } catch (err) {
    console.error('Send staff message error:', err);
    res.status(500).json({ error: 'Failed to send reply.' });
  }
});

// POST /api/support/admin/conversations/:id/status  — update conversation status
router.post('/admin/conversations/:id/status', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['active', 'waiting', 'resolved', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    await db.run(
      `UPDATE support_conversations SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, id]
    );
    res.json({ ok: true, status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

export default router;
