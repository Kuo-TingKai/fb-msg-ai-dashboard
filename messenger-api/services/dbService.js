const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

class DatabaseService {
  constructor() {
    this.pool = null;
  }

  /**
   * Initialize database connection
   */
  initialize() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'messenger_automation',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    this.pool.query('SELECT NOW()', (err, result) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Database connected successfully');
        this.createTables();
      }
    });
  }

  /**
   * Create necessary tables
   */
  async createTables() {
    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS processed_messages (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(255) UNIQUE,
        time TIMESTAMP WITH TIME ZONE NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        summary TEXT,
        category VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_processed_messages_time ON processed_messages(time);
      CREATE INDEX IF NOT EXISTS idx_processed_messages_category ON processed_messages(category);
      CREATE INDEX IF NOT EXISTS idx_processed_messages_user ON processed_messages(user_name);
    `;

    try {
      await this.pool.query(createMessagesTable);
      await this.pool.query(createIndexes);
      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
    }
  }

  /**
   * Save processed message to database
   */
  async saveProcessedMessage({ time, user, message, summary, category, messageId }) {
    const query = `
      INSERT INTO processed_messages (message_id, time, user_name, message, summary, category)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (message_id) DO UPDATE SET
        summary = EXCLUDED.summary,
        category = EXCLUDED.category,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      messageId || `${user}_${Date.now()}`,
      time,
      user,
      message,
      summary,
      category
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error saving processed message:', error);
      throw error;
    }
  }

  /**
   * Get processed messages with filters
   */
  async getProcessedMessages({ limit = 100, category, dateFrom, dateTo, userId }) {
    let query = `
      SELECT * FROM processed_messages
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      values.push(category);
    }

    if (dateFrom) {
      paramCount++;
      query += ` AND time >= $${paramCount}`;
      values.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      query += ` AND time <= $${paramCount}`;
      values.push(dateTo);
    }

    if (userId) {
      paramCount++;
      query += ` AND user_name = $${paramCount}`;
      values.push(userId);
    }

    query += ` ORDER BY time DESC LIMIT $${paramCount + 1}`;
    values.push(limit);

    try {
      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error fetching processed messages:', error);
      throw error;
    }
  }

  /**
   * Get message statistics
   */
  async getMessageStats() {
    const queries = {
      totalMessages: 'SELECT COUNT(*) as count FROM processed_messages',
      messagesByCategory: `
        SELECT category, COUNT(*) as count 
        FROM processed_messages 
        WHERE category IS NOT NULL 
        GROUP BY category 
        ORDER BY count DESC
      `,
      messagesByUser: `
        SELECT user_name, COUNT(*) as count 
        FROM processed_messages 
        GROUP BY user_name 
        ORDER BY count DESC
      `,
      recentActivity: `
        SELECT DATE(time) as date, COUNT(*) as count 
        FROM processed_messages 
        WHERE time >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(time) 
        ORDER BY date DESC
      `
    };

    try {
      const results = {};
      
      for (const [key, query] of Object.entries(queries)) {
        const result = await this.pool.query(query);
        results[key] = result.rows;
      }

      return results;
    } catch (error) {
      console.error('Error fetching message stats:', error);
      throw error;
    }
  }

  /**
   * Get categories for filtering
   */
  async getCategories() {
    const query = `
      SELECT DISTINCT category 
      FROM processed_messages 
      WHERE category IS NOT NULL 
      ORDER BY category
    `;

    try {
      const result = await this.pool.query(query);
      return result.rows.map(row => row.category);
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection closed');
    }
  }
}

module.exports = new DatabaseService();
