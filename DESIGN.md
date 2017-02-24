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

定义用户使用本系统的主要场景。用于指导[系统建模]和[通讯协议设计]。

系统用例图.

### 系统建模

定义系统数据模型，描述基本概念。用于指导[数据库设计]。

系统类图或ER图.

## 数据库设计

根据[系统建模]设计数据库表结构。

参考[doc/后端框架]()文档的"数据库设计"部分查看定义表及字段类型的基本规则.

**[数据库信息]**

@Cinf: version, createTm, upgradeTm

产品配置信息表.

**[员工]**

@Employee: id, uname, phone(s), pwd, name(s), perms

雇员表, 登录后可用于查看和处理业务数据。

phone/pwd
: 员工登录用的用户名（一般用手机号）和密码.

perms
: List(perm/String). 权限表. 可用值: emp,mgr, 对应权限AUTH_EMP, PERM_MGR. 参考章节[权限说明].


**[用户]**

@User: id, uname, phone(s), pwd, name(s), createTm

phone/pwd
: 登录用的用户名和密码。

createTm
: DateTime. 注册日期. 可用于分析用户数增长。

**[订单]**

@Ordr: id, userId, status(2), amount, dscr(l), cmt(l)

status
: Enum. 订单状态。CR-新创建,RE-已服务,CA-已取消. 其它备用值: PA-已付款(待服务), ST-开始服务, CL-已结算.

注意:

- 使用ordr而不是order是为了避免与sql关键字order冲突

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

**[附件]**

@Attachment: id, path, orgPicId, exif(t), tm

path
: String. 文件在服务器上的相对路径, 可方便的转成绝对路径或URL

orgPicId
: Integer. 原图编号。对于缩略图片，链接到对应原始大图片的id.

exif
: String. 图片或文件的扩展信息。以JSON字符串方式保存。典型的如时间和GPS信息，比如：`{"DateTime": "2015:10:08 11:03:02", "GPSLongtitude": [121,42,7.19], "GPSLatitude": [31,14,45.8]}`

tm
: DateTime. 上传时间。


路径使用以下规则: upload/{type}/{date:YYYYMM}/{randnum}.{ext}

例如, 商家图片路径可以为 upload_store/201501/101.jpg. 用户上传的某图片路径可能为 upload/201501/102.jpg

**[API调用日志]**

@ApiLog: id, tm, addr, ua(l), app, ses, userId, ac, t&, retval&, req(t), res(t), reqsz&, ressz&, ver

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


**[密码字典]**

@Pwd: id, pwd, cnt&

**[插件相关]**

