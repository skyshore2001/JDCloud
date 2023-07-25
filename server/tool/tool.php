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
		if (param("isDecode") == "1") {
			$val = @base64_decode($text);
		}
		else if (param("isJdDecode") == "1") {
			$val = b64d($text, true);
			if ($val === false) {
				$val = "*** fail to decode";
			}
			else if (strpos($val, '=') !== false) {
				parse_str($val, $arr);
				$val .= "\n---\n" . json_encode($arr, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
			}
		}
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

function b64d($str, $enhance=0)
{
	if ($enhance) {
		$str = str_replace('-', '+', $str);
		$key = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		$n = strpos($key, $str[0]);
		if ($n === false)
			return false;
		$key1 = substr($key, $n,64-$n) . substr($key, 0, $n);
		$len = strpos($key1, $str[1]);
		if ($len === false)
			return false;
		$len = ($len + 64 - $n) % 64;
		$str1 = '';
		for ($i=2; $i<strlen($str); ++$i) {
			$p = strpos($key1, $str[$i]);
			if ($p === false)
				return false;
			$str1 .= $key[$p];
		}
		$str = $str1;
	}
	$rv = base64_decode($str);
	// print_r([$len, $str, $rv]);
	if ($rv && $enhance) {
		if ((strlen($rv) % 64) != $len)
			return false;
	}
	return $rv;
}
?>
<!DOCTYPE html>
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
	height: 100px;
	border: 1px solid #aaa;
}
</style>

<div>
	<h2>BASE64工具</h2>
	<form action="?ac=base64" method="POST" target="ifrBase64">
		文本：<textarea name="text" rows=3 style="width:400px">jdcloud:FuZaMiMa</textarea>
		<button>提交</button><br>
		<label><input type="checkbox" name="isDecode" value=1>解码</label>
		<label><input type="checkbox" name="isJdDecode" value=1>通讯解码</label>
	</form>
	<div>
		<h3>结果</h3>
		<iframe id="ifrBase64" name="ifrBase64"></iframe>
	</div>
</div>

<div>
	<h2>MD5工具</h2>
	<form action="?ac=md5" method="POST" target="ifrMd5">
		文本：<textarea name="text" rows=3 style="width:400px">1234</textarea>
		<button>提交</button>
	</form>
	<div>
		<h3>结果</h3>
		<iframe id="ifrMd5" name="ifrMd5"></iframe>
	</div>
</div>

</body>
</html>
