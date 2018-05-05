<?php

#error_reporting(E_ALL & (~(E_NOTICE|E_USER_NOTICE)));
error_reporting(E_ALL & ~E_NOTICE);

/** @module api_fw

服务接口实现框架。

服务接口包含：

- 函数型接口，如 "login", "getToken"等, 一般实现在 api_functions.php中。
- 对象型接口，如 "Ordr.query", "User.get" 等，一般实现在 api_objects.php中。

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
@see $errorFn
@see errQuit()
*/
function setRet($code, $data = null, $internalMsg = null)
{
	global $TEST_MODE;
	global $JSON_FLAG;
	global $ERRINFO;
	global $X_RET;

	if ($code && !$data) {
		assert(array_key_exists($code, $ERRINFO));
		$data = $ERRINFO[$code];
	}
	$X_RET = [$code, $data];

	if (isset($internalMsg))
		$X_RET[] = $internalMsg;

	if ($TEST_MODE) {
		global $g_dbgInfo;
		if (count($g_dbgInfo) > 0)
			$X_RET[] = $g_dbgInfo;
	}

	if (ApiFw_::$SOLO) {
		global $X_RET_STR;
		if (! isset($X_RET_STR)) {
			$X_RET_STR = json_encode($X_RET, $JSON_FLAG);
		}
		else {
			$X_RET_STR = "[" . $code . ", " . $X_RET_STR . "]";
		}
		echo $X_RET_STR . "\n";
	}
	else {
		$errfn = $GLOBALS["errorFn"] ?: "errQuit";
		if ($code != 0) {
			$errfn($X_RET[0], $X_RET[1], $X_RET[2]);
		}
	}
}

/**
@fn setServerRev()

根据全局变量"SERVER_REV"或应用根目录下的文件"revision.txt"， 来设置HTTP响应头"X-Daca-Server-Rev"表示服务端版本信息（最多6位）。

客户端框架可本地缓存该版本信息，一旦发现不一致，可刷新应用。
 */
function setServerRev()
{
	$ver = $GLOBALS["SERVER_REV"] ?: @file_get_contents("{$GLOBALS['BASE_DIR']}/revision.txt");
	if (! $ver)
		return;
	$ver = substr($ver, 0, 6);
	header("X-Daca-Server-Rev: {$ver}");
}

/**
@fn hasPerm($perm)

检查权限。perm可以是单个权限或多个权限，例：

	hasPerm(AUTH_USER); // 用户登录后可用
	hasPerm(AUTH_USER | AUTH_EMP); // 用户或员工登录后可用

@fn onGetPerms()

开发者需要定义该函数，用于返回所有检测到的权限。hasPerm函数依赖该函数。

@see checkAuth
 */
function hasPerm($perm)
{
	if (is_null(ApiFw_::$perms))
		ApiFw_::$perms = onGetPerms();

	return (ApiFw_::$perms & $perm) != 0;
}

/** 
@fn checkAuth($perm)

用法与hasPerm类似，检查权限，如果不正确，则抛出错误，返回错误对象。

	checkPerm(AUTH_USER); // 必须用户登录后可用
	checkPerm(AUTH_ADMIN | PERM_TEST_MODE); 要求必须管理员登录或测试模式才可用。

@see hasPerm
 */
