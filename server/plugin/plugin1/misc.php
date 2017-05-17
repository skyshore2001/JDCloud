<?php

/*
## 发送短信

	sendSms(phone, content, channel?=0)
*/
function api_sendSms()
{
	checkAuth(AUTH_EMP);

	$phone = mparam("phone");
	$content = mparam("content");
	$channel = param("channel", 0);

	sendSms($phone, $content, $channel, true);
}

/*

## 代理接口

	proxy(url)

代理访问url。
*/
function api_proxy()
{
	// 通用API代理，支持cookie, get/post.
	$url = $_GET["url"];
	// @$rv = file_get_contents($url);
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

	// support session/cookie
	$ses = session_save_path() . '/proxy_' . session_id() . '.txt';
	curl_setopt($ch, CURLOPT_COOKIEFILE, $ses);
	curl_setopt($ch, CURLOPT_COOKIEJAR, $ses);

	if ($_SERVER["REQUEST_METHOD"] == "POST") 
	{
		curl_setopt($ch, CURLOPT_POST, 1);
		curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents("php://input") );
	}

	curl_setopt($ch, CURLOPT_HEADER, 0);
	$rv = curl_exec($ch);
	curl_close($ch);
	return $rv;
}

// ==== verify partner sign {{{
/*

## 生成签名

	genSign(_pwd, ...) -> sign

根据密码对所有待签名字段进行签名。一般地，非下划线开头的字段都是待签名字段(例如_pwd, _sign这些都不参与签名)，特别的会专门说明。
该API一般仅用于测试。（参考：页面 `partner/voucher.html` 使用了这个API）。

如果希望一个参数不参与签名，则设计它的名字以"_"开头，如"_ac".

*/
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
//}}}

// vi: foldmethod=marker
