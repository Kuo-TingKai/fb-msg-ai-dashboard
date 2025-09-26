#!/bin/bash

# Messenger Automation Project Stop Script
# 停止 Messenger 自動化專案腳本

echo "🛑 停止 Messenger 自動化專案..."

# 停止所有服務
echo "🐳 停止 Docker 服務..."
docker-compose down

# 清理未使用的容器和映像
echo "🧹 清理未使用的資源..."
docker system prune -f

echo ""
echo "✅ 所有服務已停止"
echo "💡 如需重新啟動，請執行: ./start.sh"
echo ""
