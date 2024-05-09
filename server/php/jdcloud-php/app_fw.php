<?php
/*********************************************************
@module app_fw

筋斗云服务端通用应用框架。

## 通用函数

- 获得指定类型参数
@see param,mparam

- 数据库连接及操作
@see dbconn,execOne,queryOne,queryAll,dbInsert,dbUpdate

- 错误处理设施
@see MyException,errQuit

## 初始化配置

app_fw框架自动包含 $BASE_DIR/php/conf.user.php。

项目部署时的配置，一般用于定义环境变量、全局变量等，通常不添加入版本库，在项目实施时手工配置。

对于不变的全局配置，应在app.php中定义。

### 数据库配置

@key P_DB 环境变量，指定DB类型与地址。
@key P_DBCRED 环境变量，指定DB登录帐号

P_DB格式为：

	P_DB={主机名}/{数据库名}
	或
	P_DB={主机名}:{端口号}/{数据库名}

例如：

	P_DB=localhost/myorder
	P_DB=www.myserver.com:3306/myorder

P_DBCRED格式为`{用户名}:{密码}`，或其base64编码后的值，如

	P_DBCRED=ganlan:1234
	或
	P_DBCRED=Z2FubGFuOjEyMzQ=

连接mysql示例(注意在php.ini中打开php_pdo_mysql扩展)，设置以下环境变量：

	putenv("P_DBTYPE=mysql");
	putenv("P_DB=172.12.77.221/jdcloud");
	putenv("P_DBCRED=demo:demo123");

P_DBTYPE参数可以不设置，它默认值就是mysql。

连接mssql可以通过php_pdo_sqlsrv扩展+odbc驱动，也可以通过php_pdo_odbc扩展+odbc驱动, 建议前者。

连接mssql示例(通过php_pdo_sqlsrv和php_sqlsrv扩展, 微软官网下载)
https://learn.microsoft.com/en-us/sql/connect/php/installation-tutorial-linux-mac?view=sql-server-ver16

	putenv("P_DBTYPE=mssql");
	putenv("P_DB=sqlsrv:DATABASE=FNWMS; SERVER=myserver.delta.corp; Encrypt=no");
	putenv("P_DBCRED=wms:1234");

连接mssql示例(通过php_pdo_odbc扩展), linux平台:
https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/installing-the-microsoft-odbc-driver-for-sql-server?view=sql-server-ver16

	setlocale(LC_ALL, "en_US.UTF-8"); // 如果写入中文乱码，试试指定locale
	$GLOBALS["conf_mssql_useOdbc"] = true;
	putenv("P_DBTYPE=mssql");
	// driver名字在/etc/odbcinst.ini中查看
	putenv("P_DB=odbc:DRIVER={ODBC Driver 18 for SQL Server}; LANGUAGE=us_english; DATABASE=FNWMS; SERVER=myserver.delta.corp; Encrypt=no");
	putenv("P_DBCRED=wms:1234");

	// windows平台odbc示例:
	// putenv("P_DB=odbc:DRIVER=SQL Server Native Client 10.0; DATABASE=jdcloud; Trusted_Connection=Yes; SERVER=.\MSSQL2008;");

	// 使用odbc的文件DSN示例（可通过系统自带的odbcad32工具创建），如：
	// putenv("P_DB=odbc:FILEDSN=d:\db\jdcloud-mssql.dsn");

对oracle数据库为最基本的DBEnv级别支持, 不支持接口框架, 示例: (需要php扩展oci8.so和pdo_oci.so)

	putenv("P_DBTYPE=oracle");
	putenv("P_DB=oci:dbname=10.30.250.131:1525/mesdzprd;charset=AL32UTF8");

此外，P_DB还试验性地支持SQLite数据库，直接指定以".db"为扩展名的文件，以及P_DBTYPE即可，不需要P_DBCRED。例如：
连接sqlite示例(注意打开php_pdo_sqlite扩展)：

	putenv("P_DBTYPE=sqlite");
	putenv("P_DB=../myorder.db");

连接SQLite数据库未做严格测试，不建议使用。

做性能对比测试时还支持不连数据库(当然也不会写ApiLog)，可指定：

	putenv("P_DB=null");

也可以直接创建DBEnv来用(调用queryOne/execOne等)，示例：

	# mysql
	$db = "mysql:host=localhost;port=3306;dbname=jt_wms";
	$env = new DBEnv("mysql", $db, "demo", "demo123");

	$rows = $env->queryAll("SELECT * FROM Employee");
	$rowCnt = $env->queryOne("SELECT COUNT(*) FROM Employee");
	$newId = $env->dbInsert("Employee", ["name"=>"name1"]);
	$cnt = $env->dbUpdate("Task", ["vendorId" => $id], ["vendorId" => $id1]);
	$cnt = $env->execOne("UPDATE Task SET vendorId=venderId+1");

	# sqlite
	$db = "sqlite:jdcloud.db";
	$env = new DBEnv("sqlite", $db);

	# mssql over PDO
	$db = "sqlsrv:DATABASE=FNWMS; SERVER=myserver.test.com; Encrypt=no";
	# mssql over odbc
	# $db = "odbc:DRIVER={SQL Server Native Client 11.0}; LANGUAGE=us_english; DATABASE=jdcloud; SERVER=."; // "UID=demo; PWD=demo123"
	$env = new DBEnv("mssql", $db, "demo", "demo123");

	# oracle
	$db = "oci:dbname=10.30.250.131:1525/mesdzprd;charset=AL32UTF8";
	$env = new DBEnv("oracle", $db, "demo", "demo123");

如果配置了P_DEBUG_LOG=1且P_DEBUG=9，则记录SQL调用日志到debug.log

@var conf_dbinst DB浏览器-数据库实例配置

使用SQL语句`show databases`或`show tables`可查看数据库或数据表的列表。
除了当前数据库实例，也支持连接到其它数据库实例。配置示例：

	$mssql_db = "odbc:DRIVER={SQL Server Native Client 11.0}; LANGUAGE=us_english; DATABASE=jdcloud; SERVER=."; // "UID=sa; PWD=ibdibd"
	# $mssql_db = "sqlsrv:DATABASE=FNWMS; SERVER=myserver.test.com; Encrypt=no"; // mssql over PDO
	$oracle_db = "oci:dbname=10.30.250.131:1525/mesdzprd;charset=AL32UTF8";
	$GLOBALS["conf_dbinst"] = [
		// 实例名称 => [数据库类型，PDO连接字符串，用户，密码]
		"本地测试mysql" => ["mysql", "mysql:host=localhost;port=3306;dbname=wms", "demo", "demo123"],
		"mssql实例" => ["mssql", $mssql_db, "demo", "demo123"],
		"sqlite实例" => ["sqlite", "sqlite:jdcloud.db"],
		"oracle实例" => ["oracle", $oracle_db, "demo", "demo123"],
	];

## 测试模式与调试等级

@key P_TEST_MODE Integer。环境变量，允许测试模式。0-生产模式；1-测试模式；2-自动化回归测试模式(RTEST_MODE)
@key P_DEBUG Integer。环境变量，设置调试等级，值范围0-9。
@key P_DEBUG_LOG Integer。(v5.4) 环境变量，是否打印接口明细日志到debug.log。0-不打印，1-全部打印，2-只打印出错的调用

测试模式特点：

- 输出的HTTP头中包含：`X-Daca-Test-Mode: 1`
- 输出的JSON格式经过美化更易读，且可以显示更多调试信息。前端可通过在接口中添加`_debug`参数设置调试等级。
  如果想要查看本次调用涉及的SQL语句，可以用`_debug=9`。
- 某些用于测试的接口可以调用，例如execSql。因而十分危险，生产模式下一定不可误设置为测试模式。
- 可以使用模拟模式

注意：v5.4起可设置P_DEBUG_LOG，在测试模式或生产模式都可用，可记录日志到后台debug.log文件中。一般用于在生产环境下，临时开放查看后台日志。

注意：v3.4版本起不允许客户端设置_test参数，且用环境变量P_TEST_MODE替代符号文件CFG_TEST_MODE。

在过去测试模式用于：可直接对生产环境进行测试且不影响生产环境，即部署后，在前端指定以测试模式连接，在后端为测试模式连接专用的测试数据库，且使用专用的cookie，实现与生产模式共用代码但互不影响。
现已废弃这种用法，应搭建专用的测试环境用于测试开发。

@key _debug 前端URL参数

(v6.1) 前端指定调试等级（相当于指定P_DEBUG），会同时记录debug日志（相当于后端设置P_DEBUG_LOG=1）；
在测试模式下，调试信息会以指定等级输出到前端。

@see addLog

## 模拟模式

@key P_MOCK_MODE Integer. 模拟模式. 值：0/1，或部分模拟，值为模块列表，如"wx,sms"，外部模块名称定义见ext.php.

对第三方系统依赖（如微信认证、支付宝支付、发送短信等），可通过设计Mock接口来模拟。

注意：v3.4版本起用环境变量P_MOCK_MODE替代符号文件CFG_MOCK_MODE/CFG_MOCK_T_MODE，且模拟模式只允许在测试模式激活时才能使用。

@see ExtMock

## session会话管理

- 应用的session名称为 "{app}id", 如应用名为 "user", 则session名为"userid". 因而不同的应用同时调用服务端也不会冲突。
- 保存session文件的目录为 $conf_dataDir/session, 可使用环境变量P_SESSION_DIR重定义(推荐配置$conf_dataDir而不是P_SESSION_DIR)。
- 同一主机，不同URL下的session即使APP名相同，也不会相互冲突，因为框架会根据当前URL，设置cookie的有效路径。

@key P_SESSION_DIR ?= $conf_dataDir/session 环境变量，定义session文件存放路径。
@key P_URL_PATH 环境变量。项目的URL路径，如"/jdcloud", 用于定义cookie生效的作用域，也用于拼接相对URL路径。
@see getBaseUrl

PHP默认的session过期时间为1440s(24分钟)，每次在使用session时，以1/1000的概率检查过期(session.gc_divisor=1000, session.gc_probability=1)。
查看PHP默认配置可以用：`php -r 'phpinfo();' |grep -i session.gc` 
注意：在centos7/8中默认配置是1/1000，在ubuntu20+中默认配置为0/1000即禁用了概率回收机制，但在/etc/cron.d/php中以定时任务方式配置了每30分钟清理一次。

要配置它，可以应用程序的conf.user.php中设置，如：

	ini_set("session.gc_maxlifetime", "2592000"); // 30天过期

测试时，想要到时间立即清除session，可以设置：

	ini_set("session.gc_probability", "1000"); // 1000/1000概率做回收。每次访问都回收，性能差，仅用于测试。

在浏览器中默认cookie的有效时间是'session'即浏览器关闭时生效，因而每次打开浏览器须重新登录。
若想保留指定时长，可以设置：

	session_set_cookie_params(3600*24*7); // 保留7天

注意：前端会记住cookie过期时间，假如后端再次改成保留10天，由于前端已记录的是7天过期，无法立即更新，只能清除cookie后再请求才能生效。

@class SessionInDb

支持将会话存在数据库表Session中。在多机部署应用服务时，有时不方便用文件保存会话，这时可以切换为用数据库保存。
先在DESIGN.md中声明表并使用upgrade工具创建表:

	@Session: id, name, value(t), tm

然后在conf.php或conf.user.php中添加：

	// 使用数据库保存会话
	session_set_save_handler(new SessionInDb(), true);
	// ini_set("session.gc_maxlifetime", "1440"); // 配置会话超时时间，默认24分钟

## 动态修改环境配置项

在程序中可动态设置部分参数，比如一般建议debug日志只记错误（环境变量P_DEBUG_LOG设置为2），若想对于对外开发的某些接口调用记录所有日志，可以改为1，如：

	function api_fn1($env) {
		$env->DEBUG_LOG = 1; // 强制记录debug日志，也可设置0强制不记录；
		// 注意$env即全局JDEnv/DBEnv对象，在函数接口中是参数传入的，在AC类中可用$this->env来取。
		// $env->DBG_LEVEL = 9; // 对应环境配置项P_DEBUG

		// 以下不建议程序中修改
		// $env->TEST_MODE = 0; // 对应环境配置项P_TEST_MODE
		// $env->MOCK_MODE = 0; // 对应环境配置项P_MOCK_MODE
	}

**********************************************************/

require_once("common.php");

// ====== defines {{{
const RTEST_MODE=2;

//}}}

// ====== config {{{
/**
@var $BASE_DIR

Web主目录实际路径，即包含api.php的目录，即server目录。
为绝对路径，最后不带"/".

@var conf_dataDir

数据目录，默认值与$BASE_DIR相同，可在conf.user.php中改写，用于同一套程序部署多套环境。
程序输出的文件都应存放于此目录下，如session目录, 日志文件(trace.log/debug.log等), 上传目录(upload目录), JDStatusFile状态文件。
注意如果要设置，应设置为绝对路径。

示例：(php/conf.user.php中配置)

	if (strpos($_SERVER["SCRIPT_NAME"], "/jdcloud-a1/") === 0) {
		putenv("P_DB=localhost/jdcloud_a1");
		$GLOBALS["conf_dataDir"] = __DIR__ . "/../data-jdcloud-a1";
		// $GLOBALS["conf_dataDir"] = "/var/www/src/jdcloud/server/data-jdcloud-a1";
	}
	else if (strpos($_SERVER["SCRIPT_NAME"], "/jdcloud-a2/") === 0) {
		putenv("P_DB=localhost/jdcloud_a2");
		$GLOBALS["conf_dataDir"] = __DIR__ . "/../data-jdcloud-a2";
	}

*/
global $BASE_DIR;
$BASE_DIR = dirname(dirname(__DIR__));

$GLOBALS["conf_dataDir"] = $BASE_DIR;

