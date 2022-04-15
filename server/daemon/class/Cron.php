<?php

/*
示例：

	$cronfn = Cron::parseCron("1 3 * * *");
	$isHit = $cronfn(); // 当前时间是否命中

测试时可指定时间：

	$tm = strtotime('2022-2-27 18:50:10');
	$cronfn = Cron::parseCron("1 3 * * *", $tm);
	$isHit = $cronfn(strtotime('2022-2-27 03:01:10')); // 命中

注意：

- 与unix不同，秒是从当前时间开始，不是从0开始，比如`* * * * *`会立即执行1次，不会等到下1分钟0秒。
而`1 1 * * *`并不是刚好1:1:0执行，而是可能1:1中任何1s(根据timer初始设置时间的秒数).

- 允许范围表示时后面比前面大，例如小时：19-6 表示19:00-6:00; 19-6/2表示19,21,23,1,3,5小时
- 星期几使用1-7，不可用0
*/
class Cron
{
	// 成功返回一个验证函数 fn(now=null)，失败返回false
	static function parseCron($cron, $startTmVal=null) {
		if (preg_match('/[^*\- ,\/\d]/', $cron))
			return false;
		$specArr = preg_split('/ +/', $cron);
		if (count($specArr) != 5)
			return false;
		if ($startTmVal == null)
			$startTmVal = time();
		$startTm = getdate($startTmVal);
		return function ($now = null) use ($cron, $startTmVal, $startTm, $specArr) {
			if ($now === false)
				return false;
			if ($now === null)
				$now = time();
			$tm = getdate($now);
			$diff = $now - $startTmVal;
			if (! self::match($tm, 'minutes', $specArr[0], $diff, $startTm))
				return false;
			if (! self::match($tm, 'hours', $specArr[1], $diff, $startTm))
				return false;

			// 根据cron文档，mday和wday如果都不含有'*'，则是满足1个就可以
			$rv = self::match($tm, 'mday', $specArr[2], $diff, $startTm);
			$rv1 = self::match($tm, 'wday', $specArr[4], $diff, $startTm);
			if (strpos($specArr[2], '*') === false && strpos($specArr[4], '*') === false) {
				if (!$rv && !$rv1)
					return false;
			}
			else if (!$rv || !$rv1) {
				return false;
			}

			if (! self::match($tm, 'mon', $specArr[3], $diff, $startTm))
				return false;

			return true;
		};
	}
	protected static function match($tm, $what, $spec0, $diff, $startTm) {
		$num = $tm[$what];
		foreach (explode(',', $spec0) as $spec) {
			if ($spec == '*' || $num == $spec)
				return true;

			if (! preg_match('/^ (\*|\d+) (?:-(\d+))? (?:\/(\d+))? $/x', $spec, $ms))
				continue;
			$from = $ms[1]; // * 或 数字
			$to = @$ms[2] ?: $from;
			$k = @$ms[3] ?: 1;
			if ($from == '*') {
				if ($k <= 1)
					return true;

				// 比如小时, */3 应从当前startTm的小时算，而不是0,3,6这种
				if ($what == 'minutes') {
					if (intval($diff / 60) % $k == 0)
						return true;
				}
				if ($what == 'hours') {
					if (intval($diff / 3600) % $k == 0)
						return true;
				}
				if ($what == 'mday' || $what == 'wday') {
					if (intval($diff / 3600*24) % $k == 0)
						return true;
				}
				if ($what == 'mon') {
					$mdiff = ($tm['year']-$startTm['year'])*12+($tm['mon']-$startTm['month']);
					if (($mdiff % $k) == 0)
						return true;
				}
			}
			else if ($from <= $to) { // 例：小时 9-18/2 指9,11,13,15,17
				if ($num >= $from && $num <= $to && (($num-$from) % $k == 0))
					return true;
			}
			else { // 例：小时 19-8/2  指19,21,23,1,3,5,7
				if ($num >= $from) {
					if (($num-$from) % $k == 0)
						return true;
				}
				else if ($num <= $to) {
					if ($k <= 1)
						return true;
					if ($what == 'minutes') {
						$diff = $num + 60 - $from;
						if ($diff % $k == 0)
							return true;
					}
					if ($what == 'hours') {
						$diff = $num + 24 - $from;
						if ($diff % $k == 0)
							return true;
					}
					// 例：25-10/2 每月25到10号内每2天，当前是1号是否命中？要取决于上月有多少天
					if ($what == 'mday') {
						$year = $tm['year'];
						$mon = $tm['mon'] - 1;
						if ($mon == 0) {
							-- $year;
							$mon = 12;
						}
						$days = date('t', strtotime("$year-$mon-1"));
						if ($from > $days) { // mday: 30-10/3  当前2022-3-4(上月28天), 则从2022-3-1开始算，4日应命中
							$from = 1;
							$diff = $num - 1;
						}
						else { // mday: 25-10/3 当前2022-3-3, (28天+3号)-25号=6，是3的倍数应命中
							$diff = $num + $days - $from;
						}
						if ($diff % $k == 0)
							return true;
					}
					// 例：12-4/2 => 12,2,4
					if ($what == 'mon') {
						$diff = $num + 12 - $from;
						if ($diff % $k == 0)
							return true;
					}
					if ($what == 'wday') {
						$diff = $num + 7 - $from;
						if ($diff % $k == 0)
							return true;
					}
				}
			}
		}
		return false;
	}
}

/* 测试
assert_options(ASSERT_BAIL, 1);
$tm = strtotime('2022-2-27 18:50:10');

$cronfn = Cron::parseCron("1 3 * * *", $tm);
assert($cronfn(strtotime('2022-2-27 03:01:10')) === true);
echo("OK\n");
*/

