# 登录与权限

## 概要设计

用户与员工的主数据。
登录、生成验证码、退出等。

## 数据库设计

**[密码字典]**

@Pwd: id, pwd, cnt&

以下为依赖表：

**[员工]**

@see @Employee: id, uname, phone(s), pwd, name(s), perms

phone/pwd
: 员工登录用的用户名（一般用手机号）和密码. 密码采用md5加密。

perms
: List(perm/String). 逗号分隔的权限列表，如"emp,mgr".


**[用户]**

@see @User: id, uname, phone(s), pwd, name(s), createTm

phone/pwd
: 登录用的用户名和密码。密码采用md5加密。

createTm
: DateTime. 注册日期. 可用于分析用户数增长。

## 交互接口

注意：对于注册、登录、修改密码这些操作，客户端建议使用HTTPS协议与服务端通信以确保安全。

### 生成验证码

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

### 新用户注册

用户注册与登录共享同一个API. 请参考“登录”章节。

	login(uname, code)

### 登录

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

### 用户注销

	logout(_app?)

删除session, 注销当前登录的用户。

**[应用逻辑]**

- 权限：AUTH_LOGIN

**[参数]**

_app
: String. 应用名称, 一般由客户端框架自动添加. 缺省为"user", 商户登录用"store", 管理员登录用"admin", 参考[登录类型与权限管理]章节.

### 修改密码

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

## 后端接口

$_SESSION:

- "uid": 用户登录后设置为用户id。
- "empId": 员工登录后设置为员工id.
- "adminId": 超级管理员登录后设置为其id.
- "code", "phone", "codetm": 用于生成验证码

## 前端应用接口

（无）
