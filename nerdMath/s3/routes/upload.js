const express = require('express');
const router = express.Router();
const { uploadSingleImage, handleUploadError } = require('../middleware/upload');
const { verifyToken } = require('../../mysql/middleware/auth');
const { createHttpError, ERROR_CODES } = require('../../mongodb/utils/errorHandler');

  // 이미지 업로드 (인증 필요)
router.post('/image', verifyToken, (req, res, next) => {
  uploadSingleImage(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    
    // 파일이 업로드되지 않은 경우
    if (!req.file) {
      return res.status(400).json(createHttpError(400, '업로드할 이미지 파일을 선택해주세요', ['file']));
    }
  
  try {
    // 업로드 성공 응답
    const imageUrl = req.file.location; // S3 URL
    const fileName = req.file.key; // S3 키
    const fileSize = req.file.size; // 파일 크기
    const mimeType = req.file.mimetype; // 파일 타입
    
    console.log('📁 이미지 업로드 성공:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👤 사용자 ID: ${req.user.id}`);
    console.log(`📁 파일명: ${fileName}`);
    console.log(`🔗 URL: ${imageUrl}`);
    console.log(`📏 크기: ${(fileSize / 1024).toFixed(2)} KB`);
    console.log(`📋 타입: ${mimeType}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    res.status(200).json({
      success: true,
      message: '이미지가 성공적으로 업로드되었습니다.',
      data: {
        imageUrl: imageUrl,
        fileName: fileName,
        fileSize: fileSize,
        mimeType: mimeType
      }
    });
    
  } catch (error) {
    console.error('❌ 이미지 업로드 처리 오류:', error);
    res.status(500).json(createHttpError(500, '이미지 업로드 처리 중 오류가 발생했습니다'));
  }
});
});

// 이미지 업로드 (인증 없음 - 테스트용)
router.post('/image/test', (req, res, next) => {
  uploadSingleImage(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    
    // 파일이 업로드되지 않은 경우
    if (!req.file) {
      return res.status(400).json(createHttpError(400, '업로드할 이미지 파일을 선택해주세요', ['file']));
    }
    
    try {
      // 업로드 성공 응답
      const imageUrl = req.file.location; // S3 URL
      const fileName = req.file.key; // S3 키
      const fileSize = req.file.size; // 파일 크기
      const mimeType = req.file.mimetype; // 파일 타입
      
      console.log('📁 이미지 업로드 성공 (테스트):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📁 파일명: ${fileName}`);
      console.log(`🔗 URL: ${imageUrl}`);
      console.log(`📏 크기: ${(fileSize / 1024).toFixed(2)} KB`);
      console.log(`📋 타입: ${mimeType}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      res.status(200).json({
        success: true,
        message: '이미지가 성공적으로 업로드되었습니다.',
        data: {
          imageUrl: imageUrl,
          fileName: fileName,
          fileSize: fileSize,
          mimeType: mimeType
        }
      });
      
    } catch (error) {
      console.error('❌ 이미지 업로드 처리 오류:', error);
      res.status(500).json(createHttpError(500, '이미지 업로드 처리 중 오류가 발생했습니다'));
    }
  });
});

module.exports = router;
