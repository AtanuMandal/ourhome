@echo off
echo Creating Infrastructure project directories and files...
echo.
cd /d "%~dp0"
python create_infra_files.py
if errorlevel 1 (
    echo.
    echo Trying with py launcher...
    py create_infra_files.py
)
echo.
echo Done! Press any key to exit.
pause > nul
