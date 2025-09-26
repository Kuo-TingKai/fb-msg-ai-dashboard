#!/bin/bash

# Messenger Automation Project Startup Script
# 啟動 Messenger 自動化專案腳本

set -e

echo "🚀 啟動 Messenger 自動化專案..."

# 檢查 Docker 是否安裝
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安裝，請先安裝 Docker"
    exit 1
fi

# 檢查 Docker Compose 是否安裝
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安裝，請先安裝 Docker Compose"
    exit 1
fi

# 檢查環境變數檔案
if [ ! -f .env ]; then
    echo "⚠️  環境變數檔案不存在，正在建立..."
    cp env.example .env
    echo "📝 請編輯 .env 檔案設定您的配置"
    echo "   特別是 Facebook 帳號和 API 金鑰"
    read -p "按 Enter 繼續..."
fi

# 檢查必要的環境變數
source .env

if [ -z "$FACEBOOK_EMAIL" ] || [ -z "$FACEBOOK_PASSWORD" ]; then
    echo "❌ 請在 .env 檔案中設定 Facebook 帳號資訊"
    exit 1
fi

# 檢查至少有一個 AI 服務 API 金鑰
if [ -z "$OPENAI_API_KEY" ] && [ -z "$CLAUDE_API_KEY" ] && [ -z "$HUGGINGFACE_API_KEY" ]; then
    echo "❌ 請在 .env 檔案中設定至少一個 AI 服務 API 金鑰"
    echo "   支援的服務：OpenAI、Claude、HuggingFace"
    exit 1
fi

# 建立必要的目錄
echo "📁 建立必要的目錄..."
mkdir -p logs
mkdir -p backup

# 啟動服務
echo "🐳 啟動 Docker 服務..."
docker-compose up -d

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 30

# 檢查服務狀態
echo "🔍 檢查服務狀態..."
docker-compose ps

# 檢查 API 健康狀態
echo "🏥 檢查 API 健康狀態..."
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Messenger API 服務正常"
else
    echo "❌ Messenger API 服務異常"
fi

# 檢查 n8n 服務
echo "🔧 檢查 n8n 服務..."
if curl -f http://localhost:5678 > /dev/null 2>&1; then
    echo "✅ n8n 服務正常"
else
    echo "❌ n8n 服務異常"
fi

# 檢查 Metabase 服務
echo "📊 檢查 Metabase 服務..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Metabase 服務正常"
else
    echo "❌ Metabase 服務異常"
fi

echo ""
echo "🎉 服務啟動完成！"
echo ""
echo "📋 服務存取位址："
echo "   • n8n 工作流程: http://localhost:5678"
echo "   • Metabase 儀表板: http://localhost:3000"
echo "   • Messenger API: http://localhost:3001"
echo "   • Grafana 儀表板: http://localhost:3002 (可選)"
echo ""
echo "🔑 預設登入資訊："
echo "   • n8n: admin / admin123"
echo "   • Metabase: 首次啟動時設定"
echo "   • Grafana: admin / admin123"
echo ""
echo "📖 詳細說明請參考 README.md"
echo "🛠️  如需停止服務，請執行: docker-compose down"
echo ""
