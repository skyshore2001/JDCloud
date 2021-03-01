<?php

class PayType
{
	const Weixin = 'WX';
	const Alipay = 'AL';
}

class Pay
{
	static $tradeNoWithTm = true;
	static $tradeApp = "MALL";

/**
@fn Pay::payOrder($outTradeNo, $payType, $payNo, $amount=null)
*/
	static function payOrder($outTradeNo, $payType, $payNo, $amount=null)
	{
		$rv = self::fromOutTradeNo($outTradeNo);
		if ($rv === false)
			throw new MyException(E_PARAM, "bad outTradeNo=`$outTradeNo`");

		$pay = PayImpBase::getInstance();
		$rv = $pay->onPayOrder($rv["tradeKey"], $rv["id"], $payType, $payNo, $amount);
		logit("pay by $payType for $outTradeNo: " . ($rv ?: "success"));
	}

/**
@fn Pay::getOutTradeNo($tradeKey, $id)

e.g. getOutTradeNo("ORDR", 100) -> "ORDR-100"
*/
	static function getOutTradeNo($tradeKey, $id)
	{
		$ret = "{$tradeKey}-{$id}";
		if (Pay::$tradeApp) {
			$ret .= "-" . Pay::$tradeApp;
		}

		if (Pay::$tradeNoWithTm) {
			$tm = date("His");
			$ret .= "-{$tm}";
		}
		return $ret;
	}

/**
@fn Pay::fromOutTradeNo($outTradeNo)

@return {tradeKey, id}, return false on failure.

e.g. "ORDR-100" / "ACTE-100"
*/
	static function fromOutTradeNo($outTradeNo)
	{
		if (! preg_match('/^(\w+)-(\d+)/', $outTradeNo, $ms))
			return false;
		return [
			"tradeKey" => $ms[1],
			"id" => (int)$ms[2]
		];
	}
}

abstract class PayImpBase
{
/*
@fn PayImpBase::getInstance()
*/
	use JDSingletonImp;

/**
@var PayImpBase::payTypes
@var PayImpBase::payMockTypes

数组：type => functionName
用于扩展支付，支持微信支付示例：

	PayImpBase::$payTypes["wx"] = "pay_wx";
	PayImpBase::$payMockTypes["wx"] = "payMock_wx";

	// payParam: {outTradeNo, amount, dscr}
	function pay_wx($payParam)
	{
		$forJS = param("forJS/b", true);
		$wxSupport = getExt(Ext_WxSupport);
		$params = $wxSupport->prepay($forJS, $payParam["outTradeNo"], $payParam["amount"], $payParam["dscr"]);
		return $params;
	}

	function payMock_wx($payParam)
	{
	}
*/
	static $payTypes = []; // type => functionName
	static $payMockTypes = []; // type => functionName

/**
@fn PayImpBase::generalPay() -> {outTradeNo, amount, dscr}
*/
	static function generalPay()
	{
		checkAuth(AUTH_USER);

		$tradeNo = mparam("tradeNo");
		$trade = Pay::fromOutTradeNo($tradeNo);
		if ($trade === false)
			throw new MyException(E_PARAM, "bad trade=`$tradeNo`");

		$pay = PayImpBase::getInstance();
		$ret = $pay->onGetPayInfo($trade["tradeKey"], $trade["id"]);
		$ret["outTradeNo"] = Pay::getOutTradeNo($trade["tradeKey"], $trade["id"]);
		return $ret;
	}

/**
@fn PayImpBase::msgStructToStr($msg)

将消息结构转成字符串。

@param $msg={header, \%fixedBody, \%body, footer}
fixedBody/body={key => value}

*/
	static function msgStructToStr($msg)
	{
		$str = $msg["header"] . "\n\n";

		if (isset($msg["fixedBody"])) {
			foreach ($msg["fixedBody"] as $k=>$v) {
				$str .= "{$k}：{$v}\n";
			}
		}
		if (isset($msg["body"])) {
			foreach ($msg["body"] as $k=>$v) {
				$str .= "{$k}：{$v}\n";
			}
		}
		if (isset($msg["footer"])) {
			$str .= "\n" . $msg["footer"] . "\n";
		}
		return $str;
	}

	abstract function onGetPayInfo($tradeKey, $id);
	abstract function onPayOrder($tradeKey, $id, $payType, $payNo, $amount);
}

function callScript($script, $ok_key)
{
	require_once($script);
	$data = ob_get_contents();
	if (strpos($data, $ok_key) === false)
	{
		ob_end_flush();
		exit();
	}
	ob_end_clean();
}

function api_pay()
{
	$type = mparam("type");
	$rv = PayImpBase::generalPay();
	if(@$GLOBALS["MOCK_MODE"]) {
		$rv["err"] = "mock";
		return $rv;
	}
	$fn = PayImpBase::$payTypes[$type];
	if (!function_exists($fn))
		throw new MyException(E_SERVER, "unknown pay type" . $type, "未知付款类型`$type'");
	return call_user_func($fn, $rv);
}

