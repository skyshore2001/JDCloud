<?php

class SqliteCompatible
{
	static function translateMysqlToSqlite(&$sql) {
		// 支持嵌套，支持各部分中有其它无关括号
		// if(cond, t, f) => case when cond then t else f end 
		// concat(a, b) => (a || b)
		$stack = []; // {fn, partIdx}
		$sql = preg_replace_callback('/\b(if|concat)\s*\( | \( | \) | , /isx', function ($ms) use (&$stack) {
			$m = $ms[0];
			if (stripos($m, 'if') === 0) {
				$stack[] = ['fn' => 'if', 'partIdx' => 0];
				return 'case when ';
			}
			if (stripos($m, 'concat') === 0) {
				$stack[] = ['fn' => 'concat', 'partIdx' => 0];
				return '(';
			}
			if ($m == '(') {
				$stack[] = ['fn' => null];
				return $m;
			}
			if ($m == ')') {
				$s = array_pop($stack);
				if ($s['fn'] == 'if')
					return ' end';
				if ($s['fn'] == 'concat')
					return ')';
				return $m;
			}
			// ','
			$idx = count($stack)-1;
			if ($idx < 0)
				return $m;
			++ $stack[$idx]['partIdx'];
			$s = $stack[$idx];
			if ($s['fn'] == null) {
				return $m;
			}

			if ($s['fn'] == 'if') {
				if ($s['partIdx'] == 1)
					$m = ' then ';
				else
					$m = ' else ';
			}
			else if ($s['fn'] == 'concat') {
				$m = ' || ';
			}
			return $m;
		}, $sql);
	}
}
