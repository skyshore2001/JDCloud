# BQP - 业务查询协议

业务查询协议，简称BQP(Business Query Protocol)，它是一种远程过程调用(RPC)协议。
本文档定义业务接口如何调用及返回，如何规范描述接口，以及定义通用对象操作接口。

请求由接口名（action），参数（param），数据（data）三部分构成，表示为`action(param)(data)`，其中参数或数据可以缺省，如`action(param)`或`action()(data)`。
参数一般是键值对，而数据的内容和形式则由具体接口定义。

接口返回形式为`[code, retData, ...]`的JSON数组，至少为两个元素。当调用成功时，code为0，返回数据retData由接口原型定义。
调用失败时（也称为异常），code为非0错误码，retData为错误信息。
返回数组中其它内容一般为调试信息。

假如接口原型如下：

	fn(p1, p2?)(data) -> {field1, field2}

其中`fn`为接口名，`p1`, `p2`是两个参数，且`p2`可以缺省。第二个括号表示需要传输数据（数据格式会特别说明）。
箭头后面部分是调用成功时的返回值，如果没有箭头后面部分，则表示不关心返回值，默认返回字符串"OK"。
调用成功后返回JSON数组示例: `[0, {"field1": "value1", "field2": "value2"}]`。

本文档调用示例使用JS函数`callSvr`表示：

	callSvr(调用名, URL参数/可选, $.noop(表示空的回调函数，用来分隔URL和POST参数), POST参数/可选, 其它选项/可选)

比如，下面表示同时传了URL参数id和POST参数amount：

	callSvr("Ordr.set", {id: 100}, $.noop, {amount: 99.9});

## 接口通讯协议

本章定义业务查询协议的实现方式，如何表示请求（调用名、参数、数据）和返回。

业务查询协议基于HTTP协议实现，以下列接口为例：

	fn(p1, p2) -> {field1, field2}

以下假定接口服务的URL基地址(BASE_URL)为`/api`。
该接口可以使用HTTP GET请求实现：

	GET /api/fn?p1=value1&p2=value2

或表示为

	callSvr("fn", {p1: "value1", p2: "value2"})

也可以使用HTTP POST请求实现：

	POST /api/fn
	Content-Type: application/x-www-form-urlencoded;charset=utf-8

	p1=value1&p2=value2

或表示为

	callSvr("fn", $.noop, {p1: "value1", p2: "value2"})

POST内容也可以使用json格式，如：

	POST /api/fn
	Content-Type: application/json;charset=utf-8

	{"p1":"value1","p2":"value2"}

参数允许部分出现在URL中，部分出现在POST内容中，如

	POST /api/fn?p1=value1
	Content-Type: application/x-www-form-urlencoded;charset=utf-8

	p2=value2

或表示为

	callSvr("fn", {p1: "value1"}, $.noop, {p2: "value2"})

如果URL与POST内容中出现同名参数，最终以URL参数为准。

接口名为URL基地址后一个词（常称为PATH_INFO），如URL`/api/fn`中接口名为"fn"。
如果难以实现，也可以使用URL参数ac表示接口名，即URL中`/api?ac=fn&p1=value1&p2=value2`中接口名也是"fn"。

**[必须使用HTTP POST的情形]**

如果接口定义中有请求数据（即在接口原型中用两个括号），如：

	fn(p1,p2)(p3,p4) -> {field1, field2}

这时必须使用HTTP POST请求，参数只能通过URL传递，数据通过POST内容传递：

	POST /api/fn?p1=value1&p2=value2
	Content-Type: application/x-www-form-urlencoded;charset=utf-8

	p3=value3&p4=value4

注意数据的格式应通过HTTP头Content-Type正确设置，一般应支持"application/x-www-form-urlencoded"或"application/json"格式。
少数例外情况应特别指出，比如上传文件接口upload一般设计为使用HTTP头"Content-type: multipart/form-data"，应在接口文档中明确说明。

协议规定：

- 只要服务端正确收到请求并处理，均返回HTTP Code 200，返回内容使用JSON格式，为一个至少含有2元素的数组。
 - 在请求成功时返回内容格式为 `[0, retData]`，其中`retData`的类型由接口描述定义。
 - 在请求失败时返回内容格式为 `[非0错误码, 错误信息]`.
 - 从返回数组的第3个元素起, 为调试信息, 仅用于问题诊断, 一般不应显示出来给最终用户。
- 所有交互内容采用UTF-8编码。

服务端在返回JSON格式数据时应如下设置HTTP头属性：

	Content-Type: text/plain; charset=UTF-8

注意：不采用"application/json"类型是考虑客户端可以更自由的处理返回结果。

服务端应避免客户端对返回结果缓冲，一般应在HTTP响应中加上

	Cache-Control: no-cache

以下面的接口描述为例：

	获取订单：
	getOrder(id) -> {id, dscr, total}

一次成功调用可描述为：

	getOrder(id=101) -> {id: 101, dscr: "套餐1", total: 38.0}

它表示：发起HTTP请求为 `GET /api/getOrder?id=101`（当然也可以用POST请求），服务端处理成功时返回类型为`{id, dscr, total}`：

	HTTP/1.1 200 OK

	[0, {"id": 101, "dscr": "套餐1", "total": 38.0}]

关于返回类型表述方式详见后面章节描述。

服务端处理失败时返回示例：

	HTTP/1.1 200 OK

	[1, "未认证"]

错误码及错误信息在应用中应明确定义，协议规定以下错误码：

	enum {
		E_ABORT=-100; // "取消操作"。要求客户端不报错，不处理。
		E_AUTHFAIL=-1; // "认证失败"
		E_OK=0;
		E_PARAM=1; // "参数不正确"
		E_NOAUTH=2; // "未认证", 一般要求客户端引导用户到登录页，或尝试自动登录
		E_DB=3;　// "数据库错误"
		E_SERVER=4; // "服务器错误"
		E_FORBIDDEN=5; // "禁止操作"，用户没有权限调用接口或操作数据
	}

### 关于空值

