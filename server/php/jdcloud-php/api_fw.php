<?php

error_reporting(E_ALL & ~(E_NOTICE|E_WARNING));

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
 最终返回列为gres参数指定的列加上res参数指定的列; 如果res参数未指定，则只返回gres参数列。(v6.1) 如果指定参数gresHidden=1，gres则不会自动加到最终结果列中。

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

@var retfn 通用URL参数，指定返回样式

筋斗云默认返回样式是`[code, data]`，可通过指定URL参数retfn来修改：

- retfn=obj: 成功返回{code:0,data,debug?}, 失败返回{code:非0,message,debug?}
- retfn=raw: 与下面指定URL参数_raw=1或2相同
- retfn=xml: 字段名与retfn=obj相同，以xml格式返回。

如果需要扩展某种返回样式如xxx1，只需要定义下面函数，然后调用时指定参数`retfn=xxx1`：

	function retfn_xxx1($ret, $env) {}

@var _raw 通用URL参数，只返回内容

如果有URL参数`_raw=1`，则结果不封装为`[code, data]`形式，而是直接返回data. 示例：

	callSvr("Ordr.query", {cond:{id:5}, fmt:"one", _raw: 1});
	或
	callSvr("Ordr.get", {id:5, _raw: 1});
	或
	callSvr("Ordr/5", {_raw: 1});

返回示例：

	{"id": 5, ...}

假如不加`_raw: 1`，则返回`[0, {"id": 5, ...}]`。

如果指定`_raw: 2`，则进一步只返回值，如取订单数：

	callSvr("Ordr", {_raw: 1, fmt:"one", res: "count(*) cnt"});
	和
	callSvr("Ordr", {_raw: 2, fmt:"one", res: "count(*) cnt"});

分别返回

	{"cnt": 275}
	和
	275

如果值有多项，则以tab间隔，如：

	callSvr("Ordr/5", {_raw: 1, res: "status,amount"});
	和
	callSvr("Ordr/5", {_raw: 2, res: "status,amount"});

分别返回：

	{"status": "CR", "amount": "128.00"}
	和
	CR	128.00

常用于在shell脚本中集成，如：

	baseUrl=http://localhost/jdcloud-ganlan/server/api.php
	amount=$(curl "$baseUrl/Ordr/5?_raw=2&res=amount&_app=emp-adm")

或

	read status amount <<< $(curl "$baseUrl/Ordr/5?_raw=2&res=status+amount&_app=emp-adm")

@var _jsonp 通用URL参数，返回函数调用或变量赋值格式

示例：

	http://localhost/p/jdcloud/api.php/Ordr/5?_jsonp=api_OrdrGet
	返回

	api_OrdrGet([0, {"id":5,...}]);

	http://localhost/p/jdcloud/api.php/Ordr/5?_jsonp=api_order%3d
	返回

	api_order=[0, {"id":5,...}];

常用于直接返回JS脚本，示例：

	<script>
	function api_OrdrGet(order)
	{
		console.log(order);
	}
	</script>
	<script src="http://localhost/p/jdcloud/api.php/Ordr/5?_jsonp=api_OrdrGet"></script>

JS示例：

	<script src="http://localhost/p/jdcloud/api.php/Ordr/5?_jsonp=api_order%3d"></script>
	<script>
	console.log(api_order);
	</script>

可以叠加通用URL参数`_raw`:

	http://localhost/p/jdcloud/api.php/Ordr/5?_jsonp=api_OrdrGet&_raw=1
	返回

	api_OrdrGet({"id":5,...});

但不建议使用`_raw`参数，因为如果查询出错（如id不存在）则会返回错误的格式。
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

- 如果接口返回错误, 该回调不执行(DirectReturn返回除外)，除非有dbExpr标识（见下面例子）。
- 此时接口输出已完成，不可再输出内容，否则将导致返回内容错乱。addLog此时也无法输出日志(可以使用logit记日志到文件)
- 此时接口的数据库事务已提交，如果再操作数据库，与之前操作不在同一事务中。
- 若出现异常，只会写日志，不会抛出错误，且所有函数仍会依次执行。

示例: 当创建工单时, **异步**向用户发送通知消息, 且在异步操作中需要查询新创建的工单, 不应立即发送或使用AccessControl的onAfterActions;
因为在异步任务查询新工单时, 可能接口还未执行完, 数据库事务尚未提交, 所以只有放在$env的onAfterActions中才可靠.

注意：如果是batch接口，默认每个子操作接口是独立的（除非指定使用事务即useTrans=1），这时子操作接口失败也不会执行onAfterActions。

如果接口失败也要强制执行，可使用dbExpr把函数包一层，来标识强制执行，示例：

	$env->onAfterActions[] = dbExpr(function () use ($ifLog) {
		logit("write ifLog");
		dbInsert("IfLog", $ifLog);
	});

注意：接口失败时，之前的数据库写操作会被rollback，如果失败时也要写数据库，可将逻辑放在onAfterActions中。

onAfterActions中的函数有一个`$ret`参数，可以获取接口返回数据：

	$env->onAfterActions[] = function ($ret) {
		// $ret符合筋斗云返回格式，$ret[0]是返回值，0表示成功，$ret[1]是返回数据。
		// 由于此时已完成输出，无法通过声明`&$ret`来修改返回数据。
	};

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
	if (!isSwoole())
		return null;
	return $env[Swoole\Coroutine::getcid()];
}

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

- keyfn(key): (v6.1) key和keyfn必须指定一个。与静态匹配key不同，keyfn是一个验证函数，常用于动态查询接口调用时提供的key是否在指定的表中，然后往往动态设置SESSION（见下面basic认证中的例子）。

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
		["authType"=>"basic", "key" => "wms:1234", "SESSION" => ["empId"=>-9000], "allowedAc" => ["Item.*","*.query","*.get"]],
		["authType"=>"basic", "key" => "mes:1235", "SESSION" => ["empId"=>-9001], "allowedAc" => ["*.query"]],  // 可以多个
	];

请求示例：

	curl -u user1:1234 http://localhost/jdcloud/api.php/xxx

注意：若php是基于apache fcgi方式的部署，可能无法收到认证串，可在apache中配置：

	SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1

(v6.1) 如果想动态查询数据库来验证key是否合法，可以使用**keyfn选项**来指定验证函数。示例：

	static $authKeys = [
		// 如果接口使用basic认证，则调用keyfn_appId(key)来检查key是否合法。通过验证后检查接口限制，只允许调用Task对象接口。
		["authType"=>"basic", "keyfn" => "keyfn_appId", "allowedAc" => ["Task.*"] ],
	];

	// 验证key，返回true表示验证成功。然后可动态设置SESSION。
	function keyfn_appId($key) {
		list($user, $pwd) = explode(':', $key);
		$sql = "SELECT id FROM App WHERE code=" . Q($user) . " AND secret=" . Q($pwd);
		$appId = queryOne($sql);
		if ($appId) {
			// 模拟Employee身份，以便接口调用AC2系列类。为了与Employee的id区分，习惯上用负值
			$_SESSION["empId"] = -$appId;
			// 设置会话变量，以便在AC2类中处理
			$_SESSION["appId"] = $appId;
			return true;
		}
	}

