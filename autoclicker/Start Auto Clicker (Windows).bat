@echo off
rem Double-click this file to open the Auto Clicker on Windows.
cd /d "%~dp0"
.venv\Scripts\python -c "import pynput" 2>nul && goto run
where py >nul 2>nul || (echo Please install Python from https://www.python.org/downloads/ and then double-click this file again. & pause & exit /b 1)
echo First run: getting things ready, this takes a minute...
if exist .venv rmdir /s /q .venv
py -m venv .venv || (pause & exit /b 1)
.venv\Scripts\python -m pip install --quiet -r requirements.txt || (pause & exit /b 1)
:run
start "" .venv\Scripts\pythonw autoclicker.py
