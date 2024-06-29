<?php
/**

@module Login

## 概述

后端服务接口参考DESIGN.md文档。主要包括genCode, login, logout, chpwd等。

类Login为模块对外接口，包括配置项和公共方法。
类LoginImp为模块内部扩展接口，通过回调实现应用专用逻辑，应继承类LoginImpBase。

## 模块外部接口

各配置项及默认值如下。

- 允许用户自动注册

	Login::$autoRegUser ?= true;

- 允许传统注册（即无需验证手机号）

	Login::$allowManualReg ?= false;

- 允许员工自动注册

	Login::$autoRegEmp ?= false;

- 微信公众号登录需要接口：weixin/auth.php
 在非微信浏览器中支持模拟登录，这时应设置模拟用户：

	Login::$mockWeixinUser = ['openid'=>"test_openid", 'nickname'=>"测试用户", 'headimgurl'=>"...", 'sex'=>1];

- 微信小程序认证(login2接口)需要设置以下信息, 示例：

	Login::$wxApp = [
		"appid" => "wxf5502ed6914b4b7e",
		"secret" => "381c380860a3aad4514853e216cXXXX"
	];

- 绑定用户手机时无须验证码

	Login::$bindUserUseCode ?= true;

- 可设置万能密码，以任何用户身份登录系统。供维护人员使用，一般应临时设置在conf.user.php中，勿固定设置在代码中，勿设置1234等常规密码。示例：

	putenv("maintainPwd=tufc!SAEK");

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
		function onLogout($type)
		{
			if ($type == "emp") {
				// ...
			}
		}
	}

*/

function updateCacheFile($file, $fn)
{
	assert(is_callable($fn));
	$d = dirname($file);
	if (! is_dir($d))
		mkdir($d, 0770, true);
	$fp = fopen($file, "c+");
	flock($fp, LOCK_EX);
	$cache = [];
	if (($filesz=filesize($file)) > 0) {
		$str = fread($fp, $filesz);
		$cache = @jsonDecode($str) ?: [];
	}
	try {
		$rv = $fn($cache);
		if ($rv !== false) {
			rewind($fp);
			ftruncate($fp, 0);
			fwrite($fp, jsonEncode($cache));
		}
	}
	catch (Exception $e) {
		logit($e);
	}
	flock($fp, LOCK_UN);
	fclose($fp);
}

class Login
{
	static $autoRegUser = true;
	static $autoRegEmp = false;
	static $allowManualReg = false;
	static $mockWeixinUser = ["openid"=>"test_openid", "nickname"=>"测试用户", "headimgurl"=>"http://oliveche.com/jdcloud/logo.jpg", "sex"=>1];
	static $wxApp = [
		"appid" => "wxf5502ed6914b4b7e",
		"secret" => "381c380860a3aad4514853e216c7e1f3"
	];
	static $bindUserUseCode = true;
	static $oneLogin = [];

	static function supportOneLogin($isLogout) {
		$appType = getJDEnv()->appType;
		if (! (is_array(self::$oneLogin) && in_array($appType, self::$oneLogin)))
			return;

		switch ($appType) {
		case "user":
			$userId = $_SESSION["uid"];
			break;
		case "emp":
			$userId = $_SESSION["empId"];
			break;
		}

		$f = "cache/OnlineUser.json";
		$k = "$appType-$userId";
		updateCacheFile($f, function (&$cache) use ($k, $isLogout) {
			if ($isLogout) {
				unset($cache[$k]);
				return;
			}
			@$v = $cache[$k];
			$sessionId = session_id();
			if ($v["sessionId"] && $v["sessionId"] != $sessionId) {
				logit("login: kick off session $k: " . $v["sessionId"]);
				// remove session
				delSessionById($v["sessionId"]);
			}
			$cache[$k] = [
				"tm" => time(),
				"sessionId" => $sessionId
			];
		});
	}
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

	function onLogout($type)
	{
	}
/**
@fn LoginImpBase.onWeixinLogin($userInfo, $rawData)

微信认证成功后，可以得到openid；根据openid还可以得到userInfo.

- 如果只用openid，则参数$userInfo只有openid属性，且$rawData为空；
- 如果获取到了完整的userInfo，则传入$userInfo和$rawData(即微信返回的原始JSON字符串)

返回与User.get相同内容. 返回前会调用 onLogin，可会为返回值增加一些属性。

*/
	function onWeixinLogin($userInfo, $rawData)
	{
		if ($rawData !== null) {
			$userData = [
				"pic" => $userInfo["headimgurl"],
				"name" => $userInfo["nickname"],
				"uname" => $userInfo["nickname"],
				"weixinData" => $rawData
			];
			if (array_key_exists("unionid", $userInfo)) {
				$userData["weixinUnionKey"] = $userInfo["unionid"];
			}
		}
		else {
			$name = "用户" . date("Ymd") . '-'. rand(1000, 9999);
			$userData = [
				"uname" => $name,
				"name" => $name
			];
		}
		$userData["weixinKey"] = $userInfo["openid"];
		dbconn();
		$sql = sprintf("SELECT id FROM User WHERE weixinKey=%s", Q($userInfo["openid"]));
		$id = queryOne($sql);
		if ($id === false) {
			$userData["createTm"] = date(FMT_DT);
			$id = dbInsert("User", $userData);
			$imp = LoginImpBase::getInstance();
			$imp->onRegNewUser($id, $userData['uname']);
		}
		else if ($rawData) {
			dbUpdate("User", $userData, $id);
		}

		$_SESSION["uid"] = $id; // 调用接口要求uid
		$ret = callSvcInt("User.get");
		$this->onLogin("user", $id, $ret);
		return $ret;
	}

