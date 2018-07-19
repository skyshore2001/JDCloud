<?php

/**
@module Pay

## 服务端接口

通用支付

	getPayParam(tradeNo) -> { outTradeNo, amount, dscr }

tradeNo
: String. 交易号。格式："{tradeKey}-{id}", 如"ORDR-11"，表示订单11. 它最终将被转换成外部交易号outTradeNo。

@see Pay::$tradeApp

微信或支付宝支付

	alipay(tradeNo) -> {url}
	wxpay(tradeNo, forJS?) -> params

模拟支付

	payMock(type?=wx, tradeNo)

可用于测试支付。应在模拟模式下使用。

- 仅当订单可支付时(如CR,CO等状态)，将其状态改为已支付(PA)
- 推送消息

## 实现规范

模块对外接口或配置项通过类Pay调用，如：

	Pay::payOrder(...);
	Pay::tradeApp = "...";

模块内部实现通过类PayImpBase实现，外部不应直接调用。在模块内部通过 PayImpBase::getInstance() 创建实例来调用动态功能，如

	$pay = PayImpBase::getInstance();
	$pay->onPayOrder(...);

模块实现的扩展通过类PayImp实现，使用者可自定义PayImpBase中的非静态函数。

## 用法

公共方法和配置参见Pay类相关函数。

	require_once("pay.php"); // 提供接口实现和工具类
	require_once("payimp.php"); // 需要根据PayImpBase类自行实现PayImp类，参考下面章节的示例

PayImp实现示例：

	class OrderStatus
	{
		const Paid = 'PA';
		const Unpaid = 'CR';
		const Confirmed = 'CO';
		static function getName($status) {
			$OrderStatusStr = [
				"CR" => "未付款", 
				"PA" => "已付款", 
				"RE" => "已完成", 
				"RA" => "已评价", 
				"CA" => "已取消", 
				"ST" => "正在服务"
			];
			return $OrderStatusStr[$status] ?: $status;
		}
	}

	class PayImp extends PayImpBase
	{
		function onGetPayInfo($tradeKey, $id)
		{
			$dscr = "筋斗城";
			if ($tradeKey === "ORDR") {
				$row = queryOne("SELECT amount, payAmount, status FROM Ordr WHERE id=$id");
				if ($row === false)
					throw new MyException(E_PARAM, "cannot find Ordr id=`$id`", "找不到订单");
				list($amount, $payAmount, $status) = $row;
				if ($payAmount)
					$amount = $payAmount;
				// TODO: 检查订单状态$status

				$amount = (double)$amount;
				$dscr .= "支付订单[" . $id . "]";
			}
			else {
				throw new MyException(E_PARAM, "bad tradeKey=`{$tradeKey}`");
			}
			return [
				"amount" => $amount,
				"dscr" => $dscr
			];
		}

		function onPayOrder($tradeKey, $id, $payType, $payNo, $amount)
		{
			if ($tradeKey == "ORDR") {
				$sql = sprintf("SELECT status, amount FROM Ordr WHERE id=$id");
				$row = queryOne($sql, true);
				if ($row === false)
					throw new MyException(E_PARAM, "cannot find Ordr.id=`$id`");

				# ignore if paid.
				if ($row["status"] == OrderStatus::Paid)
					return "ignore for paid order $id";

				if ($row["status"] != OrderStatus::Unpaid && $row["status"] != OrderStatus::Confirmed)
					throw new MyException(E_FORBIDDEN, "order (id=$id) status does not allow to pay: status=" . $row["status"]);

				if (abs(doubleval($row["amount"]) - $amount) > 0.01) {
					logit("amount mismatch for $tradeKey-$id: expect {$row['amount']}, actual $amount.");
				}

				# pay order
				$sql = sprintf("UPDATE Ordr SET status='%s', payType='%s', payNo=%s WHERE id=%d", OrderStatus::Paid, $payType, Q($payNo), $id);
				$cnt = execOne($sql);
				
				# add OrderLog
				$sql = sprintf("INSERT INTO OrderLog (orderId, action, tm) VALUES ($id,'PA',%s)", Q(date(FMT_DT)));
				$cnt = execOne($sql);
				
				$this->notifyNewOrder($id);
			}
			else {
				throw new MyException(E_PARAM, "unknown tradeKey=`{$tradeKey}`");
			}
		}

		// 构造标准msg结构
		function sendOrderNotification($orderId, $msg, $noWeixin = false, $hash = "#order", $throwEx = false)
		{
			//$sql = "SELECT dscr, status, userId, userPhone FROM Ordr WHERE id=$orderId";
			$sql = "SELECT o.dscr, o.status, o.userId, u.phone userPhone FROM Ordr o INNER JOIN User u ON o.userId=u.id WHERE o.id=$orderId";
			$row = queryOne($sql);
			if ($row === false)
			{
				$msg = "fail to find order id: $orderId";
				logit($msg);
				if ($throwEx)
					throw new MyException(E_PARAM, $msg, "订单号不存在");
				return false;
			}
			list($dscr, $status, $userId, $userPhone) = $row;
			$statusStr = OrderStatus::getName($status);
			$footer = "客服电话：400xxxxxx";

			$msg["fixedBody"] = [
				"订单号" => "{$orderId} ({$dscr})",
				"订单状态" => $statusStr
			];
			if (isset($msg["footer"])) {
				$msg["footer"] .= "\n" . $footer;
			}
			else {
				$msg["footer"] = $footer;
			}
			if ($GLOBALS["TEST_MODE"])
				$msg["header"] .= "(测试模式)";

			$msgStr = self::msgStructToStr($msg);

			// first try weixin, then sms
			if (! $noWeixin)
			{
				// 获取微信用户的openid, 如果没有openid，则不发送并记录日志。
				try {
					$wxOpenId = queryOne("SELECT weixinOpenId FROM User WHERE id=$userId");
				
					if ($wxOpenId) {
						// linkUrl
						$baseUrl = getBaseUrl();
						$query = "orderId={$orderId}";
						//$url = $baseUrl . "m2/index.html?orderId=1001#order";
						$linkUrl = $baseUrl . "m2/index.html?{$query}{$hash}";

						$wxSupport = getExt(Ext_WxSupport);
						$wxSupport->sendUserNotification($wxOpenId, $msg, $linkUrl);
					}
					else {
						logit("ignore weixin notification for order $orderId: user does not have openid.");
					}
				}
				catch (Exception $e) {
					logit("fail to send user notification via weixin: " . $e . "; orig msg: `$msgStr`");
				}
			}

			if ($userPhone)
				sendSms($userPhone, $msgStr, 0, $throwEx);
		}
		

		function notifyNewOrder($id)
		{
			# notify
			try {
				// 企业号内部对员工通知。到店订单通知给我们也有通知
	// 			$info = sprintf("有新订单！编号[%s]，用户[%s]，预约[%s]，时间[%s]，地点[%s]，快联系!",
	// 				$id,
	// 				$row["userPhone"],
	// 				$row["dscr"],
	// 				formatOrderTm($row["comeTm"], $row["comeSpan"]),
	// 				$row["userPosDscr"]);	
	// 
	// 			getExt(Ext_WxSupport)->sendEmpNotification($info);
				
				$msg = [
					"header" => "订单支付成功", // Conf::$MSGS["PAID_ORDER"],
					//"body" => ["预约服务时间" => $reservedTime]
				];
				$this->sendOrderNotification($id, $msg);
			}
			catch (Exception $e)
			{
			}
		}
	}
*/

