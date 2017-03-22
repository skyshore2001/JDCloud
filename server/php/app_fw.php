<?php
/*********************************************************
@module app_fw

筋斗云服务端通用应用框架。

## 通用函数

- 获得指定类型参数
@see param,mparam

- 数据库连接及操作
@see dbconn,execOne,queryOne,queryAll

- 错误处理设施
@see MyException,errQuit

## 初始化配置

app_fw框架自动包含 $BASE_DIR/php/conf.user.php。

项目部署时的配置，一般用于定义环境变量、全局变量等，通常不添加入版本库，在项目实施时手工配置。

对于不变的全局配置，应在app.php中定义。

### 数据库配置

@key P_DB 环境变量，指定DB类型与地址。
@key P_DBCRED 环境变量，指定DB登录帐号

P_DB格式为：

	P_DB={主机名}/{数据库名}
	或
	P_DB={主机名}:{端口号}/{数据库名}

例如：

	P_DB=localhost/myorder
	P_DB=www.myserver.com:3306/myorder

P_DBCRED格式为`{用户名}:{密码}`，或其base64编码后的值，如

	P_DBCRED=ganlan:1234
	或
	P_DBCRED=Z2FubGFuOjEyMzQ=

此外，P_DB还支持SQLite数据库，直接指定以".db"为扩展名的文件即可。例如：

	P_DB=../myorder.db

## 测试模式与调试等级

@key P_TEST_MODE Integer。环境变量，允许测试模式。0-生产模式；1-测试模式；2-自动化回归测试模式(RTEST_MODE)
@key P_DEBUG Integer。环境变量，设置调试等级，值范围0-9。仅在测试模式下有效。

测试模式特点：

- 输出的HTTP头中包含：`X-Daca-Test-Mode: 1`
- 输出的JSON格式经过美化更易读，且可以显示更多调试信息。前端可通过在接口中添加`_debug`参数设置调试等级。
  如果想要查看本次调用涉及的SQL语句，可以用`_debug=9`。
- 某些用于测试的接口可以调用，例如execSql。因而十分危险，生产模式下一定不可误设置为测试模式。
- 可以使用模拟模式

注意：v3.4版本起不允许客户端设置_test参数，且用环境变量P_TEST_MODE替代符号文件CFG_TEST_MODE和设置全局变量TEST_MODE.

在过去测试模式用于：可直接对生产环境进行测试且不影响生产环境，即部署后，在前端指定以测试模式连接，在后端为测试模式连接专用的测试数据库，且使用专用的cookie，实现与生产模式共用代码但互不影响。
现已废弃这种用法，应搭建专用的测试环境用于测试开发。

@see addLog

## 模拟模式

@key P_MOCK_MODE Integer. 模拟模式. 值：0/1.

对第三方系统依赖（如微信认证、支付宝支付、发送短信等），可通过设计Mock接口来模拟。

注意：v3.4版本起用环境变量P_MOCK_MODE替代符号文件CFG_MOCK_MODE/CFG_MOCK_T_MODE和设置全局变量MOCK_MODE，且模拟模式只允许在测试模式激活时才能使用。

@see ExtMock

## session管理

- 应用的session名称为 "{app}id", 如应用名为 "user", 则session名为"userid". 因而不同的应用同时调用服务端也不会冲突。
- 保存session文件的目录为 $BASE_DIR/session, 可使用环境变量P_SESSION_DIR重定义。
- 同一主机，不同URL下的session即使APP名相同，也不会相互冲突，因为框架会根据当前URL，设置cookie的有效路径。

@key P_SESSION_DIR ?= $BASE_DIR/session 环境变量，定义session文件存放路径。
@key P_URL_PATH 环境变量。项目的URL路径，如"/jdcloud", 用于定义cookie生效的作用域，也用于拼接相对URL路径。
@see getBaseUrl

## 应用框架

继承AppBase类，可实现提供符合BQP协议接口的模块。[api_fw](#api_fw)框架就是使用它的一个典型例子。

@see AppBase

**********************************************************/

// ====== defines {{{
# error code definition:
const E_ABORT = -100; // 客户端不报错
const E_AUTHFAIL=-1;
const E_OK=0;
const E_PARAM=1;
const E_NOAUTH=2;
const E_DB=3;
const E_SERVER=4;
const E_FORBIDDEN=5;

$ERRINFO = [
	E_AUTHFAIL => "认证失败",
	E_PARAM => "参数不正确",
	E_NOAUTH => "未登录",
	E_DB => "数据库错误",
	E_SERVER => "服务器错误",
	E_FORBIDDEN => "禁止操作",
];

const RTEST_MODE=2;

//}}}

// ====== config {{{
// such vars are set manually or by init proc (AppFw_::initGlobal); use it like consts.

/**
@var $BASE_DIR

包含app_fw.php的主文件（如api.php）所在目录。常用于拼接子目录名。
最后不带"/".
*/
global $BASE_DIR;
$BASE_DIR = dirname(dirname(__FILE__));

global $JSON_FLAG;
$JSON_FLAG = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

global $DB, $DBCRED, $USE_MYSQL;
$DB = "localhost/jdcloud";
$DBCRED = "ZGVtbzpkZW1vMTIz"; // base64({user}:{pwd}), default: demo:demo123

global $ALLOW_LCASE_PARAM;
$ALLOW_LCASE_PARAM = true;

global $TEST_MODE, $MOCK_MODE, $DBG_LEVEL;

global $DBH;
/**
@var $APP?=user

客户端应用标识，默认为"user". 
根据URL参数"_app"确定值。
 */
global $APP;
$APP = param("_app", "user", $_GET);
// }}}

// ====== global {{{
global $g_dbgInfo;
$g_dbgInfo = [];
//}}}

// load user config
@include_once("{$BASE_DIR}/php/conf.user.php");

// ====== functions {{{
// assert失败中止运行
assert_options(ASSERT_BAIL, 1);

// ==== param {{{

# $name with type: 
# 	end with "Id" or "/i": int
# 	end with "/b": bool
# 	end with "/dt" or "/tm": datetime
# 	end with "/n": numeric
# 	end with "/i+": int array
# 	end with "/js": json object
# 	default or "/s": string
# fix $name and return type: "i"-int, "b"-bool, "n"-numeric, "i+"-int[], "js"-object, "s"-string
# support list(i:n:b:dt:tm). e.g. 参数"items"类型为list(id/Integer, qty/Double, dscr/String)，可用param("items/i:n:s")获取
function parseType_(&$name)
{
	$type = null;
	if (($n=strpos($name, "/")) !== false)
	{
		$type = substr($name, $n+1);
		$name = substr($name, 0, $n);
	}
	else {
		if ($name === "id" || substr($name, -2) === "Id") {
			$type = "i";
		}
		else {
			$type = "s";
		}
	}
	return $type;
}

