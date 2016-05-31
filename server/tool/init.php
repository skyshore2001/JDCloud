<?php
/*

init.php(ac?)

当ac为空时，显示环境检查等html页面。否则返回相应文本信息。

init.php(ac="initdb")(db, dbcred0, dbcred, urlpath)

初始化数据库及配置文件：
- 如果数据库不存在，创建它并指定用户。
- 写用户配置文件 php/conf.user.php


init.php(ac="md5")(text)
*/

//var_dump(phpinfo(INFO_MODULES));
global $INFO;

$INFO = []; // { @check, allowInit }
// check: [{value, result=0|1}]

$INFO["check"] = checkEnv();
$INFO["allowInit"] = !file_exists("../php/conf.user.php");

$ac = param("ac");
if ($ac) {
	header("Content-Type: text/plain");
	header("Cache-Control: no-cache");
	if ($ac == "initdb") {
		echo("INITDB...\n");
		echo("done.");
	}
	else if ($ac == "md5") {
		$text = mparam("text");
		$val = md5($text);
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

function checkEnv()
{
	$check = [];
	// php_ver
	$check["php_ver"] = [
		"value"=>phpversion(),
		"result"=> defined("PHP_VERSION_ID") && PHP_VERSION_ID>=50400
	];

	// timezone
	$val = ini_get('date.timezone');
	$check["timezone"] = [
		"value"=>$val? "值为" . $val: "未设置",
		"result" => $val
	];

	$val = phpversion('pdo');
	$check["pdo"] = [
		"value"=>$val? "版本" . $val: "不可用",
		"result" => $val
	];

	$val = phpversion('pdo_mysql');
	$check["pdo_mysql"] = [
		"value"=>$val? "版本" . $val: "不可用",
		"result" => $val
	];

	$val = phpversion('mysql');
	$check["mysql"] = [
		"value"=>$val? "版本" . $val: "不可用",
		"result" => $val
	];

	$val = phpversion('mysqlnd');
	$check["mysqlnd"] = [
		"value"=>$val? "版本" . $val: "不可用",
		"result" => $val
	];

	$val = function_exists('gd_info');
	$check["gd"] = [
		"value"=>$val? "支持": "不支持(图像上传将受影响)",
		"result" => $val
	];
	return $check;
}

?>
<html>
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<title>初始化</title>
<script src="zepto.min.js"></script>
</head>
<body>
<style>
.ok {
	background-color: #0f0;
}
.fail {
	background-color: #faa;
}

.disallowInit, .allowInit {
	display: none;
}

iframe {
	width: 80%
}
</style>

<h2>环境检查</h2>
<table border=1 style="border-spacing: 0" id="tblInfo">
	<tr>
		<th>检查项</th><th>结果</th>
	</tr>
	<tr>
		<td>php版本(不低于5.4)</td><td data-item="php_ver"></td>
	</tr>
	<tr>
		<td>mysql模块</td><td data-item="mysql"></td>
	</tr>
	<tr>
		<td>mysqlnd模块</td><td data-item="mysqlnd"></td>
	</tr>
	<tr>
		<td>pdo模块</td><td data-item="pdo"></td>
	</tr>
	<tr>
		<td>pdo_mysql模块</td><td data-item="pdo_mysql"></td>
	</tr>
	<tr>
		<td>时区设置(date.timezone)</td><td data-item="timezone"></td>
	</tr>
	<tr>
		<td>GD图像库</td><td data-item="gd"></td>
	</tr>
</table>

<div id="divInitDb">
	<h2>初始化数据库</h2>
	<div class="disallowInit">配置文件php/conf.user.php已存在。如需要重新配置，请删除该文件.</div>
	<form action="?ac=initdb" method="POST" target="ifrInitDb" class="allowInit">
		<table border=1 style="border-spacing: 0" >
		<tr>
			<td>数据库(格式为"机器名/数据库名")</td>
			<td><input type="text" name="db" value="localhost/jdcloud"</td>
		</tr>
		<tr>
			<td>可创建数据库的MYSQL用户(格式为"用户名:密码")</td>
			<td><input type="text" name="dbcred" value="root:123456"</td>
		</tr>
		<tr>
			<td>本应用程序使用的MYSQL用户(格式为"用户名:密码), 如不存在会自动创建</td>
			<td><input type="text" name="dbcred" value="jdcloud:FuZaMiMa"></td>
		</tr>
		<tr>
			<td>应用程序URL路径(以"/"开头，不包括主机名)</td>
			<td><input type="text" name="urlpath" value="/jdcloud"</td>
		</tr>
		<tr>
			<td colspan=2 align=center>
				<button>创建数据库</button>
			</td>
		</tr>
		</table>
	</form>
	<div class="allowInit">
		<h3>结果</h3>
		<iframe id="ifrInitDb" name="ifrInitDb"></iframe>
	</div>
</div>

<div id="divTool">
	<h2>工具</h2>
	<form action="?ac=md5" method="POST" target="ifrTool">
		文本：<input type="text" name="text" value="jdcloud:FuZaMiMa">
		<button>提交</button>
	</form>
	<div>
		<h3>结果</h3>
		<iframe id="ifrTool" name="ifrTool" style="height: 50px"></iframe>
	</div>
</div>

</body>

<script>

var info = <?= json_encode($INFO) ?>;

$("#tblInfo td[data-item]").each(function () {
	var item = $(this).attr("data-item");
	var e = info.check[item];
	if (e) {
		$(this).html(e.value);
		$(this).addClass(e.result? "ok": "fail");
	}
});

if (info.allowInit) {
	$("#divInitDb .allowInit").show();
}
else {
	$("#divInitDb .disallowInit").show();
}

</script>
</html>
