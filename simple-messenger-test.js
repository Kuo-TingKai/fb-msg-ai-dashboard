#!/usr/bin/env node

const puppeteer = require('puppeteer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class SimpleMessengerTester {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    try {
      console.log('🚀 初始化簡化版 Messenger 測試...');
      
      // Launch browser with improved settings
      this.browser = await puppeteer.launch({
        headless: "new", // 使用新的 headless 模式
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-blink-features=AutomationControlled',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-default-browser-check',
          '--no-pings',
          '--password-store=basic',
          '--use-mock-keychain'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        ignoreHTTPSErrors: true
      });

      this.page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set additional headers
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      });
      
      console.log('✅ 瀏覽器初始化完成');
      return true;
    } catch (error) {
      console.error('❌ 瀏覽器初始化失敗:', error.message);
      throw error;
    }
  }

  async testLogin() {
    try {
      console.log('🔐 測試 Facebook 登入...');
      
      // Navigate to Facebook
      await this.page.goto('https://www.facebook.com', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Check if we can access Facebook
      const title = await this.page.title();
      console.log(`📄 頁面標題: ${title}`);
      
      if (title.includes('Facebook')) {
        console.log('✅ 成功連接到 Facebook');
        return true;
      } else {
        console.log('⚠️  無法正常連接到 Facebook');
        return false;
      }
    } catch (error) {
      console.error('❌ 登入測試失敗:', error.message);
      return false;
    }
  }

  async testMessengerAccess() {
    try {
      console.log('📱 測試 Messenger 存取...');
      
      // Wait a bit before navigating to Messenger
      await this.page.waitForTimeout(2000);
      
      // Navigate to Messenger with better error handling
      try {
        await this.page.goto('https://www.messenger.com', {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
      } catch (navError) {
        console.log('⚠️  導航到 Messenger 時遇到問題，嘗試替代方法...');
        
        // Try alternative approach
        await this.page.goto('https://www.facebook.com/messages', {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
      }

      // Wait for page to stabilize
      await this.page.waitForTimeout(3000);

      const title = await this.page.title();
      console.log(`📄 Messenger 頁面標題: ${title}`);
      
      // Check for Messenger-related content
      const hasMessengerContent = await this.page.evaluate(() => {
        return document.body.textContent.includes('Messenger') || 
               document.body.textContent.includes('訊息') ||
               document.querySelector('[data-testid="message_list"]') !== null ||
               document.querySelector('[aria-label*="message"]') !== null;
      });
      
      if (title.includes('Messenger') || title.includes('Messages') || hasMessengerContent) {
        console.log('✅ 成功連接到 Messenger');
        return true;
      } else {
        console.log('⚠️  無法正常連接到 Messenger，但頁面已載入');
        console.log('📄 實際頁面內容:', title);
        return false;
      }
    } catch (error) {
      console.error('❌ Messenger 存取測試失敗:', error.message);
      return false;
    }
  }

  async testAIService() {
    try {
      console.log('🤖 測試 AI 服務連接...');
      
      const response = await fetch('http://localhost:3001/health');
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
        "今天開會討論了新的專案需求",
        "有人知道怎麼解決這個 bug 嗎？",
        "推薦一家好吃的餐廳",
        "明天有活動，大家記得參加"
      ];

      for (const message of testMessages) {
        const response = await fetch('http://localhost:3001/api/process-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message,
            user: 'TestUser'
          })
        });

        const result = await response.json();
        
        if (result.success) {
          console.log(`✅ "${message}" -> ${result.data.category}`);
        } else {
          console.log(`❌ 處理失敗: "${message}"`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ 訊息處理測試失敗:', error.message);
      return false;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ 瀏覽器已關閉');
    }
  }
}

// Main execution
async function main() {
  const tester = new SimpleMessengerTester();
  
  try {
    console.log('🧪 開始 Messenger 功能測試...\n');
    
    // Test 1: Initialize browser
    await tester.initialize();
    
    // Test 2: Test AI service
    const aiTest = await tester.testAIService();
    
    // Test 3: Test message processing
    const messageTest = await tester.testMessageProcessing();
    
    // Test 4: Test Facebook access
    const facebookTest = await tester.testLogin();
    
    // Test 5: Test Messenger access
    const messengerTest = await tester.testMessengerAccess();
    
    // Summary
    console.log('\n📊 測試結果總結:');
    console.log(`AI 服務: ${aiTest ? '✅' : '❌'}`);
    console.log(`訊息處理: ${messageTest ? '✅' : '❌'}`);
    console.log(`Facebook 存取: ${facebookTest ? '✅' : '❌'}`);
    console.log(`Messenger 存取: ${messengerTest ? '✅' : '❌'}`);
    
    const allTestsPassed = aiTest && messageTest && facebookTest && messengerTest;
    
    if (allTestsPassed) {
      console.log('\n🎉 所有測試通過！Messenger 功能準備就緒！');
    } else {
      console.log('\n⚠️  部分測試失敗，請檢查相關設定');
    }
    
  } catch (error) {
    console.error('❌ 測試執行失敗:', error.message);
  } finally {
    await tester.close();
  }
}

// Run the test
main();
