#!/usr/bin/env node

const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = 3002; // 固定使用端口 3002

app.use(cors());
app.use(express.json());

// Mock database for demonstration
let groups = [];
let messages = [];

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
    service: 'Complete Messenger API Service',
    message: '服務運行正常'
  });
});

// Detailed health check
app.get('/health/detailed', (req, res) => {
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
      uptime: process.uptime()
    }
  });
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
    res.json({
      success: true,
      data: { summary, category, processedAt: new Date().toISOString() },
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
    
    const group = {
      id: threadId || `group_${Date.now()}`,
      name: name || '未命名群組',
      threadId: threadId || process.env.FACEBOOK_THREAD_ID,
      description: description || '',
      createdAt: new Date().toISOString(),
      messageCount: 0
    };
    
    groups.push(group);
    
    res.json({
      success: true,
      data: group,
      message: '群組建立成功'
    });
  } catch (error) {
    console.error('Group creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/groups', (req, res) => {
  res.json({
    success: true,
    data: groups,
    count: groups.length
  });
});

app.get('/groups/:groupId', (req, res) => {
  const groupId = req.params.groupId;
  const group = groups.find(g => g.id === groupId);
  
  if (group) {
    res.json({
      success: true,
      data: group
    });
  } else {
    res.status(404).json({
      success: false,
      error: '群組不存在'
    });
  }
});

// Mock message fetching - simulate real Messenger messages
app.get('/groups/:groupId/messages', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const limit = parseInt(req.query.limit) || 20;
    
    // Check if group exists
    let group = groups.find(g => g.id === groupId);
    if (!group) {
      // Create group if it doesn't exist
      group = {
        id: groupId,
        name: `群組 ${groupId}`,
        threadId: groupId,
        description: '自動建立的群組',
        createdAt: new Date().toISOString(),
        messageCount: 0
      };
      groups.push(group);
    }
    
    // Generate mock messages for demonstration
    const mockMessages = [
      {
        id: `msg_${Date.now()}_1`,
        sender: '張三',
        content: '有人知道怎麼解決這個 bug 嗎？程式一直出現錯誤',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        groupId: groupId
      },
      {
        id: `msg_${Date.now()}_2`,
        sender: '李四',
        content: '今天開會討論了新的專案需求，需要在下週完成',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        groupId: groupId
      },
      {
        id: `msg_${Date.now()}_3`,
        sender: '王五',
        content: '推薦一家好吃的餐廳，大家有推薦嗎？',
        timestamp: new Date(Date.now() - 900000).toISOString(),
        groupId: groupId
      },
      {
        id: `msg_${Date.now()}_4`,
        sender: '趙六',
        content: '明天有活動，大家記得參加',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        groupId: groupId
      },
      {
        id: `msg_${Date.now()}_5`,
        sender: '孫七',
        content: '求助！我的電腦壞了，有人能幫忙嗎？',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        groupId: groupId
      }
    ];
    
    // Store messages
    messages.push(...mockMessages);
    
    // Update group message count
    group.messageCount = mockMessages.length;
    
    res.json({
      success: true,
      data: {
        group: group,
        messages: mockMessages.slice(0, limit),
        total: mockMessages.length
      },
      message: `成功抓取 ${mockMessages.length} 則訊息`
    });
  } catch (error) {
    console.error('Message fetching error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process group messages with AI
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
      
      processedMessages.push({
        ...message,
        summary,
        category,
        processedAt: new Date().toISOString()
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
app.get('/groups/:groupId/stats', (req, res) => {
  const groupId = req.params.groupId;
  const groupMessages = messages.filter(m => m.groupId === groupId);
  
  const stats = {
    totalMessages: groupMessages.length,
    uniqueSenders: [...new Set(groupMessages.map(m => m.sender))].length,
    categories: {},
    recentActivity: groupMessages.slice(-5)
  };
  
  // Count categories
  groupMessages.forEach(msg => {
    if (msg.category) {
      stats.categories[msg.category] = (stats.categories[msg.category] || 0) + 1;
    }
  });
  
  res.json({
    success: true,
    data: stats
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Complete Messenger API Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📝 Process message: POST http://localhost:${PORT}/api/process-message`);
  console.log(`📋 Groups: http://localhost:${PORT}/groups`);
  console.log(`📨 Group messages: GET http://localhost:${PORT}/groups/:groupId/messages`);
});
