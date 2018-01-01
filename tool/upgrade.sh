#!/bin/sh

export P_METAFILE=../DESIGN.md
export P_DB=server-pc/jdcloud
export P_DBCRED=demo:demo123

php upgrade.php
