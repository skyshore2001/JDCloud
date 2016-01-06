<?php

require_once("php/common.php");
require_once("php/app_fw.php");

// ====== defines {{{
//}}}

// ====== app shared {{{
function sendSms($userPhone, $msg, $channel=0, $throwEx=false)
{
	if ($msg == "")
		return false;

	if (!preg_match('/^\d{11}/', $userPhone))
	{
		if ($throwEx)
			throw new MyException(E_PARAM, "bad phone `$userPhone`", "手机号不合法");

		logit("ignore sms to phone: `$userPhone`");
		return false;
	}

	try {
		getFactory()->getSmsSupport()->sendSms($userPhone, $msg, $channel);
		return true;
	}
	catch (Exception $e) {
		logit("fail to send sms: " . $e . "; orig msg: `$msg`");
		if ($throwEx)
			throw $e;
	}
	return false;
}
//}}}

// ====== classes {{{
interface ISmsSupport
{
	// throw MyException E_SMS for fail and write log in trace.log
	function sendSms($phone, $content, $channel);
}

interface IWxSupport
{
	function prepay($forJS, $outTradeNo, $amount, $dscr);

	// 向企业号成员推送消息
	function sendEmpNotification($msg);

	// 向用户推送订单提醒
	// msg={header, \%fixedBody, \%body, footer}
	// fixedBody/body={key => value}
	function sendUserNotification($wxOpenId, $msg, $linkUrl);
}

// ------ factory and mock classes {{{
class ExtMock implements ISmsSupport, IWxSupport
{
	function sendSms($phone, $content, $channel)
	{
		$log = "[短信] phone=`{$phone}`, channel=$channel, content=\n`{$content}`\n";
		logit($log, true, "ext");
	}

	function prepay($forJS, $outTradeNo, $amount, $dscr)
	{
		$log = "[微信支付] forJS=`{$forJS}`, outTradeNo=`{$outTradeNo}`, amount=`{$amount}`, dscr=`{$dscr}`";
		logit($log, true, "ext");

		if ($forJS)
		{
			return [
				"appId" => "test",
				"timeStamp" => "1234",
				"nonceStr" => "test",
				"package" => "test",
				"signType" => "test",
				"paySign" => "test",
			];
		}
		else {
			return [ "prepayId" => "test" ];
		}
	}

	// 向企业号成员推送消息
	function sendEmpNotification($msg)
	{
		$log = "[微信企业号推送] msg=\n`{$msg}`\n";
		logit($log, true, "ext");
	}

	// 向用户推送订单提醒
	// msg={header, \%fixedBody, \%body, footer}
	// fixedBody/body={key => value}
	// throw exception for error
	function sendUserNotification($wxOpenId, $msg, $linkUrl)
	{
		$str = msgStructToStr($msg);

		$log = "[微信用户推送] wxOpenId=`{$wxOpenId}`, linkUrl=`{$linkUrl}`, msg=\n`$str`\n";
		logit($log, true, "ext");
	}
}

class MyFactory
{
	const T_MOCK = 0;
	const T_WEIXIN = 1;
	const T_SMS = 2;

	private $objs = []; // {$name=>$obj}
	public static $instance;

	private function getObj($type, $isAuto)
	{
		if ($isAuto) {
			if ($GLOBALS["MOCK_MODE"])
				return $this->getObj(self::T_MOCK, false);
		}

		if (! isset($this->objs[$type]))
		{
			$obj = null;
			switch ($type) {
			case self::T_MOCK:
				$obj = new ExtMock();
				break;
			/*
			case self::T_WEIXIN:
				require_once("weixin/WxSupport.php");
				$obj = new WxSupport();
				break;
			case self::T_SMS:
				require_once("php/sms.php");
				$obj = new SmsSupport();
				break;
			 */
			// TODO: 实现weixin和sms接口.
			case self::T_WEIXIN:
			case self::T_SMS:
				$obj = new ExtMock();
				break;

			default:
				throw new MyException(E_SERVER, "bad type `$type` for MyFactory::getObj");
			}
			$this->objs[$type] = $obj;
		}
		return $this->objs[$type];
	}

	function getSmsSupport($type = null)
	{
		return $this->getObj(self::T_SMS, is_null($type));
	}

	function getWxSupport($type = null)
	{
		return $this->getObj(self::T_WEIXIN, is_null($type));
	}
}

function getFactory()
{
	if (MyFactory::$instance == null)
		MyFactory::$instance = new MyFactory();
	return MyFactory::$instance;
}
//}}}

//}}}


// vim: set foldmethod=marker :
