#!/bin/sh

export OUT_DIR=../jdcloud-m-online
export FTP_PATH=ftp://server/path/
export FTP_AUTH=www:hello

tool/jdcloud-build.sh