// 配置项默认值（可在conf.user.php中覆盖）
$GLOBALS["conf_jdserverUrl"] = 'http://127.0.0.1/jdserver';

/**
@key conf_poweredBy ?= "jdcloud"

设置HTTP头x-powered-by，用于与x-daca-server-rev一起共同决定系统版本。
同时可隐藏默认的php标识及版本。

当前端调用多个jdcloud应用接口（或有些后端接口配置了代理到其它服务）时，
由于各jdcloud应用的版本不同， 会导致前端误判为版本已升级，从而引起前端自动刷新。 
这时可在conf.user.php中配置conf_poweredBy，用于与其它应用区分。示例： 

	$GLOBALS["conf_poweredBy"] = "wms";
	或
	$GLOBALS["conf_poweredBy"] = "wms@server-pc";

jdcloud前端检查当x-powered-by未变化但x-daca-server-rev变化时，才会自动刷新实现实时热更新。 
*/
$GLOBALS["conf_poweredBy"] = "jdcloud";

$GLOBALS["conf_disableSkipLog"] = false;

/**
@var conf_mssql_translateMysql = true

默认为true，即应用层可以使用部分mysql语法（常用于虚拟字段定义），框架自动转换为mssql/sqlserver数据库的T-SQL语法。
支持：

- LIMIT分页: 使用TOP或OFFSET/FETCH替代. 支持"LIMIT 20" / "LIMIT 100,20"两种语法.
- group_concat函数: 使用string_agg替代(须sqlserver 2017以上版本). 支持order by / separator子句.
- if/ifnull函数: 使用iis/isnull替代等

@var conf_mssql_useOdbc = false

默认通过pdo_sqlsrv驱动连接mssql，若通过pdo_odbc连接，应设置为true
*/
$GLOBALS["conf_mssql_translateMysql"] = true;
$GLOBALS["conf_mssql_useOdbc"] = false;

/**
@var conf_sqlite_translateMysql = true

默认为true，即应用层可以使用部分mysql语法（常用于虚拟字段定义），框架自动转换为sqlite语法:

- 转换 if(cond, t, f) => case when cond then t else f end 
- 转换 concat(a, b) => (a || b)
*/
$GLOBALS["conf_sqlite_translateMysql"] = true;

$GLOBALS["conf_httpCallAsyncPort"] = 80;

/**
@var conf_slowSqlTime SQL慢查询阈值时间，默认值为1.0(秒).
@var conf_slowApiTime 慢接口阈值时间，默认值为1.0(秒).
@var conf_slowHttpCallTime Web调用慢的阈值时间，默认值为1.0(秒).

@key slow.log 慢查询日志

当操作时间超过阈值时间时，会记录到慢查询日志slow.log。
注意日志时间为SQL完成时的时间，日志时间减去操作时间才是开始时间。因此日志顺序与执行顺序不一定相同。
*/
$GLOBALS["conf_slowSqlTime"] = 1.0;
$GLOBALS["conf_slowApiTime"] = 1.0;
$GLOBALS["conf_slowHttpCallTime"] = 1.0;

/**
@var conf_batchAddMaxErrors ?=20

导入时，最多允许报错的条目数。
*/
$GLOBALS["conf_batchAddMaxErrors"] = 20;

/**
@var conf_maxLogFileSize ?=100000000

写日志文件的最大字节数，默认为100MB，例如写trace.log文件，当超过100MB后会自动转存为trace.log.1。
这样的话写trace日志最多消耗约200MB空间。

*/
$GLOBALS["conf_maxLogFileSize"] = 100000000; // 100MB

/**
@var conf_bigTables

在管理端列表页显示大表（如超过1000万行）时，虽然有分页，但因为page参数会自动查询总数量而特别慢。将表加到该配置可跳过取数量，使得大表得以立即显示。示例：

	$GLOBALS["conf_bigTables"] = ["Sn", "SnLog"];

*/
$GLOBALS["conf_bigTables"] = [];

initAppFw();
// }}}

// load user config
$userConf = "{$BASE_DIR}/php/conf.user.php";
file_exists($userConf) && include_once($userConf);

// ====== functions {{{
function initAppFw()
{
	mb_internal_encoding("UTF-8");
	//setlocale(LC_ALL, "zh_CN.UTF-8"); // NOTE: en_US的兼容性更好。很多服务器上只安装有en_US.UTF-8(可用`locale -a`查看), 此时如果设置为zh_CN.UTF-8，则`basename("中文.txt")`会输出".txt"!
	setlocale(LC_ALL, "en_US.UTF-8");
	umask(2); // 写文件时(如file_put_contents)，默认组可写

	// assert失败中止运行
	assert_options(ASSERT_BAIL, 1);
}

// ==== param {{{

# $name with type: 
# 	end with "Id" or "/i": int
# 	end with "/b": bool
# 	end with "/dt" or "/tm": datetime
# 	end with "/n": numeric
# 	end with "/i+": int array
# 	end with "/js": json object
# 	default or "/s": string
# fix $name and return type: "id"-int/encrypt-int, "i"-int, "b"-bool, "n"-numeric, "i+"-int[], "js"-object, "s"-string
# support list(i:n:b:dt:tm). e.g. 参数"items"类型为list(id/Integer, qty/Double, dscr/String)，可用param("items/i:n:s")获取
function parseType_(&$name)
{
	$type = null;
	if (($n=strpos($name, "/")) !== false)
	{
		$type = substr($name, $n+1);
		$name = substr($name, 0, $n);
	}
	else {
		if ($name === "id" || substr($name, -2) === "Id") {
			$type = "id";
		}
		else {
			$type = "s";
		}
	}
	return $type;
}

/**
@fn param_varr($str, $type, $name)

type的格式如"i:n:b?:dt:tm?".

	$ordr1 = param_varr("10:1.5,11:2.0", "i:n", "ordr1"); // [ [10, 1.5], [11, 2.0] ] 注意类型已转换
	$ordr1 = varr2objarr($ordr1, ["itemId", "qty"]); // [ ["itemId"=>10, "qty"=>1.5], ["itemId"=>11, "qty"=>2.0] ]

	// 一般通过param调用来取值：
	$ordr1 = param("ordr1/i:n", null, "P"); // 从$_POST中取ordr1参数。
	$ordr1 = varr2objarr($ordr1, ["itemId", "qty"]); 

	// 只有单个列的特殊写法
	$snLog1 = param_varr("10,11,12", "i:", "snLog1"); // [ [10], [11], [12] ]
	$snLog1 = varr2objarr($snLog1, ["snId"]); // [ ["snId"=>10], ["snId"=>11], ["snId"=>12] ]

- 每个词表示一个字段类型
  类型标识：i-Integer; n-Number/Double; b-Boolean(0/1); dt/tm-DateTime
- 后置"?"表示该参数可缺省。

@see param
@see list2varr
@see varr2objarr
 */
function param_varr($str, $type, $name)
{
	$ret = [];
	$elemTypes = [];
	foreach (explode(":", $type) as $t) {
		$tlen = strlen($t);
		if ($tlen === 0)
			continue;
		$optional = false;
		if ($t[$tlen-1] === '?') {
			$t = substr($t, 0, $tlen-1);
			$optional = true;
		}
		$elemTypes[] = [$t, $optional];
	}
	$colCnt = count($elemTypes);

	foreach (explode(',', $str) as $row0) {
		$row = explode(':', $row0, $colCnt);
		while (count($row) < $colCnt) {
			$row[] = null;
		}

		$i = 0;
		$row1 = [];
		foreach ($row as $e) {
			list($t, $optional) = $elemTypes[$i];
			if ($e == null || $e === "null") {
				if ($optional) {
					++$i;
					$row1[] = null;
					continue;
				}
				jdRet(E_PARAM, "Bad Request - param `$name`: list($type). require col: `$row0`[$i]");
			}
			$e = htmlEscape($e);
			if ($t === "i") {
				if (! ctype_digit($e))
					jdRet(E_PARAM, "Bad Request - param `$name`: list($type). require integer col: `$row0`[$i]=`$e`.");
				$row1[] = intval($e);
			}
			elseif ($t === "n") {
				if (! is_numeric($e))
					jdRet(E_PARAM, "Bad Request - param `$name`: list($type). require numberic col: `$row0`[$i]=`$e`.");
				$row1[] = doubleval($e);
			}
			else if ($t === "b") {
				$val = null;
				if (!tryParseBool($e, $val))
					jdRet(E_PARAM, "Bad Request - param `$name`: list($type). require bool col: `$row0`[$i]=`$e`.");
				$row1[] = $val;
			}
			else if ($t === "s") {
				$row1[] = $e;
			}
			else if ($t === "dt" || $t === "tm") {
				$v = strtotime($e);
				if ($v === false)
					jdRet(E_PARAM, "Bad Request - param `$name`: list($type). require datetime col: `$row0`[$i]=`$e`.");
				if ($t === "dt")
					$v = strtotime(date("Y-m-d", $v));
				$row1[] = $v;
			}
			else {
				jdRet(E_SERVER, "unknown elem type `$t` for param `$name`: list($type)");
			}
			++ $i;
		}
		$ret[] = $row1;
	}
	if (count($ret) == 0)
		jdRet(E_PARAM, "Bad Request - list param `$name` is empty.");
	return $ret;
}
/**
@fn param($name, $defVal?, $col?, $doHtmlEscape=true, $env = null)

@param $col: 默认先取$_GET再取$_POST，"G" - 从$_GET中取; "P" - 从$_POST中取
$col也可以直接指定一个集合，如

	param($name, $defVal, $param)

获取名为$name的参数。
$name中可以指定类型，返回值根据类型确定。如果该参数未定义或是空串，直接返回缺省值$defVal。

$name中指定类型的方式如下：
- 名为"id", 或以"Id"或"/i"结尾: int
- 以"/b"结尾: bool. 可接受的字符串值为: "1"/"true"/"on"/"yes"=>true, "0"/"false"/"off"/"no" => false
- 以"/dt": datetime, 仅有日期部分
- 以"/tm"结尾: datetime
- 以"/n"结尾: numeric/double
- 以"/s"结尾（缺省）: string. 缺省为防止XSS攻击会做html编码，如"a&b"处理成"a&amp;b"，设置参数doHtmlEscape可禁用这个功能。
- 复杂类型(数组)：以"/i+"结尾: int array
- 复杂类型：以"/js"结尾: json object
- 复杂类型(二维数组)：List类型（以","分隔行，以":"分隔列），类型定义如"/i:n:b:dt:tm" （列只支持简单类型，不可为复杂类型）

示例：

	$id = param("id");
	$svcId = param("svcId/i", 99);
	$wantArray = param("wantArray/b", false);
	$startTm = param("startTm/dt", time());

List类型示例。参数"items"类型在文档中定义为list(id/Integer, qty/Double, dscr/String)，可用param("items/i:n:s")获取, 值如

	items=100:1:洗车,101:1:打蜡

返回

	[ [ 100, 1.0, "洗车"], [101, 1.0, "打蜡"] ]

如果某列可缺省，用"?"表示，如param("items/i:n?:s?")可获取值：

	items=100:1,101::打蜡

返回

	[ [ 100, 1.0, null], [101, null, "打蜡"] ]

要转换成objarr，可以用：

	$varr = param("items/i:n?:s?");
	$objarr = varr2objarr($var, ["id", "qty", "dscr"]);

$objarr值为：

	[
		[ "id"=>100, "qty"=>1.0, dscr=>null],
		[ "id"=>101, "qty"=>null, dscr=>"打蜡"]
	]

(v6) 对cond参数或cond类型是特别处理的，会自动从GET/POST中取值，并且支持字符串、数组、键值对多种形式，参考getQueryCond：

	$cond = mparam("cond");
	$gcond = param("gcond/cond");
*/
function param($name, $defVal = null, $col = null, $doHtmlEscape = true, $env = null)
{
	$type = parseType_($name); // NOTE: $name will change.

	$ret = $defVal;
	$col2 = null;

	if (! is_array($col)) {
		if ($env === null) {
			$env = getJDEnv();
			if (!$env)
				jdRet(E_SERVER, "param: no env");
		}
		if ($col === "G") {
			$col = $env->_GET;
		}
		else if ($col === "P") {
			$col = $env->_POST;
		}
		else {
			$col = $env->_GET;
			$col2 = $env->_POST;
		}
	}
	// cond特别处理
	if ($name == "cond" || $type == "cond") {
		if ($col2)
			return getQueryCond([$col[$name], $col2[$name]]);
		return getQueryCond($col[$name]);
	}
	if (isset($col[$name]))
		$ret = $col[$name];
	else if ($col2 && isset($col2[$name]))
		$ret = $col2[$name];

	// e.g. "a=1&b=&c=3", b当成未设置，取缺省值。
	if ($ret === "")
		return $defVal;

	# check type
	if (isset($ret) && is_string($ret)) {
		// avoid XSS attack
		if ($doHtmlEscape)
			$ret = htmlEscape($ret);
		if ($type === "s") {
		}
		elseif ($type === "id") {
			if (! is_numeric($ret)) {
				$ret1 = jdEncryptI($ret, "D", "hex");
				if (! is_numeric($ret1))
					jdRet(E_PARAM, "Bad Request - id param `$name`=`$ret`.");
				$ret = $ret1;
			}
			$ret = intval($ret);
		}
		elseif ($type === "i") {
			if (! is_numeric($ret))
				jdRet(E_PARAM, "Bad Request - integer param `$name`=`$ret`.");
			$ret = intval($ret);
		}
		elseif ($type === "n") {
			if (! is_numeric($ret))
				jdRet(E_PARAM, "Bad Request - numeric param `$name`=`$ret`.");
			$ret = doubleval($ret);
		}
		elseif ($type === "b") {
			$val = null;
			if (!tryParseBool($ret, $val))
				jdRet(E_PARAM, "Bad Request - bool param `$name`=`$val`.");
			$ret = $val;
		}
		elseif ($type == "i+") {
			$arr = [];
			foreach (explode(',', $ret) as $e) {
				if (! ctype_digit($e))
					jdRet(E_PARAM, "Bad Request - int array param `$name` contains `$e`.");
				$arr[] = intval($e);
			}
			if (count($arr) == 0)
				jdRet(E_PARAM, "Bad Request - int array param `$name` is empty.");
			$ret = $arr;
		}
		elseif ($type === "dt" || $type === "tm") {
			$ret1 = strtotime($ret);
			if ($ret1 === false)
				jdRet(E_PARAM, "Bad Request - invalid datetime param `$name`=`$ret`.");
			if ($type === "dt")
				$ret1 = strtotime(date("Y-m-d", $ret1));
			$ret = $ret1;
		}
		elseif ($type === "js" || $type === "tbl") {
			$ret1 = json_decode($ret, true);
			if ($ret1 === null)
				jdRet(E_PARAM, "Bad Request - invalid json param `$name`=`$ret`.");
			if ($type === "tbl") {
				$ret1 = table2objarr($ret1);
				if ($ret1 === false)
					jdRet(E_PARAM, "Bad Request - invalid table param `$name`=`$ret`.");
			}
			$ret = $ret1;
		}
		else if (strpos($type, ":") >0)
			$ret = param_varr($ret, $type, $name);
		else 
			jdRet(E_SERVER, "unknown type `$type` for param `$name`");
	}
# 	$name1 = strtoupper("HTTP_$name");
# 	if (isset($_SERVER[$name1]))
# 		return $_SERVER[$name1];
	return $ret;
}

