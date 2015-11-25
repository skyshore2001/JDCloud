<?php
require_once('HttpResponse.php');

###### config {{{
$URL_LOCAL = "http://localhost:8080";
#$URL_REMOTE = "http://115.29.199.210/cheguanjia";

$SVC_URL = getenv("SVC_URL");
if ($SVC_URL === false)
	$SVC_URL = $URL_LOCAL;
#}}}

###### app toolkit {{{
# e.g. serializeArrParam("items", [['id'=>100,'qty'=>1], ['id'=>101, 'qty'=>2]]) => "items[0][id]=100&items[0][qty]=1&items[1][id]=101&items[1][qty]=2"
function serializeArrParam($name, $arr)
{
	$ret = [];
	foreach ($arr as $k=>$v) {
		$name1 = $name . "[$k]";
		if (is_array($v)) {
			$ret[] = serializeArrParam($name1, $v);
		}
		else {
			$ret[] = "$name1=" . urlencode($v);
		}
	}
	return join("&", $ret);
}

function makeParam($param, $boundary=null)
{
	$data = '';

	# for batch like file upload: ContentType = multipart/form-data; 
	if ($boundary) {
/* example of multipart/form-data format:

Content-Type:multipart/form-data; boundary=----WebKitFormBoundary6oVKiDmuQSPOtt2L
Content-Length: ...

------WebKitFormBoundary6oVKiDmuQSPOtt2L
Content-Disposition: form-data; name="file1"; filename="file1.txt"
Content-Type: text/plain

(content of file1)
------WebKitFormBoundary6oVKiDmuQSPOtt2L
Content-Disposition: form-data; name="file2"; filename="file2.txt"
Content-Type: text/plain

(content of file2)
------WebKitFormBoundary6oVKiDmuQSPOtt2L--
 */
		foreach ($param as $k=>$v) {
			if (! isset($v))
				continue;
			if ($v === false) {
				$v = 0;
			}
			# it's file
			if ($v[0] == '@') {
				$fname = substr($v, 1);
				$content = file_get_contents($fname);
				if ($content === false) {
					die("cannot read file $fname");
				}
				$contentType = "text/plain";
				if (preg_match('/\.(jpg|png|gif)$/i', $fname, $ms)) {
					$ext = strtolower($ms[1]);
					$mime = [
						"jpg" => "image/jpeg",
						"png" => "image/png",
						"gif" => "image/gif",
						];
					$contentType = $mime[$ext];
				}

				$data .= "--$boundary\r\nContent-Disposition: form-data; name=\"$k\"; filename=\"$fname\"\r\nContent-Type: {$contentType}\r\n\r\n$content\r\n";
			}
			else {
				$data .= "--$boundary\r\nContent-Disposition: form-data; name=\"$k\";\r\nContent-Type: text/plain\r\n\r\n" . urlencode($v) . "\r\n";
			}
		}
		return $data . "--$boundary--\r\n";
	}

	foreach ($param as $k=>$v) {
		if (! isset($v))
			continue;
		if (strlen($data) > 0) {
			$data .= "&";
		}
		if (is_array($v)) {
			$data .= serializeArrParam($k, $v);
		}
		else {
			$data .= "$k=" . urlencode($v);
		}
	}
	return $data;
}

function checkParam(&$param)
{
	if (!is_string($param))
		return;
	if (preg_match('/^\s*\[.*\]\s*$/', $param)) {
		$param = @eval("return " . $param . ";");
		if ($param === false) {
			throw new Exception("bad format for param");
		}
	}
}

# param can be array or scalar, e.g ["id"=>1, "name"=>"xx"] or "id=1&name=xx"
function makeUrl($ac, $param=null)
{
	global $SVC_URL;
	if (preg_match('/\.php$/', $ac)) {
		$url = "$SVC_URL/$ac";
		if ($param)
			$url .= "?";
	}
	else {
		$url = "$SVC_URL/api.php/$ac";
		if ($param)
			$url .= "?";
// 		$url = "$SVC_URL/api.php?ac=$ac";
// 		if ($param)
// 			$url .= "&";
	}
	if (is_array($param)) {
		if (! empty($param)) {
			$param = makeParam($param);
		}
	}
	if ($param) {
		$url .= $param;
	}
#	$url .= "&rnd=" . rand();
	return $url;
}