/**
@fn param_varr($str, $type, $name)

type的格式如"i:n:b?:dt:tm?".

- 每个词表示一个字段类型
  类型标识：i-Integer; n-Number/Double; b-Boolean(0/1); dt/tm-DateTime
- 后置"?"表示该参数可缺省。
 */
function param_varr($str, $type, $name)
{
	$ret = [];
	$elemTypes = [];
	foreach (explode(":", $type) as $t) {
		$tlen = strlen($t);
		if ($tlen === 0)
			throw new MyException(E_SERVER, "bad type spec: `$type`");
		$optional = false;
		if ($t[$tlen-1] === '?') {
			$t = substr($t, 0, $tlen-1);
			$optional = true;
		}
		$elemTypes[] = [$t, $optional];
	}
	$colCnt = count($elemTypes);

	foreach (explode(',', $str) as $row0) {
		$row = explode(':', $row0, $colCnt);
		while (count($row) < $colCnt) {
			$row[] = null;
		}

		$i = 0;
		$row1 = [];
		foreach ($row as $e) {
			list($t, $optional) = $elemTypes[$i];
			if ($e == null) {
				if ($optional) {
					++$i;
					$row1[] = null;
					continue;
				}
				throw new MyException(E_PARAM, "Bad Request - param `$name`: list($type). require col: `$row0`[$i]");
			}
			$e = htmlEscape($e);
			if ($t === "i") {
				if (! ctype_digit($e))
					throw new MyException(E_PARAM, "Bad Request - param `$name`: list($type). require integer col: `$row0`[$i]=`$e`.");
				$row1[] = intval($e);
			}
			elseif ($t === "n") {
				if (! is_numeric($e))
					throw new MyException(E_PARAM, "Bad Request - param `$name`: list($type). require numberic col: `$row0`[$i]=`$e`.");
				$row1[] = doubleval($e);
			}
			else if ($t === "b") {
				$val = null;
				if (!tryParseBool($e, $val))
					throw new MyException(E_PARAM, "Bad Request - param `$name`: list($type). require bool col: `$row0`[$i]=`$e`.");
				$row1[] = $val;
			}
			else if ($t === "s") {
				$row1[] = $e;
			}
			else if ($t === "dt" || $t === "tm") {
				$v = strtotime($e);
				if ($v === false)
					throw new MyException(E_PARAM, "Bad Request - param `$name`: list($type). require datetime col: `$row0`[$i]=`$e`.");
				$row1[] = $v;
			}
			else {
				throw new MyException(E_SERVER, "unknown elem type `$t` for param `$name`: list($type)");
			}
			++ $i;
		}
		$ret[] = $row1;
	}
	if (count($ret) == 0)
		throw new MyException(E_PARAM, "Bad Request - list param `$name` is empty.");
	return $ret;
}
/**
@fn param($name, $defVal?, $col?, $doHtmlEscape=true)

@param $col: 默认先取$_GET再取$_POST，"G" - 从$_GET中取; "P" - 从$_POST中取

以下形式已不建议使用：

@fn param($name, $defVal?, $col?=$_REQUEST, $doHtmlEscape=true)
@param $col: key-value collection

获取名为$name的参数。
$name中可以指定类型，返回值根据类型确定。如果该参数未定义或是空串，直接返回缺省值$defVal。

$name中指定类型的方式如下：
- 名为"id", 或以"Id"或"/i"结尾: int
- 以"/b"结尾: bool. 可接受的字符串值为: "1"/"true"/"on"/"yes"=>true, "0"/"false"/"off"/"no" => false
- 以"/dt"或"/tm"结尾: datetime
- 以"/n"结尾: numeric/double
- 以"/s"结尾（缺省）: string. 缺省为防止XSS攻击会做html编码，如"a&b"处理成"a&amp;b"，设置参数doHtmlEscape可禁用这个功能。
- 复杂类型：以"/i+"结尾: int array
- 复杂类型：以"/js"结尾: json object
- 复杂类型：List类型（以","分隔行，以":"分隔列），类型定义如"/i:n:b:dt:tm" （列只支持简单类型，不可为复杂类型）

示例：

	$id = param("id");
	$svcId = param("svcId/i", 99);
	$wantArray = param("wantArray/b", false);
	$startTm = param("startTm/dt", time());

List类型示例。参数"items"类型在文档中定义为list(id/Integer, qty/Double, dscr/String)，可用param("items/i:n:s")获取, 值如

	items=100:1:洗车,101:1:打蜡

返回

	[ [ 100, 1.0, "洗车"], [101, 1.0, "打蜡"] ]

如果某列可缺省，用"?"表示，如param("items/i:n?:s?")可获取值：

	items=100:1,101::打蜡

返回

	[ [ 100, 1.0, null], [101, null, "打蜡"] ]

TODO: 直接支持 param("items/(id,qty?/n,dscr?)"), 添加param_objarr函数，去掉parseList函数。上例将返回

	[
		[ "id"=>100, "qty"=>1.0, dscr=>null],
		[ "id"=>101, "qty"=>null, dscr=>"打蜡"]
	]

*/
function param($name, $defVal = null, $col = null, $doHtmlEscape = true)
{
	if ($col === "G")
		$col = $_GET;
	else if ($col === "P")
		$col = $_POST;
	else if (!isset($col))
		$col = $_REQUEST;

	assert(is_array($col));

	$ret = $defVal;
	$type = parseType_($name);
	if (isset($col[$name])) {
		$ret = $col[$name];
	}
	else {
		global $ALLOW_LCASE_PARAM;
		if ($ALLOW_LCASE_PARAM) {
			$name1 = strtolower($name);
			if (isset($col[$name1]))
				$ret = $col[$name1];
		}
	}
	if ($ret === "")
		return $defVal;
	# check type
	if (isset($ret) && is_string($ret)) {
		// avoid XSS attack
		if ($doHtmlEscape)
			$ret = htmlEscape($ret);
		if ($type === "s") {
		}
		elseif ($type === "i") {
			if (! is_numeric($ret))
				throw new MyException(E_PARAM, "Bad Request - integer param `$name`=`$ret`.");
			$ret = intval($ret);
		}
		elseif ($type === "n") {
			if (! is_numeric($ret))
				throw new MyException(E_PARAM, "Bad Request - numeric param `$name`=`$ret`.");
			$ret = doubleval($ret);
		}
		elseif ($type === "b") {
			$val = null;
			if (!tryParseBool($ret, $val))
				throw new MyException(E_PARAM, "Bad Request - bool param `$name`=`$val`.");
			$ret = $val;
		}
		elseif ($type == "i+") {
			$arr = [];
			foreach (explode(',', $ret) as $e) {
				if (! ctype_digit($e))
					throw new MyException(E_PARAM, "Bad Request - int array param `$name` contains `$e`.");
				$arr[] = intval($e);
			}
			if (count($arr) == 0)
				throw new MyException(E_PARAM, "Bad Request - int array param `$name` is empty.");
			$ret = $arr;
		}
		elseif ($type === "dt" || $type === "tm") {
			$ret1 = strtotime($ret);
			if ($ret1 === false)
				throw new MyException(E_PARAM, "Bad Request - invalid datetime param `$name`=`$ret`.");
			$ret = $ret1;
		}
		elseif ($type === "js" || $type === "tbl") {
			$ret1 = json_decode($ret, true);
			if ($ret1 === null)
				throw new MyException(E_PARAM, "Bad Request - invalid json param `$name`=`$ret`.");
			if ($type === "tbl") {
				$ret1 = table2objarr($ret1);
				if ($ret1 === false)
					throw new MyException(E_PARAM, "Bad Request - invalid table param `$name`=`$ret`.");
			}
			$ret = $ret1;
		}
		else if (strpos($type, ":") >0)
			$ret = param_varr($ret, $type, $name);
		else 
			throw new MyException(E_SERVER, "unknown type `$type` for param `$name`");
	}
# 	$name1 = strtoupper("HTTP_$name");
# 	if (isset($_SERVER[$name1]))
# 		return $_SERVER[$name1];
	return $ret;
}

