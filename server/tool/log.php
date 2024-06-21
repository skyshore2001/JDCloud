<?php
/**
@key tool/log.php

参数:

- f: 指定显示哪个日志, 路径是相对于server目录下的位置, 不包含.log后缀；
如果再指定参数f1=1，则读备份文件如trace.log.1 (后端logit函数写日志文件超100M时，将自动转存为xx.log.1文件，避免日志一直增长)
- sz: 指定一次取多少字节显示
- page: 指定页码，默认为-1，即最后一页，下一页则为page=-2；也可以为1, 2等正数，表示从头开始读。注意日志显示时仍为倒序。
- noHeader: 设置为1时不显示标题.用于直接集成在系统中.

支持日志格式：以"=== ... at [时间] "或"=== [时间] "开头，标识出一项记录。

*/
header("Cache-Control: no-cache");
header("Content-Type: text/html; charset=UTF-8");

// 加载配置项如 $conf_dataDir
@include_once("../php/conf.user.php");

$F0 = @$_GET["f"] ?: "trace";
$F = (@$GLOBALS["conf_dataDir"] ?: "..") . "/{$F0}.log";
$PAGE_SZ = @intval($_GET["sz"])?:50000;
$PAGE = @intval($_GET["page"])?:-1;

// 读备份文件 xx.log.1
if (@$_GET["f1"]) {
	$F .= ".1";
}

$msgs = [];
$pageCnt = 1;

function loadMsgs($f, $pagesz, $page = -1)
{
	global $msgs;

	@$sz = filesize($f);
	if ($sz === false)
		return;

	$fp = fopen($f, "r");
	$pos = 0;
	if ($page > 0) {
		$pos = ($page-1) * $pagesz;
		if ($pos > $sz)
			return;
	}
	else if ($page < 0) {
		$pos = $sz - (-$page * $pagesz);
		if ($pos + $pagesz < 0)
			return;
		if ($pos < 0) {
			$pos = 0;
		}
	}
	fseek($fp, $pos, SEEK_SET);

	$curMsg = null;
	while ( ($s = fgets($fp)) !== false) {
		if (preg_match('/^===(.{1,100} at)? \[/', $s)) {
			if ($page != -1 && ftell($fp) - $pos > $pagesz)
				break;
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

function showPager()
{
	global $pageCnt;
	if ($pageCnt <= 1)
		return;

	global $PAGE;
	echo('<div class="pager">');
	$page = $PAGE < 0? ($PAGE+1): ($PAGE-1);
	if (abs($page) > 0 && abs($page) <= $pageCnt) {
		$p = http_build_query(array_merge($_GET, ["page"=>$page]));
		echo("<a href=\"?$p\">上一页</a> ");
	}
	echo("{$PAGE}/{$pageCnt}页");
	$page = $PAGE < 0? ($PAGE-1): ($PAGE+1);
	if (abs($page) > 0 && abs($page) <= $pageCnt) {
		$p = http_build_query(array_merge($_GET, ["page"=>$page]));
		echo(" <a href=\"?$p\">下一页</a>");
	}
	echo('</div>');
}

@$filesz = filesize($F);
$pageCnt = ceil($filesz / $PAGE_SZ);
if ($PAGE == -1 && $filesz < $PAGE_SZ) {
	loadMsgs($F .".1", $PAGE_SZ - $filesz);
}
loadMsgs($F, $PAGE_SZ, $PAGE);
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
.pager {
	float: right;
}
</style>

<?php if (! @$_GET["noHeader"]) { ?>
<h2>查看日志</h2>
<a href="?f=trace&sz=<?=$PAGE_SZ?>">trace</a>
<a href="?f=ext&sz=<?=$PAGE_SZ?>">ext</a>
<a href="?f=debug&sz=<?=$PAGE_SZ?>">debug</a>
<a href="?f=slow&sz=<?=$PAGE_SZ?>">slow</a>
<a href="?f=daemon/jdserver&sz=<?=$PAGE_SZ?>">jdserver</a>
<?php showPager(); ?>

<hr/>
<?php
}
else {
	showPager();
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

showPager();
?>
</body>
</html>

