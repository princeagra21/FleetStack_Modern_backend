# Winston CSV Logging System

FleetStack uses a unified Winston-based logging system that provides both **CSV logs for API analytics** and **application logs for debugging**.

## 📊 System Overview

```
Winston Logging System
├── CSV Transport (API Analytics)
│   ├── Daily CSV files (DD_MM_YYYY.csv)
│   ├── HTTP request/response tracking
│   └── Excel/database compatible format
│
└── File Transports (Application Logs)
    ├── Application logs (application-YYYY-MM-DD.log)
    ├── Error logs (error-YYYY-MM-DD.log)
    └── Exception logs (exceptions-YYYY-MM-DD.log)
```

## 🗂️ File Structure

```
project/
├── api_logs/                    # CSV logs for API analytics
│   ├── 01_01_2024.csv
│   ├── 02_01_2024.csv
│   └── 03_01_2024.csv
│
└── winston_logs/                # Application logs
    ├── application-2024-01-01.log
    ├── error-2024-01-01.log
    └── exceptions-2024-01-01.log
```

## 📊 CSV Log Format

Each CSV file contains HTTP request/response data with these columns:

| Column         | Description                    | Example                          |
| -------------- | ------------------------------ | -------------------------------- |
| `timestamp`    | ISO timestamp                  | `2024-01-15T14:30:45.123Z`       |
| `level`        | Log level                      | `info`, `warn`, `error`          |
| `message`      | Log message                    | `HTTP 200 GET /api/users (89ms)` |
| `method`       | HTTP method                    | `GET`, `POST`, `PUT`, `DELETE`   |
| `url`          | Request URL                    | `/api/users/123`                 |
| `statusCode`   | HTTP status code               | `200`, `404`, `500`              |
| `duration`     | Response time in ms            | `89`                             |
| `ip`           | Client IP address              | `192.168.1.1`                    |
| `userAgent`    | User agent (truncated)         | `Mozilla/5.0...`                 |
| `userId`       | Authenticated user ID          | `user123`                        |
| `requestSize`  | Request body size in bytes     | `256`                            |
| `responseSize` | Response body size in bytes    | `512`                            |
| `requestBody`  | Request payload (truncated)    | `{"name":"John"}`                |
| `responseBody` | Response payload (truncated)   | `{"id":123,"name":"John"}`       |
| `error`        | Error message if status >= 400 | `HTTP 404`                       |
| `context`      | Log context                    | `HTTP`                           |
| `type`         | Log type                       | `http_request`                   |

## 🛠️ Configuration

### Environment Variables

```env
# Winston Logging Configuration
WINSTON_LOGGING_ENABLED=true        # Enable/disable Winston logging
LOG_LEVEL=info                       # Log level (error, warn, info, debug, verbose)
MAX_LOG_STRING=1000                  # Max string length before truncation

# File Paths
WINSTON_LOG_DIR=winston_logs         # Directory for application logs
CSV_LOG_DIR=api_logs                 # Directory for CSV logs

# Log Rotation
WINSTON_MAX_SIZE=20m                 # Max file size before rotation
WINSTON_MAX_FILES=30d                # Retention period
WINSTON_DATE_PATTERN=YYYY-MM-DD      # Date pattern for log files
```

## 💻 Usage in Code

### Basic Logging

```typescript
import { LoggerUtil } from './common/utils/logger.util';
import { WinstonLoggerService } from './common/services/winston-logger.service';

// Using LoggerUtil (static methods)
LoggerUtil.info('User created successfully', { userId: 123 }, 'USER_SERVICE');
LoggerUtil.error('Database connection failed', { error: 'Timeout' }, 'DATABASE');
LoggerUtil.warn('Rate limit exceeded', { ip: '192.168.1.1' }, 'SECURITY');

// Using injected service
constructor(private readonly logger: WinstonLoggerService) {}

this.logger.info('Processing request', 'API', { requestId: 'abc123' });
this.logger.error('Validation failed', undefined, 'VALIDATION', { errors: ['Required field missing'] });
```

### Specialized Logging Methods

```typescript
// System Events
LoggerUtil.logSystemEvent('Database connected', {
  host: 'localhost',
  port: 5432,
});
LoggerUtil.logSystemEvent('Cache cleared', { keys: 150 });

// Business Events
LoggerUtil.logBusinessEvent('User registered', 'user123', {
  email: 'user@example.com',
});
LoggerUtil.logBusinessEvent('Order created', 'user456', {
  orderId: 789,
  amount: 99.99,
});

// Security Events
LoggerUtil.logSecurityEvent('Failed login', '192.168.1.100', 'user789', {
  attempts: 5,
});
LoggerUtil.logSecurityEvent('Suspicious activity', '10.0.0.1', undefined, {
  pattern: 'brute_force',
});

// Performance Monitoring
LoggerUtil.logPerformance('Database query', 250, {
  query: 'SELECT * FROM users',
});
LoggerUtil.logDatabaseQuery('SELECT * FROM vehicles WHERE active = true', 89);
```

## 📈 Log Analysis

### CSV Log Analysis (Excel/Pandas)

```python
import pandas as pd

# Load today's CSV data
df = pd.read_csv('api_logs/15_01_2024.csv')

# Analyze response times
avg_response_time = df['duration'].mean()
slow_requests = df[df['duration'] > 1000]

# Error analysis
error_rates = df.groupby('url')['statusCode'].apply(
    lambda x: (x >= 400).sum() / len(x) * 100
)

# Top endpoints
top_endpoints = df['url'].value_counts().head(10)
```

### Application Log Analysis

