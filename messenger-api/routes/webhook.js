const express = require('express');
const facebookBotService = require('../services/facebookBotService');
const nlpService = require('../services/nlpService');
const dbService = require('../services/dbService');

const router = express.Router();

/**
 * Webhook verification endpoint
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  try {
    const result = facebookBotService.verifyWebhook(mode, token, challenge);
    res.status(200).send(result);
  } catch (error) {
    console.error('Webhook verification failed:', error.message);
    res.status(403).send('Forbidden');
  }
});

/**
 * Webhook event processing endpoint
 */
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    const signature = req.get('X-Hub-Signature-256');

    // Verify webhook signature
    if (!facebookBotService.verifyWebhookSignature(JSON.stringify(body), signature)) {
      console.error('Invalid webhook signature');
      return res.status(403).send('Forbidden');
    }

    // Process webhook events
    if (body.object === 'page') {
      for (const entry of body.entry) {
        for (const event of entry.messaging) {
          await processEvent(event);
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Process individual webhook event
 */
async function processEvent(event) {
  try {
    const processedEvent = facebookBotService.processWebhookEvent(event);

    if (processedEvent.type === 'message') {
      await handleMessage(processedEvent);
    } else if (event.postback) {
      await handlePostback(processedEvent);
    }
  } catch (error) {
    console.error('Error processing event:', error);
  }
}

/**
 * Handle incoming messages
 */
async function handleMessage(event) {
  const { senderId, text, messageId } = event;

  try {
    // Get user profile
    const userProfile = await facebookBotService.getUserProfile(senderId);
    const userName = `${userProfile.first_name} ${userProfile.last_name}`;

    // Process message with NLP
    const [summary, category] = await Promise.all([
      nlpService.generateSummary(text, userName),
      nlpService.classifyMessage(text)
    ]);

    // Save to database
    await dbService.saveProcessedMessage({
      time: new Date().toISOString(),
      user: userName,
      message: text,
      summary: summary,
      category: category,
      messageId: messageId
    });

    // Send response based on category
    await sendCategorizedResponse(senderId, text, category, summary);

  } catch (error) {
    console.error('Error handling message:', error);
    await facebookBotService.sendMessage(senderId, '抱歉，處理您的訊息時發生錯誤。');
  }
}

/**
 * Send categorized response
 */
async function sendCategorizedResponse(senderId, originalText, category, summary) {
  const responses = {
    '技術討論': {
      text: `🔧 技術討論\n\n摘要：${summary}\n\n需要技術支援嗎？我可以幫您整理相關資訊。`,
      quickReplies: [
        { title: '查看文檔', payload: 'VIEW_DOCS' },
        { title: '尋求幫助', payload: 'GET_HELP' },
        { title: '分享經驗', payload: 'SHARE_EXPERIENCE' }
      ]
    },
    '工作相關': {
      text: `💼 工作相關\n\n摘要：${summary}\n\n這看起來是工作相關的討論。`,
      quickReplies: [
        { title: '會議安排', payload: 'SCHEDULE_MEETING' },
        { title: '專案進度', payload: 'PROJECT_STATUS' },
        { title: '任務分配', payload: 'TASK_ASSIGNMENT' }
      ]
    },
    '問題求助': {
      text: `🆘 問題求助\n\n摘要：${summary}\n\n我注意到您可能需要幫助。`,
      quickReplies: [
        { title: '緊急支援', payload: 'URGENT_HELP' },
        { title: '技術問題', payload: 'TECH_ISSUE' },
        { title: '一般諮詢', payload: 'GENERAL_INQUIRY' }
      ]
    },
    '生活分享': {
      text: `😊 生活分享\n\n摘要：${summary}\n\n感謝您的分享！`,
      quickReplies: [
        { title: '繼續分享', payload: 'CONTINUE_SHARING' },
        { title: '回應互動', payload: 'RESPOND_INTERACTION' }
      ]
    },
    '活動通知': {
      text: `📢 活動通知\n\n摘要：${summary}\n\n這是一個活動通知。`,
      quickReplies: [
        { title: '參加活動', payload: 'JOIN_EVENT' },
        { title: '了解更多', payload: 'LEARN_MORE' },
        { title: '分享活動', payload: 'SHARE_EVENT' }
      ]
    },
    '其他': {
      text: `📝 其他\n\n摘要：${summary}\n\n已記錄您的訊息。`,
      quickReplies: [
        { title: '重新分類', payload: 'RECLASSIFY' },
        { title: '提供回饋', payload: 'PROVIDE_FEEDBACK' }
      ]
    }
  };

  const response = responses[category] || responses['其他'];
  
  // Send message with quick replies
  await facebookBotService.sendStructuredMessage(
    senderId,
    facebookBotService.createQuickReplies({
      text: response.text,
      options: response.quickReplies
    })
  );
}

/**
 * Handle postback events
 */
async function handlePostback(event) {
  const { senderId } = event;
  const payload = event.data.postback?.payload;

  switch (payload) {
    case 'GET_STARTED':
      await facebookBotService.sendMessage(
        senderId,
        '👋 歡迎使用 Messenger 自動化 Bot！\n\n我可以幫您：\n• 分析群組訊息\n• 生成摘要\n• 分類主題\n• 提供即時通知\n\n請發送任何訊息開始使用！'
      );
      break;

    case 'VIEW_DOCS':
      await facebookBotService.sendMessage(
        senderId,
        '📚 技術文檔\n\n您可以在以下位置找到相關文檔：\n• 專案 README\n• API 文檔\n• 技術規範\n\n需要特定文檔嗎？'
      );
      break;

    case 'GET_HELP':
      await facebookBotService.sendMessage(
        senderId,
        '🆘 技術支援\n\n我可以幫您：\n• 診斷問題\n• 提供解決方案\n• 聯繫技術團隊\n\n請描述您遇到的具體問題。'
      );
      break;

    case 'URGENT_HELP':
      await facebookBotService.sendMessage(
        senderId,
        '🚨 緊急支援\n\n已標記為緊急問題，技術團隊將優先處理。\n\n請提供：\n• 問題描述\n• 錯誤訊息\n• 重現步驟'
      );
      break;

    default:
      await facebookBotService.sendMessage(
        senderId,
        '收到您的選擇，正在處理中...'
      );
  }
}

module.exports = router;
