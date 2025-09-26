const axios = require('axios');

class ClaudeService {
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY;
    this.baseUrl = 'https://api.anthropic.com/v1';
    this.model = 'claude-3-sonnet-20240229';
  }

  /**
   * Generate message summary using Claude
   */
  async generateSummary(message, user = null) {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    try {
      const prompt = `請為以下訊息生成簡潔的摘要（最多50字）：

用戶：${user || '未知'}
訊息：${message}

摘要：`;

      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: this.model,
          max_tokens: 100,
          temperature: 0.3,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          }
        }
      );

      return response.data.content[0].text.trim();
    } catch (error) {
      console.error('Claude API error:', error.response?.data || error.message);
      throw new Error('Failed to generate summary with Claude');
    }
  }

  /**
   * Classify message using Claude
   */
  async classifyMessage(message) {
    if (!this.apiKey) {
      return this.simpleClassification(message);
    }

    try {
      const prompt = `請將以下訊息分類到最適合的類別：

訊息：${message}

可選類別：
- 技術討論：程式開發、技術問題、代碼相關
- 工作相關：會議、專案、工作安排
- 生活分享：日常生活、休閒娛樂
- 問題求助：需要幫助的問題
- 活動通知：聚會、會議、活動
- 其他：不屬於上述類別

請只回傳類別名稱：`;

      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: this.model,
          max_tokens: 50,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          }
        }
      );

      const classification = response.data.content[0].text.trim();
      
      // Validate classification
      const validCategories = ['技術討論', '工作相關', '生活分享', '問題求助', '活動通知', '其他'];
      if (validCategories.includes(classification)) {
        return classification;
      }

      return '其他';
    } catch (error) {
      console.error('Claude classification error:', error.response?.data || error.message);
      return this.simpleClassification(message);
    }
  }

  /**
   * Extract key topics from messages
   */
  async extractTopics(messages) {
    if (!this.apiKey) {
      return [];
    }

    try {
      const messageTexts = messages.map(msg => `${msg.user}: ${msg.message}`).join('\n');
      
      const prompt = `請從以下群組訊息中提取主要話題（最多5個）：

${messageTexts}

主要話題：`;

      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: this.model,
          max_tokens: 200,
          temperature: 0.3,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          }
        }
      );

      const topics = response.data.content[0].text.trim();
      return topics.split('\n').filter(topic => topic.trim()).slice(0, 5);
    } catch (error) {
      console.error('Error extracting topics with Claude:', error);
      return [];
    }
  }

  /**
   * Generate intelligent response
   */
  async generateResponse(message, context = '') {
    if (!this.apiKey) {
      return '收到您的訊息，已記錄。';
    }

    try {
      const prompt = `作為一個智能助手，請為以下訊息生成適當的回應：

訊息：${message}
上下文：${context}

請生成一個友善、有用的回應（最多100字）：`;

      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: this.model,
          max_tokens: 150,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          }
        }
      );

      return response.data.content[0].text.trim();
    } catch (error) {
      console.error('Error generating response with Claude:', error);
      return '收到您的訊息，已記錄。';
    }
  }

  /**
   * Analyze sentiment
   */
  async analyzeSentiment(message) {
    if (!this.apiKey) {
      return { sentiment: 'neutral', score: 0, confidence: 0.5 };
    }

    try {
      const prompt = `請分析以下訊息的情感傾向：

訊息：${message}

請回傳 JSON 格式：
{
  "sentiment": "positive/negative/neutral",
  "score": -1.0 到 1.0 之間的分數,
  "confidence": 0.0 到 1.0 之間的信心度
}`;

      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: this.model,
          max_tokens: 100,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          }
        }
      );

      const result = response.data.content[0].text.trim();
      
      try {
        return JSON.parse(result);
      } catch (parseError) {
        console.error('Error parsing sentiment result:', parseError);
        return { sentiment: 'neutral', score: 0, confidence: 0.5 };
      }
    } catch (error) {
      console.error('Error analyzing sentiment with Claude:', error);
      return { sentiment: 'neutral', score: 0, confidence: 0.5 };
    }
  }

  /**
   * Process multiple messages in batch
   */
  async processMessages(messages) {
    const results = [];

    for (const message of messages) {
      try {
        const [summary, category, sentiment] = await Promise.all([
          this.generateSummary(message.message, message.user),
          this.classifyMessage(message.message),
          this.analyzeSentiment(message.message)
        ]);

        results.push({
          ...message,
          summary,
          category,
          sentiment: sentiment.sentiment,
          sentimentScore: sentiment.score,
          confidenceScore: sentiment.confidence
        });
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        results.push({
          ...message,
          summary: '摘要生成失敗',
          category: '其他',
          sentiment: 'neutral',
          sentimentScore: 0,
          confidenceScore: 0.5
        });
      }
    }

    return results;
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
}

module.exports = new ClaudeService();