function api_payMock()
{
	checkAuth(PERM_MOCK_MODE);
	$type = param("type", "wx");
	$rv = PayImpBase::generalPay();
	$fn = PayImpBase::$payMockTypes[$type];
	if (!function_exists($fn))
		throw new MyException(E_SERVER, "unknown pay type" . $type, "付款类型`$type'不支付模拟支付");
	return call_user_func($fn, $rv);
}

// 扩展支持：微信支付
PayImpBase::$payTypes["wx"] = "pay_wx";
PayImpBase::$payMockTypes["wx"] = "payMock_wx";

function pay_wx($payParam)
{
	$forJS = param("forJS/b", true);
	$wxSupport = getExt(Ext_WxSupport);
	$params = $wxSupport->prepay($forJS, $payParam["outTradeNo"], $payParam["amount"], $payParam["dscr"]);
	return $params;
}

function payMock_wx($payParam)
{
	$outTradeNo = $payParam["outTradeNo"];
	$amount = round($payParam["amount"] * 100); // 微信支付：单位为分，且为整数

	$ok_key = "CDATA[SUCCESS]";

	$GLOBALS['HTTP_RAW_POST_DATA'] = "<xml><appid><![CDATA[wxea114e94917bb3ff]]></appid>
<bank_type><![CDATA[CFT]]></bank_type>
<cash_fee><![CDATA[1]]></cash_fee>
<fee_type><![CDATA[CNY]]></fee_type>
<is_subscribe><![CDATA[Y]]></is_subscribe>
<mch_id><![CDATA[1245077002]]></mch_id>
<nonce_str><![CDATA[jq29bc3zjml9zezuwffzcq7npt5rjzro]]></nonce_str>
<openid><![CDATA[opLLvt1_7sCOFQ1wHv_P_MTXuoTg]]></openid>
<out_trade_no><![CDATA[$outTradeNo]]></out_trade_no>
<result_code><![CDATA[SUCCESS]]></result_code>
<return_code><![CDATA[SUCCESS]]></return_code>
<sign><![CDATA[TEST-SIGN-FOR-MOCK]]></sign>
<time_end><![CDATA[20150606201649]]></time_end>
<total_fee>$amount</total_fee>
<trade_type><![CDATA[JSAPI]]></trade_type>
<transaction_id><![CDATA[999999-MOCK-$outTradeNo]]></transaction_id>
</xml>";
	chdir("weixin");
	callScript("notify_url.php", $ok_key);
}

// 扩展支持：支付宝支付
PayImpBase::$payTypes["ali"] = "pay_alipay";
PayImpBase::$payMockTypes["ali"] = "payMock_alipay";

// 参数: { outTradeNo, amount, dscr }
function pay_alipay($payParam)
{
	require_once("alipay/AliSupport.php");
	$url = AliSupport::Alipay($payParam["outTradeNo"], $payParam["amount"], $payParam["dscr"]);
	return ["url" => $url];
}

function payMock_alipay($payParam)
{
	require_once("alipay/AliSupport.php");
	$url = AliSupport::Alipay($outTradeNo, $amount, $rv["dscr"]);

	$ok_key = "success";

	$outTradeNo = $payParam["outTradeNo"];
	$amountStr = strval($payParam["amount"]);
	$_POST = [
		'gmt_create' => '2019-08-30 17:35:44',
		'charset' => 'utf-8',
		'seller_email' => '2990242994@qq.com',
		'subject' => '支付订单[35]',
		'sign' => 'MOCK_SIGN',
		'buyer_id' => '2088002478421084',
		'invoice_amount' => $amountStr,
		'notify_id' => '2019083000222173545021080564887337',
		'fund_bill_list' => '[{"amount":"0.01","fundChannel":"ALIPAYACCOUNT"}]',
		'notify_type' => 'trade_status_sync',
		'trade_status' => 'TRADE_SUCCESS',
		'receipt_amount' => $amountStr,
		'app_id' => '2019082266369502',
		'buyer_pay_amount' => '0.01',
		'sign_type' => 'RSA2',
		'seller_id' => '2088631087926411',
		'gmt_payment' => '2019-08-30 17:35:44',
		'notify_time' => '2019-08-30 17:35:45',
		'version' => '1.0',
		'out_trade_no' => $outTradeNo,
		'total_amount' => $amountStr,
		'trade_no' => "9999-ALIPAY-MOCK-$outTradeNo",
		'auth_app_id' => '2019082266369502',
		'buyer_logon_id' => 'sky***@sohu.com',
		'point_amount' => '0.00',
	];

	chdir("alipay");
	$GLOBALS["MOCK_MODE"] = 1;
	callScript("notify_url.php", $ok_key);
}

