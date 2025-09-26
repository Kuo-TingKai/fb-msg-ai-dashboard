# Facebook Messenger Bot 設定指南

## 🤖 建立 Facebook Messenger Bot

### 1. 建立 Facebook 應用程式

1. **前往 Facebook Developers**
   - 網址：https://developers.facebook.com/
   - 使用您的 Facebook 帳號登入

2. **建立新應用程式**
   ```
   點擊 "Create App" → 選擇 "Business" → 填入應用程式資訊
   ```

3. **應用程式設定**
   - **應用程式名稱**：Messenger Automation Bot
   - **應用程式聯絡電子郵件**：your-email@example.com
   - **應用程式用途**：Business

### 2. 新增 Messenger 產品

1. **在應用程式控制台中**
   - 找到 "Add Product" 區塊
   - 點擊 Messenger 的 "Set up" 按鈕

2. **設定 Webhook**
   ```
   Webhook URL: https://your-domain.com/webhook
   Verify Token: your_verify_token (在 .env 中設定)
   ```

3. **訂閱 Webhook 事件**
   - ✅ messages
   - ✅ messaging_postbacks
   - ✅ messaging_optins
   - ✅ messaging_deliveries
   - ✅ messaging_reads

### 3. 建立 Facebook 粉絲專頁

1. **建立粉絲專頁**
   - 前往：https://www.facebook.com/pages/create
   - 選擇 "Business or Brand"
   - 填入專頁名稱和類別

2. **取得 Page Access Token**
   - 在 Messenger 設定頁面
   - 選擇您的粉絲專頁
   - 複製 Page Access Token

### 4. 設定環境變數

```bash
# 在 .env 檔案中設定
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
FACEBOOK_VERIFY_TOKEN=your_verify_token
FACEBOOK_WEBHOOK_SECRET=your_webhook_secret
```

### 5. 部署和測試

1. **部署應用程式**
   ```bash
   docker-compose up -d
   ```

2. **設定 Webhook URL**
   - 在 Facebook 應用程式控制台
   - 設定 Webhook URL 為：`https://your-domain.com/webhook`

3. **測試 Bot**
   - 前往您的粉絲專頁
   - 發送訊息給 Bot
   - 檢查回應是否正常

## 🔧 Bot 功能設定

### 1. 設定歡迎訊息

```javascript
// 在 facebookBotService.js 中
await facebookBotService.setGetStartedButton('GET_STARTED');
```

### 2. 設定持續選單

```javascript
const menuItems = [
  {
    type: 'postback',
    title: '📊 查看統計',
    payload: 'VIEW_STATS'
  },
  {
    type: 'postback',
    title: '🔍 搜尋訊息',
    payload: 'SEARCH_MESSAGES'
  },
  {
    type: 'postback',
    title: '⚙️ 設定',
    payload: 'SETTINGS'
  }
];

await facebookBotService.setPersistentMenu(menuItems);
```

### 3. 自訂回應邏輯

在 `routes/webhook.js` 中修改 `sendCategorizedResponse` 函數：

```javascript
async function sendCategorizedResponse(senderId, originalText, category, summary) {
  // 根據類別發送不同的回應
  switch (category) {
    case '技術討論':
      await facebookBotService.sendMessage(
        senderId,
        `🔧 技術討論\n\n摘要：${summary}\n\n需要技術支援嗎？`
      );
      break;
    
    case '問題求助':
      await facebookBotService.sendMessage(
        senderId,
        `🆘 問題求助\n\n摘要：${summary}\n\n我來幫您解決問題！`
      );
      break;
    
    // 其他類別...
  }
}
```

## 📱 Bot 互動範例

### 1. 基本訊息處理

```
用戶：今天開會討論了新的專案需求
Bot：💼 工作相關

摘要：討論新專案需求

這看起來是工作相關的討論。

[會議安排] [專案進度] [任務分配]
```

### 2. 技術問題處理

```
用戶：有人知道怎麼解決這個 bug 嗎？
Bot：🆘 問題求助

摘要：求助解決 bug

我注意到您可能需要幫助。

[緊急支援] [技術問題] [一般諮詢]
```

