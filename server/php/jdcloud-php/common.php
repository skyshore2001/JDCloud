<?php

define("T_HOUR", 3600);
define("T_DAY", 24*T_HOUR);
define("FMT_DT", "Y-m-d H:i:s");
define("FMT_D", "Y-m-d");
// const T_DAY = 24*T_HOUR; // not allowed

# error code definition:
const E_ABORT = -100; // 静默忽略本次调用。客户端收到时应中止执行，但不报错。
const E_EXT = -2; // 与第3方接口对接出错
const E_AUTHFAIL=-1;
const E_OK=0;
const E_PARAM=1;
const E_NOAUTH=2;
const E_DB=3;
const E_SERVER=4;
const E_FORBIDDEN=5;

global $ERRINFO;
$ERRINFO = [
	E_AUTHFAIL => "认证失败",
	E_PARAM => "参数不正确",
	E_NOAUTH => "未登录",
	E_DB => "数据库错误",
	E_SERVER => "服务器错误",
	E_FORBIDDEN => "禁止操作",
	E_ABORT => "中止执行",
	E_EXT => "接口调用错误"
];

/** 
@class MyException($code, $internalMsg?, $outMsg?)

@param $internalMsg String. 内部错误信息，前端不应处理。
@param $outMsg String. 错误信息。如果为空，则会自动根据$code填上相应的错误信息。

(v6) 内部使用，外部调用应使用jdRet。

抛出错误，中断执行:

	jdRet(E_PARAM, "Bad Request - numeric param `$name`=`$ret`.", "需要数值型参数");
	或
	throw new MyException(E_PARAM, "Bad Request - numeric param `$name`=`$ret`.", "需要数值型参数");

注意：在API中抛出MyException异常后，将回滚对数据库的操作，即所有之前数据库操作都将失效。
如果不想回滚，可在抛错前手工提交(dbCommit)。

	$this->cancelOrder($id); // 数据库操作
	dbCommit();
	jdRet(E_FORBIDDEN, "付款码已失效", "fail to pay order $id: overdue");

@see jdRet
*/
class MyException extends LogicException 
{
	function __construct($code, $internalMsg = null, $outMsg = null, $ex = null) {
		parent::__construct(($outMsg?:""), $code, $ex);
		$this->internalMsg = $internalMsg;
		if ($code && !$outMsg) {
			global $ERRINFO;
			// assert(array_key_exists($code, $ERRINFO));
			$this->message = @$ERRINFO[$code] ?: "ERROR $code";
		}
	}
	public $internalMsg;

	function __toString()
	{
		$str = parent::__toString();
		if ($this->internalMsg)
			$str .= "\nMyException({$this->code}): {$this->internalMsg}";
		return $str;
	}
}

/**
@class DirectReturn($data=null, $isUserFmt=false)

(v6) 内部使用，外部调用应使用jdRet。

中断执行，当作调用成功立即返回。

	jdRet();
	或
	throw new DirectReturn();
	// 返回 [0, null]

例：返回指定数据：

	jdRet(0, ["id"=>1]);
	或
	throw new DirectReturn(["id"=>1]);
	// 返回[0, {"id":1}]

例：直接返回非标数据（非筋斗云格式）：

	$str = '{"id":1}'; // 比如自定义的JSON
	// $str = '<id>1</id>'; // 比如XML
	jdRet(null, $str);
	或
	throw new DirectReturn($str, true);
	// 返回 {"id":1}

@see jdRet
*/
class DirectReturn extends LogicException 
{
	public $data;
	public $isUserFmt;
	function __construct($data = null, $isUserFmt = false) {
		$this->data = $data;
		$this->isUserFmt = $isUserFmt;
	}
}

/**
@fn jdRet($code?, $internalMsg?, $msg?)

直接返回（可用echo/readfile等自行输出返回内容，否则系统不自动输出）：

	readfile(f1);
	jdRet();

成功返回：

	jdRet(0);
	// 返回 [0, null]

	jdRet(0, ["id" => 100]);
	// 返回 [0, {"id": 100}]

	// 直接返回已有的JSON串:
	$str = '{"id": 100}';
	jdRet(0, dbExpr($str));
	// 返回`[0, {"id":100}]`

出错返回：

	jdRet(E_PARAM);
	jdRet(E_PARAM, "bad param"); // 第2参数是用于调试的错误信息，一般用英文
	jdRet(E_PARAM, "bad param", "参数错"); // 第3参数是给用户看的错误信息，一般用中文
	// 返回 [1, "参数错", "bad param"] 注意最终输出JSON数组中第2、3参数顺序对调了，以符合筋斗云[code, data, debuginfo...]的格式。

(v6) 自定义返回：(code传null)

	jdRet(null, ["code" => 0, "msg" => "hello"]);
	或
	jdRet(null, '{"code": 0, "msg": "hello"}');
	// 返回`{"code": 0, "msg": "hello"}`，注意不是标准筋斗云返回格式。

更规范地，对于接口自定义格式输出，应使用 $X_RET_FN 定义转换函数。

@see $X_RET_FN
*/
function jdRet($code = null, $data = null, $msg = null)
{
	if ($code)
		throw new MyException($code, $data, $msg);
	throw new DirectReturn($data, $code === null);
}

// php出错中止时，记录trace日志
register_shutdown_function(function () {
	$error = error_get_last();
	if (!empty($error) && ($error["type"] & (E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR)) != 0) {
		$errmsg = "Error {$error['type']}: " . $error['message'] . ', ' . $error['file'] . ':' . $error['line'];
		logit($errmsg);
	}
});

/**
@fn tobool($s)
*/
function tobool($s)
{
	$val = null;
	if (! tryParseBool($s, $val))
		throw new MyException(E_SERVER, "not bool var");
	return $val;
}

/**
@fn tryParseBool($s, &$val)

字符串转bool，支持"0/1", "true/false", "yes/no", "on/off".
*/
function tryParseBool($s, &$val)
{
	$val = false;
	if (! isset($s))
	{
		return true;
	}
	$s = strtolower($s);
	if ($s=="0" || $s=="false" || $s=="off" || $s == "no")
		$val = false;
	else if ($s=="1" || $s=="true" || $s=="on" || $s =="yes")
		$val = true;
	else
		return false;
	return true;
}

/**
@fn startsWith($s, $pat)
*/
function startsWith($s, $pat)
{
	if ($s === null)
		return false;
	return substr($s, 0, strlen($pat)) == $pat;
}

/**
@fn endWith($s, $pat)
*/
function endWith($s, $pat)
{
	$length = strlen($pat);
	if ($length == 0)
		return true;
	return substr($s, -$length) === $pat;
}

/** 
@fn isCLI() 

command-line interface. e.g. run "php x.php"
*/
function isCLI()
{
	return php_sapi_name() == "cli" && !isSwoole();
}

/** 
@fn isCLIServer() 

php built-in web server e.g. run "php -S 0.0.0.0:8080"
*/
function isCLIServer()
{
	return php_sapi_name() == "cli-server";
}

/**
@fn isSwoole()
@var conf_swoole_env 设置为1表示在swoole服务环境下运行

swoole服务环境下，getJDEnv()将返回各协程中的JDEnv.
*/
function isSwoole()
{
	return (bool)$GLOBALS["conf_swoole_env"];
}

/** 
@fn isEqualCollection($col1, $col2) 
*/
function isEqualCollection($a, $b)
{
	return count($a)==count($b) && array_diff($a, $b) == [];
}

/**
@fn urlEncodeArr($params)

e.g.

	urlEncodeArr(["a"=>1, "b"=>"hello"]) -> a=1&b=hello
	urlEncodeArr(["a"=>1, "b"=>null]) -> a=1

NOTE: use http_build_query instead.

	$rv = http_build_query(["a"=>1, "b"=>[20,30], "c"=>null, "d"=>"", "e"=>["e1"=>3] ]);
	// $rv = "a=1&b%5B0%5D=20&b%5B1%5D=30&d=&e%5Be1%5D=3" 不包含c; 包含d; 

	$rv1 = urldecode($rv);
	// 解码后为 a=1&b[0]=20&b[1]=30&d=&e[e1]=3

	parse_str($rv1, $rv2);
	// $rv2是输出，值应与原始的$rv相同

*/
function urlEncodeArr($params)
{
	return http_build_query($params);
/*
	$p = "";
	foreach ($params as $k=>$v) {
		if ($v === null)
			continue;
		if ($p !== "")
			$p .= "&";
		$p .= $k . "=" . urlencode($v);
	}
	return $p;
*/
}

