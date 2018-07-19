#!/bin/sh

export OUT_DIR=../jdcloud-online
export GIT_PATH=www@server:path
# export FTP_PATH=ftp://server/path/
# export FTP_AUTH=www:hello

tool/jdcloud-build.sh
