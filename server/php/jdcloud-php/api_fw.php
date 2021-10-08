<?php

#error_reporting(E_ALL & (~(E_NOTICE|E_USER_NOTICE)));
error_reporting(E_ALL & ~E_NOTICE);

/** @module JDEnv
@alias api_fw

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

内部调用接口：

	// 函数型接口
	$rv = callSvcInt("test1");
	// 对象型接口，自动根据当前权限匹配类：
	$objArr = callSvcInt("MyObj.query", ["fmt"=>"array", "cond"=>...]);

常用对象的add/set/query接口替代dbInsert/dbUpdate/queryOne/queryAll这些底层数据库函数，以支持对象中的定制逻辑。

调用指定类的接口：

	$ac = new AC2_MyObj();
	$objArr = $ac->callSvc("MyObj", "query", ["fmt"=>"array", "cond"=>...]);

特别地，在AC类内部调用同类接口：

	$objArr = $this->callSvc(null, "query", ["fmt"=>"array", "cond"=>...]);

注意：以上所有调用失败时，将直接向上抛出异常；且不记录调用日志（ApiLog）。

直接调用callSvc将不会抛出异常，而且它会记录调用日志。

	$ret = callSvc("MyObj.query", ["fmt"=>"array", "cond"=>...]);
	// 返回数组，是[code, data, ...]格式。

@see callSvcInt
@see AccessControl::callSvc
@see callSvc

要复用框架，比如只调用框架函数（如数据库操作），不调用任何接口：tool/xx.php

	require_once("api_fw.php");
	$rv = queryOne("...");

定义新的接口服务：api1.php

	require_once("api_fw.php");
	// 定义接口...
	callSvc();

调用已有接口：

	require_once("api.php");
	...
	$ret = callSvc("genVoucher");

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

plugin/index.php是插件配置文件，在后端应用框架中自动引入，内容示例如下：

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
global $X_RET_STR;
/**
@var $X_RET_FN

默认接口调用后输出筋斗云的`[0, data]`格式。
若想修改返回格式，可设置该回调函数。

- 如果返回对象，则输出json格式。
- 如果返回String类型，则直接输出字符串。
- 如果返回false，应自行用echo/readfile等输出。注意API日志中仍记录筋斗云返回数据格式。
- (v6) 如果有参数`{jdcloud:1}`，则忽略此处设置，仍使用筋斗云格式输出。

示例：返回 `{code, data}`格式：

	global $X_RET_FN;
	$X_RET_FN = function ($ret, $env) {
		$ret = [
			"code" => $ret[0],
			"data" => $ret[1]
		];
		if ($env->TEST_MODE)
			$ret["jdData"] = $ret;
		return $ret;
	};

示例：返回xml格式：

	global $X_RET_FN;
	$X_RET_FN = function ($ret, $env) {
		header("Content-Type: application/xml");
		return "<xml><code>$ret[0]</code><data>$ret[1]</data></xml>";
	};
	
*/
global $X_RET_FN;

/**
@var $X_APP
@fn getJDEnv()

可以在应用结束前添加逻辑，如：

	$env = getJDEnv(); // 非swoole环境下也可以直接用 $GLOBALS["X_APP"]
	$env->onAfterActions[] = function () {
		httpCall("http://oliveche.com/echo.php");
	};

注意：

- 如果接口返回错误, 该回调不执行. (DirectReturn返回除外)
- 此时接口输出已完成，不可再输出内容，否则将导致返回内容错乱。addLog此时也无法输出日志(可以使用logit记日志到文件)
- 此时接口的数据库事务已提交，如果再操作数据库，与之前操作不在同一事务中。
- 若出现异常，只会写日志，不会抛出错误，且所有函数仍会依次执行。

示例: 当创建工单时, **异步**向用户发送通知消息, 且在异步操作中需要查询新创建的工单, 不应立即发送或使用AccessControl的onAfterActions;
因为在异步任务查询新工单时, 可能接口还未执行完, 数据库事务尚未提交, 所以只有放在X_APP的onAfterActions中才可靠.
*/
global $X_APP;

const PAGE_SZ_LIMIT = 10000;
// }}}

