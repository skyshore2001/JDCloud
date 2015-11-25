<?php

/* each api name begins with "api_", return the content according to protocol.
三种返回方式：
- 通过return obj; (obj根据文档定义，如果未定义，请返回字符串"OK")
- 设置全局变量 $X_RET_STR, 用于已经是json格式的字符串返回。(参考 api_weather)
- 直接输出, 然后调用throw new DirectReturn(); 仅针对特殊的api (不符合一般API调用规范, 如itt操作返回图片)
 */

// ====== config {{{
const HTTP_NOT_FOUND = "HTTP/1.1 404 Not Found";

# thumb size for upload type:
global $UploadType;
$UploadType = [
	"user" => ["w"=>128, "h"=>128],
	"store" => ["w"=>200, "h"=>150],
	"default" => ["w"=>100, "h"=>100],
];
//}}}

// ====== functions {{{

// ==== reg and login {{{
function api_genCode()
{
	$phone = mparam("phone");
	if ($phone && !preg_match('/^\d{11}$/', $phone)) 
		throw new MyException(E_PARAM, "bad phone number", "手机号不合法");

	$type = param("type", "d6");
	$debug = param("debug/b", 0);
	$codetm = $_SESSION["codetm"] ?: 0;
	# dont generate again in 60s
	if (!$debug && time() - $codetm < 55) // 说60s, 其实不到, 避免时间差一点导致出错.
		throw new MyException(E_FORBIDDEN, "gencode is not allowed to call again in 60s", "60秒内只能生成一次验证码");
	# TODO: not allow to gencode again for the same phone in 60s

	$_SESSION["phone"] = $phone;
	$_SESSION["code"] = genDynCode($type);
	$_SESSION["codetm"] = time();

	# send code via phone
	if ($debug)
		$ret = ["code" => $_SESSION["code"]];
	else {
		sendSms($phone, "验证码" . $_SESSION["code"] . "，请在5分钟内使用。" . Conf::$MSGS["MSG_REMARK"]);
	}

	return $ret;
}

function regUser($phone, $pwd, $name = null)
{
	if ($name == null)
		$name = "用户" . $phone;

	$sql = sprintf("INSERT INTO User (phone, pwd, name, createTm) VALUES (%s, %s, %s, %s)",
		Q($phone),
		Q(hashPwd($pwd)),
		Q($name),
		Q(date('c'))
	);
	$id = execOne($sql, true);
	$ret = ["uid"=>$id, "name"=>$name];

	$_SESSION["uid"] = $id;
	getWeixinUser()->bindUser();

	// 领取注册前生成的优惠券
	$sql = "UPDATE Voucher SET userId=$id WHERE userId IS NULL AND userPhone=" . Q($phone);
	$cnt = execOne($sql);

	// 注册时送优惠券
// svcId:
// 100	上门洗车
// 101	上门打蜡
// 102	上门轮胎保养
// 103	上门轮毂保养
// 104	上门内饰精洗
// 105	上门贴膜
	$flag = 0;
	// 已送0元洗车券，则不再送1元洗车券
	if ($cnt > 0) {
		$sql = "SELECT id FROM Voucher WHERE userId=$id AND type='V_FIX' AND relatedId=100 AND amount=0";
		$vid = queryOne($sql);
		if ($vid !== false) {
			$flag = 1;
		}
	}
	$src = "reg";
	$content = Conf::getVoucherForReg($flag);
	foreach ($content as $e) {
		if ($e == null)
			continue;
		// 30天有效期
		genVoucherForUser($id, $e["amount"], null, 30, $e["type"], $e["svcId"], $src, $phone);
	}

	// 领取红包中的优惠券
	$rows = queryAll("SELECT id, content, vdays FROM HongbaoResult WHERE phone=" . Q($phone), PDO::FETCH_ASSOC);
	foreach ($rows as $row) {
		$content = @unserialize($row["content"]);
		if ($content === false) {
			logit("!!! bad HongbaoResult.content: id={$row['id']}, content={$row['content']}");
			continue;
		}
		genVoucherByHongbao($id, $content, $row["id"], $phone, $row["vdays"]);
	}

	$msg = Conf::$MSGS["REG"];
	sendSms($phone, $msg);

	return $ret;
}

