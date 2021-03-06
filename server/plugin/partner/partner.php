<?php

function api_genSign()
{
	checkAuth(PERM_TEST_MODE);
	$partnerId = mparam("partnerId");
	$pwd = mparam("_pwd");
	return Partner::genSign($pwd);
}

function api_openApiTest()
{
	Partner::checkAuth();
}

class PartnerImpBase
{
	use JDSingletonImp;

	function onGetPartnerPwd($partnerId) {
		return "1234";
	}
}

class Partner
{
/**
@var Partner::$timestampPeriod=600
*/
	static $timestampPeriod = 600; // 默认10分钟, 10*60

/**
@var Partner::$replayCheck=true

检测时间戳和重放攻击。如果设置为false，则请求中无须timestamp参数，不检查调用时间及是否已调用过，安全性低。
*/
	static $replayCheck = true;

	// 默认对GET+POST字段做签名(忽略下划线开头的控制字段)
	static function genSign($pwd, $params=null)
	{
		if ($params == null)
			$params = array_merge($_GET, $_POST);
		ksort($params);
		$str = null;
		foreach ($params as $k=>$v) {
			if ($k[0] === "_") // e.g. "_pwd", "_sign", "_ac"
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
		$str .= $pwd;
		$sign = md5($str);
		return $sign;
	}

/**
@fn Partner::checkAuth()

检查为合作伙伴提供的OpenApi调用是否合法。
*/
	static function checkAuth()
	{
		$partnerId = mparam("partnerId");
		list($sign, $pwd) = mparam(["_sign", "_pwd"]);
		
		$imp = PartnerImpBase::getInstance();
		$pwd1 = $imp->onGetPartnerPwd($partnerId);
		if (! $pwd1)
			throw new MyException(E_FORBIDDEN, "unknown partnerId=$partnerId");

		if ($pwd !== null) {
			if (! (self::isHttps() || hasPerm(PERM_TEST_MODE)))
				throw new MyException(E_FORBIDDEN, "use param `_sign` instead of `_pwd`");
			if ($pwd != $pwd1)
				throw new MyException(E_AUTHFAIL, "bad pwd for partnerId=$partnerId");
			return;
		}
		$sign1 = self::genSign($pwd1);
		if ($sign !== $sign1)
			throw new MyException(E_AUTHFAIL, "bad sign for partnerId=$partnerId");

		if (! self::$replayCheck)
			return;

		$timestamp = mparam("timestamp/n"); // 不要用/i，会溢出
		if ($timestamp > 10000000000) {
			$timestamp = floor($timestamp/1000);
		}
		$diff = abs(time() - $timestamp);
		if ($diff > self::$timestampPeriod)
			throw new MyException(E_FORBIDDEN, "timestamp expires");

		$rv = queryOne(sprintf("SELECT 1 FROM OpenApiRecord WHERE sign=%s", Q($sign)));
		if ($rv !== false)
			throw new MyException(E_FORBIDDEN, "duplicated sign");

		dbInsert("OpenApiRecord", [
			"partnerId"=>$partnerId,
			"tm"=>dbExpr("NOW()"),
			"apiLogId"=>ApiLog::$lastId,
			"sign"=>$sign
		]);
	}

	static function isHttps()
	{
		if (!isset($_SERVER['HTTPS']))
			return false;  
		if ($_SERVER['HTTPS'] === 1) //Apache  
			return true;
		if ($_SERVER['HTTPS'] === 'on') //IIS  
			return true;
		if ($_SERVER['SERVER_PORT'] == 443) //其他  
			return true;
		return false;
   }
}
// vi: foldmethod=marker
