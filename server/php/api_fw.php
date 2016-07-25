<?php

#error_reporting(E_ALL & (~(E_NOTICE|E_USER_NOTICE)));
error_reporting(E_ALL & ~E_NOTICE);

/** @module api_fw

服务接口实现框架。

服务接口包含：

- 函数型接口，如 "login", "getToken"等, 一般实现在 api_functions.php中。
- 对象型接口，如 "Ordr.query", "User.get" 等，一般实现在 api_objects.php中。

## 函数型接口

假设在文档有定义以下接口

	用户修改密码
	chpwd(oldpwd, pwd) -> {_token, _expire}

	权限：AUTH_USER

则在 api_functions.php 中创建该接口的实现：

	function api_chpwd()
	{
		checkAuth(AUTH_USER);
		$oldPwd = mparam("oldpwd");
		$pwd = mparam("pwd");
		...
		$ret = [
			"_token" => $token,
			"_expire" => $expire,
		];
		return $ret;
	}

说明：

- 函数名称一定要符合 "api_{接口名}" 的规范。接口名以小写字母开头。
- 使用checkAuth进行权限检查
- 返回符合接口定义的对象。最终后端框架将其转为JSON串，再由前端框架解析后传递给应用程序。

@see checkAuth
@see mparam 取必选参数，如果缺少该参数则报错。
@see param 取可选参数，可指定缺省值。

## 对象型接口

@see AccessControl 对象型接口框架。

## 接口复用

api.php可以单独执行，也可直接被调用，如

	// set_include_path(get_include_path() . PATH_SEPARATOR . "..");
	require_once("api.php");
	...
	$GLOBALS["errorFn"] = function($code, $msg, $msg2=null) {...}
	$ret = callSvc("genVoucher");
	// 如果没有异常，返回数据；否则调用指定的errorFn函数(未指定则调用errQuit)

@see callSvc

## 常用操作

错误处理

@see MyException

中断执行，直接返回

@see DirectReturn

调试日志

可使用addLog输出调试信息而不破坏协议输出格式。

@see addLog 
@see logit
*/

// ====== config {{{
const API_ENTRY_PAGE = "api.php";

global $X_RET; // maybe set by the caller
global $X_RET_STR;

const PAGE_SZ_LIMIT = 10000;
// }}}

// ====== ApiFw_: module internals {{{

class ApiFw_
{
	static $SOLO;
}
//}}}

// ====== functions {{{
/**
@fn setRet($code, $data?, $internalMsg?)

@param $code Integer. 返回码, 0表示成功, 否则表示操作失败。
@param $data 返回数据。
@param $internalMsg 当返回错误时，作为额外调试信息返回。

设置返回数据，最终返回JSON格式数据为 [ code, data, internalMsg, debugInfo1, ...]
其中按照BQP协议，前两项为必须，后面的内容一般仅用于调试，前端应用不应处理。

当成功时，返回数据可以是任何类型（根据API设计返回相应数据）。
当失败时，为String类型错误信息。
如果参数$data未指定，则操作成功时值为null（按BQP协议返回null表示客户端应忽略处理，一般无特定返回应指定$data="OK"）；操作失败时使用默认错误信息。

调用完后，要返回的数据存储在全局数组 $X_RET 中，以JSON字符串形式存储在全局字符串 $X_RET_STR 中。
注意：$X_RET_STR也可以在调用setRet前设置为要返回的字符串，从而避免setRet函数对返回对象进行JSON序列化，如

	$GLOBALS["X_RET_STR"] = "{id:100, name:'aaa'}";
	setRet(0, "OK");
	throw new DirectReturn();
	// 最终返回字符串为 "[0, {id:100, name:'aaa'}]"

@see $X_RET
@see $X_RET_STR
@see $errorFn
@see errQuit()
*/
function setRet($code, $data = null, $internalMsg = null)
{
	global $TEST_MODE;
	global $JSON_FLAG;
	global $ERRINFO;
	global $X_RET;

	if ($code && !$data) {
		assert(array_key_exists($code, $ERRINFO));
		$data = $ERRINFO[$code];
	}
	$X_RET = [$code, $data];

	if (isset($internalMsg))
		$X_RET[] = $internalMsg;

	if ($TEST_MODE) {
		global $g_dbgInfo;
		if (count($g_dbgInfo) > 0)
			$X_RET[] = $g_dbgInfo;
	}

	if (ApiFw_::$SOLO) {
		global $X_RET_STR;
		if (! isset($X_RET_STR)) {
			$X_RET_STR = json_encode($X_RET, $JSON_FLAG);
		}
		else {
			$X_RET_STR = "[" . $code . ", " . $X_RET_STR . "]";
		}
		echo $X_RET_STR . "\n";
	}
	else {
		$errfn = $GLOBALS["errorFn"] ?: "errQuit";
		if ($code != 0) {
			$errfn($X_RET[0], $X_RET[1], $X_RET[2]);
		}
	}
}

/**
@fn setServerRev()

根据全局变量"SERVER_REV"或应用根目录下的文件"revision.txt"， 来设置HTTP响应头"X-Daca-Server-Rev"表示服务端版本信息（最多6位）。

客户端框架可本地缓存该版本信息，一旦发现不一致，可刷新应用。
 */
function setServerRev()
{
	$ver = $GLOBALS["SERVER_REV"] ?: @file_get_contents("{$GLOBALS['BASE_DIR']}/revision.txt");
	addLog($ver);
	if (! $ver)
		return;
	$ver = substr($ver, 0, 6);
	header("X-Daca-Server-Rev: {$ver}");
}
// }}}

// ====== classes {{{
class ApiLog
{
	private $startTm;
	private $ac;
	private $id;

	function __construct($ac) 
	{
		$this->ac = $ac;
	}

	private function myVarExport($var, $maxLength=200)
	{
		if (is_string($var)) {
			$var = preg_replace('/\s+/', " ", $var);
			if (strlen($var) > $maxLength)
				$var = substr($var, 0, $maxLength) . "...";
			return $var;
		}
		if (is_scalar($var)) {
			return $var;
		}
		
		$s = "";
		$maxKeyLen = 30;
		foreach ($var as $k=>$v) {
			$klen = strlen($k);
			// 注意：有时raw http内容被误当作url-encoded编码，会导致所有内容成为key. 例如API upload.
			if ($klen > $maxKeyLen)
				return substr($k, 0, $maxKeyLen) . "...";
			$len = strlen($s);
			if ($len >= $maxLength) {
				$s .= "$k=...";
				break;
			}
			if ($k == "pwd" || $k == "oldpwd") {
				$v = "?";
			}
			else if (! is_scalar($v)) {
				$v = "obj:" . json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
			}
			if ($len == 0) {
				$s = "$k=$v";
			}
			else {
				$s .= ", $k=$v";
			}
		}
		return $s;
	}

	function logBefore()
	{
		$this->startTm = microtime(true);

		global $APP;
		$type = getAppType();
		$userId = null;
		if ($type == "user") {
			$userId = $_SESSION["uid"];
		}
		else if ($type == "emp" || $type == "store") {
			$userId = $_SESSION["empId"];
		}
		else if ($type == "admin") {
			$userId = $_SESSION["adminId"];
		}
		if (! (is_int($userId) || ctype_digit($userId)))
			$userId = 'NULL';
		$content = $this->myVarExport($_GET, 2000);
		$ct = $_SERVER["HTTP_CONTENT_TYPE"];
		if (! preg_match('/x-www-form-urlencoded|form-data/i', $ct)) {
			$post = file_get_contents("php://input");
			$content2 = $this->myVarExport($post, 2000);
		}
		else {
			$content2 = $this->myVarExport($_POST, 2000);
		}
		if ($content2 != "")
			$content .= ";\n" . $content2;
		$remoteAddr = @$_SERVER['REMOTE_ADDR'] ?: 'unknown';
		$reqsz = strlen($_SERVER["REQUEST_URI"]) + (@$_SERVER["HTTP_CONTENT_LENGTH"]?:$_SERVER["CONTENT_LENGTH"]?:0);
		$ua = $_SERVER["HTTP_USER_AGENT"];
		$ver = getClientVersion();

		$sql = sprintf("INSERT INTO ApiLog (tm, addr, ua, app, ses, userId, ac, req, reqsz, ver) VALUES ('%s', %s, %s, %s, %s, $userId, %s, %s, $reqsz, %s)", 
			date(FMT_DT), Q($remoteAddr), Q($ua), Q($APP), Q(session_id()), Q($this->ac), Q($content), Q($ver["str"])
		);
		$this->id = execOne($sql, true);
// 		$logStr = "=== [" . date("Y-m-d H:i:s") . "] id={$this->logId} from=$remoteAddr ses=" . session_id() . " app=$APP user=$userId ac=$ac >>>$content<<<\n";
	}

