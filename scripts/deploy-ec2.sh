#!/bin/bash
# Deploy to EC2 — rsync code, build on EC2, run with docker-compose
# Usage: ./scripts/deploy-ec2.sh <EC2_HOST> <EC2_USER> <PEM_KEY>
# Example: ./scripts/deploy-ec2.sh ec2-1-2-3-4.compute-1.amazonaws.com ec2-user ~/.ssh/my-key.pem

set -e

EC2_HOST=${1:?Usage: $0 <EC2_HOST> <EC2_USER> <PEM_KEY>}
EC2_USER=${2:-ec2-user}
PEM_KEY=${3:?Usage: $0 <EC2_HOST> <EC2_USER> <PEM_KEY>}
REMOTE="$EC2_USER@$EC2_HOST"
APP_DIR="/home/$EC2_USER/app"

echo "▶ Syncing code to EC2..."
rsync -az --progress \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .env \
  --exclude agent/.gitagent \
  -e "ssh -i $PEM_KEY -o StrictHostKeyChecking=no" \
  ./ "$REMOTE:$APP_DIR/"

echo "▶ Copying .env to EC2..."
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no .env "$REMOTE:$APP_DIR/.env"

echo "▶ Building and starting on EC2..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$REMOTE" bash <<EOF
  cd $APP_DIR
  docker compose down 2>/dev/null || true
  docker compose up --build -d
  echo ""
  echo "✓ Status:"
  docker compose ps
EOF

echo ""
echo "✓ Deployed → http://$EC2_HOST:3000"