/** 
@fn mparam($name, $col = null, $doHtmlEscape = true, $env = null)
@brief mandatory param

@param col 'G'-从URL参数即$_GET获取，'P'-从POST参数即$_POST获取。参见param函数同名参数。

$name可以是一个数组，表示至少有一个参数有值，这时返回每个参数的值。
参考param函数，查看$name如何支持各种类型。

注意：即使传入值是空串，也会当作未传值而报错！

示例：

	$svcId = mparam("svcId");
	$svcId = mparam("svcId/i");
	$itts = mparam("itts/i+")
	list($svcId, $itts) = mparam(["svcId", "itts/i+"]); # require one of the 2 params
*/
function mparam($name, $col = null, $doHtmlEscape = true, $env = null)
{
	if (is_array($name))
	{
		$arr = [];
		$found = false;
		foreach ($name as $name1) {
			if ($found) {
				$rv = null;
			}
			else {
				$rv = param($name1, null, $col, $doHtmlEscape, $env);
				if (isset($rv))
					$found = true;
			}
			$arr[] = $rv;
		}
		if (!$found) {
			$s = join(" or ", $name);
			jdRet(E_PARAM, "Bad Request - require param $s", "缺少参数`$s`");
		}
		return $arr;
	}

	$rv = param($name, null, $col, $doHtmlEscape, $env);
	if (isset($rv))
		return $rv;
	parseType_($name); // remove the type tag.
	jdRet(E_PARAM, "Bad Request - param `$name` is missing", "缺少参数`$name`");
}

/**
@fn getConf($confName, $arr=$GLOBALS)

取配置项，如果未配置则报错。

	$url = getConf("conf_jdserverUrl");

若不想报错则直接取：

	if (isset($GLOBALS["conf_xxx"])) ...

如果希望用户未配置时返回缺省值，可直接先配置其缺省值（应确保在conf.user.php中可被覆盖）：

	$GLOBALS["conf_jdserverUrl"] = "http://...";

*/
function getConf($confName, $arr=null)
{
	if ($arr === null)
		$arr = $GLOBALS;
	if (!array_key_exists($confName, $arr))
		jdRet(E_SERVER, "require conf $confName", "参数未配置: $confName");
	return $arr[$confName];
}

/**
@fn checkParams($obj, $names, $errPrefix?)

检查$obj对象中指定的必填参数（通过names指定）。
检查失败直接抛出异常，不再向下执行。

示例：obj中必须有"brand", "vendorName"字段，否则应报错：

	checkParams($order, [
		"brand", "vendorName"
	]);
	// 报错示例: "缺少参数`vendorName`"

或如果希望报错时明确一些，可以翻译一下参数，这样来指定：

	checkParams($order, [
		"brand" => "品牌",
		"vendorName" => "供应商",
		"phone" // 也允许不指定名字
	], "传入订单对象"); // 可选的第三参数errPrefix用于报错前缀
	// 报错示例: "传入订单对象缺少参数`供应商(vendorName)`"

注意：它只检查是否有该字段，不检查该字段是否为null或空串("")。

对于对象数组，可以用checkObjArrParam函数，示例

	checkObjArrParam(null, $_POST, ["MATNR"=>"物料号", "MAKTX"=>"物料名"]);

它相当于

	foreach ($_POST as $i=>$e) {
		checkParams($e, ["MATNR"=>"物料号", "MAKTX"=>"物料名"], "第".($i+1)."行"); // 设置第3参数，可让报错时前面会加上这个描述
		...
	}

@see checkObjArrParams 对象数组参数检查
*/
function checkParams($obj, $fields, $errPrefix="")
{
	foreach ($fields as $name=>$showName) {
		if (is_int($name))
			$name = $showName;
		else
			$showName .= "({$name})";
		if (!isset($obj[$name]) || $obj[$name] === "") {
			jdRet(E_PARAM, "require param `$name`", $errPrefix."缺少参数`$showName`");
		}
	}
}

/**
@fn checkObjArrParams($objArr, $fields=null, $name='数组')

检查对象数组$arr中是否填写字段，$name为数组名，用于报错。
检查失败直接抛出异常，不再向下执行。

	$personArr = [
		["id" => 100, "name" => "name1"],
		["id" => 101 ],
	];
	checkObjArrParams($personArr, ["id","name"]); 
	// 报错: "数组第2行: 缺少参数`name`"

或指定报错名称：

	checkObjArrParams($personArr, ['id'=>'编号','name'=>'姓名'], 'personArr数组');
	// 报错: "personArr数组第2行: 缺少参数`姓名(name)`"

@see checkParams 对象参数检查
*/
function checkObjArrParams($objArr, $fields = null, $paramName = '数组')
{
	#var_export($arr);
	if (! is_array($objArr))
		jdRet(E_PARAM, "bad param `$paramName` - require array", "{$paramName}参数错误: 必须为数组");
	if (isset($fields)) {
		$i = 0;
		foreach ($objArr as $e) {
			++ $i;
			checkParams($e, $fields, $paramName . "第{$i}行");
		}
	}
}

function getRsHeader($sth)
{
	$h = [];
	# !!! if no data, getColumnMeta() will throw exception!
	try {
		for($i=0; $i<$sth->columnCount(); ++ $i) {
			$meta = $sth->getColumnMeta($i);
			$h[] = $meta["name"];
		}
	} catch (Exception $e) {}
	return $h;
}

/**
@fn queryAllWithHeader($sql, $wantArray=false)
@alias getRsAsTable($sql)

查询SQL，返回筋斗云table格式：{@h, @d} 
h是标题字段数组，d是数据行。
即queryAll函数的带表格标题版本。

	$tbl = queryAllWithHeader("SELECT id, name FROM User");

返回示例：

	[
		"h"=>["id","name"],
		"d"=>[ [1,"name1"], [2, "name2"]]
	]

如果查询结果为空，则返回：

	[ "h" => [], "d" => [] ];

如果指定了参数$wantArray=true, 则返回二维数组，其中首行为标题行：

	$tbl = queryAllWithHeader("SELECT id, name FROM User", true);

返回：

	[ ["id", "name"], [1, "name1"], [2, "name2"] ]

如果查询结果为空，则返回:

	[ [], [] ]

@see queryAll
 */
function queryAllWithHeader($sql, $wantArray=false)
{
	$env = getJDEnv();
	$DBH = $env->dbconn();
	$sth = $DBH->query($sql);

	$h = getRsHeader($sth);
	$d = $sth->fetchAll(PDO::FETCH_NUM);

	if ($wantArray) {
		$ret = array_merge([$h], $d);
	}
	else {
		$ret = ["h"=>$h, "d"=>$d];
	}
	return $ret;
}

function getRsAsTable($sql)
{
	return queryAllWithHeader($sql);
}

/**
@fn sortBySeq($arr, $seq)

确保$arr数组中元素顺序与$seq数组中一致。
示例：

	$arr = ["id","age","name","prop"]
	sortBySeq($arr, ["name", "age", "score"]);
	// $arr为 ["id","name","age","prop"]

注意: $seq中未指定的元素(如上例$arr中的"prop")，或是多指定的元素(如"score"在$arr中不存在)，都忽略不管，最终确保$arr中顺序与$seq不冲突即可。

算法: 重新赋值$arr中在$seq指定的元素，如上例中重新赋值两个：

	$arr[1]="name";
	$arr[2]="age";
*/
function sortBySeq(&$arr, $seq)
{
	$idxArr = [];
	$seq1 = [];
	foreach ($seq as $e) {
		$i = array_search($e, $arr);
		if ($i !== false) {
			$idxArr[] = $i;
			$seq1[] = $e;
		}
	}
	sort($idxArr);
	foreach ($idxArr as $i) {
		$arr[$i] = array_shift($seq1);
	}
}

/**
@fn objarr2table ($objarr, $fixedColCnt=null, $seq=null)

将objarr格式转为table格式, 如：

	objarr2table(
		[
			["id"=>100, "name"=>"A"],
			["id"=>101, "name"=>"B"]
	   	]
	) -> 
		[
			"h"=>["id", "name"],
			"d"=>[ 
				[100,"A"], 
				[101,"B"]
		   	] 
		]

注意：
- objarr每行中列的顺序可以不一样，table列按首行顺序输出。
- 每行中列数可以不一样，这时可指定最少固定列数 $fixedColCnt, 而该列以后，将自动检查所有行决定是否加到header中。例：

	objarr2table(
		[
			["id"=>100, "name"=>"A"], 
			["name"=>"B", "id"=>101, "flag_v"=>1],
			["id"=>102, "name"=>"C", "flag_r"=>1]
		], 2  // 2列固定
	) -> 
		[
			"h"=>["id", "name", "flag_v", "flag_r"],
			"d"=>[ 
				[100,"A", null,null], 
				[101,"B", 1, null],
				[102,"C", null, 1]
			]
		]

可选参数$seq是个数组，可指定列顺序，如上例中指定$seq=`["name", "id"]`，则最终的列数组将为`["name", "id", "flag_v", "flag_r"]`。

@see table2objarr
@see varr2objarr
*/
function objarr2table($rs, $fixedColCnt=null, $seq = null)
{
	$h = [];
	$d = [];
	if (count($rs) == 0)
		return ["h"=>$h, "d"=>$d];
	// NOTE: 避免rs[0]中含有数字值的key
	foreach ($rs[0] as $k=>$v) {
		$h[] = (string)$k;
	}
	if (isset($fixedColCnt)) {
		foreach ($rs as $row) {
			$h1 = array_keys($row);
			for ($i=$fixedColCnt; $i<count($h1); ++$i) {
				if (array_search($h1[$i], $h) === false) {
					$h[] = (string)$h1[$i];
				}
			}
		}
	}
	// 确保按$seq中指定的列顺序. 
	if ($seq) {
		sortBySeq($h, $seq);
	}

	$n = 0;
	foreach ($rs as $row) {
		$d[] = [];
		foreach ($h as $k) {
			$d[$n][] = @$row[$k];
		}
		++ $n;
	}
	return ["h"=>$h, "d"=>$d];
}

/**
@fn table2objarr

将table格式转为 objarr, 如：

	table2objarr(
		[
			"h"=>["id", "name"],
			"d"=>[ 
				[100,"A"], 
				[101,"B"]
		   	] 
		]
	) -> [ ["id"=>100, "name"=>"A"], ["id"=>101, "name"=>"B"] ]

 */
function table2objarr($tbl)
{
	if (! @(is_array($tbl["d"]) && is_array($tbl["h"])))
		return false;
	$ret = [];
	if (count($tbl["d"]) == 0)
		return $ret;
	if (count($tbl["h"]) != count($tbl["d"][0]))
		return false;
	return varr2objarr($tbl["d"], $tbl["h"]);
}

/** 
@fn varr2objarr

将类型 varr (仅有值的二维数组, elem=[$col1, $col2] ) 转为 objarr (对象数组, elem={col1=>cell1, col2=>cell2})

例：

	varr2objarr(
		[ [100, "A"], [101, "B"] ], 
		["id", "name"] )
	-> [ ["id"=>100, "name"=>"A"], ["id"=>101, "name"=>"B"] ]

 */
function varr2objarr($varr, $headerLine)
{
	$ret = [];
	foreach ($varr as $row) {
		$ret[] = array_combine($headerLine, $row);
	}
	return $ret;
}

/**
@fn list2varr(ls, colSep=':', rowSep=',')

- ls: 代表二维表的字符串，有行列分隔符。
- colSep, rowSep: 列分隔符，行分隔符。

将字符串代表的压缩表("v1:v2:v3,...")转成值数组。

e.g.

	$users = "101:andy,102:beddy";
	$varr = list2varr($users);
	// $varr = [["101", "andy"], ["102", "beddy"]];
	$objarr = $varr2objarr($varr, ["id", "name"]); // [ ["id"=>"101", "name"=>"andy"], ["id"=>"102", "name"=>"beddy"] ]
	
	$cmts = "101\thello\n102\tgood";
	$varr = list2varr($cmts, "\t", "\n");
	// $varr=[["101", "hello"], ["102", "good"]]

@see varr2objarr
@see param_varr
 */
