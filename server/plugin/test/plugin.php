<?php

function api_execSql($env)
{
	checkAuth(AUTH_ADMIN | PERM_TEST_MODE);

	# TODO: limit the function
	$sql = html_entity_decode(mparam("sql"));
	$fmt = param("fmt");

	$dbinst = param("dbinst");
	$env1 = $env;
	if ($dbinst) {
		@$c = getConf("conf_dbinst")[$dbinst];
		if (!$c)
			jdRet(E_PARAM, "unknown dbinst $dbinst");
		$env1 = new DbEnv($c[0], $c[1], $c[2], $c[3]);
		$env1->dbconn();
	}

	$DBH = $env1->DBH;
	$addExecTime = function () use ($DBH, $env) {
		$env->header("X-ExecSql-Time", round($DBH->lastExecTime * 1000, 3) . "ms");
	};
	$GLOBALS["conf_returnExecTime"] = true;

	// 支持超级管理端的【数据库查询】工具：数据库列表、表列表、字段列表
	$hint = DbExplorer::support($env1, $sql);

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
		$ret = $env1->execOne($sql, $wantId);
		$addExecTime();
	}
	return $ret;
}

function api_dbinst()
{
	@$conf = $GLOBALS["conf_dbinst"];
	return is_array($conf)? array_keys($conf): [];
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
			else if ($env->DBTYPE == "oracle") {
				$sql = 'select tablespace_name from user_tablespaces'; # 用all_tablespaces/dba_tablespaces报错找不到
				#$sql = 'select t0.tablespace_name, nvl2(u.default_tablespace,1,0) is_user_default  from user_tablespaces t0
#left join user_users u on t0.tablespace_name=u.default_tablespace';
				# select username,default_tablespace from user_users
				# $sql = 'select name from v$tablespace'; // 11g不支持
			}
		}
		else if (preg_match('/^show tables\s*(?:from (\S+))?/i', $sql, $ms)) {
			$hint = ["hint" => "tbl"];
			$db = null;
			if ($ms[1]) {
				$db = $ms[1];
				$hint["db"] = $db;
			}
			if ($env->DBTYPE == "mssql") {
				$pre = $db? "$db.": '';
				$sql = "select t1.name+ '.'+t0.name table_name,t0.create_date,t0.modify_date from {$pre}sys.tables t0
inner join {$pre}sys.schemas t1 on t0.schema_id=t1.schema_id";
			}
			else if ($env->DBTYPE == "oracle") {
				if ($db) {
					$db = strtoupper($db);
					$sql = "select owner || '.' || table_name name from all_tables where tablespace_name='$db'"; # user_tables;
					# $sql = "select table_name from all_tables where tablespace_name='$db'"; // all_tables比user_tables看到更多
				}
				else {
					$sql = "select table_name from user_tables";
				}
				unset($hint["db"]); # NOTE: 删除它因为oracle一般只用{owner}.{table}而不是{tablespace}.{table}
			}
			else if ($env->DBTYPE == "sqlite") {
				$sql = "SELECT name FROM sqlite_master WHERE type='table' order by name";
			}
		}
		else if (preg_match('/^describe (\S+)/i', $sql, $ms)) {
			$tbl0 = $ms[1];
			if ($env->DBTYPE == "mssql") {
				$pre = '';
				$tbl = $tbl0;
				# db1.dbo.tbl1
				if (preg_match('/(\w+)\.(\w+)\.(\w+)/', $tbl0, $ms)) {
					$pre = $ms[1] . '.';
					$tbl = $ms[3];
				}
				$sql = "select t0.name, t1.name type_name, t0.max_length, t0.precision, t0.scale, t0.collation_name, t0.is_nullable from {$pre}sys.columns t0
join sys.types t1 on t0.system_type_id=t1.system_type_id
where object_id=object_id('$tbl0')";
				# $sql = "select column_name, data_type, character_maximum_length from {$pre}information_schema.columns where table_name='$tbl'";
			}
			else if ($env->DBTYPE == "oracle") {
				$tbl = $tbl0;
				// 只可查看用户所在的tablespace中的表(但可以看别的用户的表)
				if (preg_match('/\.([\w\$]+)$/', $tbl0, $ms)) {
					$tbl = $ms[1];
				}
				$tbl = strtoupper($tbl);
				$sql = "select column_name,data_type,data_length,data_precision,nullable,character_set_name from all_tab_columns where table_name='$tbl'";
				#$sql = "select * from user_tab_columns where table_name='$tbl0'";
			}
			else if ($env->DBTYPE == "sqlite") {
				$sql = "pragma table_info($tbl0)";
			}
		}
		else if (preg_match('/^show index from (\S+)/i', $sql, $ms)) {
			$tbl = $ms[1];
			if ($env->DBTYPE == "mssql") {
				$pre = '';
				# db1.dbo.tbl1
				if (preg_match('/(\w+\.\w+\.)(\w+)/', $tbl, $ms)) {
					$pre = $ms[1];
					$tbl = $ms[3];
				}
				// db1.dbo.sp_index {tbl}
				$sql = "{$pre}sp_helpindex $tbl";
			}
			else if ($env->DBTYPE == "oracle") {
				// TODO:
				$sql = "select * from all_indexes where table_name='$tbl'";
			}
			else if ($env->DBTYPE == "sqlite") {
				$sql = "pragma index_list($tbl)";
				// TODO: 只有索引名,没有字段列表. 参考pragma index_info(index-name)
			}
		}
		if ($env->DBTYPE == "mssql") {
			// handle quote: `xxx` => [xxx]
			$n = 0;
			$sql = preg_replace_callback('/`/', function ($ms) use (&$n) {
				if ($n == 0) {
					$n = 1;
					return '[';
				}
				$n = 0;
				return ']';
			}, $sql);
		}
		else if ($env->DBTYPE == "oracle") {
			// 12c之后可支持分页（之前使用where rownum<=10但不好用)
			// limit $a => fetch next $a rows only;
			// limit $a,$b => offset $a rows fetch next $b rows only;
			$sql = preg_replace_callback('/\blimit\s+(\d+)(?:,\s*(\d+))?/', function ($ms) {
				if ($ms[2]) {
					return "offset {$ms[1]} rows fetch next {$ms[2]} rows only";
				}
				return "fetch next {$ms[1]} rows only";
			}, $sql);
			logit($sql);
		}

		return $hint;
	}
}