	function logAfter()
	{
		global $DBH;
		global $X_RET_STR;
		global $X_RET;
		if ($DBH == null)
			return;
		$iv = sprintf("%.0f", (microtime(true) - $this->startTm) * 1000); // ms
		if ($X_RET_STR == null)
			$X_RET_STR = json_encode($X_RET, $GLOBALS["JSON_FLAG"]);
		$content = $this->myVarExport($X_RET_STR);
		$sql = sprintf("UPDATE ApiLog SET t=$iv, retval=%d, ressz=%d, res=%s WHERE id={$this->id}", $X_RET[0], strlen($X_RET_STR), Q($content));
		$rv = execOne($sql);
// 		$logStr = "=== id={$this->logId} t={$iv} >>>$content<<<\n";
	}
}

/*
	1. 只对同一session的API调用进行监控; 只对成功的调用监控
	2. 相邻两次调用时间<0.5s, 记一次不良记录(bad). 当bad数超过50次(CNT1)时报错，记一次历史不良记录；此后bad每超过2次(CNT2)，报错一次。
	之所以不是每次都报错，是考虑正常程序也可能一次发多个请求。
	3. 回归测试模式下不监控。
 */
class ApiWatch
{
	private $CNT1 = 50;
	private $CNT2 = 2;

	private $ac;
	function __construct($ac) 
	{
		$this->ac = $ac;
	}
	function execute()
	{
		if ($GLOBALS["TEST_MODE"] == RTEST_MODE || $this->ac == "att" || isCLI());
			return;
		$lastAccess = @$_SESSION["lastAccess"];
		if ($lastAccess) {
			$now = microtime(true);
			$_SESSION["lastAccess"] = $now;
			// <0.5s
			if ($now - $lastAccess < 0.5) {
				@++ $_SESSION["bad"];
				// bad: 不良记录
				if ($_SESSION["bad"] >= $this->CNT2)
				{
					// bad2: 历史不良记录
					$n = @$_SESSION["bad2"] ?: 0;
					if ($n > 0 || $_SESSION["bad"] >= $this->CNT1)
					{
						logit("call API too fast: bad={$_SESSION['bad']}, bad2={$_SESSION['bad2']}", true, "secure");
						@++ $_SESSION["bad2"];
						$_SESSION["bad"] = 0;
						throw new MyException(E_FORBIDDEN, "call API too fast");
					}
				}
			}
			else {
				$_SESSION["bad"] = 0;
			}
		}
	}

	function postExecute()
	{
		$_SESSION["lastAccess"] = microtime(true);
	}
}
//}}}

// ====== general API functions: execsql, CRUD {{{

function api_execSql()
{
	checkAuth(AUTH_ADMIN | AUTH_TEST_MODE);

	# TODO: limit the function
	$sql = html_entity_decode(mparam("sql"));
	if (preg_match('/^\s*select/i', $sql)) {
		global $DBH;
		$sth = $DBH->query($sql);
		$fmt = param("fmt");
		$wantArray = param("wantArray/b", false);
		if ($wantArray)
			$fmt = "array";

		if ($fmt == "array")
			return $sth->fetchAll(PDO::FETCH_NUM);
		if ($fmt == "table") {
			$h = getRsHeader($sth);
			$d = $sth->fetchAll(PDO::FETCH_NUM);
			return ["h"=>$h, "d"=>$d];
		}
		if ($fmt == "one") {
			$row = $sth->fetch(PDO::FETCH_NUM);
			$sth->closeCursor();
			if ($row !== false && count($row)===1)
				return $row[0];
			return $row;
		}
		return $sth->fetchAll(PDO::FETCH_ASSOC);
	}
	else {
		$wantId = param("wantId/b");
		$ret = execOne($sql, $wantId);
	}
	return $ret;
}

# query sub table for mainObj(id), and add result to mainObj as obj or obj collection (opt["wantOne"])
function handleSubObj($subobj, $id, &$mainObj)
{
	if (is_array($subobj)) {
		# $opt: {sql, wantOne=false}
		foreach ($subobj as $k => $opt) {
			if (! @$opt["sql"])
				continue;
			$sql1 = sprintf($opt["sql"], $id); # e.g. "select * from OrderItem where orderId=%d"
			$ret1 = queryAll($sql1, PDO::FETCH_ASSOC);
			if (@$opt["wantOne"]) {
				if (count($ret1) > 0)
					$mainObj[$k] = $ret1[0];
				else
					$mainObj[$k] = null;
			}
			else {
				$mainObj[$k] = $ret1;
			}
		}
	}
}

/*
# "key= vallue"
# "key= >=vallue"
# "key= <vallue"
# "key= ~vallue"
function KVtoCond($k, $v)
{
	$op = "=";
	$is_like = false;
	if (preg_match('/^(~|<>|>=?|<=?)/', $v, $ms)) {
		$op = $ms[1];
		$v = substr($v, strlen($op));
		if ($op == "~") {
			$op = " LIKE ";
			$is_like = true;
		}
	}
	$v = trim($v);

	if ($is_like || !ctype_digit($v) {
# 		// ???? 只对access数据库: 支持 yyyy-mm-dd, mm-dd, hh:nn, hh:nn:ss
# 		if (!is_like && v.match(/^((19|20)\d{2}[\/.-])?\d{1,2}[\/.-]\d{1,2}$/) || v.match(/^\d{1,2}:\d{1,2}(:\d{1,2})?$/))
# 			return op + "#" + v + "#";
		if ($is_like) {
			$v = "'%" + $v + "%'";
		}
		else {
			$v = "'" + $v + "'";
		}
	}
	return $k . $op . $v;
}
 */

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

function flag_handleResult(&$rowData)
{
	@$flags = $rowData["flags"];
	if (isset($flags)) {
		foreach (str_split($flags) as $e) {
			if (ctype_alnum($e))
				$rowData["flag_" . $e] = 1;
		}
	}
	@$props = $rowData["props"];
	if (isset($props)) {
		foreach (explode(" ", $props) as $e) {
			if (ctype_alnum($e[0]))
				$rowData["prop_" . $e] = 1;
		}
	}
}

function flag_handleCond(&$cond)
{
	$cond = preg_replace_callback('/((?:\w+\.)?flag|prop)_(\w+)=(0|1)/', function($ms) {
		$name = $ms[1] . 's'; // flag->flags
		$val = $ms[2];
		if ($ms[3] == '1') {
			$s = "{$name} LIKE '%{$val}%'";
		}
		else {
			$s = "({$name} IS NULL OR {$name} NOT LIKE '%{$val}%')";
		}
		return $s;
	}, $cond);
}

function outputCsvLine($row, $enc)
{
	$firstCol = true;
	foreach ($row as $e) {
		if ($firstCol)
			$firstCol = false;
		else
			echo ',';
		if ($enc)
			$e = iconv("UTF-8", "{$enc}//IGNORE" , $e);
		echo '"', str_replace('"', '""', $e), '"';
	}
	echo "\n";
}

function table2csv($tbl, $enc = null)
{
	outputCsvLine($tbl["h"], $enc);
	foreach ($tbl["d"] as $row) {
		outputCsvLine($row, $enc);
	}
}

function table2txt($tbl)
{
	echo join("\t", $tbl["h"]), "\n";
	foreach ($tbl["d"] as $row) {
		echo join("\t", $row), "\n";
	}
}

function handleFormat($ret, $fname)
{
	$fmt = param("_fmt");
	if ($fmt == null)
		return;

	if ($fmt === "csv") {
		header("Content-Type: application/csv; charset=UTF-8");
		header("Content-Disposition: attachment;filename={$fname}.csv");
		table2csv($ret);
	}
	else if ($fmt === "excel") {
		header("Content-Type: application/csv; charset=gb2312");
		header("Content-Disposition: attachment;filename={$fname}.csv");
		table2csv($ret, "gb2312");
	}
	else if ($fmt === "txt") {
		header("Content-Type: text/plain; charset=UTF-8");
		header("Content-Disposition: attachment;filename={$fname}.txt");
		table2txt($ret);
	}
	throw new DirectReturn();
}

/**
@fn tableCRUD($ac, $tbl, $asAdmin?=false)

对象型接口的入口。
也可直接被调用，常与setParam一起使用, 提供一些定制的操作。

@param $asAdmin 默认根据用户身份自动选择"AC_"类; 如果为true, 则以超级管理员身份调用，即使用"AC0_"类。
设置$asAdmin=true好处是对于超级管理员权限来说，即使未定义"AC0_"类，默认也可以访问所有内容。

假如有Rating（订单评价）对象，不想通过对象型接口来查询，而是通过函数型接口来定制输出，接口设计为：

	queryRating(storeId, cond?) -> tbl(id, score, dscr, tm, orderDscr)

	查询店铺storeId的订单评价。

	应用逻辑：
	- 按时间tm倒排序

底层利用tableCRUD实现它，这样便于保留分页、参数cond/gres等特性:

	function api_queryRating()
	{
		$storeId = mparam("storeId");

		// 定死输出内容。
		setParam("res", "id, score, dscr, tm, orderDscr");

		// 相当于AccessControl框架中调用 addCond，用Obj.query接口的内部参数cond2以保证用户还可以使用cond参数。
		setParam("cond2", ["o.storeId=$storeId"]); 

		// 定死排序条件
		setParam("orderby", "tm DESC");

		$ret = tableCRUD("query", "Rating", true);
		return $ret;
	}

注意：
- 以上示例中的设计不可取，应使用标准对象接口来实现这个需求。

@see setParam
 */

