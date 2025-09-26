# AI 服務比較與使用指南

## 🤖 支援的 AI 服務

本專案支援多種 AI 服務，您可以根據需求選擇最適合的方案：

### 1. OpenAI GPT
- **優點**：成熟穩定、功能完整、支援多種模型
- **缺點**：成本較高、API 限制較嚴格
- **適用場景**：一般文字處理、摘要生成、分類

### 2. Claude (Anthropic)
- **優點**：安全性高、理解能力強、支援長文本
- **缺點**：API 較新、成本中等
- **適用場景**：複雜分析、長文本處理、安全要求高的場景

### 3. Cursor AI
- **優點**：專為程式開發設計、程式碼理解能力強
- **缺點**：主要針對程式碼、功能相對專一
- **適用場景**：技術討論、程式碼分析、開發相關問題

## 🔧 服務配置

### 環境變數設定

```bash
# .env 檔案
# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Claude
CLAUDE_API_KEY=sk-ant-your-claude-key

# Cursor (假設的 API)
CURSOR_API_KEY=your-cursor-key

# HuggingFace (備用)
HUGGINGFACE_API_KEY=your-huggingface-key
```

### 服務選擇策略

```javascript
// 在 nlpService.js 中實現服務選擇邏輯
class NLPService {
  constructor() {
    this.services = {
      openai: require('./openaiService'),
      claude: require('./claudeService'),
      cursor: require('./cursorService'),
      huggingface: require('./huggingfaceService')
    };
    
    this.defaultService = this.getAvailableService();
  }

  getAvailableService() {
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.CLAUDE_API_KEY) return 'claude';
    if (process.env.CURSOR_API_KEY) return 'cursor';
    if (process.env.HUGGINGFACE_API_KEY) return 'huggingface';
    return 'simple'; // 備用簡單分類
  }

  async generateSummary(message, user) {
    const service = this.services[this.defaultService];
    return await service.generateSummary(message, user);
  }
}
```

## 📊 服務比較表

| 功能 | OpenAI | Claude | Cursor | HuggingFace |
|------|--------|--------|--------|-------------|
| 摘要生成 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 分類準確度 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 程式碼理解 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| 成本效益 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| API 穩定性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 中文支援 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

## 🚀 使用指南

### 1. OpenAI 設定

```javascript
// 取得 API Key
// 1. 前往 https://platform.openai.com/
// 2. 註冊帳號並取得 API Key
// 3. 設定環境變數

const openaiService = require('./services/openaiService');

// 使用範例
const summary = await openaiService.generateSummary(message, user);
const category = await openaiService.classifyMessage(message);
```

### 2. Claude 設定

```javascript
// 取得 API Key
// 1. 前往 https://console.anthropic.com/
// 2. 註冊帳號並取得 API Key
// 3. 設定環境變數

const claudeService = require('./services/claudeService');

// 使用範例
const summary = await claudeService.generateSummary(message, user);
const category = await claudeService.classifyMessage(message);
const sentiment = await claudeService.analyzeSentiment(message);
```

### 3. Cursor 設定

```javascript
// 注意：Cursor 目前主要是一個 IDE，API 可能需要額外設定
// 這裡提供的是假設的實作方式

const cursorService = require('./services/cursorService');

// 使用範例
const analysis = await cursorService.generateCodeAnalysis(message);
const documentation = await cursorService.generateDocumentation(message);
const testCases = await cursorService.generateTestCases(description);
```

## 🔄 動態服務切換

### 1. 基於訊息類型選擇服務

```javascript
async function selectServiceByMessageType(message) {
  const codeSnippets = cursorService.extractCodeSnippets(message);
  
  if (codeSnippets.length > 0) {
    return 'cursor'; // 程式碼相關使用 Cursor
  }
  
  if (message.length > 1000) {
    return 'claude'; // 長文本使用 Claude
  }
  
  return 'openai'; // 一般情況使用 OpenAI
}
```

### 2. 基於成本優化選擇

```javascript
async function selectServiceByCost(message) {
  const messageLength = message.length;
  
  if (messageLength < 100) {
    return 'huggingface'; // 短訊息使用免費服務
  }
  
  if (messageLength < 500) {
    return 'openai'; // 中等長度使用 OpenAI
  }
  
  return 'claude'; // 長文本使用 Claude
}
```

### 3. 基於可用性選擇

