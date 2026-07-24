@echo off
REM Fires 100 POST requests at the local seed endpoint, 20 at a time in parallel.
REM Actual concurrency is implemented in seed-100.ps1 via PowerShell background
REM jobs (safe, self-cleaning) - this wrapper just launches it so you still have
REM a plain .bat to double-click or run.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0seed-100.ps1" -Url "http://localhost:7071/api/seed" -SeedKey "dev-seed-2024" -Total 100 -Concurrency 2
