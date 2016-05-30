#!/bin/sh

export OUT_DIR=../jdcloud-online
export FTP_PATH=ftp://server/path/
export FTP_AUTH=www:hello

tool/make_install.sh
