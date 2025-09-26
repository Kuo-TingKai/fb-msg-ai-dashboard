const axios = require('axios');

class CursorService {
  constructor() {
    // 注意：Cursor 目前沒有公開的 API
    // 這個服務是為了示範如何整合程式碼分析功能
    // 實際使用時建議使用 Claude 或 OpenAI
    this.apiKey = process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY;
    this.baseUrl = process.env.CLAUDE_API_KEY ? 
      'https://api.anthropic.com/v1' : 
      'https://api.openai.com/v1';
    this.model = process.env.CLAUDE_API_KEY ? 'claude-3-sonnet-20240229' : 'gpt-4';
  }

  /**
   * Generate code suggestions and analysis
   * 使用 Claude 或 OpenAI 來提供類似 Cursor 的程式碼分析功能
   */
  async generateCodeAnalysis(message) {
    if (!this.apiKey) {
      throw new Error('AI API key not configured (Claude or OpenAI)');
    }

    try {
      const prompt = `分析以下訊息中提到的技術問題，並提供程式碼建議：

訊息：${message}

請提供：
1. 問題分析
2. 可能的解決方案
3. 相關的程式碼範例（如果適用）`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一個專業的程式開發助手，擅長分析技術問題並提供解決方案。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Cursor API error:', error.response?.data || error.message);
      throw new Error('Failed to generate code analysis');
    }
  }

  /**
   * Generate technical documentation
   */
  async generateDocumentation(message, context = '') {
    if (!this.apiKey) {
      return '無法生成文檔，請檢查 API 配置。';
    }

    try {
      const prompt = `基於以下技術討論，生成簡潔的文檔：

訊息：${message}
上下文：${context}

請生成：
1. 問題描述
2. 解決步驟
3. 注意事項`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一個技術文檔專家，能夠將技術討論轉換為清晰的文檔。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.2
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating documentation:', error);
      return '文檔生成失敗。';
    }
  }

  /**
   * Analyze code quality and suggest improvements
   */
  async analyzeCodeQuality(codeSnippet, language = 'javascript') {
    if (!this.apiKey) {
      throw new Error('Cursor API key not configured');
    }

    try {
      const prompt = `分析以下 ${language} 程式碼的品質，並提供改進建議：

\`\`\`${language}
${codeSnippet}
\`\`\`

請提供：
1. 程式碼品質評分（1-10）
2. 主要問題點
3. 改進建議
4. 最佳實踐建議`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `你是一個 ${language} 程式碼審查專家，能夠識別程式碼問題並提供改進建議。`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 400,
          temperature: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error analyzing code quality:', error);
      throw new Error('Failed to analyze code quality');
    }
  }

  /**
   * Generate test cases
   */
  async generateTestCases(description, language = 'javascript') {
    if (!this.apiKey) {
      throw new Error('Cursor API key not configured');
    }

    try {
      const prompt = `為以下功能描述生成測試案例：

功能描述：${description}
程式語言：${language}

請提供：
1. 單元測試案例
2. 邊界條件測試
3. 錯誤處理測試
4. 測試資料範例`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `你是一個 ${language} 測試專家，能夠為各種功能生成完整的測試案例。`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.2
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating test cases:', error);
      throw new Error('Failed to generate test cases');
    }
  }

  /**
   * Process technical messages with Cursor
   */
  async processTechnicalMessage(message, user = null) {
    if (!this.apiKey) {
      return {
        summary: '技術分析不可用',
        analysis: '請檢查 Cursor API 配置',
        documentation: '文檔生成不可用'
      };
    }

    try {
      const [analysis, documentation] = await Promise.all([
        this.generateCodeAnalysis(message),
        this.generateDocumentation(message, `用戶：${user}`)
      ]);

      return {
        summary: `技術分析完成 - ${message.substring(0, 50)}...`,
        analysis: analysis,
        documentation: documentation,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error processing technical message:', error);
      return {
        summary: '技術分析失敗',
        analysis: '無法生成分析',
        documentation: '無法生成文檔',
        error: error.message
      };
    }
  }

  /**
   * Extract code snippets from message
   */
  extractCodeSnippets(message) {
    const codePatterns = [
      /```(\w+)?\n([\s\S]*?)```/g,  // Markdown code blocks
      /`([^`]+)`/g,                   // Inline code
      /<code[^>]*>([\s\S]*?)<\/code>/g, // HTML code tags
      /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?}/g, // JavaScript functions
      /class\s+\w+\s*{[\s\S]*?}/g,    // JavaScript classes
      /def\s+\w+\s*\([^)]*\):[\s\S]*?(?=\n\w|\n$)/g, // Python functions
    ];

    const snippets = [];
    
    for (const pattern of codePatterns) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        snippets.push({
          language: match[1] || 'unknown',
          code: match[2] || match[1] || match[0],
          type: 'code_block'
        });
      }
    }

    return snippets;
  }

  /**
   * Detect programming language from code snippet
   */
  detectLanguage(codeSnippet) {
    const languagePatterns = {
      'javascript': [
        /function\s+\w+\s*\(/,
        /const\s+\w+\s*=/,
        /let\s+\w+\s*=/,
        /var\s+\w+\s*=/,
        /console\.log/,
        /require\(/,
        /import\s+.*\s+from/
      ],
      'python': [
        /def\s+\w+\s*\(/,
        /import\s+\w+/,
        /from\s+\w+\s+import/,
        /print\s*\(/,
        /if\s+__name__\s*==\s*['"]__main__['"]/,
        /class\s+\w+\s*\(/
      ],
      'java': [
        /public\s+class\s+\w+/,
        /public\s+static\s+void\s+main/,
        /System\.out\.print/,
        /import\s+java\./,
        /private\s+\w+\s+\w+/
      ],
      'cpp': [
        /#include\s*<[^>]+>/,
        /using\s+namespace\s+std/,
        /int\s+main\s*\(/,
        /cout\s*<</
      ],
      'sql': [
        /SELECT\s+.*\s+FROM/i,
        /INSERT\s+INTO/i,
        /UPDATE\s+.*\s+SET/i,
        /DELETE\s+FROM/i,
        /CREATE\s+TABLE/i
      ]
    };

    for (const [language, patterns] of Object.entries(languagePatterns)) {
      if (patterns.some(pattern => pattern.test(codeSnippet))) {
        return language;
      }
    }

    return 'unknown';
  }

  /**
   * Generate code review comments
   */
  async generateCodeReview(codeSnippet, language = 'javascript') {
    if (!this.apiKey) {
      return '無法生成程式碼審查，請檢查 API 配置。';
    }

    try {
      const prompt = `請對以下 ${language} 程式碼進行審查：

\`\`\`${language}
${codeSnippet}
\`\`\`

請提供：
1. 程式碼品質評估
2. 潛在問題
3. 改進建議
4. 最佳實踐建議`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `你是一個 ${language} 程式碼審查專家，能夠提供專業的程式碼審查意見。`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 400,
          temperature: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating code review:', error);
      return '程式碼審查生成失敗。';
    }
  }
}

module.exports = new CursorService();
