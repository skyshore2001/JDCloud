<?php
/*********************************************************
@module app_fw

- 获得指定类型参数(param/mparam)
- 数据库连接及操作，如dbconn, execOne, queryOne, queryAll.
- 包含 $BASE_DIR/conf.php, $BASE_DIR/php/conf.user.php
- MyException, errQuit等错误处理设施。
- TEST_MODE, MOCK_MODE
- DBG_LEVEL
- session管理

**********************************************************/

// ====== defines {{{
# error code definition:
const E_AUTHFAIL=-1;
const E_OK=0;
const E_PARAM=1;
const E_NOAUTH=2;
const E_DB=3;
const E_SERVER=4;
const E_FORBIDDEN=5;
const E_SMS=6;

$ERRINFO = [
	E_AUTHFAIL => "认证失败",
	E_PARAM => "参数不正确",
	E_NOAUTH => "未登录",
	E_DB => "数据库错误",
	E_SERVER => "服务器错误",
	E_FORBIDDEN => "禁止操作",
	E_SMS => "发送短信失败",
];

const RTEST_MODE=2;

//}}}

// ====== config {{{
// such vars are set manually or by init proc (AppFw_::initGlobal); use it like consts.

// 与api.php相同目录 (no trailing "/")
global $BASE_DIR;
$BASE_DIR = dirname(dirname(__FILE__));

global $JSON_FLAG;
$JSON_FLAG = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

global $DB, $DBCRED, $USE_MYSQL;
$DB = "localhost/myorder";
$DBCRED = "ZGVtbzpkZW1vMTIz"; // base64({user}:{pwd}), default: demo:demo123

global $ALLOW_LCASE_PARAM;
$ALLOW_LCASE_PARAM = true;

global $TEST_MODE, $MOCK_MODE, $DBG_LEVEL;

global $DBH;
global $APP;
$APP = param("_app", "user", $_GET);
// }}}

// ====== global {{{
global $g_dbgInfo;
$g_dbgInfo = [];
//}}}

require_once("{$BASE_DIR}/conf.php");

// load user config
@include_once("{$BASE_DIR}/php/conf.user.php");

// ====== functions {{{

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
					$row1[] = null;
					continue;
				}
				throw new MyException(E_PARAM, "Bad Request - param `$name`: list($type). require col: `$row0`[$i]");
			}
			$e = htmlentities($e);
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
				$row1[] = tobool($e);
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
@fn param($name, $defVal?, $col?=$_REQUEST)
@param $col: key-value collection

获取名为$name的参数。
$name中可以指定类型，返回值根据类型确定。如果该参数未定义或是空串，直接返回缺省值$defVal。

$name中指定类型的方式如下：
- 名为"id", 或以"Id"或"/i"结尾: int
- 以"/b"结尾: bool
- 以"/dt"或"/tm"结尾: datetime
- 以"/n"结尾: numeric/double
- 以"/s"结尾（缺省）: string
- 复杂类型：以"/i+"结尾: int array
- 复杂类型：以"/js"结尾: json object
- 复杂类型：List类型（以","分隔行，以":"分隔列），类型定义如"/i:n:b:dt:tm" （列只支持简单类型，不可为复杂类型）

示例：

	$id = param("id");
	$svcId = param("svcId/i", 99);
	$wantArray = param("wantArray/b", false);
	$startTm = param("startTm/dt", time());