function list2varr($ls, $colSep=':', $rowSep=',')
{
	$ret = [];
	foreach(explode($rowSep, $ls) as $e) {
		$e = trim($e);
		if (!$e)
			continue;
		$ret[] = explode($colSep, $e);
	}
	return $ret;
}
//}}}

// ==== database {{{
/**
@fn getCred($cred) -> [user, pwd]

$cred为"{user}:{pwd}"格式，支持使用base64编码。
示例：

	list($user, $pwd) = getCred(getenv("P_ADMIN_CRED"));
	if (! isset($user)) {
		// 未设置用户名密码
	}

*/
function getCred($cred)
{
	if (! $cred)
		return null;
	if (stripos($cred, ":") === false) {
		$cred = base64_decode($cred);
	}
	return explode(":", $cred, 2);
}
 
/**
@fn dbconn($fnConfirm=$GLOBALS["dbConfirmFn"])
@param fnConfirm fn(dbConnectionString), 如果返回false, 则程序中止退出。
@key dbConfirmFn 连接数据库前回调。

连接数据库

数据库由环境变量P_DB指定，格式可以为：

	host1/carsvc (无扩展名，表示某主机host1下的mysql数据库名；这时由 环境变量 P_DBCRED 指定用户名密码。

	dir1/dir2/carsvc.db (以.db文件扩展名标识的文件路径，表示SQLITE数据库）

环境变量 P_DBCRED 指定用户名密码，格式为 base64(dbuser:dbpwd).
 */
function dbconn($fnConfirm = null)
{
	$env = getJDEnv();
	return $env->dbconn($fnConfirm);
}

/**
@fn dbCommit($doRollback=false)

中间先提交一次事务，然后进入另一个事务。

用于一段事务执行完后及时提交，避免下一段出问题后导致全部回滚，示例：

	// 上一批完成出库
	$this->outOfBinDone(["portType" => "出库缓存架 OR 出库缓存架-大件"]);
	dbCommit();
	//处理当前出库单据
	$this->outOfBin($_POST);

*/
function dbCommit($doRollback=false)
{
	$env = getJDEnv();
	return $env->dbCommit($doRollback);
}

/**
@fn Q($str, $env=null)

quote string

一般是把字符串如"abc"转成加单引号的形式"'abc'". 适用于根据用户输入串拼接成SQL语句时，对输入串处理，避免SQL注入。

示例：

	$sql = sprintf("SELECT id FROM User WHERE uname=%s AND pwd=%s", Q(param("uname")), Q(param("pwd")));

注意不同数据库对转义处理不同，如mysql将"'"转义为"\'"，而sqlite转义为"''"。
如果未指定$env，则取当前$env.
 */
function Q($s, $env=null)
{
	if ($s === null)
		return "null";
	if ($env === null)
		$env = getJDEnv();
	if ($env->DBTYPE == "mssql") {
		return "N'" . str_replace("'", "''", $s) . "'";
	}
	$dbh = $env->DBH;
	if ($dbh == null) {
		return qstr($s, "'");
	}
	return $dbh->quote($s);
}

function sql_concat()
{
	$env = getJDEnv();
	if ($env->DBTYPE == "mysql")
		return "CONCAT(" . join(", ", func_get_args()) . ")";

	# sqlite3
	return join(" || ", func_get_args());
}

/**
@fn getQueryCond(cond)

根据cond生成查询条件字符串。其中cond可以是

- null，忽略

- 条件字符串，参考SQL语句WHERE条件语法（不支持函数、子查询等），示例：

		"100"或100 生成 "id=100"
		"id=1"
		"id>=1 and id<100"
		"status='CR'"  注意字符串要加引号
		"status IN ('CR','PA')"
		"tm>='2020-1-1' AND tm<'2020-2-1'"
		"name like 'wang%' OR dscr like 'want%'"
		"name IS NULL OR dscr IS NOT NULL"

- 键值对，键为字段名，值为查询条件，使用更加直观（如字符串不用加引号），如：

		[
			"id"=>1,
			"status"=>"CR",
			"name"=>"null",
			"dscr"=>null,
			"f1"=>"",
			"f2"=>"empty"
		]
		生成 "id=1 AND status='CR'" AND name IS NULL AND f2=''"
		注意，当值为null或空串时会忽略掉该条件，所以dscr和f1参数没有进入条件；用字符串"null"表示"IS NULL"条件，用字符串"empty"表示空串。

		可以使用符号： > < >= <= !(not) ~(like匹配)
		[
			"id>=" => 100, 
			"id<=" => 200,
			"tm>=" => "2020-1-1",
			"tm<"  => "2021-1-1",
			"status!"=>"CR",
			"name~" => "wang%",
			"dscr~" => "aaa",
			"dscr2!~" =>"aaa"
		]
		生成 "id>=100 AND id<=200 AND tm>='2020-1-1" AND tm<'2021-1-1' AND status<>'CR' AND name LIKE 'wang%' AND dscr LIKE '%aaa%' AND dscr2 NOT LIKE '%aaa%'"
		同样，如果值是null或""，则它不进入条件，如 `["id>=" => 100, "id<" => null]`生成条件为 `id>=100`

		这样比较方便拼接条件，例如前端调用`callSvr("Ordr", {cond:{"createTm>=":tm1, "createTm<":tm2}})`，当tm1或tm2为空不产生条件;
		后端也是类似，例如：

			$tm1 = param("tm1");
			$tm2 = param("tm2");
			$cond = getQueryCond(["createTm>=" => $tm1, "createTm<"=>$tm2]); // 如果tm1或tm2为空，则不产生条件

		也可以将符号放在值中（但这样则无法同一字段指定多次）：
		["id"=>"<100", "tm"=>">2020-1-1", "status"=>"!CR", "name"=>"~wang%", "dscr"=>"~aaa", "dscr2"=>"!~aaa"]
		生成 "id<100 AND tm>'2020-1-1" AND status<>'CR' AND name LIKE 'wang%' AND dscr LIKE '%aaa%' AND dscr2 NOT LIKE '%aaa%'"
		like用于字符串匹配，字符串中用"%"或"*"表示通配符，如果不存在通配符，则表示包含该串(即生成'%xxx%')

		支持IN和NOT IN:
		["id"=>"IN 100,101", "status"=>"NOT IN CA,XX"]
		生成"id IN (1,2,3) AND status NOT IN ('CR','XX')"

		["b"=>"!null", "d"=>"!empty"]
		生成 "b IS NOT NULL" AND d<>''"

	可用AND或OR连接多个条件，但不可加括号嵌套：

		["tm"=>">=2020-1-1 AND <2020-2-1", "tm2"=>"<2020-1-1 OR >=2020-2-1"]
		生成 "(tm>='2020-1-1' AND tm<'2020-2-1') AND (tm2<'2020-1-1' OR tm2>='2020-2-1')"

		["id"=>">=1 AND <100", "status"=>"CR OR PA", "status2"=>"!CR AND !PA OR null"]
		生成 "(id>=1 AND id<100) AND (status='CR' OR status='PA') AND (status2<>'CR" AND status2<>'PA' OR status2 IS NULL)"

		["a"=>"null OR empty", "b"=>"!null AND !empty", "_or"=>1]
		生成 "(a IS NULL OR a='') OR (b IS NOT NULL AND b<>'')", 默认为AND条件, `_or`选项用于指定OR条件


- 数组，每个元素是上述条件字符串或键值对，如：

		["id>=1", "id<100", "name LIKE 'wang%'"] // "id>=1 AND id<100" AND name LIKE 'wang%'"
		等价于 ["id"=>">=1 AND <100", "name"=>"~wang%"] 或混合使用 [ ["id"=>">=1 AND <100"], "name LIKE 'wang%'"]
		["id=1", "id=2", "_or"=>true]  // 下划线开头是特别选项，"_or"表示用或条件，生成"id=1 OR id=2"

支持前端传入的get/post参数中同时有cond参数，且cond参数允许为数组，比如传

	URL中：cond[]=a=1&cond[]=b=2
	POST中：cond=c=3

后端处理

	getQueryCond([$_GET["cond"], $_POST["cond"]]);

最终得到cond参数为"a=1 AND b=2 AND c=3"。

前端callSvr示例: url参数或post参数均可支持数组或键值对：

	callSvr("Hub.query", {res:"id", cond: {id: ">=1 AND <100"}})
	callSvr("Hub.query", {res:"id", cond: ["id>=1", "id<100"]}, $.noop, {cond: {name:"~wang%", dscr:"~111"}})

字段名支持中文，也支持带表名如`t0.xxx`的形式：

	$cond = getQueryCond([
		"t0.createTm>=" => $tm1,
		"t0.createTm<"  => $tm2
	]);

*/
function getQueryCond($cond)
{
	if ($cond === null || $cond === "ALL")
		return null;
	if (is_numeric($cond))
		return "id=$cond";
	if (!is_array($cond))
		return $cond;
	
	$condArr = [];
	$isOR = false;
	if (@$cond["_or"]) {
		$isOR = true;
	}
	foreach($cond as $k=>$v) {
		if ($v === null)
			continue;
		if (is_int($k)) {
			$exp = getQueryCond($v);
		}
		else if ($k[0] == "_" || $v === null || $v === "") {
			continue;
		}
		else if (preg_match('/^([.\w]+)\s*([<>=!~]+)$/u', $k, $ms)) {
			$exp = getQueryExp($ms[1], $v, $ms[2]);
		}
		else {
			// key => value, e.g. { id: ">100 AND <20", name: "~wang*", status: "CR OR PA", status2: "!CR AND !PA OR null"}
			$exp = preg_replace_callback('/(.+?)(\s+(AND|OR)\s+|$)/i', function ($ms) use ($k) {
				return getQueryExp($k, $ms[1]) . $ms[2];
			}, $v);
		}
		if (!$exp)
			continue;
		$condArr[] = $exp;
	}
	if (count($condArr) == 0)
		return null;
	// 超过1个条件时，对复合条件自动加括号
	if (count($condArr) > 1) {
		foreach ($condArr as &$exp) {
			if (stripos($exp, ' and ') !== false || stripos($exp, ' or ') !== false) {
				$exp = "($exp)";
			}
		}
		unset($exp);
	}
	return join($isOR?' OR ':' AND ', $condArr);
}

// similar to h5 getexp but not same
function getQueryExp($k, $v, $op = '=')
{
	// 即使纯数值最好也加引号，不容易出错，特别是对0开头或很长数字的字符串
// 	if (is_numeric($v))
// 		return "$k='$v'";  
	if ($v === "null")
		return "$k IS NULL";
	if ($v === "!null")
		return "$k IS NOT NULL";

	$isId = preg_match('/(^id|Id)\d*$/', $k); // "id", "orderId", "orderId2"
	$done = false;
	// {id: "IN 1,2,3", status: "NOT IN CA,XX"} => "id IN (1,2,3) AND status NOT IN ('CR','XX')"
	$v = preg_replace_callback('/^(IN|NOT IN) (.*)$/iu', function ($ms) use ($k, $isId, &$done) {
		$done = true;
		if ($isId && preg_match('/^[\d, ]+$/', $ms[2]))
			return $k . ' ' . $ms[1] . " ({$ms[2]})";

		$v1 = preg_replace_callback('/\w+/u', function ($ms1) {
			return Q($ms1[0]);
		}, $ms[2]);
		return $k . ' ' . $ms[1] . " ($v1)";
	}, $v);
	if ($done)
		return $v;

	$v = preg_replace_callback('/^[><=!~]+/', function ($ms) use (&$op) {
		if ($ms[0] == '!' || $ms[0] == '!=')
			$op = '<>';
		else if ($ms[0] == '~')
			$op = ' LIKE ';
		else if ($ms[0] == '!~')
			$op = ' NOT LIKE ';
		else
			$op = $ms[0];
		return "";
	}, $v);
	if ($v === "empty")
		$v = "";
	if (stripos($op, ' LIKE ') !== false) {
		$v = str_replace("*", "%", $v);
		if (strpos($v, '%') === false)
			$v = '%'.$v.'%';
	}
	if ($isId && is_numeric($v))
		return $k . $op . $v;
	return $k . $op . Q($v);
}

/**
@fn genQuery($sql, $cond)

连接SELECT主语句(不带WHERE条件)和查询条件。
示例：

	genQuery("SELECT id FROM Vendor", [name=>$name, "phone"=>$phone]);

注意：当传入$name为null而$phone非null时，只生成phone的条件；而若$name和$phone都是null时，则生成没有WHERE条件的SQL，返回所有数据。

其它示例：

	genQuery("SELECT id FROM Vendor", [name=>$name, "phone IS NOT NULL"]);
	genQuery("SELECT id FROM Vendor", [name=>$name, "phone"=>$phone, "_or"=>true]); // "name='eric' OR phone='13700000001'"

@see getQueryCond
*/
function genQuery($sql, $cond)
{
	$condStr = getQueryCond($cond);
	if (!$condStr)
		return $sql;
	return $sql . ' WHERE ' . $condStr;
}

/**
@fn execOne($sql, $getInsertId?=false)

@param $getInsertId?=false 取INSERT语句执行后得到的id. 仅用于INSERT语句。

执行SQL语句，如INSERT, UPDATE等。执行SELECT语句请使用queryOne/queryAll.

	$token = mparam("token");
	execOne("UPDATE Cinf SET appleDeviceToken=" . Q($token));

注意：在拼接SQL语句时，对于传入的string类型参数，应使用Q函数进行转义，避免SQL注入攻击。

对于INSERT语句，设置参数$getInsertId=true, 可取新加入数据行的id. 例：

	$sql = sprintf("INSERT INTO Hongbao (userId, createTm, src, expireTm, vdays) VALUES ({$uid}, '%s', '{$src}', '%s', {$vdays})", date('c', $createTm), date('c', $expireTm));
	$hongbaoId = execOne($sql, true);

(v5.1) 简单的单表添加和更新记录建议优先使用dbInsert和dbUpdate函数，更易使用。
上面两个例子，用dbInsert/dbUpdate函数，无须使用Q函数防注入，也无须考虑字段值是否要加引号：

	// 更新操作示例
	$cnt = dbUpdate("Cinf", ["appleDeviceToken" => $token], "ALL");

	// 插入操作示例
	$hongbaoId = dbInsert("Hongbao", [
		"userId"=>$uid,
		"createTm"=>date(FMT_DT, $createTm),
		"src" => $src, ...
	]);

@see dbInsert,dbUpdate,queryOne
 */
