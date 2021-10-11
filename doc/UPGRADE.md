## 升级到v6.0

### 去全局化，支持swoole

与swoole环境相区别，在apache下运行则称为经典环境。

增加JDEnv类（替代原先ApiApp），部分全局变量和全局函数移入JDEnv内；
增加JDApiBase类作为AccessControl的基类，用于简单的函数型接口，不具备任何内置接口。

- 移除类：AppBase,ApiApp
- 移除函数：setRet,errQuit,apiMain(callSvc替代),getAppType(env->appType替代), setParam($env->get/post替代), getAppType()
- 移除全局变量: $X_RET, $errorFn, $noExecApi, 以下全局变量移到JDEnv内：
	- $g_dbgInfo, $DBH, $APP
	- $TEST_MODE, $MOCK_MODE, $DBG_LEVEL;
- 函数接口变化：callSvc（重构后简化）。getHttpInput(增加env参数), getContentType(增加env参数), setServerRev(增加env参数)
- 用jdRet替代MyException和DirectReturn类。

#### 不兼容，需要修改

原先：

	global $DBH, $APP, $TEST_MODE;
	$appType = getAppType();

改为：

	$env = getJDEnv(); // 一般会有传入$env参数、或有$this->env，都没有时可以用getJDEnv()，经典环境下它就是原全局变量$GLOBALS["X_APP"]。
	// $DBH = $env->DBH; // 只是取变量，可能为空
	$DBH = $env->dbconn(); // 打开连接，如果已有连接，则直接重用
	$TEST_MODE = $env->TEST_MODE;
	$APP = $env->appName;
	$appType = $env->appType;

注意：直接$X_APP的用法仍兼容，但已不建议使用。

#### 兼容经典环境，建议修改

原先：

	global $X_APP;
	$X_APP->onAfterActions[] = ...;

	throw new MyException(code, data, msg);
	throw new DirectReturn();

建议改为：

	$env = getJDEnv();
	$env->onAfterActions[] = ...; // 经典环境下$env就是$GLOBALS["X_APP"]

	jdRet(code, data, msg);
	jdRet();

#### 兼容经典环境，可不修改

v6的去全局化可支持在swoole环境下执行。在swoole环境下须按下面方法修改。
经典环境的应用代码可以不修改，但框架代码须使用新形式。

对取参、数据库函数的处理：

	$a = param("a");
	$rv = queryOne("SELECT ...");
	$rv2 = callSvcInt("Xxx.query");

更新为：

	$a = $env->param("a"); // 类似还有mparam等
	$rv = $env->queryOne("SELECT ..."); // 类似还有queryAll, dbInsert, dbUpdate, execOne, dbCommit等数据库函数
	$rv2 = $env->callSvcInt("Xxx.query");

对$_POST, $_GET, $_SESSION等超全局变量的处理（注意_REQUEST不再使用），直接改成$this->_POST, $this->_GET, $this->_SESSION：

	$_POST["a"] = $a;
	$b = $_POST["b"];

	unset($_POST["b"]);

	$arr = $_POST;
	$_POST = $arr;

更新为：

	$env->_POST["a"] = $a; // 赋值
	$b = $env->_POST["b"]; // 取值

	unset($env->_POST["b"]); // 删除元素

	$arr = $env->_POST; // 取数组
	$env->_POST = $arr; // 重设数组

对$_SERVER是只读的，通过同名函数来取：

	$a = $_SERVER["a"];
	->
	$a = $env->_SERVER("a");

对HTTP头的读写：

	$a = $_SERVER["HTTP_MY_HEADER"]; // 读request头; 以前自定义的请求头都是以"HTTP_{名称}"的形式存储在$_SERVER中。
	header("My-Header: My-Value"); // 写response头

更新为：

	$a = $this->_SERVER("HTTP_MY_HEADER"); 读request头
	或
	$a = $this->header("My-Header"); // 名字不区分大小写
	$this->header("My-Header", "My-Value"); // 写response头，注意key, value分开了
	$requestHeaderArr = $this->header(); // 取所有request头

