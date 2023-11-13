<?php

// if (strpos($_SERVER["SCRIPT_NAME"], "/jdcloud-test/") === 0)
putenv("P_DB=localhost/jdcloud");
putenv("P_DBCRED=ZGVtbzpkZW1vMTIz");

// $GLOBALS["conf_dataDir"] = __DIR__ . "/../data-jdcloud";

// test mode: default value=0
// putenv("P_TEST_MODE=1");

// debug level: default value=0
// putenv("P_DEBUG=9");
// putenv("P_DEBUG_LOG=1"); // 0: no log to 'debug.log' 1: all log, 2: error log

// for super admin:
// putenv("P_ADMIN_CRED=bGlhbmc6bGlhbmcxMjM=");