function tableCRUD($ac1, $tbl, $asAdmin = false)
{
	$accessCtl = AccessControl::create($tbl, $asAdmin);
	$accessCtl->before($ac1, $tbl);
	$ignoreAfter = false;

	if ($ac1 == "add") {
		$keys = '';
		$values = '';
#			var_dump($_POST);
		$id = $accessCtl->genId();
		if ($id != 0) {
			$keys = "id";
			$values = (string)$id;
		}
		foreach ($_POST as $k=>$v) {
			$k = htmlEscape($k);
			if ($k === "id")
				continue;
			// ignore non-field param
			if (substr($k,0,2) === "p_")
				continue;
			if ($v === "")
				continue;
			# TODO: check meta
			if (! preg_match('/^\w+$/', $k))
				throw new MyException(E_PARAM, "bad key $k");

			if ($keys !== '') {
				$keys .= ", ";
				$values .= ", ";
			}
			$keys .= $k;
			$values .= Q(htmlEscape($v));
		}
		if (strlen($keys) == 0) 
			throw new MyException(E_PARAM, "no field found to be added");
		$sql = sprintf("INSERT INTO %s (%s) VALUES (%s)", $tbl, $keys, $values);
#			var_dump($sql);
		$id = execOne($sql, true);

		$res = param("res");
		if (isset($res)) {
			setParam("id", $id);
			$ret = tableCRUD("get", $tbl);
		}
		else
			$ret = $id;
	}
	elseif ($ac1 == "set") {
		$id = mparam("id", $_GET);
		$kv = "";
		foreach ($_POST as $k=>$v) {
			$k = htmlEscape($k);
			if ($k === 'id')
				continue;
			// ignore non-field param
			if (substr($k,0,2) === "p_")
				continue;
			# TODO: check meta
			if (! preg_match('/^\w+$/', $k))
				throw new MyException(E_PARAM, "bad key $k");

			if ($kv !== '')
				$kv .= ", ";

			// 空串或null置空；empty设置空字符串
			if ($v === "" || $v === "null")
				$kv .= "$k=null";
			else if ($v === "empty")
				$kv .= "$k=''";
			else if (startsWith($k, "flag_") || startsWith($k, "prop_"))
			{
				$kv .= flag_getExpForSet($k, $v);
			}
			else
				$kv .= "$k=" . Q(htmlEscape($v));
		}
		if (strlen($kv) == 0) {
			addLog("no field found to be set");
		}
		else {
			$sql = sprintf("UPDATE %s SET %s WHERE id=%d", $tbl, $kv, $id);
			$cnt = execOne($sql);
		}
		$ret = "OK";
	}
	elseif ($ac1 === "get" || $ac1 === "query") {
		$forGet = ($ac1 === "get");
		$wantArray = param("wantArray/b");
		$sqlConf = $accessCtl->sqlConf;

		$enablePaging = true;
		if ($forGet || $wantArray) {
			$enablePaging = false;
		}
		if ($forGet) {
			$id = mparam("id");
			array_unshift($sqlConf["cond"], "t0.id=$id");
		}
		else {
			$pagesz = param("_pagesz/i");
			$pagekey = param("_pagekey/i");
			// support jquery-easyui
			if (!isset($pagesz) && !isset($pagekey)) {
				$pagesz = param("rows/i");
				$pagekey = param("page/i");
				if (isset($pagekey))
				{
					$enableTotalCnt = true;
					$enablePartialQuery = false;
				}
			}
			if ($pagesz == 0)
				$pagesz = 20;

			$maxPageSz = min($accessCtl->getMaxPageSz(), PAGE_SZ_LIMIT);
			if ($pagesz < 0 || $pagesz > $maxPageSz)
				$pagesz = $maxPageSz;

			if (isset($sqlConf["gres"])) {
				$enablePartialQuery = false;
			}
		}

		$orderSql = $sqlConf["orderby"];

		// setup cond for partialQuery
		if ($enablePaging) {
			if ($orderSql == null)
				$orderSql = $accessCtl->getDefaultSort();

			if (!isset($enableTotalCnt))
			{
				$enableTotalCnt = false;
				if ($pagekey === 0)
					$enableTotalCnt = true;
			}

			// 如果未指定orderby或只用了id(以后可放宽到唯一性字段), 则可以用partialQuery机制(性能更好更精准), _pagekey表示该字段的最后值；否则_pagekey表示下一页页码。
			if (!isset($enablePartialQuery)) {
				$enablePartialQuery = false;
			    if (preg_match('/^(t0\.)?id\b/', $orderSql)) {
					$enablePartialQuery = true;
					if ($pagekey) {
						if (preg_match('/\bid DESC/i', $orderSql)) {
							$partialQueryCond = "t0.id<$pagekey";
						}
						else {
							$partialQueryCond = "t0.id>$pagekey";
						}
						// setup res for partialQuery
						if ($partialQueryCond) {
// 							if (isset($sqlConf["res"][0]) && !preg_match('/\bid\b/',$sqlConf["res"][0])) {
// 								array_unshift($sqlConf["res"], "t0.id");
// 							}
							array_unshift($sqlConf["cond"], $partialQueryCond);
						}
					}
				}
			}
			if (! $pagekey)
				$pagekey = 1;
		}

		if (! isset($sqlConf["res"][0]))
			$sqlConf["res"][0] = "t0.*";
		else if ($sqlConf["res"][0] === "")
			array_shift($sqlConf["res"]);
		$resSql = join(",", $sqlConf["res"]);
		if ($resSql == "") {
			$resSql = "t0.id";
		}
		if (@$sqlConf["distinct"]) {
			$resSql = "DISTINCT {$resSql}";
		}

		$tblSql = "$tbl t0";
		if (count($sqlConf["join"]) > 0)
			$tblSql .= "\n" . join("\n", $sqlConf["join"]);
		$condSql = "";
		foreach ($sqlConf["cond"] as $cond) {
			if ($cond == null)
				continue;
			if (strlen($condSql) > 0)
				$condSql .= " AND ";
			if (stripos($cond, " and ") !== false || stripos($cond, " or ") !== false)
				$condSql .= "({$cond})";
			else 
				$condSql .= $cond;
		}
/*
			foreach ($_POST as $k=>$v) {
				# skip sys param which generally starts with "_"
				if (substr($k, 0, 1) === "_")
					continue;
				# TODO: check meta
				if (! preg_match('/^\w+$/', $k))
					throw new MyException(E_PARAM, "bad key $k");

				if ($condSql !== '') {
					$condSql .= " AND ";
				}
				$condSql .= KVtoCond($k, $v);
			}
*/

		$sql = "SELECT $resSql FROM $tblSql";
		if ($condSql)
		{
			flag_handleCond($condSql);
			$sql .= "\nWHERE $condSql";
		}
		if (isset($sqlConf["union"])) {
			$sql .= "\nUNION\n" . $sqlConf["union"];
		}
		if ($sqlConf["gres"]) {
			$sql .= "\nGROUP BY {$sqlConf['gres']}";
		}

		if ($orderSql)
			$sql .= "\nORDER BY " . $orderSql;

		if ($enablePaging) {
			if ($enableTotalCnt) {
				$cntSql = "SELECT COUNT(*) FROM $tblSql";
				if ($condSql)
					$cntSql .= "\nWHERE $condSql";
				$totalCnt = queryOne($cntSql);
			}

			if ($enablePartialQuery) {
				$sql .= "\nLIMIT " . $pagesz;
			}
			else {
				$sql .= "\nLIMIT " . ($pagekey-1)*$pagesz . "," . $pagesz;
			}
		}
		else {
			if ($pagesz) {
				$sql .= "\nLIMIT " . $pagesz;
			}
		}

		if ($forGet) {
			$ret = queryOne($sql, PDO::FETCH_ASSOC);
			if ($ret === false) 
				throw new MyException(E_PARAM, "not found `$tbl.id`=`$id`");
			handleSubObj($sqlConf["subobj"], $id, $ret);
		}
		else {
			$ret = queryAll($sql, PDO::FETCH_ASSOC);
			if ($ret === false)
				$ret = [];

			if ($wantArray) {
				foreach ($ret as &$mainObj) {
					$id1 = $mainObj["id"];
					handleSubObj($sqlConf["subobj"], $id1, $mainObj);
				}
			}
			else {
				// Note: colCnt may be changed in after().
				$fixedColCnt = count($ret)==0? 0: count($ret[0]);
				$accessCtl->after($ret);
				$ignoreAfter = true;

				if ($enablePaging && $pagesz == count($ret)) { // 还有下一页数据, 添加nextkey
					if ($enablePartialQuery) {
						$nextkey = $ret[count($ret)-1]["id"];
					}
					else {
						$nextkey = $pagekey + 1;
					}
				}
				$ret = objarr2table($ret, $fixedColCnt);
				if (isset($nextkey)) {
					$ret["nextkey"] = $nextkey;
				}
				if (isset($totalCnt)) {
					$ret["total"] = $totalCnt;
				}

				handleFormat($ret, $tbl);
			}
		}
	}
	elseif ($ac1 == "del") {
		$id = mparam("id");
		$sql = sprintf("DELETE FROM %s WHERE id=%d", $tbl, $id);
		$cnt = execOne($sql);
		if ($cnt != 1)
			throw new MyException(E_PARAM, "not found id=$id");
		$ret = "OK";
	}
	if (!$ignoreAfter)
		$accessCtl->after($ret);

	return $ret;
}

