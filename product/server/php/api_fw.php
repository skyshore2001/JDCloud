<?php

#error_reporting(E_ALL & (~(E_NOTICE|E_USER_NOTICE)));
error_reporting(E_ALL & ~E_NOTICE);

/** @module api_fw

被api.php包含并执行：

	require_once("app.php");
	require_once("php/api_fw.php");
	...
	apiMain();

可使用addLog输出调试信息而不破坏协议输出格式。
addLog(str, 0) means always output.

api.php可以单独执行，也可直接被调用，如

	// set_include_path(get_include_path() . PATH_SEPARATOR . "..");
	require_once("api.php");
	...
	$GLOBALS["errorFn"] = function($code, $msg, $msg2=null) {...}
	$ret = callSvc("genVoucher");
	// 如果没有异常，返回数据；否则调用指定的errorFn函数(未指定则调用errQuit)

*/

// ====== config {{{
const API_ENTRY_PAGE = "api.php";

global $X_RET; // maybe set by the caller
global $X_RET_STR;

// }}}

// ====== ApiFw_: module internals {{{

class ApiFw_
{
	static $SOLO;
}
//}}}

// ====== functions {{{
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
		$type = preg_replace('/\d+$/', '', $APP);
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
		if (! is_int($userId))
			$userId = 'NULL';
		$content = $this->myVarExport($_GET, 1000);
		$content2 = $this->myVarExport($_POST);
		if ($content2 != "")
			$content .= "; " . $content2;
		$remoteAddr = @$_SERVER['REMOTE_ADDR'] ?: 'unknown';
		$reqsz = strlen($_SERVER["REQUEST_URI"]) + (@$_SERVER["HTTP_CONTENT_LENGTH"]?:$_SERVER["CONTENT_LENGTH"]?:0);
		$ua = $_SERVER["HTTP_USER_AGENT"];
		$ver = getClientVersion();

		$sql = sprintf("INSERT INTO ApiLog (tm, addr, ua, app, ses, userId, ac, req, reqsz, ver) VALUES (%s, %s, %s, %s, %s, $userId, %s, %s, $reqsz, %s)", 
			Q(date("c")), Q($remoteAddr), Q($ua), Q($APP), Q(session_id()), Q($this->ac), Q($content), Q($ver["str"])
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
	$sql = mparam("sql");
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
			$values .= Q($v);
		}
		if (strlen($keys) == 0) 
			throw new MyException(E_PARAM, "no field found to be added");
		$sql = sprintf("INSERT INTO %s (%s) VALUES (%s)", $tbl, $keys, $values);