#}}}

# NOTE: public methods marked as "@api" are for client.php. run `client.php` directly for a list of APIs.
class WebAPI
{
	public $cookieFile = "cookie.txt";
	protected $printRes;
	protected $markInitDB =false;

	function __construct($printRes = false) {
		$this->printRes = $printRes;
	}

	# call it to init DB for next request.
	function markInitDB()
	{
		$this->markInitDB = true;
	}

	protected $LOG_FILE = "rtest.log";
	protected function logit($str)
	{
		file_put_contents($this->LOG_FILE, $str, FILE_APPEND);
		if ($this->printRes)
			echo $str;
	}

	static function addParam(&$param, $k, $v)
	{
		if (is_string($param))
			$param .= "&$k=$v";
		elseif(is_null($param) || is_array($param))
			$param[$k] = $v;
	}
	static function getTestMode()
	{
		$v = getenv("P_TEST");
		if ($v === false)
			$v = 1;
		return $v;
	}

	# param/data can be array or scalar, e.g ["id"=>1, "name"=>"xx"] or "id=1&name=xx" or "@file1" (means load data from file1)
	# $opt["forBatch"]
	#   if true, it use multipart/form-data format for content. to send a file, use data like this: ["file1"=>"@filename"] (use pending "@" to mark it as file)
	# $opt["outputFile"]
	#   if set, write the content into this file
	/** @api */
	function callSvr($ac, $param = null, $data = null, $opt = null)
	{
		$h = curl_init();

		checkParam($param);
		checkParam($data);

		$dbgLevel = intval(getenv("P_DEBUG"));
		if (isset($dbgLevel) && $dbgLevel > 0) {
			self::addParam($param, "_debug", $dbgLevel);
			if ($dbgLevel >= 9)
				self::addParam($param, "XDEBUG_SESSION_START", "netbeans-xdebug");
		}
		$_app = getenv("P_APP");
		if ($_app != "") {
			self::addParam($param, "_app", $_app);
		}
		$_test = self::getTestMode();
		if ($_test)
			self::addParam($param, "_test", $_test);

		$url = makeUrl($ac, $param);
		curl_setopt($h, CURLOPT_URL, $url);
		curl_setopt($h, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($h, CURLOPT_HEADER, 1);
		curl_setopt($h, CURLOPT_COOKIEFILE, $this->cookieFile);
		curl_setopt($h, CURLOPT_COOKIEJAR, $this->cookieFile);
		// curl_setopt($h, CURLOPT_USERAGENT, '小鳄养车 0.9.5 rv:15 (iPhone; iPhone OS 8.4; zh_CN)');

		$header = array();
		if ($this->markInitDB) {
			$header[] = "bc-initdb: 1";
			$this->markInitDB = false;
		}

		if (isset($data)) {
			$boundary = null;
			if (! @$opt["forBatch"]) {
				$contentType = "application/x-www-form-urlencoded";
			}
			else {
				$boundary = "WebTest" . rand(1000,9999);
				$contentType = "multipart/form-data; boundary=$boundary";
			}
			if (is_array($data)) {
				$data = makeParam($data, $boundary);
			}
			else {
				// use file as content
				if (is_string($data) && $data[0] === '@') {
					$fname = substr($data, 1);
					$data = file_get_contents($fname);
					if ($data === false) {
						die("cannot read file $fname");
					}
				}
			}
			curl_setopt($h, CURLOPT_POST, 1);
			curl_setopt($h, CURLOPT_POSTFIELDS, $data);

			if ($boundary)
			{
				# show in log
				$data = "(uploaded files)\n";
			}
		}
		else {
			$contentType = 'text/plain';
		}
		$header[] = "Content-Type: $contentType";
		if (isset($data))
			$header[] = 'Expect:';  # disable header: "Expect： 100-continue". direct post, dont ask server.
		curl_setopt($h, CURLOPT_HTTPHEADER, $header);

		// log request
		$this->logit(sprintf("=== REQUEST: %s\r\n%s %s\r\n%s\r\n\r\n%s", 
			$ac,
			isset($data)? "POST": "GET",
			$url, 
			empty($header)? "": join("\r\n", $header),
			isset($data)? "$data\r\n\r\n": ""
		));

		# for https, ignore cert errors (e.g. for self-signed cert)
		curl_setopt($h, CURLOPT_SSL_VERIFYPEER, false);
		curl_setopt($h, CURLOPT_SSL_VERIFYHOST, 0);

		$rv = curl_exec($h);

		$this->logit( sprintf("=== RESPONSE: %s\r\n", $ac));
		if ($rv === false) {
			$err = curl_error($h);
			curl_close($h);
			$this->logit($err);
			throw new BadHttpReponseException($err);
		}
		curl_close($h);

		$outputFile = @$opt["outputFile"];

		// log response
		if (!$outputFile) {
			$this->logit($rv);
			$res = new HttpResponse($rv);
		}
		else {
			$p1 = strpos($rv, "\r\n\r\n");
			if ($p1 === false)
			{
				$hdr = $rv;
			}
			else
			{
				$hdr = substr($rv, 0, $p1+4);
			}
			$this->logit($hdr);
			$res = new HttpResponse($hdr);
			if ($p1 !== false) {
				file_put_contents($outputFile, substr($rv, $p1+4));
				$this->logit("=== content is saved in file `$outputFile`");
			}
		}

		return $res;
	}

	/** @api */
	function genCode($phone, $type = "d6", $debug = 0)
	{
		return $this->callSvr("gencode", ["phone" => $phone, "type" => $type, "debug"=>$debug]);
	}

	/** @api */
	function reg($phone, $pwd, $name, $code)
	{
		return $this->callSvr("reg", ["phone" => $phone, "pwd" => $pwd, "name"=>$name, "code"=>$code]);
	}

	/** @api */
	function login($uname, $pwd, $app = null)
	{
		return $this->callSvr("login", ["uname" => $uname, "pwd" => $pwd, "_app" => $app]);
	}

	/** @api */
	function logout($type = null)
	{
		return $this->callSvr("logout", ["_t" => $type]);
	}

	/** @api */
	function chpwd($pwd, $oldpwd=null, $code=null)
	{
		return $this->callSvr("chpwd", ["pwd"=>$pwd, "oldpwd"=>$oldpwd, "code"=>$code]);
	}

	/** @api */
	function whoami($type = null)
	{
		return $this->callSvr("whoami", ["_t"=>$type]);
	}

	/** @api */
	function execSql($sql, $fmt = null, $wantId=null)
	{
		if (is_null($wantId))
			$wantId = (stripos($sql, "insert") !== false? 1: 0);
		return $this->callSvr("execSql", ["sql" => $sql, "fmt"=>$fmt, "wantId"=>$wantId]);
	}

	/** @api */
	function upload($file1, $file2=null, $type=null, $genThumb=null)
	{
		$files = [];
		$n = 1;
		foreach ([$file1, $file2] as $f) {
			if (is_null($f))
				continue;
			if (! is_file($f)) {
				die("cannot find file $f!\n");
			}
			$files["file$n"] = "@$f";
			++$n;
		}
		return $this->callSvr("upload", ["type"=>$type, "genThumb"=>$genThumb], $files, ["forBatch"=>true]);
	}

	/** @api */
	function att($id=null, $thumbId=null, $outputFile="1.jpg")
	{
		return $this->callSvr("att", ["id"=>$id, "thumbId"=>$thumbId], null, ["outputFile"=>$outputFile]);
	}
}

# vim: set foldmethod=marker :
?>
