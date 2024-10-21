<?php
/*
升级：
	upgrade/

显示差异SQL，用于手工复制执行：
	upgrade/?diff

创建DB，执行init.sql，升级addon
	upgrade/?createdb

执行init.sql (依次找路径$projectdir/server/tool/upgrade/init.sql,  $projectdir/data/init.sql, 只执行一个)
	upgrade/?initsql
(利用该接口可将语句写到init.sql中调用执行)
*/

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
	$initsql = isset($_GET["initsql"]) || $createdb;
	if ($createdb) {
		$opt["createdb"] = 1;
	}
 	$h = new UpgHelper($opt);
	$diff = isset($_GET["diff"]);
	if ($diff) {
		$h->showTable(null, true);
		echo("!!! JUST SHOW SQL. Please copy and execute SQL manually.\n");
		return;
	}

	$h->updateDB();
	if ($initsql) {
		execInitSql();
	}
	if ($createdb && file_exists("addon.xml") && file_exists("../upgrade-addon.php")) {
		$ac = "install";
		include("../upgrade-addon.php");
	}
}

function execInitSql()
{
	$f = __DIR__ . "/../../../data/init.sql";
	if (! file_exists($f))
		return;
	$sql = file_get_contents($f);
	try {
		echo("=== exec " . realpath($f) . "\n");
		execOne($sql);
	}
	catch (Exception $ex) {
		echo("!!! fail to exec init.sql: " . $ex->getMessage() . "\n");
	}
}

try {
	upgrade();
}
catch (Exception $ex) {
	echo("*** Fail to upgrade: " . (string)$ex . "\n");
}
