# 筋斗云接口编程

## 概述 

随着移动互联网的快速发展，各行业对手机应用开发需求旺盛。
应用开发一般分为前端和后端，后端关注数据和业务，需要对前端各类应用（如安卓应用、苹果应用、H5应用等）提供基于HTTP协议的交互接口。

筋斗云是一个Web接口开发框架，它基于模型驱动开发（MDD）的理念，提出极简化开发的“数据模型即接口”思想，用于快速实现基于数据模型的接口（MBI: Model Based Interface）。
它推崇以简约的方式在设计文档中描述数据模型，进而基于模型自动形成数据库表以及业务接口，称为“一站式数据模型部署”。

筋斗云是使用php语言开发的，现在也支持其它语言的版本，它们都实现了[“分布式对象访问与权限控制架构”（DACA）](https://github.com/skyshore2001/daca/)中的服务端规约。
服务端使用业务查询协议(BQP)提供的Web接口，用户一般无需关心页面路由。

筋斗云后端框架项目参考：

- [jdclud-php](https://github.com/skyshore2001/jdcloud-php) (筋斗云后端php版本)
- [jdclud-java](https://github.com/skyshore2001/jdcloud-java) (筋斗云后端java版本)
- [jdclud-cs](https://github.com/skyshore2001/jdcloud-cs) (筋斗云后端.net版本)

另外，筋斗云有优雅的前端框架，支持构建模块化的H5单页应用：

- [jdcloud-mui](https://github.com/skyshore2001/jdcloud-mui) 筋斗云移动端单页应用框架，用于创建手机H5应用程序。
- [jdcloud-wui](https://github.com/skyshore2001/jdcloud-wui) 筋斗云管理端单页应用框架，用于创建运营管理端H5应用程序。

如果前后端全栈均使用筋斗云，推荐使用[jdcloud](https://github.com/skyshore2001/jdcloud)项目，其中还包括编译优化、部署上线、自动化测试等工具。

筋斗云提供对象型接口和函数型接口两类接口开发模式，前者专为对象的增删改查提供易用强大的编程框架，后者则更为自由。

**[对象型接口 - 数据模型即接口]**

假设数据库中已经建好一张记录操作日志的表叫"ApiLog"，包含字段id（主键，整数类型）, tm（日期时间类型）, addr（客户端地址，字符串类型）。

使用筋斗云后端框架，只要创建一个空的类，就可将这个表（或称为对象）通过HTTP接口暴露给前端，提供增删改查各项功能。
将下面代码写在文件server/php/api_objects.php中（它被包含在主入口server/api.php中)：
```php
class AC_ApiLog extends AccessControl
{
}
```

现在就已经可以对匿名访问者提供"ApiLog.add", "ApiLog.set", "ApiLog.get", "ApiLog.query", "ApiLog.del"这些标准对象操作接口了。

我们用curl工具来模拟前端调用，假设服务接口地址为`http://localhost/mysvc/api.php`，我们就可以调用"ApiLog.add"接口来添加数据：

	curl http://localhost/mysvc/api.php/ApiLog.add -d "tm=2016-9-9 10:10" -d "addr=shanghai"

输出一个JSON数组：

	[0,11338]

0表示调用成功，后面是成功时返回的数据，add操作返回的是新对象的id。

可以调用"ApiLog.query"来取列表：

	curl http://localhost/mysvc/api.php/ApiLog.query

列表支持分页，默认一次返回20条数据。query接口非常灵活，还可以指定返回字段、查询条件、排序方式，
比如查询2016年1月份的数据(cond参数)，结果只需返回id, addr字段(res参数)，按id倒序排列(orderby参数)：

	curl http://localhost/mysvc/api.php/ApiLog.query -d "res=id,addr" -d "cond=tm>='2016-1-1' and tm<'2016-2-1'" -d "orderby=id desc"

甚至可以做统计，比如查看2016年1月里，列出访问次数排名前10的地址，以及每个地址访问了多少次服务器，也可以通过query接口直接查出。

可见，用筋斗云后端框架开发对象操作接口，可以用非常简单的代码实现强大而灵活的功能。

**[函数型接口 - 简单直接]**

除了对象型接口，还有一类叫函数型接口，比如要实现一个接口叫"getInfo"用于返回一些信息，开发起来也非常容易，只要定义下面一个函数：
```php
function api_getInfo()
{
	return ["name" => "jdcloud", "addr" => "Shanghai"];
}
```
于是便可以访问接口"getInfo":

	curl http://localhost/mysvc/api.php/getInfo

返回：

	[0, {"name": "jdcloud", "addr": "Shanghai"}]

**[权限控制]**

权限包括几种，最常用的是根据登录类型不同，分为用户、员工、超级管理员等角色，每种角色可访问的数据表、数据列（即字段）有所不同，这些与登录类型相关的权限一般也称为授权(在定义权限常量时，常用`AUTH_`开头)。
授权控制不同角色的用户可以访问哪些对象或函数型接口，比如getInfo接口只许用户登录后访问：
```php
function api_getInfo()
{
	checkAuth(AUTH_USER); // 在应用配置中，已将AUTH_USER定义为用户权限，在用户登录后获得
	...
}
```

如果ApiLog对象接口只允许员工登录后访问，且限制为只读访问（只允许get/query接口），不允许用户或游客访问，只要定义：
```php
// 不要定义AC_ApiLog，改为AC2_ApiLog
class AC2_ApiLog extends AccessControl
{
	protected $allowedAc = ["get", "query"];
}
```
在应用配置中，已将类前缀"AC2"绑定到员工角色(AUTH_EMP)，类似地，"AC"前缀表示游客角色，"AC1"前缀表示用户角色（AUTH_USER）。

通常权限还控制对同一个表中数据行的可见性，比如即使同是员工登录，普通员工只能看自己的操作日志，经理可以看到所有日志。
这种数据行权限，也称为Data ownership，一般通过在查询时追加限制条件来实现。假设已定义一个权限常量为PERM_MGR，对应经理权限，然后实现权限控制：
```php
class AC2_ApiLog extends AccessControl
{
	...
	protected function onQuery()
	{
		if (! hasPerm(PERM_MGR)) {
			$empId = $_SESSION["empId"];
			$this->addCond("t0.empId={$empId}");
		}
	}
}
```

**[一站式数据模型部署]**

筋斗云框架重视设计文档，倡导在设计文档中用简约的方式定义数据模型与接口原型，
例如，上例中的ApiLog表，无需手工创建，只要设计文档中定义：

	@ApiLog: id, tm, addr

使用部署工具就可以自动创建数据表，由于数据模型即接口，也同时生成了相应的对象操作接口。
工具会根据字段的命名规则来确定字段类型，比如"id"结尾就用整型，"tm"结尾就用日期时间类型等。

当增加了表或字段，同样运行工具，数据库和后端接口也都会相应被更新。

## 创建筋斗云Web接口项目

**[任务]**

用筋斗云框架创建一个Web接口项目叫mysvc，创建数据库，提供对ApiLog对象的操作接口。

先从github上下载开源的筋斗云后端框架及示例应用：`https://github.com/skyshore2001/jdcloud-php`

建议安装git工具直接下载，便于以后更新，例如直接创建Web接口项目叫mysvc：

	git clone https://github.com/skyshore2001/jdcloud-php.git mysvc

如果github访问困难，也可以用这个git仓库： `http://dacatec.com/git/jdcloud-php.git`

配置好Web服务器，php环境和MySQL数据库。
项目下server目录为Web应用的源码目录，把该目录映射到Web服务器下，假如URL为`http://localhost/mysvc/`，这称为该项目的基准路径（BASE_URL）。
先检查系统环境以及配置数据库连接等，在浏览器中打开初始化工具页面：

	http://localhost/mysvc/tool/init.php

这个工具会先检查运行环境是否正确，如有异常（比如php版本不对，缺少组件等）请先解决。
注意PHP最低版本需要5.4版本，需要打开mysql, pdo, gd等支持。

注意“应用程序URL根路径”一项应与BASE_URL一致，如本例中为`/mysvc`。

初始化工具运行完后，生成的配置文件为`php/conf.user.php`，之后也可以手工编辑该文件。
同时创建了项目数据库。接下来，数据库中表的部署需要使用数据模型部署工具tool/upgrade.php。

数据模型定义在主设计文档DESIGN.md中，作为示例，里面定义了一些数据模型，像用户(User)，订单(Ordr)以及前面提过的操作日志(ApiLog)等，还定义了一些常用接口，如登录操作(login)等。
我们通过通过命令行工具tool/upgrade.php可以创建或更新数据库：

	cd tool
	php upgrade.php
	(这时进入upgrade交互操作，输入initdb命令创建或更新数据库)
	> initdb
	(输入命令q退出)
	> q

工具默认使用前面生成的配置(php/conf.user.php)去连接数据库。如果要连接其它数据库，也可以设置"P_DB", "P_DBCRED"环境变量来指定，如

	export P_DB="myserver/mydb"
	export P_DBCRED="myuser:mypwd"
	php upgrade.php


为了学习对象型接口，我们以暴露ApiLog对象提供CRUD操作为例，只要在接口实现文件php/api_objects.php(包含在主入口api.php中)中添加代码：
```php
class AC_ApiLog extends AccessControl
{
}
```

这一句代码就提供了对ApiLog对象的标准增删改查(CRUD)接口如下：

	查询对象列表，支持分页、查询条件、统计等：
	ApiLog.query() -> table(id, tm, addr)

	添加对象，通过POST参数传递字段值，返回新对象的id
	ApiLog.add()(tm, addr) -> id

	获取对象
	ApiLog.get(id) -> {id, tm, addr}

	更新对象，通过POST参数传递字段值。
	ApiLog.set(id)(tm?, addr?)

	删除对象
	ApiLog.del(id)

**[接口原型的描述方式]**

在上面的接口原型描述中，用了两个括号的比如add/set操作，表示第一个括号中的参数通过GET参数（也叫URL参数）传递，第二个括号中的参数用POST参数（也叫FORM参数）传递。
多数接口参数支持用GET方式或POST方式传递，除非在接口说明中特别指定。
带"?"表示参数或返回的属性是可选项，可以不存在。

接口原型中只描述调用成功时返回数据的数据结构，完整的返回格式是`[0, 返回数据]`；而在调用失败时，统一返回`[非0错误码, 错误信息]`。

我们可以直接用curl工具来模拟前端调用，用add接口添加一行数据，使用HTTP POST请求：

	curl http://localhost/mysvc/api.php/ApiLog.add -d "tm=2016-9-9 10:10" -d "addr=shanghai"

curl用"-d"参数指定参数通过HTTP body来传递，由于默认使用HTTP POST谓词和form格式(Content-Type=application/x-www-form-urlencoded)，
这种参数一般称为POST参数或FORM参数，与通过URL传递的GET参数相区别。
结果输出一个JSON数组：

	[0,11338]

0表示调用成功，后面是成功时返回的数据，add操作返回对象id，可供get/set/del操作使用。

用get接口取出这个对象出来看看：

	curl http://localhost/mysvc/api.php/ApiLog.get?id=11338

输出：

	[0,{"id":11338,"tm":"2016-09-09 00:00:00","addr":"shanghai"}]

这里参数id是通过URL传递的。
前面说过，未显式说明时，接口的参数可以通过URL或POST参数方式来传递，所以本例中URL参数id也可以通过POST参数来传递：

	curl http://localhost/mysvc/api.php/ApiLog.get -d "id=11338"

如果取一个不存在的对象，会得到错误码和错误信息，比如：

	curl http://localhost/mysvc/api.php/ApiLog.get?id=999999

输出：

	[1,"参数不正确"]

再用set接口做一个更新，按接口要求，要将id参数放在URL中，要更新的字段及值用POST参数：

	curl http://localhost/mysvc/api.php/ApiLog.set?id=11338 -d "addr=beijing"

输出：

	[0, "OK"]

再看很灵活的query接口，取下列表，默认支持分页，会输出一个nextkey字段：

	curl http://localhost/mysvc/api.php/ApiLog.query

返回示例：

	[0,{
		"h":["id","tm","addr"],
		"d":[[11353,"2016-01-04 18:31:06","::1"],[11352,"2016-02-04 18:30:43","::1"],...],
		"nextkey":11349
	}]

返回的格式称为压缩表，"h"为表头字段，"d"为表的数据，在接口描述中用`table(id, 其它字段...)`表示。

默认返回的JSON数据未经美化，效率较高，如果想看的清楚些，可以在配置文件conf.user.php中设置测试模式：

	putenv("P_TEST_MODE=1");

测试模式不仅美化输出数据，还可返回调试信息，可以设置调试等级为0-9，如果设置为9，可以查看SQL调用日志：

	putenv("P_DEBUG=9");

这在调试SQL语句时很有用。此外，测试模式还会开放某些内部接口，以及缺省允许跨域访问，便于通过web页面测试接口。注意线上生产环境绝不可设置为测试模式。

query接口也支持常用的数组返回，需要加上`fmt=list`参数：

	curl http://localhost/mysvc/api.php/ApiLog.query -d "fmt=list"

返回示例：

	[0,{
		"list": [
			{ "id": 11353, "tm": "2016-01-04 18:31:06", "addr": "::1" },
			{ "id": 11352, "tm": "2016-02-04 18:30:43", "addr": "::1" }, 
			...
		],
		"nextkey":11349
	}]

还可以将`fmt`参数指定为"csv", "excel", "txt"等，在浏览器访问时可直接下载相应格式的文件，读者可自己尝试。

取下一页可以用pagekey字段，还可指定一次取的数据条数，用pagesz字段：

	curl "http://localhost/mysvc/api.php/ApiLog.query?pagekey=11349&pagesz=5"

不仅支持分页，query接口非常灵活，可以指定返回字段、查询条件、排序方式，
比如查询2016年1月份的数据(cond参数)，结果只需返回id, addr字段(res参数，也可用于get接口)，按id倒序排列(orderby参数)：

	curl http://localhost/mysvc/api.php/ApiLog.query -d "res=id,addr" -d "cond=tm>='2016-1-1' and tm<'2016-2-1'" -d "orderby=id desc"

甚至可以做统计，比如查看2016年1月里，列出访问次数排名前10的地址，以及每个地址访问了多少次服务器，也可以通过query接口直接查出。
做一个按addr字段的分组统计(gres参数)：

	curl http://localhost/mysvc/api.php/ApiLog.query -d "gres=addr" -d "res=count(*) cnt" -d "cond=tm>='2016-1-1' and tm<'2016-2-1'" -d "orderby=cnt desc" -d "pagesz=10"

输出示例：

	[0,{
		"h":["addr","cnt"],
		"d":[["140.206.255.50",1],["101.44.63.119",73],["121.42.0.85",70],...],
		"nextkey": 3
	}]

**[接口调用的描述方式]**

在之后的示例中，我们将使用接口原型来描述一个调用，不再使用curl，比如上面的调用将表示成：

	ApiLog.query(gres=addr
		res="count(*) cnt"
		cond="tm>'2016-1-1' and tm<'2016-2-1'"
		orderby="cnt desc"
		pagesz=10
	)
	->
	{
		"h":["addr","cnt"],
		"d":[["140.206.255.50",1],["101.44.63.119",73],["121.42.0.85",70],...],
		"nextkey": 3
	}

返回数据如非特别声明，我们将只讨论调用成功时返回的部分，比如说返回"OK"实际上表示返回`[0, "OK"]`。

## 函数型接口

如果不是典型的对象增删改查操作，可以设计函数型接口，比如登录、修改密码、上传文件这些。
比如要实现一个登录接口：

	login(uname, pwd) -> {id}

可以实现为：

```php
function api_login()
{
	$uname = mparam("uname");
	$pwd = mparam("pwd");
	return ["id" => 1000];
}
```

于是就可以访问：

	curl http://localhost/mysvc/api.php/login?uname=myname&pwd=1234

### 权限定义

在示例应用api.php中演示了权限定义及登录相关接口，实际开发时在其基础上修改即可。
权限定义示例如下：
```php
const AUTH_GUEST = 0;
// 登陆类型
const AUTH_USER = 0x01;
const AUTH_EMP = 0x02;
const AUTH_ADMIN = 0x04;
const AUTH_LOGIN = 0xff;

// 权限类型
const PERM_MGR = 0x100;
const PERM_TEST_MODE = 0x1000;
const PERM_MOCK_MODE = 0x2000;

$PERMS = [
	AUTH_GUEST => "guest",
	AUTH_USER => "user",
	AUTH_EMP => "employee",
	AUTH_ADMIN => "admin",

	PERM_MGR => "manager",

	PERM_TEST_MODE => "testmode",
	PERM_MOCK_MODE => "mockmode",
];
```
登录类型是一类特殊的权限，以`AUTH_`开头，按二进制位数不同依次定义，不超过0x80，即0x1,0x2,0x4,0x8,0x10,0x20,0x40,0x80这些。
特别地，AUTH_LOGIN表示任意登录类型。
其它权限按`PERM_`开头，从0x100开始按位定义，如0x200, 0x400, 0x800等。
测试模式与模拟模式也可当作特殊的权限来对待。
在全局变量`$PERMS`中，为每个权限指定了一个可读的名字。

然后定义有一个重要的回调函数`onGetPerms`，它将根据登录情况、session中的数据或全局变量来计算所有当前可能有的权限，
后面常用的检查权限的函数hasPerm/checkAuth都将调用它:

```php
function onGetPerms()
{
	$perms = 0;
	if (isset($_SESSION["uid"])) {
		$perms |= AUTH_USER;
	}
	else if (isset($_SESSION["empId"])) {
		$perms |= AUTH_EMP;
	}
	...

	if (@$GLOBALS["TEST_MODE"]) {
		$perms |= PERM_TEST_MODE;
	}
	...

	return $perms;
}
```

在登录成功时，设置相应的session变量，如用户登录成功设置`$_SESSION["uid"]`，员工登录成功设置`$_SESSION["empId"]`，等等。

后面讲对象型接口时，还会有另一个重要的回调函数`onCreateAC`，用于将权限与类名进行绑定。

### 登录与退出

上节我们已经了解到，登录与权限检查密切相关，需要将用户信息存入session中。
示例应用中，登录相关的API定义在插件login下（server/plugin/login/plugin.php），其大致实现如下：
```php
function api_login()
{
	$type = getAppType();
	if ($type == "user") {
		... 验证成功 ...
		$_SESSION["uid"] = ...
	}
	else if ($type == "emp") {
		... 验证成功 ...
		$_SESSION["empId"] = ...
	}
	...
}
```

定义一个函数型接口，函数名称一定要符合 `api_{接口名}` 的规范。接口名以小写字母开头。
在api_login函数中，先使用框架函数getAppType获取到登录类型（也称应用类型），再按登录类型分别查验身份，并最终设置`$_SESSION`相关变量，
这里设置的变量与之前的权限回调函数`onGetPerms`中相对应。

在接口实现时，一般应根据接口中的权限说明，使用checkAuth函数进行权限检查，比如示例中的修改密码接口(api_chpwd):
```php
function api_chpwd()
{
	$type = getAppType();
	if ($type == "user") {
		checkAuth(AUTH_USER);
		$uid = $_SESSION["uid"];
	}
	elseif($type == "emp") {
		checkAuth(AUTH_EMP);
		$uid = $_SESSION["empId"];
	}
}
```
一旦不满足权限，则抛出权限异常，中止执行。如果只想检查是否有权限，可以用hasPerm函数：
```php
if (hasPerm(AUTH_USER)) {
	...
}
```

logout接口则更加简单，直接销毁会话:
```php
function api_logout()
{
	// checkAuth(AUTH_LOGIN); // 检查当前有任一角色登录。也可以不检查。
	session_destroy();
}
```

**[应用标识与应用类型]**

在筋斗云中，URL参数`_app`称为前端应用标识(app)，缺省为"user"，表示用户端应用。

不同应用要求使用不同的应用标识，在与后端的会话中使用的cookie也会有所不同，因而不同的应用即使同时在浏览器中打开也不会相互干扰。

应用标识中的主干部分称为应用类型(app type)，例如有三个应用分别标识为"emp"（员工端）, "emp2"（经理端）和"emp-store"（商户管理端），
它们的主干部分(去除尾部数字，去除"-"及后面部分)是相同的，都是"emp"，即它们具有相同的应用类型"emp"。

函数getAppType就是用来根据URL参数`_app`取应用类型，不同的应用如果是相同的应用类型，则登录方式相同，比如上例中都是用员工登录。

### 获取参数

函数`mparam`用来取必传参数(m表示mandatory)，参数既可以用URL参数，也可以用POST参数传递。如果是取一个可选参数，可以用`param`函数。
与直接用php的`$_GET`等变量相比，param/mparam可指定参数类型，如

	// 取id参数，特别地，对id参数会返回一个整数。
	$id = param("id");  // 请求参数为"id=3", 返回3, 不是字符串"3"

	// 后缀"/i"要求该参数为整数类型。第二个参数指定缺省值，如果请求中没有该参数就使用缺省值。
	$svcId = param("svcId/i", 99);  // 请求参数为"svcId=3", 返回3, 不是字符串"3"

	// 后缀"/b"要求该参数布尔型，为0或1，返回true/false
	$wantArray = param("wantArray/b", false); // 请求参数为"wantArray=1", 返回true

	// 后缀"/dt"或"/tm"表示日期时间类型（支持格式可参考strtotime函数）, 返回timestamp类型整数。
	$startTm = param("startTm/dt", time()); // 请求参数为"startTm=2016-9-10 10:10", 通过strtotime转成时间戳(unix timestamp)。
	
	// 后缀"/n"表示数值类型(numeric)，可以是小数，如"qty=3.14"。
	// 第三个参数为"G"表示从$_GET取参数，为"P"表示从$_POST中取参数，而默认是从$_REQUEST中取参数，这时客户端既可以用URL参数，也可以用POST参数。
	$qty = param("qty/n", 1.0, "P");

函数mparam表示该参数必须传递，否则报错返回，由于mparam要求参数必须给值，因而不可指定参数缺省值：

	$startTm = mparam("amount/n");
	$startTm = mparam("amount/n", $_POST);

param/mparam除了检查简单类型，还支持一些复杂类型，比如列表：

	$idList = mparam("idList/i+"); // 请求参数为"idList=3,4,5", 返回数组 [3, 4, 5]

更多用法，比如两个参数至少填写一个，传一个压缩子表，可查阅参考文档。

### 接口返回

函数应返回符合接口原型中描述的对象，框架会将其转为最终的JSON字符串。

比如登录接口要求返回`{id, _isNew}`：

	login(uname, pwd, _app?=user) -> {id, _isNew?}

因而在api_login中，返回结构相符的对象即可：

	$ret = [
		"id" => $id,
		"_isNew" => 1
	];
	return $ret;

最终返回的JSON示例：

	[0, {"id": 1, "_isNew": 1}]

如果接口原型中没有定义返回值，框架会自动返回字符串"OK"。比如接口api_logout没有调用return，则最终返回的JSON为：

	[0, "OK"]

**[异常返回]**

如果处理出错，应返回一个错误对象，这通过抛出MyException异常来实现，比如

	throw new MyException(E_AUTHFAIL, "bad password", "密码错误");

它最终返回的JSON为：

	[-1, "密码错误", "bad password"]

分别表示`[错误码, 显示给用户看的错误信息, 调试信息]`，一般调试信息用英文，在各种编码下都能显示，且内容会详细些；错误信息一般用中文，提示给最终用户看。

也可以忽略错误信息，这时框架返回错误码对应的默认错误信息，如

	throw new MyException(E_AUTHFAIL, "bad password");

最终返回JSON为：

	[-1, "认证失败", "bad password"]

甚至直接：

	throw new MyException(E_AUTHFAIL);

最终返回JSON为：

	[-1, "认证失败"]

常用的其它返回码还有E_PARAM（参数错）, E_FORBIDDEN（无权限操作）等:
```php
const E_ABORT = -100; // 要求客户端不报错
const E_PARAM=1; // 参数不合法
const E_NOAUTH=2; // 未认证，一般要求前端跳转登录页面
const E_DB=3; // 数据库错
const E_SERVER=4; // 服务器错
const E_FORBIDDEN=5; // 无操作权限，不允许访问
```

**[立即返回]**

接口除了通过return来返回数据，还可以抛出DirectReturn异常，立即中断执行并返回结果，比如：

	setRet(0, $retObj); // 直接设置返回码和返回对象
	throw new DirectReturn();

示例：实现获取图片接口pic。

	pic() -> 图片内容
	
注意：该接口直接返回图片内容，不符合筋斗云`[0, JSON数据]`的返回规范，所以用DirectReturn立即返回，避免框架干预：
```php
function api_pic()
{
	header("Content-Type: image/jpeg");
	readfile("1.jpg");
	throw new DirectReturn();
}
```
前端可以直接使用链接显示图片：

	<img src="http://localhost/mysvc/api.php/pic">

示例：查询天气接口

	weather(areaid) -> { data }

在实现时，调用第三方服务接口来获取天气，由于第三方已经返回JSON数据，无须再解码、编码，直接包装成筋斗云格式返回即可：
```php
function api_weather()
{
	$areaid = mparam("areaid");

	$URL="http://open.weather.com.cn/data/?areaid=".$areaid;
	@$rv = file_get_contents($URL);
	if ($rv === false || is_null(json_decode($rv))) {
		addLog($rv);
		throw new MyException(E_SERVER, "bad data");
	}
	// 将已编码好的JSON数据包装成筋斗云返回格式
	echo "[0, $rv]";
	throw new DirectReturn();
}
```

上面在处理失败时，调用函数addLog用于将日志返回给前端，便于测试模式下查看。还可以用logit函数记录到服务端文件中。

### 数据库操作

数据库连接一开始是通过tool/init.php在线配置的，或直接手改文件 php/conf.user.php 文件的相关配置如：

	putenv("P_DB=localhost/jdcloud");
	putenv("P_DBCRED=test:test123");

如果想稍稍隐蔽一下登录账号，也可以用base64编码，如：

	putenv("P_DBCRED=ZGVtbzpkZW1vMTIz");

数据库查询的常用函数是`queryOne`和`queryAll`，用来执行SELECT查询。
queryOne只返回首行数据，特别地，如果返回行中只有一列，则直接返回首行首列值：

	// 查到数据时，返回首行 [$id, $dscr]，例如 [100, "用户100"]
	// 没有查到数据时，返回 false
	$rv = queryOne("SELECT id, dscr FROM Ordr WHERE id=1");
	list($id,$dscr) = $rv;

	// 查到数据时，由于SELECT语句只有一个字段id，因而返回值即是$id，例如返回100
	$rv = queryOne("SELECT id FROM Ordr WHERE id=1");
	$id = $rv;

如果字段较多，常加第二参数`true`要求返回关联数组以增加可读性：

	// 操作成功时，返回关联数组，例如 ["id" => 100, "dscr" => "用户100"]
	$rv = queryOne("SELECT id, dscr FROM Ordr WHERE id=1", true);

如果要查询所有行的数据，可以用`queryAll`函数：

	// 有数据时，返回二维数组 [[$id, $dscr], ...]
	// 没有数据时，返回空数组 []，而不是false
	$rv = queryAll("SELECT id, dscr FROM Ordr WHERE userId={$uid}");

执行非查询语句可以用包装函数`execOne`如：

	execOne("DELETE ...");
	execOne("UPDATE ...");
	execOne("INSERT INTO ...");

对于insert语句，可以取到执行后得到的新id值：

	$newId = execOne("INSERT INTO ...", true);

**[防备SQL注入]**

要特别注意的是，所有外部传入的字符串参数都不应直接用来拼接SQL语句，
下面登录接口的实现就包含一个典型的SQL注入漏洞：

	$uname = mparam("uname");
	$pwd = mparam("pwd");
	$id = queryOne("SELECT id FROM User WHERE uname='$uname' AND pwd='$pwd'");
	if ($id === false)
		throw new MyException(E_AUTHFAIL, "bad uname/pwd", "用户名或密码错误");
	// 登录成功
	$_SESSION["uid"] = $id;
	
如果黑客精心准备了参数 `uname=a&pwd=a' or 1=1`，这样SQL语句将是

	SELECT id FROM User WHERE uname='a' AND pwd='a' or 1=1

总可以查询出结果，于是必能登录成功。
修复方式很简单，可以用Q函数进行转义：

	$sql = sprintf("SELECT id FROM User WHERE uname=%s AND pwd=%s", Q($uname), Q($pwd));
	$id = queryOne($sql);

因为很常用，所以使用了一个超级简单的名字叫Q(quote)，它一般的实现就是：

	global $DBH;
	$DBH->quote($str);

**[SQL编译优化]**

全局变量`$DBH`是默认的数据库连接对象，即PDO对象，在程序中也可以直接使用，比如要插入大量数据，为优化性能，可以先对SQL语句进行编译(prepare)后再执行：

	global $DBH;
	$tm = date(FMT_DT);
	$sth = $DBH->prepare("INSERT INTO ApiLog (tm, addr) VALUES ('$tm', ?)");
	foreach ($addrList as $addr) {
		$sth->execute([$addr]);
	}

上面用到的常量FMT_DT是框架定义的标准日期格式，常用于格式化日期字段传到数据库。

**[支持数据库事务]**

假如有一个用户用帐户余额给订单付款的接口，先更新订单状态，再更新用户帐户余额：
```php
function api_payOrder()
{
	execOne("UPDATE Ordr SET status='已付款'...");
	...
	execOne("UPDATE User SET balance=...");
	...
}
```

在更新之后，假如因故抛出了异常返回，订单状态或用户余额会不会状态错误？

有经验的开发者知道应使用数据库事务，让多条数据库查询要么全部执行(事务提交/commit)，要么全部取消掉(事务回滚/rollback)。
而筋斗云已经帮我们自动使用了事务确保数据一致性。

**筋斗云一次接口调用中的所有数据库查询都在一个事务中。** 开发者一般不必自行使用事务，除非为了优化并发和数据库锁。

## 对象型接口

为了更好的理解之后章节的示例，我们先了解一下示例中用到的数据模型。

**[数据模型描述方式]**

下面是几个数据表，每个表都应有个作为主键的id字段，是可自动增长的整数类型，即使是关联表也应定义id字段作为主键。

	用户：
	@User: id, uname, phone(s), pwd, name(s), createTm

	订单：（用Ordr而不是Order词是避免与SQL关键字冲突。）
	@Ordr: id, userId, status(2), amount, dscr(l)
	- status: Enum. 订单状态。CR-新创建,RE-已服务,CA-已取消.

	订单日志：
	@OrderLog: id, orderId, tm, action(2), dscr
	- action: Enum. 操作类型。CR-创建订单,PA-付款,RE-完成服务,CA-取消订单.

	接口调用日志：
	@ApiLog: id, tm, addr, app, ac, retval&, req(t), res(t)

一个用户对应多个订单（通过userId关联），一个订单包含多个物件，以及有多个订单日志（通过orderId关联），表示如下：

	User 1<->n Ordr (userId)
	Ordr 1<->n OrderLog (orderId)

在设计文档DESIGN.md中，我们用`@表名: 字段名1, 字段名2`这样的格式来定义数据模型。前面讲过，通过升级工具（tool/upgrade.php）可以把它们创建或更新到数据库中。

字段名的类型可在字段后标示，例如：`status(2)`表示2字符长度的字符串(nvarchar(2)), `创建时间(dt)`表示date类型。

| 标记 | 类型 |
|--    | --   |
| s | small string(20)    |
| l | long string(255)    |
| t | text(64K)           |
| tt | mediumtext(16M)    |
| i | int                 |
| n | numeric(decimal)    |
| date | date             |
| tm   | datetime         |
| flag | tiny int         |
| 数字 | 指定长度的string |
| 不指定 | 自动判断       |

如果未指定类型，则根据命名规范自动判断，比如以id结尾的字段会被自动作为整型创建，以tm结尾会被当作日期时间类型创建，其它默认是字符串（长度50），规则如下：

| 规则 | 类型 |
| --   | --   |
| 以"Id"结尾                           | Integer
| 以"Price"/"Total"/"Qty"/"Amount"结尾 | Currency
| 以"Tm"/"Dt"结尾                      | Datetime/Date
| 以"Flag"结尾                         | TinyInt(1B) NOT NULL

例如，"total", "docTotal", "total2", "docTotal2"都被认为是Currency类型（字段名后面有数字的，判断类型时数字会被忽略）。
 
也可以用一个类型后缀表示，如 `retval&`表示整型，规则如下：

| 后缀 | 类型 |
| --   | --   |
| &    | Integer
| @    | Currency
| !    | Float
| #    | Double

为了简化接口对象到数据库表的映射，我们在数据库中创建的表名和字段名就按上述大小写相间的风格来，表名或对象名的首字母大写，表字段或对象属性的首字母小写。

某些版本的MySQL/MariaDB在Windows等系统上表和字段名称全部用大写字母，遇到这种情况，可在配置文件my.ini中加上设置：

	[mysqld]
	lower_case_table_names=0 

然后重启MySQL即可。

### 定制操作类型和字段

对象接口通过继承AccessControl类来实现，默认允许5个标准对象操作，可以改写属性`$allowedAc`来限定允许的操作：
```php
class AC_ApiLog extends AccessControl
{
	protected $allowedAc = ["get", "query"];
	// 默认值为 ["add", "get", "set", "del", "query"]
}
```

缺省get/query操作返回ApiLog的所有字段，可以用属性`$hiddenFields`隐藏一些字段，比如不返回"addr"和"tm"字段：
```php
class AC_ApiLog extends AccessControl
{
	protected $hiddenFields = ["addr", "tm"];
}
```

对于add/set接口，可用`$requiredFields`设置必填字段，用`$readonlyFields`设置只读字段。
特别地，"id"字段默认就是只读的，无须设置。

示例：实现下面控制逻辑

- "addr"字段为必填字段，即在add接口中必须填值，在set接口中不允许置空；
- "tm"字段为只读字段，即在add/set接口中如果填值则忽略（但不报错）；
- 在add操作中，由程序自动填写"tm"字段。

```php
class AC_ApiLog extends AccessControl
{
	protected $requiredFields = ["addr"];
	protected $readonlyFields = ["tm"];

	// 由add/set接口回调，用于验证字段(Validate)，或做自动补全(AutoComplete)工作。
	protected function onValidate()
	{
		if ($this->ac == "add") {
			$_POST["tm"] = date(FMT_DT);
		}
	}
}
```
例中使用回调onValidate来对tm字段自动填值。
上面用到的常量FMT_DT是框架定义的标准日期格式，常用于格式化日期字段传到数据库。
 
如果某些字段是在添加时不是必填，但更新时不可置空，可以用`$requiredFields2`来设置；
类似地，添加时可写，更新时只读的字段，用`$readonlyFields2`来设置。

### 绑定访问控制类与权限

前面在讲函数型接口时，提到权限检查用checkAuth函数来实现。
在对象型接口中，通过绑定访问控制类与权限，来实现不同角色通过不同的类来控制。

比如前例中ApiLog对象接口允许员工登录(AUTH_EMP)后访问，只要定义：
```php
class AC2_ApiLog extends AccessControl
{
	...
}
```

那么为什么AC2前缀对应员工权限呢？
在api.php中，我们查看一个重要回调函数`onCreateAC`，由它来实现类与权限的绑定：
```php
function onCreateAC($tbl)
{
	$cls = null;
	if (hasPerm(AUTH_USER))
	{
		$cls = "AC1_$tbl";
		if (! class_exists($cls))
			$cls = "AC_$tbl";
	}
	else if (hasPerm(AUTH_EMP))
	{
		$cls = "AC2_$tbl";
	}
	return $cls;
}
```

该函数传入一个表名（或称对象名，比如"ApiLog"），根据当前用户的角色，返回一个类名，比如"AC1_ApiLog"，"AC2_ApiLog"这些，如果返回null，则框架尝试使用类"AC_ApiLog"。
如果发现指定的类不存在，则不允许访问该对象接口。

在该段代码中，定义了用户登录后用"AC1"前缀的类，如果类不存在，可以再尝试用"AC"前缀的类，如果再不存在则不允许访问接口；
如果是员工登录，则只用"AC2"前缀的类，如果类不存在，则不允许访问接口。

关于hasPerm的用法及权限定义，可以参考前面章节“权限定义”及“登录与退出”。

### 定制可访问数据

除了限制用户可以访问哪些表和字段，还常会遇到一类需求是限制用户只能访问自己的数据。

**[任务]**

用户登录后，可以添加订单、查看自己的订单。
我们在设计文档中设计接口如下：

	添加订单
	Ordr.add()(amount) -> id

	查看订单
	Ordr.query() -> tbl(id, userId, status, amount)
	Ordr.get(id) -> { 同query接口字段...}

	应用逻辑

	- 权限：AUTH_USER
	- 用户只能添加(add)、查看(get/query)订单，不可修改(set)、删除(del)订单
	- 用户只能查看(get/query)属于自己的订单。
	- 用户在添加订单时，必须设置amount字段，不可设置userId, status这些字段。
	  后端将userId字段自动设置为该用户编号，status字段自动设置为"CR"（已创建）

上面接口原型描述中，get接口用"..."省略了详细的返回字段，因为返回对象的字段与query接口是一样的，两者写清楚一个即可。

实现对象型接口如下：
```php
class AC1_Ordr extends AccessControl
{
	protected $allowedAc = ["get", "query", "add"];
	protected $requiredFields = ["amount"];
	protected $readonlyFields = ["status", "userId"];

	// get/query接口会回调
	protected function onQuery()
	{
		$userId = $_SESSION["uid"];
		$this->addCond("t0.userId={$userId}");
	}

	// add/set接口会回调
	protected function onValidate()
	{
		if ($this->ac == "add") {
			$userId = $_SESSION["uid"];
			$_POST["userId"] = $userId;
			$_POST["status"] = "CR";
		}
	}
}
```

- 在get/query操作中，会回调`onQuery`函数，在这里我们用`addCond`添加了一条限制：用户只能查看到自己的订单。
 `addCond`的参数可理解为SQL语句中WHERE子句的片段；字段用"t0.userId"来表示，其中"t0"表示当前操作表"Ordr"的别名(alias)。后面会讲到联合查询(join)其它表，就可能使用其它表的别名。

- add/set操作会回调`onValidate`函数（本例中`$allowedAc`中未定义"set"，因而不会有"set"操作过来）。在这个回调中常常设置`$_POST[字段名]`来自动完成一些字段。

- 注意`$_SESSION["uid"]`变量是在用户登录成功后设置的，由于"AC1"类是用户登录后使用的，所以必能取到该变量。

**[任务]**

我们把需求稍扩展一下，现在允许set/del操作，即用户可以更改和删除自己的订单。

可以这样实现：
```php
class AC1_Ordr extends AccessControl
{
	protected $allowedAc = ["get", "query", "add", "set", "del"];
	...
	// get/set/del接口会回调
	protected function onValidateId()
	{
		$uid = $_SESSION["uid"];
		$id = mparam("id");
		$rv = queryOne("SELECT id FROM Ordr WHERE id={$id} AND userId={$uid}");
		if ($rv === false)
			throw new MyException(E_FORBIDDEN, "not your order");
	}
}
```
可通过`onValidateId`回调来限制get/set/del操作时，只允许访问自己的订单。

函数`mparam`用来取必传参数(m表示mandatory)。
函数`queryOne`用来查询首行数据，如果查询只有一列，则返回首行首列数据，但如果查询不到数据，就返回false. 
这里如果返回false，既可能是订单id不存在，也可能是虽然存在但是是别人的订单，简单处理，我们都返回一个E_FORBIDDEN异常。

框架对异常会自动处理，一般不用特别再检查数据库操作失败之类的异常。如果返回错误对象，可抛出`MyException`异常：

	throw new MyException(E_FORBIDDEN);

错误码"E_FORBIDDEN"表示没有权限，不允许操作；常用的其它错误码还有"E_PARAM"，表示参数错误。

MyException的第二个参数是内部调试信息，第三个参数是对用户友好的报错信息，比如：

	throw new MyException(E_FORBIDDEN, "order id {$id} does not belong to user {$uid}", "不是你的订单，不可操作");

### 分页机制

query操作默认支持分页(paging), 一般调用形式为

	Ordr.query(pagekey?, pagesz?=20) -> {nextkey?, total?, @h, @d}

	参数：
	- pagesz: Integer. 页大小，默认为20条数据。
	- pagekey: String (一般是数值). 首次查询不用填写(或填0)，而下次查询时应根据上次调用时返回数据的"nextkey"字段来填写。

	返回：
	- nextkey: String (一般是数值). 用来取下一页数据时填写pagekey字段，如果没有该字段，则说明已经是最后一页数据。
	- total: Integer. 总记录数。仅当请求时指定 pagekey=0 时返回。
	- h/d: 实际数据表的头信息(header)和数据行(data)，符合table对象的格式，参考上一章节tbl(id,name)介绍。

示例：
第一次查询

	Ordr.query()

返回

	{nextkey: 10800910, h: [id, ...], d: [...]}

要在首次查询时返回总记录数，则用`pagekey=0`：

	Ordr.query(pagekey=0)

这时返回

	{nextkey: 10800910, total: 51, h: [id, ...], d: [...]}

第二次查询(下一页)

	Ordr.query(pagekey=10800910)

直到返回数据中不带"nextkey"属性，表示所有数据获取完毕。

**[分页大小]**

query接口的`pagesz`参数可以指定每页返回多少条数据，缺省是20条。为了后端性能与安全，默认限制了`pagesz`不可超过100条。如果想要指定更大的页大小，可以设置属性`$maxPageSz`：
```php
class MyObj extends AccessControl
{
	protected $maxPageSz = 1000; // 最大允许返回1000条
	// protected $maxPageSz = -1; // 最大允许返回 PAGE_SZ_LIMIT 条
}
```

常量PAGE_SZ_LIMIT定义了最大可以设置的值，目前是10000.

### 虚拟字段

前面已经学习过怎样把一个数据库中的表作为对象暴露出去。
其中，表的字段就可直接映射为对象的属性。对于不在对象主表中定义的字段，统称为虚拟字段。

通过`$vcolDefs`来定义虚拟字段，最简单的一类虚拟字段是字段别名，比如
```php
class AC1_Ordr extends AccessControl
{
	protected $vcolDefs = [
		[ "res" => ["t0.id orderId", "t0.dscr description"] ],
	]
}
```

这样就为Ordr对象增加了orderId与description两个虚拟字段。
在get/query接口中，是可以用它们作为查询字段的，比如：

	Ordr.query(cond="orderId>100 and description like '红色'")

在query接口中，虚拟字段与真实字段使用起来几乎没有区别。对外接口只有对象名，没有表名的概念，比如不允许在cond参数中指定"t0.orderId>100"。

#### 关联字段

**[任务]**

在订单的query/get接口中，只有userId字段，为了方便显示用户姓名和手机号，需要增加虚拟字段userName, userPhone字段。
另外，还需要增加虚拟字段“订单创建时间” - createTm，实现时这个字段需要从OrderLog表中获取。

设计文档中定义接口如下：

	Ordr.query() -> tbl(id, dscr, ..., userName?, userPhone?, createTm?)

其中userName/userPhone字段分别关联到User.name和User.phone字段的，而createTm字段是关联到OrderLog.tm字段的。

习惯上，我们在query或get接口的字段列表中加"..."表示参考数据表定义中的字段，而"..."之后描述的就是虚拟字段。
虚拟字段上的后缀"?"表示该字段默认不返回，仅当在res参数中指定才会返回，如：

	Ordr.query(res="*,userName")

一般虚拟字段都建议默认不返回，而是按需来取，以减少关联表或计算带来的开销。

在cond参数中可以直接使用虚拟字段，不管它是否在res参数中指定，如

	Ordr.query(cond="userName LIKE '%john%'", res="id,dscr")

实现时，通过设置属性`$vcolDefs`实现这些关联字段：
```php
class AC1_Ordr extends AccessControl
{
	protected $vcolDefs = [
		[
			"res" => ["u.name AS userName", "u.phone AS userPhone"],
			"join" => "INNER JOIN User u ON u.id=t0.userId",
			// "default" => false, // 与接口原型中字段是否可缺省(是否用"?"标记)对应
		],
		[
			"res" => ["log_cr.tm AS createTm"],
			"join" => "LEFT JOIN OrderLog log_cr ON log_cr.action='CR' AND log_cr.orderId=t0.id",
		]
	]
}
```

- 以上很多表或字段指定了别名，比如表"User u"，字段"u.name AS userName"。在指定别名时，关键字"AS"可以省略。
- 表的别名不是必须的，除非有多个同名的表被引用。
- 如果指定"default"选项为true, 则调用Ordr.query()时如果未指定"res"参数，会默认会带上该字段。

#### 关联字段依赖

假设设计有“订单评价”对象，它与“订单”相关联：

	@Rating: id, orderId, content

一个订单可有多个评价，表间的关系为：

	订单评价Rating(orderId) n<->1 订单Ordr
	订单Ordr(userId) n<->1 用户User

现在要为Rating表增加关联字段订单描述 "Ordr.dscr AS orderDscr", 以及客户姓名 "User.name AS userName", 设计接口为：

	Rating.query() -> tbl(id, orderId, content, ..., orderDscr?, userName?)

注意：userName字段不直接与Rating表关联，而是通过Ordr表桥接过去。

如果这样定义:
```php
class AC1_Rating extends AccessControl
{
	protected $vcolDefs = [
		[
			"res" => ["o.dscr AS orderDscr"],
			"join" => "INNER JOIN Ordr o ON o.id=t0.orderId",
		],
		[
			"res" => ["u.name AS userName"],
			"join" => "INNER JOIN User u ON o.userId=u.id",
		],
	];
}
```

这样查询是没有问题的:

	Rating.query(res="id,orderDscr,userName")

但如果这样查询(只查User表上)

	Rating.query(res="id,userName")

这时将出错, 因为框架只知道userName字段需要联接User表, 而不知道必须先联接Ordr表.

一种解决方案是将两个表写在一起:
```php
class AC1_Rating extends AccessControl
{
	protected $vcolDefs = [
		[
			"res" => ["o.dscr AS orderDscr", "u.name AS userName"],
			"join" => "INNER JOIN Ordr o ON o.id=t0.orderId INNER JOIN User u ON o.userId=u.id",
		]
	];
}
```

其缺点是, 即使是只查询Ordr表的orderDscr字段, 也要联接User表, 而这是不必要的.

正确做法是，在vcolDefs中可以使用require选项指定依赖字段：
```php
class AC1_Rating extends AccessControl
{
	protected $vcolDefs = [
		[
			"res" => ["o.dscr AS orderDscr"],
			"join" => "INNER JOIN Ordr o ON o.id=t0.orderId",
		],
		[
			"res" => ["u.name AS userName"],
			"join" => "INNER JOIN User u ON o.userId=u.id",
			"require" => "userId" // *** 定义依赖，如果要用到res中的字段如userName，则自动添加orderDscr字段引入的表关联。
		]
	];
}
```

#### 计算字段

在定义虚拟字段时，"res"也可以是一个计算值，或一个很复杂的子查询。

例如表OrderItem是Ordr对象的一个子表，表示订单中每一项产品的名称、数量、价格：

	@Ordr: id, userId, status(2), amount, dscr(l)
	@OrderItem: id, orderId, name, qty, price

	一个订单对应多个产品项：
	OrderItem(orderId) n<->1 Ordr

在添加订单时，同时将每个产品的数量、单价添加到OrderItem表中了。
订单中有一个amount字段表示金额，由于可能存在折扣或优惠，它不一定等于OrderItem中每个产品价格之和。
现在希望增加一个amount2字段，它表示原价，根据OrderItem中每个产品价格累加得到，接口设计如下：

	Ordr.query() -> tbl(..., amount2)

	返回
	- amount2: 订单原价。

仍然用vcolDefs定义一个虚拟字段，可以直接用一个SQL查询得到amount2字段：

```php
class AC1_Ordr extends AccessControl
{
	protected $vcolDefs = [
		[
			"res" => ["(SELECT SUM(qty*ifnull(price2,0)) FROM OrderItem WHERE orderId=t0.id) AS amount2"],
		]
	];
}
```

这里amount2在res中定义为一个复杂的子查询，其中还用到了t0表，也即是主表"Ordr"的固定别名。
可想而知，在这个例子中，取该字段的查询效率是比较差的。也不要把它用到cond条件中。

**[子表字段]**

上面Ordr与OrderItem表是典型的一对多关系，有时希望在返回一个对象时，同时返回一个子对象数组，比如获取一个订单像这样：

	{ id: 1, dscr: "换轮胎及洗车", ..., orderItem: [
		{id: 1, name: "洗车", price: 25, qty: 1}
		{id: 2, name: "换轮胎", price: 380, qty: 2}
	]}

后面章节"子表对象"将介绍其实现方式。但如果子对象相对简单，且预计记录数不会特别多，
我们也可以把子表压缩成一个字符串字段，表中每行以","分隔，行中每个字段以":"分隔，像这样返回：

	{ id: 1, dscr: "换轮胎及洗车", ..., itemsInfo: "洗车:25:1,换轮胎:380:2"}

设计接口原型如下，我们用List来描述这种紧凑列表的格式：

	Ordr.query() -> tbl(..., itemsInfo)

	返回
	- itemsInfo: List(name, price, qty). 格式例如"洗车:25:1,换轮胎:380:2", 表示两行记录，每行3个字段。注意字段内容中不可出现":", ","这些分隔符。

子表字段也是一种计算字段，可实现如下：

```php
class AC1_Ordr extends AccessControl
{
	protected $vcolDefs = [
		[
			"res" => ["(SELECT group_concat(concat(oi.name, ':', oi.price, ':', oi.qty)) FROM OrderItem oi WHERE oi.orderId=t0.id) itemsInfo"] 
		],
		...
	]
}
```

### 子表对象

前面提到过想在对象中返回子表时，可以使用压缩成一个字符串的子表字段，一般适合数据比较简单的场合。

另一种方式是用`$subobj`来定义子表对象。

例如在获取订单时，同时返回订单日志，设计接口如下：

	Ordr.get() -> {id, ..., @orderLog?}

	返回
	orderLog: {id, tm, dscr, action} 订单日志子表。

	示例

	{id: 1, dscr: "换轮胎及洗车", ..., orderLog: [
		{id: 1, tm: "2016-1-1 10:10", action: "CR", dscr: "创建订单"},
		{id: 2, tm: "2016-1-1 10:20", action: "PA", dscr: "付款"}
	]}

上面接口原型描述中，字段orderLog前面的"@"标记表示它是一个数组，在返回值介绍中列出了它的数据结构。

**[实现方式一：直接指定子表查询]**

```php
class AC1_Ordr extends AccessControl
{
	protected $subobj = [
		"orderLog" => ["sql"=>"SELECT ol.* FROM OrderLog ol WHERE ol.orderId=%d"]
	];
}
```

用选项"sql"定义子表的查询语句，其中用"%d"来表示主表主键，这里即Ordr.id字段。

定义子表对象时，还可设置一些选项，比如上面设置等价于：

		"orderLog" => ["sql"=>..., "wantOne"=>false, "default"=>false]

- 选项"wantOne"表示是否只返回一行。默认是返回一个对象数组，如`[{id, tm, ...}]`。
  如果选项"wantOne"为true，则结果以一个对象返回即 `{id, tm, ...}`, 适用于主表与子表一对一的情况。

- 选项"default"与虚拟字段(vcolDefs)上的"default"选项一样，表示当get或query接口未指定"res"参数时，是否默认返回该字段。
  一般应使用默认值false，客户端需要时应通过res参数指定，如 `Ordr.query(res="*,orderLog")`.

注意：查询子表作为子对象字段是不支持分页的。如果子表可能很大，不要设计使用子表字段或列表字段，而应直接用子表的query方法来取，如开放接口"OrderLog.query"。

**[实现方式二：复用子表AC对象]**

(v5.4起支持)

```php
class AC1_Ordr extends AccessControl
{
	protected $subobj = [
		// "orderLog" => ["sql"=>"SELECT ol.* FROM OrderLog ol WHERE ol.orderId=%d"]
		"orderLog" => ["obj"=>"OrderLog", cond"=>"orderId=%d", "AC"=>"AccessControl", "res"=>"tm,dscr"]
	];
}
```

- 参数`obj`指定子对象名。意味着`Ordr.get`查询中返回的`orderLog`字段，实现时相当于调用内部接口`OrderLog.query(fmt=list, pagesz=-1)`。
- 参数`cond`指定了关联关系，其中用`%d`替代主表id。
- 可选参数`AC`指定子表类名，如果不指定，则根据当前角色自动选择类（如`AC1_OrderLog`，若没有这个类则会报错）。这里直接指定使用基类`AccessControl`，是最简单的做法，不必去定义子表的AC类。
- 可选参数`res`指定子表缺省字段，相当于调用`OrderLog.query(res="tm,dscr")`. 类似地，多数query接口的参数均可使用在此，例如`orderby`, `gres`等，还支持内部参数，如`cond2`, `join`, `res2`以及`OrderLog`子对象支持的特殊参数等。

与方式一的区别有：

- 查询时，充分利用子表AC类，例如可使用子表定义的虚拟字段等。
- 查询时可以用`res_{子表显示名}`参数来指定子表返回字段。示例：`callSvr("Ordr.get", {id: 1, res_orderLog:"id,dscr"})`
- 子表返回行数受分页控制，默认是相当于`pagesz=-1`时返回的项数。
- 不仅仅是查询，还支持对子表的添加、追加、更新、删除。
- 定义subobj时不支持选项`wantOne`，但可以用`"fmt"=>"one"`来替代。

例如，可增加子表项`OrderLog`的AC类定义，实现更多的子表控制。

```php
class OrderLog extends AccessControl
{
	protected $allowedAc = ["query"];
	protected $vcolDefs = [
		...
	];
}
```
有子表定义后，只要将"orderLog"定义的AC选项由"AccessControl"改成"OrderLog"即可使用:

		"orderLog" => ["obj"=>"OrderLog", cond"=>"orderId=%d", "AC"=>"OrderLog"]

当然也可以定义`AC1_OrderLog`这样的类，这样就对外直接提供了像`OrderLog.query`这样的子对象接口。
一般子表AC类是不对外开放的。

而且，可以在`Ordr.add`接口中直接添加子项，如

	callSvr("Ordr.add", $.noop, {..., orderLog: [{dscr:"操作1"}, {dscr:"操作2"}]}, {contentType: "application/json"});
	(注意前端callSvr接口可指定contentType为json格式，传输更清晰)

它内部会调用`OrderLog.add`接口。

以及在`Ordr.set`中追加、更新和删除子项，如：

	callSvr("Ordr.set", $.noop, {orderLog: [{dscr:"操作3"}] } ); // 未指定子项id，表示追加一项，
	callSvr("Ordr.set", $.noop, {orderLog: [{id:1, dscr:"操作-1"}]} ); // 指定子项id，更新一项
	callSvr("Ordr.set", $.noop, {orderLog: [{id:2, _delete:1} ]} ); // 指定子项id，并指定`_delete:1`表示删除一项

	// 更新一项，删除一项，追加一项：
	callSvr("Ordr.set", $.noop, {orderLog: [{id:1, dscr:"操作-1"}, {id:2, _delete:1}, {dscr:"操作3"} ]} );

它内部会调用`OrderLog.add/set/del`接口。

注意子项默认是支持这些标准接口的，但可由子表AC类的`$allowedAc`来限定，例如例中限制了只允许`query`接口(`$allowedAc=["query"]`)，于是所有对子项的追加、更新、修改都会报错。

### 虚拟表和视图

表ApiLog中有一个字段叫app，表示前端应用名：

	@ApiLog: id, tm, addr, app, userId

	- userId: 如果app=user，则关联到User表；如果app=emp，则关联到员工表Employee

	@Employee: id, name, phone, ...
	@User: id, ...

当app="emp"时，就表示是员工端应用的操作日志。
现在想对员工端操作日志进行查询，定义以下接口：

	EmpLog.query() -> tbl(id, tm, userId, ac, ..., empName?, empPhone?)

	返回
	- empName/empPhone: 关联字段，通过userId关联到Employee表的name/phone字段。

	应用逻辑
	- 权限：AUTH_EMP

EmpLog是一个虚拟对象或虚拟表，实现时，一种办法是可以在数据库定义一个视图，如:

	CREATE VIEW EmpLog AS
	SELECT t0.id, tm, userId, ac, e.name empName, e.phone empPhone
	FROM ApiLog t0
	LEFT JOIN Employee e ON e.id=t0.userId
	WHERE t0.app='emp' AND t0.userId IS NOT NULL
	ORDER BY t0.id DESC

然后可将该视图当作表一样查询（但不可更新），如：

```php
class AC2_EmpLog extends AccessControl 
{
	protected $allowedAc = ["query"];
}
```
这样就可以实现上述接口了。

另一种办法是直接使用AccessControl创建虚拟表，代码如下：
```php
class AC2_EmpLog extends AccessControl 
{
	protected $allowedAc = ["query"];
	protected $table = 'ApiLog';
	protected $defaultSort = "t0.id DESC";
	protected $defaultRes = "id, tm, userId, ac, req, res, reqsz, ressz, empName, empPhone";
	protected $vcolDefs = [
		[
			"res" => ["e.name AS empName", "e.phone AS empPhone"],
			"join" => "LEFT JOIN Employee e ON e.id=t0.userId"
		]
	];

	// get/query操作都会走这里
	protected function onQuery() {
		$this->addCond("t0.app='emp' and t0.userId IS NOT NULL");
	}
}
```

与上例相比，它不仅无须在数据库中创建视图，还也可以进行更新。
其要点是：

- 重写`$table`属性, 定义实际表
- 用属性`$vcolDefs`定义虚拟字段
- 用addCond方法添加缺省查询条件


属性`$defaultSort`和`$defaultRes`可用于定义缺省返回字段及排序方式。

在get/query接口中可以用"res"指定返回字段，如果未指定，则会返回除了$hiddenFields定义的字段之外，所有主表中的字段，还会包括设置了`default=>true`的虚拟字段。
通过`$defaultRes`可以指定缺省返回字段列表。

query接口中可以通过"orderby"来指定排序方式，如果未指定，默认是按id排序的，通过`$defaultSort`可以修改默认排序方式。

### 接口返回前回调

示例：添加订单到Ordr表时，自动添加一条"创建订单"日志到OrderLog表，可以这样实现：
```php
class AC1_Ordr extends AccessControl
{
	protected function onValidate()
	{
		if ($this->ac == "add") {
			... 

			$this->onAfterActions[] = function () {
				$orderId = $this->id;
				$sql = sprintf("INSERT INTO OrderLog (orderId, action, tm) VALUES ({$orderId},'CR','%s')", date('c'));
				execOne($sql);
			};
		}
	}
}
```
属性`$this->onAfterActions`是一个回调函数数组，在操作结束时被回调。
属性`$this->id`可用于取add操作结束时的新对象id，或get/set/del操作的id参数。

对象接口调用完后，还会回调onAfter函数，也可以在这个回调里面操作。
此外，如要在get/query接口返回前修改返回数据，用onHandleRow回调函数更加方便。

示例：实现接口

	Ordr.get(id) -> {id, status, ..., statusStr?}
	Ordr.query() -> tbl(同get接口字段...)

	- status: "CR" - 新创建, "PA" - 已付款
	- statusStr: 状态名称，用中文表示，当有status返回时则同时返回该字段

```php
class AC1_Ordr extends AccessControl
{
	static $statusStr = ["CR" => "未付款", "PA" => "待服务"];
	// get/query接口会回调
 	protected function onHandleRow(&$rowData)
 	{
		if (isset($rowData["status"])) {
			$st = $rowData["status"];
			$rowData["statusStr"] = @self::$statusStr[$st] ?: $st;
		}
 	}
}
```

### 非标准对象接口

对象的增删改查(add/set/get/query/del共5个)接口称为标准接口。
可以为对象增加其它非标准接口，例如取消订单接口：

	Ordr.cancel(id)

	应用逻辑
	- 权限: AUTH_USER
	- 用户只能操作自己的订单

只要在相应的访问控制类中，添加名为`api_{非标准接口名}`的函数即可：
```php
class AC1_Ordr extends AccessControl
{
	// "Ordr.cancel"接口
	function api_cancel() {
		// 不需要checkAuth
		$this->id = mparam("id");
		$this->onValidateId();
		...
		execOne("UPDATE Ordr SET status='CA' WHERE id={$this->id}");
		// 不会回调onAfter等函数
	}
}
```

非标准对象接口与与函数型接口写法类似，但AccessControl的众多回调函数不会被触发。
在非标准接口实现时，可以调用类中其它接口。

## 框架功能

### 日志与调试

输出日志可以用logit函数，将信息输出到后端文件中，默认存在服务目录下的trace.log文件中。

	logit("### debug info");

除直接查看文件外，也可以在浏览器中访问 tool/log.php 页面来查看最近的日志。

如果想输出到其它文件，可以在第二个参数中指定，如：

	logit("### debug info", "mydebug");

这样调试信息则输出到mydebug.log文件中。

调试时也常常输出日志到返回数据中，以便前端直接查看，可以用addLog函数，它将调试信息追加到JSON格式的返回值后面，这样可兼容筋斗云的返回格式：

	addLog("### debug info"); // 调试等级0，只要是测试模式下，总是输出
	addLog("### debug info level 1", 1); // 在测试模式下且调试等级>=1时输出。

注意必须在conf.user.php中激活测试模式才能看到日志返回：

	putenv("P_TEST_MODE",  1);

测试模式下，输出的JSON串经过美化更易读。
调用接口时添加URL参数`_debug`可以设置调试等级，如`http://.../api.php/Ordr.add?_debug=1`。

**[模拟模式]**

系统中集成了第三方的短信发送功能，如何在日常测试时不用真发短信而走通流程，以及如果进行自动化测试？

筋斗云建议，对第三方系统依赖（如微信认证、支付宝支付、发送短信等），应设计模拟接口来模拟。
如果在conf.user.php中配置：

	putenv("P_TEST_MODE", 1);
	putenv("P_MOCK_MODE", 1);

则激活了模拟模式，注意模拟模式只在测试模式下才生效，这时会走模拟接口。

发送短信后，实际会输出信息到ext日志中，测试时可查看日志ext.log获取，或在线访问tool/log.php查看ext日志。

**[API调用监控]**

筋斗云默认将接口调用记录到表ApiLog中供分析。

一旦出问题可以根据这张表来追溯原因。也可以用它来作用户访问统计等。其中有很多有用的字段：

- tm: 调用时间。
- addr: 调用者IP地址。
- ua:  浏览器的UserAgent值，可区分设备类型。
- app: 前端应用标识。每个前端H5应用在调用接口时，通过URL参数`_app`来指定应用的名称。
- ses: 会话标识（session id）。
- userId: 操作者编号，可能是用户编号，员工编号等。
- ac:  调用名称。
- t:  调用时长(毫秒)。
- retval: 调用返回码。
- req/res: 请求内容与响应内容，记录最多1K字节。
- reqsz/ressz: 请求与响应的长度。
- ver 前端应用版本。调用接口时通过URL参数`_ver`来指定应用版本名。

### 会话管理

筋斗云使用cookie机制来维持与客户端的会话。
它默认使用的cookie名称是"userid"，但可以由客户端请求中URL参数`_app`来修改，比如`_app=emp`，则使用cookie名称为"empid"。
在筋斗云中，`_app`参数称为前端应用名，因而不同的应用即使同时在浏览器中打开也不会发生会话错乱和冲突。

示例请求：

	GET /mysvc/api.php?_app=emp

如果请求中没有带cookie，则调用将返回HTTP头：

	SetCookie: empid=xxxxxx; path=/mysvc; HttpOnly

浏览器根据这个指令来保存cookie。注意cookie的有效路径"/mysvc"是在文件conf.user.php中配置的，有一项P_URL_PATH变量设置：

	putenv("P_URL_PATH", "/mysvc");

这个URL路径要与实际访问服务器上的一致。如果服务放在根目录下，就要改设置为`putenv("P_URL_PATH", "/")`。
一旦这里设置出错，可能出现登录后仍报未登录错误的现象，因为cookie不可用，无法维持会话。

在代码中，可以用 getBaseUrl() 函数来获取基准URL。比如要返回一个URL路径，就可以用

	$url = getBaseUrl() . "notify_url.php";
	// $url = "http://myserver/mysvc/notify_url.php"

### 批量请求

筋斗云框架支持批量请求，即在一次请求中，包含多条接口调用。

假设一个前端页面进入时，需要接连调用好多次接口才能完成展现，一般的做法是需要后端重新设计接口来优化。
筋斗云支持batch接口，这时后端不必做任何设计修改，前端只要调用batch接口即可获得优化。

假如前端进入某页面，需要调用下面两个接口：

	获取用户信息
	User.get() -> {id, name, phone, ...}

	上传用户操作日志
	ActionLog.add()(page, ver, userId) -> id

批处理允许把两个请求一次性提交，减少交互带来的开销。

如果前端H5应用使用了筋斗云前端框架，可以非常方便的启动/禁用批处理操作，只需要在多次调用前加一行useBatchCall，就可将多次调用合并成一次批调用：
```javascript
MUI.useBatchCall(); // 在本次消息循环中执行所有的callSvr都加入批处理。
// MUI.useBatchCall({useTrans:1}); // 启用事务的写法

// 调用一
var param = {res: "id,name,phone"};
callSvr("User.get", param, function(data) {} )

// 调用二
var postParam = {page: "home", ver: "android", userId: "{$1.id}"};
callSvr("ActionLog.add", function(data) {}, postParam, {ref: ["userId"]} );
```

其原理是使用batch接口，在POST内容中设置每个调用，请求示例如下：

	POST /mysvc/api.php/batch

	[
		{
			"ac": "User.get",
			"get": {"res": "name,phone"}
		},
		{
			"ac": "ActionLog.add",
			"post": {"page": "home", "ver": "android", "userId": "{$-1.id}"},
			"ref": ["userId"]
		}
	]

POST内容的格式是一个JSON数组，数组中每一项为一个调用声明，参数有ac, get, post, ref等, 只有ac参数必须，其它均可省略。

	参数
	- get: URL请求参数。
	- post: POST请求参数。
	- ref: 使用了batch引用的参数列表。

后面的请求还可以引用前面请求返回的内容作为参数。例子中，调用二中参数userId引用了调用一的返回结果，userId的值"{$1.id}"表示取第一次调用值的id属性。
注意：引用表达式应以"{}"包起来，"$n"中n可以为正数或负数（但不能为0），表示对第n次或前n次调用结果的引用，以下为可能的格式：

	"{$1}"
	"id={$1.id}"
	"{$-1.d[0][0]}"
	"id in ({$1}, {$2})"
	"diff={$-2 - $-1}"

花括号中的内容将用计算后的结果替换。如果表达式非法，将使用"null"值替代。

在创建批量请求时，可以指定这些调用是否在一个事务(transaction)中，一起成功提交或失败回滚。
如果想让这批请求在一个事务中处理，只需要增加URL参数`useTrans=1`：

	POST /mysvc/api.php/batch?useTrans=1

batch的返回内容是多条调用返回内容组成的数组，样例如下：
```json
[0, [
	[ 0, {id: 1, name: "用户1", phone: "13712345678"} ],  // 调用User.get的返回结果
	[ 0, "OK" ]  // 调用ActionLog.add的返回结果
]]
```

### 类的按需加载(autoload)

php具有类的autoload机制，在筋斗云中进一步简化为，在接口应用如api.php中包含php/autoload.php文件，即可支持类的按需加载：

	require_once("php/autoload.php");

这时只要将与php类同名文件放在php/class目录下，就不用一一包含这些文件了，比如创建文件 php/class/SmsSupport.php

	<?php
	class SmsSupport
	{
		...
	}

在应用中就可以直接使用这个类，无须再包含文件。

### 筋斗云插件机制

可以将一些功能制作成可被多个工程复用的插件模块。在示例中，就有登录(plugin/login)、上传(plugin/upload)等插件，每个插件模块可以包括设计文档、后端接口和前端逻辑页面。
具体可参考API文档，搜索Plugins.

## 筋斗云工具

### 计划任务

筋斗云提供有一个计划任务的开发框架。它使用linux crontab机制来执行。

示例：每天夜里备份一次数据库。

先在`server/tool/task.php`中，创建一个函数，以`ac_{任务名}`为名，如`ac_db`.

task.php是以命令行方式运行的，写好任务"db"后可以这样运行来测试：

	php task.php db

然后在文件task.crontab.php最后增加任务配置，如每天1点1分执行db任务：

	1 1 * * * $TASK db >> $LOG 2>&1

这个文件用于在线上生成crontab配置，其6列分别是：

	分钟，小时，日，月（1-12），周几（0-6，0是周日），命令行

关于时间设置的示例：

	30 21 * * *
	每天21:30

	0,30 18-23 * * *
	每天18:00-23:00间，每隔30分钟执行。(18:00,18:30,19:00,19:30,...23:30)

请自行搜索crontab中5个时间的更多配置格式。

上线后，在Linux中，进入tool目录执行task.crontab.php生成crontab配置，设置到crontab中即可：

	# 生成crontab配置，到文件"1"中
	php task.crontab.php > 1
	crontab -e
	# 自动进入vim编辑计划任务，输入vim命令读入文件1: ":r 1"
	# 输入":wq"保存和退出vim，同时已配置好计划任务。

可用`crontab -l`查看当前的计划任务。

计划任务的运行日志将记录到文件`tool/task.log`中。

注意：

- 如果在task.php中调用了外部脚本，确保该脚本有可执行权限。
- 即使手工运行脚本通过，在计划任务中运行也可能出错，因为运行环境不同，注意查看日志。

### 自动化发布上线

如果希望每次修改一些内容后，可以快速将差异部分上线，不必每次都上传所有文件，可以使用筋斗云自带的上线工具。

筋斗云框架支持WEB应用自动化发布，并可差量更新。
目前差量更新依赖git工具，要求源目录及编译生成的发布目录均使用git管理，每次只上传与线上版本差异的部分。
本章详细介绍可参考官方文档"webcc"中的"jdcloud-build"模块。

自动化发布支持ftp/git两种方式，前者只需服务器提供ftp上传帐号，后者需要服务器提供git-push权限。
本章介绍git方式，安全可靠且版本可任意回溯。ftp方式只需修改若干参数，可参考官方文档。

我们的示例项目名为mysvc，已使用git管理。
先创建发布版本库(又称online版本库), 使用git管理，定名称为mysvc-online，习惯上与目录mysvc放在同一父目录下:

	$ git init mysvc-online

在线上服务器上设置ftp帐号或git帐号。使用git发布时，一般配置好用ssh证书登录，避免每次上线时输入密码。

将tool/git_init.sh上传服务器，用它创建线上目录：

	$ git_init.sh mysvc

编写项目根目录下的build_web.sh脚本：

	#!/bin/sh

	export OUT_DIR=../mysvc-online
	export GIT_PATH=www@myserver:mysvc
	tool/jdcloud-build.sh

在Windows平台上，打开git shell运行build_web.sh即可上线。

### 自动化接口测试

创建Web Service后，可对每个接口(WebAPI)进行自动化回归测试。自动化测试可用于持续集成环境的搭建。

所有测试内容存放在回归测试目录`rtest`（regression test）下。

先确保phpunit已正确安装，这是php的单元测试框架，安装好后确认其可直接在命令行中运行。
确保安装了perl，一些小工具使用perl (Windows下git-bash中默认包含有perl).

运行命令前，应先设置环境变量`SVC_URL`指定服务器URL, 如在windows cmd中运行回归测试：

	set SVC_URL=http://localhost/jdcloud/
	perl run_rtest.pl all

日志"rtest.log"记录所有HTTP request和response，用于分析业务逻辑失败的原因。

`run_rtest.pl`是对phpunit进行了封装的工具，因为phpunit虽然可以执行多个case，但不能自动分析依赖关系。
这个工具就是用于简化对个别Case的测试, 它可运行一个多个或全部测试用例。

	(执行一个用例, 用例名参考rtest.php中的test系列函数, 名称可忽略大小写; 工具将自动先执行依赖的用例)
	perl run_rtest.pl testupload

	(执行多个用例，工具将根据依赖关系调整各用例执行顺序)
	perl run_rtest.pl testatt testupload

tool目录下还有个工具client.php可用于手工运行测试接口，与curl类似，例如：

	php client.php callsvr Ordr.query
	php client.php callsvr Item.get id=1 
	php client.php callsvr Item.set id=1 "price=434&dscr=hehe"
	php client.php callsvr User.set null "name=aaa"

在测试或调试时，可以做以下设置：

- 环境变量P_DEBUG，设置测试工具(如client.php及rtest.php)请求时指定调试等级. 如:

		set P_DEBUG=9
		client.php callsvr usercar.query

	等级9将打出服务端SQL语句，并且通过自动设置URL参数"XDEBUG_SESSION_START=netbeans-xdebug"触发服务端php调试器(必须安装php-xdebug).

- 设置P_APP环境变量，可切换app.

指定app名称(间接指定session名). 对应系统URL参数"_app" (参考章节"应用标识(_app)). 在多种客户端同时登录时用于区分每个会话.

测试用例写在文件rtest.php文件中，包括API测试和场景测试两大块。

- API测试(sanity test): 对每个WEB API进行测试，注重每个API的各种成功和出错处理。
- 用例测试或场景测试(usecase/scenraio): 通过调用若干API完成一个有意义的场景。

## 集成外部Web服务

调用外部系统（如短信集成、微信集成等）将引入依赖，给开发和测试带来复杂性。
筋斗云通过使用“模拟模式”(MOCK_MODE)，模拟这些外部功能，从而简化开发和测试。

集成外部服务的代码一般放在ext.php中。

对于一个简单的外部依赖，可以用函数isMockMode来分支。例如添加对象存储服务(OSS)支持，接口定义为：

	getOssParam() -> {url, expire, dir, param={policy, OSSAccessKeyId, signature} }
	模拟模式返回：
	getOssParam() -> {url="mock"}

在实现时，先在ext.php中定义外部依赖类型，如Ext_Oss:

	const Ext_Oss = 4;

然后实现接口：
```php
function api_getOssParam()
{
	if (isMockMode(Ext_Oss)) {
		return ["url"=>"mock"];
	}
	// 实际实现代码 ...
}
```

要激活模拟模式，应在conf.user.php中设置：

	putenv("P_TEST_MODE=1");
	putenv("P_MOCK_MODE=1");

这时，调用getOssParam接口，就会返回模拟数据。

### 模拟外部Web服务

添加一个复杂的支持模拟的外部依赖，一般会定义一个php接口。
在ext.php中，默认有短信支持(SmsSupport)的模拟，我们以此为例来学习。

先定义类型，如Ext_SmsSupport:

	const Ext_SmsSupport = 1;

定义php接口，如 ISmsSupport:
```php
interface ISmsSupport
{
	// 如果失败，抛出 MyException(E_SMS) 异常，并写日志到trace.log
	function sendSms($phone, $content, $channel);
}
```

在ExtMock类中模拟实现接口ISmsSupport中所有函数, 一般是调用logext()写日志到ext.log, 可以在tool/log.php中查看最近的ext日志。
```php
class ExtMock implements ISmsSupport, ...
{
	function sendSms($phone, $content, $channel)
	{
		$log = "[短信] phone=`{$phone}`, channel=$channel, content=\n`{$content}`\n";
		logext($log);
	}
}
```
函数logext是logit的包装版本，输出信息到ext.log文件。

这样就完成了外部功能模拟，在模拟模式下该短信功能已经可以工作了。
要发送短信，可以调用代码：

	$sms = getExt(Ext_SmsSupport);
	$sms->sendSms(...);

最后，如果要连接真实的外部Web服务，定义一个类SmsSupport实现接口ISmsSupport，一般放在其它文件中实现(如sms.php)。
然后，在回调函数onCreateExt中处理新类型Ext_SmsSupport, 创建实际接口对象：
```php
function onCreateExt($extType)
{
	switch ($extType) {
	...

	case Ext_SmsSupport:
		require_once("sms.php");
		$obj = new SmsSupport();
		break;
	}
	return $obj;
}
```

