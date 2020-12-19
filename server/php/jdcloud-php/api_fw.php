<?php

#error_reporting(E_ALL & (~(E_NOTICE|E_USER_NOTICE)));
error_reporting(E_ALL & ~E_NOTICE);

/** @module api_fw

服务接口实现框架。

服务接口包含：

- 函数型接口，如 "login", "getToken"等, 一般实现在 api_functions.php中。
- 对象型接口，如 "Ordr.query", "User.get" 等，一般实现在 api_objects.php中。

关于参数传递，除add/set等接口有特殊要求外（添加或修改的字段必须用POST传递），
一般用GET或POST传递参数均可。使用POST传参时，Content-Type支持 application/x-www-form-urlencoded , application/form-data , application/json。

示例：接口定义`fn(a, b) -> {id}`，可以这样调用：

	GET /api.php/fn?a=1&b=2

返回示例：`[0, {"id":1}]`

或用POST传参：

	POST /api.php/fn
	Content-Type: application/x-www-form-urlencoded

	a=1&b=2

或

	POST /api.php/fn
	Content-Type: application/json

	{"a":1,"b":2}

甚至混用GET/POST传参：

	POST /api.php/fn?a=1
	Content-Type: application/x-www-form-urlencoded

	b=2

如果使用筋斗云前端JS，可以调用：

	callSvr("fn", {a:1, b:2}); // 用GET传参

	callSvr("fn", $.noop, {a:1, b:2}); // 用POST传参. $.noop是jQuery定义的空函数，这里只用于占位，表示空的回调函数。

	callSvr("fn", $.noop, JSON.stringify({a:1, b:2}), {
		contentType: "application/json"
	}); // 用POST传参, json格式

	callSvr("fn", {a:1}, $.noop, {b:2}); // 用GET,POST混合传参

GET或POST传参时，编码默认使用UTF-8。
POST传参时支持其它编码，应在Content-Type中显示指定，如下面指定编码为`charset=gbk`：

	POST /api.php/fn
	Content-Type: application/x-www-form-urlencoded; charset=gbk

	a=参数1&b=参数2
	
## 函数型接口

假设在文档有定义以下接口

	用户修改密码
	chpwd(oldpwd, pwd) -> {_token, _expire}

	权限：AUTH_USER

则在 api_functions.php 中创建该接口的实现：

	function api_chpwd()
	{
		checkAuth(AUTH_USER);
		$oldPwd = mparam("oldpwd");
		$pwd = mparam("pwd");
		...
		$ret = [
			"_token" => $token,
			"_expire" => $expire,
		];
		return $ret;
	}

说明：

- 函数名称一定要符合 "api_{接口名}" 的规范。接口名以小写字母开头。
- 使用checkAuth进行权限检查
- 返回符合接口定义的对象。最终后端框架将其转为JSON串，再由前端框架解析后传递给应用程序。

@see checkAuth
@see mparam 取必选参数，如果缺少该参数则报错。
@see param 取可选参数，可指定缺省值。

## 对象型接口

@see AccessControl 对象型接口框架。

### 标准对象接口

5个标准对象操作为：add, set, query, get, del。
这些操作提供对象的基本增删改查(CRUD)以及列表查询、统计分析、导出等服务，称为通用对象接口。
详细可参考BQP协议文档中的 **[通用对象操作接口](BQP.html#通用对象操作接口)** 部分。

以下代码即为Ordr对象创建所有这些接口:

	class AC_Ordr extends AccessControl
	{
	}

**[添加操作]**

	Obj.add()(POST fields...) -> id
	Obj.add(res)(POST fields...) -> {fields...} (返回的字段由res参数指定)

对象的属性通过POST请求内容给出，为一个个键值对。
添加完成后，默认返回新对象的id, 如果想多返回其它字段，可设置res参数，如 

	Ordr.add()(status="CR", total=100) -> 809
	Ordr.add(res="id,status,total")(status="CR", total=100) -> {id: 810, status:"CR", total: 100}

**[更新操作]**

	Obj.set(id)(POST fields...)

与add操作类似，对象属性的修改通过POST请求传递，而在URL参数中需要有id标识哪个对象。

示例：

	Obj.set(809)(status="PA", empId=10)

如果要将某字段置空, 可以用空串或"null" (小写)。例如：

	Obj.set(809)(picId="", empId=null)
	（实际传递参数的形式为 "picId=&empId=null"）

这两种方式都是将字段置NULL。
如果要将字符串置空串(一般不建议使用)，可以用"empty", 例如：

	Obj.set(809)(sn=empty)

假如sn是数值类型，会导致其值为0或0.0。

**[获取对象操作]**

接口原型：

	Obj.get(id, res?) -> {fields...}
	
默认返回所有暴露的属性，通过res参数可以指定需要返回的字段。

**[删除操作]**

	Obj.del(id)

根据id删除一个对象。

**[查询操作]**

	查询列表(默认压缩表格式)：
	Obj.query(res?, cond?, distinct?=0) -> tbl(fields...) = {nextkey?, total?, @h, @d}

	查询列表 - 对象列表格式：
	Obj.query(fmt=list, ...) -> {nextkey?, total?, @list=[obj1, obj2...]}

- res: String. 指定返回字段, 多个字段以逗号分隔，例如, res="field1,field2"。
 在res中允许使用部分统计函数"sum"与"count", 这时必须指定字段别名, 如"count(id) cnt", "sum(qty*price) total", "count(distinct addr) addrCnt".

- cond: String. 指定查询条件，语法可参照SQL语句的"WHERE"子句。例如：cond="field1>100 AND field2='hello'", 注意使用UTF8+URL编码, 字符串值应加上单引号.
 (v5.1) 支持在GET/POST中同时传cond参数，且允许cond参数为数组。比如URL中：`cond[]=a=1&cond[]=b=2`，在POST中：`cond=c=3`，则后端识别为 cond="a=1 AND b=2 AND c=3". 参数gcond也是一样。

- orderby: String. 指定排序条件，语法可参照SQL语句的"ORDER BY"子句，例如：orderby="id desc"，也可以多个排序："tm desc,status" (按时间倒排，再按状态正排)

- distinct: Boolean. 如果为1, 生成"SELECT DISTINCT ..."查询.

返回字段:

- h/d: 两个数组。实际数据表的头信息(header)和数据行(data)，符合压缩表对象的格式。

压缩表格式示例:

	{
		h: ["id", "name"],
		d: [[100, "myname1"], [200, "myname2"]]
	}

如果使用参数fmt=list, 则返回格式示例如下: 
	
	{
		list: [{id: 100, name: "name1"}, {id: 101, name: "name2"}]
		nextkey: ...
	}

**[分页查询]**

	Obj.query(pagesz?=20, pagekey?) -> {nextkey?, total?, @h, @d}
	或
	Obj.query(rows?=20, page?) -> 同上

- pagesz/rows: Integer. 这两个参数含义相同，均表示页大小，默认为20条数据。
- pagekey: Integer. 一般首次查询时不填写（或填写0，表示需要返回总记录数即total字段），而下次查询时应根据上次调用时返回数据的"nextkey"字段来填写。
- page: Integer. 指定页数, 从1开始. 用于兼容传统指定页数式的分页查询, 效率较低. 这时返回的nextkey一定为page+1或为空(表示没有下页), 且必返回total字段.

返回字段:

- nextkey: Integer. 一个字符串, 供取下一页时填写参数"pagekey"。如果不存在该字段，则说明已经是最后一批数据。
- total: Integer. 返回总记录数，仅当"pagekey"指定为0时返回; 或是使用"page"参数时也会返回该属性。

**[分组统计]**

	Obj.query(gres, gcond?, ...) -> tbl(fields...)

- gres: String. 分组字段。如果设置了gres字段，则res参数中每项应该带统计函数，如"sum(cnt) sum, count(id) userCnt". 
 最终返回列为gres参数指定的列加上res参数指定的列; 如果res参数未指定，则只返回gres参数列。

- gcond: String. (jdcloud-php扩展) 分组过滤条件(对照SQL HAVING子句).

**[导出报表]**

	Obj.query(fmt=csv/txt/excel, ...) -> 文件内容

### 非标准对象接口

v3.4支持非标准对象接口。实现Ordr.cancel接口：

	class AC2_Ordr extends AccessControl
	{
		function api_cancel() {
		}
	}

非标准对象接口与与函数型接口写法类似，但AccessControl的众多回调函数对非标准对象接口无效。

### RESTful风格接口

对象型接口支持仿RESTful风格的调用。
标准CRUD操作：

	POST /Ordr
	等价于Ordr.add

	GET /Ordr
	等价于Ordr.query

	GET /Ordr/123
	等价于Ordr.get?id=123

	PATCH /Ordr/123
	等价于Ordr.set?id=123

	DELETE /Ordr/123
	等价于Ordr.del?id=123

非标准操作：(v5.1新增) 谓词使用GET或POST都可以

	POST /Ordr/123/cancel
	等价于Ordr.cancel?id=123

- URL中id位置可在action后面，也可没有，如 `/Ordr/cancel/123`, `/Ordr/cancel?id=123`均可。
- 也允许以此方式调用标准CRUD操作，如`GET /Ordr/get/123`即`Ordr.get?id=123` , `POST /Ordr/123/set`即`Ordr.set?id=123`等.

注意以下与RESTful惯例不一致：

- 对象（或称实体，Entity）首字母应大写。
- 返回数据与对象型调用完全一样，HTTP总返回200成功，不会通过HTTP状态码表示调用返回值。

## 接口复用

@key apiMain() 服务入口函数
@key noExecApi 全局变量，禁止apiMain执行服务

一般在接口服务文件api.php中定义公共变量和函数，包含所有接口，在其最后调用服务入口函数apiMain()。

如果某应用想包含api.php，以便使用其中的接口实现，可以用callSvc:

	// set_include_path(get_include_path() . PATH_SEPARATOR . "..");
	$GLOBALS["noExecApi"] = true; // 在包含api.php前设置该变量，可禁止apiMain函数自动解析请求（CLI方式调用时默认就不解析请求，故也可以不设置该变量）。
	require_once("api.php");
	...
	$GLOBALS["errorFn"] = function($code, $msg, $msg2=null) {...}
	$ret = callSvc("genVoucher");
	// 如果没有异常，返回数据；否则调用指定的errorFn函数(未指定则调用errQuit)

@see callSvc

## 常用操作

错误处理

@see MyException

中断执行，直接返回

@see DirectReturn

调试日志

可使用addLog输出调试信息而不破坏协议输出格式。

@see addLog 
@see logit

## 插件机制

插件是包含数据库/接口/前端逻辑页设计、后端实现、前端逻辑页实现的模块。

其设计由插件目录/DESIGN.md定义，可由upgrade工具自动部署。

@key plugin/index.php 插件配置

plugin/{pluginName}为插件目录。

plugin/index.php是插件配置文件，在后端应用框架函数apiMain中引入，内容示例如下：

	<?php

	Plugins::add("plugin1");
	Plugins::add("plugin2", "plugin2/index.php"); // 指定插件主文件，如不指定，默认为"plugin2/plugin.php"

表示当前应用使用两个插件"plugin1"和"plugin2", 分别对应目录 plugin/plugin1和plugin/plugin2.

@see Plugins::add

@key plugin 插件定义

插件实现包括交互接口，以及插件API（后端调用接口），以优惠券插件"coupon"为例: (plugin/coupon/plugin.php)

	<?php

	// 可选：定义模块API，均使用静态变量或函数
	class Coupon
	{
		// use MapCol; // 如果要用mapCol/mapSql函数，则打开该trait.

		static $conf1; // 模块配置
		static function func1($arg1) // 模块公共接口
		{
			// 调用实现部分
			$imp = CouponImpBase::getInstance();
			$imp->genCoupons($src);
		}
	}

	// 模块实现依赖的接口。如果必须由外部实现，则使用abstract类及函数
	abstract class CouponImpBase
	{
		use JDSingletonImp;

		abstract function genCoupons($src);
	}

	// 实现函数型交互接口takeCoupon
	function api_takeCoupon() {}

	// 实现对象型交互接口 Coupon.query/get/set/del/add
	class AC1_Coupon extends AccessControl {}

	// 可选：返回前端配置
	return [
		"js" => "m2/plugin.js", // 如果前端需要包含文件
	];

注意：

调用插件API函数：

		Coupon::func1($arg1);

交互接口应在插件设计文档(plugin/coupon/DESIGN.md)中定义原型。

插件依赖的接口应定义CouponImp类来实现，一般放在文件 php/class/CouponImp.php中自动加载。
*/

