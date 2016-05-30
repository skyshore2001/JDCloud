<?php

if (getenv("P_DB") === false) {
	// use SQLite:
	//putenv("P_DB=myorder.db");
	//putenv("P_DBCRED=");

	// use MySQL:
	putenv("P_DB=localhost/jdcloud");
	putenv("P_DBCRED=ZGVtbzpkZW1vMTIz");

	// Set the base URL, it affect session security, etc.
	putenv("P_URL_PATH=/jdcloud");
}

// debug level: default value=0
// putenv("P_DEBUG=9");

// test mode: default value=0
// $GLOBALS["TEST_MODE"] =1;

