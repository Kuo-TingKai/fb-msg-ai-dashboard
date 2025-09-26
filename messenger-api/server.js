const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const messengerService = require('./services/enhancedMessengerService');
const groupMessengerService = require('./services/groupMessengerService');
const dbService = require('./services/dbService');
const webhookRoutes = require('./routes/webhook');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database connection
dbService.initialize();

// Initialize group messenger service
groupMessengerService.initialize().catch(console.error);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Webhook routes for Facebook Bot
app.use('/', webhookRoutes);

// Get messages from Messenger group
app.get('/messages', async (req, res) => {
  try {
    const { limit = 50, since } = req.query;
    const messages = await messengerService.getMessages(limit, since);
    res.json({
      success: true,
      data: messages,
      count: messages.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get processed messages from database
app.get('/processed-messages', async (req, res) => {
  try {
    const { limit = 100, category, date_from, date_to } = req.query;
    const messages = await dbService.getProcessedMessages({
      limit: parseInt(limit),
      category,
      dateFrom: date_from,
      dateTo: date_to
    });
    res.json({
      success: true,
      data: messages,
      count: messages.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching processed messages:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Save processed message to database
app.post('/processed-messages', async (req, res) => {
  try {
    const { time, user, message, summary, category } = req.body;
    
    if (!time || !user || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: time, user, message'
      });
    }

    const result = await dbService.saveProcessedMessage({
      time,
      user,
      message,
      summary,
      category
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving processed message:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get message statistics
app.get('/stats', async (req, res) => {
  try {
    const stats = await dbService.getMessageStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Group Management APIs
// Add group for monitoring
app.post('/groups', async (req, res) => {
  try {
    const { groupId, name, options } = req.body;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'Group ID is required'
      });
    }

    const groupConfig = await groupMessengerService.addGroup(groupId, {
      name: name || `Group_${groupId}`,
      ...options
    });

    res.json({
      success: true,
      data: groupConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding group:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all active groups
app.get('/groups', async (req, res) => {
  try {
    const groups = groupMessengerService.getActiveGroups();
    res.json({
      success: true,
      data: groups,
      count: groups.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get group messages
app.get('/groups/:groupId/messages', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50, since } = req.query;
    
    const messages = await groupMessengerService.getGroupMessages(groupId, parseInt(limit), since);
    
    res.json({
      success: true,
      data: messages,
      count: messages.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Send message to group
app.post('/groups/:groupId/messages', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    await groupMessengerService.sendGroupMessage(groupId, message);
    
    res.json({
      success: true,
      message: 'Message sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get group statistics
app.get('/groups/:groupId/stats', async (req, res) => {
  try {
    const { groupId } = req.params;
    const stats = await groupMessengerService.getGroupStats(groupId);
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching group stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Update group configuration
app.put('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const updates = req.body;
    
    const updatedConfig = await groupMessengerService.updateGroupConfig(groupId, updates);
    
    res.json({
      success: true,
      data: updatedConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating group config:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Remove group from monitoring
app.delete('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    await groupMessengerService.removeGroup(groupId);
    
    res.json({
      success: true,
      message: 'Group removed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error removing group:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Service health check
app.get('/health/detailed', async (req, res) => {
  try {
    const messengerHealth = await messengerService.healthCheck();
    const groupHealth = await groupMessengerService.healthCheck();
    
    res.json({
      success: true,
      data: {
        messenger: messengerHealth,
        groups: groupHealth,
        overall: messengerHealth.status === 'healthy' && groupHealth.status === 'healthy' ? 'healthy' : 'unhealthy'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking service health:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Messenger API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