require_once("app_fw.php");
require_once("AccessControl.php");

// ====== config {{{
global $X_RET; // maybe set by the caller
global $X_RET_STR;
/**
@var $X_RET_FN

默认接口调用后输出筋斗云的`[0, data]`格式。
若想修改返回格式，可设置该回调函数。

- 如果返回对象，则输出json格式。
- 如果返回false，应自行用echo输出。注意API日志中仍记录筋斗云返回数据格式。

示例：返回 `{code, data}`格式：

	global $X_RET_FN;
	$X_RET_FN = function ($X_RET) {
		$ret = [
			"code" => $X_RET[0],
			"data" => $X_RET[1]
		];
		if ($GLOBALS["TEST_MODE"])
			$ret["jdData"] = $X_RET;
		return $ret;
	};

示例：返回xml格式：

	global $X_RET_FN;
	$X_RET_FN = function ($X_RET) {
		header("Content-Type: application/xml");
		echo "<xml><code>$X_RET[0]</code><data>$_RET[1]</data></xml>";
		return false;
	};
	
*/
global $X_RET_FN;

/**
@var $X_APP

可以在应用结束前添加逻辑，如：

	$GLOBALS["X_APP"]->onAfterActions[] = function () {
		httpCall("http://oliveche.com/echo.php");
	};

注意：

- 如果接口返回错误, 该回调不执行. (DirectReturn返回除外)
- 此时接口输出已完成，不可再输出内容，否则将导致返回内容错乱。addLog此时也无法输出日志(可以使用logit记日志到文件)
- 此时接口的数据库事务已提交，如果再操作数据库，与之前操作不在同一事务中。

示例: 当创建工单时, **异步**向用户发送通知消息, 且在异步操作中需要查询新创建的工单, 不应立即发送或使用AccessControl的onAfterActions;
因为在异步任务查询新工单时, 可能接口还未执行完, 数据库事务尚未提交, 所以只有放在X_APP的onAfterActions中才可靠.
*/
global $X_APP;

const PAGE_SZ_LIMIT = 10000;
// }}}

// ====== ApiFw_: module internals {{{

class ApiFw_
{
	static $SOLO = true;
	static $perms = null;
}
//}}}

// ====== functions {{{
/**
@fn setRet($code, $data?, $internalMsg?)

@param $code Integer. 返回码, 0表示成功, 否则表示操作失败。
@param $data 返回数据。
@param $internalMsg 当返回错误时，作为额外调试信息返回。

设置返回数据，最终返回JSON格式数据为 [ code, data, internalMsg, debugInfo1, ...]
其中按照BQP协议，前两项为必须，后面的内容一般仅用于调试，前端应用不应处理。

当成功时，返回数据可以是任何类型（根据API设计返回相应数据）。
当失败时，为String类型错误信息。
如果参数$data未指定，则操作成功时值为null（按BQP协议返回null表示客户端应忽略处理，一般无特定返回应指定$data="OK"）；操作失败时使用默认错误信息。

调用完后，要返回的数据存储在全局数组 $X_RET 中，以JSON字符串形式存储在全局字符串 $X_RET_STR 中。
注意：也可以直接设置$X_RET_STR为要返回的字符串，从而避免setRet函数对返回对象进行JSON序列化，如

	$GLOBALS["X_RET_STR"] = '{"id":100, "name":"aaa"}';
	// 如果不想继续执行后面代码，可以自行调用：
	setRet(0, "OK");
	throw new DirectReturn();
	// 最终返回字符串为 [0, {"id":100, "name":"aaa"}]

@see $X_RET
@see $X_RET_STR
@see $X_RET_FN
@see $errorFn
@see errQuit()
*/
function setRet($code, $data = null, $internalMsg = null)
{
	global $TEST_MODE;
	global $JSON_FLAG;
	global $ERRINFO;
	global $X_RET;

	if (!isset($data) && $code) {
		assert(array_key_exists($code, $ERRINFO));
		$data = $ERRINFO[$code];
	}
	$X_RET = [$code, $data];

	if (isset($internalMsg))
		$X_RET[] = $internalMsg;

	$debugLog = getenv("P_DEBUG_LOG") ?: 0;
	if ($debugLog == 1 || ($debugLog == 2 && $X_RET[0] != 0)) {
		$ac = $GLOBALS["X_APP"]? $GLOBALS["X_APP"]->getAc(): 'unknown';
		$s = 'ac=' . $ac . ', apiLogId=' . ApiLog::$lastId . ', ret=' . jsonEncode($X_RET) . ", dbgInfo=" . jsonEncode($GLOBALS["g_dbgInfo"], true);
		logit($s, true, 'debug');
	}
	if ($TEST_MODE) {
		global $g_dbgInfo;
		if (count($g_dbgInfo) > 0)
			$X_RET[] = $g_dbgInfo;
	}

	if (ApiFw_::$SOLO) {
		global $X_RET_STR;
		global $X_RET_FN;
		if (! isset($X_RET_STR)) {
			if (is_callable(@$X_RET_FN)) {
				$ret1 = $X_RET_FN($X_RET);
				if ($ret1 === false)
					return;
				if (is_string($ret1)) {
					$X_RET_STR = $ret1;
					echo $X_RET_STR . "\n";
					return;
				}
				$X_RET = $ret1;
			}
			$X_RET_STR = json_encode($X_RET, $JSON_FLAG);
		}
		else {
			$X_RET_STR = "[" . $code . ", " . $X_RET_STR . "]";
		}
		echoRet();
	}
	else {
		$errfn = $GLOBALS["errorFn"] ?: "errQuit";
		if ($code != 0) {
			$errfn($X_RET[0], $X_RET[1], $X_RET[2]);
		}
	}
}

/**
@var _jsonp 用于支持jsonp返回格式的URL参数

示例：

	http://localhost/p/jdcloud/api.php/Ordr/10?_jsonp=api_OrdrGet
	返回

	api_OrdrGet([
		0, {"id":10,...}
	]);

	http://localhost/p/jdcloud/api.php/Ordr/10?_jsonp=api_order%3d
	返回

	api_order=[
		0, {"id":10,...}
	];

JS示例：

	<script>
	function api_OrdrGet(order)
	{
		console.log(order);
	}
	</script>
	<script src="http://localhost/p/jdcloud/api.php/Ordr/10?_jsonp=api_OrdrGet"></script>

JS示例：

	<script src="http://localhost/p/jdcloud/api.php/Ordr/10?_jsonp=api_order%3d"></script>
	<script>
	console.log(api_order);
	</script>
*/
function echoRet()
{
	global $X_RET_STR;
	$jsonp = $_GET["_jsonp"];
	if ($jsonp) {
		if (substr($jsonp,-1) === '=') {
			echo $jsonp . $X_RET_STR . ";\n";
		}
		else {
			echo $jsonp . "(" . $X_RET_STR . ");\n";
		}
	}
	else {
		echo $X_RET_STR . "\n";
	}
}