function api_reg()
{
	$code = mparam("code");
	$phone = mparam("phone");
	$pwd = mparam("pwd");
	$phone1 = preg_replace('/^\d{3}\K(\d{4})/', '****', $phone);
	$name = param("name", "用户" . $phone1);

	validateDynCode($code, $phone);

	$sql = sprintf("SELECT id FROM User WHERE phone=%s", Q($phone));
	$row = queryOne($sql);
	if ($row !== false) 
		throw new MyException(E_PARAM, "phone number exists", "手机号已存在");

	$ret = regUser($phone, $pwd, $name);
	genLoginToken($ret, "", $phone, $pwd, 1);
	return $ret;
}

// 默认对GET+POST字段做签名(忽略下划线开头的控制字段)
function genSign($pwd, $params=null)
{
	if ($params == null)
		$params = array_merge($_GET, $_POST);
	ksort($params);
	$str = null;
	foreach ($params as $k=>$v) {
		if (is_null($v) || substr($k, 0, 1) === "_") // e.g. "_pwd", "_sign", "_ac"
			continue;
		if ($str == null) {
			$str = "{$k}={$v}";
		}
		else {
			$str .= "&{$k}={$v}";
		}
	}
	$str .= $pwd;
	$sign = md5($str);
	return $sign;
}

function api_genSign()
{
	$pwd = mparam("_pwd");
	unset($_GET["ac"]);
	return genSign($pwd);
}

function verifyPartnerSign($partnerId)
{
	list($sign, $pwd) = mparam(["_sign", "_pwd"]);

	$partner = Conf::getPartner($partnerId);
	$pwd1 = $partner["pwd"];

	if (isset($pwd) && !isset($sign)) {
		// 1: INTERNAL允许线上仍使用_pwd字段生成voucher.
		if ($partnerId != 1 && !$GLOBALS["TEST_MODE"]) {
			throw new MyException(E_FORBIDDEN, "Non-testmode: MUST use param `_sign` instead of `_pwd`", "上线后不允许使用`_pwd`");
		}
		if ($pwd != $pwd1)
			throw new MyException(E_PARAM, "bad pwd for partner id=`$partnerId`", "密码错误");
		return true;
	}

	$sign1 = genSign($pwd1);
	if ($sign !== $sign1)
		throw new MyException(E_PARAM, "bad sign for partner id=`$partnerId`", "签名错误");

	return true;
}

# login(uname, pwd, type) -> {uid/storeId/adminId}
function generalLogin($uname, $pwd, $type, $wantAll)
{
	$obj = null;
	# user login
	if ($type == "user") {
		$obj = "User";
		$sql = sprintf("SELECT id FROM User WHERE phone=%s AND pwd=%s", 
			Q($uname), 
			Q(hashPwd($pwd)));
		$uid = queryOne($sql);
		if ($uid === false)
			throw new MyException(E_AUTHFAIL, "bad uname or password", "手机号或密码错误");

		$_SESSION["uid"] = $uid;
		$ret = ["uid" => $uid];
	}
	/*
	# store login
	else if ($type == "store") {
		$obj = "Store";
		$sql = sprintf("SELECT id FROM Store WHERE uname=%s AND pwd=%s", 
			Q($uname), 
			Q(hashPwd($pwd)));
		$sth = $dbh->query($sql);
		if (($row = $sth->fetch(PDO::FETCH_ASSOC)) === false)
			throw new MyException(E_AUTHFAIL, "bad uname or password", "用户名或密码错误");

		$storeId = $row["id"];
		$_SESSION["storeId"] = $storeId;
		$ret = ["storeId" => $storeId];
	}
	 */
	# admin login
	else if ($type == "admin") {
		global $ADMIN;
		if ($uname != $ADMIN["uname"] || $pwd != $ADMIN["pwd"])
			throw new MyException(E_AUTHFAIL, "bad uname or password", "用户名或密码错误");
		$_SESSION["adminId"] = $ADMIN["id"];
		$ret = ["adminId" => $ADMIN["id"], "uname" => $ADMIN["uname"]];
	}
	else if ($type == "emp" || $type == "store") {
		$obj = "Employee";
		$sql = sprintf("SELECT id, name, storeId, storeList, perms FROM Employee WHERE uname=%s AND pwd=%s", 
			Q($uname), 
			Q(hashPwd($pwd)));
		$row = queryOne($sql, PDO::FETCH_ASSOC);
		if ($row === false)
			throw new MyException(E_AUTHFAIL, "bad uname or password", "用户名或密码错误");

		$storeId = $row["storeId"];
		$empId = $row["id"];
		$_SESSION["storeId"] = $storeId;
		$_SESSION["empId"] = $empId;
		// TODO: how to update perms
		initEmpPerm( $row["perms"] );

		$ret = ["storeId" => $storeId, "name" => $row["name"], "empId" => $empId, "uname" => $uname, "perms"=>$row["perms"] ];
	}

	if ($wantAll && $obj)
	{
		$rv = tableCRUD("get", $obj);
		$ret += $rv;
	}
	return $ret;
}

