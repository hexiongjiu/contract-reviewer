@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing local vector-search dependency...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
if not exist server\vector-data\legal-vectors.f32 (
  echo Building legal vector index for the first run...
  call npm run build:vectors
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Open http://127.0.0.1:8765 in your browser.
call npm start
pause