/**
@fn makeUrl($ac, $params, $hash, $wantHost=false)

生成被调用的URL。示例：

	// 生成相对路径，如 /jdcloud/api.php/hello?id=100#test，一般用于调用自身，如callAsync("hello")。
	$url = makeUrl("hello", ["id"=>100], "#test");

	// 生成绝对路径(指定参数wantHost=true)，如 http://127.0.0.1/jdcloud/api.php/hello?id=100#test，URL可供外部调用。
	$url = makeUrl("hello", ["id"=>100], "#test", true);

	// $ac也可直接指定绝对路径
	$url = makeUrl("http://oliveche.com/jdcloud/api.php", ["p1"=>"abc", "p2"=>"333"])

*/
function makeUrl($ac, $params, $hash = null, $wantHost=false)
{
	if (preg_match('/^[\w\.]+$/', $ac)) {
		$url = getBaseUrl($wantHost) . "api.php/" . $ac;
	}
	else {
		$url = $ac;
	}
	if ($params) {
		$url .= "?" . http_build_query($params); // 不再使用urlEncodeArr
	}
	if ($hash)
		$url .= $hash;
	return $url;
}

/**
@fn httpCall($url, $postParams =null, $opt={timeout?=5, @headers, %curlOpt={optName=>val}, useJson )

请求URL，返回内容。
默认使用GET请求，如果给定postParams，则使用POST请求。
postParams可以是一个kv数组或字符串，也可以是一个文件名(以"@"开头，如"@1.jpg")

如果请求失败，抛出E_SERVER异常。
不检查http返回码。

示例：指定postParams, 默认以application/x-www-form-urlencoded格式提交。

	$data = [
		"name" => "xiaoming",
		"classId" => 100
	];
	// 注意headers的格式
	$headers = [
		"Authorization: Basic dGVzdDp0ZXN0MTIz",
		"Cookie: extid=" . session_id()
	];
	$url = makeUrl("$baseUrl/$ac", $param);
	$rv = httpCall($url, $data, ["headers" => $headers]);

上例中在headers中用Authorization指定了登录信息，适合服务器需要登录的场景；
同时主动指定了Cookie（Cookie名称需按服务端要求设置），以便与通过Session保持信息的服务器持续交互。
（有的服务器不使用Cookie，而是在登录后通过返回token来标识，需要额外处理）

示例：调用第三方服务，登录并调用筋斗云后端

	function jdcloudCall($ac, $param=null, $postParam=null)
	{
		$baseUrl = "http://localhost/jdcloud/api.php";
		$url = makeUrl("$baseUrl/$ac", $param);
		$rv = httpCall($url, $postParam, ["headers" => [
			// 模拟筋斗云用户端cookie
			"Cookie: userid=" . session_id()
		]]);
		// 筋斗云协议格式：成功为[0, obj] 或 失败为[errCode, userMessage, internalMessage?]
		$ret = json_decode($rv, true);
		if ( $ret[0] !== 0 ) {
			throw new MyException(E_PARAM, $ret[2], $ret[1]);
		}
		return $ret[1];
	}
	// 如果是首次则登录
	jdcloudCall("login", ["uname"=>"12345678901", "pwd"=>"1234"]);
	// 保持会话，获取订单列表
	$orders = jdcloudCall("Ordr.query");

示例：提交application/json格式的内容

(v6.1) 如果POST内容指定为对象，应指定选项useJson=1，否则默认会使用urlencoded格式：

	$data = [
		"name" => "xiaoming",
		"classId" => 100
	];
	$rv = httpCall($url, $data, ["useJson"=>1]);
	// 筋斗云：设置全局变量X_RET_STR可直接设置返回内容，避免再次被json编码。

或直接先转成JSON再提交，这时要么使用`useJson:1`，要么在headers中指定Content-Type：

	$data = json_encode([
		"name" => "xiaoming",
		"classId" => 100
	]);
	$headers = [
		"Content-type: application/json",
		"Authorization: Basic dGVzdDp0ZXN0MTIz"
	];
	$rv = httpCall($url, $data, ["headers" => $headers]);

函数通过CURL实现，若需扩展功能，可以直接设置curlOpt选项（具体选项可查阅curl_setopt文档），如：

	$curlOpt = [
		// 设置代理
		CURLOPT_PROXY => '8.8.8.8',
		CURLOPT_PROXYPORT => 8080,

		// 通过UserAgent伪装其它浏览器
		CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36',

		// 返回结果包含HTTP HEADER部分。TODO: 提供简单的解析，如HTTP返回码、Response HTTP Header等。
		CURLOPT_HEADER => true
	];
	$rv = httpCall($url, $data, ["curlOpt" => $curlOpt]);

如果CURL返回错误，可在此查阅错误码：
http://curl.haxx.se/libcurl/c/libcurl-errors.html

出错记到trace日志，慢调用会记录到slow日志中(可配置慢调用时间阀值，默认1秒：conf_slowHttpCallTime=1.0)

e.g.

	$url = makeUrl("http://oliveche.com/echo.php", ["a"=>1, "b"=>@$GLOBALS["b"]]);
	echo(httpCall($url, ["c"=>1, "d"=>0] ));

@see makeUrl

使用PUT操作示例，同时指定用户密码：

	$rv = httpCall($url, $data, [
		"curlOpt" => [CURLOPT_CUSTOMREQUEST => "PUT", CURLOPT_USERPWD => "demo:demo123"]
	]);

*/
function httpCall($url, $postParams=null, $opt=[])
{
	$h = curl_init();
	if(stripos($url,"https://")!==false){
		curl_setopt($h, CURLOPT_SSL_VERIFYPEER, false);
		curl_setopt($h, CURLOPT_SSL_VERIFYHOST, false);
		curl_setopt($h, CURLOPT_SSLVERSION, 1); //CURL_SSLVERSION_TLSv1
	}
	curl_setopt($h, CURLOPT_URL, $url);
	curl_setopt($h, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($h, CURLOPT_HEADER, false);

	$timeout = @$opt["timeout"] ?: 5;
	curl_setopt($h, CURLOPT_TIMEOUT, $timeout);

	if (@$opt["curlOpt"])
		curl_setopt_array($h, $opt["curlOpt"]);
		
	//这里设置代理，如果有的话
	//curl_setopt($h, CURLOPT_PROXY, '8.8.8.8');
	//curl_setopt($h, CURLOPT_PROXYPORT, 8080);

	//cookie设置
	//curl_setopt($h, CURLOPT_COOKIEFILE, $this->cookieFile);
	//curl_setopt($h, CURLOPT_COOKIEJAR, $this->cookieFile);

	// 伪装ua
	//curl_setopt($h, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36');

	if (isset($postParams)) {
		if (is_array($postParams)) {
			if (@$opt["useJson"]) {
				$data = jsonEncode($postParams);
			}
			else {
				$data = http_build_query($postParams);
			}
		}
		else {
			$data = $postParams;
		}
		curl_setopt($h, CURLOPT_POST, true);
		curl_setopt($h, CURLOPT_POSTFIELDS, $data);

		// 未指定content-type则自动添加
		if (@$opt["useJson"]) {
			if (!is_array(@$opt["headers"]))
				$opt["headers"] = [];
			$rv = arrFind($opt["headers"], function ($e) {
				return stripos($e, "Content-Type") !== false;
			});
			if (! $rv) {
				$opt["headers"][] = "Content-Type: application/json";
			}
		}
	}
	if (@$opt["headers"])
		curl_setopt($h, CURLOPT_HTTPHEADER, $opt["headers"]);

	$t0 = microtime(true);
	$content = curl_exec($h);
	$tv = round(microtime(true) - $t0, 2);
//	$statusCode = curl_getinfo($h, CURLINFO_HTTP_CODE); // $status["http_code"]
// 	$status = curl_getinfo($h);
// 	if (intval($status["http_code"]) != 200)
// 		return false;
	$errno = curl_errno($h);
	if ($errno)
	{
		$errmsg = curl_error($h);
		curl_close($h);
		$msg = "httpCall error $errno: time={$tv}s, url=$url, errmsg=$errmsg";
		logit($msg, true);
		throw new MyException(E_SERVER, $msg, "服务器请求出错或超时");
		// echo "<a href='http://curl.haxx.se/libcurl/c/libcurl-errors.html'>错误原因查询</a></br>";
	}
	// slow log
	$slowVal = @$GLOBALS["conf_slowHttpCallTime"] ?: 1.0;
	if ($tv > $slowVal) {
		logit("httpCall slow call: time={$tv}s, url=$url", true, "slow");
	}
	curl_close($h);
	return $content;
}

/**
@fn parseKvList($kvListStr, $sep, $sep2)

解析key-value列表字符串。如果出错抛出异常。
示例：

	$map = parseKvList("CR:新创建;PA:已付款", ";", ":");
	// map: {"CR": "新创建", "PA":"已付款"}
*/
function parseKvList($str, $sep, $sep2)
{
	$map = [];
	foreach (explode($sep, $str) as $e) {
		$kv = explode($sep2, $e, 2);
		if (count($kv) != 2)
			throw new MyException(E_PARAM, "bad kvList: `$str'");
		$map[$kv[0]] = $kv[1];
	}
	return $map;
}

/**
@fn arrayCmp($arr1, $arr2, $fnEq, $callback)

比较两个数组的差异，常用于数据同步。
两个数组中的数据应一一对应。
比较的结果会回调 `$callback($e1, $e2)`，如果数据在两边都有，则e1, e2均非空，否则其中一个为空。

下面是一个示例，metaFields是设计字段列表，dbFields是实际数据库中的字段列表，现在要对比差异，

- 如果字段在设计和实际表中都有，不做处理（或更新字段）
- 如果字段在设计中有，在实际表中没有，则添加字段
- 如果字段在设计中没有，而在实际表中有，则删除字段

数据示例如下：

	$metaFields = [
		["name"=>"id", "type"=>"int"],
		["name"=>"amount", "type"=>"decimal"],
		["name"=>"dscr", "type"=>"nvarchar"]
	];
	$dbFields = [
		["Field"=>"id", "Type"=>"int(11)"],
		["Field"=>"total", "Type"=>"decimal(19,2)"],
		["Field"=>"dscr", "Type"=>"varchar(255)"]
	];

两边字段名相同可通过 `$meta["name"] === $dbField["Field"];`来判断。

	arrayCmp($metaFields, $dbFields, function ($meta, $dbField) {
		// 定义两边对应关系
		return $meta["name"] === $dbField["Field"];
	}, function ($meta, $dbField) { // meta: {type, len, ...} 参考 FIELD_META_TYPE
		if ($meta === null) { // 在meta中没有，在dbField中有，则删除字段
			echo "DROP " . $dbField["Field"] . "\n";
		}
		else if ($dbField === null) { // 在meta中有，在dbField中没有，则添加字段
			echo "ADD " . $meta["name"] . "\n";
		}
		else {
			// 字段在两边都有
		}
	});
*/
function arrayCmp($a1, $a2, $fnEq, $cb)
{
	$mark = []; // index_of_a2 => true
	foreach ($a1 as $e1) {
		$found = null;
		for ($i=0; $i<count($a2); ++$i) {
			$e2 = $a2[$i];
			if ($fnEq($e1, $e2)) {
				$found = $e2;
				$mark[$i] = true;
				break;
			}
		}
		$cb($e1, $found);
	}
	for ($i=0; $i<count($a2); ++$i) {
		if (! array_key_exists($i, $mark)) {
			$cb(null, $a2[$i]);
		}
	}
}

/**
@fn addToStr(&$str, $str1, $sep=',')

添加字符串到str. str开始必须为null。

	$atts = null;
	addToStr($atts, "100");
	addToStr($atts, "200");
	// $atts = "100,200"

*/
function addToStr(&$str, $str1, $sep=',')
{
	if (! $str1)
		return;
	if ($str === null)
		$str = $str1;
	else
		$str .= $sep . $str1;
	return $str;
}

/**
@fn arrCopy(&$dst, $src, $fields=null)

将数组$src中指定字段复制到$dst中。
数组$fields指定字段列表，如果未指定，则全部字段复制过去；如果字段复制后需要改名，可以以[$dstName, $srcName]这样的数组来表示。

示例：将workItem提取指定字段后插入数据库中：

	$workItem = ["repairWiId"=>$id, "wiName"=>$name, ...];
	$wiData = ["orderId" => $orderId];
	arrCopy($wiData, $workItem, [
		["code", "repairWiId"], // 复制后改名，即 $wiData["code"] = $workItem["repairWiId"]
		"name",
		"saleWorkQty",
		["addFlag", "isAdd"]
	]);
	dbInsert("WorkItem", $wiData);

示例：

	arrCopy($wiData, $workItem); // 复制全部字段过去

如果不想覆盖已有字段(即使值为null也不覆盖)，可以用：

	$wiData += $workItem;

*/
function arrCopy(&$ret, $arr, $fields=null)
{
	if ($ret == null)
		$ret = [];
	if ($fields == null) {
		foreach ($arr as $k=>$v) {
			$ret[$k] = $v;
		}
		return;
	}
	foreach ($fields as $f) {
		if (is_array($f))
			@$ret[$f[0]] = $arr[$f[1]];
		else
			@$ret[$f] = $arr[$f];
	}
}

/**
@fn arrFind($arr, $fn)

示例：

	$personArr = [ ["id"=>1, "name"=>"name1"], ["id"=>2, "name"=>"name2"] ];
	$person = arrFind($personArr, function ($e) {
		return $e["id"] === 1;
	});
	if ($person === false) {
		// 未找到
	}

支持检查和返回数组index(也支持非数字key)，如：

	$person = arrFind($personArr, function ($e, $idx) {
		return $idx != 0 && $e["id"] >= 1;
	}, $idx);
	// $idx=1, $person=["id"=>2, "name"=>"name2"]
	if ($person === false) {
		// 未找到
	}

注意：无法通过返回的元素(person)修改原数组元素；
如果要修改数组中元素须使用返回的$idx: `$personArr[$idx]['name'] = 'new name'` 
*/
function arrFind($arr, $fn, &$idx=null)
{
	assert(is_array($arr));
	assert(is_callable($fn));
	foreach ($arr as $i=>$e) {
		if ($fn($e, $i)) {
			$idx = $i;
			return $e;
		}
	}
	return false;
}

/**
@fn arrMap($arr, $fn, $doFilter=false)

示例：

	$personArr = [ ["id"=>1, "name"=>"name1"], ["id"=>2, "name"=>"name2"] ];
	$personIdList = arrMap($arr, function ($e) {
		return $e["id"];
	});
	// [1, 2]

如果doFilter为true，则return null或直接return时，该元素被过滤掉。
*/
function arrMap($arr, $fn, $doFilter=false)
{
	assert(is_array($arr));
	assert(is_callable($fn));
	$ret = [];
	foreach ($arr as $e) {
		$rv = $fn($e);
		if ($doFilter && $rv === null)
			continue;
		$ret[] = $rv;
	}
	return $ret;
}

/**
@fn arrGrep($arr, $fn, $mapFn=null)

示例：

	$personArr = [ ["id"=>1, "name"=>"name1"], ["id"=>2, "name"=>"name2"] ];
	$personArr1 = arrGrep($arr, function ($e) {
		return $e["id"] > 1;
	}); // [ ["id"=>2, "name"=>"name2"] ]

	$personNameArr1 = arrGrep($arr, function ($e) {
		return $e["id"] > 1;
	}, function ($e) {
		return $e["name"];
	}); // [ "name2" ]
	
*/
function arrGrep($arr, $fn, $mapFn=null)
{
	assert(is_array($arr));
	assert(is_callable($fn));
	assert(is_null($mapFn) || is_callable($mapFn));
	$ret = [];
	foreach ($arr as $e) {
		if ($fn($e)) {
			if ($mapFn === null)
				$ret[] = $e;
			else
				$ret[] = $mapFn($e);
		}
	}
	return $ret;
}

/**
@fn getReqIp

请求的IP。与`$_SERVER['REMOTE_ADDR']`不同的是，如果有代理，则返回所有IP列表。
*/
function getReqIp()
{
	if (isCLI()) {
		return "cli";
	}
	$env = getJDEnv();
	if (!$env)
		return;
	if (!isset($env->reqIp)) {
		$env->reqIp = $env->_SERVER('REMOTE_ADDR') ?: 'unknown';
		@$fw = $env->_SERVER("HTTP_X_FORWARDED_FOR") ?: $env->_SERVER("HTTP_CLIENT_IP");
		if ($fw) {
			$env->reqIp .= '; ' . $fw;
		}
	}
	return $env->reqIp;
}

/**
@fn getRealIp()

取实际IP地址，支持透过代理服务器。
*/
function getRealIp()
{
	static $realIp;
	if (!isset($realIp)) {
		@$realIp = $_SERVER["HTTP_X_FORWARDED_FOR"] ?: $_SERVER["HTTP_CLIENT_IP"] ?: $_SERVER["REMOTE_ADDR"]; // HTTP_REMOTEIP
		// "1.1.1.1,2.2.2.2" => "1.1.1.1"
		$realIp = preg_replace('/,.*/', '', $realIp);
	}
	return $realIp;
}

/**
@fn logit($s, $addHeader=true, $type="trace")
@alias logit($s, $type)

记录日志。

默认到日志文件 $BASE_DIR/trace.log. 如果指定type=secure, 则写到 $BASE_DIR/secure.log.

$s可以是字符串、数值或数组。

可通过在线日志工具 tool/log.php 来查看日志。也可直接打开日志文件查看。
 */
function logit($s, $addHeader=true, $type="trace")
{
	if (is_array($s))
		$s = var_export($s, true);
	if (is_string($addHeader)) {
		$type = $addHeader;
		$addHeader = true;
	}
	if ($addHeader) {
		// 注意：此格式在日志工具log.php中使用，不应修改
		$remoteAddr = getReqIp() ?: 'nil';
		$s = "=== REQ from [$remoteAddr] at [".date(FMT_DT)."] " . $s . "\n";
	}
	else {
		$s .= "\n";
	}
	@$baseDir = $GLOBALS['BASE_DIR'] ?: ".";
	file_put_contents($baseDir . "/{$type}.log", $s, FILE_APPEND | LOCK_EX);
}

/**
@fn jsonEncode($data, $doPretty=false)

	$str = jsonEncode($data);
	$data = jsonDecode($str);

*/
function jsonEncode($data, $doPretty=false)
{
	$flag = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
	if (defined("JSON_INVALID_UTF8_SUBSTITUTE")) // php7 JSON_INVALID_UTF8_IGNORE
		$flag |= JSON_INVALID_UTF8_SUBSTITUTE;
	if ($doPretty)
		$flag |= JSON_PRETTY_PRINT;
	return json_encode($data, $flag);
}
/**
@fn jsonDecode($str)

等价于`json_decoe($str, true)`. 返回数组（而非对象）。
*/
function jsonDecode($str)
{
	return json_decode($str, true);
}

/**
@fn getSignContent($params, $paramFilter?)

取URL签名内容。一般都是将参数先排序，然后拼成`k1=v1&k2=v2`这种形式。
之后用md5, sha1, rsa等算法签名。

默认"_"开头的参数以及"sign"参数不参与签名，规则可定制，示例："sign"与"sign_type"参数不参与验签：

	$s = getSignContent($_POST, function ($k) {
		if ($k == "sign" || $k == "sign_type")
			return false;
	});

*/
function getSignContent($params, $paramFilter=null)
{
	if (!$paramFilter) {
		$paramFilter = function ($k) {
			if ($k[0] === "_" || $k == "sign") // e.g. "_pwd", "_sign", "_ac"
				return false;
		};
	}
	ksort($params);
	$str = null;
	foreach ($params as $k=>$v) {
		if (call_user_func($paramFilter, $k) === false)  // e.g. "_pwd", "_sign", "_ac"
			continue;
		if ($v === null)
			$v = "";
		if ($str === null) {
			$str = "{$k}={$v}";
		}
		else {
			$str .= "&{$k}={$v}";
		}
	}
	return $str;
}

/**
@fn inSet($str, $strList)
e.g. 
	$rv = inSet("管理员", "财务,销售,管理员"); // true
	$rv = inSet("管理员", "财务,销售,仓库管理员"); // false
	$rv = inSet("管理员", ["财务","销售","管理员"]); // true

str可以是中英文字符，不可以带空格或符号。
strList可以是数组或字符串。如果为字符串，则多个词以分隔符相隔，分隔符可以是各种符号或空格，支持中文符号或空格（必须utf-8编码）。常用英文逗号，与MySQL的find_in_set函数类似。
*/
function inSet($str, $strList)
{
	if (!isset($str) || !isset($strList))
		return false;
	if (is_array($strList))
		return in_array($str, $strList);
	return preg_match('/\b' . $str . '\b/u', $strList)? true: false;
}

/**
@fn text2html($s)

简单的文本转html处理。支持标题、段落、列表。示例：

	# 标题1
	这是段落1
	## 标题2
	这是段落2
	- 列表1
	- 列表2

示例：商品详情可在管理端编辑多行文本，在客户端显示html内容：
数据库定义：

	@Item: id, ... content

客户端访问接口Item.query/Item.get时，content返回html内容：

	class AC_Item extends AC0_Item
	{
		protected function onQuery() {
			parent::onQuery();
			$this->enumFields["content"] = function ($val) {
				return text2html($val);
			};
		}
	}

*/
function text2html($s)
{
	return preg_replace_callback('/^(?:([#-]+)\s+)?(.*)$/um', function ($m) {
		list ($begin, $text) = [$m[1], $m[2]];
		if ($begin) {
			if ($begin[0] == '#') {
				$n = strlen($begin);
				return "<h$n>$text</h$n>";
			}
			if ($begin[0] == '-') {
				return "<li>$text</li>";
			}
		}
		// 空段落处理
		if ($text) {
			$text = str_replace(" ", "&nbsp;", $text);
		}
		else {
			$text = "&nbsp;";
		}
		return "<p>$text</p>";
	}, $s);
}

/**
@fn pivot($objArr, $gcols, $ycolCnt=1, $pivotSumField=null, $gres=null)

将行转置到列。一般用于统计分析数据处理。

- $gcols为转置字段，可以是一个或多个字段。可以是个字符串("f1" 或 "f1,f2")，也可以是个数组（如["f1","f2"]）
- $objArr是对象数组，默认最后一列是统计列，如果想要最后两列作为统计列，可以指定参数ycolCnt=2。注意此时最终统计值将是一个数组。
- 以objArr[0]这个对象为基准，除去最后ycolCnt个字段做为统计列(ycols)，再除去gcols指定的要转置到列的字段，剩下的列就是xcols：相同的xcols会归并到一行中。

objArr的列中包括三类：

	分组列(含转置列) 普通列 统计列

- 统计列必须在最后面，由ycolCnt指定有几列，必须为数值列
- gres指定分组列（多个列以逗号分隔），gcols指定转置列，gres应包含gcols。如果未指定gres，则表示除了统计列都是分组列（即没有普通列）

示例：

	$arr = [
		["y"=>2019, "m"=>11, "cateId"=>1, "cateName"=>"衣服", "sum" => 20000],
		["y"=>2019, "m"=>11, "cateId"=>2, "cateName"=>"食品", "sum" => 12000],
		["y"=>2019, "m"=>12, "cateId"=>2, "cateName"=>"食品", "sum" => 15000],
		["y"=>2020, "m"=>2, "cateId"=>1, "cateName"=>"衣服", "sum" => 19000],
		["y"=>2020, "m"=>2, "cateId"=>3, "cateName"=>"电器", "sum" => 28000]
	];

	// 将类别转到列
	$arr1 = pivot($arr, "cateId,cateName");

得到：

	$arr1 = [
		["y"=>2019, "m"=>11, "1-衣服"=>20000, "2-食品"=>12000, "3-电器" => null],
		["y"=>2019, "m"=>12, "2-食品"=>15000],
		["y"=>2020, "m"=>2, "1-衣服"=>19000, "3-电器"=>28000]
	];

注意：结果的第一行中，会包含所有可能出现的列，没有值的列填null。

如果需要行列统计，可指定pivotSumField="合计"，这样就会添加一列叫"合计"，且添加一行统计行

	$arr1 = pivot($arr, "cateId,cateName", 1, "合计");

结果为:

	$arr1 = [
		["y"=>2019, "m"=>11, "1-衣服"=>20000, "2-食品"=>12000, "3-电器"=>null, "合计"=>32000],
		["y"=>2019, "m"=>12, "2-食品"=>15000, "合计"=>15000],
		["y"=>2020, "m"=>2, "1-衣服"=>19000, "3-电器"=>28000, "合计"=>47000],
		["1-衣服"=>39000, "2-食品"=>27000, "3-电器"=>28000, "合计"=>94000]
	];

特别地，如果只有1行，则不添加统计行，如果只有1列数据列，不添加统计列。

在后端查询时, 往往用id字段分组但显示为名字, 可以用hiddenFields参数指定不要返回的字段:
例如上例中cateId若只需要参与查询, 不需要返回在最终结果中：

	callSvr("Ordr.query", {gres: "y,m,cateId", res: "cateName,SUM(amount) sum", pivot: "cateName", hiddenFields:"cateId"})

结果为：

	$arr1 = [
		["y"=>2019, "m"=>11, "衣服"=>20000, "食品"=>12000, "电器"=>null],
		["y"=>2019, "m"=>12, "食品"=>15000],
		["y"=>2020, "m"=>2, "衣服"=>19000, "电器"=>28000]
	];

其它示例: 显示用户单数统计表

	var url = WUI.makeUrl("Ordr.query", {gres:"userId", res:"userName 客户, COUNT(*) 订单数, SUM(amount) 总金额", hiddenFields:"userId", pivot:'订单数'});
	WUI.showPage("pageSimple", "用户单数统计!", [url]);

示例：多个统计列（ycolCnt>1）的情况

	$arr = [
		["y"=>2019, "m"=>11, "cateName"=>"衣服", "sum" => 20000, "cnt" => 100],
		["y"=>2019, "m"=>11, "cateName"=>"衣服", "sum" => 12000, "cnt" => 150], // 故意与第一行重复，这时将与第一行最后两列分别累加
		["y"=>2019, "m"=>12, "cateName"=>"食品", "sum" => 15000, "cnt" => 80],
		["y"=>2020, "m"=>2, "cateName"=>"衣服", "sum" => 19000, "cnt" => 90],
		["y"=>2020, "m"=>2, "cateName"=>"电器", "sum" => 28000, "cnt" => 30]
	];

	// 将类别转到列, 最后两列为统计列
	$arr1 = pivot($arr, "cateName", 2);

得到：

	$arr1 = [
		["y"=>2019, "m"=>11, "衣服"=>[32000, 250], "食品"=>null, "电器" => null],
		["y"=>2019, "m"=>12, "食品"=>[15000, 80] ],
		["y"=>2020, "m"=>2, "衣服"=>[19000,90], "电器"=>[28000, 30] ]
	];

*/
function pivot($objArr, $gcols, $ycolCnt=1, $pivotSumField=null, $gres=null)
{
	if (count($objArr) == 0)
		return $objArr;

	if (is_string($gcols)) {
		$gcols = preg_split('/\s*,\s*/', $gcols);
	}
	if (count($gcols) == 0) {
		throw new MyException(E_PARAM, "bad gcols: no data", "未指定分组列");
	}
	$cols = array_keys($objArr[0]);
	// $ycol = array_pop($cols); // 去除ycol
	$ycols = array_splice($cols, -$ycolCnt); // 去除ycol
	foreach ($gcols as $gcol) {
		if (! in_array($gcol, $cols)) {
			throw new MyException(E_PARAM, "bad gcol $gcol: not in cols", "分组列不正确: $gcol");
		}
	}

	$xMap = []; // {x=>新行}
	$xcols = array_diff($cols, $gcols);
	$xcols1 = null; // 用于标识一行
	if ($gres) {
		$gresArr = preg_split('/\s*,\s*/', $gres);
		$xcols1 = array_diff($gresArr, $gcols);
	}
	else {
		$xcols1 = $xcols;
	}

	$firstX = null;
	foreach ($objArr as $row) {
		// $x = xtext($row);
		$xarr = [];
		foreach ($xcols as $col) {
			$xarr[$col] = $row[$col];
		}
		$xarr1 = array_map(function ($col) use ($row) {
			return is_null($row[$col])? "(null)": $row[$col];
		}, $xcols1);
		$x = join('-', $xarr1);

		$garr = array_map(function ($col) use ($row) {
			return is_null($row[$col])? "(null)": $row[$col];
		}, $gcols);
		$g = join('-', $garr);

		if (! array_key_exists($x, $xMap)) {
			$xMap[$x] = $xarr;
		}
		if ($ycolCnt == 1)
			$y = end($row);
		else
			$y = array_values(array_slice($row, -$ycolCnt));

		if (! array_key_exists($g, $xMap[$x]))
			$xMap[$x][$g] = $y;
		else {
			if ($ycolCnt == 1) {
				$xMap[$x][$g] += $y;
			}
			else {
				for ($i=0; $i<$ycolCnt; ++$i) {
					$xMap[$x][$g][$i] += $y[$i];
				}
			}
		}

		// 确保第一行包含所有列，没有的填null；从而固化所有列，确定列的顺序
		if ($firstX === null) {
			$firstX = $x;
		}
		else if (! array_key_exists($g, $xMap[$firstX])) {
			$xMap[$firstX][$g] = null;
		}
	}
	$ret = array_values($xMap);

	// 自动添加统计列和统计行, 只有一行不添加统计行，只有一列不添加统计列
	if ($pivotSumField && count($ret) > 0) {
		$xcolCnt = count($xcols);
		$addSumCol = (count($ret[0]) - $xcolCnt > 1);
		$sumRow = [];
		foreach ($ret as &$row) {
			$coli = 0;
			$rowSum = null;
			foreach ($row as $col=>$e) {
				if ($coli++ < $xcolCnt || !$e) {
					continue;
				}
				if ($ycolCnt == 1) {
					$rowSum += $e;
					$sumRow[$col] += $e;
					if ($addSumCol) {
						$sumRow[$pivotSumField] += $e;
					}
				}
				else {
					for ($i=0; $i<$ycolCnt; ++$i) {
						$rowSum[$i] += $e[$i];
						$sumRow[$col][$i] += $e[$i];
						if ($addSumCol) {
							$sumRow[$pivotSumField][$i] += $e[$i];
						}
					}
				}
			}
			if ($addSumCol)
				$row[$pivotSumField] = $rowSum;
		}
		if (count($ret) > 1) {
			if ($xcolCnt > 0) {
				$sumRow[$xcols[0]] = $pivotSumField;
			}
			$ret[] = $sumRow;
		}
	}
	return $ret;
}

/**
@fn myround($val, $n=0)

保留指定小数点位数，返回字符串。如果有多余的0则删除。

注意：php的round返回的是浮点数，不精确。比如0.53会返回0.53000000000000003
而number_format函数尾部可能会有多余的0.
*/
function myround($val, $n=0)
{
	$s = number_format($val, $n, ".", "");
	// 去除多余的0或小数点
	if (strpos($s, '.') !== false)
		$s = preg_replace('/\.?0+$/', '', $s);
	return $s;
}

/**
@fn mh($val)

显示工时。以"30s"（秒）, "5m"（分）, "1.2h"（小时）, "3d"（天）这种样式显示。
*/
function mh($val, $mhUnit=null)
{
	if ($mhUnit == "h")
		return myround($val, 4);
	if ($mhUnit == "m")
		return myround($val * 60, 4);

	if ($val < 0.0166) // 小于1分钟，以秒计
		return myround($val * 3600) . "s";
	if ($val < 1) // 小于1小时，以分钟计
		return myround($val *60, 2) . "m";
	if ($val > 48) // 大于48小时，以天计
		return myround($val/24, 1) . "d";
	return myround($val, 2) . "h";
}

/**
@fn fromMh($val)

将工时字符串转为小时。示例：

- "30s"（秒） => 30/3600.0
- "5m"（分）=> 5/60.0
- "1.2h"（小时）=> 1.2
- "3d"（天）=> 3*24.0
*/
function fromMh($str)
{
	$val = floatval($str);
	$unit = substr($str, -1);
	if ($unit === 's')
		return $val / 3600.0;
	if ($unit === 'm')
		return $val / 60.0;
	if ($unit === 'd')
		return $val * 24.0;
	return $val;
}

/**
@fn isArray012($var)

判断是否为数值键的数组
*/
function isArray012($var)
{
	return is_array($var) && (count($var)==0 || array_key_exists(0, $var));
}

/**
@fn isArrayAssoc($var)

判断是否为关联数组
*/
function isArrayAssoc($var)
{
	return is_array($var) && !array_key_exists(0, $var);
}

/**
@fn makeTree($arr, $idField="id", $fatherIdField="fatherId", $childrenField="children"

将array转成tree.

	$ret = makeTree([
		["id"=>1],
		["id"=>2, "fatherId"=>1],
		["id"=>3, "fatherId"=>2],
		["id"=>4, "fatherId"=>1]
	]);

结果：

	$ret = [
		["id"=>1, "children"=> [
			["id"=>2, "fatherId"=>1, "children"=> [
				["id"=>3, "fatherId"=>2],
			],
			["id"=>4, "fatherId"=>1]
		]
	]
*/
function makeTree($arr, $idField="id", $fatherIdField="fatherId", $childrenField="children")
{
	$ret = [];
	foreach ($arr as &$e) {
		$fid = $e[$fatherIdField];
		if (! $fid) {
			$ret[] = &$e;
			continue;
		}
		$found = false;
		foreach ($arr as &$e1) {
			if ($fid == $e1[$idField]) {
				$e1[$childrenField][] = &$e;
				$found = true;
				break;
			}
		}
		if (! $found)
			$ret[] = &$e;
	}
	return $ret;
}

/**
@fn readBlock($getLine, $makeBlock, $isNewBlock, $handleBlock, $opt)

readBlock编程模式

原型问题：读一个文件，其中以"#"开头的行(curLine)表示一个块(block)开始，这个块一直到下一个块开始处才结束。如：

	# block1
	paragraph 1
	paragraph 2
	# block 2
	paragraph 3
	# block 3

提供以下回调函数，将解析出每个块，并最终交给handleBlock回调处理：

	$block = null;
	$curLine = getLine() // 读一行，返回null或false表示结束
	makeBlock(&$block, $curLine) // 读一行时，添加到block
	isNewBlock($curLine); // 判断一个新的block开始
	handleBlock($block) // 处理block

- opt: {skipStart=false} 可设置忽略开头行

使用模型后示例如下：

	$fp = fopen("1.txt","r");
	readBlock(function () use ($fp) { // getLine
		return fgets($fp);
	}, function (&$block, $curLine) { // makeBlock
		$block .= $curLine;
	}, function ($curLine) { // isNewBlock
		return $curLine[0] == "#";
	}, function ($block) { // handleBlock
		echo(">>>$block<<<\n");
	});
	fclose($fp);

假如以数组方式处理，示例如下（注意除了getLine不同，其余部分相同）：

	$arr = file("1.txt");
	$i = 0;
	readBlock(function () use ($arr, &$i) { // getLine
		if ($i == count($arr))
			return false;
		return $arr[$i++];
	}, function (&$block, $curLine) { // makeBlock
		$block .= $curLine;
	}, function ($curLine) { // isNewBlock
		return $curLine[0] == "#";
	}, function ($block) { // handleBlock
		echo("$block\n");
	});

## 参考原型程序

	$fp = fopen("1.txt","r");
	$block = null;
	while (true) {
		$curLine = fgets($fp);
		if ($curLine === false || ($block != null && $curLine[0] == "#")) {
			handleBlock($block);
			if ($curLine === false)
				break;
			$block = $curLine;
			continue;
		}
		$block .= $curLine;
	}
	fclose($fp);

## 协程(php5.5后支持)

将`$handleBlock($block)`调用改为`yield $block`可提供协程式编程风格，可把循环控制交给主程序，调用示例：

	$fp = fopen("1.txt","r");
	$g = readBlockG(...);
	while($g->valid()) {
		$block = $g->current();
		handleBlock($block);
		$g->next();
	}
	fclose($fp);

*/
function readBlock($getLine, $makeBlock, $isNewBlock, $handleBlock, $opt=[])
{
	$opt += ["skipStart" => false];
	$block = null;
	while (true) {
		$curLine = $getLine();
		$isEnd = ($curLine === false || $curLine === null);
		if ($isEnd || $isNewBlock($curLine)) {
			if ($block != null)
				$handleBlock($block);
			if ($isEnd)
				break;
			$block = null; // init
			if (! $opt["skipStart"])
				$makeBlock($block, $curLine);
			continue;
		}
		$makeBlock($block, $curLine);
	}
}

/**
@fn readBlock2($getLine, $makeBlock, $isBlockStart, $isBlockEnd, $handleBlock, $opt=[])

readBlock2编程模式

原型问题：读一个文件，其中以"#"开头的行(curLine)表示一个块(block)开始，以"."开头的行表示一个块结束，如：

	# block1
	paragraph 1
	paragraph 2
	.
	others -- out of block
	# block 2
	paragraph 3
	.
	other2 -- out of block
	# block 3

提供以下回调函数，将解析出每个块，并最终交给handleBlock回调处理：

	$block = null;
	$curLine = getLine() // 读一行，返回null或false表示结束
	makeBlock(&$block, $curLine) // 读一行时，添加到block
	isBlockStart($curLine); // 判断一个block开始
	isBlockEnd($curLine); // 判断一个block结束
	handleBlock($block) // 处理block

- opt: {skipStart=false, skipEnd=true} 可设置忽略开头行，以及包含结束行

使用模型后的代码：

	$fp = fopen("1.txt","r");
	readBlock2(function () use ($fp) { // getLine
		return fgets($fp);
	}, function (&$block, $curLine) { // makeBlock
		$block .= $curLine;
	}, function ($curLine) { // isBlockStart
		return $curLine[0] == "#";
	}, function ($curLine) { // isBlockEnd
		return $curLine[0] == ".";
	}, function ($block) { // handleBlock
		echo(">>>$block<<<\n");
	});
	fclose($fp);

设置选项示例：

	readBlock2(...
	, ["skipStart"=>true]);

原型代码：

	$fp = fopen("1.txt","r");
	$block = null;
	$blockFlag = false;
	while (true) {
		$curLine = fgets($fp);
		if ($curLine === false)
			break;
		if (! $blockFlag) {
			if ($curLine[0] == "#")
				$blockFlag = true;
		}
		else if ($curLine[0] == '.') {
			$blockFlag = false;
			handleBlock($block);
			$block = null;
			continue;
		}
		if ($blockFlag)
			$block .= $curLine;
	}
	fclose($fp);

	function handleBlock($s)
	{
		echo(">>>$s<<<\n");
	}
*/
function readBlock2($getLine, $makeBlock, $isBlockStart, $isBlockEnd, $handleBlock, $opt=[])
{
	$opt += ["skipStart"=>false, "skipEnd"=>true];
	$block = null;
	$blockFlag = false;
	while (true) {
		$curLine = $getLine();
		if ($curLine === false || $curLine === null)
			break;
		if (! $blockFlag) {
			if ($isBlockStart($curLine)) {
				$blockFlag = true;
				if ($opt["skipStart"])
					continue;
			}
		}
		else if ($isBlockEnd($curLine)) {
			if (! $opt["skipEnd"])
				$makeBlock($block, $curLine);
			$blockFlag = false;
			if ($block != null)
				$handleBlock($block);
			$block = null; // init
			continue;
		}
		if ($blockFlag)
			$makeBlock($block, $curLine);
	}
}

/**
@fn containsWord($str, $word)

检查是否包含一个词，与stripos等函数不同，它会检查词边界，如：

	$rv = containsWord("hello, world", "hello"); // true
	$rv = containsWord("hello, world", "llo"); // false
*/
function containsWord($str, $word)
{
	if (!$str || stripos($str, $word) === false)
		return false;
	return !!preg_match('/\b' . $word . '\b/ui', $str);
}

/**
@fn qstr($s, $q="'")

将字符串变成引用串，默认用双引号，如：

	$str1 = qstr($str);

效果：

	hello => "hello"
	"i'm ok", he said. => "\"i'm ok'\", he said."

也可用单引号：

	$str1 = qstr($str, "'"); 

效果：

	hello => 'hello'
	i'm ok => 'i\'m ok'

*/
function qstr($s, $q='"')
{
	$s = str_replace("\\", "\\\\", $s);
	return $q . str_replace($q, "\\" . $q, $s) . $q;
}

/**
@fn myexec($cmd, $errMsg = "操作失败", &$out = null)

执行Shell命令。如果出错则jdRet并记录日志。

由于php exec函数限制，为了能够输出错误信息，一般建议加错误重定向，让出错信息显示在日志或接口返回中，如：
	
	myexec("magick 1.jpg -resize '1200x1200>' 2.jpg 2>&1");
	myexec("magick 1.jpg -resize '1200x1200>' 2.jpg 2>&1", "图片处理失败"); // 可定制出错消息
	myexec("php create_file.php 2>&1 >file1"); // 注意如果'2>&1'放在最后，则错误会输出到file1中。

注意：为保证兼容性，在Windows下会使用sh命令, 自动在命令中加"sh -c"。

$out参数可输出返回结果，注意是数组，一个元素表示一行。

- 在Windows环境下，sh是安装git-bash后自带的（路径示例：C:\Program Files\Git\usr\bin）
	如果使用Apache系统服务的方式（默认是SYSTEM用户执行），应确保上述命令行在系统PATH（而不只是当前用户的PATH）中。

- Win10环境中Apache+php调用shell可能会卡死，应修改git-bash下的文件：/etc/nsswitch.conf （路径示例：C:\Program Files\Git\etc\nsswitch.conf）

		db_home: env 
		#db_home: env windows cygwin desc

- Win11环境中在Win10修改的基础上，在windwows的服务里，打开Apache服务，选择[登录]标签页，勾选上[本地系统账户]和[允许服务与桌面交互], 选好后重启apache服务, 注意是在[服务]里重启apache服务，不是在apache里重启

*/
function myexec($cmd, $errMsg = "操作失败", &$out = null)
{
	if (PHP_OS === "WINNT" && !startsWith($cmd, "sh ")) {
		$cmd = 'sh -c ' . qstr($cmd);
	}
	exec($cmd, $out, $rv);
	if ($rv) {
		$outStr = join("\n", $out);
		logit("exec fails: $cmd\nrv=$rv, out=$outStr");
		jdRet(E_SERVER, $outStr, $errMsg);
	}
}

/**
@fn redirectOut($fn)

将$fn函数执行中的输出重定向，返回通过echo等方式输出的字符串。示例：

	$str1 = redirectOut(function () {
		echo("redirect 1");
	});
	// $str1="redirect 1"

支持嵌套，示例：

	$str1 = redirectOut(function () {
		echo("redirect 1");
		global $str2;
		$str2 = redirectOut(function () {
			echo("redirect 2");
		});
	});
	echo($str1 . ',' . $str2);
*/
function redirectOut($fn)
{
	ob_start(function () {});
	$fn();
	return ob_get_flush();
}

/**
@fn mypack($data, $format=null)

结构体封包。解包使用myunpack.

数据格式代码参考: https://www.php.net/manual/en/function.pack.php
常用格式：

	C - 8位整数
	n - 16位整数(网络序)
	N - 32位整数(网络序)
	a{数字} - 定长字符串(长度不足补0)
	f - float
	d - double

示例：

	$format = [
		"a4", "type", // 定长字符串（不足补0）
		"N", "deviceId", // 设备id,
		"C", "y", // 年
		"C", "m", // 月
		"C", "d", // 日
		"C", "h", // 时
		"C", "n", // 分
		"C", "s", // 秒
	];
	$tm = localtime(strtotime("2022-4-1 09:10:11"), true);
	$data = [
		"deviceId" => 20501, // 设备id,
		"type" => "WM",
		"y" => $tm["tm_year"]-100, // 年
		"m" => $tm["tm_mon"]+1, // 月
		"d" => $tm["tm_mday"], // 日
		"h" => $tm["tm_hour"], // 时
		"n" => $tm["tm_min"], // 分
		"s" => $tm["tm_sec"], // 秒
	];
	$packData = mypack($data, $format);
	print("enc=" . bin2hex($packData) . ", len=" . strlen($packData). "\n");

	$data1 = myunpack($packData, $format);
	var_dump($data1);

也可以不用format，直接封包：

	$packData = mypack([
		'C', 0x10,
		'C', 0x02,
		"n", $item['dbNumber'],
		'N', (0x84000000 | ($item['startAddr'] * 8))
	]);

TODO: 支持结构体、数组等：

	$format_st = [
		"N", "a"
		"a4", "b"
	];
	$format = [
		["f", 4], "arr", // 定长数组, 不足补0
		["f", "*"], "arr1", // 不定长数组(内置长度)
		$format_st, "st", // 结构体
		[$format_st, 4], "stList" // 结构体定长数组
		[$format_st, "*"], "stList2" // 结构体不定长数组(内置长度)
	];
	$data = [
		"arr" => [1.1, 2.2],
		"arr1" => [3.3, 4.4, 5.5],
		"st" => [ "a" => 100, "b" => "BB" ],
		"stList" => [
			[ "a" => 101, "b" => "b1"],
			[ "a" => 102, "b" => "b2"]
		],
		"stList2" => [
			[ "a" => 101, "b" => "b1"],
			[ "a" => 102, "b" => "b2"]
		]
	];
*/
function mypack($data, $format = null)
{
	if (is_string($format)) 
		return pack($format, $data);

	if (is_null($format)) {
		$cnt = count($data);
		assert($cnt % 2 == 0);
		$params = [];
		$format0 = "";
		for ($i=0; $i<$cnt; $i+=2) {
			$format0 .= $data[$i];
			$params[] = $data[$i+1];
		}
		array_unshift($params, $format0);
		return call_user_func_array("pack", $params);
	}

	$cnt = count($format);
	assert($cnt % 2 == 0);
	$params = [];
	$format0 = "";
	for ($i=0; $i<$cnt; $i+=2) {
		$format0 .= $format[$i];
		$params[] = $data[$format[$i+1]];
	}
	array_unshift($params, $format0);
	return call_user_func_array("pack", $params);
}

/**
@fn myunpack($packData, $format)

结构体解包。

@see mypack
*/
function myunpack($packData, $format)
{
	if (is_string($format))
		return unpack($format, $packData);
	$cnt = count($format);
	assert($cnt % 2 == 0);
	$format0 = null;
	for ($i=0; $i<$cnt; $i+=2) {
		if ($format0 !== null) {
			$format0 .= '/';
		}
		$format0 .= $format[$i] . $format[$i+1];
	}
	return unpack($format0, $packData);
}

/**
@fn randChr($cnt, $type='c')

生成指定长度的随机字符串。

	$rv = randChr(10); // 10个字符, [0-9A-Z]
	$rv = randChr(10, 'x'); // 同上但去除易混淆的01和OI
	$rv = randChr(10, 'd'); // 10个纯数字, [0-9]
	$rv = randChr(10, 'w'); // 10个纯字母, [A-Z]

*/
function randChr($cnt, $type='c')
{
	static $map = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	$ret = '';
	$range = null;
	if ($type == 'd') {
		$range = [0,9];
	}
	else if ($type == 'w') {
		$range = [10,35];
	}
	else {
		$range = [0, 35];
	}

	while ($cnt > 0) {
		$n = rand($range[0], $range[1]);
		$ch = $map[$n];
		if ($type == 'x' && ($ch=='O' || $ch=='0' || $ch=='1' || $ch=='I'))
			continue;
		$ret .= $ch;
		-- $cnt;
	}
	return $ret;
}

/**
@fn evalExpr($expr, $arr)

表达式计算引擎/规则引擎。
变量必须出现在关联数组$arr中，表达式类似SQL，支持有限的几个函数但允许扩展，其它语法参考PHP（比如三目运算）。

调用示例：

	$rv = evalExpr("a>10 and b='AA'", ["a"=>98, "b"=>"AA"]);
	var_dump($rv); // 如果有运行错将抛出；如果有语法错，php7以上可捕获并抛出，php5直接中止，可查看trace日志或PHP日志。

表达式示例：基本比较运算和逻辑运算，支持括号嵌套，支持null常量：

	a>1 and b='aa' and (c<=0 or c>=100) or (d=null or e!=null)

- and/or/not可分别写作`&& || !`, 注意全部小写
- `=`与`==`相同。
- 单引号与双引号含义相同
- 不允许出现'$'（PHP变量）或';'（多语句）

示例：支持in/not in集合运算：

	a in (3,4) or b not in ('CR', 'PA')

示例：三目运算

	a>1? b: c

内置函数：

- fnmatch(pattern, str), 用于模糊匹配，示例：`fnmatch("a*", b)`; `fnmatch('8*', 888)`值为true

扩展函数：若调用了非内置函数如`f1()`或`f2(a, b)`，则会查询并调用函数`evalExpr_f1()`或`evalExpr_f2($a, $b)`。
显然若函数不存在将报错。支持以下扩展函数：

- timediff(tm1, tm2), 用于日期比较，计算日期tm1-tm2且以秒数返回，如`timediff(tm1, '2023-1-1 10:00') >= 60`; `timediff('2022-1-1 1:00', '2022-1-1')=3600`值为true

@see getVarsFromExpr
*/
function evalExpr($expr, $arr)
{
	// in/not in
	$expr1 = preg_replace_callback('/(\w+) \s* (not\s*)? in \s* \( ([^()]*) \)/ux', function ($ms) {
		$k = $ms[1];
		$v = $ms[3];
		return ($ms[2]?'!':'') . "in_array($k, [$v])";
	}, $expr);

	// 变量求值并替换（后面带括号为函数不替换）；允许使用内置函数；禁止eval等函数，禁止分号
	$expr1 = preg_replace_callback('/\b ([^\W\d]\w*) \b (\()?
		| \'[^\']*\' | "[^"]"
		| ([<>=!]+)
		| ([;$])
	/ux', function ($ms) use ($arr,$expr) {
		@list ($all, $k, $isFn, $op, $deny) = $ms;
		if ($op) {
			if ($op == '=')
				return '==';
			if ($op == '<>')
				return '!=';
			return $op;
		}
		if ($k) {
			if ($isFn) {
				if (in_array($k, ['in_array', 'fnmatch']))
					return $all;
				$fn = "evalExpr_$k";
				if (! function_exists($fn))
					jdRet(E_SERVER, "unknown fn `$k`", "表达式错误: `$expr`, 未知函数`$k`");
				return "$fn(";
			}

			if ($k == 'and')
				return '&&';
			if ($k == 'or')
				return '||';
			if ($k == 'not')
				return '!';
			if ($k == 'null')
				return $all;

			if (!array_key_exists($k, $arr))
				jdRet(E_SERVER, "unknown var `$k`", "表达式错误: `$expr`, 未知变量`$k`");
			$v = $arr[$k];
			if (is_string($v))
				return qstr($v);
			if (is_null($v))
				return 'null';
			return $v;
		}
		if ($deny)
			jdRet(E_SERVER, "forbidden token: `{$deny}`", "表达式错误: `$expr`, 不支持符号`$k`");
		return $all;
	}, $expr1);
	#echo("eval: $expr1\n");
	try {
		return eval("return ($expr1);");
	}
	// php7以上可捕获语法错误(Parse Error)，php5直接中止. Throwable包含Exception和Error等
	catch (Throwable $e) {
		jdRet(E_SERVER, "表达式错误: `$expr`, " . $e->getMessage());
	}
}

