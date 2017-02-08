@echo off

set DB=jdcloud

echo ========= please choose one =========
echo 0. Local DB file
echo 1. Local server
echo 2. Remote server (production env)
:again
set opt=
set /p opt="Your choice: "

if "%opt%"=="0" (
set P_DBCRED=
set dir=%~dp0
set P_DB=%dir%../server/%DB%.db
goto :END
)

if "%opt%"=="1" (
set P_DBCRED=
set P_DB=192.168.3.135/%DB%
goto :END
)

if "%opt%"=="2" (
set P_DBCRED=ZGVtbzpkZW1vMTIz
set P_DB=115.29.199.210/%DB%
goto :END
)

goto :again

:END
::echo Done.
set P_DB
