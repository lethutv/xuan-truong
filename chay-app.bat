@echo off
cd /d "%~dp0"
echo Dang mo app tai http://localhost:8765  (dong cua so nay de tat)
start "" http://localhost:8765
python -m http.server 8765
