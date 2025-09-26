const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple AI service using basic text processing
class SimpleAIService {
  constructor() {
    this.categories = {
      '技術討論': ['程式', '代碼', 'bug', 'error', 'api', 'database', 'server', '開發', '技術', 'code', 'programming'],
      '工作相關': ['工作', '會議', '專案', 'deadline', '報告', '客戶', '同事', '老闆', '工作', 'meeting', 'project'],
      '生活分享': ['吃飯', '電影', '音樂', '旅遊', '購物', '美食', '娛樂', '休閒', '生活', 'food', 'movie', 'travel'],
      '問題求助': ['問題', '求助', '幫忙', '如何', '怎麼', '為什麼', 'help', 'question', 'problem', 'issue'],
      '活動通知': ['活動', '聚會', '會議', '通知', '提醒', 'event', 'party', 'meeting', 'announcement']
    };
  }

  generateSummary(message, user = null) {
    // Simple summary generation
    const words = message.split(' ');
    if (words.length <= 10) {
      return message;
    }
    return words.slice(0, 10).join(' ') + '...';
  }

  classifyMessage(message) {
    const messageText = message.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.categories)) {
      if (keywords.some(keyword => messageText.includes(keyword))) {
        return category;
      }
    }
    
    return '其他';
  }

  processMessage(message, user = null) {
    return {
      summary: this.generateSummary(message, user),
      category: this.classifyMessage(message),
      processedAt: new Date().toISOString()
    };
  }
}

const aiService = new SimpleAIService();

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Simple AI Service',
    message: '服務運行正常'
  });
});

app.post('/api/process-message', (req, res) => {
  try {
    const { message, user } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const result = aiService.processMessage(message, user);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/test', (req, res) => {
  const testMessage = "今天開會討論了新的專案需求，需要在下週完成";
  const result = aiService.processMessage(testMessage, "測試用戶");
  
  res.json({
    success: true,
    test: true,
    message: testMessage,
    result: result,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple AI Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📝 Process message: POST http://localhost:${PORT}/api/process-message`);
});
