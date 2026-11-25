@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   VeloX Time Travel - Distribution Packaging
echo ========================================================

set "PROJECT_ROOT=%~dp0"
set "DIST_DIR=%PROJECT_ROOT%dist"
set "SRC_FF=%PROJECT_ROOT%src\firefox"
set "SRC_CH=%PROJECT_ROOT%src\chrome"

if not exist "%DIST_DIR%" (
    mkdir "%DIST_DIR%"
)

set "ZIP_FF=%DIST_DIR%\velox-time-travel-firefox-v1.0.0.zip"
set "ZIP_CH=%DIST_DIR%\velox-time-travel-chrome-v1.0.0.zip"

if exist "%ZIP_FF%" del /f /q "%ZIP_FF%"
if exist "%ZIP_CH%" del /f /q "%ZIP_CH%"

echo [1/2] Packaging Firefox distribution...
powershell -NoProfile -Command "Compress-Archive -Path '%SRC_FF%\*' -DestinationPath '%ZIP_FF%' -Force"
if exist "%ZIP_FF%" (
    echo   [OK] Firefox zip created: %ZIP_FF%
) else (
    echo   [FAIL] Failed to create Firefox package.
)

echo [2/2] Packaging Chrome distribution...
powershell -NoProfile -Command "Compress-Archive -Path '%SRC_CH%\*' -DestinationPath '%ZIP_CH%' -Force"
if exist "%ZIP_CH%" (
    echo   [OK] Chrome zip created: %ZIP_CH%
) else (
    echo   [FAIL] Failed to create Chrome package.
)

echo.
echo Packaging complete! Output files are located in: %DIST_DIR%
