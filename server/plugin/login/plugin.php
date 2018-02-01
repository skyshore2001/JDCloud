<?php

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

function regUser($phone, $pwd)
{
	$phone1 = preg_replace('/^\d{3}\K(\d{4})/', '****', $phone);
	$name = "用户" . $phone1;

	$sql = sprintf("INSERT INTO User (phone, pwd, name, createTm) VALUES (%s, %s, %s, '%s')",
		Q($phone),
		Q(hashPwd($pwd)),
		Q($name),
		date(FMT_DT)
	);
	$id = execOne($sql, true);
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
	$wantAll = param("wantAll/b", 0);

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
			if (isset($code))
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
		$sql = sprintf("SELECT id,pwd FROM Employee WHERE {$key}=%s", Q($uname));
		$row = queryOne($sql, true);
		if ($row === false || (isset($pwd) && hashPwd($pwd) != $row["pwd"]) )
			throw new MyException(E_AUTHFAIL, "bad uname or password", "用户名或密码错误");

		$_SESSION["empId"] = $row["id"];
		$ret = ["id" => $row["id"] ];
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

	if ($wantAll && $obj)
	{
		$rv = tableCRUD("get", $obj);
		$ret += $rv;
	}

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
	$sql = sprintf("UPDATE User SET pwd=%s WHERE id=%d", 
		Q(hashPwd($pwd)),
		$userId);
	execOne($sql);

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
	$sql = sprintf("UPDATE Employee SET pwd=%s WHERE id=%d", 
		Q(hashPwd($pwd)),
		$empId);
	execOne($sql);

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
		$sql = sprintf("INSERT INTO Pwd (pwd, cnt) VALUES (%s, 1)", Q($pwd));
		execOne($sql);
	}
	else {
		$sql = "UPDATE Pwd SET cnt=cnt+1 WHERE id={$id}";
		execOne($sql);
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

