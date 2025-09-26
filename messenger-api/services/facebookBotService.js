const axios = require('axios');
const crypto = require('crypto');

class FacebookBotService {
  constructor() {
    this.pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    this.verifyToken = process.env.FACEBOOK_VERIFY_TOKEN;
    this.webhookSecret = process.env.FACEBOOK_WEBHOOK_SECRET;
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) {
      console.warn('Webhook secret not configured, skipping verification');
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Verify webhook during setup
   */
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log('Webhook verified successfully');
      return challenge;
    }
    throw new Error('Webhook verification failed');
  }

  /**
   * Send message to user
   */
  async sendMessage(recipientId, message) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        {
          recipient: { id: recipientId },
          message: { text: message }
        },
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log('Message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send structured message (buttons, quick replies, etc.)
   */
  async sendStructuredMessage(recipientId, messageData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        {
          recipient: { id: recipientId },
          message: messageData
        },
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending structured message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(userId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${userId}`,
        {
          params: {
            access_token: this.pageAccessToken,
            fields: 'first_name,last_name,profile_pic'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting user profile:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get page information
   */
  async getPageInfo() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me`,
        {
          params: {
            access_token: this.pageAccessToken,
            fields: 'name,category,about'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting page info:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Set up persistent menu
   */
  async setPersistentMenu(menuItems) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/me/messenger_profile`,
        {
          persistent_menu: [
            {
              locale: 'default',
              composer_input_disabled: false,
              call_to_actions: menuItems
            }
          ]
        },
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log('Persistent menu set successfully');
      return response.data;
    } catch (error) {
      console.error('Error setting persistent menu:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Set up get started button
   */
  async setGetStartedButton(payload = 'GET_STARTED') {
    try {
      const response = await axios.post(
        `${this.baseUrl}/me/messenger_profile`,
        {
          get_started: {
            payload: payload
          }
        },
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log('Get started button set successfully');
      return response.data;
    } catch (error) {
      console.error('Error setting get started button:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Process incoming webhook events
   */
  processWebhookEvent(event) {
    const { sender, recipient, timestamp, message } = event;

    if (message) {
      return {
        type: 'message',
        senderId: sender.id,
        recipientId: recipient.id,
        timestamp: timestamp,
        messageId: message.mid,
        text: message.text,
        attachments: message.attachments || [],
        quickReply: message.quick_reply
      };
    }

    // Handle other event types (postback, delivery, read, etc.)
    return {
      type: 'other',
      senderId: sender.id,
      recipientId: recipient.id,
      timestamp: timestamp,
      data: event
    };
  }

  /**
   * Create quick reply buttons
   */
  createQuickReplies(replies) {
    return {
      text: replies.text,
      quick_replies: replies.options.map(option => ({
        content_type: 'text',
        title: option.title,
        payload: option.payload
      }))
    };
  }

  /**
   * Create generic template
   */
  createGenericTemplate(elements) {
    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: elements
        }
      }
    };
  }

  /**
   * Create button template
   */
  createButtonTemplate(text, buttons) {
    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: text,
          buttons: buttons
        }
      }
    };
  }
}

module.exports = new FacebookBotService();