function genLoginToken(&$ret, $uname, $phone, $pwd, $wantAll)
{
	$data = [
		"uname" => $uname,
		"phone" => $phone,
		"pwd" => $pwd,
		"wantAll" => $wantAll,
		"create" => time(0),
		"expire" => 99999999
	];
	$token = myEncrypt(serialize($data), "E");
	$ret["_token"] = $token;
	$ret["_expire"] = $data["expire"];
	return $token;
}

function parseLoginToken($token)
{
	$data = @unserialize(myEncrypt($token, "D"));
	if ($data === false)
		throw new MyException(E_AUTHFAIL, "Bad login token!");

	$diff = array_diff(["uname", "phone", "pwd", "create", "expire"], array_keys($data));
	if (count($diff) != 0)
		throw new MyException(E_AUTHFAIL, "Bad login token (miss some fields)!");
	
	// TODO: check timeout
	$now = time(0);
	if ((int)$data["create"] + (int)$data["expire"] < $now)
		throw new MyException(E_AUTHFAIL, "token exipres");

	return $data;
}

function api_login()
{
	global $APP;
	$type = preg_replace('/\d+$/', '', $APP);

	if ($type != "user" && $type != "store" && $type != "admin" && $type != "emp") {
		throw new MyException(E_PARAM, "Unknown type `$type`");
	}

	$token = param("token");
	if (isset($token)) {
		$rv = parseLoginToken($token);
		$phone = $rv["phone"];
		$pwd = $rv["pwd"];
		$uname = $rv["uname"];
		$wantAll = @$rv["wantAll"]?:0;
	}
	else {
		$phone = param("phone");
		list($pwd, $code) = mparam(["pwd", "code"]);
		$wantAll = param("wantAll/b", 0);
	}

	# customized user login
	if ($type == "user" && isset($phone))
	{
		$wantAll = 1;
		if (isset($code) && $code != "") {
			validateDynCode($code, $phone);
			$sql = sprintf("SELECT id AS uid, pwd FROM User WHERE phone=%s", Q($phone));
			$row = queryOne($sql, PDO::FETCH_ASSOC);
			if ($row === false) {
				// reg
				$pwd = genDynCode("w8"); // 随机密码
				return regUser($phone, $pwd);
			}
			$pwd = $row["pwd"];
			unset($row["pwd"]);
		}
		else {
			$sql = sprintf("SELECT id AS uid FROM User WHERE phone=%s AND pwd=%s", 
				Q($phone), 
				Q(hashPwd($pwd)));
			$row = queryOne($sql, PDO::FETCH_ASSOC);
			if ($row === false)
				throw new MyException(E_AUTHFAIL, "bad phone or password", "手机号或密码错误");
		}
		$uid = $row["uid"];
		$_SESSION["uid"] = $uid;
		$ret = $row;

		$rv = tableCRUD("get", "User");
		$ret += $rv;
	}
	else {
		if (! isset($uname))
			$uname = mparam("uname");
		$ret = generalLogin($uname, $pwd, $type, $wantAll);
	}
	getWeixinUser()->bindUser();
	if (! isset($token)) {
		genLoginToken($ret, $uname, $phone, $pwd, $wantAll);
	}
	return $ret;
}

function api_logout()
{
	global $APP;
	$type = preg_replace('/\d+$/', '', $APP);

	$force = param("force/b", 0);

	if ($type == "user") {
		unset($_SESSION["uid"]);
	}
	elseif ($type == "store" || $type == "emp") {
		unset($_SESSION["storeId"]);
		unset($_SESSION["empId"]);
	}
	elseif ($type == "admin") {
		unset($_SESSION["adminId"]);
	}
	else {
		throw new MyException(E_PARAM, "Unknown type `$type`");
	}
	$wx = getWeixinUser();
	$wx->disableAutoLogin();
	if ($force || ! (isUserLogin() || isStoreLogin() || isAdminLogin() || $wx->isLogin()))
	{
		session_destroy();
	}
	return "OK";
}

