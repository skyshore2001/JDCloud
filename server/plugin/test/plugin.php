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
	$hint = DbExplorer::support($env, $sql);

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

class DbExplorer
{
	// return hint: 
	// 数据库列表: {hint:'db'}
	// 表列表: {hint:'tbl', db?}
	static function support($env, &$sql) {
		// 支持超级管理端的【数据库查询】工具：数据库列表、表列表、字段列表
		$hint = null;
		if (preg_match('/^show databases/i', $sql)) {
			$hint = ["hint" => "db"];
			if ($env->DBTYPE == "mssql") {
				$sql = 'SELECT name,create_date,collation_name FROM sys.databases';
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
					self::fixQuoteForMssql($db);
					$tbl = "{$db}.sys.tables";
				}
				else {
					$tbl = "sys.tables";
				}
				$sql = "select name,create_date,modify_date from $tbl";
			}
		}
		else if (preg_match('/^describe (?:(\S+)\.)?([`\w]+)/i', $sql, $ms)) {
			$db = $ms[1];
			$tbl = $ms[2];
			if ($env->DBTYPE == "mssql") {
				self::fixQuoteForMssql($db);
				self::fixQuoteForMssql($tbl);
				if ($db) {
					$sql = "select * from $db.sys.columns where object_id=object_id('$db.dbo.$tbl')";
				}
				else {
					$sql = "select * from sys.columns where object_id=object_id('$tbl')";
				}
			}
		}
		else if ($env->DBTYPE == "mssql") {
			// db.tbl / `db`.`tbl` => db.dbo.tbl / [db].dbo.[tbl]
			$sql = preg_replace_callback('/\b(?:FROM|INTO|UPDATE)\s+\K(\S+)\.([`\w]+)/i', function ($ms) {
				if (preg_match('/\bdbo|sys\b/i', $ms[1]))
					return $ms[0];
				self::fixQuoteForMssql($ms[1]);
				self::fixQuoteForMssql($ms[2]);
				return $ms[1] . '.dbo.' . $ms[2];
			}, $sql);
		}
		return $hint;
	}

	// `xxx` => [xxx]
	static function fixQuoteForMssql(&$name) {
		if ($name[0] == '`')
			$name = '[' . substr($name, 1, strlen($name)-2) . ']';
	}
}
