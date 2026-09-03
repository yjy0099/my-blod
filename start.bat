@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "PY="
where python >nul 2>nul
if not errorlevel 1 set "PY=python"

if not defined PY (
  where py >nul 2>nul
  if not errorlevel 1 set "PY=py"
)

if not defined PY if exist "D:\Program Files\Python312\python.exe" set "PY=D:\Program Files\Python312\python.exe"
if not defined PY if exist "%USERPROFILE%\.workbuddy\binaries\python\versions\3.13.12\python.exe" set "PY=%USERPROFILE%\.workbuddy\binaries\python\versions\3.13.12\python.exe"

if not defined PY (
  echo [x] No Python found. Please install Python 3 first.
  pause
  exit /b 1
)

"%PY%" tools\serve.py
pause
