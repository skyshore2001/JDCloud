# 测试相关

本插件提供用于测试的接口或工具。

## 交互接口

### 执行sql语句

用于自动化测试

	execSql(sql, wantArray?, wantId?, fmt?) -> rowSet or affectedRows or lastInsertedId

只有管理员登录后才能使用, 或是测试模式下才能使用. 生产模式下客户端和商户端禁止使用. 

如果是SELECT语句, 返回结果集, 否则返回affectedRows.

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

