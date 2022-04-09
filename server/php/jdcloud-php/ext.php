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

global $ERRINFO;
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

/*
document: https://mp.weixin.qq.com/advanced/tmplmsg?action=faq&token=1260719760&lang=zh_CN
向公众号用户推送消息。msgData为模板消息，示例：

T_fofgFKDxJ2gJRVHcQjEA9HyS9WMTNPOgWDhmGYgAM

	{{first.DATA}}
	提交时间：{{keyword1.DATA}}
	预约类型：{{keyword2.DATA}}
	{{remark.DATA}}

调用示例：

	$linkUrl = getBaseUrl() . "web/index.html";
	$msgData = [
		"touser" => "oAtEv1T3CiB-zQPKKGTAPaMgMQNk", // 特别的，如果是多个人，可用数组：["oAtEv1T3CiB-zQPKKGTAPaMgMQNk", "..."]
		"template_id" => "T_fofgFKDxJ2gJRVHcQjEA9HyS9WMTNPOgWDhmGYgAM",
		"url" => $linkUrl,
		"topcolor" => "#ff0000",
		"data" => [
			"first" => [
				"value" => $msg,
				"color" => '',
			],
			"keyword1" => [
				"value" => '',
				"color" => '',
			],
			"keyword2" => [
				"value" => '',
				"color" => '',
			],
			"remark" => [
				"value" => '',
				"color" => '',
			],
		]
	];
	$wx = getExt(Ext_WxSupport);
	$wx->sendWeiXin($msgData);

为了使 getBaseUrl() 得到正确的前缀（比如测试时默认是localhost，无法在微信中打开），可在conf.user.php中配置 P_BASE_URL，如

	putenv("P_BASE_URL=http://oliveche.com/8081/p/mall/server/");
*/
	function sendWeixin($msgData);

/*
	// 企业向个人付款
	// 返回：{payNo, payTm, outTradeNo}, 失败抛出异常
	// document: https://pay.weixin.qq.com/wiki/doc/api/tools/mch_pay.php?chapter=14_2
	function payToUser($weixinKey, $outTradeNo, $name, $amount, $dscr);

	function initWeixinJsapi($url);
*/
}

// 推送APP消息
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
		
		if(@$GLOBALS["MOCK_MODE"]){
			$obj = new ExtMock();
		}else{
			require_once(__DIR__ . "/../../weixin/WxSupport.php");
			$obj = new WxSupport();
		}
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
		$log = "[发起微信支付] forJS=`{$forJS}`, outTradeNo=`{$outTradeNo}`, amount=`{$amount}`, dscr=`{$dscr}`";
		logext($log);

		return ["err" => "mock"];
	}

	// 推送微信消息
	function sendWeixin($msgData)
	{
		$str = jsonEncode($msgData);
		$log = "[推送微信消息] msg=$str";
		logext($log);
	}

	function pushMessage($toUserId, $msg, $opt=null)
	{
		$log = "[推送APP消息] toUser=`{$toUserId}`, msg=`{$msg}`\n";
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
