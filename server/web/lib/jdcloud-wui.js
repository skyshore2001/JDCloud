// jdcloud-wui version 1.1
// ====== WEBCC_BEGIN_FILE doc.js {{{
/**
@module WUI

筋斗云前端框架-Web应用桌面版

此框架实现与筋斗云服务端接口的无缝整合。在界面上以jquery-easyui库为基础展示列表、Tab页等。
参考应用 web/store.html - 商户管理端应用。

## 对象管理功能

设计模式：列表页与详情页。

以订单对象Order为例：为订单对象增加“列表页”和“详情页”。

列表页应包含分页功能，默认只显示“未完成”订单。
点击列表中一项（一个订单），可显示详情页，即订单详情，并可进行查找、更新等功能。

### 定义列表页和详情页

@key #my-pages  包含所有页面、对话框定义的容器。
@key my-obj DOM属性，标识服务端对象
@key my-initfn DOM属性，标识页面或对话框的初始化函数，首次显示页面/对话框时调用。

列表页使用逻辑页面定义如下（放在div#my-pages之下），它最终展示为一个tab页：

	<div id="my-pages" style="display:none">
		...
		<script type="text/html" id="tpl_pageOrder">
			<div class="pageOrder" title="订单管理" my-initfn="initPageOrder">
				<table id="tblOrder" style="width:auto;height:auto">
					<thead><tr>
						<th data-options="field:'id', sortable:true, sorter:intSort">订单号</th>
						<th data-options="field:'userPhone', sortable:true">用户联系方式</th>
						<th data-options="field:'createTm', sortable:true">创建时间</th>
						<th data-options="field:'status', jdEnumMap: OrderStatusMap, formatter:Formatter.orderStatus, styler:OrderColumns.statusStyler, sortable:true">状态</th>
						<th data-options="field:'dscr', sortable:true">描述</th>
						<th data-options="field:'cmt'">用户备注</th>
					</tr></thead>
				</table>
			</div>
		</script>
	</div>

注意：

- 逻辑页的定义建议放在script标签中，便于按需加载，性能更佳（后面模块化时还会讲到放到单独文件中）。模板id为"tpl_pageOrder"，应与页面名相对应，否则无法加载。
- 逻辑页面div.pageOrder，属性class="pageOrder"定义了该逻辑页面的名字。它将作为页面模板，在WUI.showPage("pageOrder")时复制一份显示出来。
- 属性my-initfn定义了该页面的初始化函数. 在初次调用WUI.showPage时，会执行该初始化函数，用于初始化列表，设定事件处理等。
- 逻辑页面下包含了一个table，用于显示订单列表。里面每列对应订单的相关属性。
- table由jquery-easyui的datagrid组件实现，文档参考：http://www.jeasyui.com/documentation/datagrid.php 此外，data-options中的以jd开头的字段为jdcloud框架定义。

详情页展示为一个对话框，也将它也放在 div#my-pages 下。定义如下（此处为展示原理已简化）：

	<script type="text/html" id="tpl_dlgOrder">
		<div id="dlgOrder" my-obj="Ordr" my-initfn="initDlgOrder" title="用户订单" style="width:520px;height:500px;">  
			<form method="POST">
				订单号：<input name="id" disabled></td>
				订单状态：
						<select name="status" style="width:150px">
							<option value="">&nbsp;</option>
							<option value="CR">未付款</option>
							<option value="PA">待服务(已付款)</option>
							<option value="ST">正在服务</option>
							<option value="RE">已服务(待评价)</option>
							<option value="RA">已评价</option>
							<option value="CA">已取消</option>
						</select>
			用户备注：<textarea name="cmt" rows=3 cols=30></textarea>
			</form>
		<div>
	</script>

注意：

- 对话框的定义建议放在script标签中，便于按需加载，性能更佳（后面模块化时还会讲到放到单独文件中）。模板id为"tpl_dlgOrder"应与对话框名相应，否则无法加载。
- 对话框div#dlgOrder. 与列表页使用class标识名称不同，详情页对话框以id标识（因为全局共用一个对话框，而列表页可以复制为多个同时显示）。
- 对话框上定义了 "my-obj"属性，用于标识它对应的服务端对象名。对象增删改查操作都会用到它。
- 对话框的属性 my-initfn 定义了初始化函数，在首次显示时调用。
- 调用 WUI.showObjDlg($("#dlgOrder"), formMode) 可显示该对话框，一般由列表页自动调用。
- 对话框中包含一个form用于向服务端发起请求。form中每个带name属性的对象，都对应订单对象的一个属性，在添加、查找、显示或更新时都将用到，除非它上面加了disabled属性（这样就不会提交该字段）
- 对话框一般不用加“提交”按钮，框架会自动为它添加“确定”、“取消”按钮。

@see showObjDlg
@see showDlg

以上定义了订单对象的列表页和详情页，围绕对象"Order", 按规范，我们定义了以下名字：

- 列表页面（Tab页） div.pageOrder，列表 table#tblOrder，页面初始化函数 initPageOrder
- 详情页（对话框）div#dlgOrder，其中包含一个form。对话框初始化函数

### 添加入口按钮

	<a href="#pageOrder" class="easyui-linkbutton" icon="icon-ok">订单管理</a><br/><br/>

### 定义页面初始化函数

打开页面后，页面的生存周期如下：

@key event-pagecreate,pageshow,pagedestroy 页面事件
@key wui-pageName 属性：页面名
@key .wui-page 页面类

- 页面加载成功后，会为页面添加类"wui-page", 并将属性wui-pageName设置为页面名，然后调用 my-initfn指定的初始化函数，如initPageOrder
- 触发pagecreate事件
- 触发pageshow事件, 以后每次页面切换到当前页面，也会触发pageshow事件。
- 在关闭页面时，触发pagedestroy事件
- 注意：没有pagebeforeshow, pagehide事件

订单列表页的初始化，需要将列表页(代码中jpage)、列表(代码中jtbl)与详情页(代码中jdlg)关联起来，实现对话增删改查各项功能。

	function initPageOrder() 
	{
		var jpage = $(this);
		var jtbl = jpage.find("#tblOrder");
		var jdlg = $("#dlgOrder");

		// 注意：此处定义显示哪些缺省操作按钮：
		// r-refresh/刷新, f-find/查找, s-set/更新。参考 WUI.dg_toolbar.
		// 如果不定义则所有操作按钮都展示。
		jtbl.jdata().toolbar = "rfs";

		// 当天订单
		var query1 = {cond: "createTm between '" + new Date().format("D") + "' and '" + new Date().addDay(1).format("D") + "'"};
		// var query1 = WUI.getQueryParam({createTm: new Date().format("D") + "~" + new Date().addDay(1).format("D")});
		// 显示待服务/正在服务订单
		var query2 = {cond: "status='CR' OR status='PA' OR status='ST'"};
		// var query2 = WUI.getQueryParam({status: "CR,PA,ST"});

		function getTodoOrders()
		{
			WUI.reload(jtbl, null, query2);
		}
		function getTodayOrders()
		{
			WUI.reload(jtbl, null, query1);
		}
		var btn1 = {text: "今天订单", iconCls:'icon-search', handler: getTodayOrders};
		var btn2 = {text: "所有未完成", iconCls:'icon-search', handler: getTodoOrders};

		var dgOpt = {
			// 设置查询接口
			url: WUI.makeUrl(["Ordr", "query"], {res:"*,createTm,userPhone"}),
			// 设置缺省查询条件
			queryParams: query1,
			// 设置工具栏上的按钮，默认有增删改查按钮，"export"表示"导出到Excel"的按钮，btn1, btn2是自定义按钮，"-"表示按钮分隔符。
			toolbar: WUI.dg_toolbar(jtbl, jdlg, "export", "-", btn1, btn2),
			// 双击一行，应展示详情页对话框
			onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
		};
		jtbl.datagrid(dgOpt);
	}

@see showPage
@see dg_toolbar
@see dg_dblclick
@see makeUrl

### 定义对话框的初始化函数

@key example-dialog

默认对话框中由于设定了底层对象(my-obj)及属性关联（form中带name属性的组件，已关联对象属性），因而可自动显示和提交数据。

特别地，某些属性不宜直接展示，例如属性“人物头像”，服务器存储的是图片id(picId)，而展示时应显示为图片而不是一个数字；
或者如“权限列表”属性，服务器存储的是逗号分隔的一组权限比如"emp,mgr"，而展示时需要为每项显示一个勾选框。
这类需求就需要编码控制。

相关事件：
@see beforeshow,show 对话框中form显示前后

对话框类名：
@see .wui-dialog

	function initDlgOrder()
	{
		var jdlg = $(this);
		jdlg.on("beforeshow", onBeforeShow)
			.on("show", onShow)
			.on("validate", onValidate)
			.on("retdata", onRetData);
		
		function onBeforeShow(ev, formMode, opt) {
			jdlg.find(".forFind").toggle(formMode == FormMode.forFind);
			jdlg.find(".notForFind").toggle(formMode != FormMode.forFind);
		}
		function onShow(ev, formMode, initData) {
			// data是列表页中一行对应的数据，框架自动根据此数据将对应属性填上值。
			// 如果界面上展示的字段无法与属性直接对应，可以在该事件回调中设置。
			// hiddenToCheckbox(jdlg.find("#divPerms"));
		}
		function onValidate(ev, formMode, initData, newData) {
			// 在form提交时，所有带name属性且不带disabled属性的对象值会被发往服务端。
			// 此事件回调可以设置一些界面上无法与属性直接对应的内容。
			// 额外要提交的数据可放在隐藏的input组件中，或(v5.1)这里直接设置到newData对象中。
			// checkboxToHidden(jdlg.find("#divPerms"));
		}
		function onRetData(ev, data, formMode) {
			var formMode = jdlg.jdata().mode;
			if (formMode == FormMode.forAdd) {
				alert('返回ID: ' + data);
			}
		}
	}

在onBeforeShow中一般设置字段是否显示(show/hide/toggle)或只读(disabled)，以及在forAdd/forFind模式时为opt.data设置初始值(forSet模式下opt.data已填上业务数据)；
之后框架用opt.data数据填充相应字段，如需要补填或修改些字段（比如显示图片），可在onShow中处理，也可以直接在onBeforeShow中用setTimeout来指定，如：

	function onBeforeShow(ev, formMode, opt) {
		// ... 根据formMode等参数控制某些字段显示隐藏、启用禁用等...
		var frm = jdlg.find("form")[0];
		var isFind = formMode == FormMode.forFind;
		frm.type.disabled = !isFind;
		// 这里可以对opt.data赋值，但不要直接为组件设置值，因为接下来组件值会被opt.data中的值覆盖。

		setTimeout(onShow);
		function onShow() {
			// 这里可根据opt.data直接为input等组件设置值。便于使用onBeforeShow中的变量
		}
	}


@see checkboxToHidden (有示例)
@see hiddenToCheckbox 

@see imgToHidden
@see hiddenToImg (有示例)

### 列表页中的常见需求

框架中，对象列表通过easyui-datagrid来展现。
注意：由于历史原因，我们没有使用datagrid中的编辑功能。

参考：http://www.jeasyui.net/plugins/183.html
教程：http://www.jeasyui.net/tutorial/148.html

#### 列表页中的列，以特定格式展现

@key datagrid.formatter
@key datagrid.styler

示例一：显示名称及颜色

订单状态字段定义为：

	status:: Enum. 订单状态。CR-新创建,RE-已服务,CA-已取消. 

在显示时，要求显示其中文名称，且根据状态不同，显示不同的背景颜色。

在table中设置formatter与styler选项：

	<div class="pageOrder" title="订单管理" my-initfn="initPageOrder">
		<table id="tblOrder" style="width:auto;height:auto" title="订单列表">
			<thead><tr>
				<th data-options="field:'id', sortable:true, sorter:intSort">订单号</th>
				...
				<th data-options="field:'status', jdEnumMap: OrderStatusMap, formatter:Formatter.orderStatus, styler:OrderColumns.statusStyler, sortable:true">状态</th>
			</tr></thead>
		</table>
	</div>

formatter用于控制Cell中的HTML标签，styler用于控制Cell自己的CSS style.
在JS中定义：

	var OrderStatusMap = {
		CR: "未付款", 
		RE: "已服务", 
		CA: "已取消"
	};
	var Formatter = {
		// 显示枚举值的描述，相当于`return map[value] || value`；
		orderStatus: WUI.formatter.enum(OrderStatusMap),
		// 显示链接，点击打开用户详情对话框
		userId: WUI.formatter.linkTo("userId", "#dlgUser")
	};
	Formatter = $.extend(WUI.formatter, Formatter);

	var OrderColumns = {
		statusStyler: function (value, row) {
			var colors = {
				CR: "#000",
				RE: "#0f0",
				CA: "#ccc"
			};
			var color = colors[value];
			if (color)
				return "background-color: " + color;
		},
		...
	}

注意：

- WUI.formatter已经定义了常用的formatter. 通常定义一个全局Formatter继承WUI.formatter，用于各页面共享的字段设定.
- 习惯上，对同一个对象的字段的设定，都放到一个名为　{Obj}Columns 的变量中一起定义。

@see formatter 通用格式化函数

一些其它示例：

	var Formatter = {
		// 显示数值
		number: function (value, row) {
			return parseFloat(value);
		},
		// 订单编号，显示为一个链接，点击就打开订单对话框该订单。
		orderId: function (value, row) {
			if (value) {
				return WUI.makeLinkTo("#dlgOrder", row.orderId, value);
			}
		},
		// 显示状态的同时，设置另一个本地字段，这种字段一般以"_"结尾，表示不是服务器传来的字段，例如
		// <th data-options="field:'hint_'">提醒事项</th>
		status: function (value, row) {
			if (value) {
				if (value == "PA") {
					row.hint_ = "请于2小时内联系";
				}
				return StatusMap[value] || value;
			}
		}
	};

@see makeLinkTo 生成对象链接，以便点击时打开该对象的详情对话框。

#### 排序与分页

@key datagrid.sortable
@key datagrid.sorter

使用sortable:true指定该列可排序（可点击列头排序），用sorter指定排序算法（缺省是字符串排序），例如：

	<th data-options="field:'name', sortable:true">姓名</th>
	<th data-options="field:'id', sortable:true, sorter:intSort">编号</th>
	<th data-options="field:'score', sortable:true, sorter:numberSort">评分</th>

框架提供了intSort,numberSort这些函数用于整数排序或小数排序。也可以自定义函数。示例：

	function intSort(a, b)
	{
		return parseInt(a) - parseInt(b);
	}

注意：

- 指定sorter函数只会影响本地排序。而多数情况下，只要有多页，框架会使用远程排序。
 框架逻辑为：如果数据超过一页，使用远程排序, 否则使用本地排序减少请求。
- 本地排序(localSort)：点击列标题排序时，会重新发请求到服务端，并指定sort/排序字段,order/顺序或倒序参数
- 远程排序(remoteSort)：点排序时，直接本地计算重排，不会发请求到服务端.

@see intSort,numberSort

如果打开数据表就希望按某一列排序，可设置：

	jtbl.datagrid({
		...
		sortName: 'id',
		sortOrder: 'desc'
	});

手工点击列标题栏排序，会自动修改这两个属性。
在添加数据时，如果当前sortOrder是倒序，则新数据显示在表格当前页的最前面，否则显示在最后。

框架对datagrid还做了以下缺省设置：

- 默认开启datagrid的分页功能。每页缺省显示20条数据。可通过datagrid选项自行重新定义，如：

		jtbl.datagrid({
			...
			pageSize: 20,
			pageList: [20,30,50] // 在分页栏中可以选择分页大小
		});

- 当数据在一页内可显示完时，自动隐藏分页操作栏。

如果需要禁用分页，可以设置：

	jtbl.datagrid({
		url: WUI.makeUrl("Ordr.query", {"pagesz": -1}), // -1表示取后端允许的最大数量
		pagination: false, // 禁用分页组件
		...
	});

#### 列表导出Excel文件

(支持版本5.0)

除了默认地增删改查，还可为数据表添加标准的“导出Excel”操作，可自动按表格当前的显示字段、搜索条件、排序条件等，导出表格。
只需在dg_toolbar函数的参数中加上"export"（表示导出按钮），如：

	jtbl.datagrid({
		url: WUI.makeUrl("User.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export"),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
	});

导出字段由jtbl对应的表格的表头定义，如下面表格定义：

	<table id="tblOrder" style="width:auto;height:auto" title="订单列表">
		...
		<th data-options="field:'id'">编号</th>
		<th data-options="field:'status'">状态</th>
		<th data-options="field:'hint_'">友情提示</th>
	</table>

它生成的res参数为"id 编号, status 状态"。"hint_"字段以下划线结尾，它会被当作是本地虚拟字段，不会被导出。

table上的title属性可用于控制列表导出时的默认文件名，如本例导出文件名为"订单列表.xls"。
如果想导出表中没有显示的列，可以设置该列为隐藏，如：

		<th data-options="field:'userId', hidden:true">用户编号</th>

@key jdEnumMap datagrid中th选项, 在导出文件时，枚举变量可显示描述

对于枚举字段，可在th的data-options用`formatter:WUI.formatter.enum(map)`来显示描述，在导出Excel时，需要设置`jdEnumMap:map`属性来显示描述，如

		<th data-options="field:'status', jdEnumMap: OrderStatusMap, formatter: WUI.formatter.enum(OrderStatusMap)">状态</th>

OrderStatusMap在代码中定义如下

	var OrderStatusMap = {
		CR: "未付款", 
		PA: "待服务"
	}

它生成的res参数为"id 编号, status 状态=CR:未付款;PA:待服务"。筋斗云后端支持这种res定义方式将枚举值显示为描述。

@see dg_toolbar 指定列表上的操作按钮
@see getExportHandler 自定义导出Excel功能
@see getQueryParamFromTable 根据当前datagrid状态取query接口参数

HINT: 点“导出”时会直接下载文件，看不到请求和调用过程，如果需要调试导出功能，可在控制台中设置  window.open=$.get 即可在chrome中查看请求响应过程。

#### datagrid增强项

easyui-datagrid已适配筋斗云协议调用，底层将发起callSvr调用请求（参考dgLoader）。
此外，增加支持`url_`属性，以便初始化时不发起调用，直到调用"load"/"reload"方法时才发起调用：

	jtbl.datagrid({
		url_: WUI.makeUrl("Item.query", {res:"id,name"}), // 如果用url则会立即用callSvr发起请求。
		...
	});
	// ...
	jtbl.datagrid("load", {cond: "itemId=" + itemId});
	jtbl.datagrid("reload");

如果接口返回格式不符合，则可以使用loadData方法：

	// 接口 Item.get() -> {item1=[{srcItemId, qty}]}
	callSvr("Item.get", {res:"item1"}, function (data) {
		jtbl.datagrid("loadData", data.item1); // 是一个对象数组
	});

datagrid默认加载数据要求格式为`{total, rows}`，框架已对返回数据格式进行了默认处理，兼容筋斗云协议格式（参考dgLoadFilter）。

	var rows = [ {id:1, name:"name1"}, {id:2, name:"name2"} ];
	jtbl.datagrid("loadData", {tota:2, rows: rows});
	// 还支持以下三种格式
	jtbl.datagrid("loadData", rows);
	jtbl.datagrid("loadData", {h: ["id","name"], d: [ [1, "name1"], [2, "name2"]}); // 筋斗云query接口默认返回格式。
	jtbl.datagrid("loadData", {list: rows}); // 筋斗云query接口指定fmt=list参数时，返回这种格式

### 详情页对话框的常见需求

#### 通用查询

在对话框中按快捷键"Ctrl-F"可进入查询模式。
详情页提供通用查询，如：

	手机号: <input name="phone">  
	注册时间: <input name="createTm">

可在手机号中输入"137*"，在注册时间中输入">=2017-1-1 and <2018-1-1" (或用 "2017-1-1~2018-1-1")，这样生成的查询参数为：

	{ cond: "phone like '137%' and (createTm>='2017-1-1' and createTm<'2018-1-1')" }

@see getQueryCond 查询条件支持
@see getQueryParam 生成查询条件

@key .wui-find-field 用于查找的字段样式
可设置该样式来标识哪些字段可以查找。一般设置为黄色。

@key .notForFind 指定非查询条件
不参与查询的字段，可以用notForFind类标识(为兼容，也支持属性notForFind)，如：

	登录密码: <input class="notForFind" type="password" name="pwd">
	或者: <input notForFind type="password" name="pwd">

@key .wui-notCond 指定独立查询条件

如果查询时不想将条件放在cond参数中，可以设置wui-notCond类标识，如：

	状态: <select name="status" class="my-combobox wui-notCond" data-options="jdEnumList:'0:可用;1:禁用'"></select>

如果不加wui-notCond类，生成的查询参数为：`{cond: "status=0"}`；加上后，生成查询参数如：`{status: 0}`.

#### 设计模式：关联选择框

示例：下拉框中显示员工列表 (Choose-from-list / 关联选择框)

@see jQuery.fn.mycombobox

#### picId字段显示图片

@see hiddenToImg (有示例)
@see imgToHidden

#### List字段显示为多个选项框

@see hiddenToCheckbox 
@see checkboxToHidden　(有示例)

### 设计模式：展示层次对象

例如设计有商品表Item, 每个商品属于特定的商户：

	@Item: id, storeId, name
	storeId:: Integer. 商品所属商户编号。

也就是说，商户包含商品。要展现商品，可将它放在商户层次之下。
可以这样设计用户操作：在商户列表上增加一个按钮“查看商品”，点击后打开一个新的列表页，显示该商户的商品列表。

定义两个列表页：

	<div class="pageStore" title="商户列表" my-initfn="initPageStore">
	</div>

	<div class="pageItem" title="商户商品" my-initfn="initPageItem">
	</div>

为这两个列表页定义初始化函数：

	// 商户列表页
	function initPageStore()
	{
		function showItemPage()
		{
			var row = jtbl.datagrid('getSelected');
			if(row == null){
				alert("您需要选择需要操作的行");
				return;
			}
			// !!! 调用showPage显示新页 !!!
			WUI.showPage("pageItem", "商户商品-" + row.name, [row.id]);
			// 要使每个商户都打开一个商品页面而不是共享一个页面，必须保证第二个参数（页面标题）根据商户不同而不一样。
			// 第三个参数是传给该页面初始化函数的参数列表，是一个数组。
		}
		var btn1 = {text: "查看商品", iconCls: "icon-search", handler: showItemPage};

		...
		jtbl.datagrid({
			...
			toolbar: WUI.dg_toolbar(jtbl, jdlg, btn1),
		});
	}

	// 商品列表页，注意有一个参数storeId, 并在查询时使用到它。
	function initPageItem(storeId)
	{
		jtbl.datagrid({
			// 用参数storeId过滤
			url: WUI.makeUrl("Item.query", {cond: "storeId=" + storeId}),
			...
		});
	}

注意：

调用WUI.showPage时，除了指定页面名，还指定了页面标题(第二参数)和页面初始化参数(第三参数, 一定是一个数组):

	WUI.showPage("pageItem", "商户商品-" + row.name, [row.id]);

显然，第二个参数随着商户名称不同而不同，这保证了不同商户打开的商品页面不会共用。
在商品页面初始化时，第三参数将传递给初始化函数：

	function initPageItem(storeId) // storeId=row.id

@see showPage

### 设计模式：页面间调用

仍以上节数据结构为例，上节是在每个商品行上点“查看商品”，就打开一个新的该商户下的商品列表页，
现在我们换一种操作方法，改成只用一个商品列表页（默认打开时显示所有商户的商品，可以手工查找过滤），在商户页中点“查看商品”，就自动打开商品列表页并做条件过滤。

先在主页面逻辑中为商品页定义一个接口：（比如在store.js中）

	var PageItem = {
		// param?: {storeId}
		show: function (param) {
			this.filterParam_ = param;
			WUI.showPage("pageItem");
		},
		filterParam_: null
	};

在商户页中，点击“查看商品”按钮时做过滤：

	function initPageStore()
	{
		function showItemPage()
		{
			var row = jtbl.datagrid('getSelected');
			...
			PageItem.show({storeId: row.id});
		}
		var btn1 = {text: "查看商品", iconCls: "icon-search", handler: showPageCloseOrder};

		...
		jtbl.datagrid({
			...
			toolbar: WUI.dg_toolbar(jtbl, jdlg, btn1),
		});
	}

在商品页中，处理PageItem.filterParam_参数，实现过滤，我们在pageshow回调中处理它，同时把初始化datagrid也移到pageshow中：

	function initPageItem()
	{
		var isInit = true;
		jpage.on("pageshow", pageShow);

		function pageShow() {
			// 接口变量PageItem.filterParam_用后即焚
			var param = null;
			if (PageItem.filterParam_) {
				param = WUI.getQueryParam(PageItem.filterParam_);
				PageItem.filterParam_ = null;
			}
			// 保证表格初始化只调用一次
			if (isInit) {
				jtbl.datagrid({
					url: WUI.makeUrl("Item.query"),
					queryParams: param,
					toolbar: WUI.dg_toolbar(jtbl, jdlg, "export"),
					onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
					sortName: "id",
					sortOrder: "desc"
				});
				isInit = false;
			}
			else if (param) {
				WUI.reload(jtbl, null, param);
			}
		}
	}

注意：

- 例子中通过页面接口，实现页面间的调用请求。
- 上面用了WUI.reload，在点击列表上的“刷新”时，只会按当前条件刷新，不会刷新出所有数据来，必须点“查找”，清除所有条件后查找，才可以看到所有数据；
 若想点“刷新”时显示所有数据，则可以将WUI.reload换成调用WUI.reloadTmp。

## 对话框功能

以群发短信功能为例。

假定服务端已有以下接口：

	sendSms(phone, content)
	phone:: 手机号
	content:: 发送内容

### 定义对话框

注意：每个带name属性的组件对应接口中的参数。

	<div id="dlgSendSms" title="群发短信" style="width:500px;height:300px;">  
		<form method="POST">
			手机号：<input name="phone" data-options="required:true">
			发送内容： <textarea rows=5 cols=30 name="content"></textarea>
		</form>
	</div>

### 显示对话框

可以调用WUI.showDlg，写一个显示对话框的函数：

	function showDlgSendSms()
	{
		var jdlg = $("#dlgSendSms");
		WUI.showDlg(jdlg, {
			url: WUI.makeUrl("sendSms"),
			onOk: function (data) {
				WUI.closeDlg(jdlg);
				app_show('操作成功!');
			}
		});
	}

在showDlg的选项url中指定了接口为"sendSms"。操作成功后，显示一个消息。

@see showDlg
@see app_show

除了直接调用该函数显示对话框外，还有一种更简单的通过a标签href属性指定打开对话框的做法，如：

	<a href="?showDlgSendSms" class="easyui-linkbutton" icon="icon-ok">群发短信</a><br/><br/>

点击该按钮，即调用了showDlgSendSms函数打开对话框。

### 页面传参数给对话框

(v5.1)
可以通过showObjDlg(jdlg, mode, opt)中的opt参数，或jdlg.objParam来给对话框传参。
在对话框的beforeshow事件处理中，可通过opt.objParam拿到参数，如：

	function initPageBizPartner() {
		var jdlg = $("#dlgSupplier");
		// 设置objParam参数供对话框使用。
		jdlg.objParam = {type: "C", obj: "Customer", title: "客户"}; // opt.title参数可直接设置对话框的标题。参考showObjDlg.
		jtbl.datagrid(toolbar: dg_toolbar(jtbl, jdlg, ...));
		// 点表格上的菜单或双击行时会调用 WUI.showObjDlg
	}

	function initDlgBizPartner() {
		// ...
		jdlg.on("beforeshow", onBeforeShow);
		
		function onBeforeShow(ev, formMode, opt) {
			// opt.objParam 中包含前面定义的type, obj, 以及id, mode等参数。
		}
	}

### 示例：页面与对话框复用 (v5.1)

设计有客户(Customer)和供应商(Supplier)两个虚拟的逻辑对象，它们物理底层都是业务伙伴对象(BizPartner)。
现在只设计一个页面pageBizPartner和一个对话框dlgBizPartner。

菜单中两项：
默认pageBizPartner是供应商，如果要显示为"客户"页，需要明确调用showPage。

	<a href="#pageBizPartner">供应商</a>
	<a href="javascript:WUI.showPage('pageBizPartner', '客户', ['C']);">客户</a>

在initPageBizPartner函数中，为对话框传递参数objParam：

	type = type || "S";
	var obj = "type=="S"? "Supplier": "Customer";
	jdlg.objParam = {type: type, obj: obj};
	// ...

在对话框的beforeshow事件处理中，根据opt.objParam.type确定标题栏:

	jdlg.on("beforeshow", function (ev, formMode, opt) {
		opt.title = opt.objParam.type == "C"? "客户": "供应商";
	});

### 只读对话框

(v5.1)
@key .wui-readonly 只读对话框类名

设置是否为只读对话框只要加上该类：

	jdlg.toggleClass("wui-readonly", isReadonly);

只读对话框不可输入(在style.css中设定pointer-events为none)，点击确定按钮后直接关闭。

## 模块化开发

@key wui-script
@key options.pageFolder

允许将逻辑页、对话框的html片段和js片段放在单独的文件中。以前面章节示例中订单对象的列表页（是一个逻辑页）与详情页（是一个对话框）为例：

- 页面名(即class)为pageOrder，UI与js逻辑分别保存在pageOrder.html, pageOrder.js中。
- 对话框id为dlgOrder, UI与js逻辑分别保存在dlgOrder.html, dlgOrder.js中。
- 模块所在目录默认为"page", 可通过在h5应用开头设置 WUI.options.pageFolder 来修改。

先在文件page/pageOrder.html中定义逻辑页

	<div title="订单管理" wui-script="pageOrder.js" my-initfn="initPageOrder">
		<table id="tblOrder" style="width:auto;height:auto">
			...
		</table>
	</div>

注意：

- 在html文件中用 wui-script属性 来指定对应的js文件。
- 无须像之前那样指定class="pageOrder" / id="dlgOrder" 这些属性，它们会根据页面文件名称由框架自动设置。

在html文件的div中可以添加style样式标签：

	<div>
		<style>
		table {
			background-color: #ddd;
		}
		</style>
		<table>...</table>
	</div>

注意：其中定义的样式（比如这里的table）只应用于当前页面或对话框，因为框架会在加载它时自动限定样式作用范围。

在文件page/pageOrder.js中定义逻辑：

	function initPageOrder() 
	{
		var jpage = $(this);
		...
	}

这时，就可以用 WUI.showPage("#pageOrder")来显示逻辑页了。

注意：逻辑页的title字段不能和其它页中title重复，否则这两页无法同时显示，因为显示tab页时是按照title来标识逻辑页的。

动态加载页面时，先加载逻辑页html和js文件，再将逻辑页插入应用程序并做系统初始化（如增强mui组件或easyui组件等），然后调用页面的用户初始化函数。
若希望在系统初始化之前做一些操作，应放在用户初始化函数之外。
例如，初始化过程中的服务调用使用批处理：

	functio initPageOrder() 
	{
		...
	}
	WUI.useBatchCall();

在文件page/dlgOrder.html中定义对话框UI:

	<div wui-script="dlgOrder.js" my-obj="Ordr" my-initfn="initDlgOrder" title="用户订单" style="width:520px;height:500px;">  
		<form method="POST">
			...
		</form>
	<div>

注意：

- 在html文件中用 wui-script属性 来指定对应的js文件。
- 无须像之前那样指定id="dlgOrder" 这些属性，它们会根据页面文件名称由框架自动设置。
- 和上面逻辑页定义一样，对话框专用的样式可以在主div标签内添加style标签来定义，在加载UI后样式作用域自动限定在当前对话框。

在文件page/dlgOrder.js中定义js逻辑:

	function initDlgOrder()
	{
		var jdlg = $(this);
		...
	}

这时，就可以用 WUI.showObjDlg("#dlgOrder")来显示逻辑页了。

#### 批量更新、批量删除

(v5.2) 
列表页支持两种批量操作模式。

- 基于多选行
	- 在数据表中按Ctrl多选；或按Shift连续选择。
	- 点击删除菜单，或在修改对话框点确定时，一旦发现是多选，则执行批量删除或批量更新。
- 基于过滤条件
	- 先搜索出要更新或删除的记录：
	- 批量更新：双击任意一行打开对话框，修改后按住Ctrl点击确定按钮，批量更新所有表中的内容。
	- 批量删除：按住Ctrl键点数据表上面的“删除”按钮，即是批量删除所有表中的内容。

服务端应支持`{obj}.setIf(cond)`及`{obj}.delIf(cond)`接口。

### 页面模板支持

定义一个逻辑页面，可以在#my-pages下直接定义，也可以在单独的文件中定义，还可以在一个模板中定义，如：

	<script type="text/html" id="tpl_pageOrder">
	<div class="pageOrder" title="订单管理" my-initfn="initPageOrder">
	...
	</div>
	</script>

模板用script标签定义，其id属性必须命名为`tpl_{逻辑页面名}`。
这样就定义了逻辑页pageOrder，且在用到时才加载。与从外部文件加载类似，可以不设置class="pageOrder"，框架会自动处理。

定义对话框也类似：

	<script type="text/html" id="tpl_dlgOrder">
	<div id="dlgOrder" my-obj="Ordr" my-initfn="initDlgOrder" title="用户订单" style="width:520px;height:500px;">  
	...
	</div>
	</script>

定义了对话框dlgOrder，这个id属性也可以不设置。
模板用script标签定义，其id属性必须命名为`tpl_{对话框名}`。

注意：

如果将script标签制作的页面模板内嵌在主页中，可能会造成加载时闪烁。
在chrome中，在easyui-layout之后定义任意script标签（哪怕是空内容），会导致加载首页时闪烁，标题栏是黑色尤其明显。
测试发现，将这些个script模板放在head标签中不会闪烁。

这个特性可用于未来WEB应用编译打包。

## 参考文档说明

以下参考文档介绍WUI模块提供的方法/函数(fn)、属性/变量(var)等，示例如下：

	@fn showPage(pageName, title?, paramArr?)  一个函数。参数说明中问号表示参数可缺省。
	@var options 一个属性。
	@class batchCall(opt?={useTrans?=0}) 一个JS类。
	@key example-dialog key表示一般关键字。前缀为"example-"用于示例讲解。
	@key .wui-page 一个CSS类名"wui-page"，关键字以"."开头。
	@key #wui-pages 一个DOM对象，id为"wui-pages"，关键字以"#"开头。

对于模块下的fn,var,class这些类别，如非特别说明，调用时应加WUI前缀，如

	WUI.showPage("#pageOrder");
	var opts = WUI.options;
	var batch = new WUI.batchCall();
	batch.commit();

以下函数可不加WUI前缀：

	intSort
	numberSort
	callSvr
	callSvrSync
	app_alert
	app_confirm
	app_show

参考wui-name.js模块。

*/
// ====== WEBCC_END_FILE doc.js }}}

