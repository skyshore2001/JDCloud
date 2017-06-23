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

	if (isset($postParams)) {
		if (is_array($postParams)) {
			$data = urlEncodeArr(postParams);
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

// vi: foldmethod=marker