#			var_dump($sql);
		$id = execOne($sql, true);
		$ret = $id;
	}
	elseif ($ac1 == "set") {
		$id = mparam("id", $_GET);
		$kv = "";
		foreach ($_POST as $k=>$v) {
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
				$kv .= "$k=" . Q($v);
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
					$enableParialQuery = false;
				}
			}
			if ($pagesz == 0)
				$pagesz = 20;
		}

		$orderSql = $sqlConf["orderby"];

		// setup cond for parialQuery
		if ($enablePaging) {
			if ($orderSql == null)
				$orderSql = "t0.id";

			if (!isset($enableTotalCnt))
			{
				$enableTotalCnt = false;
				if ($pagekey === 0)
					$enableTotalCnt = true;
			}

			// 如果未指定orderby或只用了id(以后可放宽到唯一性字段), 则可以用parialQuery机制(性能更好更精准), _pagekey表示该字段的最后值；否则_pagekey表示下一页页码。
			if (!isset($enableParialQuery)) {
				$enableParialQuery = false;
			    if (preg_match('/^(t0\.)?id\b/', $orderSql)) {
					$enableParialQuery = true;
					if ($pagekey) {
						if (preg_match('/\bid DESC/i', $orderSql)) {
							$parialQueryCond = "t0.id<$pagekey";
						}
						else {
							$parialQueryCond = "t0.id>$pagekey";
						}
						// setup res for parialQuery
						if ($parialQueryCond) {
// 							if (isset($sqlConf["res"][0]) && !preg_match('/\bid\b/',$sqlConf["res"][0])) {
// 								array_unshift($sqlConf["res"], "t0.id");
// 							}
							array_unshift($sqlConf["cond"], $parialQueryCond);
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

		$tblSql = "$tbl t0";
		if (count($sqlConf["join"]) > 0)
			$tblSql .= " " . join(" ", $sqlConf["join"]);
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
			$sql .= " WHERE $condSql";
		}

		if ($orderSql)
			$sql .= " ORDER BY " . $orderSql;

		if ($enablePaging) {
			if ($enableTotalCnt) {
				$cntSql = "SELECT COUNT(*) FROM $tblSql";
				if ($condSql)
					$cntSql .= " WHERE $condSql";
				$totalCnt = queryOne($cntSql);
			}

			if ($enableParialQuery) {
				$sql .= " LIMIT " . $pagesz;
			}
			else {
				$sql .= " LIMIT " . ($pagekey-1)*$pagesz . "," . $pagesz;
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
					if ($enableParialQuery) {
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
@module AccessControl framework

for access control and autocomplete for objects 

====== AccessControl framework

	class AC_Object for guest
	class AC0_Object for admin
	class AC1_Object for user
	class AC2_Object for store
	if no AC0_Object, use AccessControl instead (for admin)
	if no AC1/AC2 object, use AC_Object (as guest)

	# define allowed actions.
	# Default: to allow all.
	protected $allowedAc = ["add", "get", "set", "del", "query"];

	# for add/set. Such fields cannot be modified via add/set. warning is logged if set such fields.
	# "id" is always readonly, not required in this array.
	# 添加/更新时填值无效（但暂不报错）
	protected $readonlyFields = [];
	# for set. 更新时对这些字段填值无效
	protected $readonlyFields2 = [];

	# for add/set. 添加时必须填值；更新时不允许置空。
	protected $requiredFields = [];
	# for set. 更新时不允许设置空
	protected $requiredFields2 = [];

	# for get/query
	protected $hiddenFields = [];

	# for get/query: vcolDefs, subobj
	# 如果查询指定了res参数，则分析每一列，它可能是普通列名(col)/虚拟列名(vcol)/子对象(subobj)名

	# for get/query, virtual columns. vcol: {res=@colDefList, join?, cond?, default?=false}
	# default: 为true表示，当Query未指定res参数时，自动加上该项.
	protected $vcolDefs = [];

	# for get/query
	protected $subobj = [];
	
	# for add/set. validate or auto complete fields
	protected function onValidate();

	# for get/set/del, validate or auto complete field "id"
	protected function onValidateId();

	# for get/query, add query fields or conditions
	protected function onQuery();

	# for get/query, reset or unset some fields; for add/set/del, operate other tables, etc.
	# protected function onAfter(&$ret);

	# onAfter的替代方案，更易使用，可以在onValidateId/onValidate中直接添加回调函数。
	protected $onAfterActions = [];

	# for get/query, reset or unset some fields; run before onAfter.
 	# protected function onHandleRow(&$rowData);

	# for add. 指定添加对象时生成的id. 缺省返回0表示自动生成.
	protected function onGenId();
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

	# for get/query
	# virtual columns
	protected $vcolDefs = []; 
	protected $subobj = [];

	# 回调函数集。在after中执行（在onAfter回调之后）。
	protected $onAfterActions = [];

	# for get/query
	# 注意：sqlConf["res"/"cond"][0]分别是传入的res/cond参数, sqlConf["orderby"]是传入的orderby参数, 为空(注意用isset/is_null判断)均表示未传值。
	public $sqlConf; // {@cond, @res, @join, orderby, @subobj}

	// virtual columns
	private $vcolMap; # elem: $vcol => {def, def0, added?, vcolDefIdx?=-1}

	static function create($tbl, $asAdmin = false) 
	{
		if (!isUserLogin() && !isEmpLogin())
		{
			$wx = getWeixinUser();
			$wx->autoLogin();
		}
		$cls = null;
		$noauth = 0;
		# note the order.
		if ($asAdmin || isAdminLogin())
		{
			$cls = "AC0_$tbl";
			if (! class_exists($cls))
				$cls = "AccessControl";
		}
		else if (isUserLogin())
		{
			$cls = "AC1_$tbl";
			if (! class_exists($cls))
				$cls = "AC_$tbl";
		}
		else if (isStoreLogin())
		{
			$cls = "AC2_$tbl";
		}
		else  {
			$cls = "AC_$tbl";
			if (! class_exists($cls))
			{
				$cls = null;
				$noauth = 1;
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
			$res = param("res");
			$this->sqlConf = [
				"res" => [$res],
				"cond" => [param("cond")],
				"join" => [],
				"orderby" => param("orderby"),
				"subobj" => [],
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

			if (isset($res)) {
				$this->sqlConf["res"][0] = $this->filterRes($res);
			}
			else {
				$this->addDefaultVCols();
				if (count($this->sqlConf["subobj"]) == 0)
					$this->sqlConf["subobj"] = $this->subobj;
			}
			if ($ac == "query")
			{
				$rv = $this->supportEasyuiSort();
				if (isset($this->sqlConf["orderby"]))
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
			# "aa = 100 and bb>30 and cc IS null" -> "t0.aa = 100 and t0.bb>30 and t0.cc IS null" 
			$this->sqlConf["cond"][0] = preg_replace_callback('/\w+(?=(\s*[=><]|(\s+(IS|LIKE))))/i', function ($ms) {
				// 't0.$0' for col, or 'voldef' for vcol
				$col = $ms[0];
				if (isset($this->vcolMap[$col])) {
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
	private function filterRes($res)
	{
		$colArr = [];
		foreach (explode(',', $res) as $col) {
			$col = trim($col);
			$alias = null;
			if ($col === "*") {
				$colArr[] = "t0.*";
				continue;
			}
			// "col" / "col col1" / "col as col1"
			if (! preg_match('/(\w+)(?:\s+(?:as\s+)?(\S+))?/i', $col, $ms))
				throw new MyException(E_PARAM, "bad property `$col`");
			if ($ms[2]) {
				$col = $ms[1];
				$alias = $ms[2];
				if ($alias[0] != '"') {
					$alias = '"' . $alias . '"';
				}
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
					$colArr[] = $col;
				}
			}
		}
		return join(",", $colArr);
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
				if ($this->addVCol($col1, true) !== false)
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

	// 可用于在AccessControl子类中添加列或计算列. 
	// 注意: analyzeCol=true时, 
	// addRes("col"); -- (analyzeCol=true) 添加一列, 注意:如果列是一个虚拟列(在vcolDefs中有定义), 不能指定alias, 且vcolDefs中同一组Res中所有定义的列都会加入查询; 如果希望只加一列且能定义alias, 可调用addVCol函数.
	// addRes("col+1 as col1", false); -- 简单地新定义一个计算列, as可省略
	final public function addRes($res, $analyzeCol=true)
	{
		$this->sqlConf["res"][] = $res;
		if ($analyzeCol)
			$this->setColFromRes($res, true);
	}
	final public function addCond($cond, $prepend=false)
	{
		if ($prepend)
			array_unshift($this->sqlConf["cond"], $cond);
		else
			$this->sqlConf["cond"][] = $cond;
	}
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
		else if (preg_match('/^(.*?)\s+(?:as\s+)?(\w+)\s*$/i', $res, $ms)) {
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

	// return: T/F
	// 可用于AccessControl子类添加已在vcolDefs中定义的vcol. 一般应先考虑调用addRes(col)函数.
	// $col: 必须是一个英文词, 不允许"col as col1"形式; 该列必须在 vcolDefs 中已定义.
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
	ApiFw_::$SOLO = basename($_SERVER["SCRIPT_NAME"]) == API_ENTRY_PAGE;
	if (ApiFw_::$SOLO) {
		$api = new ApiApp();
		$api->exec();
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

		// 支持PATH_INFO模式。
		@$path = $_SERVER["PATH_INFO"];
		if ($path != null)
		{
			// e.g. "/api.php/login" -> ac="login"
			$ac = str_replace("/", ".", substr($path,1));
		}
		if (! isset($ac)) {
			list($ac, $ac1) = mparam(['ac', '_ac'], $_GET);
			if (is_null($ac))
				$ac = $ac1;
		}

		Conf::onApiInit();

		dbconn();

		if (! isCLI())
			session_start();

		$this->apiLog = new ApiLog($ac);
		$this->apiLog->logBefore();

		// API调用监控
		$this->apiWatch = new ApiWatch($ac);
		$this->apiWatch->execute();

		global $DBH;
		$DBH->beginTransaction();
		$fn = "api_$ac";
		if (preg_match('/^(\w+)\.(add|set|get|del|query)$/', $ac, $ms)) {
			$tbl = $ms[1];
			# TODO: check meta
			if (! preg_match('/^\w+$/', $tbl))
				throw new MyException(E_PARAM, "bad table $k");
			$ac1 = $ms[2];
			$ret = tableCRUD($ac1, $tbl);
		}
		elseif (function_exists($fn)) {
			$ret = $fn();
		}
		else {
			throw new MyException(E_PARAM, "Bad request - unknown ac: $ac");
		}
		$DBH->commit();
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
	}
}

function callSvc($ac, $xparam = null)
{
	$_GET["_ac"] = $ac;
	if ($xparam) {
		foreach ($xparam as $k=>$v) {
			setParam($k, $v);
		}
	}

	$api = new ApiApp();
	$ret = $api->exec();
	return $ret;
}
#}}}

// vim: set foldmethod=marker :
?>
