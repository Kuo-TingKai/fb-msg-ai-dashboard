# n8n Messenger 自動化流程實作指南

本文件說明如何用 **n8n** 串接 Messenger
訊息擷取、摘要、分類，並推送到開源 Dashboard。

------------------------------------------------------------------------

## 架構概覽

1.  **Messenger 訊息來源**

    -   官方 API 需要 Facebook App 與 Bot 加入群組。
    -   若不可行，可用非官方 `facebook-chat-api` 或 Puppeteer 模擬登入。

2.  **n8n 自動化流程**

    -   **Cron Trigger**：定時觸發（例如每小時）。
    -   **HTTP Request Node**：呼叫自建 API 取得群組訊息。
    -   **OpenAI Node**：生成摘要。
    -   **HuggingFace Node**（或 HTTP Request）：進行分類。
    -   **Database Node**（Postgres/MySQL/SQLite）：存放結構化結果。
    -   **Dashboard**（Grafana / Metabase）：顯示與分析。

3.  **資料格式**

    ``` json
    {
      "time": "2025-09-26T10:00:00Z",
      "user": "Alice",
      "message": "原始訊息內容",
      "summary": "這是摘要",
      "category": "技術討論"
    }
    ```

------------------------------------------------------------------------

## 安裝步驟

### 1. 安裝 n8n

``` bash
# 使用 Docker
docker run -it --rm   -p 5678:5678   -v ~/.n8n:/home/node/.n8n   n8nio/n8n
```

### 2. 建立 Messenger 抓取 API

-   建立一個 Node.js 服務：
    -   使用 `facebook-chat-api` 或 Puppeteer 登入帳號。
    -   提供 REST API `/messages` 回傳最新訊息 JSON。

### 3. 匯入 n8n Workflow

-   在 n8n 介面 Import 下列流程：

``` json
{
  "nodes": [
    { "name": "Cron", "type": "n8n-nodes-base.cron" },
    { "name": "Fetch Messages", "type": "n8n-nodes-base.httpRequest" },
    { "name": "Summarize", "type": "n8n-nodes-base.openAi" },
    { "name": "Classify", "type": "n8n-nodes-base.httpRequest" },
    { "name": "Save to DB", "type": "n8n-nodes-base.postgres" }
  ]
}
```

### 4. 安裝 Dashboard

#### Metabase

``` bash
docker run -d -p 3000:3000 --name metabase metabase/metabase
```

#### Grafana

``` bash
docker run -d -p 3000:3000 grafana/grafana
```

------------------------------------------------------------------------

## 使用流程

1.  n8n 定時抓取 Messenger API 資料。\
2.  呼叫 OpenAI 生成摘要。\
3.  呼叫 HuggingFace 進行主題分類。\
4.  將結果存入 PostgreSQL。\
5.  Grafana/Metabase 自動刷新顯示群組討論趨勢。

------------------------------------------------------------------------

## 注意事項

-   Messenger API 受限，非官方方案需考慮帳號安全。\
-   摘要與分類可替換不同 NLP 模型。\
-   建議在 DB 中建立索引以加速 Dashboard 查詢。

------------------------------------------------------------------------

## 延伸功能

-   增加 **通知功能**（Slack/Line/PagerDuty）。\
-   對特定關鍵字進行 **即時警示**。\
-   使用 Elasticsearch 增加全文檢索功能。

------------------------------------------------------------------------

✅ 完成後，你將擁有一個自動整理 Messenger 群組訊息的智慧型 Dashboard。
