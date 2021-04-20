<?php
/*********************************************************
@module app_fw

筋斗云服务端通用应用框架。

## 通用函数

- 获得指定类型参数
@see param,mparam

- 数据库连接及操作
@see dbconn,execOne,queryOne,queryAll,dbInsert,dbUpdate

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

此外，P_DB还试验性地支持SQLite数据库，直接指定以".db"为扩展名的文件，以及P_DBTYPE即可，不需要P_DBCRED。例如：

	P_DBTYPE=sqlite
	P_DB=../myorder.db

连接SQLite数据库未做严格测试，不建议使用。

## 测试模式与调试等级

@key P_TEST_MODE Integer。环境变量，允许测试模式。0-生产模式；1-测试模式；2-自动化回归测试模式(RTEST_MODE)
@key P_DEBUG Integer。环境变量，设置调试等级，值范围0-9。
@key P_DEBUG_LOG Integer。(v5.4) 环境变量，是否打印接口明细日志到debug.log。0-不打印，1-全部打印，2-只打印出错的调用

测试模式特点：

- 输出的HTTP头中包含：`X-Daca-Test-Mode: 1`
- 输出的JSON格式经过美化更易读，且可以显示更多调试信息。前端可通过在接口中添加`_debug`参数设置调试等级。
  如果想要查看本次调用涉及的SQL语句，可以用`_debug=9`。
- 某些用于测试的接口可以调用，例如execSql。因而十分危险，生产模式下一定不可误设置为测试模式。
- 可以使用模拟模式

注意：v5.4起可设置P_DEBUG_LOG，在测试模式或生产模式都可用，可记录日志到后台debug.log文件中。一般用于在生产环境下，临时开放查看后台日志。

注意：v3.4版本起不允许客户端设置_test参数，且用环境变量P_TEST_MODE替代符号文件CFG_TEST_MODE和设置全局变量TEST_MODE.

在过去测试模式用于：可直接对生产环境进行测试且不影响生产环境，即部署后，在前端指定以测试模式连接，在后端为测试模式连接专用的测试数据库，且使用专用的cookie，实现与生产模式共用代码但互不影响。
现已废弃这种用法，应搭建专用的测试环境用于测试开发。

@see addLog

## 模拟模式

@key P_MOCK_MODE Integer. 模拟模式. 值：0/1，或部分模拟，值为模块列表，如"wx,sms"，外部模块名称定义见ext.php.

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

PHP默认的session过期时间为1440s(24分钟)，每次在使用session时，以1/1000的概率检查过期。
要配置它，可以应用程序的conf.user.php中设置，如：

	ini_set("session.gc_maxlifetime", "2592000"); // 30天过期

测试时，想要到时间立即清除session，可以设置：

	ini_set("session.gc_probability", "1000"); // 1000/1000概率做回收。每次访问都回收，性能差，仅用于测试。

在浏览器中默认cookie的有效时间是'session'即浏览器关闭时生效，因而每次打开浏览器须重新登录。
若想保留指定时长，可以设置：

	session_set_cookie_params(3600*24*7); // 保留7天

注意：前端会记住cookie过期时间，假如后端再次改成保留10天，由于前端已记录的是7天过期，无法立即更新，只能清除cookie后再请求才能生效。

## 应用框架

继承AppBase类，可实现提供符合BQP协议接口的模块。[api_fw](#api_fw)框架就是使用它的一个典型例子。

@see AppBase

**********************************************************/

require_once("common.php");

// ====== defines {{{
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
$BASE_DIR = dirname(dirname(__DIR__));

global $DB, $DBCRED, $DBTYPE;
$DB = "localhost/jdcloud";
$DBCRED = "ZGVtbzpkZW1vMTIz"; // base64({user}:{pwd}), default: demo:demo123

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
$userConf = "{$BASE_DIR}/php/conf.user.php";
file_exists($userConf) && include_once($userConf);

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
# fix $name and return type: "id"-int/encrypt-int, "i"-int, "b"-bool, "n"-numeric, "i+"-int[], "js"-object, "s"-string
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
			$type = "id";
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

	$ordr1 = param_varr("10:1.5,11:2.0", "i:n", "ordr1"); // [ [10, 1.5], [11, 2.0] ] 注意类型已转换
	$ordr1 = varr2objarr($ordr1, ["itemId", "qty"]); // [ ["itemId"=>10, "qty"=>1.5], ["itemId"=>11, "qty"=>2.0] ]

	// 一般通过param调用来取值：
	$ordr1 = param("ordr1/i:n", null, "P"); // 从$_POST中取ordr1参数。
	$ordr1 = varr2objarr($ordr1, ["itemId", "qty"]); 

	// 只有单个列的特殊写法
	$snLog1 = param_varr("10,11,12", "i:", "snLog1"); // [ [10], [11], [12] ]
	$snLog1 = varr2objarr($snLog1, ["snId"]); // [ ["snId"=>10], ["snId"=>11], ["snId"=>12] ]

- 每个词表示一个字段类型
  类型标识：i-Integer; n-Number/Double; b-Boolean(0/1); dt/tm-DateTime
- 后置"?"表示该参数可缺省。

@see param
@see list2varr
@see varr2objarr
 */