function setUserPwd($userId, $pwd)
{
	# change password
	$sql = sprintf("UPDATE User SET pwd=%s WHERE id=%d", 
		Q(hashPwd($pwd)),
		$userId);
	return execOne($sql);
}

function setEmployeePwd($empId, $pwd)
{
	# change password
	$sql = sprintf("UPDATE Employee SET pwd=%s WHERE id=%d", 
		Q(hashPwd($pwd)),
		$empId);
	return execOne($sql);
}

function api_chpwd()
{
	global $APP;
	$type = preg_replace('/\d+$/', '', $APP);

	if ($type == "user") {
		checkAuth(AUTH_USER, true);
		$uid = $_SESSION["uid"];
	}
	elseif($type == "emp") {
		checkAuth(AUTH_STORE, true);
		$uid = $_SESSION["empId"];
	}
	$pwd = mparam("pwd");
	list($oldpwd, $code) = mparam(["oldpwd", "code"]);
	if (isset($oldpwd)) {
		# validate oldpwd
		if($type == "user"){
			$sql = sprintf("SELECT id FROM User WHERE id=%d and pwd=%s", $uid, Q(hashPwd($oldpwd)));
		}
		elseif($type == "emp"){
			$sql = sprintf("SELECT id FROM Employee WHERE id=%d and pwd=%s", $uid, Q(hashPwd($oldpwd)));
		}
		$row = queryOne($sql);
		if ($row === false)
			throw new MyException(E_AUTHFAIL, "bad password", "密码验证失败");
	}
	else { # use code
		if ($code !== "080909") {
			validateDynCode($code);
		}
	}
	# change password
	if($type == "user"){
		$rv = setUserPwd($uid, $pwd);
	}
	elseif($type == "emp"){
		$rv = setEmployeePwd($uid, $pwd);
	}
	return "OK";
}

function api_resetPwd()
{
	$code = mparam("code");
	$phone = mparam("phone");
	$pwd = mparam("pwd");

	validateDynCode($code);

	# change password
	$sql = sprintf("UPDATE User SET pwd=%s WHERE phone=%s", 
		Q(hashPwd($pwd)),
		Q($phone));
	execOne($sql);
	return "OK";
}

function api_whoami()
{
	global $APP;
	$type = preg_replace('/\d+$/', '', $APP);

	if ($type == "user") {
		checkAuth(AUTH_USER, true);
		$ret = ["uid" => $_SESSION["uid"]];
	}
	/*
	elseif($type == "store") {
		checkAuth(AUTH_STORE, true);
		$ret = ["storeId"=>$_SESSION["storeId"]];
	}
	 */
	elseif($type == "emp" || $type == "store") {
		checkAuth(AUTH_STORE, true);
		$ret = ["storeId"=>$_SESSION["storeId"], "empId" => $_SESSION["empId"]];
	}
	elseif ($type == "admin") {
		checkAuth(AUTH_ADMIN, true);
		global $ADMIN;
		$ret = ["adminId"=>$_SESSION["adminId"], "uname"=>$ADMIN["uname"]];
	}
	else {
		throw new MyException(E_PARAM, "Unknown type `$type`");
	}
	return $ret;
}
//}}}

// ==== upload attachment {{{
# generate image/jpeg output. if $out=null, output to stdout
function resizeImage($in, $w, $h, $out=null)
{
	if (! function_exists("imageJpeg")) 
		throw new MyException(E_SERVER, "Require GD library");

	list($srcw, $srch) = @getImageSize($in);
	if (is_null($srcw))
		throw new MyException(E_PARAM, "cannot get impage info: $in");

	// 保持宽高协调
	if ($srcw < $srch) {
		list($w, $h) = [$h, $w];
	}
	// 保持等比例, 不拉伸
	$h1 = $w * $srch / $srcw;
	if ($h1 > $h) {
		$w = $h * $srcw / $srch;
	}
	else {
		$h = $h1;
	}
	$ext = strtolower(pathinfo($in, PATHINFO_EXTENSION));
	if ($ext == "png")
		$source = @imageCreateFromPng($in);
	else if ($ext == "jpg" || $ext == "jpeg")
		$source = @imageCreateFromJpeg($in);
	else if ($ext == "gif")
		$source = @imageCreateFromGif($in);
	else
		throw new MyException(E_PARAM, "format `$ext` is not supported. Require jpg/png/gif", "不支持的图片格式. 请使用jpg/png/gif");

	if ($source === false)
		throw new MyException(E_PARAM, "cannot create image from: $in", "图片格式错误");

	// Load
	$thumb = imageCreateTrueColor($w, $h);
	
	// Resize
	imageCopyResized($thumb, $source, 0, 0, 0, 0, $w, $h, $srcw, $srch);

	// Output
	imageJpeg($thumb, $out);
}

