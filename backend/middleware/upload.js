const multer = require('multer');

// Configure multer to store files in memory (buffer) needed for R2 upload
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const path = require('path');
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'text/csv',
            'application/zip', 'application/x-zip-compressed',
            'application/x-rar-compressed', 'application/x-7z-compressed'
        ];

        // 1. Validate MIME type
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type'));
        }

        // 2. Validate extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.zip', '.rar', '.7z'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            return cb(new Error('Invalid file extension'));
        }

        // 3. Prevent dangerous double extensions (Sanitization below will handle this)
        // We'll allow dots in filenames but sanitize them to underscores for safety
        const filename = path.basename(file.originalname, ext);

        // 4. Sanitize filename
        // Remove special characters, limit length, prevent directory traversal
        const sanitizedFilename = filename
            .replace(/[^a-zA-Z0-9\-\_]/g, '_')
            .substring(0, 50) + ext;

        // Store sanitized filename in request for the controller to use
        // Note: Multer memory storage doesn't use this automatically, 
        // the controller needs to use req.sanitizedFilename or we need to modify file object
        file.originalname = sanitizedFilename; // Override original name for safety

        cb(null, true);
    }
});

module.exports = upload;
