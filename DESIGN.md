# 筋斗云产品设计

本文档分 **主体设计** 与 **专题设计** 两大部分.
每块设计一般包括以下部分:

概要设计
: 简述需求, 定义概念/术语, 简述实现方式.

数据库设计
: 定义数据库表及字段

交互接口
: 定义前端访问后端的API接口

前端应用接口
: 定义前端应用接口或应用内的页面.


参考文档：

- [后端框架：关于数据库设计、通讯协议设计、测试设计的惯例](doc/后端框架.html)
- [技术文档目录](doc/index.html)

## 概要设计

### 主要用例

定义用户使用本系统的主要场景。用于指导[系统建模]和[交互接口设计]。

系统用例图.
![](doc/pic/usecase.png)

### 系统建模

定义系统数据模型，描述基本概念。用于指导[数据库设计]。

系统类图或ER图.
![](doc/pic/datamodel.png)

## 数据库设计

根据[系统建模]设计数据库表结构。

参考[后端框架-数据库设计](doc/后端框架.html#数据库设计)查看定义表及字段类型的基本规则.

**[数据库信息]**

@Cinf: version, createTm, upgradeTm

产品配置信息表.

**[员工]**

@Employee: id, uname, phone(s), pwd, name(s), perms

雇员表, 登录后可用于查看和处理业务数据。

phone/pwd
: String. 员工登录用的用户名（一般用手机号）和密码. 密码采用md5加密。

perms
: List(perm/String). 逗号分隔的权限列表，如"emp,mgr". 可用值: emp,mgr, 对应权限AUTH_EMP, PERM_MGR。

**[用户]**

@User: id, uname, phone(s), pwd, name(s), createTm

phone/pwd
: 登录用的用户名和密码。密码采用md5加密。

createTm
: DateTime. 注册日期. 可用于分析用户数增长。

**[订单]**

@Ordr: id, userId, createTm, status(2), amount, dscr(l), cmt(l)

status
: Enum. 订单状态。CR-新创建,RE-已服务,CA-已取消. 其它备用值: PA-已付款(待服务), ST-开始服务, CL-已结算.

注意:

- 使用ordr而不是order是为了避免与sql关键字order冲突

@Item: id, name, price
@OrderItem: id, orderId, itemId, itemName, price, qty, amount

**[订单日志]**

@OrderLog: id, orderId, action, tm, dscr, empId

例如：某时创建订单，某时付款等。

action
: 参考Action定义:

		CR:: Create (订单创建，待付款)
		PA:: Pay (付款，待服务)
		RE:: Receive (服务完成, 待评价)
		CA:: Cancel (取消订单)
		RA:: Rate (评价)
		ST:: StartOrder (开始服务)
		CT:: ChangeOrderTime (修改预约时间)
		AS:: Assign (分派订单给员工)
		AC:: Accept (员工接单)
		CL:: Close (订单结算)

empId
: 操作该订单的员工号

**[订单-图片关联]**

@OrderAtt: id, orderId, attId

**[API调用日志]**

@ApiLog: id, tm, addr, ua(l), app, ses, userId, ac, t&, retval&, req(t), res(t), reqsz&, ressz&, ver, serverRev(10)

app
: "user"|"emp"|"store"...

ua
: userAgent

ses
: the php session id.

t
: 执行时间(单位：ms)

ver
: 客户端版本。格式为："web"表示通用网页(通过ua可查看明细浏览器)，"wx/{ver}"表示微信版本如"wx/6.2.5", "a/{ver}"表示安卓客户端及版本如"a/1", "ios/{ver}"表示苹果客户端版本如"ios/15".

@ApiLog1: id, apiLogId, ac, t&, retval&, req(t), res(t)

batch操作的明细表。

**[操作日志]**

@ObjLog: id, obj, objId, dscr, apiLogId, apiLog1Id

**[插件相关]**

@include server\plugin\login\DESIGN.md
@include server\plugin\upload\DESIGN.md

## 交互接口设计

本章根据[主要用例]定义应用客户端与服务端的交互接口。关于通讯协议基本规则，可参考[后端框架-通讯协议设计](doc/后端框架.html#通讯协议设计)。

### 客户端

app类型为"user".

#### 用户信息修改

	User.set()(name, ...)

- 权限: AUTH_USER
- 可修改字段参考User表。注意不可修改字段: uname, phone, pwd, createTm.

**[示例]**

上传一个头像并设置到该用户：

	upload(type=user, genThumb=1)(content of picture)
	(得到thumbId)
	
	User.set()(pidId={thumbId})

#### 订单管理

	添加订单
	Ordr.add()(Ordr表字段) -> id

	查看订单
	Ordr.query/get() -> tbl(id, status, ..., @orderLog?)

- 权限: AUTH_USER
- 添加订单后, 订单状态为"CR"; 且在OrderLog中添加一条创建记录(action=CR)
- 不允许删除订单（可以取消）。

id
: Integer. 订单编号

@orderLog
: [{id, action, dscr, ...}]. 日志子表, 详见表定义"@OrderLog".

### 员工端/后台管理端

本节API需要员工登录权限。
app类型为"emp".

#### 员工管理

	Employee.query()
	Employee.get(id?)
	Employee.set(id?)(POST fields)

- 权限: AUTH_EMP
- get/set操作如果不指定id, 则操作当前登录的员工。仅当具有 PERM_MGR 权限时, 可任意指定id.
- query操作：如果没有PERM_MGR权限只能获取当前登录的员工，否则可获取所有的员工。

以下仅当PERM_MGR权限可用：

	Employee.add()(POST fields)
	Employee.del(id?)

- 当Employee被其它对象（如Ordr）引用时，不允许删除，只能做禁用等其它处理。

#### 订单管理

查看订单

	Ordr.query() -> tbl(id, status, ..., @orderLog?)
	Ordr.get(id) -> { 同上字段 }

完成订单或取消订单

	Ordr.set(id)(status=RE)
	Ordr.set(id)(status=CA)

- 权限：AUTH_EMP
- 订单状态必须为"CR"才能完成或取消.
- 更新操作应生成相应订单日志(OrderLog).

### 超级管理端

本节API需要超级管理员权限.

app类型为"admin".

## 前端应用接口

定义应用入口及调用参数。每一个应用均应明确定义一个惟一的app代码。

### 移动客户端(app=user)

	m2/index.html

用户登录, 可以创建和查看订单等.

### 管理端(app=emp-adm)

	web/store.html

员工登录, 可以查看和管理订单等.

### 超级管理端(app=admin)

	web/adm.html

使用超级管理员帐号登录.

# 专题设计

## 用户登录

参考插件login
@include server\plugin\login\DESIGN.md

## 附件与上传

参考插件upload
@include server\plugin\upload\DESIGN.md

## 运营统计

## 带子表的对象操作

在添加或更新对象时，对子项采用PATCH机制，即不必传所有行子项，如果在子项中指定了id，则做更新子项操作（特别地，如果id是负数，表示删除-id这个子项），否则做追加子项操作。

假设有如下表定义：

	订单：
	@Ordr: id, dscr, amount

	订单明细
	@OrderItem: id, orderId, itemId, itemName, price, qty, amount

接口设计示例：

	Ordr.add()(..., items={itemId, price?, qty?=1})

	Ordr.set()(..., items={id?, itemId?, price?, qty?})

	Ordr.get(id)(..., items={id, itemId, price, qty, itemName, amount})

可同时开放子项接口：

	OrderItem.add()(orderId, itemId, price, qty?)
	OrderItem.set()(itemId?, price?, qty?)
	OrderItem.del(id)
	OrderItem.query(cond="orderId={orderId}")

- 注意：add/set接口中，子项只能设置itemId, qty, price字段，不允许设置itemName, amount等计算字段或关联字段，这两个字段和主表的amount字段应由服务端自动补全。
- 如果未指定price或itemName，则自动根据itemId从item信息中查找补全。

调用接口示例，先添加订单：

	callSvr("Ordr.add", $.noop, {dscr: 'order 1', items: [ {itemId:1, price:200}, {itemId:2, price:100, qty:3} ] })

购买了两个子项：

	"item 1" x 1
	"item 2" x 3

获取一下子项：

	callSvr("Ordr.get", {res:"items"});

返回示例:

	{id: 1, items: [
		{id: 100, itemId:1, orderId:1, price:200, qty:1, itemName:"item 1", amount:200},
		{id: 101, itemId:2, orderId:1, price:100, qty:3, itemName:"item 2", amount:300}
	]}

更新一项，又追加一项：

	callSvr("Ordr.set", {id:1}, $.noop, {items: [ {id:100, qty:2}, {itemId:2, qty:2.5} ] })
	或
	callSvr("OrderItem.set", {id:100}, $.noop, {qty:2});
	callSvr("OrderItem.add", $.noop, {orderId:1, itemId:2, qty:2.5} ] })

