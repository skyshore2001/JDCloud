@echo off

echo ========= please choose one =========
echo 0. Local DB file
echo 1. Local server (test mode)
echo 2. Local server
echo 3. Remote server (test mode)
echo 4. Remote server (production env)
:again
set opt=
set /p opt="Your choice: "

if "%opt%"=="0" (
set P_DBCRED=
set P_DB=d:/project/app_fw/product/server/order.db
goto :END
)

if "%opt%"=="1" (
set P_DBCRED=
set P_DB=192.168.3.135/carsvc_test
goto :END
)

if "%opt%"=="2" (
set P_DBCRED=
set P_DB=192.168.3.135/carsvc
goto :END
)

if "%opt%"=="3" (
set P_DBCRED=eGV5YzpYZVlDQDIwMTQ=
set P_DB=115.29.199.210/carsvc_test
goto :END
)

if "%opt%"=="4" (
set P_DBCRED=eGV5YzpYZVlDQDIwMTQ=
set P_DB=115.29.199.210/carsvc
goto :END
)

goto :again

:END
echo Done.
::set P_DB