// ====== functions {{{
function getJDEnv()
{
	$env = $GLOBALS["X_APP"];
	if (is_object($env)) {
		return $env;
	}
	return $env[Swoole\Coroutine::getcid()];
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

/*
@fn setServerRev($env)

根据全局变量"SERVER_REV"或应用根目录下的文件"revision.txt"， 来设置HTTP响应头"X-Daca-Server-Rev"表示服务端版本信息（最多6位）。

客户端框架可本地缓存该版本信息，一旦发现不一致，可刷新应用。
服务器可使用$GLOBALS["SERVER_REV"]来取服务端版本号（6位）。
 */
function setServerRev($env)
{
	$ver = $GLOBALS["SERVER_REV"] ?: @file_get_contents("{$GLOBALS['BASE_DIR']}/revision.txt");
	if (! $ver)
		return;
	$ver = substr($ver, 0, 6);
	$GLOBALS["SERVER_REV"] = $ver;
	$env->header("X-Daca-Server-Rev", $ver);
}

/**
@fn hasPerm($perms, $exPerms=null)

检查权限。perms可以是单个权限或多个权限，例：

	if (hasPerm(AUTH_USER)) ...  // 用户登录后可用
	if (hasPerm(AUTH_USER | AUTH_EMP)) ... // 用户或员工登录后可用
	if (hasPerm(AUTH_LOGIN)) ... // 用户、员工、管理员任意一种登录

类似的还有checkAuth函数，不同的是如果检查不通过则直接抛出异常，不再往下执行。

	checkAuth(AUTH_USER);
	checkAuth(AUTH_ADMIN | PERM_TEST_MODE); 要求必须管理员登录或测试模式才可用。
	checkAuth(AUTH_LOGIN);

@see checkAuth

(v5.4) exPerms用于扩展验证, 是一个认证方式名数组, 示例:

	hasPerm(AUTH_LOGIN, ["simple"]);

它表示AUTH_LOGIN检查失败后, 再检查是否通过了simple认证。支持的认证方式见下面章节描述。

## 内置认证

login接口支持不同类别的用户登录，登录成功后会设置相应的session变量，之后就具有相应权限。

@fn onGetPerms() 权限生成逻辑

默认逻辑如下，开发者可自定义该逻辑。

- 用户登录后(session中有uid变量)，具有AUTH_USER权限
- 员工登录后(session中有empId变量)，具有AUTH_EMP权限
- 超级管理员登录后(session中有adminId变量)，具有AUTH_ADMIN权限
- 测试模式具有 PERM_TEST_MODE权限，模拟模式具有PERM_MOCK_MODE权限。

## 扩展认证方式

@var Conf::$authKeys=[] 认证密钥及权限设置

示例：如果请求中使用了basic认证，则通过认证后获得与员工登录相同的权限（即AUTH_EMP权限）

	// class Conf (在conf.php中)
	static $authKeys = [
		// 当匹配以下key时，当作系统用户-9999；默认全部AUTH_EMP权限的接口都可被第三方访问
		["authType"=>"basic", "key" => "user1:1234", "SESSION" => ["empId"=>-9999], "allowedAc" => ["*.query","*.get"] ]
	];

- authType指定的认证方式名是在Conf::$authHandlers注册过的，目前支持：basic, simple, none(v6)。
  要扩展可以参考$authHandlers用法，比如插件jdcloud-plugin-jwt可支持jwt认证。

@see ConfBase::$authHandlers

- key被相应的认证方式使用，其格式由认证方式决定，一般即直接是认证密钥。

- 通过SESSION的设置，从而使得通过认证的接口请求，相当于具有系统-9999号用户的权限（即具有AUTH_EMP权限），
  意味着它可以直接调用AC2类，或是通过`checkAuth(AUTH_EMP)`的检查。

在authKeys中须用allowedAc指定可用接口列表，所有都可访问可以用"*"。
如果未指定allowedAc，则不会自动执行该权限检查，则在函数型接口中需要显示指定认证方式，如：

	checkAuth(AUTH_EMP, ["basic", "simple"]);

对于对象型接口，无法直接使用AC2类的接口（因为没有AUTH_EMP权限），只能使用AC类接口，在其中使用checkAuth再检查权限。

支持的认证方式如下。

### simple: 筋斗云简单认证

在请求时，添加HTTP头：

	X-Daca-Simple: $authStr

后端检查示例: upload接口允许simple验证.

	function api_upload() {
		checkAuth(AUTH_LOGIN, ["simple"]);
		...
	}

其中$authStr由Conf::$authKeys中以key字段指定：

	// class Conf (在conf.php中)
	static $authKeys = [
		["authType"=>"simple", "key" => "user1:1234"],
	];

用curl访问该接口示例:

	curl -s -F "file=@1.jpg" "http://localhost/jdcloud/api/upload?autoResize=0" -H "X-Daca-Simple: user1:1234"

simple认证也可以通过环境变量simplePwd确定，比如可以在conf.user.php中配置：

	putenv("simplePwd=user1:1234");

### basic: HTTP基本认证

通过HTTP标准的Basic认证方式。
HTTP Basic认证，即添加HTTP头：

	Authorization: Basic $authStr
	
按HTTP协议，authStr格式为base64($user:$password)
可验证的用户名、密码在Conf类中配置，后端配置示例：

	// class Conf (在conf.php中)
	static $authKeys = [
		["authType"=>"basic", "key" => "user1:1234"],
		["authType"=>"basic", "key" => "user2:1235"], // 可以多个
	];

请求示例：

	curl -u user1:1234 http://localhost/jdcloud/api.php/xxx

注意：若php是基于apache fcgi方式的部署，可能无法收到认证串，可在apache中配置：

	SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1

### none: 不验证/模拟身份认证

(v6) 主要用于为某些接口设置模拟身份。
某些接口无须登录验证即可调用，但在实现时需要调用要求权限验证的内部接口，这时需要模拟一个管理员的身份。

示例：提供接口queryEmp和Wis.wis01，无须登录即可调用，其内部调用Carton.query接口：

	// 函数接口示例
	function api_queryEmp()
	{
		// 假设Employee.query接口在AC2_Employee中定义，必须管理端登录才能调用；所以必须在Conf::$authKeys中配置模拟身份，才能正常调用。
		return callSvcInt("Employee.query", ["fmt"=>"list"]);
	}

	// 对象接口示例
	class AC_Wis extends AccessControl
	{
		function api_wis01()
		{
			// 与queryEmp接口遇到的问题相同，必须在Conf::$authKeys中配置后，才能正常调用。
			return callSvcInt("Employee.query", ["fmt"=>"list"]);
		}
	}
	// AC2类不是必须的，只是为了在管理端控制台中测试方便，因为管理端登录后只能调用AC2类不能调用AC类
	class AC2_Wis extends AC_Wis
	{
	}

	// class Conf (在conf.php中)
	static $authKeys = [
		// ["authType"=>"basic", "key" => "user1:1234", "SESSION" => ["empId"=>-9999], "allowedAc" => ["*.query","*.get"] ]
		["authType"=>"none", "key" => "", "SESSION" => ["empId"=>-9999], "allowedAc" => ["queryEmp", "Wis.*"] ]
	];

在authKeys中通过"allowedAc"指定了匹配"queryEmp"或"Wis.*"的这些接口无须验证，且模拟-9999号管理员。作为对比，也可以设置HTTP Basic验证。
 */
function hasPerm($perms, $exPerms=null)
{
	$env = getJDEnv();
	assert(is_null($exPerms) || is_array($exPerms));
	if (is_null($env->perms)) {
		// 扩展认证登录
		if (count($env->_SESSION()) == 0) { // 有session项则不进行认证
			$authTypes = $exPerms;
			if ($authTypes == null) {
				$authTypes = [];
				foreach (Conf::$authKeys as $e) {
					// 注意去重. 如果未设置allowedAc则不会自动检查权限
					if (is_array($e["allowedAc"]) && !in_array($e["authType"], $authTypes))
						$authTypes[] = $e["authType"];
				}
			}
			$env->exPerm = null;
			foreach ($authTypes as $e) {
				$fn = Conf::$authHandlers[$e];
				if (! is_callable($fn))
					jdRet(E_SERVER, "unregistered authType `$e`", "未知认证类型`$e`");
				if ($fn($env)) {
					$env->exPerm = $e;
					$env->session_destroy();  // 对于第三方认证，不保存session（即使其中模拟了管理员登录，也不会影响下次调用）
					break;
				}
			}
		}
		$env->perms = onGetPerms();
	}

	if ( ($env->perms & $perms) != 0 )
		return true;
	if (is_array($exPerms) && $env->exPerm && in_array($env->exPerm, $exPerms))
		return true;
	return false;
}

// $key 或 $keyFn($key)
function checkAuthKeys($key, $authType, $env)
{
	$auth = arrFind(Conf::$authKeys, function ($e) use ($key, $authType, $env) {
		assert(isset($e["authType"]), "authKey requires authType");
		if ($authType != $e["authType"])
			return false;
		assert(isset($e["key"]), "authKey requires key");

		// support key as a fn($key)
		$eq = is_callable($key) ? $key($e["key"]): $key == $e["key"];
		if (! $eq)
			return false;

		if (! isset($e["allowedAc"]))
			return true;
		assert(is_array($e["allowedAc"]), "authKey requires allowedAc");
		$ac = $env->getAc() ?: 'unknown';
		foreach ($e["allowedAc"] as $e1) {
			if (fnmatch($e1, $ac))
				return true;
		}
		return false;
	});
	if (! $auth)
		return false;
	if (is_array($auth["SESSION"])) {
		foreach ($auth["SESSION"] as $k=>$v) {
			$env->_SESSION($k, $v);
		}
	}
	return true;
}

function hasPerm_none($env)
{
	return checkAuthKeys("", "none", $env);
}
ConfBase::$authHandlers["none"] = "hasPerm_none";

function hasPerm_simple($env)
{
	$key = $env->_SERVER("HTTP_X_DACA_SIMPLE");
	if (! $key)
		return false;
	$key1 = getenv("simplePwd");
	if ($key1 && $key === $key1)
		return true;
	return checkAuthKeys($key, "simple", $env);
}
ConfBase::$authHandlers["simple"] = "hasPerm_simple";

function hasPerm_basic($env)
{
	list($user, $pwd) = [$env->_SERVER('PHP_AUTH_USER'), $env->_SERVER('PHP_AUTH_PW')];
	if (! isset($user))
		return false;
	$key = $user . ':' . $pwd;
	return checkAuthKeys($key, "basic", $env);
}
ConfBase::$authHandlers["basic"] = "hasPerm_basic";

/** 
@fn checkAuth($perms)

用法与hasPerm类似，检查权限，如果不正确，则抛出错误。

@see hasPerm 认证与权限
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
		jdRet($errCode, "require auth to " . join("/", $auth));
	}
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
		$env = $this->env;
		$ver = $env->clientVer;
		if ($ver["type"] == "ios" && $ver["ver"]<=15) {
			jdRet(E_FORBIDDEN, "unsupport ios client version", "您使用的版本太低，请升级后使用!");
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
@var ConfBase::$authHandlers

注册认证处理函数。示例：注册jwt认证方式

	ConfBase::$authHandlers["jwt"] = "hasPerm_jwt";
	function hasPerm_jwt()
	{
		// 返回true表示认证成功	
	}

@see hasPerm
*/
	static $authHandlers = [];

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

	static $authKeys = [
	];
}

