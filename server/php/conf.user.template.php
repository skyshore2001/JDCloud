<?php

if (getenv("P_DB") === false) {
	// use SQLite:
	//putenv("P_DB=jdcloud.db");
	//putenv("P_DBCRED=");

	// use MySQL:
	putenv("P_DB=localhost/jdcloud");
	putenv("P_DBCRED=ZGVtbzpkZW1vMTIz");
}

// Set the base URL, it affect session security, etc.
putenv("P_URL_PATH=/jdcloud");

// for super admin:
// putenv("P_ADMIN_CRED=bGlhbmc6bGlhbmcxMjM=");

// debug level: default value=0
// putenv("P_DEBUG=9");

// test mode: default value=0
// $GLOBALS["TEST_MODE"] =1;

