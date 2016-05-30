@echo off
setlocal
set apk=%1

set keystore=my.keystore
set pwd=123456
set alias=my
set pwd2=123456

if "%apk%" == "" (
	echo *** Usage: sign {apk-file}
	goto :EOF
)

7z d -tzip %apk% META-INF
jarsigner -verbose -keystore %keystore% -signedjar %apk% %apk% %alias% -storepass "%pwd%" -keypass "%pwd2%" 
echo === Update %apk%
