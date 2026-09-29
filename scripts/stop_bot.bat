@echo off
title Stop Sommai Telegram Bot
cd /d "c:\Users\admin\.gemini\antigravity-ide\scratch\personal-finance-ai"
if exist src\bot\bot.pid (
  set /p BOT_PID=<src\bot\bot.pid
  echo Stopping Sommai Bot PID: %BOT_PID%
  taskkill /PID %BOT_PID% /F >nul 2>&1
  del /f /q src\bot\bot.pid >nul 2>&1
  echo Bot stopped successfully.
) else (
  echo No bot.pid file found. Checking for running instances...
  wmic process where "name='node.exe' and CommandLine like '%%sommai_bot.mjs%%'" call terminate >nul 2>&1
  echo Done.
)
timeout /t 2 >nul
