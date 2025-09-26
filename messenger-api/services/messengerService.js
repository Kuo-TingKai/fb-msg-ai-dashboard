const login = require('facebook-chat-api');
const puppeteer = require('puppeteer');

class MessengerService {
  constructor() {
    this.api = null;
    this.isLoggedIn = false;
    this.threadId = process.env.FACEBOOK_THREAD_ID;
  }

  /**
   * Initialize Messenger connection using facebook-chat-api
   */
  async initializeWithAPI() {
    return new Promise((resolve, reject) => {
      const credentials = {
        email: process.env.FACEBOOK_EMAIL,
        password: process.env.FACEBOOK_PASSWORD
      };

      login(credentials, (err, api) => {
        if (err) {
          console.error('Facebook login error:', err);
          reject(err);
          return;
        }

        this.api = api;
        this.isLoggedIn = true;
        console.log('Successfully logged in to Facebook Messenger');
        resolve(api);
      });
    });
  }

  /**
   * Initialize Messenger connection using Puppeteer (fallback method)
   */
  async initializeWithPuppeteer() {
    try {
      const browser = await puppeteer.launch({
        headless: false, // Set to true for production
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Navigate to Facebook login
      await page.goto('https://www.facebook.com/login');
      
      // Fill login form
      await page.type('#email', process.env.FACEBOOK_EMAIL);
      await page.type('#pass', process.env.FACEBOOK_PASSWORD);
      
      // Click login button
      await page.click('#loginbutton');
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      console.log('Successfully logged in with Puppeteer');
      return { browser, page };
    } catch (error) {
      console.error('Puppeteer login error:', error);
      throw error;
    }
  }

  /**
   * Get messages from Messenger group
   * @param {number} limit - Number of messages to fetch
   * @param {string} since - ISO timestamp to fetch messages since
   */
  async getMessages(limit = 50, since = null) {
    try {
      // Try API method first
      if (!this.isLoggedIn) {
        await this.initializeWithAPI();
      }

      return new Promise((resolve, reject) => {
        const options = {
          threadID: this.threadId,
          limit: parseInt(limit)
        };

        if (since) {
          options.timestamp = new Date(since).getTime();
        }

        this.api.getThreadHistory(this.threadId, limit, null, (err, messages) => {
          if (err) {
            console.error('Error fetching messages:', err);
            reject(err);
            return;
          }

          // Transform messages to our format
          const transformedMessages = messages.map(msg => ({
            id: msg.messageID,
            time: new Date(msg.timestamp).toISOString(),
            user: msg.senderName || 'Unknown',
            message: msg.body || '',
            threadId: msg.threadID,
            attachments: msg.attachments || []
          }));

          resolve(transformedMessages);
        });
      });
    } catch (error) {
      console.error('Error in getMessages:', error);
      throw error;
    }
  }

  /**
   * Get messages using Puppeteer (fallback method)
   */
  async getMessagesWithPuppeteer(limit = 50) {
    try {
      const { browser, page } = await this.initializeWithPuppeteer();
      
      // Navigate to Messenger
      await page.goto('https://www.messenger.com');
      await page.waitForSelector('[data-testid="message_list"]');
      
      // Extract messages (this is a simplified example)
      const messages = await page.evaluate((msgLimit) => {
        const messageElements = document.querySelectorAll('[data-testid="message"]');
        const result = [];
        
        for (let i = 0; i < Math.min(messageElements.length, msgLimit); i++) {
          const element = messageElements[i];
          const sender = element.querySelector('[data-testid="message_sender"]')?.textContent || 'Unknown';
          const content = element.querySelector('[data-testid="message_content"]')?.textContent || '';
          const timestamp = element.querySelector('[data-testid="message_timestamp"]')?.textContent || '';
          
          result.push({
            user: sender,
            message: content,
            time: new Date().toISOString(), // Simplified timestamp
            source: 'puppeteer'
          });
        }
        
        return result;
      }, limit);

      await browser.close();
      return messages;
    } catch (error) {
      console.error('Error in getMessagesWithPuppeteer:', error);
      throw error;
    }
  }

  /**
   * Send a message to the group (optional feature)
   */
  async sendMessage(message) {
    if (!this.isLoggedIn) {
      await this.initializeWithAPI();
    }

    return new Promise((resolve, reject) => {
      this.api.sendMessage(message, this.threadId, (err, messageInfo) => {
        if (err) {
          console.error('Error sending message:', err);
          reject(err);
          return;
        }
        resolve(messageInfo);
      });
    });
  }

  /**
   * Logout from Messenger
   */
  async logout() {
    if (this.api) {
      this.api.logout();
      this.api = null;
      this.isLoggedIn = false;
      console.log('Logged out from Facebook Messenger');
    }
  }
}

module.exports = new MessengerService();
