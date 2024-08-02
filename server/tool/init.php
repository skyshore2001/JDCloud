<?php
/**
@module init.php

init.php(ac?)

当ac为空时，显示环境检查等html页面。否则返回相应文本信息。

init.php(ac="initdb")(db, dbcred0, dbcred, dbcred_ro?, urlPath?, adminCred?, cfgonly?=0)

初始化数据库及配置文件：
- 如果数据库不存在，创建它并指定用户。
- 写用户配置文件 php/conf.user.php
- 如果cfgonly=1, 只写配置文件，不检查数据库或用户。

在非Windows平台下，生成配置文件后，须输入之前设置的超级管理端密码才能继续设置。
如果未指定超级管理端密码，则默认为"admin:admin123"
(Windows平台认为非生产环境，不检查密码)

可以指定sqlite数据库，示例：

- P_DB 填写 jdcloud.db
- 选中"数据库已存在"
- P_DBCRED随便填写一个
- 点"执行初始化"即可。

*/

//var_dump(phpinfo(INFO_MODULES));
global $INFO;
const CONF_FILE = "../php/conf.user.php";
@include(CONF_FILE);

if (PHP_OS != "WINNT" && file_exists(CONF_FILE)) {
	$adminCred = getenv("P_ADMIN_CRED") ?: "admin:admin123";
	list($user, $pwd) = [@$_SERVER['PHP_AUTH_USER'], @$_SERVER['PHP_AUTH_PW']];
	$code = "$user:$pwd";
	$b64 = base64_encode($code);
	if ($adminCred != $code && $adminCred != $b64) {
		header('WWW-Authenticate: Basic realm="admin"');
		header('HTTP/1.0 401 Unauthorized');
		echo 'Forbidden! 请使用超级管理员帐号登录。';
		exit;
	}
}

$INFO = []; // { @check, allowInit }
// check: [{value, result=0|1|'ignore'}]

$INFO["check"] = checkEnv();
$INFO["allowInit"] = !file_exists(CONF_FILE);

//$INFO["allowUpgrade"] = file_exists("upgrade/META") && @( (filemtime("upgrade/upgrade.log")?:0) < filemtime("upgrade/META"));

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

	$val = phpversion('mysqlnd');
	$check["mysqlnd"] = [
		"value"=>$val? "版本" . $val: "不可用",
		"result" => $val
	];

	$val = extension_loaded('zip');
	$check["zip"] = [
		"value"=>$val? "可用": "不可用",
		"result" => $val
	];

	$val = extension_loaded('xml');
	$check["xml"] = [
		"value"=>$val? "可用": "不可用",
		"result" => $val
	];

	$val = extension_loaded('curl');
	$check["curl"] = [
		"value"=>$val? "可用": "不可用",
		"result" => $val
	];

	$val = extension_loaded('gd');
	$txt = $val? "可用": "不可用(图像上传将受影响)";
	if ($val) {
		$rv = gd_info();
		if (! $rv["JPEG Support"]) {
			$txt = "不完整(不能上传JPEG图片/--with-jpeg-dir)";
			$val = 0;
		}
	}
	$check["gd"] = [
		"value"=>$txt,
		"result" => $val
	];

	$val = extension_loaded('mbstring');
	$check["mbstring"] = [
		"value"=>$val? "可用": "不可用",
		"result" => $val
	];

	// upload
	$val = sprintf("upload_max_filesize=%s, post_max_size=%s, max_file_uploads=%s, max_input_time=%s", 
		ini_get('upload_max_filesize'),
		ini_get('post_max_size'),
		ini_get('max_file_uploads'),
		ini_get('max_input_time')
	);
	$check["uploadsz"] = [
		"value"=> $val,
		"result" => 'ignore'
	];
	return $check;
}

// $dbname?=null
function dbconn($dbhost, $dbname, $dbuser, $dbpwd)
{
	global $DBH;
	if (isset($DBH))
		return $DBH;
	try {
		$connstr = "mysql:host={$dbhost}";
		if ($dbname) {
			$connstr .= ";dbname={$dbname}";
		}
		$dbh = new PDO($connstr, $dbuser, $dbpwd);
	} catch (Exception $e) {
		$msg = $e->getMessage();
		die("连接数据库失败: {$msg}");
	}

	$dbh->exec('set names utf8mb4');
	$dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); # by default use PDO::ERRMODE_SILENT

	# enable real types (works on mysql after php5.4)
	# require driver mysqlnd (view "PDO driver" by "php -i")
	$dbh->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
	$dbh->setAttribute(PDO::ATTR_STRINGIFY_FETCHES, false);

	$DBH = $dbh;
	return $dbh;
}

function queryOne($sql, $assoc=false)
{
	global $DBH;
	if (!isset($DBH))
		dbconn();
	$sth = $DBH->query($sql);
	if ($sth === false)
		return false;
	$fetchMode = $assoc? PDO::FETCH_ASSOC: PDO::FETCH_NUM;
	$row = $sth->fetch($fetchMode);
	$sth->closeCursor();
	if ($row !== false && !$assoc && count($row) === 1)
		return $row[0];
	return $row;
}

