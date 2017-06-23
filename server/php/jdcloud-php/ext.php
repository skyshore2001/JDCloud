<?php

/*
@see ext 集成外部系统
*/

const Ext_Mock = "mock";
const Ext_SmsSupport = "sms";
const Ext_WxSupport = "wx";
const Ext_PushMsg = "push";
const Ext_Oss = "oss";

const E_SMS = 1001;
const E_WX = 1002;
const E_PUSH_MSG = 1003;

$ERRINFO[E_SMS] = "发送短信失败";
$ERRINFO[E_WX] = "微信调用失败";
$ERRINFO[E_PUSH_MSG] = "推送失败";

// 短信集成
interface ISmsSupport
{
	// 如果失败，抛出 MyException(E_SMS) 异常，并写日志到trace.log
	function sendSms($phone, $content, $channel);
}

// 微信集成
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

// 推送消息
interface IPushMsg
{
	// $toUserId: 0表示所有用户
	// $opt?={type?}
	// 如果失败，返回false, 并写日志到trace.log
	function pushMessage($toUserId, $msg, $opt=null);
}

function onCreateExt($extType)
{
	$obj = null;
	switch ($extType) {
	case Ext_WxSupport:
		/* TODO
		require_once(__DIR__ . "/../weixin/WxSupport.php");
		$obj = new WxSupport();
		 */
		$obj = new ExtMock();
		break;

	case Ext_SmsSupport:
		/* TODO
		require_once("sms.php");
		$obj = new SmsSupport();
		 */
		$obj = new ExtMock();
		break;
		
	case Ext_PushMsg:
		/*
		require_once("ext_pushmsg.php");
		$obj = new PushMsg();
		*/
		$obj = new ExtMock();
		break;
		
	default:
		throw new MyException(E_SERVER, "bad ext type `$extType`");
	}
	return $obj;
}

// ====== ExtMock: 模拟实现 {{{
class ExtMock implements ISmsSupport, IWxSupport, IPushMsg
{
	function sendSms($phone, $content, $channel)
	{
		$log = "[短信] phone=`{$phone}`, channel=$channel, content=\n`{$content}`\n";
		logext($log);
	}

	function prepay($forJS, $outTradeNo, $amount, $dscr)
	{
		$log = "[微信支付] forJS=`{$forJS}`, outTradeNo=`{$outTradeNo}`, amount=`{$amount}`, dscr=`{$dscr}`";
		logext($log);

		return ["err" => "mock"];
	}

	// 向企业号成员推送消息
	function sendEmpNotification($msg)
	{
		$log = "[微信企业号推送] msg=\n`{$msg}`\n";
		logext($log);
	}

	// 向用户推送订单提醒
	// msg={header, \%fixedBody, \%body, footer}
	// fixedBody/body={key => value}
	// throw exception for error
	function sendUserNotification($wxOpenId, $msg, $linkUrl)
	{
		$str = PayImpBase::msgStructToStr($msg);

		$log = "[微信用户推送] wxOpenId=`{$wxOpenId}`, linkUrl=`{$linkUrl}`, msg=\n`$str`\n";
		logext($log);
	}

	function pushMessage($toUserId, $msg, $opt=null)
	{
		$log = "[消息推送] toUser=`{$toUserId}`, msg=`{$msg}`\n";
		logext($log);
	}
}
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
		$sms = getExt(Ext_SmsSupport);
		$sms->sendSms($userPhone, $msg, $channel);
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

// vi: foldmethod=marker
