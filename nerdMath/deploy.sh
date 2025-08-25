#!/bin/bash

echo "🚀 NerdMath 배포 시작..."

# 기존 컨테이너 중지 및 제거
echo "📦 기존 컨테이너 정리..."
docker-compose down

# 새 이미지 빌드
echo "🔨 Docker 이미지 빌드..."
docker-compose build --no-cache

# 컨테이너 시작
echo "▶️ 컨테이너 시작..."
docker-compose up -d

# 상태 확인
echo "✅ 배포 완료!"
echo "🌐 서버 상태 확인 중..."
sleep 5
curl -f http://localhost:3002/health || echo "⚠️ 서버 응답 없음"

echo "📊 컨테이너 상태:"
docker-compose ps