function execOne($sql, $getInsertId = false)
{
	$env = getJDEnv();
	return $env->execOne($sql, $getInsertId);
}

/**
@fn queryOne($sql, $assoc = false)

执行查询语句，只返回一行数据，如果行中只有一列，则直接返回该列数值。
如果查询不到，返回false.

示例：查询用户姓名与电话，默认返回值数组：

	$row = queryOne("SELECT name,phone FROM User WHERE id={$id}");
	if ($row === false)
		jdRet(E_PARAM, "bad user id");
	// $row = ["John", "13712345678"]

也可返回关联数组:

	$row = queryOne("SELECT name,phone FROM User WHERE id={$id}", true);
	if ($row === false)
		jdRet(E_PARAM, "bad user id");
	// $row = ["name"=>"John", "phone"=>"13712345678"]

当查询结果只有一列且assoc=false时，直接返回该数值。

	$phone = queryOne("SELECT phone FROM User WHERE id={$id}");
	if ($phone === false)
		jdRet(E_PARAM, "bad user id");
	// $phone = "13712345678"

(v5.3)
可将WHERE条件单独指定：$cond参数形式该函数getQueryCond

	$id = queryOne("SELECT id FROM Vendor", false, ["phone"=>$phone]);

注意：如果传入的$phone为null时，此时没有WHERE条件，返回第1条数据！

@see queryAll
@see getQueryCond
 */
function queryOne($sql, $assoc = false, $cond = null)
{
	$env = getJDEnv();
	return $env->queryOne($sql, $assoc, $cond);
}

/**
@fn queryAll($sql, $assoc = false)

执行查询语句，返回数组。
如果查询失败，返回空数组。

默认返回值数组(varr):

	$rows = queryAll("SELECT name, phone FROM User");
	if (count($rows) > 0) {
		...
	}
	// 值为：
	$rows = [
		["John", "13712345678"],
		["Lucy", "13712345679"]
		...
	]
	// 可转成table格式返回
	return ["h"=>["name", "phone"], "d"=>$rows];

也可以返回关联数组(objarr)，如：

	$rows = queryAll("SELECT name, phone FROM User", true);
	if (count($rows) > 0) {
		...
	}
	// 值为：
	$rows = [
		["name"=>"John", "phone"=>"13712345678"],
		["name"=>"Lucy", "phone"=>"13712345679"]
		...
	]
	// 可转成table格式返回
	return objarr2table($rows);

queryAll支持执行返回多结果集的存储过程，这时返回的不是单一结果集，而是结果集的数组：

	$allRows = queryAll("call syncAll()");

(v5.3)
可将WHERE条件单独指定：$cond参数形式该函数getQueryCond

	$rows = queryAll("SELECT id FROM Vendor", false, ["phone"=>$phone]);

注意：如果传入的$phone为null时，此时没有WHERE条件，返回所有数据！

@see objarr2table
@see getQueryCond
 */
function queryAll($sql, $assoc = false, $cond = null)
{
	$env = getJDEnv();
	return $env->queryAll($sql, $assoc, $cond);
}

/**
@fn dbInsert(table, kv, noEscape=false) -> newId

e.g. 

	$orderId = dbInsert("Ordr", [
		"tm" => date(FMT_DT),
		"tm1" => dbExpr("now()"), // 使用dbExpr直接提供SQL表达式
		"amount" => 100,
		"raw" => ["id"=>100, "name"=>"jack"], // (v5.5) 数组转JSON保存
		"dscr" => null // null字段会被忽略
	]);

为防止XSS攻击，默认会处理字段值，将">", "<"转义为"&gt;"和"&lt;"。如果想保持原始值，可以用：

	$id = dbInsert("Ordr", [
		"cond" => dbExpr(Q("amount > 100"))
	]);

或

	$id = dbInsert("Ordr", [
		"cond" => "amount > 100"
	], true); // noEscape=true

如需高性能大批量插入数据，可以用BatchInsert

@see BatchInsert
*/
function dbInsert($table, $kv, $noEscape=false)
{
	$env = getJDEnv();
	return $env->dbInsert($table, $kv, $noEscape);
}

/**
@class BatchInsert

大批量为某表添加记录，一次性提交。

	$bi = new BatchInsert($table, $headers, $opt=null);

- headers: 列名数组(如["name","dscr"])，或逗号分隔的字符串(如"name,dscr")
- opt.batchSize/i?=0: 指定批大小。0表示不限大小。
- opt.useReplace/b?=false: 默认用"INSERT INTO"语句，设置为true则用"REPLACE INFO"语句。一般用于根据某unique index列添加或更新行。
- opt.debug/b?=false: 如果设置为true, 只输出SQL语句，不插入数据库。

	$bi->add($row);

- row: 可以是值数组或关联数组。如果是值数组，必须与headers一一对应，比如["name1", "dscr1"]；
 如果是关联数组，按headers中字段自动取出值数组，这样关联数组中即使多一些字段也无影响，比如["name"=>"name1", "dscr"=>"dscr1", "notUsedCol"=100]。

示例：

	$bi = new BatchInsert("Syslog", "module,tm,content");
	for ($i=0; $i<10000; ++$i)
		$bi->add([$m, $tm, $content]);
	$n = $bi->exec();

如果担心一次请求数量过多，也可以指定批大小，如1000行提交一次：

	$opt = [
		"batchSize" =>1000
	]
	$bi = new BatchInsert("Syslog", "module,tm,content", $opt);

- opt: {batchSize/i, useReplace/b}
*/
class BatchInsert
{
	private $sql0;
	private $batchSize;
	private $headers;
	private $debug;

	private $sql;
	private $n = 0;
	private $retn = 0;
	function __construct($table, $headers, $opt=null) {
		$verb = @$opt["useReplace"]? "REPLACE": "INSERT";
		if (is_string($headers)) {
			$headerStr = $headers;
			$headers = preg_split('/\s*,\s*/', $headerStr);
		}
		else {
			$headerStr = join(',', $headers);
		}
		$this->headers = $headers;
		$this->sql0 = "$verb INTO $table ($headerStr) VALUES ";
		$this->batchSize = @$opt["batchSize"]?:0;
		$this->debug = @$opt["debug"]?:false;
	}
	function add($row) {
		$values = '';
		// 如果是关联数组，转成值数组
		if (! isset($row[0])) {
			$row0 = [];
			foreach ($this->headers as $hdr) {
				$row0[] = $row[$hdr];
			}
			$row = $row0;
		}
		foreach ($row as $v) {
			if ($v === '')
				$v = "NULL";
			else
				$v =  Q($v);
			if ($values !== '')
				$values .= ",";
			$values .= $v;
		}
		if ($this->sql === null)
			$this->sql = $this->sql0 . "($values)";
		else
			$this->sql .= ",($values)";

		++$this->n;
		if ($this->batchSize > 0 && $this->n >= $this->batchSize)
			$this->exec();
	}
	function exec() {
		if ($this->n > 0) {
			if (! $this->debug) {
				$this->retn += execOne($this->sql);
			}
			else {
				echo($this->sql);
				$this->retn += $this->n;
			}
			$this->sql = null;
			$this->n = 0;
		}
		return $this->retn;
	}
}

// 由虚拟字段 flag_x=0/1 来设置flags字段；或prop_x=0/1来设置props字段。
function flag_getExpForSet($k, $v)
{
	$v1 = substr($k, 5); // flag_xxx -> xxx
	$k1 = substr($k, 0, 4) . "s"; // flag_xxx -> flags
	if ($v == 1) {
		if (strlen($v1) > 1) {
			$v1 = " " . $v1;
		}
		$v = "concat(ifnull($k1, ''), " . Q($v1) . ")";
	}
	else if ($v == 0) {
		$v = "trim(replace($k1, " . Q($v1) . ", ''))";
	}
	else {
		jdRet(E_PARAM, "bad value for flag/prop `$k`=`$v`");
	}
	return "$k1=" . $v;
}

class DbExpr
{
	public $val;
	function __construct($val) {
		$this->val = $val;
	}
}

/**
@fn dbExpr($val)

## 用于在dbInsert/dbUpdate(插入或更新数据库)时，使用表达式：

	$id = dbInsert("Ordr", [
		"tm" => dbExpr("now()") // 使用dbExpr直接提供SQL表达式
	]);

另外，写数据库时，为防止XSS跨域攻击，param/mparam/dbInsert/dbUpdate对值会自动做htmlentity转义(本项目用htmlEscape函数)，如">7"转成"&gt;7"。
为防止转义，使用原始字串值，可以用：

	// 防止param/mparam转义，设置doHtmlEscape参数=false; 或直接从$_GET/$_POST中取值
	$value = mparam("value", null, false); // 第3参数是doHtmlEscape
	$value1 = $_POST["value1"]; // 不用param函数

	// 防止dbInsert/dbUpdate转义，用dbExpr和Q函数。
	$id = dbUpdate("Ordr", [
		"cond" => dbExpr(Q("f>3 && r<60")); // 注意用Q函数对字符串加引号
	]);

示例：对象set/add接口中，防止某字段被转义：

	protected function onValidate()
	{
		if (issetval("cond")) {
			$_POST["cond"] = dbExpr(Q($_POST["cond"]));
		}
	}

## 也用于直接返回字符串数据，不经JSON编码处理，示例：

	function api_test2()
	{
		$ret = '{"a":100, "b":[3,4]}';
		return dbExpr($ret);
		// 接口输出 [0, {"a":100, "b":[3,4]}]
		// 也可以用 jdRet(0, dbExpr($ret));
	}

@see dbInsert
@see dbUpdate
*/
function dbExpr($val)
{
	return new DbExpr($val);
}

/**
@fn dbUpdate(table, kv, id_or_cond?, noEscape=false) -> cnt

@param id_or_cond 查询条件，如果是数值比如100或"100"，则当作条件"id=100"处理；否则直接作为查询表达式，比如"qty<0"；
为了安全，cond必须指定值，不可为空（避免因第三参数为空导致误更新全表!）。如果要对全表更新，可传递特殊值"ALL"，或用"1=1"之类条件。

e.g.

	// UPDATE Ordr SET ... WHERE id=100
	$cnt = dbUpdate("Ordr", [
		"amount" => 30,
		"dscr" => "test dscr",
		"raw" => ["id"=>100, "name"=>"jack"], // (v5.5) 数组转JSON保存
		"tm" => "null", // 用""或"null"对字段置空；用"empty"对字段置空串。
		"tm1" => null // null会被忽略
	], 100);

	// UPDATE Ordr SET tm=now() WHERE tm IS NULL
	$cnt = dbUpdate("Ordr", [
		"tm" => dbExpr("now()")  // 使用dbExpr，表示是SQL表达式
	], "tm IS NULL);

	// 全表更新，没有条件。UPDATE Cinf SET appleDeviceToken={token}
	$cnt = dbUpdate("Cinf", ["appleDeviceToken" => $token], "ALL");

cond条件可以用key-value指定(cond写法参考getQueryCond)，如：

	dbUpdate("Task", ["vendorId" => $id], ["vendorId" => $id1]);
	基本等价于 (当id1为null时稍有不同, 上面生成"IS NULL"，而下面的SQL为"=null"非标准)
	dbUpdate("Task", ["vendorId" => $id], "vendorId=$id1"]);

为防止XSS攻击，默认会处理字段值，将">", "<"转义为"&gt;"和"&lt;"。如果想保持原始值，可以用：

	$cnt = dbUpdate("Ordr", [
		"cond" => dbExpr(Q("amount > 100"))
	]);

或

	$cnt = dbUpdate("Ordr", [
		"cond" => "amount > 100"
	], null, true); // noEscape=true

*/
function dbUpdate($table, $kv, $cond, $noEscape=false)
{
	$env = getJDEnv();
	return $env->dbUpdate($table, $kv, $cond, $noEscape);
}
//}}}

// ====== DBEnv {{{
class DBEnv
{
	public $DBH;
	public $DBTYPE;
	protected $C; // [connectionString, user, pwd]
	protected $db; // sql strategy for supported db

	public $TEST_MODE, $MOCK_MODE, $DBG_LEVEL, $DEBUG_LOG;

	function __construct($dbtype = null, $db = null, $user = null, $pwd = null) {
		if ($dbtype) {
			$this->DBTYPE = $dbtype;
			assert($db != null);
			$this->C = [$db, $user, $pwd];
		}
		else {
			$this->initDbType();
		}
		$this->initEnv();
	}

	function changeDb($dbtype, $db, $user = null, $pwd = null) {
		unset($this->DBH);
		$this->DBTYPE = $dbtype;
		$this->C = [$db, $user, $pwd];
		$this->dbconn();
	}

	function addLog($data, $logLevel=0) {
		if ($this->DEBUG_LOG == 1 && $this->DBG_LEVEL >= $logLevel) {
			logit($data, true, 'debug');
			return true;
		}
	}
	function amendLog($logHandle, $fn) {
		$data = '';
		$fn($data);
		logit($data, false, 'debug');
	}

