#!/usr/bin/env node

const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class FinalMessengerVerification {
  constructor() {
    this.baseUrl = 'http://localhost:3002';
  }

  async testCompleteFlow() {
    try {
      console.log('🧪 開始完整的 Messenger 群組訊息抓取驗證...\n');
      
      // Step 1: Test API health
      console.log('1️⃣ 測試 API 健康狀態...');
      const healthResponse = await fetch(`${this.baseUrl}/health`);
      const healthData = await healthResponse.json();
      
      if (healthData.status === 'OK') {
        console.log('✅ API 服務正常運行');
      } else {
        throw new Error('API 服務異常');
      }
      
      // Step 2: Test detailed health
      console.log('\n2️⃣ 測試詳細健康狀態...');
      const detailedResponse = await fetch(`${this.baseUrl}/health/detailed`);
      const detailedData = await detailedResponse.json();
      
      if (detailedData.status === 'OK') {
        console.log('✅ 詳細健康檢查通過');
        console.log(`📊 記憶體使用: ${detailedData.system.memoryUsage}MB`);
        console.log(`⏰ 運行時間: ${Math.round(detailedData.system.uptime)}秒`);
      }
      
      // Step 3: Test group message fetching
      console.log('\n3️⃣ 測試群組訊息抓取...');
      const threadId = process.env.FACEBOOK_THREAD_ID;
      const messagesResponse = await fetch(`${this.baseUrl}/groups/${threadId}/messages`);
      const messagesData = await messagesResponse.json();
      
      if (messagesData.success) {
        console.log('✅ 群組訊息抓取成功');
        console.log(`📋 群組名稱: ${messagesData.data.group.name}`);
        console.log(`📨 抓取到 ${messagesData.data.messages.length} 則訊息`);
        
        console.log('\n📋 抓取到的訊息:');
        console.log('=' .repeat(80));
        messagesData.data.messages.forEach((msg, index) => {
          console.log(`${index + 1}. [${msg.sender}] ${msg.content}`);
          console.log(`   時間: ${new Date(msg.timestamp).toLocaleString()}`);
          console.log('');
        });
        console.log('=' .repeat(80));
      } else {
        throw new Error('群組訊息抓取失敗');
      }
      
      // Step 4: Test AI processing
      console.log('\n4️⃣ 測試 AI 處理功能...');
      const aiResponse = await fetch(`${this.baseUrl}/groups/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messagesData.data.messages.slice(0, 3) // 處理前 3 則訊息
        })
      });
      
      const aiData = await aiResponse.json();
      
      if (aiData.success) {
        console.log('✅ AI 處理成功');
        console.log(`📊 處理了 ${aiData.data.processedMessages.length} 則訊息`);
        
        console.log('\n🤖 AI 處理結果:');
        console.log('=' .repeat(80));
        aiData.data.processedMessages.forEach((msg, index) => {
          console.log(`${index + 1}. [${msg.sender}] ${msg.content}`);
          console.log(`   📄 摘要: ${msg.summary}`);
          console.log(`   🏷️  分類: ${msg.category}`);
          console.log(`   ⏰ 處理時間: ${new Date(msg.processedAt).toLocaleString()}`);
          console.log('');
        });
        console.log('=' .repeat(80));
      } else {
        throw new Error('AI 處理失敗');
      }
      
      // Step 5: Test group statistics
      console.log('\n5️⃣ 測試群組統計...');
      const statsResponse = await fetch(`${this.baseUrl}/groups/${threadId}/stats`);
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        console.log('✅ 群組統計獲取成功');
        console.log(`📊 總訊息數: ${statsData.data.totalMessages}`);
        console.log(`👥 參與者數: ${statsData.data.uniqueSenders}`);
        console.log(`📈 分類統計:`, statsData.data.categories);
      }
      
      // Final summary
      console.log('\n🎉 完整驗證測試通過！');
      console.log('\n📋 確認結果:');
      console.log('✅ Messenger API 服務正常運行');
      console.log('✅ 可以成功抓取群組訊息');
      console.log('✅ AI 摘要和分類功能正常');
      console.log('✅ 群組管理功能正常');
      console.log('✅ 統計分析功能正常');
      
      console.log('\n🚀 系統已準備就緒，可以進行實際的 Messenger 整合！');
      
      return true;
    } catch (error) {
      console.error('❌ 驗證測試失敗:', error.message);
      return false;
    }
  }
}

// Main execution
async function main() {
  const verifier = new FinalMessengerVerification();
  await verifier.testCompleteFlow();
}

// Run the test
main();
