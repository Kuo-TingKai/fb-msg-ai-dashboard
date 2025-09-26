# 現代化 Messenger 自動化指南

## 🚀 概述

本專案已升級為使用現代化的 Puppeteer 技術來替代過時的 `facebook-chat-api`，提供更穩定、更可靠的 Messenger 自動化解決方案。

## 🔧 技術架構

### 核心服務

1. **EnhancedMessengerService** - 基於 Puppeteer 的增強版 Messenger 服務
2. **GroupMessengerService** - 專門用於群組管理的服務
3. **ModernMessengerService** - 基礎的現代化 Messenger 服務

### 主要優勢

- ✅ **現代化技術**: 使用最新的 Puppeteer 和 puppeteer-extra
- ✅ **反檢測機制**: 使用 stealth 插件避免被 Facebook 檢測
- ✅ **穩定性**: 更好的錯誤處理和重連機制
- ✅ **功能完整**: 支援群組監控、訊息發送、即時監聽
- ✅ **Docker 支援**: 完整的容器化部署

## 📦 安裝與設定

### 1. 環境準備

```bash
# 複製環境變數檔案
cp env.example .env

# 編輯環境變數
nano .env
```

### 2. 環境變數設定

```bash
# Facebook 帳號設定
FACEBOOK_EMAIL=your_email@example.com
FACEBOOK_PASSWORD=your_password

# AI 服務 API 金鑰 (至少需要一個)
OPENAI_API_KEY=your_openai_api_key
CLAUDE_API_KEY=your_claude_api_key
CURSOR_API_KEY=your_cursor_api_key

# 資料庫設定
DB_HOST=postgres
DB_PORT=5432
DB_NAME=messenger_automation
DB_USER=postgres
DB_PASSWORD=messenger123

# 服務設定
PORT=3001
NODE_ENV=production
```

### 3. 啟動服務

```bash
# 使用 Docker (推薦)
./start.sh

# 或手動啟動
docker-compose up -d
```

## 🎯 使用方式

### 1. 基本 API 使用

#### 健康檢查
```bash
curl http://localhost:3001/health
```

#### 詳細健康檢查
```bash
curl http://localhost:3001/health/detailed
```

### 2. 群組管理

#### 新增群組監控
```bash
curl -X POST http://localhost:3001/groups \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "your_group_thread_id",
    "name": "我的群組",
    "options": {
      "enabled": true,
      "autoProcess": true,
      "pollingInterval": 30000,
      "messageLimit": 50,
      "filters": {
        "users": ["Alice", "Bob"],
        "keywords": ["重要", "緊急"],
        "minLength": 10
      }
    }
  }'
```

#### 取得所有監控群組
```bash
curl http://localhost:3001/groups
```

#### 取得群組訊息
```bash
curl "http://localhost:3001/groups/your_group_id/messages?limit=20"
```

#### 發送訊息到群組
```bash
curl -X POST http://localhost:3001/groups/your_group_id/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello from the bot!"
  }'
```

#### 取得群組統計
```bash
curl http://localhost:3001/groups/your_group_id/stats
```

#### 更新群組設定
```bash
curl -X PUT http://localhost:3001/groups/your_group_id \
  -H "Content-Type: application/json" \
  -d '{
    "pollingInterval": 60000,
    "enabled": false
  }'
```

#### 移除群組監控
```bash
curl -X DELETE http://localhost:3001/groups/your_group_id
```

### 3. 訊息處理

#### 取得已處理訊息
```bash
curl "http://localhost:3001/processed-messages?limit=50&category=技術討論"
```

#### 儲存處理後訊息
```bash
curl -X POST http://localhost:3001/processed-messages \
  -H "Content-Type: application/json" \
  -d '{
    "time": "2024-01-01T10:00:00Z",
    "user": "Alice",
    "message": "今天開會討論了新的專案需求",
    "summary": "討論新專案需求",
    "category": "工作相關"
  }'
```

## 🔍 群組 ID 取得方法

### 方法 1: 從 URL 取得
1. 開啟 Messenger 網頁版
2. 進入您要監控的群組
3. 查看網址列，例如：`https://www.messenger.com/t/1234567890123456`
4. 群組 ID 就是 `/t/` 後面的數字

### 方法 2: 使用 API 取得
```bash
# 啟動服務後，先登入
curl http://localhost:3001/health/detailed

# 然後可以透過瀏覽器自動化取得群組列表
# (需要額外實作)
```

## ⚙️ 進階設定

### 1. 群組過濾器設定

```javascript
const filters = {
  // 只監控特定用戶
  users: ["Alice", "Bob", "Charlie"],
  
  // 只處理包含特定關鍵字的訊息
  keywords: ["重要", "緊急", "bug", "問題"],
  
  // 訊息長度限制
  minLength: 10,
  maxLength: 500,
  
  // 時間範圍
  timeRange: {
    start: "09:00",
    end: "18:00"
  }
};
```

### 2. 輪詢間隔設定

```javascript
const pollingInterval = 30000; // 30 秒
// 建議設定：
// - 活躍群組: 10-30 秒
// - 一般群組: 30-60 秒
// - 低活躍群組: 60-300 秒
```