/**
@fn getVarsFromExpr($expr)

取表达式中的变量集合：

	$rv = getVarsFromExpr("a in (98,99) and b=null and timediff(c1, '2022-1-1')>3600"); 
	// $rv=["a","b","c1"]

@see evalExpr 表达式引擎
*/
function getVarsFromExpr($expr)
{
	$rv = preg_match_all('/\b ([^\W\d]\w*) \b (?!\()
		| \'[^\']*\' | "[^"]"
	/ux', $expr, $ms);
	return arrGrep($ms[1], function ($e) {
		return $e && !in_array($e, ["and", "or", "not", "in", "null"]);
	});
}

/**
@class JDStatusFile

状态自动加载和保存.
示例：从cleanData.json文件中加载状态到关联数组$stat，并在修改$stat后自动保存。

	{
		// $stat = ["id"=>1000]; // 可以给初始值
		$st = new JDStatusFile("cleanData.json", $stat);
		...
		// unset($st); // 手工调用，立即保存。一般无须调用。
	} // 当$st变量出作用域后，就会自动保存，即使中途有异常，也会自动保存。

注意：

- 保存前会检查$stat数据是否有变化，无变化时不保存。
- 若存在并发访问时，以最后一次写入为准。
- 变量$st即使没有用到也要定义，它的作用域决定了何时写入状态文件。如果直接用`new JDStatusFile()`则对象立即释放无法保存状态。

 */
class JDStatusFile
{
	private $file, $stat, $stat0;
	function __construct($file, &$stat) {
		$this->file = $file;
		@$s = file_get_contents($file);
		if ($s) {
			$stat = json_decode($s, true);
		}
		if (!is_array($stat)) {
			$stat = [];
		}
		$this->stat0 = $stat;
		$this->stat = &$stat;
	}
	function __destruct() {
		if ($this->stat != $this->stat0) {
			$flag = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
			$rv = file_put_contents($this->file, json_encode($this->stat), LOCK_EX);
			if ($rv === false) {
				jdRet(E_SERVER, "fail to write status file: {$this->file}", "文件写入失败");
			}
		}
	}
}

/**
@class Guard

利用对象析构做清理工作，确保清理工作一定会完成。

示例:

	$g = new Guard(function () {
		// do clean task
	});

注意变量$g即使没有用到也要定义，它的作用域决定了何时清理。
*/
class Guard
{
	private $fn;
	function __construct($fn) {
		assert(is_callable($fn));
		$this->fn = $fn;
	}
	function __destruct() {
		call_user_func($this->fn);
	}
}

class SimpleXml
{
	static function writeXml($obj, $tagName) {
		$wr = new XmlWriter();
		$wr->openMemory();
		$wr->setIndent(true);
		self::writeOne($wr, $tagName, $obj);
		$xml = $wr->outputMemory(true);
		return $xml;
	}

	static function writeArr($wr, $arr, $arrName, $elemName, $fieldFn = null) {
		$wr->startElement($arrName);
		$wr->writeAttribute("count", count($arr)); // count属性作为array标识，在readOne时用
		foreach ($arr as $e) {
			self::writeOne($wr, $elemName, $e, $fieldFn);
		}
		$wr->endElement();
	}

	static function writeOne($wr, $k, $v, $fieldFn = null) {
		if ($v === null)
			return;

		$arrayItemPostfix = '_e';
		if (is_array($v)) {
			if (isArray012($v)) {
				self::writeArr($wr, $v, $k, $k . $arrayItemPostfix, $fieldFn);
				return;
			}

			// is obj
			$wr->startElement($k);
			foreach ($v as $k1=>$v1) {
				self::writeOne($wr, $k1, $v1, $fieldFn);
			}
			$wr->endElement();
			return;
		}

		if (is_string($v) && $v != "") {
			if ($fieldFn && $fieldFn($k, $v) === true) {
				return;
			}
			if (preg_match('/[\'\"\n]/', $v)) {
				$wr->startElement($k);
				if (stripos($v, "\n") !== false) {
					$v = "\n" . trim($v) . "\n";
				}
				$wr->writeCData($v);
				$wr->endElement();
				return;
			}
		}

		if ($v === null) {
			$v = "null";
		}
		else if ($v === true) {
			$v = "true";
		}
		else if ($v === false) {
			$v = "false";
		}
		$wr->writeElement($k, $v);
	}
}

// vi: foldmethod=marker
