<?php
header("Cache-Control: no-cache");
header("Content-Type: text/html; charset=UTF-8");

$F0 = @$_GET["f"] ?: "ext";
$F = "../{$F0}.log";
$MAX_READ_SZ = @intval($_GET["sz"])?:5000;

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
p {
  font-size: 0.6em;
  color: grey;
  line-height: 0.8;
}
xmp {
  overflow: auto;
}
</style>

<h2>查看日志</h2>
<a href="?f=trace&sz=<?=$MAX_READ_SZ?>">trace</a>
<a href="?f=ext&sz=<?=$MAX_READ_SZ?>">ext</a>
<a href="?f=debug&sz=<?=$MAX_READ_SZ?>">debug</a>
<a href="?f=secure&sz=<?=$MAX_READ_SZ?>">secure</a>

<hr/>
<?php
if (count($msgs) == 0) {
	echo "<p>没有数据</p>";
}
else {
	for ($i=count($msgs)-1; $i>=0; --$i) {
		$hdr = null;
		$msg = $msgs[$i];
		$a = preg_split('/^(===.*? at \[.*?\]\s*)/', $msg, 2, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
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

