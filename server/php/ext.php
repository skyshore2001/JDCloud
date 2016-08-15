<?php

/**
@module ext 集成外部系统

调用外部系统（如短信集成、微信集成等）将引入依赖，给开发和测试带来复杂性。
筋斗云框架通过使用“模拟模式”(MOCK_MODE)，模拟这些外部功能，从而简化开发和测试。

对于一个简单的外部依赖，可以用函数isMockMode来分支。例如添加对象存储服务(OSS)支持，接口定义为：

	getOssParam() -> {url, expire, dir, param={policy, OSSAccessKeyId, signature} }
	模拟模式返回：
	getOssParam() -> {url="mock"}

在实现时，先在ext.php中定义外部依赖类型，如Ext_Oss，然后实现函数：

	function api_getOssParam()
	{
		if (isMockMode(Ext_Oss)) {
			return ["url"=>"mock"];
		}
		// 实际实现代码 ...
	}

添加一个复杂的（如支持多个函数调用的）支持模拟的外部依赖，也则可以定义接口，步骤如下，以添加短信支持(SmsSupport)为例：

- 定义一个新的类型，如Ext_SmsSupport.
- 定义接口，如 ISmsSupport.
- 在ExtMock类中模拟实现接口ISmsSupport中所有函数, 一般是调用logext()写日志到ext.log, 可以在tool/log.php中查看最近的ext日志。
- 定义一个类SmsSupport实现接口ISmsSupport，一般放在其它文件中实现(如sms.php)。
- 在onCreateExt中处理新类型Ext_SmsSupport, 创建实际接口对象。

使用举例：

	$sms = getExt(Ext_SmsSupport);
	$sms->sendSms(...);

当在运行目录中放置了文件CFG_MOCK_MODE后，则不必依赖外部系统，也可模拟执行这些操作。

@see getExt
@see CFG_MOCK_MODE,CFG_MOCK_T_MODE,MOCK_MODE
*/

const Ext_Mock = 0;
const Ext_SmsSupport = 1;
const Ext_WxSupport = 2;

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

	default:
		throw new MyException(E_SERVER, "bad ext type `$extType`");
	}
	return $obj;
}

// ======= 此部分APP不应修改 {{{
/**
@fn isMockMode($extType)

判断是否模拟某外部扩展模块。如果$extType为null，则只要处于MOCK_MODE就返回true.
 */
function isMockMode($extType)
{
	// TODO: check extType
	return $GLOBALS["MOCK_MODE"];
}

class ExtFactory
{
	private $objs = []; // {$extType => $ext}

/**
@fn ExtFactory::instance()

@see getExt
 */
	static public function instance()
	{
		static $inst;
		if (!isset($inst))
			$inst = new ExtFactory();
		return $inst;
	}

/**
@fn ExtFactory::getObj($extType, $allowMock?=true)

获取外部依赖对象。一般用getExt替代更简单。

示例：

	$sms = ExtFactory::instance()->getObj(Ext_SmsSupport);

@see getExt
 */
	public function getObj($extType, $allowMock=true)
	{
		if ($allowMock && isMockMode($extType)) {
			return $this->getObj(Ext_Mock, false);
		}

		@$ext = $this->objs[$extType];
		if (! isset($ext))
		{
			if ($extType == Ext_Mock)
				$ext = new ExtMock();
			else
				$ext = onCreateExt($extType);
			$this->objs[$extType] = $ext;
		}
		return $ext;
	}
}

/**
@fn getExt($extType, $allowMock = true)

用于取外部接口对象，如：

	$sms = getExt(Ext_SmsSupport);

*/
function getExt($extType, $allowMock = true)
{
	return ExtFactory::instance()->getObj($extType, $allowMock);
}

/**
@fn logext($s, $addHeader?=true)

写日志到ext.log中，可在线打开tool/init.php查看。
(logit默认写日志到trace.log中)

@see logit

 */
function logext($s, $addHeader=true)
{
	logit($s, $addHeader, "ext");
}
//}}}

// ====== ExtMock: 模拟实现 {{{
class ExtMock implements ISmsSupport, IWxSupport
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
		logext($log);
	}

	// 向用户推送订单提醒
	// msg={header, \%fixedBody, \%body, footer}
	// fixedBody/body={key => value}
	// throw exception for error
	function sendUserNotification($wxOpenId, $msg, $linkUrl)
	{
		$str = msgStructToStr($msg);

		$log = "[微信用户推送] wxOpenId=`{$wxOpenId}`, linkUrl=`{$linkUrl}`, msg=\n`$str`\n";
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