假如传递参数`a=1&b=&c=hello`，或JSON格式的`{a:1, b:null, c:"hello"}`，其中参数"b"值为空串。
一般情况下，参数"b"没有意义，即与`a=1&c=hello`意义相同。

在某些场合，如通用对象保存接口`{Obj}.set`，在POST内容中如果出现"b=", 则表示将该字段置null。在这些场合下将单独说明。

### 多应用支持与应用标识

接口应支持多个应用同时访问，例如按登录角色划分，常见有用户端应用、员工端应用等。

每个客户端应用要求有唯一应用标识（如果没有，缺省为"user"，表示用户端应用），以URL参数"_app"指定。
在每次接口请求时，客户端框架应自动添加该参数。

应用标识（称为app或appName）对应一个应用类型（称为appType），如应用标识"user", "user2", "user-keyacct"对应同一应用类型"user"，即应用标识的第一个词（不含结尾数字）作为应用类型。

使用同一接口服务的不同应用类型的应用，如果在浏览器的两个Tab页中分别打开，两者不应相互影响，如用户端的退出登录不会导致员工端的应用也退出登录。
而同一应用类型和不同应用如果在浏览器中同时打开，其会话状态可以共享，比如当一个应用登录后，另一个应用也处于登录状态。

习惯上常用以下应用类型：

- user: 用户端应用
- emp: 员工端应用，如平台员工使用手机应用程序处理客户订单等。而应用标识"emp-admin"常用于表示运营管理端应用。
- admin: 超级管理端应用，一般由IT人员做初始化配置。

一般建议使用标准的HTTP Cookie来实现会话，且以应用类型决定HTTP会话中的Cookie项的名字：

	用于HTTP会话的Cookie名={应用类型}id

例如，应用标识为"emp"(表示员工端), 当第一次接口请求时：

	GET /api/fn?_app=emp

服务端应通过HTTP头指定会话标识，如：

	SetCookie: empid=xxxxxx

### 测试模式及调试等级

接口服务可配置为“测试模式”（TEST_MODE），这种模式用于开发和自动化测试，建议的功能有：

- 输出美化的JSON数据
- 允许输出额外调试信息
- 允许跨域调用
- 允许一些测试接口（比如执行SQL语句，常用于自动化测试）。
- 允许一些第三方服务以模拟方式执行（模拟模式 - MOCK_MODE）

接口服务可配置调试等级为0到9，向前端输出不同级别的调试信息。一般设置为9（最高）时，可以查看SQL调用日志，便于调试SQL语句。
调试信息仅在测试模式下生效。

**线上生产环境不可设置为测试模式。**
当前端发现服务处于测试模式，应给予明确提示。

## 接口描述

接口描述应包括接口原型和应用逻辑的说明。

接口原型包括接口名、参数、请求数据、返回值的声明。应用逻辑常包括接口权限、字段自动完成逻辑、字段检查逻辑、关联数据添加或更新逻辑等。

示例：
	
	获取订单
	Ordr.get(id) -> {id, status, storePos, @orderLog}
	
	参数：

	- id: Integer.

	返回：

	- id: Integer.
	- status: enum(CR-创建,PA-已付款,CA-已取消,RE-已完成)。订单状态。
	- storePos: Coord="经度, 纬度". 商户坐标.
	- orderLog: [{id, tm, ac, dscr}]. 订单日志。

	- ac: enum(CR-创建,PA-已付款,CA-已取消,RE-已完成). 操作类型.

	应用逻辑：

	- 权限：AUTH_USER

上例参数或返回中的`id`, `status`等字段如果含义及类型明确，或是在对象对应的数据模型设计文档中已提及，这里也可省略不做介绍。
`storePos`是一个序列化类型（以字符串表示的复杂类型），称为`Coord`类型，特别标明。
而`orderLog`是一个复杂结构，应分解介绍其内部属性，其中`id`, `tm`等属性因含义明确省略了介绍。

### 接口原型描述

接口名使用驼峰式命名规则，一般有两种形式，1）函数调用型，以小写字母开头，如`getOrder`；2）对象调用型，对象名首字母为大写，后跟调用名，中间以"."分隔，如`Order.get`。

在接口原型中，以"?"结尾的参数字段、数据字段或返回字段表示该字段可能缺省，如

	fn(p1, p2?, p3?=1) -> {attr1, attr2?}

其中，参数p3的缺省值是1，p2缺省值是0或空串""或null(取决于基本类型是数值型，字符串还是对象等)。
返回对象中，attr1是必出现的属性，而attr2可能没有（接口说明中应描述何时没有）。

接口原型中应描述参数或返回的类型。类型可能是数值、字符串这些基本类型，也可能是对象、数组、字典及其相互组合而成的复杂类型，或虽然是一个字符串但表示某个复杂类型的序列化。

基本类型不可再细分，其类型一般通过名称暗示，如：

- Integer: 后缀标识符为"&", 或以"Id", "Cnt"等结尾, 如 customerId, age&
- Number: 后缀标识符为"#", 如 avgValue#
- Currency: 后缀标识符为"@", 或以"Price", "Total", "Qty", "Amount"结尾, 如 unitPrice, price2@。
- Datetime/Date/Time: 分别以"Tm"/"Dt"/"Time"结尾，如 tm 可表示日期时间如"2010-1-1 9:00"，comeDt 只表示日期如"2010-1-1"，而 comeTime只表示时间如"9:00"
- Boolean/TinyInt(1-byte): 以Flag结尾, 或以is开头.
- String: 未显示指明的一般都作为字符串类型。

对于复杂类型，其描述方法用类似JSON格式来解析其中对象、数组、字典这些结构的组合，举例列举如下：

**{id, name}**

一个简单对象，有两个字段id和name。例：`{id: 100, name: "name1"}`

**[id...]** 或 **[id]**

一个简单数组，每个元素表示id。例：`[100, 200, 400]`, 每项为一个id

**[id, name]**

一个简单数组，例：`[100, "liang"]`，第一项为id,  第二项为name

**[ [id, name] ]** 或 **varr(id, name)**

简单二维数组，又称varr(value array), 如 `[ [100, "liang"], [101, "wang"] ]`.

**[{id, name}]** 或 **objarr(id, name)**

