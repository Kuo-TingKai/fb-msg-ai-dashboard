#!/bin/bash

echo "🧪 測試 HuggingFace API (免費)..."

# 測試 HuggingFace API
node -e "
const axios = require('axios');

async function testHuggingFace() {
    try {
        console.log('🔍 測試 HuggingFace API...');
        
        // 使用免費的 HuggingFace Inference API
        const response = await axios.post('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
            inputs: 'Hello! How are you?'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ HuggingFace API 測試成功!');
        console.log('回應:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ HuggingFace API 測試失敗:', error.response?.data || error.message);
    }
}

testHuggingFace();
"