// ====== WEBCC_BEGIN_FILE common.js {{{
jdModule("jdcloud.common", JdcloudCommon);
function JdcloudCommon()
{
var self = this;

/**
@fn assert(cond, dscr?)
 */
self.assert = assert;
function assert(cond, dscr)
{
	if (!cond) {
		var msg = "!!! assert fail!";
		if (dscr)
			msg += " - " + dscr;
		throw(msg);
	}
}

/**
@fn parseQuery(str)

解析url编码格式的查询字符串，返回对应的对象。

	if (location.search) {
		var queryStr = location.search.substr(1); // "?id=100&name=abc&val=3.14"去掉"?"号
		var args = parseQuery(queryStr); // {id: 100, name: "abc", val: 3.14}
	}

注意：

如果值为整数或小数，则会转成相应类型。如上例中 id为100,不是字符串"100".
 */
self.parseQuery = parseQuery;
function parseQuery(s)
{
	var ret = {};
	if (s != "")
	{
		var a = s.split('&')
		for (i=0; i<a.length; ++i) {
			var a1 = a[i].split("=");
			var val = a1[1];
			if (val === undefined)
				val = 1;
			else if (/^-?[0-9]+$/.test(val)) {
				val = parseInt(val);
			}
			else if (/^-?[0-9.]+$/.test(val)) {
				val = parseFloat(val);
			}
			else {
				val = decodeURIComponent(val);
			}
			ret[a1[0]] = val;
		}
	}
	return ret;
}

/**
@fn tobool(v)

将字符串转成boolean值。除"0", "1"外，还可以支持字符串 "on"/"off", "true"/"false"等。
*/
self.tobool = tobool;
function tobool(v)
{
	if (typeof v === "string")
		return v !== "" && v !== "0" && v.toLowerCase() !== "false" && v.toLowerCase() !== "off";
	return !!v;
}

/**
@fn reloadSite()

重新加载当前页面，但不要#hash部分。
*/
self.reloadSite = reloadSite;
function reloadSite()
{
	var href = location.href.replace(/#.+/, '#');
	location.href = href;
	location.reload();
	throw "abort";
}

// ====== Date {{{
// ***************** DATE MANIPULATION: format, addMonth, addDay, addHours ******************

function setWidth_2(number)
{
	return number < 10? ("0" + number) : ("" + number);
}

/**
@fn Date.format(fmt?=L)

日期对象格式化字符串。

@param fmt 格式字符串。由以下组成：

	yyyy - 四位年，如2008, 1999
	yy - 两位年，如 08, 99
	mm - 两位月，如 02, 12
	dd - 两位日，如 01, 30
	HH - 两位小时，如 00, 23
	MM - 两位分钟，如 00, 59
	SS - 两位秒，如 00, 59

	支持这几种常用格式：
	L - 标准日期时间，相当于 "yyyy-mm-dd HH:MM:SS"
	D - 标准日期，相当于 "yyyy-mm-dd"
	T - 标准时间，相当于 "HH:MM:SS"

示例：

	var dt = new Date();
	var dtStr1 = dt.format("D"); // "2009-10-20"
	var dtStr2 = dt.format("yyyymmdd-HHMM"); // "20091020-2038"

 */
Date.prototype.format = function(fmt)
{
	if (fmt == null)
		fmt = "L";

	switch (fmt) {
	case "L":
		fmt = "yyyy-mm-dd HH:MM:SS";
		break;
	case "D":
		fmt = "yyyy-mm-dd";
		break;
	case "T":
		fmt = "HH:MM:SS";
		break;
	}
	var year = this.getFullYear();
	return fmt.replace("yyyy", year)
	          .replace("yy", ("" + year).substring(2))
	          .replace("mm", setWidth_2(this.getMonth()+1))
	          .replace("dd", setWidth_2(this.getDate()))
	          .replace("HH", setWidth_2(this.getHours()))
	          .replace("MM", setWidth_2(this.getMinutes()))
	          .replace("SS", setWidth_2(this.getSeconds()))
			  ;
}

/** @fn Date.addDay(n) */
Date.prototype.addDay = function(iDay)
{
	this.setDate(this.getDate() + iDay);
	return this;
}

/** @fn Date.addHours(n) */
Date.prototype.addHours = function (iHours)
{
	this.setHours(this.getHours() + iHours);
	return this;
}

/** @fn Date.addMin(n) */
Date.prototype.addMin = function (iMin)
{
	this.setMinutes(this.getMinutes() + iMin);
	return this;
}

/** @fn Date.addMonth(n) */
Date.prototype.addMonth = function (iMonth)
{
	this.setMonth(this.getMonth() + iMonth);
	return this;
}

/*
// Similar to the VB interface
// the following interface conform to: dt - DateTime(DateValue(dt), TimeValue(dt)) == 0
function DateValue(dt)
{
	//return new Date(Date.parse(dt.getFullYear() + "/" + dt.getMonth() + "/" + dt.getDate()));
	return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function TimeValue(dt)
{
	return new Date(0,0,1,dt.getHours(),dt.getMinutes(),dt.getSeconds());
}

function DateTime(d, t)
{
	return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(),t.getMinutes(),t.getSeconds());
}
*/

/**
@fn parseTime(s)

将纯时间字符串生成一个日期对象。

	var dt1 = parseTime("10:10:00");
	var dt2 = parseTime("10:11");

 */
self.parseTime = parseTime;
function parseTime(s)
{
	var a = s.split(":");
	var dt =  new Date(0,0,1, a[0],a[1]||0,a[2]||0);
	if (isNaN(dt.getYear()))
		return null;
	return dt;
}

/**
@fn parseDate(dateStr)

将日期字符串转为日期时间格式。其效果相当于`new Date(Date.parse(dateStr))`，但兼容性更好（例如在safari中很多常见的日期格式无法解析）

示例：

	var dt1 = parseDate("2012-01-01");
	var dt2 = parseDate("2012/01/01 20:00:09");
	var dt3 = parseDate("2012.1.1 20:00");

支持时区，时区格式可以是"+8", "+08", "+0800", "Z"这些，如

	parseDate("2012-01-01T09:10:20.328+0800");
	parseDate("2012-01-01T09:10:20Z");

 */
self.parseDate = parseDate;
function parseDate(str)
{
	if (str == null)
		return null;
	if (str instanceof Date)
		return str;
	if (/Z$/.test(str)) { // "2017-04-22T16:22:50.778Z", 部分浏览器不支持 "2017-04-22T00:00:00+0800"
		return new Date(str);
	}
	var ms = str.match(/^(\d+)(?:[-\/.](\d+)(?:[-\/.](\d+))?)?/);
	if (ms == null)
		return null;
	var y, m, d;
	var now = new Date();
	if (ms[3] !== undefined) {
		y = parseInt(ms[1]);
		m = parseInt(ms[2])-1;
		d = parseInt(ms[3]);
		if (y < 100)
			y += 2000;
	}
	else if (ms[2] !== undefined) {
		y = now.getFullYear();
		m = parseInt(ms[1])-1;
		d = parseInt(ms[2]);
	}
	else {
		y = now.getFullYear();
		m = now.getMonth();
		d = parseInt(ms[1]);
	}
	var h, n, s;
	h=0; n=0; s=0;
	ms = str.match(/(\d+):(\d+)(?::(\d+))?/);
	if (ms != null) {
		h = parseInt(ms[1]);
		n = parseInt(ms[2]);
		if (ms[3] !== undefined)
			s = parseInt(ms[3]);
	}
	var dt = new Date(y, m, d, h, n, s);
	if (isNaN(dt.getYear()))
		return null;
	// 时区(前面必须是时间如 00:00:00.328-02 避免误匹配 2017-08-11 当成-11时区
	ms = str.match(/:[0-9.T]+([+-])(\d{1,4})$/);
	if (ms != null) {
		var sign = (ms[1] == "-"? -1: 1);
		var cnt = ms[2].length;
		var n = parseInt(ms[2].replace(/^0+/, ''));
		if (isNaN(n))
			n = 0;
		else if (cnt > 2)
			n = Math.floor(n/100);
		var tzOffset = sign*n*60 + dt.getTimezoneOffset();
		if (tzOffset)
			dt.addMin(-tzOffset);
	}
	return dt;
}

/**
@fn Date.add(sInterval, n)

为日期对象加几天/小时等。参数n为整数，可以为负数。

@param sInterval Enum. 间隔单位. d-天; m-月; y-年; h-小时; n-分; s-秒

示例：

	var dt = new Date();
	dt.add("d", 1); // 1天后
	dt.add("m", 1); // 1个月后
	dt.add("y", -1); // 1年前
	dt.add("h", 3); // 3小时后
	dt.add("n", 30); // 30分钟后
	dt.add("s", 30); // 30秒后

@see Date.diff
 */
Date.prototype.add = function (sInterval, n)
{
	switch (sInterval) {
	case 'd':
		this.setDate(this.getDate()+n);
		break;
	case 'm':
		this.setMonth(this.getMonth()+n);
		break;
	case 'y':
		this.setFullYear(this.getFullYear()+n);
		break;
	case 'h':
		this.setHours(this.getHours()+n);
		break;
	case 'n':
		this.setMinutes(this.getMinutes()+n);
		break;
	case 's':
		this.setSeconds(this.getSeconds()+n);
		break;
	}
	return this;
}

/**
@fn Date.diff(sInterval, dtEnd)

计算日期到另一日期间的间隔，单位由sInterval指定(具体值列表参见Date.add).

	var dt = new Date();
	...
	var dt2 = new Date();
	var days = dt.diff("d", dt2); // 相隔多少天

@see Date.add
*/
Date.prototype.diff = function(sInterval, dtEnd)
{
	var dtStart = this;
	switch (sInterval) 
	{
		case 'd' :return Math.round((dtEnd - dtStart) / 86400000);
		case 'm' :return dtEnd.getMonth() - dtStart.getMonth() + (dtEnd.getFullYear()-dtStart.getFullYear())*12;
		case 'y' :return dtEnd.getFullYear() - dtStart.getFullYear();
		case 's' :return Math.round((dtEnd - dtStart) / 1000);
		case 'n' :return Math.round((dtEnd - dtStart) / 60000);
		case 'h' :return Math.round((dtEnd - dtStart) / 3600000);
	}
}

/**
@fn getTimeDiffDscr(tm, tm1)

从tm到tm1的时间差描述，如"2分钟前", "3天前"等。

tm和tm1可以为时间对象或时间字符串
*/
self.getTimeDiffDscr = getTimeDiffDscr;
function getTimeDiffDscr(tm, tm1)
{
	if (!tm || !tm1)
		return "";
	if (! (tm instanceof Date)) {
		tm = parseDate(tm);
	}
	if (! (tm1 instanceof Date)) {
		tm1 = parseDate(tm1);
	}
	var diff = (tm1 - tm) / 1000;
	if (diff < 60) {
		return "刚刚";
	}
	diff /= 60; // 分钟
	if (diff < 60) {
		return Math.floor(diff) + "分钟前";
	}
	diff /= 60; // 小时
	if (diff < 48) {
		return Math.floor(diff) + "小时前";
	}
	diff /= 24; // 天
	if (diff < 365*2)
		return Math.floor(diff) + "天前";
	diff /= 365;
	if (diff < 10)
		return Math.floor(diff) + "年前";
	return "很久前";
}

// }}}

// ====== Cookie and Storage (localStorage/sessionStorage) {{{
/**
@fn setCookie(name, value, days?=30)

设置cookie值。如果只是为了客户端长时间保存值，一般建议使用 setStorage.

@see getCookie
@see delCookie
@see setStorage
*/
self.setCookie = setCookie;
function setCookie(name,value,days)
{
	if (days===undefined)
		days = 30;
	if (value == null)
	{
		days = -1;
		value = "";
	}
	var exp  = new Date();
	exp.setTime(exp.getTime() + days*24*60*60*1000);
	document.cookie = name + "="+ escape (value) + ";expires=" + exp.toGMTString();
}

/**
@fn getCookie(name)

取cookie值。

@see setCookie
@see delCookie
*/
self.getCookie = getCookie;
function getCookie(name)
{
	var m = document.cookie.match(new RegExp("(^| )"+name+"=([^;]*)(;|$)"));
	if(m != null) {
		return (unescape(m[2]));
	} else {
		return null;
	}
}

/**
@fn delCookie(name)

删除一个cookie项。

@see getCookie
@see setCookie
*/
self.delCookie = delCookie;
function delCookie(name)
{
	if (getCookie(name) != null) {
		setCookie(name, null, -1);
	}
}

/**
@fn setStorage(name, value, useSession?=false)

使用localStorage存储(或使用sessionStorage存储, 如果useSession=true)。
value可以是简单类型，也可以为数组，对象等，后者将自动在序列化后存储。 

如果设置了window.STORAGE_PREFIX, 则键值(name)会加上该前缀.

示例：

	setStorage("id", "100");
	var id = getStorage("id");
	delStorage("id");

示例2：存储对象:

	window.STORAGE_PREFIX = "jdcloud_"; // 一般在app.js中全局设置
	var obj = {id:10, name:"Jason"};
	setStorage("obj", obj);   // 实际存储键值为 "jdcloud_obj"
	var obj2 = getStorage("obj");
	alert(obj2.name);

@var STORAGE_PREFIX 本地存储的键值前缀

如果指定, 则调用setStorage/getStorage/delStorage时都将自动加此前缀, 避免不同项目的存储项冲突.

@see getStorage
@see delStorage
*/
self.setStorage = setStorage;
function setStorage(name, value, useSession)
{
	if ($.isPlainObject(value) || $.isArray(value)) {
		value = JSON.stringify(value);
	}
	assert(typeof value != "object", "value must be scalar!");
	if (window.STORAGE_PREFIX)
		name = window.STORAGE_PREFIX + name;
	if (useSession)
		sessionStorage.setItem(name, value);
	else
		localStorage.setItem(name, value);
}

/**
@fn getStorage(name, useSession?=false)

取storage中的一项。
默认使用localStorage存储，如果useSession=true，则使用sessionStorage存储。

如果浏览器不支持Storage，则使用cookie实现.

@see setStorage
@see delStorage
*/
self.getStorage = getStorage;
function getStorage(name, useSession)
{
	if (window.STORAGE_PREFIX)
		name = window.STORAGE_PREFIX + name;

	var value;
	if (useSession)
		value = sessionStorage.getItem(name);
	else
		value = localStorage.getItem(name);

	if (typeof(value)=="string" && (value[0] == '{' || value[0] == '['))
		value = JSON.parse(value);
	return value;
}

/**
@fn delStorage(name)

删除storage中的一项。

@see getStorage
@see setStorage
*/
self.delStorage = delStorage;
function delStorage(name, useSession)
{
	if (window.STORAGE_PREFIX)
		name = window.STORAGE_PREFIX + name;
	if (useSession)
		sessionStorage.removeItem(name);
	else
		localStorage.removeItem(name);
}
//}}}

// ====== rs object {{{
/**
@fn rs2Array(rs)

@param rs={h=[header], d=[ @row ]} rs对象(RowSet)
@return arr=[ %obj ]

rs对象用于传递表格，包含表头与表内容。
函数用于将服务器发来的rs对象转成数组。

示例：

	var rs = {
		h: ["id", "name"], 
		d: [ [100, "Tom"], [101, "Jane"] ] 
	};
	var arr = rs2Array(rs); 

	// 结果为
	arr = [
		{id: 100, name: "Tom"},
		{id: 101, name: "Jane"} 
	];

@see rs2Hash
@see rs2MultiHash
*/
self.rs2Array = rs2Array;
function rs2Array(rs)
{
	var ret = [];
	var colCnt = rs.h.length;

	for (var i=0; i<rs.d.length; ++i) {
		var obj = {};
		var row = rs.d[i];
		for (var j=0; j<colCnt; ++j) {
			obj[rs.h[j]] = row[j];
		}
		ret.push(obj);
	}
	return ret;
}

/**
@fn rs2Hash(rs, key)

@param rs={h, d}  rs对象(RowSet)
@return hash={key => %obj}

示例：

	var rs = {
		h: ["id", "name"], 
		d: [ [100, "Tom"], [101, "Jane"] ] 
	};
	var hash = rs2Hash(rs, "id"); 

	// 结果为
	hash = {
		100: {id: 100, name: "Tom"},
		101: {id: 101, name: "Jane"}
	};

key可以为一个函数，返回实际key值，示例：

	var hash = rs2Hash(rs, function (o) {
		return "USER-" + o.id;
	}); 

	// 结果为
	hash = {
		"USER-100": {id: 100, name: "Tom"},
		"USER-101": {id: 101, name: "Jane"}
	};

@see rs2Array
*/
self.rs2Hash = rs2Hash;
function rs2Hash(rs, key)
{
	var ret = {};
	var colCnt = rs.h.length;
	var keyfn;
	if (typeof(key) == "function")
		keyfn = key;
	for (var i=0; i<rs.d.length; ++i) {
		var obj = {};
		var row = rs.d[i];
		for (var j=0; j<colCnt; ++j) {
			obj[rs.h[j]] = row[j];
		}
		var k = keyfn?  keyfn(obj): obj[key];
		ret[ k ] = obj;
	}
	return ret;
}

/**
@fn rs2MultiHash(rs, key)

数据分组(group by).

@param rs={h, d}  rs对象(RowSet)
@return hash={key => [ %obj ]}

示例：

	var rs = {
		h: ["id", "name"], 
		d: [ [100, "Tom"], [101, "Jane"], [102, "Tom"] ] 
	};
	var hash = rs2MultiHash(rs, "name");  

	// 结果为
	hash = {
		"Tom": [{id: 100, name: "Tom"}, {id: 102, name: "Tom"}],
		"Jane": [{id: 101, name: "Jane"}]
	};

key也可以是一个函数，返回实际的key值，示例，按生日年份分组：

	var rs = {
		h: ["id", "name", "birthday"], 
		d: [ [100, "Tom", "1998-10-1"], [101, "Jane", "1999-1-10"], [102, "Tom", "1998-3-8"] ] 
	};
	// 按生日年份分组
	var hash = rs2MultiHash(rs, function (o) {
		var m = o.birthday.match(/^\d+/);
		return m && m[0];
	});

	// 结果为
	hash = {
		"1998": [{id: 100, name: "Tom", birthday: "1998-10-1"}, {id: 102, name: "Tom", birthday:"1998-3-8"}],
		"1999": [{id: 101, name: "Jane", birthday: "1999-1-10"}]
	};

@see rs2Hash
@see rs2Array
*/
self.rs2MultiHash = rs2MultiHash;
function rs2MultiHash(rs, key)
{
	var ret = {};
	var colCnt = rs.h.length;
	var keyfn;
	if (typeof(key) == "function")
		keyfn = key;
	for (var i=0; i<rs.d.length; ++i) {
		var obj = {};
		var row = rs.d[i];
		for (var j=0; j<colCnt; ++j) {
			obj[rs.h[j]] = row[j];
		}
		var k = keyfn?  keyfn(obj): obj[key];
		if (ret[ k ] === undefined)
			ret[ k ] = [obj];
		else
			ret[ k ].push(obj);
	}
	return ret;
}

/**
@fn list2varr(ls, sep=':', sep2=',')

将字符串代表的压缩表("v1:v2:v3,...")转成对象数组。

e.g.

	var users = "101:andy,102:beddy";
	var varr = list2varr(users);
	// varr = [["101", "andy"], ["102", "beddy"]];
	var arr = rs2Array({h: ["id", "name"], d: varr});
	// arr = [ {id: 101, name: "andy"}, {id: 102, name: "beddy"} ];
	
	var cmts = "101\thello\n102\tgood";
	var varr = list2varr(cmts, "\t", "\n");
	// varr=[["101", "hello"], ["102", "good"]]
 */
self.list2varr = list2varr;
function list2varr(ls, sep, sep2)
{
	if (sep == null)
		sep = ':';
	if (sep2 == null)
		sep2 = ',';
	var ret = [];
	$.each(ls.split(sep2), function () {
		if (this.length == 0)
			return;
		ret.push(this.split(sep));
	});
	return ret;
}

/**
@fn objarr2list(objarr, fields, sep=':', sep2=',')

将对象数组转成字符串代表的压缩表("v1:v2:v3,...")。

示例：

	var objarr = [
		{id:100, name:'name1', qty:2},
		{id:101, name:'name2', qty:3}
	];
	var list = objarr2list(objarr, ["id","qty"]);
	// 返回"100:2,101:3"

	var list2 = objarr2list(objarr, function (e, i) { return e.id + ":" + e.qty; });
	// 结果同上
 */
self.objarr2list = objarr2list;
function objarr2list(objarr, fields, sep, sep2)
{
	sep = sep || ':';
	sep2 = sep2 || ',';

	var fn = $.isFunction(fields) ? fields : function (e, i) {
		var row = '';
		$.each(fields, function (j, e1) {
			if (row.length > 0)
				row += sep;
			row += e[e1];
		});
		return row;
	};
	return $.map(objarr, fn).join(sep2);
}


//}}}

/**
@fn intSort(a, b)

整数排序. 用于datagrid column sorter:

	<th data-options="field:'id', sortable:true, sorter:intSort">编号</th>

 */
self.intSort = intSort;
function intSort(a, b)
{
	return parseInt(a) - parseInt(b);
}

/**
@fn numberSort(a, b)

小数排序. 用于datagrid column sorter:

	<th data-options="field:'score', sortable:true, sorter:numberSort">评分</th>

 */
self.numberSort = numberSort;
function numberSort(a, b)
{
	return parseFloat(a) - parseFloat(b);
}

/**
@fn getAncestor(o, fn)

取符合条件(fn)的对象，一般可使用$.closest替代
*/
self.getAncestor = getAncestor;
function getAncestor(o, fn)
{
	while (o) {
		if (fn(o))
			return o;
		o = o.parentElement;
	}
	return o;
}

/**
@fn appendParam(url, param)

示例:

	var url = "http://xxx/api.php";
	if (a)
		url = appendParam(url, "a=" + a);
	if (b)
		url = appendParam(url, "b=" + b);

	appendParam(url, $.param({a:1, b:3}));

支持url中带有"?"或"#"，如

	var url = "http://xxx/api.php?id=1#order";
	appendParam(url, "pay=1"); // "http://xxx/api.php?id=1&pay=1#order";

*/
self.appendParam = appendParam;
function appendParam(url, param)
{
	if (param == null)
		return url;
	var ret;
	var a = url.split("#");
	ret = a[0] + (url.indexOf('?')>=0? "&": "?") + param;
	if (a.length > 1) {
		ret += "#" + a[1];
	}
	return ret;
}

/**
@fn deleteParam(url, paramName)

示例:

	var url = "http://xxx/api.php?a=1&b=3&c=2";
	var url1 = deleteParam(url, "b"); // "http://xxx/api.php?a=1&c=2";

*/
self.deleteParam = deleteParam;
function deleteParam(url, paramName)
{
	var ret = url.replace(new RegExp('&?' + paramName + "=[^&#]+"), '');
	if (ret.indexOf('?&') >=0) {
		ret = ret.replace('?&', '?');
	}
	return ret;
}

/** @fn isWeixin()
当前应用运行在微信中。
*/
self.isWeixin = isWeixin;
function isWeixin()
{
	return /micromessenger/i.test(navigator.userAgent);
}

/** @fn isIOS()
当前应用运行在IOS平台，如iphone或ipad中。
*/
self.isIOS = isIOS;
function isIOS()
{
	return /iPhone|iPad/i.test(navigator.userAgent);
}

/** @fn isAndroid()
当前应用运行在安卓平台。
*/
self.isAndroid = isAndroid;
function isAndroid()
{
	return /Android/i.test(navigator.userAgent);
}

/**
@fn parseValue(str)

如果str符合整数或小数，则返回相应类型。
 */
self.parseValue = parseValue;
function parseValue(str)
{
	if (str == null)
		return str;
	var val = str;
	if (/^-?[0-9]+$/.test(str)) {
		val = parseInt(str);
	}
	if (/^-?[0-9.]+$/.test(str)) {
		val = parseFloat(str);
	}
	return val;
}

/**
@fn applyTpl(tpl, data)

对模板做字符串替换

	var tpl = "<li><p>{name}</p><p>{dscr}</p></li>";
	var data = {name: 'richard', dscr: 'hello'};
	var html = applyTpl(tpl, data);
	// <li><p>richard</p><p>hello</p></li>

*/
self.applyTpl = applyTpl;
function applyTpl(tpl, data)
{
	return tpl.replace(/{(\w+)}/g, function(m0, m1) {
		return data[m1];
	});
}

/**
@fn delayDo(fn, delayCnt?=3)

设置延迟执行。当delayCnt=1时与setTimeout效果相同。
多次置于事件队列最后，一般3次后其它js均已执行完毕，为idle状态
*/
self.delayDo = delayDo;
function delayDo(fn, delayCnt)
{
	if (delayCnt == null)
		delayCnt = 3;
	doIt();
	function doIt()
	{
		if (delayCnt == 0)
		{
			fn();
			return;
		}
		-- delayCnt;
		setTimeout(doIt);
	}
}

/**
@fn kvList2Str(kv, sep, sep2)

e.g.

	var str = kvList2Str({"CR":"Created", "PA":"Paid"}, ';', ':');
	// str="CR:Created;PA:Paid"

 */
self.kvList2Str = kvList2Str;
function kvList2Str(kv, sep, sep2)
{
	var ret = '';
	$.each(kv, function (k, v) {
		if (typeof(v) != "function") {
			if (ret)
				ret += sep;
			ret += k  + sep2 + v;
		}
	});
	return ret;
}

/**
@fn parseKvList(kvListStr, sep, sep2) -> kvMap

解析key-value列表字符串，返回kvMap。
示例：

	var map = parseKvList("CR:新创建;PA:已付款", ";", ":");
	// map: {"CR": "新创建", "PA":"已付款"}
*/
self.parseKvList = parseKvList;
function parseKvList(str, sep, sep2)
{
	var map = {};
	$.each(str.split(sep), function (i, e) {
		var kv = e.split(sep2, 2);
		//assert(kv.length == 2, "bad kvList: " + str);
		if (kv.length < 2) {
			kv[1] = kv[0];
		}
		map[kv[0]] = kv[1];
	});
	return map;
}

function initModule()
{
	// bugfix: 浏览器兼容性问题
	if (String.prototype.startsWith == null) {
		String.prototype.startsWith = function (s) { return this.substr(0, s.length) == s; }
	}

	if (window.console === undefined) {
		window.console = {
			log:function () {}
		}
	}
}
initModule();

}/*jdcloud common*/

/**
@fn jdModule(name?, fn?)

定义JS模块。这是一个全局函数。

定义一个模块:

	jdModule("jdcloud.common", JdcloudCommon);
	function JdcloudCommon() {
		var self = this;
		
		// 对外提供一个方法
		self.rs2Array = rs2Array;
		function rs2Array(rs)
		{
			return ...;
		}
	}

获取模块对象:

	var mCommon = jdModule("jdcloud.common");
	var arr = mCommon.rs2Array(rs);

返回模块映射列表。

	var moduleMap = jdModule(); // 返回 { "jdcloud.common": JdcloudCommon, ... }

*/
function jdModule(name, fn, overrideCtor)
{
	if (!window.jdModuleMap) {
		window.jdModuleMap = {};
	}

	if (name == null) {
		return window.jdModuleMap;
	}

	var ret;
	if (fn instanceof Function) {
		if (window.jdModuleMap[name]) {
			fn.call(window.jdModuleMap[name]);
		}
		else {
			window.jdModuleMap[name] = new fn();
		}
		ret = window.jdModuleMap[name];
		if (overrideCtor)
			ret.constructor = fn;
		/*
		// e.g. create window.jdcloud.common
		var arr = name.split('.');
		var obj = window;
		for (var i=0; i<arr.length; ++i) {
			if (i == arr.length-1) {
				obj[arr[i]] = ret;
				break;
			}
			if (! (arr[i] in obj)) {
				obj[arr[i]] = {};
			}
			obj = obj[arr[i]];
		}
		*/
	}
	else {
		ret = window.jdModuleMap[name];
		if (!ret) {
			throw "load module fails: " + name;
		}
	}
	return ret;
}

// vi: foldmethod=marker 
// ====== WEBCC_END_FILE common.js }}}

// ====== WEBCC_BEGIN_FILE commonjq.js {{{
jdModule("jdcloud.common", JdcloudCommonJq);
function JdcloudCommonJq()
{
var self = this;

self.assert(window.jQuery, "require jquery lib.");
/**
@fn getFormData(jo)

取DOM对象中带name属性的子对象的内容, 放入一个JS对象中, 以便手工调用callSvr.

注意: 

- 这里Form不一定是Form标签, 可以是一切DOM对象.
- 如果DOM对象有disabled属性, 则会忽略它, 这也与form提交时的规则一致.

与setFormData配合使用时, 可以只返回变化的数据.

	jf.submit(function () {
		var ac = jf.attr("action");
		callSvr(ac, fn, getFormData(jf));
	});

如果在jo对象中存在有name属性的file组件(input[type=file][name])，或指定了属性enctype="multipart/form-data"，则调用getFormData会返回FormData对象而非js对象，
再调用callSvr时，会以"multipart/form-data"格式提交数据。一般用于上传文件。
示例：

	<div>
		课程文档
		<input name="pdf" type="file" accept="application/pdf">
	</div>

或传统地：

	<form method="POST" enctype='multipart/form-data'>
		课程文档
		<input name="pdf" type="file" accept="application/pdf">
	</form>

@see setFormData
 */
self.getFormData = getFormData;
function getFormData(jo)
{
	var data = {};
	var isFormData = false;
	var enctype = jo.attr("enctype");
	if ( (enctype && enctype.toLowerCase() == "multipart/form-data") || jo.has("[name]:file").size() >0) {
		isFormData = true;
		data = new FormData();
	}
	var orgData = jo.data("origin_") || {};
	formItems(jo, function (name, content) {
		var ji = this;
		var orgContent = orgData[name];
		if (orgContent == null)
			orgContent = "";
		if (content == null)
			content = "";
		if (content !== String(orgContent)) // 避免 "" == 0 或 "" == false
		{
			if (! isFormData) {
				data[name] = content;
			}
			else {
				if (ji.is(":file")) {
					// 支持指定multiple，如  <input name="pdf" type="file" multiple accept="application/pdf">
					$.each(ji.prop("files"), function (i, e) {
						data.append(name, e);
					});
				}
				else {
					data.append(name, content);
				}
			}
		}
	});
	return data;
}

/**
@fn formItems(jo, cb)

遍历jo下带name属性的有效控件，回调cb函数。

注意:

- 忽略有disabled属性的控件
- 忽略未选中的checkbox/radiobutton

@param cb(name, val) this=ji=当前jquery对象
当cb返回false时可中断遍历。

 */
self.formItems = formItems;
function formItems(jo, cb)
{
	jo.find("[name]:not([disabled])").each (function () {
		var name = this.name;
		if (! name)
			return;

		var ji = $(this);
		var val;
		if (ji.is(":input")) {
			if (this.type == "checkbox" && !this.checked)
				return;
			if (this.type == "radio" && !this.checked)
				return;
			val = ji.val();
		}
		else {
			val = ji.html();
		}
		if (cb.call(ji, name,  val) === false)
			return false;
	});
}

/**
@fn setFormData(jo, data?, opt?)

用于为带name属性的DOM对象设置内容为data[name].
要清空所有内容, 可以用 setFormData(jo), 相当于增强版的 form.reset().

注意:
- DOM项的内容指: 如果是input/textarea/select等对象, 内容为其value值; 如果是div组件, 内容为其innerHTML值.
- 当data[name]未设置(即值为undefined, 注意不是null)时, 对于input/textarea等组件, 行为与form.reset()逻辑相同, 
 即恢复为初始化值, 除了input[type=hidden]对象, 它的内容不会变.
 对div等其它对象, 会清空该对象的内容.
- 如果对象设置有属性"noReset", 则不会对它进行设置.

@param opt {setOrigin?=false}

选项 setOrigin: 为true时将data设置为数据源, 这样在getFormData时, 只会返回与数据源相比有变化的数据.
缺省会设置该DOM对象数据源为空.

对象关联的数据源, 可以通过 jo.data("origin_") 来获取, 或通过 jo.data("origin_", newOrigin) 来设置.

示例：

	<div id="div1">
		<p>订单描述：<span name="dscr"></span></p>
		<p>状态为：<input type=text name="status"></p>
		<p>金额：<span name="amount"></span>元</p>
	</div>

Javascript:

	var data = {
		dscr: "筋斗云教程",
		status: "已付款",
		amount: "100"
	};
	var jo = $("#div1");
	var data = setFormData(jo, data); 
	$("[name=status]").html("已完成");
	var changedData = getFormData(jo); // 返回 { dscr: "筋斗云教程", status: "已完成", amount: "100" }

	var data = setFormData(jo, data, {setOrigin: true}); 
	$("[name=status]").html("已完成");
	var changedData = getFormData(jo); // 返回 { status: "已完成" }
	$.extend(jo.data("origin_"), changedData); // 合并变化的部分到数据源.

@see getFormData
 */
self.setFormData = setFormData;
function setFormData(jo, data, opt)
{
	var opt1 = $.extend({
		setOrigin: false
	}, opt);
	if (data == null)
		data = {};
	var jo1 = jo.filter("[name]:not([noReset])");
	jo.find("[name]:not([noReset])").add(jo1).each (function () {
		var ji = $(this);
		var name = ji.attr("name");
		var content = data[name];
		var isInput = ji.is(":input");
		if (content === undefined) {
			if (isInput) {
				if (ji[0].tagName === "TEXTAREA")
					content = ji.html();
				else
					content = ji.attr("value");
				if (content === undefined)
					content = "";
			}
			else {
				content = "";
			}
		}
		if (ji.is(":input")) {
			ji.val(content);
		}
		else {
			ji.html(content);
		}
	});
	jo.data("origin_", opt1.setOrigin? data: null);
}

/**
@fn loadScript(url, fnOK?, ajaxOpt?)

@param fnOK 加载成功后的回调函数
@param ajaxOpt 传递给$.ajax的额外选项。

默认未指定ajaxOpt时，简单地使用添加script标签机制异步加载。如果曾经加载过，可以重用cache。

如果指定ajaxOpt，且非跨域，则通过ajax去加载，可以支持同步调用。如果是跨域，仍通过script标签方式加载，注意加载完成后会自动删除script标签。

返回defered对象(与$.ajax类似)，可以用 dfd.then() / dfd.fail() 异步处理。

常见用法：

- 动态加载一个script，异步执行其中内容：

		loadScript("1.js", onload); // onload中可使用1.js中定义的内容
		loadScript("http://otherserver/path/1.js"); // 跨域加载

- 加载并立即执行一个script:

		loadScript("1.js", {async: false});
		// 可立即使用1.js中定义的内容
	
	注意：如果是跨域加载，不支持同步调用（$.ajax的限制），如：

		loadScript("http://oliveche.com/1.js", {async: false});
		// 一旦跨域，选项{async:false}指定无效，不可立即使用1.js中定义的内容。

如果要动态加载script，且使用后删除标签（里面定义的函数会仍然保留），建议直接使用`$.getScript`，它等同于：

	loadScript("1.js", {cache: false});

*/
self.loadScript = loadScript;
function loadScript(url, fnOK, options)
{
	if ($.isPlainObject(fnOK)) {
		options = fnOK;
		fnOK = null;
	}
	if (options) {
		var ajaxOpt = $.extend({
			dataType: "script",
			cache: true,
			success: fnOK,
			url: url,
			error: function (xhr, textStatus, err) {
				console.log("*** loadScript fails for " + url);
				console.log(err);
			}
		}, options);

		return jQuery.ajax(ajaxOpt);
	}

	var dfd_ = $.Deferred();
	var script= document.createElement('script');
	script.type= 'text/javascript';
	script.src= url;
	// script.async = !sync; // 不是同步调用的意思，参考script标签的async属性和defer属性。
	script.onload = function () {
		if (fnOK)
			fnOK();
		dfd_.resolve();
	}
	script.onerror = function () {
		dfd_.reject();
		console.log("*** loadScript fails for " + url);
	}
	document.head.appendChild(script);
	return dfd_;
}

/**
@fn setDateBox(jo, defDateFn?)

设置日期框, 如果输入了非法日期, 自动以指定日期(如未指定, 用当前日期)填充.

	setDateBox($("#txtComeDt"), function () { return genDefVal()[0]; });

 */
self.setDateBox = setDateBox;
function setDateBox(jo, defDateFn)
{
	jo.blur(function () {
		var dt = self.parseDate(this.value);
		if (dt == null) {
			if (defDateFn)
				dt = defDateFn();
			else
				dt = new Date();
		}
		this.value = dt.format("D");
	});
}

/**
@fn setTimeBox(jo, defTimeFn?)

设置时间框, 如果输入了非法时间, 自动以指定时间(如未指定, 用当前时间)填充.

	setTimeBox($("#txtComeTime"), function () { return genDefVal()[1]; });

 */
self.setTimeBox = setTimeBox;
function setTimeBox(jo, defTimeFn)
{
	jo.blur(function () {
		var dt = self.parseTime(this.value);
		if (dt == null) {
			if (defTimeFn)
				dt = defTimeFn();
			else
				dt = new Date();
		}
		this.value = dt.format("HH:MM");
	});
}

/**
@fn waitFor(deferredObj)

用于简化异步编程. 可将不易读的回调方式改写为易读的顺序执行方式.

	var dfd = $.getScript("http://...");
	function onSubmit()
	{
		dfd.then(function () {
			foo();
			bar();
		});
	}

可改写为:

	function onSubmit()
	{
		if (waitFor(dfd)) return;
		foo();
		bar();
	}

*/
self.waitFor = waitFor;
function waitFor(dfd)
{
	if (waitFor.caller == null)
		throw "waitFor MUST be called in function!";

	if (dfd.state() == "resolved")
		return false;

	if (!dfd.isset_)
	{
		var caller = waitFor.caller;
		var args = caller.arguments;
		dfd.isset_ = true;
		dfd.then(function () { caller.apply(this, args); });
	}
	return true;
}

/**
@fn rgb2hex(rgb)

将jquery取到的颜色转成16进制形式，如："rgb(4, 190, 2)" -> "#04be02"

示例：

	var color = rgb2hex( $(".mui-container").css("backgroundColor") );

 */
self.rgb2hex = rgb2hex;
function rgb2hex(rgb)
{
	var ms = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	if (ms == null)
		return;
	var hex = "#";
	for (var i = 1; i <= 3; ++i) {
		var s = parseInt(ms[i]).toString(16);
		if (s.length == 1) {
			hex += "0" + s;
		}
		else {
			hex += s;
		}
	}
	return hex;
}

/**
@fn jQuery.fn.jdata(val?)

和使用$.data()差不多，更好用一些. 例：

	$(o).jdata().hello = 100;
	$(o).jdata({hello:100, world:200});

*/
$.fn.jdata = function (val) {
	if (val != null) {
		this.data("jdata", val);
		return val;
	}
	var jd = this.data("jdata");
	if (jd == null)
		jd = this.jdata({});
	return jd;
}

/**
@fn compressImg(img, cb, opt)

通过限定图片大小来压缩图片，用于图片预览和上传。
不支持IE8及以下版本。

- img: Image对象
- cb: Function(picData) 回调函数
- opt: {quality=0.8, maxSize=1280, mimeType?="image/jpeg"}
- opt.maxSize: 压缩完后宽、高不超过该值。为0表示不压缩。
- opt.quality: 0.0-1.0之间的数字。
- opt.mimeType: 输出MIME格式。

函数cb的回调参数: picData={b64src,blob,w,h,w0,h0,quality,name,mimeType,size0,size,b64size,info}

b64src为base64格式的Data URL, 如 "data:image/jpeg;base64,/9j/4AAQSk...", 用于给image或background-image赋值显示图片；

可以赋值给Image.src:

	var img = new Image();
	img.src = picData.b64src;

或

	$("<div>").css("background-image", "url(" + picData.b64src + ")");

blob用于放到FormData中上传：

	fd.append('file', picData.blob, picData.name);

其它picData属性：

- w0,h0,size0分别为原图宽、高、大小; w,h,size为压缩后图片的宽、高、大小。
- quality: jpeg压缩质量,0-1之间。
- mimeType: 输出的图片格式
- info: 提示信息，会在console中显示。用于调试。

**[预览和上传示例]**

HTML:

	<form action="upfile.php">
		<div class="img-preview"></div>
		<input type="file" /><br/>
		<input type="submit" >
	</form>

用picData.b64src来显示预览图，并将picData保存在img.picData_属性中，供后面上传用。

	var jfrm = $("form");
	var jpreview = jfrm.find(".img-preview");
	var opt = {maxSize:1280};
	jfrm.find("input[type=file]").change(function (ev) {
		$.each(this.files, function (i, fileObj) {
			compressImg(fileObj, function (picData) {
				$("<img>").attr("src", picData.b64src)
					.prop("picData_", picData)
					.appendTo(jpreview);
				//$("<div>").css("background-image", "url("+picData.b64src+")").appendTo(jpreview);
			}, opt);
		});
		this.value = "";
	});

上传picData.blob到服务器

	jfrm.submit(function (ev) {
		ev.preventDefault();

		var fd = new FormData();
		var idx = 1;
		jpreview.find("img").each(function () {
			// 名字要不一样，否则可能会覆盖
			fd.append('file' + idx, this.picData_.blob, this.picData_.name);
			++idx;
		});
	 
		$.ajax({
			url: jfrm.attr("action"),
			data: fd,
			processData: false,
			contentType: false,
			type: 'POST',
			// 允许跨域调用
			xhrFields: {
				withCredentials: true
			},
			success: cb
		});
		return false;
	});

参考：JIC.js (https://github.com/brunobar79/J-I-C)

TODO: 用完后及时释放内存，如调用revokeObjectURL等。
 */
self.compressImg = compressImg;
function compressImg(fileObj, cb, opt)
{
	var opt0 = {
		quality: 0.8,
		maxSize: 1280,
		mimeType: "image/jpeg"
	};
	opt = $.extend(opt0, opt);

	// 部分旧浏览器使用BlobBuilder的（如android-6.0, mate7自带浏览器）, 压缩率很差。不如直接上传。而且似乎是2M左右文件浏览器无法上传，导致服务器收不到。
	window.BlobBuilder = (window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder);
 	var doDowngrade = !window.Blob 
			|| window.BlobBuilder;
	if (doDowngrade) {
		var rv = {
			name: fileObj.name,
			size: fileObj.size,
			b64src: window.URL.createObjectURL(fileObj),
			blob: fileObj,
		};
		rv.info = "compress ignored. " + rv.name + ": " + (rv.size/1024).toFixed(0) + "KB";
		console.log(rv.info);
		cb(rv);
		return;
	}

	var img = new Image();
	// 火狐7以下版本要用 img.src = fileObj.getAsDataURL();
	img.src = window.URL.createObjectURL(fileObj);
	img.onload = function () {
		var rv = resizeImg(img);
		rv.info = "compress " + rv.name + " q=" + rv.quality + ": " + rv.w0 + "x" + rv.h0 + "->" + rv.w + "x" + rv.h + ", " + (rv.size0/1024).toFixed(0) + "KB->" + (rv.size/1024).toFixed(0) + "KB(rate=" + (rv.size / rv.size0 * 100).toFixed(2) + "%,b64=" + (rv.b64size/1024).toFixed(0) + "KB)";
		console.log(rv.info);
		cb(rv);
	}

	// return: {w, h, quality, size, b64src}
	function resizeImg()
	{
		var w = img.naturalWidth, h = img.naturalHeight;
		if (opt.maxSize<w || opt.maxSize<h) {
			if (w > h) {
				h = Math.round(h * opt.maxSize / w);
				w = opt.maxSize;
			}
			else {
				w = Math.round(w * opt.maxSize / h);
				h = opt.maxSize;
			}
		}

		var cvs = document.createElement('canvas');
		cvs.width = w;
		cvs.height = h;

		var ctx = cvs.getContext("2d").drawImage(img, 0, 0, w, h);
		var b64src = cvs.toDataURL(opt.mimeType, opt.quality);
		var blob = getBlob(b64src);
		// 无压缩效果，则直接用原图
		if (blob.size > fileObj.size) {
			blob = fileObj;
			b64src = img.src;
			opt.mimeType = fileObj.type;
		}
		// 如果没有扩展名或文件类型发生变化，自动更改扩展名
		var fname = getFname(fileObj.name, opt.mimeType);
		return {
			w0: img.naturalWidth,
			h0: img.naturalHeight,
			w: w,
			h: h,
			quality: opt.quality,
			mimeType: opt.mimeType,
			b64src: b64src,
			name: fname,
			blob: blob,
			size0: fileObj.size,
			b64size: b64src.length,
			size: blob.size
		};
	}

	function getBlob(b64src) 
	{
		var bytes = window.atob(b64src.split(',')[1]); // "data:image/jpeg;base64,{b64data}"
		//var ab = new ArrayBuffer(bytes.length);
		var ia = new Uint8Array(bytes.length);
		for(var i = 0; i < bytes.length; i++){
			ia[i] = bytes.charCodeAt(i);
		}
		var blob;
		try {
			blob = new Blob([ia.buffer], {type: opt.mimeType});
		}
		catch(e){
			// TypeError old chrome and FF
			if (e.name == 'TypeError' && window.BlobBuilder){
				var bb = new BlobBuilder();
				bb.append(ia.buffer);
				blob = bb.getBlob(opt.mimeType);
			}
			else{
				// We're screwed, blob constructor unsupported entirely   
			}
		}
		return blob;
	}

	function getFname(fname, mimeType)
	{
		var exts = {
			"image/jpeg": ".jpg",
			"image/png": ".png",
			"image/webp": ".webp"
		};
		var ext1 = exts[mimeType];
		if (ext1 == null)
			return fname;
		return fname.replace(/(\.\w+)?$/, ext1);
	}
}

/**
@fn getDataOptions(jo, defVal?)
@key data-options

读取jo上的data-options属性，返回JS对象。例如：

	<div data-options="a:1,b:'hello',c:true"></div>

上例可返回 `{a:1, b:'hello', c:true}`.

也支持各种表达式及函数调用，如：

	<div data-options="getSomeOption()"></div>

@see getOptions
 */
self.getDataOptions = getDataOptions;
function getDataOptions(jo, defVal)
{
	var optStr = jo.attr("data-options");
	var opts;
	try {
		if (optStr != null) {
			if (optStr.indexOf(":") > 0) {
				opts = eval("({" + optStr + "})");
			}
			else {
				opts = eval("(" + optStr + ")");
			}
		}
	}catch (e) {
		alert("bad data-options: " + optStr);
	}
	return $.extend({}, defVal, opts);
}

/**
@fn triggerAsync(jo, ev, paramArr)

触发含有异步操作的事件，在异步事件完成后继续。兼容同步事件处理函数，或多个处理函数中既有同步又有异步。
返回Deferred对象，或false表示要求取消之后操作。

@param ev 事件名，或事件对象$.Event()

示例：以事件触发方式调用jo的异步方法submit:

	var dfd = WUI.triggerAsync(jo, 'submit');
	if (dfd === false)
		return;
	dfd.then(doNext);

	function doNext() { }

jQuery对象这样提供异步方法：triggerAsync会用事件对象ev创建一个dfds数组，将Deferred对象存入即可支持异步调用。

	jo.on('submit', function (ev) {
		var dfd = $.ajax("upload", ...);
		if (ev.dfds)
			ev.dfds.push(dfd);
	});

*/
self.triggerAsync = triggerAsync;
function triggerAsync(jo, ev, paramArr)
{
	if (typeof(ev) == "string") {
		ev = $.Event(ev);
	}
	ev.dfds = [];
	jo.trigger(ev, paramArr);
	if (ev.isDefaultPrevented())
		return false;
	return $.when.apply(this, ev.dfds);
}

}
// ====== WEBCC_END_FILE commonjq.js }}}

// ====== WEBCC_BEGIN_FILE app.js {{{
function JdcloudApp()
{
var self = this;
self.ctx = self.ctx || {};

window.E_AUTHFAIL=-1;
window.E_NOAUTH=2;
window.E_ABORT=-100;

/**
@fn evalAttr(jo, name)

返回一个属性做eval后的js值。

示例：读取一个对象值：

	var opt = evalAttr(jo, "data-opt");

	<div data-opt="{id:1, name:\"data1\"}"><div>

考虑兼容性，也支持忽略括号的写法，

	<div data-opt="id:1, name:\"data1\""><div>

读取一个数组：

	var arr = evalAttr(jo, "data-arr");

	<div data-arr="['aa', 'bb']"><div>

读取一个函数名（或变量）:

	var fn = evalAttr(jo, "mui-initfn");

	<div mui-initfn="initMyPage"><div>

*/
self.evalAttr = evalAttr;
function evalAttr(jo, name, ctx)
{
	var val = jo.attr(name);
	if (val) {
		if (val[0] != '{' && val.indexOf(":")>0) {
			val1 = "({" + val + "})";
		}
		else {
			val1 = "(" + val + ")";
		}
		try {
			val = eval(val1);
		}
		catch (ex) {
			self.app_alert("属性`" + name + "'格式错误: " + val, "e");
			val = null;
		}
	}
	return val;
}

/*
如果逻辑页中的css项没有以"#{pageId}"开头，则自动添加：

	.aa { color: red} .bb p {color: blue}
	.aa, .bb { background-color: black }

=> 

	#page1 .aa { color: red} #page1 .bb p {color: blue}
	#page1 .aa, #page1 .bb { background-color: black }

注意：

- 逗号的情况；
- 有注释的情况
- 支持括号嵌套，如

		@keyframes modalshow {
			from { transform: translate(10%, 0); }
			to { transform: translate(0,0); }
		}
		
- 不处理"@"开头的选择器，如"media", "@keyframes"等。
*/
self.ctx.fixPageCss = fixPageCss;
function fixPageCss(css, selector)
{
	var prefix = selector + " ";

	var level = 1;
	var css1 = css.replace(/\/\*(.|\s)*?\*\//g, '')
	.replace(/([^{}]*)([{}])/g, function (ms, text, brace) {
		if (brace == '}') {
			-- level;
			return ms;
		}
		if (brace == '{' && level++ != 1)
			return ms;

		// level=1
		return ms.replace(/((?:^|,)\s*)([^,{}]+)/g, function (ms, ms1, sel) { 
			if (sel.startsWith(prefix) || sel[0] == '@')
				return ms;
			return ms1 + prefix + sel;
		});
	});
	return css1;
}

/**
@fn app_abort()

中止之后的调用, 直接返回.
*/
self.app_abort = app_abort;
function app_abort()
{
	throw new DirectReturn();
}

/**
@class DirectReturn

直接返回. 用法:

	throw new DirectReturn();

可直接调用app_abort();
*/
window.DirectReturn = function () {}

/**
@fn setOnError()

一般框架自动设置onerror函数；如果onerror被其它库改写，应再次调用该函数。
allow throw("abort") as abort behavior.
 */
self.setOnError = setOnError;
function setOnError()
{
	var fn = window.onerror;
	window.onerror = function (msg, script, line, col, errObj) {
		if (fn && fn.apply(this, arguments) === true)
			return true;
		if (errObj instanceof DirectReturn || /abort$/.test(msg) || (!script && !line))
			return true;
		debugger;
		var content = msg + " (" + script + ":" + line + ":" + col + ")";
		if (errObj && errObj.stack)
			content += "\n" + errObj.stack.toString();
		if (self.syslog)
			self.syslog("fw", "ERR", content);
		app_alert(msg, "e");
		// 出错后尝试恢复callSvr变量
		setTimeout(function () {
			$.active = 0;
			self.isBusy = 0;
			self.hideLoading();
		}, 1000);
	}
}
setOnError();

// ------ enhanceWithin {{{
/**
@var m_enhanceFn
*/
self.m_enhanceFn = {}; // selector => enhanceFn

/**
@fn enhanceWithin(jparent)
*/
self.enhanceWithin = enhanceWithin;
function enhanceWithin(jp)
{
	$.each(self.m_enhanceFn, function (sel, fn) {
		var jo = jp.find(sel);
		if (jp.is(sel))
			jo = jo.add(jp);
		if (jo.size() == 0)
			return;
		jo.each(function (i, e) {
			var je = $(e);
			var opt = getOptions(je);
			if (opt.enhanced)
				return;
			opt.enhanced = true;
			fn(je);
		});
	});
}

/**
@fn getOptions(jo, defVal?)

第一次调用，根据jo上设置的data-options属性及指定的defVal初始化，或为`{}`。
存到jo.prop("muiOptions")上。之后调用，直接返回该属性。

@see getDataOptions
*/
self.getOptions = getOptions;
function getOptions(jo, defVal)
{
	var opt = jo.prop("muiOptions");
	if (opt === undefined) {
		opt = self.getDataOptions(jo, defVal);
		jo.prop("muiOptions", opt);
	}
	return opt;
}

//}}}

// 参考 getQueryCond中对v各种值的定义
function getop(v)
{
	if (typeof(v) == "number")
		return "=" + v;
	var op = "=";
	var is_like=false;
	var ms;
	if (ms=v.match(/^(<>|>=?|<=?|!=?)/)) {
		op = ms[1];
		v = v.substr(op.length);
		if (op == "!" || op == "!=")
			op = "<>";
	}
	else if (v.indexOf("*") >= 0 || v.indexOf("%") >= 0) {
		v = v.replace(/[*]/g, "%");
		op = " like ";
	}
	v = $.trim(v);

	if (v === "null")
	{
		if (op == "<>")
			return " is not null";
		return " is null";
	}
	if (v === "empty")
		v = "";
	if (v.length == 0 || v.match(/\D/) || v[0] == '0') {
		v = v.replace(/'/g, "\\'");
// 		// ???? 只对access数据库: 支持 yyyy-mm-dd, mm-dd, hh:nn, hh:nn:ss
// 		if (!is_like && v.match(/^((19|20)\d{2}[\/.-])?\d{1,2}[\/.-]\d{1,2}$/) || v.match(/^\d{1,2}:\d{1,2}(:\d{1,2})?$/))
// 			return op + "#" + v + "#";
		return op + "'" + v + "'";
	}
	return op + v;
}

/**
@fn getQueryCond(kvList)
@var queryHint 查询用法提示

@param kvList {key=>value}, 键值对，值中支持操作符及通配符。也支持格式 [ [key, value] ], 这时允许key有重复。

根据kvList生成BPQ协议定义的{obj}.query的cond参数。

例如:

	var kvList = {phone: "13712345678", id: ">100", addr: "上海*", picId: "null"};
	WUI.getQueryCond(kvList);

有多项时，每项之间以"AND"相连，以上定义将返回如下内容：

	"phone='13712345678' AND id>100 AND addr LIKE '上海*' AND picId IS NULL"

示例二：

	var kvList = [ ["phone", "13712345678"], ["id", ">100"], ["addr", "上海*"], ["picId", "null"] ];
	WUI.getQueryCond(kvList); // 结果同上。


设置值时，支持以下格式：

- {key: "value"} - 表示"key=value"
- {key: ">value"} - 表示"key>value", 类似地，可以用 >=, <, <=, <>(或! / != 都是不等于) 这些操作符。
- {key: "value*"} - 值中带通配符，表示"key like 'value%'" (以value开头), 类似地，可以用 "*value", "*value*", "*val*ue"等。
- {key: "null" } - 表示 "key is null"。要表示"key is not null"，可以用 "<>null".
- {key: "empty" } - 表示 "key=''".

支持and/or查询，但不支持在其中使用括号:

- {key: ">value and <=value"}  - 表示"key>'value' and key<='value'"
- {key: "null or 0 or 1"}  - 表示"key is null or key=0 or key=1"
- {key: "null,0,1,9-100"} - 表示"key is null or key=0 or key=1 or (key>=9 and key<=100)"，即逗号表示or，a-b的形式只支持数值。
- {key: "2017-9-1~2017-10-1"} 条件等价于 ">=2017-9-1 and <2017-10-1"
  可指定时间，如条件"2017-9-1 10:00~2017-10-1"等价于">=2017-9-1 10:00 and <2017-10-1"
- 符号","及"~"前后允许有空格，如"已付款, 已完成", "2017-1-1 ~ 2018-1-1"
- 可以使用中文逗号
- 日期区间也可以用"2017/10/01"或"2017.10.01"这些格式，仅用于字段是文本类型，这时输入格式必须与保存的日期格式一致，并且"2017/10/1"应输入"2017/10/01"才能正确比较字符串大小。

以下表示的范围相同：

	{k1:'1-5,7-10', k2:'1-10 and <>6'}

符号优先级依次为："-"(类似and) ","(类似or) and or

在详情页对话框中，切换到查找模式，在任一输入框中均可支持以上格式。

@see getQueryParam
@see getQueryParamFromTable 获取datagrid的当前查询参数
*/
self.queryHint = "查询示例\n" +
	"文本：\"王小明\", \"王*\"(匹配开头), \"*上海*\"(匹配部分)\n" +
	"数字：\"5\", \">5\", \"5-10\", \"5-10,12,18\"\n" +
	"时间：\">=2017-10-1\", \"<2017-10-1 18:00\", \"2017-10\"(10月份区间), \"2017-10-01~2017-11-01\"(10月份区间)\n" +
	"高级：\"!5\"(排除5),\"1-10 and !5\", \"王*,张*\"(王某或张某), \"empty\"(为空), \"0,null\"(0或未设置)\n";

self.getQueryCond = getQueryCond;
function getQueryCond(kvList)
{
	var condArr = [];
	if ($.isPlainObject(kvList)) {
		$.each(kvList, handleOne);
	}
	else if ($.isArray(kvList)) {
		$.each(kvList, function (i, e) {
			handleOne(e[0], e[1]);
		});
	}

	function handleOne(k,v) {
		if (v == null || v === "")
			return;

		var arr = v.toString().split(/\s+(and|or)\s+/i);
		var str = '';
		var bracket = false;
		// NOTE: 根据字段名判断时间类型
		var isTm = /(Tm|^tm)\d*$/.test(k);
		var isDt = /(Dt|^dt)\d*$/.test(k);
		$.each(arr, function (i, v1) {
			if ( (i % 2) == 1) {
				str += ' ' + v1.toUpperCase() + ' ';
				bracket = true;
				return;
			}
			v1 = v1.replace(/，/g, ',');
			// a-b,c-d,e
			// dt1~dt2
			var str1 = '';
			var bracket2 = false;
			$.each(v1.split(/\s*,\s*/), function (j, v2) {
				if (str1.length > 0) {
					str1 += " OR ";
					bracket2 = true;
				}
				var mt; // match
				var isHandled = false; 
				if (isTm | isDt) {
					// "2018-5" => ">=2018-5-1 and <2018-6-1"
					// "2018-5-1" => ">=2018-5-1 and <2018-5-2" (仅限Tm类型; Dt类型不处理)
					if (mt=v2.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/)) {
						var y = parseInt(mt[1]), m = parseInt(mt[2]), d=mt[3]!=null? parseInt(mt[3]): null;
						if ( (y>1900 && y<2100) && (m>=1 && m<=12) && (d==null || (d>=1 && d<=31 && isTm)) ) {
							isHandled = true;
							var dt1, dt2;
							if (d) {
								var dt = new Date(y,m-1,d);
								dt1 = dt.format("D");
								dt2 = dt.addDay(1).format("D");
							}
							else {
								var dt = new Date(y,m-1,1);
								dt1 = dt.format("D");
								dt2 = dt.addMonth(1).format("D");
							}
							str1 += "(" + k + ">='" + dt1 + "' AND " + k + "<'" + dt2 + "')";
						}
					}
				}
				if (!isHandled) {
					// "2018-5-1~2018-10-1"
					// "2018-5-1 8:00 ~ 2018-10-1 18:00"
					if (mt=v2.match(/^(\d{4}-\d{1,2}.*?)\s*~\s*(\d{4}-\d{1,2}.*?)$/)) {
						var dt1 = mt[1], dt2 = mt[2];
						str1 += "(" + k + ">='" + dt1 + "' AND " + k + "<'" + dt2 + "')";
						isHandled = true;
					}
					// "1-99"
					else if (mt=v2.match(/^(\d+)-(\d+)$/)) {
						var a = parseInt(mt[1]), b = parseInt(mt[2]);
						if (a < b) {
							str1 += "(" + k + ">=" + mt[1] + " AND " + k + "<=" + mt[2] + ")";
							isHandled = true;
						}
					}
				}
				if (!isHandled) {
					str1 += k + getop(v2);
				}
			});
			if (bracket2)
				str += "(" + str1 + ")";
			else
				str += str1;
		});
		if (bracket)
			str = '(' + str + ')';
		condArr.push(str);
		//val[e.name] = escape(v);
		//val[e.name] = v;
	}
	return condArr.join(' AND ');
}

/**
@fn getQueryParam(kvList)

根据键值对生成BQP协议中{obj}.query接口需要的cond参数.
即 `{cond: WUI.getQueryCond(kvList) }`

示例：

	WUI.getQueryParam({phone: '13712345678', id: '>100'})
	返回
	{cond: "phone='13712345678' AND id>100"}

@see getQueryCond
@see getQueryParamFromTable 获取datagrid的当前查询参数
*/
self.getQueryParam = getQueryParam;
function getQueryParam(kvList)
{
	var ret = {};
	var cond = getQueryCond(kvList);
	if (cond)
		ret.cond = cond;
	return ret;
}

/**
@fn doSpecial(jo, filter, fn)

连续5次点击某处，执行隐藏动作。

例：
	// 连续5次点击当前tab标题，重新加载页面
	var self = WUI;
	self.doSpecial(self.tabMain.find(".tabs-header"), ".tabs-selected", function () {
		self.reloadPage();
		self.reloadDialog(true);
	});

*/
self.doSpecial = doSpecial;
function doSpecial(jo, filter, fn)
{
	jo.on("click", filter, function (ev) {
		var INTERVAL = 4; // 4s
		var MAX_CNT = 5;
		var tm = new Date();
		var obj = this;
		// init, or reset if interval 
		if (fn.cnt == null || fn.lastTm == null || tm - fn.lastTm > INTERVAL*1000 || fn.lastObj != obj)
		{
			fn.cnt = 0;
			fn.lastTm = tm;
			fn.lastObj = obj;
		}
		if (++ fn.cnt < MAX_CNT)
			return;
		fn.cnt = 0;
		fn.lastTm = tm;

		fn();
	});
}
}
// vi: foldmethod=marker
// ====== WEBCC_END_FILE app.js }}}

// ====== WEBCC_BEGIN_FILE callSvr.js {{{
function JdcloudCall()
{
var self = this;
var mCommon = jdModule("jdcloud.common");

/**
@var lastError = ctx

出错时，取出错调用的上下文信息。

ctx: {ac, tm, tv, ret}

- ac: action 调用接口名
- tm: start time 开始调用时间
- tv: time interval 从调用到返回的耗时
- ret: return value 调用返回的原始数据
*/
self.lastError = null;
var m_tmBusy;
var m_manualBusy = 0;
var m_appVer;
var m_silentCall = 0;

/**
@var disableBatch ?= false

设置为true禁用batchCall, 仅用于内部测试。
*/
self.disableBatch = false;

/**
@var m_curBatch

当前batchCall对象，用于内部调试。
*/
var m_curBatch = null;
self.m_curBatch = m_curBatch;

/**
@var mockData  模拟调用后端接口。

在后端接口尚无法调用时，可以配置MUI.mockData做为模拟接口返回数据。
调用callSvr时，会直接使用该数据，不会发起ajax请求。

mockData={ac => data/fn}  

mockData中每项可以直接是数据，也可以是一个函数：fn(param, postParam)->data

例：模拟"User.get(id)"和"User.set()(key=value)"接口：

	var user = {
		id: 1001,
		name: "孙悟空",
	};
	MUI.mockData = {
		// 方式1：直接指定返回数据
		"User.get": [0, user],

		// 方式2：通过函数返回模拟数据
		"User.set": function (param, postParam) {
			$.extend(user, postParam);
			return [0, "OK"];
		}
	}

	// 接口调用：
	var user = callSvrSync("User.get");
	callSvr("User.set", {id: user.id}, function () {
		alert("修改成功！");
	}, {name: "大圣"});

实例详见文件 mockdata.js。

在mockData的函数中，可以用this变量来取ajax调用参数。
要取HTTP动词可以用`this.type`，值为GET/POST/PATCH/DELETE之一，从而可模拟RESTful API.

可以通过MUI.options.mockDelay设置模拟调用接口的网络延时。
@see options.mockDelay

模拟数据可直接返回[code, data]格式的JSON数组，框架会将其序列化成JSON字符串，以模拟实际场景。
如果要查看调用与返回数据日志，可在浏览器控制台中设置 MUI.options.logAction=true，在控制台中查看日志。

如果设置了MUI.callSvrExt，调用名(ac)中应包含扩展(ext)的名字，例：

	MUI.callSvrExt['zhanda'] = {...};
	callSvr(['token/get-token', 'zhanda'], ...);

要模拟该接口，应设置

	MUI.mockData["zhanda:token/get-token"] = ...;

@see callSvrExt

也支持"default"扩展，如：

	MUI.callSvrExt['default'] = {...};
	callSvr(['token/get-token', 'default'], ...);
	或
	callSvr('token/get-token', ...);

要模拟该接口，可设置

	MUI.mockData["token/get-token"] = ...;

*/
self.mockData = {};

var ajaxOpt = {
	beforeSend: function (xhr) {
		// 保存xhr供dataFilter等函数内使用。
		this.xhr_ = xhr;
	},
	//dataType: "text",
	dataFilter: function (data, type) {
		if (this.jdFilter !== false && (type == "json" || type == "text")) {
			rv = defDataProc.call(this, data);
			if (rv != null)
				return rv;
			-- $.active; // ajax调用中断,这里应做些清理
			self.app_abort();
		}
		return data;
	},
	// for jquery > 1.4.2. don't convert text to json as it's processed by defDataProc.
	converters: {
		"text json": true
	},

	error: defAjaxErrProc
};
if (location.protocol == "file:") {
	ajaxOpt.xhrFields = { withCredentials: true};
}
$.ajaxSetup(ajaxOpt);

/**
@fn enterWaiting(ctx?)
@param ctx {ac, tm, tv?, tv2?, noLoadingImg?}
*/
self.enterWaiting = enterWaiting;
function enterWaiting(ctx)
{
	if (ctx && ctx.noLoadingImg) {
		++ m_silentCall;
		return;
	}
	if (self.isBusy == 0) {
		m_tmBusy = new Date();
	}
	self.isBusy = 1;
	if (ctx == null || ctx.isMock)
		++ m_manualBusy;

	// 延迟执行以防止在page show时被自动隐藏
	//mCommon.delayDo(function () {
	setTimeout(function () {
		if (self.isBusy)
			self.showLoading();
	}, 200);
// 		if ($.mobile && !(ctx && ctx.noLoadingImg))
// 			$.mobile.loading("show");
	//},1);
}

/**
@fn leaveWaiting(ctx?)
*/
self.leaveWaiting = leaveWaiting;
function leaveWaiting(ctx)
{
	if (ctx == null || ctx.isMock)
	{
		if (-- m_manualBusy < 0)
			m_manualBusy = 0;
	}
	// 当无远程API调用或js调用时, 设置isBusy=0
	mCommon.delayDo(function () {
		if (self.options.logAction && ctx && ctx.ac && ctx.tv) {
			var tv2 = (new Date() - ctx.tm) - ctx.tv;
			ctx.tv2 = tv2;
			console.log(ctx);
		}
		if (ctx && ctx.noLoadingImg)
			-- m_silentCall;
		if ($.active < 0)
			$.active = 0;
		if ($.active-m_silentCall <= 0 && self.isBusy && m_manualBusy == 0) {
			self.isBusy = 0;
			var tv = new Date() - m_tmBusy;
			m_tmBusy = 0;
			console.log("idle after " + tv + "ms");

			// handle idle
			self.hideLoading();
// 			if ($.mobile)
// 				$.mobile.loading("hide");
		}
	});
}

function defAjaxErrProc(xhr, textStatus, e)
{
	//if (xhr && xhr.status != 200) {
		var ctx = this.ctx_ || {};
		ctx.status = xhr.status;
		ctx.statusText = xhr.statusText;

		if (xhr.status == 0) {
			self.app_alert("连不上服务器了，是不是网络连接不给力？", "e");
		}
		else if (this.handleHttpError) {
			var data = xhr.responseText;
			var rv = defDataProc.call(this, data);
			if (rv != null)
				this.success && this.success(rv);
			return;
		}
		else {
			self.app_alert("操作失败: 服务器错误. status=" + xhr.status + "-" + xhr.statusText, "e");
		}

		leaveWaiting(ctx);
	//}
}

/**
@fn defDataProc(rv)

@param rv BQP协议原始数据，如 "[0, {id: 1}]"，一般是字符串，也可以是JSON对象。
@return data 按接口定义返回的数据对象，如 {id: 1}. 如果返回==null，调用函数应直接返回，不回调应用层。

注意：服务端不应返回null, 否则客户回调无法执行; 习惯上返回false表示让回调处理错误。

*/
self.defDataProc = defDataProc;
function defDataProc(rv)
{
	var ctx = this.ctx_ || {};
	var ext = ctx.ext;

	// ajax-beforeSend回调中设置
	if (this.xhr_ && (ext == null || ext == "default") ) {
		var val = this.xhr_.getResponseHeader("X-Daca-Server-Rev");
		if (val && g_data.serverRev != val) {
			if (g_data.serverRev) {
				mCommon.reloadSite();
			}
			console.log("Server Revision: " + val);
			g_data.serverRev = val;
		}
		val = mCommon.parseValue(this.xhr_.getResponseHeader("X-Daca-Test-Mode"));
		if (g_data.testMode != val) {
			g_data.testMode = val;
			if (g_data.testMode)
				self.app_alert("测试模式!", {timeoutInterval:2000});
		}
		val = mCommon.parseValue(this.xhr_.getResponseHeader("X-Daca-Mock-Mode"));
		if (g_data.mockMode != val) {
			g_data.mockMode = val;
			if (g_data.mockMode)
				self.app_alert("模拟模式!", {timeoutInterval:2000});
		}
	}

	try {
		if (rv !== "" && typeof(rv) == "string")
			rv = $.parseJSON(rv);
	}
	catch (e)
	{
		leaveWaiting(ctx);
		self.app_alert("服务器数据错误。");
		return;
	}

	if (ctx.tm) {
		ctx.tv = new Date() - ctx.tm;
	}
	ctx.ret = rv;

	leaveWaiting(ctx);

	if (ext) {
		var filter = self.callSvrExt[ext] && self.callSvrExt[ext].dataFilter;
		if (filter) {
			var ret = filter.call(this, rv);
			if (ret == null || ret === false)
				self.lastError = ctx;
			return ret;
		}
	}

	if (rv && $.isArray(rv) && rv.length >= 2 && typeof rv[0] == "number") {
		if (rv[0] == 0)
			return rv[1];

		if (this.noex)
		{
			this.lastError = rv;
			self.lastError = ctx;
			return false;
		}

		if (rv[0] == E_NOAUTH) {
			if (self.tryAutoLogin()) {
				$.ajax(this);
			}
// 				self.popPageStack(0);
// 				self.showLogin();
			return;
		}
		else if (rv[0] == E_AUTHFAIL) {
			var errmsg = rv[1] || "验证失败，请检查输入是否正确!";
			self.app_alert(errmsg, "e");
			return;
		}
		else if (rv[0] == E_ABORT) {
			console.log("!!! abort call");
			return;
		}
		logError();
		self.app_alert("操作失败：" + rv[1], "e");
	}
	else {
		logError();
		self.app_alert("服务器通讯协议异常!", "e"); // 格式不对
	}

	function logError()
	{
		self.lastError = ctx;
		console.log("failed call");
		console.log(ctx);
	}
}

/**
@fn getBaseUrl()

取服务端接口URL对应的目录。可用于拼接其它服务端资源。
相当于dirname(MUI.options.serverUrl);

例如：

serverUrl为"../jdcloud/api.php" 或 "../jdcloud/"，则MUI.baseUrl返回 "../jdcloud/"
serverUrl为"http://myserver/myapp/api.php" 或 "http://myserver/myapp/"，则MUI.baseUrl返回 "http://myserver/myapp/"
 */
self.getBaseUrl = getBaseUrl;
function getBaseUrl()
{
	return self.options.serverUrl.replace(/\/[^\/]+$/, '/');
}

/**
@fn makeUrl(action, params?)

生成对后端调用的url. 

	var params = {id: 100};
	var url = MUI.makeUrl("Ordr.set", params);

注意：函数返回的url是字符串包装对象，可能含有这些属性：{makeUrl=true, action?, params?}
这样可通过url.action得到原始的参数。

支持callSvr扩展，如：

	var url = MUI.makeUrl('zhanda:login');

(deprecated) 为兼容旧代码，action可以是一个数组，在WUI环境下表示对象调用:

	WUI.makeUrl(['Ordr', 'query']) 等价于 WUI.makeUrl('Ordr.query');

在MUI环境下表示callSvr扩展调用:

	MUI.makeUrl(['login', 'zhanda']) 等价于 MUI.makeUrl('zhanda:login');

@see callSvrExt
 */
self.makeUrl = makeUrl;
function makeUrl(action, params)
{
	var ext;
	if ($.isArray(action)) {
		if (window.MUI) {
			ext = action[1];
			action = action[0];
		}
		else {
			ext = "default";
			action = action[0] + "." + action[1];
		}
	}
	else {
		var m = action.match(/^(\w+):(\w.*)/);
		if (m) {
			ext = m[1];
			action = m[2];
		}
		else {
			ext = "default";
		}
	}

	// 有makeUrl属性表示已调用过makeUrl
	if (action.makeUrl || /^http/.test(action)) {
		if (params == null)
			return action;
		if (action.makeUrl)
			return makeUrl(action.action, $.extend({}, action.params, params));
		var url = mCommon.appendParam(action, $.param(params));
		return makeUrlObj(url);
	}

	if (params == null)
		params = {};

	var url;
	var fnMakeUrl = self.callSvrExt[ext] && self.callSvrExt[ext].makeUrl;
	if (fnMakeUrl) {
		url = fnMakeUrl(action, params);
	}
	// 缺省接口调用：callSvr('login') 或 callSvr('php/login.php');
	else if (action.indexOf(".php") < 0)
	{
		var opt = self.options;
		var usePathInfo = !opt.serverUrlAc;
		if (usePathInfo) {
			if (opt.serverUrl.slice(-1) == '/')
				url = opt.serverUrl + action;
			else
				url = opt.serverUrl + "/" + action;
		}
		else {
			url = opt.serverUrl;
			params[opt.serverUrlAc] = action;
		}
	}
	else {
		if (location.protocol == "file:") {
			url = getBaseUrl() + action;
		}
		else
			url = action;
	}
	if (window.g_cordova) {
		if (m_appVer === undefined)
		{
			var platform = "n";
			if (mCommon.isAndroid()) {
				platform = "a";
			}
			else if (mCommon.isIOS()) {
				platform = "i";
			}
			m_appVer = platform + "/" + g_cordova;
		}
		params._ver = m_appVer;
	}
	if (self.options.appName)
		params._app = self.options.appName;
	if (g_args._debug)
		params._debug = g_args._debug;
	var ret = mCommon.appendParam(url, $.param(params));
	return makeUrlObj(ret);

	function makeUrlObj(url)
	{
		var o = new String(url);
		o.makeUrl = true;
		if (action.makeUrl) {
			o.action = action.action;
			o.params = $.extend({}, action.params, params);
		}
		else {
			o.action = action;
			o.params = params;
		}
		return o;
	}
}

/**
@fn callSvr(ac, [params?], fn?, postParams?, userOptions?) -> deferredObject

@param ac String. action, 交互接口名. 也可以是URL(比如由makeUrl生成)
@param params Object. URL参数（或称HTTP GET参数）
@param postParams Object. POST参数. 如果有该参数, 则自动使用HTTP POST请求(postParams作为POST内容), 否则使用HTTP GET请求.
@param fn Function(data). 回调函数, data参考该接口的返回值定义。
@param userOptions 用户自定义参数, 会合并到$.ajax调用的options参数中.可在回调函数中用"this.参数名"引用. 

常用userOptions: 

- 指定{async:0}来做同步请求, 一般直接用callSvrSync调用来替代.
- 指定{noex:1}用于忽略错误处理。
- 指定{noLoadingImg:1} 静默调用，忽略loading图标，不设置busy状态。

想为ajax选项设置缺省值，可以用callSvrExt中的beforeSend回调函数，也可以用$.ajaxSetup，
但要注意：ajax的dataFilter/beforeSend选项由于框架已用，最好不要覆盖。

@see callSvrExt[].beforeSend(opt) 为callSvr选项设置缺省值

@return deferred对象，与$.ajax相同。
例如，

	var dfd = callSvr(ac, fn1);
	dfd.then(fn2);

	function fn1(data) {}
	function fn2(data) {}

在接口调用成功后，会依次回调fn1, fn2.

@key callSvr.noex 调用接口时忽略出错，可由回调函数fn自己处理错误。

当后端返回错误时, 回调`fn(false)`（参数data=false）. 可通过 MUI.lastError.ret 或 this.lastError 取到返回的原始数据。

示例：

	callSvr("logout");
	callSvr("logout", api_logout);
	function api_logout(data) {}

	callSvr("login", api_login);
	function api_login(data) {}

	callSvr("info/hotline.php", {q: '大众'}, api_hotline);
	function api_hotline(data) {}

	// 也可使用makeUrl生成的URL如:
	callSvr(MUI.makeUrl("logout"), api_logout);
	callSvr(MUI.makeUrl("logout", {a:1}), api_logout);

	callSvr("User.get", function (data) {
		if (data === false) { // 仅当设置noex且服务端返回错误时可返回false
			// var originalData = MUI.lastError.ret; 或
			// var originalData = this.lastError;
			return;
		}
		foo(data);
	}, null, {noex:1});

@see lastError 出错时的上下文信息

## 调用监控

框架会自动在ajaxOption中增加ctx_属性，它包含 {ac, tm, tv, tv2, ret} 这些信息。
当设置MUI.options.logAction=1时，将输出这些信息。
- ac: action
- tm: start time
- tv: time interval (从发起请求到服务器返回数据完成的时间, 单位是毫秒)
- tv2: 从接到数据到完成处理的时间，毫秒(当并发处理多个调用时可能不精确)

## 文件上传支持(FormData)

callSvr支持FormData对象，可用于上传文件等场景。示例如下：

@key example-upload

HTML:

	file: <input id="file1" type="file" multiple>
	<button type="button" id="btn1">upload</button>

JS:

	jpage.find("#btn1").on('click', function () {
		var fd = new FormData();
		$.each(jpage.find('#file1')[0].files, function (i, e) {
			fd.append('file' + (i+1), e);
		});
		callSvr('upload', api_upload, fd);

		function api_upload(data) { ... }
	});

## callSvr扩展

@key callSvrExt

当调用第三方API时，也可以使用callSvr扩展来代替$.ajax调用以实现：
- 调用成功时直接可操作数据，不用每次检查返回码；
- 调用出错时可以统一处理。

例：合作方接口使用HTTP协议，格式如（以生成token调用为例）

	http://<Host IP Address>:<Host Port>/lcapi/token/get-token?user=用户名&password=密码

返回格式为：{code, msg, data}

成功返回：

	{
		"code":"0",
		"msg":"success",
		"data":[ { "token":"xxxxxxxxxxxxxx" } ]
	}

失败返回：

	{
		"code":"4001",
		"msg":"invalid username or password",
		"data":[]
	}

callSvr扩展示例：

	MUI.callSvrExt['zhanda'] = {
		makeUrl: function(ac, param) {
			return 'http://hostname/lcapi/' + ac;
		},
		dataFilter: function (data) {
			if ($.isPlainObject(data) && data.code !== undefined) {
				if (data.code == 0)
					return data.data;
				if (this.noex)
					return false;
				app_alert("操作失败：" + data.msg, "e");
			}
			else {
				app_alert("服务器通讯协议异常!", "e"); // 格式不对
			}
		}
	};

在调用时，ac参数传入一个数组：

	callSvr(['token/get-token', 'zhanda'], {user: 'test', password: 'test123'}, function (data) {
		console.log(data);
	});

@key callSvrExt[].makeUrl(ac, param)

根据调用名ac生成url, 注意无需将param放到url中。

注意：
对方接口应允许JS跨域调用，或调用方支持跨域调用。

@key callSvrExt[].dataFilter(data) = null/false/data

对调用返回数据进行通用处理。返回值决定是否调用callSvr的回调函数以及参数值。

	callSvr(ac, callback);

- 返回data: 回调应用层的实际有效数据: `callback(data)`.
- 返回null: 一般用于报错后返回。不会回调`callback`.
- 返回false: 一般与callSvr的noex选项合用，如`callSvr(ac, callback, postData, {noex:1})`，表示由应用层回调函数来处理出错: `callback(false)`。

当返回false时，应用层可以通过`MUI.lastError.ret`来获取服务端返回数据。

@see lastError 出错时的上下文信息

@key callSvrExt['default']

(支持版本: v3.1)
如果要修改callSvr缺省调用方法，可以改写 MUI.callSvrExt['default'].
例如，定义以下callSvr扩展：

	MUI.callSvrExt['default'] = {
		makeUrl: function(ac) {
			return '../api.php/' + ac;
		},
		dataFilter: function (data) {
			var ctx = this.ctx_ || {};
			if (data && $.isArray(data) && data.length >= 2 && typeof data[0] == "number") {
				if (data[0] == 0)
					return data[1];

				if (this.noex)
				{
					return false;
				}

				if (data[0] == E_NOAUTH) {
					// 如果支持自动重登录
					//if (MUI.tryAutoLogin()) {
					//	$.ajax(this);
					//}
					// 不支持自动登录，则跳转登录页
					MUI.popPageStack(0);
					MUI.showLogin();
					return;
				}
				else if (data[0] == E_AUTHFAIL) {
					app_alert("验证失败，请检查输入是否正确!", "e");
					return;
				}
				else if (data[0] == E_ABORT) {
					console.log("!!! abort call");
					return;
				}
				logError();
				app_alert("操作失败：" + data[1], "e");
			}
			else {
				logError();
				app_alert("服务器通讯协议异常!", "e"); // 格式不对
			}

			function logError()
			{
				console.log("failed call");
				console.log(ctx);
			}
		}
	};

这样，以下调用

	callSvr(['login', 'default']);

可以简写为：

	callSvr('login');

@key callSvrExt[].beforeSend(opt) 为callSvr或$.ajax选项设置缺省值

如果有ajax选项想设置，可以使用beforeSend回调，例如POST参数使用JSON格式：

	MUI.callSvrExt['default'] = {
		beforeSend: function (opt) {
			// 示例：设置contentType
			if (opt.contentType == null) {
				opt.contentType = "application/json;charset=utf-8";
			}
			// 示例：添加HTTP头用于认证
			if (g_data.auth) {
				if (opt.headers == null)
					opt.headers = {};
				opt.headers["Authorization"] = "Basic " + g_data.auth;
			}
		}
	}

如果要设置请求的HTTP headers，可以用`opt.headers = {header1: "value1", header2: "value2"}`.
更多选项参考jquery文档：jQuery.ajax的选项。

## 适配RESTful API

接口示例：更新订单

	PATCH /orders/{ORDER_ID}

	调用成功仅返回HTTP状态，无其它内容："200 OK" 或 "204 No Content"
	调用失败返回非2xx的HTTP状态及错误信息，无其它内容，如："400 bad id"

为了处理HTTP错误码，应设置：

	MUI.callSvrExt["default"] = {
		beforeSend: function (opt) {
			opt.handleHttpError = true;
		},
		dataFilter: function (data) {
			var ctx = this.ctx_;
			if (ctx && ctx.status) {
				if (this.noex)
					return false;
				app_alert(ctx.statusText, "e");
				return;
			}
			return data;
		}
	}

- 在beforeSend回调中，设置handleHttpError为true，这样HTTP错误会由dataFilter处理，而非框架自动处理。
- 在dataFilter回调中，如果this.ctx_.status非空表示是HTTP错误，this.ctx_.statusText为错误信息。
- 如果操作成功但无任何返回数据，回调函数fn(data)中data值为undefined（当HTTP状态码为204）或空串（非204返回）
- 不要设置ajax调用失败的回调，如`$.ajaxSetup({error: fn})`，`$.ajax({error: fn})`，它会覆盖框架的处理.

如果接口在出错时，返回固定格式的错误对象如{code, message}，可以这样处理：

	MUI.callSvrExt["default"] = {
		beforeSend: function (opt) {
			opt.handleHttpError = true;
		},
		dataFilter: function (data) {
			var ctx = this.ctx_;
			if (ctx && ctx.status) {
				if (this.noex)
					return false;
				if (data && data.message) {
					app_alert(data.message, "e");
				}
				else {
					app_alert("操作失败: 服务器错误. status=" + ctx.status + "-" + ctx.statusText, "e");
				}
				return;
			}
			return data;
		}
	}

调用接口时，HTTP谓词可以用callSvr的userOptions中给定，如：

	callSvr("orders/" + orderId, fn, postParam, {type: "PATCH"});
	
这种方式简单，但因调用名ac是变化的，不易模拟接口。
如果要模拟接口，可以保持调用名ac不变，像这样调用：

	callSvr("orders/{id}", {id: orderId}, fn, postParam, {type: "PATCH"});

于是可以这样做接口模拟：

	MUI.mockData = {
		"orders/{id}": function (param, postParam) {
			var ret = "OK";
			// 获取资源
			if (this.type == "GET") {
				ret = orders[param.id];
			}
			// 更新资源
			else if (this.type == "PATCH") {
				$.extend(orders[param.id], postParam);
			}
			// 删除资源
			else if (this.type == "DELETE") {
				delete orders[param.id];
			}
			return [0, ret];
		}
	};

不过这种写法需要适配，以生成正确的URL，示例：

	MUI.callSvrExt["default"] = {
		makeUrl: function (ac, param) {
			ac = ac.replace(/\{(\w+)\}/g, function (m, m1) {
				var ret = param[m1];
				assert(ret != null, "缺少参数");
				delete param[m1];
				return ret;
			});
			return "./api.php/" + ac;
		}
	}

*/
self.callSvr = callSvr;
self.callSvrExt = {};
function callSvr(ac, params, fn, postParams, userOptions)
{
	if (params instanceof Function) {
		// 兼容格式：callSvr(url, fn?, postParams?, userOptions?);
		userOptions = postParams;
		postParams = fn;
		fn = params;
		params = null;
	}
	mCommon.assert(ac != null, "*** bad param `ac`");

	var ext = null;
	var ac0 = ac.action || ac; // ac可能是makeUrl生成过的
	var m;
	if ($.isArray(ac)) {
		// 兼容[ac, ext]格式, 不建议使用，可用"{ext}:{ac}"替代
		mCommon.assert(ac.length == 2, "*** bad ac format, require [ac, ext]");
		ext = ac[1];
		if (ext != 'default')
			ac0 = ext + ':' + ac[0];
		else
			ac0 = ac[0];
	}
	// "{ext}:{ac}"格式，注意区分"http://xxx"格式
	else if (m = ac.match(/^(\w+):(\w.*)/)) {
		ext = m[1];
	}
	else if (self.callSvrExt['default']) {
		ext = 'default';
	}

	var isSyncCall = (userOptions && userOptions.async == false);
	if (m_curBatch && !isSyncCall)
	{
		return m_curBatch.addCall({ac: ac, get: params, post: postParams}, fn, userOptions);
	}

	var url = makeUrl(ac, params);
	var ctx = {ac: ac0, tm: new Date()};
	if (userOptions && userOptions.noLoadingImg)
		ctx.noLoadingImg = 1;
	if (ext) {
		ctx.ext = ext;
	}
	if (self.mockData && self.mockData[ac0]) {
		ctx.isMock = true;
		ctx.getMockData = function () {
			var d = self.mockData[ac0];
			var param1 = $.extend({}, url.params);
			var postParam1 = $.extend({}, postParams);
			if ($.isFunction(d)) {
				d = d(param1, postParam1);
			}
			if (self.options.logAction)
				console.log({ac: ac0, ret: d, params: param1, postParams: postParam1, userOptions: userOptions});
			return d;
		}
	}
	enterWaiting(ctx);

	var callType = "call";
	if (isSyncCall)
		callType += "-sync";
	if (ctx.isMock)
		callType += "-mock";

	var method = (postParams == null? 'GET': 'POST');
	var opt = {
		dataType: 'text',
		url: url,
		data: postParams,
		type: method,
		success: fn,
		// 允许跨域使用cookie/session/authorization header
		xhrFields: {
			withCredentials: true
		},
		ctx_: ctx
	};
	// support FormData object.
	if (window.FormData && postParams instanceof FormData) {
		opt.processData = false;
		opt.contentType = false;
	}
	$.extend(opt, userOptions);
	if (ext && self.callSvrExt[ext].beforeSend) {
		self.callSvrExt[ext].beforeSend(opt);
	}

	// post json content
	var isJson = opt.contentType && opt.contentType.indexOf("/json")>0;
	if (isJson && opt.data instanceof Object)
		opt.data = JSON.stringify(opt.data);

	console.log(callType + ": " + opt.type + " " + ac0);
	if (ctx.isMock)
		return callSvrMock(opt, isSyncCall);
	return $.ajax(opt);
}

// opt = {success, .ctx_={isMock, getMockData} }
function callSvrMock(opt, isSyncCall)
{
	var dfd_ = $.Deferred();
	var opt_ = opt;
	if (isSyncCall) {
		callSvrMock1();
	}
	else {
		setTimeout(callSvrMock1, self.options.mockDelay);
	}
	return dfd_;

	function callSvrMock1() 
	{
		var data = opt_.ctx_.getMockData();
		if (typeof(data) != "string")
			data = JSON.stringify(data);
		var rv = defDataProc.call(opt_, data);
		if (rv != null)
		{
			opt_.success && opt_.success(rv);
			dfd_.resolve(rv);
			return;
		}
		self.app_abort();
	}
}

/**
@fn callSvrSync(ac, [params?], fn?, postParams?, userOptions?)
@return data 原型规定的返回数据

同步模式调用callSvr.

@see callSvr
*/
self.callSvrSync = callSvrSync;
function callSvrSync(ac, params, fn, postParams, userOptions)
{
	var ret;
	if (params instanceof Function) {
		userOptions = postParams;
		postParams = fn;
		fn = params;
		params = null;
	}
	userOptions = $.extend({async: false}, userOptions);
	var dfd = callSvr(ac, params, fn, postParams, userOptions);
	dfd.then(function(data) {
		ret = data;
	});
	return ret;
}

/**
@fn setupCallSvrViaForm($form, $iframe, url, fn, callOpt)

该方法已不建议使用。上传文件请用FormData。
@see example-upload,callSvr

@param $iframe 一个隐藏的iframe组件.
@param callOpt 用户自定义参数. 参考callSvr的同名参数. e.g. {noex: 1}

一般对后端的调用都使用callSvr函数, 但像上传图片等操作不方便使用ajax调用, 因为要自行拼装multipart/form-data格式的请求数据. 
这种情况下可以使用form的提交和一个隐藏的iframe来实现类似的调用.

先定义一个form, 在其中放置文件上传控件和一个隐藏的iframe. form的target属性设置为iframe的名字:

	<form data-role="content" action="upload" method=post enctype="multipart/form-data" target="ifrUpload">
		<input type=file name="file[]" multiple accept="image/*">
		<input type=submit value="上传">
		<iframe id='ifrUpload' name='ifrUpload' style="display:none"></iframe>
	</form>

然后就像调用callSvr函数一样调用setupCallSvrViaForm:

	var url = MUI.makeUrl("upload", {genThumb: 1});
	MUI.setupCallSvrViaForm($frm, $frm.find("iframe"), url, onUploadComplete);
	function onUploadComplete(data) 
	{
		alert("上传成功");
	}

 */
self.setupCallSvrViaForm = setupCallSvrViaForm;
function setupCallSvrViaForm($form, $iframe, url, fn, callOpt)
{
	$form.attr("action", url);

	$iframe.on("load", function () {
		var data = this.contentDocument.body.innerText;
		if (data == "")
			return;
		var rv = defDataProc.call(callOpt, data);
		if (rv == null)
			self.app_abort();
		fn(rv);
	});
}

/**
@class batchCall(opt?={useTrans?=0})

批量调用。将若干个调用打包成一个特殊的batch调用发给服务端。
注意：

- 同步调用callSvrSync不会加入批处理。
- 对特别几个不符合BPQ协议输出格式规范的接口不可使用批处理，如upload, att等接口。
- 如果MUI.disableBatch=true, 表示禁用批处理。

示例：

	var batch = new MUI.batchCall();
	callSvr("Family.query", {res: "id,name"}, api_FamilyQuery);
	callSvr("User.get", {res: "id,phone"}, api_UserGet);
	batch.commit();

以上两条调用将一次发送到服务端。
在批处理中，默认每条调用是一个事务，如果想把批处理中所有调用放到一个事务中，可以用useTrans选项：

	var batch = new MUI.batchCall({useTrans: 1});
	callSvr("Attachment.add", api_AttAdd, {path: "path-1"});
	callSvr("Attachment.add", api_AttAdd, {path: "path-2"});
	batch.commit();

在一个事务中，所有调用要么成功要么都取消。
任何一个调用失败，会导致它后面所有调用取消执行，且所有已执行的调用会回滚。

参数中可以引用之前结果中的值，引用部分需要用"{}"括起来，且要在opt.ref参数中指定哪些参数使用了引用：

	var batch = new MUI.batchCall({useTrans: 1});
	callSvr("Attachment.add", api_AttAdd, {path: "path-1"}); // 假如返回 22
	var opt = {ref: ["id"]};
	callSvr("Attachment.get", {id: "{$1}"}, api_AttGet, null, opt); // {$1}=22, 假如返回 {id: 22, path: '/data/1.png'}
	opt = {ref: ["cond"]};
	callSvr("Attachment.query", {res: "count(*) cnt", cond: "path='{$-1.path}'"}, api_AttQuery, null, opt); // {$-1.path}计算出为 '/data/1.png'
	batch.commit();

以下为引用格式示例：

	{$-2} // 前2次的结果。
	{$2[0]} // 取第2次结果（是个数组）的第0个值。
	{$-1.path} // 取前一次结果的path属性
	{$2 -1}  // 可以做简单的计算

如果值计算失败，则当作"null"填充。

@see useBatchCall
@see disableBatch
@see m_curBatch

*/
self.batchCall = batchCall;
function batchCall(opt)
{
	mCommon.assert(m_curBatch == null, "*** multiple batch call!");
	this.opt_ = opt;
	this.calls_ = [];
	this.callOpts_ = [];
	if (! self.disableBatch)
		m_curBatch = this;
}

batchCall.prototype = {
	// obj: { opt_, @calls_, @callOpts_ }
	// calls_: elem={ac, get, post}
	// callOpts_: elem={fn, opt, dfd}

	//* batchCall.addCall(call={ac, get, post}, fn, opt)
	addCall: function (call0, fn, opt0) {
		var call = $.extend({}, call0);
		var opt = $.extend({}, opt0);
		if (opt.ref) {
			call.ref = opt.ref;
		}
		if (call.ac && call.ac.makeUrl) {
			call.get = $.extend({}, call.ac.params, call.get);
			call.ac = call.ac.action;
		}
		this.calls_.push(call);

		var callOpt = {
			fn: fn,
			opt: opt,
			dfd: $.Deferred()
		};
		this.callOpts_.push(callOpt);
		return callOpt.dfd;
	},
	//* batchCall.dfd()
	deferred: function () {
		return this.dfd_;
	},
	//* @fn batchCall.commit()
	commit: function () {
		if (m_curBatch == null)
			return;
		m_curBatch = null;

		if (this.calls_.length < 1) {
			console.log("!!! warning: batch has " + this.calls_.length + " calls!");
			return;
		}
		if (this.calls_.length == 1) {
			// 只有一个调用，不使用batch
			var call = this.calls_[0];
			var callOpt = this.callOpts_[0];
			var dfd = callSvr(call.ac, call.get, callOpt.fn, call.post, callOpt.opt);
			dfd.then(function (data) {
				callOpt.dfd.resolve(data);
			});
			return;
		}
		var batch_ = this;
		var postData = this.calls_;
		callSvr("batch", this.opt_, api_batch, postData, {
			contentType: "application/json; charset=utf-8"
		});

		function api_batch(data)
		{
			var ajaxCtx_ = this;
			$.each(data, function (i, e) {
				var callOpt = batch_.callOpts_[i];
				// simulate ajaxCtx_, e.g. for {noex, userPost}
				var extendCtx = false;
				if (callOpt.opt && !$.isEmptyObject(callOpt.opt)) {
					extendCtx = true;
					$.extend(ajaxCtx_, callOpt.opt);
				}

				var data1 = defDataProc.call(ajaxCtx_, e);
				if (data1 != null) {
					if (callOpt.fn) {
						callOpt.fn.call(ajaxCtx_, data1);
					}
					callOpt.dfd.resolve(data1);
				}

				// restore ajaxCtx_
				if (extendCtx) {
					$.each(Object.keys(callOpt.opt), function () {
						ajaxCtx_[this] = null;
					});
				}
			});
		}
	},
	//* @fn batchCall.cancel()
	cancel: function () {
		m_curBatch = null;
	}
}

/**
@fn useBatchCall(opt?={useTrans?=0}, tv?=0)

之后的callSvr调用都加入批量操作。例：

	MUI.useBatchCall();
	callSvr("Family.query", {res: "id,name"}, api_FamilyQuery);
	callSvr("User.get", {res: "id,phone"}, api_UserGet);

可指定多少毫秒以内的操作都使用批处理，如10ms内：

	MUI.useBatchCall(null, 10);

如果MUI.disableBatch=true, 该函数不起作用。

@see batchCall
@see disableBatch
*/
self.useBatchCall = useBatchCall;
function useBatchCall(opt, tv)
{
	if (self.disableBatch)
		return;
	if (m_curBatch != null)
		return;
	tv = tv || 0;
	var batch = new self.batchCall(opt);
	setTimeout(function () {
		batch.commit();
	}, tv);
}

}
// ====== WEBCC_END_FILE callSvr.js }}}

// ====== WEBCC_BEGIN_FILE wui-showPage.js {{{
function JdcloudPage()
{
var self = this;
// 模块内共享
self.ctx = self.ctx || {};

var mCommon = jdModule("jdcloud.common");
var m_batchMode = false; // 批量操作模式, 按住Ctrl键。

mCommon.assert($.fn.combobox, "require jquery-easyui lib.");

self.getRow = getRow;
function getRow(jtbl)
{
	var row = jtbl.datagrid('getSelected');   
	if (! row)
	{
		self.app_alert("请先选择一行。", "w");
		return null;
	}
	return row;
}

/** 
@fn reload(jtbl, url?, queryParams?) 
*/
self.reload = reload;
function reload(jtbl, url, queryParams)
{
	if (url != null || queryParams != null) {
		var opt = jtbl.datagrid("options");
		if (url != null) {
			opt.url = url;
		}
		if (queryParams != null) {
			opt.queryParams = queryParams;
		}
	}

	// 如果当前页面不是table所在页，则先切换到所在页
	if (jtbl.is(":hidden")) {
		var opage = mCommon.getAncestor(jtbl[0], istab);
		if (opage && opage.title)
			$(opage).closest(".easyui-tabs").tabs("select", opage.title);
	}

	resetPageNumber(jtbl);
	jtbl.datagrid('reload');
	jtbl.datagrid('clearSelections');
}

/** 
@fn reloadTmp(jtbl, url?, queryParams?) 
临时reload一下，完事后恢复原url
*/
self.reloadTmp = reloadTmp;
function reloadTmp(jtbl, url, queryParams)
{
	var opt = jtbl.datagrid("options");
	var url_bak = opt.url;
	var param_bak = opt.queryParams;

	reload(jtbl, url, queryParams);

	// restore param
	opt.url = url_bak;
	opt.queryParams = param_bak;
}

// 筋斗云协议的若干列表格式转为easyui-datagrid的列表格式
// 支持 [], { @list}, { @h, @d}格式 => {total, @rows}
function jdListToDgList(data)
{
	var ret = data;
	// support simple array
	if ($.isArray(data)) {
		ret = {
			total: data.length,
			rows: data
		};
	}
	else if ($.isArray(data.list)) {
		ret = {
			total: data.total || data.list.length,
			rows: data.list
		};
	}
	// support compressed table format: {h,d}
	else if (data.h !== undefined)
	{
		var arr = mCommon.rs2Array(data);
		ret = {
			total: data.total || arr.length,
			rows: arr
		};
	}
	return ret;
}

// 筋斗云协议的列表转为数组，支持 [], {list}, {h,d}格式
function jdListToArray(data)
{
	var ret = data;
	// support simple array
	if ($.isArray(data)) {
		ret = data;
	}
	else if ($.isArray(data.list)) {
		ret = data.list;
	}
	// support compressed table format: {h,d}
	else if (data.h !== undefined)
	{
		ret = mCommon.rs2Array(data);
	}
	return ret;
}

/** 
@fn reloadRow(jtbl, rowData?)

@param rowData must be the original data from table row

rowData如果未指定，则使用当前选择的行。
 */
self.reloadRow = reloadRow;
function reloadRow(jtbl, rowData)
{
	if (rowData == null) {
		rowData = jtbl.datagrid('getSelected');
		if (rowData == null)
			return;
	}
	jtbl.datagrid("loading");
	var opt = jtbl.datagrid("options");
	self.callSvr(opt.url, api_queryOne, {cond: "id=" + rowData.id});

	function api_queryOne(data) 
	{
		jtbl.datagrid("loaded");
		var idx = jtbl.datagrid("getRowIndex", rowData);
		var objArr = jdListToArray(data);
		if (idx != -1 && objArr.length == 1) {
			// NOTE: updateRow does not work, must use the original rowData
// 			jtbl.datagrid("updateRow", {index: idx, row: data[0]});
			for (var k in rowData) 
				delete rowData[k];
			$.extend(rowData, objArr[0]);
			jtbl.datagrid("refreshRow", idx);
		}
	}
}

function appendRow(jtbl, id)
{
	jtbl.datagrid("loading");
	var opt = jtbl.datagrid("options");
	self.callSvr(opt.url, api_queryOne, {cond: "id=" + id});

	function api_queryOne(data)
	{
		jtbl.datagrid("loaded");
		var objArr = jdListToArray(data);
		if (objArr.length != 1)
			return;
		var row = objArr[0];
		if (opt.sortOrder == "desc")
			jtbl.datagrid("insertRow", {index:0, row: row});
		else
			jtbl.datagrid("appendRow", row);
	}
}

function tabid(title)
{
	return "pg_" + title.replace(/[ ()\[\]]/g, "_");
}
function istab(o)
{
	var id = o.getAttribute("id");
	return id && id.substr(0,3) == "pg_";
}

// // 取jquery-easyui dialog 对象
// function getDlg(o)
// {
// 	return getAncestor(o, function (o) {
// 		return o.className && o.className.indexOf('window-body') >=0;
// 	});
// }

// function closePage(title)
// {
// 	var o = $("#pg_" + title).find("div");
// 	if (o.length > 0) {
// 		alert(o[0].id);
// 		o.appendTo($("#hidden_pages"));
// 		alert("restore");
// 	}
// }

// paramArr?
function callInitfn(jo, paramArr)
{
	if (jo.jdata().init)
		return;

	var attr = jo.attr("my-initfn");
	if (attr == null)
		return;

	try {
		initfn = eval(attr);
	}
	catch (e) {
		self.app_alert("bad initfn: " + attr, "e");
	}

	if (initfn)
	{
		console.log("### initfn: " + attr);
 		try {
			initfn.apply(jo, paramArr || []);
		} catch (ex) {
			console.error(ex);
			throw(ex);
		}
	}
	jo.jdata().init = true;
}

function getModulePath(file)
{
	return self.options.pageFolder + "/" + file;
}

/** 
@fn showPage(pageName, title?, paramArr?)
@param pageName 由page上的class指定。
@param title? 如果未指定，则使用page上的title属性.
@param paramArr? 调用initfn时使用的参数，是一个数组。

新页面以title作为id。
注意：每个页面都是根据pages下相应pageName复制出来的，显示在一个新的tab页中。相同的title当作同一页面。
初始化函数由page上的my-initfn属性指定。

page定义示例: 

	<div id="my-pages" style="display:none">
		<div class="pageHome" title="首页" my-initfn="initPageHome"></div>
	</div>

page调用示例:

	WUI.showPage("pageHome");
	WUI.showPage("pageHome", "首页");
	WUI.showPage("pageHome", "首页2");

*/
self.showPage = showPage;
function showPage(pageName, title, paramArr)
{
	var showPageArgs_ = arguments;
	var sel = "#my-pages > div." + pageName;
	var jpage = $(sel);
	if (jpage.length > 0) {
		initPage();
	}
	else {
		sel = "#tpl_" + pageName;
		var html = $(sel).html();
		if (html) {
			loadPage(html, pageName, null);
			return;
		}

		//jtab.append("开发中");

		//self.enterWaiting(); // NOTE: leaveWaiting in initPage
		var pageFile = getModulePath(pageName + ".html");
		$.ajax(pageFile).then(function (html) {
			loadPage(html, pageName, pageFile);
		}).fail(function () {
			//self.leaveWaiting();
		});
	}

	function initPage()
	{
		if (title == null)
			title = jpage.attr("title") || "无标题";

		var tt = self.tabMain;
		if (tt.tabs('exists', title)) {
			tt.tabs('select', title);
			return;
		}

		var id = tabid(title);
		var content = "<div id='" + id + "' title='" + title + "' />";
		var closable = (pageName != self.options.pageHome);

		tt.tabs('add',{
	// 		id: id,
			title: title,
			closable: closable,
			fit: true,
			content: content
		});

		var jtab = $("#" + id);

		var jpageNew = jpage.clone().appendTo(jtab);
		jpageNew.addClass('wui-page');
		jpageNew.attr("wui-pageName", pageName);
		jpageNew.attr("title", title);

		$.parser.parse(jpageNew); // easyui enhancement
		self.enhanceWithin(jpageNew);
		callInitfn(jpageNew, paramArr);

		jpageNew.data("showPageArgs_", showPageArgs_); // used by WUI.reloadPage
		jpageNew.trigger('pagecreate');
		jpageNew.trigger('pageshow');
	}

	function loadPage(html, pageClass, pageFile)
	{
		// 放入dom中，以便document可以收到pagecreate等事件。
		var jcontainer = $("#my-pages");
	// 	if (m_jstash == null) {
	// 		m_jstash = $("<div id='muiStash' style='display:none'></div>").appendTo(self.container);
	// 	}
		// 注意：如果html片段中有script, 在append时会同步获取和执行(jquery功能)
		jpage = $(html).filter("div");
		if (jpage.size() > 1 || jpage.size() == 0) {
			console.log("!!! Warning: bad format for page '" + pageClass + "'. Element count = " + jpage.size());
			jpage = jpage.filter(":first");
		}

		// 限制css只能在当前页使用
		jpage.find("style").each(function () {
			$(this).html( self.ctx.fixPageCss($(this).html(), "." + pageClass) );
		});
		// bugfix: 加载页面页背景图可能反复被加载
		jpage.find("style").attr("wui-origin", pageClass).appendTo(document.head);

/**
@key wui-pageFile

动态加载的逻辑页(或对话框)具有该属性，值为源文件名。
*/
		jpage.attr("wui-pageFile", pageFile);
		jpage.addClass(pageClass).appendTo(jcontainer);

		var val = jpage.attr("wui-script");
		if (val != null) {
			var path = getModulePath(val);
			var dfd = mCommon.loadScript(path, initPage);
			dfd.fail(function () {
				self.app_alert("加载失败: " + val);
				self.leaveWaiting();
				//history.back();
			});
		}
		else {
			initPage();
		}
	}
}

/**
@fn closeDlg(jdlg) 
*/
self.closeDlg = closeDlg;
function closeDlg(jdlg)
{
	jdlg.dialog("close");
}

function openDlg(jdlg)
{
	jdlg.dialog("open");
// 	jdlg.find("a").focus(); // link button
}

function focusDlg(jdlg)
{
	var jo;
	jdlg.find(":input[type!=hidden]").each(function (i, o) {
		var jo1 = $(o);
		if (! jo1.prop("disabled") && ! jo1.prop("readonly")) {
			jo = jo1;
			return false;
		}
	});
	if (jo == null) 
		jo = jdlg.find("a button");

	// !!!! 在IE上常常focus()无效，故延迟做focus避免被别的obj抢过
	if (jo)
		setTimeout(function(){jo.focus()}, 50);
}

// setup "Enter" and "Cancel" key for OK and Cancel button on the dialog
$.fn.okCancel = function (fnOk, fnCancel) {
	this.unbind("keydown").keydown(function (e) {
		if (e.keyCode == 13 && e.target.tagName != "TEXTAREA" && fnOk) {
			fnOk();
			return false;
		}
		else if (e.keyCode == 27 && fnCancel) {
			fnCancel();
			return false;
		}
		// Ctrl-F: find mode
		else if (e.ctrlKey && e.which == 70)
		{
			showObjDlg($(this), FormMode.forFind, null);
			return false;
		}
/* // Ctrl-A: add mode
		else if (e.ctrlKey && e.which == 65)
		{
			showObjDlg($(this), FormMode.forAdd, null);
			return false;
		}
*/
	});
}

/**
@fn showDlg(jdlg, opt?)

@param jdlg 可以是jquery对象，也可以是selector字符串或DOM对象，比如 "#dlgOrder".
注意：当对话框动态从外部加载时，jdlg=$("#dlgOrder") 一开始会为空数组，这时也可以调用该函数，且调用后jdlg会被修改为实际加载的对话框对象。

@param opt?={url, buttons, noCancel=false, okLabel="确定", cancelLabel="取消", modal=true, reset=true, validate=true, data, onOk, onSubmit, title}

- opt.url: String. 点击确定后，提交到后台的URL。如果设置则自动提交数据，否则应在opt.onOk回调或validate事件中手动提交。
- opt.buttons: Object数组。用于添加“确定”、“取消”按钮以外的其它按钮，如`[{text: '下一步', iconCls:'icon-ok', handler: btnNext_click}]`。
 用opt.okLabel/cancelLabel可修改“确定”、“取消”按钮的名字，用opt.noCancel=true可不要“取消”按钮。
- opt.model: Boolean.模态对话框，这时不可操作对话框外其它部分，如登录框等。设置为false改为非模态对话框。
- opt.data: Object. 自动加载的数据, 将自动填充到对话框上带name属性的DOM上。在修改对象时，仅当与opt.data有差异的数据才会传到服务端。
- opt.reset: Boolean. 显示对话框前先清空。
- opt.validate: Boolean. 是否提交前用easyui-form组件验证数据。内部使用。
- opt.onSubmit: Function(data) 自动提交前回调。用于验证或补齐提交数据，返回false可取消提交。opt.url为空时不回调。
- opt.onOk: Function(jdlg, data?) 如果自动提交(opt.url非空)，则服务端接口返回数据后回调，data为返回数据。如果是手动提交，则点确定按钮时回调，没有data参数。
- opt.title: String. 如果指定，则更新对话框标题。

对话框有两种编程模式，一是通过opt参数在启动对话框时设置属性及回调函数(如onOk)，另一种是在dialog初始化函数中处理事件(如validate事件)实现逻辑，有利于独立模块化。

对于自动提交数据的对话框(设置了opt.url)，提交数据过程中回调函数及事件执行顺序为：

	事件validate; // 提交前，用于验证或设置提交数据。返回false或ev.preventDefault()可取消提交，中止以下代码执行。
	opt.onSubmit(); // 提交前，验证或设置提交数据，返回false将阻止提交。
	... 框架通过callSvr自动提交数据，如添加、更新对象等。
	opt.onOk(jdlg, data); // 提交且服务端返回数据后。data是服务端返回数据。
	事件retdata; // 与onOk类似。

对于手动提交数据的对话框(opt.url为空)，执行顺序为：

	事件validate; // 用于验证、设置提交数据、提交数据。
	opt.onOk(jdlg); // 同上

注意：

- 参数opt可在beforeshow事件中设置，这样便于在对话框模块中自行设置选项，包括okLabel, onOk回调等等。
- 旧版本中的回调 opt.onAfterSubmit() 回调已删除，请用opt.onOk()替代。

调用此函数后，对话框将加上以下CSS Class:
@key .wui-dialog 标识WUI对话框的类名。

**对象型对话框与formMode**

函数showObjDlg()会调用本函数显示对话框，称为对象型对话框，用于对象增删改查，它将以下操作集中在一起。
打开窗口时，会设置窗口模式(formMode):

- 查询(FormMode.forFind)
- 显示及更新(FormMode.forSet)
- 添加(FormMode.forAdd)
- 删除(FormMode.forDel)，但实际上不会打开对话框

注意：

- 可通过`var formMode = jdlg.jdata().mode;`来获取当前对话框模式。
- 非对象型对话框的formMode为空。
- 对象型对话框由框架自动设置各opt选项，一般不应自行修改opt，而是通过处理对话框事件实现逻辑。

初始数据与对话框中带name属性的对象相关联，显示对话框时，带name属性的DOM对象将使用数据opt.data自动赋值(对话框show事件中可修改)，在点“确定”按钮提交时将改动的数据发到服务端(validate事件中可修改)，详见
@see setFormData,getFormData

**对话框事件**

操作对话框时会发出以下事件供回调：

	beforeshow - 对话框显示前。常用来处理对话框显示参数opt或初始数据opt.data.
	show - 显示对话框后。常用来设置字段值或样式，隐藏字段、初始化子表datagrid或隐藏子表列等。
	validate - 用于提交前验证、补齐数据等。返回false可取消提交。(v5.2) 支持其中有异步操作.
	retdata - 服务端返回结果时触发。用来根据服务器返回数据继续处理，如再次调用接口。

注意：

- 旧版本中的initdata, loaddata, savedata将废弃，应分别改用beforeshow, show, validate事件替代，注意事件参数及检查对话框模式。

@key event-beforeshow(ev, formMode, opt)
显示对话框前触发。

- opt参数即showDlg的opt参数，可在此处修改，例如修改opt.title可以设置对话框标题。
- opt.objParam参数是由showObjDlg传入给dialog的参数，比如opt.objParam.obj, opt.objParam.formMode等。
- 通过修改opt.data可为字段设置缺省值。注意forFind模式下opt.data为空。
- 可以通过在beforeshow中用setTimeout延迟执行某些动作，这与在show事件中回调操作效果基本一样。

注意：每次调用showDlg()都会回调，可能这时对话框已经在显示。

@key event-show(ev, formMode, initData)
对话框显示后事件，用于设置DOM组件。
注意如果在beforeshow事件中设置DOM，对于带name属性的组件会在加载数据时值被覆盖回去，对它们在beforeshow中只能通过设置opt.data来指定缺省值。

@key event-validate(ev, formMode, initData, newData)
initData为初始数据，如果要验证或修改待提交数据，应直接检查form中相应DOM元素的值。如果需要增加待提交字段，可加到newData中去。示例：添加参数: newData.mystatus='CR';

(v5.2) validate事件支持返回Deferred对象支持异步操作.
示例: 在提交前先弹出对话框询问. 由于app_alert是异步对话框, 需要将一个Deferred对象放入ev.dfds数组, 告诉框架等待ev.dfds中的延迟对象都resolve后再继续执行.

	jdlg.on("validate", onValidate);
	function onValidate(ev, mode, oriData, newData) 
	{
		var dfd = $.Deferred();
		app_alert("确认?", "q", function () {
			console.log("OK!");
			dfd.resolve();
		});
		ev.dfds.push(dfd.promise());
	}

常用于在validate中异步调用接口(比如上传文件).

@key event-retdata(ev, data, formMode)
form提交后事件，用于处理返回数据

以下事件将废弃：
@key event-initdata(ev, initData, formMode) 加载数据前触发。可修改要加载的数据initData, 用于为字段设置缺省值。将废弃，改用beforeshow事件。
@key event-loaddata(ev, initData, formMode) form加载数据后，一般用于将服务端数据转为界面显示数据。将废弃，改用show事件。
@key event-savedata(ev, formMode, initData) 对于设置了opt.url的窗口，将向后台提交数据，提交前将触发该事件，用于验证或补足数据（修正某个）将界面数据转为提交数据. 返回false或调用ev.preventDefault()可阻止form提交。将废弃，改用validate事件。

@see example-dialog 在对话框中使用事件

**reset控制**

对话框上有name属性的组件在显示对话框时会自动清除（除非设置opt.reset=false或组件设置有noReset属性）。

@key .my-reset 标识在显示对话框时应清除
对于没有name属性（不与数据关联）的组件，可加该CSS类标识要求清除。
例如，想在forSet模式下添加显示内容, 而在forFind/forAdd模式下时清除内容这样的需求。

	<div class="my-reset">...</div>

@key [noReset]
某些字段希望设置后一直保留，不要被清空，可以设置noReset属性，例如：

	<input type="hidden" name="status" value="PA" noReset>

 */
self.showDlg = showDlg;
function showDlg(jdlg, opt) 
{
	if (jdlg.constructor != jQuery)
		jdlg = $(jdlg);
	if (loadDialog(jdlg, onLoad))
		return;
	function onLoad() {
		showDlg(jdlg, opt);
	}

	opt = $.extend({
		okLabel: "确定",
		cancelLabel: "取消",
		noCancel: false,
		modal: true,
		reset: true,
		validate: true
	}, opt);

	jdlg.addClass('wui-dialog');
	callInitfn(jdlg);

	// TODO: 事件换成jdlg触发，不用jfrm。目前旧应用仍使用jfrm监听事件，暂应保持兼容。
	var jfrm = jdlg.is("form")? jdlg: jdlg.find("form:first");
	var formMode = jdlg.jdata().mode;
	jfrm.trigger("beforeshow", [formMode, opt]);

	var btns = [{text: opt.okLabel, iconCls:'icon-ok', handler: fnOk}];
	if (! opt.noCancel) 
		btns.push({text: opt.cancelLabel, iconCls:'icon-cancel', handler: fnCancel})
	if ($.isArray(opt.buttons))
		btns.push.apply(btns, opt.buttons);

	var dlgOpt = {
//		minimizable: true,
		maximizable: true,
		collapsible: true,
		resizable: true,

		// reset default pos.
		left: null,
		top: null,

		closable: ! opt.noCancel,
		modal: opt.modal,
		buttons: btns,
		title: opt.title
	};
	if (jdlg.is(":visible")) {
		dlgOpt0 = jdlg.dialog("options");
		$.extend(dlgOpt, {
			left: dlgOpt0.left,
			top: dlgOpt0.top
		});
	}
	jdlg.dialog(dlgOpt);

	jdlg.okCancel(fnOk, opt.noCancel? undefined: fnCancel);

	if (opt.reset)
	{
		mCommon.setFormData(jdlg); // reset
		// !!! NOTE: setFormData or form.reset does not reset hidden items, which causes data is not cleared for find mode !!!
		jdlg.find("[type=hidden]:not([noReset])").val("");
		jdlg.find(".my-reset").empty();
	}
	if (opt.data)
	{
		jfrm.trigger("initdata", [opt.data, formMode]); // TODO: remove. 用beforeshow替代。
		//jfrm.form("load", opt.data);
		var setOrigin = (formMode == FormMode.forSet);
		mCommon.setFormData(jdlg, opt.data, {setOrigin: setOrigin});
		jfrm.trigger("loaddata", [opt.data, formMode]); // TODO: remove。用show替代。
// 		// load for jquery-easyui combobox
// 		// NOTE: depend on jeasyui implementation. for ver 1.4.2.
// 		jfrm.find("[comboname]").each (function (i, e) {
// 			$(e).combobox('setValue', opt.data[$(e).attr("comboname")]);
// 		});
	}

// 	openDlg(jdlg);
	focusDlg(jdlg);
	jfrm.trigger("show", [formMode, opt.data]);

	function fnCancel() {closeDlg(jdlg)}
	function fnOk()
	{
		if (jdlg.hasClass("wui-readonly") && formMode!=FormMode.forFind) { // css("pointer-events") == "none"
			closeDlg(jdlg);
			return;
		}
		var ret = opt.validate? jfrm.form("validate"): true;
		if (! ret)
			return false;

		var newData = {};
		var dfd = self.triggerAsync(jfrm, "validate", [formMode, opt.data, newData]);
		if (dfd === false)
			return false;
		dfd.then(afterValidate);

		function afterValidate() {
			// TODO: remove. 用validate事件替代。
			var ev = $.Event("savedata");
			jfrm.trigger(ev, [formMode, opt.data]);
			if (ev.isDefaultPrevented())
				return false;

			var data = mCommon.getFormData(jdlg);
			$.extend(data, newData);
			if (opt.url) {
				if (opt.onSubmit && opt.onSubmit(data) === false)
					return false;

				// 批量更新
				if (formMode==FormMode.forSet && opt.url.action && /.set$/.test(opt.url.action)) {
					var jtbl = jdlg.jdata().jtbl;
					var obj = opt.url.action.replace(".set", "");
					var rv = batchOp(obj, "setIf", jtbl, data, function () {
						// TODO: onCrud();
						closeDlg(jdlg);
					});
					if (rv !== false)
						return;
				}
				self.callSvr(opt.url, success, data);
			}
			else {
				success(data);
			}
			// opt.onAfterSubmit && opt.onAfterSubmit(jfrm); // REMOVED
		}

		function success (data)
		{
			if (data != null && opt.onOk) {
				jfrm.trigger('retdata', [data, formMode]);
				opt.onOk.call(jdlg, data);
			}
		}
	}
}

// 按住Ctrl键进入批量模式。
var tmrBatch_;
$(document).keydown(function (e) {
	if (e.keyCode == 17) {
		m_batchMode = true;
		clearTimeout(tmrBatch_);
		tmrBatch_ = setTimeout(function () {
			m_batchMode = false;
			tmrBatch_ = null;
		},500);
	}
});
$(window).keyup(function (e) {
	if (e.keyCode == 17) {
		m_batchMode = false;
		clearTimeout(tmrBatch_);
	}
});

/**
@fn batchOp(obj, ac, jtbl, data/dataFn, onBatchDone?, forceFlag?)

@param ac "setIf"/"delIf"
@param data/dataFn 批量操作的参数。
可以是一个函数dataFn(batchCnt)，参数batchCnt为当前批量操作的记录数。
该函数返回data或一个Deferred对象(该对象适时应调用dfd.resolve(data)做批量操作)。dataFn返回false表示不做后续处理。

批量操作支持两种方式: 

1. 基于多选: 按Ctrl/Shift在表上多选，然后点删除或更新，批量操作选中行；
2. 基于条件: 按住Ctrl键点删除或更新，批量操作过滤条件下的所有行

函数返回false表示当前非批量处理模式，不予处理。

@param forceFlag 强制批量操作。
默认仅当多选或按住Ctrl键才认为是批量操作；
如果值为1，表示无须按Ctrl键，即如果有多选，就用多选；如果没有多选，则使用当前的过滤条件；
如果值为2，表示只基于选择项操作，即使只选了一项也对其操作。但如果没有选任何行，则使用过滤条件。

示例：批量更新附件到行记录上, 在onBatch中返回一个Deferred对象，并在获得数据后调用dfd.resolve(data)

	var forceFlag = 1; // 如果没有多选，则按当前过滤条件全部更新。
	WUI.batchOp("Task", "setIf", jtbl, onBatch, function () {
		WUI.closeDlg(jdlg);
	}, forceFlag);

	function onBatch(batchCnt)
	{
		if (batchCnt == 0) {
			app_alert("没有记录更新。");
			return false;
		}
		var dfd = $.Deferred();
		app_alert("批量上传附件到" + batchCnt + "行记录?", "q", function () {
			var dfd1 = triggerAsync(jdlg.find(".wui-upload"), "submit"); // 异步上传文件，返回Deferred对象
			dfd1.then(function () {
				var data = WUI.getFormData(jfrm);
				dfd.resolve(data);
			});
		});
		return dfd.promise();
	}

@see triggerAsync 异步事件调用

上面函数中处理异步调用链，不易理解，可以简单理解为：

	if (confirm("确认操作?") == no)
		return;
	jupload.submit();
	return getFormData(jfrm);

*/
self.batchOp = batchOp;
function batchOp(obj, ac, jtbl, data, onBatchDone, forceFlag)
{
	if (obj == null || jtbl == null)
		return false;
	var selArr =  jtbl.datagrid("getChecked");
	if (!forceFlag && ! (m_batchMode || selArr.length > 1)) {
		return false;
	}

	var acName;
	if (ac == "setIf") {
		acName = "批量更新";
	}
	else if (ac == "delIf") {
		acName = "批量删除";
	}
	else {
		return;
	}
	var queryParams;
	var doBatchOnSel = selArr.length > 1 && selArr[0].id != null;
	// forceFlag=2时，一行也批量操作
	if (!doBatchOnSel && forceFlag === 2 && selArr.length == 1 && selArr[0].id != null)
		doBatchOnSel = true;
	// 多选，cond为`id IN (...)`
	if (doBatchOnSel) {
		var idList = $.map(selArr, function (e) { return e.id}).join(',');
		queryParams = {cond: "t0.id IN (" + idList + ")"};
		confirmBatch(selArr.length);
	}
	else {
		var dgOpt = jtbl.datagrid("options");
		var p1 = dgOpt.url && dgOpt.url.params;
		var p2 = dgOpt.queryParams;
		queryParams = $.extend({}, p1, p2);
		var p3 = $.extend({}, queryParams, {res: "count(*) cnt"});
		self.callSvr(obj + ".query", p3, function (data1) {
			confirmBatch(data1.d[0][0]);
		});
	}
	return;
	
	function confirmBatch(batchCnt) {
		console.log(obj + "." + ac + ": " + JSON.stringify(queryParams));
		if (!$.isFunction(data)) {
			app_confirm(acName + batchCnt + "条记录？", function (b) {
				if (!b)
					return;
				doBatch(data);
			});
		}
		else {
			var dataFn = data;
			data = dataFn(batchCnt);
			if (data == false)
				return;
			$.when(data).then(doBatch);
		}
	}

	function doBatch(data) {
		if (ac == "setIf" && $.isEmptyObject(data)) {
			app_alert("没有需要更新的内容。");
			return;
		}
		self.callSvr(obj+"."+ac, queryParams, function (cnt) {
			onBatchDone && onBatchDone();
			reload(jtbl);
			app_alert(acName + cnt + "条记录");
		}, data);
	}
}

/**
@fn getTopDialog()

取处于最上层的对话框。如果没有，返回jo.size() == 0
*/
self.getTopDialog = getTopDialog;
function getTopDialog()
{
	var val = 0;
	var jo = $();
	$(".window:visible").each(function (i, e) {
		var z = parseInt(this.style.zIndex);
		if (z > val) {
			val = z;
			jo = $(this).find(".wui-dialog");
		}
	});
	return jo;
}

/**
@fn unloadPage(pageName?)

@param pageName 如未指定，表示当前页。

删除一个页面。一般用于开发过程，在修改外部逻辑页后，调用该函数删除页面。此后载入页面，可以看到更新的内容。

注意：对于内部逻辑页无意义。
*/
self.unloadPage = unloadPage;
function unloadPage(pageName)
{
	if (pageName == null) {
		pageName = self.getActivePage().attr("wui-pageName");
		if (pageName == null)
			return;
		self.tabClose();
	}
	// 不要删除内部页面
	var jo = $("."+pageName);
	if (jo.attr("wui-pageFile") == null)
		return;
	jo.remove();
	$("style[wui-origin=" + pageName + "]").remove();
}

/**
@fn reloadPage()

重新加载当前页面。一般用于开发过程，在修改外部逻辑页后，调用该函数可刷新页面。
*/
self.reloadPage = reloadPage;
function reloadPage()
{
	var showPageArgs = self.getActivePage().data("showPageArgs_");
	self.unloadPage();
	self.showPage.apply(this, showPageArgs);
}

/**
@fn unloadDialog(all?=false)
@alias reloadDialog

删除当前激活的对话框。一般用于开发过程，在修改外部对话框后，调用该函数清除以便此后再载入页面，可以看到更新的内容。

	WUI.reloadDialog();
	WUI.reloadDialog(true); // 重置所有外部加载的对话框(v5.1)

注意：

- 对于内部对话框调用本函数无意义。直接关闭对话框即可。
- 由于不知道打开对话框的参数，reloadDialog无法重新打开对话框，因而它的行为与unloadDialog一样。
*/
self.unloadDialog = unloadDialog;
self.reloadDialog = unloadDialog;
function unloadDialog(all)
{
	var jdlg = all? $(".wui-dialog[wui-pageFile]"): getTopDialog();
	if (jdlg.size() == 0)
		return;
	try { closeDlg(jdlg); } catch (ex) { console.log(ex); }

	// 是内部对话框，不做删除处理
	if (jdlg.attr("wui-pageFile") == null)
		return;
	var dlgId = jdlg.attr("id");
	try { jdlg.dialog("destroy"); } catch (ex) { console.log(ex); }
	jdlg.remove();
	$("style[wui-origin=" + dlgId + "]").remove();
	return jdlg;
}

// ---- object CRUD {{{
var BTN_TEXT = ["添加", "保存", "保存", "查找", "删除"];
// e.g. var text = BTN_TEXT[mode];

function getFindData(jfrm)
{
	var kvList = {};
	var kvList2 = {};
	jfrm.find(":input[name]").each(function(i,e) {
		if ($(e).hasClass("notForFind"))
			return;
		var v = $(e).val();
		if (v == null || v === "")
			return;
		if ($(e).hasClass("wui-notCond"))
			kvList2[e.name] = v;
		else
			kvList[e.name] = v;
	})
	var param = self.getQueryParam(kvList);
	if (kvList2) 
		$.extend(param, kvList2);
	return param;
}

/*
加载jdlg(当它的size为0时)，注意加载成功后会添加到jdlg对象中。
返回true表示将动态加载对话框，调用者应立即返回，后续逻辑在onLoad回调中操作。

	if (loadDialog(jdlg, onLoad))
		return;

	function onLoad() {
		showDlg(jdlg...);
	}
*/
function loadDialog(jdlg, onLoad)
{
	// 判断dialog未被移除
	if (jdlg.size() > 0 && jdlg[0].parentElement != null && jdlg[0].parentElement.parentElement != null)
		return;
	var jo = $(jdlg.selector);
	if (jo.size() > 0) {
		fixJdlg(jo);
		return;
	}

	function fixJdlg(jo)
	{
		jdlg.splice(0, jdlg.size(), jo[0]);
	}

	var dlgId = jdlg.selector.substr(1);
	var sel = "#tpl_" + dlgId;
	var html = $(sel).html();
	if (html) {
		loadDialogTpl(html, dlgId, pageFile);
		return;
	}

	var pageFile = getModulePath(dlgId + ".html");
	$.ajax(pageFile).then(function (html) {
		loadDialogTpl(html, dlgId, pageFile);
	})
	.fail(function () {
		//self.leaveWaiting();
	});

	function loadDialogTpl(html, dlgId, pageFile)
	{
		var jcontainer = $("#my-pages");
		// 注意：如果html片段中有script, 在append时会同步获取和执行(jquery功能)
		var jo = $(html).filter("div,form");
		if (jo.size() > 1 || jo.size() == 0) {
			console.log("!!! Warning: bad format for dialog '" + dlgId + "'. Element count = " + jo.size());
			jo = jo.filter(":first");
		}

		fixJdlg(jo);
		// 限制css只能在当前页使用
		jdlg.find("style").each(function () {
			$(this).html( self.ctx.fixPageCss($(this).html(), jdlg.selector) );
		});
		// bugfix: 加载页面页背景图可能反复被加载
		jdlg.find("style").attr("wui-origin", dlgId).appendTo(document.head);
		jdlg.attr("id", dlgId).appendTo(jcontainer);
		jdlg.attr("wui-pageFile", pageFile);
		jdlg.addClass('wui-dialog');

		$.parser.parse(jdlg); // easyui enhancement
		jdlg.find(">table:first, form>table:first").addClass("wui-form-table");
		self.enhanceWithin(jdlg);

		var val = jdlg.attr("wui-script");
		if (val != null) {
			var path = getModulePath(val);
			var dfd = mCommon.loadScript(path, onLoad);
			dfd.fail(function () {
				self.app_alert("加载失败: " + val);
			});
		}
		else {
			onLoad();
		}
	}
	return true;
}

/**
@fn showObjDlg(jdlg, mode, opt?={jtbl, id, obj})

@param jdlg 可以是jquery对象，也可以是selector字符串或DOM对象，比如 "#dlgOrder". 注意：当对话框保存为单独模块时，jdlg=$("#dlgOrder") 一开始会为空数组，这时也可以调用该函数，且调用后jdlg会被修改为实际加载的对话框对象。

@param opt.id String. mode=link时必设，set/del如缺省则从关联的opt.jtbl中取, add/find时不需要
@param opt.jtbl Datagrid. dialog/form关联的datagrid -- 如果dlg对应多个tbl, 必须每次打开都设置
@param opt.obj String. (v5.1) 对象对话框的对象名，如果未指定，则从my-obj属性获取。通过该参数可动态指定对象名。
@param opt.offline Boolean. (v5.1) 不与后台交互。
@param opt.title String. (v5.1) 指定对话框标题。

@key objParam 对象对话框的初始参数。

(v5.1)
此外，通过设置jdlg.objParam，具有和设置opt参数一样的功能，常在initPageXXX中使用，因为在page中不直接调用showObjDlg.
示例：

	var jdlg = $("#dlgSupplier");
	jdlg.objParam = {type: "C", obj: "Customer"};
	showObjDlg(jdlg, FormMode.forSet, {id:101});
	// 等价于 showObjDlg(jdlg, FormMode.forSet, {id:101, obj: "Customer", type: "C"});

在dialog的事件beforeshow(ev, formMode, opt)中，可以通过opt.objParam取出showObjDlg传入的所有参数opt。

@param opt.onCrud Function(). (v5.1) 对话框操作完成时回调。
一般用于点击表格上的增删改查工具按钮完成操作时插入逻辑。
在回调函数中this对象就是objParam，可通过this.mode获取操作类型。示例：

	jdlg1.objParam = {
		offline: true,
		onCrud: function () {
			if (this.mode == FormMode.forDel) {
				// after delete row
			}
			// ... 重新计算金额
			// ... 刷新关联的表格行
			// opt.objParam.reloadRow();
		}
	};
	jtbl.datagrid({
		toolbar: WUI.dg_toolbar(jtbl, jdlg1), // 添加增删改查工具按钮，点击则调用showObjDlg，这时objParam生效。
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg1),
		...
	});

在dialog逻辑中使用objParam:

	function initDlgXXX() {
		// ...
		jdlg.on("beforeshow", onBeforeShow);
		
		function onBeforeShow(ev, formMode, opt) {
			var objParam = opt.objParam; // {id, mode, jtbl?, offline?...}
		}
	}

@param opt.reloadRow() 可用于刷新本对话框关联的表格行数据

事件参考：
@see showDlg
*/
self.showObjDlg = showObjDlg;
function showObjDlg(jdlg, mode, opt)
{
	opt = $.extend({mode: mode}, jdlg.objParam, opt);
	if (jdlg.constructor != jQuery)
		jdlg = $(jdlg);
	if (loadDialog(jdlg, onLoad))
		return;
	function onLoad() {
		showObjDlg(jdlg, mode, opt);
	}

	callInitfn(jdlg);
	if (opt.jtbl) {
		jdlg.jdata().jtbl = opt.jtbl;
	}
	var id = opt.id;

// 一些参数保存在jdlg.jdata(), 
// mode: 上次的mode
// 以下参数试图分别从jdlg.jdata()和jtbl.jdata()上取. 当一个dlg对应多个tbl时，应存储在jtbl上。
// init_data: 用于add时初始化的数据 
// url_param: 除id外，用于拼url的参数
	var obj = opt.obj || jdlg.attr("my-obj");
	mCommon.assert(obj);
	var jd = jdlg.jdata();
	var jd2 = jd.jtbl && jd.jtbl.jdata();

	// get id
	var rowData;
	if (id == null) {
		if (mode == FormMode.forSet || mode == FormMode.forDel) // get dialog data from jtbl row, 必须关联jtbl
		{
			mCommon.assert(jd.jtbl);

			// 批量删除
			if (mode == FormMode.forDel) {
				var rv = batchOp(obj, "delIf", jd.jtbl, null, onCrud);
				if (rv !== false)
					return;
			}

			rowData = getRow(jd.jtbl);
			if (rowData == null)
				return;
			id = rowData.id;
		}
	}

	var url;
	if (mode == FormMode.forAdd) {
		if (! opt.offline)
			url = self.makeUrl([obj, "add"], jd.url_param);
		if (jd.jtbl) 
			jd.jtbl.datagrid("clearSelections");
	}
	else if (mode == FormMode.forSet) {
		if (! opt.offline)
			url = self.makeUrl([obj, "set"], {id: id});
	}
	else if (mode == FormMode.forDel) {
		if (opt.offline) {
			if (jd.jtbl) {
				var rowIndex = jd.jtbl.datagrid("getRowIndex", rowData);
				jd.jtbl.datagrid("deleteRow", rowIndex);
				onCrud();
			}
			return;
		}

		self.app_confirm("确定要删除一条记录?", function (b) {
			if (! b)
				return;

			var ac = obj + ".del";
			self.callSvr(ac, {id: id}, function(data) {
				if (jd.jtbl)
					reload(jd.jtbl);
				self.app_show('删除成功!');
				onCrud();
			});
		});
		return;
	}

	// TODO: 直接用jdlg
	var jfrm = jdlg.is("form")? jdlg: jdlg.find("form:first");
	
	// 设置find模式
	var doReset = ! (jd.mode == FormMode.forFind && mode == FormMode.forFind) // 一直是find, 则不清除
	if (mode == FormMode.forFind && jd.mode != FormMode.forFind) {
		jfrm.find(":input[name]").each (function (i,e) {
			var je = $(e);
			var bak = je.jdata().bak = {
				disabled: je.prop("disabled"),
				title: je.prop("title"),
				type: null
			}
			if (je.hasClass("notForFind") || je.attr("notForFind") != null) {
				je.prop("disabled", true);
				je.css("backgroundColor", "");
			}
			else {
				je.prop("disabled", false);
				je.addClass("wui-find-field");
				je.prop("title", self.queryHint);
				var type = je.attr("type");
				if (type && ["number", "date", "time", "datetime"].indexOf(type) >= 0) {
					bak.type = type;
					je.attr("type", "text");
				}
			}
		});
		jfrm.find(".easyui-validatebox").validatebox("disableValidation");
	}
	else if (jd.mode == FormMode.forFind && mode != FormMode.forFind) {
		jfrm.find(":input[name]").each (function (i,e) {
			var je = $(e);
			var bak = je.jdata().bak;
			je.prop("disabled", bak.disabled);
			je.removeClass("wui-find-field");
			je.prop("title", bak.title);
			if (bak.type) {
				je.attr("type", bak.type);
			}
		})
		jfrm.find(".easyui-validatebox").validatebox("enableValidation");
	}

	jd.mode = mode;

	// load data
	var load_data;
	if (mode == FormMode.forAdd) {
		var init_data = jd.init_data || (jd2 && jd2.init_data);
		load_data = $.extend({}, init_data);
	}
	else if (mode == FormMode.forSet) {
		if (rowData) {
			load_data = $.extend({}, rowData);
		}
		else {
			var load_url = self.makeUrl([obj, 'get'], {id: id});
			var data = self.callSvrSync(load_url);
			if (data == null)
				return;
			load_data = data;
		}
	}
	// objParam.reloadRow()
	opt.reloadRow = function () {
		if (mode == FormMode.forSet && opt.jtbl && rowData)
			self.reloadRow(opt.jtbl, rowData);
	};
	// open the dialog
	showDlg(jdlg, {
		url: url,
		title: opt.title,
		okLabel: BTN_TEXT[mode],
		validate: mode!=FormMode.forFind,
		modal: false,  // mode == FormMode.forAdd || mode == FormMode.forSet
		reset: doReset,
		data: load_data,
		onSubmit: onSubmit,
		onOk: onOk,
		objParam: opt
	});

	if (mode == FormMode.forSet)
		jfrm.form("validate");

	function onSubmit(data) {
		// 没有更新时直接关闭对话框
		if (mode == FormMode.forSet) {
			if ($.isEmptyObject(data)) {
				closeDlg(jdlg);
				return false;
			}
		}
	}
	function onOk (retData) {
		var jtbl = jd.jtbl;
		if (mode==FormMode.forFind) {
			var param = getFindData(jfrm);
			mCommon.assert(jtbl); // 查询结果显示到jtbl中
			// 归并table上的cond条件. dgOpt.url是makeUrl生成的，保存了原始的params
			var dgOpt = jtbl.datagrid("options");
			if (param.cond && dgOpt && dgOpt.url && dgOpt.url.params && dgOpt.url.params.cond) {
				param.cond = dgOpt.url.params.cond + " AND (" + param.cond + ")";
			}
			reload(jtbl, undefined, param);
			onCrud();
			return;
		}
		// add/set/link
		// TODO: add option to force reload all (for set/add)
		if (jtbl) {
			if (opt.offline) {
				if (mode == FormMode.forSet && rowData) {
					var idx = jtbl.datagrid("getRowIndex", rowData);
					$.extend(rowData, retData);
					jtbl.datagrid("refreshRow", idx);
				}
				else if (mode == FormMode.forAdd) {
					jtbl.datagrid("appendRow", retData);
				}
			}
			else {
				if (mode == FormMode.forSet && rowData)
					reloadRow(jtbl, rowData);
				else if (mode == FormMode.forAdd) {
					appendRow(jtbl, retData);
				}
				else
					reload(jtbl);
			}
		}
		if (mode == FormMode.forAdd)
		{
			showObjDlg(jdlg, mode); // reset and add another
		}
		else
		{
			closeDlg(jdlg);
		}
		if (!opt.offline)
			self.app_show('操作成功!');
		onCrud();
	}

	function onCrud() {
		if (obj && !opt.offline) {
			console.log("refresh: " + obj);
			$(".my-combobox").trigger("markRefresh", obj);
		}
		opt.onCrud && opt.onCrud();
	}
}

/**
@fn dg_toolbar(jtbl, jdlg, button_lists...)

@param jdlg 可以是对话框的jquery对象，或selector如"#dlgOrder".

设置easyui-datagrid上toolbar上的按钮。缺省支持的按钮有r(refresh), f(find), a(add), s(set), d(del), 可通过以下设置方式修改：

	// jtbl.jdata().toolbar 缺省值为 "rfasd"
	jtbl.jdata().toolbar = "rfs"; // 没有a-添加,d-删除

如果要添加自定义按钮，可通过button_lists一一传递.
示例：添加两个自定义按钮查询“今天订单”和“所有未完成订单”。

	function getTodayOrders()
	{
		var queryParams = WUI.getQueryParam({comeTm: new Date().format("D")});
		WUI.reload(jtbl, null, queryParams);
	}
	// 显示待服务/正在服务订单
	function getTodoOrders()
	{
		var queryParams = {cond: "status=" + OrderStatus.Paid + " or status=" + OrderStatus.Started};
		WUI.reload(jtbl, null, queryParams);
	}
	var btn1 = {text: "今天订单", iconCls:'icon-search', handler: getTodayOrders};
	var btn2 = {text: "所有未完成", iconCls:'icon-search', handler: getTodoOrders};

	// 默认显示当天订单
	var queryParams = WUI.getQueryParam({comeTm: new Date().format("D")});

	var dgOpt = {
		url: WUI.makeUrl(["Ordr", "query"]),
		queryParams: queryParams,
		pageList: ...
		pageSize: ...
		// "-" 表示按钮之间加分隔符
		toolbar: WUI.dg_toolbar(jtbl, jdlg, btn1, "-", btn2),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
	};
	jtbl.datagrid(dgOpt);

特别地，要添加导出数据到Excel文件的功能按钮，可以增加参数"export"作为按钮定义：

	var dgOpt = {
		...
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export", "-", btn1),
	}

如果想自行定义导出行为参数，可以参考WUI.getExportHandler
@see getExportHandler 导出按钮设置
*/
self.dg_toolbar = dg_toolbar;
function dg_toolbar(jtbl, jdlg)
{
	var toolbar = jtbl.jdata().toolbar || "rfasd";
	var btns = [];

	/*
	var org_url, org_param;

	// at this time jtbl object has not created
	setTimeout(function () {
		var jtbl_opt = jtbl.datagrid("options");
		org_url = jtbl_opt.url;
		org_param = jtbl_opt.queryParams || '';
	}, 100);
	*/

	var tb = {
		r: {text:'刷新', iconCls:'icon-reload', handler: function() { reload(jtbl); /* reload(jtbl, org_url, org_param) */ } },
		f: {text:'查询', iconCls:'icon-search', handler: function () {
			showObjDlg(jdlg, FormMode.forFind, {jtbl: jtbl});
		}},
		a: {text:'新增', iconCls:'icon-add', handler: function () {
			showObjDlg(jdlg, FormMode.forAdd, {jtbl: jtbl});
		}},
		s: {text:'修改', iconCls:'icon-edit', handler: function () {
			showObjDlg(jdlg, FormMode.forSet, {jtbl: jtbl});
		}}, 
		d: {text:'删除', iconCls:'icon-remove', handler: function () { 
			showObjDlg(jdlg, FormMode.forDel, {jtbl: jtbl});
		}},
		'export': {text: '导出', iconCls: 'icon-save', handler: getExportHandler(jtbl)}
	};
	$.each(toolbar.split(""), function(i, e) {
		if (tb[e]) {
			btns.push(tb[e]);
			btns.push("-");
		}
	});
	for (var i=2; i<arguments.length; ++i) {
		var btn = arguments[i];
		if (! btn)
			continue;
		if (btn !== '-' && typeof(btn) == "string") {
			btn = tb[btn];
			mCommon.assert(btn, "toolbar button name does not support");
		}
		btns.push(btn);
	}

	return btns;
}

/**
@fn dg_dblclick(jtbl, jdlg)

@param jdlg 可以是对话框的jquery对象，或selector如"#dlgOrder".

设置双击datagrid行的回调，功能是打开相应的dialog
*/
self.dg_dblclick = function (jtbl, jdlg)
{
	return function (idx, data) {
		jtbl.datagrid("selectRow", idx);
		showObjDlg(jdlg, FormMode.forSet, {jtbl: jtbl});
	}
}

//}}}

/**
@key a[href=#page]
@key a[href=?fn]

页面中的a[href]字段会被框架特殊处理：

	<a href="#pageHome">首页</a>
	<a href="?logout">退出登录</a>

- href="#pageXXX"开头的，点击时会调用 WUI.showPage("#pageXXX");
- href="?fn"，会直接调用函数 fn();
*/
self.m_enhanceFn["a[href^=#]"] = enhanceAnchor;
function enhanceAnchor(jo)
{
	if (jo.attr("onclick"))
		return;

	jo.click(function (ev) {
		var href = $(this).attr("href");
		if (href.search(/^#(page\w+)$/) >= 0) {
			var pageName = RegExp.$1;
			WUI.showPage.call(this, pageName);
			return false;
		}
		else if (href.search(/^\?(\w+)$/) >= 0) {
			var fn = RegExp.$1;
			fn = eval(fn);
			if (fn)
				fn.call(this);
			return false;
		}
	});
}

/**
@fn getExportHandler(jtbl, ac?, param?={})

为数据表添加导出Excel菜单，如：

	jtbl.datagrid({
		url: WUI.makeUrl("User.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, {text:'导出', iconCls:'icon-save', handler: WUI.getExportHandler(jtbl) }),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
	});

默认是导出数据表中直接来自于服务端的字段，并应用表上的查询条件及排序。
也可以通过设置param参数手工指定，如：

	handler: WUI.getExportHandler(jtbl, "User.query", {res: "id 编号, name 姓名, createTm 注册时间", orderby: "createTm DESC"})

注意：由于分页机制影响，会设置参数{pagesz: -1}以便在一页中返回所有数据，而实际一页能导出的最大数据条数取决于后端设置（默认1000，参考后端文档 AccessControl::$maxPageSz）。

@see getQueryParamFromTable 获取datagrid的当前查询参数
*/
self.getExportHandler = getExportHandler;
function getExportHandler(jtbl, ac, param)
{
	param = $.extend({}, {
		fmt: "excel",
		pagesz: -1
	}, param);
	if (ac == null) {
		setTimeout(function () {
			ac = jtbl.datagrid("options").url;
		});
	}

	return function () {
		var debugShow = m_batchMode;
		var p1 = getQueryParamFromTable(jtbl, param);
		var url = WUI.makeUrl(ac, p1);
		// !!! 调试导出的方法：在控制台中设置  window.open=$.get 即可查看请求响应过程。
		console.log("export: " + url);
		console.log("(HINT: debug via Ctrl-Export OR window.open=$.get)");
		if (debugShow) {
			$.get(url);
			return;
		}
		window.open(url);
	}
}

/**
@fn getQueryParamFromTable(jtbl, param?)
@alias getParamFromTable

根据数据表当前设置，获取查询参数。
可能会设置{cond, orderby, res}参数。

res参数从列设置中获取，如"id 编号,name 姓名", 特别地，如果列对应字段以"_"结尾，不会加入res参数。

(v5.2)
如果表上有多选行，则导出条件为cond="t0.id IN (id1, id2)"这种形式。

@see getExportHandler 导出Excel
*/
self.getQueryParamFromTable = self.getParamFromTable = getQueryParamFromTable;
function getQueryParamFromTable(jtbl, param)
{
	var opt = jtbl.datagrid("options");

	param = $.extend({}, opt.queryParams, param);
	var selArr =  jtbl.datagrid("getChecked");
	if (selArr.length > 1 && selArr[0].id != null) {
		var idList = $.map(selArr, function (e) { return e.id}).join(',');
		param.cond = "t0.id IN (" + idList + ")";
	}
	if (param.orderby === undefined && opt.sortName) {
		param.orderby = opt.sortName;
		if (opt.sortOrder && opt.sortOrder.toLowerCase() != "asc")
			param.orderby += " " + opt.sortOrder;
	}
	if (param.res === undefined) {
		var res = '';
		$.each(opt.columns[0], function (i, e) {
			if (! e.field || e.field.substr(-1) == "_")
				return;
			if (res.length > 0)
				res += ',';
			res += e.field + " \"" + e.title + "\"";
			if (e.jdEnumMap) {
				res += '=' + mCommon.kvList2Str(e.jdEnumMap, ';', ':');
			}
		});
		param.res = res;
	}
	if (param.fname === undefined) {
		param.fname = jtbl.prop("title") || jtbl.closest(".wui-page").prop("title");
	}
	return param;
}

var Formatter = {
	dt: function (value, row) {
		var dt = WUI.parseDate(value);
		if (dt == null)
			return value;
		return dt.format("L");
	},
	number: function (value, row) {
		return parseFloat(value);
	},
	pics: function (value, row) {
		if (value == null)
			return "(无图)";
		return '<a target="_black" href="' + WUI.makeUrl("pic", {id:value}) + '">' + value + '</a>';
		/*
		return value.replace(/(\d+),?/g, function (ms, picId) {
			var url = WUI.makeUrl("att", {thumbId: picId});
			return "<a target='_black' href='" + url + "'>" + picId + "</a>&nbsp;";
		});
		*/
	},
	flag: function (yes, no) {
		if (yes == null)
			yes = "是";
		if (no == null)
			no = "否";
		return function (value, row) {
			if (value == null)
				return;
			return value? yes: no;
		}
	},
	enum: function (enumMap, sep) {
		sep = sep || ',';
		return function (value, row) {
			if (value == null)
				return;
			var v = enumMap[value];
			if (v != null)
				return v;
			if (value.indexOf(sep) > 0) {
				var v1 = $.map(value.split(sep), function(e) {
					return enumMap[e] || e;
				});
				v = v1.join(sep);
			}
			else {
				v = value;
			}
			return v;
		}
	},
	linkTo: function (field, dlgRef) {
		return function (value, row) {
			if (value == null)
				return;
			return self.makeLinkTo(dlgRef, row[field], value);
		}
	}
};

/**
@var formatter = {dt, number, pics, flag(yes?=是,no?=否), enum(enumMap), linkTo(field, dlgRef) }

常常应用定义Formatter变量来扩展WUI.formatter，如

	var Formatter = {
		userId: WUI.formatter.linkTo("userId", "#dlgUser"),
		orderStatus: WUI.formatter.enum({CR: "新创建", CA: "已取消"})
	};
	Formatter = $.extend(WUI.formatter, Formatter);

可用值：

- dt/number: 显示日期、数值
- pics: 显示一张或一组图片链接，点一个链接可以在新页面上显示原图片
- enum(enumMap): 根据一个map为枚举值显示描述信息，如 `enum({CR:"创建", CA:"取消"})`。
 (v5.1) 也支持枚举值列表，如设置为 `enumList({emp:"员工", mgr:"经理"})`，则会将"emp"和"emp,mgr"分别解析为"员工", "员工,经理"
- flag(yes?, no?): 显示yes-no字段，如 `flag("禁用","启用")`，也可以用enum，如`enum({0:"启用",1:"禁用"})`
- linkTo: 生成链接，点击打开对象详情对话框

在datagrid中使用：

	<th data-options="field:'createTm', sortable:true, formatter:Formatter.dt">创建时间</th>
	<th data-options="field:'amount', sortable:true, sorter: numberSort, formatter:Formatter.number">金额</th>
	<th data-options="field:'userName', sortable:true, formatter:Formatter.userId">用户</th>
	<th data-options="field:'status', sortable:true, jdEnumMap: OrderStatusMap, formatter: Formatter.orderStatus">状态</th>
	<th data-options="field:'done', sortable:true, formatter: Formatter.flag()">已处理</th>
*/
self.formatter = Formatter;

// ---- easyui setup {{{

$.extend($.fn.combobox.defaults, {
	valueField: 'val',
	textField: 'text'
});

function dgLoader(param, success, error)
{
	var jo = $(this);
	var opts = jo.datagrid("options");
	if (opts.data) {
		return defaultDgLoader.apply(this, arguments);
	}
	if (opts.url == null)
		return false;
	var param1 = {};
	for (var k in param) {
	/* TODO: enable page param in interface obj.query, disable rows/page
		if (k === "rows") {
			param1.pagesz = param[k];
		}
		else if (k === "page") {
			param1.page = param[k];
		}
	*/
		if (k === "sort") {
			param1.orderby = param.sort + " " + param.order;
		}
		else if (k === "order") {
		}
		else {
			param1[k] = param[k];
		}
	}
	self.callSvr(opts.url, param1, success);
	// TODO: 调用失败时调用error？
}

function dgLoadFilter(data)
{
	var ret = jdListToDgList(data);
	var isOnePage = (ret.total == ret.rows.length);
	// 隐藏pager: 一页能显示完且不超过5条.
	$(this).datagrid("getPager").toggle(! (isOnePage && ret.total <= 5));
	// 超过1页使用remoteSort, 否则使用localSort.
	$(this).datagrid("options").remoteSort = (! isOnePage);
	return ret;
}

function resetPageNumber(jtbl)
{
	var opt = jtbl.datagrid('options');
	if (opt.pagination && opt.pageNumber)
	{
		opt.pageNumber = 1;
		var jpager = jtbl.datagrid("getPager");
		jpager.pagination("refresh", {pageNumber: opt.pageNumber});
	}
}

var defaultDgLoader = $.fn.datagrid.defaults.loader;
$.extend($.fn.datagrid.defaults, {
// 		fit: true,
// 		width: 1200,
// 		height: 800,
// 		method: 'POST',

	rownumbers:true,
	//singleSelect:true,
	ctrlSelect: true, // 默认是单选，按ctrl或shift支持多选

// 	pagination: false,
	pagination: true,
	pageSize: 20,
	pageList: [20,30,50],

	loadFilter: dgLoadFilter,
	loader: dgLoader,

	onLoadError: self.ctx.defAjaxErrProc,
	onBeforeSortColumn: function (sort, order) {
		var jtbl = $(this);
		resetPageNumber(jtbl);
	},

	// bugfix: 有时无法显示横向滚动条
	onLoadSuccess: function (data) {
		$(this).datagrid("fitColumns");
	}

	// Decided in dgLoadFilter: 超过1页使用remoteSort, 否则使用localSort.
	// remoteSort: false

// 	// 用于单选并且不清除选择, 同时取data("sel")可取到当前所选行号idx。this = grid
// 	onSelect: function (idx, data) {
// 		$(this).data("sel", idx);
// 	},
// 	onUnselect: function (idx, data) {
// 		if (idx === $(this).data("sel"))
// 			$(this).datagrid("selectRow", idx);
// 	}
});

/*
function checkIdCard(idcard)
{
	if (idcard.length != 18)
		return false;

	if (! /\d{17}[0-9x]/i.test(idcard))
		return false;

	var a = idcard.split("");
	var w = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2];
	var s = 0;
	for (var i=0; i<17; ++i)
	{
		s += a[i] * w[i];
	}
	var x = "10x98765432".substr(s % 11, 1);
	return x == a[17].toLowerCase();
}
*/
/**
@key .easyui-validatebox

为form中的组件加上该类，可以限制输入类型，如：

	<input name="amount" class="easyui-validatebox" data-options="required:true,validType:'number'" >

validType还支持：

- number: 数字
- uname: 4-16位用户名，字母开头
- cellphone: 11位手机号
- datetime: 格式为"年-月-日 时:分:秒"，时间部分可忽略

其它自定义规则(或改写上面规则)，可通过下列方式扩展：

	$.extend($.fn.validatebox.defaults.rules, {
		workday: {
			validator: function(value) {
				return value.match(/^[1-7,abc]+$/);
			},
			message: '格式例："1,3a,5b"表示周一,周三上午,周五下午.'
		}
	});

*/
var DefaultValidateRules = {
	number: {
		validator: function(v) {
			return v.length==0 || /^[0-9.-]+$/.test(v);
		},
		message: '必须为数字!'
	},
	/*
	workday: {
		validator: function(value) {
			return value.match(/^[1-7,abc]+$/);
		},
		message: '格式例："1,3a,5b"表示周一,周三上午,周五下午.'
	},
	idcard: {
		validator: checkIdCard,
		message: '18位身份证号有误!'
	},
	*/
	uname: {
		validator: function (v) {
			return v.length==0 || (v.length>=4 && v.length<=16 && /^[a-z]\w+$/i.test(v));
		},
		message: "4-16位英文字母或数字，以字母开头，不能出现符号."
	},
	pwd: {
		validator: function (v) {
			return v.length==0 || (v.length>=4 && v.length<=16) || v.length==32; // 32 for md5 result
		},
		message: "4-16位字母、数字或符号."
	},
	equalTo: {
		validator: function (v, param) { // param: [selector]
			return v.length==0 || v==$(param[0]).val();
		},
		message: "两次输入不一致."
	},
	cellphone: {
		validator: function (v) {
			return v.length==0 || (v.length==11 && !/\D/.test(v)); // "
		},
		message: "手机号为11位数字"
	},
	datetime: {
		validator: function (v) {
			return v.length==0 || /\d{4}-\d{1,2}-\d{1,2}( \d{1,2}:\d{1,2}(:\d{1,2})?)?/.test(v);
		},
		message: "格式为\"年-月-日 时:分:秒\"，时间部分可忽略"
	},
	usercode: {
		validator: function (v) {
			return v.length==0 || /^[a-zA-Z]/.test(v) || (v.length==11 && !/\D/.test(v)); 
		},
		message: "11位手机号或客户代码"
	}
};
$.extend($.fn.validatebox.defaults.rules, DefaultValidateRules);

// tabs自动记住上次选择
/*
$.extend($.fn.tabs.defaults, {
	onSelect: function (title) {
		var t = this.closest(".easyui-tabs");
		var stack = t.data("stack");
		if (stack === undefined) {
			stack = [];
			t.data("stack", stack);
		}
		if (title != stack[stack.length-1]) {
			var idx = stack.indexOf(title);
			if (idx >= 0) 
				stack.splice(idx, 1);
			stack.push(title);
		}
	},
	onClose: function (title) {
		var t = this.closest(".easyui-tabs");
		var stack = t.data("stack");
		var selnew = title == stack[stack.length-1];
		var idx = stack.indexOf(title);
		if (idx >= 0)
			stack.splice(idx, 1);
		if (selnew && stack.length >0) {
			// 向上找到tabs
			$(t).tabs("select", stack[stack.length-1]);
		}
	}
});
*/
// }}}

// 支持自动初始化mycombobox
self.m_enhanceFn[".my-combobox"] = function (jo) {
	jo.mycombobox();
};
/**
@key .wui-form-table

在wui-dialog上，对于form下直接放置的table，一般用于字段列表排列，框架对它添加类wui-form-table并自动对列设置百分比宽度，以自适应显示。

在非对话框上，也可手工添加此类来应用该功能。

 */
self.m_enhanceFn[".wui-form-table"] = enhanceTableLayout;
function enhanceTableLayout(jo) {
	var tbl = jo[0];
	if (tbl.rows.length == 0)
		return;
	var tr = tbl.rows[0];
	var colCnt = tr.cells.length;
	var doAddTr = false;
	// 考虑有colspan的情况
	for (var j=0; j<tr.cells.length; ++j) {
		var td = tr.cells[j];
		if (td.getAttribute("colspan") != null) {
			colCnt += parseInt(td.getAttribute("colspan"))-1;
			doAddTr = true;
		}
	}
	var rates = {
		2: ["10%", "90%"],
		4: ["10%", "40%", "10%", "40%"],
		6: ["5%", "25%", "5%", "25%", "5%", "25%"]
	};
	if (!rates[colCnt])
		return;
	// 如果首行有colspan，则添加隐藏行定宽
	if (doAddTr) {
		var td = dup("<td></td>", colCnt);
		$('<tr class="wui-form-table-tr-width" style="visibility:hidden">' + td + '</tr>').prependTo(jo);
		tr = tbl.rows[0];
	}
	for (var i=0; i<colCnt; ++i) {
		var je = $(tr.cells[i]);
		if (je.attr("width") == null)
			je.attr("width", rates[colCnt][i]);
	}

	function dup(s, n) {
		var ret = '';
		for (var i=0; i<n; ++i) {
			ret += s;
		}
		return ret;
	}
};

function main()
{
	self.title = document.title;
	self.container = $(".wui-container");
	if (self.container.size() == 0)
		self.container = $(document.body);
	self.enhanceWithin(self.container);

	// 在muiInit事件中可以调用showPage.
	self.container.trigger("wuiInit");

// 	// 根据hash进入首页
// 	if (self.showFirstPage)
// 		showPage();
}

$(main);

}
// ====== WEBCC_END_FILE wui-showPage.js }}}

// ====== WEBCC_BEGIN_FILE wui.js {{{
jdModule("jdcloud.wui", JdcloudWui);
function JdcloudWui()
{
var self = this;
var mCommon = jdModule("jdcloud.common");

// 子模块
JdcloudApp.call(self);
JdcloudCall.call(self);
JdcloudPage.call(self);

// ====== global {{{
/**
@var isBusy

标识应用当前是否正在与服务端交互。一般用于自动化测试。
*/
self.isBusy = false;

/**
@var g_args

应用参数。

URL参数会自动加入该对象，例如URL为 `http://{server}/{app}/index.html?orderId=10&dscr=上门洗车`，则该对象有以下值：

	g_args.orderId=10; // 注意：如果参数是个数值，则自动转为数值类型，不再是字符串。
	g_args.dscr="上门洗车"; // 对字符串会自动进行URL解码。

此外，框架会自动加一些参数：

@var g_args._app?="user" 应用名称，由 WUI.options.appName 指定。

@see parseQuery URL参数通过该函数获取。
*/
window.g_args = {}; // {_test, _debug}

/**
@var g_data = {userInfo?}

应用全局共享数据。

在登录时，会自动设置userInfo属性为个人信息。所以可以通过 g_data.userInfo==null 来判断是否已登录。

@key g_data.userInfo

*/
window.g_data = {}; // {userInfo}

/**
@var BASE_URL

TODO: remove

设置应用的基本路径, 应以"/"结尾.

*/
window.BASE_URL = "../";

window.FormMode = {
	forAdd: 'A',
	forSet: 'S',
	forLink: 'S', // 与forSet合并，此处为兼容旧版。
	forFind: 'F',
	forDel: 'D'  // 该模式实际上不会打开dlg
};

/**
@var options

{appName=user, title="客户端", onShowLogin, pageHome="pageHome", pageFolder="page"}

- appName: 用于与后端通讯时标识app.
- pageHome: 首页的id, 默认为"pageHome"
- pageFolder: 子页面或对话框所在文件夹, 默认为"page"
*/
self.options = {
	title: "客户端",
	appName: "user",
	onShowLogin: function () { throw "NotImplemented"; },
	pageHome: "pageHome",
	pageFolder: "page",

	serverUrl: "./",

	logAction: false,
	PAGE_SZ: 20,
	manualSplash: false,
	mockDelay: 50
};

//}}}

// TODO: remove testmode
// set g_args
function parseArgs()
{
	if (location.search) {
		g_args = mCommon.parseQuery(location.search.substr(1));
		if (g_args.test || g_args._test) {
			g_args._test = 1;
			alert("测试模式!");
		}
	}
}
parseArgs();

/**
@fn app_alert(msg, [type?=i], [fn?], opt?={timeoutInterval?, defValue?, onCancel()?})
@param type 对话框类型: "i": info, 信息提示框; "e": error, 错误框; "w": warning, 警告框; "q"(与app_confirm一样): question, 确认框(会有"确定"和"取消"两个按钮); "p": prompt, 输入框
@param fn Function(text?) 回调函数，当点击确定按钮时调用。当type="p" (prompt)时参数text为用户输入的内容。
@param opt Object. 可选项。 timeoutInterval表示几秒后自动关闭对话框。defValue用于输入框(type=p)的缺省值.

使用jQuery easyui弹出提示对话框.

示例:

	// 信息框，3s后自动点确定
	app_alert("操作成功", function () {
		WUI.showPage("pageGenStat");
	}, {timeoutInterval: 3000});

	// 错误框
	app_alert("操作失败", "e");

	// 确认框(确定/取消)
	app_alert("立即付款?", "q", function () {
		WUI.showPage("#pay");
	});

	// 输入框
	app_alert("输入要查询的名字:", "p", function (text) {
		callSvr("Book.query", {cond: "name like '%" + text + "%'"});
	});

*/
self.app_alert = app_alert;
function app_alert(msg)
{
	var type = "i";
	var fn = undefined;
	var alertOpt = {};
	var jmsg;

	for (var i=1; i<arguments.length; ++i) {
		var arg = arguments[i];
		if ($.isFunction(arg)) {
			fn = arg;
		}
		else if ($.isPlainObject(arg)) {
			alertOpt = arg;
		}
		else if (typeof(arg) === "string") {
			type = arg;
		}
	}
	if (type == "q") {
		app_confirm(msg, function (isOk) {
			if (isOk) {
				fn && fn();
			}
			else if (alertOpt.onCancel) {
				alertOpt.onCancel();
			}
		});
		return;
	}
	else if (type == "p") {
		jmsg = $.messager.prompt(self.options.title, msg, function(text) {
			if (text && fn) {
				fn(text);
			}
		});
		setTimeout(function () {
			var ji = jmsg.find(".messager-input");
			ji.focus();
			if (alertOpt.defValue) {
				ji.val(alertOpt.defValue);
			}
		});
		return;
	}

	var icon = {i: "info", w: "warning", e: "error"}[type];
	var s = {i: "提示", w: "警告", e: "出错"}[type] || "";
	var s1 = "<b>[" + s + "]</b>";
	jmsg = $.messager.alert(self.options.title + " - " + s, s1 + " " + msg, icon, fn);

	// 查看jquery-easyui对象，发现OK按钮的class=1-btn
	setTimeout(function() {
		var jbtn = jmsg.find(".l-btn");
		jbtn.focus();
		if (alertOpt.timeoutInterval) {
			setTimeout(function() {
				jbtn.click();
			}, alertOpt.timeoutInterval);
		}
	});
}

/**
@fn app_confirm(msg, fn?)
@param fn Function(isOk). 用户点击确定或取消后的回调。

使用jQuery easyui弹出确认对话框.
*/
self.app_confirm = app_confirm;
function app_confirm(msg, fn)
{
	var s = "<div style='font-size:10pt'>" + msg.replace(/\n/g, "<br/>") + "</div>";
	$.messager.confirm(self.options.title + " - " + "确认", s, fn);
}

/**
@fn app_show(msg)

使用jQuery easyui弹出对话框.
*/
self.app_show = app_show;
function app_show(msg)
{
	$.messager.show({title: self.options.title, msg: msg});
}

/**
@fn app_progress(value, msg?)

@param value 0-100间数值.

显示进度条对话框. 达到100%后自动关闭.

注意：同一时刻只能显示一个进度条。
 */
self.app_progress = app_progress;
var m_isPgShow = false;
function app_progress(value, msg)
{
	value = Math.round(value);
	if (! m_isPgShow) {
		$.messager.progress({interval:0});
		m_isPgShow = true;
	}
	if (msg !== undefined) {
		$(".messager-p-msg").html(msg || '');
	}
	var bar = $.messager.progress('bar');
	bar.progressbar("setValue", value);
	if (value >= 100) {
		setTimeout(function () {
			if (m_isPgShow) {
				$.messager.progress('close');
				m_isPgShow = false;
			}
		}, 500);
	}
	/*
	var jdlg = $("#dlgProgress");
	if (jdlg.size() == 0) {
		jdlg = $('<div id="dlgProgress"><p class="easyui-progressbar"></p></div>');
	}
	if (value >= 100) {
		setTimeout(function () {
			jdlg.dialog('close');
		}, 500);
	}
	if (!jdlg.data('dialog')) {
		jdlg.dialog({title:'进度', closable:false, width: 200});
		$.parser.parse(jdlg);
	}
	else if (jdlg.dialog('options').closed) {
		jdlg.dialog('open');
	}
	var jpg = jdlg.find(".easyui-progressbar");
	jpg.progressbar("setValue", value);
	return jdlg;
	*/
}

/**
@fn makeLinkTo(dlg, id, text?=id, obj?)

生成一个链接的html代码，点击该链接可以打开指定对象的对话框。

示例：根据订单号，生成一个链接，点击链接打开订单详情对话框。

	var orderId = 101;
	var html = makeLinkTo("#dlgOrder", orderId, "订单" + orderId);

(v5.1)
示例：如果供应商(obj=Supplier)和客户(obj=Customer)共用一个对话框BizPartner，要显示一个id=101的客户，必须指定obj参数：

	var html = makeLinkTo("#dlgBizPartner", 101, "客户-101", "Customer");

点击链接将调用

	WUI.showObjDlg("#dlgBizPartner", FormMode.forSet, {id: 101, obj: "Customer"};

*/
self.makeLinkTo = makeLinkTo;
function makeLinkTo(dlg, id, text, obj)
{
	if (text == null)
		text = id;
	var optStr = obj==null? "{id:"+id+"}": "{id:"+id+",obj:\"" + obj + "\"}";
	return "<a href=\"" + dlg + "\" onclick='WUI.showObjDlg(\"" + dlg + "\",FormMode.forSet," + optStr + ");return false'>" + text + "</a>";
}

// ====== login token for auto login {{{
function tokenName()
{
	var name = "token";
	if (self.options.appName)
		name += "_" + self.options.appName;
	if (g_args._test)
		name += "_test";
	return name;
}

function saveLoginToken(data)
{
	if (data._token)
	{
		mCommon.setStorage(tokenName(), data._token);
	}
}
function loadLoginToken()
{
	return mCommon.getStorage(tokenName());
}
function deleteLoginToken()
{
	mCommon.delStorage(tokenName());
}

/**
@fn tryAutoLogin(onHandleLogin, reuseCmd?)

@param onHandleLogin Function(data). 调用后台login()成功后的回调函数(里面使用this为ajax options); 可以直接使用WUI.handleLogin
@param reuseCmd String. 当session存在时替代后台login()操作的API, 如"User.get", "Employee.get"等, 它们在已登录时返回与login相兼容的数据. 因为login操作比较重, 使用它们可减轻服务器压力. 
@return Boolean. true=登录成功; false=登录失败.

该函数一般在页面加载完成后调用，如

	function main()
	{
		$.extend(WUI.options, {
			appName: APP_NAME,
			title: APP_TITLE,
			onShowLogin: showDlgLogin
		});

		WUI.tryAutoLogin(WUI.handleLogin, "whoami");
	}

	$(main);

*/
self.tryAutoLogin = tryAutoLogin;
function tryAutoLogin(onHandleLogin, reuseCmd)
{
	var ok = false;
	var ajaxOpt = {async: false, noex: true};

	function handleAutoLogin(data)
	{
		if (data === false) // has exception (as noex=true)
			return;

		if (onHandleLogin)
			onHandleLogin.call(this, data);
		ok = true;
	}

	// first try "User.get"
	if (reuseCmd != null) {
		self.callSvr(reuseCmd, handleAutoLogin, null, ajaxOpt);
	}
	if (ok)
		return ok;

	// then use "login(token)"
	var token = loadLoginToken();
	if (token != null)
	{
		var postData = {token: token};
		self.callSvr("login", handleAutoLogin, postData, ajaxOpt);
	}
	if (ok)
		return ok;

	self.options.onShowLogin();
	return ok;
}

/**
@fn handleLogin(data)
@param data 调用API "login"成功后的返回数据.

处理login相关的操作, 如设置g_data.userInfo, 保存自动登录的token等等.

*/
self.handleLogin = handleLogin;
function handleLogin(data)
{
	g_data.userInfo = data;
	// 自动登录: http://...?autoLogin
	if (g_args.autoLogin || /android|ipad|iphone/i.test(navigator.userAgent))
		saveLoginToken(data);

	self.showPage(self.options.pageHome);
}
//}}}

// ------ plugins {{{
/**
@fn initClient()
*/
self.initClient = initClient;
var plugins_ = {};
function initClient()
{
	self.callSvrSync('initClient', function (data) {
		plugins_ = data.plugins || {};
		$.each(plugins_, function (k, e) {
			if (e.js) {
				// plugin dir
				var js = BASE_URL + 'plugin/' + k + '/' + e.js;
				mCommon.loadScript(js, null, true);
			}
		});
	});
}

/**
@class Plugins
*/
window.Plugins = {
/**
@fn Plugins.exists(pluginName)
*/
	exists: function (pname) {
		return plugins_[pname] !== undefined;
	},

/**
@fn Plugins.list()
*/
	list: function () {
		return plugins_;
	}
};
//}}}

/**
@fn setApp(opt)

@see options

TODO: remove. use $.extend instead.
*/
self.setApp = setApp;
function setApp(app)
{
	$.extend(self.options, app);
}

/**
@fn logout(dontReload?=0)
@param dontReload 如果非0, 则注销后不刷新页面.

注销当前登录, 成功后刷新页面(除非指定dontReload=1)
*/
self.logout = logout;
function logout(dontReload)
{
	deleteLoginToken();
	g_data.userInfo = null;
	self.callSvr("logout", function (data) {
		if (! dontReload)
			mCommon.reloadSite();
	});
}

/**
@fn tabClose(idx?)

关闭指定idx的标签页。如果未指定idx，则关闭当前标签页.
*/
self.tabClose = tabClose;
function tabClose(idx)
{
	if (idx == null) {
		var jtab = self.tabMain.tabs("getSelected");
		idx = self.tabMain.tabs("getTabIndex", jtab);
	}
	self.tabMain.tabs("close", idx);
}

/**
@fn getActivePage()

返回当前激活的逻辑页jpage，注意可能为空: jpage.size()==0。
*/
self.getActivePage = getActivePage;
function getActivePage()
{
	var pp = self.tabMain.tabs('getSelected');   
	if (pp == null)
		return $();
	var jpage = pp.find(".wui-page");
	return jpage;
}

/**
@fn showLoading()
*/
self.showLoading = showLoading;
function showLoading()
{
	$('#block').css({
		width: $(document).width(),
		height: $(document).height(),
		'z-index': 999999
	}).show();
}

/**
@fn hideLoading()
*/
self.hideLoading = hideLoading;
function hideLoading()
{
	$('#block').hide();
}

function mainInit()
{
/**
@var tabMain

标签页组件。为jquery-easyui的tabs插件，可以参考easyui文档调用相关命令进行操作，如关闭当前Tab：

	var jtab = WUI.tabMain.tabs("getSelected");
	var idx = WUI.tabMain.tabs("getTabIndex", jtab);
	WUI.tabMain.tabs("close", idx);

注：要关闭当前Tab，可以直接用WUI.tabClose().
*/
	self.tabMain = $('#my-tabMain');   
	// TODO: auto container
	mCommon.assert(self.tabMain.size()==1, "require #my-tabMain as container");

	var opt = self.tabMain.tabs('options');
	$.extend(opt, {
		onSelect: function (title) {
			var jpage = getActivePage();
			if (jpage.size() == 0)
				return;
			jpage.trigger('pageshow');
		},
		onBeforeClose: function (title) {
			var jpage = getActivePage();
			if (jpage.size() == 0)
				return;
			jpage.trigger('pagedestroy');
		}
	});

	// 连续5次点击当前tab标题，重新加载页面
	self.doSpecial(self.tabMain.find(".tabs-header"), ".tabs-selected", function () {
		self.reloadPage();
		self.reloadDialog(true);
	});

	// bugfix for datagrid size after resizing
	var tmr;
	$(window).on("resize", function () {
		if (tmr)
			clearTimeout(tmr);
		tmr = setTimeout(function () {
			tmr = null;
			console.log("panel resize");
			var jpage = getActivePage();
			// 强制datagrid重排
			jpage.closest(".panel-body").panel("doLayout", true);
		}, 200);
	});

	// 调整对话框上的datagrid大小
	function onResizePanel() {
		//console.log("dialog resize");
		// 强制datagrid重排
		$(this).closest(".panel-body").panel("doLayout", true);
	}
	$.fn.dialog.defaults.onResize = onResizePanel;
}

$(mainInit);

}

// vi: foldmethod=marker
// ====== WEBCC_END_FILE wui.js }}}

// ====== WEBCC_BEGIN_FILE wui-name.js {{{
jdModule("jdcloud.wui.name", JdcloudWuiName);
function JdcloudWuiName()
{
var self = this;
var mCommon = jdModule("jdcloud.common");

window.WUI = jdModule("jdcloud.wui");
$.extend(WUI, mCommon);

$.each([
	"intSort",
	"numberSort",
// 	"enterWaiting",
// 	"leaveWaiting",
// 	"makeUrl",
	"callSvr",
	"callSvrSync",
	"app_alert",
	"app_confirm",
	"app_show",
// 	"makeLinkTo",
], function () {
	window[this] = WUI[this];
});

}
// ====== WEBCC_END_FILE wui-name.js }}}

// ====== WEBCC_BEGIN_FILE jquery-mycombobox.js {{{
// ====== jquery plugin: mycombobox {{{
/**
@module jquery-mycombobox

@fn jQuery.fn.mycombobox(force?=false)
@key .my-combobox 关联选择框
@var ListOptions 定义关联选择框的数据源

@param force?=false 如果为true, 则调用时强制重新初始化。默认只初始化一次。

关联选择框组件。

用法：先定义select组件：

	<select name="empId" class="my-combobox" data-options="valueField: 'id', ..."></select>

通过data-options可设置选项: { url, formatter(row), loadFilter(data), valueField, textField, jdEnumMap/jdEnumList }

初始化：

	var jo = $(".my-combobox").mycombobox();

注意：使用WUI.showPage或WUI.showDlg显示的逻辑页或对话框中如果有my-combobox组件，会自动初始化，无须再调用上述代码。

操作：

- 刷新列表： jo.trigger("refresh");
- 标记刷新（下次打开时刷新）： jo.trigger("markRefresh", [obj?]); 如果指定obj，则仅当URL匹配obj的查询接口时才刷新。
- (v5.2)加载列表：jo.trigger("loadOptions", param);  一般用于级联列表，即url带参数的情况。

特性：

- 初始化时调用url指定接口取数据并生成下拉选项。
- 双击可刷新列表。
- 支持数据缓存，不必每次打开都刷新。
- 也支持通过key-value列表初始化(jdEnumMap/jdEnumList选项)
- 自动添加一个空行

注意：

- (v5.0) 接口调用由同步改为异步，以便提高性能并支持batch操作。同步(callSvrSync)便于加载下拉列表后立即为它赋值，改成异步请求(callSvr)后仍支持立即设置值。
- (v5.0) HTML select组件的jQuery.val()方法被改写。当设置不在范围内的值时，虽然下拉框显示为空，其实际值存储在 value_ 字段中，(v5.2) 通过jQuery.val()方法仍可获取到。
 用原生JS可以分别取 this.value 和 this.value_ 字段。

@param opt {url, jdEnumMap/jdEnumList, formatter, textField, valueField, loadFilter, urlParams, isLoaded_, url_}

@param opt.url 动态加载使用的url，或一个返回URL的函数（这时会调用opt.url(opt.urlParams)得到实际URL，并保存在opt.url_中）
所以要取URL可以用

	var opt = WUI.getOptions(jo);
	url = opt.url_ || opt.url;

## 用url选项加载下拉列表

例如，想显示所有员工(Employee)的下拉列表，绑定员工编号字段(id)，显示是员工姓名(name):

	分派给 <select name="empId" class="my-combobox" data-options="url:WUI.makeUrl('Employee.query', {res:'id,name',pagesz:-1})"></select>

注意查询默认是有分页的（页大小一般为20条），用参数`{pagesz:-1}`使用服务器设置的最大的页大小（后端最大pagesz默认100，可使用maxPageSz参数调节）。
为了精确控制返回字段与显示格式，data-options可能更加复杂，习惯上定义一个ListOptions变量包含各种下拉框的数据获取方式，便于多个页面上共享，像这样：

	<select name="empId" class="my-combobox" data-options="ListOptions.Emp()"></select>

	var ListOptions = {
		// ListOptions.Emp()
		Emp: function () {
			var opts = {
				url: WUI.makeUrl('Employee.query', {
					res: 'id,name,uname',
					cond: 'storeId=' + g_data.userInfo.storeId,
					pagesz:-1
				}),
				formatter: function (row) { return row.name + '(' + row.uname + ')'; }
			};
			return opts;
		},
		...
	};

返回对象的前两个字段被当作值字段(valueField)和显示字段(textField)，上例中分别是id和name字段。
如果返回对象只有一个字段，则valueField与textField相同，都是这个字段。
如果指定了formatter，则显示内容由它决定，textField此时无意义。

可以显式指定这两个字段，如：

	var opts = {
		valueField: "id",
		textField: "name",
		url: ...
	}

示例2：下拉框绑定User.city字段，可选项为该列已有的值：

	<select name="city" class="my-combobox" data-options="ListOptions.City()"></select>

	var ListOptions = {
		City: function () {
			var opts = {
				url: WUI.makeUrl('User.query', {
					res: 'city',
					cond: 'city IS NOT NULL'
					distinct: 1,
					pagesz:-1
				})
			};
			return opts;
		},
		...
	};

(v5.2) url还可以是一个函数。如果带一个参数，一般用于级联列表。参考**级联列表支持**节.

## 用jdEnumMap选项指定下拉列表

也支持通过key-value列表用jdEnumMap选项或jdEnumList选项来初始化下拉框，如：

	订单状态： <select name="status" class="my-combobox" data-options="jdEnumMap:OrderStatusMap" style="width:150px"></select>
	或者：
	订单状态： <select name="status" class="my-combobox" data-options="jdEnumList:'CR:未付款;CA:已取消'" style="width:150px"></select>
	或者：(key-value相同时, 只用';'间隔)
	订单状态： <select name="status" class="my-combobox" data-options="jdEnumList:'未付款;已取消'" style="width:150px"></select>

其中OrderStatusMap定义如下：

	var OrderStatusMap = {
		"CR": "未付款",
		"CA": "已取消"
	};

## 用loadFilter调整返回数据

另一个例子：在返回列表后，可通过loadFilter修改列表，例如添加或删除项：

	<select name="brandId" class="my-combobox" data-options="ListOptions.Brand()" ></select>

JS代码ListOptions.Brand:

	var ListOptions = {
		...
		// ListOptions.Brand()
		Brand: function () {
			var opts = {
				url:WUI.makeUrl('queryBrand', {res: "id,name", pagesz:-1}),
				loadFilter: function(data) {
					data.unshift({id:'0', name:'所有品牌'});
					return data;
				}
			};
			return opts;
		}
	};

更简单地，这个需求还可以通过同时使用jdEnumMap和url来实现：

	var ListOptions = {
		...
		// ListOptions.Brand()
		Brand: function () {
			var opts = {
				url:WUI.makeUrl('queryBrand', {res: "id,name", pagesz:-1}),
				jdEnumMap: {0: '所有品牌'}
			};
			return opts;
		}
	};

注意：jdEnumMap指定的固定选项会先出现。

## 级联列表支持

(v5.2)

缺陷类型(defectTypeId)与缺陷代码(defectId)二级关系：选一个缺陷类型，缺陷代码自动刷新为该类型下的代码。
在初始化时，如果字段有值，下拉框应分别正确显示。

在一级内容切换时，二级列表自动从后台查询获取。同时如果是已经获取过的，缓存可以生效不必反复获取。
双击仍支持刷新。

对话框上HTML如下：（defectId是用于提交的字段，所以用name属性；defectTypeId不用提交，所以用了id属性；后端接口最好两个值都返回）

	<select id="defectTypeId" class="my-combobox" data-options="ListOptions.DefectType()" style="width:45%"></select>
	<select name="defectId" class="my-combobox" data-options="ListOptions.Defect()" style="width:45%"></select>

其中，DefectType()与传统设置无区别，在Defect()函数中，应设置url为一个带参函数：

	var ListOptions = {
		DefectType: function () {
			var opts = {
				valueField: "id",
				textField: "code",
				url: WUI.makeUrl('Defect.query', {
					res: 'id,code,name',
					cond: 'typeId is null',
					pagesz: -1
				}),
				formatter: function (row) { return row.code + "-" + row.name; }
			};
			return opts;
		},
		// ListOptions.Defect
		Defect: function () {
			var opts = {
				valueField: "id",
				textField: "code",
				url: function (typeId) {
					return WUI.makeUrl('Defect.query', {
						res: 'id,code,name',
						cond: "typeId=" + typeId,
						pagesz: -1
					})
				},
				formatter: function (row) { return row.code + "-" + row.name; }
			};
			return opts;
		}
	}

在对话框上设置关联动作，调用loadOptions方法：

	$(frm.defectTypeId).on("change", function () {
		var typeId = $(this).val();
		if (typeId)
			$(frm.defectId).trigger("loadOptions", typeId);
	});
	
对话框加载时，手工设置defectTypeId的值：

	function onShow() {
		$(frm.defectTypeId).val(defectTypeId).trigger("change");
	}

 */
var m_dataCache = {}; // url => data
$.fn.mycombobox = mycombobox;
function mycombobox(force) 
{
	var mCommon = jdModule("jdcloud.common");
	this.each(initCombobox);

	function initCombobox(i, o)
	{
		var jo = $(o);
		var opts = WUI.getOptions(jo);
		if (!force && opts.isLoaded_)
			return;

		if (opts.jdEnumMap || opts.jdEnumList) {
			loadOptions();
			opts.isLoaded_ = true;
		}
		else if (opts.url) {
			loadOptions();

			if (!jo.attr("ondblclick"))
			{
				jo.off("dblclick").dblclick(function () {
					if (! confirm("刷新数据?"))
						return false;
					refresh();
				});
			}
			jo.on("refresh", refresh);
			jo.on("markRefresh", markRefresh);
			jo.on("loadOptions", function (ev, param) {
				opts.urlParams = param;
				loadOptions();
			});
			jo.click(function () {
				if (opts.isLoaded_)
					return;
				loadOptions();
				return false;
			});
		}

		function loadOptions()
		{
			jo.prop("value_", jo.val()); // 备份val到value_
			jo.empty();
			// 添加空值到首行
			$("<option value=''></option>").appendTo(jo);

			if (opts.jdEnumList) {
				opts.jdEnumMap = mCommon.parseKvList(opts.jdEnumList, ';', ':');
			}
			if (opts.jdEnumMap) {
				$.each(opts.jdEnumMap, function (k, v) {
					var jopt = $("<option></option>")
						.attr("value", k)
						.text(v)
						.appendTo(jo);
				});
			}

			if (opts.url == null)
				return;
			var url = opts.url;
			if (url instanceof Function) {
				if (url.length == 0) { // 无参数直接调用
					url = url();
				}
				else if (opts.urlParams != null) {
					url = url(opts.urlParams);
				}
				else if (opts.url_) {
					url = opts.url_;
				}
				else {
					return;
				}
				// 在url为function时，实际url保存在opts.url_中。确保可刷新。
				opts.url_ = url;
			}
			if (m_dataCache[url] === undefined) {
				self.callSvr(url, onLoadOptions);
			}
			else {
				onLoadOptions(m_dataCache[url]);
			}

			function onLoadOptions(data) {
				m_dataCache[url] = data;
				applyData(data);
				// 恢复value; 期间也可能被外部修改。
				jo.val(jo.prop("value_"));
			}
		}

		function applyData(data) 
		{
			opts.isLoaded_ = true;
			function getText(row)
			{
				if (opts.formatter) {
					return opts.formatter(row);
				}
				else if (opts.textField) {
					return row[opts.textField];
				}
				return row.id;
			}
			if (opts.loadFilter) {
				data = opts.loadFilter.call(this, data);
			}
			var arr = $.isArray(data.d)? mCommon.rs2Array(data)
				: $.isArray(data)? data
				: data.list;
			mCommon.assert($.isArray(arr), "bad data format for combobox");
			if (arr.length == 0)
				return;
			var names = Object.getOwnPropertyNames(arr[0]);
			if (opts.valueField == null) {
				opts.valueField = names[0];
			}
			if (opts.formatter == null && opts.textField == null) {
				opts.textField = names[1] || names[0];
			}
			$.each(arr, function (i, row) {
				var jopt = $("<option></option>")
					.attr("value", row[opts.valueField])
					.text(getText(row))
					.appendTo(jo);
			});
		}

		function refresh()
		{
			markRefresh();
			loadOptions();
		}

		function markRefresh(ev, obj)
		{
			var url = opts.url_ || opts.url;
			if (url == null)
				return;
			if (obj) {
				var ac = obj + ".query";
				if (url.action != ac)
					return;
			}
			delete m_dataCache[url];
			opts.isLoaded_ = false;
		}
	}
}

// 问题：在my-combobox获取下拉选项调用尚未返回时，调用val()为其设置值无效。
// 解决：改为设置value_属性，在下拉选项加载完后再调用val().
// 注意：此处基于jQuery.fn.val源码(v1.11)实现，有兼容性风险!!!
function mycombobox_fixAsyncSetValue()
{
	var hook = $.valHooks["select"];
	$.valHooks["select"] = {
		set: function (elem, value) {
			elem.value_ = value;
			return hook.set.apply(this, arguments);
		},
		get: function (elem) {
			return hook.get.apply(this, arguments) || elem.value_;
		}
	}
}
mycombobox_fixAsyncSetValue();
//}}}

// ====== WEBCC_END_FILE jquery-mycombobox.js }}}

// Generated by webcc_merge
// vi: foldmethod=marker
