<?php
/**
@module tool.php

tool.php(ac?)

当ac为空时，显示html页面。否则返回相应文本信息。

tool.php(ac="md5")(text)

查看md5值。

tool.php(ac="base64")(text, isDecode?)

base64编码。如果isDecode=1则是解码。
*/

$ac = param("ac");
if ($ac) {
	header("Content-Type: text/plain");
	header("Cache-Control: no-cache");
	if ($ac == "md5") {
		$text = mparam("text");
		$val = md5($text);
		echo($val);
	}
	else if ($ac == "base64") {
		$text = mparam("text");
		$isDecode = (int)param("isDecode", 0);
		if ($isDecode)
			$val = base64_decode($text);
		else
			$val = base64_encode($text);
		echo($val);
	}
	else {
		die("Bad param `ac`");
	}
	exit();
}

// $col?=$_REQUEST
function param($name, $defVal = null, $col = null)
{
	$col = $col ?: $_REQUEST;
	if (! isset($col[$name]))
		return $defVal;
	return $col[$name];
}

// $col?=$_REQUEST
function mparam($name, $col = null)
{
	$val = param($name, null, $col);
	if (! isset($val)) {
		die("require param `$name`.");
	}
	return $val;
}

?>
<html>
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<title>工具包</title>
</head>
<body>
<style>
h2 {
	margin-top: 30px;
	margin-bottom: 20px;
}

iframe {
	width: 90%;
	height: 50px;
	border: 1px solid #aaa;
}
</style>

<div>
	<h2>BASE64工具</h2>
	<form action="?ac=base64" method="POST" target="ifrBase64">
		文本：<input type="text" name="text" value="jdcloud:FuZaMiMa">
		<label><input type="checkbox" name="isDecode" value=1>解码</label>
		<button>提交</button>
	</form>
	<div>
		<h3>结果</h3>
		<iframe id="ifrBase64" name="ifrBase64"></iframe>
	</div>
</div>

<div>
	<h2>MD5工具</h2>
	<form action="?ac=md5" method="POST" target="ifrMd5">
		文本：<input type="text" name="text" value="1234">
		<button>提交</button>
	</form>
	<div>
		<h3>结果</h3>
		<iframe id="ifrMd5" name="ifrMd5"></iframe>
	</div>
</div>

</body>
</html>
