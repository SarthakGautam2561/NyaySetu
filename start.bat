@echo off
echo ================================================
echo   NyaySetu - AI Legal Assistant
echo   Starting server at http://localhost:8000
echo ================================================
cd /d "%~dp0backend"
"C:\Users\sarthak\AppData\Local\Programs\Python\Python313\python.exe" -m pip install -r requirements.txt -q
"C:\Users\sarthak\AppData\Local\Programs\Python\Python313\python.exe" main.py
pause
