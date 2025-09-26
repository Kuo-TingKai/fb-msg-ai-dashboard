const puppeteer = require('puppeteer');
const EventEmitter = require('events');

class ModernMessengerService extends EventEmitter {
  constructor() {
    super();
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
    this.messageQueue = [];
    this.isProcessing = false;
    this.lastMessageId = null;
    this.pollingInterval = null;
  }

  /**
   * Initialize browser and login to Facebook Messenger
   */
  async initialize() {
    try {
      console.log('🚀 Initializing modern Messenger service...');
      
      // Launch browser with optimized settings
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
          '--disable-features=VizDisplayCompositor'
        ],
        defaultViewport: { width: 1280, height: 720 },
        ignoreDefaultArgs: ['--disable-extensions']
      });

      this.page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Enable request interception for better performance
      await this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      await this.login();
      await this.setupMessageListener();
      
      console.log('✅ Modern Messenger service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Messenger service:', error);
      throw error;
    }
  }

  /**
   * Login to Facebook Messenger
   */
  async login() {
    try {
      console.log('🔐 Logging into Facebook Messenger...');
      
      await this.page.goto('https://www.messenger.com/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for login form
      await this.page.waitForSelector('input[name="email"]', { timeout: 10000 });
      
      // Fill login credentials
      await this.page.type('input[name="email"]', process.env.FACEBOOK_EMAIL);
      await this.page.type('input[name="pass"]', process.env.FACEBOOK_PASSWORD);
      
      // Click login button
      await this.page.click('button[name="login"]');
      
      // Wait for navigation to complete
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      // Check if login was successful
      const isLoggedIn = await this.page.evaluate(() => {
        return !document.querySelector('input[name="email"]');
      });

      if (!isLoggedIn) {
        throw new Error('Login failed - please check credentials');
      }

      this.isLoggedIn = true;
      console.log('✅ Successfully logged into Messenger');
      
      // Handle potential security checks
      await this.handleSecurityChecks();
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  /**
   * Handle Facebook security checks (2FA, suspicious login, etc.)
   */
  async handleSecurityChecks() {
    try {
      // Check for 2FA prompt
      const twoFactorSelector = 'input[name="approvals_code"]';
      const twoFactorExists = await this.page.$(twoFactorSelector);
      
      if (twoFactorExists) {
        console.log('🔐 Two-factor authentication required');
        console.log('Please check your phone for the verification code');
        
        // Wait for user to manually enter 2FA code
        await this.page.waitForSelector('button[name="submit"]', { timeout: 300000 });
        await this.page.click('button[name="submit"]');
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }

      // Check for suspicious login prompt
      const suspiciousLoginSelector = 'button[data-testid="security_checkpoint_continue"]';
      const suspiciousLoginExists = await this.page.$(suspiciousLoginSelector);
      
      if (suspiciousLoginExists) {
        console.log('🛡️ Security checkpoint detected');
        await this.page.click(suspiciousLoginSelector);
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }

      // Check for "Save Browser" prompt
      const saveBrowserSelector = 'button[data-testid="save_browser_button"]';
      const saveBrowserExists = await this.page.$(saveBrowserSelector);
      
      if (saveBrowserExists) {
        console.log('💾 Save browser prompt detected');
        await this.page.click(saveBrowserSelector);
        await this.page.waitForTimeout(2000);
      }

    } catch (error) {
      console.log('ℹ️ No security checks required or handled');
    }
  }

  /**
   * Navigate to specific conversation
   */
  async navigateToConversation(threadId) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('Not logged in');
      }

      const conversationUrl = `https://www.messenger.com/t/${threadId}`;
      await this.page.goto(conversationUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for conversation to load
      await this.page.waitForSelector('[data-testid="message_list"]', { timeout: 10000 });
      
      console.log(`✅ Navigated to conversation: ${threadId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to navigate to conversation:', error);
      throw error;
    }
  }

  /**
   * Get messages from current conversation
   */
  async getMessages(limit = 50, since = null) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('Not logged in');
      }

      console.log(`📨 Fetching ${limit} messages...`);
      
      // Scroll to load more messages if needed
      await this.scrollToLoadMessages(limit);
      
      // Extract messages from the page
      const messages = await this.page.evaluate((msgLimit, sinceTimestamp) => {
        const messageElements = document.querySelectorAll('[data-testid="message"]');
        const extractedMessages = [];
        
        for (let i = 0; i < Math.min(messageElements.length, msgLimit); i++) {
          const element = messageElements[i];
          
          // Extract message data
          const senderElement = element.querySelector('[data-testid="message_sender"]');
          const contentElement = element.querySelector('[data-testid="message_content"]');
          const timestampElement = element.querySelector('[data-testid="message_timestamp"]');
          
          if (senderElement && contentElement) {
            const sender = senderElement.textContent?.trim() || 'Unknown';
            const content = contentElement.textContent?.trim() || '';
            const timestamp = timestampElement?.textContent?.trim() || '';
            
            // Convert timestamp to ISO string (simplified)
            const now = new Date();
            const messageTime = new Date(now.getTime() - (messageElements.length - i) * 60000).toISOString();
            
            extractedMessages.push({
              id: `msg_${i}_${Date.now()}`,
              time: messageTime,
              user: sender,
              message: content,
              timestamp: timestamp,
              threadId: window.location.pathname.split('/').pop()
            });
          }
        }
        
        // Filter by timestamp if provided
        if (sinceTimestamp) {
          return extractedMessages.filter(msg => new Date(msg.time) > new Date(sinceTimestamp));
        }
        
        return extractedMessages.reverse(); // Return in chronological order
      }, limit, since);

      console.log(`✅ Retrieved ${messages.length} messages`);
      return messages;
      
    } catch (error) {
      console.error('❌ Failed to get messages:', error);
      throw error;
    }
  }

  /**
   * Scroll to load more messages
   */
  async scrollToLoadMessages(limit) {
    try {
      const scrollHeight = await this.page.evaluate(() => document.body.scrollHeight);
      let currentHeight = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = Math.ceil(limit / 20); // Approximate messages per scroll

      while (scrollAttempts < maxScrollAttempts) {
        await this.page.evaluate(() => {
          const messageList = document.querySelector('[data-testid="message_list"]');
          if (messageList) {
            messageList.scrollTop = 0; // Scroll to top to load older messages
          }
        });

        await this.page.waitForTimeout(1000);
        
        const newHeight = await this.page.evaluate(() => document.body.scrollHeight);
        if (newHeight === currentHeight) {
          break; // No more content to load
        }
        
        currentHeight = newHeight;
        scrollAttempts++;
      }
    } catch (error) {
      console.log('⚠️ Scroll loading failed, continuing with available messages');
    }
  }

  /**
   * Send message to current conversation
   */
  async sendMessage(message) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('Not logged in');
      }

      console.log(`📤 Sending message: ${message.substring(0, 50)}...`);
      
      // Find message input field
      const inputSelector = '[data-testid="message_input"] textarea, [data-testid="message_input"] input';
      await this.page.waitForSelector(inputSelector, { timeout: 10000 });
      
      // Type message
      await this.page.type(inputSelector, message);
      
      // Send message (Enter key or send button)
      await this.page.keyboard.press('Enter');
      
      // Wait for message to be sent
      await this.page.waitForTimeout(1000);
      
      console.log('✅ Message sent successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Setup real-time message listener
   */
  async setupMessageListener() {
    try {
      // Start polling for new messages
      this.startMessagePolling();
      
      // Listen for DOM changes
      await this.page.evaluate(() => {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.querySelector('[data-testid="message"]')) {
                  // New message detected
                  window.dispatchEvent(new CustomEvent('newMessage'));
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
      console.error('❌ Failed to setup message listener:', error);
    }
  }

  /**
   * Start polling for new messages
   */
  startMessagePolling() {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkForNewMessages();
      } catch (error) {
        console.error('❌ Message polling error:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check for new messages
   */
  async checkForNewMessages() {
    try {
      const messages = await this.getMessages(10);
      
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
   * Handle new message event
   */
  async handleNewMessage() {
    try {
      const messages = await this.getMessages(1);
      if (messages.length > 0) {
        const newMessage = messages[messages.length - 1];
        this.emit('message', newMessage);
      }
    } catch (error) {
      console.error('❌ Failed to handle new message:', error);
    }
  }

  /**
   * Get conversation list
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
          const nameElement = element.querySelector('[data-testid="conversation_name"]');
          const lastMessageElement = element.querySelector('[data-testid="conversation_last_message"]');
          const timestampElement = element.querySelector('[data-testid="conversation_timestamp"]');
          
          if (nameElement) {
            conversations.push({
              id: `conv_${index}`,
              name: nameElement.textContent?.trim() || 'Unknown',
              lastMessage: lastMessageElement?.textContent?.trim() || '',
              timestamp: timestampElement?.textContent?.trim() || '',
              url: element.querySelector('a')?.href || ''
            });
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
   * Take screenshot for debugging
   */
  async takeScreenshot(filename = 'messenger-debug.png') {
    try {
      if (this.page) {
        await this.page.screenshot({ path: filename, fullPage: true });
        console.log(`📸 Screenshot saved: ${filename}`);
      }
    } catch (error) {
      console.error('❌ Failed to take screenshot:', error);
    }
  }

  /**
   * Close browser and cleanup
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
      }
      
      console.log('✅ Messenger service closed');
    } catch (error) {
      console.error('❌ Error closing Messenger service:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.browser || !this.page || !this.isLoggedIn) {
        return { status: 'unhealthy', message: 'Not initialized or logged in' };
      }

      const isPageAlive = await this.page.evaluate(() => document.readyState === 'complete');
      
      return {
        status: isPageAlive ? 'healthy' : 'unhealthy',
        message: isPageAlive ? 'Service is running' : 'Page not ready',
        isLoggedIn: this.isLoggedIn,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}

module.exports = new ModernMessengerService();