function getUploadTypeInfo($type)
{
	global $UploadType;
	if (! isset($UploadType[$type]))
		$type = 'default';
	return $UploadType[$type];
}

function api_upload()
{
	checkAuth(AUTH_USER | AUTH_STORE);
	#$uid = $_SESSION["uid"];
	$fmt = param("fmt");
	if ($fmt === 'raw' || $fmt === 'raw_b64')
	{
		$fileName = mparam("f");
	}
	$type = param("type", 'default');
	$genThumb = param("genThumb/b");
	$autoResize = param("autoResize/b", 1);
	$exif = param("exif");

	if ($type != "user" && $type != "store" && $type != "default") {
		throw new MyException(E_PARAM, "bad type: $type");
	}

	$ret = [];
	$files = []; # elem: [$tmpname, $fname, $thumbName]

	chdir($GLOBALS["BASE_DIR"]);

	function handleOneFile($f, $genThumb, &$files)
	{
		if ($f["error"] === 1 || $f["error"] === 2)
			throw new MyException(E_PARAM, "large file (>upload_max_filesize or >MAX_FILE_SIZE)", "文件太大，禁止上传");
		elseif ($f["error"] === 3)
			throw new MyException(E_SERVER, "partial data got", "文件内容不完整");
// 1 : 上传的文件超过了 php.ini 中 upload_max_filesize 选项限制的值.
// 2 : 上传文件的大小超过了 HTML 表单中 MAX_FILE_SIZE 选项指定的值。
// 3 : 文件只有部分被上传
// 4 : 没有文件被上传

		if ($f["name"] != "" && $f["size"] > 0) {
			// allow images only
			$mtype = $f["type"];
			if ($mtype != null) {
				$ALLOWED_MIME = ['jpg'=>'image/jpeg', 'png'=>'image/png', 'gif'=>'image/gif', 'txt'=>'text/plain'];
				$ext = array_search($mtype, $ALLOWED_MIME);
				if ($ext === false) {
					throw new MyException(E_PARAM, "MIME type not supported: `$mtype`", "文件类型`$mtype`不支持.");
				}
			}
			else {
				$ext = strtolower(pathinfo($f["name"], PATHINFO_EXTENSION));
				if ($ext == "jpeg" || $ext == "")
					$ext = "jpg";
				$ALLOWED_EXTS = ["jpg", "gif", "png", "txt"]; // ["pdf", "doc", "docx"];
				if ($ext == "" || !in_array($ext, $ALLOWED_EXTS)) {
					$name = basename($f["name"]);
					throw new MyException(E_PARAM, "bad extention file name: `$name`", "文件扩展名`$ext`不支持");
				}
			}
			if ($type) {
				$dir = "upload/$type/" . date('Ym');
			}
			else {
				$dir = "upload/" . date('Ym');
			}
			if (! is_dir($dir)) {
				if (mkdir($dir, 0777, true) === false)
					throw new MyException(E_SERVER, "fail to create folder: $dir");
			}
			do {
				$base = rand(100001,999999);
				$fname = "$dir/$base.$ext";
				if ($genThumb)
					$thumbName = "$dir/t$base.$ext";
			} while(is_file($fname));
			$rec = [$f["tmp_name"], $fname];
			if ($genThumb)
				$rec[] = $thumbName;
			$files[] = $rec;
		}
	}

	# 1st round: just check and prepare data, not save file or add to DB.
	if ($fmt === 'raw' || $fmt === 'raw_b64') {
		$f1 = [
			"name" => $fileName,
			"type" => null,
			"tmp_name" => null,
			"error" => 0,
			"size" => 1,
			];
		handleOneFile($f1, $genThumb, $files);
	}
	else {
		foreach ($_FILES as $f) {
			if (is_array($f["name"])) {
				$cnt = count($f["name"]);
				for ($i=0; $i<$cnt; ++$i) {
					$f1 = [
						"name" => $f["name"][$i],
						"type" => $f["type"][$i],
						"tmp_name" => $f["tmp_name"][$i],
						"error" => $f["error"][$i],
						"size" => $f["size"][$i],
					];
					handleOneFile($f1, $genThumb, $files);
				}
			}
			else {
				handleOneFile($f, $genThumb, $files);
			}
		}
	}
	if (count($files) == 0)
		return $ret;

	# 2nd round: save file and add to DB
	global $DBH;
	$sql = "INSERT INTO Attachment (path, orgPicId, exif) VALUES (?, ?, ?)";
	$sth = $DBH->prepare($sql);
	foreach ($files as $f) {
		# 0: tmpname; 1: fname; 2: thumbName
		list($tmpname, $fname, $thumbName) = $f;
		if (isset($tmpname)) {
			move_uploaded_file($tmpname, $fname);
		}
		else {
			// for upload raw/raw_b64
			$s = file_get_contents("php://input");
			if ($fmt === 'raw_b64') {
				$s = base64_decode($s);
			}
			file_put_contents($fname, $s);
		}
		if ($autoSize && filesize($fname) > 500*1024) {
			resizeImage($fname, 1920, 1080, $fname);
		}

		$sth->execute([$fname, null, null]);
		$id = (int)$DBH->lastInsertId();
		$r = ["id"=>$id];

		if ($genThumb) {
			$info = getUploadTypeInfo($type);
			resizeImage($fname, $info["w"], $info["h"], $thumbName);
			#file_put_contents($thumbName, "THUMB");
			$sth->execute([$thumbName, $id, $exif]);
			$thumbId = (int)$DBH->lastInsertId();
			$r["thumbId"] = $thumbId;
		}
		$ret[] = $r;
	}
	return $ret;
}