/**
@fn setServerRev()

根据全局变量"SERVER_REV"或应用根目录下的文件"revision.txt"， 来设置HTTP响应头"X-Daca-Server-Rev"表示服务端版本信息（最多6位）。

客户端框架可本地缓存该版本信息，一旦发现不一致，可刷新应用。
服务器可使用$GLOBALS["SERVER_REV"]来取服务端版本号（6位）。
 */
function setServerRev()
{
	$ver = $GLOBALS["SERVER_REV"] ?: @file_get_contents("{$GLOBALS['BASE_DIR']}/revision.txt");
	if (! $ver)
		return;
	$ver = substr($ver, 0, 6);
	$GLOBALS["SERVER_REV"] = $ver;
	header("X-Daca-Server-Rev: {$ver}");
}

/**
@fn hasPerm($perms, $exPerms=null)

检查权限。perms可以是单个权限或多个权限，例：

	hasPerm(AUTH_USER); // 用户登录后可用
	hasPerm(AUTH_USER | AUTH_EMP); // 用户或员工登录后可用

@fn onGetPerms()

开发者需要定义该函数，用于返回所有检测到的权限。hasPerm函数依赖该函数。

(v5.4) exPerms用于扩展验证, 是一个权限名数组, 示例:

	hasPerm(AUTH_LOGIN, ["simple"]);

它表示AUTH_LOGIN检查失败后, 将再调用`hasPerm_simple()`进行检查. 支持以下权限名:

**[simple]**

@see hasPerm_simple

通过HTTP头`X-Daca-Simple`传递密码, 与环境变量`simplePwd`进行比较. 
示例: upload接口允许simple验证.

	function api_upload() {
		checkAuth(AUTH_LOGIN, ["simple"]);
		...
	}

然后在conf.user.php中配置:

	putenv("simplePwd=helloworldsimple");

用curl访问该接口示例:

	curl -s -F "file=@1.jpg" "http://localhost/jdcloud/api/upload?autoResize=0" -H "X-Daca-Simple: helloworldsimple"

**[basic]**

@see hasPerm_basic

通过HTTP标准的Basic认证方式。

@see checkAuth
 */
function hasPerm($perms, $exPerms=null)
{
	if (is_null(ApiFw_::$perms))
		ApiFw_::$perms = onGetPerms();

	if ( (ApiFw_::$perms & $perms) != 0 )
		return true;

	if (is_array($exPerms)) {
		foreach ($exPerms as $name) {
			$fn = "hasPerm_" . $name; // e.g. hasPerm_simple
			if (function_exists($fn) && $fn())
				return true;
		}
	}
	else if ($exPerms) {
		throw new MyException(E_SERVER, "bad perm: hasPerm require array for exPerms");
	}
	return false;
}

/**
@fn hasPerm_simple()

筋斗云简单认证，即添加HTTP头：

	X-Daca-Simple: $authStr

后端认证示例：

	checkAuth(null, ["simple"]);
	或
	if (hasPerm(null, ["simple"]) ...

其中authStr由配置项simplePwd确定，比如可以在conf.user.php中配置：

	putenv("simplePwd=1234");

请求示例：

	curl http://localhost/jdcloud/api.php/xxx -H "X-Daca-Simple: 1234"
*/
function hasPerm_simple()
{
	@$pwd = $_SERVER["HTTP_X_DACA_SIMPLE"];
	@$pwd1 = getenv("simplePwd");
	return $pwd && $pwd1 && $pwd === $pwd1;
}

/**
@fn hasPerm_basic()

HTTP Basic认证，即添加HTTP头：

	Authorization: Basic $authStr
	
按HTTP协议，authStr格式为base64($user:$password)
可验证的用户名、密码在Conf类中配置，后端配置示例：

	// class Conf (在conf.php中)
	static $basicAuth = [
		["user" => "user1", "pwd" => "1234"],
		["user" => "user2", "pwd" => "1234"]
	];

请求示例：

	curl --basic -u user1:1234 http://localhost/jdcloud/api.php/xxx

注意：若php是基于apache fcgi方式的部署，可能无法收到认证串，可在apache中配置：

	SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1

*/
function hasPerm_basic()
{
	list($user, $pwd) = [@$_SERVER['PHP_AUTH_USER'], @$_SERVER['PHP_AUTH_PW']];
	if (! isset($user))
		return false;
	foreach (Conf::$basicAuth as $e) {
		if ($e["user"] == $user && $e["pwd"] == $pwd)
			return true;
	}
	return false;
}

/** 
@fn checkAuth($perms)

用法与hasPerm类似，检查权限，如果不正确，则抛出错误，返回错误对象。

	checkPerm(AUTH_USER); // 必须用户登录后可用
	checkPerm(AUTH_ADMIN | PERM_TEST_MODE); 要求必须管理员登录或测试模式才可用。

@see hasPerm
 */
function checkAuth($perms, $exPerms=null)
{
	$ok = hasPerm($perms, $exPerms);
	if (!$ok) {
		$auth = [];
		// TODO: AUTH_LOGIN
		if (hasPerm(AUTH_LOGIN))
			$errCode = E_FORBIDDEN;
		else
			$errCode = E_NOAUTH;

		foreach ($GLOBALS["PERMS"] as $p=>$name) {
			if (($perms & $p) != 0) {
				$auth[] = $name;
			}
		}
		if (is_array($exPerms)) {
			foreach ($exPerms as $name) {
				$auth[] = $name;
			}
		}
		throw new MyException($errCode, "require auth to " . join("/", $auth));
	}
}

/** 
@fn getClientVersion()

通过参数`_ver`或useragent字段获取客户端版本号。

@return: {type, ver, str}

- type: "web"-网页客户端; "wx"-微信客户端; "a"-安卓客户端; "ios"-苹果客户端

e.g. {type: "a", ver: 2, str: "a/2"}

 */
function getClientVersion()
{
	global $CLIENT_VER;
	if (! isset($CLIENT_VER))
	{
		$ver = param("_ver");
		if ($ver != null) {
			$a = explode('/', $ver);
			$CLIENT_VER = [
				"type" => $a[0],
				"ver" => $a[1],
				"str" => $ver
			];
		}
		// Mozilla/5.0 (Linux; U; Android 4.1.1; zh-cn; MI 2S Build/JRO03L) AppleWebKit/533.1 (KHTML, like Gecko)Version/4.0 MQQBrowser/5.4 TBS/025440 Mobile Safari/533.1 MicroMessenger/6.2.5.50_r0e62591.621 NetType/WIFI Language/zh_CN
		else if (preg_match('/MicroMessenger\/([0-9.]+)/', $_SERVER["HTTP_USER_AGENT"], $ms)) {
			$ver = $ms[1];
			$CLIENT_VER = [
				"type" => "wx",
				"ver" => $ver,
				"str" => "wx/{$ver}"
			];
		}
		else {
			$CLIENT_VER = [
				"type" => "web",
				"ver" => 0,
				"str" => "web"
			];
		}
	}
	return $CLIENT_VER;
}

/**
@fn tmCols($fieldName = "t0.tm")

为查询添加时间维度单位: y,q,m,w,d,wd,h (年，季度，月，周，日，周几，时)。

- wd: 1-7表示周一到周日
- w: 一年中第一周，从该年第一个周一开始(mysql week函数模式7).

示例：

		$this->vcolDefs[] = [ "res" => tmCols() ];
		$this->vcolDefs[] = [ "res" => tmCols("t0.createTm") ];
		$this->vcolDefs[] = [ "res" => tmCols("log_cr.tm"), "require" => "createTm" ];

 */
function tmCols($fieldName = "t0.tm")
{
	return ["year({$fieldName}) y", "quarter({$fieldName}) q", "month({$fieldName}) m", "week({$fieldName},7) w", "day({$fieldName}) d", "weekday({$fieldName})+1 wd", "hour({$fieldName}) h"];
}
// }}}

// ====== classes {{{
/**
@class ConfBase

在conf.php中定义Conf类并继承ConfBase, 实现代码配置：

	class Conf extends ConfBase
	{
	}

@key Conf 项目易变逻辑
@key conf.php 项目易变逻辑

$BASE_DIR/conf.php中包含Conf类，用于定义易变的临时逻辑，例如数据库维护时报错提示，临时控制某个版本不能使用，遇到节假日休息提醒等等。

不变的全局配置应在app.php中定义。
 */
