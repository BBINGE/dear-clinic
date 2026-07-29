@echo off
chcp 65001 > nul
cd /d "%~dp0"
node "%~dp0tools\column-editor-server.mjs"
if errorlevel 1 pause