function param_varr($str, $type, $name)
{
	$ret = [];
	$elemTypes = [];
	foreach (explode(":", $type) as $t) {
		$tlen = strlen($t);
		if ($tlen === 0)
			continue;
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
			if ($e == null || $e === "null") {
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
				if ($t === "dt")
					$v = strtotime(date("Y-m-d", $v));
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
$col也可以直接指定一个集合，如

	param($name, $defVal, $_REQUEST)

获取名为$name的参数。
$name中可以指定类型，返回值根据类型确定。如果该参数未定义或是空串，直接返回缺省值$defVal。

$name中指定类型的方式如下：
- 名为"id", 或以"Id"或"/i"结尾: int
- 以"/b"结尾: bool. 可接受的字符串值为: "1"/"true"/"on"/"yes"=>true, "0"/"false"/"off"/"no" => false
- 以"/dt": datetime, 仅有日期部分
- 以"/tm"结尾: datetime
- 以"/n"结尾: numeric/double
- 以"/s"结尾（缺省）: string. 缺省为防止XSS攻击会做html编码，如"a&b"处理成"a&amp;b"，设置参数doHtmlEscape可禁用这个功能。
- 复杂类型(数组)：以"/i+"结尾: int array
- 复杂类型：以"/js"结尾: json object
- 复杂类型(二维数组)：List类型（以","分隔行，以":"分隔列），类型定义如"/i:n:b:dt:tm" （列只支持简单类型，不可为复杂类型）

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

要转换成objarr，可以用：

	$varr = param("items/i:n?:s?");
	$objarr = varr2objarr($var, ["id", "qty", "dscr"]);

$objarr值为：

	[
		[ "id"=>100, "qty"=>1.0, dscr=>null],
		[ "id"=>101, "qty"=>null, dscr=>"打蜡"]
	]

(v6) 对cond参数或cond类型是特别处理的，会自动从GET/POST中取值，并且支持字符串、数组、键值对多种形式，参考getQueryCond：

	$cond = mparam("cond");
	$gcond = param("gcond/cond");
*/
function param($name, $defVal = null, $col = null, $doHtmlEscape = true)
{
	$type = parseType_($name); // NOTE: $name will change.

	// cond特别处理
	if ($name == "cond" || $type == "cond")
		return getQueryCond([$_GET[$name], $_POST[$name]]);

	$ret = $defVal;
	if ($col === "G") {
		if (isset($_GET[$name]))
			$ret = $_GET[$name];
	}
	else if ($col === "P") {
		if (isset($_POST[$name]))
			$ret = $_POST[$name];
	}
	// 兼容旧式直接指定col=$_GET这样参数
	else if (is_array($col)) {
		if (isset($col[$name]))
			$ret = $col[$name];
	}
	else {
		if (isset($_GET[$name]))
			$ret = $_GET[$name];
		else if (isset($_POST[$name]))
			$ret = $_POST[$name];
	}

	// e.g. "a=1&b=&c=3", b当成未设置，取缺省值。
	if ($ret === "")
		return $defVal;

	# check type
	if (isset($ret) && is_string($ret)) {
		// avoid XSS attack
		if ($doHtmlEscape)
			$ret = htmlEscape($ret);
		if ($type === "s") {
		}
		elseif ($type === "id") {
			if (! is_numeric($ret)) {
				$ret1 = jdEncryptI($ret, "D", "hex");
				if (! is_numeric($ret1))
					throw new MyException(E_PARAM, "Bad Request - id param `$name`=`$ret`.");
				$ret = $ret1;
			}
			$ret = intval($ret);
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
			if ($type === "dt")
				$ret1 = strtotime(date("Y-m-d", $ret1));
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
@fn mparam($name, $col = null)
@brief mandatory param

@param col 'G'-从URL参数即$_GET获取，'P'-从POST参数即$_POST获取。参见param函数同名参数。

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
			throw new MyException(E_PARAM, "Bad Request - require param $s", "缺少参数`$s`");
		}
		return $arr;
	}

	$rv = param($name, null, $col);
	if (isset($rv))
		return $rv;
	parseType_($name); // remove the type tag.
	throw new MyException(E_PARAM, "Bad Request - param `$name` is missing", "缺少参数`$name`");
}

/**
@fn checkParams($params, $names, $errPrefix?)

检查必填参数。

示例：params中必须有"brand", "vendorName"字段，否则应报错：

	checkParams($params, [
		"brand", "vendorName"
	]);

或如果希望报错时明确一些，可以翻译一下参数，这样来指定：

	checkParams($params, [
		"brand" => "品牌",
		"vendorName" => "供应商",
		"phone" // 也允许不指定名字
	]);

示例：

	foreach ($_POST as $i=>$e) {
		checkParams($e, ["MATNR"=>"物料号", "MAKTX"=>"物料名"], "第".($i+1)."行"); // 设置第3参数，可让报错时前面会加上这个描述
		...
	}
*/
function checkParams($params, $names, $errPrefix="")
{
	foreach ($names as $name=>$showName) {
		if (is_int($name))
			$name = $showName;
		else
			$showName .= "({$name})";
		if (!isset($params[$name]) || $params[$name] === "") {
			throw new MyException(E_PARAM, "require param `$name`", $errPrefix."缺少参数`$showName`");
		}
	}
}

/**
@fn setParam($k, $v)
@fn setParam(@kv)

设置参数，其实是模拟客户端传入的参数。以便供tableCRUD等函数使用。

(v5.1)不建议使用，param函数已更新，现在直接设置$_GET,$_POST即可。

示例：

	setParam("cond", "name LIKE " . Q("%$name%"));
	setParam([
		"fmt" => "list",
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

/**
@fn getBcParam($name, $defVal=null)
@fn setBcParam($name, $value)

TODO: BC是什么？改名？

获取或设置特别的HTTP头部参数。
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

/**
@fn queryAllWithHeader($sql, $wantArray=false)
@alias getRsAsTable($sql)

查询SQL，返回筋斗云table格式：{@h, @d} 
h是标题字段数组，d是数据行。
即queryAll函数的带表格标题版本。

	$tbl = queryAllWithHeader("SELECT id, name FROM User");

返回示例：

	[
		"h"=>["id","name"],
		"d"=>[ [1,"name1"], [2, "name2"]]
	]

如果查询结果为空，则返回：

	[ "h" => [], "d" => [] ];

如果指定了参数$wantArray=true, 则返回二维数组，其中首行为标题行：

	$tbl = queryAllWithHeader("SELECT id, name FROM User", true);

返回：

	[ ["id", "name"], [1, "name1"], [2, "name2"] ]

如果查询结果为空，则返回:

	[ [], [] ]

@see queryAll
 */
function queryAllWithHeader($sql, $wantArray=false)
{
	global $DBH;
	$sth = $DBH->query($sql);

	$h = getRsHeader($sth);
	$d = $sth->fetchAll(PDO::FETCH_NUM);

	if ($wantArray) {
		$ret = array_merge([$h], $d);
	}
	else {
		$ret = ["h"=>$h, "d"=>$d];
	}
	return $ret;
}

function getRsAsTable($sql)
{
	return queryAllWithHeader($sql);
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
	// NOTE: 避免rs[0]中含有数字值的key
	foreach ($rs[0] as $k=>$v) {
		$h[] = (string)$k;
	}
	if (isset($fixedColCnt)) {
		foreach ($rs as $row) {
			$h1 = array_keys($row);
			for ($i=$fixedColCnt; $i<count($h1); ++$i) {
				if (array_search($h1[$i], $h) === false) {
					$h[] = (string)$h1[$i];
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

/**
@fn list2varr(ls, colSep=':', rowSep=',')

- ls: 代表二维表的字符串，有行列分隔符。
- colSep, rowSep: 列分隔符，行分隔符。

将字符串代表的压缩表("v1:v2:v3,...")转成值数组。

e.g.

	$users = "101:andy,102:beddy";
	$varr = list2varr($users);
	// $varr = [["101", "andy"], ["102", "beddy"]];
	$objarr = $varr2objarr($varr, ["id", "name"]); // [ ["id"=>"101", "name"=>"andy"], ["id"=>"102", "name"=>"beddy"] ]
	
	$cmts = "101\thello\n102\tgood";
	$varr = list2varr($cmts, "\t", "\n");
	// $varr=[["101", "hello"], ["102", "good"]]

@see varr2objarr
@see param_varr
 */
function list2varr($ls, $colSep=':', $rowSep=',')
{
	$ret = [];
	foreach(explode($rowSep, $ls) as $e) {
		$e = trim($e);
		if (!$e)
			continue;
		$ret[] = explode($colSep, $e);
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


	global $DB, $DBCRED, $DBTYPE;

	// 未指定驱动类型，则按 mysql或sqlite 连接
// 	if (! preg_match('/^\w{3,10}:/', $DB)) {
		// e.g. P_DB="../carsvc.db"
		if ($DBTYPE == "sqlite") {
			$C = ["sqlite:" . $DB, '', ''];
		}
		else if ($DBTYPE == "mysql") {
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
// 	}
// 	else {
// 		list($dbuser, $dbpwd) = getCred($DBCRED); 
// 		$C = [$DB, $dbuser, $dbpwd];
// 	}

	if ($fnConfirm == null)
		@$fnConfirm = $GLOBALS["dbConfirmFn"];
	if ($fnConfirm && $fnConfirm($C[0]) === false) {
		exit;
	}
	try {
		@$DBH = new JDPDO ($C[0], $C[1], $C[2]);
	}
	catch (PDOException $e) {
		$msg = $GLOBALS["TEST_MODE"] ? $e->getMessage() : "dbconn fails";
		logit("dbconn fails: " . $e->getMessage());
		throw new MyException(E_DB, $msg, "数据库连接失败");
	}
	
	if ($DBTYPE == "mysql") {
		++ $DBH->skipLogCnt;
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
	$s = str_replace("\\", "\\\\", $s);
	return "'" . str_replace("'", "\\'", $s) . "'";
	//return $dbh->quote($s);
}

function sql_concat()
{
	global $DBTYPE;
	if ($DBTYPE == "mysql")
		return "CONCAT(" . join(", ", func_get_args()) . ")";

	# sqlite3
	return join(" || ", func_get_args());
}

/**
@fn getQueryCond(cond)

根据cond生成查询条件字符串。其中cond可以是

- null，忽略

- 条件字符串，参考SQL语句WHERE条件语法（不支持函数、子查询等），示例：

		"100"或100 生成 "id=100"
		"id=1"
		"id>=1 and id<100"
		"status='CR'"  注意字符串要加引号
		"status IN ('CR','PA')"
		"tm>='2020-1-1' AND tm<'2020-2-1'"
		"name like 'wang%' OR dscr like 'want%'"
		"name IS NULL OR dscr IS NOT NULL"

- 键值对，键为字段名，值为查询条件，使用更加直观（如字符串不用加引号），如：

		["id"=>1, "status"=>"CR", "name"=>"null", "dscr"=>null, "f1"=>"", "f2"=>"empty"]
		生成 "id=1 AND status='CR'" AND name IS NULL AND f2=''
		注意，当值为null或空串时会忽略掉该条件，用"null"表示"IS NULL"条件，用"empty"表示空串。

		可以使用符号： > < >= <= !(not) ~(like匹配)
		["id"=>"<100", "tm"=>">2020-1-1", "status"=>"!CR", "name"=>"~wang%", "dscr"=>"~aaa", "dscr2"=>"!~aaa"]
		生成 "id<100 AND tm>'2020-1-1" AND status<>'CR' AND name LIKE 'wang%' AND dscr LIKE '%aaa%' AND dscr2 NOT LIKE '%aaa%'"
		like用于字符串匹配，字符串中用"%"或"*"表示通配符，如果不存在通配符，则表示包含该串(即生成'%xxx%')

		["b"=>"!null", "d"=>"!empty"]
		生成 "b IS NOT NULL" AND d<>''"

	可用AND或OR连接多个条件，但不可加括号嵌套：

		["tm"=>">=2020-1-1 AND <2020-2-1", "tm2"=>"<2020-1-1 OR >=2020-2-1"]
		生成 "(tm>='2020-1-1' AND tm<'2020-2-1') AND (tm2<'2020-1-1' OR tm2>='2020-2-1')"

		["id"=>">=1 AND <100", "status"=>"CR OR PA", "status2"=>"!CR AND !PA OR null"]
		生成 "(id>=1 AND id<100) AND (status='CR' OR status='PA') AND (status2<>'CR" AND status2<>'PA' OR status2 IS NULL)"

		["a"=>"null OR empty", "b"=>"!null AND !empty", "_or"=>1]
		生成 "(a IS NULL OR a='') OR (b IS NOT NULL AND b<>'')", 默认为AND条件, `_or`选项用于指定OR条件


- 数组，每个元素是上述条件字符串或键值对，如：

		["id>=1", "id<100", "name LIKE 'wang%'"] // "id>=1 AND id<100" AND name LIKE 'wang%'"
		等价于 ["id"=>">=1 AND <100", "name"=>"~wang%"] 或混合使用 [ ["id"=>">=1 AND <100"], "name LIKE 'wang%'"]
		["id=1", "id=2", "_or"=>true]  // 下划线开头是特别选项，"_or"表示用或条件，生成"id=1 OR id=2"

支持前端传入的get/post参数中同时有cond参数，且cond参数允许为数组，比如传

	URL中：cond[]=a=1&cond[]=b=2
	POST中：cond=c=3

后端处理

	getQueryCond([$_GET["cond"], $_POST["cond"]]);

最终得到cond参数为"a=1 AND b=2 AND c=3"。

前端callSvr示例: url参数或post参数均可支持数组或键值对：

	callSvr("Hub.query", {res:"id", cond: {id: ">=1 AND <100"}})
	callSvr("Hub.query", {res:"id", cond: ["id>=1", "id<100"]}, $.noop, {cond: {name:"~wang%", dscr:"~111"}})

*/
function getQueryCond($cond)
{
	if ($cond === null || $cond === "ALL")
		return null;
	if (is_numeric($cond))
		return "id=$cond";
	if (!is_array($cond))
		return $cond;
	
	$condArr = [];
	$isOR = false;
	if (@$cond["_or"]) {
		$isOR = true;
	}
	foreach($cond as $k=>$v) {
		if ($v === null)
			continue;
		if (is_int($k)) {
			$exp = getQueryCond($v);
		}
		else if ($k[0] == "_" || $v === null || $v === "") {
			continue;
		}
		else {
			// key => value, e.g. { id: ">100 AND <20", name: "~wang*", status: "CR OR PA", status2: "!CR AND !PA OR null"}
			$exp = preg_replace_callback('/(.+?)(\s+(AND|OR)\s+|$)/i', function ($ms) use ($k) {
				return getQueryExp($k, $ms[1]) . $ms[2];
			}, $v);
		}
		if (!$exp)
			continue;
		$condArr[] = $exp;
	}
	if (count($condArr) == 0)
		return null;
	// 超过1个条件时，对复合条件自动加括号
	if (count($condArr) > 1) {
		foreach ($condArr as &$exp) {
			if (stripos($exp, ' and ') !== false || stripos($exp, ' or ') !== false) {
				$exp = "($exp)";
			}
		}
	}
	return join($isOR?' OR ':' AND ', $condArr);
}

// similar to h5 getexp but not same
function getQueryExp($k, $v)
{
	if (is_numeric($v))
		return "$k=$v";
	if ($v === "null")
		return "$k IS NULL";
	if ($v === "!null")
		return "$k IS NOT NULL";

	$op = '=';
	$v = preg_replace_callback('/^[><=!~]+/', function ($ms) use (&$op) {
		if ($ms[0] == '!' || $ms[0] == '!=')
			$op = '<>';
		else if ($ms[0] == '~')
			$op = ' LIKE ';
		else if ($ms[0] == '!~')
			$op = ' NOT LIKE ';
		else
			$op = $ms[0];
		return "";
	}, $v);
	if ($v === "empty")
		$v = "";
	if (stripos($op, ' LIKE ') !== false) {
		$v = str_replace("*", "%", $v);
		if (strpos($v, '%') === false)
			$v = '%'.$v.'%';
	}
	return $k . $op . (is_numeric($v)? $v: Q($v));
}

/**
@fn genQuery($sql, $cond)

连接SELECT主语句(不带WHERE条件)和查询条件。
示例：

	genQuery("SELECT id FROM Vendor", [name=>$name, "phone"=>$phone]);
	genQuery("SELECT id FROM Vendor", [name=>$name, "phone IS NOT NULL"]);
	genQuery("SELECT id FROM Vendor", [name=>$name, "phone"=>$phone, "_or"=>true]); // "name='eric' OR phone='13700000001'"

@see getQueryCond
*/
function genQuery($sql, $cond)
{
	$condStr = getQueryCond($cond);
	if (!$condStr)
		return $sql;
	return $sql . ' WHERE ' . $condStr;
}

/**
@fn execOne($sql, $getInsertId?=false)

@param $getInsertId?=false 取INSERT语句执行后得到的id. 仅用于INSERT语句。

执行SQL语句，如INSERT, UPDATE等。执行SELECT语句请使用queryOne/queryAll.

	$token = mparam("token");
	execOne("UPDATE Cinf SET appleDeviceToken=" . Q($token));

注意：在拼接SQL语句时，对于传入的string类型参数，应使用Q函数进行转义，避免SQL注入攻击。

对于INSERT语句，设置参数$getInsertId=true, 可取新加入数据行的id. 例：

	$sql = sprintf("INSERT INTO Hongbao (userId, createTm, src, expireTm, vdays) VALUES ({$uid}, '%s', '{$src}', '%s', {$vdays})", date('c', $createTm), date('c', $expireTm));
	$hongbaoId = execOne($sql, true);

(v5.1) 简单的单表添加和更新记录建议优先使用dbInsert和dbUpdate函数，更易使用。
上面两个例子，用dbInsert/dbUpdate函数，无须使用Q函数防注入，也无须考虑字段值是否要加引号：

	// 更新操作示例
	$cnt = dbUpdate("Cinf", ["appleDeviceToken" => $token], "ALL");

	// 插入操作示例
	$hongbaoId = dbInsert("Hongbao", [
		"userId"=>$uid,
		"createTm"=>date(FMT_DT, $createTm),
		"src" => $src, ...
	]);

@see dbInsert,dbUpdate,queryOne
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

(v5.3)
可将WHERE条件单独指定：$cond参数形式该函数getQueryCond

	$id = queryOne("SELECT id FROM Vendor", false, ["phone"=>$phone]);

@see queryAll
@see getQueryCond
 */
function queryOne($sql, $assoc = false, $cond = null)
{
	global $DBH;
	if (! isset($DBH))
		dbconn();
	if ($cond)
		$sql = genQuery($sql, $cond);
	if (stripos($sql, "limit ") === false && stripos($sql, "for update") === false)
		$sql .= " LIMIT 1";
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

queryAll支持执行返回多结果集的存储过程，这时返回的不是单一结果集，而是结果集的数组：

	$allRows = queryAll("call syncAll()");

(v5.3)
可将WHERE条件单独指定：$cond参数形式该函数getQueryCond

	$rows = queryAll("SELECT id FROM Vendor", false, ["phone"=>$phone]);

@see objarr2table
@see getQueryCond
 */
function queryAll($sql, $assoc = false, $cond = null)
{
	global $DBH;
	if (! isset($DBH))
		dbconn();
	if ($cond)
		$sql = genQuery($sql, $cond);
	$sth = $DBH->query($sql);
	if ($sth === false)
		return false;
	$fetchMode = $assoc? PDO::FETCH_ASSOC: PDO::FETCH_NUM;
	$allRows = [];
	do {
		$rows = $sth->fetchAll($fetchMode);
		$allRows[] = $rows;
	}
	while ($sth->nextRowSet());
	// $sth->closeCursor();
	return count($allRows)>1? $allRows: $allRows[0];
}

/**
@fn dbInsert(table, kv) -> newId

e.g. 

	$orderId = dbInsert("Ordr", [
		"tm" => date(FMT_DT),
		"tm1" => dbExpr("now()"), // 使用dbExpr直接提供SQL表达式
		"amount" => 100,
		"dscr" => null // null字段会被忽略
	]);

如需高性能大批量插入数据，可以用BatchInsert

@see BatchInsert
*/
function dbInsert($table, $kv)
{
	$keys = '';
	$values = '';
	foreach ($kv as $k=>$v) {
		if (is_null($v))
			continue;
		// ignore non-field param
		if (substr($k,0,2) === "p_")
			continue;
		if ($v === "")
			continue;
		# TODO: check meta
		if (! preg_match('/^\w+$/u', $k))
			throw new MyException(E_PARAM, "bad key $k");

		if ($keys !== '') {
			$keys .= ", ";
			$values .= ", ";
		}
		$keys .= $k;
		if ($v instanceof DbExpr) { // 直接传SQL表达式
			$values .= $v->val;
		}
		else if (is_array($v)) {
			throw new MyException(E_PARAM, "dbInsert: array `$k` is not allowed. pls define subobj to use array.", "未定义的子表`$k`");
		}
		else {
			$values .= Q(htmlEscape($v));
		}
	}
	if (strlen($keys) == 0) 
		throw new MyException(E_PARAM, "no field found to be added: $table");
	$sql = sprintf("INSERT INTO %s (%s) VALUES (%s)", $table, $keys, $values);
#			var_dump($sql);
	return execOne($sql, true);
}

/**
@class BatchInsert

大批量为某表添加记录，一次性提交。

	$bi = new BatchInsert($table, $headers, $opt=null);

- headers: 列名数组(如["name","dscr"])，或逗号分隔的字符串(如"name,dscr")
- opt.batchSize/i?=0: 指定批大小。0表示不限大小。
- opt.useReplace/b?=false: 默认用"INSERT INTO"语句，设置为true则用"REPLACE INFO"语句。一般用于根据某unique index列添加或更新行。
- opt.debug/b?=false: 如果设置为true, 只输出SQL语句，不插入数据库。

	$bi->add($row);

- row: 可以是值数组或关联数组。如果是值数组，必须与headers一一对应，比如["name1", "dscr1"]；
 如果是关联数组，按headers中字段自动取出值数组，这样关联数组中即使多一些字段也无影响，比如["name"=>"name1", "dscr"=>"dscr1", "notUsedCol"=100]。

示例：

	$bi = new BatchInsert("Syslog", "module,tm,content");
	for ($i=0; $i<10000; ++$i)
		$bi->add([$m, $tm, $content]);
	$n = $bi->exec();

如果担心一次请求数量过多，也可以指定批大小，如1000行提交一次：

	$opt = [
		"batchSize" =>1000
	]
	$bi = new BatchInsert("Syslog", "module,tm,content", $opt);

- opt: {batchSize/i, useReplace/b}
*/
class BatchInsert
{
	private $sql0;
	private $batchSize;
	private $headers;
	private $debug;

	private $sql;
	private $n = 0;
	private $retn = 0;
	function __construct($table, $headers, $opt=null) {
		$verb = @$opt["useReplace"]? "REPLACE": "INSERT";
		if (is_string($headers)) {
			$headerStr = $headers;
			$headers = preg_split('/\s*,/\s*/', $headerStr);
		}
		else {
			$headerStr = join(',', $headers);
		}
		$this->headers = $headers;
		$this->sql0 = "$verb INTO $table ($headerStr) VALUES ";
		$this->batchSize = @$opt["batchSize"]?:0;
		$this->debug = @$opt["debug"]?:false;
	}
	function add($row) {
		$values = '';
		// 如果是关联数组，转成值数组
		if (! isset($row[0])) {
			$row0 = [];
			foreach ($this->headers as $hdr) {
				$row0[] = $row[$hdr];
			}
			$row = $row0;
		}
		foreach ($row as $v) {
			if ($v === '')
				$v = "NULL";
			else
				$v =  Q($v);
			if ($values !== '')
				$values .= ",";
			$values .= $v;
		}
		if ($this->sql === null)
			$this->sql = $this->sql0 . "($values)";
		else
			$this->sql .= ",($values)";

		++$this->n;
		if ($this->batchSize > 0 && $this->n >= $this->batchSize)
			$this->exec();
	}
	function exec() {
		if ($this->n > 0) {
			if (! $this->debug) {
				$this->retn += execOne($this->sql);
			}
			else {
				echo($this->sql);
				$this->retn += $this->n;
			}
			$this->sql = null;
			$this->n = 0;
		}
		return $this->retn;
	}
}

// 由虚拟字段 flag_x=0/1 来设置flags字段；或prop_x=0/1来设置props字段。
function flag_getExpForSet($k, $v)
{
	$v1 = substr($k, 5); // flag_xxx -> xxx
	$k1 = substr($k, 0, 4) . "s"; // flag_xxx -> flags
	if ($v == 1) {
		if (strlen($v1) > 1) {
			$v1 = " " . $v1;
		}
		$v = "concat(ifnull($k1, ''), " . Q($v1) . ")";
	}
	else if ($v == 0) {
		$v = "trim(replace($k1, " . Q($v1) . ", ''))";
	}
	else {
		throw new MyException(E_PARAM, "bad value for flag/prop `$k`=`$v`");
	}
	return "$k1=" . $v;
}

class DbExpr
{
	public $val;
	function __construct($val) {
		$this->val = $val;
	}
}

/**
@fn dbExpr($val)

用于在dbInsert/dbUpdate(插入或更新数据库)时，使用表达式：

	$id = dbInsert("Ordr", [
		"tm" => dbExpr("now()") // 使用dbExpr直接提供SQL表达式
	]);

另外，写数据库时，为防止XSS跨域攻击，dbInsert/dbUpdate对值会自动做htmlentity转义，如">7"转成"&gt;7"。
为防止转义，使用原始字串值，可以用：

	$id = dbUpdate("Ordr", [
		"cond" => dbExpr(Q("f>3 && r<60")); // 注意用Q函数对字符串加引号
	]);

示例：对象set/add接口中，防止某字段被转义：

	protected function onValidate()
	{
		if (issetval("cond")) {
			$_POST["cond"] = dbExpr(Q($_POST["cond"]));
		}
	}

@see dbInsert
@see dbUpdate
*/
function dbExpr($val)
{
	return new DbExpr($val);
}

/**
@fn dbUpdate(table, kv, id_or_cond?) -> cnt

@param id_or_cond 查询条件，如果是数值比如100或"100"，则当作条件"id=100"处理；否则直接作为查询表达式，比如"qty<0"；
为了安全，cond必须指定值，不可为空（避免因第三参数为空导致误更新全表!）。如果要对全表更新，可传递特殊值"ALL"，或用"1=1"之类条件。

e.g.

	// UPDATE Ordr SET ... WHERE id=100
	$cnt = dbUpdate("Ordr", [
		"amount" => 30,
		"dscr" => "test dscr",
		"tm" => "null", // 用""或"null"对字段置空；用"empty"对字段置空串。
		"tm1" => null // null会被忽略
	], 100);

	// UPDATE Ordr SET tm=now() WHERE tm IS NULL
	$cnt = dbUpdate("Ordr", [
		"tm" => dbExpr("now()")  // 使用dbExpr，表示是SQL表达式
	], "tm IS NULL);

	// 全表更新，没有条件。UPDATE Cinf SET appleDeviceToken={token}
	$cnt = dbUpdate("Cinf", ["appleDeviceToken" => $token], "ALL");

cond条件可以用key-value指定(cond写法参考getQueryCond)，如：

	dbUpdate("Task", ["vendorId" => $id], ["vendorId" => $id1]);
	基本等价于 (当id1为null时稍有不同, 上面生成"IS NULL"，而下面的SQL为"=null"非标准)
	dbUpdate("Task", ["vendorId" => $id], "vendorId=$id1"]);

*/
function dbUpdate($table, $kv, $cond)
{
	if ($cond === null)
		throw new MyException(E_SERVER, "bad cond for update $table");

	$condStr = getQueryCond($cond);
	$kvstr = "";
	foreach ($kv as $k=>$v) {
		if ($k === 'id' || is_null($v))
			continue;
		// ignore non-field param
		if (substr($k,0,2) === "p_")
			continue;
		# TODO: check meta
		if (! preg_match('/^(\w+\.)?\w+$/u', $k))
			throw new MyException(E_PARAM, "bad key $k");

		if ($kvstr !== '')
			$kvstr .= ", ";

		// 空串或null置空；empty设置空字符串
		if ($v === "" || $v === "null")
			$kvstr .= "$k=null";
		else if ($v === "empty")
			$kvstr .= "$k=''";
		else if ($v instanceof DbExpr) { // 直接传SQL表达式
			$kvstr .= $k . '=' . $v->val;
		}
		else if (startsWith($k, "flag_") || startsWith($k, "prop_"))
		{
			$kvstr .= flag_getExpForSet($k, $v);
		}
		else
			$kvstr .= "$k=" . Q(htmlEscape($v));
	}
	$cnt = 0;
	if (strlen($kvstr) == 0) {
		addLog("no field found to be set: $table");
	}
	else {
		if (isset($condStr))
			$sql = sprintf("UPDATE %s SET %s WHERE %s", $table, $kvstr, $condStr);
		else
			$sql = sprintf("UPDATE %s SET %s", $table, $kvstr);
		$cnt = execOne($sql);
	}
	return $cnt;
}
//}}}

/**
@class SimpleCache

缓存在数组中。适合在循环中缓存key-value数据。

	$cache = new SimpleCache(); // id=>name
	for ($idList as $id) {
		$name = $cache->get($id, function () use ($id) {
			return queryOne("SELECT name FROM Vendor WHERE id=$id");
		});
	}

更简单地，也可以直接使用全局的cache (这时注意确保key在全局唯一）：

	for ($idList as $id) {
		$name = SimpleCache::getInstance()->get("VendorIdToName-{$id}", function () use ($id) {
			return queryOne("SELECT name FROM Vendor WHERE id=$id");
		})
	}

示例2：

	$key = join('-', [$name, $phone]);
	$id = $cache->get($key);
	if ($id === false) {
		$val = getVal();
		$cache->set($key, $val);
	}

*/
class SimpleCache
{
	use JDSingleton;
	protected $cacheData = [];

	// return false if key does not exist
	function get($key, $fnGet = null) {
		if (! array_key_exists($key, $this->cacheData)) {
			if (!isset($fnGet))
				return false;

			$val = $fnGet();
			$this->set($key, $val);
			return $val;
		}
		return $this->cacheData[$key];
	}

	function set($key, $val) {
		$this->cacheData[$key] = $val;
	}
}

function isHttps()
{
	if (!isset($_SERVER['HTTPS']))
		return false;  
	if ($_SERVER['HTTPS'] === 1 //Apache  
		|| $_SERVER['HTTPS'] === 'on' //IIS  
		|| $_SERVER['SERVER_PORT'] == 443) { //其他  
		return true;  
	}
	return false;  
}

/**
@fn getBaseUrl($wantHost = true)

返回 $BASE_DIR 对应的网络路径（最后以"/"结尾），一般指api.php所在路径。
如果指定了环境变量 P_BASE_URL(可在conf.user.php中设置), 则使用该变量。
否则自动判断（如果有代理转发则可能不准）

例：

	getBaseUrl() -> "http://myserver.com/myapp/"
	getBaseUrl(false) -> "/myapp/"

注意：如果使用了反向代理等机制，该函数往往无法返回正确的值，
例如 http://myserver.com/8081/myapp/api.php 被代理到 http://localhost:8081/myapp/api.php
getBaseUrl()默认返回 "http://localhost:8081/myapp/" 是错误的，可以设置P_BASE_URL解决：

	putenv("P_BASE_URL=http://myserver.com/8081/myapp/");

@see $BASE_DIR
 */
function getBaseUrl($wantHost = true)
{
	$baseUrl = getenv("P_BASE_URL");
	if ($baseUrl) {
		if (!$wantHost) {
			$baseUrl = preg_replace('/^https?:\/\/[^\/]+/i', '', $baseUrl);
		}
		if (strlen($baseUrl) == 0 || substr($baseUrl, -1, 1) != "/")
			$baseUrl .= "/";
	}
	else {
		// 自动判断
		$baseUrl = dirname($_SERVER["SCRIPT_NAME"]);
		// 如果是baseUrl下面一级目录则自动去除, 调用getBaseUrl应在baseUrl或baseUrl的下一级目录下, 否则判断出错, 应通过设置环境变量解决.
		$b = basename($baseUrl);
		if (is_dir(__DIR__ . '/../../' . $b)) {
			$baseUrl = dirname($baseUrl) . "/";
		}
		else {
			$baseUrl .= "/";
		}
		// $baseUrl = dirname($_SERVER["SCRIPT_NAME"]) . "/";

		if ($wantHost)
		{
			$host = (isHttps() ? "https://" : "http://") . (@$_SERVER["HTTP_HOST"]?:"localhost"); // $_SERVER["HTTP_X_FORWARDED_HOST"]
			$baseUrl = $host . $baseUrl;
		}
	}
	return $baseUrl;
}

// ==== 加密算法 {{{
/**
@var ENC_KEY = 'jdcloud'

默认加密key。可在api.php等处修改覆盖。
*/
global $ENC_KEY;
$ENC_KEY="jdcloud"; // 缺省加密密码

/**
@fn rc4($data, $pwd)

返回密文串（未编码的二进制，可用base64或hex编码）。
RC4加密算法。基于异或的算法。
https://www.cnblogs.com/haoxuanchen2014/p/7783782.html

更完善的短字符串编码，可以使用

@see jdEncrypt 基于rc4的文本加密
@see jdEncryptI 基于rc4的32位整数加密
*/
function rc4($data, $pwd)
{
    $cipher      = '';
    $key[]       = "";
    $box[]       = "";
    $pwd_length  = strlen($pwd);
    $data_length = strlen($data);
    for ($i = 0; $i < 256; $i++) {
        $key[$i] = ord($pwd[$i % $pwd_length]);
        $box[$i] = $i;
    }
    for ($j = $i = 0; $i < 256; $i++) {
        $j       = ($j + $box[$i] + $key[$i]) % 256;
        $tmp     = $box[$i];
        $box[$i] = $box[$j];
        $box[$j] = $tmp;
    }
    for ($a = $j = $i = 0; $i < $data_length; $i++) {
        $a       = ($a + 1) % 256;
        $j       = ($j + $box[$a]) % 256;
        $tmp     = $box[$a];
        $box[$a] = $box[$j];
        $box[$j] = $tmp;
        $k       = $box[(($box[$a] + $box[$j]) % 256)];
        $cipher .= chr(ord($data[$i]) ^ $k);
    }
    return $cipher;
}

/**
@fn jdEncrypt($string, $enc=E|D, $fmt=b64|hex, $key=$ENC_KEY, $vcnt=4)

基于rc4算法的文本加密，缺省密码为全局变量 $ENC_KEY。
enc=E表示加密，enc=D表示解密。

	$cipher = jdEncrypt("hello");
	$text = jdEncrypt($cipher, "D");
	if ($text === false)
		throw "bad cipher";

缺省返回base64编码的密文串，可设置参数$fmt="hex"输出16进制编码的密文串。
算法包含了校验机制，解密时如果校验失败则返回false.

@param vcnt 校验字节数，默认为4. validation bytes cnt

@see rc4 基础rc4算法
@see jdEncryptI 基于rc4的32位整数加密
*/
function jdEncrypt($string, $enc='E', $fmt='b64', $key=null, $vcnt=4)
{
	if ($key == null) {
		global $ENC_KEY;
		$key = md5($ENC_KEY);
	}
	else {
		$key = md5($key);
	}
	if ($enc == 'E') {
		$data = substr(md5($string.$key),0,$vcnt) . $string;
		$result = rc4($data, $key);
		if ($fmt == "hex")
			return bin2hex($result);
		return preg_replace('/=+$/', '', base64_encode($result));
	}
	else if ($enc == 'D') {
		@$data = $fmt=='hex'? hex2bin($string): base64_decode($string);
		if ($data === false)
			return false;
		$result = rc4($data, $key);
		$result1 = substr($result,$vcnt);
		if (substr($result,0,$vcnt) != substr(md5($result1.$key),0,$vcnt))
			return false;
		return $result1;
	}
}

/**
@fn myEncrypt($string, $enc=E|D)

基于rc4的字符串加密算法。
新代码不建议使用，仅用作兼容旧版本同名函数。缺省key='carsvc', vcnt=8(校验字节数)

@see jdEncrypt
*/
function myEncrypt($string, $enc='E')
{
	return jdEncrypt($string, $enc, 'b64', 'carsvc', 8);
}

/**
@fn jdEncryptI($data, $enc=E|D, $fmt=hex|b64, $key=$ENC_KEY)

基于rc4算法的32位整数加解密，缺省密码为全局变量$ENC_KEY.

	$cipher = jdEncryptI(12345678, "E"); // dfa27c4c208489ca (4字节校验+4字节整数=8字节，用16进制文本表示为16个字节)
	$n = jdEncryptI($cipher, "D");
	if ($n === false)
		throw "bad cipher";

可用于将整型id伪装成8字节的uuid.

@see rc4 基础rc4算法
@see jdEncrypt 基于rc4的文本加密
*/
function jdEncryptI($data, $enc='E', $fmt='hex', $key=null)
{
	if ($enc=='E')
		return jdEncrypt(pack("N", $data), $enc, $fmt, $key);

	$n = jdEncrypt($data, $enc, $fmt, $key);
	if ($n !== false) {
		$n = unpack("N", $n)[1];
	}
	return $n;
}
//}}}

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

/**
@fn htmlEscape($s)

用于防止XSS攻击。只转义字符"<", ">"，示例：
当用户保存`<script>alert(1)</script>`时，实际保存的是`&lt;script&gt;alert(1)&lt;/script&gt;`
这样，当前端以`$div.html($val)`来显示时，不会产生跨域攻击泄漏Cookie。

如果前端就是需要带"<>"的字符串（如显示在input中），则应自行转义。

后端转义可以用html_entity_decode:

	$s = "a&gt;1 and a&lt;100";
	$s1 = html_entity_decode($s);

 */
function htmlEscape($s)
{
	return preg_replace_callback('/[<>]/', function ($ms) {
		static $map = [
			"<" => "&lt;",
			">" => "&gt;"
		];
		return $map[$ms[0]];
	}, $s);
// 	if ($s[0] == '{' || $s[0] == '[')
// 		return $s;
//	return htmlentities($s, ENT_NOQUOTES);
}

// 取部分内容判断编码, 如果是gbk则自动透明转码为utf-8
// 如果指定fnTest, 则对前1000字节做自定义测试: $fnTest($text)
function utf8InputFilter($fp, $fnTest=null)
{
	$str = fread($fp, 1000);
	rewind($fp);
	$enc = strtolower(mb_detect_encoding($str, ["gbk","utf-8"]));
	if ($enc && $enc != "utf-8") {
		stream_filter_append($fp, "convert.iconv.$enc.utf-8");
	}
	if ($fnTest)
		$fnTest($str);
}
//}}}

// ====== classes {{{
/**
@class JDPDO
@var $DBH

数据库类PDO增强。全局变量$DBH为默认数据库连接，dbconn,queryAll,execOne等数据库函数都使用它。

- 在调试等级P_DEBUG=9时，将SQL日志输出到前端，即`addLog(sqlStr, DEBUG=9)`。
- 如果有符号文件CFG_CONN_POOL，则使用连接池（缺省不用）

如果想忽略输出一条SQL日志，可以在调用SQL查询前设置skipLogCnt，如：

	global $DBH;
	++ $DBH->skipLogCnt;  // 若要忽略两条就用 $DBH->skipLogCnt+=2
	$DBH->exec('set names utf8'); // 也可以是queryOne/execOne等函数。

@see queryAll,execOne,dbconn
 */
class JDPDO extends PDO
{
	public $skipLogCnt = 0;
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
		if ($this->skipLogCnt > 0) {
			-- $this->skipLogCnt;
			return;
		}
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
包含通用错误处理等。

示例：接口`url.php(p)`预处理一些参数，然后调用api.php。
在预处理中，如果有MyException报错，可以优雅处理。

	require_once('app.php');
	class UrlApp extends AppBase
	{
		protected function onExec()
		{
			$p = mparam("p");
			$param = json_decode(jdEncrypt($p, "D"), true);
			if (!$param) {
				throw new MyException(E_PARAM);
			}
			$_GET = $param["get"];
			$_POST = $param["post"];
			if ($param["ses"]) {
				session_id($param["ses"]);
			}
		}
	}
	$app = new UrlApp();
	$ret = $app->exec();
	require_once('api.php');

 */
class AppBase
{
	public $onBeforeActions = [];
	public $onAfterActions = [];
	public function exec($handleTrans=true)
	{
		global $DBH;
		global $ERRINFO;
		$ok = false;
		$ret = false;
		try {
			foreach ($this->onBeforeActions as $fn) {
				$fn();
			}
			$ret = $this->onExec();
			$ok = true;
		}
		catch (DirectReturn $e) {
			$ok = true;
		}
		catch (MyException $e) {
			list($code, $msg, $msg2) = [$e->getCode(), $e->getMessage(), $e->internalMsg];
			addLog((string)$e, 9);
		}
		catch (PDOException $e) {
			// SQLSTATE[23000]: Integrity constraint violation: 1451 Cannot delete or update a parent row: a foreign key constraint fails (`jdcloud`.`Obj1`, CONSTRAINT `Obj1_ibfk_1` FOREIGN KEY (`objId`) REFERENCES `Obj` (`id`))",
			list($code, $msg, $msg2) = [E_DB, $ERRINFO[E_DB], $e->getMessage()];
			if (preg_match('/a foreign key constraint fails [()]`\w+`.`(\w+)`/', $msg2, $ms)) {
				$tbl = function_exists("T")? T($ms[1]) : $ms[1]; // T: translate function
				$msg = "`$tbl`表中有数据引用了本记录";
			}
			addLog((string)$e, 9);
		}
		catch (Exception $e) {
			list($code, $msg, $msg2) = [E_SERVER, $ERRINFO[E_SERVER], $e->getMessage()];
			addLog((string)$e, 9);
		}

		try {
			if ($ok) {
				foreach ($this->onAfterActions as $fn) {
					$fn();
				}
			}
		}
		catch (Exception $e) {
			logit((string)$e);
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
		catch (Exception $e) {
			logit((string)$e);
		}

		try {
			$this->onAfter($ok);
		}
		catch (Exception $e) {
			logit((string)$e);
		}

		//$DBH = null;
		return $ret;
	}

	protected function onExec()
	{
		return "OK";
	}

	protected function onErr($code, $msg, $msg2)
	{
		@$fn = $GLOBALS["errorFn"] ?: "errQuit";
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
//	private function __construct () {}
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
@class JDSingletonImp (trait)

用于单件基类，提供getInstance方法。
使用时类名应以Base结尾，使用者可以重写该类，一般用于接口实现。例：

	class PayImpBase
	{
		use JDSingletonImp;
	}

	// 使用者重写Base类的某些方法
	class PayImp extends PayImpBase
	{
	}

则可以调用

	$pay = PayImpBase::getInstance();
	// 创建的是PayImp类。如果未定义PayImp类，则创建PayImpBase类，或是当Base类是abstract类时将抛出错误。

 */
trait JDSingletonImp
{
//	private function __construct () {}
	static function getInstance()
	{
		static $inst;
		if (! isset($inst)) {
			$name = substr(__class__, 0, stripos(__class__, "Base"));
			if (! class_exists($name)) {
				$cls = new ReflectionClass(__class__);
				if ($cls->isAbstract()) {
					throw new MyException(E_SERVER, "Singleton class NOT defined: $name");
				}
				$inst = new static();
				// $inst = $cls->newInstance();
			}
			else if (! is_subclass_of($name, __class__)) {
				throw new MyException(E_SERVER, "$name MUST extends " . __class__);
			}
			else {
				$inst = new $name;
			}
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
		global $DBG_LEVEL;
		$TEST_MODE = getenv("P_TEST_MODE")===false? 0: intval(getenv("P_TEST_MODE"));
		$isCLI = isCLI();
		if ($TEST_MODE) {
			if (!$isCLI)
				header("X-Daca-Test-Mode: $TEST_MODE");
		}
		// 默认允许跨域
		@$origin = $_SERVER['HTTP_ORIGIN'];
		if (isset($origin) && !$isCLI) {
			header('Access-Control-Allow-Origin: ' . $origin);
			header('Access-Control-Allow-Credentials: true');
			header('Access-Control-Expose-Headers: X-Daca-Server-Rev, X-Daca-Test-Mode, X-Daca-Mock-Mode');
			
			@$val = $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'];
			if ($val) {
				header('Access-Control-Allow-Headers: ' . $val);
			}
			@$val = $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'];
			if ($val) {
				header('Access-Control-Allow-Methods: ' . $val);
			}
		}
		if ($_SERVER["REQUEST_METHOD"] === "OPTIONS")
			exit();

		$defaultDebugLevel = getenv("P_DEBUG")===false? 0 : intval(getenv("P_DEBUG"));
		$DBG_LEVEL = param("_debug/i", $defaultDebugLevel, $_GET);

		global $MOCK_MODE;
		if ($TEST_MODE) {
			$MOCK_MODE = getenv("P_MOCK_MODE") ?: 0;
		}
		if ($MOCK_MODE && !$isCLI) {
			header("X-Daca-Mock-Mode: $MOCK_MODE");
		}

		global $DB, $DBCRED, $DBTYPE;
		$DBTYPE = getenv("P_DBTYPE");
		$DB = getenv("P_DB") ?: $DB;
		$DBCRED = getenv("P_DBCRED") ?: $DBCRED;

		// e.g. P_DB="../carsvc.db"
		if (! $DBTYPE) {
			if (preg_match('/\.db$/i', $DB)) {
				$DBTYPE = "sqlite";
			}
			else {
				$DBTYPE = "mysql";
			}
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
				throw new MyException(E_SERVER, "fail to create session folder: $path");
		}
		if (! is_writeable($path))
			throw new MyException(E_SERVER, "session folder is NOT writeable: $path");
		session_save_path ($path);

		ini_set("session.cookie_httponly", 1);

		$path = getenv("P_URL_PATH");
		if ($path)
		{
			// e.g. path=/cheguanjia
			ini_set("session.cookie_path", $path);
		}
	}

	static function init()
	{
		mb_internal_encoding("UTF-8");
		setlocale(LC_ALL, "zh_CN.UTF-8");
		self::initGlobal();
		if (!isCLI())
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

	// 或者只开启部分模块的模拟：
	// putenv("P_MOCK_MODE=sms,wx");

@see getExt
*/

/**
@fn isMockMode($extType)

判断是否模拟某外部扩展模块。如果$extType为null，则只要处于MOCK_MODE就返回true.
 */
function isMockMode($extType)
{
	if (intval($GLOBALS["MOCK_MODE"]) === 1)
		return true;

	$mocks = explode(',', $GLOBALS["MOCK_MODE"]);
	return in_array($extType, $mocks);
}

class ExtFactory
{
	private $objs = []; // {$extType => $ext}

/**
@fn ExtFactory::getInstance()

@see getExt
 */
	use JDSingleton;

/**
@fn ExtFactory::getObj($extType, $allowMock?=true)

获取外部依赖对象。一般用getExt替代更简单。

示例：

	$sms = ExtFactory::getInstance()->getObj(Ext_SmsSupport);

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
	return ExtFactory::getInstance()->getObj($extType, $allowMock);
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

try {
	AppFw_::init();
}
catch (MyException $ex) {
	echo $ex;
	exit;
}
catch (Exception $ex) {
	echo "*** Exception";
	logit($ex);
	exit;
}

#}}}

require_once("ext.php");

// vim: set foldmethod=marker :