class ConfBase
{
/**
@var ConfBase::$enableAutoSession?=true

默认为请求创建session，请求结束时，如果session是空则会删除掉.
将enableAutoSession设置为false，则在需要读写session之前需要手工调用

	session_start();

这样便于手工控制session的启停(与php默认处理一致)。

如果php选项session.auto_start=1，则此选项无效。
 */
	static $enableAutoSession = true;

/**
@var ConfBase::$enableApiLog?=true

设置为false可关闭ApiLog. 例：

	static $enableApiLog = false;
 */
	static $enableApiLog = true;

/**
@var ConfBase::$enableObjLog?=true

设置为false可关闭ObjLog. 例：

	static $enableObjLog = false;
 */
	static $enableObjLog = true;

/**
@fn ConfBase::onApiInit()

所有API执行时都会先走这里。

例：对所有API调用检查ios版本：

	static function onApiInit(&$ac)
	{
		$ver = getClientVersion();
		if ($ver["type"] == "ios" && $ver["ver"]<=15) {
			throw new MyException(E_FORBIDDEN, "unsupport ios client version", "您使用的版本太低，请升级后使用!");
		}
	}

例：ac换名字：

	static function onApiInit(&$ac)
	{
		if ($ac == "DFIS-BK_S001") {
			$ac = "DMS.workGroup";
		}
	}

	class AC_DMS extends AccessControl
	{
		function onInit() {
			Partner::checkAuth();
		}
		// DFIS-BK_S001
		function api_workGroup() {
		}
	}

例：第三方要求回调 {BASE_URL}/notify/orderStatus 这样的URL，但框架默认不支持，可以在onApiInit中转换：

	static function onApiInit(&$ac)
	{
		if ($ac == "notify/orderStatus") {
			$ac = "Notify.orderStatus";
		}
	}

	class AC_Notify extends AccessControl
	{ ... }

注意：框架默认支持`Notify/orderStatus`这样的URL（对象名Notify必须首字母大写），它可自动转成Notify.orderStatus。
 */
	static function onApiInit(&$ac)
	{
	}

/**
@fn ConfBase::onInitClient(&$ret)

客户端初始化应用时会调用initClient接口，返回plugins等信息。若要加上其它信息，可在这里扩展。

例：假如定义应用初始化接口为(plugins是框架默认返回的)：

	initClient(app) -> {plugins, appName}

实现：

	static function onInitClient(&$ret)
	{
		$app = mparam('app');
		$ret['appName'] = 'my-app';
	}

(v5.4) 此外，在全局配置`P_initClient`数据中的量将自动设置到ret中，它用于后端控制前端配置，如：

	// 配置在conf.user.php中：
	$val = preg_match('/iphone|ipad|macintosh/i', $_SERVER["HTTP_USER_AGENT"]);
	// $val = preg_match('/\b17\./i', getReqIp()); // apple审核用的地址, 17开头的美国地址
	$GLOBALS["P_initClient"] = [
		"enableWeixinLogin" => true, // 自动微信登录
		"enableAppReviewMode" => $val // APP审核定制; 根据条件判断来设置
	];
	
前端框架在入口处会调用MUI.initClient(), 之后配置将放在 g_data.initClient 下面, 前端判断示例:

	if (g_data.initClient.enableAppReviewMode) {
		// ...
	}
	
 */
	static function onInitClient(&$ret)
	{
	}

/**
@fn ConfBase::checkSecure($ac)

@var ConfBase::enableSecure ?=false

安全检查。一般用于检测可疑调用并记录日志，以及管理黑白IP名单。默认值为false。

checkSecure函数返回false则不处理该调用，并将请求加入黑名单，且返回`[5, "OK"]`. 
黑名单可查看文件blackip.txt。
(5为E_FORBIDDEN，返回"OK"是为了不让攻击者获得准确的出错信息)。

示例：如果不是前端H5中的ajax调用，且没有cookie信息，则记录该事件到 secure.log 中，人工分析后可添加黑名单。

	static function checkSecure($ac)
	{
		if (! (isset($_SERVER["HTTP_REFERER"]) && isset($_SERVER["HTTP_X_REQUESTED_WITH"]) && isset($_SERVER["HTTP_COOKIE"])) ) {
			$log = @sprintf("secure check: ac=$ac, ses=%s, ApiLog.id=%s", session_id(), ApiLog::$lastId);
			logit($log, true, "secure");
			// BlackList::add(getRealIp(), "no referer");
			// return false; // false表示本次调用直接返回。
		}
	}

@see BlackList
*/

	static $enableSecure = false;
	static function checkSecure($ac)
	{
	}

/**
@var ConfBase::basicAuth=[]

可在conf.php中定义HTTP基本验证信息，一般用于合作伙伴接口认证，示例：

	static $basicAuth = [
		["user" => "user1", "pwd" => "1234"],
		["user" => "user2", "pwd" => "1234"]
	];

*/
	static $basicAuth = [
//		["user" => "user1", "pwd" => "1234"],
//		["user" => "user2", "pwd" => "1234"]
	];
}

class ApiLog
{
	private $startTm;
	private $ac;
	private $id;

	// for batch detail (ApiLog1)
	private $ac1, $req1, $startTm1;
	public $batchAc; // new ac for batch

/**
@var ApiLog::$lastId

取当前调用的ApiLog编号。
*/
	static $lastId;
/**
@var ApiLog::$instance

e.g. 修改ApiLog的ac:

	ApiLog::$instance->batchAc = "async:$f";

*/
	static $instance;

	function __construct($ac) 
	{
		$this->ac = $ac;
	}

	private function myVarExport($var, $maxLength=200)
	{
		if (is_string($var)) {
			$var = preg_replace('/\s+/', " ", $var);
			if (strlen($var) > $maxLength)
				$var = mb_substr($var, 0, $maxLength) . "...";
			return $var;
		}
		if (is_scalar($var)) {
			return $var;
		}
		
		$s = "";
		$maxKeyLen = 30;
		foreach ($var as $k=>$v) {
			$klen = strlen($k);
			// 注意：有时raw http内容被误当作url-encoded编码，会导致所有内容成为key. 例如API upload.
			if ($klen > $maxKeyLen)
				return mb_substr($k, 0, $maxKeyLen) . "...";
			$len = strlen($s);
			if ($len >= $maxLength) {
				$s .= "$k=...";
				break;
			}
/*			if ($k == "pwd" || $k == "oldpwd") {
				$v = "?";
			}
*/			else if (! is_scalar($v)) {
				$v = "obj:" . json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
			}
			if ($len == 0) {
				$s = "$k=$v";
			}
			else {
				$s .= ", $k=$v";
			}
		}
		return $s;
	}

	function logBefore()
	{
		$this->startTm = $_SERVER["REQUEST_TIME_FLOAT"] ?: microtime(true);

		global $APP;
		$type = getAppType();
		$userId = null;
		if ($type == "user") {
			$userId = $_SESSION["uid"];
		}
		else if ($type == "emp" || $type == "store") {
			$userId = $_SESSION["empId"];
		}
		else if ($type == "admin") {
			$userId = $_SESSION["adminId"];
		}
		if (! (is_int($userId) || ctype_digit($userId)))
			$userId = null;
		$content = $this->myVarExport($_GET, 2000);
		$ct = getContentType();
		if (! preg_match('/x-www-form-urlencoded|form-data/i', $ct)) {
			$post = getHttpInput();
			$content2 = $this->myVarExport($post, 2000);
		}
		else {
			$content2 = $this->myVarExport($_POST, 2000);
		}
		if ($content2 != "")
			$content .= ";\n" . $content2;
		$remoteAddr = getReqIp();
		if (strlen($remoteAddr>50)) { // 太长则保留头和尾
			$remoteAddr = preg_replace('/,.+,/', ',,', $remoteAddr);
		}
		
		$reqsz = strlen($_SERVER["REQUEST_URI"]) + (@$_SERVER["HTTP_CONTENT_LENGTH"]?:$_SERVER["CONTENT_LENGTH"]?:0);
		$ua = $_SERVER["HTTP_USER_AGENT"];
		$ver = getClientVersion();

		global $DBH;
		++ $DBH->skipLogCnt;
		$this->id = dbInsert("ApiLog", [
			"tm" => date(FMT_DT),
			"addr" => $remoteAddr,
			"ua" => $ua,
			"app" => $APP,
			"ses" => session_id(),
			"userId" => $userId,
			"ac" => $this->ac,
			"req" => dbExpr(Q($content)),
			"reqsz" => $reqsz,
			"ver" => $ver["str"],
			"serverRev" => $GLOBALS["SERVER_REV"]
		]);
		self::$lastId = $this->id;
		self::$instance = $this;
// 		$logStr = "=== [" . date("Y-m-d H:i:s") . "] id={$this->logId} from=$remoteAddr ses=" . session_id() . " app=$APP user=$userId ac=$ac >>>$content<<<\n";
	}

	function logAfter()
	{
		global $DBH;
		global $X_RET_STR;
		global $X_RET;
		if ($DBH == null)
			return;
		$iv = sprintf("%.0f", (microtime(true) - $this->startTm) * 1000); // ms
		if ($X_RET_STR == null)
			$X_RET_STR = json_encode($X_RET, $GLOBALS["JSON_FLAG"]);
		$logLen = $X_RET[0] !== 0? 2000: 200;
		$content = $this->myVarExport($X_RET_STR, $logLen);

		$userId = null;
		if ($this->ac == 'login' && is_array($X_RET[1]) && @$X_RET[1]['id']) {
			$userId = $X_RET[1]['id'];
		}
		++ $DBH->skipLogCnt;
		$rv = dbUpdate("ApiLog", [
			"t" => $iv,
			"retval" => $X_RET[0],
			"ressz" => strlen($X_RET_STR),
			"res" => dbExpr(Q($content)),
			"userId" => $userId,
			"ac" => $this->batchAc // 默认为null；对batch调用则列出详情
		], $this->id);
// 		$logStr = "=== id={$this->logId} t={$iv} >>>$content<<<\n";
	}

	function logBefore1($ac1)
	{
		$this->ac1 = $ac1;
		$this->startTm1 = microtime(true);
		$this->req1 = $this->myVarExport($_GET, 2000);
		$content2 = $this->myVarExport($_POST, 2000);
		if ($content2 != "")
			$this->req1 .= ";\n" . $content2;
	}

