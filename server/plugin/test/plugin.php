<?php

function api_execSql($env)
{
	checkAuth(AUTH_ADMIN | PERM_TEST_MODE);

	# TODO: limit the function
	$sql = html_entity_decode(mparam("sql"));
	$fmt = param("fmt");
	$DBH = $env->DBH;
	$addExecTime = function () use ($DBH, $env) {
		$env->header("X-ExecSql-Time", round($DBH->lastExecTime * 1000, 3) . "ms");
	};
	$GLOBALS["conf_returnExecTime"] = true;

	// 支持超级管理端的【数据库查询】工具：数据库列表、表列表、字段列表
	$hint = null; // {hint:'db'} | {hint:'tbl', db:$dbname}
	if (preg_match('/^show databases/i', $sql)) {
		$hint = ["hint" => "db"];
		if ($env->DBTYPE == "mssql") {
			$sql = 'SELECT * FROM sys.databases';
		}
	}
	else if (preg_match('/^show tables\s*(?:from (\S+))?/i', $sql, $ms)) {
		$hint = ["hint" => "tbl"];
		if ($ms[1]) {
			$db = $ms[1];
			$hint["db"] = $db;
		}
		if ($env->DBTYPE == "mssql") {
			if ($db) {
				fixQuoteForMssql($db);
				$sql = "select * from {$db}.sys.tables";
			}
			else {
				$sql = "select * from sys.tables";
			}
		}
	}
	else if (preg_match('/^describe (?:(\S+)\.)?([`\w]+)/i', $sql, $ms)) {
		$db = $ms[1];
		$tbl = $ms[2];
		if ($env->DBTYPE == "mssql") {
			fixQuoteForMssql($db);
			fixQuoteForMssql($tbl);
			if ($db) {
				$sql = "select * from $db.sys.columns where object_id=object_id('$db.dbo.$tbl')";
			}
			else {
				$sql = "select * from sys.columns where object_id=object_id('$tbl')";
			}
		}
	}

	if ($fmt || preg_match('/^\s*(select|show) /i', $sql)) {
		$sth = $DBH->query($sql);
		$addExecTime();
		$wantArray = param("wantArray/b", false);
		if ($wantArray)
			$fmt = "array";

		if ($fmt == "array")
			return $sth->fetchAll(PDO::FETCH_NUM);
		if ($fmt == "table") {
			if ($sth->columnCount() == 0) {
				return ["h"=>["affectedRows"], "d"=>[[$sth->rowCount()]]];
			}
			$h = getRsHeader($sth);
			$d = $sth->fetchAll(PDO::FETCH_NUM);
			$ret = ["h"=>$h, "d"=>$d];
			if ($hint) {
				$ret += $hint;
			}
			return $ret;
		}
		if ($fmt == "one") {
			$row = $sth->fetch(PDO::FETCH_NUM);
			$sth->closeCursor();
			if ($row !== false && count($row)===1)
				return $row[0];
			return $row;
		}
		return $sth->fetchAll(PDO::FETCH_ASSOC);
	}
	else {
		$wantId = param("wantId/b");
		$ret = execOne($sql, $wantId);
		$addExecTime();
	}
	return $ret;
}

// `xxx` => [xxx]
function fixQuoteForMssql(&$name) {
	if ($name[0] == '`')
		$name = '[' . substr($name, 1, strlen($name)-2) . ']';
}
