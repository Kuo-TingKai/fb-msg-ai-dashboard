# Metabase Dashboard 配置指南

## 資料庫連接設定

1. 開啟 Metabase (http://localhost:3000)
2. 使用管理員帳號登入
3. 進入 Admin > Databases
4. 新增資料庫連接：
   - **Database type**: PostgreSQL
   - **Host**: postgres
   - **Port**: 5432
   - **Database name**: messenger_automation
   - **Username**: postgres
   - **Password**: messenger123

## 建議的儀表板配置

### 1. 訊息統計儀表板
- **每日訊息數量趨勢**
- **訊息類別分布**
- **用戶活躍度排行**
- **訊息長度分析**

### 2. 類別分析儀表板
- **各類別訊息趨勢**
- **類別熱門度排行**
- **類別時間分布**

### 3. 用戶行為分析
- **用戶發言頻率**
- **用戶偏好類別**
- **用戶活躍時段**

## SQL 查詢範例

### 每日訊息統計
```sql
SELECT 
  DATE(time) as date,
  COUNT(*) as message_count,
  COUNT(DISTINCT user_name) as unique_users
FROM processed_messages
WHERE time >= NOW() - INTERVAL '30 days'
GROUP BY DATE(time)
ORDER BY date DESC;
```

### 類別分布
```sql
SELECT 
  category,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM processed_messages
WHERE time >= NOW() - INTERVAL '7 days'
  AND category IS NOT NULL
GROUP BY category
ORDER BY count DESC;
```

### 用戶活躍度
```sql
SELECT 
  user_name,
  COUNT(*) as message_count,
  COUNT(DISTINCT DATE(time)) as active_days,
  MAX(time) as last_message_time
FROM processed_messages
WHERE time >= NOW() - INTERVAL '30 days'
GROUP BY user_name
ORDER BY message_count DESC
LIMIT 20;
```
