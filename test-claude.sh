#!/bin/bash

# 簡化版測試腳本
echo "🧪 測試 Claude API 連接..."

# 載入環境變數
source .env

# 檢查 Claude API 金鑰
if [ -z "$CLAUDE_API_KEY" ]; then
    echo "❌ Claude API 金鑰未設定"
    exit 1
fi

echo "✅ Claude API 金鑰已設定"

# 測試 Claude API
echo "🔍 測試 Claude API 連接..."
node -e "
const axios = require('axios');

async function testClaude() {
    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-sonnet-20240229',
            max_tokens: 100,
            messages: [{
                role: 'user',
                content: 'Hello! Please respond with \"Claude API is working!\"'
            }]
        }, {
            headers: {
                'x-api-key': process.env.CLAUDE_API_KEY,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            }
        });
        
        console.log('✅ Claude API 測試成功!');
        console.log('回應:', response.data.content[0].text);
    } catch (error) {
        console.error('❌ Claude API 測試失敗:', error.response?.data || error.message);
    }
}

testClaude();
"
