#!/bin/bash

# Messenger AI Dashboard 停止腳本

echo "⏹️  停止 Messenger AI Dashboard 系統..."

# 停止 API 服務
echo "🔧 停止 Messenger API 服務..."
if [ -f .api.pid ]; then
    API_PID=$(cat .api.pid)
    if kill -0 $API_PID 2>/dev/null; then
        kill $API_PID
        echo "✅ API 服務已停止 (PID: $API_PID)"
    else
        echo "⚠️  API 服務未運行"
    fi
    rm .api.pid
else
    # 備用方法：根據進程名稱停止
    pkill -f "complete-messenger-api-postgres"
    echo "✅ API 服務已停止"
fi

# 停止儀表板服務
echo "📈 停止儀表板服務..."
if [ -f .dashboard.pid ]; then
    DASHBOARD_PID=$(cat .dashboard.pid)
    if kill -0 $DASHBOARD_PID 2>/dev/null; then
        kill $DASHBOARD_PID
        echo "✅ 儀表板服務已停止 (PID: $DASHBOARD_PID)"
    else
        echo "⚠️  儀表板服務未運行"
    fi
    rm .dashboard.pid
else
    # 備用方法：根據進程名稱停止
    pkill -f "dashboard-server"
    echo "✅ 儀表板服務已停止"
fi

# 停止其他相關服務
echo "🧹 清理其他服務..."
pkill -f "simple-ai-server"
pkill -f "complete-messenger-api"

# 檢查端口是否釋放
echo "🔍 檢查端口狀態..."
if lsof -ti:3002 > /dev/null 2>&1; then
    echo "⚠️  端口 3002 仍被占用"
    lsof -ti:3002 | xargs kill -9
    echo "✅ 端口 3002 已釋放"
fi

if lsof -ti:3003 > /dev/null 2>&1; then
    echo "⚠️  端口 3003 仍被占用"
    lsof -ti:3003 | xargs kill -9
    echo "✅ 端口 3003 已釋放"
fi

echo ""
echo "🎉 所有服務已停止！"
echo ""
echo "💡 提示:"
echo "  - PostgreSQL 服務仍在運行 (如需停止: brew services stop postgresql@14)"
echo "  - 資料庫資料已保存"
echo "  - 重新啟動: ./start-all.sh"