	function logAfter1()
	{
		global $DBH;
		global $X_RET;
		if ($DBH == null)
			return;
		$iv = sprintf("%.0f", (microtime(true) - $this->startTm1) * 1000); // ms
		$res = json_encode($X_RET, $GLOBALS["JSON_FLAG"]);
		$logLen = $X_RET[0] !== 0? 2000: 200;
		$content = $this->myVarExport($res, $logLen);

		++ $DBH->skipLogCnt;
		$apiLog1Id = dbInsert("ApiLog1", [
			"apiLogId" => $this->id,
			"ac" => $this->ac1,
			"t" => $iv,
			"retval" => $X_RET[0],
			"req" => dbExpr(Q($this->req1)),
			"res" => dbExpr(Q($content))
		]);
		if (Conf::$enableObjLog && self::$objLogId) {
			dbUpdate("ObjLog", ["apiLog1Id" => $apiLog1Id], self::$objLogId);
			self::$objLogId = null;
		}
	}

/**
@fn ApiLog::addObjLog($obj, $objId, $dscr)

添加对象日志ObjLog。默认系统会记录标准add/set/del等日志到ObjLog，非标准方法若需要手工添加日志可调用此方法。
示例：在Ordr.cancel接口中记录日志

	class AC1_Ordr {
		function api_cancel() {
			...
			ApiLog::addObjLog("Ordr", 99, "取消订单");
		}
	}

*/
	static $objLogId;
	static function addObjLog($obj, $objId, $dscr) {
		if (!Conf::$enableObjLog)
			return;
		// TODO: 1. dscr includes obj, app and username like "管理员张某添加员工10"; 2. override dscr
		self::$objLogId = dbInsert("ObjLog", [
			"obj" => $obj,
			"objId" => $objId,
			"dscr" => $dscr,
			"apiLogId" => ApiLog::$lastId
		]);
	}
}

/*
(v5.3) 已废弃不使用。

	1. 只对同一session的API调用进行监控; 只对成功的调用监控
	2. 相邻两次调用时间<0.5s, 记一次不良记录(bad). 当bad数超过50次(CNT1)时报错，记一次历史不良记录；此后bad每超过2次(CNT2)，报错一次。
	之所以不是每次都报错，是考虑正常程序也可能一次发多个请求。
	3. 回归测试模式下不监控。
class ApiWatch
{
	private $CNT1 = 50;
	private $CNT2 = 2;

	private $ac;
	function __construct($ac) 
	{
		$this->ac = $ac;
	}
	function execute()
	{
		if ($GLOBALS["TEST_MODE"] == RTEST_MODE || $this->ac == "att" || isCLI());
			return;
		$lastAccess = @$_SESSION["lastAccess"];
		if ($lastAccess) {
			$now = microtime(true);
			$_SESSION["lastAccess"] = $now;
			// <0.5s
			if ($now - $lastAccess < 0.5) {
				@++ $_SESSION["bad"];
				// bad: 不良记录
				if ($_SESSION["bad"] >= $this->CNT2)
				{
					// bad2: 历史不良记录
					$n = @$_SESSION["bad2"] ?: 0;
					if ($n > 0 || $_SESSION["bad"] >= $this->CNT1)
					{
						logit("call API too fast: bad={$_SESSION['bad']}, bad2={$_SESSION['bad2']}", true, "secure");
						@++ $_SESSION["bad2"];
						$_SESSION["bad"] = 0;
						throw new MyException(E_FORBIDDEN, "call API too fast");
					}
				}
			}
			else {
				$_SESSION["bad"] = 0;
			}
		}
	}

	function postExecute()
	{
		$_SESSION["lastAccess"] = microtime(true);
	}
}
 */

trait MapCol
{
/**
@var MapCol.$colMap

%colMap = {tbl => [tblAlias, %cols]}
cols = {col => colAlias}

先在插件接口文档DESIGN.md中声明本插件的数据库依赖：

	@see @Store: id, name, dscr
	@see @Ordr: id

配置定表名或列名对应（如果名称相同不必声明）

	Coupon::$colMap = [
		"Store" => ["MyStore", [
			"dscr" => "description"
		]],
		"Ordr" => ["MyOrder"]
	];

在plugin实现时，使用mapCol/mapSql来使表名、列名可配置：

	class Coupon
	{
		use MapCol;
	}
	$tbl = Coupon::mapCol("Store"); // $tbl="MyStore"
	$tbl = Coupon::mapCol("User"); // $tbl="User" 未定义时，直接取原值
	$col = Coupon::mapCol("Store.dscr"); // $col="description"
	$col = Coupon::mapCol("Store.name"); // $col="name" 未定义时，直接取原值

	$sql = $plugin->mapSql("SELECT s.id, s.{Store.name}, s.{Store.dscr} FROM {Store} s INNER JOIN {Ordr} o ON o.id=s.{Store.storeId}");
	// $sql = "SELECT s.id, s.name, s.description FROM MyStore s INNER JOIN MyOrder o ON o.id=s.storeId"

@key MapCol.mapCol($tbl, $col=null)
@key MapCol.mapSql($sql)
 */
	static $colMap;

	static function mapCol($tbl, $col=null)
	{
		if (isset($col))
			$ret = @self::$colMap[$tbl][1][$col] ?: $col;
		else
			$ret = @self::$colMap[$tbl][0] ?: $tbl;
		return $ret;
	}

	static function mapSql($s)
	{
		$sql = preg_replace_callback('/\{(\w+)\.?(\w+)?\}/', function($ms) {
			return self::mapCol($ms[1], @$ms[2]);
		}, $s);
		return $sql;
	}
}

/**
@class Plugins

@see plugin/index.php 
 */
class Plugins
{
/**
@var Plugins::$map

{ pluginName => %pluginCfg={js} }
*/
	public static $map = [
	];

/**
@fn Plugins::add($pluginName, $file?)

添加模块或插件。
$file为插件主文件，可返回一个插件配置。如果未指定，则自动找"{pluginName}/{pluginName}.php") 或 "{pluginName}/plugin.php"文件。

以下旧的格式也兼容，现已不建议使用：

	Plugins::add($pluginNameArray)

@see Plugins.$map
*/
	public static function add($pname, $file=null) {
		if (is_array($pname)) {
			foreach ($pname as $e) {
				self::add($e);
			}
			return;
		}
		global $BASE_DIR;
		if (!isset($file)) {
			$file = "{$pname}/{$pname}.php";
			$f = $BASE_DIR . '/plugin/' . $file;
			if (! is_file($f)) {
				$file = "{$pname}/plugin.php";
			}
		}
		$f = $BASE_DIR . '/plugin/' . $file;
		if (! is_file($f))
			throw new MyException(E_SERVER, "cannot find plugin `$pname': $file");

		$p = require_once($f);
		if ($p === true) { // 重复包含
			throw new MyException(E_SERVER, "duplicated plugin `$pname': $file");
		}
		if ($p === 1)
			$p = [];
		self::$map[$pname] = $p;
	}

/**
@fn Plugins::exists($pluginName)
*/
	public static function exists($pname) {
		return array_key_exists($pname, self::$map);
	}
}
//}}}

/**
@fn tableCRUD($ac, $tbl, $asAdmin?=false)

(v5.4)本函数仅做兼容使用，请用`callSvcInt`或`AccessControl::callSvc`方法替代。

对象型接口的入口。
也可直接被调用，常与setParam一起使用, 提供一些定制的操作。

@param $asAdmin 默认根据用户身份自动选择"AC_"类; 如果为true, 则以超级管理员身份调用，即使用"AC0_"类。
设置$asAdmin=true好处是对于超级管理员权限来说，即使未定义"AC0_"类，默认也可以访问所有内容。

假如有Rating（订单评价）对象，不想通过对象型接口来查询，而是通过函数型接口来定制输出，接口设计为：

	queryRating(storeId, cond?) -> tbl(id, score, dscr, tm, orderDscr)

	查询店铺storeId的订单评价。

	应用逻辑：
	- 按时间tm倒排序

底层利用tableCRUD实现它，这样便于保留分页、参数cond/gres等特性:

	function api_queryRating()
	{
		$storeId = mparam("storeId");

		// 定死输出内容。
		setParam("res", "id, score, dscr, tm, orderDscr");

		// 相当于AccessControl框架中调用 addCond，用Obj.query接口的内部参数cond2以保证用户还可以使用cond参数。
		setParam("cond2", dbExpr("o.storeId=$storeId")); 

		// 定死排序条件
		setParam("orderby", "tm DESC");

		$ret = tableCRUD("query", "Rating", true);
		return $ret;
	}

注意：
一般应直接使用标准对象接口来实现需求，有时可能出于特别需要，不方便暴露标准接口，可以对标准接口进行了包装，定死一些参数。
v5.4后建议这样实现：

	function api_queryRating()
	{
		$storeId = mparam("storeId");

		// 或用callSvcInt
		$acObj = new AccessControl(); // 或 AC2_Rating，根据需要创建指定的类
		$ret = $acObj->callSvc("Rating", "query", [
			// 定死输出内容。
			"res" => "id, score, dscr, tm, orderDscr",
			"cond2" => dbExpr("storeId=$storeId"),
			"orderby" => "tm DESC"
		]);
		return $ret;
	}

@see setParam
@see callSvcInt
@see callSvc
 */

function tableCRUD($ac1, $tbl, $asAdmin = false)
{
	$acObj = AccessControl::create($tbl, $ac1, $asAdmin);
	return $acObj->callSvc($tbl, $ac1);
}

/**
@fn callSvcInt($ac, $param=null, $postParam=null)

内部调用另一接口，获得返回值。
如果指定了$param或$postParam参数，则会备份现有环境，并在调用后恢复。
否则直接使用现有环境。

如果想手工逐项设置GET, POST参数，可分别用

	setParam(key, value); // 设置get参数
	// 或批量设置用 setParam({key => value});
	$_POST[key] = value; // 设置post参数

与callSvc不同的是，它不处理事务、不写ApiLog，不输出数据，更轻量；
与tableCRUD不同的是，它支持函数型调用。

示例：

	$vendorId = callSvcInt("Vendor.add", null, [
		"name" => $params["vendorName"],
		"tel" => $params["vendorPhone"]
	]);

(v5.4) 上面例子会自动根据当前用户角色来选择AC类，还可以直接指定使用哪个AC类来调用，如：

	$acObj = new AC2_Vendor();
	$vendorId = $acObj->callSvc("Vendor", "query", [
		"name" => $params["vendorName"],
		"tel" => $params["vendorPhone"]
	]);

注意请自行确保AC类对当前角色兼容性，如用户角色调用了管理员的AC类，就可能出问题。

@see setParam
@see tableCRUD (obsolete)
@see callSvc
@see AccessControl::callSvc
*/
function callSvcInt($ac, $param=null, $postParam=null)
{
	if ($param != null || $postParam != null) {
		return tmpEnv($param, $postParam, function () use ($ac) {
			return callSvcInt($ac);
		});
	}

	$fn = "api_$ac";
	if (preg_match('/^([A-Z]\w*)\.([a-z]\w*)$/u', $ac, $ms)) {
		list($tmp, $tbl, $ac1) = $ms;
		// TODO: check meta
		$acObj = AccessControl::create($tbl, $ac1);
		$ret = $acObj->callSvc($tbl, $ac1);
	}
	elseif (function_exists($fn)) {
		$ret = $fn();
	}
	else {
		throw new MyException(E_PARAM, "Bad request - unknown ac: {$ac}", "接口不支持");
	}
//	if (!isset($ret))
//		$ret = "OK";
	return $ret;
}

