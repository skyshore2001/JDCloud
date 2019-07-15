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

如果要支持微信认证，需要字段：weixinKey, weixinData(1000), pic(l)

phone/pwd
: 登录用的用户名和密码。密码采用md5加密。

createTm
: DateTime. 注册日期. 可用于分析用户数增长。

weixinKey
: String. 微信的openid.

weixinData
: String. 从微信中取得的原始数据。一般为JSON格式: userInfo={openid, nickname, sex=1-男/2-女, province, city, country, headimgurl, privilege, unionid?}
 字段与User表的对应关系：User.weixinKey=openid, User.name=userInfo.nickname, User.pic=headimgurl

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

也提供传统注册：(需配置 Login::$allowManualReg = true;)

	reg()(uname/phone, pwd, name?, ...) -> 与login一致，包括_token等便于自动登录。

- 通过POST传参数。
- uname/phone: 用户名或手机号
- pwd: 登录密码
- 其它字段与User表一致即可。
- 注册后自动已登录。

### 登录

	login(uname, pwd/code) -> {id, _token, _expire, _isNew?, ...}
	
	login(token) -> (与得到该token的登录返回相同内容, 但不包括_token, _expire, _isNew字段).

该API根据当前app类型确定是用户或雇员或管理员登录（apptype分别为user, emp, admin）。支持用户名密码、用户名动态口令、token三种登录方式。

对于用户登录，如果code验证成功, 但手机号不存在, 就以该手机号自动注册用户, 密码为空（由于登录时密码不允许空，所以空密码意味着无法用密码登录）。

登录成功后返回用户信息，格式与User.get/Employee.get返回相同。

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

### 微信认证

微信认证：

	$BASE_URL/weixin/auth.php
	
	发起认证：
	auth.php(state)

	该页面同时供微信回调：
	auth.php(code, state)

- state: 认证成功后转向的页面。一般即前端当前页面(location.href)。
- 如果是发起认证，则直接重定向到微信认证的地址(即https://open.weixin.qq.com/connect/oauth2/authorize加appId,state等参数的地址)
- 如果是微信回调（这时有code参数），则获取openid, userInfo并处理微信登录成功的逻辑(`LoginImpBase::onWeixinLogin`)。

模拟发起微信认证：

	auth.php(state, mock=1)

- 必须后端启用了模拟模式才可以
- 使用固定身份模拟登录，然后转向state中的URL地址。
- 固定身份使用 Login::mockWeixinUser 配置，默认值如 {openid="test_openid", nickname="测试用户", headimgurl="...", sex=1}

前端发起微信认证示例：

	var param = {state: location.href};
	if (g_args.mock) {
		param.mock = 1;
	}
	location.href = "../weixin/auth.php?" + $.param(param);
	MUI.app_abort();

#### 本地调试微信认证

本插件结合weixin/auth.php处理微信认证。
由于必须在微信中设置过“网页授权域名”的域名才可以认证，本地调试时，必须映射到实际服务器上。

建议方法如下：比如线上URL为 http://oliveche.com/mall/m2/index.html，本地实际URL为http://localhost/p/mall/m2/index.html
调试时应把服务器 localhost 换成 oliveche.com/8081 即访问URL: http://oliveche.com/8081/p/mall/m2/index.html

配置方法：

- 配置apache: 线上/8081开头的地址用代理转到8081端口:

		ProxyPass /8081/ http://localhost:8081/
		ProxyPassReverse /8081/ http://localhost:8081/
		ProxyPass /8082/ http://localhost:8082/
		ProxyPassReverse /8082/ http://localhost:8082/
		# 可以加8081,8082等多个，以便多人分别调试
		<LocationMatch ^/80 >
		ProxyPassReverseCookiePath / /
		</LocationMatch>

- 本地映射到线上：即访问8081实际访问本地

		ssh -R 8081:localhost:80 oliveche.com

在weixin/auth.php中会自动拼接正确的redirect_uri（访问后可在trace.log中查看），如仍不正确，可临时手工修改为正确值。

### 绑定手机

微信登录的用户绑定手机号到当前登录帐号：

	bindUser(phone, code) -> {id}

- code: 手机验证码。通过genCode调用获得，也可用测试模式下的特别码080909.
- 如果手机号尚未被其他用户占用，则只要设置手机号到该微信用户即可。
- 如果手机号已被占用：
 - 当该手机号已绑定其他微信帐户时，不允许再绑定。
 - 当手机号存在且未绑定微信时：合并微信用户到手机号用户，然后将微信用户禁用（在字段User.weixinKey中设置特别标识`merged-{openId}`，使该用户失效，今后无法登录）。
  合并逻辑可通过`LoginImpBase::onBindUser(phone)`回调来扩展，如考虑合并相应的个人信息、操作记录、订单等。
- 返回用户的id。注意由于可能合并用户，id与之前登录的用户id可能不同。

### 第三方认证 / 微信小程序认证

	login2(wxCode) -> {id, ...} (与login接口一致)

- wxCode: 使用微信小程序token(在小程序中调用wx.login接口获取到)登录。后端凭此token可中微信服务器获取用户信息即登录成功。

参考：

- 小程序登录过程：https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html
- 使用code2Session接口获取openid: https://developers.weixin.qq.com/miniprogram/dev/api/code2Session.html

## 后端接口

$_SESSION:

- "uid": 用户登录后设置为用户id。
- "empId": 员工登录后设置为员工id.
- "adminId": 超级管理员登录后设置为其id.
- "code", "phone", "codetm": 用于生成验证码

## 前端应用接口

（无）