现在子项为：

	"item 1" x 2
	"item 2" x 3
	"item 2" x 2.5

注意：由于第二项未传id，服务端做追加处理。

要删除第二项：

	callSvr("Ordr.set", $.noop, { items: [ {id:-101} ] })
	或
	callSvr("OrderItem.del", {id: 101})

现在子项为：

	"item 1" x 2
	"item 2" x 2.5

TODO 问题：

- 在添加或修改子项时，如何计算主表金额并更新？似乎不应暴露子项出去。!不暴露子项时，调用默认的AccessControl来更新？
- 客户端如何请求服务端做计算

### 服务端实现

	class AC2_Ordr extends AccessControl {
		protected $subobj = [
			"items" => ["obj"=>"OrderItem", "cond"=>"t0.orderId=this.id"]
		]

- 注意：add/set接口中，子项只能设置itemId, qty, price字段，不允许设置itemName, amount等计算字段或关联字段，这两个字段和主表的amount字段应由服务端自动补全。
- 如果未指定price或itemName，则自动根据itemId从item信息中查找补全。

		protected function onValidate() {
			$_POST["amount"] = 0;
			$this->handleSubObj($_POST);
		}
	}

	class AC2_OrderItem extends AccessControl {
		protected $readonlyFields = ["amount"];
		protected function onValidate(&$order) {
			$items = &$_POST;
			if ($this->ac == "add") {
				$items["amount"] = $items["price"] * $items["qty"];
				$order["amount"] += $items["amount"];
			}
			else { // "set"
				if (issetval("price", $item) || issetval("qty")) {
				}
				$items["amount"] = $items["price"] * $items["qty"];
				$order["amount"] += $items["amount"];
			}
		}
	}