函数型函数增加`$env`参数：

	function api_fn1($env) {  // 全局函数增加$env参数
		$a = $env->param("a");
		...
	}

对象型接口增加了$env成员变量，且以新增的JDApiBase类作为基类（它也是AccessControl的基类），如果不是典型CRUD的对象接口，只要继承JDApiBase即可。
JDApiBase和AccessControl的子类通过`$this-env`取到`$env`参数：

	class AC_Xxx extends JDApiBase {
		function api_fn1() { // 和之前一样，并没有增加$env参数
			$env = $this->env;  // JDApiBase或AccessControl类自带$this->env
			$a = $env->param("a");
			...
		}
	}

输出结果：

	echo($str);

应改为:

	$env->write($str);

## 升级到v5.5

### 前端批量处理函数原型更新batchOp

batchOp接口更新了, 原代码:

	var forceFlag = 1; // 如果没有多选，则按当前过滤条件全部更新。
	WUI.batchOp("Task", "setIf", jtbl, onGetData, function () {
		WUI.closeDlg(jdlg);
	}, forceFlag);

应改为:

	WUI.batchOp("Task", "Task.setIf", jtbl, {
		acName: "更新",
		batchOpMode: 1,  // 如果没有多选，则按当前过滤条件全部更新。
		data: onGetData,
		onBatchDone: function () {
			WUI.closeDlg(jdlg);
		}
	});

- ac参数变化, 现在应写完整的接口名.
- jtbl后面的参数以opt方式提供
- 建议提供acName选项, 表示操作名

### 后端允许返回null

此前，后端未返回值的接口，服务器会自动让它返回"OK"，且前端遇到调用返回null时，callSvr类函数会自动忽略处理不去回调。

v5.5起此功能被废弃，后端默认不会返回"OK"，前端也不会对返回null做特殊忽略处理。

如果后端希望控制前端不做处理，可以使用`E_ABORT`(即-100)返回值替代null：

	throw new MyException(E_ABORT);

## 升级到v5.4

### 报错：操作对象不存在或无权限修改

对set/del接口操作时，增加了调用onQuery回调，来检查当前用户是否可以query出指定id，以此来证明有权限修改此id。
这个特性会导致误调用onQuery接口，导致set/del接口失败。

示例：

	protected function onQuery() {
		$type = mparam("type");	
		$this->addCond("type=" . Q($type));
	}

分析：执行set/del接口时，走到上述地方将因没有传type参数而报错。
显示这段逻辑是为query接口写的，不应用于set/del。

解决方案：

	protected function onQuery() {
		if ($this->ac == "query") {
			$type = mparam("type");	
			$this->addCond("type=" . Q($type));
		}
	}
	或
	protected function onQuery() {
		if ($this->ac != "query")
			return;
		$type = mparam("type");	
		$this->addCond("type=" . Q($type));
	}

### 设置只读属性报错