```bash
# View today's application logs
tail -f winston_logs/application-$(date +%Y-%m-%d).log

# Search for errors
grep "ERROR" winston_logs/error-$(date +%Y-%m-%d).log

# Filter by context
grep '"context":"USER_SERVICE"' winston_logs/application-$(date +%Y-%m-%d).log

# Performance analysis
grep '"type":"performance"' winston_logs/application-$(date +%Y-%m-%d).log | jq '.duration'
```

## 🔍 Log Formats

### CSV Format (HTTP Requests)

```csv
timestamp,level,message,method,url,statusCode,duration,ip,userAgent,userId,requestSize,responseSize,requestBody,responseBody,error,context,type
2024-01-15T14:30:45.123Z,info,"HTTP 201 POST /api/users (89ms)",POST,/api/users,201,89,192.168.1.1,"Mozilla/5.0...",user123,256,512,"{""name"":""John""}","{""id"":123,""name"":""John""}",,"HTTP",http_request
```

### JSON Format (Application Logs)

```json
{
  "timestamp": "2024-01-15 14:30:45",
  "level": "info",
  "message": "[USER_SERVICE] User created successfully",
  "type": "business_event",
  "event": "user_created",
  "userId": "user123",
  "details": {
    "email": "user@example.com",
    "role": "customer"
  }
}
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Set environment variables
export WINSTON_LOGGING_ENABLED=true
export LOG_LEVEL=info
export CSV_LOG_DIR=api_logs
export WINSTON_LOG_DIR=winston_logs
```

### 3. Start the Server

```bash
npm run start:dev
```

### 4. View Logs

**CSV Logs (API Analytics):**

```bash
# View today's API requests
cat api_logs/$(date +%d_%m_%Y).csv

# Import into Excel or database
# File: api_logs/15_01_2024.csv
```

**Application Logs:**

```bash
# Real-time application logs
tail -f winston_logs/application-$(date +%Y-%m-%d).log

# Error logs only
tail -f winston_logs/error-$(date +%Y-%m-%d).log
```

## 📊 Monitoring Examples

### Performance Monitoring

```typescript
// Monitor slow endpoints
const start = Date.now();
const result = await someOperation();
const duration = Date.now() - start;

LoggerUtil.logPerformance('someOperation', duration, {
  result: result.length,
  cache: 'miss',
});
```

### Business Intelligence

```typescript
// Track user actions
LoggerUtil.logBusinessEvent('file_uploaded', userId, {
  fileName: file.name,
  fileSize: file.size,
  fileType: file.type,
});

// Monitor system health
LoggerUtil.logSystemEvent('health_check', {
  memory: process.memoryUsage(),
  uptime: process.uptime(),
  activeConnections: server.connections,
});
```

### Security Monitoring

```typescript
// Track authentication events
LoggerUtil.logSecurityEvent('login_success', req.ip, userId);
LoggerUtil.logSecurityEvent('login_failed', req.ip, attemptedUsername, {
  reason: 'invalid_password',
  attempts: failedAttempts,
});

// Monitor API abuse
if (requestCount > rateLimit) {
  LoggerUtil.logSecurityEvent('rate_limit_exceeded', req.ip, userId, {
    endpoint: req.url,
    requestCount,
    timeWindow: '1min',
  });
}
```

## 🔧 Advanced Configuration

### Custom Log Levels

```typescript
// Set different log levels for different environments
const logLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
```

### Log Rotation

```typescript
// Automatic cleanup after 30 days
// Configured via WINSTON_MAX_FILES=30d
```

### Performance Optimization

```typescript
// Conditional logging for performance
if (process.env.LOG_LEVEL === 'debug') {
  LoggerUtil.debug('Detailed debug info', { largeObject });
}
```

## 🔒 Security Considerations

- **Data Sanitization**: Sensitive data is automatically truncated
- **File Permissions**: Ensure log directories have proper permissions (`chmod 750`)
- **Log Rotation**: Automatic cleanup prevents disk space issues
- **Sensitive Data**: Avoid logging passwords, tokens, or personal data

## 🛠️ Troubleshooting

### Common Issues

1. **No CSV files created**

   ```bash
   # Check permissions
   ls -la api_logs/

   # Verify configuration
   echo $CSV_LOG_DIR
   ```

2. **Large log files**

   ```bash
   # Check current file sizes
   du -sh winston_logs/* api_logs/*

   # Adjust rotation settings
   export WINSTON_MAX_SIZE=10m
   ```

3. **Performance impact**

   ```bash
   # Reduce log level in production
   export LOG_LEVEL=warn

   # Monitor disk I/O
   iostat -x 1
   ```

### Debug Commands

```bash
# Test logging
node -e "
const { LoggerUtil } = require('./dist/common/utils/logger.util');
LoggerUtil.info('Test log entry', { test: true });
"

# Check log files
ls -la winston_logs/ api_logs/

# Verify CSV format
head -1 api_logs/$(date +%d_%m_%Y).csv
```

## 📚 Integration Examples

### Database Integration

```sql
-- PostgreSQL: Import CSV logs
COPY api_logs FROM '/path/to/api_logs/15_01_2024.csv'
WITH (FORMAT csv, HEADER true);

-- Analyze performance
SELECT url, AVG(duration) as avg_duration, COUNT(*) as request_count
FROM api_logs
WHERE statusCode < 400
GROUP BY url
ORDER BY avg_duration DESC;
```

### Monitoring Tools

```yaml
# Prometheus metrics from logs
- name: http_request_duration
  help: HTTP request duration in milliseconds
  type: histogram
  source: csv_logs

- name: application_errors
  help: Application error count
  type: counter
  source: winston_logs
```

---

This unified Winston CSV logging system provides comprehensive logging capabilities while maintaining simplicity and performance. All HTTP requests are automatically logged to CSV files for analytics, while application events are logged to structured JSON files for debugging and monitoring.