function createUserForMysql8($dbuser, $dbpwd)
{
	global $DBH;
	try {
		$DBH->exec("create user {$dbuser}@localhost identified by '{$dbpwd}'");
	}catch (Exception $e) {
		$DBH->exec("alter user {$dbuser}@localhost identified by '{$dbpwd}'");
	}

	try {
		$DBH->exec("create user {$dbuser}@'%' identified by '{$dbpwd}'");
	}catch (Exception $e) {
		$DBH->exec("alter user {$dbuser}@'%' identified by '{$dbpwd}'");
	}
}

function api_initDb()
{
	$db = mparam("db");
	// sqlite db
	if (preg_match('/\.db$/', $db)) {
		$dbcred = '';
		$urlPath = '';
		goto write_conf;
	}

	$dbcred = mparam("dbcred");
	$cfgonly = (int)param("cfgonly", 0);
	if (! $cfgonly) {
		$dbcred0 = mparam("dbcred0");
		$dbcred_ro = param("dbcred_ro");
	}
	$urlPath = param("urlPath");

	if (! preg_match('/^(.*?)\/(\w+)$/', $db, $ms))
		die("数据库指定错误: `$db`");
	$dbhost = $ms[1];
	$dbname = $ms[2];

	if (! $cfgonly) {
		list($dbuser0, $dbpwd0) = explode(":", $dbcred0);
		if (!$dbuser0 || !isset($dbpwd0)) {
			die("数据库管理员用户名密码指定错误: `$dbcred0`");
		}
		list($dbuser, $dbpwd) = explode(":", $dbcred);
		if (!$dbuser || !isset($dbpwd)) {
			die("应用程序使用的数据库用户名密码指定错误: `$dbcred`");
		}

		if ($dbcred_ro) {
			list($dbuser_ro, $dbpwd_ro) = explode(":", $dbcred_ro);
		}

		$dbh = dbconn($dbhost, null, $dbuser0, $dbpwd0);
		try {
			$dbh->exec("use {$dbname}");
			echo("=== 数据库`{$dbname}`已存在。\n");
		}
		catch (Exception $e) {
			echo("=== 创建数据库: {$dbname}\n");
			try {
				$dbh->exec("create database {$dbname} character set utf8mb4");
			}
			catch (Exception $e) {
				$msg = $e->getMessage();
				die("*** 用户`{$dbuser0}`无法创建数据库: {$msg}\n");
			}
			$dbh->exec("use {$dbname}");
		}
		$ver = queryOne("SELECT version()");
		echo("=== DBVersion=$ver\n");
		$majorVer = intval(explode(',', $ver)[0]); // 8.x

		echo("=== 设置用户权限: {$dbuser}\n");
		try {
			if ($majorVer >= 8) {
				createUserForMysql8($dbuser, $dbpwd);
				$str = "";
			}
			else {
				$str = $dbpwd? " identified by '{$dbpwd}'": "";
			}
			$sql = "grant all on {$dbname}.* to {$dbuser}@localhost {$str}";
			$dbh->exec($sql);
			$sql = "grant all on {$dbname}.* to {$dbuser}@'%' {$str}";
			$dbh->exec($sql);
		}catch (Exception $e) {
			$msg = $e->getMessage();
			die("*** 用户`{$dbuser0}`无法设置用户权限: {$msg}\n");
		}

		// TODO: not used?
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
	}

write_conf:
	echo "=== 写配置文件 " . CONF_FILE . "\n";
	$dbcred_b64 = base64_encode($dbcred);
	$adminCred = base64_encode(param("adminCred", ""));

	$str = <<<EOL
<?php

if (getenv("P_DB") === false) {
	putenv("P_DB={$db}");
	putenv("P_DBCRED={$dbcred_b64}");
}
putenv("P_ADMIN_CRED={$adminCred}");

EOL;
// putenv("P_URL_PATH={$urlPath}");

	if (! param("testmode")) {
		$str .= <<<EOL
// putenv("P_TEST_MODE=1");
// putenv("P_DEBUG=9");
putenv("P_DEBUG_LOG=2");

EOL;
	}
	else {
		$str .= <<<EOL
putenv("P_TEST_MODE=1");
putenv("P_DEBUG=9");
putenv("P_DEBUG_LOG=1");

EOL;
	}

	$rv = file_put_contents(CONF_FILE, $str);
	if ($rv === false) {
		echo "*** 写配置文件失败! 请检查写权限。\n";
		exit;
	}

	echo("=== 完成! 请使用升级工具更新数据库。\n");
}
?>
<!DOCTYPE html>
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

td {
	padding: 3px;
}

p.hint {
	margin: 1px;
}

