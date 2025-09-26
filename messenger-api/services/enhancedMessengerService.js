const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const EventEmitter = require('events');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class EnhancedMessengerService extends EventEmitter {
  constructor() {
    super();
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
    this.messageQueue = [];
    this.isProcessing = false;
    this.lastMessageId = null;
    this.pollingInterval = null;
    this.conversationCache = new Map();
  }

  /**
   * Initialize browser with enhanced stealth settings
   */
  async initialize() {
    try {
      console.log('🚀 Initializing enhanced Messenger service...');
      
      // Launch browser with enhanced stealth settings
      this.browser = await puppeteer.launch({
        headless: process.env.NODE_ENV === 'production',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-blink-features=AutomationControlled',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images',
          '--disable-javascript',
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
        defaultViewport: { width: 1366, height: 768 },
        ignoreDefaultArgs: ['--enable-automation'],
        ignoreHTTPSErrors: true
      });

      this.page = await this.browser.newPage();
      
      // Enhanced user agent and headers
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

      // Enhanced request interception
      await this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        const resourceType = request.resourceType();
        const url = request.url();
        
        // Block unnecessary resources
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else if (url.includes('analytics') || url.includes('tracking')) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Handle console messages
      this.page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.log('Browser console error:', msg.text());
        }
      });

      // Handle page errors
      this.page.on('pageerror', (error) => {
        console.log('Page error:', error.message);
      });

      await this.login();
      await this.setupMessageListener();
      
      console.log('✅ Enhanced Messenger service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize enhanced Messenger service:', error);
      throw error;
    }
  }

  /**
   * Enhanced login with better error handling
   */
  async login() {
    try {
      console.log('🔐 Logging into Facebook Messenger with enhanced method...');
      
      // Navigate to Messenger login page
      await this.page.goto('https://www.messenger.com/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for page to fully load
      await this.page.waitForTimeout(2000);

      // Check if already logged in
      const isAlreadyLoggedIn = await this.page.evaluate(() => {
        return !document.querySelector('input[name="email"]') && 
               document.querySelector('[data-testid="message_list"]');
      });

      if (isAlreadyLoggedIn) {
        console.log('✅ Already logged in');
        this.isLoggedIn = true;
        return;
      }

      // Wait for login form
      await this.page.waitForSelector('input[name="email"]', { timeout: 15000 });
      
      // Clear and fill email
      await this.page.click('input[name="email"]', { clickCount: 3 });
      await this.page.type('input[name="email"]', process.env.FACEBOOK_EMAIL, { delay: 100 });
      
      // Clear and fill password
      await this.page.click('input[name="pass"]', { clickCount: 3 });
      await this.page.type('input[name="pass"]', process.env.FACEBOOK_PASSWORD, { delay: 100 });
      
      // Click login button
      await this.page.click('button[name="login"]');
      
      // Wait for navigation or potential security checks
      await this.handleLoginResponse();
      
      this.isLoggedIn = true;
      console.log('✅ Successfully logged into Messenger');
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  /**
   * Handle login response and security checks
   */
  async handleLoginResponse() {
    try {
      // Wait for either successful login or security check
      await Promise.race([
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        this.page.waitForSelector('input[name="approvals_code"]', { timeout: 30000 }),
        this.page.waitForSelector('button[data-testid="security_checkpoint_continue"]', { timeout: 30000 })
      ]);

      // Handle 2FA
      const twoFactorSelector = 'input[name="approvals_code"]';
      const twoFactorExists = await this.page.$(twoFactorSelector);
      
      if (twoFactorExists) {
        console.log('🔐 Two-factor authentication required');
        console.log('Please check your phone for the verification code');
        
        // Wait for user to enter 2FA code (with timeout)
        await this.page.waitForSelector('button[name="submit"]', { timeout: 300000 });
        await this.page.click('button[name="submit"]');
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }

      // Handle security checkpoint
      const securityCheckpointSelector = 'button[data-testid="security_checkpoint_continue"]';
      const securityCheckpointExists = await this.page.$(securityCheckpointSelector);
      
      if (securityCheckpointExists) {
        console.log('🛡️ Security checkpoint detected');
        await this.page.click(securityCheckpointSelector);
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }

      // Handle "Save Browser" prompt
      const saveBrowserSelector = 'button[data-testid="save_browser_button"]';
      const saveBrowserExists = await this.page.$(saveBrowserSelector);
      
      if (saveBrowserExists) {
        console.log('💾 Save browser prompt detected');
        await this.page.click(saveBrowserSelector);
        await this.page.waitForTimeout(2000);
      }

      // Verify login success
      const loginSuccess = await this.page.evaluate(() => {
        return document.querySelector('[data-testid="message_list"]') !== null;
      });

      if (!loginSuccess) {
        throw new Error('Login verification failed');
      }

    } catch (error) {
      console.error('❌ Login response handling failed:', error);
      throw error;
    }
  }

  /**
   * Navigate to specific conversation with caching
   */
  async navigateToConversation(threadId) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('Not logged in');
      }

      // Check cache first
      if (this.conversationCache.has(threadId)) {
        const cachedData = this.conversationCache.get(threadId);
        if (Date.now() - cachedData.timestamp < 300000) { // 5 minutes cache
          console.log(`📋 Using cached conversation data for: ${threadId}`);
          return cachedData.data;
        }
      }

      const conversationUrl = `https://www.messenger.com/t/${threadId}`;
      await this.page.goto(conversationUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for conversation to load
      await this.page.waitForSelector('[data-testid="message_list"]', { timeout: 15000 });
      
      // Cache the conversation data
      this.conversationCache.set(threadId, {
        data: { url: conversationUrl, loaded: true },
        timestamp: Date.now()
      });
      
      console.log(`✅ Navigated to conversation: ${threadId}`);
      return { url: conversationUrl, loaded: true };
    } catch (error) {
      console.error('❌ Failed to navigate to conversation:', error);
      throw error;
    }
  }

  /**
   * Enhanced message extraction with better parsing
   */
  async getMessages(limit = 50, since = null) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('Not logged in');
      }

      console.log(`📨 Fetching ${limit} messages with enhanced parsing...`);
      
      // Scroll to load more messages
      await this.scrollToLoadMessages(limit);
      
      // Enhanced message extraction
      const messages = await this.page.evaluate((msgLimit, sinceTimestamp) => {
        const messageElements = document.querySelectorAll('[data-testid="message"]');
        const extractedMessages = [];
        
        for (let i = 0; i < Math.min(messageElements.length, msgLimit); i++) {
          const element = messageElements[i];
          
          try {
            // Enhanced message data extraction
            const senderElement = element.querySelector('[data-testid="message_sender"]') || 
                                 element.querySelector('[data-testid="message_sender_name"]');
            const contentElement = element.querySelector('[data-testid="message_content"]') ||
                                 element.querySelector('[data-testid="message_text"]');
            const timestampElement = element.querySelector('[data-testid="message_timestamp"]') ||
                                   element.querySelector('[data-testid="message_time"]');
            
            // Extract attachments
            const attachmentElement = element.querySelector('[data-testid="message_attachment"]');
            const attachments = [];
            
            if (attachmentElement) {
              const images = attachmentElement.querySelectorAll('img');
              images.forEach(img => {
                attachments.push({
                  type: 'image',
                  url: img.src,
                  alt: img.alt
                });
              });
            }
            
            if (senderElement && contentElement) {
              const sender = senderElement.textContent?.trim() || 'Unknown';
              const content = contentElement.textContent?.trim() || '';
              const timestamp = timestampElement?.textContent?.trim() || '';
              
              // Generate unique message ID
              const messageId = `msg_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              // Calculate timestamp (more accurate)
              const now = new Date();
              const messageTime = new Date(now.getTime() - (messageElements.length - i) * 60000).toISOString();
              
              extractedMessages.push({
                id: messageId,
                time: messageTime,
                user: sender,
                message: content,
                timestamp: timestamp,
                attachments: attachments,
                threadId: window.location.pathname.split('/').pop(),
                elementIndex: i
              });
            }
          } catch (parseError) {
            console.log('Error parsing message element:', parseError);
            continue;
          }
        }
        
        // Filter by timestamp if provided
        if (sinceTimestamp) {
          return extractedMessages.filter(msg => new Date(msg.time) > new Date(sinceTimestamp));
        }
        
        return extractedMessages.reverse(); // Return in chronological order
      }, limit, since);

      console.log(`✅ Retrieved ${messages.length} messages with enhanced parsing`);
      return messages;
      
    } catch (error) {
      console.error('❌ Failed to get messages:', error);
      throw error;
    }
  }

  /**
   * Enhanced scrolling with better performance
   */
  async scrollToLoadMessages(limit) {
    try {
      const scrollAttempts = Math.ceil(limit / 20);
      let lastMessageCount = 0;
      let stableCount = 0;
      
      for (let i = 0; i < scrollAttempts; i++) {
        // Scroll to top to load older messages
        await this.page.evaluate(() => {
          const messageList = document.querySelector('[data-testid="message_list"]');
          if (messageList) {
            messageList.scrollTop = 0;
          }
        });

        await this.page.waitForTimeout(1500);
        
        // Check if new messages were loaded
        const currentMessageCount = await this.page.evaluate(() => {
          return document.querySelectorAll('[data-testid="message"]').length;
        });
        
        if (currentMessageCount === lastMessageCount) {
          stableCount++;
          if (stableCount >= 2) {
            break; // No more messages to load
          }
        } else {
          stableCount = 0;
          lastMessageCount = currentMessageCount;
        }
      }
    } catch (error) {
      console.log('⚠️ Enhanced scroll loading failed, continuing with available messages');
    }
  }

  /**
   * Enhanced message sending with better error handling
   */
  async sendMessage(message) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('Not logged in');
      }

      console.log(`📤 Sending message: ${message.substring(0, 50)}...`);
      
      // Find message input field with multiple selectors
      const inputSelectors = [
        '[data-testid="message_input"] textarea',
        '[data-testid="message_input"] input',
        'div[contenteditable="true"]',
        'textarea[placeholder*="message"]',
        'input[placeholder*="message"]'
      ];
      
      let inputElement = null;
      for (const selector of inputSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          inputElement = await this.page.$(selector);
          if (inputElement) break;
        } catch (e) {
          continue;
        }
      }
      
      if (!inputElement) {
        throw new Error('Could not find message input field');
      }
      
      // Clear and type message
      await inputElement.click({ clickCount: 3 });
      await inputElement.type(message, { delay: 50 });
      
      // Send message
      await this.page.keyboard.press('Enter');
      
      // Wait for message to be sent
      await this.page.waitForTimeout(2000);
      
      console.log('✅ Message sent successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Setup enhanced real-time message listener
   */
  async setupMessageListener() {
    try {
      // Start enhanced polling
      this.startEnhancedMessagePolling();
      
      // Setup DOM mutation observer
      await this.page.evaluate(() => {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.querySelector && node.querySelector('[data-testid="message"]')) {
                  window.dispatchEvent(new CustomEvent('newMessage', { 
                    detail: { timestamp: Date.now() } 
                  }));
                }
              });
            }
          });
        });
        
        const messageList = document.querySelector('[data-testid="message_list"]');
        if (messageList) {
          observer.observe(messageList, { childList: true, subtree: true });
        }
      });

      // Listen for new message events
      this.page.on('console', (msg) => {
        if (msg.text().includes('newMessage')) {
          this.handleNewMessage();
        }
      });

    } catch (error) {
      console.error('❌ Failed to setup enhanced message listener:', error);
    }
  }

  /**
   * Enhanced message polling with better performance
   */
  startEnhancedMessagePolling() {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkForNewMessages();
      } catch (error) {
        console.error('❌ Enhanced message polling error:', error);
      }
    }, 3000); // Check every 3 seconds for better responsiveness
  }

  /**
   * Enhanced new message checking
   */
  async checkForNewMessages() {
    try {
      const messages = await this.getMessages(5); // Check last 5 messages
      
      if (messages.length > 0) {
        const latestMessage = messages[messages.length - 1];
        
        if (this.lastMessageId !== latestMessage.id) {
          this.lastMessageId = latestMessage.id;
          this.emit('newMessage', latestMessage);
        }
      }
    } catch (error) {
      console.error('❌ Failed to check for new messages:', error);
    }
  }

  /**
   * Enhanced conversation list with better data
   */
  async getConversations() {
    try {
      if (!this.isLoggedIn) {
        throw new Error('Not logged in');
      }

      await this.page.goto('https://www.messenger.com/', {
        waitUntil: 'networkidle2'
      });

      const conversations = await this.page.evaluate(() => {
        const conversationElements = document.querySelectorAll('[data-testid="conversation"]');
        const conversations = [];
        
        conversationElements.forEach((element, index) => {
          try {
            const nameElement = element.querySelector('[data-testid="conversation_name"]');
            const lastMessageElement = element.querySelector('[data-testid="conversation_last_message"]');
            const timestampElement = element.querySelector('[data-testid="conversation_timestamp"]');
            const unreadElement = element.querySelector('[data-testid="unread_count"]');
            
            if (nameElement) {
              conversations.push({
                id: `conv_${index}`,
                name: nameElement.textContent?.trim() || 'Unknown',
                lastMessage: lastMessageElement?.textContent?.trim() || '',
                timestamp: timestampElement?.textContent?.trim() || '',
                unreadCount: unreadElement?.textContent?.trim() || '0',
                url: element.querySelector('a')?.href || '',
                isGroup: element.querySelector('[data-testid="group_icon"]') !== null
              });
            }
          } catch (parseError) {
            console.log('Error parsing conversation element:', parseError);
          }
        });
        
        return conversations;
      });

      return conversations;
    } catch (error) {
      console.error('❌ Failed to get conversations:', error);
      throw error;
    }
  }

  /**
   * Enhanced health check
   */
  async healthCheck() {
    try {
      if (!this.browser || !this.page || !this.isLoggedIn) {
        return { 
          status: 'unhealthy', 
          message: 'Not initialized or logged in',
          timestamp: new Date().toISOString()
        };
      }

      const pageStatus = await this.page.evaluate(() => ({
        readyState: document.readyState,
        url: window.location.href,
        hasMessageList: document.querySelector('[data-testid="message_list"]') !== null
      }));
      
      const isHealthy = pageStatus.readyState === 'complete' && pageStatus.hasMessageList;
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        message: isHealthy ? 'Service is running optimally' : 'Page not ready or not on Messenger',
        isLoggedIn: this.isLoggedIn,
        pageStatus: pageStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Enhanced cleanup
   */
  async close() {
    try {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
        this.conversationCache.clear();
      }
      
      console.log('✅ Enhanced Messenger service closed');
    } catch (error) {
      console.error('❌ Error closing enhanced Messenger service:', error);
    }
  }
}

module.exports = new EnhancedMessengerService();
