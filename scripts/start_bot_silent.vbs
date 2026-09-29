' Sommai Telegram Bot - Silent Background Runner
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "c:\Users\admin\.gemini\antigravity-ide\scratch\personal-finance-ai"
WshShell.Run "node src/bot/sommai_bot.mjs", 0, False
