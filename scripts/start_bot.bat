@echo off
title Sommai Telegram Bot Daemon
cd /d "c:\Users\admin\.gemini\antigravity-ide\scratch\personal-finance-ai"
echo Starting Sommai Telegram Bot v2.7...
node --env-file=.env src/bot/sommai_bot.mjs
pause