//}}}

// ====== access control framework {{{
/**
@module AccessControl

对象型接口框架。
AccessControl简写为AC，同时AC也表示自动补全(AutoComplete).

在设计文档中完成数据库设计后，通过添加AccessControl的继承类，可以很方便的提供诸如 {Obj}.query/add/get/set/del 这些对象型接口。

例如，设计文档中已定义订单对象(Ordr)的主表(Ordr)和订单日志子表(OrderLog)：

	@Ordr: id, userId, status, amount
	@OrderLog: id, orderId, tm, dscr

注意：之所以用对象和主表名用Ordr而不是Order词是避免与SQL关键字冲突。

有了表设计，订单的标准接口就已经自动生成好了：

	// 查询订单
	Ordr.query() -> tbl(id, userId, ...)
	// 添加订单
	Ordr.add()(userId=1, status='CR', amount=100) -> id
	// 查看订单
	Ordr.get(id=1)
	// 修改订单状态
	Ordr.set(id=1)(status='PA')
	// 删除订单
	Ordr.del(id=1)

但是，只有超级管理员登录后（例如从示例应用中的超级管理端登录后，web/adm.html），才有权限使用这些接口。

如果希望用户登录后，也可以使用这些接口，只要添加一个继承AccessControl的类，且命名为"AC1_Ordr"即可：

	class AC1_Ordr extends AccessControl
	{
	}

有了以上定义，在用户登录系统后，就可以使用上述和超级管理员一样的标准订单接口了。

说明：

类的命名规则为AC前缀加对象名（或主表名，因为对象名与主表名一致）。框架默认提供的前缀如下：

@key AC_  游客权限(AUTH_GUEST)，如未定义则调用时报“无权操作”错误。
@key AC0_ 超级管理员权限(AUTH_ADMIN)，如未定义，默认拥有所有权限。
@key AC1_  用户权限(AUTH_USER)，如未定义，则降级使用游客权限接口(AC_)。
@key AC2_  员工权限(AUTH_EMP/AUTH_MGR), 如未定义，报权限不足错误。

因而上例中命名为 "AC1_Ordr" 就表示用户登录后调用Ordr对象接口，将受该类控制。而这是个空的类，所以拥有一切操作权限。

框架为AUTH_ADMIN权限自动选择AC0_类，其它类可以通过函数 onCreateAC 进行自定义，仍未定义的框架使用AC_类。

@see onCreateAC

## 基本权限控制

@var AccessControl::$allowedAc?=["add", "get", "set", "del", "query"] 设定允许的操作，如不指定，则允许所有操作。

@var AccessControl::$readonlyFields ?=[]  (影响add/set) 字段列表，添加/更新时为这些字段填值无效（但不报错）。
@var AccessControl::$readonlyFields2 ?=[]  (影响set操作) 字段列表，更新时对这些字段填值无效。
@var AccessControl::$hiddenFields ?= []  (for get/query) 隐藏字段列表。默认表中所有字段都可返回。一些敏感字段不希望返回的可在此设置。

@var AccessControl::$requiredFields ?=[] (for add/set) 字段列表。添加时必须填值；更新时不允许置空。
@var AccessControl::$requiredFields2 ?=[] (for set) 字段列表。更新时不允许设置空。

@fn AccessControl::onQuery() (for get/query)  用于对查询条件进行设定。
@fn AccessControl::onValidate()  (for add/set). 验证添加和更新时的字段，或做自动补全(AutoComplete)工作。
@fn	AccessControl::onValidateId() (for get/set/del) 用于对id字段进行检查。比如在del时检查用户是否有权操作该记录。

上节例子中，用户可以操作系统的所有订单。

现在我们到设计文档中，将接口API设计如下：

	== 订单接口 ==

	添加订单：
	Ordr.add()(amount) -> id

	查看订单：
	Ordr.query() -> tbl(id, userId, status, amount)
	Ordr.get(id)

	权限：AUTH_GUEST

	应用逻辑
	- 用户只能添加(add)、查看(get/query)订单，不可修改(set)、删除(del)订单
	- 用户只能查看(get/query)属于自己的订单。
	- 用户在添加订单时，必须设置amount字段，不必（也不允许）设置id, userId, status这些字段。
	  服务器应将userId字段自动设置为该用户编号，status字段自动设置为"CR"（已创建）

为实现以下逻辑，上面例子中代码可修改为：

	class AC1_Ordr extends AccessControl
	{
		protected $allowedAc = ["get", "query", "add"];
		protected $requiredFields = ["amount"];
		protected $readonlyFields = ["status", "userId"];

		protected function onQuery()
		{
			$userId = $_SESSION["uid"];
			$this->addCond("t0.userId={$userId}");
		}

		protected function onValidate()
		{
			if ($this->ac == "add") {
				$userId = $_SESSION["uid"];
				$_POST["userId"] = $userId;
				$_POST["status"] = "CR";
			}
		}
	}

说明：

- 使用$allowedAc设定了该对象接口允许的操作。
- 使用$requiredFields与$readonlyFields设定了添加时必须指定或不可指定的字段。由于"id"字段默认就是不可添加/更新的，所以不必在这里指定。
- 在onQuery中，对用户可查看的订单做了限制：只允许访问自己的订单。这里通过添加了条件实现。
  $_SESSION["uid"]是在用户登录后设置的，可参考login接口定义(api_login).
- 在onValidate中，对添加操作时的字段做自动补全。由于添加和更新都会走这个接口，所以用 $this->ac 判断只对添加操作时补全。
  由于添加和更新操作的具体字段都通过 $_POST 来传递，故直接设置 $_POST中的相应字段即可。

## 虚拟字段

@var AccessControl::$vcolDefs (for get/query) 定义虚拟字段

常用于展示关联表字段、统计字段等。
在query,get操作中可以通过res参数指定需要返回的每个字段，这些字段可能是普通列名(col)/虚拟列名(vcol)/子对象(subobj)名。

### 关联字段

例如，在订单列表中需要展示用户名字段。设计文档中定义接口：

	Ordr.query() -> tbl(id, dscr, ..., userName?, userPhone?, createTm?)

query接口的"..."之后就是虚拟字段。后缀"?"表示是非缺省字段，即必须在"res"参数中指定才会返回，如：

	Ordr.query(res="*,userName")

在cond中可以直接使用虚拟字段，不管它是否在res中指定，如

	Ordr.query(cond="userName LIKE 'jian%'", res="id,dscr")

通过设置$vcolDefs实现这些关联字段：

	class AC1_Ordr extends AccessControl
	{
		protected $vcolDefs = [
			[
				"res" => ["u.name AS userName", "u.phone AS userPhone"],
				"join" => "INNER JOIN User u ON u.id=t0.userId",
				// "default" => false, // 指定true表示Ordr.query在不指定res时默认会返回该字段。一般不建议设置为true.
			],
			[
				"res" => ["log_cr.tm AS createTm"],
				"join" => "LEFT JOIN OrderLog log_cr ON log_cr.action='CR' AND log_cr.orderId=t0.id",
			]
		]
	}

### 关联字段依赖

假设设计有“订单评价”对象，它会与“订单对象”相关联：

	@Rating: id, orderId, content

表间的关系为：

	订单评价Rating(orderId) <-> 订单Ordr(userId) <-> 用户User

现在要为Rating表增加关联字段 "Ordr.dscr AS orderDscr", 以及"User.name AS userName", 设计接口为：

	Rating.query() -> tbl(id, orderId, content, ..., orderDscr?, userName?)
	注意：userName字段不直接与Rating表关联，而是通过Ordr表桥接。

实现时，只需在vcolDefs中使用require指定依赖字段：

	class AC1_Rating extends AccessControl
	{
		protected $vcolDefs = [
			[
				"res" => ["o.dscr AS orderDscr", "o.userId"],
				"join" => "INNER JOIN Ordr o ON o.id=t0.orderId",
			],
			[
				"res" => ["u.name AS userName"],
				"join" => "INNER JOIN User u ON o.userId=u.id",
				"require" => "userId", // *** 定义依赖，如果要用到res中的字段如userName，则自动添加userId字段引入的表关联。
				// 这里指向orderDscr也可以，一般习惯上指向关联的字段。
			],
		];
	}

使用require, 框架可自动将Ordr表作为中间表关联进来。
如果没有require定义，以下调用

	Rating.query(res="*,orderDscr,userName")

也不会出问题，因为在userName前指定了orderDscr，框架可自动引入相关表。而以下查询就会出问题：

	Rating.query(res="*,userName")
	或
	Rating.query(res="*,userName,orderDscr")

### 计算字段

示例：管理端应用在查询订单时，需要订单对象上有一个原价字段：

	Ordr.query() -> tbl(..., amount2)
	amount2:: 原价，通过OrderItem中每个项目重新计算累加得到，不考虑打折优惠。

可实现为：

	class AC0_Ordr extends AccessControl
	{
		protected $vcolDefs = [
			[
				"res" => ["(SELECT SUM(qty*ifnull(price2,0)) FROM OrderItem WHERE orderId=t0.id) AS amount2"],
			]
		];
	}

### 子表压缩字段

除了使用[子表](#AccessControl::$subobj), 对于简单的情况，也可以设计为将子表压缩成一个虚拟字段，在Query操作时直接返回。

示例：OrderItem是Ordr对象的一个子表，现在想在查询Ordr对象列表时，返回OrderItem的相关信息。
这就要把一张子表压缩成一个字段。我们使用List来描述这种压缩字段的格式：表中每行以","分隔，行中每个字段以":"分隔。
利用List，可将接口设计为：

	Ordr.query() -> tbl(..., itemsInfo)
	itemsInfo:: List(name, price, qty). 例如"洗车:25:1,换轮胎:380:2", 表示两行记录，每行3个字段。注意字段内容中不可出现":", ","这些分隔符。

子表压缩是一种特殊的计算字段，可实现如下：

	class AC1_Ordr extends AccessControl
	{
		protected $vcolDefs = [
			[
				"res" => ["(SELECT group_concat(concat(oi.name, ':', oi.price, ':', oi.qty)) FROM OrderItem oi WHERE oi.orderId=t0.id) itemsInfo"] 
			],
			...
		]
	}

注意：计算字段，包括子表压缩字段都是很消耗性能的。

### 自定义字段

假设有张虚拟表Task, 它没有存储在数据库中, 另一张表UserTaskLog关联到它。在设计文档中定义如下:

	@UserTaskLog: id, userId, taskId
	@Conf::$taskTable: id, type, name
	(关联： UserTaskLog(taskId) <-> Conf::$taskTable )
	
	提供查询接口：
	UserTaskLog.query() -> tbl(id, taskId, ..., taskName)
	taskName:: 由关联表的taskTable.name字段得到。

实现中，在代码中直接定义Task表：

	class Conf
	{
		static $taskTable = [
			["id" => 1, "type"=>"invite", "name" => "邀请5个用户注册"],
			["id" => 2, "type"=>"invite", "name" => "邀请10个用户注册"],
		];
	}

通过在vcolDefs的join属性指定一个函数，可以实现返回taskName字段：

	function getTaskName(&$row)
	{
		foreach (Conf::$taskTable as $task) {
			if ($row["taskId"] == $task["id"]) {
				$row["taskName"] = $task["name"];
			}
		}
	}

	class AC1_UserTaskLog extends AccessControl
	{
		protected $vcolDefs = [
			[
				"res" => ["taskName"],
				"join" => getTaskName
			]
		];
	}

注意:

- 自定义字段只限于对query/get的最终结果集进行操作
- 自定义字段不能用于设置cond条件.

 
## 子表

@var AccessControl::$subobj (for get/query) 定义子表

设计接口：

	Ordr.get() -> {id, ..., @orderLog}
	orderLog:: {id, tm, dscr, ..., empName} 订单日志子表。

实现：

	class AC1_Ordr extends AccessControl
	{
		protected $subobj = [
			"orderLog" => ["sql"=>"SELECT ol.*, e.name AS empName FROM OrderLog ol LEFT JOIN Employee e ON ol.empId=e.id WHERE orderId=%d", "wantOne"=>false],
		];
	}

子表一般通过get操作来获取，执行指定的SQL语句作为结果。结果以一个数组返回[{id, tm, ...}]，如果指定wantOne=>true, 则结果以一个对象返回即 {id, tm, ...}, 适用于主表与子表一对一的情况。

通过在Query操作上指定参数{wantArray:1}也可以返回子表，但目前不支持分页等操作。

## 操作完成回调

@fn AccessControl::onAfter(&$ret)  (for all) 操作完成时的回调。可修改操作结果ret。
如果要对get/query结果中的每行字段进行设置，应重写回调 onHandleRow. 
有时使用 onAfterActions 就近添加逻辑更加方便。

@var AccessControl::$onAfterActions =[].  onAfter的替代方案，更易使用，便于与接近的逻辑写在一起。
@var AccessControl::$id  get/set/del时指定的id, 或add后返回的id.

例如，添加订单时，自动添加一条日志，可以用：

	protected function onValidate()
	{
		if ($this->ac == "add") {
			... 

			$this->onAfterActions[] = function () use ($logAction) {
				$orderId = $this->id;
				$sql = sprintf("INSERT INTO OrderLog (orderId, action, tm) VALUES ({$orderId},'CR','%s')", date('c'));
				execOne($sql);
			};
		}
	}

@fn AccessControl::onHandleRow(&$rowData) (for get/query) 在onAfter之前运行，用于修改行中字段。

## 其它

### 编号自定义生成

@fn AccessControl::onGenId() (for add) 指定添加对象时生成的id. 缺省返回0表示自动生成.

### 缺省排序

@fn AccessControl::getDefaultSort()  (for query)取缺省排序.
@var AccessControl::$defaultSort ?= "t0.id" (for query)指定缺省排序.

### 最大每页数据条数

@fn AccessControl::getMaxPageSz()  (for query) 取最大每页数据条数。为非负整数。
@var AccessControl::$maxPageSz ?= 100 (for query) 指定最大每页数据条数。值为负数表示取PAGE_SZ_LIMIT值.

前端通过 {obj}.query(_pagesz)来指定每页返回多少条数据，缺省是20条，最高不可超过100条。当指定为负数时，表示按最大允许值=min($maxPageSz, PAGE_SZ_LIMIT)返回。
PAGE_SZ_LIMIT目前定为10000条。如果还不够，一定是应用设计有问题。

如果想返回每页超过100条数据，必须在后端设置，如：

	class MyObj extends AccessControl
	{
		protected $maxPageSz = 1000; // 最大允许返回1000条
		// protected $maxPageSz = -1; // 最大允许返回 PAGE_SZ_LIMIT 条
	}

@var PAGE_SZ_LIMIT =10000
 */

