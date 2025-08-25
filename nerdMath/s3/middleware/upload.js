const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3Client, bucketName } = require('../config/s3');
const path = require('path');

// 파일 필터링 (이미지 파일만 허용)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('지원하지 않는 파일 형식입니다. JPEG, PNG, GIF, WebP만 업로드 가능합니다.'), false);
  }
};

// S3 업로드 설정
const upload = multer({
                storage: multerS3({
                s3: s3Client,
                bucket: bucketName,
                // acl: 'public-read' 제거 - S3 버킷이 ACL을 지원하지 않음
    key: (req, file, cb) => {
      // 파일명 생성: timestamp-originalname
      const timestamp = Date.now();
      const originalName = file.originalname;
      const extension = path.extname(originalName);
      const fileName = `${timestamp}-${path.basename(originalName, extension)}${extension}`;
      
      // 폴더 구조: images/yyyy/mm/dd/filename
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const key = `images/${year}/${month}/${day}/${fileName}`;
      cb(null, key);
    },
    contentType: (req, file, cb) => {
      cb(null, file.mimetype);
    }
  }),
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
    files: 1 // 한 번에 1개 파일만
  }
});

// 단일 이미지 업로드
const uploadSingleImage = upload.single('image');

// 에러 핸들링 미들웨어
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '파일 크기가 너무 큽니다. 5MB 이하의 파일만 업로드 가능합니다.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '한 번에 하나의 파일만 업로드 가능합니다.'
      });
    }
  }
  
  if (err.message.includes('지원하지 않는 파일 형식')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  console.error('📁 파일 업로드 오류:', err);
  return res.status(500).json({
    success: false,
    message: '파일 업로드 중 오류가 발생했습니다.'
  });
};

module.exports = {
  uploadSingleImage,
  handleUploadError
};
