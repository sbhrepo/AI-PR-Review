#!/bin/bash
set -e

echo "🚀 Starting pr-ai-reviewer deployment..."

# Check prerequisites
check_prerequisites() {
  echo "📋 Checking prerequisites..."
  
  if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
  fi
  
  if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
  fi
  
  echo "✅ Prerequisites satisfied"
}

# Install dependencies
install_deps() {
  echo "📦 Installing dependencies..."
  npm ci
  echo "✅ Dependencies installed"
}

# Build project
build_project() {
  echo "🔨 Building project..."
  npm run build
  echo "✅ Build complete"
}

# Run tests
run_tests() {
  echo "🧪 Running tests..."
  npm test
  echo "✅ Tests passed"
}

# Setup config files
setup_config() {
  echo "⚙️  Setting up configuration..."
  
  if [ ! -f "pr-ai-reviewer.config.yaml" ]; then
    echo "📝 Creating config from example..."
    cp examples/pr-ai-reviewer.config.yaml ./
  fi
  
  if [ ! -f "AI-review-request.txt" ]; then
    echo "📝 Creating policy from example..."
    cp examples/AI-review-request.txt ./
  fi
  
  if [ ! -f ".env" ]; then
    echo "📝 Creating .env from example..."
    cp examples/.env.example .env
    echo "⚠️  Please edit .env with your credentials"
  fi
  
  echo "✅ Configuration ready"
}

# Health check
health_check() {
  echo "🏥 Running health check..."
  
  if npm start health-check; then
    echo "✅ Health check passed"
  else
    echo "⚠️  Health check failed - Ollama may not be accessible"
    echo "   Make sure Ollama is running and accessible"
  fi
}

# Main deployment
main() {
  check_prerequisites
  install_deps
  build_project
  run_tests
  setup_config
  health_check
  
  echo ""
  echo "✨ Deployment complete!"
  echo ""
  echo "Next steps:"
  echo "1. Edit .env with your credentials"
  echo "2. Review pr-ai-reviewer.config.yaml"
  echo "3. Customize AI-review-request.txt"
  echo "4. Run: npm start review-pr --repo owner/repo --pr 123"
  echo "   or: npm start serve-webhooks --port 3000"
}

main