/** 
@fn mparam($name, $col = $_REQUEST)
@brief mandatory param

$name可以是一个数组，表示至少有一个参数有值，这时返回每个参数的值。
参考param函数，查看$name如何支持各种类型。

示例：

	$svcId = mparam("svcId");
	$svcId = mparam("svcId/i");
	$itts = mparam("itts/i+")
	list($svcId, $itts) = mparam(["svcId", "itts/i+"]); # require one of the 2 params
*/
function mparam($name, $col = null)
{
	if (is_array($name))
	{
		$arr = [];
		$found = false;
		foreach ($name as $name1) {
			if ($found) {
				$rv = null;
			}
			else {
				$rv = param($name1, null, $col);
				if (isset($rv))
					$found = true;
			}
			$arr[] = $rv;
		}
		if (!$found) {
			$s = join($name, " or ");
			throw new MyException(E_PARAM, "Bad Request - require param $s", "缺少参数`{$s}`");
		}
		return $arr;
	}

	$rv = param($name, null, $col);
	if (isset($rv))
		return $rv;
	parseType_($name); // remove the type tag.
	throw new MyException(E_PARAM, "Bad Request - param `$name` is missing", "缺少参数`{$name}`");
}

/**
@fn setParam($k, $v)
@fn setParam(@kv)

设置参数，其实是模拟客户端传入的参数。以便供tableCRUD等函数使用。

示例：

	setParam("cond", "name LIKE " . Q("%$name%"));
	setParam([
		"_fmt" => "list",
		"orderby" => "id DESC"
	]);

@see tableCRUD
 */
function setParam($k, $v=null)
{
	if (is_array($k)) {
		foreach ($k as $k1 => $v1) {
			$_GET[$k1] = $_REQUEST[$k1] = $v1;
		}
	}
	else {
		$_GET[$k] = $_REQUEST[$k] = $v;
	}
}
/*
# form/post param ($_POST)
function fparam($name, $defVal = null)
{
	return param($name, $defVal, $_POST);
}

# mandatory form param
function mfparam($name)
{
	return mparam($name, $_POST);
}
*/

function getBcParam($name, $defVal = null)
{
	$name1 = "HTTP_BC_" . strtoupper($name);
	if (isset($_SERVER[$name1]))
		return $_SERVER[$name1];
	return $defVal;
}

function setBcParam($param, $value)
{
	header("bc-$param: $value");
}

function checkObjArrParam($name, $arr, $fields = null)
{
	#var_export($arr);
	if (! is_array($arr))
		throw new MyException(E_PARAM, "bad param `$name` - require array");
	if (isset($fields)) {
		foreach ($arr as $e) {
			foreach ($fields as $k) {
				if (! array_key_exists($k, $e)) {
					throw new MyException(E_PARAM, "missing param {$name}[][$k]");
				}
			}
		}
	}
	return true;
}

function getRsHeader($sth)
{
	$h = [];
	# !!! if no data, getColumnMeta() will throw exception!
	try {
		for($i=0; $i<$sth->columnCount(); ++ $i) {
			$meta = $sth->getColumnMeta($i);
			$h[] = $meta["name"];
		}
	} catch (Exception $e) {}
	return $h;
}

function getRsAsTable($sql)
{
	global $DBH;
	$sth = $DBH->query($sql);
	$wantArray = param("wantArray/b", false);
	if ($wantArray) {
		return $sth->fetchAll(PDO::FETCH_ASSOC);
	}

	$h = getRsHeader($sth);
	$d = $sth->fetchAll(PDO::FETCH_NUM);

	return ["h"=>$h, "d"=>$d];
}

