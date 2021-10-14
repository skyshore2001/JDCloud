<?php

chdir(__DIR__);
require_once("../../api.php");

function upgrade()
{
	$diff = param("diff", 0);

	$meta = __DIR__ . "/META";
	putenv("P_METAFILE=$meta");

	header("Content-Type: text/plain; charset=utf-8");
 	require_once("upglib.php");
 	$h = new UpgHelper();
	if (param("diff") != 1) {
		$h->updateDB();
	}
	else {
		$h->showTable(null, true);
		echo("!!! JUST SHOW SQL. Please copy and execute SQL manually.\n");
	}
}

upgrade();
