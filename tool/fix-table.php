<?php
/**
fix-table.php 1.txt F:att G:pic [options]

处理1.txt文件，该文件是TAB分隔的文本文件，一般是从Excel直接拷贝粘贴到文本文件保存即可。第一行是标题行，会被忽略，不做处理。
将F列做att处理，做G列做pic处理。列名从A开始，与Excel中的列名相同。

支持的处理：

- att: 该列是一个或多个以逗号分隔的文件名，通过upload接口上传后将该列转为图片编号数字；
- pic: 该列是一个或多个以逗号分隔的图片文件名，通过upload接口上传并生成缩略图，用返回缩略图编号覆盖原字段。

注意：

- 上传不需要缩略图的图片，使用att而不是pic来处理。
- 上传图片默认使用ImageMagick程序做压缩，最大保留1200像素。请自行安装该软件。设置参数-resize=0则禁用压缩。
- 若需要定制缩略图大小或加其它参数，甚至调用其它接口，可以扩展处理方式。比如自定义一个myfunc1函数处理K列：`K:myfunc1`

支持的选项：

- baseUrl: 用于调用接口。示例(缺省值)："http://localhost/jdcloud/server/api.php/"
- line: 指定处理哪些行
- sep: 间隔符，默认为TAB
- resize: 默认值1200。如果是图片上传，会先压缩图片到不超过1200像素。设置为0则禁用压缩。
 注意：它调用magick命令来处理压缩，必须先安装ImageMagic 7.x版本程序，并确保magick命令可用。

只处理第2行：（标题行是第1行，所以第2行其实是数据的第1行）

	php fix-table.php 1.txt F:att G:pic -baseUrl:http://localhost/jdcloud/server/api.php/ -line:2

处理第3-10行：

	php fix-table.php 1.txt F:att G:pic -line:3-10

从第11行起处理：

	php fix-table.php 1.txt F:att G:pic -line:11-0

一次处理一行，生成新文件 {原文件名}-fixed.txt，比如1-fixed.txt

扩展处理函数：函数名为`fn_{处理名}`，处理旧值，返回新值，若返回false表示忽略处理。遇到错误可抛出异常。
自定义的扩展应放在fix-table.conf.php文件中。

示例：myfunc1处理

	function fn_myfunc1($val, $idx, $row)
	{
		return false;
	}

示例：pic300，上传图片，不要缩略图，但压缩到长宽最大300.

	function fn_pic300($val, $idx, $row)
	{
		return fixUpload($val, [
			"genThumb"=>0,
			"autoResize"=>300
		], "id");
	}
 */

if ($argc < 3) {
	echo("Usage: fix-table.php <tab-seperated-txt-file> <column-fix1> <column-fix2> ... [-line:1-10] [-baseUrl:http://localhost/jdcloud/api.php] ...\n");
	echo("Example: fix-table.php 1.txt F:att G:pic\n");
	echo("         fix-table.php 1.txt F:att G:pic -baseUrl:http://server/app/api/ -line:1-10\n");
	echo("         fix-table.php 1.txt F:att G:pic -line:10-0\n");
	exit(1);
}
$file = $argv[1];

$opts = [
	"baseUrl" => "http://localhost/jdcloud/server/api.php/",
	"fixDef" => [],  // elem: {index => name}
	"from" => 1,
	"to" => 0,
	"sep" => "\t",
	"resize" => 1200
];
// parse options
for ($i=2; $i<$argc; ++$i) {
	$s = $argv[$i];
	if (preg_match('/^([A-Z]):(\w+)$/', $s, $ms)) {
		$idx = ord($ms[1]) - ord("A");
		if ($idx < 0 || $idx > 25)
			die("bad column " . $ms[1] . "\n");
			$fn = "fn_" . $ms[2];
			if (! is_callable($fn))
				die("*** bad fix function: {$ms[2]}\n");
		$opts["fixDef"][$idx] = $fn;
	}
	else if (preg_match('/^-line:(\d+)(?:-(\d+))?$/', $s, $ms)) {
		$opts["from"] = intval($ms[1]);
		if (isset($ms[2]))
			$opts["to"] = intval($ms[2]);
		else
			$opts["to"] = $opts["from"];
	}
	else if (preg_match('/^-(\w+):(\S+)$/', $s, $ms)) {
		$opts[$ms[1]] = $ms[2];
	}
	else  {
		die("unknonw option: $s\n");
	}
}

@include("fix-table.conf.php");

//var_dump($opts);
$sep = $opts["sep"];
if (! is_file($file)) {
	die("*** Fail: cannot open file `$file'\n");
}