/**
@fn tmpEnv($param, $postParam, $fn)

(v5.4) 在指定的GET/POST参数下执行fn函数，执行完后恢复初始环境。
示例：

	$param = ["cond" => "createTm>'2019-1-1'];
	$ret = tmpEnv($param, null, function () {
		return callSvcInt("User.query");
	});

*/
function tmpEnv($param, $postParam, $fn)
{
	$bak = [$_GET, $_POST, $_REQUEST];
	$_GET = $param ?: [];
	$_POST = $postParam ?: [];
	assert(is_array($_GET) && is_array($_POST));
	$_REQUEST = $_GET + $_POST;

	$ret = null;
	$ex = null;
	try {
		$ret = $fn();
	}
	catch (Exception $ex1) {
		$ex = $ex1;
	}
	// restore env
	list($_GET, $_POST, $_REQUEST) = $bak;
	if ($ex)
		throw $ex;
	return $ret;
}

function filter_hash($arr, $keys)
{
	$ret = [];
	foreach ($arr as $k=>$v) {
		if (in_array($k, $keys)) {
			$ret[$k] = $v;
		}
	}
	return $ret;
}

function api_initClient()
{
	$ret = [];
	if (! empty(Plugins::$map)) {
		$ret['plugins'] = [];
		$keys = ["js"];
		foreach (Plugins::$map as $p=>$cfg) {
			$ret['plugins'][$p] = filter_hash($cfg, $keys);
		}
	}
	if (is_array($GLOBALS["P_initClient"])) {
		foreach ($GLOBALS["P_initClient"] as $k=>$v) {
			$ret[$k] = $v;
		}
	}
	Conf::onInitClient($ret);
	return $ret;
}

function getContentType()
{
	static $ct;
	if ($ct == null) {
		$ct = @$_SERVER["HTTP_CONTENT_TYPE"] ?: $_SERVER["CONTENT_TYPE"];
	}
	return $ct;
}

function getHttpInput()
{
	static $content;
	if ($content == null) {
		$ct = getContentType();
		$content = file_get_contents("php://input");
		if (preg_match('/charset=([\w-]+)/i', $ct, $ms)) {
			$charset = strtolower($ms[1]);
			if ($charset != "utf-8") {
				if ($charset == "gbk" || $charset == "gb2312") {
					$charset = "gb18030";
				}
				@$content = iconv($charset, "utf-8//IGNORE", $content);
			}
			if ($content === false)
				throw new MyException(E_PARAM, "unknown encoding $charset");
		}
	}
	return $content;
}

/**
@fn api_checkIp()

@key whiteIpList 白名单配置.

可在conf.user.php中设置whiteIpList，如

	putenv("whiteIpList=115.238.59.110");

要验证调用者是否在IP白名单中，不是白名单调用将直接抛错，可以调用

	api_checkIp();

外部可直接调用接口checkIp测试，例如用JS：

	callSvr("checkIp");

@see BlackList
*/
function api_checkIp()
{
	if (BlackList::isWhiteReq())
		return;
	$log = @sprintf("*** unauthorized call: ip is NOT in white list. ApiLog.id=%s", ApiLog::$lastId);
	logit($log);
	throw new MyException(E_PARAM, "ip is NOT in white list", "IP不在白名单");
}

/**
@fn injectSession($userId, $appType, $fn, $days=3)

对别人的session进行操作，比如删除，修改参数等。
$fn为对session的操作，当设置为false时，表示删除session.

基于ApiLog查找指定用户的session, 默认找3天(参数days)内该用户的最近一次session（且该session此后未被别的用户使用）. 
操作将记录在日志trace.log中。

示例：当管理员的权限字段(perms)被修改后，直接修改该用户的session令其立刻生效。
(注意：此机制仅优化常见场景，但并不可靠）

	class AC0_Employee {
		protected function onValidate() {
			if ($this->ac == "set" && issetval("perms?")) {  // "perms?"以问号结尾表示传入空串也算设置了，这时set接口将置空该字段。
				$params = $_POST; // 注意：闭包不可直接use $_POST，否则得到null值
				injectSession($this->id, "emp", function () use ($params) {
					$_SESSION["perms"] = $params["perms"];
					// $_SESSION["adminFlag"] = param("adminFlag/i", 0, $params); // 注意字段类型要正确，可用param函数。
				});
			}
		}
	}

@see delSession
*/
function injectSession($userId, $appType, $fn, $days=3)
{
	$name = $fn === false? "delSession": "injectSession";
	if (! Conf::$enableApiLog) {
		logit("warn: ignore $name as Conf::\$enableApiLog=false");
		return false;
	}
	addLog("$name(userId=$userId,appType=$appType)");
	$tm = date(FMT_D, time() - $days * T_DAY);
	$curSessionId = session_id();
	// 目前允许将自己删除
	// $sql = sprintf("SELECT distinct ses FROM ApiLog WHERE tm>='$tm' AND userId=%d AND app LIKE %s AND ses<>'%s'", $userId, Q("$appType%"), $curSessionId);
	$sql = sprintf("SELECT ses, tm FROM ApiLog WHERE tm>='$tm' AND userId=%d AND app LIKE %s ORDER BY tm DESC LIMIT 1", $userId, Q("$appType%"));
	$rv1 = queryAll($sql);
	$rv = array_filter($rv1, function ($e) use ($userId) {
		// 确保session没有被其它共用
		$sql = sprintf("SELECT 1 FROM ApiLog WHERE tm>='%s' AND ses='%s' AND userId<>%d", $e[1], $e[0], $userId);
		return queryOne($sql) === false;
	});

	if (count($rv) > 0) {
		logit("$name(userId=$userId, appType=$appType, days=$days): " . count($rv) . " sessions");
		$GLOBALS["X_APP"]->onAfterActions[] = function () use ($rv, $curSessionId, $fn) {
			if (session_status() == PHP_SESSION_ACTIVE) // 0: disabled, 1: none(before session_start), 2: active
				session_write_close();

			foreach ($rv as $e) {
				session_id($e[0]);
				// TODO: 检查session不存在时应不做操作
				session_start();
				if ($fn === false || count($_SESSION) == 0) {
					session_destroy();
				}
				else {
					$fn();
					session_write_close();
				}
			}

			// restore current session id
			session_id($curSessionId);
			session_start();
			session_write_close();
		};
	}
}

/**
@fn delSession($userId, $appType, $days=3)

删除指定用户的session. 例如：踢掉在线用户等。

示例：当用户的“管理员标志”(adminFlag)被修改后，踢掉该用户让其重新登录。

	class AC0_User {
		protected function onValidate() {
			if ($this->ac == "set" && issetval("adminFlag")) {
				delSession($this->id, "user");
			}
		}
	}

@see injectSession
*/
function delSession($userId, $appType, $days=3)
{
	injectSession($userId, $appType, false, $days);
}

// ------ 异步调用支持 {{{
/**
@fn httpCallAsync($url, $postParams=null)

发起调用后立即返回，即用于发起异步调用。
默认发起GET调用，如果postParams非空(可以为字符串、数值或数组)，则发起POST调用。

示例：

	httpCallAsync("/jdcloud/api.php?ac=async&f=sendSms", [
		"phone" => "13712345678",
		"msg" => "验证码为1234"
	]);

TODO:目前只用于本机
*/
function httpCallAsync($url, $postParams = null)
{
	$host = '127.0.0.1';
	$port = 80;

	$fp = fsockopen($host, $port, $errno, $errstr, 3);
	if (!$fp) {
		echo "$errstr ($errno)";
		return false;
	}
	$data = null;
	if (isset($postParams)) {
		if (is_array($postParams))
			$data = json_encode($postParams, JSON_UNESCAPED_UNICODE);
		else if (!is_string($postParams))
			$data = (string)$postParams;
	}

	//stream_set_blocking($fp, 0); // 设置成非阻塞模式则担心写入失败。
	$header = ($data? "POST": "GET") . " $url HTTP/1.1\r\nHost: $host\r\n";
	if ($data) {
		$header .= "Content-Type: application/json;charset=utf-8\r\n"
			. "Content-Length: " . strlen($data) . "\r\n";
	}
	$header .= "Connection: Close\r\n\r\n"; //长连接关闭
	fwrite($fp, $header);
	// echo("$header$data"); // show log

	if ($data)
		fwrite($fp, $data);
	 
	fclose($fp);
}

