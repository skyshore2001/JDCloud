<?php
/**

@module Login

## 概述

后端服务接口参考DESIGN.md文档。主要包括genCode, login, logout, chpwd等。

类Login为模块对外接口，包括配置项和公共方法。
类LoginImp为模块内部扩展接口，通过回调实现应用专用逻辑，应继承类LoginImpBase。

## 模块外部接口

**配置项**

- 允许用户自动注册

	Login::$autoRegUser = true;

- 允许员工自动注册

	Login::$autoRegEmp = false;

## 模块内部接口

若要对模块缺省逻辑进行配置或扩展，应实现LoginImp类，它继承LoginImpBase。

**LoginImp实现示例**

文件LoginImp.php, 放在php/class路径下供调用时加载。（注意在api.php中需包含php/autoload.php）

	Login::$autoRegEmp = true; // 修改配置项，可以与LoginImp实现放在一起。
	class LoginImp extends LoginImpBase
	{
		// 注册新用户时回调
		function onRegNewUser($userId, $phone)
		{
			Coupon::onRegNewUser($userId, $phone);
		}

		// 登录成功时回调
		function onLogin($type, $id, &$ret)
		{
			if ($type == "user") {
				@$orderIds = $_SESSION['orderIds'];
				if (isset($orderIds)) {
					execOne("UPDATE Ordr SET userId={$id} WHERE id IN ($orderIds) AND userId IS NULL");
					unset($_SESSION['orderIds']);
				}
			}
			else if ($type == "emp") {
				$storeId = queryOne("SELECT storeId FROM Employee WHERE id={$id}");
				$_SESSION["storeId"] = $storeId ?: 0;
			}
		}
	}

*/

class Login
{
	static $autoRegUser = true;
	static $autoRegEmp = false;
	static $mockWeixinUser = ['openid'=>"test_openid", 'nickname'=>"测试用户", 'headimgurl'=>"...", 'sex'=>1];
}

class LoginImpBase
{
	use JDSingletonImp;

/**
@fn LoginImpBase.onLogin($type, $id, &$ret)

@param type="user"|"emp"|"admin"
@param ret={id, _isNew?}
*/
	function onLogin($type, $id, &$ret)
	{
	}

/**
@fn LoginImpBase.onRegNewUser($userId, $phone)
*/
	function onRegNewUser($userId, $phone)
	{
	}

	function onWeixinLogin($userInfo, $rawData)
	{
		$userData = [
			"pic" => $userInfo["headimgurl"],
			"name" => $userInfo["nickname"],
			"uname" => $userInfo["nickname"],
			"weixinData" => $rawData
		];
		dbconn();
		$sql = sprintf("SELECT id FROM User WHERE weixinKey=%s", Q($userInfo["openid"]));
		$id = queryOne($sql);
		if ($id === false) {
			$userData["createTm"] = date(FMT_DT);
			$userData["weixinKey"] = $userInfo["openid"];
			$id = dbInsert("User", $userData);
		}
		else {
			dbUpdate("User", $userData, $id);
		}

		$_SESSION["uid"] = $id;
	}

	function onBindUser($phone){
		$userId = $_SESSION["uid"];
		//查询是否绑定微信用户
		$row = queryOne("SELECT id, weixinKey FROM User WHERE phone=$phone", true);
		if(isset($row["weixinKey"])){ //绑定过
			throw new MyException(E_AUTHFAIL, "phone had binding", "该手机已经被绑定");
		}
		if(isset($row["id"])){ //将微信用户merge过来
			//取出weixinKey
			$weixinKey = queryOne("SELECT weixinKey FROM User WHERE id=$userId");
			//将微信key与手机用户绑定
			dbUpdate("User", ["weixinKey"=>$weixinKey], $row["id"]);
			//微信用户失效，今后无法登录
			$key = 'merge-'.$weixinKey;
			dbUpdate("User", ["weixinKey"=>$key], $userId);
			$_SESSION["uid"] = $row["id"];
		}else{
			//将手机号与微信用户绑定
			dbUpdate("User", ["phone"=>$phone], $userId);
		}
	}
}

const AUTO_PWD_PREFIX = "AUTO";

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
		throw new MyException(E_FORBIDDEN, "code expires (max 5min)", "验证码已过期(有效期5分钟)");

	if ($code != $code1)
		throw new MyException(E_PARAM, "bad code", "验证码错误");

	if ($phone != null && $phone != $phone1)
		throw new MyException(E_PARAM, "bad phone number. expect for phone '$phone1'");

nx:
	unset($_SESSION["code"]);
	unset($_SESSION["phone"]);
	unset($_SESSION["codetm"]);
}

//}}}

function api_genCode()
{
	$phone = mparam("phone");
	if ($phone && !preg_match('/^\d{11}$/', $phone)) 
		throw new MyException(E_PARAM, "bad phone number", "手机号不合法");

	$type = param("type", "d6");
	$debug = $GLOBALS["TEST_MODE"]? param("debug/b", false): false;
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
		sendSms($phone, "验证码" . $_SESSION["code"] . "，请在5分钟内使用。");
	}

	return $ret;
}