# ====== functions {{{
class AccessControl
{
	protected $table;
	protected $ac;
	protected $allowedAc = ["add", "get", "set", "del", "query"];
	# for add/set
	protected $readonlyFields = [];
	# for set
	protected $readonlyFields2 = [];
	# for add/set
	protected $requiredFields = [];
	# for set
	protected $requiredFields2 = [];
	# for get/query
	protected $hiddenFields = [];
	# for query
	protected $defaultSort = "t0.id";
	# for query
	protected $maxPageSz = 100;

	# for get/query
	# virtual columns
	protected $vcolDefs = []; 
	protected $subobj = [];

	# 回调函数集。在after中执行（在onAfter回调之后）。
	protected $onAfterActions = [];

	# for get/query
	# 注意：sqlConf["res"/"cond"][0]分别是传入的res/cond参数, sqlConf["orderby"]是传入的orderby参数, 为空(注意用isset/is_null判断)均表示未传值。
	public $sqlConf; // {@cond, @res, @join, orderby, @subobj, @gres}

	// virtual columns
	private $vcolMap; # elem: $vcol => {def, def0, added?, vcolDefIdx?=-1}

	// 在add后自动设置; 在get/set/del操作调用onValidateId后设置。
	protected $id;

	static function create($tbl, $asAdmin = false) 
	{
		/*
		if (!isUserLogin() && !isEmpLogin())
		{
			$wx = getWeixinUser();
			$wx->autoLogin();
		}
		 */
		$cls = null;
		$noauth = 0;
		# note the order.
		if ($asAdmin || isAdminLogin())
		{
			$cls = "AC0_$tbl";
			if (! class_exists($cls))
				$cls = "AccessControl";
		}
		else {
			$cls = onCreateAC($tbl);
			if (!isset($cls)) {
				$cls = "AC_$tbl";
				if (! class_exists($cls))
				{
					$cls = null;
					$noauth = 1;
				}
			}
		}
		if ($cls == null || ! class_exists($cls))
		{
			throw new MyException($noauth? E_NOAUTH: E_FORBIDDEN, "Operation is not allowed for current user on object `$tbl`");
		}
		$x = new $cls;
		$x->table = $tbl;
		return $x;
	}

