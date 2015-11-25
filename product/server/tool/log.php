<?php
header("Cache-Control: no-cache");
header("Content-Type: text/html; charset=UTF-8");

$F = @$_GET["f"] ?: "ext";
$F = "../{$F}.log";
$MAX_READ_SZ = @$_GET["sz"]?:5000;

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
	$startTag = "=== REQ";
	while ( ($s = fgets($fp)) !== false) {
		if (substr($s, 0, strlen($startTag)) == $startTag) {
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
<html>
<body>
<style>
</style>

<h2>查看日志</h2>
<a href="?f=trace&sz=<?=$MAX_READ_SZ?>">trace</a>
<a href="?f=ext&sz=<?=$MAX_READ_SZ?>">ext</a>
<a href="?f=secure&sz=<?=$MAX_READ_SZ?>">secure</a>

<hr/>
<?php
if (count($msgs) == 0) {
	echo "<p>没有数据</p>";
}
else {
	for ($i=count($msgs)-1; $i>=0; --$i) {
		echo "<xmp>" . $msgs[$i] . "</xmp>";
		echo "<hr/>";
	}
}
?>
</body>
</html>

