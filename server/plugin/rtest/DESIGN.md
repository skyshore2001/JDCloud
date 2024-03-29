# 筋斗云框架自动测试接口设计

本插件用于实现筋斗云后端自动化测试用例要求。

自动化测试可参考项目 [jdcloud-rtest](https://github.com/skyshore2001/jdcloud-rtest)

对框架功能进行回归测试时，应在plugin/index.php中设置只加载本插件：

	Plugins::add("rtest");

在chrome中运行rtest.html即可。

## 测试工具函数

测试接口：

	fn(f, ...) -> { ret }

参数：

- f: 函数名
- 其它参数见该函数的参数表。

### 获取参数

服务端实现：

	param(name, defVal?, coll?)
	mparam(name, coll?)

- name: 指定参数名，其中可以含有类型标识，如"cnt/i", "wantArray/b"等。
- coll: 'G' 表示GET参数, 'P'表示POST参数，不指定表示GET/POST均可。

### 数据库函数

服务端实现：

	queryAll(sql)
	queryOne(sql)
	execOne(sql, getNewId?=false)

- getNewId: 为true则返回INSERT语句执行后新得到的自增id

## 函数型接口

实现下列接口，并定义用户登录权限。

	login(uname, pwd) -> {id}
	whoami() -> {id}
	logout

其中login接口应初始化权限；whoami接口检查权限：

	whoami

	- 权限：AUTH_USER
	- 返回与login相同的内容。

	
## 对象型接口

数据表

@ApiLog: id, ac, tm, addr, ua, userId

### 基本CRUD

	ApiLog.add()(ac, tm?, addr?) -> id
	ApiLog.add(res)(ac, tm?, addr?=test_addr) -> {按res指定返回}

	ApiLog.get(id) -> {id, ...}
	ApiLog.get(id, res) -> {按res指定返回}

	ApiLog.set(id)(fields...)

	ApiLog.del(id)

	查询
	ApiLog.query(res, cond, orderby) -> tbl(id,...) ={h, d, nextkey?}

	分页
	ApiLog.query(pagesz, pagekey?) -> {h, d, nextkey?}
	ApiLog.query(pagesz, pagekey=0) -> {h, d, nextkey?, total}

	统计
	ApiLog.query(gres, cond) -> {h, d, nextkey?}

	格式化
	ApiLog.query(fmt=list) -> {list, nextkey?}
	ApiLog.query(fmt=csv) -> csv格式

	jquery-easyui支持
	分页：必返回total字段
	ApiLog.query(page, rows) -> {h, d, nextkey?, total}
	排序：
	ApiLog.query(sort, order) = ApiLog.query(orderby="{sort} {order}")

	支持qsearch: 可查询ac, addr字段
	ApiLog.query(q)

	外部字段
	ApiLog.query() -> tbl(..., y,m等时间字段(tmCols),  ym)

应用逻辑

- 权限: AUTH_GUEST
- 添加：tm自动填充为当前时间；ac必填(required)。
- 更新：tm, ac不可更新(readonly)。
- 获取：不返回ua(hidden).

用于子表与关联表测试：

	子表字段log, lastLog; lastLogAc依赖lastLog而实现
	UserA.query() -> tbl(id, ..., logCnt, lastLogId, lastLogAc?, @log?, %lastLog)
	UserA.get
	UserA.add

	关联表字段user2
	UserApiLog.query() -> tbl(id, ..., %user2)

- AUTH_USER

### 权限限制, 虚拟字段与子表

表：@User: id, name, phone
vcol: lastLogId?, lastLogAc? logCnt, @log?, %lastLog
（由于@User对象限制了操作，测试时使用虚表 @UserA 用于对象接口测试，它与ApiLog构成主子表，@log为子表对象）

- lastLogId, logCnt: 日志数（外部字段）
- log: [{id,tm,ac,addr}] 用户日志（标准子表），应只用于get。
- lastLog: {id,tm,ac,addr} 最近1条日志（关联表，依赖lastLogId）
- lastLogAc: 即lastLog.ac, 通过enumFields机制实现。

表：@ApiLog: id, tm, ac, addr

视图: @UserApiLog=ApiLog where userId IS NOT NULL
vcol: userName, %user?, %user2?, last3LogAc?, last3Log?, 统计时间字段(tmCols)
只读字段: tm, ac

接口

	UserApiLog.add(ac, tm?, addr?) -> id
	UserApiLog.query() -> tbl(id, ..., userName, %user?, last3LogAc?, @last3Log?, %user2)
	UserApiLog.get() -> ...
	UserApiLog.del()

返回

- userName: 关联User.name
- %user={id, name}: user对象
- last3LogAc: List(id, ac). 当前用户的最近3条日志, 按id倒排序。
- @last3Log={id, ac}: 同上，返回子表。
- %user2: (v5.4) 替代%user的实现，采用关联表机制，更简单高效。

应用逻辑

- 权限: AUTH_USER
- add: 自动完成userId, tm字段
- query/get/del时，只能操作当前用户自己的记录。
- 不允许set操作
- query结果默认按id倒排序.

### 非标准方法

	UserApiLog.listByAc(ac, pagesz?, pagekey?) -> [{id, ...}]

- 权限: AUTH_USER
- 相当于调用 UserApiLog.query(cond="ac={ac}", fmt=list), 支持分页。

