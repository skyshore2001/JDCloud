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
		<a href="javascript:;" class="btn-icon"><i class="icon icon-menu" id="btnSearch"></i></a>
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

## 升级到v4.2

### 交互接口query中的wantArray参数被废弃

用到该参数的地方应改为`pagesz:-1`，表示返回尽可能多的数据。
最大数据条数由后端控制，默认100条。可在后端重载`maxPageSz`来修改：

	protected $maxPageSz = 1000; // 最大允许返回1000条
	// protected $maxPageSz = -1; // 最大允许返回 PAGE_SZ_LIMIT 条，目前为10000