@include server/plugin/*/DESIGN.wiki

## 交互接口设计

本章根据[主要用例]定义应用客户端与服务端的交互接口。关于通讯协议基本规则，可参考文档[[doc/后端框架.html#通讯协议设计|后端框架 -> 通讯协议设计]]章节。

### 注册与登录

注意：对于注册、登录、修改密码这些操作，客户端应使用HTTPS协议与服务端通信以确保安全。参考[HTTPS服务]章节。

#### 生成验证码

	genCode(phone, type?="d6", debug?) -> {code?}

根据手机号后台生成验证码。1分钟内不允许重复发送(除非设置了debug参数)。
手机号要求11位数字.

**[应用逻辑]**

- 权限：AUTH_GUEST

**[参数]**

type
: String. 验证码类型, 如"d6"表示6位数字，"w4"表示4位字符(不含数字)

debug
: Boolean. 仅用于调试目的（仅测试模式有效），如果非0，则返回生成的code，否则本调用无返回内容。

**[返回]**

code
: 验证码。仅当参数debug=1时返回。

**[示例]**

请求

	genCode(phone=13712345678)

成功时无返回内容。

请求

	genCode(phone=13712345678, debug=1)

返回

	{code: 123456}

#### 新用户注册

用户注册与登录共享同一个API. 请参考“登录”章节。

	login(uname, code)

#### 登录

	login(uname, pwd/code, wantAll?) -> {id, _token, _expire, _isNew?}
	
	login(token, wantAll?) -> (与得到该token的登录返回相同内容, 但不包括_token, _expire, _isNew字段).

该API根据当前app类型确定是用户或雇员或管理员登录（apptype分别为user, emp, admin）。支持用户名密码、用户名动态口令、token三种登录方式。

对于用户登录，如果code验证成功, 但手机号不存在, 就以该手机号自动注册用户, 密码为空（由于登录时密码不允许空，所以空密码意味着无法用密码登录）。

**[应用逻辑]**

- 权限：AUTH_GUEST

客户端登录页建议逻辑如下:

- 先用API `User.get`查看是否已登录，是则直接进入主页；否则如果有token，则尝试用`login(token)`登录。
- 如果登录失败，则显示登录界面：默认为手机号/动态密码登录，可切换为用户名、密码登录。
- 登录或注册成功后, 可记录返回的token到本地, 下次系统使用login(token)实现自动登录.
- 如果是新注册用户，可显示设置信息页（设置昵称、密码等），分别调用`User.set`或`chpwd(oldpwd=_none,pwd)`, 注意：pwd字段在新注册后1小时内可免认证修改。
- 用户在选择注销/退出后, 客户端应清除之前记录的token.

后端逻辑：
- 超级管理端登录时，应检查环境变量 P_ADMIN_CRED, 格式为"{user}:{pwd}"，如果设置，则必须以指定用户名、密码登录。如果未设置，则不允许登录。

**[参数]**

uname
: String. 可以为用户手机号（11位数字）或用户名（字母开头）

code
: String. 动态验证码.

pwd
: String. 登录密码. 支持明文密码或md5后的密码.

wantAll
: Boolean. 如果为1，则返回登录对象的详细内容，格式与User.get/Employee.get返回相同。

**[返回]**

id
: Integer. 用户编号

_isNew
: Boolean. 如果是新注册时则返回该字段为1（客户端可用于判断是否弹出设置初始信息页面）. 

其它User表字段。

为支持自动重登录, 以上除login(token)外所有login接口都返回以下字段:

_token
: String. 用于通过login(token)登录.

_expire
: Integer. 过期时间, 以秒数表示.

**[示例]**

用户登录

	login(uname=13012345678, pwd=1234)

管理员登录

	login(uname=liang, pwd=liang123, _app=admin)

#### 用户注销

	logout(_app?)

删除session, 注销当前登录的用户。

**[应用逻辑]**

- 权限：AUTH_LOGIN

**[参数]**

_app
: String. 应用名称, 一般由客户端框架自动添加. 缺省为"user", 商户登录用"store", 管理员登录用"admin", 参考[登录类型与权限管理]章节.

#### 修改密码

	chpwd(oldpwd|code?, pwd, _app?) -> {_token, _expire}

服务端需要先验证当前密码(oldpwd)或动态验证码正确, 然后才能修改为新密码; 

仅当新注册时1小时内，可以免认证直接修改密码。

建议使用HTTPS通讯以保证安全.

**[应用逻辑]**

- 权限：AUTH_USER | AUTH_EMP

**[参数]**

oldpwd
: String. 旧密码. 特殊值"_none"表示不检查oldpwd而直接设置密码，这仅可用于新用户注册一小时内。

code
: String. 之前先由gencode生成动态验证码, 需验证code通过方可允许修改为新密码; 或者使用特别码"080909"跳过对验证码检查.

_app
: String. 应用名称. 一般由客户端框架自动添加. 缺省为"user", 商户登录用"store", 管理员登录用"admin", 参考[登录类型与权限管理]章节.

**[返回]**

_token/_expire
: String/Integer. 用于自动登录的token. 参考"login"调用。

**[示例]**

请求

	chpwd(oldpwd=1234, pwd=12345678)
	
	或
	
	chpwd(code=533114, pwd=12345678)
	(之前生成了动态验证码为533114)

#### 用户信息修改

	User.set([id])(fields...)

字段fields请参考"User"表定义. 原理请参考"通用表操作"章节。

应用逻辑：
- 用户id可缺省，一般不用赋值
- 以下字段不允许修改：phone, pwd
- 不允许User.add/del操作

**[应用逻辑]**

- AUTH_USER

**[示例]**

上传一个头像并设置到该用户：

	upload(type=user, genThumb=1)(content of picture)
	(得到thumbId)
	
	User.set()(pidId={thumbId})


更新用户手机号：

	User.set()(phone=18912345678)


### 客户端

app类型为"user".

#### 订单管理

使用Ordr.add/set/query/get方法添加、修改、查询和查看订单。
不允许删除订单（可以取消）。

注: 订单状态定义请在本文档内搜索OrderStatus.

##### 添加订单


	Ordr.add()(Ordr表字段) -> id


应用逻辑：

- 权限: AUTH_USER
- 添加订单后, 订单状态为"CR"; 且在OrderLog中添加一条创建记录(action=CR)

**[参数]**

**[返回]**

操作成功时返回新添加的订单id.

**[示例]**

##### 查看订单


	Ordr.query() -> tbl(id, status, ...)
	Ordr.get(id) -> {id, status, ..., @orderLog, @atts}


用`Ordr.query`取用户所有订单概要;
用`Ordr.get`取订单主表字段及其相关子表. 

**[应用逻辑]**

- AUTH_USER

**[参数]**

id
: Integer. 订单编号


**[返回]**

主表返回字段请查询表定义"@Ordr"。

@orderLog
: Array(OrderLog). 日志子表, 包含订单创建时间等内容, 字段详细请查询表定义"@OrderLog".

@atts
: Array(Att). 订单关联图片的子表. 字段为 {id, attId}. 根据attId取图片.


### 员工端/后台管理端

本节API需要员工登录权限。
app类型为"emp".

#### 员工管理

	Employee.get(id?)
	Employee.set(id?)(POST fields)

如果不指定id, 则操作当前登录的员工.
如果指定id:

- 如果是 AUTH_EMP 权限, 则id必须与当前登录的empId一致(否则应报错);
- 如果是 PERM_MGR 权限, 则不限id.

	Employee.query()

- AUTH_EMP权限只能获取当前登录的员工; 
- PERM_MGR权限可获取所有的员工; 

	Employee.add()(POST fields)
	Employee.del(id?)

- 仅PERM_MGR权限可用.
- 当Employee被其它对象（如Ordr）引用时，不允许删除，只能做禁用等其它处理。

#### 订单管理

查看订单

	Ordr.query() -> tbl(id, status, 参考Ordr表字段...)
	Ordr.get(id) -> { 同query字段 }

完成订单或取消订单

	Ordr.set(id)(status=RE)
	Ordr.set(id)(status=CA)


- 订单状态必须为"CR"才能完成或取消.
- 应生成相应订单日志(OrderLog).

**[应用逻辑]**

- AUTH_EMP

### 超级管理端

本节API需要超级管理员权限.

app类型为adm.

## 前端应用接口

定义应用入口及调用参数。每一个应用均应明确定义一个惟一的app代码。

### 移动客户端(app=user)

	m2/index.html

用户登录, 可以创建和查看订单等.

### 管理端(app=store)

	web/store.html

员工登录, 可以查看和管理订单等.

### 超级管理端(app=admin)

	web/adm.html

使用超级管理员帐号登录.

# 专题设计

## 运营统计

