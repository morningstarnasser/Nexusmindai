#!/bin/bash

# NexusMind Dashboard Server
# Simple HTTP server to serve the dashboard on port 3000

cd "$(dirname "$0")/dashboard" || exit 1

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         NexusMind Dashboard Server                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Dashboard available at: http://localhost:3000"
echo "🔗 Connecting to Gateway at: http://localhost:4848"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 -m http.server 3000
