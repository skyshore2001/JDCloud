<?php

class MssqlCompatible
{
	static function translateMysqlToMssql(&$sql) {
		static $para_re = '( (?: [^()] | \( (?-1) \) )* )';
		static $para_re2 = '(\( (?: [^()] | (?-1) )* \))';
		// for MSSQL: LIMIT -> TOP/OFFSET FETCH
		while (preg_match('/\bLIMIT\s+\d/is', $sql)) {
			$handled = false;
			$sql = preg_replace_callback("/SELECT $para_re \bLIMIT\s+(\d+) (?:\s*,\s*(\d+))?/isx", function ($ms) use (&$handled) {
				$handled = true;
				$s1 = $ms[1];
				$n1 = $ms[2];
				$n2 = $ms[3];
				// "LIMIT 1" OR "LIMIT 0,20"
				if ( ($n1 && !$n2) || (!$n1 && $n2)) {
					$n = $n1 ?: $n2;
					return "SELECT TOP $n{$s1}";
				}
				if (!preg_match('/(ORDER\s+BY.*?) \s* $/isx', $s1, $ms1))
					jdRet(E_SERVER, "bad sql: require ORDER BY for LIMIT $n1,$n2");
				return "OFFSET $n1 ROWS FETCH NEXT $n2 ROWS";
				//$n2 += $n1;
				//return "SELECT * FROM (SELECT ROW_NUMBER() OVER({$ms1[1]}) _row,$s1) t0 WHERE _row BETWEEN {$n1} AND {$n2}";
			}, $sql);
			if (!$handled)
				jdRet(E_SERVER, "bad sql to handle limit: `$sql`");
		}

		// for MSSQL 2017: group_concat -> string_agg
		// refer: https://zditect.com/main-advanced/database/mysql-group_concat-vs-t-sql-string_agg.html
		// e.g. "group_concat(batchNo)" -> "string_agg(batchNo, ',')"
		// e.g. "group_concat(distinct batchNo)" -> "string_agg(batchNo, ',') ... group by batchNo"
		// e.g. "group_concat(distinct batchNo) ... group by a" -> "string_agg(batchNo, ',') ... group by a,batchNo"
		// e.g. "group_concat(batchNo order by batchNo desc)" -> "string_agg(batchNo, ',') within group (order by batchNo desc)"
		// e.g. "group_concat(batchNo separator ':')" -> "string_agg(batchNo, ':')"
		while (preg_match('/\bgroup_concat\b/is', $sql)) {
			$handled = false;
			$sql = preg_replace_callback("/SELECT $para_re group_concat $para_re2 $para_re/isx", function ($ms) use (&$handled) {
				$handled = true;
				// 去括号
				$field = preg_replace('/^\s*\(\s* | \s*\)\s*$/x', '', $ms[2]);
				$post = $ms[3];

				$doDistinct = false;
				$sep = "','";
				$orderby = '';
				$field = preg_replace_callback('/^(distinct\s+)|(order by \w+(?: (?:asc|desc))?)|separator (\'[^\']+\')/i', function ($ms) use (&$doDistinct, &$orderby, &$sep) {
					if ($ms[1]) {
						$doDistinct = true;
					}
					else if ($ms[2]) {
						$orderby = $ms[0];
					}
					else if ($ms[3]) {
						$sep = $ms[3];
					}
				}, $field);

				// handle "distinct"
				if ($doDistinct) {
					// 如果有group by则追加字段，否则添加group by
					$groupbyCnt = 0;
					$post = preg_replace('/group by \w+\s*(,\s*\w+)*\K$/i', ",$field", $post, 1, $groupbyCnt);
					if ($groupbyCnt == 0) {
						$post .= " GROUP BY $field";
					}
				}
				return "SELECT{$ms[1]}STRING_AGG({$field}, $sep){$orderby}{$post}";
			}, $sql);
			if (!$handled)
				jdRet(E_SERVER, "bad sql to handle group_concat: `$sql`");
		}
		// 'select if(...)' => 'select iif(...)'
		static $map = ["if"=>"iif", "ifnull"=>"isnull", "uuid"=>"newid"];
		$sql = preg_replace_callback('/\b(if|ifnull|uuid)\s*(?=\()/i', function ($ms) use ($map) {
			return $map[strtolower($ms[1])];
		}, $sql);

		// handle special name
		$sql = preg_replace('/\b(user|proc)\b/i', '"$1"', $sql);
	}
}