class ApiLog
{
	private $env;

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

	function __construct($env, $ac) 
	{
		$this->env = $env;
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
				$v = "obj:" . jsonEncode($v);
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

	protected $userId;
	protected function getUserId()
	{
		$env = $this->env;
		$userId = $env->_SESSION("empId") ?: $env->_SESSION("uid") ?: $env->_SESSION("adminId");
		if (! (is_int($userId) || ctype_digit($userId)))
			$userId = null;
		$this->userId = $userId;
		return $userId;
	}

	function logBefore()
	{
		$env = $this->env;
		$this->startTm = $env->_SERVER("REQUEST_TIME_FLOAT") ?: microtime(true);

		$content = $this->myVarExport($env->_GET(), 2000);
		$ct = getContentType($env);
		if (! preg_match('/x-www-form-urlencoded|form-data/i', $ct)) {
			$post = getHttpInput($env);
			$content2 = $this->myVarExport($post, 2000);
		}
		else {
			$content2 = $this->myVarExport($env->_POST(), 2000);
		}
		if ($content2 != "")
			$content .= ";\n" . $content2;
		$remoteAddr = getReqIp();
		if (strlen($remoteAddr>50)) { // 太长则保留头和尾
			$remoteAddr = preg_replace('/,.+,/', ',,', $remoteAddr);
		}
		
		$reqsz = strlen($env->_SERVER("REQUEST_URI")) + (@$env->_SERVER("HTTP_CONTENT_LENGTH")?:$env->_SERVER("CONTENT_LENGTH")?:0);
		$ua = $env->_SERVER("HTTP_USER_AGENT");
		$ver = $env->clientVer;

		++ $env->DBH->skipLogCnt;
		$this->id = $env->dbInsert("ApiLog", [
			"tm" => date(FMT_DT),
			"addr" => $remoteAddr,
			"ua" => $ua,
			"app" => $env->appName,
			"ses" => session_id(),
			"userId" => $this->getUserId(),
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

	function logAfter($ret)
	{
		global $X_RET_STR;
		$env = $this->env;
		if ($env->DBH == null)
			return;
		$iv = sprintf("%.0f", (microtime(true) - $this->startTm) * 1000); // ms
		if ($X_RET_STR == null)
			$X_RET_STR = jsonEncode($ret, $env->TEST_MODE);
		$logLen = $ret[0] !== 0? 2000: 200;
		$content = $this->myVarExport($X_RET_STR, $logLen);

		++ $env->DBH->skipLogCnt;
		$rv = $env->dbUpdate("ApiLog", [
			"t" => $iv,
			"retval" => $ret[0],
			"ressz" => strlen($X_RET_STR),
			"res" => dbExpr(Q($content)),
			"userId" => $this->userId ?: $this->getUserId(),
			"ac" => $this->batchAc // 默认为null；对batch调用则列出详情
		], $this->id);
// 		$logStr = "=== id={$this->logId} t={$iv} >>>$content<<<\n";
	}

	function logBefore1($ac1)
	{
		$env = $this->env;
		$this->ac1 = $ac1;
		$this->startTm1 = microtime(true);
		$this->req1 = $this->myVarExport($env->_GET(), 2000);
		$content2 = $this->myVarExport($env->_POST(), 2000);
		if ($content2 != "")
			$this->req1 .= ";\n" . $content2;
	}

	function logAfter1($ret)
	{
		$env = $this->env;
		if ($env->DBH == null)
			return;
		$iv = sprintf("%.0f", (microtime(true) - $this->startTm1) * 1000); // ms
		$res = jsonEncode($ret, $env->TEST_MODE);
		$logLen = $ret[0] !== 0? 2000: 200;
		$content = $this->myVarExport($res, $logLen);

		++ $env->DBH->skipLogCnt;
		$apiLog1Id = $env->dbInsert("ApiLog1", [
			"apiLogId" => $this->id,
			"ac" => $this->ac1,
			"t" => $iv,
			"retval" => $ret[0],
			"req" => dbExpr(Q($this->req1)),
			"res" => dbExpr(Q($content))
		]);
		if (Conf::$enableObjLog && self::$objLogId) {
			$env->dbUpdate("ObjLog", ["apiLog1Id" => $apiLog1Id], self::$objLogId);
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
						jdRet(E_FORBIDDEN, "call API too fast");
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
			jdRet(E_SERVER, "cannot find plugin `$pname': $file");

		$p = require_once($f);
		if ($p === true) { // 重复包含
			jdRet(E_SERVER, "duplicated plugin `$pname': $file");
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

	function api_queryRating($env)
	{
		$storeId = $env->mparam("storeId");

		// 定死输出内容。
		$env->_GET("res", "id, score, dscr, tm, orderDscr");

		// 相当于AccessControl框架中调用 addCond，用Obj.query接口的内部参数cond2以保证用户还可以使用cond参数。
		$env->_GET("cond2", dbExpr("o.storeId=$storeId")); 

		// 定死排序条件
		$env->_GET("orderby", "tm DESC");

		$ret = tableCRUD("query", "Rating", true);
		return $ret;
	}

注意：
一般应直接使用标准对象接口来实现需求，有时可能出于特别需要，不方便暴露标准接口，可以对标准接口进行了包装，定死一些参数。
v5.4后建议这样实现：

	function api_queryRating($env)
	{
		$storeId = $env->mparam("storeId");

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
@fn callSvcInt($ac, $param=null, $postParam=null, $useTmpEnv=true)

内部调用另一接口，获得返回值。
如果未指定$param或$postParam参数，则默认值为空数组。

与callSvc不同的是，它不处理事务、不写ApiLog，不输出数据，更轻量。

示例：

	$vendorId = callSvcInt("Vendor.add", null, [
		"name" => $params["vendorName"],
		"tel" => $params["vendorPhone"]
	]);

它在独立环境中执行，不会影响当前的$_GET, $_POST参数，除非指定参数useTmpEnv=false（一般不应指定）。
内部若有异常会抛上来，特别地，`jdRet(0)`会当成正常调用。

示例：用当前的get/post参数执行。

	$vendorId = callSvcInt("Vendor.add", $_GET, $_POST);

(v5.4) 上面例子会自动根据当前用户角色来选择AC类，还可以直接指定使用哪个AC类来调用，如：

	$acObj = new AC2_Vendor();
	$vendorId = $acObj->callSvc("Vendor", "add", null, [
		"name" => $params["vendorName"],
		"tel" => $params["vendorPhone"]
	]);

注意请自行确保AC类对当前角色兼容性，如用户角色调用了管理员的AC类，就可能出问题。


@see tmpEnv
@see callSvc
@see AccessControl::callSvc
*/
function callSvcInt($ac, $param=null, $postParam=null, $useTmpEnv=true)
{
	$env = getJDEnv();
	return $env->callSvcInt($ac, $param, $postParam, $useTmpEnv);
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

function api_initClient($env)
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
	Conf::onInitClient($ret, $env);
	return $ret;
}

function getContentType($env)
{
	$ct = $env->contentType;
	if ($ct == null) {
		$ct = $env->_SERVER("HTTP_CONTENT_TYPE") ?: $env->_SERVER("CONTENT_TYPE");
		$env->contentType = $ct;
	}
	return $ct;
}

function getHttpInput($env)
{
	$content = $env->rawContent;
	if ($content == null) {
		$ct = getContentType($env);
		$content = $env->rawContent();
		if (preg_match('/charset=([\w-]+)/i', $ct, $ms)) {
			$charset = strtolower($ms[1]);
			if ($charset != "utf-8") {
				if ($charset == "gbk" || $charset == "gb2312") {
					$charset = "gb18030";
				}
				@$content = iconv($charset, "utf-8//IGNORE", $content);
			}
			if ($content === false)
				jdRet(E_PARAM, "unknown encoding $charset");
		}
		$env->rawContent = $content;
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
	jdRet(E_PARAM, "ip is NOT in white list", "IP不在白名单");
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
					// $_SESSION["adminFlag"] = $env->param("adminFlag/i", 0, $params); // 注意字段类型要正确，可用param函数。
				});
			}
		}
	}

@see delSession
@see injectSessionById
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
		$sessionIds = array_map(function ($e) { return $e[0]; }, $rv);
		injectSessionById($sessionIds, $fn);
	}
}

/**
@fn injectSessionById($sessionId/$sessionIdArray, $fn)

对别人的session进行操作，比如删除，修改参数等。
$fn为对session的操作，当设置为false时，表示删除session.

@see delSessionById
*/
function injectSessionById($sessionIds, $fn)
{
	if (!is_array($sessionIds))
		$sessionIds = [$sessionIds];
	$curSessionId = session_id();
	$env = getJDEnv();
	$env->onAfterActions[] = function () use ($sessionIds, $curSessionId, $fn) {
		$isActive = (session_status() == PHP_SESSION_ACTIVE); // 0: disabled, 1: none(before session_start), 2: active
		if ($isActive)
			session_write_close();

		foreach ($sessionIds as $e) {
			session_id($e);
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
		if ($isActive)
			session_start();
	};
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

/**
@fn delSessionById($sessionId/$sessionIdArray)

删除指定sessionId. 例如：踢掉在线用户等。

@see injectSessionById
*/
function delSessionById($sessionIds)
{
	injectSessionById($sessionIds, false);
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
			$data = jsonEncode($postParams);
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
	$env = getJDEnv();
	$env->onAfterActions[] = function () use ($url, $postParam) {
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
function api_async($env) {
	api_checkIp();
	$f = $env->mparam("f", "G");
	ApiLog::$instance->batchAc = "async:$f";
	global $allowedAsyncCalls;
	if (!($f && in_array($f, $allowedAsyncCalls) && function_exists($f)))
		jdRet(E_PARAM, "bad async fn: $f");

	putenv("enableAsync=0");
	return call_user_func_array($f, $env->_POST());
}
// }}}

// ====== JDEnv & JDApiBase {{{
class BatchUtil
{
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

// used by JDEnv
trait JDServer
{
	function _GET($key=null, $val=null) {
		return arrayOp($key, $val, $_GET, func_num_args());
	}
	function _POST($key=null, $val=null) {
		return arrayOp($key, $val, $_POST, func_num_args());
	}
	function _SESSION($key=null, $val=null) {
		return arrayOp($key, $val, $_SESSION, func_num_args());
	}
	function _SERVER($key) {
		return arrayOp($key, null, $_SERVER, func_num_args());
	}
	function header($key=null, $val=null) {
		$argc = func_num_args();
		if ($argc <= 1) {
			if ($this->reqHeaders === null) {
				$arr = getallheaders();
				foreach ($arr as $k=>$v) {
					$this->reqHeaders[strtolower($k)] = $v;
				}
			}
			if (is_string($key))
				$key = strtolower($key);
			return arrayOp($key, $val, $this->reqHeaders, $argc);
		}
		header("$key: $val");
	}
	function rawContent() {
		return file_get_contents("php://input");
	}
	function write($data) {
		echo($data);
	}

	function session_start() {
		session_start();
	}
	function session_write_close() {
		session_write_close();
	}
	function session_destroy() {
		session_destroy();
	}
}

class JDEnv
{
	private $apiLog;
	private $apiWatch;
	private $ac;

	use JDServer;

/**
@var env.appName?=user

客户端应用标识，默认为"user". 
根据URL参数"_app"确定值。

@var env.appType

根据应用标识($env->appName)获取应用类型(AppType)。注意：应用标识一般由前端应用通过URL参数"_app"传递给后端。
不同的应用标识可以对应相同的应用类型，如应用标识"emp", "emp2", "emp-adm" 都表示应用类型"emp"，即 应用类型=应用标识自动去除尾部的数字或"-xx"部分。

不同的应用标识会使用不同的cookie名，因而即使用户同时操作多个应用，其session不会相互干扰。
同样的应用类型将以相同的方式登录系统。
 */
	public $appName, $appType;

/*
@var env.clientVer

通过参数`_ver`或useragent字段获取客户端版本号。

@return: {type, ver, str}

- type: "web"-网页客户端; "wx"-微信客户端; "a"-安卓客户端; "ios"-苹果客户端

e.g. {type: "a", ver: 2, str: "a/2"}

 */
	public $clientVer;

	public $perms, $exPerms;

	public $DB, $DBCRED, $DBTYPE;
	public $DBH;

	public $TEST_MODE, $MOCK_MODE, $DBG_LEVEL;

	public $onAfterActions = [];
	private $dbgInfo = [];

	function getAc() {
		return $this->ac;
	}

	function __construct() {
		$this->initEnv();
	}

	private function initEnv() {
		mb_internal_encoding("UTF-8");
		setlocale(LC_ALL, "zh_CN.UTF-8");

		$this->appName = $this->param("_app", "user", "G");
		$this->appType = preg_replace('/(\d+|-\w+)$/', '', $this->appName);
		$this->clientVer = $this->getClientVersion();

		require_once("ext.php");

		$this->TEST_MODE = getenv("P_TEST_MODE")===false? 0: intval(getenv("P_TEST_MODE"));

		$defaultDebugLevel = getenv("P_DEBUG")===false? 0 : intval(getenv("P_DEBUG"));
		$this->DBG_LEVEL = $this->param("_debug/i", $defaultDebugLevel, "G");

		if ($this->TEST_MODE) {
			$this->MOCK_MODE = getenv("P_MOCK_MODE") ?: 0;
		}

		$this->DBTYPE = getenv("P_DBTYPE");
		$this->DB = getenv("P_DB") ?: "localhost/jdcloud";
		$this->DBCRED = getenv("P_DBCRED") ?: "ZGVtbzpkZW1vMTIz"; // base64({user}:{pwd}), default: demo:demo123

		// e.g. P_DB="../carsvc.db"
		if (! $this->DBTYPE) {
			if (preg_match('/\.db$/i', $this->DB)) {
				$this->DBTYPE = "sqlite";
			}
			else {
				$this->DBTYPE = "mysql";
			}
		}

		global $BASE_DIR;
		// optional plugins
		$plugins = "$BASE_DIR/plugin/index.php";
		if (file_exists($plugins))
			include_once($plugins);

		require_once("{$BASE_DIR}/conf.php");
	}

	private function initRequest() {
		$isCLI = isCLI();

		if (! $isCLI) {
			if ($this->TEST_MODE)
				$this->header("X-Daca-Test-Mode", $this->TEST_MODE);
			if ($this->MOCK_MODE)
				$this->header("X-Daca-Mock-Mode", $this->MOCK_MODE);
		}
		// 默认允许跨域
		$origin = $this->_SERVER('HTTP_ORIGIN');
		if (isset($origin) && !$isCLI) {
			$this->header('Access-Control-Allow-Origin', $origin);
			$this->header('Access-Control-Allow-Credentials', 'true');
			$this->header('Access-Control-Expose-Headers', 'X-Daca-Server-Rev, X-Daca-Test-Mode, X-Daca-Mock-Mode');
			
			$val = $this->_SERVER('HTTP_ACCESS_CONTROL_REQUEST_HEADERS');
			if ($val) {
				$this->header('Access-Control-Allow-Headers', $val);
			}
			$val = $this->_SERVER('HTTP_ACCESS_CONTROL_REQUEST_METHOD');
			if ($val) {
				$this->header('Access-Control-Allow-Methods', $val);
			}
		}
		if ($this->_SERVER("REQUEST_METHOD") === "OPTIONS")
			exit();

		if (!$isCLI)
			$this->setupSession();

		if ($this->TEST_MODE) {
			$this->MOCK_MODE = getenv("P_MOCK_MODE") ?: 0;
		}
		// supportJson: 支持POST为json格式
		$ct = getContentType($this);
		if (strstr($ct, "/json") !== false) {
			$content = getHttpInput($this);
			@$arr = jsonDecode($content);
			if (!is_array($arr)) {
				logit("bad json-format body: `$content`");
				jdRet(E_PARAM, "bad json-format body");
			}
			$this->_POST($arr);
		}

		if (! $isCLI) {
			$this->header("Content-Type", "text/plain; charset=UTF-8");
			#header("Content-Type: application/json; charset=UTF-8");
			$this->header("Cache-Control", "no-cache");
		}
		setServerRev($this);

		$ac = $this->param('_ac', null, "G");
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
			$ac = $this->mparam('ac', "G");
		}

		Conf::onApiInit($ac);

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

		return $ac;
	}

	// 返回[code, data, ...]
	function callSvcSafe($ac = null, $useTrans=true)
	{
		global $ERRINFO;
		$ret = [0, null];
		$isUserFmt = false;

		$isDefaultCall = ($ac === null);
		try {
			if ($isDefaultCall) {
				$this->ac = $ac = $this->initRequest();

				$this->dbconn();

				if (! isCLI() && Conf::$enableAutoSession) {
					$this->session_start();
				}

				if (Conf::$enableApiLog)
				{
					$this->apiLog = new ApiLog($this, $ac);
					$this->apiLog->logBefore();
				}
			}

			if ($ac !== "batch") {
				if ($useTrans && ! $this->DBH->inTransaction())
					$this->DBH->beginTransaction();
				$ret[1] = $this->callSvcInt($ac, null, null, false);
			}
			else {
				$batchUseTrans = $this->param("useTrans", false, "G");
				if ($useTrans && $batchUseTrans && !$this->DBH->inTransaction())
					$this->DBH->beginTransaction();
				else
					$useTrans = false;
				$ret = $this->batchCall($batchUseTrans);
			}
		}
		catch (DirectReturn $e) {
			$ret[1] = $e->data;
			$isUserFmt = $e->isUserFmt;
		}
		catch (MyException $e) {
			$ret = [$e->getCode(), $e->getMessage(), $e->internalMsg];
			$this->addLog((string)$e, 9);
		}
		catch (PDOException $e) {
			// SQLSTATE[23000]: Integrity constraint violation: 1451 Cannot delete or update a parent row: a foreign key constraint fails (`jdcloud`.`Obj1`, CONSTRAINT `Obj1_ibfk_1` FOREIGN KEY (`objId`) REFERENCES `Obj` (`id`))",
			$ret = [E_DB, $ERRINFO[E_DB], $e->getMessage()];
			if (preg_match('/a foreign key constraint fails [()]`\w+`.`(\w+)`/', $ret[2], $ms)) {
				$tbl = function_exists("T")? T($ms[1]) : $ms[1]; // T: translate function
				$ret[1] = "`$tbl`表中有数据引用了本记录";
			}
			$this->addLog((string)$e, 9);
		}
		catch (Exception $e) {
			$ret = [E_SERVER, $ERRINFO[E_SERVER], $e->getMessage()];
			$this->addLog((string)$e, 9);
		}

		try {
			if ($useTrans && $this->DBH && $this->DBH->inTransaction())
			{
				if ($ret[0] == 0)
					$this->DBH->commit();
				else
					$this->DBH->rollback();
			}
		}
		catch (Exception $e) {
			logit((string)$e);
		}

		if ($isDefaultCall) {
			$debugLog = getenv("P_DEBUG_LOG") ?: 0;
			if ($debugLog == 1 || ($debugLog == 2 && $ret[0] != 0)) {
				$retStr = $isUserFmt? $ret[1]: jsonEncode($ret);
				$s = 'ac=' . $ac . ', apiLogId=' . ApiLog::$lastId . ', ret=' . $retStr . ", dbgInfo=" . jsonEncode($this->dbgInfo, true);
				logit($s, true, 'debug');
			}
		}
		if ($this->TEST_MODE && count($this->dbgInfo) > 0) {
			foreach ($this->dbgInfo as $e) {
				$ret[] = $e;
			}
		}

		if ($isDefaultCall) {
			$this->echoRet($ret, $isUserFmt);
		}
		else {
			if ($ret[1] instanceof DbExpr) {
				$ret[1] = jsonDecode($ret[1]->val);
			}
		}

		if ($isDefaultCall && $ret[0] == 0) {
			foreach ($this->onAfterActions as $fn) {
				try {
					$fn();
				}
				catch (Exception $e) {
					logit('onAfterActions fails: ' . (string)$e);
				}
			}
			if (! isCLI() && Conf::$enableAutoSession) {
				$this->session_write_close();
			}
		}
		try {
/*
			if ($this->apiWatch)
				$this->apiWatch->postExecute();
*/
			if ($this->apiLog)
				$this->apiLog->logAfter($ret);

			// 及时关闭数据库连接
			$this->DBH = null;
/* NOTE: 暂不处理
			// 删除空会话
			if (isset($_SESSION) && count($_SESSION) == 0) {
				// jd-php框架ApiWatch中设置过lastAccess，则空会话至少有1个key。v5.3不再使用ApiWatch
				// @session_destroy();
				safe_sessionDestroy();
			}
*/
		}
		catch (Exception $e) {
			logit((string)$e);
		}

		return $ret;
	}

	protected function batchCall($useTrans)
	{
		$method = $this->_SERVER("REQUEST_METHOD");
		if ($method !== "POST")
			jdRet(E_PARAM, "batch MUST use `POST' method");

		$calls = $env->_POST();
		if (! is_array($calls))
			jdRet(E_PARAM, "bad batch request");

		$retVal = [];
		$retCode = 0;
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

			$get = BatchUtil::getParams($call, "get", $retVal);
			$post = BatchUtil::getParams($call, "post", $retVal);
			$this->_GET($get);
			$this->_POST($post);
			if ($this->apiLog) {
				$this->apiLog->logBefore1($call["ac"]);
			}

			// 如果batch使用trans, 则单次调用不用trans
			$rv = $this->callSvcSafe($call["ac"], !$useTrans);

			$retCode = $rv[0];
			$retVal[] = $rv;

			if ($this->apiLog) {
				$this->apiLog->logAfter1($rv);
			}

			global $X_RET_STR;
			$X_RET_STR = null;
			$this->dbgInfo = [];
		}
		if ($this->apiLog) {
			$this->apiLog->batchAc = 'batch:' . count($acList) . ',' . join(',', $acList);
		}

		if (! $useTrans)
			$retCode = 0;
		return [$retCode, $retVal];
	}

	private function echoRet($ret, $isUserFmt)
	{
		global $ERRINFO;

		list ($code, $data) = $ret;

		global $X_RET_STR;
		if ($isUserFmt) {
			$X_RET_STR = $data;
			$this->write($X_RET_STR);
			return;
		}

		global $X_RET_FN;
		if (! $data instanceof DbExpr) {
			if (is_callable(@$X_RET_FN) && !$this->param("jdcloud")) {
				$ret1 = $X_RET_FN($ret, $this);
				if ($ret1 === false)
					return;
				if (is_string($ret1)) {
					$X_RET_STR = $ret1;
					$this->write($X_RET_STR . "\n");
					return;
				}
				$ret = $ret1;
			}
			$X_RET_STR = jsonEncode($ret, $this->TEST_MODE);
		}
		else {
			$X_RET_STR = "[" . $code . ", " . $data->val . "]";
		}

		global $X_RET_STR;
		$jsonp = $this->_GET("_jsonp");
		if ($jsonp) {
			if (substr($jsonp,-1) === '=') {
				$this->write($jsonp . $X_RET_STR . ";\n");
			}
			else {
				$this->write($jsonp . "(" . $X_RET_STR . ");\n");
			}
		}
		else {
			$this->write($X_RET_STR . "\n");
		}
	}

	private function getPathInfo()
	{
		$pi = $this->_SERVER("PATH_INFO");
		if ($pi === null) {
			# 支持rewrite后解析pathinfo
			$uri = $this->_SERVER("REQUEST_URI");
			if (strpos($uri, '.php') === false) {
				$uri = preg_replace('/\?.*$/', '', $uri);
				$baseUrl = getBaseUrl(false);

				# uri=/jdy/api/login -> pi=/login
				# uri=/jdy/login -> pi=/login
				if (strpos($uri, $baseUrl) === 0) {
					$script = basename($this->_SERVER("SCRIPT_NAME"), '.php'); // "api"
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
		$method = $this->_SERVER("REQUEST_METHOD");
		$ac = htmlEscape(substr($pathInfo,1));
		// POST /login  (小写开头)
		// GET/POST /Store.add (含.)
		if (!preg_match('/^[A-Z][\w\/]+$/u', $ac))
		{
			if ($method !== 'GET' && $method !== 'POST')
				jdRet(E_PARAM, "bad verb '$method'. use 'GET' or 'POST'");
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
			$env->_GET('id', $id);

		// 非标准CRUD操作，如：GET|POST /Store/123/close 或 /Store/close/123 或 /Store/closeAll
		if (isset($ac)) {
			if ($method !== 'GET' && $method !== 'POST')
				jdRet(E_PARAM, "bad verb '$method' for user function. use 'GET' or 'POST'");
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
				jdRet(E_PARAM, "bad verb '$method' on id: $id");
			$ac = 'add';
			break;

		// PATCH /Store/123
		case 'PATCH':
			if (! isset($id))
				jdRet(E_PARAM, "missing id");
			$ac = 'set';
			//parse_str(file_get_contents("php://input"), $_POST);
			parse_str(getHttpInput($this), $arr);
			$this->_POST($arr);
			break;

		// DELETE /Store/123
		case 'DELETE':
			if (! isset($id))
				jdRet(E_PARAM, "missing id");
			$ac = 'del';
			break;

		default:
			jdRet(E_PARAM, "bad verb '$method'");
		}
		return "{$obj}.{$ac}";
	}

	protected function setupSession()
	{
		# normal: "userid"; testmode: "tuserid"
		$name = $this->appName . "id";
		session_name($name);

		$path = getenv("P_SESSION_DIR") ?: $GLOBALS["BASE_DIR"] . "/session";
		if (!  is_dir($path)) {
			if (! mkdir($path, 0777, true))
				jdRet(E_SERVER, "fail to create session folder: $path");
		}
		if (! is_writeable($path))
			jdRet(E_SERVER, "session folder is NOT writeable: $path");
		session_save_path ($path);

		ini_set("session.cookie_httponly", 1);

		$path = getenv("P_URL_PATH");
		if ($path)
		{
			// e.g. path=/cheguanjia
			ini_set("session.cookie_path", $path);
		}
	}

	function addLog($data, $logLevel=0) {
		if ($this->DBG_LEVEL >= $logLevel)
		{
			$this->dbgInfo[] = $data;
		}
	}

// ====== dbconn {{{
function dbconn($fnConfirm = null)
{
	$DBH = $this->DBH;
	if (isset($DBH))
		return $DBH;

	// 未指定驱动类型，则按 mysql或sqlite 连接
// 	if (! preg_match('/^\w{3,10}:/', $DB)) {
		// e.g. P_DB="../carsvc.db"
		if ($this->DBTYPE == "sqlite") {
			$C = ["sqlite:" . $this->DB, '', ''];
		}
		else if ($this->DBTYPE == "mysql") {
			// e.g. P_DB="115.29.199.210/carsvc"
			// e.g. P_DB="115.29.199.210:3306/carsvc"
			if (! preg_match('/^"?(.*?)(:(\d+))?\/(\w+)"?$/', $this->DB, $ms))
				jdRet(E_SERVER, "bad db=`{$this->DB}`", "未知数据库");
			$dbhost = $ms[1];
			$dbport = $ms[3] ?: 3306;
			$dbname = $ms[4];

			list($dbuser, $dbpwd) = getCred($this->DBCRED); 
			$C = ["mysql:host={$dbhost};dbname={$dbname};port={$dbport}", $dbuser, $dbpwd];
		}
// 	}
// 	else {
// 		list($dbuser, $dbpwd) = getCred($this->DBCRED); 
// 		$C = [$this->DB, $dbuser, $dbpwd];
// 	}

	if ($fnConfirm == null)
		@$fnConfirm = $GLOBALS["dbConfirmFn"];
	if ($fnConfirm && $fnConfirm($C[0]) === false) {
		exit;
	}
	try {
		@$DBH = new JDPDO ($C[0], $C[1], $C[2]);
	}
	catch (PDOException $e) {
		$msg = $this->TEST_MODE ? $e->getMessage() : "dbconn fails";
		logit("dbconn fails: " . $e->getMessage());
		jdRet(E_DB, $msg, "数据库连接失败");
	}
	
	if ($this->DBTYPE == "mysql") {
		++ $DBH->skipLogCnt;
		$DBH->exec('set names utf8mb4');
	}
	$DBH->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); # by default use PDO::ERRMODE_SILENT

	# enable real types (works on mysql after php5.4)
	# require driver mysqlnd (view "PDO driver" by "php -i")
	$DBH->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
	$DBH->setAttribute(PDO::ATTR_STRINGIFY_FETCHES, false);
	$this->DBH = $DBH;
	return $DBH;
}

function dbCommit($doRollback=false)
{
	$DBH = $this->DBH;
	if ($DBH && $DBH->inTransaction())
	{
		if ($doRollback)
			$DBH->rollback();
		else
			$DBH->commit();
		$DBH->beginTransaction();
	}
}

function execOne($sql, $getInsertId = false)
{
	$DBH = $this->dbconn();
	$rv = $DBH->exec($sql);
	if ($getInsertId)
		$rv = (int)$DBH->lastInsertId();
	return $rv;
}

function queryOne($sql, $assoc = false, $cond = null)
{
	$DBH = $this->dbconn();
	if ($cond)
		$sql = genQuery($sql, $cond);
	if (stripos($sql, "limit ") === false && stripos($sql, "for update") === false)
		$sql .= " LIMIT 1";
	$sth = $DBH->query($sql);

	if ($sth === false)
		return false;

	$fetchMode = $assoc? PDO::FETCH_ASSOC: PDO::FETCH_NUM;
	$row = $sth->fetch($fetchMode);
	$sth->closeCursor();
	if ($row !== false && count($row)===1 && !$assoc)
		return $row[0];
	return $row;
}

function queryAll($sql, $assoc = false, $cond = null)
{
	$DBH = $this->dbconn();
	if ($cond)
		$sql = genQuery($sql, $cond);
	$sth = $DBH->query($sql);
	if ($sth === false)
		return false;
	$fetchMode = $assoc? PDO::FETCH_ASSOC: PDO::FETCH_NUM;
	$allRows = [];
	do {
		$rows = $sth->fetchAll($fetchMode);
		$allRows[] = $rows;
	}
	while ($sth->nextRowSet());
	// $sth->closeCursor();
	return count($allRows)>1? $allRows: $allRows[0];
}

function dbInsert($table, $kv)
{
	$keys = '';
	$values = '';
	foreach ($kv as $k=>$v) {
		if (is_null($v))
			continue;
		// ignore non-field param
		if (substr($k,0,2) === "p_")
			continue;
		if ($v === "")
			continue;
		# TODO: check meta
		if (! preg_match('/^\w+$/u', $k))
			jdRet(E_PARAM, "bad key $k");

		if ($keys !== '') {
			$keys .= ", ";
			$values .= ", ";
		}
		$keys .= $k;
		if ($v instanceof DbExpr) { // 直接传SQL表达式
			$values .= $v->val;
		}
		else if (is_array($v)) {
			jdRet(E_PARAM, "dbInsert: array `$k` is not allowed. pls define subobj to use array.", "未定义的子表`$k`");
		}
		else {
			$values .= Q(htmlEscape($v));
		}
	}
	if (strlen($keys) == 0) 
		jdRet(E_PARAM, "no field found to be added: $table");
	$sql = sprintf("INSERT INTO %s (%s) VALUES (%s)", $table, $keys, $values);
#			var_dump($sql);
	return $this->execOne($sql, true);
}

function dbUpdate($table, $kv, $cond)
{
	if ($cond === null)
		jdRet(E_SERVER, "bad cond for update $table");

	$condStr = getQueryCond($cond);
	$kvstr = "";
	foreach ($kv as $k=>$v) {
		if ($k === 'id' || is_null($v))
			continue;
		// ignore non-field param
		if (substr($k,0,2) === "p_")
			continue;
		# TODO: check meta
		if (! preg_match('/^(\w+\.)?\w+$/u', $k))
			jdRet(E_PARAM, "bad key $k");

		if ($kvstr !== '')
			$kvstr .= ", ";

		// 空串或null置空；empty设置空字符串
		if ($v === "" || $v === "null")
			$kvstr .= "$k=null";
		else if ($v === "empty")
			$kvstr .= "$k=''";
		else if ($v instanceof DbExpr) { // 直接传SQL表达式
			$kvstr .= $k . '=' . $v->val;
		}
		else if (startsWith($k, "flag_") || startsWith($k, "prop_"))
		{
			$kvstr .= flag_getExpForSet($k, $v);
		}
		else
			$kvstr .= "$k=" . Q(htmlEscape($v));
	}
	$cnt = 0;
	if (strlen($kvstr) == 0) {
		addLog("no field found to be set: $table");
	}
	else {
		if (isset($condStr))
			$sql = sprintf("UPDATE %s SET %s WHERE %s", $table, $kvstr, $condStr);
		else
			$sql = sprintf("UPDATE %s SET %s", $table, $kvstr);
		$cnt = $this->execOne($sql);
	}
	return $cnt;
}
// }}}

	function callSvcInt($ac, $param=null, $postParam=null, $useTmpEnv=true)
	{
		if ($useTmpEnv) {
			return $this->tmpEnv($param, $postParam, function () use ($ac) {
				return $this->callSvcInt($ac, $param, $postParam, false);
			});
		}

		$fn = "api_$ac";
		if (preg_match('/^([A-Z]\w*)\.([a-z]\w*)$/u', $ac, $ms)) {
			list($tmp, $tbl, $ac1) = $ms;
			$acObj = $this->createAC($tbl, $ac1);
			$ret = $acObj->callSvc($tbl, $ac1, $param, $postParam, false);
		}
		elseif (function_exists($fn)) {
			$ret = $fn($this);
		}
		else {
			jdRet(E_PARAM, "Bad request - unknown ac: {$ac}", "接口不支持");
		}
	//	if (!isset($ret))
	//		$ret = "OK";
		return $ret;
	}

/**
@fn env->tmpEnv($param, $postParam, $fn)

(v5.4) 在指定的GET/POST参数下执行fn函数，执行完后恢复初始环境。
$param或$postParam为null时，与空数组`[]`等价。

示例：

	$param = ["cond" => "createTm>'2019-1-1'];
	$ret = $env->tmpEnv($param, null, function () {
		return callSvcInt("User.query");
	});

示例：用当前参数环境执行：

	$ret = $env->tmpEnv($_GET, $_POST, function () {
		return callSvcInt("User.query");
	});
*/
	function tmpEnv($get, $post, $fn)
	{
		assert(is_null($get)||is_array($get));
		assert(is_null($post)||is_array($post));
		$bak = [
			"get" => $this->_GET(),
			"post" => $this->_POST(),
			"retFn" => $GLOBALS["X_RET_FN"]
		];

		$this->_GET($get ?: []);
		$this->_POST($post ?: []);

		$ret = null;
		$ex = null;
		try {
			$ret = $fn();
		}
		catch (DirectReturn $ex0) {
			if ($ex0->isUserFmt) {
				$ex = $ex0;
			}
			else {
				$ret = $ex0->data;
			}
		}
		catch (Exception $ex1) {
			$ex = $ex1;
		}
		// restore env
		$this->_GET($bak["get"]);
		$this->_POST($bak["post"]);
		$GLOBALS["X_RET_FN"] = $bak["X_RET_FN"];
		
		if ($ex)
			throw $ex;
		return $ret;
	}

/**
@fn env.createAC($tbl, $ac = null, $cls = null) 

如果$cls非空，则按指定AC类创建AC对象。
否则按当前登录类型自动创建AC类（回调onCreateAC）。

特别地，为兼容旧版本，当$cls为true时，按超级管理员权限创建AC类（即检查"AC0_XX"或"AccessControl"类）。

示例：

	$env->createAC("Ordr", "add");
	$env->createAC("Ordr", "add", true);
	$env->createAC("Ordr", null, "AC0_Ordr");

*/
	function createAC($tbl, $ac = null, $cls = null) 
	{
		/*
		if (!hasPerm(AUTH_USER | AUTH_EMP))
		{
			$wx = getWeixinUser();
			$wx->autoLogin();
		}
		 */
		class_exists("AC_$tbl"); // !!! 自动加载文件 AC_{obj}.php
		if (is_string($cls)) {
			if (! class_exists($cls))
				jdRet(E_SERVER, "bad class $cls");
		}
		else if ($cls === true || hasPerm(AUTH_ADMIN))
		{
			$cls = "AC0_$tbl";
			if (! class_exists($cls))
				$cls = "AccessControl";
		}
		else {
			$cls = onCreateAC($tbl);
			if (!isset($cls))
				$cls = "AC_$tbl";
			if (! class_exists($cls))
			{
				// UDT general AC class
				if (substr($tbl, 0, 2) === "U_" && class_exists("AC_U_Obj")) {
					$cls = "AC_U_Obj";
				}
				else {
					$cls = null;
				}
			}
		}
		if ($cls == null)
		{
			$msg = $ac ? "$tbl.$ac": $tbl;
			jdRet(!hasPerm(AUTH_LOGIN)? E_NOAUTH: E_FORBIDDEN, "Operation is not allowed for current user: `$msg`");
		}
		$acObj = new $cls;
		if (!is_a($acObj, "JDApiBase")) {
			jdRet(E_SERVER, "bad AC class `$cls`. MUST extend JDApiBase or AccessControl", "AC类定义错误");
		}
		$acObj->env = $this;
		return $acObj;
	}

	function param($name, $defVal = null, $col = null) {
		return param($name, $defVal, $col, true, $this);
	}

	function mparam($name, $col = null) {
		return mparam($name, $col, $this);
	}

	private function getClientVersion()
	{
		$ver = $this->param("_ver");
		if ($ver != null) {
			$a = explode('/', $ver);
			$ret = [
				"type" => $a[0],
				"ver" => $a[1],
				"str" => $ver
			];
		}
		// Mozilla/5.0 (Linux; U; Android 4.1.1; zh-cn; MI 2S Build/JRO03L) AppleWebKit/533.1 (KHTML, like Gecko)Version/4.0 MQQBrowser/5.4 TBS/025440 Mobile Safari/533.1 MicroMessenger/6.2.5.50_r0e62591.621 NetType/WIFI Language/zh_CN
		else if (preg_match('/MicroMessenger\/([0-9.]+)/', $this->_SERVER("HTTP_USER_AGENT"), $ms)) {
			$ver = $ms[1];
			$ret = [
				"type" => "wx",
				"ver" => $ver,
				"str" => "wx/{$ver}"
			];
		}
		else {
			$ret = [
				"type" => "web",
				"ver" => 0,
				"str" => "web"
			];
		}
		return $ret;
	}
} /* JDEnv */

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

class JDApiBase
{
	public $env;

	function callSvc($tbl, $ac, $param=null, $postParam=null, $useTmpEnv=true)
	{
		if ($useTmpEnv) {
			return $this->env->tmpEnv($param, $postParam, function () use ($tbl, $ac) {
				return $this->callSvc($tbl, $ac, $param, $postParam, false);
			});
		}

		$fn = "api_" . $ac;
		if (! is_callable([$this, $fn]))
			jdRet(E_PARAM, "Bad request - unknown `$tbl` method: `$ac`", "接口不支持");
		return $this->onCallSvc($tbl, $fn);
	}

	protected function onCallSvc($tbl, $fn) {
		$ret = $this->$fn();
		return $ret;
	}
}
#}}}

// ====== main routine {{{
function callSvc($ac=null, $useTrans=true)
{
	$env = getJDEnv();
	return $env->callSvcSafe($ac, $useTrans);
}

if (!isSwoole())
	$X_APP = new JDEnv();
else
	$X_APP = [];

// }}}

// vim: set foldmethod=marker :
