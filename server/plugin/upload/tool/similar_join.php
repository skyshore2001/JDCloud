<?php
/*
t1 LEFT JOIN t2 ON t1[col1] ~ t2[col2]
两个表t1与t2按相似度连接，输出最终结果。
t1与t2均有表头。
*/
$MIN_MATCH = 6; // 至少匹配2个中文. utf-8字节级匹配，1个中文一般为3个字节。
$RE_DEL = null; // 为避免每个词中都有同样短语而影响匹配，可指定正则式将这些同样短语删除。示例：
// $RE_DEL = '/信息|科技|有限|公司/u';

@list ($prog, $f1, $f2, $col1, $col2) = $argv;
if (!isset($col2)) {
	die("Usage: php similar_join.php <file1> <file2> <col1> <col2>\ne.g. php similar_join.php 1.csv 2.csv 2 0\n");
}
file_similar_join($f1, $f2, $col1, $col2, $RE_DEL);

function file_similar_join($f1, $f2, $col1, $col2, $reDel)
{
	$t1 = loadcsv($f1);
	$t2 = loadcsv($f2);
	$t3 = similar_join($t1, $t2, $col1, $col2, $reDel);
	foreach ($t3 as $e) {
		fputcsv(STDOUT, $e);
	}
}

// support csv and tsv
function loadcsv($f)
{
	@$fp = fopen($f, "r") or die("cannot read file: $f");
	# test csv or tsv
	$s = fgets($fp);
	$sep = stripos($s, "\t") !== false? "\t": ",";
	// remove bomb
	if (substr($s,0,3) == "\xef\xbb\xbf") {
		fseek($fp, 3);
	}
	else {
		rewind($fp);
	}

	$ret = [];
	while ($a = fgetcsv($fp, 0, $sep)) {
		$ret[] = $a;
	}
	fclose($fp);
	return $ret;
}

function my_array_add(&$a, $b)
{
	if (!is_array($b) || !is_array($a))
		return;
	foreach ($b as $e) {
		$a[] = $e;
	}
	return $a;
}

function similar_join($t1, $t2, $col1, $col2, $reDel)
{
	$i2 = 0;
	$t1ColCnt = count($t1[0]);
	my_array_add($t1[0], $t2[0]);
	foreach ($t2 as $e2) {
		if ($i2 ++  == 0) // ignore title
			continue;
		$maxRate = 0; $maxMatchCnt = 0;
		$n = $i1 = 0;
		foreach ($t1 as $e1) {
			if ($i1++ == 0)
				continue;
			if (count($e1) > $t1ColCnt)
				continue;
			$a = $e1[$col1];
			$b = $e2[$col2];
			if ($reDel) {
				$a = preg_replace($reDel, '', $a);
				$b = preg_replace($reDel, '', $b);
			}
			$matchCnt = similar_text($a, $b, $rate);
			// ORDER BY 匹配字数，匹配度 DESC
			if ($matchCnt > $maxMatchCnt || ($matchCnt == $maxMatchCnt && $rate > $maxRate)) {
				$maxRate = $rate;
				$maxMatchCnt = $matchCnt;
				$n = $i1-1;
			}
		}
//		echo("maxRate=$maxRate, match=$maxMatchCnt, {$t1[$n][$col1]}, {$e2[$col2]}\n");
		if ($maxRate > 0 && $maxMatchCnt >= $GLOBALS["MIN_MATCH"]) {
			$rv = my_array_add($t1[$n], $e2);
		}
		else {
			fprintf(STDERR, "LINE $i2 NO MATCH: %s\n", join(',', $e2));
		}
	}
	return $t1;
}