	final function before($ac)
	{
		if (array_search($ac, $this->allowedAc) === false) {
			throw new MyException(E_FORBIDDEN, "Operation `$ac` is not allowed on object `$this->table`");
		}
		$this->ac = $ac;

		# TODO: check fields in metadata
		# foreach ($_POST as ($field, $val))

		if ($ac == "get" || $ac == "set" || $ac == "del") {
			$this->onValidateId();
			$this->id = mparam("id");
		}
		if ($ac == "add" || $ac == "set") {
			foreach ($this->readonlyFields as $field) {
				if (array_key_exists($field, $_POST)) {
					logit("!!! warn: attempt to change readonly field `$field`");
					unset($_POST[$field]);
				}
			}
			if ($ac == "set") {
				foreach ($this->readonlyFields2 as $field) {
					if (array_key_exists($field, $_POST)) {
						logit("!!! warn: attempt to change readonly field `$field`");
						unset($_POST[$field]);
					}
				}
			}
			if ($ac == "add") {
				foreach ($this->requiredFields as $field) {
// 					if (! issetval($field, $_POST))
// 						throw new MyException(E_PARAM, "missing field `{$field}`", "参数`{$field}`未填写");
					mparam($field, $_POST); // validate field and type; refer to field/type format for mparam.
				}
			}
			else { # for set, the fields can not be set null
				$fs = array_merge($this->requiredFields, $this->requiredFields2);
				foreach ($fs as $field) {
					if (is_array($field)) // TODO
						continue;
					if (array_key_exists($field, $_POST) && ( ($v=$_POST[$field]) === "null" || $v === "" || $v==="empty" )) {
						throw new MyException(E_PARAM, "{$this->table}.set: cannot set field `$field` to null.", "字段`$field`不允许置空");
					}
				}
			}
			$this->onValidate();
		}
		elseif ($ac == "get" || $ac == "query") {
			$gres = param("gres");
			$res = param("res");
			$this->sqlConf = [
				"res" => [$res],
				"gres" => $gres,
				"cond" => [param("cond")],
				"join" => [],
				"orderby" => param("orderby"),
				"subobj" => [],
				"union" => param("union"),
				"distinct" => param("distinct")
			];

			$this->initVColMap();

			# support internal param res2/join/cond2
			if (($res2 = param("res2")) != null) {
				if (! is_array($res2))
					throw new MyException(E_SERVER, "res2 should be an array: `$res2`");
				foreach ($res2 as $e)
					$this->addRes($e);
			}
			if (($join=param("join")) != null) {
				$this->addJoin($join);
			}
			if (($cond2 = param("cond2")) != null) {
				if (! is_array($cond2))
					throw new MyException(E_SERVER, "cond2 should be an array: `$cond2`");
				foreach ($cond2 as $e)
					$this->addCond($e);
			}
			if (($subobj = param("subobj")) != null) {
				if (! is_array($subobj))
					throw new MyException(E_SERVER, "subobj should be an array");
				$this->sqlConf["subobj"] = $subobj;
			}
			$this->fixUserQuery();

			$this->onQuery();

			// 确保res/gres参数符合安全限定
			if (isset($gres)) {
				$this->filterRes($gres);
			}
			if (isset($res)) {
				$this->filterRes($res, true);
			}
			else {
				$this->addDefaultVCols();
				if (count($this->sqlConf["subobj"]) == 0)
					$this->sqlConf["subobj"] = $this->subobj;
			}
			if ($ac == "query")
			{
				$rv = $this->supportEasyuiSort();
				if (isset($this->sqlConf["orderby"]) && !isset($this->sqlConf["union"]))
					$this->sqlConf["orderby"] = $this->filterOrderby($this->sqlConf["orderby"]);
			}
		}
	}
	final function after(&$ret) 
	{
		$ac = $this->ac;
		if ($ac === "get") {
			$this->handleRow($ret);
		}
		else if ($ac === "query") {
			foreach ($ret as &$ret1) {
				$this->handleRow($ret1);
			}
		}
		else if ($ac === "add") {
			$this->id = $ret;
		}
		$this->onAfter($ret);

		foreach ($this->onAfterActions as $fn)
		{
			# NOTE: php does not allow call $this->onAfterActions();
			$fn();
		}
	}
	final public function genId()
	{
		return $this->onGenId();
	}
	final public function getDefaultSort()
	{
		return $this->defaultSort;
	}
	final public function getMaxPageSz()
	{
		return $this->maxPageSz <0? PAGE_SZ_LIMIT: $this->maxPageSz;
	}

	private function handleRow(&$rowData)
	{
		foreach ($this->hiddenFields as $field) {
			unset($rowData[$field]);
		}
		if (isset($rowData["pwd"]))
			$rowData["pwd"] = "****";
		flag_handleResult($rowData);
		$this->onHandleRow($rowData);
	}

	# for query. "field1"=>"t0.field1"
	private function fixUserQuery()
	{
		if (isset($this->sqlConf["cond"][0])) {
			if (stripos($this->sqlConf["cond"][0], "select") !== false) {
				throw new MyException(E_SERVER, "forbidden SELECT in param cond");
			}
			# "aa = 100 and t1.bb>30 and cc IS null" -> "t0.aa = 100 and t1.bb>30 and t0.cc IS null" 
			$this->sqlConf["cond"][0] = preg_replace_callback('/[\w|.]+(?=(\s*[=><]|(\s+(IS|LIKE))))/i', function ($ms) {
				// 't0.$0' for col, or 'voldef' for vcol
				$col = $ms[0];
				if (strpos($col, '.') !== false)
					return $col;
				if (isset($this->vcolMap[$col])) {
					$this->addVCol($col, false, "-");
					return $this->vcolMap[$col]["def"];
				}
				return "t0." . $col;
			}, $this->sqlConf["cond"][0]);
		}
	}
	private function supportEasyuiSort()
	{
		// support easyui: sort/order
		if (isset($_REQUEST["sort"]))
		{
			$orderby = $_REQUEST["sort"];
			if (isset($_REQUEST["order"]))
				$orderby .= " " . $_REQUEST["order"];
			$this->sqlConf["orderby"] = $orderby;
		}
	}
	// return: new field list
	private function filterRes($res, $supportFn=false)
	{
		$firstCol = "";
		foreach (explode(',', $res) as $col) {
			$col = trim($col);
			$alias = null;
			$fn = null;
			if ($col === "*") {
				$firstCol = "t0.*";
				continue;
			}
			// 适用于res/gres, 支持格式："col" / "col col1" / "col as col1"
			if (! preg_match('/^\s*(\w+)(?:\s+(?:AS\s+)?(\S+))?\s*$/i', $col, $ms))
			{
				// 对于res, 还支持部分函数: "fn(col) as col1", 目前支持函数: count/sum
				if ($supportFn && preg_match('/(\w+)\([a-z0-9_.\'*]+\)\s+(?:AS\s+)?(\S+)/i', $col, $ms)) {
					list($fn, $alias) = [strtoupper($ms[1]), $ms[2]];
					if ($fn != "COUNT" && $fn != "SUM")
						throw new MyException(E_FORBIDDEN, "function not allowed: `$fn`");
				}
				else 
					throw new MyException(E_PARAM, "bad property `$col`");
			}
			else {
				if ($ms[2]) {
					$col = $ms[1];
					$alias = $ms[2];
				}
			}
			if (isset($alias) && $alias[0] != '"') {
				$alias = '"' . $alias . '"';
			}
			if (isset($fn)) {
				$this->addRes($col);
				continue;
			}

// 			if (! ctype_alnum($col))
// 				throw new MyException(E_PARAM, "bad property `$col`");
			if ($this->addVCol($col, true, $alias) === false) {
				if (array_key_exists($col, $this->subobj)) {
					$this->sqlConf["subobj"][$alias ?: $col] = $this->subobj[$col];
				}
				else {
					$col = "t0." . $col;
					if (isset($alias)) {
						$col .= " AS {$alias}";
					}
					$this->addRes($col, false);
				}
			}
		}
		$this->sqlConf["res"][0] = $firstCol;
	}

	private function filterOrderby($orderby)
	{
		$colArr = [];
		foreach (explode(',', $orderby) as $col) {
			if (! preg_match('/^\s*(\w+\.)?(\w+)(\s+(asc|desc))?$/i', $col, $ms))
				throw new MyException(E_PARAM, "bad property `$col`");
			if ($ms[1]) // e.g. "t0.id desc"
			{
				$colArr[] = $col;
				continue;
			}
			$col = preg_replace_callback('/^\s*(\w+)/', function ($ms) {
				$col1 = $ms[1];
				if ($this->addVCol($col1, true, '-') !== false)
					return $col1;
				return "t0." . $col1;
			}, $col);
			$colArr[] = $col;
		}
		return join(",", $colArr);
	}

