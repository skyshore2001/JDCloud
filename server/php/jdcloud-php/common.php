<?php

define("T_HOUR", 3600);
define("T_DAY", 24*T_HOUR);
define("FMT_DT", "Y-m-d H:i:s");
define("FMT_D", "Y-m-d");
// const T_DAY = 24*T_HOUR; // not allowed

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
	E_ABORT => "中止执行"
];

/** 
@class MyException($code, $internalMsg?, $outMsg?)

@param $internalMsg String. 内部错误信息，前端不应处理。
@param $outMsg String. 错误信息。如果为空，则会自动根据$code填上相应的错误信息。

抛出错误，中断执行:

	throw new MyException(E_PARAM, "Bad Request - numeric param `$name`=`$ret`.", "需要数值型参数");

注意：在API中抛出MyException异常后，将回滚对数据库的操作，即所有之前数据库操作都将失效。
如果不想回滚，可以用：

	$this->cancelOrder($id); // 数据库操作
	setRet(E_FORBIDDEN, "付款码已失效", "fail to pay order $id: overdue");
	throw new DirectReturn();
*/
# Most time outMsg is optional because it can be filled according to code. It's set when you want to tell user the exact error.
class MyException extends LogicException 
{
	function __construct($code, $internalMsg = null, $outMsg = null) {
		parent::__construct($outMsg, $code);
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
		$str = "MyException({$this->code}): {$this->internalMsg} - " . $this->file . ':' . $this->line;
		if ($this->getMessage() != null)
			$str = "Error: " . $this->getMessage() . " - " . $str;
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
	return php_sapi_name() == "cli";
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
*/
function urlEncodeArr($params)
{
	$p = "";
	foreach ($params as $k=>$v) {
		if ($v === null)
			continue;
		if ($p !== "")
			$p .= "&";
		$p .= $k . "=" . urlencode($v);
	}
	return $p;
}

/**
@fn makeUrl($ac, $params, $hash)

e.g.

	$url = makeUrl("http://oliveche.com/jdcloud/api.php", ["p1"=>"abc", "p2"=>"333"])
*/
function makeUrl($ac, $params, $hash = null)
{
	if (preg_match('/^[\w\.]+$/', $ac)) {
		$url = getBaseUrl(false) . "api.php/" . $ac;
	}
	else {
		$url = $ac;
	}
	if ($params) {
		$url .= "?" . urlEncodeArr($params);
	}
	if ($hash)
		$url .= $hash;
	return $url;
}

/**
@fn httpCall($url, $postParams =null, $opt={timeout?=5, @headers, %curlOpt={optName=>val} )

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

	// 用json_encode将数组变成字符串。避免被httpCall转成urlencoded格式。
	$data = json_encode([
		"name" => "xiaoming",
		"classId" => 100
	]);
	$headers = [
		"Content-type: application/json",
		"Authorization: Basic dGVzdDp0ZXN0MTIz"
	];
	$GLOBALS["X_RET_STR"] = httpCall($url, $data, ["headers" => $headers]);
	// 筋斗云：设置全局变量X_RET_STR可直接设置返回内容，避免再次被json编码。

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

出错及慢调用会记录到日志中，以下环境变量可控制日志记录：

	# 默认情况下：日志记录到trace.log中，记录超过1s的慢调用
	P_SLOW_CALL_LOG=trace
	P_SLOW_CALL_VAL=1

e.g.

	$url = makeUrl("http://oliveche.com/echo.php", ["a"=>1, "b"=>@$GLOBALS["b"]]);
	echo(httpCall($url, ["c"=>1, "d"=>0] ));

@see makeUrl
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
	if (@$opt["headers"])
		curl_setopt($h, CURLOPT_HTTPHEADER, $opt["headers"]);

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
			$data = urlEncodeArr($postParams);
		}
		else {
			$data = $postParams;
		}
		curl_setopt($h, CURLOPT_POST, true);
		curl_setopt($h, CURLOPT_POSTFIELDS, $data);
	}
	$t0 = microtime(true);
	$content = curl_exec($h);
	$tv = round(microtime(true) - $t0, 2);
//	$statusCode = curl_getinfo($h, CURLINFO_HTTP_CODE); // $status["http_code"]
// 	$status = curl_getinfo($h);
// 	if (intval($status["http_code"]) != 200)
// 		return false;
	$slowLogFile = getenv("P_SLOW_CALL_LOG") ?: "trace";
	$errno = curl_errno($h);
	if ($errno)
	{
		$errmsg = curl_error($h);
		curl_close($h);
		$msg = "httpCall error $errno: time={$tv}s, url=$url, errmsg=$errmsg";
		logit($msg, true, $slowLogFile);
		throw new MyException(E_SERVER, $msg, "服务器请求出错或超时");
		// echo "<a href='http://curl.haxx.se/libcurl/c/libcurl-errors.html'>错误原因查询</a></br>";
	}
	// slow log
	$slowVal = getenv("P_SLOW_CALL_VAL") ?: 1;
	if ($tv > $slowVal) {
		logit("httpCall slow call: time={$tv}s, url=$url", true, $slowLogFile);
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

	$arrCopy($wiData, $workItem); // 复制全部字段过去

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
@fn getReqIp

请求的IP。与`$_SERVER['REMOTE_ADDR']`不同的是，如果有代理，则返回所有IP列表。
*/
function getReqIp()
{
	if (isCLI()) {
		return "cli";
	}
	static $reqIp;
	if (!isset($reqIp)) {
		$reqIp = @$_SERVER['REMOTE_ADDR'] ?: 'unknown';
		@$fw = $_SERVER["HTTP_X_FORWARDED_FOR"] ?: $_SERVER["HTTP_CLIENT_IP"];
		if ($fw) {
			$reqIp .= '; ' . $fw;
		}
	}
	return $reqIp;
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
		$remoteAddr = getReqIp();
		$s = "=== REQ from [$remoteAddr] at [".strftime("%Y/%m/%d %H:%M:%S",time())."] " . $s . "\n";
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
@fn pivot($objArr, $gcols, $ycolCnt=1)

将行转置到列。一般用于统计分析数据处理。

- $gcols为转置字段，可以是一个或多个字段。可以是个字符串("f1" 或 "f1,f2")，也可以是个数组（如["f1","f2"]）
- $objArr是对象数组，默认最后一列是统计列，如果想要最后两列作为统计列，可以指定参数ycolCnt=2。注意此时最终统计值将是一个数组。
- 以objArr[0]这个对象为基准，除去最后ycolCnt个字段做为统计列(ycols)，再除去gcols指定的要转置到列的字段，剩下的列就是xcols：相同的xcols会归并到一行中。

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
function pivot($objArr, $gcols, $ycolCnt=1)
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
//	$xcolCnt = count($xcols);

	$firstX = null;
	foreach ($objArr as $row) {
		// $x = xtext($row);
		$xarr = [];
		foreach ($xcols as $col) {
			$xarr[$col] = $row[$col];
		}
		$x = join('-', $xarr);

		$garr = array_map(function ($col) use ($row) {
			return $row[$col];
		}, $gcols);
		$g = join('-', $garr) ?: "(null)";

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
function mh($val)
{
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

// vi: foldmethod=marker
