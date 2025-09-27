#!/usr/bin/env node

const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = 3003;

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

// 靜態檔案服務
app.use(express.static(path.join(__dirname, 'web-dashboard.html')));

// 提供儀表板頁面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-dashboard.html'));
});

// API 端點 - 獲取儀表板統計
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    // 總體統計
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT thread_id) as total_groups,
        COUNT(DISTINCT sender) as total_senders,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as messages_today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as messages_week
      FROM messages
    `);
    
    // 分類統計
    const categoryStats = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM messages 
      WHERE category IS NOT NULL 
      GROUP BY category 
      ORDER BY count DESC
    `);
    
    // 最近活動
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

// API 端點 - 獲取群組列表
app.get('/api/groups', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*, COUNT(m.id) as message_count 
      FROM groups g 
      LEFT JOIN messages m ON g.thread_id = m.thread_id 
      GROUP BY g.id 
      ORDER BY g.created_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Groups fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 端點 - 獲取訊息列表
app.get('/api/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const category = req.query.category;
    
    let query = `
      SELECT m.*, g.name as group_name 
      FROM messages m 
      LEFT JOIN groups g ON m.thread_id = g.thread_id 
    `;
    
    const params = [];
    if (category) {
      query += ` WHERE m.category = $1`;
      params.push(category);
    }
    
    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
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

// API 端點 - 獲取時間趨勢數據
app.get('/api/trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    
    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as message_count,
        COUNT(DISTINCT sender) as unique_senders
      FROM messages 
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Trends fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 端點 - 獲取分類詳細統計
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        category,
        COUNT(*) as total_count,
        COUNT(DISTINCT sender) as unique_senders,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_count,
        AVG(LENGTH(content)) as avg_message_length
      FROM messages 
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY total_count DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Dashboard Server',
    message: '儀表板服務運行正常'
  });
});

// 錯誤處理中間件
app.use((error, req, res, next) => {
  console.error('Dashboard server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 啟動服務器
app.listen(PORT, () => {
  console.log(`🚀 Dashboard Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔍 API Health: http://localhost:${PORT}/health`);
  console.log(`📈 Stats API: http://localhost:${PORT}/api/dashboard/stats`);
});

// 優雅關閉
process.on('SIGINT', async () => {
  console.log('正在關閉儀表板服務...');
  await pool.end();
  process.exit(0);
});
