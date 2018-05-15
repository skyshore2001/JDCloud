<?php

define("T_HOUR", 3600);
define("T_DAY", 24*T_HOUR);
define("FMT_DT", "Y-m-d H:i:s");

// const T_DAY = 24*T_HOUR; // not allowed

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

*/
function urlEncodeArr($params)
{
	$p = "";
	foreach ($params as $k=>$v) {
		if ($p !== "")
			$p .= "&";
		$p .= $k . "=" . urlencode($v);
	}
	return $p;
}

/**
@fn makeUrl($ac, $params, $hash)
*/
function makeUrl($ac, $params, $hash = null)
{
	$url = $ac;
	if ($params) {
		$url .= "?" . urlEncodeArr($params);
	}
	if ($hash)
		$url .= $hash;
	return $url;
}

/**
@fn httpCall($url, $postParams =null, $opt={timeout?=5, @headers} )

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
		"Authorization: Basic dGVzdDp0ZXN0MTIz"
	];
	$rv = httpCall($url, $data, ["headers" => $headers]);

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

*/
function httpCall($url, $postParams=null, $opt=[])
{
	$h = curl_init();
	if(stripos($url,"https://")!==FALSE){
		curl_setopt($h, CURLOPT_SSL_VERIFYPEER, FALSE);
		curl_setopt($h, CURLOPT_SSL_VERIFYHOST, FALSE);
		curl_setopt($h, CURLOPT_SSLVERSION, 1); //CURL_SSLVERSION_TLSv1
	}
	curl_setopt($h, CURLOPT_URL, $url);
	curl_setopt($h, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($h, CURLOPT_HEADER, FALSE);

	$timeout = @$opt["timeout"] ?: 5;
	curl_setopt($h, CURLOPT_TIMEOUT, $timeout);
	if (@$opt["headers"])
		curl_setopt($h, CURLOPT_HTTPHEADER, $opt["headers"]);

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
	$content = curl_exec($h);
// 	$status = curl_getinfo($h);
// 	if (intval($status["http_code"]) != 200)
// 		return false;
	if (! $content)
	{
		$errno = curl_errno($h);
		curl_close($h);
		throw new MyException(E_SERVER, "curl fail to connect $url, errcode=$errno");
		// echo "<a href='http://curl.haxx.se/libcurl/c/libcurl-errors.html'>错误原因查询</a></br>";
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

// vi: foldmethod=marker
