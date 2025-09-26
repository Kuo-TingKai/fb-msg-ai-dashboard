#!/usr/bin/env node

const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class MessengerAPITester {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
  }

  async testMessengerAPI() {
    try {
      console.log('🔍 測試 Messenger API 服務...');
      
      // Test if Messenger API service is running
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      if (data.status === 'OK') {
        console.log('✅ Messenger API 服務運行正常');
        return true;
      } else {
        console.log('❌ Messenger API 服務異常');
        return false;
      }
    } catch (error) {
      console.error('❌ Messenger API 測試失敗:', error.message);
      return false;
    }
  }

  async testGroupManagement() {
    try {
      console.log('📋 測試群組管理功能...');
      
      // Test group creation
      const createResponse = await fetch(`${this.baseUrl}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: '測試群組',
          threadId: process.env.FACEBOOK_THREAD_ID,
          description: '這是一個測試群組'
        })
      });

      const createResult = await createResponse.json();
      
      if (createResult.success) {
        console.log('✅ 群組建立成功');
        const groupId = createResult.data.id;
        
        // Test getting group info
        const getResponse = await fetch(`${this.baseUrl}/groups/${groupId}`);
        const getResult = await getResponse.json();
        
        if (getResult.success) {
          console.log('✅ 群組資訊獲取成功');
          console.log(`📋 群組名稱: ${getResult.data.name}`);
          console.log(`🆔 群組 ID: ${getResult.data.id}`);
          return true;
        } else {
          console.log('❌ 群組資訊獲取失敗');
          return false;
        }
      } else {
        console.log('❌ 群組建立失敗');
        return false;
      }
    } catch (error) {
      console.error('❌ 群組管理測試失敗:', error.message);
      return false;
    }
  }

  async testMessageFetching() {
    try {
      console.log('📨 測試訊息抓取功能...');
      
      // Test fetching messages from the configured group
      const threadId = process.env.FACEBOOK_THREAD_ID;
      const response = await fetch(`${this.baseUrl}/groups/${threadId}/messages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 訊息抓取成功');
        console.log(`📊 抓取到 ${result.data.messages.length} 則訊息`);
        
        if (result.data.messages.length > 0) {
          console.log('\n📋 最近的訊息:');
          result.data.messages.slice(0, 5).forEach((msg, index) => {
            console.log(`${index + 1}. [${msg.sender}] ${msg.content}`);
            console.log(`   時間: ${msg.timestamp}`);
            console.log('');
          });
        } else {
          console.log('⚠️  沒有抓取到任何訊息');
        }
        
        return true;
      } else {
        console.log('❌ 訊息抓取失敗');
        console.log('錯誤:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ 訊息抓取測試失敗:', error.message);
      return false;
    }
  }

  async testMessageProcessing() {
    try {
      console.log('🤖 測試訊息處理功能...');
      
      // Test processing a sample message
      const sampleMessage = {
        content: "今天開會討論了新的專案需求，需要在下週完成",
        sender: "測試用戶",
        timestamp: new Date().toISOString()
      };
      
      const response = await fetch(`${this.baseUrl}/api/process-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sampleMessage)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 訊息處理成功');
        console.log(`📝 原始訊息: ${sampleMessage.content}`);
        console.log(`📄 摘要: ${result.data.summary}`);
        console.log(`🏷️  分類: ${result.data.category}`);
        console.log(`⏰ 處理時間: ${result.data.processedAt}`);
        return true;
      } else {
        console.log('❌ 訊息處理失敗');
        return false;
      }
    } catch (error) {
      console.error('❌ 訊息處理測試失敗:', error.message);
      return false;
    }
  }

  async testDetailedHealth() {
    try {
      console.log('🔍 檢查詳細健康狀態...');
      
      const response = await fetch(`${this.baseUrl}/health/detailed`);
      const data = await response.json();
      
      if (data.status === 'OK') {
        console.log('✅ 詳細健康檢查通過');
        console.log('📊 服務狀態:');
        console.log(`  - AI 服務: ${data.services.ai ? '✅' : '❌'}`);
        console.log(`  - 資料庫: ${data.services.database ? '✅' : '❌'}`);
        console.log(`  - Messenger: ${data.services.messenger ? '✅' : '❌'}`);
        console.log(`  - 記憶體使用: ${data.system.memoryUsage}%`);
        console.log(`  - 運行時間: ${data.system.uptime}`);
        return true;
      } else {
        console.log('❌ 詳細健康檢查失敗');
        return false;
      }
    } catch (error) {
      console.error('❌ 詳細健康檢查失敗:', error.message);
      return false;
    }
  }

  async simulateRealMessageFlow() {
    try {
      console.log('🔄 模擬真實訊息流程...');
      
      // Simulate receiving a message from Messenger
      const simulatedMessages = [
        {
          content: "有人知道怎麼解決這個 bug 嗎？程式一直出現錯誤",
          sender: "張三",
          timestamp: new Date().toISOString()
        },
        {
          content: "今天開會討論了新的專案需求，需要在下週完成",
          sender: "李四",
          timestamp: new Date().toISOString()
        },
        {
          content: "推薦一家好吃的餐廳，大家有推薦嗎？",
          sender: "王五",
          timestamp: new Date().toISOString()
        }
      ];

      console.log('📨 模擬接收訊息...');
      
      for (const message of simulatedMessages) {
        console.log(`\n📝 處理訊息: "${message.content}"`);
        console.log(`👤 發送者: ${message.sender}`);
        
        const response = await fetch(`${this.baseUrl}/api/process-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message)
        });

        const result = await response.json();
        
        if (result.success) {
          console.log(`✅ 摘要: ${result.data.summary}`);
          console.log(`🏷️  分類: ${result.data.category}`);
        } else {
          console.log('❌ 處理失敗');
        }
      }
      
      console.log('\n🎉 模擬流程完成！');
      return true;
    } catch (error) {
      console.error('❌ 模擬流程失敗:', error.message);
      return false;
    }
  }
}