/**
@fn objarr2table ($objarr, $fixedColCnt=null)

将objarr格式转为table格式, 如：

	objarr2table(
		[
			["id"=>100, "name"=>"A"],
			["id"=>101, "name"=>"B"]
	   	]
	) -> 
		[
			"h"=>["id", "name"],
			"d"=>[ 
				[100,"A"], 
				[101,"B"]
		   	] 
		]

注意：
- objarr每行中列的顺序可以不一样，table列按首行顺序输出。
- 每行中列数可以不一样，这时可指定最少固定列数 $fixedColCnt, 而该列以后，将自动检查所有行决定是否加到header中。例：

	objarr2table(
		[
			["id"=>100, "name"=>"A"], 
			["name"=>"B", "id"=>101, "flag_v"=>1],
			["id"=>102, "name"=>"C", "flag_r"=>1]
		], 2  // 2列固定
	) -> 
		[
			"h"=>["id", "name", "flag_v", "flag_r"],
			"d"=>[ 
				[100,"A", null,null], 
				[101,"B", 1, null],
				[102,"C", null, 1]
			]
		]

@see table2objarr
@see varr2objarr
*/
function objarr2table($rs, $fixedColCnt=null)
{
	$h = [];
	$d = [];
	if (count($rs) == 0)
		return ["h"=>$h, "d"=>$d];

	$h = array_keys($rs[0]);
	if (isset($fixedColCnt)) {
		foreach ($rs as $row) {
			$h1 = array_keys($row);
			for ($i=$fixedColCnt; $i<count($h1); ++$i) {
				if (array_search($h1[$i], $h) === false) {
					$h[] = $h1[$i];
				}
			}
		}
	}
	$n = 0;
	foreach ($rs as $row) {
		$d[] = [];
		foreach ($h as $k) {
			$d[$n][] = @$row[$k];
		}
		++ $n;
	}
	return ["h"=>$h, "d"=>$d];
}

/**
@fn table2objarr

将table格式转为 objarr, 如：

	table2objarr(
		[
			"h"=>["id", "name"],
			"d"=>[ 
				[100,"A"], 
				[101,"B"]
		   	] 
		]
	) -> [ ["id"=>100, "name"=>"A"], ["id"=>101, "name"=>"B"] ]

 */
function table2objarr($tbl)
{
	if (! @(is_array($tbl["d"]) && is_array($tbl["h"])))
		return false;
	$ret = [];
	if (count($tbl["d"]) == 0)
		return $ret;
	if (count($tbl["h"]) != count($tbl["d"][0]))
		return false;
	return varr2objarr($tbl["d"], $tbl["h"]);
}

/** 
@fn varr2objarr

将类型 varr (仅有值的二维数组, elem=[$col1, $col2] ) 转为 objarr (对象数组, elem={col1=>cell1, col2=>cell2})

例：

	varr2objarr(
		[ [100, "A"], [101, "B"] ], 
		["id", "name"] )
	-> [ ["id"=>100, "name"=>"A"], ["id"=>101, "name"=>"B"] ]

 */
function varr2objarr($varr, $headerLine)
{
	$ret = [];
	foreach ($varr as $row) {
		$ret[] = array_combine($headerLine, $row);
	}
	return $ret;
}

//}}}

// ==== database {{{
/**
@fn getCred($cred) -> [user, pwd]

$cred为"{user}:{pwd}"格式，支持使用base64编码。
示例：

	list($user, $pwd) = getCred(getenv("P_ADMIN_CRED"));
	if (! isset($user)) {
		// 未设置用户名密码
	}

*/
function getCred($cred)
{
	if (! $cred)
		return null;
	if (stripos($cred, ":") === false) {
		$cred = base64_decode($cred);
	}
	return explode(":", $cred, 2);
}
 
/**
@fn dbconn($fnConfirm=$GLOBALS["dbConfirmFn"])
@param fnConfirm fn(dbConnectionString), 如果返回false, 则程序中止退出。
@key dbConfirmFn 连接数据库前回调。

连接数据库

数据库由全局变量$DB(或环境变量P_DB）指定，格式可以为：

	host1/carsvc (无扩展名，表示某主机host1下的mysql数据库名；这时由 全局变量$DBCRED 或环境变量 P_DBCRED 指定用户名密码。

	dir1/dir2/carsvc.db (以.db文件扩展名标识的文件路径，表示SQLITE数据库）

环境变量 P_DBCRED 指定用户名密码，格式为 base64(dbuser:dbpwd).
 */
function dbconn($fnConfirm = null)
{
	global $DBH;
	if (isset($DBH))
		return $DBH;


	global $DB, $DBCRED, $USE_MYSQL;

	// e.g. P_DB="../carsvc.db"
	if (! $USE_MYSQL) {
		$C = ["sqlite:" . $DB, '', ''];
	}
	else {
		// e.g. P_DB="115.29.199.210/carsvc"
		// e.g. P_DB="115.29.199.210:3306/carsvc"
		if (! preg_match('/^"?(.*?)(:(\d+))?\/(\w+)"?$/', $DB, $ms))
			throw new MyException(E_SERVER, "bad db=`$DB`", "未知数据库");
		$dbhost = $ms[1];
		$dbport = $ms[3] ?: 3306;
		$dbname = $ms[4];

		list($dbuser, $dbpwd) = getCred($DBCRED); 
		$C = ["mysql:host={$dbhost};dbname={$dbname};port={$dbport}", $dbuser, $dbpwd];
	}

	if ($fnConfirm == null)
		@$fnConfirm = $GLOBALS["dbConfirmFn"];
	if ($fnConfirm && $fnConfirm($C[0]) === false) {
		exit;
	}
	try {
		@$DBH = new MyPDO ($C[0], $C[1], $C[2]);
	}
	catch (PDOException $e) {
		$msg = $GLOBALS["TEST_MODE"] ? $e->getMessage() : "dbconn fails";
		throw new MyException(E_DB, $msg, "数据库连接失败");
	}
	
	if ($USE_MYSQL) {
		$DBH->exec('set names utf8');
	}
	$DBH->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); # by default use PDO::ERRMODE_SILENT

	# enable real types (works on mysql after php5.4)
	# require driver mysqlnd (view "PDO driver" by "php -i")
	$DBH->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
	$DBH->setAttribute(PDO::ATTR_STRINGIFY_FETCHES, false);
	return $DBH;
}

/**
@fn Q($str, $dbh=$DBH)

quote string

一般是把字符串如"abc"转成加单引号的形式"'abc'". 适用于根据用户输入串拼接成SQL语句时，对输入串处理，避免SQL注入。

示例：

	$sql = sprintf("SELECT id FROM User WHERE uname=%s AND pwd=%s", Q(param("uname")), Q(param("pwd")));

 */
function Q($s, $dbh = null)
{
	if ($s === null)
		return "null";
	if ($dbh == null) {
		global $DBH;
		if (!isset($DBH))
			dbconn();
		$dbh = $DBH;
	}
	return $dbh->quote($s);
}

function sql_concat()
{
	global $USE_MYSQL;
	if ($USE_MYSQL)
		return "CONCAT(" . join(", ", func_get_args()) . ")";

	# sqlite3
	return join(" || ", func_get_args());
}

