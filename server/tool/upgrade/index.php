<?php

chdir(__DIR__);
require_once("../../api.php");

function upgrade()
{
	$meta = __DIR__ . "/META";
	putenv("P_METAFILE=$meta");

	header("Content-Type: text/plain; charset=utf-8");
 	require_once("upglib.php");
	$opt = [];
	$createdb = isset($_GET["createdb"]);
	if ($createdb)
		$opt["createdb"] = 1;
 	$h = new UpgHelper($opt);
	$diff = isset($_GET["diff"]);
	if (! $diff) {
		$h->updateDB();
		if ($createdb && file_exists("addon.xml")) {
			$ac = "install";
			include("../upgrade-addon.php");
		}
	}
	else {
		$h->showTable(null, true);
		echo("!!! JUST SHOW SQL. Please copy and execute SQL manually.\n");
	}
}

try {
	upgrade();
}
catch (Exception $ex) {
	echo("*** Fail to upgrade: " . (string)$ex . "\n");
}
