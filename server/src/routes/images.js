const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 确保上传目录存在
const uploadDir = 'uploads/images';
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// 配置multer文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  }
});

// 图像处理任务验证规则
const processImageSchema = Joi.object({
  type: Joi.string().valid('undress', 'face-swap').required(),
  settings: Joi.object().optional()
});

// 上传图片
router.post('/upload', authenticateToken, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    // 保存图片信息到数据库
    const result = await query(
      `INSERT INTO images (user_id, filename, original_name, file_path, file_size, mime_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        req.user.id,
        req.file.filename,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype
      ]
    );

    res.json({
      success: true,
      message: '图片上传成功',
      data: {
        image: {
          id: result.insertId,
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: `/uploads/images/${req.file.filename}`,
          size: req.file.size
        }
      }
    });
  } catch (error) {
    // 如果数据库操作失败，删除已上传的文件
    if (req.file) {
      fs.unlink(req.file.path).catch(console.error);
    }
    next(error);
  }
});

// 批量上传图片
router.post('/upload-multiple', authenticateToken, upload.array('images', 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    const uploadedImages = [];

    // 批量保存图片信息
    for (const file of req.files) {
      const result = await query(
        `INSERT INTO images (user_id, filename, original_name, file_path, file_size, mime_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          req.user.id,
          file.filename,
          file.originalname,
          file.path,
          file.size,
          file.mimetype
        ]
      );

      uploadedImages.push({
        id: result.insertId,
        filename: file.filename,
        originalName: file.originalname,
        url: `/uploads/images/${file.filename}`,
        size: file.size
      });
    }

    res.json({
      success: true,
      message: `成功上传${uploadedImages.length}张图片`,
      data: {
        images: uploadedImages
      }
    });
  } catch (error) {
    // 如果数据库操作失败，删除已上传的文件
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path).catch(console.error);
      });
    }
    next(error);
  }
});

// 创建图像处理任务
router.post('/process', authenticateToken, async (req, res, next) => {
  try {
    // 验证输入数据
    const { error, value } = processImageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { type, prompt, settings } = value;
    const { imageIds } = req.body; // 图片ID数组

    // 验证图片ID
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要处理的图片ID'
      });
    }

    // 验证图片是否属于当前用户
    const images = await query(
      `SELECT id, filename, file_path FROM images
       WHERE id IN (${imageIds.map(() => '?').join(',')}) AND user_id = ?`,
      [...imageIds, req.user.id]
    );

    if (images.length !== imageIds.length) {
      return res.status(400).json({
        success: false,
        message: '部分图片不存在或无权限访问'
      });
    }

    // 创建处理任务
    const taskResult = await query(
      `INSERT INTO processing_tasks (user_id, type, status, prompt, settings, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, type, 'pending', prompt || null, JSON.stringify(settings || {})]
    );

    const taskId = taskResult.insertId;

    // 关联图片到任务
    for (const imageId of imageIds) {
      await query(
        'INSERT INTO task_images (task_id, image_id, type) VALUES (?, ?, ?)',
        [taskId, imageId, 'input']
      );
    }

    res.json({
      success: true,
      message: '图像处理任务创建成功',
      data: {
        task: {
          id: taskId,
          type,
          status: 'pending',
          prompt,
          settings,
          imageCount: images.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取处理任务列表
router.get('/tasks', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 获取任务总数
    const countResult = await query(
      'SELECT COUNT(*) as total FROM processing_tasks WHERE user_id = ?',
      [req.user.id]
    );
    const total = countResult[0].total;

    // 获取任务列表
    const tasks = await query(
      `SELECT id, type, status, prompt, progress, created_at, updated_at, completed_at
       FROM processing_tasks
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取任务详情
router.get('/tasks/:id', authenticateToken, async (req, res, next) => {
  try {
    const taskId = req.params.id;

    // 获取任务信息
    const tasks = await query(
      `SELECT * FROM processing_tasks
       WHERE id = ? AND user_id = ?`,
      [taskId, req.user.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    const task = tasks[0];

    // 获取关联的图片
    const taskImages = await query(
      `SELECT ti.type, i.id, i.filename, i.original_name, i.file_path
       FROM task_images ti
       JOIN images i ON ti.image_id = i.id
       WHERE ti.task_id = ?`,
      [taskId]
    );

    // 按类型分组图片
    const images = {
      input: taskImages.filter(img => img.type === 'input'),
      output: taskImages.filter(img => img.type === 'output')
    };

    res.json({
      success: true,
      data: {
        task: {
          ...task,
          settings: task.settings ? JSON.parse(task.settings) : {},
          images
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取用户的图片列表
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // 获取图片总数
    const countResult = await query(
      'SELECT COUNT(*) as total FROM images WHERE user_id = ?',
      [req.user.id]
    );
    const total = countResult[0].total;

    // 获取图片列表
    const images = await query(
      `SELECT id, filename, original_name, file_size, mime_type, created_at
       FROM images
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    // 添加URL
    const imagesWithUrl = images.map(image => ({
      ...image,
      url: `/uploads/images/${image.filename}`
    }));

    res.json({
      success: true,
      data: {
        images: imagesWithUrl,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