### 前端子表处理

删除：标记此行数据的delete=1
修改：标记此行数据的edit=1
最终只提交edit和delete标志的行。

后端提供calc接口用于计算或验算。一般前端使用calc计算相关字段。
在添加或更新时，前端应传入金额等字段，后端不做验证。但在添加或更新后，后端可取出数据并调用calc验证前端计算是否正确。

	id = callSvrSync("Ordr.add", {doCalc:1}, $.noop, {items:[{itemId:1}, {itemId:2, qty:2}]}, {contentType:"application/json"});

	item1 = callSvrSync("Ordr.completeItem", $.noop, {itemId:1})
	item2 = callSvrSync("Ordr.completeItem", $.noop, {itemId:2, qty:2})
	ordr = callSvrSync("Ordr.calc", $.noop, {items:[ item1, item2 ]}, {contentType:"application/json"});
	id = callSvrSync("Ordr.add", $.noop, ordr, {contentType:"application/json"});

	// TODO:
	MUI.useBatchCall();
	callSvr("Ordr.completeItem", $.noop, {itemId:1})
	callSvr("Ordr.completeItem", $.noop, {itemId:2, qty:2})
	callSvr("Ordr.calc", $.noop, {items:["{$1}", "{$2}"]}, {contentType:"application/json", ref:["items"] });
	callSvr("Ordr.add", $.noop, "{$3}", {contentType:"application/json"});

	callSvr("Ordr.get", {id: id, res:"*,items"})
	callSvr("Ordr.get", {id: id, res:"*,items", res_items:"id,itemName,amount 金额"})

	callSvr("Ordr.set", {id: id}, $.noop, {items:[{id:11, itemName: "item-1"}]} , {contentType:"application/json"})

	(如果要修改qty, price这些，必先调用calc计算后再提交)
	callSvr("Ordr.set", {id: id}, $.noop, {items:[{id:11, qty: 3}], amount:1200} , {contentType:"application/json"})

	删除一项：
	callSvr("Ordr.set", {id: id}, $.noop, {items:[{id:11, _delete:1}], amount:600} , {contentType:"application/json"})

	添加一项：
	callSvr("Ordr.set", {id: id}, $.noop, {items:[{itemId:1, qty:2, price:50, amount:100}], amount:700} , {contentType:"application/json"})