simple认证也可以使用keyfn机制。

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
	if (is_null($env->perms) || $exPerms) {
		// 扩展认证登录
		if (count($env->_SESSION) == 0) { // 有session项则不进行认证
			$authTypes = $exPerms;
			foreach (Conf::$authKeys as $e) {
				$t = $e["authType"];
				// 注意去重. 如果未设置allowedAc则不会自动检查权限
				if (is_array($e["allowedAc"]) && !in_array($t, $authTypes))
					$authTypes[] = $t;
			}
			$env->exPerm = null;
			foreach ($authTypes as $e) {
				$fn = Conf::$authHandlers[$e];
				if (! is_callable($fn))
					jdRet(E_SERVER, "unregistered authType `$e`", "未知认证类型`$e`");
				if ($fn($env)) {
					$env->exPerm = $e;
					$env->session_destroy();  // 对于扩展认证，不保存session（即使其中模拟了管理员登录，也不会影响下次调用）
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
		assert(isset($e["key"]) || is_callable($e["keyfn"]), "authKey requires key or keyfn");

		if (isset($e["key"])) {
			// support key as a fn($key)
			$eq = is_callable($key) ? $key($e["key"]): $key == $e["key"];
		}
		else {
			$eq = $e["keyfn"]($key);
		}
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
			$env->_SESSION[$k] = $v;
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
@fn tmCols($fieldName = "t0.tm", $doWeekFix=true)

为查询添加时间维度单位: y,q,m,w,d,wd,h (年，季度，月，周，日，周几，时)。

- wd: 1-7表示周一到周日
- w: 一年中第几周，范围[0,53]。周从周一开始，新年第1周不足4天算第0周（mysql week模式5）。
特别地，如果是年、周统计(gres=y,w)，范围[1,53]，新年第1周不足4天算到上年中，以便跨年时1周是完整的（mysql week模式7）。
若要禁止该逻辑，可设置参数$doWeekFix=false。

示例：

		$this->vcolDefs[] = [ "res" => tmCols() ];
		$this->vcolDefs[] = [ "res" => tmCols("t0.createTm") ];
		$this->vcolDefs[] = [ "res" => tmCols("log_cr.tm"), "require" => "createTm" ];

 */
function tmCols($fieldName = "t0.tm", $doWeekFix = true)
{
	$env = getJDEnv();
	if ($env->DBTYPE == "sqlite") {
		return ["strftime('%Y',{$fieldName}) y", "(strftime('%m',{$fieldName})+2)/3 q", "strftime('%m',{$fieldName}) m", "strftime('%W',{$fieldName}) w", "strftime('%d',{$fieldName}) d", "strftime('%w',{$fieldName}) wd", "strftime('%H',{$fieldName}) h"];
	}
	$ret = ["year({$fieldName}) y", "quarter({$fieldName}) q", "month({$fieldName}) m", "week({$fieldName},5) w", "day({$fieldName}) d", "weekday({$fieldName})+1 wd", "hour({$fieldName}) h"];
	if ($doWeekFix) {
		$gres = param("gres");
/*
- 默认(如y,m,w): year(@tm), month(@tm) m, week(@tm,5) w
- 如果是年、周统计(gres=y,w): if(week(@tm,5)>0, year(@tm), year(@tm)-1) y, week(@tm,7) w

如果gres="y,w"(或"y 年, w 周"这种)，应做修正: 将第0周合并到上年最后1周
*/
		if ($gres && preg_match('/^y( [^,]+)?,\s*w\b/', $gres)) {
			$ret[0] = "if(week({$fieldName},5)>0, year({$fieldName}), year({$fieldName})-1) y";
			$ret[3] = "week({$fieldName},7) w";
		}
	}
	return $ret;
}

/**
@fn sqlCaseWhen($field, $map)

生成SQL的case when语句，示例：

	$CusOrderStatusMap = [
		'CR'=> '待审核',
		'AP'=> '已审核',
		'RE'=> '已签收',
		'CL'=> '已结算'
	];
	$rv = sqlCaseWhen("status", $CusOrderStatusMap);

$rv的值为：

	CASE status WHEN 'CR' THEN '待审核' WHEN 'AP' THEN '已审核' WHEN 'RE' THEN '已签收' WHEN 'RE' THEN '已签收' ELSE status END

*/
function sqlCaseWhen($field, $map)
{
	$ret = "CASE $field ";
	foreach ($map as $k => $v) {
		$ret .= "WHEN " . Q($k) . " THEN " . Q($v) . " ";
	}
	$ret .= "ELSE $field END";
	return $ret;
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
@var ConfBase::$enableApiLog?=1

- 0: 不记录
- 1: 接口进入时记录、完成时更新
- 2: 只记出错(可在运行中再修改值)
- 3或其它: 接口完成时记录(可在运行中再修改值)

设置为0可关闭ApiLog. 例：

	static $enableApiLog = 0;

设置为2表示只在出错时记录日志，而且允许在程序中动态再改为其它值。
例如某轮询接口Cmd.query，默认只记录错误，但若返回结果非空，也记录日志：

	// class Conf
	static function onApiInit(&$ac)
	{
		if ($ac == "Cmd.query") {
			self::$enableApiLog = 2;
		}
	}

	// 当想要记录时，直接修改：
	Conf::$enableApiLog = 1;

注意当值为1时，会在接口进入前就记录，进口完成时再更新，在接口中再动态改为0或2是无效的；
其它值时，只会在接口完成时记录日志（这也意味着记录顺序与发生时间可能不一致），允许在接口中再动态修改值改为0或1。
 */
	static $enableApiLog = 1;

/**
@var ConfBase::$enableObjLog?=1

设置为0可关闭ObjLog. 例：

	static $enableObjLog = 0;
 */
	static $enableObjLog = 1;

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
	
@key 单点登录(SSO)

@alias 第三方认证

通常设计为打开筋斗云前端应用时，通过传入url参数token，在初始化时调用接口`initClient{token: "xxxx"}`。
后端Conf.onInitClient在使用token去第三方获取用户信息后，在接口返回数据中包含userInfo字段即用户信息(如userInfo字段)即可。
例如内嵌应用:

	<iframe id="ifr" src="https://myserver.com/jdcloud/web/store.html?token=test123" width="100%" height="80%"></iframe>

内层应用前端处理示例：

	function main()
	{
		...
		WUI.initClient({token: g_args.token}); // 添加token参数
	}

后端处理示例：

	// class Conf
	static function onInitClient(&$ret)
	{
		$token = param("token");
		if ($token) {
			$_SESSION["empId"] = 1; // TO DO: 通过token从第三方获取用户信息并保存到Employee表
			$ret["userInfo"] = callSvcInt("Employee.get");
		}
	}

另外，通过iframe内嵌筋斗云应用时，如果内外层url不是同一个站（如y1.xx.com:8080与y2.xx.com是同站，不看端口），即跨站时，
内层应用会出现登录后，仍是未登录状态的情况，这是因为受跨站限制，每次请求时cookie无法保持。
解决方法只能内层应用须使用https协议，且后端server/.htaccess文件中添加SameSite配置：

	header edit Set-Cookie $ ";Secure;SameSite=None"

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

	private $id;

	// for batch detail (ApiLog1)
	private $req1;
	public $batchAc; // new ac for batch
	public $updateLog; // 可定制ApiLog记录

	public $logReqLen = 2000;
	public $logResLen = 200;
	public $logResErrLen = 2000;

/**
@var ApiLog::$lastId

取当前调用的ApiLog编号。
*/
	static $lastId;
/**
@var ApiLog::$instance

e.g. 修改ApiLog要记录的ac:

	@ApiLog::$instance->batchAc = "async:$f";

加@抑制错误, 因为当Conf::enableApiLog=0时不记录ApiLog, 此时$instance为空会出现报警或错误.

(v6.1) 可定制ApiLog记录，比如att接口中可指定

	@ApiLog::$instance->updateLog = ["res"=>"1.jpg", "ressz" => filesize("1.jpg")];

ApiLog中, req字段会记录url请求参数和post请求参数各2000字节;
res字段会记录返回数据200字节(出错时记录2000字节). 
必要时可以对某个webapi记录多一些返回内容, 可以在api实现中指定:

	@ApiLog::$instance->logResLen = 2000; // res最多记录2000
	(还有logReqLen和logResErrLen对应req记录和res出错记录, 默认都是2000)

*/
	static $instance;

	function __construct($env) 
	{
		$this->env = $env;
	}

	private function myVarExport($var, $maxLength=200)
	{
		if (is_string($var)) {
			$var = preg_replace('/\s+/', " ", $var);
			if ($maxLength > 0 && strlen($var) > $maxLength)
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
			if ($maxLength > 0 && $len >= $maxLength) {
				$s .= "$k=...";
				break;
			}
			else if ($k == "pwd" || $k == "oldpwd") {
				$v = "?";
			}
			else if (! is_scalar($v)) {
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
		$userId = $env->_SESSION["empId"] ?: $env->_SESSION["uid"] ?: $env->_SESSION["adminId"];
		$this->userId = $userId;
		return $userId;
	}

	protected $log;
	function logBefore()
	{
		$env = $this->env;

		$content = $this->myVarExport($env->_GET, $this->logReqLen);
		$ct = getContentType($env);
		if (! ($ct && preg_match('/x-www-form-urlencoded|form-data/i', $ct))) {
			$post = getHttpInput($env);
			$content2 = $this->myVarExport($post, $this->logReqLen);
		}
		else {
			$content2 = $this->myVarExport($env->_POST, $this->logReqLen);
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

		$this->log = [
			"tm" => date(FMT_DT),
			"addr" => $remoteAddr,
			"ua" => $ua,
			"app" => $env->appName,
			"ses" => session_id(),
			"userId" => $this->getUserId(),
			"ac" => $env->getAc(true),
			"req" => dbExpr(Q($content, $env)),
			"reqsz" => $reqsz,
			"ver" => $ver["str"],
			"serverRev" => $GLOBALS["SERVER_REV"]
		];
		if (Conf::$enableApiLog == 1) {
			++ $env->DBH->skipLogCnt;
			$this->id = $env->dbInsert("ApiLog", $this->log);
		}
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
		// 不记日志的情况
		if (!$this->id && (Conf::$enableApiLog == 0 || (Conf::$enableApiLog == 2 && $ret[0] == 0)))
			return;
		// 注意：ApiLog记录时间t是从接收请求而不是实际处理(startTm)开始, 所以upload类接口会比较长; 而ApiLog1中记录中的t是从当前调用的实际时间开始(startTm1)
		$t = $this->env->getT(2);
		$iv = sprintf("%.0f", $t * 1000); // ms
		if ($X_RET_STR == null)
			$X_RET_STR = jsonEncode($ret, $env->TEST_MODE);
		$logLen = $ret[0] !== 0? $this->logResErrLen: $this->logResLen;
		$content = $this->myVarExport($X_RET_STR, $logLen);
		$batchAc = $this->batchAc;
		if ($batchAc && mb_strlen($this->batchAc)>50) {
			$batchAc = mb_substr($this->batchAc, 0, 50);
		}

		$data = [
			"t" => $iv,
			"retval" => $ret[0],
			"ressz" => strlen($X_RET_STR),
			"res" => dbExpr(Q($content, $env)),
			"userId" => $this->userId ?: $this->getUserId(),
			"ac" => $batchAc ?: $this->log["ac"] // batchAc默认为null；对batch调用则列出详情
		];
		if ($this->updateLog)
			$data = $this->updateLog + $data;

		arrCopy($this->log, $data);
		++ $env->DBH->skipLogCnt;
		if ($this->id) {
			$rv = $env->dbUpdate("ApiLog", $data, $this->id);
		}
		else {
			$this->id = $env->dbInsert("ApiLog", $this->log);
			self::$lastId = $this->id;
		}
		if ($t > getConf("conf_slowApiTime")) {
			$ac = $batchAc ?: $this->log["ac"];
			$t1 = round($t, 2);
			logit("slow api call #{$this->id}: $ac, time={$t1}s", true, "slow");
		}
// 		$logStr = "=== id={$this->logId} t={$iv} >>>$content<<<\n";
	}

	function logBefore1()
	{
		$env = $this->env;
		$this->req1 = $this->myVarExport($env->_GET, 2000);
		$content2 = $this->myVarExport($env->_POST, 2000);
		if ($content2 != "")
			$this->req1 .= ";\n" . $content2;
	}

	function logAfter1($ret)
	{
		$env = $this->env;
		if ($env->DBH == null)
			return;
		$iv = sprintf("%.0f", $env->getT(1) * 1000); // ms
		$res = jsonEncode($ret, $env->TEST_MODE);
		$logLen = $ret[0] !== 0? 2000: 200;
		$content = $this->myVarExport($res, $logLen);

		++ $env->DBH->skipLogCnt;
		$apiLog1Id = $env->dbInsert("ApiLog1", [
			"apiLogId" => $this->id,
			"ac" => $env->getAc1(),
			"t" => $iv,
			"retval" => $ret[0],
			"req" => dbExpr(Q($this->req1, $env)),
			"res" => dbExpr(Q($content, $env))
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
			return;
			// jdRet(E_SERVER, "duplicated plugin `$pname': $file");
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
		$env->_GET["res"] = "id, score, dscr, tm, orderDscr";

		// 相当于AccessControl框架中调用 addCond，用Obj.query接口的内部参数cond2以保证用户还可以使用cond参数。
		$env->_GET["cond2"] = dbExpr("o.storeId=$storeId"); 

		// 定死排序条件
		$env->_GET["orderby"] = "tm DESC";

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

@see callSvcInt
@see callSvc
 */

function tableCRUD($ac1, $tbl, $asAdmin = false)
{
	$acObj = getJDEnv()->createAC($tbl, $ac1, $asAdmin);
	return $acObj->callSvc($tbl, $ac1);
}

/**
@fn setParam($k, $v=null)

(v6) 已废弃。只用于兼容。用$_GET[$k]=$v替代。

	setParam("id", 100);
	// 或一次设置多个
	setParam(["id"=>100, "name"=>"name1"]);

*/
function setParam($k, $v=null) {
	if (is_array($k)) {
		foreach ($k as $k1 => $v1) {
			$_GET[$k1] = $v1;
		}
	}
	else {
		$_GET[$k] = $v;
	}
}

/**
@fn callSvcInt($ac, $param=null, $postParam=null, $useTmpEnv=true)

内部调用另一接口，获得返回值。
内部若有异常会抛上来，特别地，调用`jdRet(0)`会当成正常调用不会抛出异常，而`jdRet()`（用于自定义输出内容）仍会抛出异常。

与callSvc不同的是，它不处理事务、不写ApiLog，不输出数据，更轻量。
由于不处理事务，它只应在接口实现内部使用。包含api.php后调用接口应使用callSvc.

示例：

	$vendorId = callSvcInt("Vendor.add", null, [
		"name" => $params["vendorName"],
		"tel" => $params["vendorPhone"]
	]);

默认useTmpEnv=true时，它在独立环境中执行，不会影响当前环境的$_GET, $_POST参数，
如果指定参数useTmpEnv=false，则$param或$postParam参数将直接覆盖当前环境的$_GET, $_POST参数。

如果未指定$param或$postParam参数，默认值为空数组即没有参数。

(v5.4) 上面例子会自动根据当前用户角色来选择AC类，还可以直接指定使用哪个AC类来调用，如：

	$acObj = new AC2_Vendor();
	$vendorId = $acObj->callSvc("Vendor", "add", null, [
		"name" => $params["vendorName"],
		"tel" => $params["vendorPhone"]
	]);

注意请自行确保AC类对当前角色兼容性，如用户角色调用了管理员的AC类，就可能出问题。

示例：直接用当前的get/post参数执行，允许内部修改当前环境：

	$vendorId = callSvcInt("Vendor.add", $_GET, $_POST, false); // 经典环境下可用
	或
	$vendorId = callSvcInt("Vendor.add", $env->_GET, $env->_POST, false);

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

function getContentType($env = null)
{
	if ($env === null)
		$env = getJDEnv();
	$ct = $env->contentType;
	if ($ct == null) {
		$ct = $env->_SERVER("HTTP_CONTENT_TYPE") ?: $env->_SERVER("CONTENT_TYPE");
		$env->contentType = $ct;
	}
	return $ct;
}

/**
@fn getHttpInput(env?)

取用户请求的内容。如果是urlencoded或json格式，系统会自动解码到$_POST中，其它格式须应用自行处理。

注意：
应用应使用getHttpInput()而不是file_get_contents("php://input") 来取原始输入。
因为为参数加密状态下(xparam特性)，两者是不同的，getHttpInput()返回才是正确的。

*/
function getHttpInput($env = null)
{
	if ($env === null)
		$env = getJDEnv();
	$content = $env->rawContent;
	if ($content == null) {
		$ct = getContentType($env);
		$content = $env->rawContent();
		if ($ct && preg_match('/charset=([\w-]+)/i', $ct, $ms)) {
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
		logit("warn: ignore $name as Conf::\$enableApiLog=0");
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

示例：调用自身服务，可使用相对路径：

	httpCallAsync("/jdcloud/api.php?ac=async&f=sendSms", [
		"phone" => "13712345678",
		"msg" => "验证码为1234"
	]);

未指定主机时，固定连接127.0.0.1:80，若其它端口可在conf.user.php中配置:

	$GLOBALS["conf_httpCallAsyncPort"] = 8080;

目前内部callAsync/callSvcAsync会用到它。

调用其它系统可指定完整URL，支持http或https：

	httpCallAsync("http://127.0.0.1:8081/setTimeout", [
		"url" => "http://127.0.0.1/jdcloud/api.php/hello",
	]);

TODO: 如果给定postParams，目前content-type固定使用application/json. 且不支持指定headers.
*/
function httpCallAsync($url, $postParams = null)
{
	$host = '127.0.0.1';
	$port = $GLOBALS["conf_httpCallAsyncPort"]; // 不要试图用$_SERVER["PORT"], 当用https访问时还是拿不到端口号
	$isSsl = false;
	$rv = parse_url($url);
	if (isset($rv['scheme'])) {
		// localhost往往被解析为ipv6地址(::1)，而某些服务可能未监听该地址；用默认的"127.0.0.1"兼容性更好
		$host = $rv['host'];
		if ($host == 'localhost')
			$host = '127.0.0.1';
		if ($rv['scheme'] == 'http') {
			$port = @$rv['port'] ?: 80;
		}
		else if ($rv['scheme'] == 'https') {
			$port = @$rv['port'] ?: 443;
			$isSsl = true;
		}
	}
	$addr = $isSsl? ('ssl://' . $host): $host;
	logext("httpCallAsync: $url ($addr:$port)");

	@$fp = fsockopen($addr, $port, $errno, $errstr, 3);
	if (!$fp) {
		logit("httpCallAsync error $errno: url=$url, $errstr");
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
@fn callAsync($ac, $params, $opt={wait, cron, code})

异步调用某个内部函数。

异步调用的原理是通过调用callSvcAsync函数，在当前接口执行完成后，发起一个async接口调用并立即返回。
然后在async接口中正常同步调用指定的内部函数。

与直接调用callSvcAsync相比，使用callAsync更简单，不必将函数封装为外部接口，只需要在`$allowedAsyncCalls`中注册即可被外部调用。

示例：让一个同步调用变成支持异步调用，以sendSms为例

	// 1. 设置已注册的异步调用函数。建议在api.php中设置。
	$allowedAsyncCalls = ["sendSms"];

	function sendSms($phone, $msg) {
		// 同步调用
		return httpCall("...");
	}

	// 2. 异步调用
	return callAsync('sendSms', [$phone, $msg]); // 参数

注意：

- 由于要被外部调用，须生成完整URL地址；如果部署时使用反向代理等机制，可能URL不正确，这时应设置P_BASE_URL，详见[getBaseUrl]。
- 如果指定了等待时间opt.wait(毫秒)，表示在opt.wait豪秒后执行。此时必须连接jdserver做任务调度，须配置conf_jdserverUrl和conf_jdserverBackUrl，详见[callSvcAsync]。
 opt.cron和opt.code参数用于设置周期性任务。详见[jdserver]的setTimeout接口。
- 安全性：调用async接口的服务器IP，如果不是本机，须配置加入白名单(whiteIpList)，详见[api_async]。

@see callSvcAsync
@see api_async
@see jdserver
*/
function callAsync($ac, $param, $opt = null) {
	callSvcAsync("async", ["f"=>$ac], $param, $opt);
}

/**
@fn callSvcAsync($ac, $urlParam, $postParams=null, $opt={wait, cron, code, disabled})

在当前事务执行完后，调用指定接口并立即返回（不等服务器输出数据）。一般用于各种异步通知。
示例：

	// 支持调用自己
	callSvcAsync("sendMail", ["type"=>"Issue", "id"=>100]);
	// 自动以getBaseUrl来补全url

	// 支持调用外部http或https, 将ac直接当成url
	callSvcAsync("http://localhost:8080/pdi/api/sendMail", ["type"=>"Issue", "id"=>100]);
	callSvcAsync("https://oliveche.com/pdi/api/sendMail", ["type"=>"Issue", "id"=>100]);

通过opt可以设置延迟执行或周期性循环执行的任务，它须通过jdserver中间件实现。
须设置[conf_jdserverUrl]和[conf_jdserverBackUrl]。

## 延迟执行任务

如果指定了等待时间opt.wait，表示在opt.wait毫秒后执行。示例：30秒后发送邮件：

	$wait = 30000;
	callSvcAsync("sendMail", ["type"=>"Issue", "id"=>100], null, ['wait'=>$wait]);

此时必须连接jdserver做任务调度。

## 周期性任务

cron和code参数用于添加周期性执行的任务，可以与wait合用。详见[jdserver]的setTimeout接口。

示例：添加每30秒执行一次的周期任务：

	$wait = 30000;
	callSvcAsync("sendMail", ["type"=>"Issue", "id"=>100], null, ['wait'=>$wait, 'cron'=>1, 'code'=>'app1-task-1']);

callSvcAsync使用异步调用，只管连通，不管对方是非处理成功。如果是同步调用，可使用callJdserver:

	callJdserver("setTimeout", null, [
		'url' => makeUrl('sendMail', ["type"=>"Issue", "id"=>100], null, true) // 默认为内部接口生成相对路径，此处是供外部调用，加第4参数true表示生成完整路径
		'wait' => $wait,
		'cron' => 1,
		'code' => 'app1-task-1'
	]);

示例：添加周一到周五9:00-18:00间每30秒执行一次的周期任务：

	$wait = 30000;
	callSvcAsync("sendMail", ["type"=>"Issue", "id"=>100], null, ['wait'=>$wait, 'cron'=>'0 9-18 * * 1-5', 'code'=>'app1-task-2']);

每晚1:00执行：

	callSvcAsync("sendMail", ["type"=>"Issue", "id"=>100], null, ['cron'=>'0 1 * * *', 'code'=>'app1-task-2']);

上面指定opt.code参数用于后期修改或删除任务，必须为`{应用}-{对象}-{标识}`结构，删除周期任务示例：

	callJdserver('Timer.del', ['code'=>'app1-task-1']);

@see callJdserver

@key conf_jdserverUrl jdserver地址
@key conf_jdserverBackUrl jdserver回调地址，本系统被jdserver调用的地址

jdserver用于消息推送和任务调度, 是独立运行的守护进程, 提供websocket和http调用接口。
jdcloud后端会用到jdserver的http接口，比如`http://127.0.0.1:8081/setTimeout`。

习惯上会在Apache上配置代理路径'/jdserver'，
即通过访问`http://{server}/jdserver/setTimeout`达到相同效果，并可以支持https/wss协议连接。

jdserver默认路径配置为`http://127.0.0.1/jdserver`，通过本机Apache服务代理，端口80。
如连其它服务器请修改配置，在conf.user.php中，示例：

	$conf_jdserverUrl = "https://oliveche.com/jdserver";  // 路径带jdserver的是经代理的; 经公网最好走https
	// $conf_jdserverUrl = "http://192.168.1.14:8081"; // 这种是直接连原始服务器

jdserver回调地址指的是jdserver调用本系统接口的地址，比如和jdserver在同一台机器，可以设置：

	$conf_jdserverBackUrl = "http://127.0.0.1/jdcloud/api.php";

又如在开发环境内网中，通过ssh隧道将web服务以8081端口代理到jdserver所在服务器线上，则可设置回调

	$conf_jdserverBackUrl = "http://localhost:8081/asyncTask/server/api.php";

注意，由于是代理到了jdserver所在服务器，所以此处localhost其实指的是jdserver所在服务器。

注意：如果是调用了callAsync函数实现回调内部函数，它内部是通过jdserver回调async接口实现的，
而async接口要求调用方（非本机调用）在IP白名单内，所以非本机调用情况下，还应设置IP白名单才可以回调成功。
*/
function callSvcAsync($ac, $urlParam, $postParam = null, $opt = null) {
	if ($opt['wait'] > 0 || $opt['cron']) {
		$url = getConf('conf_jdserverBackUrl') . '/' . $ac;
		$post = [
			'url' => makeUrl($url, $urlParam),
			'wait' => $opt['wait'],
			'cron' => $opt['cron'],
			'code' => $opt['code'],
			'disabled' => $opt['disabled'],
		];
		if ($postParam) {
			$post += [
				'data' => jsonEncode($postParam),
				'headers' => [
					'Content-Type: application/json',
				]
			];
		}
		callSvcAsync(getConf("conf_jdserverUrl") . '/setTimeout', null, $post);
		return;
	}
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

调用实际函数前会设置环境变量：enableAsync=0。

@see whiteIpList
*/
function api_async($env) {
	api_checkIp();
	$f = $env->mparam("f", "G");
	ApiLog::$instance->batchAc = "async:$f";
	global $allowedAsyncCalls;
	if (!$allowedAsyncCalls)
		jdRet(E_SERVER, "global array allowedAsyncCalls no defined");
	if (!($f && in_array($f, $allowedAsyncCalls) && function_exists($f)))
		jdRet(E_PARAM, "bad async fn: $f");

	putenv("enableAsync=0");
	return call_user_func_array($f, $env->_POST);
}

/**
@fn jdPush($app, $msg, $user='*')

借助jdserver实时推送消息到websocket。须配置conf_jdserverUrl。

前端可直接通过jdserver调用push接口，给其它客户端发消息，示例：

	callSvr("/jdserver/push", $.noop, {
		app: "app1",
		// user: "*", // 不指定user默认使用群发
		msg: {
			ac: "msg1",
			data: "hello"
		}
	});

详见前端文档[jdPush].

@see $conf_jdserverUrl 
*/
function jdPush($app, $msg, $user='*') {
	$url = getConf("conf_jdserverUrl") . '/push';
	callSvcAsync($url, null, [
		"app" => $app,
		"user" => $user,
		"msg" => $msg
	]);
}

/**
@fn callJdserver($ac, $param=null, $postParam=null, $async=false)

调用jdserver的接口。示例：

	callJdserver('Timer.set', ['code'=>'asynctask-task-1'], [
		'cron' => '0 1 * * *'
	]);

如果指定参数async=true，则在当前接口程序完成后，发起异步调用，若出错将只记日志不报错。

@see $conf_jdserverUrl 
*/
function callJdserver($ac, $param=null, $postParam=null, $async=false) {
	$url = makeUrl(getConf('conf_jdserverUrl') . '/' . $ac, $param);
	if ($async) {
		callSvcAsync($url, null, $postParam);
		return;
	}
	$rvstr = httpCall($url, $postParam);
	$rv = jsonDecode($rvstr);
	if (!is_array($rv))
		jdRet(E_SERVER, 'call jdserver fail: '.$rvstr, '调用jdserver失败: 协议错误');
	if ($rv[0] != 0)
		jdRet(E_SERVER, 'call jdserver fail: '.$rvstr, '调用jdserver失败: ' . $rv[1] . ($rv[2]? '(' . $rv[2] . ')': ''));
	return $rv[1];
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
			unset($v);
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
trait JDEnvBase
{
	public $_GET, $_POST, $_SESSION, $_FILES;

	function _SERVER($key) {
		return $_SERVER[$key];
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
			if ($argc == 0)
				return $this->reqHeaders();

			$key = strtolower($key);
			return $this->reqHeaders[$key];
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
		$this->_SESSION = &$_SESSION;
	}
	function session_write_close() {
		session_write_close();
	}
	function session_destroy() {
		session_destroy();
	}
}

class JDEnv extends DBEnv
{
	private $apiLog;
	private $apiWatch;

	// $ac是主调用名，如果是"batch"，则当前调用名存在$ac1中。通过getAc()/getAc1()获取。
	protected $ac, $ac1;

	use JDEnvBase;

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
	public $startTm;
	public $startTm1; // 当前调用的开始时间，一般与startTm相同，如果是batch则为子调用的开始时间。

/*
@var env.clientVer

通过参数`_ver`或useragent字段获取客户端版本号。

@return: {type, ver, str}

- type: "web"-网页客户端; "wx"-微信客户端; "a"-安卓客户端; "ios"-苹果客户端

e.g. {type: "a", ver: 2, str: "a/2"}

 */
	public $clientVer;

	public $perms, $exPerms;

	public $onBeforeActions = [];
	public $onAfterActions = [];
	private $dbgInfo = [];

/**
@fn env.getAc($wantBatch=false)

取当前调用名。
如果是batch调用，则返回当前子调用名。

如果指定参数wantBatch=true, 则batch调用直接返回"batch"，此时可以用env.getAc1()返回子调用名。
*/
	function getAc($wantBatch=false) {
		if ($wantBatch)
			return $this->ac;
		return $this->ac1 ?: $this->ac;
	}
	function getAc1() {
		return $this->ac1;
	}

/**
@fn env.getT($type = 2)

取处理时间(秒).

- type: 0-从脚本处理开始, 
	1-从当前调用开始(当有多个接口调用或batch子调用时和type=0不同), 
	2(默认)-从请求开始(upload等接口请求时间较长时与type=0差异较大)

@var env.startTm  Env创建时间
@var env.startTm1  当前调用开始时间
*/
	function getT($type = 2) {
		if ($type == 0) {
			$t0 = $this->startTm;
		}
		else if ($type == 1) {
			$t0 = $this->startTm1;
		}
		else {
			$t0 = ($this->_SERVER("REQUEST_TIME_FLOAT") ?: $this->startTm);
		}
		return microtime(true) - $t0;
	}

	function __construct() {
		parent::__construct();
		$this->startTm = microtime(true);

		$this->onBeforeActions[] = function () {
			$xp = $this->_GET["xp"];
			if ($xp && $xp != '1') { // xp=1只是标识，忽略即可
				$param = b64d($xp, true);
				if ($param === false) {
					logit("error: bad url xparam $xp");
					jdRet(E_PARAM, "bad url xparam");
				}
				parse_str($param, $this->_GET);
			}

			$ct = getContentType($this);
			if ($ct && strpos($ct, ';xparam=1') !== false) {
				$postData = getHttpInput($this);
				if ($postData) {
					$this->rawContent = b64d($postData, true);
					if ($this->rawContent === false) {
						logit("error: bad post xparam $postData");
						jdRet(E_PARAM, "bad post xparam");
					}
					if (stripos($ct, 'x-www-form-urlencoded') != false) {
						parse_str($this->rawContent, $this->_POST);
					}
				}
			}
		};
	}
	function __destruct() {
		if ($this->DEBUG_LOG == 1 && $this->dbgInfo) {
			logit($this->dbgInfo, true, "debug");
		}
	}

	private function initRequest(&$ac) {
		if ($this->TEST_MODE)
			$this->header("X-Daca-Test-Mode", $this->TEST_MODE);
		if ($this->MOCK_MODE)
			$this->header("X-Daca-Mock-Mode", $this->MOCK_MODE);
		// 默认允许跨域
		$origin = $this->_SERVER('HTTP_ORIGIN');
		if (isset($origin)) {
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
		$method = $this->_SERVER("REQUEST_METHOD");
		if ($method === "OPTIONS" || $method === "HEAD")
			exit();

		// supportJson: 支持POST为json格式
		$ct = getContentType($this);
		if ($ct && strstr($ct, "/json") !== false && $method != "GET") {
			$content = getHttpInput($this);
			@$arr = jsonDecode($content);
			if (!is_array($arr)) {
				logit("bad json-format body: `$content`");
				jdRet(E_PARAM, "bad json-format body");
			}
			$this->_POST = $arr;
		}

		$this->header("Content-Type", "text/plain; charset=UTF-8");  // "application/json; charset=UTF-8"
		$this->header("Cache-Control", "no-cache");
		$ver = $GLOBALS["SERVER_REV"];
		if ($ver)
			$this->header("X-Daca-Server-Rev", $ver);
		$this->header("X-Powered-By", getConf("conf_poweredBy"));

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
		if (! $ac) {
			$ac = $this->mparam('ac', "G");
			$ac = $this->parseRestfulUrl($ac);
		}

		if ($ac == "UiCfg.script") {
			Conf::$enableAutoSession = false;
		}
		Conf::onApiInit($ac);

	/*
			// API调用监控
			$this->apiWatch = new ApiWatch($ac);
			$this->apiWatch->execute();
	*/
		if (Conf::$enableSecure) {
			if (!BlackList::isWhiteReq() && (BlackList::isBlackReq() || Conf::checkSecure($ac) === false)) {
				jdRet(null, [E_FORBIDDEN, "OK"]);
			}
		}
	}

	private $doInitEnv = true;
	// 返回[code, data, ...]
	function callSvcSafe($ac = null, $useTrans=true, $isSubCall = false, $apiFn = null)
	{
		global $ERRINFO;
		$ret = [0, null];
		$isUserFmt = false;

		$isDefaultCall = ($ac === null);
		$this->startTm1 = microtime(true);
		$isCLI = isCLI();
		if ($isCLI || $isSubCall)
			assert($ac != null);

		$ok = false; // commit or rollback trans
		try {
			if (!$isSubCall) {
				if (!isset($this->_GET)) {
					$this->_GET = &$_GET;
					$this->_POST = &$_POST;
					$this->_SESSION = &$_SESSION;
					$this->_FILES = &$_FILES;
				}
				// onBeforeActions中允许根据参数重设GET/POST等环境
				foreach ($this->onBeforeActions as $fn) {
					$fn();
				}

				// NOTE: 须在setupSession之前设置appType
				$this->appName = $this->param("_app", "user", "G");
				$this->appType = preg_replace('/(\d+|-\w+)$/', '', $this->appName);

				if ($this->doInitEnv) {
					$this->doInitEnv = false;
					if (!$isCLI)
						$this->setupSession();

					global $BASE_DIR;
					// optional plugins
					$plugins = "$BASE_DIR/plugin/index.php";
					if (file_exists($plugins))
						include_once($plugins);
					if (!class_exists("Conf"))
						require_once("{$BASE_DIR}/conf.php");

					$this->clientVer = $this->getClientVersion();
					setServerRev($this);
				}

				if ($isDefaultCall && !$isCLI) {
					$this->initRequest($ac);
				}
				$this->ac = $ac;

				$this->dbconn();

				if (! $isCLI && Conf::$enableAutoSession) {
					$this->session_start();
				}

				if (Conf::$enableApiLog && $this->DBH)
				{
					$this->apiLog = new ApiLog($this);
					$this->apiLog->logBefore();
				}
			}

			if ($ac !== "batch") {
				if ($useTrans && $this->DBH && ! $this->DBH->inTransaction())
					$this->DBH->beginTransaction();
				if (! $apiFn) {
					$ret[1] = $this->callSvcInt($ac, $this->_GET, $this->_POST, false);
				}
				else {
					$ret[1] = $apiFn();
				}
				$ok = true;
			}
			else {
				$batchUseTrans = $this->param("useTrans", false, "G");
				if ($useTrans && $batchUseTrans && !$this->DBH->inTransaction())
					$this->DBH->beginTransaction();
				else
					$useTrans = false;
				$ret[1] = $this->batchCall($batchUseTrans, $ok);
			}
		}
		catch (DirectReturn $e) {
			$ok = true;
			$ret[1] = $e->data;
			$isUserFmt = $e->isUserFmt;
		}
		catch (MyException $e) {
			$ret = [$e->getCode(), $e->getMessage(), $e->internalMsg];
			if ($e->getCode() == E_AUTHFAIL) {
				logit("fail to call `$ac`: " . $e->getMessage() . ' (' . $e->internalMsg . ')');
			}
			else if (!in_array($e->getCode(), [E_NOAUTH, E_ABORT])) {
				logit("fail to call `$ac`: $e");
			}
		}
		catch (PDOException $e) {
			// SQLSTATE[23000]: Integrity constraint violation: 1451 Cannot delete or update a parent row: a foreign key constraint fails (`jdcloud`.`Obj1`, CONSTRAINT `Obj1_ibfk_1` FOREIGN KEY (`objId`) REFERENCES `Obj` (`id`))",
			$ret = [E_DB, $ERRINFO[E_DB], $e->getMessage()];
			if (preg_match('/a foreign key constraint fails [()]`\w+`.`(\w+)`/', $ret[2], $ms)) {
				$tbl = function_exists("T")? T($ms[1]) : $ms[1]; // T: translate function
				$ret[1] = "`$tbl`表中有数据引用了本记录";
			}
			logit("fail to call `$ac`: $e");
		}
		catch (Exception $e) {
			$ret = [E_SERVER, $ERRINFO[E_SERVER], $e->getMessage()];
			logit("fail to call `$ac`: $e");
		}

		try {
			if ($useTrans && $this->DBH && $this->DBH->inTransaction())
			{
				if ($ok)
					$this->DBH->commit();
				else
					$this->DBH->rollback();
			}
		}
		catch (Exception $e) {
			logit((string)$e);
		}

		// 记录调用日志，如果是batch，只记录子调用项，不记录batch本身
		if ($this->ac != "batch" || $isSubCall) {
			$debugLog = $this->DEBUG_LOG;
			if ($debugLog == 1 || ($debugLog == 2 && $ret[0] != 0 && $ret[0] != E_NOAUTH && $ret[0] != E_ABORT)) {
				$retStr = $isUserFmt? (is_scalar($ret[1])? $ret[1]: jsonEncode($ret[1])): jsonEncode($ret);
				$t = $this->getT(1);
				$s = 'ac=' . $ac . ($this->ac1? "(in batch)": "") . ', apiLogId=' . ApiLog::$lastId . ', t=' . round($t, 1) . 's, ret=' . $retStr . ", dbgInfo=" . jsonEncode($this->dbgInfo, true) .
					"\ncallSvr(\"$ac\", " . jsonEncode($this->_GET) . (empty($this->_POST)? '': ', $.noop, ' . jsonEncode($this->_POST)) . ")";
				logit($s, true, 'debug');
			}
		}
		if ($this->TEST_MODE && count($this->dbgInfo) > 0) {
			foreach ($this->dbgInfo as $e) {
				$ret[] = $e;
			}
		}

		if ($isDefaultCall) {
/**
@var conf_returnExecTime

如果值为1, 将通过HTTP头返回接口执行时间, 示例:
	X-Exec-Time: 13ms
*/
			if ($GLOBALS["conf_returnExecTime"] && $this->startTm) {
				$t = $this->getT(0);
				// 如果之前已输出, 此时可能无法输出header
				@$this->header("X-Exec-Time", round($t*1000, 3) . "ms");
			}
			$this->echoRet($ret, $isUserFmt);
		}
		else {
			if ($ret[1] instanceof DbExpr) {
				$ret[1] = jsonDecode($ret[1]->val);
			}
		}

		if ($isSubCall)
			return $ret;

		foreach ($this->onAfterActions as $fn) {
			if ($ret[0] && ! ($fn instanceof DbExpr))
				continue;
			if ($fn instanceof DbExpr)
				$fn = $fn->val;
			try {
				$fn($ret);
			}
			catch (Exception $e) {
				logit('onAfterActions fails: ' . (string)$e);
			}
		}
		if (! $isCLI) {
			@$this->session_write_close();
		}

		try {
/*
			if ($this->apiWatch)
				$this->apiWatch->postExecute();
*/
			if ($this->apiLog) {
				$this->apiLog->logAfter($ret);
			}
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

		// clean up
		$this->DBH = null;
		$this->onAfterActions = [];
		$this->onBeforeActions = [];
		$this->dbgInfo = [];
		$this->apiLog = null;

		return $ret;
	}

	protected function batchCall($useTrans, &$ok)
	{
		$method = $this->_SERVER("REQUEST_METHOD");
		if ($method !== "POST")
			jdRet(E_PARAM, "batch MUST use `POST' method");

		$calls = $this->_POST;
		if (! is_array($calls))
			jdRet(E_PARAM, "bad batch request");

		$retVal = [];
		$retCode = 0;
		$acList = [];
		$afterActionCnt = 0;
		foreach ($calls as $call) {
			if ($useTrans && $retCode) {
				$retVal[] = [E_ABORT, "事务失败，取消执行", "batch call cancelled."];
				continue;
			}
			if (! isset($call["ac"])) {
				$retVal[] = [E_PARAM, "参数错误", "bad batch request: require `ac'"];
				continue;
			}
			$this->_GET = BatchUtil::getParams($call, "get", $retVal);
			$this->_POST = BatchUtil::getParams($call, "post", $retVal);

			$this->ac1 = $this->parseRestfulUrl($call["ac"], empty($call["post"])?"GET":"POST");
			Conf::onApiInit($this->ac1);

			$acList[] = $this->ac1;

			if ($this->apiLog) {
				$this->apiLog->logBefore1();
			}

			// 如果batch使用trans, 则单次调用不用trans
			$rv = $this->callSvcSafe($this->ac1, !$useTrans, true);

			$retCode = $rv[0];
			$retVal[] = $rv;

			if ($this->apiLog) {
				$this->apiLog->logAfter1($rv);
			}

			global $X_RET_STR;
			$X_RET_STR = null;
			$this->dbgInfo = [];
			$this->ac1 = null;
			// 扩展认证时，每个子调用分别认证，确保allowedAc可被检查
			$this->perms = null;
			if ($this->exPerm) {
				$this->_SESSION = [];
				$this->exPerm = null;
			}

			// 接口失败，则删除非强制执行的onAfterActions
			if ($retCode) {
				for ($i=count($this->onAfterActions)-1; $i>=$afterActionCnt; --$i) {
					if ($this->onAfterActions[$i] instanceof DbExpr)
						continue;
					array_splice($this->onAfterActions, $i);
				}
			}
			$afterActionCnt = count($this->onAfterActions);
		}
		if ($this->apiLog) {
			$this->apiLog->batchAc = 'batch:' . count($acList) . ',' . join(',', $acList);
		}

		$ok = $retCode == 0 || !$useTrans;
		return $retVal;
	}

	private function echoRet($ret, $isUserFmt)
	{
		list ($code, $data) = $ret;

		global $X_RET_STR;
		if ($isUserFmt) {
			if (is_null($data))
				return;
			if (is_scalar($data))
				$X_RET_STR = $data;
			else
				$X_RET_STR = jsonEncode($data);
			$this->write($X_RET_STR);
			return;
		}

		if (! $data instanceof DbExpr) {
			$retfn = $this->_GET["retfn"] ?: $GLOBALS["X_RET_FN"];
			if (is_string($retfn)) {
				$retfn = "retfn_$retfn";
			}
			if ($this->_GET["_raw"]) { // 兼容原_raw=1/2参数
				$retfn = "retfn_raw";
			}
			if (is_callable($retfn) && !$this->param("jdcloud")) {
				$ret1 = $retfn($ret, $this);
				if ($ret1 === false)
					return;
				$ret = $ret1;
			}

			if (is_scalar($ret)) {
				$X_RET_STR = (string)$ret;
			}
			else {
				$X_RET_STR = jsonEncode($ret, $this->TEST_MODE);
			}
		}
		else {
			$X_RET_STR = "[" . $code . ", " . $data->val . "]";
		}

		global $X_RET_STR;
		$jsonp = $this->_GET["_jsonp"];
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
	private function parseRestfulUrl($pathInfo, $method=null)
	{
		if ($method === null)
			$method = $this->_SERVER("REQUEST_METHOD");
		if ($pathInfo[0] == '/')
			$pathInfo = preg_replace('/^\/+/', '', $pathInfo);
		$ac = htmlEscape($pathInfo);
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
			$this->_GET['id'] = $id;

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
				jdRet(E_PARAM, "bad verb '$method'.use `PATCH $obj/$id` or `POST $obj/$id/set` for set.");
			$ac = 'add';
			break;

		// TODO: 暂不支持PUT操作。注意：PUT操作中未指定的字段将置空，可以使用MYSQL的`REPLACE INTO t0 (id, ...) VALUE (...)`来实现。
		// PATCH /Store/123 (等价于 POST /Store/123/set，这里把set当做功能操作，故使用POST谓词)
		case 'PATCH':
			if (! isset($id))
				jdRet(E_PARAM, "missing id");
			$ac = 'set';
			parse_str(getHttpInput($this), $this->_POST);
			break;

		// DELETE /Store/123 (等价于 POST /Store/123/del)
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
		if (session_status() != PHP_SESSION_NONE)
			return;
		# normal: "userid"; testmode: "tuserid"
		$name = $this->appType . "id";
		session_name($name);

		$path = getenv("P_SESSION_DIR") ?: $GLOBALS["conf_dataDir"] . "/session";
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

	private static function showArray($arr, $max=20) {
		$n = 0;
		return join(',', arrMap($arr, function ($a) use (&$n, $max) {
			++ $n;
			if ($n == $max+1)
				return "...";
			if ($n > $max)
				return;
			if (is_array($a)) {
				return '[' . self::showArray($a, 10) . ']';
			}
			if (is_string($a)) {
				if (strlen($a) > 100)
					return Q(substr($a, 0, 100) . '...');
				return Q($a);
			}
			if (is_scalar($a)) {
				return $a;
			}
			return ''; // 忽略fn等复杂类型
		}, true));
	}

	// 取调用栈，返回字符串。默认只显示前面200和后面200项
	function getBacktrace($max = 200) {
		$arr = [];
		$bt = debug_backtrace();
		$n = count($bt);
		foreach ($bt as $i=>$e) {
			// 忽略函数自身
			if ($i == 0) {  
				-- $n;
				continue;
			}
			// 忽略中间重复
			if ($i > $max && $n > $max) {
				-- $n;
				continue;
			}
			$fn = $e["class"]? ($e["class"] . '->' . $e["function"]): $e["function"];
			$args = self::showArray($e["args"]);
			$arr[] = "#$n $fn($args) called at [{$e["file"]}:{$e["line"]}]";
			-- $n;
		}
		return join("\n", $arr);
	}

/**
@var JDEnv::$MAX_DEBUG_LOG_CNT=2000

调试日志最大条目数，默认2000条。
达到极限时会清除掉前一半后继续记录，以避免内存耗尽。

addLog方法同时用于异常监测(确保开启P_DEBUG_LOG为1或2)，对于大于10秒的调用(conf_slowApiDebugTime=10.0)，或是日志首次溢出时，会记录一次调用栈。可在debug日志中搜索"call stack"关键字。

@see conf_slowApiDebugTime
*/
	static $MAX_DEBUG_LOG_CNT = 2000;
	function addLog($data, $logLevel=0) {
		$t = $this->getT(0);
		// 超过10s的调用在debug日志中记录调用栈, 只记一次；用于死循环、递归耗尽内存等场景调试
		if ($t > $GLOBALS["conf_slowApiDebugTime"] && $this->DEBUG_LOG && !$this->slowApiDebugFlag) {
			$this->slowApiDebugFlag = true;
			$s = '!!! slow api debug! ac=' . $this->ac . ($this->ac1? "(in batch)": "") . ', apiLogId=' . ApiLog::$lastId . ', t>' . round($t, 1) . 's, dbgInfo=' . jsonEncode($this->dbgInfo, true)
			   	.  "\n### call stack:\n" . $this->getBacktrace();
			logit($s, true, 'debug');
		}
		if ($this->DBG_LEVEL >= $logLevel)
		{
			$this->dbgInfo[] = $data;
			$cnt = count($this->dbgInfo);
			if ($cnt >= self::$MAX_DEBUG_LOG_CNT) {
				$rv = array_splice($this->dbgInfo, 0, self::$MAX_DEBUG_LOG_CNT/2, ["... skip early logs"]);
				$cnt = count($this->dbgInfo);
				// 某次日志溢出时记录调用栈，用于死循环、递归耗尽内存等场景调试
				if ($this->DEBUG_LOG) {
					$s = '!!! log overflow! ac=' . $this->ac . ($this->ac1? "(in batch)": "") . ', apiLogId=' . ApiLog::$lastId . ', t>' . round($t, 1) . 's';
					if (substr($rv[0], 0, 3) != "...") {
						$s .= ', dbgInfo=' . jsonEncode($rv, true) .
							"\ncallSvr(\"$this->ac\", " . jsonEncode($this->_GET) . (empty($this->_POST)? '': ', $.noop, ' . jsonEncode($this->_POST)) . ")\n### call stack:\n" . $this->getBacktrace();
						logit($s, true, 'debug');
					}
					else {
						$s .= ', skip dbgInfo';
						logit($s, true, "debug");
					}
				}
			}
			return $cnt;
		}
	}
	// logHandle: return by addLog
	function amendLog($logHandle, $fn)
	{
		if (! ($logHandle > 0 && $logHandle <= count($this->dbgInfo)) )
			return;
		$fn($this->dbgInfo[$logHandle-1]);
	}

	function callSvcInt($ac, $param=null, $postParam=null, $useTmpEnv=true)
	{
		if ($this->doInitEnv)
			jdRet(E_SERVER, "bad usage of callSvcInt", "callSvcInt仅限接口内调用，外部调用请用callSvc");
		$fn = "api_$ac";
		if (preg_match('/^([A-Z]\w*)\.([a-z]\w*)$/u', $ac, $ms)) {
			list($tmp, $tbl, $ac1) = $ms;
			$acObj = $this->createAC($tbl, $ac1);
			$ret = $acObj->callSvc($tbl, $ac1, $param, $postParam, $useTmpEnv);
		}
		elseif (function_exists($fn)) {
			$ret = $this->tmpEnv($param, $postParam, function () use ($fn) {
				return $fn($this);
			}, $useTmpEnv);
		}
		else {
			jdRet(E_PARAM, "Bad request - unknown ac: {$ac}", "接口不支持");
		}
	//	if (!isset($ret))
	//		$ret = "OK";
		return $ret;
	}

/**
@fn env->tmpEnv($param, $postParam, $fn, $useTmpEnv=true)

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

默认对当前环境的修改(如修改$_GET等)会被恢复，除非指定参数$useTmpEnv=false。
*/
	function tmpEnv($get, $post, $fn, $useTmpEnv=true)
	{
		assert(is_null($get)||is_array($get));
		assert(is_null($post)||is_array($post));
		if ($useTmpEnv) {
			$bak = [$this->_GET, $this->_POST, $GLOBALS["X_RET_FN"]];
		}
		$this->_GET = isset($get) ? $get: [];
		$this->_POST = isset($post) ? $post : [];

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

		if ($useTmpEnv) {
			// restore env
			list($this->_GET, $this->_POST, $GLOBALS["X_RET_FN"]) = $bak;
		}
		
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
		if (class_exists("{$cls}_Imp"))
			$cls .= "_Imp";
		$acObj = new $cls;
		if (!is_a($acObj, "JDApiBase")) {
			jdRet(E_SERVER, "bad AC class `$cls`. MUST extend JDApiBase or AccessControl", "AC类定义错误");
		}
		$acObj->env = $this;
		if (is_a($acObj, "AccessControl"))
			$acObj->initTable($tbl);
		return $acObj;
	}

	function param($name, $defVal = null, $col = null, $doHtmlEscape = true) {
		return param($name, $defVal, $col, $doHtmlEscape, $this);
	}

	function mparam($name, $col = null, $doHtmlEscape = true) {
		return mparam($name, $col, $doHtmlEscape, $this);
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
		else if (preg_match('/MicroMessenger\/([0-9.]+)/', ($this->_SERVER("HTTP_USER_AGENT")?:''), $ms)) {
			$ver = $ms[1];
			$ret = [
				"type" => "wx",
				"ver" => $ver,
				"str" => "wx/{$ver}"
			];
		}
		else if (isCLI()) {
			global $argv;
			$ret = [
				"type" => "cli",
				"ver" => 0,
				"str" => join(" ", $argv)
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

function retfn_obj($ret, $env) {
	$ret1 = ["code" => $ret[0]];
	if ($ret[0] == 0) {
		$ret1["data"] = $ret[1];
	}
	else {
		$ret1["message"] = $ret[1];
	}
	if (count($ret) > 2) {
		if ($env->TEST_MODE) {
			array_splice($ret, 0, 2);
			$ret1["debug" ] = $ret;
		}
		else if ($ret[0]) {
			$ret1["debug" ] = $ret[2];
		}
	}
	return $ret1;
}
function retfn_raw($ret, $env) {
	$r = $ret[1];
	if ($env->_GET["_raw"] == 2) {
		if (is_array($r))
			$r = join("\t", $r);
	}
	return $r;
}
function retfn_xml($ret, $env) {
	$env->header("Content-Type", "application/xml; charset=UTF-8");
	$ret1 = ["code" => $ret[0]];
	if ($ret[0] == 0) {
		$ret1["data"] = $ret[1];
	}
	else {
		$ret1["message"] = $ret[1];
		if (count($ret) > 2)
			$ret1["debug"] = $ret[2];
	}
	return SimpleXml::writeXml($ret1, "ret");
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

class JDApiBase
{
	public $env;

	function header($key=null, $val=null) {
		$this->env->header($key, $val);
	}
	function write($s) {
		$this->env->write($s);
	}

	function callSvc($tbl, $ac, $param=null, $postParam=null, $useTmpEnv=true)
	{
		$fn = "api_" . $ac;
		if (! is_callable([$this, $fn]))
			jdRet(E_PARAM, "Bad request - unknown `$tbl` method: `$ac`", "接口不支持");

		if (is_null($this->env))
			$this->env = getJDEnv();
		return $this->env->tmpEnv($param, $postParam, function () use ($tbl, $ac, $fn) {
			return $this->onCallSvc($tbl, $ac, $fn);
		}, $useTmpEnv);
	}

	protected function onCallSvc($tbl, $ac, $fn) {
		$ret = $this->$fn();
		return $ret;
	}
}
#}}}

// ====== main routine {{{
/**
@fn callSvc($ac=null, $useTrans=true, $apiFn=null)

外部调用接口。返回符合筋斗云格式的数组，至少2元素，即`[0, 成功数据, 调试信息...]`或`[非0, 失败信息, 内部失败原因, 调试信息...]`

- 如果不指定ac, 则自动从请求中解析，设置响应header并输出内容。
- 自动开启数据库事务，除非指定useTrans=false
- 自动记录调用日志、操作日志等。

示例：接口应用api.php的最后

	callSvc();

示例：server/tool/task.php是命令行程序(通过php task.php执行)，用于定时任务，如果它想调用已有接口：

	// 模拟AC2权限调用接口
	$_SESSION = ["empId" => -1];
	// 设置参数；当然也可以设置$_POST参数
	$_GET = ["for" => "task", "fmt" => "one"];
	$rv = callSvc("Employee.query");

如果指定apiFn，则直接以接口环境执行该函数，包括记录ApiLog、开启数据库事务、开启并保存session等（注意接口执行会设置cookie路径和名称等）、使用jdRet报错等。
示例：在server/weixin/auth.php中，实现微信登录，因为需要记录$_SESSION["uid"]，它必须在接口环境下执行，否则后续执行将会认为未登录：

	$rv = callSvc("weixinLogin", true, function () use ($isMock) {
		$userInfo = ...;
		$imp = LoginImpBase::getInstance();
		return $imp->onWeixinLogin($userInfo, $rawData);
	});
	if ($rv[0]) {
		logit("weixin/auth.php fails: " . jsonEncode($rv));
		echo("fail: " . $rv[1]);
		exit();
	}

@see callSvcInt
*/
function callSvc($ac=null, $useTrans=true, $apiFn=null)
{
	$env = getJDEnv();
	return $env->callSvcSafe($ac, $useTrans, false, $apiFn);
}

if (!isSwoole())
	$X_APP = new JDEnv();
else
	$X_APP = [];

require_once("ext.php");
// }}}

// vim: set foldmethod=marker :
