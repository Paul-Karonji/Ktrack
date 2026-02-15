const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
);

// Create logger instance
const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        // Write security events to security.log
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/security.log'),
            level: 'warn' // Log warning and above (error) to file
        })
    ]
});

// Helper for security events
logger.security = (message, meta = {}) => {
    logger.warn(`SECURITY_EVENT: ${message} | IP: ${meta.ip || 'unknown'} | User: ${meta.user || 'unknown'}`);
};

module.exports = logger;