	private function initDbType() {
		$this->DBTYPE = getenv("P_DBTYPE");
		$DB = getenv("P_DB") ?: "localhost/jdcloud";
		$DBCRED = getenv("P_DBCRED") ?: "ZGVtbzpkZW1vMTIz"; // base64({user}:{pwd}), default: demo:demo123

		// 未指定驱动类型，则按 mysql或sqlite 连接
		// e.g. P_DB="../carsvc.db"
		if (! $this->DBTYPE) {
			if (preg_match('/\.db$/i', $DB)) {
				$this->DBTYPE = "sqlite";
			}
			// P_DB=null: 做性能对比测试时, 指定不连数据库
			else if ($DB === "null") {
				$this->DBTYPE = null;
			}
			else {
				$this->DBTYPE = "mysql";
			}
		}
		if ($this->DBTYPE == "sqlite") {
			# 处理相对路径. 绝对路径：/..., \\xxx\..., c:\...
			if ($DB[0] !== '/' && $DB[1] !== ':') {
				global $BASE_DIR;
				$DB = $BASE_DIR . '/' . $DB;
			}
		}

		// e.g. P_DB="../carsvc.db"
		if ($this->DBTYPE == "sqlite") {
			$DB = "sqlite:$DB";
		}
		else if ($this->DBTYPE == "mysql") {
			// e.g. P_DB="115.29.199.210/carsvc"
			// e.g. P_DB="115.29.199.210:3306/carsvc"
			if (! preg_match('/^"?(.*?)(:(\d+))?\/(\w+)"?$/', $DB, $ms))
				jdRet(E_SERVER, "bad db=`$DB`", "未知数据库");
			$dbhost = $ms[1];
			$dbport = $ms[3] ?: 3306;
			$dbname = $ms[4];

			$DB = "mysql:host={$dbhost};dbname={$dbname};port={$dbport}";
		}
		list($dbuser, $dbpwd) = getCred($DBCRED); 
		$this->C = [$DB, $dbuser, $dbpwd];
	}

	private function initEnv() {
		$this->TEST_MODE = getenv("P_TEST_MODE")===false? 0: intval(getenv("P_TEST_MODE"));
		if (isset($_GET["_debug"])) {
			$this->DBG_LEVEL = intval($_GET["_debug"]);
			$this->DEBUG_LOG = 1;
		}
		else {
			$this->DBG_LEVEL = getenv("P_DEBUG")===false? 0 : intval(getenv("P_DEBUG"));
			$this->DEBUG_LOG = getenv("P_DEBUG_LOG")===false? 0 : intval(getenv("P_DEBUG_LOG"));
		}

		if ($this->TEST_MODE) {
			$this->MOCK_MODE = getenv("P_MOCK_MODE") ?: 0;
		}
	}

	function dbconn($fnConfirm = null)
	{
		$DBH = $this->DBH;
		if (isset($DBH) || $this->DBTYPE === null)
			return $DBH;

		if ($fnConfirm == null)
			@$fnConfirm = $GLOBALS["dbConfirmFn"];
		if ($fnConfirm && $fnConfirm($this->C[0]) === false) {
			exit;
		}
		try {
			@$DBH = JDPDO::create($this->C[0], $this->C[1], $this->C[2], $this->DBTYPE);
		}
		catch (PDOException $e) {
			$msg = $this->TEST_MODE ? $e->getMessage() : "dbconn fails";
			logit("dbconn fails: " . $e->getMessage());
			jdRet(E_DB, $msg, "数据库连接失败");
		}
		
		$DBH->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); # by default use PDO::ERRMODE_SILENT

		# enable real types (works on mysql after php5.4)
		# require driver mysqlnd (view "PDO driver" by "php -i")
		$DBH->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
		$DBH->setAttribute(PDO::ATTR_STRINGIFY_FETCHES, false);
		$this->DBH = $DBH;
		$DBH->initConn();
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
		if ($this->DBTYPE === null)
			return false;
		$DBH = $this->dbconn();
		$rv = $DBH->exec($sql, $getInsertId);
		return $rv;
	}

	function queryOne($sql, $assoc = false, $cond = null)
	{
		if ($this->DBTYPE === null)
			return false;
		$DBH = $this->dbconn();
		if ($cond)
			$sql = genQuery($sql, $cond);
		$DBH->addLimit1($sql);
		$sth = $DBH->query($sql);

		if ($sth === false) {
			$DBH->amendLog("error");
			return false;
		}

		$fetchMode = $assoc? PDO::FETCH_ASSOC: PDO::FETCH_NUM;
		$row = $sth->fetch($fetchMode);
		$sth->closeCursor();
		if ($row === false)
			$DBH->amendLog("cnt=0");
		if ($row !== false && count($row)===1 && !$assoc)
			return $row[0];
		return $row;
	}

	function queryAll($sql, $assoc = false, $cond = null)
	{
		if ($this->DBTYPE === null)
			return false;
		$DBH = $this->dbconn();
		if ($cond)
			$sql = genQuery($sql, $cond);
		$sth = $DBH->query($sql);
		if ($sth === false) {
			$DBH->amendLog("error");
			return false;
		}
		$fetchMode = $assoc? PDO::FETCH_ASSOC: PDO::FETCH_NUM;
		$allRows = [];
		do {
			try {
				$rows = $sth->fetchAll($fetchMode);
			}
			catch (PDOException $ex) {
                // NOTE: mssql (unixodbc) 执行'sp_help Cinf'时, nextRowSet未能返回false导致错误
				// SQLSTATE[24000]: Invalid cursor state
				// SQLSTATE[IMSSP]: The active result for the query contains no fields
				if ($ex->getCode() == 24000 || $ex->getCode() == "IMSSP")
					break;
				throw $ex;
			}
			$DBH->amendLog("cnt=". count($rows));
			$allRows[] = $rows;
			// bugfix:sqlite不支持nextRowSet
			if (! $DBH->supportNextRowSet())
				break;
		}
		while ($sth->nextRowSet());
		// $sth->closeCursor();
		return count($allRows)>1? $allRows: $allRows[0];
	}

	function dbInsert($table, $kv, $noEscape=false)
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
				$values .= Q(jsonEncode($v));
//				jdRet(E_PARAM, "dbInsert: array `$k` is not allowed. pls define subobj to use array.", "未定义的子表`$k`");
			}
			else if ($noEscape) {
				$values .= Q($v, $this);
			}
			else {
				$values .= Q(htmlEscape($v), $this);
			}
		}
		if (strlen($keys) == 0) 
			jdRet(E_PARAM, "no field found to be added: $table");
		$sql = sprintf("INSERT INTO %s (%s) VALUES (%s)", $table, $keys, $values);
	#			var_dump($sql);
		return $this->execOne($sql, true);
	}

	function dbUpdate($table, $kv, $cond, $noEscape=false)
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
			else if (is_array($v)) {
				$kvstr .= $k . '=' . Q(jsonEncode($v));
			}
			else if (startsWith($k, "flag_") || startsWith($k, "prop_"))
			{
				$kvstr .= flag_getExpForSet($k, $v);
			}
			else if ($noEscape) {
				$kvstr .= "$k=" . Q($v);
			}
			else {
				$kvstr .= "$k=" . Q(htmlEscape($v));
			}
		}
		$cnt = 0;
		if (strlen($kvstr) == 0) {
			$this->addLog("no field found to be set: $table");
		}
		else {
			if (preg_match('/^(\w+) t0\b/u', $table) && $this->DBTYPE == "mssql") {
				$sql = sprintf("UPDATE t0 SET %s FROM %s", $kvstr, $table);
			}
			else {
				$sql = sprintf("UPDATE %s SET %s", $table, $kvstr);
			}
			if (isset($condStr)) {
				$sql .= "\nWHERE " . $condStr;
			}
			$cnt = $this->execOne($sql);
		}
		return $cnt;
	}
}
// }}}

/**
@class SimpleCache

缓存在数组中。适合在循环中缓存key-value数据。

	$cache = new SimpleCache(); // id=>name
	for ($idList as $id) {
		$name = $cache->get($id, function () use ($id) {
			return queryOne("SELECT name FROM Vendor WHERE id=$id");
		});
	}

更简单地，也可以直接使用全局的cache (这时注意确保key在全局唯一）：

	for ($idList as $id) {
		$name = SimpleCache::getInstance()->get("VendorIdToName-{$id}", function () use ($id) {
			return queryOne("SELECT name FROM Vendor WHERE id=$id");
		})
	}

示例2：

	$key = join('-', [$name, $phone]);
	$id = $cache->get($key);
	if ($id === false) {
		$val = getVal();
		$cache->set($key, $val);
	}

*/
class SimpleCache
{
	use JDSingleton;
	protected $cacheData = [];

	// return false if key does not exist
	function get($key, $fnGet = null) {
		if (! array_key_exists($key, $this->cacheData)) {
			if (!isset($fnGet))
				return false;

			$val = $fnGet();
			$this->set($key, $val);
			return $val;
		}
		return $this->cacheData[$key];
	}

	function set($key, $val) {
		$this->cacheData[$key] = $val;
	}
}

/**
@class FileCache

简单的文件cache方案, 单机时可替代redis.

	$myval = FileCache::get("myval.cache.json", function () {
		return queryAll("SELECT ...", true);
	}, ["timeout" => T_HOUR*4]);

- 文件名建议为"{变量名}.cache.json"
- timeout选项指定超时时间(秒), 默认不超时.
*/
class FileCache
{
	// return false if key does not exist
	static function get($key, $fnGet = null, $opt = []) {
		@$t = filemtime($key);
		if ($t === false || (@$opt["timeout"] && time() - $t > $opt["timeout"])) {
			if (!isset($fnGet))
				return false;

			$val = $fnGet();
			self::set($key, $val);
			return $val;
		}
		$val = jsonDecode(file_get_contents($key));
		return $val;
	}

	static function set($key, $val) {
		file_put_contents($key, jsonEncode($val));
	}
}

function isHttps()
{
	if (!isset($_SERVER['HTTPS']))
		return false;  
	if ($_SERVER['HTTPS'] === 1 //Apache  
		|| $_SERVER['HTTPS'] === 'on' //IIS  
		|| $_SERVER['SERVER_PORT'] == 443) { //其他  
		return true;  
	}
	return false;  
}

/**
@fn getBaseUrl($wantHost = true)

返回 $BASE_DIR 对应的网络路径（最后以"/"结尾），一般指api.php所在路径。
如果指定了环境变量 P_BASE_URL(可在conf.user.php中设置), 则使用该变量。
否则自动判断（如果有代理转发则可能不准）

例：

	getBaseUrl() -> "http://myserver.com/myapp/"
	getBaseUrl(false) -> "/myapp/"

注意：如果使用了反向代理等机制，该函数往往无法返回正确的值，
例如 http://myserver.com/8081/myapp/api.php 被代理到 http://localhost:8081/myapp/api.php
getBaseUrl()默认返回 "http://localhost:8081/myapp/" 是错误的，可以设置P_BASE_URL解决：

	putenv("P_BASE_URL=http://myserver.com/8081/myapp/");

@see $BASE_DIR
 */
function getBaseUrl($wantHost = true)
{
	$baseUrl = getenv("P_BASE_URL");
	if ($baseUrl) {
		if (!$wantHost) {
			$baseUrl = preg_replace('/^https?:\/\/[^\/]+/i', '', $baseUrl);
		}
		if (strlen($baseUrl) == 0 || substr($baseUrl, -1, 1) != "/")
			$baseUrl .= "/";
	}
	else {
		// 自动判断
		$baseUrl = dirname($_SERVER["SCRIPT_NAME"]);
		// 如果是baseUrl下面一级目录则自动去除, 调用getBaseUrl应在baseUrl或baseUrl的下一级目录下, 否则判断出错, 应通过设置环境变量解决.
		$b = basename($baseUrl);
		if (is_dir(__DIR__ . '/../../' . $b)) {
			$baseUrl = dirname($baseUrl) . "/";
		}
		else {
			$baseUrl .= "/";
		}
		// $baseUrl = dirname($_SERVER["SCRIPT_NAME"]) . "/";

		if ($wantHost)
		{
			$host = (isHttps() ? "https://" : "http://") . (@$_SERVER["HTTP_HOST"]?:"localhost"); // $_SERVER["HTTP_X_FORWARDED_HOST"]
			$baseUrl = $host . $baseUrl;
		}
	}
	return $baseUrl;
}

// ==== 加密算法 {{{
/**
@var ENC_KEY = 'jdcloud'

默认加密key。可在api.php等处修改覆盖。
*/
global $ENC_KEY;
$ENC_KEY="jdcloud"; // 缺省加密密码

/**
@fn rc4($data, $pwd)

返回密文串（未编码的二进制，可用base64或hex编码）。
RC4加密算法。基于异或的算法。
https://www.cnblogs.com/haoxuanchen2014/p/7783782.html

更完善的短字符串编码，可以使用

@see jdEncrypt 基于rc4的文本加密
@see jdEncryptI 基于rc4的32位整数加密
*/
function rc4($data, $pwd)
{
    $cipher      = '';
    $key[]       = "";
    $box[]       = "";
    $pwd_length  = strlen($pwd);
    $data_length = strlen($data);
    for ($i = 0; $i < 256; $i++) {
        $key[$i] = ord($pwd[$i % $pwd_length]);
        $box[$i] = $i;
    }
    for ($j = $i = 0; $i < 256; $i++) {
        $j       = ($j + $box[$i] + $key[$i]) % 256;
        $tmp     = $box[$i];
        $box[$i] = $box[$j];
        $box[$j] = $tmp;
    }
    for ($a = $j = $i = 0; $i < $data_length; $i++) {
        $a       = ($a + 1) % 256;
        $j       = ($j + $box[$a]) % 256;
        $tmp     = $box[$a];
        $box[$a] = $box[$j];
        $box[$j] = $tmp;
        $k       = $box[(($box[$a] + $box[$j]) % 256)];
        $cipher .= chr(ord($data[$i]) ^ $k);
    }
    return $cipher;
}

