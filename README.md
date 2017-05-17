# jdcloud-php - 筋斗云php接口开发框架

筋斗云是一个Web接口开发框架，它不讲MVC，不做对象-数据表映射(OR Mapping)，而是以数据表为核心来开发Web Service（也称为Web API），提出极简化开发的“数据模型即接口”思想。
它推崇以简约的方式在设计文档中描述数据模型及业务接口，进而自动创建或更新数据库表以及业务接口，称为“一站式数据模型部署”。

筋斗云使用php语言开发的，实现了“分布式对象访问与权限控制架构”（DACA）中的规约，提供的HTTP接口符合业务查询协议(BQP)。

筋斗云提供对象型接口和函数型接口两类接口开发模式，前者专为对象的增删改查提供易用强大的编程框架，后者则更为自由。

**[对象型接口 - 数据模型即接口]**

假设数据库中已经建好一张记录操作日志的表叫"ApiLog"，包含字段id（主键，整数类型）, tm（日期时间类型）, addr（客户端地址，字符串类型）。

使用筋斗云后端框架，只要创建一个空的类，就可将这个表（或称为对象）通过HTTP接口暴露给前端，提供增删改查各项功能：
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

**[函数型接口]**

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

权限包括几种，比如根据登录类型不同，分为用户、员工、超级管理员等角色，每种角色可访问的数据表、数据列（即字段）有所不同，一般称为授权(auth)。
授权控制不同角色的用户可以访问哪些对象或函数型接口，比如getInfo接口只许用户登录后访问：
```php
function api_getInfo()
{
	checkAuth(AUTH_USER); // 在应用配置中，已将AUTH_USER定义为用户权限，在用户登录后获得
	...
}
```

再如ApiLog对象接口只允许员工登录后访问，且限制为只读访问（只允许get/query接口），不允许用户或游客访问，只要定义：
```php
// 不要定义AC_ApiLog，改为AC2_ApiLog
class AC2_ApiLog extends AccessControl
{
	protected $allowedAc = ["get", "query"];
}
```
在应用配置中，已将类前缀"AC2"绑定到员工角色(AUTH_EMP)，类似地，"AC"前缀表示游客角色，"AC1"前缀表示用户角色（AUTH_USER）。

通常权限还控制对同一个表中数据行的可见性，比如即使同是员工登录，普通员工只能看自己的操作日志，经理可以看到所有日志。
这种数据行权限，也称为Data ownership，一般通过在查询时追加限制条件来实现。假设已定义一个权限PERM_MGR，对应经理权限，然后实现权限控制：
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

使用工具就可以自动创建数据表，由于数据模型即接口，也同时生成了相应的对象操作接口。
工具会根据字段的命名规则来确定字段类型，比如"id"结尾就用整型，"tm"结尾就用日期时间类型等。

当增加了表或字段，同样运行工具，数据库和后端接口也都会相应被更新。

**更多用法，请阅读教程《筋斗云接口编程》和框架参考文档。**

