#!/bin/bash

echo "🚀 NerdMath 서버 시작 중..."

# 기존 컨테이너 정리
echo "🧹 기존 컨테이너 정리 중..."
sudo docker stop nerdmath-app 2>/dev/null || true
sudo docker rm nerdmath-app 2>/dev/null || true

# 새 컨테이너 실행
echo "🐳 새 컨테이너 실행 중..."
sudo docker run -d -p 3000:3000 \
  -e AWS_REGION=ap-northeast-2 \
  -e AWS_ACCESS_KEY_ID=AKIA4LPCDVFRFFSSLQGD \
  -e AWS_SECRET_ACCESS_KEY=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 \
  -e FROM_EMAIL=56j78@naver.com \
  --name nerdmath-app nerdmath

echo "✅ 서버가 포트 3000에서 실행 중입니다!"
echo "📊 로그 확인: sudo docker logs -f nerdmath-app"
echo "🛑 중지: sudo docker stop nerdmath-app"