/**
@fn jdEncrypt($string, $enc=E|D, $fmt=b64|hex, $key=$ENC_KEY, $vcnt=4)

基于rc4算法的文本加密，缺省密码为全局变量 $ENC_KEY。
enc=E表示加密，enc=D表示解密。

	$cipher = jdEncrypt("hello");
	$text = jdEncrypt($cipher, "D");
	if ($text === false)
		throw "bad cipher";

缺省返回base64编码的密文串，可设置参数$fmt="hex"输出16进制编码的密文串。
算法包含了校验机制，解密时如果校验失败则返回false.

@param vcnt 校验字节数，默认为4. validation bytes cnt

@see rc4 基础rc4算法
@see jdEncryptI 基于rc4的32位整数加密
*/
function jdEncrypt($string, $enc='E', $fmt='b64', $key=null, $vcnt=4)
{
	if ($key == null) {
		global $ENC_KEY;
		$key = md5($ENC_KEY);
	}
	else {
		$key = md5($key);
	}
	if ($enc == 'E') {
		$data = substr(md5($string.$key),0,$vcnt) . $string;
		$result = rc4($data, $key);
		if ($fmt == "hex")
			return bin2hex($result);
		return preg_replace('/=+$/', '', base64_encode($result));
	}
	else if ($enc == 'D') {
		@$data = $fmt=='hex'? hex2bin($string): base64_decode($string);
		if ($data === false)
			return false;
		$result = rc4($data, $key);
		$result1 = substr($result,$vcnt);
		if (substr($result,0,$vcnt) != substr(md5($result1.$key),0,$vcnt))
			return false;
		return $result1;
	}
}

/**
@fn myEncrypt($string, $enc=E|D)

基于rc4的字符串加密算法。
新代码不建议使用，仅用作兼容旧版本同名函数。缺省key='carsvc', vcnt=8(校验字节数)

@see jdEncrypt
*/
function myEncrypt($string, $enc='E')
{
	return jdEncrypt($string, $enc, 'b64', 'carsvc', 8);
}

/**
@fn jdEncryptI($data, $enc=E|D, $fmt=hex|b64, $key=$ENC_KEY)

基于rc4算法的32位整数加解密，缺省密码为全局变量$ENC_KEY.

	$cipher = jdEncryptI(12345678, "E"); // dfa27c4c208489ca (4字节校验+4字节整数=8字节，用16进制文本表示为16个字节)
	$n = jdEncryptI($cipher, "D");
	if ($n === false)
		throw "bad cipher";

可用于将整型id伪装成8字节的uuid.

@see rc4 基础rc4算法
@see jdEncrypt 基于rc4的文本加密
*/
function jdEncryptI($data, $enc='E', $fmt='hex', $key=null)
{
	if ($enc=='E')
		return jdEncrypt(pack("N", $data), $enc, $fmt, $key);

	$n = jdEncrypt($data, $enc, $fmt, $key);
	if ($n !== false) {
		$n = unpack("N", $n)[1];
	}
	return $n;
}

function b64e($str, $enhance=0)
{
	return base64_encode($str);
}

function b64d($str, $enhance=0)
{
	if ($enhance) {
		$str = str_replace('-', '+', $str);
		$key = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		$n = strpos($key, $str[0]);
		if ($n === false)
			return false;
		$key1 = substr($key, $n,64-$n) . substr($key, 0, $n);
		$len = strpos($key1, $str[1]);
		if ($len === false)
			return false;
		$len = ($len + 64 - $n) % 64;
		$str1 = '';
		for ($i=2; $i<strlen($str); ++$i) {
			$p = strpos($key1, $str[$i]);
			if ($p === false)
				return false;
			$str1 .= $key[$p];
		}
		$str = $str1;
	}
	$rv = base64_decode($str);
	// print_r([$len, $str, $rv]);
	if ($rv && $enhance) {
		if ((strlen($rv) % 64) != $len)
			return false;
	}
	return $rv;
}
//}}}

/**
@fn errQuit($code, $msg, $msg2 =null)

生成html格式的错误信息并中止执行。
默认地，只显示中文错误，双击可显示详细信息。
例：

	errQuit(E_PARAM, "接口错误", "Unknown ac=`$ac`");

 */
function errQuit($code, $msg, $msg2 =null)
{
	header("Content-Type: text/html; charset=UTF-8");
	echo <<<END
<html><body>
<div style='color:red' ondblclick="x.style.display=''">出错啦: $msg 
	<a href="javascript:history.back();">返回</a>
</div>
<pre style='color:grey;display:none' id="x">ERROR($code): $msg2</pre>
</body></html>
END;
	exit;
}

/**
@fn addLog($data, $logLevel=0)

输出调试信息到前端。调试信息将出现在最终的JSON返回串中。
如果只想输出调试信息到文件，不想让前端看到，应使用logit.

@see logit
 */
function addLog($data, $logLevel=0)
{
	$env = getJDEnv();
	return $env->addLog($data, $logLevel);
}

/** 
@fn hasSignFile($f)

检查应用根目录下($BASE_DIR)下是否存在标志文件。标志文件一般命名为"CFG_XXX", 如"CFG_MOCK_MODE"等。
*/
function hasSignFile($f)
{
	global $BASE_DIR;
	return file_exists("{$BASE_DIR}/{$f}");
}

/**
@fn htmlEscape($s)

用于防止XSS攻击。只转义字符"<", ">"，示例：
当用户保存`<script>alert(1)</script>`时，实际保存的是`&lt;script&gt;alert(1)&lt;/script&gt;`
这样，当前端以`$div.html($val)`来显示时，不会产生跨域攻击泄漏Cookie。

如果前端就是需要带"<>"的字符串（如显示在input中），则应自行转义。

后端转义可以用html_entity_decode:

	$s = "a&gt;1 and a&lt;100";
	$s1 = html_entity_decode($s);

 */
function htmlEscape($s)
{
	return preg_replace_callback('/[<>]/', function ($ms) {
		static $map = [
			"<" => "&lt;",
			">" => "&gt;"
		];
		return $map[$ms[0]];
	}, $s);
// 	if ($s[0] == '{' || $s[0] == '[')
// 		return $s;
//	return htmlentities($s, ENT_NOQUOTES);
}

// 取部分内容判断编码, 如果是gbk则自动透明转码为utf-8
// 如果指定fnTest, 则对前1000字节做自定义测试: $fnTest($text)
function utf8InputFilter($fp, $fnTest=null)
{
	$str = fread($fp, 1000);
	rewind($fp);
	$enc = strtolower(mb_detect_encoding($str, ["gbk","utf-8"]));
	if ($enc && $enc != "utf-8") {
		stream_filter_append($fp, "convert.iconv.$enc.utf-8");
	}
	if ($fnTest)
		$fnTest($str);
}

/**
@fn name2id($refNameFields, $refIdField, $refTable, $nameFields, $opt=[])

常用于导入，或数据同步，把code/name等唯一字段替换成内部id.

- 支持缓存数据，以优化循环效率
- 支持查不到时报错或自动添加两种模式

实例：如果给定数组（默认$_POST）含有cateName字段，则通过查询表ItemCategory中的name字段，得到相应的id字段，用cateId字段替代原cateName字段：

	name2id("cateName", "cateId", "ItemCategory", "name");
	(即 cateId = SELECT id FROM ItemCategory WHERE name={cateName} )

如果查不到则会报错。
也可指定不报错(doAutoAdd)，直接插入ItemCategory表中，用新插入的id值作为cateId字段，替代原cateName字段：

	name2id("cateName", "cateId", "ItemCategory", "name", ["doAutoAdd"=>true]);

如果添加时还要指定其它字段，指定onAdd：

	name2id("cateName", "cateId", "ItemCategory", "name", [
		"doAutoAdd"=>true, 
		"onAdd" => function (&$data) {
			$data["contactName"] = $_POST["cateContactName"];
			$data["tm"] = date(FMT_DT);
		},
		// "arr" => &$myarr, // 修改$myarr数组，而不是默认的$_POST，注意加'&'
	]);

TODO: 支持多字段联合查询:

	name2id("city,storeName", "storeId", "Store", "city,name");

*/
function name2id($refNameFields, $refIdField, $refTable, $nameFields, $opt = [])
{
	if (is_array($opt["arr"])) {
		$arr = &$opt["arr"];
	}
	else {
		$arr = &$_POST;
	}
	if (issetval($refNameFields, $arr)) {
		$v = $arr[$refNameFields];
		$id = SimpleCache::getInstance()->get("name2id-$refTable-$refNameFields-$v", function () use ($refTable, $refNameFields, $nameFields, $v, $opt) {
			$id = queryOne("SELECT id FROM $refTable WHERE $nameFields=" . Q($v));
			if (! $id) {
				if (! $opt["doAutoAdd"])
					jdRet(E_PARAM, "bad $refNameFields", "找不到被引用的数据: " . $v); 
				$data = [];
				$data[$nameFields] = $v;
				if ($opt["onAdd"]) {
					$opt["onAdd"]($data);
				}
				$id = dbInsert($refTable, $data);
			}
			return $id;
		});
		$arr[$refIdField] = $id;
		unset($arr[$refNameFields]);
	}
}
//}}}

// ====== classes {{{
/**
@class JDPDO

数据库类PDO增强。getJDEnv()->DBH为默认数据库连接，dbconn,queryAll,execOne等数据库函数都使用它。

- 在调试等级P_DEBUG=9时，将SQL日志输出到前端，即`addLog(sqlStr, DEBUG=9)`。
- 如果有符号文件CFG_CONN_POOL，则使用连接池（缺省不用）

如果想忽略输出一条SQL日志，可以在调用SQL查询前设置skipLogCnt，如：

	$env = getJDEnv();
	++ $env->DBH->skipLogCnt;  // 若要忽略两条就用 $env->DBH->skipLogCnt+=2
	$env->DBH->exec('set names utf8mb4'); // 也可以是queryOne/execOne等函数。

设置`$GLOBALS["conf_disableSkipLog"]=1`可忽略skipLogCnt机制，常用于数据库底层调试。

@see queryAll,execOne,dbconn
 */
class JDPDO extends PDO
{
	public $skipLogCnt = 0;
	public $lastExecTime = 0; // 上次执行SQL时间,单位:秒
	private $logH;

	static function create($dsn, $user, $pwd, $dbtype) {
		$cls = "JDPDO_" . $dbtype;
		if (!class_exists($cls))
			$cls = "JDPDO";
		$dbh = new $cls($dsn, $user, $pwd);
		return $dbh;
	}

	// JDPDO interface
	function initConn() {
	}
	function addLimit1(&$sql) {
	}
	// mysql style
	function paging(&$sql, $limit, $offset=0) {
		if ($offset == 0) {
			$sql .= "\nLIMIT $limit";
		}
		else {
			$sql .= "\nLIMIT $offset, $limit";
		}
	}
	function acceptAliasInGroupBy() {
		return true;
	}
	function supportNextRowSet() {
		return true;
	}

	// end

	function __construct($dsn, $user = null, $pwd = null)
	{
		$opts = [];
		// 如果使用连接池, 偶尔会出现连接失效问题, 所以缺省不用
		if (hasSignFile("CFG_CONN_POOL"))
			$opts[PDO::ATTR_PERSISTENT] = true;
		parent::__construct($dsn, $user, $pwd, $opts);
	}
	private function addLog($str)
	{
		if ($this->skipLogCnt > 0) {
			-- $this->skipLogCnt;
			//$this->logH = null;
			if (! $GLOBALS["conf_disableSkipLog"])
				return;
		}
		$env = getJDEnv();
		$this->logH = $env->addLog($str, 9);
	}
	function amendLog($str) {
		if ($this->logH) {
			$env = getJDEnv();
			$env->amendLog($this->logH, function (&$data) use ($str) {
				$data .= " -- " . $str;
			});
		}
	}
/**
@key conf_tableAlias 配置数据库表的别名

常用于跨库调用和jdcloud微服务配置。
例如主系统saic需要集成erp子系统用于库存管理，在erp子系统中应配置直接使用主系统saic中的用户、权限等表，可在conf.user.php中配置：

	$GLOBALS["conf_tableAlias"] = [
		"Employee" => "saic.Employee",
		"Role" => "saic.Role",
		"Cinf" => "saic.Cinf",
		"ApiLog" => "saic.ApiLog",
		"ObjLog" => "saic.ObjLog",
		"Syslog" => "saic.Syslog"
	];

*/
	protected function filterSql(&$sql) {
		if (! isset($GLOBALS["conf_tableAlias"]))
			return;
		$conf_tableAlias = $GLOBALS["conf_tableAlias"];
		$ex1 = "'(?:[^']|\')*?'"; // 排除 '', 'from sn', '\'from sn\''
		$sql = preg_replace_callback("/(?:FROM|JOIN|UPDATE|DELETE|INSERT INTO) \K(\w+)|$ex1/iu", function ($ms) use ($conf_tableAlias) {
			if (!isset($ms[1]))
				return $ms[0];
			if (array_key_exists($ms[1], $conf_tableAlias)) {
				return $conf_tableAlias[$ms[1]];
			}
			return $ms[1];
		}, $sql);
	}

