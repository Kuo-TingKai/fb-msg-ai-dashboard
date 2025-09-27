#!/bin/bash

# Messenger AI Dashboard 啟動腳本
# 不使用 Docker，直接啟動所有服務

echo "🚀 啟動 Messenger AI Dashboard 系統..."

# 檢查 PostgreSQL 是否運行
echo "📊 檢查 PostgreSQL 服務..."
if ! pgrep -x "postgres" > /dev/null; then
    echo "⚠️  PostgreSQL 未運行，正在啟動..."
    brew services start postgresql@14
    sleep 5
else
    echo "✅ PostgreSQL 服務正常"
fi

# 檢查資料庫是否存在
echo "🗄️  檢查資料庫..."
if ! psql -U messenger_user -d messenger_ai_dashboard -c "SELECT 1;" > /dev/null 2>&1; then
    echo "⚠️  資料庫不存在，正在建立..."
    createdb messenger_ai_dashboard
    psql -U messenger_user -d messenger_ai_dashboard -f database/init.sql
    echo "✅ 資料庫建立完成"
else
    echo "✅ 資料庫連接正常"
fi

# 啟動 API 服務
echo "🔧 啟動 Messenger API 服務..."
if pgrep -f "complete-messenger-api-postgres" > /dev/null; then
    echo "⚠️  API 服務已在運行"
else
    node complete-messenger-api-postgres.js &
    API_PID=$!
    echo "✅ API 服務已啟動 (PID: $API_PID)"
    sleep 3
fi

# 啟動儀表板服務
echo "📈 啟動儀表板服務..."
if pgrep -f "dashboard-server" > /dev/null; then
    echo "⚠️  儀表板服務已在運行"
else
    node dashboard/dashboard-server.js &
    DASHBOARD_PID=$!
    echo "✅ 儀表板服務已啟動 (PID: $DASHBOARD_PID)"
    sleep 3
fi

# 檢查服務狀態
echo "🔍 檢查服務狀態..."

# 檢查 API 服務
if curl -s http://localhost:3002/health > /dev/null; then
    echo "✅ Messenger API 服務正常 (http://localhost:3002)"
else
    echo "❌ Messenger API 服務異常"
fi

# 檢查儀表板服務
if curl -s http://localhost:3003/health > /dev/null; then
    echo "✅ 儀表板服務正常 (http://localhost:3003)"
else
    echo "❌ 儀表板服務異常"
fi

echo ""
echo "🎉 系統啟動完成！"
echo ""
echo "📋 服務資訊:"
echo "  🔧 Messenger API: http://localhost:3002"
echo "  📊 儀表板: http://localhost:3003"
echo "  🗄️  資料庫: PostgreSQL (localhost:5432)"
echo ""
echo "📚 可用端點:"
echo "  GET  /health                    - 健康檢查"
echo "  GET  /api/dashboard/stats       - 儀表板統計"
echo "  POST /api/process-message       - 處理訊息"
echo "  GET  /groups                    - 群組列表"
echo "  GET  /groups/:id/messages       - 群組訊息"
echo ""
echo "🛠️  n8n 工作流程:"
echo "  1. 安裝 n8n: npm install -g n8n"
echo "  2. 啟動 n8n: n8n start"
echo "  3. 匯入工作流程: n8n-workflows/*.json"
echo ""
echo "⏹️  停止服務: ./stop.sh"
echo ""

# 保存 PID 到檔案
echo $API_PID > .api.pid
echo $DASHBOARD_PID > .dashboard.pid

echo "💡 提示: 所有服務都在背景運行，可以關閉終端"