	final public function issetRes()
	{
		return isset($this->sqlConf["res"][0]);
	}
	final public function issetCond()
	{
		return isset($this->sqlConf["cond"][0]);
	}

/**
@fn AccessControl::addRes($res, $analyzeCol=true)

添加列或计算列. 

注意: 
- analyzeCol=true时, addRes("col"); -- (analyzeCol=true) 添加一列, 注意:如果列是一个虚拟列(在vcolDefs中有定义), 不能指定alias, 且vcolDefs中同一组Res中所有定义的列都会加入查询; 如果希望只加一列且能定义alias, 可调用addVCol函数.
- addRes("col+1 as col1", false); -- 简单地新定义一个计算列, as可省略

@see AccessControl::addCond 其中有示例
@see AccessControl::addVCol 添加已定义的虚拟列。
 */
	final public function addRes($res, $analyzeCol=true)
	{
		$this->sqlConf["res"][] = $res;
		if ($analyzeCol)
			$this->setColFromRes($res, true);
	}

/**
@fn AccessControl::addCond($cond, $prepend=false)

@param $prepend 为true时将条件排到前面。

调用多次addCond时，多个条件会依次用"AND"连接起来。

添加查询条件。
示例：假如设计有接口：

	Ordr.query(q?) -> tbl(..., payTm?)
	参数：
	q:: 查询条件，值为"paid"时，查询10天内已付款的订单。且结果会多返回payTm/付款时间字段。

实现时，在onQuery中检查参数"q"并定制查询条件：

	protected function onQuery()
	{
		// 限制只能看用户自己的订单
		$uid = $_SESSION["uid"];
		$this->addCond("t0.userId=$uid");

		$q = param("q");
		if (isset($q) && $q == "paid") {
			$validDate = date("Y-m-d", strtotime("-9 day"));
			$this->addRes("olpay.tm payTm");
			$this->addJoin("INNER JOIN OrderLog olpay ON olpay.orderId=t0.id");
			$this->addCond("olpay.action='PA' AND olpay.tm>'$validDate'");
		}
	}

@see AccessControl::addRes
@see AccessControl::addJoin
 */
	final public function addCond($cond, $prepend=false)
	{
		if ($prepend)
			array_unshift($this->sqlConf["cond"], $cond);
		else
			$this->sqlConf["cond"][] = $cond;
	}

	/**
@fn AccessControl::addJoin(joinCond)

添加Join条件.

@see AccessControl::addCond 其中有示例
	 */
	final public function addJoin($join)
	{
		$this->sqlConf["join"][] = $join;
	}

	private function setColFromRes($res, $added, $vcolDefIdx=-1)
	{
		if (preg_match('/^(\w+)\.(\w+)$/', $res, $ms)) {
			$colName = $ms[2];
			$def = $res;
		}
		else if (preg_match('/^(.*?)\s+(?:as\s+)?(\w+)\s*$/is', $res, $ms)) {
			$colName = $ms[2];
			$def = $ms[1];
		}
		else
			throw new MyException(E_SERVER, "bad res definition: `$res`");

		if (array_key_exists($colName, $this->vcolMap)) {
			if ($added && $this->vcolMap[ $colName ]["added"])
				throw new MyException(E_SERVER, "res for col `$colName` has added: `$res`");
			$this->vcolMap[ $colName ]["added"] = true;
		}
		else {
			$this->vcolMap[ $colName ] = ["def"=>$def, "def0"=>$res, "added"=>$added, "vcolDefIdx"=>$vcolDefIdx];
		}
	}

	private function initVColMap()
	{
		if (is_null($this->vcolMap)) {
			$this->vcolMap = [];
			$idx = 0;
			foreach ($this->vcolDefs as $vcolDef) {
				foreach ($vcolDef["res"] as $e) {
					$this->setColFromRes($e, false, $idx);
				}
				++ $idx;
			}
		}
	}

/**
@fn AccessControl::addVCol($col, $ignoreError=false, $alias=null)

@param $col 必须是一个英文词, 不允许"col as col1"形式; 该列必须在 vcolDefs 中已定义.
@param $alias 列的别名。可以中文. 特殊字符"-"表示不加到最终res中(只添加join/cond等定义), 由addVColDef内部调用时使用.
@return Boolean T/F

用于AccessControl子类添加已在vcolDefs中定义的vcol. 一般应先考虑调用addRes(col)函数.

@see AccessControl::addRes
 */
	protected function addVCol($col, $ignoreError = false, $alias = null)
	{
		if (! isset($this->vcolMap[$col])) {
			if (!$ignoreError)
				throw new MyException(E_SERVER, "unknown vcol `$col`");
			return false;
		}
		if ($this->vcolMap[$col]["added"])
			return true;
		$this->addVColDef($this->vcolMap[$col]["vcolDefIdx"], true);
		if ($alias) {
			if ($alias !== "-")
				$this->addRes($this->vcolMap[$col]["def"] . " AS {$alias}", false);
		}
		else {
			$this->addRes($this->vcolMap[$col]["def0"], false);
		}
		return true;
	}

	private function addDefaultVCols()
	{
		$idx = 0;
		foreach ($this->vcolDefs as $vcolDef) {
			if (@$vcolDef["default"]) {
				$this->addVColDef($idx);
			}
			++ $idx;
		}
	}

	private function addVColDef($idx, $dontAddRes = false)
	{
		if ($idx < 0 || @$this->vcolDefs[$idx]["added"])
			return;
		$this->vcolDefs[$idx]["added"] = true;

		$vcolDef = $this->vcolDefs[$idx];
		if (! $dontAddRes) {
			foreach ($vcolDef["res"] as $e) {
				$this->addRes($e);
			}
		}
		if (isset($vcolDef["require"]))
		{
			$requireCol = $vcolDef["require"];
			$this->addVCol($requireCol, false, "-");
		}
		if (isset($vcolDef["join"]))
			$this->addJoin($vcolDef["join"]);
		if (isset($vcolDef["cond"]))
			$this->addCond($vcolDef["cond"]);
	}

	protected function onValidate()
	{
	}
	protected function onValidateId()
	{
	}
 	protected function onHandleRow(&$rowData)
 	{
 	}
	protected function onAfter(&$ret)
	{
	}
	protected function onQuery()
	{
	}
	protected function onGenId()
	{
		return 0;
	}
}

function issetval($k, $arr = null)
{
	if ($arr === null)
		$arr = $_POST;
	return isset($arr[$k]) && $arr[$k] !== "";
}
# }}}
//}}}

// ====== main routine {{{
function apiMain()
{
	$script = basename($_SERVER["SCRIPT_NAME"]);
	ApiFw_::$SOLO = ($script == API_ENTRY_PAGE || $script == 'index.php');
	if (ApiFw_::$SOLO) {
		$api = new ApiApp();
		$api->exec();
	}
}

class BatchApiApp extends AppBase
{
	protected $apiApp;
	protected $useTrans;

	public $ac;

	function __construct($apiApp, $useTrans)
	{
		$this->apiApp = $apiApp;
		$this->useTrans = $useTrans;
	}

	protected function onExec()
	{
		$this->apiApp->call($this->ac, !$this->useTrans);
	}

	protected function onErr($code, $msg, $msg2)
	{
		setRet($code, $msg, $msg2);
	}

	protected function onAfter($ok)
	{
		global $X_RET_STR;
		global $g_dbgInfo;
		$X_RET_STR = null;
		$g_dbgInfo = [];
	}

	static function handleBatchRef($ref, $retVal)
	{
		foreach ($ref as $k) {
			if (isset($_GET[$k])) {
				$_GET[$k] = self::calcRefValue($_GET[$k], $retVal);
			}
			if (isset($_POST[$k])) {
				$_POST[$k] = self::calcRefValue($_POST[$k], $retVal);
			}
		}
	}

	// 原理：
	// "{$n.id}" => "$f(n)["id"]"
	// 如果计算错误，则返回NULL
	private static function calcRefValue($val, $arr)
	{
		$f = function ($n) use ($arr) {
			if ($n <= 0)
				$n = count($arr) + $n;
			else 
				$n -= 1;
			@$e = $arr[$n];
			if (! isset($e) || $e[0] != 0)
				return;
			
			return $e[1];
		};

		$calcOne = function ($expr) use ($f) {
			$expr1 = preg_replace_callback('/\$(-?\d+)|\.(\w+)/', function ($ms) use ($f) {
				@list ($m, $n, $prop) = $ms;
				$ret = null;
				if ($n != null) {
					$ret = "\$f({$n})";
				}
				else if ($prop != null) {
					$ret = "[\"{$prop}\"]";
				}
				return $ret;
			}, $expr);
			$rv = eval("return @({$expr1});");
			return $rv;
		};
		
		$v1 = preg_replace_callback('/\{(.+?)\}/', function ($ms) use ($calcOne) {
			$expr = $ms[1];
			$rv = $calcOne($expr);
			if (!isset($rv))
				$rv = "null";
			return $rv;
		}, $val);
		addLog("### batch ref: `{$val}' -> `{$v1}'");
		return $v1;
	}
}

