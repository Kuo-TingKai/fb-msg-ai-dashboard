# n8n 工作流程設定指南

## 概述

本專案包含兩個主要的 n8n 工作流程，用於自動化處理 Facebook Messenger 群組訊息：

1. **Messenger AI Automation Workflow** - 主要訊息處理流程
2. **Notification Workflow** - 通知和監控流程

## 工作流程說明

### 1. Messenger AI Automation Workflow

**功能**: 自動抓取、處理和儲存 Messenger 群組訊息

**觸發器**: 每 5 分鐘執行一次

**流程**:
1. 定時觸發器啟動
2. 抓取群組訊息 (GET /groups/622758750657081/messages)
3. 檢查是否有新訊息
4. 處理訊息數據
5. AI 處理訊息 (POST /api/process-message)
6. 儲存到 PostgreSQL 資料庫
7. 獲取儀表板統計
8. 記錄工作流程執行

**特殊處理**:
- 技術討論訊息會觸發額外的群組統計檢查
- 生成處理報告
- 記錄所有執行日誌

### 2. Notification Workflow

**功能**: 監控系統狀態並發送通知

**觸發器**: 每 1 分鐘執行一次

**流程**:
1. 定時檢查啟動
2. 獲取統計數據 (GET /api/dashboard/stats)
3. 檢查是否有新訊息
4. 生成通知內容
5. 記錄通知到資料庫
6. 檢查技術討論訊息
7. 生成技術討論特別通知

## 設定步驟

### 1. 安裝 n8n

```bash
# 全域安裝
npm install -g n8n

# 或使用 npx
npx n8n
```

### 2. 啟動 n8n

```bash
n8n start
```

n8n 將在 http://localhost:5678 啟動

### 3. 設定 PostgreSQL 憑證

在 n8n 中建立 PostgreSQL 憑證：

**憑證名稱**: PostgreSQL Messenger DB
**主機**: localhost
**資料庫**: messenger_ai_dashboard
**使用者**: messenger_user
**密碼**: messenger123
**端口**: 5432

### 4. 匯入工作流程

1. 開啟 n8n 介面
2. 點擊 "Import from File"
3. 選擇 `n8n-workflows/messenger-ai-automation.json`
4. 重複步驟匯入 `notification-workflow.json`

### 5. 啟動工作流程

1. 在 n8n 介面中找到匯入的工作流程
2. 點擊 "Active" 開關啟動工作流程
3. 確認所有節點都正確連接

## 工作流程節點說明

### 主要節點類型

1. **Cron Trigger** - 定時觸發器
2. **HTTP Request** - API 呼叫
3. **If** - 條件判斷
4. **Code** - JavaScript 程式碼執行
5. **PostgreSQL** - 資料庫操作

### 關鍵設定

#### HTTP Request 節點
- **URL**: 指向本地 API 服務 (http://localhost:3002)
- **Timeout**: 設定適當的超時時間
- **Headers**: 設定 Content-Type 為 application/json

#### PostgreSQL 節點
- **Operation**: 選擇 insert 操作
- **Schema**: public
- **Table**: 對應的資料表名稱
- **Columns**: 指定要插入的欄位

#### Code 節點
- **Language**: JavaScript
- **程式碼**: 處理和轉換數據的邏輯

## 監控和除錯

### 1. 執行歷史

在 n8n 介面中可以查看：
- 工作流程執行歷史
- 每個節點的執行狀態
- 錯誤訊息和日誌

### 2. 資料庫監控

檢查 PostgreSQL 資料庫中的記錄：

```sql
-- 查看工作流程執行記錄
SELECT * FROM workflow_logs ORDER BY started_at DESC LIMIT 10;

-- 查看通知記錄
SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 10;

-- 查看處理的訊息
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;
```

### 3. API 監控

檢查 API 服務狀態：

```bash
# 健康檢查
curl http://localhost:3002/health

# 詳細狀態
curl http://localhost:3002/health/detailed

# 儀表板統計
curl http://localhost:3002/api/dashboard/stats
```

## 故障排除

### 常見問題

1. **連接錯誤**
   - 確認 PostgreSQL 服務正在運行
   - 檢查資料庫憑證設定
   - 確認 API 服務 (端口 3002) 正在運行

2. **工作流程不執行**
   - 檢查 Cron 觸發器設定
   - 確認工作流程已啟動
   - 查看執行歷史中的錯誤訊息

3. **資料庫錯誤**
   - 確認資料表存在
   - 檢查欄位名稱和類型
   - 確認資料庫權限

### 日誌檢查

```bash
# 檢查 n8n 日誌
n8n start --log-level debug

# 檢查 PostgreSQL 日誌
tail -f /opt/homebrew/var/log/postgresql@14.log

# 檢查 API 服務日誌
# 查看終端輸出或日誌檔案
```

## 自訂設定

### 修改觸發頻率

在 Cron Trigger 節點中修改間隔時間：

```json
{
  "field": "minutes",
  "minutesInterval": 5  // 改為其他值
}
```

### 添加新的處理邏輯

在 Code 節點中添加自訂的 JavaScript 程式碼：

```javascript
// 自訂處理邏輯
const data = $input.first().json;
// 處理數據...
return [{ json: processedData }];
```

### 添加新的通知方式

可以添加以下節點：
- **Email** - 發送郵件通知
- **Slack** - 發送到 Slack
- **Webhook** - 發送到其他服務

## 效能優化

1. **批次處理**: 將多個訊息批次處理以提高效率
2. **錯誤重試**: 設定適當的重試機制
3. **資源限制**: 設定適當的超時和記憶體限制
4. **資料庫索引**: 確保資料庫有適當的索引

## 安全考量

1. **憑證管理**: 使用 n8n 的憑證管理功能
2. **網路安全**: 確保 API 服務只接受本地連接
3. **資料保護**: 定期備份資料庫
4. **存取控制**: 限制 n8n 介面的存取權限