function checkAuth($perm)
{
	$ok = hasPerm($perm);
	if (!$ok) {
		$auth = [];
		// TODO: AUTH_LOGIN
		if (hasPerm(AUTH_LOGIN))
			$errCode = E_FORBIDDEN;
		else
			$errCode = E_NOAUTH;

		foreach ($GLOBALS["PERMS"] as $p=>$name) {
			if (($perm & $p) != 0) {
				$auth[] = $name;
			}
		}
		throw new MyException($errCode, "require auth to " . join(" or ", $auth));
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

为查询添加时间维度单位: y,m,w,d,wd,h (年，月，周，日，周几，时)。

- wd: 1-7表示周一到周日
- w: 一年中第一周，从该年第一个周一开始(mysql week函数模式7).

示例：

		$this->vcolDefs[] = [ "res" => tmCols() ];
		$this->vcolDefs[] = [ "res" => tmCols("t0.createTm") ];
		$this->vcolDefs[] = [ "res" => tmCols("log_cr.tm"), "require" => "createTm" ];

 */
function tmCols($fieldName = "t0.tm")
{
	return ["year({$fieldName}) y", "month({$fieldName}) m", "week({$fieldName},7) w", "day({$fieldName}) d", "weekday({$fieldName})+1 wd", "hour({$fieldName}) h"];
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
@var ConfBase::$enableApiLog?=true

设置为false可关闭ApiLog. 例：

	static $enableApiLog = false;
 */
	static $enableApiLog = true;

/**
@fn ConfBase::onApiInit()

所有API执行时都会先走这里。

例：对所有API调用检查ios版本：

	static function onApiInit()
	{
		$ver = getClientVersion();
		if ($ver["type"] == "ios" && $ver["ver"]<=15) {
			throw new MyException(E_FORBIDDEN, "unsupport ios client version", "您使用的版本太低，请升级后使用!");
		}
	}
 */
	static function onApiInit()
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
 */
	static function onInitClient(&$ret)
	{
	}
}

class ApiLog
{
	private $startTm;
	private $ac;
	private $id;

	function __construct($ac) 
	{
		$this->ac = $ac;
	}

	private function myVarExport($var, $maxLength=200)
	{
		if (is_string($var)) {
			$var = preg_replace('/\s+/', " ", $var);
			if (strlen($var) > $maxLength)
				$var = substr($var, 0, $maxLength) . "...";
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
				return substr($k, 0, $maxKeyLen) . "...";
			$len = strlen($s);
			if ($len >= $maxLength) {
				$s .= "$k=...";
				break;
			}
			if ($k == "pwd" || $k == "oldpwd") {
				$v = "?";
			}
			else if (! is_scalar($v)) {
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
		$this->startTm = microtime(true);

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
			$userId = 'NULL';
		$content = $this->myVarExport($_GET, 2000);
		$ct = $_SERVER["HTTP_CONTENT_TYPE"];
		if (! preg_match('/x-www-form-urlencoded|form-data/i', $ct)) {
			$post = file_get_contents("php://input");
			$content2 = $this->myVarExport($post, 2000);
		}
		else {
			$content2 = $this->myVarExport($_POST, 2000);
		}
		if ($content2 != "")
			$content .= ";\n" . $content2;
		$remoteAddr = @$_SERVER['REMOTE_ADDR'] ?: 'unknown';
		$reqsz = strlen($_SERVER["REQUEST_URI"]) + (@$_SERVER["HTTP_CONTENT_LENGTH"]?:$_SERVER["CONTENT_LENGTH"]?:0);
		$ua = $_SERVER["HTTP_USER_AGENT"];
		$ver = getClientVersion();

		$sql = sprintf("INSERT INTO ApiLog (tm, addr, ua, app, ses, userId, ac, req, reqsz, ver) VALUES ('%s', %s, %s, %s, %s, $userId, %s, %s, $reqsz, %s)", 
			date(FMT_DT), Q($remoteAddr), Q($ua), Q($APP), Q(session_id()), Q($this->ac), Q($content), Q($ver["str"])
		);
		$this->id = execOne($sql, true);
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
		$content = $this->myVarExport($X_RET_STR);

		$userIdStr = "";
		if ($this->ac == 'login' && is_array($X_RET[1]) && @$X_RET[1]['id']) {
			$userIdStr = ", userId={$X_RET[1]['id']}";
		}
		$sql = sprintf("UPDATE ApiLog SET t=$iv, retval=%d, ressz=%d, res=%s {$userIdStr} WHERE id={$this->id}", $X_RET[0], strlen($X_RET_STR), Q($content));
		$rv = execOne($sql);
// 		$logStr = "=== id={$this->logId} t={$iv} >>>$content<<<\n";
	}
}

/*
	1. 只对同一session的API调用进行监控; 只对成功的调用监控
	2. 相邻两次调用时间<0.5s, 记一次不良记录(bad). 当bad数超过50次(CNT1)时报错，记一次历史不良记录；此后bad每超过2次(CNT2)，报错一次。
	之所以不是每次都报错，是考虑正常程序也可能一次发多个请求。
	3. 回归测试模式下不监控。
 */
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
@fn Plugins::add($pluginName, $file?="{pluginName}/plugin.php")

添加模块或插件。$file为插件主文件，可返回一个插件配置.

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
		if (!isset($file))
			$file = "{$pname}/plugin.php";
		$f = $BASE_DIR . '/plugin/' . $file;
		if (is_file($f)) {
			$p = require_once($f);
			if ($p === true) { // 重复包含
				throw new MyException(E_SERVER, "duplicated plugin `$pname': $file");
			}
			if ($p === 1)
				$p = [];
		}
		else {
			throw new MyException(E_SERVER, "cannot find plugin `$pname': $file");
		}
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
		setParam("cond2", ["o.storeId=$storeId"]); 

		// 定死排序条件
		setParam("orderby", "tm DESC");

		$ret = tableCRUD("query", "Rating", true);
		return $ret;
	}

注意：
- 以上示例中的设计不可取，应使用标准对象接口来实现这个需求。

@see setParam
@see callSvcInt
@see callSvc
 */

function tableCRUD($ac1, $tbl, $asAdmin = false)
{
	$accessCtl = AccessControl::create($tbl, $asAdmin);
	$fn = "api_" . $ac1;
	if (! method_exists($accessCtl, $fn))
		throw new MyException(E_PARAM, "Bad request - unknown `$tbl` method: `$ac1`");
	$accessCtl->before($ac1);
	$ret = $accessCtl->$fn();
	$accessCtl->after($ret);
	return $ret;
}

/**
@fn callSvcInt($ac)

内部调用另一接口，获得返回值。如果要设置GET, POST参数，分别用

	setParam(key, value); // 设置get参数
	// 或批量设置用 setParam({key => value});
	$_POST[key] = value; // 设置post参数

与callSvc不同的是，它不处理事务、不写ApiLog，不输出数据，更轻量；
与tableCRUD不同的是，它支持函数型调用。

@see setParam
@see tableCRUD
@see callSvc
*/
function callSvcInt($ac)
{
	$fn = "api_$ac";
	if (preg_match('/^([A-Z]\w*)\.([a-z]\w*)$/', $ac, $ms)) {
		list($tmp, $tbl, $ac1) = $ms;
		// TODO: check meta
		$ret = tableCRUD($ac1, $tbl);
	}
	elseif (function_exists($fn)) {
		$ret = $fn();
	}
	else {
		throw new MyException(E_PARAM, "Bad request - unknown ac: {$ac}");
	}
	if (!isset($ret))
		$ret = "OK";
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
	Conf::onInitClient($ret);
	return $ret;
}

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
		if (strstr(@$_SERVER["HTTP_CONTENT_TYPE"], "/json") !== false) {
			$content = file_get_contents("php://input");
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
		$api->onBeforeExec[] = $supportJson;
		$api->exec();
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

	// 原理：
	// "{$n.id}" => "$f(n)["id"]"
	// 如果计算错误，则返回NULL
	private static function calcRefValue($val, $arr)
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
		
		$v1 = preg_replace_callback('/\{(.+?)\}/', function ($ms) use ($calcOne) {
			$expr = $ms[1];
			$rv = $calcOne($expr);
			if (!isset($rv))
				$rv = "null";
			return $rv;
		}, $val);
		addLog("### batch ref: `{$val}' -> `{$v1}'");
		return $v1;
	}
}

class ApiApp extends AppBase
{
	private $apiLog;
	private $apiWatch;
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

		Conf::onApiInit();

		dbconn();

		global $DBH;
		if (! isCLI())
			session_start();

		if (Conf::$enableApiLog)
		{
			$this->apiLog = new ApiLog($ac);
			$this->apiLog->logBefore();
		}

		// API调用监控
		$this->apiWatch = new ApiWatch($ac);
		$this->apiWatch->execute();

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

		$s = file_get_contents("php://input");
		$calls = json_decode($s, true);
		if (! is_array($calls))
			throw new MyException(E_PARAM, "bad batch request");

		global $DBH;
		global $X_RET;
		// 以下过程不允许抛出异常
		$batchApiApp = new BatchApiApp($this, $useTrans);
		if ($useTrans && !$DBH->inTransaction())
			$DBH->beginTransaction();
		$solo = ApiFw_::$SOLO;
		ApiFw_::$SOLO = false;
		$retVal = [];
		$retCode = 0;
		$GLOBALS["errorFn"] = function () {};
		foreach ($calls as $call) {
			if ($useTrans && $retCode) {
				$retVal[] = [E_ABORT, "事务失败，取消执行", "batch call cancelled."];
				continue;
			}
			if (! isset($call["ac"])) {
				$retVal[] = [E_PARAM, "参数错误", "bad batch request: require `ac'"];
				continue;
			}

			$_GET = $call["get"] ?: [];
			$_POST = $call["post"] ?: [];
			if ($call["ref"]) {
				if (! is_array($call["ref"])) {
					$retVal[] = [E_PARAM, "参数错误", "batch `ref' should be array"];
					continue;
				}
				BatchApiApp::handleBatchRef($call["ref"], $retVal);
			}
			$_REQUEST = array_merge($_GET, $_POST);

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
		}
		if ($useTrans && $DBH && $DBH->inTransaction())
			$DBH->commit();
		ApiFw_::$SOLO = $solo;
		setRet(0, $retVal);
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
		if ($this->apiWatch)
			$this->apiWatch->postExecute();
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
		if (ctype_lower($ac[0]) || strpos($ac, '.') !== false)
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