/**
@fn callAsync($ac, $params)

在当前事务完成后，调用"async"接口，不等服务器输出数据就立即返回。

@key enableAsync 配置异步调用

发起异步调用请求，然后立即返回。它使用如下接口：

	async(f)(params...)
	其中params为JSON格式

示例：让一个同步调用变成支持异步调用，以sendSms为例

	// 1. 设置已注册的异步调用函数。建议在api.php中设置。
	$allowedAsyncCalls = ["sendSms"];

	function sendSms($phone, $msg) {
		// 2. 为支持异步的函数加上判断分支
		if (getenv("enableAsync") === "1") {
			return callAsync('sendSms', func_get_args());
		}
		
		// 同步调用
		return httpCall("...");
	}

	// 3. 在conf.user.php中配置开启异步支持。如果不配置则为同步调用，便于比较区别与调试。
	// 打开异步调用支持, 依赖 P_BASE_URL 和 whiteIpList 设置
	putenv("enableAsync=1");

@see callSvcAsync
@see api_async
*/
function callAsync($ac, $param) {
	callSvcAsync("async", ["f"=>$ac], $param);
}

/**
@fn callSvcAsync($ac, $urlParam, $postParams)

在当前事务执行完后，调用指定接口并立即返回（不等服务器输出数据）。一般用于各种异步通知。
示例：

	callSvcAsync("sendMail", ["type"=>"Issue", "id"=>100]);
	// 自动以getBaseUrl来补全url

	callSvcAsync("http://localhost/pdi/api/sendMail", ["type"=>"Issue", "id"=>100]);
	// 将ac直接当成url
*/
function callSvcAsync($ac, $urlParam, $postParam = null) {
	$url = makeUrl($ac, $urlParam);
	$GLOBALS["X_APP"]->onAfterActions[] = function () use ($url, $postParam) {
		httpCallAsync($url, $postParam);
	};
}

/**
@fn api_async

提供async接口，用于内部发起异步调用:

	async(f)(params...)
	params为JSON格式。

注意：要求调用者在IP白名单中，配置示例：

	putenv("whiteIpList=115.238.59.110 127.0.0.1 ::1");

@see enableAsync
@see whiteIpList
*/
function api_async() {
	api_checkIp();
	$f = mparam("f", "G");
	ApiLog::$instance->batchAc = "async:$f";
	global $allowedAsyncCalls;
	if (!($f && in_array($f, $allowedAsyncCalls) && function_exists($f)))
		throw new MyException(E_PARAM, "bad async fn: $f");

	$param = file_get_contents("php://input");
	$arr = json_decode($param, true);
	if (! is_array($arr))
		throw new MyException(E_PARAM, "bad param for async fn $f: $param");
	
	putenv("enableAsync=0");
	return call_user_func_array($f, $arr);
}
// }}}

// ====== main routine {{{
function apiMain()
{
	if ($_SERVER["REQUEST_METHOD"] == "OPTIONS")
		return;

	// TODO: 如允许api.php被包含后直接调用api，应设置 ApiFw_::$SOLO=false
	//$script = basename($_SERVER["SCRIPT_NAME"]);
	//ApiFw_::$SOLO = ($script == API_ENTRY_PAGE || $script == 'index.php');
	if (@$GLOBALS["noExecApi"] || isCLI())
		ApiFw_::$SOLO = false;

	$supportJson = function () {
		// 支持POST为json格式
		$ct = getContentType();
		if (strstr($ct, "/json") !== false) {
			$content = getHttpInput();
			@$arr = json_decode($content, true);
			if (!is_array($arr))
				throw new MyException(E_PARAM, "bad json-format body");
			$_POST = $arr;
			$_REQUEST += $arr;
		}
	};

	global $BASE_DIR;
	// optional plugins
	$plugins = "$BASE_DIR/plugin/index.php";
	if (file_exists($plugins))
		include_once($plugins);

	require_once("{$BASE_DIR}/conf.php");

	if (ApiFw_::$SOLO) {
		$api = new ApiApp();
		$GLOBALS["X_APP"] = $api;
		$api->onBeforeActions[] = $supportJson;
		$api->exec();

		// 删除空会话
		if (isset($_SESSION) && count($_SESSION) == 0) {
			// jd-php框架ApiWatch中设置过lastAccess，则空会话至少有1个key。v5.3不再使用ApiWatch
			// @session_destroy();
			safe_sessionDestroy();
		}
	}
}

class BatchApiApp extends AppBase
{
	protected $apiApp;
	protected $useTrans;

	public $ac;

	function __construct($apiApp, $useTrans)
	{
		$this->apiApp = $apiApp;
		$this->useTrans = $useTrans;
	}

	protected function onExec()
	{
		$this->apiApp->call($this->ac, !$this->useTrans);
	}

	protected function onErr($code, $msg, $msg2)
	{
		setRet($code, $msg, $msg2);
	}

	protected function onAfter($ok)
	{
		global $X_RET_STR;
		global $g_dbgInfo;
		$X_RET_STR = null;
		$g_dbgInfo = [];
	}

/*
	static function handleBatchRef($ref, $retVal)
	{
		foreach ($ref as $k) {
			if (isset($_GET[$k])) {
				$_GET[$k] = self::calcRefValue($_GET[$k], $retVal);
			}
			if (isset($_POST[$k])) {
				$_POST[$k] = self::calcRefValue($_POST[$k], $retVal);
			}
		}
	}
*/

	// return: false OR params
	// name: "get"/"post"
	static function getParams($call, $name, &$retVal)
	{
		$params = $call[$name];
		if (is_null($params))
			return [];
		// e.g. {get: "{$1}"}
		if (is_string($params)) {
			self::calcRefValue($params, $retVal);
		}
		// e.g. { get: {status: "{$1.status}", cond: "id>{$1.id}"}, ref: ["status", "cond"] }
		else if ($call["ref"]) {
			if (! is_array($call["ref"])) {
				$retVal[] = [E_PARAM, "参数错误", "batch `ref' should be array"];
				return false;
			}
			foreach ($call["ref"] as $k) {
				if (isset($params[$k])) {
					self::calcRefValue($params[$k], $retVal);
				}
			}
		}
		if (!is_array($params)) {
			$retVal[] = [E_PARAM, "参数错误", "param $name MUST be array."];
			return false;
		}
		return $params;
	}

	// 原理：
	// "{$n.id}" => "$f(n)["id"]"
	// 如果计算错误，则返回NULL
	private static function calcRefValue(&$val, $arr)
	{
		$f = function ($n) use ($arr) {
			if ($n <= 0)
				$n = count($arr) + $n;
			else 
				$n -= 1;
			@$e = $arr[$n];
			if (! isset($e) || $e[0] != 0)
				return;
			
			return $e[1];
		};

		$calcOne = function ($expr) use ($f) {
			$expr1 = preg_replace_callback('/\$(-?\d+)|\.(\w+)/', function ($ms) use ($f) {
				@list ($m, $n, $prop) = $ms;
				$ret = null;
				if ($n != null) {
					$ret = "\$f({$n})";
				}
				else if ($prop != null) {
					$ret = "[\"{$prop}\"]";
				}
				return $ret;
			}, $expr);
			$rv = eval("return @({$expr1});");
			return $rv;
		};

		if (is_array($val)) {
			foreach ($val as &$v) {
				self::calcRefValue($v, $arr);
			}
			return $val;
		}
		
		// 完全替换，如 "{$-1}" 返回上次调用对象
		if (preg_match('/^\{  ([^{}]+)  \}$/x', $val, $ms)) {
			$expr = $ms[1];
			$v1 = $calcOne($expr);
		}
		// 部分替换，只返回字符串。如 "id={$-1}"
		else {
			$v1 = preg_replace_callback('/\{(.+?)\}/', function ($ms) use ($calcOne) {
				$expr = $ms[1];
				$rv = $calcOne($expr);
				if (!isset($rv))
					$rv = "null";
				return $rv;
			}, $val);
			addLog("### batch ref: `{$val}' -> `{$v1}'");
		}
		$val = $v1;
		return $v1;
	}
}

// 取当前全局APP可以用X_APP，如
//  $ac = $GLOBALS["X_APP"]? $GLOBALS["X_APP"]->getAc(): 'unknown';
class ApiApp extends AppBase
{
	private $apiLog;
	private $apiWatch;
	private $ac;

	function getAc() {
		return $this->ac;
	}

	protected function onExec()
	{
		if (! isCLI())
		{
			if (ApiFw_::$SOLO)
			{
				header("Content-Type: text/plain; charset=UTF-8");
				#header("Content-Type: application/json; charset=UTF-8");
			}
			header("Cache-Control: no-cache");
		}
		setServerRev();

		$ac = param('_ac', null, $_GET);
		if (! isset($ac))
		{
			// 支持PATH_INFO模式。
			@$path = $this->getPathInfo();
			if ($path != null)
			{
				$ac = $this->parseRestfulUrl($path);
			}
		}
		if (! isset($ac)) {
			$ac = mparam('ac', $_GET);
		}

		Conf::onApiInit($ac);
		$this->ac = $ac;

		dbconn();

		global $DBH;
		if (! isCLI() && Conf::$enableAutoSession) {
			session_start();
		}

		if (Conf::$enableApiLog)
		{
			$this->apiLog = new ApiLog($ac);
			$this->apiLog->logBefore();
		}

/*
		// API调用监控
		$this->apiWatch = new ApiWatch($ac);
		$this->apiWatch->execute();
*/
		if (Conf::$enableSecure) {
			if (!BlackList::isWhiteReq() && (BlackList::isBlackReq() || Conf::checkSecure($ac) === false)) {
				setRet(E_FORBIDDEN, "OK");
				return "OK";
			}
		}

		if ($ac == "batch") {
			$useTrans = param("useTrans", false, $_GET);
			$ret = $this->batchCall($useTrans);
		}
		else {
			$ret = $this->call($ac, true);
		}

		return $ret;
	}