/**
@fn execOne($sql, $getInsertId?=false)

@param $getInsertId?=false 取INSERT语句执行后得到的id. 仅用于INSERT语句。

执行SQL语句，如INSERT, UPDATE等。执行SELECT语句请使用queryOne/queryAll.

	$token = mparam("token");
	execOne("UPDATE cinf SET appleDeviceToken=" . Q($token));

注意：在拼接SQL语句时，对于传入的string类型参数，应使用Q函数进行转义，避免SQL注入攻击。

对于INSERT语句，设置参数$getInsertId=true, 可取新加入数据行的id. 例：

	$sql = sprintf("INSERT INTO Hongbao (userId, createTm, src, expireTm, vdays) VALUES ({$uid}, '%s', '{$src}', '%s', {$vdays})", date('c', $createTm), date('c', $expireTm));
	$hongbaoId = execOne($sql, true);
	
 */
function execOne($sql, $getInsertId = false)
{
	global $DBH;
	if (! isset($DBH))
		dbconn();
	$rv = $DBH->exec($sql);
	if ($getInsertId)
		$rv = (int)$DBH->lastInsertId();
	return $rv;
}

/**
@fn queryOne($sql, $assoc = false)

执行查询语句，只返回一行数据，如果行中只有一列，则直接返回该列数值。
如果查询不到，返回false.

示例：查询用户姓名与电话，默认返回值数组：

	$row = queryOne("SELECT name,phone FROM User WHERE id={$id}");
	if ($row === false)
		throw new MyException(E_PARAM, "bad user id");
	// $row = ["John", "13712345678"]

也可返回关联数组:

	$row = queryOne("SELECT name,phone FROM User WHERE id={$id}", true);
	if ($row === false)
		throw new MyException(E_PARAM, "bad user id");
	// $row = ["name"=>"John", "phone"=>"13712345678"]

当查询结果只有一列且assoc=false时，直接返回该数值。

	$phone = queryOne("SELECT phone FROM User WHERE id={$id}");
	if ($phone === false)
		throw new MyException(E_PARAM, "bad user id");
	// $phone = "13712345678"

@see queryAll
 */
function queryOne($sql, $assoc = false)
{
	global $DBH;
	if (! isset($DBH))
		dbconn();
	$sth = $DBH->query($sql);
	if ($sth === false)
		return false;

	$fetchMode = $assoc? PDO::FETCH_ASSOC: PDO::FETCH_NUM;
	$row = $sth->fetch($fetchMode);
	$sth->closeCursor();
	if ($row !== false && count($row)===1 && !$assoc)
		return $row[0];
	return $row;
}

/**
@fn queryAll($sql, $assoc = false)

执行查询语句，返回数组。
如果查询失败，返回空数组。

默认返回值数组(varr):

	$rows = queryAll("SELECT name, phone FROM User");
	if (count($rows) > 0) {
		...
	}
	// 值为：
	$rows = [
		["John", "13712345678"],
		["Lucy", "13712345679"]
		...
	]
	// 可转成table格式返回
	return ["h"=>["name", "phone"], "d"=>$rows];

也可以返回关联数组(objarr)，如：

	$rows = queryAll("SELECT name, phone FROM User", true);
	if (count($rows) > 0) {
		...
	}
	// 值为：
	$rows = [
		["name"=>"John", "phone"=>"13712345678"],
		["name"=>"Lucy", "phone"=>"13712345679"]
		...
	]
	// 可转成table格式返回
	return objarr2table($rows);

@see objarr2table
 */
function queryAll($sql, $assoc)
{
	global $DBH;
	if (! isset($DBH))
		dbconn();
	$sth = $DBH->query($sql);
	if ($sth === false)
		return false;
	$fetchMode = $assoc? PDO::FETCH_ASSOC: PDO::FETCH_NUM;
	$rows = $sth->fetchAll($fetchMode);
	$sth->closeCursor();
	return $rows;
}

//}}}

/**
@fn getBaseUrl($wantHost = true)

返回 $BASE_DIR 对应的网络路径（最后以"/"结尾）。
如果指定了环境变量 P_URL_PATH（可在conf.user.php中设置）, 则根据该变量计算；否则自动判断（如果有符号链接可能不准）

例：

	P_URL_PATH = "/cheguanjia/" 或 P_URL_PATH = "/cheguanjia"

则

	getBaseUrl() -> "http://host/cheguanjia/"
	getBaseUrl(false) -> "/cheguanjia/"

@see $BASE_DIR
 */
function getBaseUrl($wantHost = true)
{
	$baseUrl = getenv("P_URL_PATH");
	if ($baseUrl === false)
	{
		// 自动判断
		global $BASE_DIR;
		$pat = "/" . basename($BASE_DIR) . "/";
		if (($i = strrpos($_SERVER["SCRIPT_NAME"], $pat)) !== false)
			$baseUrl = substr($_SERVER["SCRIPT_NAME"], 0, $i+strlen($pat));
		else
			$baseUrl = "/";
	}
	else {
		if (substr($baseUrl, -1, 1) != "/")
			$baseUrl .= "/";
	}

	if ($wantHost)
	{
		$host = (isset($_SERVER["HTTPS"]) ? "https://" : "http://") . $_SERVER["HTTP_HOST"];
		$baseUrl = $host . $baseUrl;
	}
	return $baseUrl;
}

/**
@fn logit($s, $addHeader=true, $type="trace")

记录日志。

默认到日志文件 $BASE_DIR/trace.log. 如果指定type=secure, 则写到 $BASE_DIR/secure.log.

可通过在线日志工具 tool/log.php 来查看日志。也可直接打开日志文件查看。
 */
function logit($s, $addHeader=true, $type="trace")
{
	if ($addHeader) {
		$remoteAddr = @$_SERVER['REMOTE_ADDR'] ?: 'unknown';
		$s = "=== REQ from [$remoteAddr] at [".strftime("%Y/%m/%d %H:%M:%S",time())."]\n" . $s . "\n";
	}
	else {
		$s .= "\n";
	}
	file_put_contents($GLOBALS['BASE_DIR'] . "/{$type}.log", $s, FILE_APPEND | LOCK_EX);
}

