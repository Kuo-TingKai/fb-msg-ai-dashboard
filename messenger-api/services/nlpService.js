const axios = require('axios');

class NLPService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
  }

  /**
   * Generate summary using OpenAI
   */
  async generateSummary(message, user = null) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const prompt = `請為以下訊息生成簡潔的摘要（最多50字）：
      
用戶：${user || '未知'}
訊息：${message}

摘要：`;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一個專業的訊息摘要助手，能夠將長篇訊息轉換為簡潔明瞭的摘要。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      throw new Error('Failed to generate summary');
    }
  }

  /**
   * Classify message using HuggingFace
   */
  async classifyMessage(message) {
    if (!this.huggingfaceApiKey) {
      // Fallback to simple keyword-based classification
      return this.simpleClassification(message);
    }

    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
        {
          inputs: message,
          parameters: {
            candidate_labels: [
              '技術討論',
              '工作相關',
              '生活分享',
              '問題求助',
              '活動通知',
              '其他'
            ]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.huggingfaceApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data;
      if (result.labels && result.scores) {
        const maxScoreIndex = result.scores.indexOf(Math.max(...result.scores));
        return result.labels[maxScoreIndex];
      }

      return '其他';
    } catch (error) {
      console.error('HuggingFace API error:', error.response?.data || error.message);
      // Fallback to simple classification
      return this.simpleClassification(message);
    }
  }

  /**
   * Simple keyword-based classification (fallback)
   */
  simpleClassification(message) {
    const messageText = message.toLowerCase();
    
    const categories = {
      '技術討論': ['程式', '代碼', 'bug', 'error', 'api', 'database', 'server', '開發', '技術', 'code', 'programming'],
      '工作相關': ['工作', '會議', '專案', 'deadline', '報告', '客戶', '同事', '老闆', '工作', 'meeting', 'project'],
      '生活分享': ['吃飯', '電影', '音樂', '旅遊', '購物', '美食', '娛樂', '休閒', '生活', 'food', 'movie', 'travel'],
      '問題求助': ['問題', '求助', '幫忙', '如何', '怎麼', '為什麼', 'help', 'question', 'problem', 'issue'],
      '活動通知': ['活動', '聚會', '會議', '通知', '提醒', 'event', 'party', 'meeting', 'announcement']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => messageText.includes(keyword))) {
        return category;
      }
    }

    return '其他';
  }

  /**
   * Process multiple messages in batch
   */
  async processMessages(messages) {
    const results = [];

    for (const message of messages) {
      try {
        const [summary, category] = await Promise.all([
          this.generateSummary(message.message, message.user),
          this.classifyMessage(message.message)
        ]);

        results.push({
          ...message,
          summary,
          category
        });
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        results.push({
          ...message,
          summary: '摘要生成失敗',
          category: '其他'
        });
      }
    }

    return results;
  }

  /**
   * Extract key topics from messages
   */
  async extractTopics(messages) {
    if (!this.openaiApiKey) {
      return [];
    }

    try {
      const messageTexts = messages.map(msg => `${msg.user}: ${msg.message}`).join('\n');
      
      const prompt = `請從以下群組訊息中提取主要話題（最多5個）：
      
${messageTexts}

主要話題：`;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一個專業的話題分析助手，能夠從群組訊息中識別和提取主要話題。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const topics = response.data.choices[0].message.content.trim();
      return topics.split('\n').filter(topic => topic.trim()).slice(0, 5);
    } catch (error) {
      console.error('Error extracting topics:', error);
      return [];
    }
  }
}

module.exports = new NLPService();
