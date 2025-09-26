const enhancedMessengerService = require('./enhancedMessengerService');
const EventEmitter = require('events');

class GroupMessengerService extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.activeGroups = new Map();
    this.messageProcessors = new Map();
    this.pollingIntervals = new Map();
  }

  /**
   * Initialize the group messenger service
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      console.log('🚀 Initializing Group Messenger Service...');
      
      // Initialize the enhanced messenger service
      await enhancedMessengerService.initialize();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('✅ Group Messenger Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Group Messenger Service:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for the enhanced messenger service
   */
  setupEventListeners() {
    enhancedMessengerService.on('newMessage', (message) => {
      this.handleNewMessage(message);
    });

    enhancedMessengerService.on('error', (error) => {
      console.error('Enhanced Messenger Service error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Add a group for monitoring
   */
  async addGroup(groupId, options = {}) {
    try {
      console.log(`📋 Adding group for monitoring: ${groupId}`);
      
      const groupConfig = {
        id: groupId,
        name: options.name || `Group_${groupId}`,
        enabled: options.enabled !== false,
        autoProcess: options.autoProcess !== false,
        pollingInterval: options.pollingInterval || 30000, // 30 seconds
        messageLimit: options.messageLimit || 50,
        filters: options.filters || {},
        processors: options.processors || [],
        lastMessageId: null,
        createdAt: new Date().toISOString()
      };

      this.activeGroups.set(groupId, groupConfig);
      
      // Start monitoring this group
      await this.startGroupMonitoring(groupId);
      
      console.log(`✅ Group ${groupId} added successfully`);
      return groupConfig;
    } catch (error) {
      console.error(`❌ Failed to add group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a group from monitoring
   */
  async removeGroup(groupId) {
    try {
      console.log(`🗑️ Removing group from monitoring: ${groupId}`);
      
      // Stop monitoring
      await this.stopGroupMonitoring(groupId);
      
      // Remove from active groups
      this.activeGroups.delete(groupId);
      
      console.log(`✅ Group ${groupId} removed successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to remove group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Start monitoring a specific group
   */
  async startGroupMonitoring(groupId) {
    try {
      const groupConfig = this.activeGroups.get(groupId);
      if (!groupConfig) {
        throw new Error(`Group ${groupId} not found`);
      }

      if (!groupConfig.enabled) {
        console.log(`⏸️ Group ${groupId} monitoring is disabled`);
        return;
      }

      console.log(`👁️ Starting monitoring for group: ${groupId}`);
      
      // Navigate to the group conversation
      await enhancedMessengerService.navigateToConversation(groupId);
      
      // Start polling for new messages
      const pollingInterval = setInterval(async () => {
        try {
          await this.pollGroupMessages(groupId);
        } catch (error) {
          console.error(`❌ Error polling group ${groupId}:`, error);
        }
      }, groupConfig.pollingInterval);

      this.pollingIntervals.set(groupId, pollingInterval);
      
      // Get initial messages
      await this.pollGroupMessages(groupId);
      
      console.log(`✅ Started monitoring group: ${groupId}`);
    } catch (error) {
      console.error(`❌ Failed to start monitoring group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Stop monitoring a specific group
   */
  async stopGroupMonitoring(groupId) {
    try {
      const pollingInterval = this.pollingIntervals.get(groupId);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        this.pollingIntervals.delete(groupId);
      }
      
      console.log(`⏹️ Stopped monitoring group: ${groupId}`);
    } catch (error) {
      console.error(`❌ Failed to stop monitoring group ${groupId}:`, error);
    }
  }

  /**
   * Poll messages from a specific group
   */
  async pollGroupMessages(groupId) {
    try {
      const groupConfig = this.activeGroups.get(groupId);
      if (!groupConfig) {
        return;
      }

      // Navigate to the group if not already there
      await enhancedMessengerService.navigateToConversation(groupId);
      
      // Get messages
      const messages = await enhancedMessengerService.getMessages(
        groupConfig.messageLimit,
        groupConfig.lastMessageId ? new Date(groupConfig.lastMessageId).toISOString() : null
      );

      if (messages.length > 0) {
        // Update last message ID
        const latestMessage = messages[messages.length - 1];
        groupConfig.lastMessageId = latestMessage.id;

        // Process messages
        for (const message of messages) {
          await this.processGroupMessage(groupId, message);
        }

        // Emit event for new messages
        this.emit('groupMessages', {
          groupId: groupId,
          messages: messages,
          count: messages.length
        });
      }
    } catch (error) {
      console.error(`❌ Failed to poll messages for group ${groupId}:`, error);
    }
  }

  /**
   * Process a message from a group
   */
  async processGroupMessage(groupId, message) {
    try {
      const groupConfig = this.activeGroups.get(groupId);
      if (!groupConfig) {
        return;
      }

      // Apply filters
      if (this.shouldFilterMessage(message, groupConfig.filters)) {
        return;
      }

      // Add group information to message
      const enrichedMessage = {
        ...message,
        groupId: groupId,
        groupName: groupConfig.name,
        processedAt: new Date().toISOString()
      };

      // Auto-process if enabled
      if (groupConfig.autoProcess) {
        await this.autoProcessMessage(enrichedMessage);
      }

      // Emit event for individual message
      this.emit('groupMessage', {
        groupId: groupId,
        message: enrichedMessage
      });

    } catch (error) {
      console.error(`❌ Failed to process message for group ${groupId}:`, error);
    }
  }

  /**
   * Check if message should be filtered
   */
  shouldFilterMessage(message, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return false;
    }

    // Filter by user
    if (filters.users && filters.users.length > 0) {
      if (!filters.users.includes(message.user)) {
        return true;
      }
    }

    // Filter by keywords
    if (filters.keywords && filters.keywords.length > 0) {
      const messageText = message.message.toLowerCase();
      const hasKeyword = filters.keywords.some(keyword => 
        messageText.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return true;
      }
    }

    // Filter by message length
    if (filters.minLength && message.message.length < filters.minLength) {
      return true;
    }

    if (filters.maxLength && message.message.length > filters.maxLength) {
      return true;
    }

    return false;
  }

  /**
   * Auto-process message (send to NLP services, save to database, etc.)
   */
  async autoProcessMessage(message) {
    try {
      // This would integrate with your NLP services
      // For now, we'll just emit an event
      this.emit('messageToProcess', message);
    } catch (error) {
      console.error('❌ Failed to auto-process message:', error);
    }
  }

  /**
   * Handle new message from enhanced messenger service
   */
  async handleNewMessage(message) {
    try {
      // Check if this message is from one of our monitored groups
      const currentUrl = await enhancedMessengerService.page.url();
      const groupId = currentUrl.split('/').pop();
      
      if (this.activeGroups.has(groupId)) {
        await this.processGroupMessage(groupId, message);
      }
    } catch (error) {
      console.error('❌ Failed to handle new message:', error);
    }
  }

  /**
   * Get messages from a specific group
   */
  async getGroupMessages(groupId, limit = 50, since = null) {
    try {
      if (!this.activeGroups.has(groupId)) {
        throw new Error(`Group ${groupId} is not being monitored`);
      }

      await enhancedMessengerService.navigateToConversation(groupId);
      const messages = await enhancedMessengerService.getMessages(limit, since);
      
      // Enrich messages with group information
      return messages.map(message => ({
        ...message,
        groupId: groupId,
        groupName: this.activeGroups.get(groupId).name
      }));
    } catch (error) {
      console.error(`❌ Failed to get messages for group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Send message to a specific group
   */
  async sendGroupMessage(groupId, message) {
    try {
      if (!this.activeGroups.has(groupId)) {
        throw new Error(`Group ${groupId} is not being monitored`);
      }

      await enhancedMessengerService.navigateToConversation(groupId);
      await enhancedMessengerService.sendMessage(message);
      
      console.log(`✅ Message sent to group ${groupId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send message to group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Get all active groups
   */
  getActiveGroups() {
    return Array.from(this.activeGroups.values());
  }

  /**
   * Get group configuration
   */
  getGroupConfig(groupId) {
    return this.activeGroups.get(groupId);
  }

  /**
   * Update group configuration
   */
  async updateGroupConfig(groupId, updates) {
    try {
      const groupConfig = this.activeGroups.get(groupId);
      if (!groupConfig) {
        throw new Error(`Group ${groupId} not found`);
      }

      // Update configuration
      Object.assign(groupConfig, updates);
      groupConfig.updatedAt = new Date().toISOString();

      // Restart monitoring if polling interval changed
      if (updates.pollingInterval) {
        await this.stopGroupMonitoring(groupId);
        await this.startGroupMonitoring(groupId);
      }

      console.log(`✅ Updated configuration for group ${groupId}`);
      return groupConfig;
    } catch (error) {
      console.error(`❌ Failed to update group ${groupId} configuration:`, error);
      throw error;
    }
  }

  /**
   * Get group statistics
   */
  async getGroupStats(groupId) {
    try {
      const groupConfig = this.activeGroups.get(groupId);
      if (!groupConfig) {
        throw new Error(`Group ${groupId} not found`);
      }

      const messages = await this.getGroupMessages(groupId, 100);
      
      const stats = {
        groupId: groupId,
        groupName: groupConfig.name,
        totalMessages: messages.length,
        uniqueUsers: [...new Set(messages.map(m => m.user))].length,
        lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
        monitoringStatus: groupConfig.enabled ? 'active' : 'disabled',
        createdAt: groupConfig.createdAt,
        lastPolled: new Date().toISOString()
      };

      return stats;
    } catch (error) {
      console.error(`❌ Failed to get stats for group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Health check for all groups
   */
  async healthCheck() {
    try {
      const healthStatus = {
        service: 'GroupMessengerService',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        groups: {
          total: this.activeGroups.size,
          active: 0,
          inactive: 0
        },
        details: []
      };

      for (const [groupId, config] of this.activeGroups) {
        const isActive = this.pollingIntervals.has(groupId);
        healthStatus.groups[isActive ? 'active' : 'inactive']++;
        
        healthStatus.details.push({
          groupId: groupId,
          name: config.name,
          status: isActive ? 'active' : 'inactive',
          lastMessageId: config.lastMessageId
        });
      }

      return healthStatus;
    } catch (error) {
      return {
        service: 'GroupMessengerService',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close the service
   */
  async close() {
    try {
      console.log('🛑 Closing Group Messenger Service...');
      
      // Stop all monitoring
      for (const groupId of this.activeGroups.keys()) {
        await this.stopGroupMonitoring(groupId);
      }
      
      // Clear data
      this.activeGroups.clear();
      this.messageProcessors.clear();
      
      // Close enhanced messenger service
      await enhancedMessengerService.close();
      
      this.isInitialized = false;
      console.log('✅ Group Messenger Service closed');
    } catch (error) {
      console.error('❌ Error closing Group Messenger Service:', error);
    }
  }
}

module.exports = new GroupMessengerService();
