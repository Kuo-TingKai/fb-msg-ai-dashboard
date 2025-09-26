# AI 服務替代方案設定指南

## 🚨 Claude API 無法取得時的替代方案

### 1. OpenAI API (推薦替代方案)

#### 取得 OpenAI API 金鑰
1. 前往 [OpenAI Platform](https://platform.openai.com/)
2. 註冊或登入帳號
3. 前往 **"API Keys"** 頁面
4. 點擊 **"Create new secret key"**
5. 複製生成的 API 金鑰

#### 設定到專案
```bash
# 編輯 .env 檔案
nano .env

# 加入 OpenAI API 金鑰
OPENAI_API_KEY=sk-your-openai-api-key
```

### 2. HuggingFace API (免費選項)

#### 取得 HuggingFace API 金鑰
1. 前往 [HuggingFace](https://huggingface.co/)
2. 註冊或登入帳號
3. 前往 **"Settings"** → **"Access Tokens"**
4. 點擊 **"New token"**
5. 複製生成的 token

#### 設定到專案
```bash
# 編輯 .env 檔案
HUGGINGFACE_API_KEY=hf_your-huggingface-token
```

### 3. 本地 AI 模型 (完全免費)

#### 使用 Ollama
```bash
# 安裝 Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 下載模型
ollama pull llama2
ollama pull codellama

# 設定環境變數
echo "LOCAL_AI_ENABLED=true" >> .env
echo "OLLAMA_MODEL=llama2" >> .env
```

## 🛠️ 專案設定

### 更新服務配置
專案會自動選擇可用的 AI 服務：

```javascript
// 優先順序：Claude > OpenAI > HuggingFace > 本地模型
const aiService = process.env.CLAUDE_API_KEY ? 'claude' :
                  process.env.OPENAI_API_KEY ? 'openai' :
                  process.env.HUGGINGFACE_API_KEY ? 'huggingface' :
                  'local';
```

### 測試 AI 服務
```bash
# 啟動服務
./start.sh

# 測試 AI 功能
curl -X POST http://localhost:3001/api/test-ai \
  -H "Content-Type: application/json" \
  -d '{
    "message": "請分析這段程式碼：function hello() { console.log(\"Hello World\"); }",
    "service": "auto"
  }'
```

## 💰 成本比較

| 服務 | 免費額度 | 付費價格 | 程式碼分析能力 |
|------|----------|----------|----------------|
| Claude API | 無 | $15/月 | ⭐⭐⭐⭐⭐ |
| OpenAI API | $5 免費額度 | $20/月 | ⭐⭐⭐⭐ |
| HuggingFace | 免費 | 免費 | ⭐⭐⭐ |
| 本地模型 | 完全免費 | 免費 | ⭐⭐ |

## 🎯 推薦設定

### 開發階段
```bash
# 使用免費的 HuggingFace
HUGGINGFACE_API_KEY=hf_your-token
```

### 生產環境
```bash
# 使用 OpenAI (穩定且功能完整)
OPENAI_API_KEY=sk-your-openai-key
```

### 預算考量
```bash
# 使用本地模型 (完全免費)
LOCAL_AI_ENABLED=true
OLLAMA_MODEL=llama2
```

## 🔧 快速設定腳本

```bash
#!/bin/bash
# 自動設定 AI 服務

echo "選擇 AI 服務："
echo "1) OpenAI API"
echo "2) HuggingFace API"
echo "3) 本地模型 (Ollama)"
echo "4) 手動設定"

read -p "請選擇 (1-4): " choice

case $choice in
    1)
        read -p "請輸入 OpenAI API Key: " openai_key
        echo "OPENAI_API_KEY=$openai_key" >> .env
        echo "✅ OpenAI API 已設定"
        ;;
    2)
        read -p "請輸入 HuggingFace Token: " hf_token
        echo "HUGGINGFACE_API_KEY=$hf_token" >> .env
        echo "✅ HuggingFace API 已設定"
        ;;
    3)
        echo "LOCAL_AI_ENABLED=true" >> .env
        echo "OLLAMA_MODEL=llama2" >> .env
        echo "✅ 本地 AI 模型已設定"
        ;;
    4)
        echo "請手動編輯 .env 檔案"
        ;;
esac
```

## 📚 相關資源

- [OpenAI API 文檔](https://platform.openai.com/docs)
- [HuggingFace API 文檔](https://huggingface.co/docs/api-inference)
- [Ollama 安裝指南](https://ollama.ai/)
- [Claude Console](https://console.anthropic.com/)

---

**總結**: 即使無法取得 Claude API，我們仍有許多優秀的替代方案！