```javascript
async function selectAvailableService() {
  const services = ['openai', 'claude', 'cursor', 'huggingface'];
  
  for (const service of services) {
    try {
      await this.services[service].healthCheck();
      return service;
    } catch (error) {
      console.log(`${service} 不可用，嘗試下一個服務`);
    }
  }
  
  return 'simple'; // 所有服務都不可用時使用簡單分類
}
```

## 📈 效能監控

### 1. 服務回應時間監控

```javascript
class ServiceMonitor {
  constructor() {
    this.metrics = {
      openai: { count: 0, totalTime: 0, errors: 0 },
      claude: { count: 0, totalTime: 0, errors: 0 },
      cursor: { count: 0, totalTime: 0, errors: 0 }
    };
  }

  async measureService(serviceName, operation) {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.metrics[serviceName].count++;
      this.metrics[serviceName].totalTime += duration;
      
      return result;
    } catch (error) {
      this.metrics[serviceName].errors++;
      throw error;
    }
  }

  getAverageResponseTime(serviceName) {
    const metric = this.metrics[serviceName];
    return metric.count > 0 ? metric.totalTime / metric.count : 0;
  }
}
```

### 2. 成本追蹤

```javascript
class CostTracker {
  constructor() {
    this.costs = {
      openai: { requests: 0, tokens: 0, cost: 0 },
      claude: { requests: 0, tokens: 0, cost: 0 },
      cursor: { requests: 0, tokens: 0, cost: 0 }
    };
  }

  trackUsage(serviceName, tokens, cost) {
    this.costs[serviceName].requests++;
    this.costs[serviceName].tokens += tokens;
    this.costs[serviceName].cost += cost;
  }

  getDailyCost() {
    return Object.values(this.costs).reduce((total, cost) => total + cost.cost, 0);
  }
}
```

## 🛠️ 自訂服務整合

### 1. 新增自訂 AI 服務

```javascript
// services/customService.js
class CustomService {
  constructor() {
    this.apiKey = process.env.CUSTOM_API_KEY;
    this.baseUrl = 'https://api.custom-ai.com/v1';
  }

  async generateSummary(message, user) {
    // 實作自訂服務的摘要生成
    const response = await axios.post(`${this.baseUrl}/summarize`, {
      text: message,
      user: user
    });
    
    return response.data.summary;
  }

  async classifyMessage(message) {
    // 實作自訂服務的分類
    const response = await axios.post(`${this.baseUrl}/classify`, {
      text: message
    });
    
    return response.data.category;
  }
}

module.exports = new CustomService();
```

### 2. 服務註冊

```javascript
// 在 nlpService.js 中註冊新服務
const customService = require('./customService');

this.services.custom = customService;
```

## 🔒 安全考量

### 1. API Key 管理

```javascript
// 使用加密儲存 API Keys
const crypto = require('crypto');

class SecureKeyManager {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY;
  }

  encryptApiKey(apiKey) {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptApiKey(encryptedKey) {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

### 2. 速率限制

```javascript
class RateLimiter {
  constructor() {
    this.limits = {
      openai: { requests: 0, resetTime: 0, maxRequests: 60 },
      claude: { requests: 0, resetTime: 0, maxRequests: 100 },
      cursor: { requests: 0, resetTime: 0, maxRequests: 200 }
    };
  }

  async checkLimit(serviceName) {
    const limit = this.limits[serviceName];
    const now = Date.now();
    
    if (now > limit.resetTime) {
      limit.requests = 0;
      limit.resetTime = now + 60000; // 1分鐘重置
    }
    
    if (limit.requests >= limit.maxRequests) {
      throw new Error(`${serviceName} rate limit exceeded`);
    }
    
    limit.requests++;
  }
}
```

## 📚 最佳實踐

### 1. 服務選擇策略

- **開發階段**：使用 Cursor 進行程式碼相關分析
- **生產環境**：使用 Claude 進行一般文字處理
- **備用方案**：使用 HuggingFace 作為免費備選

### 2. 錯誤處理

```javascript
async function robustProcessMessage(message, user) {
  const services = ['claude', 'openai', 'huggingface', 'simple'];
  
  for (const serviceName of services) {
    try {
      const service = this.services[serviceName];
      return await service.generateSummary(message, user);
    } catch (error) {
      console.error(`${serviceName} failed:`, error.message);
      continue;
    }
  }
  
  return '無法生成摘要';
}
```

### 3. 快取策略

```javascript
class ResponseCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 3600000; // 1小時
  }

  get(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.ttl) {
      return item.data;
    }
    return null;
  }

  set(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }
}
```

---

**選擇最適合的 AI 服務，讓您的 Messenger Bot 更加智能和高效！**