/*********************************************************************
@fn myEncrypt($string,$operation='E',$key='carsvc')
@param operation 'E': encrypt; 'D': decrypt

加密解密字符串

加密:

	$cipher = myEncrypt('hello, world!');
	or
	$cipher = myEncrypt('hello, world!','E','nowamagic');

解密：

	$text = myEncrypt($cipher,'D','nowamagic');

参数说明:
$string   :需要加密解密的字符串
$operation:判断是加密还是解密:E:加密   D:解密
$key      :加密的钥匙(密匙);

http://www.open-open.com/lib/view/open1388916054765.html
*********************************************************************/
function myEncrypt($string,$operation='E',$key='carsvc')
{
	$key=md5($key);
	$key_length=strlen($key);
	$string=$operation=='D'? base64_decode($string): substr(md5($string.$key),0,8).$string;
	$string_length=strlen($string);
	$rndkey=$box=array();
	$result='';
	for($i=0;$i<=255;$i++)
	{
		$rndkey[$i]=ord($key[$i%$key_length]);
		$box[$i]=$i;
	}
	for($j=$i=0;$i<256;$i++)
	{
		$j=($j+$box[$i]+$rndkey[$i])%256;
		$tmp=$box[$i];
		$box[$i]=$box[$j];
		$box[$j]=$tmp;
	}
	for($a=$j=$i=0;$i<$string_length;$i++)
	{
		$a=($a+1)%256;
		$j=($j+$box[$a])%256;
		$tmp=$box[$a];
		$box[$a]=$box[$j];
		$box[$j]=$tmp;
		$result.=chr(ord($string[$i])^($box[($box[$a]+$box[$j])%256]));
	}
	if($operation=='D')
	{
		if(substr($result,0,8)==substr(md5(substr($result,8).$key),0,8))
		{
			return substr($result,8);
		}
		else
		{
			return'';
		}
	}
	else
	{
		return str_replace('=','',base64_encode($result));
// 		return base64_encode($result);
	}
}

/**
@fn errQuit($code, $msg, $msg2 =null)

生成html格式的错误信息并中止执行。
默认地，只显示中文错误，双击可显示详细信息。
例：

	errQuit(E_PARAM, "接口错误", "Unknown ac=`$ac`");

 */
function errQuit($code, $msg, $msg2 =null)
{
	header("Content-Type: text/html; charset=UTF-8");
	echo <<<END
<html><body>
<div style='color:red' ondblclick="x.style.display=''">出错啦: $msg 
	<a href="javascript:history.back();">返回</a>
</div>
<pre style='color:grey;display:none' id="x">ERROR($code): $msg2</pre>
</body></html>
END;
	exit;
}

/**
@fn addLog($str, $logLevel=0)

输出调试信息到前端。调试信息将出现在最终的JSON返回串中。
如果只想输出调试信息到文件，不想让前端看到，应使用logit.

@see logit
 */
function addLog($str, $logLevel=0)
{
	global $DBG_LEVEL;
	if ($DBG_LEVEL >= $logLevel)
	{
		global $g_dbgInfo;
		$g_dbgInfo[] = $str;
	}
}

/**
@fn getAppType()

根据应用标识($APP)获取应用类型(AppType)。注意：应用标识一般由前端应用通过URL参数"_app"传递给后端。
不同的应用标识可以对应相同的应用类型，如应用标识"emp", "emp2", "emp-adm" 都表示应用类型"emp"，即 应用类型=应用标识自动去除尾部的数字或"-xx"部分。

不同的应用标识会使用不同的cookie名，因而即使用户同时操作多个应用，其session不会相互干扰。
同样的应用类型将以相同的方式登录系统。

@see $APP
 */
function getAppType()
{
	global $APP;
	return preg_replace('/(\d+|-\w+)$/', '', $APP);
}

/** 
@fn hasSignFile($f)

检查应用根目录下($BASE_DIR)下是否存在标志文件。标志文件一般命名为"CFG_XXX", 如"CFG_MOCK_MODE"等。
*/
function hasSignFile($f)
{
	global $BASE_DIR;
	return file_exists("{$BASE_DIR}/{$f}");
}

function htmlEscape($s)
{
// 	if ($s[0] == '{' || $s[0] == '[')
// 		return $s;
	return htmlentities($s, ENT_NOQUOTES);
}
//}}}

// ====== classes {{{
/** 
@class MyException($code, $internalMsg?, $outMsg?)

@param $internalMsg String. 内部错误信息，前端不应处理。
@param $outMsg String. 错误信息。如果为空，则会自动根据$code填上相应的错误信息。

抛出错误，中断执行:

	throw new MyException(E_PARAM, "Bad Request - numeric param `$name`=`$ret`.", "需要数值型参数");

*/
# Most time outMsg is optional because it can be filled according to code. It's set when you want to tell user the exact error.
class MyException extends LogicException 
{
	function __construct($code, $internalMsg = null, $outMsg = null) {
		parent::__construct($outMsg, $code);
		$this->internalMsg = $internalMsg;
	}
	public $internalMsg;

	function __toString()
	{
		$str = "MyException({$this->code}): {$this->internalMsg}";
		if ($this->getMessage() != null)
			$str .= $this->getMessage();
		return $str;
	}
}

/**
@class DirectReturn

抛出该异常，可以中断执行直接返回，不显示任何错误。

例：API返回非BPQ协议标准数据，可以跳出setRet而直接返回：

	echo "return data";
	throw new DirectReturn();

例：返回指定数据后立即中断处理：

	setRet(0, ["id"=>1]);
	throw new DirectReturn();

*/
class DirectReturn extends LogicException 
{
}

class MyPDO extends PDO
{
	function __construct($dsn, $user = null, $pwd = null)
	{
		$opts = [];
		// 如果使用连接池, 偶尔会出现连接失效问题, 所以缺省不用
		if (hasSignFile("CFG_CONN_POOL"))
			$opts[PDO::ATTR_PERSISTENT] = true;
		parent::__construct($dsn, $user, $pwd, $opts);
	}
	private function addLog($str)
	{
		addLog($str, 9);
	}
	function query($sql)
	{
		$this->addLog($sql);
		return parent::query($sql);
	}
	function exec($sql)
	{
		$this->addLog($sql);
		return parent::exec($sql);
	}
	function prepare($sql, $opts=[])
	{
		$this->addLog($sql);
		return parent::prepare($sql, $opts);
	}
}

// $dist_m = Coord::distance(121.62684, 31.217098, 121.704454, 31.19313);
// $dist_m = Coord::distancePt("121.62684,31.217098", "121.704454,31.19313");
class Coord
{
	private static $PI = 3.1415926535898;
	private static $R = 6371000.0;