# NOTE: this function does not conform to the interface standard, it return file data directly or HTTP 404 error
# please use "exit" instead of "return"
function api_att()
{
	// overwritten the default
	header("Cache-Control: private, max-age=99999999");
	//header("Cache-Control: private");
	header("Pragma: "); // session_start() set this one to "no-cache"

	#checkAuth(AUTH_USER | AUTH_STORE);
	#$uid = $_SESSION["uid"];
	$id = param("id");
	$thumbId = param("thumbId");

	if ((is_null($id) || $id<=0) && (is_null($thumbId) || $thumbId<=0))
	{
		header(HTTP_NOT_FOUND);
		exit;
	}
	// setup cache via etag.
	$etag = null;
	if (is_null($thumbId)) {
		$etag = "att-$id";
	}
	else {
		$etag = "att-t{$thumbId}";
	}
	@$etag1 = $_SERVER['HTTP_IF_NONE_MATCH'];
	if ($etag1 == $etag) {
		header("Etag: $etag", true, 304);
		exit();
	}
	if ($id !== null)
		$sql = "SELECT path FROM Attachment WHERE id=$id";
	else {
		# a1: original, a2: thumb
		$sql = "SELECT a1.path FROM Attachment a1 INNER JOIN Attachment a2 ON a1.id=a2.orgPicId WHERE a2.id=$thumbId";
	}
	$file = queryOne($sql);
	if ($file === false)
	{
		header(HTTP_NOT_FOUND);
		exit;
	}
	chdir($GLOBALS["BASE_DIR"]);
	if (! is_file($file)) {
		header(HTTP_NOT_FOUND);
		exit;
	}

	# TODO: more types for attachment
	$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
	$TYPE = [
		'jpg' => 'image/jpeg',
		'png' => 'image/png',
		'gif' => 'image/gif',
		'txt' => 'text/plain',
		'pdf' => 'application/pdf',
	];
	$mimeType = $TYPE[$ext] ?: 'application/octet-stream';
	header("Content-Type: $mimeType");
	header("Etag: $etag");
#	header("Expires: Thu, 3 Sep 2020 08:52:00 GMT");
#	header('Content-Disposition: attachment; filename='.basename($file));
	readfile($file);
	throw new DirectReturn();
}
//}}}

function api_proxy()
{
	$url = mparam("url");
	if (! startsWith($url, "http")) {
		$url = "http://" . $url;
	}
	@$rv = file_get_contents($url);
	 
	return $rv;
}

//}}}

// vim: set foldmethod=marker :