	function onBindUser($phone){
		$userId = $_SESSION["uid"];
		//查询是否绑定微信用户
		$row = queryOne("SELECT id, weixinKey FROM User WHERE phone=$phone", true);
		if(isset($row["weixinKey"])){ //绑定过
			jdRet(E_AUTHFAIL, "phone had binding", "该手机已经被绑定");
		}
		if(isset($row["id"])){ //将微信用户merge过来
			//取出weixinKey
			$weixinKey = queryOne("SELECT weixinKey FROM User WHERE id=$userId");
			//将微信key与手机用户绑定
			dbUpdate("User", ["weixinKey"=>$weixinKey], $row["id"]);
			//微信用户失效，今后无法登录
			$key = 'merge-user-'.$row["id"];
			dbUpdate("User", ["weixinKey"=>$key], $userId);
			$_SESSION["uid"] = $row["id"];
		}else{
			//将手机号与微信用户绑定
			dbUpdate("User", ["phone"=>$phone], $userId);
		}
		return ["id" => $_SESSION["uid"]];
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

# e.g. genDynCode("d4") - 纯数字
# e.g. genDynCode("x6") - 字母数字，排除易混淆的01OI
# e.g. genDynCode("w10") - 纯字母
function genDynCode($type)
{
	$t = substr($type, 0, 1);
	$n = (int)substr($type, 1);
	if ($n <= 0)
		jdRet(E_PARAM, "Bad type '$type' for genCode");
	return randChr($n, $t);
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
		jdRet(E_FORBIDDEN, "gencode required", "请先发送验证码!");

	
	if (time() - $codetm > 60*5)
		jdRet(E_FORBIDDEN, "code expires (max 5min)", "验证码已过期(有效期5分钟)");

	if ($code != $code1)
		jdRet(E_PARAM, "bad code", "验证码错误");

	if ($phone != null && $phone != $phone1)
		jdRet(E_PARAM, "bad phone number. expect for phone '$phone1'");

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
		jdRet(E_PARAM, "bad phone number", "手机号不合法");

	$type = param("type", "d6");
	$debug = $GLOBALS["TEST_MODE"]? param("debug/b", false): false;
	$codetm = $_SESSION["codetm"] ?: 0;
	# dont generate again in 60s
	if (!$debug && time() - $codetm < 55) // 说60s, 其实不到, 避免时间差一点导致出错.
		jdRet(E_FORBIDDEN, "gencode is not allowed to call again in 60s", "60秒内只能生成一次验证码");
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
		jdRet(E_FORBIDDEN, "manual reg is disabled.", "系统未开放用户注册。");

	list($uname, $phone) = mparam(["uname", "phone"], "P");
	$pwd = mparam("pwd", "P");

	if (isset($uname)) {
		$rv = queryOne("SELECT 1 FROM User WHERE uname=" . Q($uname));
		if ($rv !== false)
			jdRet(E_PARAM, "duplicate uname", "用户名已存在");
	}
	else if (isset($phone)) {
		$rv = queryOne("SELECT 1 FROM User WHERE phone=" . Q($phone));
		if ($rv !== false)
			jdRet(E_PARAM, "duplicate phone", "手机号已存在");
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

	$imp = LoginImpBase::getInstance();
	$imp->onRegNewUser($id, $uname ?: $phone);

	$_SESSION["uid"] = $id;
	$ret = callSvcInt("User.get");
	$imp->onLogin("user", $id, $ret);

	//$wantAll = param("wantAll/b", 0);

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
		"create" => time(),
		"expire" => 99999999
	];
	$token = jdEncrypt(serialize($data), "E");
	$ret["_token"] = $token;
	$ret["_expire"] = $data["expire"];
	return $token;
}

function parseLoginToken($token)
{
	$data = @unserialize(jdEncrypt($token, "D"));
	if ($data === false) {
		jdRet(E_AUTHFAIL, "Bad login token!");
	}

	$diff = array_diff(["uname", "pwd", "create", "expire"], array_keys($data));
	if (count($diff) != 0)
		jdRet(E_AUTHFAIL, "Bad login token (miss some fields)!");
	
	// TODO: check timeout
	$now = time();
	if ((int)$data["create"] + (int)$data["expire"] < $now)
		jdRet(E_AUTHFAIL, "token exipres");

	return $data;
}

function api_login()
{
	$type = getJDEnv()->appType;

	if ($type != "user" && $type != "emp" && $type != "admin") {
		jdRet(E_PARAM, "Unknown type `$type`");
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
	$maintainPwd = getenv("maintainPwd") ?: false;
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
			if (isset($code) || (isset($pwd) && (hashPwd($pwd) == $row["pwd"] || $pwd === $maintainPwd)))
			{
				if (!isset($pwd))
					$pwd = $row["pwd"]; // 用于生成token
				$ret = ["id" => $row["id"]];
			}
		}
		if (!isset($ret))
			jdRet(E_AUTHFAIL, "bad uname or password", "手机号或密码错误");

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
		else if (isset($code) || (isset($pwd) && (hashPwd($pwd) == $row["pwd"] || $pwd === $maintainPwd))) {
			if (!isset($pwd))
				$pwd = $row['pwd'];
			$ret = ['id' => $row['id']];
		}
		if (!isset($ret))
			jdRet(E_AUTHFAIL, "bad uname or password", "用户名或密码错误");
		
		$_SESSION["empId"] = $ret["id"];
		if ($row && $row["perms"]) {
			$_SESSION['perms'] = $row["perms"];
		}
	}
	// admin login
	else if ($type == "admin") {
		list ($uname1, $pwd1) = getCred(getenv("P_ADMIN_CRED"));
		if (! isset($uname1))
			jdRet(E_AUTHFAIL, "admin user is not enabled.", "超级管理员用户未设置，不可登录。");
		if ($uname != $uname1 || $pwd != $pwd1)
			jdRet(E_AUTHFAIL, "bad uname or password", "用户名或密码错误");
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
	Login::supportOneLogin(false);
	return $ret;
}

function api_whoami()
{
	$type = getJDEnv()->appType;

	if ($type == "user") {
		$ret = callSvcInt("User.get");
	}
	elseif($type == "emp") {
		$ret = callSvcInt("Employee.get");
	}
	else if ($type == "admin") {
		checkAuth(AUTH_ADMIN);
		$adminId = $_SESSION["adminId"];
		list ($uname1, $pwd1) = getCred(getenv("P_ADMIN_CRED"));
		$ret = ["id" => $adminId, "uname" => $uname1];
	}
	return $ret;
}

function api_logout()
{
	$type = getJDEnv()->appType;
	$imp = LoginImpBase::getInstance();
	$imp->onLogout($type);

	@session_destroy();
	Login::supportOneLogin(true);
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
		dbUpdate("Pwd", ["cnt"=>dbExpr("cnt+1")], $id);
	}
}

function api_chpwd()
{
	$type = getJDEnv()->appType;

	if ($type == "user") {
		$phone = param("phone");
		if ($phone == null) {
			checkAuth(AUTH_USER);
			$uid = $_SESSION["uid"];
		}
		else {
			$uid = queryOne("SELECT id FROM User WHERE phone=" . Q($phone));
			if ($uid === false)
				jdRet(E_AUTHFAIL, "bad user", "手机号未注册");
		}
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
			jdRet(E_AUTHFAIL, "bad password", "密码验证失败");
	}
	else { // 使用验证码
		validateDynCode($code);
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
	if (Login::$bindUserUseCode) {
		$code = mparam("code");
		validateDynCode($code, $phone);
	}
	$imp = LoginImpBase::getInstance();
	return $imp->onBindUser($phone);
}

function api_login2()
{
	$wxCode = mparam("wxCode");

	//根据wxCode 获取 weixinOpenId
	$params = [
		"appid" => Login::$wxApp["appid"],
		"secret" => Login::$wxApp["secret"],
		"js_code" => $wxCode,
		"grant_type" => "authorization_code"
	];
	$url = makeUrl("https://api.weixin.qq.com/sns/jscode2session", $params);
	$rv = httpCall($url);
	$ret = json_decode($rv, true);
	// 成功时返回 {openid, session_key} (没有errcode!), 失败时返回 {errcode, errmsg}
	if (@!$ret["openid"]) {
		logit("login2(wxCode) error: $rv");
		jdRet(E_AUTHFAIL, @$ret["errmsg"]);
	}
	// {openid, session_key, unionid?, ...}
	// TODO: get user info?
	$wxUserInfo =  [
		"openid" => $ret["openid"]
	];
	$imp = LoginImpBase::getInstance();
	$ret = $imp->onWeixinLogin($wxUserInfo, null);

	return $ret;
}

function api_queryWeixinKey()
{
	$phone = param("phone");
	$unionid = mparam("unionid");

	$arr = queryAll("SELECT weixinKey FROM User", false, [
		"_or" => true,
		"phone" => $phone,
		"weixinUnionKey" => $unionid
	]);
	$res = array_map(function ($e) {
		return $e[0];
	}, $arr);
	return $res;
}