// Main execution
async function main() {
  const tester = new MessengerAPITester();
  
  try {
    console.log('🧪 開始 Messenger API 功能驗證測試...\n');
    
    // Test 1: Basic API health
    const apiTest = await tester.testMessengerAPI();
    
    // Test 2: Detailed health check
    const healthTest = await tester.testDetailedHealth();
    
    // Test 3: Message processing
    const processingTest = await tester.testMessageProcessing();
    
    // Test 4: Group management
    const groupTest = await tester.testGroupManagement();
    
    // Test 5: Message fetching
    const fetchTest = await tester.testMessageFetching();
    
    // Test 6: Simulate real flow
    const flowTest = await tester.simulateRealMessageFlow();
    
    // Summary
    console.log('\n📊 測試結果總結:');
    console.log(`API 服務: ${apiTest ? '✅' : '❌'}`);
    console.log(`健康檢查: ${healthTest ? '✅' : '❌'}`);
    console.log(`訊息處理: ${processingTest ? '✅' : '❌'}`);
    console.log(`群組管理: ${groupTest ? '✅' : '❌'}`);
    console.log(`訊息抓取: ${fetchTest ? '✅' : '❌'}`);
    console.log(`流程模擬: ${flowTest ? '✅' : '❌'}`);
    
    const allTestsPassed = apiTest && healthTest && processingTest && groupTest && fetchTest && flowTest;
    
    if (allTestsPassed) {
      console.log('\n🎉 所有測試通過！Messenger 功能完全正常！');
      console.log('\n📋 確認結果:');
      console.log('✅ 可以建立和管理群組');
      console.log('✅ 可以抓取群組訊息');
      console.log('✅ 可以處理和分類訊息');
      console.log('✅ AI 摘要功能正常');
      console.log('✅ 完整的訊息流程運作正常');
    } else {
      console.log('\n⚠️  部分測試失敗，請檢查相關設定');
    }
    
  } catch (error) {
    console.error('❌ 測試執行失敗:', error.message);
  }
}

// Run the test
main();