	// 根据经纬度坐标计算实际距离
/*
	// 算法1（简易算法）与百度坐标系测距最接近，算法2-4结果相近（可能使用GPS坐标），其中3，4最接近，2为简易算法。
	// 所以缺省使用算法1.
	echo(ValidPos::distancePt("121.62684,31.217098", "121.704454,31.19313", $e)); // 2号线广兰路到川沙地铁站，百度测距7.8km

1: 7.8480203528875
2: 8.7427070836223
3: 8.7429527074903
4: 8.7429527079343

	echo(ValidPos::distancePt("121.508983,31.243406", "121.704454,31.19313", $e)); // 2号线陆家嘴到川沙地铁站, 百度测距19.5km

1: 19.410555625383
2: 21.930879447104
3: 21.931961798015
4: 21.931961797932
 */

	private static function _distance1($lat1, $lng1, $lat2, $lng2)
	{
		$x = ($lat2 - $lat1) * cos(($lng1 + $lng2) /2);
		$y = $lng2 - $lng1;
		return self::$R * sqrt($x * $x + $y * $y);
	}
	private static function _distance2($lat1, $lng1, $lat2, $lng2)
	{
		$x = ($lng1 - $lng2) * cos($lat1);
		$y = $lat1 - $lat2;
		return self::$R * sqrt($x * $x + $y * $y);
	}

	private static function _distance3($lat1, $lng1, $lat2, $lng2)
	{
		$t1 = cos($lat1) * cos($lng1) * cos($lat2) * cos($lng2);
		$t2 = cos($lat1) * sin($lng1) * cos($lat2) * sin($lng2);
		$t3 = sin($lat1) * sin($lat2);
		return self::$R * acos($t1+$t2+$t3);
	}

	private static function _distance4($lat1, $lng1, $lat2, $lng2)
	{
		$a = $lat1 - $lat2;
		$b = $lng1 - $lng2;
		$d = pow(sin($a/2), 2) + cos($lat1)*cos($lat2)*pow(sin($b/2), 2);
		return 2*self::$R * asin(sqrt($d));
	}

	public static function distance($lat1, $lng1, $lat2, $lng2, $algo=1)
	{
		$TO_RAD = self::$PI/180.0;
		$lat1 *= $TO_RAD;
		$lat2 *= $TO_RAD;
		$lng1 *= $TO_RAD;
		$lng2 *= $TO_RAD;
		$fn = "_distance" . $algo;
		return self::$fn($lat1, $lng1, $lat2, $lng2);
	}
	public static function distancePt($pt1, $pt2, $algo=1)
	{
		$p1 = explode(",", $pt1);
		$p2 = explode(",", $pt2);
		return self::distance(doubleval($p1[0]), doubleval($p1[1]), doubleval($p2[0]), doubleval($p2[1]), $algo);
	}
}

/**
@class AppBase

应用框架，用于提供符合BQP协议的接口。
在onExec中返回协议数据；在onAfter中建议及时关闭DB.
 */
class AppBase
{
	public function exec($handleTrans=true)
	{
		global $DBH;
		global $ERRINFO;
		$ok = false;
		$ret = false;
		try {
			$ret = $this->onExec();
			$ok = true;
		}
		catch (DirectReturn $e) {
			$ok = true;
		}
		catch (MyException $e) {
			list($code, $msg, $msg2) = [$e->getCode(), $e->getMessage(), $e->internalMsg];
			if (isset($e->xdebug_message))
				addLog($e->xdebug_message, 9);
		}
		catch (PDOException $e) {
			list($code, $msg, $msg2) = [E_DB, $ERRINFO[E_DB], $e->getMessage()];
			if (isset($e->xdebug_message))
				addLog($e->xdebug_message, 9);
		}
		catch (Exception $e) {
			list($code, $msg, $msg2) = [E_SERVER, $ERRINFO[E_SERVER], $e->getMessage()];
			if (isset($e->xdebug_message))
				addLog($e->xdebug_message, 9);
		}

		try {
			if ($handleTrans && $DBH && $DBH->inTransaction())
			{
				if ($ok)
					$DBH->commit();
				else
					$DBH->rollback();
			}
			if (!$ok) {
				$this->onErr($code, $msg, $msg2);
			}
		}
		catch (Exception $e) {}

		try {
			$this->onAfter($ok);
		}
		catch (Exception $e) {}

		//$DBH = null;
		return $ret;
	}

	protected function onExec()
	{
		return "OK";
	}

	protected function onErr($code, $msg, $msg2)
	{
		$fn = $GLOBALS["errorFn"] ?: "errQuit";
		$fn($code, $msg, $msg2);
	}

	// 应用程序应及时关闭数据库连接
	protected function onAfter($ok)
	{
		global $DBH;
		$DBH = null;
	}
}

/**
@class JDSingleton (trait)

用于单件类，提供getInstance方法，例：

	class PluginCore
	{
		use JDSingleton;
	}

则可以调用

	$pluginCore = PluginCore::getInstance();

 */
trait JDSingleton
{
	private function __construct () {}
	static function getInstance()
	{
		static $inst;
		if (! isset($inst)) {
			$inst = new static();
		}
		return $inst;
	}
}

/**
@class JDEvent (trait)

提供事件监听(on)与触发(trigger)方法，例：

	class PluginCore
	{
		use JDEvent;

		// 提供事件"event1", 注释如下：
		/// @event PluginCore.event.event1($arg1, $arg2)
	}

则可以调用

	$pluginCore->on('event1', 'onEvent1');
	$pluginCore->trigger('event1', [$arg1, $arg2]);

	function onEvent1($arg1, $arg2)
	{
	}

 */
trait JDEvent
{
	protected $fns = [];

/** 
@fn JDEvent.on($ev, $fn) 
*/
	function on($ev, callable $fn)
	{
		if (array_key_exists($ev, $this->fns))
			$this->fns[$ev][] = $fn;
		else
			$this->fns[$ev] = [$fn];
	}

/**
@fn JDEvent.trigger($ev, $args)

返回最后次调用的返回值，false表示中止之后事件调用 

如果想在事件处理函数中返回复杂值，可使用$args传递，如下面返回一个数组：

	$obj->on('getResult', 'onGetResult');
	$out = new stdclass();
	$out->result = [];
	$obj->trigger('getArray', [$out]);

	function onGetResult($out)
	{
		$out->result[] = 100;
	}

*/
	function trigger($ev, array $args=[])
	{
		if (! array_key_exists($ev, $this->fns))
			return;
		$fns = $this->fns[$ev];
		foreach ($fns as $fn) {
			$rv = call_user_func_array($fn, $args);
			if ($rv === false)
				break;
		}
		return $rv;
	}
}
// }}}

