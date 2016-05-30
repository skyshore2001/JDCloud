@echo off

echo Current SVC_URL: %SVC_URL%
echo ========= please choose one =========
echo 1. Local
echo 2. Remote
echo 3. Remote with HTTPS
echo 4. Remote production env
:again
set P_TEST=
set opt=
set /p opt="Your choice: "

if "%opt%"=="1" (
set SVC_URL=http://localhost:1080
goto :END
)

if "%opt%"=="1a" (
set SVC_URL=http://192.168.3.135/cheguanjia
goto :END
)

if "%opt%"=="2" (
set SVC_URL=http://115.29.199.210/cheguanjia
goto :END
)

if "%opt%"=="3" (
set SVC_URL=https://115.29.199.210/cheguanjia
goto :END
)

if "%opt%"=="4" (
set P_TEST=0
set SVC_URL=https://115.29.199.210/cheguanjia
goto :END
)

goto :again

:END
set SVC_URL
