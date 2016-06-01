<?php

require_once("app.php");
require_once("php/api_fw.php");

require_once('php/api_functions.php');
require_once('php/api_objects.php');

// ====== config {{{
const AUTH_GUEST = 0;
const AUTH_USER = 0x01;
const AUTH_EMP = 0x02;
const AUTH_MGR = 0x04;
const AUTH_ADMIN = 0x08;

const AUTH_TEST_MODE = 0x1000;
const AUTH_MOCK_MODE = 0x2000;

define("AUTH_STORE", AUTH_EMP|AUTH_MGR);

$PERMS = [
	AUTH_GUEST => "guest",
	AUTH_USER => "user",
	AUTH_EMP => "employee",
	AUTH_MGR => "manager",
	AUTH_ADMIN => "admin",

	AUTH_TEST_MODE => "testmode",
	AUTH_MOCK_MODE => "mockmode",
];
//}}}

// ====== global {{{

//}}}

// ====== toolkit {{{

function hashPwd($pwd)
{
	if (strlen($pwd) == 32 || $pwd === "")
		return $pwd;
	return md5($pwd);
}

function randChr($t)
{
	while (1) {
		# all digits (no 0)
		if ($t == 'd') {
			$n = rand(ord('1'), ord('9'));
			return chr($n);
		}
		
		# A-Z (no O, I)
		$n = rand(0, 25);
		if ($n == ord('O')-ord('A') || $n == ord('I')-ord('A'))
			continue;
		return chr(ord('A') + $n);
	}
}

# e.g. genDynCode("d4") - 4 digits
# e.g. genDynCode("w4") - 4 chars (capital letters)
function genDynCode($type)
{
	$t = substr($type, 0, 1);
	$n = (int)substr($type, 1);
	if ($n <= 0)
		throw new MyException(E_PARAM, "Bad type '$type' for genCode");
	$r = '';
	for ($i=0; $i<$n; ++$i) {
		$r .= randChr($t);
	}
	return $r;
}

//}}}

//====== function {{{

// ==== auth / permission {{{

function isUserLogin()
{
	return isset($_SESSION["uid"]);
}

function isEmpLogin()
{
	return isset($_SESSION["empId"]);
}

function isAdminLogin()
{
	return isset($_SESSION["adminId"]);
}

function hasPerm($perm)
{
	return ApiPerm_::hasPerm($perm);
}

class ApiPerm_
{
	static $perms = null;

	static function getPerms()
	{
		$perms = 0;
		if (isUserLogin()) {
			$perms |= AUTH_USER;
		}
		else if (isAdminLogin()) {
			$perms |= AUTH_ADMIN;
		}
		else if (isEmpLogin()) {
			$perms |= AUTH_EMP;
		}

		if (isset($GLOBALS["TEST_MODE"])) {
			$perms |= AUTH_TEST_MODE;
		}
		if (isset($GLOBALS["MOCK_MODE"])) {
			$perms |= AUTH_MOCK_MODE;
		}

		return $perms;
	}

	static function hasPerm($perm)
	{
		if (is_null(self::$perms))
			self::$perms = self::getPerms();

		return (self::$perms & $perm) != 0;
	}
}

/** @fn checkAuth($perm) */
function checkAuth($perm)
{
	$ok = hasPerm($perm);
	if (!$ok) {
		$auth = [];
		if (hasPerm(AUTH_USER | AUTH_EMP | AUTH_ADMIN))
			$errCode = E_FORBIDDEN;
		else
			$errCode = E_NOAUTH;

		foreach ($GLOBALS["PERMS"] as $p=>$name) {
			if (($perm & $p) != 0) {
				$auth[] = $name;
			}
		}
		throw new MyException($errCode, "require auth to " . join(" or ", $auth));
	}
}
//}}}

function validateDynCode($code, $phone = null)
{
	$code1 = $_SESSION["code"];
	$phone1 = $_SESSION["phone"];
	$codetm = $_SESSION["codetm"];

	// TODO: remove special code "080909"
	
	if (@$GLOBALS["TEST_MODE"] && $code == "080909")
		goto nx;

	//special number and code not verify
	if ( !is_null($phone) && $phone == "12345678901" && $code == "080909")
		goto nx;

	if (is_null($code1) || is_null($phone1))
		throw new MyException(E_FORBIDDEN, "gencode required", "请先发送验证码!");

	
	if (time() - $codetm > 60*5)
		throw new MyException(E_FORBIDDEN, "code expires (max 60s)", "验证码已过期(有效期5分钟)");

	if ($code != $code1)
		throw new MyException(E_PARAM, "bad code", "验证码错误");

	if ($phone != null && $phone != $phone1)
		throw new MyException(E_PARAM, "bad phone number. expect for phone '$phone1'");

nx:
	unset($_SESSION["code"]);
	unset($_SESSION["phone"]);
	unset($_SESSION["codetm"]);
}

// return: {type, ver, str}
// type: "web"-网页客户端; "wx"-微信客户端; "a"-安卓客户端; "ios"-苹果客户端
// e.g. {type: "a", ver: 2, str: "a/2"}
function getClientVersion()
{
	global $CLIENT_VER;
	if (! isset($CLIENT_VER))
	{
		$ver = param("_ver");
		if ($ver != null) {
			$a = explode('/', $ver);
			$CLIENT_VER = [
				"type" => $a[0],
				"ver" => $a[1],
				"str" => $ver
			];
		}
		else if (preg_match('/小鳄养车.*rv:\s*(\d+)/', $_SERVER["HTTP_USER_AGENT"], $ms)) {
			$ver = $ms[1];
			$CLIENT_VER = [
				"type" => "ios",
				"ver" => $ver,
				"str" => "ios/{$ver}"
			];
		}
		// Mozilla/5.0 (Linux; U; Android 4.1.1; zh-cn; MI 2S Build/JRO03L) AppleWebKit/533.1 (KHTML, like Gecko)Version/4.0 MQQBrowser/5.4 TBS/025440 Mobile Safari/533.1 MicroMessenger/6.2.5.50_r0e62591.621 NetType/WIFI Language/zh_CN
		else if (preg_match('/MicroMessenger\/([0-9.]+)/', $_SERVER["HTTP_USER_AGENT"], $ms)) {
			$ver = $ms[1];
			$CLIENT_VER = [
				"type" => "wx",
				"ver" => $ver,
				"str" => "wx/{$ver}"
			];
		}
		else {
			$CLIENT_VER = [
				"type" => "web",
				"ver" => 0,
				"str" => "web"
			];
		}
	}
	return $CLIENT_VER;
}

// return: false=不是ios客户端; 正常返回整数值如 15.
function getIosVersion()
{
	$ver = getClientVersion();
	return $ver["type"]=="ios"? (int)$ver["ver"]: false;
}
//}}}

// ====== main {{{

apiMain();

//}}}

// vim: set foldmethod=marker :
?>