	#[\ReturnTypeWillChange]
	function query($sql, $fetchMode=0, ...$fetchModeArgs)
	{
		$this->filterSql($sql);
		$this->addLog($sql);
		$t0 = microtime(true);
		$rv =parent::query($sql, $fetchMode);
		$t = $this->checkTime($t0, $sql);
		if ($this->logH && $t>0.001) {
			$this->amendLog("t=" . round($t*1000,0). "ms");
		}
		return $rv;
	}
	#[\ReturnTypeWillChange]
	function exec($sql, $getInsertId = false)
	{
		$this->filterSql($sql);
		$this->addLog($sql);
		$t0 = microtime(true);
		$rv = parent::exec($sql);
		$t = $this->checkTime($t0, $sql);
		if ($getInsertId)
			$rv = (int)$this->lastInsertId();

		if ($this->logH) {
			$tstr = $t>0.001? "t=" . round($t*1000,0) . "ms, ": "";
			$this->amendLog($str . ($getInsertId? "new id=$rv": "cnt=$rv"));
		}
		return $rv;
	}
	#[\ReturnTypeWillChange]
	function prepare($sql, $opts=[])
	{
		$this->addLog($sql);
		return parent::prepare($sql, $opts);
	}

	// t0: start time
	protected function checkTime($t0, $sql) {
		$t = microtime(true) - $t0;
		$this->lastExecTime = $t;
		if ($t > getConf("conf_slowSqlTime")) {
			$t = round($t, 2);
			logit("-- slow sql: time={$t}s\n$sql\n", "slow");
		}
		return $t;
	}
}

class JDPDO_sqlite extends JDPDO
{
	function supportNextRowSet() {
		return false;
	}

	function query($s, $fetchMode=0, ...$args) {
		if ($GLOBALS["conf_sqlite_translateMysql"])
			SqliteCompatible::translateMysqlToSqlite($s);
		return parent::query($s, $fetchMode);
	}

	function exec($sql, $getInsertId = false) {
		if ($GLOBALS["conf_sqlite_translateMysql"])
			SqliteCompatible::translateMysqlToSqlite($sql);
		return parent::exec($sql, $getInsertId);
	}
}

class JDPDO_mysql extends JDPDO
{
	function initConn() {
		$this->skipLogCnt += 2;
		$this->exec('set names utf8mb4');
		$this->exec('set sql_mode=\'\''); // compatible for mysql8
	}
	function addLimit1(&$sql) {
		if (stripos($sql, "limit ") === false && stripos($sql, "for update") === false)
			$sql .= " LIMIT 1";
	}
}

class JDPDO_mssql extends JDPDO
{
	function initConn() {
		$this->skipLogCnt += 1;
		$this->exec('SET ansi_warnings OFF'); // disable truncate error
	}
	function paging(&$sql, $limit, $offset=0) {
		if ($offset == 0) {
			$sql = preg_replace('/^SELECT \K/i',  "TOP $limit ", $sql);
		}
		else {
			if (!preg_match('/(ORDER\s+BY.*?) \s* $/isx', $sql))
				jdRet(E_SERVER, "bad sql: require ORDER BY for paging");
			$sql .= "\nOFFSET $offset ROWS FETCH NEXT $limit ROWS ONLY";
# 			$body = $ms[1];
# 			$orderby = "ORDER BY t0.id";
# 			if (preg_match('/ORDER\s+BY [\.|\w]+(\s*,\s*[\.|\w]+)*/i', $body, $ms1)) {
# 				$orderby = $ms1[0];
# 			}
# 			$offset2 = $offset + $limit;
# 			$sql = "SELECT * FROM (SELECT ROW_NUMBER() OVER($orderby) _row, {$body}) t0 WHERE _row BETWEEN {$offset} AND {$offset2}";
		}
	}

	#[\ReturnTypeWillChange]
	function lastInsertId($seqName = null) {
		if (! $GLOBALS["conf_mssql_useOdbc"])
			return PDO::lastInsertId($seqName);
		// 不用$this->query, 避免log和额外处理
		// !!!NOTE: unixodbc下mssql驱动有bug, SCOPE_IDENTITY()返回空，只能暂时用@@IDENTITY替代. 
		// 注意INSERT时若存在trigger可能会导致id返回错误。
        //$sth = PDO::query("SELECT SCOPE_IDENTITY()");
        $sth = PDO::query("SELECT @@IDENTITY");
		$row = $sth->fetch(PDO::FETCH_NUM);
		return $row[0];
	}

	function query($s, $fetchMode=0, ...$args) {
		if ($GLOBALS["conf_mssql_translateMysql"])
			MssqlCompatible::translateMysqlToMssql($s);
		return parent::query($s, $fetchMode);
	}

	function acceptAliasInGroupBy() {
		return false;
	}
}

class JDPDO_oracle extends JDPDO
{
	function initConn() {
		++ $this->skipLogCnt;
		$this->exec("ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS'");
	}
	function addLimit1(&$sql) {
		/*
		// 12c support 'fetch first 1 row'
		if (stripos($sql, "ROWNUM") === false && stripos($sql, "fetch ") === false)
			$sql = "SELECT * FROM ($sql) t WHERE ROWNUM<=1";
		*/
	}
	function exec($sql, $getInsertId = false) {
		// NOTE: oracle DO NOT support getLastId(). dont use dbInsert() to get id!
		return parent::exec($sql, false);
	}
	function supportNextRowSet() {
		return false;
	}
}

// $dist_m = Coord::distance(121.62684, 31.217098, 121.704454, 31.19313);
// $dist_m = Coord::distancePt("121.62684,31.217098", "121.704454,31.19313");
class Coord
{
	private static $PI = 3.1415926535898;
	private static $R = 6371000.0;

	// 根据经纬度坐标计算实际距离
/*
	// 算法1（简易算法）与百度坐标系测距最接近，算法2-4结果相近（可能使用GPS坐标），其中3，4最接近，2为简易算法。
	// 所以缺省使用算法1.
	echo(ValidPos::distancePt("121.62684,31.217098", "121.704454,31.19313", $e)); // 2号线广兰路到川沙地铁站，百度测距7.8km

1: 7.8480203528875
2: 8.7427070836223
3: 8.7429527074903
4: 8.7429527079343

	echo(ValidPos::distancePt("121.508983,31.243406", "121.704454,31.19313", $e)); // 2号线陆家嘴到川沙地铁站, 百度测距19.5km

1: 19.410555625383
2: 21.930879447104
3: 21.931961798015
4: 21.931961797932
 */

	private static function _distance1($lat1, $lng1, $lat2, $lng2)
	{
		$x = ($lat2 - $lat1) * cos(($lng1 + $lng2) /2);
		$y = $lng2 - $lng1;
		return self::$R * sqrt($x * $x + $y * $y);
	}
	private static function _distance2($lat1, $lng1, $lat2, $lng2)
	{
		$x = ($lng1 - $lng2) * cos($lat1);
		$y = $lat1 - $lat2;
		return self::$R * sqrt($x * $x + $y * $y);
	}

	private static function _distance3($lat1, $lng1, $lat2, $lng2)
	{
		$t1 = cos($lat1) * cos($lng1) * cos($lat2) * cos($lng2);
		$t2 = cos($lat1) * sin($lng1) * cos($lat2) * sin($lng2);
		$t3 = sin($lat1) * sin($lat2);
		return self::$R * acos($t1+$t2+$t3);
	}

	private static function _distance4($lat1, $lng1, $lat2, $lng2)
	{
		$a = $lat1 - $lat2;
		$b = $lng1 - $lng2;
		$d = pow(sin($a/2), 2) + cos($lat1)*cos($lat2)*pow(sin($b/2), 2);
		return 2*self::$R * asin(sqrt($d));
	}

	public static function distance($lat1, $lng1, $lat2, $lng2, $algo=1)
	{
		$TO_RAD = self::$PI/180.0;
		$lat1 *= $TO_RAD;
		$lat2 *= $TO_RAD;
		$lng1 *= $TO_RAD;
		$lng2 *= $TO_RAD;
		$fn = "_distance" . $algo;
		return self::$fn($lat1, $lng1, $lat2, $lng2);
	}
	public static function distancePt($pt1, $pt2, $algo=1)
	{
		$p1 = explode(",", $pt1);
		$p2 = explode(",", $pt2);
		return self::distance(doubleval($p1[0]), doubleval($p1[1]), doubleval($p2[0]), doubleval($p2[1]), $algo);
	}
}

/**
@class JDSingleton (trait)

用于单件类，提供getInstance方法，例：

	class PluginCore
	{
		use JDSingleton;
	}

则可以调用

	$pluginCore = PluginCore::getInstance();

 */
trait JDSingleton
{
//	private function __construct () {}
	static function getInstance()
	{
		static $inst;
		if (! isset($inst)) {
			$inst = new static();
		}
		return $inst;
	}
}

/**
@class JDSingletonImp (trait)

用于单件基类，提供getInstance方法。
使用时类名应以Base结尾，使用者可以重写该类，一般用于接口实现。例：

	class PayImpBase
	{
		use JDSingletonImp;
	}

	// 使用者重写Base类的某些方法
	class PayImp extends PayImpBase
	{
	}

则可以调用

	$pay = PayImpBase::getInstance();
	// 创建的是PayImp类。如果未定义PayImp类，则创建PayImpBase类，或是当Base类是abstract类时将抛出错误。

 */
trait JDSingletonImp
{
//	private function __construct () {}
	static function getInstance()
	{
		static $inst;
		if (! isset($inst)) {
			$name = substr(__class__, 0, stripos(__class__, "Base"));
			if (! class_exists($name)) {
				$cls = new ReflectionClass(__class__);
				if ($cls->isAbstract()) {
					jdRet(E_SERVER, "Singleton class NOT defined: $name");
				}
				$inst = new static();
				// $inst = $cls->newInstance();
			}
			else if (! is_subclass_of($name, __class__)) {
				jdRet(E_SERVER, "$name MUST extends " . __class__);
			}
			else {
				$inst = new $name;
			}
		}
		return $inst;
	}
}

/**
@class JDEvent (trait)

提供事件监听(on)与触发(trigger)方法，例：

	class PluginCore
	{
		use JDEvent;

		// 提供事件"event1", 注释如下：
		/// @event PluginCore.event.event1($arg1, $arg2)
	}

则可以调用

	$pluginCore->on('event1', 'onEvent1');
	$pluginCore->trigger('event1', [$arg1, $arg2]);

	function onEvent1($arg1, $arg2)
	{
	}

 */
trait JDEvent
{
	protected $fns = [];

/** 
@fn JDEvent.on($ev, $fn) 
*/
	function on($ev, callable $fn)
	{
		if (array_key_exists($ev, $this->fns))
			$this->fns[$ev][] = $fn;
		else
			$this->fns[$ev] = [$fn];
	}

/**
@fn JDEvent.trigger($ev, $args)

返回最后次调用的返回值，false表示中止之后事件调用 

如果想在事件处理函数中返回值，可使用引用传递:

	$obj->on('getResult', 'onGetResult');
	$a = []; $b = null;
	$obj->trigger('getResult', [&$a, &$b]);

	function onGetResult(&$a, &$b)
	{
		$a[] = 100;
		$b = 'hello';
	}

也可使用值传递, 通过一个对象来操作:

	$obj->on('getResult', 'onGetResult');
	$out = new stdclass();
	$out->result = [];
	$obj->trigger('getResult', [$out]);

	function onGetResult($out)
	{
		$out->result[] = 100;
	}

*/
	function trigger($ev, array $args=[])
	{
		if (! array_key_exists($ev, $this->fns))
			return;
		$fns = $this->fns[$ev];
		foreach ($fns as $fn) {
			$rv = call_user_func_array($fn, $args);
			if ($rv === false)
				break;
		}
		return $rv;
	}
}
// }}}

// ====== ext {{{
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

要激活模拟模式，应在conf.user.php中设置：

	putenv("P_TEST_MODE=1");
	putenv("P_MOCK_MODE=1");

	// 或者只开启部分模块的模拟：
	// putenv("P_MOCK_MODE=sms,wx");

@see getExt
*/

/**
@fn isMockMode($extType)

判断是否模拟某外部扩展模块。如果$extType为null，则只要处于MOCK_MODE就返回true.
 */
function isMockMode($extType)
{
	$env = getJDEnv();
	if (intval($env->MOCK_MODE) === 1)
		return true;

	$mocks = explode(',', $env->MOCK_MODE);
	return in_array($extType, $mocks);
}

class ExtFactory
{
	private $objs = []; // {$extType => $ext}

/**
@fn ExtFactory::getInstance()

@see getExt
 */
	use JDSingleton;

/**
@fn ExtFactory::getObj($extType, $allowMock?=true)

获取外部依赖对象。一般用getExt替代更简单。

示例：

	$sms = ExtFactory::getInstance()->getObj(Ext_SmsSupport);

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
	return ExtFactory::getInstance()->getObj($extType, $allowMock);
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

/**
@fn limitApiCall($name, $sec)

对接口printSheet限制10秒内只能调用1次（按session限制，即限制用户登录后的连续调用）：

	// $_SESSION["printSheetTm"]将记录上次调用时间
	limitApiCall("printSheet", 10); // 10s内不允许重复调用

TODO: 全局限定

	limitApiCall("printSheet", 10, ["useSession"=>false]);

TODO: 限制10s秒内对同一订单只能调用1次：

	// $_SESSION["printSheetTm"]将记录一个时间数组
	limitApiCall("printSheet", 10, [
		"key" => orderId
	]);

*/
function limitApiCall($name, $sec, $opt = null)
{
	$key = $name . "Tm";
	$now = time();
	$last = $_SESSION[$key];
	if ($last && $now - $last < $sec) // N秒内不允许重复操作
		jdRet(E_FORBIDDEN, "call `$name` too fast", "操作太快，请稍候操作");
	$_SESSION[$key] = time();
}

// openwrt/padavan上不支持fnmatch函数
if(!function_exists('fnmatch')) {
	function fnmatch($pattern, $string) {
		return preg_match('/^'.strtr(preg_quote($pattern, '#'), array('\*' => '.*', '\?' => '.')).'$/i', $string);
	}
}
//}}}
// vim: set foldmethod=marker :
