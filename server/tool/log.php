<?php
/**
@key tool/log.php

参数:

- f: 指定显示哪个日志, 路径是相对于server目录下的位置, 不包含.log后缀
- sz: 指定一次取多少字节显示
- noHeader: 设置为1时不显示标题.用于直接集成在系统中.

支持日志格式：以"=== ... at [时间] "或"=== [时间] "开头，标识出一项记录。

*/
header("Cache-Control: no-cache");
header("Content-Type: text/html; charset=UTF-8");
include_once("../php/conf.user.php");

$F0 = @$_GET["f"] ?: "trace";
$F = (@$GLOBALS["conf_dataDir"] ?: "..") . "/{$F0}.log";
$MAX_READ_SZ = @intval($_GET["sz"])?:50000;

$msgs = [];

function loadMsgs()
{
	global $F, $MAX_READ_SZ;
	global $msgs;

	@$sz = filesize($F);
	if ($sz === false)
		return;

	$fp = fopen($F, "r");
	if ($sz > $MAX_READ_SZ) {
		fseek($fp, -$MAX_READ_SZ, SEEK_END);
	}

	$curMsg = null;
	while ( ($s = fgets($fp)) !== false) {
		if (preg_match('/^===(.{1,100} at)? \[/', $s)) {
			if ($curMsg != null)
				$msgs[] = $curMsg;
			$curMsg = $s;
		}
		else if ($curMsg != null) {
			$curMsg .= $s;
		}
	}
	if ($curMsg != null)
		$msgs[] = $curMsg;

	fclose($fp);
}

loadMsgs();
?>
<!DOCTYPE html>
<html>
<body>
<style>
p {
  font-size: 0.6em;
  color: grey;
  line-height: 0.8;
}
xmp {
  overflow: auto;
}
</style>

<?php if (! @$_GET["noHeader"]) { ?>
<h2>查看日志</h2>
<a href="?f=trace&sz=<?=$MAX_READ_SZ?>">trace</a>
<a href="?f=ext&sz=<?=$MAX_READ_SZ?>">ext</a>
<a href="?f=debug&sz=<?=$MAX_READ_SZ?>">debug</a>
<a href="?f=slow&sz=<?=$MAX_READ_SZ?>">slow</a>
<a href="?f=daemon/jdserver&sz=<?=$MAX_READ_SZ?>">jdserver</a>

<hr/>
<?php
}

if (count($msgs) == 0) {
	echo "<p>没有数据</p>";
}
else {
	for ($i=count($msgs)-1; $i>=0; --$i) {
		$hdr = null;
		$msg = $msgs[$i];
		$a = preg_split('/^(===(?:.{1,100} at)? \[.*?\]\s*)/', $msg, 2, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
		if (count($a) == 2) {
			$hdr = $a[0];
			$msg = $a[1];
		}
		if ($hdr) {
			echo "<p>" . $hdr . "</p>\n";
		}

		echo "<xmp>" . $msg . "</xmp><hr/>\n";
	}
}
?>
</body>
</html>