class ApiApp extends AppBase
{
	private $apiLog;
	private $apiWatch;
	protected function onExec()
	{
		if (! isCLI())
		{
			if (ApiFw_::$SOLO)
			{
				header("Content-Type: text/plain; charset=UTF-8");
				#header("Content-Type: application/json; charset=UTF-8");
			}
			header("Cache-Control: no-cache");
		}
		setServerRev();

		// 支持PATH_INFO模式。
		@$path = $this->getPathInfo();
		if ($path != null)
		{
			$ac = $this->parseRestfulUrl($path);
		}
		if (! isset($ac)) {
			list($ac, $ac1) = mparam(['ac', '_ac'], $_GET);
			if (is_null($ac))
				$ac = $ac1;
		}

		Conf::onApiInit();

		dbconn();

		global $DBH;
		if (! isCLI())
			session_start();

		$this->apiLog = new ApiLog($ac);
		$this->apiLog->logBefore();

		// API调用监控
		$this->apiWatch = new ApiWatch($ac);
		$this->apiWatch->execute();

		if ($ac == "batch") {
			$useTrans = param("useTrans", false, $_GET);
			$ret = $this->batchCall($useTrans);
		}
		else {
			$ret = $this->call($ac, true);
		}

		return $ret;
	}

	protected function batchCall($useTrans)
	{
		$method = $_SERVER["REQUEST_METHOD"];
		if ($method !== "POST")
			throw new MyException(E_PARAM, "batch MUST use `POST' method");

		$s = file_get_contents("php://input");
		$calls = json_decode($s, true);
		if (! is_array($calls))
			throw new MyException(E_PARAM, "bad batch request");

		global $DBH;
		global $X_RET;
		// 以下过程不允许抛出异常
		$batchApiApp = new BatchApiApp($this, $useTrans);
		if ($useTrans && !$DBH->inTransaction())
			$DBH->beginTransaction();
		$solo = ApiFw_::$SOLO;
		ApiFw_::$SOLO = false;
		$retVal = [];
		$retCode = 0;
		$GLOBALS["errorFn"] = function () {};
		foreach ($calls as $call) {
			if ($useTrans && $retCode) {
				$retVal[] = [E_ABORT, "事务失败，取消执行", "batch call cancelled."];
				continue;
			}
			if (! isset($call["ac"])) {
				$retVal[] = [E_PARAM, "参数错误", "bad batch request: require `ac'"];
				continue;
			}

			$_GET = $call["get"] ?: [];
			$_POST = $call["post"] ?: [];
			if ($call["ref"]) {
				if (! is_array($call["ref"])) {
					$retVal[] = [E_PARAM, "参数错误", "batch `ref' should be array"];
					continue;
				}
				BatchApiApp::handleBatchRef($call["ref"], $retVal);
			}
			$_REQUEST = array_merge($_GET, $_POST);

			$batchApiApp->ac = $call["ac"];
			// 如果batch使用trans, 则单次调用不用trans
			$batchApiApp->exec(! $useTrans);

			$retCode = $X_RET[0];
			if ($retCode && $useTrans) {
				if ($DBH && $DBH->inTransaction())
				{
					$DBH->rollback();
				}
			}
			$retVal[] = $X_RET;
		}
		if ($useTrans && $DBH && $DBH->inTransaction())
			$DBH->commit();
		ApiFw_::$SOLO = $solo;
		setRet(0, $retVal);
		return $retVal;
	}

	// 将被BatchApiApp调用
	public function call($ac, $useTrans)
	{
		global $DBH;
		if ($useTrans && ! $DBH->inTransaction())
			$DBH->beginTransaction();
		$fn = "api_$ac";
		if (preg_match('/^(\w+)\.(add|set|get|del|query)$/', $ac, $ms)) {
			$tbl = $ms[1];
			# TODO: check meta
			if (! preg_match('/^\w+$/', $tbl))
				throw new MyException(E_PARAM, "bad table {$tbl}");
			$ac1 = $ms[2];
			$ret = tableCRUD($ac1, $tbl);
		}
		elseif (function_exists($fn)) {
			$ret = $fn();
		}
		else {
			throw new MyException(E_PARAM, "Bad request - unknown ac: {$ac}");
		}
		if ($useTrans && $DBH && $DBH->inTransaction())
			$DBH->commit();
		if (!isset($ret))
			$ret = "OK";
		setRet(0, $ret);
		return $ret;
	}

	protected function onErr($code, $msg, $msg2)
	{
		setRet($code, $msg, $msg2);
	}

	protected function onAfter($ok)
	{
		if ($this->apiWatch)
			$this->apiWatch->postExecute();
		if ($this->apiLog)
			$this->apiLog->logAfter();

		// 及时关闭数据库连接
		global $DBH;
		$DBH = null;
	}

	private function getPathInfo()
	{
		$pi = $_SERVER["PATH_INFO"];
		if ($pi === null) {
			# 支持rewrite后解析pathinfo
			$uri = $_SERVER["REQUEST_URI"];
			if (strpos($uri, '.php') === false) {
				$uri = preg_replace('/\?.*$/', '', $uri);
				$baseUrl = getBaseUrl(false);

				# uri=/jdy/api/login -> pi=/login
				# uri=/jdy/login -> pi=/login
				if (strpos($uri, $baseUrl) === 0) {
					$script = basename($_SERVER["SCRIPT_NAME"], '.php'); // "api"
					$len = strlen($baseUrl);
					if (strpos($uri, $baseUrl . $script) === 0)
						$len += strlen($script);
					else
						-- $len;
					if ($len>0) // "/jdy/api" or "/jdy"
						$pi = substr($uri, $len);
				}
			}
		}
		return $pi;
	}
	// return: $ac
	private function parseRestfulUrl($pathInfo)
	{
		$method = $_SERVER["REQUEST_METHOD"];
		$ac = htmlEscape(substr($pathInfo,1));
		// POST /login  (小写开头)
		// GET/POST /Store.add (含.)
		if (ctype_lower($ac[0]) || strpos($ac, '.') !== false)
		{
			if ($method !== 'GET' && $method !== 'POST')
				throw new MyException(E_PARAM, "bad verb '$method'. use 'GET' or 'POST'");
			return $ac;
		}

		// {obj}/{id}
		@list ($obj, $id) = explode('/', $ac, 2);
		if ($id === "")
			$id = null;

		if (isset($id)) {
			if (! ctype_digit($id))
				throw new MyException(E_PARAM, "bad id: $id");
			setParam('id', $id);
		}

		switch ($method) {

		// GET /Store/123
		// GET /Store
		case 'GET':
			if (isset($id))
				$ac = 'get';
			else
				$ac = 'query';
			break;

		// POST /Store
		case 'POST':
			if (isset($id))
				throw new MyException(E_PARAM, "bad verb '$method' on id: $id");
			$ac = 'add';
			break;

		// PATCH /Store/123
		case 'PATCH':
			if (! isset($id))
				throw new MyException(E_PARAM, "missing id");
			$ac = 'set';
			break;

		// DELETE /Store/123
		case 'DELETE':
			if (! isset($id))
				throw new MyException(E_PARAM, "missing id");
			$ac = 'del';
			break;

		default:
			throw new MyException(E_PARAM, "bad verb '$method'");
		}
		return "{$obj}.{$ac}";
	}
}

/**
@fn callSvc($ac?, $urlParam?, $postParam?, $cleanCall?=false, $hideResult?=false)

直接调用接口，返回数据。如果出错，将调用$GLOBALS['errorFn'] (缺省为errQuit).

@param $cleanCall Boolean. 如果为true, 则不使用现有的$_GET, $_POST等变量中的值。
@param $hideResult Boolean. 如果为true, 不输出结果。
 */
function callSvc($ac = null, $urlParam = null, $postParam = null, $cleanCall = false, $hideResult = false)
{
	global $DBH; // 避免api->exec完成后关闭数据库连接
	$bak = [$_GET, $_POST, $_REQUEST, ApiFw_::$SOLO, $DBH];

	if ($cleanCall) {
		$_GET = [];
		$_POST = [];
		$_REQUEST = [];
	}
	if ($ac)
		$_GET["_ac"] = $ac;
	if ($urlParam) {
		foreach ($urlParam as $k=>$v) {
			setParam($k, $v);
		}
	}
	if ($postParam) {
		foreach ($postParam as $k=>$v) {
			$_POST[$k] = $v;
		}
	}
	if ($hideResult) {
		ApiFw_::$SOLO = false;
	}

	$api = new ApiApp();
	$ret = $api->exec();

	global $X_RET_STR;
	$X_RET_STR = null;
	list($_GET, $_POST, $_REQUEST, ApiFw_::$SOLO, $DBH) = $bak;
	return $ret;
}
#}}}

// vim: set foldmethod=marker :
?>