#divUpgrade form {
	display: inline-block;
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
	<tr>
		<td>中文支持(mbstring模块)</td><td data-item="mbstring"></td>
	</tr>
	<tr>
		<td>zip模块(用于导出excel)</td><td data-item="zip"></td>
	</tr>
	<tr>
		<td>curl模块(用于外部调用)</td><td data-item="curl"></td>
	</tr>
	<tr>
		<td>xml模块(用于导出addon)</td><td data-item="xml"></td>
	</tr>
	<tr>
		<td>上传文件设置</td><td data-item="uploadsz"></td>
	</tr>
</table>

<div id="divInitDb">
	<h2>初始化数据库和配置文件</h2>
	<div class="disallowInit">配置文件php/conf.user.php已存在。如需要重新配置，请删除该文件.</div>
	<form action="?ac=initdb" method="POST" target="ifrInitDb" class="allowInit">
		<div class="hint">(标记*为必填项)</div>
		<table border=1 style="border-spacing: 0" >
		<tr>
			<td>MYSQL数据库<p class="hint">P_DB, 格式为"机器名/数据库名"</p></td>
			<td nowrap><input type="text" name="db" placeholder="localhost/jdcloud" required>*</td>
		</tr>
		<tr>
			<td colspan=2>
				<label><input type="checkbox" name="cfgonly" value=1 id="chkCfgOnly">数据库已存在，不用创建</label>
			</td>
		</tr>
		<tr class="cfgonly">
			<td>数据库管理员帐号<p class="hint">格式为"用户名:密码"，用于创建数据库、用户，设置权限等</p></td>
			<td><input type="text" name="dbcred0" autocomplete="off" placeholder="root:123456" required>*</td>
		</tr>
		<tr>
			<td>应用程序数据库帐号<p class="hint">P_DBCRED, 格式为"用户名:密码", 该帐号将获得当前数据库操作的所有权限，并将写入配置文件。</span></td>
			<td><input type="text" name="dbcred" autocomplete="off" placeholder="jdcloud:FuZaMiMa" required>*</td>
		</tr>
		<!--tr class="cfgonly">
			<td>只读权限的数据库帐号<p class="hint">格式为"用户名:密码", 该帐号获得当前数据库只读权限及数据库备份、主从复制等权限，可不填。</p></td>
			<td><input type="text" name="dbcred_ro" autocomplete="off" placeholder="jdcloudro:readonlypwd"></td>
		</tr-->
		<!--tr>
			<td>应用程序URL根路径<p class="hint">P_URL_PATH, 以"/"开头，不包括主机名。如果配置错误则session无法工作。可不填。</p></td>
			<td><input type="text" name="urlPath" placeholder="/jdcloud"></td>
		</tr-->
		<tr>
			<td>超级管理端登录帐号<p class="hint">P_ADMIN_CRED, 格式为"用户名:密码", 如不填写则无法登录超级管理端。</p></td>
			<td><input type="text" name="adminCred" autocomplete="off" placeholder="admin:admin123"></td>
		</tr>
		<tr>
			<td colspan=2>
				<label><input type="checkbox" name="testmode" value=1>开启测试模式</label>
			</td>
		</tr>
		<tr>
			<td colspan=2 align=center>
				<button>执行初始化</button>
			</td>
		</tr>
		</table>
	</form>
</div>

<div id="divUpgrade" style="margin-top:20px;">
	<form action="upgrade/index.php" method="POST" target="ifrInitDb">
		<button>数据库升级</button>
	</form>
	<form action="upgrade/index.php?diff=1" method="POST" target="ifrInitDb">
		<button>数据库比较</button>
	</form>
</div>

<div id="divResult">
	<h3>结果</h3>
	<iframe id="ifrInitDb" name="ifrInitDb"></iframe>
</div>

</body>

<script>

var info = <?= json_encode($INFO) ?>;

$("#tblInfo td[data-item]").each(function () {
	var item = $(this).attr("data-item");
	var e = info.check[item];
	if (e) {
		$(this).html(e.value);
		if (e.value == '可用')
			$(this).parent().hide();
		if (e.result !== 'ignore')
			$(this).addClass(e.result? "ok": "fail");
	}
});

if (info.allowInit) {
	$("#divInitDb .allowInit").show();
}
else {
	$("#divInitDb .disallowInit").show();
}

//$("#divUpgrade").toggle(info.allowUpgrade);
//$("#divResult").toggle(info.allowUpgrade || info.allowInit);

$("#chkCfgOnly").change(function () {
	if (this.checked) {
		$(this.form.dbcred0).prop("disabled", true);
		$(this.form.dbcred_ro).prop("disabled", true);
		$(this.form).find(".cfgonly").hide();
	}
	else {
		$(this.form.dbcred0).prop("disabled", false);
		$(this.form.dbcred_ro).prop("disabled", false);
		$(this.form).find(".cfgonly").show();
	}
});

</script>
</html>
