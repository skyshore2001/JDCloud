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

连接mysql示例(注意在php.ini中打开php_pdo_mysql扩展)，设置以下环境变量：

	P_DBTYPE=mysql
	P_DB=172.12.77.221/jdcloud
	P_DBCRED=demo:demo123

连接sqlite示例(注意打开php_pdo_sqlite扩展)：

	P_DBTYPE=sqlite
	P_DB=d:/db/jdcloud.db

连接mssql示例(通过odbc连接，注意打开php_pdo_odbc扩展)

	P_DBTYPE=mssql
	P_DB=odbc:DRIVER=SQL Server Native Client 10.0; DATABASE=jdcloud; Trusted_Connection=Yes; SERVER=.\MSSQL2008;
	# P_DBCRED=sa:demo123

一般创建或修改upgrade.sh指定这些变量后调用upgrade.php
*/

require_once('upglib.php');

$h = new UpgHelper();

if (count($argv) > 1) {
	$cmd = join(' ', array_slice($argv, 1));
	execCmd($cmd);
	return;
}

while (true) {
	echo "> ";
	$s = fgets(STDIN);
	if ($s === false)
		break;
	$s = chop($s);
	if (! $s)
		continue;

	execCmd($s);
}

function execCmd($cmd)
{
	global $h;
	try {
		if ($cmd == "q") {
			$h->quit();
		}
		else if (preg_match('/^\s*(select|update|delete|insert|drop|create)\s+/i', $cmd)) {
			$h->execSql($cmd);
		}
		else if (preg_match('/^(\w+)\s*\((.*)\)/', $cmd, $ms) || preg_match('/^(\w+)\s*$/', $cmd, $ms)) {
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
