#!/usr/bin/env node

const puppeteer = require('puppeteer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class MessengerTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
  }

  async initialize() {
    try {
      console.log('🚀 初始化 Messenger 測試...');
      
      // Launch browser
      this.browser = await puppeteer.launch({
        headless: false, // 顯示瀏覽器以便觀察
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ],
        defaultViewport: { width: 1280, height: 720 }
      });

      this.page = await this.browser.newPage();
      
      // Set user agent
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      console.log('✅ 瀏覽器初始化完成');
      return true;
    } catch (error) {
      console.error('❌ 瀏覽器初始化失敗:', error);
      throw error;
    }
  }

  async login() {
    try {
      console.log('🔐 開始登入 Facebook Messenger...');
      
      // Navigate to Messenger login
      await this.page.goto('https://www.messenger.com/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for login form
      await this.page.waitForSelector('input[name="email"]', { timeout: 10000 });
      
      // Fill credentials
      await this.page.type('input[name="email"]', process.env.FACEBOOK_EMAIL);
      await this.page.type('input[name="pass"]', process.env.FACEBOOK_PASSWORD);
      
      // Click login
      await this.page.click('button[name="login"]');
      
      // Wait for navigation
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      // Check if login successful
      const isLoggedIn = await this.page.evaluate(() => {
        return !document.querySelector('input[name="email"]') && 
               document.querySelector('[data-testid="message_list"]');
      });

      if (isLoggedIn) {
        this.isLoggedIn = true;
        console.log('✅ 登入成功！');
        return true;
      } else {
        throw new Error('登入失敗');
      }
    } catch (error) {
      console.error('❌ 登入失敗:', error);
      throw error;
    }
  }

  async navigateToGroup() {
    try {
      if (!this.isLoggedIn) {
        throw new Error('請先登入');
      }

      const threadId = process.env.FACEBOOK_THREAD_ID;
      console.log(`📋 前往群組: ${threadId}`);
      
      const conversationUrl = `https://www.messenger.com/t/${threadId}`;
      await this.page.goto(conversationUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for conversation to load
      await this.page.waitForSelector('[data-testid="message_list"]', { timeout: 15000 });
      
      console.log('✅ 成功進入群組對話');
      return true;
    } catch (error) {
      console.error('❌ 無法進入群組:', error);
      throw error;
    }
  }

  async getMessages(limit = 10) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('請先登入');
      }

      console.log(`📨 抓取最近 ${limit} 則訊息...`);
      
      // Scroll to load messages
      await this.page.evaluate(() => {
        const messageList = document.querySelector('[data-testid="message_list"]');
        if (messageList) {
          messageList.scrollTop = 0;
        }
      });

      await this.page.waitForTimeout(2000);

      // Extract messages
      const messages = await this.page.evaluate((msgLimit) => {
        const messageElements = document.querySelectorAll('[data-testid="message"]');
        const extractedMessages = [];
        
        for (let i = 0; i < Math.min(messageElements.length, msgLimit); i++) {
          const element = messageElements[i];
          
          const senderElement = element.querySelector('[data-testid="message_sender"]');
          const contentElement = element.querySelector('[data-testid="message_content"]');
          const timestampElement = element.querySelector('[data-testid="message_timestamp"]');
          
          if (senderElement && contentElement) {
            extractedMessages.push({
              id: `msg_${i}_${Date.now()}`,
              sender: senderElement.textContent?.trim() || 'Unknown',
              content: contentElement.textContent?.trim() || '',
              timestamp: timestampElement?.textContent?.trim() || '',
              index: i
            });
          }
        }
        
        return extractedMessages.reverse(); // Return in chronological order
      }, limit);

      console.log(`✅ 成功抓取 ${messages.length} 則訊息`);
      return messages;
    } catch (error) {
      console.error('❌ 抓取訊息失敗:', error);
      throw error;
    }
  }

  async testAIIntegration(messages) {
    try {
      console.log('🤖 測試 AI 整合...');
      
      for (const message of messages) {
        console.log(`\n📝 處理訊息: ${message.content.substring(0, 50)}...`);
        
        // Call our AI service
        const response = await fetch('http://localhost:3001/api/process-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message.content,
            user: message.sender
          })
        });

        const result = await response.json();
        
        if (result.success) {
          console.log(`✅ 摘要: ${result.data.summary}`);
          console.log(`🏷️  分類: ${result.data.category}`);
        } else {
          console.log('❌ AI 處理失敗');
        }
      }
    } catch (error) {
      console.error('❌ AI 整合測試失敗:', error);
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
  const tester = new MessengerTester();
  
  try {
    await tester.initialize();
    await tester.login();
    await tester.navigateToGroup();
    
    const messages = await tester.getMessages(5);
    console.log('\n📋 抓取到的訊息:');
    messages.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.sender}] ${msg.content}`);
    });
    
    await tester.testAIIntegration(messages);
    
    console.log('\n🎉 Messenger 功能測試完成！');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  } finally {
    await tester.close();
  }
}

// Run the test
main();
