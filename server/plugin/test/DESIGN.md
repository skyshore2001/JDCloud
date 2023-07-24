# 测试相关

本插件提供用于测试的接口或工具。

同时集成了一个DB浏览器(前端使用超级管理端的"查询语句"页面), 支持查看数据库, 数据表和字段, 支持执行SQL语句.

## 交互接口

### 执行sql语句

用于自动化测试

	execSql(sql, wantArray?, wantId?, fmt?) -> rowSet or affectedRows or lastInsertedId

只有管理员登录后才能使用, 或是测试模式下才能使用. 生产模式下客户端和商户端禁止使用. 

如果是SELECT语句或指定了fmt参数, 返回结果集; 如果指定了wantId参数, 返回最后插入的id; 否则返回affectedRows

**[权限]**

- AUTH_ADMIN
- PERM_TEST_MODE

**[参数]**

sql
: String. SQL语句。

wantArray
: Boolean. 如果非空,则对select语句的结果返回数组而非关联表. 由fmt=array替代, 已不建议使用.

wantId
: Boolean. 如果非空，则对insert语句的结果返回最后插入的id而非记录数。

fmt
: String. 指定select查询的结果返回格式: "table"-table格式({h,d}), "array"-array格式 (相当于wantArray=1), "one"-如果查询有多列,则只取首行, 如果查询只有一列, 则只取首行首列数据(相当于框架中的queryOne函数), 缺省: object aray / rowset

通过响应HTTP头将返回SQL内部执行时间(X-ExecSql-Time)以及接口执行时间(X-Exec-Time), 示例:

	X-ExecSql-Time: 1.303ms
	X-Exec-Time: 15ms

**[示例]**

请求

	execSql(sql="SELECT COUNT(*) AS N FROM User")

返回

	[
		{N: 3}
	]

- 实际发送请求时, 注意别忘记对内容进行url编码, 内容不含引号.
- 对select语句返回rowSet, 一定是一个数组, 每一项的字段名由select的字段决定.

**[示例]**

请求

	execSql(sql="SELECT COUNT(*) AS N FROM User", fmt=one)

返回

	3

**[示例]**

请求

	execSql(sql="SELECT COUNT(*) AS N, MIN(createTm) AS createTm FROM User", fmt=one)


返回

	[3, '2015-1-1']


**[示例]**

请求

	execSql(sql="SELECT COUNT(*) AS N FROM User", wantArray=1)
	或
	execSql(sql="SELECT COUNT(*) AS N FROM User", fmt=array)

返回

	[
		[3]
	]

**[示例]**

请求

	execSql(sql="SELECT id FROM User")

返回

	[
		{id: 1},
		{id: 2},
		{id: 3}
	]

**[示例]**

请求

	execSql(sql="SELECT id FROM User", fmt=array)

返回

	[ [1], [2], [3] ]

**[示例]**

请求

	execSql(sql="SELECT id FROM User", fmt=table)

返回

	{
		h: ["id"],
		d: [ [1], [2], [3] ]
	}

**[示例]**

请求

	execsql(sql="DELETE User WHERE id=1 or id=2")

返回

	2

注: 对于非SELECT语句, 返回affectedRows

## DB浏览器(DbExplorer)

用法：
打开超级管理端，菜单【工具】-【查询语句】，输入`show databases`查看数据库列表，或`show tables`查看表列表。
双击数据库名可查看表，双击数据表名可查看数据，Ctrl-双击数据表名可查看字段列表。

除了当前数据库实例，也支持连接到其它数据库实例，只须在conf.user.php中配置后，前端dbinst下拉列表中即可选择。配置示例：

	$mssql_db = "odbc:DRIVER={SQL Server Native Client 11.0}; UID=sa; LANGUAGE=us_english; DATABASE=jdcloud; SERVER=.; PWD=ibdibd";
	$oracle_db = "oci:dbname=10.30.250.131:1525/mesdzprd;charset=AL32UTF8";
	$GLOBALS["conf_dbinst"] = [
		// 实例名称 => [数据库类型，PDO连接字符串，用户，密码]
		"本地测试mysql" => ["mysql", "mysql:host=localhost;port=3306;dbname=wms", "demo", "demo123"],
		"mssql实例" => ["mssql", $mssql_db, "demo", "demo123"],
		"sqlite实例" => ["sqlite", "sqlite:jdcloud.db"],
		"oracle实例" => ["oracle", $oracle_db, "demo", "demo123"],
	];

组件：

- 前端-超级管理端前端页面(工具-查询语句): pageQuery
- 后端-数据库查询接口: execSql