class PayType
{
	const Weixin = 'wx';
	const Alipay = 'ali';
}

class Pay
{
/**
@var Pay::$tradeNoWithTm ?= true

指定在生成支付交易号outTradeNo时是否添加当前时间。

默认生成outTradeNo如：ORDR-11-JDC-110301
当 Pay::$tradeNoWithTm=false时： ORDR-11-JDC

在微信支付时，如果已经发起过支付且取消，之后修改金额（或修改描述信息）后再支付，如果outTradeNo不变，会导致“订单号重复”报错，需要等待5分钟后才可再次支付。
因而如果有修改订单金额再次支付的需求(订单可修改，比如添加优惠券)，可在outTradeNo中加入时间以保证对同一个订单发起多次支付时交易号不相同。
注意这样可能会导致同一订单多次支付，应在支付时严格检查订单状态(比如增加“已发起支付等待确认”的状态)。
*/
	static $tradeNoWithTm = true;

/**
@var Pay::$tradeApp ?= "JDC"

外部交易号(outTradeNo)格式：

	{tradeKey}-{id}-{tradeApp?}-{tm?}

例如：

	ORDR-11-JDC
	ORDR-11-JDC-100946

由于一个公众号可能被用于多个应用程序中，为了区分每个应用程序中的订单，可设置 Pay::$tradeApp.
*/
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
		logit($rv);

		return "sucessful pay for trade $outTradeNo";
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

/*
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

function api_getPayParam()
{
	return PayImpBase::generalPay();
}

function api_alipay()
{
	$rv = PayImpBase::generalPay();
	require_once("alipay/AliSupport.php");
	$url = AliSupport::Alipay($rv["outTradeNo"], $rv["amount"], $rv["dscr"]);
	return ["url" => $url];
}

function api_wxpay()
{
	$forJS = param("forJS/b", true);
	$rv = PayImpBase::generalPay();
	//logit($forJS . ":" . $rv["outTradeNo"] . ":" .  $rv["amount"] . ":" . $rv["dscr"]);
	$wxSupport = getExt(Ext_WxSupport);
	$params = $wxSupport->prepay($forJS, $rv["outTradeNo"], $rv["amount"], $rv["dscr"]);
	return $params;
}

function api_payMock()
{
	checkAuth(PERM_MOCK_MODE);

	$type = param("type", "wx");

	$rv = PayImpBase::generalPay();
	$outTradeNo = $rv["outTradeNo"];
	$amount = $rv["amount"];

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

	if ($type == "alipay") {
		require_once("alipay/AliSupport.php");
		$url = AliSupport::Alipay($outTradeNo, $amount, $rv["dscr"]);

		$ok_key = "success";
		$_GET = [];
		$_POST = ["ac"=>"ok"];
		chdir("alipay");
		callScript("paymock.php", $ok_key);
		header("HTTP/1.1 200 OK");
	}
	else if ($type == "wx") {
		/*
		$forJS = 1;
		$wxSupport = getExt(Ext_WxSupport);
		$params = $wxSupport->prepay($forJS, $outTradeNo, $amount, $rv["dscr"]);
		*/

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
	else
		throw new MyException(E_PARAM, "unknown type=`$type`");
	return "OK";
}