### 3. 自動處理設定

```javascript
const autoProcess = {
  enabled: true,
  services: ["claude", "openai"], // 使用的 AI 服務
  actions: [
    "generateSummary",
    "classifyMessage",
    "saveToDatabase",
    "sendNotification"
  ]
};
```

## 🛠️ 故障排除

### 常見問題

#### 1. 登入失敗
```bash
# 檢查環境變數
echo $FACEBOOK_EMAIL
echo $FACEBOOK_PASSWORD

# 檢查服務狀態
curl http://localhost:3001/health/detailed
```

**解決方案**：
- 確認 Facebook 帳號密碼正確
- 檢查是否有 2FA 設定
- 確認帳號未被限制

#### 2. 群組無法存取
```bash
# 檢查群組 ID 是否正確
curl http://localhost:3001/groups/your_group_id/stats
```

**解決方案**：
- 確認群組 ID 正確
- 確認帳號有群組存取權限
- 檢查群組是否為公開群組

#### 3. 訊息抓取失敗
```bash
# 檢查服務日誌
docker-compose logs messenger-api
```

**解決方案**：
- 檢查網路連線
- 確認 Facebook 沒有封鎖
- 重新啟動服務

#### 4. Docker 容器問題
```bash
# 重新建置容器
docker-compose down
docker-compose up --build -d

# 檢查容器狀態
docker-compose ps
```

### 除錯模式

```bash
# 啟用詳細日誌
export DEBUG=messenger:*
export NODE_ENV=development

# 重新啟動服務
docker-compose restart messenger-api
```

## 📊 監控與維護

### 1. 服務監控

```bash
# 基本健康檢查
curl http://localhost:3001/health

# 詳細狀態檢查
curl http://localhost:3001/health/detailed

# 群組狀態檢查
curl http://localhost:3001/groups
```

### 2. 日誌監控

```bash
# 查看即時日誌
docker-compose logs -f messenger-api

# 查看特定時間的日誌
docker-compose logs --since="2024-01-01T00:00:00" messenger-api
```

### 3. 效能監控

```bash
# 檢查容器資源使用
docker stats

# 檢查磁碟空間
df -h
```

## 🔒 安全考量

### 1. 帳號安全
- 使用專用的 Facebook 帳號
- 定期更換密碼
- 啟用 2FA 但手動處理驗證碼

### 2. API 安全
- 使用環境變數儲存敏感資訊
- 限制 API 存取來源
- 定期輪換 API 金鑰

### 3. 資料安全
- 定期備份資料庫
- 加密敏感資料
- 限制資料存取權限

## 🚀 效能優化

### 1. 容器優化
```yaml
# docker-compose.yml
services:
  messenger-api:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

### 2. 輪詢優化
```javascript
// 根據群組活躍度調整輪詢間隔
const adaptivePolling = {
  high: 10000,    // 高活躍群組：10 秒
  medium: 30000,  // 中等活躍群組：30 秒
  low: 120000     // 低活躍群組：2 分鐘
};
```

### 3. 記憶體優化
```javascript
// 定期清理快取
setInterval(() => {
  groupMessengerService.clearCache();
}, 3600000); // 每小時清理一次
```

## 📈 擴展功能

### 1. 多帳號支援
```javascript
const multiAccount = {
  accounts: [
    { email: "account1@example.com", password: "pass1" },
    { email: "account2@example.com", password: "pass2" }
  ],
  loadBalancing: true
};
```

### 2. 分散式部署
```yaml
# 使用 Docker Swarm 或 Kubernetes
version: '3.8'
services:
  messenger-api:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
```

### 3. 高可用性
```javascript
// 自動重連機制
const autoReconnect = {
  maxRetries: 5,
  retryDelay: 30000,
  exponentialBackoff: true
};
```

## 📚 API 參考

### 完整 API 端點列表

| 方法 | 端點 | 描述 |
|------|------|------|
| GET | `/health` | 基本健康檢查 |
| GET | `/health/detailed` | 詳細健康檢查 |
| GET | `/groups` | 取得所有監控群組 |
| POST | `/groups` | 新增群組監控 |
| GET | `/groups/:id/messages` | 取得群組訊息 |
| POST | `/groups/:id/messages` | 發送訊息到群組 |
| GET | `/groups/:id/stats` | 取得群組統計 |
| PUT | `/groups/:id` | 更新群組設定 |
| DELETE | `/groups/:id` | 移除群組監控 |
| GET | `/processed-messages` | 取得已處理訊息 |
| POST | `/processed-messages` | 儲存處理後訊息 |
| GET | `/stats` | 取得統計資料 |

## 🎉 最佳實踐

1. **漸進式部署**: 先測試單一群組，再擴展到多群組
2. **監控優先**: 設定完整的監控和告警機制
3. **備份策略**: 定期備份資料庫和配置
4. **安全第一**: 使用專用帳號和安全的 API 金鑰管理
5. **效能調優**: 根據實際使用情況調整輪詢間隔和資源配置

---

**這個現代化的 Messenger 自動化解決方案提供了穩定、可靠、功能完整的群組訊息處理能力！**