一个数组，每项为一个对象，又称objarr。例：`[{id: 100, name: "name1"}, {id: 101, name: "name2"}]`

**tbl(id, name)**

压缩表对象，常用于返回分页列表。其详细格式为 `{h: [header1, header2, ...], d:[row1, row2, ...], nextkey?, total?}`，例如

	{
	  h: ["id", "name"],
	  d: [[100, "myname1"], [200, "myname2"]]
	}

压缩对象支持分页机制(paging)，返回字段中可能包含"nextkey"，"total"等字段。
详情请参考后面章节"分页机制".

在类型描述时，可以用"@"符号表示一个数组属性，而对象或字典一般用"%"表示，如：

	获取订单接口：
	Ordr.get(id) -> { id, dscr, %addr, @items }

	返回

	- addr: {country, city}. 收货地址
	- items: [{id, name, qty}]. 订单中的物品。

注意：

- 在使用JSON传输数据时，字段可以不区分类型，即使是整形也**可能**用引号括起来当作字符串传输，客户端在对JSON数据反序列化时应自行考虑类型转换。
- 不论哪种类型，都可能返回null。客户端必须能够处理null，将其转为相应类型正确的值。

以上对类型的描述，使用的是一种层层剖析的形式化表达方法，请参考[蚕茧表示法](https://github.com/skyshore2001/cocoon-notation)。

除了基本类型和复杂类型，有时传递参数还会使用一个字符串来代表复杂结构，称为序列化类型。
常用的有：

- 逗号分隔的简单字符串序列(数组序列化)，如

		"经度,纬度"

	或带上类型描述：

		"经度/Double,纬度/Double"

	它可表示 `121.233543,31.345457`。

- List表，以逗号分隔行，以冒号分隔列的表，如定义：

		List(id, name?)

	或指定每列的类型，如

		List(id/Integer, name?/String)

	参数后加"?"表示是可选参数, 该项可以为空。
	它可以表示这样的数据：

		10:liang,11:wang
	
	因为name字段可省略，它也可以表示：

		10,11

	这种格式一般用于前后端间传递简单的表，尤其是一组数字如`10,11`常定义类型为`List(id)`。

	注意：由于使用分隔符","和":"，每个字段内不能有这两个特殊符号(例如假如有日期字段，中间不可以有":", 如"2015/11/20 1030"或"20151120 1030")。

	在传输数据时，也允许带表头信息，这时用首字符"@"标明表头行，如
	
		@id:name,10:liang,11:wang
		
- JSON序列化。将一个复杂结构以JSON格式序列化后的字符串，如定义：

		Json({id, name})
	
	括号内描述实际数据结构。它可以表示这样格式的字符串：

		"{\"id\": 100, \"name\": \"liang\"}"
	
	又比如，要将一个普通的表用一个字段传递，可以描述为：

		Json(tbl(id, name))

### 应用逻辑描述

在接口描述的应用逻辑说明中应包括接口权限说明。

权限在设计接口时定义，常用的定义示例如下：

- AUTH_GUEST: 任何人可用, 无权限限制。如不用登录即可查看商户, 天气等. 
- AUTH_USER: 用户登录后可用. 可做下单, 查看订单等操作. 
- AUTH_EMP: 员工操作，如查看和操作订单等。
- PERM_TEST_MODE: 测试模式下可用。

权限一般名为`PERM_XXX`，特别地，登录类型是一种特殊的权限，一般定义名称为`AUTH_XXX`。

如果接口未明确指定权限，则认为是AUTH_GUEST.

## 通用对象操作接口

业务接口包括函数调用型接口和对象调用型接口。

函数型接口名称一般为动词或动词开头，如queryOrder, getOrder等。对象型接口的格式为`{对象名}.{动作}`, 如 "Order.get", "Order.query"等。

接口服务框架应支持对象型接口的以下标准操作：add, set, query, get, del。
这些操作提供对象的基本增删改查(CRUD)以及列表查询、统计分析、导出等服务，称为通用对象接口。

在做接口设计时，应以通用对象接口为基础，按业务逻辑需要进行定制形成专用接口，如进行权限限制、指定允许的操作类型(如只能get/set,不能add/del)、只读字段、隐藏字段等。

下面将分别定义这些操作，其中用Obj代指对象实际名称。

### 基本增删改查操作

**[添加操作]**

接口原型：

	Obj.add(uniKey?)(POST fields...) -> id
	Obj.add(res)(POST fields...) -> {fields...} (返回的字段由res参数指定)

对象的属性通过POST请求内容给出，为一个个键值对。
添加完成后，默认返回新对象的id, 如果想多返回其它字段，可设置res参数，如 

	callSvr("Ordr.add", $.noop, {status:"CR", total:100}) -> 809

	callSvr("Ordr.add", {res:"id,status,total"}, $.noop, {status:"CR", total:100}) -> {id: 810, status:"CR", total: 100}

对象id支持自动生成。

- uniKey: 唯一索引字段. 如果指定, 则以该字段查询记录是否存在(调用query接口）, 存在则更新（调用set接口）。例如"code", 也支持多个字段（用于关联表），如"bpId,itemId"。

**[更新操作]**

接口原型：

	Obj.set(id)(POST fields...)

与add操作类似，对象属性的修改通过POST请求传递，而在URL参数中需要有id标识哪个对象。

示例：

	callSvr("Obj.set", {id: 809}, $.noop, {status:"PA", empId:10}) -> "OK"

如果未指定返回值，一般默认返回"OK"。下面示例也将省略返回值。

如果要将某字段置空, 可以用空串或"null" (小写)。例如：

	callSvr("Obj.set", {id: 809}, $.noop, {picId:"", empId:"null"})
	（实际传递参数的形式为 "picId=&empId=null"，注意是字符串"null"，不是直接的null）

这两种方式都是将字段置空。
注意：一般情况下，接口传参数"picId="这样的，参数会被忽略，相当于没有设置该字段。

另外注意，上例是设置字段为null，而不是设置成空串""。
如果要将字符串置空串(一般不建议使用)，可以用"empty", 例如：

	callSvr("Obj.set", {id: 809}, $.noop, {sn: "empty"})

假如sn是数值类型，会导致其值为0或0.0。

支持根据条件批量更新，使用setIf接口：

	Obj.setIf(cond)(POST fields...)

示例：

	callSvr("Obj.setIf", {cond: "tm>='2010-1-1' and tm<'2011-1-1'"}, $.noop, {dscr: "已处理"});

**[获取对象操作]**

接口原型：

	Obj.get(id, res?) -> {fields...}
	
默认返回所有暴露的属性，通过res参数可以指定需要返回的字段。

**[删除操作]**

接口原型：

	Obj.del(id)

根据id删除一个对象，例如：

	callSvr("Obj.del", {id: 809})

支持根据条件进行批量删除，使用delIf接口：

	Obj.delIf(cond)

示例：

	callSvr("Obj.delIf", {cond: "tm>='2010-1-1' and tm<'2011-1-1'"});

### 查询操作

接口原型：

	查询列表(默认压缩表格式)：
	Obj.query(res?, cond?, distinct?=0, pagesz?=20, pagekey/page?) -> tbl(fields...) = {nextkey?, total?, @h, @d}

	查询列表 - 对象列表格式：
	Obj.query(fmt=list/one/one?/array/hash/multihash, ...) -> {nextkey?, total?, @list=[obj1, obj2...]}

	分组统计：
	Obj.query(gres, ...) -> tbl(fields...)

	导出查询列表到文件：
	Obj.query(fmt=csv/txt/excel, ...) -> 文件内容

查询接口非常灵活，不仅支持条件组合查询、排序、指定输出字段等，还支持分页列表、分组统计、导出文件等。

查询操作的参数可参照SQL语句来理解：

res
: String. 指定返回字段, 多个字段以逗号分隔，例如, res="field1,field2"。字段前不可加表名或别名(alias)，如"t0.id"或"id as userId"不合法。
在res中允许使用部分统计函数如`sum`与`count`, 这时必须指定字段别名, 如`count(id) cnt`, `sum(qty*price) total`, `count(distinct addr) addrCnt`.

cond
: String. 指定查询条件，语法可参照SQL语句的"WHERE"子句。例如：`cond="field1>100 AND field2='hello'"`, 注意使用UTF8+URL编码, 字符串值应加上单引号.

orderby
: String. 指定排序条件，语法可参照SQL语句的"ORDER BY"子句，例如：`id desc`，也可以多个排序如：`tm desc,status` (按时间倒排，再按状态正排)

distinct
: Boolean. 如果为1, 生成`SELECT DISTINCT ...`查询.

尽管类似SQL语句，但对参数值有一些安全限制：

- res, orderby只能是字段（或虚拟字段）列表，不能出现表达式、函数、子查询等。特别地，res参数允许部分统计函数，见上面示例。
- cond可以由多个条件通过and或or组合而成，而每个条件的左边是字段名，右边是常量。不允许对字段运算，不允许子查询（不可以有select等关键字）。

#### 查询条件(cond)

用参数`cond`指定查询条件, 如：

	{cond: "type='A' and name like '%hello%'"}

也可以使用键值对方式：

	{cond: {type: "A", name: "~hello"} }

以下情况都不允许：

	left(type, 1)='A'  -- 条件左边只能是字段，不允许计算或函数
	type=type2  -- 字段与字段比较不允许
	type in (select type from table2) -- 子查询不允许

cond参数可以同时在URL参数和POST参数中指定，支持字符串、数组、键值对方式指定查询条件。

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

		{id:1, status:"CR", name:"null", dscr:null, f1:"", f2:"empty"}
		生成 "id=1 AND status='CR'" AND name IS NULL AND f2=''
		注意：null和空串匹配是特殊处理的，要用字符串"null"表示null, 用"empty"表示空串：

		可以使用符号： > < >= <= !(not) ~(like匹配)
		{id:"<100", tm:">2020-1-1", status:"!CR", name:"~wang%", dscr:"~aaa", dscr2:"!~aaa"}
		生成 "id<100 AND tm>'2020-1-1" AND status<>'CR' AND name LIKE 'wang%' AND dscr LIKE '%aaa%' AND dscr2 NOT LIKE '%aaa%'"
		like用于字符串匹配，字符串中用"%"或"*"表示通配符，如果不存在通配符，则表示包含该串(即生成'%xxx%')

		{b:"!null", d:"!empty"]
		生成 "b IS NOT NULL" AND d<>''"

	可用AND或OR连接多个条件，但不可加括号嵌套：

		{tm: ">=2020-1-1 AND <2020-2-1", tm2: "<2020-1-1 OR >=2020-2-1"}
		生成 "(tm>='2020-1-1' AND tm<'2020-2-1') AND (tm2<'2020-1-1' OR tm2>='2020-2-1'"

		{id:">=1 AND <100", status:"CR OR PA", status2:"!CR AND !PA OR null"}
		生成 "(id>=1 AND id<100) AND (status='CR' OR status='PA') AND (status2<>'CR" AND status2<>'PA' OR status2 IS NULL)"

		{a:"null OR empty", b:"!null AND !empty", _or: 1}
		生成 "(a IS NULL OR a='') OR (b IS NOT NULL AND b<>'')", 默认为AND条件, `_or`选项用于指定OR条件

- 数组，每个元素是上述条件字符串或键值对，如：

		["id>=1", "id<100", "name LIKE 'wang%'"] // "id>=1 AND id<100" AND name LIKE 'wang%'"
		[ {id: ">=1"}, {id:"<100"}, {name: "~want*} ] // 同上

#### 查询结果格式(fmt)

查询结果可以以指定形式返回, 缺省返回压缩表类型即"h/d"格式，例如：

	{
		h: ["id", "name"],
		d: [[1, "jerry"], [2, "tom"]]
		nextkey: ... (用于分页，注意默认分页20条)
	}

由于不会每行重复传输字段名，压缩表类型一般传输效率更高。

**[list与array格式]**

如果指定`{fmt: "list"}`，则返回对象列表格式:

	{
		"list": [
			{"id": 1, "name": "jerry"},
			{"id": 2, "name": "tom"}
		],
		nextkey: ... (用于分页，注意默认分页20条)
	}

如果指定`{fmt: "array"}`，则返回数组对象列表格式（相当于list格式的list内容部分），注意此时不支持分页，返回后端限制的最大行数的数据（默认1000，最大可调到10000），常用于已知行数有限的查询：

	[
		{"id": 1, "name": "jerry"},
		{"id": 2, "name": "tom"}
	]

**[one与one?格式]**

如果指定`{fmt: "one"}`，则只以对象格式返回一行，类似get接口：

	{"id": 1, "name": "jerry"}

且如果查询不到数据，会抛出错误（也是与get接口类似）。

如果查询不到数据时不想抛出错误，而是返回null，可以用`{fmt: "one?"}`参数。

特别地，如果返回数据只有一列，`one?`格式则直接返回该列值。
示例：查询订单数，返回只有一列cnt。

	callSvr("Ordr.query", {res: "COUNT(*) cnt", fmt: "one?"})

假如有99个订单，使用`fmt:"one?"`直接返回`99`，如果使用`fmt:"one"`则返回`{cnt: 99}`。

**[hash与multihash格式]**

如果指定`{fmt: "hash"}`，则以映射表格式返回：

	{
		1: {"id": 1, "name": "jerry"},
		2: {"id": 2, "name": "tom"}
	}

它等价于`{fmt: "hash:id"}`，即hash后未指定字段时，默认取第一个字段做为hash key。

如果指定`{fmt: "hash:name"}`:

	{
		"jerry": {"id": 1, "name": "jerry"},
		"tom": {"id": 2, "name": "tom"}
	}

如果指定`{fmt: "hash:id,name"}`:

	{1: "jerry", 2: "tom"}

如果指定`{fmt: "hash:name,id"}`:

	{"jerry": 1, "tom": 2}

multihash与hash类似，只是用数组表示结果，所以就算出现key重名时也不会覆盖，示例：指定`{fmt: "multihash"}`：

	{
		1: [ {"id": 1, "name": "jerry"} ],
		2: [ {"id": 2, "name": "tom"} ]
	}

如果指定`{fmt: "multihash:name,id"}`:

	{"jerry": [ 1 ], "tom": [ 2 ]}

**[tree树型结构]**

例如如下`{id,fatherId}`线性结构数组中，数组的每个元素中有个fatherId字段指向父结点的id属性：

	[
		{"id":1},
		{"id":2, "fatherId":1},
		{"id":3, "fatherId":2},
		{"id":4, "fatherId":1}
	]

如果指定`{fmt: "tree"}`,返回转为树型结构`{id,children}`:

	[
		{"id":1, "children": [
			{"id":2, "fatherId":1, "children": [
				{"id":3, "fatherId":2},
			]},
			{"id":4, "fatherId":1}
		]},
	]

可以通过URL参数treeFields重定义各字段名，默认值为`id,fatherId,children`，设置示例：`{treeFields:'code,fatherCode'}`，`{treeFields:'code,fatherCode,subtree'}`

#### 查询结果支持分页

参数pagesz/pagekey等与返回分页列表有关，详细介绍请参考“[查询分页机制][]”章节。

#### 导出文件

**查询结果支持导出到文件**

在对象查询接口中添加参数"fmt"，可以输出指定格式，一般用于列表导出。参数：

fmt
: Enum(csv,txt,excel). 导出Query的内容为指定格式。其中，csv为逗号分隔UTF8编码文本；txt为制表分隔的UTF8文本；excel为逗号分隔的使用本地编码如gb2312编码文本（因为默认excel打开Csv文件时不支持utf8编码）。

在实现时，注意设置正确的HTTP头，如csv文件：

	Content-Type: application/csv; charset=UTF-8
	Content-Disposition: attachment;filename=1.csv

导出txt文件设置HTTP头的例子：

	Content-Type: text/plain; charset=UTF-8
	Content-Disposition: attachment;filename=1.txt

示例：导出以逗号分隔的表格文本

	var url = makeUrl("Store.query", {
		res: "id,name,addr",
		fmt: "csv",
		pagesz: -1
	})
	window.open(url); // 下载文件

注意，由于默认会有分页，要想导出所有数据，一般可指定分页大小为-1（后端最大限制一般为10000条，可在后端调整）

#### 分组统计

主要通过gres参数实现查询结果分组：

gres
: String. 分组字段。如果设置了gres字段，则res参数中每项应该带统计函数，如"sum(cnt) sum, count(id) userCnt". 最终返回列为gres参数指定的列加上res参数指定的列; 如果res参数未指定，则只返回gres参数列。

例：统计2015-2016两年间，按年份、状态分类（如已付款、已评价、已取消等）的各类订单的总数和总金额。

	callSvr("Ordr.query", {
		gres: "y,status", res: "count('A') totalCnt, sum(amount) totalAmount",
		cond: "tm>='2015-1-1' and tm<'2017-1-1'"
	})

返回内容示例：

	[
		h: ["y", "status", "totalCnt", "totalAmount"],
		d: [
			[ 2015, "PA", 1130, 14420 ],  // 已付款，共1130单，14420元
			[ 2015, "CA", 2, 38 ], // 取消的订单
			[ 2016, "PA", 170, 3390 ],
			[ 2016, "CA", 9, 220 ],
			[ 2016, "RA", 1530, 15580 ], // 已评价的订单
		]
	]

在做数据透视表展示统计结果时，常常用到行列转置，可用以下参数：

pivot
: String. 设置行列转置。

pivotCnt
: Integer. 可选，默认统计列为最后1列，若最后两列都是是统计列，可以设置为2.

例：上面示例中，将状态status列转置到行上：

	callSvr("Ordr.query", {
		gres: "y,status", res: "count('A') totalCnt, sum(amount) totalAmount",
		cond: "tm>='2015-1-1' and tm<'2017-1-1'",
		pivot: "status",
		pivotCnt: 2
	})

返回内容示例：

	[
		h: ["y", "PA","CA","RA"],
		d: [
			[ 2015, [1130, 14420], [2, 38], [0, 0] ],
			[ 2016, [170, 3390], [9, 220], [1530, 15580] ]
		]
	]

### 查询分页机制

如果一个查询支持分页(paging), 则一般调用形式为

	Ordr.query(page/pagekey?, pagesz/rows?=20) -> {nextkey, total?, @h, @d}

**[参数]**

pagesz或rows
: Integer. 这两个参数含义相同，均表示页大小，默认为20条数据。

page
: Integer. 可选，指定分页页码，默认为1（第1页）。

pagekey
: Integer. 与page参数指定页码不同，pagekey是另一种基于主键的分页。一般首次查询时不填写（或填写0，表示需要返回总记录数即total字段），而下次查询时应根据上次调用时返回数据的"nextkey"字段来填写。

**[查询返回字段]**

nextkey
: Integer. 一个字符串, 供取下一页时填写参数"pagekey"或"page"。如果不存在该字段，则说明已经是最后一批数据。

total
: Integer. 返回总记录数，仅当"pagekey"指定为0时返回，或是指定"page"参数时也会返回。）

h/d
: 两个数组。实际数据表的头信息(header)和数据行(data)，符合压缩表对象的格式。

**[示例]**

基于page页码的查询较容易理解，常用于管理端分页列表。而pagekey是基于主键的查询，常用于移动端上拉自动加载下一页的列表，示例如下。

第一次查询

	callSvr("Ordr.query")

返回

	{nextkey: 10800910, h: ["id", "desc", ...], d: [...]}

其中的nextkey将供下次查询时填写pagekey字段；

要在首次查询时返回总记录数，可以设置用pagekey=0：

	callSvr("Ordr.query", {pagekey:0})

这时返回

	{nextkey: 10800910, total: 51, h: ["id", ...], d: [...]}

total字段表示总记录数。由于缺省页大小为20，所以可估计总共有51/20=3页。

第二次查询(下一页)

	callSvr("Ordr.query", {pagekey:"10800910"});

返回

	{nextkey: 10800931, h: [...], d: [...]}

仍返回nextkey字段说明还可以继续查询，

再查询下一页

	callSvr("Ordr.query", {pagekey: "10800931"})

返回

	{h: [...], d: [...]}

返回数据中不带"nextkey"属性，表示所有数据获取完毕。

**[分页实现]**

分页有两种实现方式：按主键字段的分段查询式分页，以及使用LIMIT操作为核心的传统分页。

分段查询的原理是利用主键id进行查询条件控制（自动修改WHERE语句），每次返回的pagekey字段实际是上次数据的最后一个id.

首次查询：

	callSvr("Ordr.query")

SQL样例如下：

	SELECT * FROM Ordr t0
	...
	ORDER BY t0.id
	LIMIT {pagesz}

再次查询

	callSvr("Ordr.query", {pagekey: "10800910"})

SQL样例如下：

	SELECT * FROM Ordr t0
	...
	WHERE t0.id>10800910
	ORDER BY t0.id
	LIMIT {pagesz}

分段查询性能高，更精确，不会丢失数据。但它仅适用于未指定排序字段（无orderby参数）或排序字段是id的情况（例如：orderby="id DESC"）。
查询引擎应根据orderby参数自动选择分段查询或传统分页。

传统分页常通过SQL语句的LIMIT关键字来实现。pagekey字段实际是页码。其原理是：

首次查询

	callSvr("Ordr.query", {orderby:"comeTm DESC"})

（以comeTm作为排序字段，无法应用分段查询机制，只能使用传统分页。）

SQL样例如下：

	SELECT * FROM Ordr t0
	...
	ORDER BY comeTm DESC, t0.id
	LIMIT 0,{pagesz}

再次查询

	callSvr("Ordr.query", {pagekey:2})

SQL样例如下：

	SELECT * FROM Ordr t0
	...
	ORDER BY comeTm DESC, t0.id
	LIMIT ({pagekey}-1)*{pagesz}, {pagesz}

### 批量导入数据

标准接口`Obj.batchAdd`用于批量导入数据（支持不存在则添加，存在则更新）。返回导入记录数cnt及编号列表idList：

	Obj.batchAdd(title?, uniKey?, useColMap?)(...) -> {cnt, @idList}

它在一个事务中执行，一行出错后立即失败返回，该行前面已导入的内容也会被取消（回滚）。

- title: List(fieldName). 指定标题行(即字段列表). 如果有该参数, 则忽略POST内容或文件中的标题行.
 如"title=name,-,addr"表示导入第一列name和第三列addr, 其中"-"表示忽略该列，不导入。
 字段列表以逗号或空白分隔, 如"title=name - addr"与"title=name, -, addr"都可以.

- uniKey: 唯一索引字段. 如果指定, 则以该字段查询记录是否存在, 存在则更新。例如"code", 也支持多个字段（用于关联表），如"bpId,itemId"。

- useColMap: 设置为1时，使用列名映射。

#### 批量导入支持三种方式

1. 直接在HTTP POST中传输内容，数据格式为：首行为标题行(即字段名列表)，之后为实际数据行。
行使用"\n"分隔, 列使用"\t"或逗号分隔（后端自动判断），方便直接从Excel中拷贝数据出来，或导出csv格式文件。
接口为：

	{Obj}.batchAdd(title?)(标题行，数据行)
	(Content-Type=text/plain)

前端JS调用示例：

	var data = "name\taddr\n" + "门店1\t地址1\n门店2\t地址2\n";
	callSvr("Store.batchAdd", function (ret) {
		app_alert("成功导入" + ret.cnt + "条数据！");
	}, data, {contentType:"text/plain"});

或指定title参数:

	var data = "门店名\t地址\n" + "门店1\t地址1\n门店2\t地址2\n";
	callSvr("Store.batchAdd", {title: "name,addr"}, function (ret) {
		app_alert("成功导入" + ret.cnt + "条数据！");
	}, data, {contentType:"text/plain"});

示例: 在chrome console中导入数据

	callSvr("Vendor.batchAdd", {title: "-,name, tel, idCard, addr, picId"}, $.noop, `编号	姓名	手机号码	身份证号	通讯地址	身份证图
	112	郭志强	15384811000	150221199211215XXX	地址1	532
	111	高长平	18375991001	500226198312065XXX	地址2	534
	`, {contentType:"text/plain"});
		
2. 标准csv/txt文件上传：

上传的文件首行当作标题列，如果这一行不是后台要求的标题名称，可通过URL参数title重新定义。
一般使用excel csv文件（编码一般为gbk），或txt文件（以"\t"分隔列）。
接口为：

	{Obj}.batchAdd(title?)(csv/txt文件)
	(Content-Type=multipart/form-data, 即html form默认传文件的格式)

后端处理时, 将自动判断文本编码(utf-8或gbk).

前端HTML:

	<input type="file" name="f" accept=".csv,.txt">

前端JS示例：

	var fd = new FormData();
	fd.append("file", frm.f.files[0]);
	callSvr("Store.batchAdd", {title: "name,addr"}, function (ret) {
		app_alert("成功导入" + ret.cnt + "条数据！");
	}, fd);

3. 传入对象数组

格式为 {list: [...]}，示例：

	var data = {
		list: [
			{name: "郭志强", tel: "15384811000"},
			{name: "高长平", tel: "18375991001"}
		]
	};
	callSvr("Store.batchAdd", function (ret) {
		app_alert("成功导入" + ret.cnt + "条数据！");
	}, data);

#### 通过导入实现批量更新

batchAdd接口配合标准add接口支持的uniKey参数，可实现存在则更新，不存在则添加的逻辑。

示例：接上节示例，在导入时希望实现根据名称与电话(name和tel字段)匹配，则记录存在则做更新，不存在则添加，只须增加uniKey参数：

	callSvr("Store.batchAdd", {uniKey: "name,tel"}, function (ret) {
		app_alert("成功导入" + ret.cnt + "条数据！");
	}, data);

#### 支持带子表导入

示例：有以下主-子表对象：

	工单：@Ordr: id, code, itemId, qty
	工单配料单 @BOM: id, orderId, code, name

注意：拷贝到Excel中看的比较清楚；为避免Excel将长数字显示为科学计数法，在复制前先设置单元格格式为文本。

	生产订单号	物料编码	物料规格	开工日期	完工日期	生产数量	子件编码	子件规格	基本用量
	SCDD210202302	30101001010484	热像仪#Fotric 615C-L47	2021-02-04	2021-02-04	1.00	20901001000052	标品#Lantern_B31-L47	1
	SCDD210202302	30101001010484	热像仪#Fotric 615C-L47	2021-02-04	2021-02-04	1.00	10205001000017	标签#Lantern_40*30mm铜版纸空白标签#中性#通用	1

调用示例：

	callSvr("Ordr.batchAdd", {title: "code,itemCode,itemName,planTm,planTm1,qty,@bom.code,@bom.name,@bom.qty", uniKey: "code"}, $.noop, data);

注意：由于子表分布在多行，必须以uniKey参数指定主表唯一字段（支持多个字段联合，以逗号分隔），将根据此字段将多行数组组合成对象后一次导入。
为了正确将主-子表结构的数据行组合成对象，必须保证：组成一个对象的所有行必须在一起，具有相同的uniKey字段，或是对象的第二行起，不指定uniKey字段。

上例也可以简化定义成：(第二行起，无须主表字段，只需要最后三个子表字段) (拷贝到Excel中看)

	生产订单号	物料编码	物料规格	开工日期	完工日期	生产数量	子件编码	子件规格	基本用量
	SCDD210202302	30101001010484	热像仪#Fotric 615C-L47	2021-02-04	2021-02-04	1.00	20901001000052	标品#Lantern_B31-L47	1
							10205001000017	标签#Lantern_40*30mm铜版纸空白标签#中性#通用	1

#### 支持列名映射

数据表导入时，默认是按固定列顺序来确定字段的，比如第1列必须是code，第2列必须是itemCode，如果要跳过一列，须通过"-"来指定；
使用列名映射是另一种方式（通过指定参数useColMap=1激活），示例：

	id	name	code	itemId	itemCode
	1	name1	code1	101	item-101
	2	name2	code2	102	item-102

batchAdd调用参数为: `{title: "code,itemCode", useColMap:1}`。

这时只通过列名来匹配（若找不到匹配列则报错！），列的顺序对导入就没有影响。可以通过`->`来指定列的别名，示例：

	编号	物料名	编码	物料名	物料编码
	1	name1	code1	101	item-101
	2	name2	code2	102	item-102

batchAdd调用参数为: `{title: "编码->code,物料编码->itemCode", useColMap:1}`。支持子对象列名映射，如`子件编码->@bom.code`。

### 子表的增删改查操作

假设主对象为Obj，子对象为Obj1，设计如下：

	@Obj: id, name
	vcol: @obj1 (说明：vcol表示虚拟字段，@obj1表示字段obj1是个数组，一般就是子对象)

	@Obj1: id, objId, name （通过objId关联主对象)

#### 子表添加

在添加主对象时，同时添加子对象:

	Obj.add()(name, @obj1...) -> id

示例：

	callSvr("Obj.add", $.noop, {
		name: "name1",
		obj1: [
			{ name: "obj1-name1" },
			{ name: "obj1-name2" }
		]
	});

#### 子表查询

主对象添加后，可以通过get接口获取主对象及子对象：

	callSvr("Obj.get", {id: 1001, res:"id,name,obj1"}) -> {
		id: 1001,
		name: "name1",
		obj1: [
			{ id: 10001, name: "obj1-name1" },
			{ id: 10002, name: "obj1-name2" }
		]
	});

要控制子对象的查询结果字段，可以加`res_{子对象名}`参数；要控制子对象的查询参数，可以加`param_{子对象名}`参数，示例：

	callSvr("Obj.get", {id: 1001, res:"id,name,obj1", res_obj1:"id,name"})
	或
	callSvr("Obj.get", {id: 1001, res:"id,name,obj1", param_obj1: { res: "id,name"} })
	callSvr("Obj.get", {id: 1001, res:"id,name,obj1", param_obj1: { res: "id,name", cond: "id>=10002"} })

注意：如果使用了别名，则指定res,param时也要用别名：

	callSvr("Obj.get", {id: 1001, res:"id,name,obj1 objList", res_objList:"id,name"})
	// 甚至可以多别名分别指定:
	callSvr("Obj.get", {id: 1001, res:"id,name,obj1 objList,obj1 objList2", res_objList:"id,name", res_objList2:"id,code"})

当然，也可以直接查询子对象，如：

	callSvr("Obj1.query", {cond: "objId=1001", res:"id,name,obj1", fmt:"array"}) -> [
		{ id: 10001, name: "obj1-name1" },
		{ id: 10002, name: "obj1-name2" }
	]

这里用fmt参数指定返回array格式，因为默认返回的是`h/d`格式.

#### 子表更新与删除

主对象添加后，可以通过set接口添加/更新/删除子对象：

	Obj.set(id)(name?, @obj1...)

示例：

	callSvr("Obj.set", {id: 1001}, $.noop, {
		name: "name1",
		obj1: [
			{ id: 10001, name: "obj1-name1-changed" }, // set接口中指定子表id的，表示更新该子表行
			{ name: "obj1-name3" },  // set接口中未指定子表id的，表示新增子表行
			{ id: 10002, _delete: 1}  // set接口中指定子表id且设置了`_delete: 1`，表示删除该子表行
		]
	});

注意：主对象删除时（del/delIf接口），子对象不会自动删除。后端应根据情况自行处理。

对子表的更新有patch/put两种模式，通过submode参数指定，该参数只对主表set接口有效：

- patch: 默认模式，见上面示例。须用`_delete`指定要删除的原来子表项。
- put: 覆盖更新模式。与patch的区别是无须指定`_delete`来删除原来子表项，新子表直接覆盖原子表。

与上述示例中效果相同的操作示例：

	// submode=put模式
	callSvr("Obj.set", {id: 1001}, $.noop, {
		name: "name1",
		submode: "put", // 指定子表更新模式
		obj1: [
			{ id: 10001, name: "obj1-name1-changed" }, // set接口中指定子表id的，表示更新该子表行; 也可以不指定id，则原来记录被删除，这条会被重新添加。
			{ name: "obj1-name3" },  // set接口中未指定子表id的，表示新增子表行
			// 原表中的10002项未指定，则自动被删除。
		]
	});

注意：add接口在指定uniKey参数时，可检查数据存在则更新(即调用set接口)。因此add/batchAdd接口也可以指定submode参数。
在批量导入(batchAdd接口+uniKey参数)时，默认使用put模式做子表更新。

主对象删除时（del/delIf接口），子对象不会自动删除。后端应根据情况自行处理。

## 批请求

BQP协议支持批请求，即在一次请求中，包含多条接口调用。
而且支持向前引用，即后面的调用可以引用前面调用的返回值。
而且在创建批请求时，可以指定这些调用是否在一个事务(transaction)中，一起成功提交或失败回滚。

假如某场景需要两个请求，先获取用户信息(User.get接口)，然后上传页面名、用户编号等信息到服务器(ActionLog.add接口)供统计分析，调用示意如下：

	User.get(res="id,name,phone") -> {id, name, phone}
	ActionLog.add()(page=home, ver=android, userId={上一调用User.get返回的id}) -> logId

其中，调用二中参数userId需要引用调用一的返回结果。
如果想通过减少调用次数优化性能，可通过批请求，一次性提交两个调用，以及获得每个调用的返回值。

批请求使用接口名"batch"，通过JSON格式传递数据，请求示例如下：

	POST /api/batch
	Content-Type: application/json;charset=utf-8

	[
		{
			"ac": "User.get",
			"get": {"res": "id,name,phone"}
		},
		{
			"ac": "ActionLog.add",
			"post": {"page": "home", "ver": "android", "userId": "{$-1.id}"},
			"ref": ["userId"]
		}
	]

请求数据是一个数组，数组中每一项为一个调用，其格式为: {ac, %get?, %post?, @ref?}, 只有ac参数必须，其它均可省略。

- get: URL请求参数。
- post: POST请求参数。
- ref: 使用了batch引用的参数列表。

POST参数userId的值"{$-1.id}"表示取上一次调用值的id属性。使用向前引用的参数，必须在"ref"参数中指定。

注意：引用表达式应以"{}"包起来，"$n"中n可以为正数或负数（但不能为0），表示对第n次或前n次调用结果的引用，以下为允许的格式：

	"{$1}"  -- 第一个调用的返回值
	"{$-1}"  -- 前一个调用的返回值
	"id={$1.id}"
	"{$-1.d[0][0]}"
	"id in ({$1}, {$2})"
	"diff={$-2 - $-1}"

花括号中的内容将用计算后的结果替换。如果表达式非法，将使用"null"值替代。

batch的返回内容是多条调用返回内容组成的数组，样例如下：

	[0, [
		[ 0, {"id": 1, "name": "用户1", "phone": "13712345678"} ],  // 调用User.get的返回结果
		[ 0, 99 ]  // 调用ActionLog.add的返回结果logId
	]]

**批量请求支持事务(transaction)。** 

如果批量请求在一个事务中，则最终所有调用会一起成功提交或失败回滚。
要使用事务，只需要请求加个URL参数`useTrans=1`：

	POST /api/batch?useTrans=1

## 服务端信息反馈/X-Daca头

BQP协议规定，以下服务端信息应通过HTTP头反馈给客户端。

**[接口服务版本号与前端应用热更新]**

服务端接口的版本号如果可以获取，应发送给客户端:

	X-Daca-Server-Rev: {value}

其中value为最多6位的字符串。

前端应用程序可依据此信息实现热更新：
假如某前端H5应用（或以H5应用为内核的手机原生应用）操作期间，后端接口服务刚好升级过，应用程序再请求时，可以依据版本号变更发现升级行为，从而自动刷新到新版本。

**[测试模式和模拟模式]**

如果服务运行于测试模式或模拟模式，应设置：

	X-Daca-Test-Mode: {value}
	X-Daca-Mock-Mode: {value}

其中value为非0值，一般设置为1.

前端应用程序在发现接口服务运行在测试模式时，应予以提示。

