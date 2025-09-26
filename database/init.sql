-- Messenger Automation Database Schema
-- This file contains the database initialization script

-- Create database (run this manually if needed)
-- CREATE DATABASE messenger_automation;

-- Connect to the database
-- \c messenger_automation;

-- Create processed_messages table
CREATE TABLE IF NOT EXISTS processed_messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    summary TEXT,
    category VARCHAR(100),
    thread_id VARCHAR(255),
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_processed_messages_time ON processed_messages(time);
CREATE INDEX IF NOT EXISTS idx_processed_messages_category ON processed_messages(category);
CREATE INDEX IF NOT EXISTS idx_processed_messages_user ON processed_messages(user_name);
CREATE INDEX IF NOT EXISTS idx_processed_messages_thread ON processed_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_processed_messages_created_at ON processed_messages(created_at);

-- Create message_stats table for caching statistics
CREATE TABLE IF NOT EXISTS message_stats (
    id SERIAL PRIMARY KEY,
    stat_type VARCHAR(50) NOT NULL,
    stat_key VARCHAR(100),
    stat_value JSONB NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stat_type, stat_key)
);

-- Create indexes for message_stats
CREATE INDEX IF NOT EXISTS idx_message_stats_type ON message_stats(stat_type);
CREATE INDEX IF NOT EXISTS idx_message_stats_calculated_at ON message_stats(calculated_at);

-- Create workflow_logs table for tracking workflow executions
CREATE TABLE IF NOT EXISTS workflow_logs (
    id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(100) NOT NULL,
    execution_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'running', 'success', 'error'
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    messages_processed INTEGER DEFAULT 0,
    error_message TEXT,
    execution_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for workflow_logs
CREATE INDEX IF NOT EXISTS idx_workflow_logs_name ON workflow_logs(workflow_name);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_status ON workflow_logs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_start_time ON workflow_logs(start_time);

-- Create notification_logs table for tracking notifications
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL, -- 'slack', 'line', 'telegram', 'email'
    recipient VARCHAR(255) NOT NULL,
    message_content TEXT NOT NULL,
    urgent_count INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL, -- 'sent', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT
);

-- Create indexes for notification_logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- Create categories table for managing message categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, description, color) VALUES
    ('技術討論', '技術相關的討論和問題', '#3498db'),
    ('工作相關', '工作相關的訊息和討論', '#2ecc71'),
    ('生活分享', '日常生活分享和閒聊', '#f39c12'),
    ('問題求助', '需要幫助的問題和請求', '#e74c3c'),
    ('活動通知', '活動和會議通知', '#9b59b6'),
    ('其他', '其他類型的訊息', '#95a5a6')
ON CONFLICT (name) DO NOTHING;

-- Create users table for tracking user information
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    messenger_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    message_count INTEGER DEFAULT 0,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_messenger_id ON users(messenger_id);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_processed_messages_updated_at 
    BEFORE UPDATE ON processed_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for message analytics
CREATE OR REPLACE VIEW message_analytics AS
SELECT 
    DATE(time) as date,
    category,
    user_name,
    COUNT(*) as message_count,
    AVG(LENGTH(message)) as avg_message_length,
    COUNT(CASE WHEN summary IS NOT NULL THEN 1 END) as summarized_count
FROM processed_messages
WHERE time >= NOW() - INTERVAL '30 days'
GROUP BY DATE(time), category, user_name
ORDER BY date DESC, message_count DESC;

-- Create view for daily statistics
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
    DATE(time) as date,
    COUNT(*) as total_messages,
    COUNT(DISTINCT user_name) as unique_users,
    COUNT(DISTINCT category) as categories_used,
    COUNT(CASE WHEN summary IS NOT NULL THEN 1 END) as summarized_messages,
    ROUND(AVG(LENGTH(message)), 2) as avg_message_length
FROM processed_messages
WHERE time >= NOW() - INTERVAL '30 days'
GROUP BY DATE(time)
ORDER BY date DESC;

-- Create view for user activity
CREATE OR REPLACE VIEW user_activity AS
SELECT 
    user_name,
    COUNT(*) as total_messages,
    COUNT(DISTINCT DATE(time)) as active_days,
    COUNT(DISTINCT category) as categories_used,
    MAX(time) as last_message_time,
    MIN(time) as first_message_time,
    ROUND(AVG(LENGTH(message)), 2) as avg_message_length
FROM processed_messages
WHERE time >= NOW() - INTERVAL '30 days'
GROUP BY user_name
ORDER BY total_messages DESC;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO messenger_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO messenger_user;

-- Insert sample data for testing (optional)
-- INSERT INTO processed_messages (message_id, time, user_name, message, summary, category) VALUES
-- ('sample_1', NOW() - INTERVAL '1 hour', 'Alice', '今天開會討論了新的專案需求', '討論新專案需求', '工作相關'),
-- ('sample_2', NOW() - INTERVAL '2 hours', 'Bob', '有人知道怎麼解決這個 bug 嗎？', '求助解決 bug', '問題求助'),
-- ('sample_3', NOW() - INTERVAL '3 hours', 'Charlie', '推薦一家好吃的餐廳', '推薦餐廳', '生活分享');

COMMENT ON TABLE processed_messages IS 'Stores processed Messenger messages with summaries and categories';
COMMENT ON TABLE message_stats IS 'Caches calculated statistics for better performance';
COMMENT ON TABLE workflow_logs IS 'Tracks n8n workflow execution history';
COMMENT ON TABLE notification_logs IS 'Logs all sent notifications';
COMMENT ON TABLE categories IS 'Manages message categories and their properties';
COMMENT ON TABLE users IS 'Tracks Messenger users and their activity';
