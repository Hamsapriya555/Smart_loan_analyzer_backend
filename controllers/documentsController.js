const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');


// Local dev storage directory
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Simple in-memory model replacement when Document model not present yet
// If you later add a Mongoose model Document, replace these operations accordingly
const DocumentModel = mongoose.models?.Document || null;

// Standard response helper
const ok = (res, data, message = 'OK') => res.json({ success: true, data, message });
const err = (res, code, message) => res.status(code).json({ success: false, message });

// GET /api/documents
exports.listDocuments = async (req, res) => {
  try {
    if (DocumentModel) {
      const docs = await DocumentModel.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
      return ok(res, docs, 'Documents fetched');
    }
    // FS fallback: enumerate user files in uploads/<userId>
    const userDir = path.join(UPLOAD_DIR, String(req.user.id));
    if (!fs.existsSync(userDir)) return ok(res, [], 'Documents fetched');
    const entries = fs.readdirSync(userDir).map((file) => ({
      id: file,
      name: file,
      url: `/api/documents/${encodeURIComponent(file)}/download`,
      sizeBytes: fs.statSync(path.join(userDir, file)).size,
      userId: req.user.id,
      createdAt: fs.statSync(path.join(userDir, file)).ctime,
    }));
    return ok(res, entries, 'Documents fetched');
  } catch (e) {
    return err(res, 500, e.message || 'Failed to list documents');
  }
};

// POST /api/documents/upload (multipart/form-data, field: file)
exports.uploadDocument = async (req, res) => {
  try {
    const file = req.file; // provided by multer
    if (!file) return err(res, 400, 'No file uploaded');

    if (DocumentModel) {
      const doc = await DocumentModel.create({
        userId: req.user.id,
        filename: file.originalname,
        mimetype: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.path,
      });
      return ok(res, doc, 'Uploaded');
    }

    // FS fallback already saved by multer to file.path
    const entry = {
      id: path.basename(file.path),
      name: file.originalname,
      url: `/api/documents/${encodeURIComponent(path.basename(file.path))}/download`,
      sizeBytes: file.size,
      userId: req.user.id,
      createdAt: new Date(),
    };
    return ok(res, entry, 'Uploaded');
  } catch (e) {
    return err(res, 500, e.message || 'Failed to upload');
  }
};

// GET /api/documents/:id/download
exports.downloadDocument = async (req, res) => {
  try {
    const id = req.params.id;
    if (DocumentModel) {
      const doc = await DocumentModel.findOne({ _id: id, userId: req.user.id });
      if (!doc) return err(res, 404, 'Not found');
      return res.download(doc.storagePath, doc.filename);
    }
    const userDir = path.join(UPLOAD_DIR, String(req.user.id));
    const filePath = path.join(userDir, id);
    if (!fs.existsSync(filePath)) return err(res, 404, 'Not found');
    return res.download(filePath, id);
  } catch (e) {
    return err(res, 500, e.message || 'Failed to download');
  }
};

// DELETE /api/documents/:id
exports.deleteDocument = async (req, res) => {
  try {
    const id = req.params.id;
    if (DocumentModel) {
      const doc = await DocumentModel.findOneAndDelete({ _id: id, userId: req.user.id });
      if (!doc) return err(res, 404, 'Not found');
      try { fs.unlinkSync(doc.storagePath); } catch (_) {}
      return ok(res, { id }, 'Deleted');
    }
    const userDir = path.join(UPLOAD_DIR, String(req.user.id));
    const filePath = path.join(userDir, id);
    if (!fs.existsSync(filePath)) return err(res, 404, 'Not found');
    fs.unlinkSync(filePath);
    return ok(res, { id }, 'Deleted');
  } catch (e) {
    return err(res, 500, e.message || 'Failed to delete');
  }
};

// Multer setup factory for routes
exports.createMulter = () => {
  const multer = require('multer');
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const userDir = path.join(UPLOAD_DIR, String(req.user.id));
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      cb(null, userDir);
    },
    filename: (req, file, cb) => {
      const safe = `${Date.now()}_${file.originalname.replace(/[^\w\.-]+/g, '_')}`;
      cb(null, safe);
    },
  });
  return multer({ storage });
};
