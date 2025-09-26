#!/usr/bin/env node

const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class APITester {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
  }

  async testAIService() {
    try {
      console.log('🤖 測試 AI 服務連接...');
      
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      if (data.status === 'OK') {
        console.log('✅ AI 服務連接正常');
        return true;
      } else {
        console.log('❌ AI 服務連接失敗');
        return false;
      }
    } catch (error) {
      console.error('❌ AI 服務測試失敗:', error.message);
      return false;
    }
  }

  async testMessageProcessing() {
    try {
      console.log('📝 測試訊息處理功能...');
      
      const testMessages = [
        { message: "今天開會討論了新的專案需求", expected: "工作相關" },
        { message: "有人知道怎麼解決這個 bug 嗎？", expected: "技術討論" },
        { message: "推薦一家好吃的餐廳", expected: "生活分享" },
        { message: "明天有活動，大家記得參加", expected: "活動通知" },
        { message: "求助！我的電腦壞了", expected: "問題求助" }
      ];

      let successCount = 0;
      
      for (const testCase of testMessages) {
        const response = await fetch(`${this.baseUrl}/api/process-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: testCase.message,
            user: 'TestUser'
          })
        });

        const result = await response.json();
        
        if (result.success) {
          const isCorrect = result.data.category === testCase.expected;
          console.log(`${isCorrect ? '✅' : '⚠️'} "${testCase.message}" -> ${result.data.category} ${isCorrect ? '' : `(預期: ${testCase.expected})`}`);
          if (isCorrect) successCount++;
        } else {
          console.log(`❌ 處理失敗: "${testCase.message}"`);
        }
      }
      
      console.log(`📊 分類準確率: ${successCount}/${testMessages.length} (${Math.round(successCount/testMessages.length*100)}%)`);
      return successCount > 0;
    } catch (error) {
      console.error('❌ 訊息處理測試失敗:', error.message);
      return false;
    }
  }

  async testBatchProcessing() {
    try {
      console.log('📦 測試批次處理功能...');
      
      const batchMessages = [
        "今天天氣真好",
        "程式碼有問題需要修復",
        "會議時間改到下午三點",
        "有人要一起吃飯嗎？",
        "系統出現錯誤，請檢查"
      ];

      const results = [];
      
      for (const message of batchMessages) {
        const response = await fetch(`${this.baseUrl}/api/process-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message,
            user: 'BatchTest'
          })
        });

        const result = await response.json();
        results.push(result);
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ 批次處理完成: ${successCount}/${batchMessages.length} 成功`);
      
      return successCount === batchMessages.length;
    } catch (error) {
      console.error('❌ 批次處理測試失敗:', error.message);
      return false;
    }
  }

  async testPerformance() {
    try {
      console.log('⚡ 測試效能...');
      
      const startTime = Date.now();
      const testMessage = "這是一個效能測試訊息，用來檢查系統回應時間";
      
      const response = await fetch(`${this.baseUrl}/api/process-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: testMessage,
          user: 'PerformanceTest'
        })
      });

      const result = await response.json();
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (result.success) {
        console.log(`✅ 回應時間: ${responseTime}ms`);
        console.log(`📊 處理結果: ${result.data.category}`);
        return responseTime < 1000; // 期望回應時間小於 1 秒
      } else {
        console.log('❌ 效能測試失敗');
        return false;
      }
    } catch (error) {
      console.error('❌ 效能測試失敗:', error.message);
      return false;
    }
  }

  async testEnvironmentConfig() {
    try {
      console.log('⚙️  檢查環境設定...');
      
      const requiredVars = [
        'FACEBOOK_EMAIL',
        'FACEBOOK_PASSWORD', 
        'FACEBOOK_THREAD_ID',
        'CLAUDE_API_KEY'
      ];
      
      let configOk = true;
      
      for (const varName of requiredVars) {
        const value = process.env[varName];
        if (value && value !== 'your_email@example.com' && value !== 'your_password' && value !== 'your_group_thread_id') {
          console.log(`✅ ${varName}: 已設定`);
        } else {
          console.log(`⚠️  ${varName}: 未設定或使用預設值`);
          configOk = false;
        }
      }
      
      return configOk;
    } catch (error) {
      console.error('❌ 環境設定檢查失敗:', error.message);
      return false;
    }
  }
}

// Main execution
async function main() {
  const tester = new APITester();
  
  try {
    console.log('🧪 開始 Messenger API 功能測試...\n');
    
    // Test 1: Environment configuration
    const configTest = await tester.testEnvironmentConfig();
    
    // Test 2: AI service
    const aiTest = await tester.testAIService();
    
    // Test 3: Message processing
    const messageTest = await tester.testMessageProcessing();
    
    // Test 4: Batch processing
    const batchTest = await tester.testBatchProcessing();
    
    // Test 5: Performance
    const performanceTest = await tester.testPerformance();
    
    // Summary
    console.log('\n📊 測試結果總結:');
    console.log(`環境設定: ${configTest ? '✅' : '⚠️'}`);
    console.log(`AI 服務: ${aiTest ? '✅' : '❌'}`);
    console.log(`訊息處理: ${messageTest ? '✅' : '❌'}`);
    console.log(`批次處理: ${batchTest ? '✅' : '❌'}`);
    console.log(`效能測試: ${performanceTest ? '✅' : '❌'}`);
    
    const allTestsPassed = aiTest && messageTest && batchTest && performanceTest;
    
    if (allTestsPassed) {
      console.log('\n🎉 所有 API 測試通過！系統準備就緒！');
      console.log('\n📋 下一步建議:');
      console.log('1. 設定 n8n 工作流程');
      console.log('2. 建立資料庫連接');
      console.log('3. 設定儀表板');
    } else {
      console.log('\n⚠️  部分測試失敗，請檢查相關設定');
    }
    
  } catch (error) {
    console.error('❌ 測試執行失敗:', error.message);
  }
}

// Run the test
main();
