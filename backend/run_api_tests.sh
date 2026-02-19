#!/bin/bash

# API Base URL
BASE_URL="http://localhost:3001/api"
BACKGROUND_GREEN='\033[42m'
text_reset='\033[0m'
text_bold='\033[1m'
text_red='\033[31m'
text_green='\033[32m'

echo -e "${text_bold}🚀 API Test Script Started...${text_reset}"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install jq to run this script."
    exit 1
fi

# 1. Register User
echo 
echo -e "${text_bold}1. Registering User...${text_reset}"
REGISTER_PAYLOAD='{
  "mbti": "INTJ",
  "baseline_scores": {
    "caution": 60,
    "calmness": 70,
    "logic": 80,
    "cooperativeness": 40,
    "positivity": 50
  }
}'

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_PAYLOAD")

echo "Response: $REGISTER_RESPONSE"

USER_ID=$(echo $REGISTER_RESPONSE | jq -r '.user_id')

if [ "$USER_ID" == "null" ] || [ -z "$USER_ID" ]; then
    echo -e "${text_red}❌ Registration failed.${text_reset}"
    exit 1
else
    echo -e "${text_green}✅ User Registered with ID: $USER_ID${text_reset}"
fi

# 2. Submit Game 1 (Tap Game)
echo 
echo -e "${text_bold}2. Submitting Game 1 (Tap Game)...${text_reset}"
GAME1_PAYLOAD='{
  "user_id": "'"$USER_ID"'",
  "game_type": 1,
  "data": {
    "score": 100,
    "tap_count": 50,
    "miss_count": 2
  }
}'

GAME1_RESPONSE=$(curl -s -X POST "$BASE_URL/games/submit" \
  -H "Content-Type: application/json" \
  -d "$GAME1_PAYLOAD")

echo "Response: $GAME1_RESPONSE"
STATUS1=$(echo $GAME1_RESPONSE | jq -r '.status')

if [ "$STATUS1" == "success" ]; then
    echo -e "${text_green}✅ Game 1 Submitted.${text_reset}"
else
    echo -e "${text_red}❌ Game 1 Submission Failed.${text_reset}"
    # Continue anyway to test others
fi

# 3. Submit Game 2 (Choice Game)
echo 
echo -e "${text_bold}3. Submitting Game 2 (Choice Game)...${text_reset}"
GAME2_PAYLOAD='{
  "user_id": "'"$USER_ID"'",
  "game_type": 2,
  "data": {
    "choice_history": ["A", "B", "A"],
    "reaction_times": [300, 450, 320]
  }
}'

GAME2_RESPONSE=$(curl -s -X POST "$BASE_URL/games/submit" \
  -H "Content-Type: application/json" \
  -d "$GAME2_PAYLOAD")

echo "Response: $GAME2_RESPONSE"
STATUS2=$(echo $GAME2_RESPONSE | jq -r '.status')

if [ "$STATUS2" == "success" ]; then
    echo -e "${text_green}✅ Game 2 Submitted.${text_reset}"
else
    echo -e "${text_red}❌ Game 2 Submission Failed.${text_reset}"
fi

# 4. Get Results
echo 
echo -e "${text_bold}4. Getting Results...${text_reset}"
RESULT_RESPONSE=$(curl -s -X GET "$BASE_URL/results/$USER_ID")

echo "Response: $RESULT_RESPONSE"
ACCURACY_SCORE=$(echo $RESULT_RESPONSE | jq -r '.accuracy_score // "null"')

if [ "$ACCURACY_SCORE" != "null" ]; then
     echo -e "${text_green}✅ Results Retrieved. Accuracy Score: $ACCURACY_SCORE${text_reset}"
else
     echo -e "${text_red}❌ Failed to retrieve valid results.${text_reset}"
fi

# 5. Test Voice (Gemini)
echo 
echo -e "${text_bold}5. Testing Voice (Gemini)...${text_reset}"
VOICE_PAYLOAD='{
  "message": "テストです。こんにちは。",
  "scenario_type": "normal"
}'

VOICE_RESPONSE=$(curl -s -X POST "$BASE_URL/voice/respond" \
  -H "Content-Type: application/json" \
  -d "$VOICE_PAYLOAD")

echo "Response: $VOICE_RESPONSE"
VOICE_STATUS=$(echo $VOICE_RESPONSE | jq -r '.status')
RESPONSE_TEXT=$(echo $VOICE_RESPONSE | jq -r '.response // "null"')

if [ "$VOICE_STATUS" == "success" ] && [ "$RESPONSE_TEXT" != "null" ]; then
    echo -e "${text_green}✅ Voice API Success. Response: $RESPONSE_TEXT${text_reset}"
else
    echo -e "${text_red}❌ Voice API Failed.${text_reset}"
fi

echo 
echo -e "${BACKGROUND_GREEN}${text_bold} 🎉 All Tests Completed! ${text_reset}"
