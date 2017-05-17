<?php

/**
@module jdcloud-upgrade

筋斗云一站式数据模型部署工具。

支持维护mysql, sqlite, mssql三种类型数据库。

## 环境变量

可设置环境变量来定制参数。

- P_METAFILE: 指定主设计文档，根据其中定义的数据模型生成数据库。默认为项目根目录下的"DESIGN.md"
- P_DBTYPE,P_DB,P_DBCRED: 设置数据库连接，参考下节。

## 连接数据库

连接mysql示例(注意在php.ini中打开php_pdo_mysql扩展)：

	putenv("P_DB=172.12.77.221/jdcloud");
	putenv("P_DBCRED=ganlan:ganlan123");

连接sqlite示例(注意打开php_pdo_sqlite扩展)：

	putenv("P_DB=d:/db/jdcloud.db");

连接mssql示例(通过odbc连接，注意打开php_pdo_odbc扩展)

	putenv("P_DBTYPE=mssql");
	putenv("P_DB=odbc:DRIVER=SQL Server Native Client 10.0; DATABASE=carsvc; Trusted_Connection=Yes; SERVER=.\MSSQL2008;");
	//putenv("P_DBCRED=sa:ganlan123");
	
*/

require_once('upglib.php');

$h = new UpgHelper();

if (count($argv) > 1) {
	for ($i=1; $i<count($argv); $i++) {
		switch ($argv[$i]) {
		case "upgrade":
			upgradeAuto();
			break;
		case "all":
			$h->initDB();
			break;
		default:
			$h->addTable($argv[$i]);
			break;
		}
	}
	return;
}

while (true) {
	try {
		echo "> ";
		$s = fgets(STDIN);
		if ($s === false)
			break;
		$s = chop($s);
		if (! $s)
			continue;

		if ($s == "q") {
			$h->quit();
		}
		else if (preg_match('/^\s*(select|update|delete|insert|drop|create)\s+/i', $s)) {
			$h->execSql($s);
		}
		else if (preg_match('/^(\w+)\s*\((.*)\)/', $s, $ms) || preg_match('/^(\w+)\s*$/', $s, $ms)) {
			try {
				$fn = $ms[1];
				@$param = $ms[2] ?: '';
				$refm = new ReflectionMethod('UpgHelper', $ms[1]);
				try {
					eval('$r = $h->' . "$fn($param);");
					if (is_scalar($r))
						echo "=== Return $r\n";
				}
				catch (Exception $ex) {
					print "*** error: " . $ex->getMessage() . "\n";
					echo $ex->getTraceAsString();
					showMethod($refm);
				}
			}
			catch (ReflectionException $ex) {
				echo("*** unknown call. try help()\n");
			}
		}
		else {
			echo "*** bad format. try help()\n";
		}
	}
	catch (Exception $e) {
		echo($e);
		echo("\n");
	}
}

function upgradeAuto()
{
	echo "TODO\n";
	return;
	$ver = UpgLib\getVer();
	$dbver = UpgLib\getDBVer();
	if ($ver <= $dbver)
	{
		return;
	}

	if ($dbver == 0) {
		UpgLib\initDB();
		# insert into cinf ver,create_tm
		UpgLib\updateDbVer();
		return;
	}

/*
if (dbver < 1) {
	addcol(table, col);
}
if (dbver < 2) {
	addtable(table);
}
if (dbver < 3) {
	addkey(key);
}
if (dbver < 4) {
	altercol(table, col);
}
*/

	UpgLib\updateDbVer();
}
?>