v5.4之前设置只读属性(以readonlyFields或readonlyFields2定义的属性数组），只写警告日志，不报错。
v5.4起将报错，一般应调用客户端接口调用。也可简单设置useStrictReadonly字段兼容旧版本：

	class AC0_User extends AccessControl
	{
		protected $useStrictReadonly = false; // 默认为true，改为false则不报错。
	}

### 权限存储格式变化影响onGetPerms

$_SESSION["perms"]由保存权限数组改为保存字符串（与Employee.perms字段一致），扩展权限设置的代码应做调整，使用新的inSet函数：
原代码：api.php中

	function onGetPerms()
	{
		$p = @$_SESSION["perms"];
		...
			if (array_search("mgr", $p) !== false)
				$perms |= PERM_MGR;
	}

改为：

	function onGetPerms()
	{
		$p = @$_SESSION["perms"];
		...
			if (inSet("mgr", $p))
				$perms |= PERM_MGR;
	}

### 管理端列表页表头固定

建议在pageXX中将表格的高度设置100%，以便表头和工具栏固定在表格上方。以及在dlgXX中使用默认的padding，不必自定义。
为了平滑升级旧页面(pageXX)，对于页面中只有一个datagrid的情况，不用做任何修改，自动纵向铺满显示，使工具栏置顶。

也可以运行下面的命令来修改各页面：

	cd web/page
	sed -i '1s/padding:.[^;]\+;//' dlg*.html
	sed -i '2s/height:auto/height:100%/' page*.html

### 服务端addCond

以下接口的第三个参数$fixUserQuery缺省值由false改成了true:

	AccessControl.addCond($cond, $prepend=false, $fixUserQuery=true)

即默认在后端代码中调用`$this->addCond("status='发布中')`这样的代码时，会与前端传来的cond字段一样处理。
升级后，如果遇到cond为复杂查询（用了函数、子查询等）的情况则不支持并出错，这时须显式设置fixUserQuery参数=false即可解决。

## 升级到v5.3

### 废弃searchField

取消了app.js中的searchField方法。该方法用于在对话框上按某字段查询，如：

	<td>用户联系方式</td>
	<td>
		<input name="userPhone" style="width:50%" class="easyui-validatebox" data-options="validType:'usercode'">
		<input class="forSet" type=button onClick="searchField(this, {userPhone: this.form.userPhone.value});" value="查询该手机所有订单">
	</td>

v5.3开始可直接三击字段标题来查询，所以可以不需要加查询按钮了。如果要保留原按钮，可以在onClick中用WUI.doFind替代：

	onClick="WUI.doFind($(this).closest('td'));"

### 加密算法myEncrypt改为jdEncrypt

新的内容应使用jdEncrypt函数加解密，两者算法一致但参数有差异。
升级后，旧版本使用myEncrypt函数加密的内容将无法用jdEncrypt解密。

例如，此前生成登录token使用了myEncrypt密码，为了使用户仍可以自动登录，login plugin在解密时做了以下兼容处理：
原代码：

	$data = @unserialize(myEncrypt($token, "D"));
	if ($data === false)
		throw new MyException(E_AUTHFAIL, "Bad login token!");

新代码：

	$data = @unserialize(jdEncrypt($token, "D"));
	if ($data === false) {
		$data = @unserialize(myEncrypt($token, "D"));
		if ($data === false)
			throw new MyException(E_AUTHFAIL, "Bad login token!");
	}

## 升级到v5.2

### 管理端app.js重构到jdcloud-wui-ext.js，增加upload和checkList组件

app.js中很多内容移动至lib/jdcloud-wui-ext.js库中. 在主HTML文件中应添加:

	<script src="lib/jdcloud-wui-ext.js"></script>

对象详情对话框上的upload组件和checkList被组件化.

#### 对话框上的upload组件

原HTML代码:

	<tr>
		<td>门店照片</td>
		<td id="divStorePics">
			<input name="pics" style="display:none">
			<div class="imgs"></div>
			<input type="file" accept="image/*" multiple onchange="onChooseFile.apply(this)">
			<p>（图片上点右键，可以删除图片等操作）</p>
		</td>
	</tr>

应修改为:

	<tr>
		<td>门店照片</td>
		<td class="wui-upload">
			<input name="pics">
		</td>
	</tr>

各属性或选项统一通过data-options属性来指定，如：

- 之前单选通过input[type=file]组件的不设置multiple属性来指定，现在应使用`<div class="wui-upload" data-options="multiple:false">`
- 之前的`<div wui-nopic wui-nothumb>`设置，现在使用 `<div class="wui-upload" data-options="pic:false, nothumb:true">`
- 之前菜单项由专门的HTML和JS指定，现在使用`data-options="menu:{...}"`来指定。

无须额外的JS代码来控制加载、保存和菜单, 删除原先这些JS代码:

	jdlg.on("show", function (ev, data) {
		// 加载图片
		hiddenToImg(jfrm.find("#divStorePics"));
		hiddenToImg(jfrm.find("#divStorePicId"));
	})
	.on("validate", function (ev) {
		// 保存图片
		imgToHidden(jfrm.find("#divStorePics"));
		imgToHidden(jfrm.find("#divStorePicId"));
	});

以及删除相关的右键菜单控制代码以及相关的HTML：

	// 设置右键菜单，比如删除图片
	var curImg;
	jmenu.menu({
		onClick: function (item) {
			...
		}
	});
	jdlg.on("contextmenu", "img", function (ev) {
		...
	});

关于自定义菜单的用法，参考.wui-upload文档。

#### 对话框上的checkList组件

原HTML代码：

	<td id="divPerms">
		<input type="hidden" name="perms">
		<label><input type="checkbox" value="item">上架商品管理</label><br>
		<label><input type="checkbox" value="emp" checked>员工:查看,操作订单(默认)</label><br>
		<label><input type="checkbox" value="mgr">商户管理</label><br>
	</td>

改为：

	<td class="wui-checkList">
		...
	</td>

原JS代码直接删除即可：

	jdlg.on("show", function (ev, data) {
		// 显示时perms字段自动存在hidden对象中，通过调用 hiddenToCheckbox将相应的checkbox选中
		hiddenToCheckbox(jfrm.find("#divPerms"));
	})
	.on("validate", function (ev) {
		// 保存时收集checkbox选中的内容，存储到hidden对象中。
		checkboxToHidden(jfrm.find("#divPerms"));
	});

### 管理端对话框样式调整

对话框上的table会自动占满对话框, 且设置了不换行, 有可能造成样式混乱, 主要有两种情况:

如果某个td内容过长导致table被撑开, 需要在该td的样式上设置:

	white-space: normal;

如果某个td内一行既有input又有其它组件, 由于input被自动设置为宽度95%, 其它组件被挤的很小.
这时可重设每个组件的width, 如分别为70%, 25%.

	width: 70%;

### 移动端样式调整

app.css中有关对话框(muiAlert)、组件upload-pic、weui定制等内容移到mui.css中。
只留下 1. 主题色调、全局字体定义 2. 图标大小定义（如顶栏、底栏、列表项图标）。

在升级时，应先重写上述两部分，然后将其它样式放在app.css后面。

### jdcloud-uploadpic组件

对于图片预览、压缩、上传功能，原UploadPic.js与lrz库组合不再使用，换成jdcloud-uploadpic组件（以及框架自带的compressImg函数，用于替代lrz库）。

OLD: 新版自动查找"uploadpic"类
	var uploadPic = new UploadPic(jpage.find(".uploadpic"));
NEW:
	var uploadPic = new MUI.UploadPic(jpage);

OLD: 新版废弃refresh
	uploadPic.empty().refresh();
NEW:
	uploadPic.empty();

OLD: 新版submit后面参数变化
	uploadPic.submit(function(certPics, pics) {
	});
NEW:
	uploadPic.submit().then(function (certPics, pics) {
	});

OLD: 再次初始化
	jo.attr("data-attr", "10,13,15");
	uploadPic.initAtts();
NEW:
	jo.attr("data-attr", "10,13,15");
	uploadPic.reset();

OLD: 检查图片数目
	if (jpage.find('.uploadpic.swiperpic_zz .uploadpic-item.uploadpic-item-selected').length == 0)...
NEW:
	if (uploadPic.filter('.swiperpic_zz').countPic() == 0) ...


### 要求开启php_mbstring模块

	yum install php-mbstring

php-for-windows版本请检查php.ini中开启了该模块：

	extension=php_mbstring.dll

### dbInsert/dbUpdate中支持SQL表达式的写法调整

原写法：

	dbInsert("MyLog", [ "tm"=>"=NOW()" ]);
	dbUpdate("MyLog", [ "tm"=>"=NOW()" ], 1001);

新写法：

	dbInsert("MyLog", [ "tm"=>dbExpr("NOW()") ]);
	dbUpdate("MyLog", [ "tm"=>dbExpr("NOW()") ], 1001);

这是为了避免用户输入等号造成错误处理。

## 升级到v5.1

### WeUI库升级到1.x

- 类名命令变化：

		weui_cells -> weui-cells
		weui_cell_bd -> weui-cell__bd
		weui_btn_primary -> weui-btn_primary

- 撑满cell: 此前用weui_cell_primary，现在用weui-cell__bd, 一般不需要weui-cell_primary.
- 带箭头的列表，由之前的weui_cells_access改为单独控制的weui-cell_access

参考：http://www.phpos.net/weixinkaifa/weui/700.html

## 升级到v5.0

### 顶部图标按钮的表示不兼容

原先的写法是：

	<div class="hd">
		<a href="javascript:hd_back();" class="icon icon-back"></a>
		<a href="javascript:;" class="icon icon-menu" id="btnSearch"</i></a>
		<h2>百家姓</h2>
	</div>

现在改为：

	<div class="hd">
		<a href="javascript:hd_back();" class="btn-icon"><i class="icon icon-back"></i></a>
		<a href="javascript:;" class="btn-icon" id="btnSearch"><i class="icon icon-menu"></i></a>
		<h2>百家姓</h2>
	</div>

新的写法确保按钮热区更大，更容易点到，尤其在苹果手机上。

### 原生应用框架Corodva由5.4版本升级到7.1

server目录下的cordova及cordova-ios目录为原生接口。
如果决定暂不升级原生程序，请确保：

- 更新代码时不要更新这两个目录下的文件，否则可能造成原生功能无法调用。

- 如果在IOS上顶部状态栏与应用重合，可在初始化时加上如下兼容性代码（假设应用当前URL参数cordova=1）：

		if (window.g_cordova && g_cordova < 2) {
			// 如果今后APP升级，这里应改为强制升级提示。
			if (MUI.isIOS()) {
				MUI.container.css("margin-top", "20px");
			}
		}

关于升级原生程序：

应增加URL参数中cordova参数代表的版本，如`http://myserver/myapp/m2/index.html?cordova=2`。并要求老版本强制升级。
然后用cordova 7.1的jdcloud-app模板重建应用程序。

注意：

- IOS顶部状态栏不再自动留20px高度，而是放置了真正的状态栏。
- MUI选项noHandleIosStatusBar被废弃。可用设置 statusBarColor为null替代。
- 要求原生程序中有splashscreen及statusbar插件。

### 新引入fastclick可能造成冲突 

fastclick库的引入，让IOS上点击事件响应更迅速，去除200ms延迟。
如果它与应用功能冲突（如某些事件的响应出问题），可通过设置MUI选项`disableFastClick`为`true`来禁用。

### WUI库中对话框事件变化

原先的initdata, loaddata, savedata事件将废弃，应分别改用beforeshow, show, validate事件替代，注意事件参数及检查对话框模式。
并且，原先使用dialog中的form来监听事件，现在建议直接用dialog来监听，如：

	function initDlgEmployee()
	{
		var jdlg = $(this);
		var jfrm = jdlg.find("form");
		jfrm.on("initdata", function (ev, data, formMode) {
			if (formMode != FormMode.forAdd)
				data.pwd = "****";
		})
		.on("loaddata", function (ev, data, formMode) {
			hiddenToCheckbox(jfrm.find("#divPerms"));
		})
		.on("savedata", function (ev, formMode, initData) {
			checkboxToHidden(jfrm.find("#divPerms"));
		});
	}

建议修改为：

	function initDlgEmployee()
	{
		var jdlg = $(this);
		// 注意find模式下以下opt.data或initData为空
		jdlg.on("beforeshow", function (ev, formMode, opt) {
			if (formMode == FormMode.forSet)
				opt.data.pwd = "****";
		})
		.on("show", function (ev, formMode, initData) {
			hiddenToCheckbox(jdlg.find("#divPerms"));
		})
		.on("validate", function (ev, formMode, initData, newData) {
			checkboxToHidden(jdlg.find("#divPerms"));
		});
	}

注意：
对话框的forLink模式已废弃，在上面回调中只需检查forAdd, forSet, forFind模式。

## 升级到v4.2

### 交互接口query中的wantArray参数被废弃

用到该参数的地方应改为`pagesz:-1`，表示返回尽可能多的数据。
最大数据条数由后端控制，默认100条。可在后端重载`maxPageSz`来修改：

	protected $maxPageSz = 1000; // 最大允许返回1000条
	// protected $maxPageSz = -1; // 最大允许返回 PAGE_SZ_LIMIT 条，目前为10000