### 3. 快速回覆處理

```
用戶點擊 [技術問題]
Bot：🆘 技術支援

我可以幫您：
• 診斷問題
• 提供解決方案
• 聯繫技術團隊

請描述您遇到的具體問題。
```

## 🔒 安全設定

### 1. Webhook 驗證

```javascript
// 在 facebookBotService.js 中
verifyWebhookSignature(payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', this.webhookSecret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}
```

### 2. 存取權限控制

```javascript
// 限制特定用戶存取
const allowedUsers = ['user1', 'user2', 'user3'];

async function handleMessage(event) {
  if (!allowedUsers.includes(event.senderId)) {
    await facebookBotService.sendMessage(
      event.senderId,
      '抱歉，您沒有權限使用此 Bot。'
    );
    return;
  }
  
  // 處理訊息...
}
```

## 📊 監控和日誌

### 1. 訊息日誌

```javascript
// 記錄所有 Bot 互動
async function logBotInteraction(senderId, message, response) {
  await dbService.saveProcessedMessage({
    time: new Date().toISOString(),
    user: `Bot_User_${senderId}`,
    message: `Input: ${message}\nOutput: ${response}`,
    summary: 'Bot Interaction',
    category: 'Bot_Response'
  });
}
```

### 2. 效能監控

```javascript
// 監控回應時間
const startTime = Date.now();
await facebookBotService.sendMessage(senderId, response);
const responseTime = Date.now() - startTime;

console.log(`Bot response time: ${responseTime}ms`);
```

## 🚀 進階功能

### 1. 多語言支援

```javascript
async function detectLanguage(text) {
  // 使用語言檢測 API
  const response = await axios.post('https://api.languagedetector.com/detect', {
    text: text
  });
  
  return response.data.language;
}

async function sendLocalizedResponse(senderId, message, language) {
  const translations = {
    'zh': '收到您的訊息',
    'en': 'Message received',
    'ja': 'メッセージを受信しました'
  };
  
  const response = translations[language] || translations['en'];
  await facebookBotService.sendMessage(senderId, response);
}
```

### 2. 用戶偏好學習

```javascript
// 學習用戶偏好
async function learnUserPreference(senderId, category) {
  await dbService.updateUserPreference(senderId, category);
}

// 根據偏好調整回應
async function getPersonalizedResponse(senderId, category) {
  const preferences = await dbService.getUserPreferences(senderId);
  return preferences[category] || 'default_response';
}
```

### 3. 整合外部服務

```javascript
// 整合 Slack
async function notifySlack(message, category) {
  if (category === '問題求助') {
    await axios.post('https://hooks.slack.com/services/YOUR/WEBHOOK/URL', {
      text: `🚨 緊急問題：${message}`,
      channel: '#urgent-support'
    });
  }
}
```

## 🛠️ 故障排除

### 常見問題

1. **Webhook 驗證失敗**
   - 檢查 Verify Token 是否正確
   - 確認 Webhook URL 可存取
   - 檢查 SSL 憑證

2. **Bot 無回應**
   - 檢查 Page Access Token 是否有效
   - 確認粉絲專頁已連結
   - 檢查應用程式權限

3. **訊息發送失敗**
   - 檢查 API 限制
   - 確認用戶未封鎖 Bot
   - 檢查訊息格式

### 除錯工具

```javascript
// 啟用詳細日誌
process.env.DEBUG = 'facebook-bot:*';

// 測試 Webhook
app.get('/test-webhook', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    webhookUrl: 'https://your-domain.com/webhook'
  });
});
```

## 📚 參考資源

- [Facebook Messenger Platform 文檔](https://developers.facebook.com/docs/messenger-platform/)
- [Webhook 設定指南](https://developers.facebook.com/docs/messenger-platform/webhook)
- [Bot 最佳實踐](https://developers.facebook.com/docs/messenger-platform/best-practices)
- [API 參考](https://developers.facebook.com/docs/messenger-platform/reference/)

---

**完成設定後，您的 Messenger Bot 將能夠自動處理訊息、生成摘要、分類主題，並提供智能回應！**
