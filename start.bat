@echo off
echo Starting Amelia...

start "Amelia Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --reload --port 8000"
timeout /t 4 /nobreak > nul
start "Amelia Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 5 /nobreak > nul
start "" "http://localhost:3000"

echo.
echo Amelia is running!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