function api_reg()
{
	if (! Login::$allowManualReg)
		throw new MyException(E_FORBIDDEN, "manual reg is disabled.", "系统未开放用户注册。");

	list($uname, $phone) = mparam(["uname", "phone"], "P");
	$pwd = mparam("pwd", "P");

	if (isset($uname)) {
		$rv = queryOne("SELECT 1 FROM User WHERE uname=" . Q($uname));
		if ($rv !== false)
			throw new MyException(E_PARAM, "duplicate uname", "用户名已存在");
	}
	else if (isset($phone)) {
		$rv = queryOne("SELECT 1 FROM User WHERE phone=" . Q($phone));
		if ($rv !== false)
			throw new MyException(E_PARAM, "duplicate phone", "手机号已存在");
	}

	addToPwdTable($pwd);
	$_POST["pwd"] = hashPwd($pwd);
	$_POST["createTm"] = date(FMT_DT);
	if (!isset($_POST["name"])) {
		if ($phone !== null) {
			$phone1 = preg_replace('/^\d{3}\K(\d{4})/', '****', $phone);
			$_POST["name"] = "用户" . $phone1;
		}
		else {
			$_POST["name"] = $uname;
		}
	}

	$id = dbInsert("User", $_POST);
	$ret = ["id"=>$id];

	$imp = LoginImpBase::getInstance();
	$imp->onRegNewUser($id, $uname ?: $phone);

	$_SESSION["uid"] = $id;
	$imp->onLogin($type, $id, $ret);

	//$wantAll = param("wantAll/b", 0);
	$rv = callSvcInt("User.get");
	$ret += $rv;

	genLoginToken($ret, $uname?:$phone, $pwd);
	return $ret;
}

function regUser($phone, $pwd)
{
	$phone1 = preg_replace('/^\d{3}\K(\d{4})/', '****', $phone);
	$name = "用户" . $phone1;

	$id = dbInsert("User", [
		"phone" => $phone,
		"pwd" => hashPwd($pwd),
		"name" => $name,
		"createTm" => date(FMT_DT)
	]);
	addToPwdTable($pwd);
	$ret = ["id"=>$id];

	$imp = LoginImpBase::getInstance();
	$imp->onRegNewUser($id, $phone);
	return $ret;
}

function regEmp($phone, $pwd)
{
	$phone1 = preg_replace('/^\d{3}\K(\d{4})/', '****', $phone);
	$name = "员工" . $phone1;

	$id = dbInsert("Employee", [
		"phone" => $phone,
		"pwd" => hashPwd($pwd),
		"name" => $name,
		"createTm" => date(FMT_DT)
	]);
	addToPwdTable($pwd);
	$ret = ["id"=>$id];

	return $ret;
}

