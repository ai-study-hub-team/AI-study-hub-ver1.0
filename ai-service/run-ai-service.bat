@echo off
cd /d D:\AI_study_hub_ver1.0\ai-service

echo Activating Python virtual environment...
call venv\Scripts\activate.bat

echo Starting AI service at http://localhost:8000
uvicorn main:app --reload

pause