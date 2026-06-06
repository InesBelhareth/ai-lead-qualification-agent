#!/bin/bash
# ================================================
# Test the webhook endpoint with sample lead data
# Usage: bash test/test-webhook.sh [WEBHOOK_URL]
# ================================================

WEBHOOK_URL=${1:-"http://localhost:5678/webhook/qualify-lead"}

echo "🚀 Sending test lead to: $WEBHOOK_URL"
echo "-------------------------------------------"

curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sophie Martin",
    "email": "sophie@techstartup.io",
    "company": "TechStartup SAS",
    "message": "We are looking for a solution to automate our customer onboarding. We have about 500 new users per month and the manual process is becoming a bottleneck. Would love to discuss a custom integration.",
    "budget": "5000-10000 EUR"
  }' | python3 -m json.tool

echo ""
echo "✅ Done. Check your Supabase table for the saved lead."
