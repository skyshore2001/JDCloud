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
			return ["h"=>$h, "d"=>$d];
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