$fileOut = pathinfo($file, PATHINFO_FILENAME) . "-fixed.txt";
logit("=== output to $fileOut");

$fp = fopen($file, "r");
$fp1 = fopen($fileOut, "w");
$rowIdx = 0;
while ( ($row = fgetcsv($fp, 0, $sep)) !== false) {
	++ $rowIdx;
	if ($rowIdx == 1)
		goto nx;
	if ($rowIdx < $opts["from"] || ($opts["to"] > 0 && $rowIdx > $opts["to"]))
		goto nx;
	foreach ($opts["fixDef"] as $idx => $fn) {
		if (isset($row[$idx])) {
			$pos = "row $rowIdx, col " . ($idx+1);
			try {
				// !!! fix cells !!!
				logit("=== [$pos]: call $fn, val=" . $row[$idx]);
				$rv = $fn($row[$idx], $idx, $row);
				if ($rv !== false) {
					$row[$idx] = $rv;
					logit("=== [$pos]: newval=" . $row[$idx]);
				}
				else {
					logit("=== [$pos]: skipped");
				}
			}
			catch (FixException $e) {
				logit("!!! [$pos]: fail to call $fn: " . $e->getMessage());
			}
		}
	}
nx:
	fputcsv($fp1, $row, $sep);
	fflush($fp1);
}
fclose($fp1);
fclose($fp);

// ========== tools ==========
class FixException extends RuntimeException
{}

function logit($str, $print=true)
{
	file_put_contents("trace.log", $str . "\n", FILE_APPEND);
	if ($print)
		print($str . "\n");
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
		$data = json_encode($postParams);
		curl_setopt($h, CURLOPT_POST, true);
		curl_setopt($h, CURLOPT_POSTFIELDS, $postParams);
	}
	$t0 = microtime(true);
	$content = curl_exec($h);
	$tv = round(microtime(true) - $t0, 2);
//	$statusCode = curl_getinfo($h, CURLINFO_HTTP_CODE); // $status["http_code"]
// 	$status = curl_getinfo($h);
// 	if (intval($status["http_code"]) != 200)
// 		return false;
	$msg = "httpCall: url=$url, time={$tv}s, postParam=$data, return=$content";
	logit($msg, false);
	$errno = curl_errno($h);
	if ($errno)
	{
		$errmsg = curl_error($h);
		curl_close($h);
		$msg = "httpCall error $errno: time={$tv}s, url=$url, errmsg=$errmsg";
		logit($msg);
		throw new FixException($msg);
		// echo "<a href='http://curl.haxx.se/libcurl/c/libcurl-errors.html'>错误原因查询</a></br>";
	}
	curl_close($h);
	return $content;
}

function callSvr($ac, $param, $postParam)
{
	global $opts;
	$url = $opts["baseUrl"] . '/' . $ac;
	if ($param)
		$url .= "?" . urlEncodeArr($param);
	$rv0 = httpCall($url, $postParam, [
		"headers" => ["x-daca-simple: 1234"]
	]);
	$rv = json_decode($rv0, true);
	if (!is_array($rv) || $rv[0] != 0)
		throw new FixException("bad call to $url, return: $rv0");
	return $rv[1];
}
// ==========  处理函数定义 ==========
function fixUpload($val, $param, $wantField="id", $fileProc=null)
{
	// 已处理过, 全数字或逗号, 忽略处理
	if (preg_match('/^[\d,]+$/', $val))
		return false;

	$files = preg_split('/\s*,\s*/', $val);
	$post = [];
	$i = 0;
	foreach ($files as $f) {
		if (! is_file($f))
			throw new FixException("cannot open file: $f");
		++ $i;
		if ($fileProc) {
			$f = $fileProc($f);
		}
		$post["file{$i}"] = "@" . $f;
	}
	$rv = callSvr("upload", $param, $post);
	$arr = array_map(function ($e) { 
		return $e["id"];
	}, $rv);
	return join(",", $arr);
}

function fn_att($val, $idx, $row)
{
	return fixUpload($val, ["autoResize"=>0], "id");
}

function fn_pic($val, $idx, $row)
{
	return fixUpload($val, ["genThumb"=>1], "thumbId", function ($f) {
		global $opts;
		if ($opts["resize"] <= 0)
			return $f;

		if (! is_dir("tmp"))
			mkdir("tmp");
		$f1 = "tmp/" . basename($f);
		$resize = $opts["resize"];
		$cmd = "magick \"$f\" -resize $resize -quality 80 \"$f1\"";
		system($cmd, $rv);
		if ($rv) {
			echo("*** Fail to compress pic: $f");
			exit(1);
		}
		return $f1;
	});
}

