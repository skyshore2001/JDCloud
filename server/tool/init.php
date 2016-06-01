<?php
/*

init.php(ac?)

当ac为空时，显示环境检查等html页面。否则返回相应文本信息。

init.php(ac="initdb")(db, dbcred0, dbcred, dbcred_ro?, urlpath)

初始化数据库及配置文件：
- 如果数据库不存在，创建它并指定用户。
- 写用户配置文件 php/conf.user.php

*/

//var_dump(phpinfo(INFO_MODULES));
global $INFO;
const CONF_FILE = "../php/conf.user.php";

$INFO = []; // { @check, allowInit }
// check: [{value, result=0|1}]

$INFO["check"] = checkEnv();
$INFO["allowInit"] = !file_exists(CONF_FILE);

$ac = param("ac");
if ($ac) {
	header("Content-Type: text/plain");
	header("Cache-Control: no-cache");
	if ($ac == "initdb") {
		if (! $INFO["allowInit"]) {
			die("配置文件已存在。请删除后重新配置。");
		}
		api_initDb();
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
	if (! isset($val) || $val=="") {
		die("缺少参数`$name`.");
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

// $dbname?=null
function dbconn($dbhost, $dbname, $dbuser, $dbpwd)
{
	try {
		$connstr = "mysql:host={$dbhost}";
		if ($dbname) {
			$connstr .= ";dbname={$dbname}";
		}
		$dbh = new PDO($connstr, $dbuser, $dbpwd);
	} catch (Exception $e) {
		die("连接数据库失败.");
	}

	$dbh->exec('set names utf8');
	$dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); # by default use PDO::ERRMODE_SILENT

	# enable real types (works on mysql after php5.4)
	# require driver mysqlnd (view "PDO driver" by "php -i")
	$dbh->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
	$dbh->setAttribute(PDO::ATTR_STRINGIFY_FETCHES, false);

	return $dbh;
}

function api_initDb()
{
	$db = mparam("db");
	$dbcred0 = mparam("dbcred0");
	$dbcred = mparam("dbcred");
	$urlpath = mparam("urlpath");
	$dbcred_ro = param("dbcred_ro");

	if (! preg_match('/^(.*?)\/(\w+)$/', $db, $ms))
		die("数据库指定错误: `$db`");
	$dbhost = $ms[1];
	$dbname = $ms[2];

	list($dbuser0, $dbpwd0) = explode(":", $dbcred0);
	if (!$dbuser0 || !$dbpwd0) {
		die("数据库管理员用户名密码指定错误: `$dbcred0`");
	}
	list($dbuser, $dbpwd) = explode(":", $dbcred);
	if (!$dbuser || !$dbpwd) {
		die("应用程序使用的数据库用户名密码指定错误: `$dbcred`");
	}

	if ($dbcred_ro) {
		list($dbuser_ro, $dbpwd_ro) = explode(":", $dbcred_ro);
	}

	$dbh = dbconn($dbhost, null, $dbuser0, $dbpwd0);
	try {
		$dbh->exec("use {$dbname}");
	}
	catch (Exception $e) {
		echo("=== 创建数据库: {$dbname}\n");
		$dbh->exec("create database {$dbname}");
		$dbh->exec("use {$dbname}");
	}

	echo("=== 设置用户权限: {$dbuser}\n");
	$str = $dbpwd? " identified by '{$dbpwd}'": "";
	$sql = "grant all on {$dbname}.* to {$dbuser}@localhost {$str}";
	$dbh->exec($sql);
	$sql = "grant all on {$dbname}.* to {$dbuser}@'%'";
	$dbh->exec($sql);

	if ($dbcred_ro) {
		echo("=== 设置只读用户权限: {$dbuser_ro}\n");
		$str = $dbpwd_ro? " identified by '{$dbpwd_ro}'": "";

		$sql = "grant select, lock tables, show view on {$dbname}.* to {$dbuser_ro} {$str}";
		$dbh->exec($sql);
		$sql = "grant select on mysql.* to {$dbuser_ro}";
		$dbh->exec($sql);
		$sql = "grant reload, replication client, replication slave on *.* to {$dbuser_ro}";
		$dbh->exec($sql);
	}

	echo "=== 写配置文件 " . CONF_FILE . "\n";
	$dbcred_b64 = base64_encode($dbcred);
	$str = <<<EOL
<?php

if (getenv("P_DB") === false) {
	putenv("P_DB={$db}");
	putenv("P_DBCRED={$dbcred_b64}");
	putenv("P_URL_PATH={$urlpath}");
}
EOL;
	file_put_contents(CONF_FILE, $str);

	echo("=== 完成! 请使用upgrade命令行工具更新数据库。\n");
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

table, iframe {
	width: 90%;
}

iframe {
	border: 1px solid #aaa;
}

.hint {
	font-size: 12px;
	color: #00f;
	display: block;
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
			<td>数据库<p class="hint">格式为"机器名/数据库名"</p></td>
			<td><input type="text" name="db" placeholder="localhost/jdcloud" required></td>
		</tr>
		<tr>
			<td>MYSQL数据库管理员用户<p class="hint">格式为"用户名:密码"，用于创建数据库、用户，设置权限等</p></td>
			<td><input type="text" name="dbcred0" placeholder="root:123456" required></td>
		</tr>
		<tr>
			<td>本应用程序使用的MYSQL用户<p class="hint">格式为"用户名:密码, 如不存在会自动创建。将写入配置文件。</span></td>
			<td><input type="text" name="dbcred" placeholder="jdcloud:FuZaMiMa" required></td>
		</tr>
		<tr>
			<td>只读MYSQL用户<span class="hint">格式为"用户名:密码, 用于数据库备份等，可不填</span></td>
			<td><input type="text" name="dbcred_ro" placeholder="jdcloudro:readonlypwd"></td>
		</tr>
		<tr>
			<td>应用程序URL路径<span class="hint">以"/"开头，不包括主机名。如果配置错误则session无法工作。</span></td>
			<td><input type="text" name="urlpath" placeholder="/jdcloud" required></td>
		</tr>
		<tr>
			<td colspan=2 align=center>
				<button>执行初始化</button>
			</td>
		</tr>
		</table>
	</form>
	<div class="allowInit">
		<h3>结果</h3>
		<iframe id="ifrInitDb" name="ifrInitDb"></iframe>
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
