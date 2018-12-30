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

### 要求开启php_mbstring模块

	yum install php-mbstring

php-for-windows版本请检查php.ini中开启了该模块：

	extension=php_mbstring.dll

### dbInsert/dbUpdate中支持SQL表达式的写法调整

原写法：

	dbInsert("MyLog", [ "tm"=>"=NOW()" ]);
	dbUpdate("MyLog", [ "tm"=>"=NOW()" ], 1001);

新写法：

	dbInsert("MyLog", [ "tm"=>["NOW()"] ]);
	dbUpdate("MyLog", [ "tm"=>["NOW()"] ], 1001);

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
		jdlg.on("beforeshow", function (ev, formMode, opt) {
			if (formMode == FormMode.forSet)
				opt.data.pwd = "****";
		})
		.on("show", function (ev, formMode, initData) {
			hiddenToCheckbox(jdlg.find("#divPerms"));
		})
		.on("validate", function (ev, formMode, initData) {
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