List类型示例。参数"items"类型在文档中定义为list(id/Integer:qty/Double:dscr/String)，可用param("items/i:n:s")获取, 值如

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
function param($name, $defVal = null, $col = null)
{
	if (!isset($col))
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
		$ret = htmlentities($ret);
		if ($type === "s") {
		}
		elseif ($type === "i") {
			if (! ctype_digit($ret))
				throw new MyException(E_PARAM, "Bad Request - integer param `$name`=`$ret`.");
			$ret = intval($ret);
		}
		elseif ($type === "n") {
			if (! is_numeric($ret))
				throw new MyException(E_PARAM, "Bad Request - numeric param `$name`=`$ret`.");
			$ret = doubleval($ret);
		}
		elseif ($type === "b") {
			$ret = tobool($ret);
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
 */
function setParam($k, $v)
{
	$_GET[$k] = $_REQUEST[$k] = $v;
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
@fn dbconn($fnConfirm=$GLOBALS["dbConfirmFn"])
@param fnConfirm fn(dbConnectionString), 如果返回false, 则程序中止退出。

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
		if (! preg_match('/^"?(.*?)\/(\w+)"?$/', $DB, $ms))
			throw new MyException(E_SERVER, "bad db=`$DB`", "未知数据库");
		$dbhost = $ms[1];
		$dbname = $ms[2];

		if (stripos($DBCRED, ":") === false) {
			$DBCRED = base64_decode($DBCRED);
		}
		list($dbuser, $dbpwd) = explode(":", $DBCRED);
		$C = ["mysql:host={$dbhost};dbname={$dbname}", $dbuser, $dbpwd];
	}

	if ($fnConfirm == null)
		@$fnConfirm = $GLOBALS["dbConfirmFn"];
	if ($fnConfirm && $fnConfirm($C[0]) === false) {
		exit;
	}
	try {
		$DBH = new MyPDO ($C[0], $C[1], $C[2]);
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
@fn execOne($sql, $getInsertId = false)
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
@fn queryOne($sql, $fetchMode = PDO::FETCH_NUM)
 */
function queryOne($sql, $fetchMode = PDO::FETCH_NUM)
{
	global $DBH;
	if (! isset($DBH))
		dbconn();
	$sth = $DBH->query($sql);
	if ($sth === false)
		return false;
	$row = $sth->fetch($fetchMode);
	$sth->closeCursor();
	if ($row !== false && count($row)===1 && $fetchMode === PDO::FETCH_NUM)
		return $row[0];
	return $row;
}

/**
@fn queryAll($sql, $fetchMode = PDO::FETCH_NUM)
 */
function queryAll($sql, $fetchMode = PDO::FETCH_NUM)
{
	global $DBH;
	if (! isset($DBH))
		dbconn();
	$sth = $DBH->query($sql);
	if ($sth === false)
		return false;
	$rows = $sth->fetchAll($fetchMode);
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
@fn addLog($str, $logLevel=1)

输出调试信息到前端。调试信息将出现在最终的JSON返回串中。
如果只想输出调试信息到文件，不想让前端看到，应使用logit.

@see logit
 */
function addLog($str, $logLevel=1)
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
 */
class AppBase
{
	public function exec()
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
		}
		catch (PDOException $e) {
			list($code, $msg, $msg2) = [E_DB, $ERRINFO[E_DB], $e->getMessage()];
		}
		catch (Exception $e) {
			list($code, $msg, $msg2) = [E_SERVER, $ERRINFO[E_SERVER], $e->getMessage()];
		}

		try {
			if ($DBH && $DBH->inTransaction())
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

		$DBH = null;
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

	protected function onAfter($ok)
	{
	}
}
// }}}

// ====== AppFw_: module internals {{{
// app framework内部实现，外部一般不应调用。
class AppFw_
{
	private static function initGlobal()
	{
		global $DBG_LEVEL;
		if (!isset($DBG_LEVEL)) {
			$defaultDebugLevel = getenv("P_DEBUG")===false? 0 : intval(getenv("P_DEBUG"));
			$DBG_LEVEL = param("_debug/i", $defaultDebugLevel, $_GET);
		}

		global $TEST_MODE;
		if (!isset($TEST_MODE)) {
			$TEST_MODE = param("_test/i", isCLIServer() || isCLI() || hasSignFile("CFG_TEST_MODE")?1:0);
		}

		global $MOCK_MODE;
		if (!isset($MOCK_MODE)) {
			$MOCK_MODE = hasSignFile("CFG_MOCK_MODE")
				|| ($TEST_MODE && hasSignFile("CFG_MOCK_T_MODE"));
		}

		global $JSON_FLAG;
		if ($TEST_MODE) {
			$JSON_FLAG |= JSON_PRETTY_PRINT;
		}

		global $DB, $DBCRED, $USE_MYSQL;
		$DB = getenv("P_DB") ?: $DB;
		$DBCRED = getenv("P_DBCRED") ?: $DBCRED;
		if ($TEST_MODE) {
			$DB = getenv("P_DB_TEST") ?: $DB;
			$DBCRED = getenv("P_DBCRED_TEST") ?: $DBCRED;
		}

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
		global $TEST_MODE;

		# normal: "userid"; testmode: "tuserid"
		$name = ($TEST_MODE?"t":"") . $APP . "id";
		session_name($name);

		// normal: "./session"; testmode: "./session/t";
		$path = getenv("P_SESSION_DIR") ?: $GLOBALS["BASE_DIR"] . "/session";
		if ($TEST_MODE)
			$path .= "/t";
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

// ====== main {{{

AppFw_::init();

#}}}

// vim: set foldmethod=marker :