	protected function batchCall($useTrans)
	{
		$method = $_SERVER["REQUEST_METHOD"];
		if ($method !== "POST")
			throw new MyException(E_PARAM, "batch MUST use `POST' method");

		$s = getHttpInput();
		$calls = json_decode($s, true);
		if (! is_array($calls))
			throw new MyException(E_PARAM, "bad batch request");

		global $DBH;
		global $X_RET;

		// 以下过程不允许抛出异常, 一旦有异常, 返回将不符合batch协议
		try {

		$batchApiApp = new BatchApiApp($this, $useTrans);
		if ($useTrans && !$DBH->inTransaction())
			$DBH->beginTransaction();
		$solo = ApiFw_::$SOLO;
		ApiFw_::$SOLO = false;
		$retVal = [];
		$retCode = 0;
		$GLOBALS["errorFn"] = function () {};
		$acList = [];
		foreach ($calls as $call) {
			if ($useTrans && $retCode) {
				$retVal[] = [E_ABORT, "事务失败，取消执行", "batch call cancelled."];
				continue;
			}
			if (! isset($call["ac"])) {
				$retVal[] = [E_PARAM, "参数错误", "bad batch request: require `ac'"];
				continue;
			}
			$acList[] = $call["ac"];

			$_GET = BatchApiApp::getParams($call, "get", $retVal);
			$_POST = BatchApiApp::getParams($call, "post", $retVal);
			$_REQUEST = array_merge($_GET, $_POST);
			if ($this->apiLog) {
				$this->apiLog->logBefore1($call["ac"]);
			}

			$batchApiApp->ac = $call["ac"];
			// 如果batch使用trans, 则单次调用不用trans
			$batchApiApp->exec(! $useTrans);

			$retCode = $X_RET[0];
			if ($retCode && $useTrans) {
				if ($DBH && $DBH->inTransaction())
				{
					$DBH->rollback();
				}
			}
			$retVal[] = $X_RET;
			if ($this->apiLog) {
				$this->apiLog->logAfter1();
			}
		}
		if ($this->apiLog) {
			$this->apiLog->batchAc = 'batch:' . count($acList) . ',' . join(',', $acList);
		}
		if ($useTrans && $DBH && $DBH->inTransaction())
			$DBH->commit();
		ApiFw_::$SOLO = $solo;
		setRet(0, $retVal);

		} /* try */
		catch (Exception $ex) {
			ApiFw_::$SOLO = $solo;
			logit($ex);
			throw $ex;
		}

		return $retVal;
	}

	// 将被BatchApiApp调用
	public function call($ac, $useTrans)
	{
		global $DBH;
		if ($useTrans && ! $DBH->inTransaction())
			$DBH->beginTransaction();
		$ret = callSvcInt($ac);
		if ($useTrans && $DBH && $DBH->inTransaction())
			$DBH->commit();
		setRet(0, $ret);
		return $ret;
	}

	protected function onErr($code, $msg, $msg2)
	{
		setRet($code, $msg, $msg2);
	}

	protected function onAfter($ok)
	{
/*
		if ($this->apiWatch)
			$this->apiWatch->postExecute();
*/
		if ($this->apiLog)
			$this->apiLog->logAfter();

		// 及时关闭数据库连接
		global $DBH;
		$DBH = null;
	}

	private function getPathInfo()
	{
		$pi = $_SERVER["PATH_INFO"];
		if ($pi === null) {
			# 支持rewrite后解析pathinfo
			$uri = $_SERVER["REQUEST_URI"];
			if (strpos($uri, '.php') === false) {
				$uri = preg_replace('/\?.*$/', '', $uri);
				$baseUrl = getBaseUrl(false);

				# uri=/jdy/api/login -> pi=/login
				# uri=/jdy/login -> pi=/login
				if (strpos($uri, $baseUrl) === 0) {
					$script = basename($_SERVER["SCRIPT_NAME"], '.php'); // "api"
					$len = strlen($baseUrl);
					if (strpos($uri, $baseUrl . $script) === 0)
						$len += strlen($script);
					else
						-- $len;
					if ($len>0) // "/jdy/api" or "/jdy"
						$pi = substr($uri, $len);
				}
			}
		}
		return $pi;
	}

	static function isId($val) {
		return isset($val) && ctype_digit($val);
	}

	// return: $ac
	private function parseRestfulUrl($pathInfo)
	{
		$method = $_SERVER["REQUEST_METHOD"];
		$ac = htmlEscape(substr($pathInfo,1));
		// POST /login  (小写开头)
		// GET/POST /Store.add (含.)
		if (!preg_match('/^[A-Z][\w\/]+$/u', $ac))
		{
			if ($method !== 'GET' && $method !== 'POST')
				throw new MyException(E_PARAM, "bad verb '$method'. use 'GET' or 'POST'");
			return $ac;
		}

		// {obj}/{id}
		// {obj}/{id}/{action}
		@list($obj, $id, $ac) = explode('/', $ac, 3);
		if ($id === "")
			$id = null;
		if ($ac === "")
			$ac = null;

		if (!self::isId($id))
			list($id,$ac) = [$ac,$id];
		if (self::isId($id))
			setParam('id', $id);

		// 非标准CRUD操作，如：GET|POST /Store/123/close 或 /Store/close/123 或 /Store/closeAll
		if (isset($ac)) {
			if ($method !== 'GET' && $method !== 'POST')
				throw new MyException(E_PARAM, "bad verb '$method' for user function. use 'GET' or 'POST'");
			return "{$obj}.{$ac}";
		}

		switch ($method) {

		// GET /Store/123
		// GET /Store
		case 'GET':
			if (isset($id))
				$ac = 'get';
			else
				$ac = 'query';
			break;

		// POST /Store
		case 'POST':
			if (isset($id))
				throw new MyException(E_PARAM, "bad verb '$method' on id: $id");
			$ac = 'add';
			break;

		// PATCH /Store/123
		case 'PATCH':
			if (! isset($id))
				throw new MyException(E_PARAM, "missing id");
			$ac = 'set';
			parse_str(file_get_contents("php://input"), $_POST);
			break;

		// DELETE /Store/123
		case 'DELETE':
			if (! isset($id))
				throw new MyException(E_PARAM, "missing id");
			$ac = 'del';
			break;

		default:
			throw new MyException(E_PARAM, "bad verb '$method'");
		}
		return "{$obj}.{$ac}";
	}
}

/*
Bug: session_start doesn't create session
https://bugs.php.net/bug.php?id=78155&thanks=4

Scenario: 
Request A and B are sent from the same browser at the same time and use the same cookie.
A destroys session and B writes session.

Request A:
	session_start();
	sleep(5);
	session_destroy();

Request B:
	// B will be blocked by A on the session file
	session_start(); // !!!return ok but not session file!!!
	// resume until A destroys(releases) it. but no session file and the 'uid' cannot save.
	$_SESSION["uid"] = 1;
	
Expected result:
the session file exists with variable 'uid'.

Actual result:
No session file.

session_destroy会误删除其它进程正在使用的session文件。
此bug影响linux系统，目前尚无法解决。可定期手工删除空session：

	cd session
	find . -size 0 | xargs rm

如果有特定的轮询API，若不希望它产生空session，可设置enableAutoSession=false禁上自动创建session:

	class Conf extends ConfBase
	{
		...

		static function onApiInit(&$ac)
		{
			if ($ac == "Cmd.query") {
				self::$enableAutoSession = false;
			}
		}
	}

*/
function safe_sessionDestroy() 
{
	// windows上文件被其它进程打开时，无法删除。故直接忽略错误即可。
	if (PHP_OS === "WINNT") {
		@session_destroy();
		return;
	}

	/* 此bug在linux系统上目前无法解决，下面代码只能降低session被误删除的概率，但无法根除 */
	return;

	// linux上文件被其它进程独占打开时，也可以删除。
	// 为避免误删除，将session_destroy拆分为session_write_close和unlink，先测试没有被别的进程lock，这时再删除。
	session_write_close();
	$f = session_save_path() . "/sess_" . session_id();
	@$fp = fopen($f, "r");
	if ($fp === false)
		return;
	usleep(0); // sched_yeild CPU cycle, check if the session file is locked by other proc
	usleep(0);
	usleep(0);
	$rv = flock($fp, LOCK_EX|LOCK_NB);
	if ($rv) {
		flock($fp, LOCK_UN);
		fclose($fp);
		@unlink($f);
	}
	else {
		fclose($fp);
		// echo("!!! ignore session destroy !!!\n");
	}
}

/**
@fn callSvc($ac?, $urlParam?, $postParam?, $cleanCall?=false, $hideResult?=false)

直接调用接口，返回数据。如果出错，将调用$GLOBALS['errorFn'] (缺省为errQuit).

@param $cleanCall Boolean. 如果为true, 则不使用现有的$_GET, $_POST等变量中的值。
@param $hideResult Boolean. 如果为true, 不输出结果。
 */
function callSvc($ac = null, $urlParam = null, $postParam = null, $cleanCall = false, $hideResult = false)
{
	global $DBH; // 避免api->exec完成后关闭数据库连接
	$bak = [$_GET, $_POST, $_REQUEST, ApiFw_::$SOLO, $DBH];

	if ($cleanCall) {
		$_GET = [];
		$_POST = [];
		$_REQUEST = [];
	}
	if ($ac)
		$_GET["_ac"] = $ac;
	if ($urlParam) {
		foreach ($urlParam as $k=>$v) {
			setParam($k, $v);
		}
	}
	if ($postParam) {
		foreach ($postParam as $k=>$v) {
			$_POST[$k] = $v;
		}
	}
	if ($hideResult) {
		ApiFw_::$SOLO = false;
	}

	$api = new ApiApp();
	$ret = $api->exec();

	global $X_RET_STR;
	$X_RET_STR = null;
	list($_GET, $_POST, $_REQUEST, ApiFw_::$SOLO, $DBH) = $bak;
	return $ret;
}
#}}}

// vim: set foldmethod=marker :
