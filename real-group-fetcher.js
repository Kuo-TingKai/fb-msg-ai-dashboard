#!/usr/bin/env node

const puppeteer = require('puppeteer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class RealMessengerFetcher {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
  }

  async initialize() {
    try {
      console.log('🚀 初始化真實 Messenger 抓取器...');
      
      // Launch browser with stealth settings
      this.browser = await puppeteer.launch({
        headless: false, // 顯示瀏覽器以便觀察
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--no-default-browser-check',
          '--no-pings',
          '--password-store=basic',
          '--use-mock-keychain',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        ignoreHTTPSErrors: true
      });

      this.page = await this.browser.newPage();
      
      // Set realistic user agent
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set viewport
      await this.page.setViewport({ width: 1280, height: 720 });
      
      console.log('✅ 瀏覽器初始化完成');
      return true;
    } catch (error) {
      console.error('❌ 瀏覽器初始化失敗:', error.message);
      throw error;
    }
  }

  async loginToFacebook() {
    try {
      console.log('🔐 開始登入 Facebook...');
      
      // Navigate to Facebook login
      await this.page.goto('https://www.facebook.com/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for login form
      await this.page.waitForSelector('#email', { timeout: 10000 });
      
      // Fill credentials
      await this.page.type('#email', process.env.FACEBOOK_EMAIL);
      await this.page.type('#pass', process.env.FACEBOOK_PASSWORD);
      
      // Click login button
      await this.page.click('#loginbutton');
      
      // Wait for navigation
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      // Check if login successful
      const currentUrl = this.page.url();
      console.log(`📍 當前 URL: ${currentUrl}`);
      
      if (currentUrl.includes('facebook.com') && !currentUrl.includes('login')) {
        this.isLoggedIn = true;
        console.log('✅ Facebook 登入成功！');
        return true;
      } else {
        throw new Error('登入失敗，請檢查帳號密碼');
      }
    } catch (error) {
      console.error('❌ Facebook 登入失敗:', error.message);
      throw error;
    }
  }

  async navigateToGroup() {
    try {
      if (!this.isLoggedIn) {
        throw new Error('請先登入 Facebook');
      }

      const threadId = process.env.FACEBOOK_THREAD_ID;
      console.log(`📋 前往群組: ${threadId}`);
      
      const groupUrl = `https://www.facebook.com/messages/t/${threadId}`;
      console.log(`🔗 群組 URL: ${groupUrl}`);
      
      await this.page.goto(groupUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for group to load
      await this.page.waitForTimeout(5000);
      
      const currentUrl = this.page.url();
      console.log(`📍 群組 URL: ${currentUrl}`);
      
      if (currentUrl.includes(threadId)) {
        console.log('✅ 成功進入群組「複雜論主題讀書會」');
        return true;
      } else {
        throw new Error('無法進入指定群組');
      }
    } catch (error) {
      console.error('❌ 進入群組失敗:', error.message);
      throw error;
    }
  }

  async fetchGroupMessages(limit = 20) {
    try {
      console.log(`📨 開始抓取群組訊息 (最多 ${limit} 則)...`);
      
      // Wait for messages to load
      await this.page.waitForTimeout(3000);
      
      // Scroll up to load more messages
      await this.page.evaluate(() => {
        const messageContainer = document.querySelector('[role="log"]') || 
                                document.querySelector('[data-testid="message_list"]') ||
                                document.querySelector('.uiScrollableArea');
        if (messageContainer) {
          messageContainer.scrollTop = 0;
        }
      });

      await this.page.waitForTimeout(3000);

      // Extract messages
      const messages = await this.page.evaluate((msgLimit) => {
        // Try multiple selectors for messages
        const messageSelectors = [
          '[data-testid="message"]',
          '[data-testid="message_content"]',
          '.uiMessage',
          '.message',
          '[role="listitem"]',
          '[data-scope="messages_table"]'
        ];
        
        let messageElements = [];
        for (const selector of messageSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            messageElements = Array.from(elements);
            console.log(`Found ${elements.length} messages with selector: ${selector}`);
            break;
          }
        }
        
        // If no specific messages found, try to find any text content
        if (messageElements.length === 0) {
          const allElements = document.querySelectorAll('div, span, p');
          messageElements = Array.from(allElements).filter(el => {
            const text = el.textContent?.trim();
            return text && text.length > 10 && text.length < 500 && 
                   !text.includes('Facebook') && !text.includes('Messenger');
          });
        }
        
        const extractedMessages = [];
        
        for (let i = 0; i < Math.min(messageElements.length, msgLimit); i++) {
          const element = messageElements[i];
          
          // Try to find sender name
          let sender = 'Unknown';
          const senderSelectors = [
            '[data-testid="message_sender"]',
            '.uiMessageSender',
            '.sender',
            'strong',
            'b',
            'h4',
            'h5'
          ];
          
          for (const selector of senderSelectors) {
            const senderEl = element.querySelector(selector);
            if (senderEl && senderEl.textContent.trim()) {
              sender = senderEl.textContent.trim();
              break;
            }
          }
          
          // Try to find message content
          let content = '';
          const contentSelectors = [
            '[data-testid="message_content"]',
            '.uiMessageText',
            '.messageText',
            'span',
            'div',
            'p'
          ];
          
          for (const selector of contentSelectors) {
            const contentEl = element.querySelector(selector);
            if (contentEl && contentEl.textContent.trim()) {
              content = contentEl.textContent.trim();
              break;
            }
          }
          
          // If no specific content found, use element's text
          if (!content) {
            content = element.textContent.trim();
          }
          
          // Try to find timestamp
          let timestamp = '';
          const timeSelectors = [
            '[data-testid="message_timestamp"]',
            '.uiMessageTimestamp',
            'time',
            '[title*=":"]',
            '[aria-label*=":"]'
          ];
          
          for (const selector of timeSelectors) {
            const timeEl = element.querySelector(selector);
            if (timeEl && timeEl.textContent.trim()) {
              timestamp = timeEl.textContent.trim();
              break;
            }
          }
          
          if (content && content.length > 0 && !content.includes('Facebook') && !content.includes('Messenger')) {
            extractedMessages.push({
              id: `msg_${i}_${Date.now()}`,
              sender: sender,
              content: content,
              timestamp: timestamp,
              index: i,
              rawHtml: element.outerHTML.substring(0, 200) + '...' // 保存部分 HTML 用於調試
            });
          }
        }
        
        return extractedMessages.reverse(); // Return in chronological order
      }, limit);

      console.log(`✅ 成功抓取 ${messages.length} 則訊息`);
      
      // Display messages
      if (messages.length > 0) {
        console.log('\n📋 抓取到的真實訊息:');
        console.log('=' .repeat(80));
        messages.forEach((msg, index) => {
          console.log(`${index + 1}. [${msg.sender}] ${msg.content}`);
          if (msg.timestamp) {
            console.log(`   時間: ${msg.timestamp}`);
          }
          console.log('');
        });
        console.log('=' .repeat(80));
      } else {
        console.log('⚠️  沒有抓取到任何訊息，可能需要調整選擇器');
        console.log('🔍 嘗試獲取頁面結構資訊...');
        
        // Get page structure for debugging
        const pageInfo = await this.page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            bodyText: document.body.textContent.substring(0, 500),
            hasMessages: document.querySelector('[role="log"]') !== null,
            hasMessageList: document.querySelector('[data-testid="message_list"]') !== null
          };
        });
        
        console.log('📄 頁面資訊:', pageInfo);
      }
      
      return messages;
    } catch (error) {
      console.error('❌ 抓取訊息失敗:', error.message);
      throw error;
    }
  }

  async testAIIntegration(messages) {
    try {
      console.log('🤖 測試 AI 整合...');
      
      for (const message of messages.slice(0, 3)) { // 只處理前 3 則訊息
        console.log(`\n📝 處理訊息: "${message.content.substring(0, 50)}..."`);
        
        const response = await fetch('http://localhost:3002/api/process-message', {
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
      console.error('❌ AI 整合測試失敗:', error.message);
    }
  }

  async takeScreenshot(filename = 'messenger-group-screenshot.png') {
    try {
      await this.page.screenshot({ 
        path: filename, 
        fullPage: true 
      });
      console.log(`📸 截圖已保存: ${filename}`);
    } catch (error) {
      console.error('❌ 截圖失敗:', error.message);
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
  const fetcher = new RealMessengerFetcher();
  
  try {
    console.log('🧪 開始抓取真實 Messenger 群組「複雜論主題讀書會」訊息...\n');
    
    // Step 1: Initialize browser
    await fetcher.initialize();
    
    // Step 2: Login to Facebook
    await fetcher.loginToFacebook();
    
    // Step 3: Navigate to specific group
    await fetcher.navigateToGroup();
    
    // Step 4: Take screenshot for verification
    await fetcher.takeScreenshot('complex-theory-book-club.png');
    
    // Step 5: Fetch messages
    const messages = await fetcher.fetchGroupMessages(10);
    
    // Step 6: Test AI integration
    if (messages.length > 0) {
      await fetcher.testAIIntegration(messages);
    }
    
    console.log('\n🎉 真實 Messenger 群組訊息抓取完成！');
    console.log(`📊 總共抓取到 ${messages.length} 則真實訊息`);
    
  } catch (error) {
    console.error('❌ 抓取失敗:', error.message);
  } finally {
    // Keep browser open for 15 seconds to see results
    console.log('\n⏰ 瀏覽器將在 15 秒後關閉，您可以查看結果...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    await fetcher.close();
  }
}

// Run the test
main();
