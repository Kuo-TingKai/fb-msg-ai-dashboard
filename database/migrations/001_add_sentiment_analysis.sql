-- Migration: Add sentiment analysis support
-- Version: 001
-- Date: 2024-01-01

-- Add sentiment analysis columns to processed_messages table
ALTER TABLE processed_messages 
ADD COLUMN IF NOT EXISTS sentiment VARCHAR(20),
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);

-- Create index for sentiment analysis
CREATE INDEX IF NOT EXISTS idx_processed_messages_sentiment ON processed_messages(sentiment);

-- Add comment for new columns
COMMENT ON COLUMN processed_messages.sentiment IS 'Sentiment analysis result: positive, negative, neutral';
COMMENT ON COLUMN processed_messages.sentiment_score IS 'Sentiment score from -1.0 to 1.0';
COMMENT ON COLUMN processed_messages.confidence_score IS 'Confidence score from 0.0 to 1.0';

-- Create sentiment_stats table for sentiment analytics
CREATE TABLE IF NOT EXISTS sentiment_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    sentiment VARCHAR(20) NOT NULL,
    message_count INTEGER NOT NULL,
    avg_confidence DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, sentiment)
);

-- Create index for sentiment_stats
CREATE INDEX IF NOT EXISTS idx_sentiment_stats_date ON sentiment_stats(date);
CREATE INDEX IF NOT EXISTS idx_sentiment_stats_sentiment ON sentiment_stats(sentiment);

-- Create view for sentiment analytics
CREATE OR REPLACE VIEW sentiment_analytics AS
SELECT 
    DATE(time) as date,
    sentiment,
    COUNT(*) as message_count,
    ROUND(AVG(sentiment_score), 3) as avg_sentiment_score,
    ROUND(AVG(confidence_score), 3) as avg_confidence_score
FROM processed_messages
WHERE sentiment IS NOT NULL 
    AND time >= NOW() - INTERVAL '30 days'
GROUP BY DATE(time), sentiment
ORDER BY date DESC, message_count DESC;
