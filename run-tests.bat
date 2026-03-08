@echo off
REM Test runner script for Windows
REM Usage: run-tests.bat

echo ==========================================
echo Running Data Ownership Detection Tests
echo ==========================================
echo.

REM Check if npm is available
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed or not in PATH
    echo Please install Node.js and npm to run tests
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
)

REM Check if vitest is installed
call npm list vitest >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing test dependencies...
    call npm install -D vitest @vitest/ui
)

echo [INFO] Running automated tests...
echo.

REM Run tests
call npm run test:run

echo.
echo ==========================================
echo Test run complete!
echo.
echo Next steps:
echo 1. Review test results above
echo 2. Run 'npm run dev' for browser testing
echo 3. Use BROWSER-TEST-CHECKLIST.md for manual UI testing
echo ==========================================
pause
