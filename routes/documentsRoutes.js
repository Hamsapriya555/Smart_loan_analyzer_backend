const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const docs = require('../controllers/documentsController');

// All require auth
router.use(auth);

// Multer for upload
const multer = docs.createMulter();

// GET /api/documents
router.get('/', docs.listDocuments);

// POST /api/documents/upload
router.post('/upload', multer.single('file'), docs.uploadDocument);

// GET /api/documents/:id/download
router.get('/:id/download', docs.downloadDocument);

// DELETE /api/documents/:id
router.delete('/:id', docs.deleteDocument);

module.exports = router;
