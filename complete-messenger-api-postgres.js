#!/usr/bin/env node

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { Pool } = require('pg');

dotenv.config();

const app = express();
const PORT = 3002; // 固定使用端口 3002

app.use(cors());
app.use(express.json());

// PostgreSQL 連接池
const pool = new Pool({
  user: 'messenger_user',
  host: 'localhost',
  database: 'messenger_ai_dashboard',
  password: 'messenger123',
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 測試資料庫連接
pool.on('connect', () => {
  console.log('✅ PostgreSQL 連接成功');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL 連接錯誤:', err);
});

// Mock AI processing function
async function processMessageWithAI(message) {
  console.log(`Processing message with AI: "${message}"`);
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay

  let summary = `這是摘要：${message.substring(0, 30)}...`;
  let category = '未分類';

  if (message.includes('專案') || message.includes('會議') || message.includes('工作')) {
    category = '工作相關';
  } else if (message.includes('bug') || message.includes('程式碼') || message.includes('錯誤') || 
             message.includes('API') || message.includes('bot') || message.includes('puppeteer') ||
             message.includes('messenger') || message.includes('webhook') || message.includes('資料庫')) {
    category = '技術討論';
  } else if (message.includes('活動') || message.includes('聚會') || message.includes('參加')) {
    category = '活動通知';
  } else if (message.includes('餐廳') || message.includes('吃飯') || message.includes('推薦')) {
    category = '生活分享';
  } else if (message.includes('求助') || message.includes('幫忙') || message.includes('問題')) {
    category = '問題求助';
  } else if (message.includes('中醫') || message.includes('穴位') || message.includes('經脈') || 
             message.includes('陰陽') || message.includes('虛實') || message.includes('測量')) {
    category = '學術討論';
  } else if (message.includes('臉書') || message.includes('Facebook') || message.includes('telegram') || 
             message.includes('slack') || message.includes('API')) {
    category = '技術討論';
  }

  return { summary, category };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Complete Messenger API Service with PostgreSQL',
    message: '服務運行正常'
  });
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  try {
    // Test database connection
    const dbResult = await pool.query('SELECT NOW() as current_time');
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        ai: true,
        database: true,
        messenger: true
      },
      system: {
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        uptime: process.uptime(),
        databaseTime: dbResult.rows[0].current_time
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// Test AI functionality
app.get('/api/test', async (req, res) => {
  try {
    const testMessage = "今天開會討論了新的專案需求，需要在下週完成";
    const result = await processMessageWithAI(testMessage);
    res.json({ success: true, test: true, message: testMessage, result });
  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process message endpoint
app.post('/api/process-message', async (req, res) => {
  try {
    const { message, user } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    
    const { summary, category } = await processMessageWithAI(message);
    
    // Save to database
    const dbResult = await pool.query(
      `INSERT INTO messages (thread_id, content, sender, summary, category, processed_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id, processed_at`,
      [process.env.FACEBOOK_THREAD_ID || 'default', message, user || 'Unknown', summary, category]
    );
    
    res.json({
      success: true,
      data: { 
        id: dbResult.rows[0].id,
        summary, 
        category, 
        processedAt: dbResult.rows[0].processed_at 
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Message processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Group Management APIs
app.post('/groups', async (req, res) => {
  try {
    const { name, threadId, description } = req.body;
    
    const dbResult = await pool.query(
      `INSERT INTO groups (name, thread_id, description, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING *`,
      [name || '未命名群組', threadId || process.env.FACEBOOK_THREAD_ID, description || '']
    );
    
    res.json({
      success: true,
      data: dbResult.rows[0],
      message: '群組建立成功'
    });
  } catch (error) {
    console.error('Group creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/groups', async (req, res) => {
  try {
    const dbResult = await pool.query(
      `SELECT g.*, COUNT(m.id) as message_count 
       FROM groups g 
       LEFT JOIN messages m ON g.thread_id = m.thread_id 
       GROUP BY g.id 
       ORDER BY g.created_at DESC`
    );
    
    res.json({
      success: true,
      data: dbResult.rows,
      count: dbResult.rows.length
    });
  } catch (error) {
    console.error('Groups fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/groups/:groupId', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const dbResult = await pool.query(
      `SELECT g.*, COUNT(m.id) as message_count 
       FROM groups g 
       LEFT JOIN messages m ON g.thread_id = m.thread_id 
       WHERE g.thread_id = $1 
       GROUP BY g.id`,
      [groupId]
    );
    
    if (dbResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '群組不存在'
      });
    }
    
    res.json({
      success: true,
      data: dbResult.rows[0]
    });
  } catch (error) {
    console.error('Group fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch group messages from database
app.get('/groups/:groupId/messages', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const limit = parseInt(req.query.limit) || 20;
    
    // Check if group exists, create if not
    let groupResult = await pool.query(
      'SELECT * FROM groups WHERE thread_id = $1',
      [groupId]
    );
    
    if (groupResult.rows.length === 0) {
      // Create group if it doesn't exist
      groupResult = await pool.query(
        `INSERT INTO groups (name, thread_id, description, created_at) 
         VALUES ($1, $2, $3, NOW()) 
         RETURNING *`,
        [`群組 ${groupId}`, groupId, '自動建立的群組']
      );
    }
    
    // Fetch messages
    const messagesResult = await pool.query(
      `SELECT * FROM messages 
       WHERE thread_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [groupId, limit]
    );
    
    res.json({
      success: true,
      data: {
        group: groupResult.rows[0],
        messages: messagesResult.rows.reverse(), // Return in chronological order
        total: messagesResult.rows.length
      },
      message: `成功抓取 ${messagesResult.rows.length} 則訊息`
    });
  } catch (error) {
    console.error('Message fetching error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process group messages with AI and save to database
app.post('/groups/:groupId/messages', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { messages: messagesToProcess } = req.body;
    
    if (!messagesToProcess || !Array.isArray(messagesToProcess)) {
      return res.status(400).json({ success: false, error: 'Messages array is required' });
    }
    
    const processedMessages = [];
    
    for (const message of messagesToProcess) {
      const { summary, category } = await processMessageWithAI(message.content);
      
      // Save to database
      const dbResult = await pool.query(
        `INSERT INTO messages (thread_id, content, sender, summary, category, created_at, processed_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
         RETURNING *`,
        [
          groupId,
          message.content,
          message.sender,
          summary,
          category,
          message.timestamp || new Date().toISOString()
        ]
      );
      
      processedMessages.push({
        ...message,
        id: dbResult.rows[0].id,
        summary,
        category,
        processedAt: dbResult.rows[0].processed_at
      });
    }
    
    res.json({
      success: true,
      data: {
        processedMessages,
        total: processedMessages.length
      },
      message: `成功處理 ${processedMessages.length} 則訊息`
    });
  } catch (error) {
    console.error('Message processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get group statistics
app.get('/groups/:groupId/stats', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    
    // Get basic stats
    const statsResult = await pool.query(
      `SELECT 
         COUNT(*) as total_messages,
         COUNT(DISTINCT sender) as unique_senders,
         COUNT(CASE WHEN category = '學術討論' THEN 1 END) as academic_count,
         COUNT(CASE WHEN category = '技術討論' THEN 1 END) as tech_count,
         COUNT(CASE WHEN category = '工作相關' THEN 1 END) as work_count,
         COUNT(CASE WHEN category = '活動通知' THEN 1 END) as activity_count,
         COUNT(CASE WHEN category = '生活分享' THEN 1 END) as life_count,
         COUNT(CASE WHEN category = '問題求助' THEN 1 END) as help_count
       FROM messages 
       WHERE thread_id = $1`,
      [groupId]
    );
    
    // Get recent messages
    const recentResult = await pool.query(
      `SELECT * FROM messages 
       WHERE thread_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [groupId]
    );
    
    const stats = statsResult.rows[0];
    const categories = {
      '學術討論': stats.academic_count,
      '技術討論': stats.tech_count,
      '工作相關': stats.work_count,
      '活動通知': stats.activity_count,
      '生活分享': stats.life_count,
      '問題求助': stats.help_count
    };
    
    // Remove zero counts
    Object.keys(categories).forEach(key => {
      if (categories[key] === '0') {
        delete categories[key];
      }
    });
    
    res.json({
      success: true,
      data: {
        totalMessages: parseInt(stats.total_messages),
        uniqueSenders: parseInt(stats.unique_senders),
        categories,
        recentActivity: recentResult.rows
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all messages for dashboard
app.get('/api/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const result = await pool.query(
      `SELECT m.*, g.name as group_name 
       FROM messages m 
       LEFT JOIN groups g ON m.thread_id = g.thread_id 
       ORDER BY m.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get dashboard statistics
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    // Overall stats
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT thread_id) as total_groups,
        COUNT(DISTINCT sender) as total_senders,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as messages_today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as messages_week
      FROM messages
    `);
    
    // Category distribution
    const categoryStats = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM messages 
      WHERE category IS NOT NULL 
      GROUP BY category 
      ORDER BY count DESC
    `);
    
    // Recent activity
    const recentActivity = await pool.query(`
      SELECT m.*, g.name as group_name 
      FROM messages m 
      LEFT JOIN groups g ON m.thread_id = g.thread_id 
      ORDER BY m.created_at DESC 
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        overall: overallStats.rows[0],
        categories: categoryStats.rows,
        recentActivity: recentActivity.rows
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('正在關閉服務...');
  await pool.end();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Complete Messenger API Service with PostgreSQL running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📝 Process message: POST http://localhost:${PORT}/api/process-message`);
  console.log(`📋 Groups: http://localhost:${PORT}/groups`);
  console.log(`📨 Group messages: GET http://localhost:${PORT}/groups/:groupId/messages`);
  console.log(`📊 Dashboard stats: http://localhost:${PORT}/api/dashboard/stats`);
});
