# 合作伙伴开放API接口的验证框架 / OpenApi for Partner

## 概要设计

外部系统调用本系统开放API时，不用普通登录过程。
系统事先为外部调用者分配好partnerId和pwd，调用时，在每个请求中包含partnerId及密钥或签名即可。

如果是https请求，或是调试模式，可直接传partnerId和pwd验证；
如果是http请求，应传partnerId和签名(sign)进行验证。验证机制应确保请求不会被篡改（通过对所有业务参数签名），且不会被用于重放攻击（常通过时间戳timestamp和随机数nonce）。

本系统对签名的验证机制为：

- 检查签名sign是否正确。
- 检查timestamp与服务器的时间差是否在10分钟内（可通过Partner::timestampPeriod调整），即允许请求方与服务器有10分钟的时间误差。timestamp精确到秒。
- 检查签名是否已用过。目前不必使用随机数nonce，如果请求方一秒内发多个完全相同的请求会出错，这可通过在请求中加任意参数解决。

预防重放攻击的意义：例如某接口用于使用会员卡消费，如果多次调用，会造成用户被多次扣费。
为防止重放攻击，目前已用签名会存数据库（如果存缓存中更合理）。对旧的签名（如超过10分钟以上的）应定期清理。

### 关于Session与Cookie

OpenApi请求可以不需要Session（通过Cookie机制），但服务端会支持Session。
某些情况Session是必要的，例如，向服务器请求发送验证码并之后做验证，就必须使用Session，否则无法验证成功。

这时请求方可自行指定Cookie，比如：

	# 请求验证码
	curl -i --cookie "extid=lj123" http://localhost/jdcloud/api.php/genCode?_app=ext&...
	# 验证验证码
	curl -i --cookie "extid=lj123" http://localhost/jdcloud/api.php/validateCode?_app=ext&code=123456&...

根据jdcloud-php的Cookie规则，应用ID(_app参数)决定Cookie名称，即这个例子中，通过"_app=ext"指定了Cookie中"extid"即是Session编号。
假设请求方也是某后端服务，它一般可以直接设置extid为自已的Session编号，如php示例：（参考框架中的httpCall函数）

	$headers = [
		"Cookie: extid=" . session_id()
	];
	$url = makeUrl("$baseUrl/$ac", $param);
	$rv = httpCall($url, $data, ["headers" => $headers]);

## 数据库设计

@OpenApiRecord: id, partnerId, tm, apiLogId, sign

- apiLogId: 关联ApiLog。如果要查看调用细节，如IP、参数等，可查询ApiLog表。

注意：

- sign列用于查询签名是否已使用过，预防重放攻击。该列应加索引。
- 应定时清理，如：`DELETE FROM OpenApiRecord WHERE tm<{1天前}`

## 外部接口 / 调用OpenApi方法

在每个调用请求中，添加以下特别参数：

- partnerId: 调用者编号。
- timestamp: 时间戳。格式为精确到秒(或毫秒)的Unix纪元时间（从1970/1/1至现在的秒数或毫秒数），一般可通过C/PHP的time()函数，或JS/Java的new Date().getTime()获得。
 (如果系统配置了Partner::$replayCheck=false，则无须此参数)
- _sign/_pwd: 签名或密码。HTTPS协议，或partnerId=0，或测试模式下可以使用_pwd，否则应使用_sign。关于_sign如何生成请参考附录-签名算法。

注意：如果参数名以下划线开头，则它不参与签名，例如_pwd, _sign这些参数都不参与签名。

测试模式下，支持以下接口（均只用于测试）。

根据partnerId和密钥对所有待签名字段生成签名：

	genSign(partnerId, _pwd, ...) -> sign

验证签名：

	openApiTest(partnerId, timestamp, _pwd/_sign)

## 签名算法

签名生成规则如下：

- 所有名字不以下划线开头的参数（包括URL中和POST中的参数）均为待签名参数。如_pwd/_test这些参数不参与签名。
- 对所有待签名参数按照字段名的ASCII 码从小到大排序（字典序，注意区分大小写）后，使用URL键值对的格式（即key1=value1&key2=value2…）拼接成字符串string1。
  注意：字段名和字段值都采用原始值，不进行URL 转义。
- 将string1和合作密码拼接得到string2, 即 `string2=string1 + pwd`
- 然后对string2做md5加密，即`_sign=md5(string2)`, 将值传给`_sign`参数.

**[示例]**

假如有以下参数：

	svcId=100
	amount=0

合伙方密码为`ABCD`, 则计算签名如下：

	string1 = "amount=0&svcId=100" （按参数名字母排序拼接）
	pwd = "ABCD"
	string2 = string1 + pwd = "amount=0&svcId=100ABCD"
	_sign = md5(string2) = "4c4ca8bf0f29a0e877ce1f1b0bf5054a"

## 内部接口

在设计文档DESIGN.md中包含插件：

	@include server\plugin\partner\DESIGN.md

在plugin/index.php中添加插件：

	Plugins::add("partner");

（可选）配置插件（一般就放在plugin/index.php中）：

	Partner::$timestampPeriod=600;
	...

（可选）在php/class/下添加PartnerImp类。

### 配置项

默认timestamp检查时间为600秒（10分钟）：

	Partner::$timestampPeriod=600;

默认检查调用请求的时间戳，以及是否已调用过：

	Partner::$replayCheck=true;

设置为false可取消这些检查，只验证签名是否正确，请求中无须传timestamp参数。

默认所有partner的密码为"1234"，可通过实现PartnerImp来定制:

示例：

	class PartnerImp extends PartnerImpBase {
		function onGetPartnerPwd($partnerId) {
			return @Conf::$partners[$partnerId]["pwd"];
		}
	}

### 为API添加验证

后端接口验证示例代码：

	function api_test()
	{
		Partner::checkAuth();
		...
	}

