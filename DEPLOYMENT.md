# 部署指南

## 🚀 生產環境部署

### 1. 伺服器需求

**最低需求:**
- CPU: 2 cores
- RAM: 4GB
- 儲存空間: 20GB
- 網路: 穩定的網際網路連線

**建議需求:**
- CPU: 4 cores
- RAM: 8GB
- 儲存空間: 50GB SSD
- 網路: 100Mbps 以上

### 2. 系統準備

```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安裝 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 將用戶加入 docker 群組
sudo usermod -aG docker $USER
```

### 3. 專案部署

```bash
# 複製專案
git clone <repository-url>
cd n8n

# 設定環境變數
cp env.example .env
nano .env

# 啟動服務
docker-compose up -d

# 檢查服務狀態
docker-compose ps
```

### 4. 反向代理設定 (Nginx)

```nginx
# /etc/nginx/sites-available/messenger-automation
server {
    listen 80;
    server_name your-domain.com;

    # n8n
    location /n8n/ {
        proxy_pass http://localhost:5678/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Metabase
    location /metabase/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. SSL 憑證設定

```bash
# 安裝 Certbot
sudo apt install certbot python3-certbot-nginx

# 取得 SSL 憑證
sudo certbot --nginx -d your-domain.com

# 自動更新憑證
sudo crontab -e
# 新增: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 環境變數配置

### 生產環境設定

```bash
# .env.production
NODE_ENV=production
PORT=3001

# 資料庫設定
DB_HOST=postgres
DB_PORT=5432
DB_NAME=messenger_automation
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Facebook 設定
FACEBOOK_EMAIL=your_email@example.com
FACEBOOK_PASSWORD=your_password
FACEBOOK_THREAD_ID=your_group_thread_id

# API 金鑰
OPENAI_API_KEY=your_openai_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key

# n8n 設定
N8N_USER=admin
N8N_PASSWORD=your_secure_password
N8N_HOST=your-domain.com
N8N_PROTOCOL=https

# Metabase 設定
METABASE_SECRET_KEY=your_metabase_secret_key

# Grafana 設定
GRAFANA_PASSWORD=your_grafana_password
```

## 📊 監控設定

### 1. 系統監控

```bash
# 安裝監控工具
sudo apt install htop iotop nethogs

# 設定日誌輪轉
sudo nano /etc/logrotate.d/docker
```

### 2. 應用程式監控

```bash
# 建立監控腳本
cat > monitor.sh << 'EOF'
#!/bin/bash

# 檢查服務狀態
services=("postgres" "messenger-api" "n8n" "metabase")

for service in "${services[@]}"; do
    if ! docker-compose ps $service | grep -q "Up"; then
        echo "Service $service is down!"
        # 發送告警通知
    fi
done

# 檢查磁碟空間
df -h | awk '$5 > 80 {print "Disk usage warning: " $0}'

# 檢查記憶體使用
free -h | awk 'NR==2{printf "Memory Usage: %s/%s (%.2f%%)\n", $3,$2,$3*100/$2 }'
EOF

chmod +x monitor.sh

# 設定定時檢查
crontab -e
# 新增: */5 * * * * /path/to/monitor.sh
```

### 3. 日誌管理

```bash
# 設定日誌收集
mkdir -p /var/log/messenger-automation

# 建立日誌輪轉配置
cat > /etc/logrotate.d/messenger-automation << 'EOF'
/var/log/messenger-automation/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
```

## 🔄 備份策略

### 1. 資料庫備份

```bash
# 建立備份腳本
cat > backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/backup/messenger-automation"
DATE=$(date +%Y%m%d_%H%M%S)

# 建立備份目錄
mkdir -p $BACKUP_DIR

# 資料庫備份
docker-compose exec -T postgres pg_dump -U postgres messenger_automation > $BACKUP_DIR/db_backup_$DATE.sql

# 壓縮備份檔案
gzip $BACKUP_DIR/db_backup_$DATE.sql

# 保留最近 30 天的備份
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh

# 設定每日備份
crontab -e
# 新增: 0 2 * * * /path/to/backup.sh
```

### 2. 配置備份

```bash
# 備份重要配置檔案
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
    docker-compose.yml \
    .env \
    n8n-workflows/ \
    database/ \
    dashboard/
```

## 🚨 災難恢復

### 1. 服務恢復

```bash
# 停止所有服務
docker-compose down

# 恢復資料庫
docker-compose up postgres -d
docker-compose exec -T postgres psql -U postgres messenger_automation < backup.sql

# 啟動所有服務
docker-compose up -d
```

### 2. 完整恢復

```bash
# 重新部署
git pull origin main
docker-compose down
docker-compose up -d --build

# 恢復資料
docker-compose exec -T postgres psql -U postgres messenger_automation < backup.sql
```

## 📈 效能優化

### 1. 資料庫優化

```sql
-- 建立索引
CREATE INDEX CONCURRENTLY idx_processed_messages_time_category 
ON processed_messages(time, category);

-- 分析表格統計
ANALYZE processed_messages;

-- 設定資料庫參數
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
```

### 2. 應用程式優化

```bash
# 設定 Node.js 記憶體限制
export NODE_OPTIONS="--max-old-space-size=2048"

# 啟用 gzip 壓縮
# 在 nginx 配置中啟用 gzip
```

### 3. 容器優化

```yaml
# docker-compose.yml 優化
services:
  messenger-api:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
```

## 🔐 安全強化

### 1. 防火牆設定

```bash
# 設定 UFW 防火牆
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3001
sudo ufw deny 5432
sudo ufw deny 5678
```

### 2. 容器安全

```bash
# 掃描容器漏洞
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy image messenger-api:latest

# 使用非 root 用戶
# 在 Dockerfile 中已設定
```

### 3. 資料加密

```bash
# 加密敏感資料
gpg --symmetric --cipher-algo AES256 .env
```

## 📋 維護檢查清單

### 每日檢查
- [ ] 服務狀態正常
- [ ] 磁碟空間充足
- [ ] 記憶體使用正常
- [ ] 網路連線穩定

### 每週檢查
- [ ] 備份檔案完整性
- [ ] 日誌檔案大小
- [ ] 效能指標正常
- [ ] 安全更新檢查

### 每月檢查
- [ ] 資料庫優化
- [ ] 清理舊資料
- [ ] 更新依賴套件
- [ ] 災難恢復測試

## 🆘 緊急聯絡

- **技術支援**: tech-support@example.com
- **系統管理員**: admin@example.com
- **緊急電話**: +886-xxx-xxx-xxx

---

**記住**: 定期備份、監控系統狀態、保持更新！