function genLoginToken(&$ret, $uname, $pwd)
{
	$data = [
		"uname" => $uname,
		"pwd" => $pwd,
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

	$diff = array_diff(["uname", "pwd", "create", "expire"], array_keys($data));
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
	$type = getAppType();

	if ($type != "user" && $type != "emp" && $type != "admin") {
		throw new MyException(E_PARAM, "Unknown type `$type`");
	}

	$token = param("token");
	if (isset($token)) {
		$rv = parseLoginToken($token);
		$uname = $rv["uname"];
		$pwd = $rv["pwd"];
	}
	else {
		$uname = mparam("uname");
		list($pwd, $code) = mparam(["pwd", "code"]);
	}
	//$wantAll = param("wantAll/b", 0);

	if (isset($code) && $code != "")
	{
		validateDynCode($code, $uname);
		unset($pwd);
	}

	$key = "uname";
	if (ctype_digit($uname[0]))
		$key = "phone";

	$obj = null;
	# user login
	if ($type == "user") {
		$obj = "User";
		$sql = sprintf("SELECT id,pwd FROM User WHERE {$key}=%s", Q($uname));
		$row = queryOne($sql, true);

		$ret = null;
		if ($row === false) {
			// code通过验证，直接注册新用户
			if (isset($code) && Login::$autoRegUser)
			{
				$pwd = AUTO_PWD_PREFIX . genDynCode("d4");
				$ret = regUser($uname, $pwd);
				$ret["_isNew"] = 1;
			}
		}
		else {
			if (isset($code) || (isset($pwd) && hashPwd($pwd) == $row["pwd"]))
			{
				if (!isset($pwd))
					$pwd = $row["pwd"]; // 用于生成token
				$ret = ["id" => $row["id"]];
			}
		}
		if (!isset($ret))
			throw new MyException(E_AUTHFAIL, "bad uname or password", "手机号或密码错误");

		$_SESSION["uid"] = $ret["id"];
	}
	else if ($type == "emp") {
		$obj = "Employee";
		$sql = sprintf("SELECT id,pwd,perms FROM Employee WHERE {$key}=%s", Q($uname));
		$row = queryOne($sql, true);
		if ($row === false) {
			if (isset($code) && Login::$autoRegEmp) {
				$pwd = AUTO_PWD_PREFIX . genDynCode('d4');
				$ret = regEmp($uname, $pwd);
				$ret['_isNew'] = 1;
			}
		}
		else if (isset($code) || (isset($pwd) && hashPwd($pwd) == $row["pwd"])) {
			if (!isset($pwd))
				$pwd = $row['pwd'];
			$ret = ['id' => $row['id']];
		}
		if (!isset($ret))
			throw new MyException(E_AUTHFAIL, "bad uname or password", "用户名或密码错误");
		
		$_SESSION["empId"] = $ret["id"];
		if ($row && $row["perms"]) {
			$perms = explode(',', $row["perms"]);
			$_SESSION['perms'] = $perms;
		}
	}
	// admin login
	else if ($type == "admin") {
		list ($uname1, $pwd1) = getCred(getenv("P_ADMIN_CRED"));
		if (! isset($uname1))
			throw new MyException(E_AUTHFAIL, "admin user is not enabled.", "超级管理员用户未设置，不可登录。");
		if ($uname != $uname1 || $pwd != $pwd1)
			throw new MyException(E_AUTHFAIL, "bad uname or password", "用户名或密码错误");
		$adminId = 1;
		$_SESSION["adminId"] = $adminId;
		$ret = ["id" => $adminId, "uname" => $uname1];
	}
	if ($obj)
	{
		$rv = tableCRUD("get", $obj);
		$ret += $rv;
	}

	$imp = LoginImpBase::getInstance();
	$imp->onLogin($type, $ret["id"], $ret);

	if (! isset($token)) {
		genLoginToken($ret, $uname, $pwd);
	}
	return $ret;
}

function api_logout()
{
	session_destroy();
	return "OK";
}

function setUserPwd($userId, $pwd, $genToken)
{
	# change password
	dbUpdate("User", ["pwd"=>hashPwd($pwd)], $userId);

	if ($genToken) {
		list($uname, $pwd) = queryOne("SELECT phone, pwd FROM User WHERE id={$userId}");
		$ret = [];
		genLoginToken($ret, $uname, $pwd);
		return $ret;
	}
	return "OK";
}

function setEmployeePwd($empId, $pwd, $genToken)
{
	# change password
	dbUpdate("Employee", ["pwd"=>hashPwd($pwd)], $empId);

	if ($genToken) {
		list($uname, $pwd) = queryOne("SELECT phone, pwd FROM Employee WHERE id={$empId}");
		$ret = [];
		genLoginToken($ret, $uname, $pwd);
		return $ret;
	}
	return "OK";
}

// 制作密码字典。
function addToPwdTable($pwd)
{
	if (substr($pwd, 0, strlen(AUTO_PWD_PREFIX)) == AUTO_PWD_PREFIX)
		return;
	$id = queryOne("SELECT id FROM Pwd WHERE pwd=" . Q($pwd));
	if ($id === false) {
		$id = dbInsert("Pwd", ["pwd"=>$pwd, "cnt"=>1]);
	}
	else {
		dbUpdate("Pwd", ["cnt"=>"=cnt+1"], $id);
	}
}

function api_chpwd()
{
	$type = getAppType();

	if ($type == "user") {
		checkAuth(AUTH_USER);
		$uid = $_SESSION["uid"];
	}
	elseif($type == "emp") {
		checkAuth(AUTH_EMP);
		$uid = $_SESSION["empId"];
	}
	$pwd = mparam("pwd");
	list($oldpwd, $code) = mparam(["oldpwd", "code"]);
	if (isset($oldpwd)) {
		# validate oldpwd
		if ($type == "user" && $oldpwd === "_none") { // 表示不要验证，但只限于新用户注册1小时内
			$dt = date(FMT_DT, time()-T_HOUR);
			$sql = sprintf("SELECT id FROM User WHERE id=%d and createTm>'$dt'", $uid);
		}
		elseif($type == "user"){
			$sql = sprintf("SELECT id FROM User WHERE id=%d and pwd=%s", $uid, Q(hashPwd($oldpwd)));
		}
		elseif($type == "emp"){
			$sql = sprintf("SELECT id FROM Employee WHERE id=%d and pwd=%s", $uid, Q(hashPwd($oldpwd)));
		}
		$row = queryOne($sql);
		if ($row === false)
			throw new MyException(E_AUTHFAIL, "bad password", "密码验证失败");
	}
	# change password
	if($type == "user"){
		$rv = setUserPwd($uid, $pwd, true);
	}
	elseif($type == "emp"){
		$rv = setEmployeePwd($uid, $pwd, true);
	}

	addToPwdTable($pwd);
	return $rv;
}

function api_bindUser()
{	
	$phone = mparam("phone");
	$code = mparam("code");
	validateDynCode($code, $phone);
	$imp = LoginImpBase::getInstance();
	$imp->onBindUser($phone);
}
