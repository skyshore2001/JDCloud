# 支付模块

- 支持微信、支付宝支付
- 支持模拟支付
- 支持扩展支付方式
- 支付成功后回调应用逻辑

USAGE:

- 前端调用Web服务接口：pay/payMock接口。
- 后端支付模块接口，用于配置支付及调用支付函数：Pay类
- 后端支付实现逻辑：PayImp类。
- 后端支付方式扩展：在PayImpBase::payTypes和PayImpBase::payMockTypes中注册函数。

## Web服务接口

	pay(type=wx|ali, tradeNo)
	模拟支付：
	payMock(type, tradeNo)

- type: wx-微信支付|ali-支付宝支付|自定义值
- tradeNo: String. 交易号。格式："{tradeKey}-{id}", 如"ORDR-11"，表示订单11. 它最终将被转换成外部交易号outTradeNo。
- 其它参数以及返回值，根据支付类型不同返回也不同，参考下面文档。

### 模拟模式下

	pay(type, tradeNo) -> { err=mock, outTradeNo, amount, dscr }

返回err=mock时标识是模拟支付，此时让用户确认待支付信息，确认后调用payMock发起模拟支付:

	var payParam = {type: "wx", tradeNo: "ORDR-10"};
	if (res.err == "mock") {
		// 确认支付，然后发起模拟支付。
		app_alert("确认支付?", function () {
			callSvr("payMock", payParam, function (data) {
				app_alert("支付成功!");
			});
		});
	}

### 微信支付

#### 微信支付-公众号H5支付

用于在微信中以JSAPI方式发起支付请求。

	pay(type=wx, tradeNo, forJS=1) -> {appId, timeStamp, nonceStr, package, signType, paySign}

返回结果用于微信JSAPI发起调用：WeixinJSBridge.getBrandWCPayRequest 或 wx.chooseWXPay (JSSDK封装)，示例：

	// res为返回数据
	WeixinJSBridge.invoke('getBrandWCPayRequest', res, function (res) {
		if (res.err_msg == "get_brand_wcpay_request:ok") {
			// 支付成功
		} else {
			if (res.err_msg == "get_brand_wcpay_request:cancel"){
				// 支付已取消
			} else {
				// 支付失败! 技术信息: (res.err_desc||res.errMsg)
			}
		}
	});

特别地，如果当前用户的weixinKey（即微信的openid）找不到，则无法支付，会返回：

	{err: "no_openid"}

前端可以发起微信认证，拿到weixinKey后再支付。(参考jd_weixin.js搜索no_openid)

常见的微信公众号应用的设计是，在微信中打开应用时就已经通过weixinKey登录好（或新建了用户，这时要求绑定手机号），不应出现支付时找不到weixinKey的情况，而且User表中weixinKey是不允许重复的。

还有种设计是默认进入时不做微信登录，只在遇到支付时，调起微信认证获得weixinKey，然后再恢复之前的支付上下文并支付。

weixinKey用于推送公众号消息或发起支付。

#### 微信支付-APP支付

	pay(type=wx, tradeNo, forJS=0) -> {partnerid, timestamp, noncestr, prepayid, sign}

返回结果用于前端https://www.npmjs.com/package/cordova-plugin-wechat组件发起支付请求：

	// res为返回数据
	Wechat.sendPaymentRequest(res, onAppOK, onAppFail);

### 支付宝

	pay(type=ali, tradeNo) -> {url}

返回的url字段可用于前端https://www.npmjs.com/package/cordova-plugin-alipay-v2组件付款:

	// res为返回数据
	var payInfo = res.url;
	cordova.plugins.alipay.payment(payInfo, onOk, onFail);

### 模拟支付

	payMock(type?=wx, tradeNo)

可用于测试支付。应在模拟模式下使用。

- PERM_MOCK_MODE
- 仅当订单可支付时(如CR,CO等状态)，将其状态改为已支付(PA)
- 推送消息

## 后端模块接口 - 配置项与函数

### Pay::$tradeNoWithTm ?= true

指定在生成支付交易号outTradeNo时是否添加当前时间。

默认生成outTradeNo如：ORDR-11-JDC-110301
当 Pay::$tradeNoWithTm=false时： ORDR-11-JDC

在微信支付时，如果已经发起过支付且取消，之后修改金额（或修改描述信息）后再支付，如果outTradeNo不变，会导致“订单号重复”报错，需要等待5分钟后才可再次支付。
因而如果有修改订单金额再次支付的需求(订单可修改，比如添加优惠券)，可在outTradeNo中加入时间以保证对同一个订单发起多次支付时交易号不相同。
注意这样可能会导致同一订单多次支付，应在支付时严格检查订单状态(比如增加“已发起支付等待确认”的状态)。

### Pay::$tradeApp ?= "JDC"

外部交易号(outTradeNo)格式：

	{tradeKey}-{id}-{tradeApp?}-{tm?}

例如：

	ORDR-11-JDC
	ORDR-11-JDC-100946

由于一个公众号可能被用于多个应用程序中，为了区分每个应用程序中的订单，可设置 Pay::$tradeApp.

## 后端实现规范

模块对外接口或配置项通过类Pay调用，如：

	Pay::payOrder(...);
	Pay::tradeApp = "...";

模块内部实现通过类PayImpBase实现，模块外部不应直接调用。在模块内部通过 PayImpBase::getInstance() 创建实例来调用动态功能，如

	$pay = PayImpBase::getInstance();
	$pay->onPayOrder(...);

模块实现的扩展通过类PayImp实现，使用者可自定义PayImpBase中的非静态函数。

## 后端实现用法

公共方法和配置参见Pay类相关函数。

	require_once("pay.php"); // 提供接口实现和工具类

需要根据PayImpBase类自行实现PayImp类，放在可自动加载的类目录下(如server/php/class/)，PayImp实现示例：

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
		// 返回金额amount和支付描述信息dscr
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

		// 支付实现: 成功返回描述字符串（将记录到trace.log日志中），失败直接抛出异常。
		// 注意：此函数常被第三方回调，应支持重复调用，直接忽略并当做成功处理
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

		function notifyNewOrder($id)
		{
		}
	}