// ====== AppFw_: module internals {{{
// app framework内部实现，外部一般不应调用。
class AppFw_
{
	private static function initGlobal()
	{
		global $TEST_MODE;
		global $JSON_FLAG;
		global $DBG_LEVEL;
		$TEST_MODE = getenv("P_TEST_MODE")===false? 0: intval(getenv("P_TEST_MODE"));
		if ($TEST_MODE) {
			header("X-Daca-Test-Mode: $TEST_MODE");
			$JSON_FLAG |= JSON_PRETTY_PRINT;
			$defaultDebugLevel = getenv("P_DEBUG")===false? 0 : intval(getenv("P_DEBUG"));
			$DBG_LEVEL = param("_debug/i", $defaultDebugLevel, $_GET);

			// 允许跨域
			@$origin = $_SERVER['HTTP_ORIGIN'];
			if (isset($origin)) {
				header('Access-Control-Allow-Origin: ' . $origin);
				header('Access-Control-Allow-Credentials: true');
			}
		}

		global $MOCK_MODE;
		if ($TEST_MODE) {
			$MOCK_MODE = getenv("P_MOCK_MODE")===false? 0: intval(getenv("P_MOCK_MODE"));
		}
		if ($MOCK_MODE) {
			header("X-Daca-Mock-Mode: $MOCK_MODE");
		}

		global $DB, $DBCRED, $USE_MYSQL;
		$DB = getenv("P_DB") ?: $DB;
		$DBCRED = getenv("P_DBCRED") ?: $DBCRED;

		// e.g. P_DB="../carsvc.db"
		if (preg_match('/\.db$/i', $DB)) {
			$USE_MYSQL = 0;
		}
		else {
			$USE_MYSQL = 1;
		}
	}

	private static function setupSession()
	{
		global $APP;

		# normal: "userid"; testmode: "tuserid"
		$name = $APP . "id";
		session_name($name);

		$path = getenv("P_SESSION_DIR") ?: $GLOBALS["BASE_DIR"] . "/session";
		if (!  is_dir($path)) {
			if (! mkdir($path, 0777, true))
			   throw new MyException(E_SERVER, "fail to create session folder");
		}
		session_save_path ($path);

		ini_set("session.cookie_httponly", 1);

		$path = getenv("P_URL_PATH");
		if ($path !== false)
		{
			// e.g. path=/cheguanjia
			ini_set("session.cookie_path", $path);
		}
	}

	static function init()
	{
		self::initGlobal();
		self::setupSession();
	}
}
//}}}

// ====== ext {{{
/**
@module ext 集成外部系统

调用外部系统（如短信集成、微信集成等）将引入依赖，给开发和测试带来复杂性。
筋斗云框架通过使用“模拟模式”(MOCK_MODE)，模拟这些外部功能，从而简化开发和测试。

对于一个简单的外部依赖，可以用函数isMockMode来分支。例如添加对象存储服务(OSS)支持，接口定义为：

	getOssParam() -> {url, expire, dir, param={policy, OSSAccessKeyId, signature} }
	模拟模式返回：
	getOssParam() -> {url="mock"}

在实现时，先在ext.php中定义外部依赖类型，如Ext_Oss，然后实现函数：

	function api_getOssParam()
	{
		if (isMockMode(Ext_Oss)) {
			return ["url"=>"mock"];
		}
		// 实际实现代码 ...
	}

添加一个复杂的（如支持多个函数调用的）支持模拟的外部依赖，也则可以定义接口，步骤如下，以添加短信支持(SmsSupport)为例：

- 定义一个新的类型，如Ext_SmsSupport.
- 定义接口，如 ISmsSupport.
- 在ExtMock类中模拟实现接口ISmsSupport中所有函数, 一般是调用logext()写日志到ext.log, 可以在tool/log.php中查看最近的ext日志。
- 定义一个类SmsSupport实现接口ISmsSupport，一般放在其它文件中实现(如sms.php)。
- 在onCreateExt中处理新类型Ext_SmsSupport, 创建实际接口对象。

使用举例：

	$sms = getExt(Ext_SmsSupport);
	$sms->sendSms(...);

要激活模拟模式，应在conf.user.php中设置：

	putenv("P_TEST_MODE=1");
	putenv("P_MOCK_MODE=1");

@see getExt
*/

/**
@fn isMockMode($extType)

判断是否模拟某外部扩展模块。如果$extType为null，则只要处于MOCK_MODE就返回true.
 */
function isMockMode($extType)
{
	// TODO: check extType
	return $GLOBALS["MOCK_MODE"];
}

class ExtFactory
{
	private $objs = []; // {$extType => $ext}

/**
@fn ExtFactory::instance()

@see getExt
 */
	static public function instance()
	{
		static $inst;
		if (!isset($inst))
			$inst = new ExtFactory();
		return $inst;
	}

/**
@fn ExtFactory::getObj($extType, $allowMock?=true)

获取外部依赖对象。一般用getExt替代更简单。

示例：

	$sms = ExtFactory::instance()->getObj(Ext_SmsSupport);

@see getExt
 */
	public function getObj($extType, $allowMock=true)
	{
		if ($allowMock && isMockMode($extType)) {
			return $this->getObj(Ext_Mock, false);
		}

		@$ext = $this->objs[$extType];
		if (! isset($ext))
		{
			if ($extType == Ext_Mock)
				$ext = new ExtMock();
			else
				$ext = onCreateExt($extType);
			$this->objs[$extType] = $ext;
		}
		return $ext;
	}
}

/**
@fn getExt($extType, $allowMock = true)

用于取外部接口对象，如：

	$sms = getExt(Ext_SmsSupport);

*/
function getExt($extType, $allowMock = true)
{
	return ExtFactory::instance()->getObj($extType, $allowMock);
}

/**
@fn logext($s, $addHeader?=true)

写日志到ext.log中，可在线打开tool/init.php查看。
(logit默认写日志到trace.log中)

@see logit

 */
function logext($s, $addHeader=true)
{
	logit($s, $addHeader, "ext");
}

//}}}

// ====== main {{{

AppFw_::init();

#}}}

// vim: set foldmethod=marker :
