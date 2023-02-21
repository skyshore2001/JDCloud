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
						<th data-options="field:'status', jdEnumMap: OrderStatusMap, formatter:Formatter.enum(OrderStatusMap), styler:Formatter.enumStyler({PA:'Warning'}), sortable:true">状态</th>
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
						<select name="status">
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

@key example-dialog-event

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
			// beforeshow用于设置字段是否隐藏、是否可编辑；或是设置opt(即WUI.showDlg的opt)。

			var objParam = opt.objParam;
			var forAdd = formMode == FormMode.forAdd;
			var forSet = formMode == FormMode.forSet;

			jdlg.find(".notForFind").toggle(formMode != FormMode.forFind);

			// WUI.toggleFields也常用于控制jfrm上字段显示或jtbl上列显示
			var type = opt.objParam && opt.objParam.type;
			var isMgr = g_data.hasRole("mgr"); // 最高管理员
			var isAdm = g_data.hasRole("mgr,emp"); // 管理员
			WUI.toggleFields(jfrm, {
				type: !type,
				status: !type || type!="公告",
				atts: isAdm
			});

			// 根据权限控制字段是否可编辑。注意：find模式下一般不禁用。
			if (formMode != FormMode.forFind) {
				$(frm.empId).prop("disabled", !isMgr);
				$(frm.status).prop("disabled", forAdd || !isAdm);
				$(frm.code).prop("disabled", !isAdm);
			}
		}
		function onShow(ev, formMode, initData) {
			// 常用于add模式下设置初值，或是set模式下将原值转换并显示。
			// initData是列表页中一行对应的数据，框架自动根据此数据将对应属性填上值。
			// 如果界面上展示的字段无法与属性直接对应，可以在该事件回调中设置。
			// hiddenToCheckbox(jdlg.find("#divPerms"));
			if (forAdd) {
				$(frm.status).val("CR");
			}
			else if (forSet) {
				// 显示成表格
				jdlg.find("#tbl1").datagrid(...);
			}
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

	- status: 订单状态. Enum(CR-新创建,RE-已服务,CA-已取消). 

在显示时，要求显示其中文名称，且根据状态不同，显示不同的背景颜色。

在table中设置formatter与styler选项：

	<div class="pageOrder" title="订单管理" my-initfn="initPageOrder">
		<table id="tblOrder" style="width:auto;height:auto" title="订单列表">
			<thead><tr>
				<th data-options="field:'id', sortable:true, sorter:intSort">订单号</th>
				...
				<th data-options="field:'status', jdEnumMap: OrderStatusMap, formatter:Formatter.enum(OrderStatusMap), styler:Formatter.enumStyler({PA:'Warning', RE:'Disabled', CR:'#00ff00', null: 'Error'}), sortable:true">状态</th>
			</tr></thead>
		</table>
	</div>

formatter用于控制Cell中的HTML标签，styler用于控制Cell自己的CSS style, 常用于标记颜色.
在JS中定义：

	var OrderStatusMap = {
		CR: "未付款", 
		RE: "已服务", 
		CA: "已取消"
	};
	Formatter = $.extend(WUI.formatter, Formatter);

上面Formatter.enum及Formatter.enumStyler是框架预定义的常用项，也可自定义formatter或styler，例：

	var OrderColumns = {
		status: function (value, row) {
			if (! value)
				return;
			return OrderStatusMap[value] || value;
		},
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

#### treegrid集成

@key treegrid

后端数据模型若要支持树类型，须在表中有父节点字段（默认为fatherId）, 即可适配treegrid. 典型的表设计如下：

	@Dept: id, code, name, fatherId, level

- 支持一次全部加载和分层次加载两种模式。
- 支持查询时，只展示部分行。
- 点添加时，如果当前有选中行，当这一行是展开的父结点（或是叶子结点，也相当于是展开的），则默认行为是为选中行添加子项，预置fatherId, level字段；
 如果是未展开的父结点，则是加同级的结点。
- 更新时如果修改了父结点, 它将移动到新的父结点下。否则直接刷新这行。
- 支持排序和导出。

在初始化页面时, 与datagrid类似: pageItemType.js

	var dgOpt = {
		// treegrid查询时不分页. 设置pagesz=-1. (注意后端默认返回1000条, 可设置放宽到10000条. 再多应考虑按层级展开)
		url: WUI.makeUrl("ItemType.query", {pagesz: -1}),
		toolbar: WUI.dg_toolbar(jtbl, jdlg),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
		// treeField: "code"  // 树表专用，表示在哪个字段上显示折叠，默认为"id"
		// fatherField: "id" // 树表专用，WUI扩展字段，表示父节点字段，默认为"fatherId"
	};
	// 用treegrid替代常规的datagrid
	jtbl.treegrid(dgOpt);

如果数据量非常大, 可以只显示第一层级, 展开时再查询.
仅需增加初始查询条件(只查第一级)以及一个判断是否终端结点的回调函数isLeaf (否则都当作终端结点将无法展开):

	var dgOpt = {
		queryParams: {cond: "fatherId is null"},
		isLeaf: function (row) {
			return row.level>1;
		},
		...
	};
	jtbl.treegrid(dgOpt);

**[通过非id字段关联父节点的情况]**

比如通过fatherCode字段关联到父节点的code字段：

	@Dept: id, code, fatherCode

则可以指定idField, 这样调用：

	var dgOpt = {
		idField: "code",
		fatherField: "fatherCode",
		...
	};
	jtbl.treegrid(dgOpt);

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
不参与查询的字段，可以用notForFind类标识，如：

	登录密码: <input class="notForFind" type="password" name="pwd">

@key .wui-notCond 指定独立查询条件

如果查询时不想将条件放在cond参数中，可以设置wui-notCond类标识，如：

	状态: <select name="status" class="my-combobox wui-notCond" data-options="jdEnumList:'0:可用;1:禁用'"></select>

如果不加wui-notCond类，生成的查询参数为：`{cond: "status=0"}`；加上后，生成查询参数如：`{status: 0}`.

(v5.3)

- 在对话框中三击（2秒内）字段标题栏，可快速按查询该字段。Ctrl+三击为追加过滤条件。
(v6.1)也可以在对话框的字段标题上点右键，在菜单中选择“查询该字段”。

- 在页面工具栏中，按住Ctrl(batch模式)点击“刷新”按钮，可清空当前查询条件。

@key wui-find-hint 控制查询条件的生成。(v5.5) 

- 设置为"s"，表示是字符串，禁用数值区间或日期区间。
- 设置为"tm"或"dt"，表示是日期时间或日期，可匹配日期匹配。
- "e"表示enum，mycombobox会自动设置。用于下拉框的值匹配，避免WUI.options.fuzzyMatch=true时对enum字段模糊匹配。

示例：

	视频代码 <input name="code" wui-find-hint="s">

当输入'126231-191024'时不会当作查询126231到191024的区间。

#### 设计模式：关联选择框

示例：下拉框中显示员工列表 (Choose-from-list / 关联选择框)

@see jQuery.fn.mycombobox

#### picId字段显示图片

@see hiddenToImg (有示例)
@see imgToHidden

#### List字段显示为多个选项框

@see hiddenToCheckbox 
@see checkboxToHidden　(有示例)

### 设计模式：展示关联对象

例如设计有商品表Item, 每个商品属于特定的商户：

	@Item: id, storeId, name
	- storeId: Integer. 商品所属商户编号。

也就是说，一个商户对应多个商品。要展现商品，可将它放在商户层次之下。
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
		...
		var btn1 = {text: "查看商品", iconCls: "icon-search", handler: showItemPage};
		jtbl.datagrid({
			...
			toolbar: WUI.dg_toolbar(jtbl, jdlg, btn1),
		});

		function showItemPage() {
			var row = WUI.getRow(jtbl);
			if (row == null)
				return;
			// !!! 调用showPage显示新页 !!!
			var pageFilter = {cond: {storeId: row.id}};
			WUI.showPage("pageItem", {title: "商户商品-" + row.name, pageFilter: pageFilter});
			// 要使每个商户都打开一个商品页面而不是共享一个页面，必须保证第二个参数（页面标题）根据商户不同而不一样。
		}
	}

注意：

WUI.showPage的第二参数既可以是简单的页面标题(title)，也可以是复杂的showPage选项(showPageOpt)，下面两个调用是相同的：

	WUI.showPage("pageItem", "商户商品-" + row.name, ...);
	WUI.showPage("pageItem", {title: "商户商品-" + row.name}, ...);

显然，title随着商户名称不同而不同，这保证了不同商户打开的商品页面不会共用。

而showPageOpt.pageFilter参数会自动加到数据表调用后端的query接口参数中，对列表页进行过滤。

@see showPage

@key .wui-fixedField 固定值字段

(v6) 当打开商户关联的商品列表页时，点开商品明细对话框，商户这个字段(storeId)固定为`pageFilter.cond`中storeId的值，不可修改。这称为固定值字段（fixedField）。

也可以通过WUI.showDlg/WUI.showObjDlg的opt.fixedFields参数来指定固定值字段(值为field=>value映射)，或是通过jdlg设置对话框参数如`jdlg.objParam.fixedFields={storeId: row.id}`。

v5.3引入了wui-fixedField类设置在字段上，v6起已不建议使用。以下仅用于兼容：
当打开对话框时, 标识为.wui-fixedField类的字段会自动从传入的opt.objParam中取值, 如果取到值则将自己设置为只读.

	<select name="storeId" class="my-combobox wui-fixedField" data-options="ListOptions.Store()"></select>

## 对话框功能

@key example-dialog

以群发短信功能为例。

假定服务端已有以下接口：

	sendSms(phone, content)
	phone:: 手机号
	content:: 发送内容

### 定义对话框

注意：每个带name属性的组件对应接口中的参数。

	<div id="dlgSendSms" title="群发短信" style="width:500px;height:300px;">  
		<form method="POST">
			手机号：<input name="phone" class="easyui-validatebox" required>
			发送内容： <textarea rows=5 cols=30 name="content" class="easyui-validatebox" required></textarea>
		</form>
	</div>

在form中带name属性的字段上，可以设置class="easyui-validatebox"对输入进行验证。

### 显示对话框

可以调用WUI.showDlg，写一个显示对话框的函数：

	function showDlgSendSms()
	{
		WUI.showDlg("#dlgSendSms", {
			url: WUI.makeUrl("sendSms"),
			onOk: function (data) {  // (v6.0) 可以直接用字符串 'close'
				var jdlg = $(this);
				WUI.closeDlg(jdlg);
				app_show('操作成功!');
			}
		});
	}

在showDlg的选项url中指定了接口为"sendSms"。操作成功后，显示一个消息。

(v5.5) 新的编程惯例，建议使用定义对话框接口的方式，写在主应用（如store.js）的接口区域，如：

	// 把showDlgSendSms换成DlgSendSms.show
	var DlgSendSms = {
		show: function () {
			// 同showDlgSendSms
		}
	};

@see showDlg
@see app_show

点击菜单项显示对话框：

	<a href="javascript:DlgSendSms.show()" class="easyui-linkbutton" icon="icon-ok">群发短信</a><br/><br/>

可以通过my-initfn属性为对话框指定初始化函数。复杂对话框的逻辑一般都写在初始化函数中。习惯上命令名initDlgXXX，如：

	<div id="dlgSendSms" title="群发短信" style="width:500px;height:300px;" my-initfn="initDlgSendSms">

	function initDlgSendSms() {
		var jdlg = $(this);
		// 处理对话框事件
		jdlg.on("beforeshow", onBeforeShow)
			.on("validate", onValidate);
		// 处理内部组件事件
		jdlg.find("#btn1").click(btn1_click);
		...
	}

### 数据存取型对话框

示例：显示某订单，可设置属性并保存。

假如已做好订单html模板 dlgOrder.html, 调用它：

	var orderId = 99;
	callSvr("Ordr.get", {id: orderId}, function (data) {
		WUI.showDlg("#dlgOrder", {
			modal: false, // 非模态框
			data: data, // 初始化数据
			forSet: true, // 与data选项合用，如果无数据修改则不提交
			dialogOpt: {maximized: true}, // 打开时最大化
			// reload: true, // 每次都重新加载（测试用）
			url: WUI.makeUrl("Ordr.set", {id: orderId}), // 提交的URL，form中的内容通过POST请求发到后端。由于设置了opt.forSet=true, 只会提交修改部分。
			onOk: 'close'
		})
	});

由于是典型的对象操作，一般用前述章节的对象对话框来做。上例相当于：

	var orderId = 99;
	WUI.showObjDlg("#dlgOrder", FormMode.forSet, {id: orderId});

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

	jdlg.addClass("wui-readonly");
	jdlg.removeClass("wui-readonly");
	jdlg.toggleClass("wui-readonly", isReadonly);

只读对话框不可输入(在style.css中设定pointer-events为none)，点击确定按钮后直接关闭。

注意：在dialog beforeshow事件中，不应直接设置wui-readonly类，因为框架之后会自动设置，导致前面设置无效。正确做法是设置`opt.objParam.readonly=true`，示例：

	jdlg.on("beforeshow", onBeforeShow);
	function onBeforeShow(ev, formMode, opt)
	{
		var objParam = opt.objParam;
		var ro = (formMode == FormMode.forSet && !!opt.data.usedFlag);
		// beforeshow中设置对话框只读
		objParam.readonly = ro;
	}

### 只读字段：使用disabled和readonly属性

- disabled：不可添加或更新该字段，但可查询（即forAdd/forSet模式下只显示不提交，forFind时可设置和提交)，例如编号字段、计算字段。示例：

		<input name="id" disabled>
		<input name="userName" disabled>

- readonly：不可手工添加、更新和查询（但可通过代码设置）。示例：

		<input name="total" readonly>

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

### 按需加载依赖库

@key wui-deferred
(v5.5)

如果页面或对话框依赖一个或一组库，且这些库不想在主页面中用script默认加载，这时可以使用`wui-deferred`属性。
页面或对话框初始化函数wui-initfn将在该deferred对象操作成功后执行。

示例：想在工艺对话框上使用mermaid库显示流程图，该库比较大，只在这一处使用，故不想在应用入口加载。
可在app.js中添加库的加载函数：

	var m_dfdMermaid;
	function loadMermaidLib()
	{
		if (m_dfdMermaid == null)
			m_dfdMermaid = WUI.loadScript("lib/mermaid.min.js");
		return m_dfdMermaid;
	}

在对话框html中用wui-deferred引入依赖库：

	<form my-obj="Flow" title="工艺" ... wui-deferred="loadMermaidLib()">

在对话框模块（初始化函数）中就可以直接使用这个库了：

	function initDlgFlow()
	{
		...
		mermaid.render("graph", def, function (svg) {
			jdlg.find(".graph").html(svg);
		});
	}

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
		// 用throw new Error会有调用栈; 直接用throw "some msg"无法获取调用栈.
		throw new Error(msg);
	}
}

/**
@fn randInt(from, to)

生成指定区间的随机整数。示例：

	var i = randInt(1, 10); // 1-10之间的整数，包含1或10

*/
self.randInt = randInt;
function randInt(from, to)
{
	return Math.floor(Math.random() * (to - from + 1)) + from;
}

/**
@fn randInt(from, to)

生成随机字符串，包含字母或数字，不包含易混淆的0或O。示例：

	var dynCode = randChr(4); // e.g. "9BZ3"

*/
self.randChr = randChr;
function randChr(cnt)
{
	var charCodeArr = [];
	var code_O = 'O'.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
	
	for (var i=0; i<cnt; ) {
		var ch = randInt(0, 35); // 0-9 A-Z 共36个
		// 去除0,O易混淆的
		if (ch == 0 || ch == code_O) {
			continue;
		}
		if (ch < 10) {
			charCodeArr.push(0x30 + ch);
		}
		else {
			charCodeArr.push(0x41 + ch -10);
		}
		i ++;
	}
//	console.log(charCodeArr);
	return String.fromCharCode.apply(this, charCodeArr);
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
	//location.href = href; // dont use this. it triggers hashchange.
	history.replaceState(null, null, href);
	location.reload();
	throw "abort"; // dont call self.app_abort() because it does not exist after reload.
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
		case 'd' :
		{
			var d1 = (dtStart.getTime() - dtStart.getTimezoneOffset()*60000) / 86400000;
			var d2 = (dtEnd.getTime() - dtEnd.getTimezoneOffset()*60000) / 86400000;
			return Math.floor(d2) - Math.floor(d1);
		}	
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

/**
@fn WUI.getTmRange(dscr, now?)

根据时间段描述得到`[起始时间，结束时间)`，注意结束时间是开区间（即不包含）。
假设今天是2015-9-9 周三：

	getTmRange("本周", "2015-9-9") -> ["2015-9-7"(本周一), "2015-9-14")
	getTmRange("上周") -> ["2015-8-31", "2015-9-7")  // 或"前1周"

	getTmRange("本月") -> ["2015-9-1", "2015-10-1")
	getTmRange("上月") -> ["2015-8-1", "2015-9-1")

	getTmRange("今年") -> ["2015-1-1", "2016-1-1") // 或"本年"
	getTmRange("去年") -> ["2014-1-1", "2015-1-1") // 或"上年"

	getTmRange("本季度") -> ["2015-7-1", "2015-10-1") // 7,8,9三个月
	getTmRange("上季度") -> ["2015-4-1", "2015-7-1")

	getTmRange("上半年") -> ["2015-1-1", "2015-7-1")
	getTmRange("下半年") -> ["2015-7-1", "2016-1-1")

	getTmRange("今天") -> ["2015-9-9", "2015-9-10") // 或"本日"
	getTmRange("昨天") -> ["2015-9-8", "2015-9-9") // 或"昨日"

	getTmRange("前1周") -> ["2015-8-31"(上周一)，"2015-9-7"(本周一))
	getTmRange("前3月") -> ["2015-6-1", "2015-9-1")
	getTmRange("前3天") -> ["2015-9-6", "2015-9-9")

	getTmRange("近1周") -> ["2015-9-3"，"2015-9-10")
	getTmRange("近3月") -> ["2015-6-10", "2015-9-10")
	getTmRange("近3天") -> ["2015-9-6", "2015-9-10")  // "前3天"+今天

dscr可以是 

	"近|前|上" N "个"? "小时|日|周|月|年|季度"
	"本|今" "小时|日/天|周|月|年|季度"

注意："近X周"包括今天（即使尚未过完）。

示例：快捷填充

		<td>
			<select class="cboTmRange">
				<option value ="本月">本月</option>
				<option value ="上月">上月</option>
				<option value ="本周">本周</option>
				<option value ="上周">上周</option>
				<option value ="今年">今年</option>
				<option value ="去年">去年</option>
			</select>
		</td>

	var txtTmRange = jdlg.find(".cboTmRange");
	txtTmRange.change(function () {
		var range = WUI.getTmRange(this.value);
		if (range) {
			WUI.setFormData(jfrm, {tm1: range[0], tm2: range[1]}, {setOnlyDefined: true});
		}
	});
	// 初始选中
	setTimeout(function () {
		txtTmRange.change();
	});

 */
self.getTmRange = getTmRange;
function getTmRange(dscr, now)
{
	if (! now)
		now = new Date();
	else if (! (now instanceof Date)) {
		now = WUI.parseDate(now);
	}
	else {
		now = new Date(now); // 不修改原时间
	}

	var rv = getTmRangeSimple(dscr, now);
	if (rv)
		return rv;

	dscr = dscr.replace(/本|今/, "前0");
	dscr = dscr.replace(/上|昨/, "前");
	var re = /(近|前)(\d*).*?(小时|日|天|月|周|年)/;
	var m = dscr.match(re);
	if (! m)
		return;
	
	var dt1, dt2, dt;
	var type = m[1];
	var n = parseInt(m[2] || '1');
	var u = m[3];
	var fmt_d = "yyyy-mm-dd";
	var fmt_h = "yyyy-mm-dd HH:00";
	var fmt_m = "yyyy-mm-01";
	var fmt_y = "yyyy-01-01";

	if (u == "小时") {
		if (n == 0) {
			now.add("h",1);
			n = 1;
		}
		if (type == "近") {
			now.add("h",1);
		}
		dt2 = now.format(fmt_h);
		dt1 = now.add("h", -n).format(fmt_h);
	}
	else if (u == "日" || u == "天") {
		if (n == 0 || type == "近") {
			now.addDay(1);
			++ n;
		}
		dt2 = now.format(fmt_d);
		dt1 = now.add("d", -n).format(fmt_d);
	}
	else if (u == "月") {
		if (n == 0) {
			now.addMonth(1);
			n = 1;
		}
		if (type == "近") {
			now.addDay(1);
			var d2 = now.getDate();
			dt2 = now.format(fmt_d);
			now.add("m", -n);
			do {
				// 5/31近一个月, 从4/30开始: [4/30, 5/31]
				var d1 = now.getDate();
				if (d1 == d2 || d1 > 10)
					break;
				now.addDay(-1);
			} while (true);
			dt1 = now.format(fmt_d);
			
			// now = WUI.parseDate(now.format(fmt_m)); // 回到1号
			//dt1 = now.add("m", -n).format(fmt_m);
		}
		else if (type == "前") {
			dt2 = now.format(fmt_m);
			dt1 = WUI.parseDate(dt2).add("m", -n).format(fmt_m);
		}
	}
	else if (u == "周") {
		if (n == 0) {
			now.addDay(7);
			n = 1;
		}
		if (type == "近") {
			now.addDay(1);
			dt2 = now.format(fmt_d);
			//now.add("d", -now.getDay()+1); // 回到周1
			dt1 = now.add("d", -n*7).format(fmt_d);
		}
		else if (type == "前") {
			dt2 = now.add("d", -now.getDay()+1).format(fmt_d);
			dt1 = now.add("d", -7*n).format(fmt_d);
		}
	}
	else if (u == "年") {
		if (n == 0) {
			now.add("y",1);
			n = 1;
		}
		if (type == "近") {
			now.addDay(1);
			dt2 = now.format(fmt_d);
			//now = WUI.parseDate(now.format(fmt_y)); // 回到1/1
			dt1 = now.add("y", -n).format(fmt_d);
		}
		else if (type == "前") {
			dt2 = now.format(fmt_y);
			dt1 = WUI.parseDate(dt2).add("y", -n).format(fmt_y);
		}
	}
	else {
		return;
	}
	return [dt1, dt2];
}

function getTmRangeSimple(dscr, now)
{
	var fmt_d = "yyyy-mm-dd";
	var fmt_m = "yyyy-mm-01";
	var fmt_y = "yyyy-01-01";

	if (dscr == "本月") {
		var dt1 = now.format(fmt_m);
		// NOTE: 不要用 now.addMonth(1). 否则: 2020/8/31取本月会得到 ["2020-08-01", "2020-10-01"]
		var y = now.getFullYear();
		var m = now.getMonth() + 2;
		if (m == 12) {
			++ y;
			m = 1;
		}
		var dt2 = y + "-" + setWidth_2(m) + "-01";
	}
	else if (dscr == "上月") {
		var dt2 = now.format(fmt_m);
		var y = now.getFullYear();
		var m = now.getMonth();
		now.addMonth(-1);
		if (m == 0) {
			-- y;
			m = 12;
		}
		var dt1 = y + "-" + setWidth_2(m) + "-01";
	}
	else if (dscr == "本周") {
		var dt1 = now.add("d", -(now.getDay()||7)+1).format(fmt_d);
		now.addDay(7);
		var dt2 = now.format(fmt_d);
	}
	else if (dscr == "上周") {
		var dt2 = now.add("d", -(now.getDay()||7)+1).format(fmt_d);
		now.addDay(-7);
		var dt1 = now.format(fmt_d);
	}
	else if (dscr == "今年") {
		var dt1 = now.format(fmt_y);
		now.addMonth(12);
		var dt2 = now.format(fmt_y);
	}
	else if (dscr == "去年" || dscr == "上年") {
		var dt2 = now.format(fmt_y);
		now.addMonth(-12);
		var dt1 = now.format(fmt_y);
	}
	else if (dscr == "本季度") {
		var m = Math.floor(now.getMonth() / 3)*3 +1;
		var dt1 = now.getFullYear() + "-" + setWidth_2(m) + "-01";
		var dt2 = now.getFullYear() + "-" + setWidth_2(m+3) + "-01";
	}
	else if (dscr == "上季度") {
		var m = Math.floor(now.getMonth() / 3)*3;
		if (m > 0) {
			var dt1 = now.getFullYear() + "-" + setWidth_2(m-3) + "-01";
			var dt2 = now.getFullYear() + "-" + setWidth_2(m) + "-01";
		}
		else {
			var y = now.getFullYear();
			var dt1 = (y-1) + "-10-01";
			var dt2 = y + "-01-01";
		}
	}
	else if (dscr == "上半年") {
		var y = now.getFullYear();
		var dt1 = y + "-01-01";
		var dt2 = y + "-07-01";
	}
	else if (dscr == "下半年") {
		var y = now.getFullYear();
		var dt1 = y + "-07-01";
		var dt2 = (y+1) + "-01-01";
	}
	else {
		return;
	}
	return [dt1, dt2];
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

key函数也可以返回[key, value]数组：

	var hash = rs2Hash(rs, function (o) {
		return ["USER-" + o.id, o.name];
	}); 

	// 结果为
	hash = {
		"USER-100": "Tom",
		"USER-101": "Jane"
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
		if (Array.isArray(k) && k.length == 2)
			ret[k[0]] = k[1];
		else
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

key作为函数，也可返回[key, value]:

	var hash = rs2MultiHash(rs, function (o) {
		return [o.name, [o.id, o.birthday]];
	});

	// 结果为
	hash = {
		"Tom": [[100, "1998-10-1"], [102, "1998-3-8"]],
		"Jane": [[101, "1999-1-10"]]
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
		if (Array.isArray(k) && k.length == 2) {
			obj = k[1];
			k = k[0];
		}
		if (ret[ k ] === undefined)
			ret[ k ] = [obj];
		else
			ret[ k ].push(obj);
	}
	return ret;
}

/**
@fn list2varr(ls, colSep=':', rowSep=',')

- ls: 代表二维表的字符串，有行列分隔符。
- colSep, rowSep: 列分隔符，行分隔符。

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
	return (parseInt(a)||0) - (parseInt(b)||0);
}

/**
@fn numberSort(a, b)

小数排序. 用于datagrid column sorter:

	<th data-options="field:'score', sortable:true, sorter:numberSort">评分</th>

 */
self.numberSort = numberSort;
function numberSort(a, b)
{
	return (parseFloat(a)||0) - (parseFloat(b)||0);
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

	var url = "http://server/jdcloud/m2/?logout#me";
	var url1 = deleteParam(url, "logout"); // "http://server/jdcloud/m2/?#me"

*/
self.deleteParam = deleteParam;
function deleteParam(url, paramName)
{
	var ret = url.replace(new RegExp('&?\\b' + paramName + "\\b(=[^&#]+)?"), '');
	ret = ret.replace(/\?&/, '?');
	// ret = ret.replace(/\?(#|$)/, '$1'); // 问号不能去掉，否则history.replaceState(null,null,"#xxx")会无效果
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
	// 支持中文，不能直接用\w匹配
	return tpl.replace(/{([^{}:,.]+)}/g, function(m0, m1) {
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
@fn parseKvList(kvListStr, sep, sep2, doReverse?) -> kvMap

解析key-value列表字符串，返回kvMap。

- doReverse: 设置为true时返回反向映射

示例：

	var map = parseKvList("CR:新创建;PA:已付款", ";", ":");
	// map: {"CR": "新创建", "PA":"已付款"}

	var map = parseKvList("CR:新创建;PA:已付款", ";", ":", true);
	// map: {"新创建":"CR", "已付款":"PA"}
*/
self.parseKvList = parseKvList;
function parseKvList(str, sep, sep2, doReverse)
{
	var map = {};
	$.each(str.split(sep), function (i, e) {
		var kv = e.split(sep2, 2);
		//assert(kv.length == 2, "bad kvList: " + str);
		if (kv.length < 2) {
			kv[1] = kv[0];
		}
		if (!doReverse)
			map[kv[0]] = kv[1];
		else
			map[kv[1]] = kv[0];
	});
	return map;
}

/**
@fn Q(str, q?="'")

	Q("abc") -> 'abc'
	Q("a'bc") -> 'a\'bc'

 */
window.Q = self.Q = Q;
function Q(str, q)
{
	if (str == null)
		return "null";
	if (typeof str == "number")
		return str;
	if (q == null)
		q = "'";
	return q + str.toString().replaceAll(q, "\\" + q) + q;
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

/**
@fn text2html(str, pics)

将文本或图片转成html，常用于将筋斗云后端返回的图文内容转成html在网页中显示。示例：

	var item = {id: 1, name: "商品1", content: "商品介绍内容", pics: "100,102"};
	var html = MUI.text2html(item.content, item.pics);
	jpage.find("#content").html(html);

文字转html示例：

	var html = MUI.text2html("hello\nworld");

生成html为

	<p>hello</p>
	<p>world</p>

支持简单的markdown格式，如"# ","## "分别表示一二级标题, "- "表示列表（注意在"#"或"-"后面有英文空格）：
	
	# 标题1
	内容1
	# 标题2
	内容2

	- 列表1
	- 列表2

函数可将图片编号列表转成img列表，如：

	var html = MUI.text2html(null, "100,102");

生成

	<img src="../api.php/att?thumbId=100">
	<img src="../api.php/att?thumbId=102">

 */
self.text2html = text2html;
function text2html(s, pics)
{
	var ret = "";
	if (s) {
		ret = s.replace(/^(?:([#-]+)\s+)?(.*)$/mg, function (m, begin, text) {
			if (begin) {
				if (begin[0] == '#') {
					n = begin.length;
					return "<h" + n + ">" + text + "</h" + n + ">";
				}
				if (begin[0] == '-') {
					return "<li>" + text + "</li>";
				}
			}
			// 空段落处理
			if (text) {
				text = text.replace(" ", "&nbsp;");
			}
			else {
				text = "&nbsp;";
			}
			return "<p>" + text + "</p>";
		}) + "\n";
	}
	if (pics) {
		var arr = pics.split(/\s*,\s*/);
		arr.forEach(function (e) {
			var url = "../api.php/att?thumbId=" + e;
			ret += "<img src=\"" + url + "\">\n";
		});
	}
	return ret;
}

/**
@fn extendNoOverride(a, b, ...)

	var a = {a: 1};
	WUI.extendNoOverride(a, {b: 'aa'}, {a: 99, b: '33', c: 'bb'});
	// a = {a: 1, b: 'aa', c: 'bb'}
 */
self.extendNoOverride = extendNoOverride;
function extendNoOverride(target)
{
	if (!target)
		return target;
	$.each(arguments, function (i, e) {
		if (i == 0 || !$.isPlainObject(e))
			return;
		$.each(e, function (k, v) {
			if (target[k] === undefined)
				target[k] = v;
		});
	});
	return target;
}

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
	if (typeof(fn) === "function") {
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

/**
@fn jdPush(app, handleMsg, opt?={user, url, dataType})

支持出错自动重连的websocket client. 默认连接同域下的jdserver。

- app: 应用，或通道名，与后端推送应用名保持一致，一般使用项目名。
- handleMsg(msg, ws): 回调函数. msg是JS对象。ws是websocket对象, 可发消息ws.send(str)、关闭ws.close()
- opt.user: 注册用户，默认使用g_data.userInfo.id，如果不存在则报错。
- opt.url: websocket地址，默认值是相对路径`/jdserver`，也可指定全路径，如 `ws://oliveche.com/jdserver`
- opt.dataType=json: 默认只有json对象才回调handleMsg。设置text则处理所有数据。
- opt.keepAliveInterval=60: 默认每60秒发一次alive消息。设置为0则不发送。
解决有时（如经多次代理时）可能过几分钟不发数据会被断开的问题。

示例：

	// 返回websocket proxy对象
	var ws = jdPush("tighten", function (msg, ws) {
		console.log(msg)
		// 发送消息
		ws.send({ac:"hello"}); // 发送JS对象会自动转JSON发送。
	}, opt);

	// 关闭
	ws.close();

开发环境可配置代理服务器连接jdserver，比如使用Apache，在web根目录下配置.htaccess:
（确保已打开wstunnel模块且允许htaccess文件）

	# 连接已部署的websocket server
	rewriterule ^jdserver ws://oliveche.com/jdserver [P,L]

	# 或连本地websocket server (注意最后/不可少)
	# rewriterule ^jdserver ws://127.0.0.1:8081/ [P,L]

jdserver同时支持http和websocket，建议设置为：（注意顺序）

	rewriterule ^jdserver/(.+) http://127.0.0.1:8081/$1 [P,L]
	rewriterule ^jdserver ws://127.0.0.1:8081/ [P,L]

或

	rewriterule ^jdserver/(.+) http://oliveche.com/jdserver/$1 [P,L]
	rewriterule ^jdserver ws://oliveche.com/jdserver/ [P,L]

这样，可以使用基于HTTP的push接口给别的客户端发消息：

	callSvr("/jdserver/push", $.noop, {
		app: "app1",
		user: "*", // 表示发给app1中所有人。也可指定`user1`, `user1,user2`, `user*`这样
		msg: {
			ac: "msg1",
			data: "hello"
		}
	});
	// 返回推送人次数量，示例：2

上面通过msg字段发送js对象。
注意jdPush默认只处理json消息: handleMsg(jsonObj)，其它消息只在控制台打印;
想处理其它消息，可调用jdPush时设置opt.dataType='text'

取在线用户：

	callSvr("/jdserver/getUsers", { app: "app1" });
	// 返回示例： ['user1', 'user2' ]

示例：websocket连接jdserver，然后给自己发消息

	jdPush('app1'); // 默认用户为g_data.userInfo.id
	callSvr('/jdserver/push', {app: 'app1', user: '*', msg: 'hi'});
	// 在控制台可收到hi
	
*/
function jdPush(app, handleMsg, opt) {
	opt = Object.assign({
		user: window.g_data && g_data.userInfo && g_data.userInfo.id || ("jduser-" + Math.round(Math.random()*10000)),
		url: "/jdserver",
		dataType: "json",
		keepAliveInterval: 60
	}, opt);

	if (! opt.user) {
		throw "jdPush: require param `user`";
	}

	var ws;
	var tmr, tmrAlive;
	var url = opt.url;
	var doClose = false;

	// 自动补全协议、主机
	if (! /^wss?:/.test(url)) {
		var proto = (location.protocol=="https:"? "wss:": "ws:");
		if (url.substr(0, 2) == '//') {
			url = proto + url;
		}
		else if (url[0] == '/') {
			var path = (location.host || "localhost");
			// 支持代理，但路径必须＠开头，
			// 如: http://oliveche.com/@dev7/jdcloud/m2/ -> ws://oliveche.com/@dev7/jdserver
			var m = location.pathname.match(/^\/@[^\/]+/);
			if (m) {
				path += m[0];
			}
			// 直接打开html文件时没有host
			url = proto + '//' + path + url;
		}
		else {
			console.error("jdPush: 连接websocket服务器，请使用//或/开头的绝对地址!");
			return;
		}
	}
	connect();

	var proxy = {
		close: function () {
			if (tmr)
				clearTimeout(tmr);
			ws.close();
			doClose = true; // 禁止在onClose中重连
		},
		send: function (s) {
			if (typeof(s) != "string")
				s = JSON.stringify(s);
			ws.send(s);
		}
	}
	return proxy;

	function connect() {
		ws = new WebSocket(url);
		console.log('connect to ', url);

		ws.onopen = function (ev) {
			var req = {ac: 'init', app: app, user: opt.user};
			ws.send(JSON.stringify(req));
			if (opt.keepAliveInterval)
				tmrAlive = setInterval(alive, opt.keepAliveInterval*1000);
		};
		ws.onerror = function (ev) {
			// console.warn('websocket error', ev);
		};
		ws.onclose = function (ev) {
			// doClose: 通过proxy.close()关闭后，无须重连
			// 1000: 正常关闭; 但连jdserver时ws.close()返回1005
			if (!doClose && ev.code != 1000 && ev.code != 1005) {
				console.warn('websocket close. will reconnect.');
				reconnect();
				return;
			}
			if (tmrAlive)
				clearTimeout(tmrAlive);
			console.log('websocket close');
		};
		ws.onmessage = function (ev) {
			if (!handleMsg) {
				console.log(ev.data);
				return;
			}
			if (opt.dataType == 'json') {
				if (ev.data[0] == '{') // json msg
					handleMsg(JSON.parse(ev.data), ws);
				else
					console.log(ev.data);
				return;
			}
			handleMsg(ev.data, ws);
		};
	}

	function reconnect() {
		tmr = setTimeout(connect, 5000);
	}
	function alive() {
		var req = {ac: "alive"};
		ws.send(JSON.stringify(req));
	}
}

if (! String.prototype.replaceAll) {
	String.prototype.replaceAll = function (from, to) {
		return this.replace(new RegExp(from, "g"), to);
	}
}

// vi: foldmethod=marker 
// ====== WEBCC_END_FILE common.js }}}

// ====== WEBCC_BEGIN_FILE commonjq.js {{{
jdModule("jdcloud.common", JdcloudCommonJq);
function JdcloudCommonJq()
{
var self = this;

self.assert(window.jQuery, "require jquery lib.");
var mCommon = jdModule("jdcloud.common");

// 原版不支持async函数。此处统一修改做兼容。
$.isFunction = function (o) {
	return typeof(o) == 'function';
};

/**
@fn getFormData(jo, doGetAll)

取DOM对象中带name属性的子对象的内容, 放入一个JS对象中, 以便手工调用callSvr.

注意: 

- 这里Form不一定是Form标签, 可以是一切DOM对象.
- 如果DOM对象有disabled属性, 则会忽略它, 这也与form提交时的规则一致.

与setFormData配合使用时, 可以只返回变化的数据.

	jf.submit(function () {
		var ac = jf.attr("action");
		callSvr(ac, fn, getFormData(jf));
	});

在dialog的onValidate/onOk回调中，由于在显示对话框时自动调用过setFormData，所以用getFormData只返回有修改变化的数据。如果要取所有数据可设置参数doGetAll=true:

	var data = WUI.getFormData(jfrm, true);

这也只返回非disabled的组件，如果包括disabled组件的值也需要，可以用

	var data = WUI.getFormData(jfrm, "all");

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

如果有多个同名组件（name相同，且非disabled状态），最终值将以最后组件为准。
如果想要以数组形式返回所有值，应在名字上加后缀"[]"，示例：

	行统计字段: <select name="gres[]" class="my-combobox fields"></select>
	行统计字段2: <select name="gres[]" class="my-combobox fields"></select>
	列统计字段: <select name="gres2" class="my-combobox fields"></select>
	列统计字段2: <select name="gres2" class="my-combobox fields"></select>

取到的结果示例：

	{ gres: ["id", "name"], gres2: "name" }

@see setFormData
 */
self.getFormData = getFormData;
function getFormData(jo, doGetAll)
{
	var data = {};
	var isFormData = false;
	var enctype = jo.attr("enctype");
	if ( (enctype && enctype.toLowerCase() == "multipart/form-data") || jo.has("[name]:file").size() >0) {
		isFormData = true;
		data = new FormData();
	}
	var orgData = jo.data("origin_") || {};
	formItems(jo, function (ji, name, it) {
		if (doGetAll != "all" && it.getDisabled())
			return;
		var orgContent = orgData[name];
		if (orgContent == null)
			orgContent = "";
		var content = it.getValue();
		if (content == null)
			content = "";
		if (doGetAll || content !== String(orgContent)) // 避免 "" == 0 或 "" == false
		{
			if (! isFormData) {
				// URL参数支持数组，如`a[]=hello&a[]=world`，表示数组`a=["hello","world"]`
				if (name.substr(-2) == "[]") {
					name = name.substr(0, name.length-2);
					if (! data[name]) {
						data[name] = [];
					}
					data[name].push(content);
				}
				else {
					data[name] = content;
				}
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
@fn getFormData_vf(jo)

专门取虚拟字段的值。例如：

	<select name="whId" class="my-combobox" data-options="url:..., jd_vField:'whName'"></select>

用WUI.getFormData可取到`{whId: xxx}`，而WUI.getFormData_vf遍历带name属性且设置了jd_vField选项的控件，调用接口getValue_vf(ji)来取其显示值。
因而，为支持取虚拟字段值，控件须定义getValue_vf接口。

	<input name="orderType" data-options="jd_vField:'orderType'" disabled>

注意：与getFormData不同，它不忽略有disabled属性的控件。

@see defaultFormItems
 */
self.getFormData_vf = getFormData_vf;
function getFormData_vf(jo)
{
	var data = {};
	formItems(jo, function (ji, name, it) {
		var vname = WUI.getOptions(ji).jd_vField;
		if (!vname)
			return;
		data[vname] = it.getValue_vf();
	});
	return data;
}

/**
@fn formItems(jo, cb)

表单对象遍历。对表单jo（实际可以不是form标签）下带name属性的控件，交给回调cb处理。

注意:

- 通过取getDisabled接口判断，可忽略有disabled属性的控件以及未选中的checkbox/radiobutton。

对于checkbox，设置时根据val确定是否选中；取值时如果选中取value属性否则取value-off属性。
缺省value为"on", value-off为空(非标准属性，本框架支持)，可以设置：

	<input type="checkbox" name="flag" value="1">
	<input type="checkbox" name="flag" value="1" value-off="0">

@param cb(ji, name, it) it.getDisabled/setDisabled/getValue/setValue/getShowbox
当cb返回false时可中断遍历。

示例：

	WUI.formItems(jdlg.find(".my-fixedField"), function (ji, name, it) {
		var fixedVal = ...
		if (fixedVal || fixedVal == '') {
			it.setReadonly(true);
			var forAdd = beforeShowOpt.objParam.mode == FormMode.forAdd;
			if (forAdd) {
				it.setValue(fixedVal);
			}
		}
		else {
			it.setReadonly(false);
		}
	});

@fn getFormItem(ji)

获取对话框上一个组件的访问器。示例，设置名为orderId的组件值：

	var ji = jdlg.find("[name=orderId]"); // 或者用 var ji = $(frm.orderId);
	var it = WUI.getFormItem(ji); // 或者用 var it = ji.gn()
	it.setValue("hello"); // 类似于ji.val("hello")，但支持各种复杂组件

还可以用更简洁的jo.gn，以及支持用链式风格的调用：

	var it = jdlg.gn("orderId");
	it.val("hello").disabled(true); // 等价于 it.setValue("hello");  it.setDisabled(true);

@see jQuery.fn.gn(name?)

@var getFormItemExt

可通过扩展`WUI.getFormItemExt[新类型]`来为表单扩展其它类型控件。示例：

	WUI.getFormItemExt["myinput"] = function (ji) {
		if (ji.hasClass("myinput"))
			return new MyInputFormItem(ji);
	}
	function MyInputFormItem(ji) {
		WUI.FormItem.call(this, ji);
	}
	MyInputFormItem.prototype = $.extend(new WUI.FormItem(), {
		getValue: function () {
			return this.ji.val();
		}
	});
 */
self.formItems = formItems;
self.getFormItemExt = {};
self.getFormItem = getFormItem;
function getFormItem(ji)
{
	var ret;
	$.each(self.getFormItemExt, function (k, ext) {
		var rv = ext(ji);
		if (rv !== undefined) {
			ret = rv;
			return false;
		}
	});
	return ret || new FormItem(ji);
}

self.FormItem = FormItem;
function FormItem(ji) {
	this.ji = ji;
}

// { ji }
FormItem.prototype = {
	getName: function () {
		var jo = this.ji;
		return jo.attr("name") || jo.prop("name");
	},
	getJo: function () {
		return this.ji;
	},
	getDisabled: function () {
		var jo = this.ji;
		var val = jo.prop("disabled");
		if (val === undefined)
			val = jo.attr("disabled");
		var o = jo[0];
		if (! val && o.tagName == "INPUT") {
			if (o.type == "radio" && !o.checked)
				return true;
		}
		return val;
	},
	setDisabled: function (val) {
		var jo = this.ji;
		if (jo.hasClass("easyui-validatebox")) {
			jo.validatebox({disabled: !!val});
			return;
		}
		jo.prop("disabled", !!val);
		if (val)
			jo.attr("disabled", "disabled");
		else
			jo.removeAttr("disabled");
	},
	getReadonly: function () {
		var jo = this.ji;
		var val = jo.prop("readonly");
		if (val === undefined)
			val = jo.attr("readonly");
		return val;
	},
	setReadonly: function (val) {
		var jo = this.ji;
		jo.prop("readonly", !!val);
		if (val)
			jo.attr("readonly", "readonly");
		else
			jo.removeAttr("readonly");
	},
	setValue: function (val) {
		var jo = this.ji;
		var isInput = jo.is(":input");
		if (val === undefined) {
			if (isInput) {
				var o = jo[0];
				// 取初始值
				if (o.tagName === "TEXTAREA")
					val = jo.html();
				else if (! (o.tagName == "INPUT") && (o.type == "hidden")) // input[type=hidden]对象比较特殊：设置property value后，attribute value也会被设置。
					val = jo.attr("value");
				if (val === undefined)
					val = "";
			}
			else {
				val = "";
			}
		}
		if ($.isArray(val) || $.isPlainObject(val)) {
			val = JSON.stringify(val);
		}

		if (jo.is(":checkbox")) {
			jo.prop("checked", mCommon.tobool(val));
		}
		else if (isInput) {
			jo.val(val);
		}
		else {
			jo.html(val);
		}
	},
	getValue: function (jo) {
		var jo = this.ji;
		var val;
		if (jo.is(":checkbox")) {
			val = jo.prop("checked")? jo.val(): jo.attr("value-off");
			if (val === "on")
				val = 1;
			/* NOTE: 复选框特别行为：如果不选则无值
			if (val === undefined)
				val = 0;
			*/
		}
		else if (jo.is(":input")) {
			val = jo.val();
			if (val)
				val = val.trim();
		}
		else {
			val = jo.html();
		}
		return val;
	},
	// 用于find模式设置。搜索"设置find模式"/datetime
	getShowbox: function () {
		return this.ji;
	},

	// 用于显示的虚拟字段值, 此处以select为例，适用于my-combobox
	getValue_vf: function () {
		var jo = this.ji;
		var o = jo[0];
		if (o.tagName == "SELECT")
			return o.selectedIndex >= 0 ? o.options[o.selectedIndex].innerText : '';
		return this.getValue(jo);
	},
	getTitle: function () {
		return this.ji.closest("td").prev("td").html();
	},
	setTitle: function (val) {
		this.ji.closest("td").prev("td").html(val);
	},
	setFocus: function () {
		var j1 = this.getShowbox();
		if (j1.is(":hidden")) {
			selectTab(j1);
		}
		j1.focus();
	},

	// 链式接口
	val: function (v) {
		if (v === undefined)
			return this.getValue();
		this.setValue(v);
		return this;
	},
	disabled: function (v) {
		if (v === undefined)
			return this.getDisabled();
		this.setDisabled(v);
		return this;
	},
	readonly: function (v) {
		if (v === undefined)
			return this.getReadonly();
		this.setReadonly(v);
		return this;
	},
	visible: function (v) {
		var jp = this.ji.closest("tr,.wui-field");
		if (v === undefined) {
			return this.getShowbox().css("display") != "none" && jp.css("display") != "none";
			//return jp.is(":visible");
		}
		jp.toggle(!!v);
		return this;
	},
	setOption: function (v) {
		if (!$.isPlainObject(v))
			return;
		this.getJo().trigger("setOption", v);
		return this;
		// for: combo, subobj
		//WUI.setOptions(ji, v);
	}
};

// jo是tabs下的某个组件
function selectTab(jo)
{
	var jtabs = jo.closest(".easyui-tabs");
	if (jtabs.size() == 0)
		return;
	var idx = -1;
	jtabs.find(">.tabs-panels>.panel").each(function (idx1) {
		if (jo.closest(this).size() > 0) {
			idx = idx1;
			return true;
		}
	});
	if (idx < 0)
		return;
	jtabs.tabs("select", idx);
}

/**
@fn jQuery.fn.gn(name?)

按名字访问组件（gn表示getElementByName），返回访问器（iterator），用于对各种组件进行通用操作。

示例：

	var it = jdlg.gn("orderId"); 
	var v = it.val(); // 取值，相当于 jdlg.find("[name=orderId]").val(); 但兼容my-combobox, wui-combogrid, wui-subobj等复杂组件。
	it.val(100); // 设置值
	// it.val([100, "ORDR-100"]); // 对于combogrid, 可以传数组，同时设置value和text

	var isVisible = it.visible(); // 取是否显示
	it.visible(false); // 设置隐藏

	var isDisabled = it.disabled();
	it.disabled(true);

	var isReadonly = it.readonly();
	it.readonly(true);

如果未指定name，则以jQuery对象本身作为组件返回访问器。所以也可以这样用：

	var jo = jdlg.find("[name=orderId]");
	var it = jo.gn(); // name可以省略，表示取自身
	it.val(100);

*/
jQuery.fn.gn = function (name) {
	var ji = name? this.find("[name=" + name + "],.wui-subobj-" + name): this;
	return WUI.getFormItem(ji);
}

/*
// 倒序遍历对象obj, 用法与$.each相同。
function eachR(obj, cb)
{
	var arr = [];
	for (var prop in obj) {
		arr.push(prop);
	}
	for (var i=arr.length-1; i>=0; --i) {
		var v = obj[arr[i]];
		if (cb.call(v, arr[i], v) === false)
			break;
	}
}
*/

function formItems(jo, cb, sel)
{
	if (sel == null)
		sel = "[name]";
	var jiList = jo.filter(sel).add(jo.find(sel));
	jiList.each (function () {
		var it = getFormItem($(this));
		var name = it.getName();
		if (! name)
			return;
		var ji = it.getJo(); // 原jquery对象, 一般与$(this)相同，但像combo这类可能不同
		if (cb(ji, name, it) === false) {
			return false;
		}
	});
}

/**
@fn setFormData(jo, data?, opt?)

用于为带name属性的DOM对象设置内容为data[name].
要清空所有内容, 可以用 setFormData(jo), 相当于增强版的 form.reset().

注意:
- DOM项的内容指: 如果是input/textarea/select等对象, 内容为其value值; 如果是div组件, 内容为其innerHTML值.
- 当data[name]未设置(即值为undefined, 注意不是null)时, 对于input/textarea等组件, 行为与form.reset()逻辑相同, 
 即恢复为初始化值。（特别地，form.reset无法清除input[type=hidden]对象的内容, 而setFormData可以)
 对div等其它对象, 会清空该对象的内容.
- 如果对象设置有属性"noReset", 则不会对它进行设置.

@param opt {setOrigin?=false, setOnlyDefined?=false}

@param opt.setOrigin 为true时将data设置为数据源, 这样在getFormData时, 只会返回与数据源相比有变化的数据.
缺省会设置该DOM对象数据源为空.

@param opt.setOnlyDefined 设置为true时，只设置form中name在data中存在的项，其它项保持不变；而默认是其它项会清空。

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
	formItems(jo, function (ji, name, it) {
		if (ji.attr("noReset"))
			return;
		var content = data[name];
		if (opt1.setOnlyDefined && content === undefined)
			return;
		it.setValue(content);
	});
	jo.data("origin_", opt1.setOrigin? data: null);
}

/**
@fn loadScript(url, fnOK?, ajaxOpt?)

@param fnOK 加载成功后的回调函数
@param ajaxOpt 传递给$.ajax的额外选项。

默认未指定ajaxOpt时，简单地使用添加script标签机制异步加载。如果曾经加载过，可以重用cache。

注意：再次调用时是否可以从cache中取，是由服务器的cache-control决定的，在web和web/page目录下的js文件一般是禁止缓存的，再次调用时会从服务器再取，若文件无更改，服务器会返回304状态。
这是因为默认我们使用Apache做服务器，在相应目录下.htaccess中配置有缓存策略。

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

示例：在菜单中加一项“工单工时统计”，动态加载并执行一个JS文件：
store.html中设置菜单：

				<a href="javascript:WUI.loadScript('page/mod_工单工时统计.js')">工单工时统计</a>
	
在`page/mod_工单工时统计.js`文件中写报表逻辑，`mod`表示一个JS模块文件，示例：

	function show工单工时统计()
	{
		DlgReportCond.show(function (data) {
			var queryParams = WUI.getQueryParam({createTm: [data.tm1, data.tm2]});
			var url = WUI.makeUrl("Ordr.query", { res: 'id 工单号, code 工单码, createTm 生产日期, itemCode 产品编码, itemName 产品名称, cate2Name 产品系列, itemCate 产品型号, qty 数量, mh 理论工时, mh1 实际工时', pagesz: -1 });
			WUI.showPage("pageSimple", "工单工时统计!", [url, queryParams, onInitGrid]);
		});
	}
	show工单工时统计();

如果JS文件修改了，点菜单时可以实时执行最新的内容。

如果要动态加载script，且使用后删除标签（里面定义的函数会仍然保留），建议直接使用`$.getScript`，它等同于：

	loadScript("1.js", {cache: false});

**[小技巧]**

在index.js/app.js等文件中写代码，必须刷新整个页面才能加载生效。
可以先把代码写在比如 web/test.js 中，这样每次修改后不用大刷新，直接在chrome控制台上加载运行：

	WUI.loadScript("test.js")

等改好了再拷贝到真正想放置这块代码的地方。修改已有的框架中函数也可以这样来快速迭代。
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
				console.error("*** loadScript fails for " + url);
				console.error(err);
			}
		}, options);

		return jQuery.ajax(ajaxOpt);
	}

	var dfd_ = $.Deferred();
	var script= document.createElement('script');
	script.type= 'text/javascript';
	script.src= url;
	script.async = false; // 用于确保执行的先后顺序. 动态创建的script其async值默认为true（因而可能后加载的先执行导致错误），而直接写页面里的script标签默认async为false. 注意该属性与异步加载文件无关，加载都是异步的。
	script.onload = function () {
		if (fnOK)
			fnOK();
		dfd_.resolve();
	}
	script.onerror = function () {
		dfd_.reject();
		console.error("*** loadScript fails for " + url);
	}
	document.head.appendChild(script);
	return dfd_;
}

/**
@fn evalOptions(_source, ctx?, errPrompt?)

执行JS代码，返回JS对象，示例：

	source='{a: 1, b:"hello", c: function () {} }'
	前面允许有单行注释，如
	source='// comment\n {a: 1, b:"hello", c: function () {} }'

JS代码一般以花括号开头。在用于DOM属性时，也允许没有花括号的这种写法，如：

	<div data-options="a:1,b:'hello',c:true"></div>

上例可返回 `{a:1, b:'hello', c:true}`.

也支持各种表达式及函数调用，如：

	<div data-options="getSomeOption()"></div>

更复杂的，如果代码不只是一个选项，前面还有其它JS语句，则返回最后一行语句的值，
最后一行可以是变量、常量、函数调用等，但不可以是花括号开头的选项，对选项须用括号包起来：

	function hello() { }
	({a: 1, b:"hello", c: hello })

或：

	function hello() { }
	var ret={a: 1, b:"hello", c: hello }
	ret

传入的参数变量ctx可以在代码中使用，用于框架与扩展代码的交互，如：

	{a: 1, b:"hello", c: ctx.fn1() }

执行出错时错误显示在控制台。调用者可回调处理错误。

	evalOptions(src, null, function (ex) {
		app_alert("文件" + url + "出错: " + ex);
	});

注意：受限于浏览器，若使用`try { eval(str) } catch(ex) {}` 结构会导致原始的错误行号丢失，
为了避免大量代码中有错误时调试困难，在大于1行代码时，不使用try-catch，而是直接抛出错误。
 */
self.evalOptions = evalOptions;
function evalOptions(_source, ctx, onError)
{
	// "a:1, b:'hello'"
	if (/^\w+:/.test(_source)) {
		_source = "({" + _source + "})";
	}
	// "{a:1, b:'hello'}" 且前面可以有单行注释
	else if (/^(\s*\/\/[^\n]*\n)*\s*\{/.test(_source)) {
		_source = "(" + _source + ")";
	}
	if (_source.indexOf("\n") > 0)
		return eval(_source);

	try {
		return eval(_source);
	}
	catch (ex) {
		console.error(ex);
		if (onError) {
			onError(ex);
		}
		else {
			app_alert("代码错误: " + ex, "e");
		}
	}
}

/**
@fn loadJson(url, fnOK, options)

从远程获取JSON结果. 
注意: 与$.getJSON不同, 本函数不直接调用JSON.parse解析结果, 而是将返回当成JS代码使用eval执行得到JSON结果再回调fnOK.

示例:

	WUI.loadJson("1.js", function (data) {
		// handle json value `data`
	});

1.js可以是返回任意JS对象的代码, 如:

	// 可以有注释
	{
		a: 2 * 3600,
		b: "hello",
		// c: {}
		d: function () {
		},
	}

复杂地，可以定义变量、函数，注意最后返回值对象要用小括号把返回对象括起来，如：

	var schema = {
		title: "菜单配置",
	};

	function onReady() {
	}

	({
		schema: schema,
		onReady: onReady
	})

建议用模块方式来写，即用`(function() { ... return ... })()`把定义内容包起来，这样变量和函数不会污染全局空间：

	(function () {
	var schema = ...
	function onReady() {...}
	return {
		schema: schema,
		onReady: onReady
	}
	})();

不处理结果时, 则该函数与$.getScript效果类似.

@param options 参考$.ajax参数

@options.async 默认为异步，设置`{async:false}`表示同步调用。

@see evalOptions
 */
self.loadJson = loadJson;
function loadJson(url, fnOK, options)
{
	var ajaxOpt = $.extend({
		dataType: "text",
		jdFilter: false,
		success: function (data) {
			val = self.evalOptions(data, null, function (ex) {
				app_alert("文件" + url + "出错: " + ex, "e");
			});
			fnOK.call(this, val);
		}
	}, options);
	return $.ajax(url, ajaxOpt);
}

/**
@fn loadCss(url)

动态加载css文件, 示例:

	WUI.loadCss("lib/bootstrap.min.css");

 */
self.loadCss = loadCss;
function loadCss(url)
{
	var jo = $('<link type="text/css" rel="stylesheet" />').attr("href", url);
	jo.appendTo($("head"));
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
@fn rgb(r,g,b)

生成"#112233"形式的颜色值.

	rgb(255,255,255) -> "#ffffff"

 */
self.rgb = rgb;
function rgb(r,g,b,a)
{
	if (a === 0) // transparent (alpha=0)
		return;
	return '#' + pad16(r) + pad16(g) + pad16(b);

	function pad16(n) {
		var ret = n.toString(16);
		return n>16? ret: '0'+ret;
	}
}

/**
@fn rgb2hex(rgb)

将jquery取到的颜色转成16进制形式，如："rgb(4, 190, 2)" -> "#04be02"

示例：

	var color = rgb2hex( $(".mui-container").css("backgroundColor") );

 */
self.rgb2hex = rgb2hex;
function rgb2hex(rgbFormat)
{
	var rgba = rgb; // function rgb or rgba
	try {
		return eval(rgbFormat);
	} catch (ex) {
		console.log(ex);
	}
/*
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
*/
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
			// b64src = img.src;
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

/**
@fn $.Deferred
@alias Promise
兼容Promise的接口，如then/catch/finally
 */
var fnDeferred = $.Deferred;
$.Deferred = function () {
	var ret = fnDeferred.apply(this, arguments);
	ret.catch = ret.fail;
	ret.finally = ret.always;
	var fn = ret.promise;
	ret.promise = function () {
		var r = fn.apply(this, arguments);
		r.catch = r.fail;
		r.finally = r.always;
		return r;
	}
	return ret;
}

// 返回筋斗云后端query接口可接受的cond条件。可能会修改cond(如果它是数组)
function appendCond(cond, cond1)
{
	if (!cond) {
		if ($.isArray(cond1))
			return $.extend(true, [], cond1);
		if ($.isPlainObject(cond1))
			return $.extend(true, {}, cond1);
		return cond1;
	}
	if (!cond1)
		return cond;

	if ($.isArray(cond)) {
		cond.push(cond1);
	}
	else if (typeof(cond) == "string" && typeof(cond1) == "string") {
		cond += " AND (" + cond1 + ")";
	}
	else {
		cond = [cond, cond1];
	}
	return cond;
}

// 类似$.extend，但对cond做合并而不是覆盖处理. 将修改并返回target
self.extendQueryParam = extendQueryParam;
function extendQueryParam(target, a, b)
{
	var cond;
	$.each(arguments, function (i, e) {
		if (i == 0) {
			cond = target.cond;
		}
		else if ($.isPlainObject(e)) {
			cond = appendCond(cond, e.cond);
			$.extend(target, e);
		}
	});
	if (cond) {
		target.cond = cond;
	}
	return target;
}

/**
@fn makeTree(arr, idField="id", fatherIdField="fatherId", childrenField="children")

将array转成tree. 注意它会修改arr（添加children属性），但返回新的数组。

	var ret = WUI.makeTree([
		{id: 1},
		{id: 2, fatherId: 1},
		{id: 3, fatherId: 2},
		{id: 4, fatherId: 1}
	]);

结果：

	ret = [
		{id: 1, children:  [
			{id: 2, fatherId: 1, children:  [
				{id: 3, fatherId: 2},
			],
			{id: 4, fatherId: 1}
		]
	]
 */
self.makeTree = makeTree;
function makeTree(arr, idField, fatherIdField, childrenField)
{
	if (idField == null)
		idField = "id";
	if (fatherIdField == null)
		fatherIdField = "fatherId";
	if (childrenField == null)
		childrenField = "children";
	var ret = [];
	$.each(arr, function (i, e) {
		var fid = e[fatherIdField];
		if (fid == null) {
			ret.push(e);
			return;
		}
		var found = false;
		$.each(arr, function (i1, e1) {
			if (fid == e1[idField]) {
				if (e1[childrenField] == null) {
					e1[childrenField] = [];
				}
				e1[childrenField].push(e);
				found = true;
				return false;
			}
		});
		if (! found)
			ret.push(e);
	});
	return ret;
}

// ==== jQuery.base64Encode/base64Decode
(function ($) {

    var keyString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    var utf8Encode = function (string) {
        string = string.replace(/\x0d\x0a/g, "\x0a");
        var output = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                output += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                output += String.fromCharCode((c >> 6) | 192);
                output += String.fromCharCode((c & 63) | 128);
            } else {
                output += String.fromCharCode((c >> 12) | 224);
                output += String.fromCharCode(((c >> 6) & 63) | 128);
                output += String.fromCharCode((c & 63) | 128);
            }
        }
        return output;
    };

    var utf8Decode = function (input) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;
        while (i < input.length) {
            c = input.charCodeAt(i);
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            } else if ((c > 191) && (c < 224)) {
                c2 = input.charCodeAt(i + 1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            } else {
                c2 = input.charCodeAt(i + 1);
                c3 = input.charCodeAt(i + 2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return string;
    };

    $.extend(self, {
        base64Encode:function (input, enhance) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;
            input = utf8Encode(input);
            var key = keyString;
            if (enhance) {
                var n = self.randInt(1,63);
                var n1 = (n+input.length) % 64;
                key = key.substr(n,64-n) + key.substr(0, n) + ' '; // last is changed to space for trim
                output = keyString.charAt(n) + key.charAt(n1);
            }
            while (i < input.length) {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);
                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;
                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }
                output = output + key.charAt(enc1) + key.charAt(enc2) + key.charAt(enc3) + key.charAt(enc4);
            }
            if (enhance)
                output = output.trim().replace(/[+]/g, '-');
            return output;
        },
        base64Decode:function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            while (i < input.length) {
                enc1 = keyString.indexOf(input.charAt(i++));
                enc2 = keyString.indexOf(input.charAt(i++));
                enc3 = keyString.indexOf(input.charAt(i++));
                enc4 = keyString.indexOf(input.charAt(i++));
                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;
                output = output + String.fromCharCode(chr1);
                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            }
            output = utf8Decode(output);
            return output;
        }
    });
    return 0;
})(jQuery);

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

@see evalOptions
*/
self.evalAttr = evalAttr;
function evalAttr(jo, name, ctx)
{
	var val = jo.attr(name);
	if (val) {
		val = self.evalOptions(val, ctx, function (ex) {
			self.app_alert("属性`" + name + "'格式错误: <br>" + val + "<br>" + ex, "e");
		});
	}
	return val;
}

/*
如果css项没有以指定selector开头(示例：移动端页面"#page1", 管理端页面".pageX1", 管理端对话框"#dlgX1")，则自动添加selector限定：

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
- 特定情况下，可以指定自身，如：

		#page1 {
		}
		#page1 > .list {
		}

*/
self.ctx.fixPageCss = fixPageCss;
function fixPageCss(css, selector)
{
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
			if (sel[0] == '@')
				return ms;
			if (sel.startsWith(selector)) {
				var ch = sel.substr(selector.length, 1);
				if (ch == '' || ch == ' ' || ch == '.' || ch == '#' || ch == ':' || ch == '>' || ch == '+')
					return ms;
			}
			return ms1 + selector + ' ' + sel;
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
window.DirectReturn = DirectReturn;
function DirectReturn() {}

/**
@fn windowOnError()

框架自动在脚本出错时弹框报错，并上报服务端(syslog).
可通过WUI.options.skipErrorRegex忽略指定错误。
 */
function windowOnError(ev)
{
	// 出错后尝试恢复callSvr变量
	if ($.active || self.isBusy) {
		setTimeout(function () {
			$.active = 0;
			self.isBusy = 0;
			self.hideLoading();
		}, 1000);
	}
	var msg = ev.message, errObj = ev.error;
	if (errObj instanceof DirectReturn || /abort$/.test(msg))
		return true;
	if (self.options.skipErrorRegex && self.options.skipErrorRegex.test(msg))
		return true;
	if (errObj === undefined && msg === "[object Object]") // fix for IOS9
		return true;
	debugger;
	var content = msg + " (" + ev.filename + ":" + ev.lineno + ":" + ev.colno + ")";
	if (errObj && errObj.stack)
		content += "\n" + errObj.stack.toString();
	if (self.syslog)
		self.syslog("fw", "ERR", content);
	app_alert(msg, "e");
}
window.addEventListener('error', windowOnError);

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
			// 支持一个DOM对象绑定多个组件，分别初始化
			var enhanced = je.data("mui-enhanced");
			if (enhanced) {
				if (enhanced.indexOf(sel) >= 0)
					return;
				enhanced.push(sel);
			}
			else {
				enhanced = [sel];
			}
			je.data("mui-enhanced", enhanced);
			fn(je);
		});
	});
}

/**
@fn getOptions(jo, defVal?)

第一次调用，根据jo上设置的data-options属性及指定的defVal初始化，或为`{}`。
存到jo.prop("muiOptions")上。之后调用，直接返回该属性。

@see evalAttr
*/
self.getOptions = getOptions;
function getOptions(jo, defVal)
{
	var opt = jo.prop("muiOptions");
	if (opt === undefined) {
		opt = $.extend({}, defVal, self.evalAttr(jo, "data-options"));
		jo.prop("muiOptions", opt);
	}
	else if ($.isPlainObject(defVal)) {
		$.each(defVal, function (k, v) {
			if (opt[k] === undefined)
				opt[k] = v;
		});
	}
	return opt;
}

self.setOptions = setOptions;
function setOptions(jo, val)
{
	if ($.isPlainObject(val))
		jo.prop("muiOptions", val);
}

//}}}

// 参考 getQueryCond中对v各种值的定义
function getexp(k, v, hint)
{
	if (typeof(v) == "number")
		return k + "=" + v;
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
		op = " LIKE ";
	}
	v = $.trim(v);

	if (v === "null")
	{
		if (op == "<>")
			return k + " is not null";
		return k + " is null";
	}
	if (v === "empty")
		v = "";

	var isId = (k=="id" || k.substr(-2)=="Id");
	if (isId && v.match(/^\d+$/))
		return k + op + v;
	var doFuzzy = self.options.fuzzyMatch && op == "=" && !(hint == "e"); // except enum
	if (doFuzzy) {
		op = " LIKE ";
		v = "%" + v + "%";
	}
// 		// ???? 只对access数据库: 支持 yyyy-mm-dd, mm-dd, hh:nn, hh:nn:ss
// 		if (!is_like && v.match(/^((19|20)\d{2}[\/.-])?\d{1,2}[\/.-]\d{1,2}$/) || v.match(/^\d{1,2}:\d{1,2}(:\d{1,2})?$/))
// 			return op + "#" + v + "#";
	return k + op + Q(v);
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

(v5.5) value支持用数组表示范围（前闭后开区间），特别方便为起始、结束时间生成条件：

	var cond = getQueryCond({tm: ["2019-1-1", "2020-1-1"]}); // 生成 "tm>='2019-1-1' AND tm<'2020-1-1'"
	var cond = getQueryCond({tm: [null, "2020-1-1"]}); // 生成 "tm<'2020-1-1'"。数组中任一值为null或''都一样会被忽略。
	var cond = getQueryCond({tm: [null, null]); // 返回空串''

@see getQueryParam
@see getQueryParamFromTable 获取datagrid的当前查询参数
@see doFind

(v5.5) 支持在key中包含查询提示。如"code/s"表示不要自动猜测数值区间或日期区间。
比如输入'126231-191024'时不会当作查询126231到191024的区间。

(v6) 日期、时间字段查询时，可使用`WUI.getTmRange`函数支持的时间区间如"今天"，"本周"，"本月", "今年", "近3天(小时|周|月|季度|年)”，"前3天(小时|周|月|季度|年)”等。

@see wui-find-hint
*/
self.queryHint = "查询示例\n" +
	"文本：\"王小明\", \"王*\"(匹配开头), \"*上海*\"(匹配部分)\n" +
	"数字：\"5\", \">5\", \"5-10\", \"5-10,12,18\"\n" +
	"时间：\">=2017-10-1\", \"<2017-10-1 18:00\", \"2017-10\"(10月), \"2017-7-1~2017-10-1\"(7-9月即3季度)\n" +
	'支持"今天"，"本周"，"本月", "今年", "近3天(小时|周|月|季度|年)”，"前3天(小时|周|月|季度|年)"等。\n' + 
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
		if (v == null || v === "" || v.length==0)
			return;

		var hint = null;
		var k1 = k.split('/');
		if (k1.length > 1) {
			k = k1[0];
			hint = k1[1];
		}

		if ($.isArray(v)) {
			if (v[0])
				condArr.push(k + ">='" + v[0] + "'");
			if (v[1])
				condArr.push(k + "<'" + v[1] + "'");
			return;
		}
		var arr = v.toString().split(/\s+(and|or)\s+/i);
		var str = '';
		var bracket = false;
		// NOTE: 根据字段名判断时间类型
		var isTm = hint == "tm" || /(Tm|^tm|时间)\d*$/.test(k);
		var isDt = hint == "dt" || /(Dt|^dt|日期)\d*$/.test(k);
		$.each(arr, function (i, v1) {
			if ( (i % 2) == 1) {
				str += ' ' + v1.toUpperCase() + ' ';
				bracket = true;
				return;
			}
			v1 = v1.replace(/，/g, ',');
			v1 = v1.replace(/＊/g, '*');
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
				if (hint != "s" && (isTm || isDt)) {
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
					else if (mt = self.getTmRange(v2)) {
						str1 += "(" + k + ">='" + mt[0] + "' AND " + k + "<'" + mt[1] + "')";
						isHandled = true;
					}
				}
				if (!isHandled && hint != "s") {
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
					str1 += getexp(k, v2, hint);
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
@fn doSpecial(jo, filter, fn, cnt=5, interval=2s)

连续5次点击某处，每次点击间隔不超过2s, 执行隐藏动作。

例：
	// 连续5次点击当前tab标题，重新加载页面. ev为最后一次点击事件.
	var self = WUI;
	self.doSpecial(self.tabMain.find(".tabs-header"), ".tabs-selected", function (ev) {
		self.reloadPage();
		self.reloadDialog(true);

		// 弹出菜单
		//jmenu.menu('show', {left: ev.pageX, top: ev.pageY});
		return false;
	});

连续3次点击对话框中的字段标题，触发查询：

	WUI.doSpecial(jdlg, ".wui-form-table td", fn, 3);

*/
self.doSpecial = doSpecial;
function doSpecial(jo, filter, fn, cnt, interval)
{
	var MAX_CNT = cnt || 5;
	var INTERVAL = interval || 2; // 2s
	jo.on("click.special", filter, function (ev) {
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

		fn.call(this, ev);
	});
}

/**
@fn execCopy(text)

复制到剪贴板。
*/
self.execCopy = execCopy;
function execCopy(text)
{
	$(window).one("copy", function (ev) {
		ev.originalEvent.clipboardData.setData('text/plain', text);
		app_show("已复制到剪贴板，按Ctrl-V粘贴。");
		return false;
	});
	document.execCommand("copy");
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

var RV_ABORT = undefined;//"$abort$";

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

/**
@key $.ajax
@key ajaxOpt.jdFilter 禁用返回格式合规检查.

以下调用, 如果1.json符合`[code, data]`格式, 则只返回处理data部分; 否则将报协议格式错误:

	$.ajax("1.json", {dataType: "json"})
	$.get("1.json", null, console.log, "json")
	$.getJSON("1.json", null, console.log)

对于ajax调用($.ajax,$.get,$.post,$.getJSON等), 若明确指定dataType为"json"或"text", 且未指定jdFilter为false, 
则框架按筋斗云返回格式即`[code, data]`来处理只返回data部分, 不符合该格式, 则报协议格式错误.

以下调用未指定dataType, 或指定了jdFilter=false, 则不会应用筋斗云协议格式:

	$.ajax("1.json")
	$.get("1.json", null, console.log)
	$.ajax("1.json", {jdFilter: false}) // jdFilter选项明确指定了不应用筋斗云协议格式

*/
var ajaxOpt = {
	beforeSend: function (xhr) {
		// 保存xhr供dataFilter等函数内使用。
		this.xhr_ = xhr;
		var type = this.dataType;
		if (this.jdFilter !== false && (type == "json" || type == "text")) {
			this.jdFilter = true;
			// for jquery > 1.4.2. don't convert text to json as it's processed by defDataProc.
			// NOTE: 若指定dataType为"json"时, jquery会对dataFilter处理过的结果再进行JSON.parse导致出错, 根据jquery1.11源码修改如下:
			this.converters["text json"] = true;
		}
	},
	//dataType: "text",
	dataFilter: function (data, type) {
		if (this.jdFilter) {
			rv = defDataProc.call(this, data);
			if (rv !== RV_ABORT)
				return rv;
			-- $.active; // ajax调用中断,这里应做些清理
			self.app_abort();
		}
		return data;
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
	}, (self.options.showLoadingDelay || 200));
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
		// 一直等到不忙，避免callSvr/$.ajax混用导致无法hideLoading
		// 注意：一旦在callSvc回调中异常出错，会在WUI.setOnError中处理($.active=0)，避免一直显示加载。
		loopDo(function () {
			if ($.active-m_silentCall > 0 || m_manualBusy != 0)
				return;
			if (self.isBusy) {
				self.isBusy = 0;
				var tv = new Date() - m_tmBusy;
				m_tmBusy = 0;
				console.log("idle after " + tv + "ms");

				// handle idle
				self.hideLoading();
				$(document).trigger("idle");
			}
// 			if ($.mobile)
// 				$.mobile.loading("hide");
			return true;
		});
	});
}

// fn()返回true时完成，否则反复执行
function loopDo(fn)
{
	if (fn())
		return;
	setTimeout(loopDo.bind(this, fn), 50);
}

function defAjaxErrProc(xhr, textStatus, e)
{
	//if (xhr && xhr.status != 200) {
		var ctx = this.ctx_ || {};
		ctx.status = xhr.status;
		ctx.statusText = xhr.statusText;

		if (xhr.status == 0 && !ctx.noex) {
			self.app_alert("连不上服务器了，是不是网络连接不给力？", "e");
		}
		else if (this.handleHttpError) {
			var data = xhr.responseText;
			var rv = defDataProc.call(this, data);
			if (rv !== RV_ABORT)
				this.success && this.success(rv);
			return;
		}
		else if (!ctx.noex) {
			self.app_alert("操作失败: 服务器错误. status=" + xhr.status + "-" + xhr.statusText, "e");
		}

		leaveWaiting(ctx);
	//}
}

/**
@fn defDataProc(rv)

@param rv BQP协议原始数据，如 "[0, {id: 1}]"，一般是字符串，也可以是JSON对象。
@return data 按接口定义返回的数据对象，如 {id: 1}. 如果返回值===RV_ABORT，调用函数应直接返回，不回调应用层。

注意：如果callSvr设置了`noex:1`选项，则当调用失败时返回false。

*/
self.defDataProc = defDataProc;
function defDataProc(rv)
{
	var ctx = this.ctx_ || {};
	var ext = ctx.ext;

	// ajax-beforeSend回调中设置
	while (this.xhr_ && (ext == null || ext == "default") ) {
		var val = this.xhr_.getResponseHeader("X-Powered-By");
		if (g_data.poweredBy == null)
			g_data.poweredBy = val;
		else if (g_data.poweredBy != val)
			break;

		val = this.xhr_.getResponseHeader("X-Daca-Server-Rev");
		if (val && g_data.serverRev != val) {
			if (g_data.serverRev) {
				mCommon.reloadSite();
			}
			console.log("Server Revision: " + val);
			g_data.serverRev = val;
		}
		var modeStr;
		val = mCommon.parseValue(this.xhr_.getResponseHeader("X-Daca-Test-Mode"));
		if (g_data.testMode != val) {
			g_data.testMode = val;
			if (g_data.testMode)
				modeStr = T("测试模式");
			self.options.xparam = 0;
		}
		val = mCommon.parseValue(this.xhr_.getResponseHeader("X-Daca-Mock-Mode"));
		if (g_data.mockMode != val) {
			g_data.mockMode = val;
			if (g_data.mockMode)
				modeStr = T("测试模式") + "," + T("模拟模式");
		}
		if (modeStr) {
			self.dfdLogin.then(function () {
				self.app_alert(modeStr, {timeoutInterval:2000});
			});
		}
		break;
	}

	try {
		if (rv !== "" && typeof(rv) == "string")
			rv = $.parseJSON(rv);
	}
	catch (e)
	{
		leaveWaiting(ctx);
		var msg = T("服务器数据错误。");
		self.app_alert(msg);
		ctx.dfd.reject.call(this, msg);
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
		var that = this;
		if (rv[0] == 0) {
			ctx.dfd && setTimeout(function () {
				ctx.dfd.resolve.call(that, rv[1]);
			});
			return rv[1];
		}
		ctx.dfd && setTimeout(function () {
			if (!that.noex)
				ctx.dfd.reject.call(that, rv[1]);
			else
				ctx.dfd.resolve.call(that, false);
		});

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
			return RV_ABORT;
		}
		else if (rv[0] == E_AUTHFAIL) {
			var errmsg = rv[1] || "验证失败，请检查输入是否正确!";
			self.app_alert(errmsg, "e");
			return RV_ABORT;
		}
		else if (rv[0] == E_ABORT) {
			console.log("!!! abort call");
			return RV_ABORT;
		}
		logError();
		self.app_alert(T("操作失败") + ": " + rv[1], "e");
	}
	else {
		logError();
		self.app_alert(T("服务器通讯协议异常!"), "e"); // 格式不对
	}
	return RV_ABORT;

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

特别地, 如果action是相对路径, 或是'.php'文件, 则不会自动拼接WUI.options.serverUrl:

	callSvr("./1.json"); // 如果是callSvr("1.json") 则url可能是 "../api.php/1.json"这样.
	callSvr("./1.php");

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
	else if (action) {
		var m = action.match(/^(\w+):(\w.*)/);
		if (m) {
			ext = m[1];
			action = m[2];
		}
		else {
			ext = "default";
		}
	}
	else {
		throw "makeUrl error: no action";
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

	var xparam = 0;
	var url;
	var fnMakeUrl = self.callSvrExt[ext] && self.callSvrExt[ext].makeUrl;
	if (fnMakeUrl) {
		url = fnMakeUrl(action, params);
	}
	else if (self.options.moduleExt && (url = self.options.moduleExt["callSvr"](action)) != null) {
	}
	// 缺省接口调用：callSvr('login'),  callSvr('./1.json'), callSvr('/jdserver/stat') 或 callSvr("1.php") (以"/", "./"或"../"等绝对或相对路径开头, 或是取".php"文件, 则不去自动拼接serverUrl)
	else if (action[0] != '.' && action[0] != '/' && action.indexOf(".php") < 0)
	{
		var opt = self.options;
		var usePathInfo = !opt.serverUrlAc && !opt.xparam;
		if (usePathInfo) {
			if (opt.serverUrl.slice(-1) == '/')
				url = opt.serverUrl + action;
			else
				url = opt.serverUrl + "/" + action;
		}
		else {
			url = opt.serverUrl;
			var ac = opt.serverUrlAc || "ac";
			if (! params[ac]) {
				params[ac] = action;
			}
			else { // 如果已有ac参数在用，则改用优先级更多的_ac参数，不覆盖原参数
				params["_ac"] = action;
			}
		}
		xparam = opt.xparam;
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
	if (g_args.phpdebug)
		params.XDEBUG_SESSION_START = 1;

	var p = $.param(params);
	// 无参数时，也会设置xp=1，用于通知callSvr对post内容加密
	if (xparam)
		p = "xp=" + (p? self.base64Encode(p, true): 1);
	var ret = mCommon.appendParam(url, p);
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
		delete o.params.ac;
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

指定contentType和设置自定义HTTP头(headers)示例:

	var opt = {
		contentType: "text/xml",
		headers: {
			Authorization: "Basic aaa:bbb"
		}
	};
	callSvr("hello", $.noop, "<?xml version='1.0' encoding='UTF-8'?><return><code>0</code></return>", opt);

想为ajax选项设置缺省值，可以用callSvrExt中的beforeSend回调函数，也可以用$.ajaxSetup，
但要注意：ajax的dataFilter/beforeSend选项由于框架已用，最好不要覆盖。

@see callSvrExt[].beforeSend(opt) 为callSvr选项设置缺省值

@return deferred对象，在Ajax调用成功后回调。
例如，

	var dfd = callSvr(ac, fn1);
	dfd.then(fn2);

	function fn1(data) {}
	function fn2(data) {}

在接口调用成功后，会依次回调fn1, fn2. 在回调函数中this表示ajax参数。例如：

	callSvr(ac, function (data) {
		// 可以取到传入的参数。
		console.log(this.key1);
	}, null, {key1: 'val1'});

(v5.4) 支持失败时回调：

	var dfd = callSvr(ac);
	dfd.fail(function (data) {
		console.log('error', data);
		console.log(this.ctx_.ret); // 和设置选项{noex:1}时回调中取MUI.lastError.ret 或 this.lastError相同。
	});

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
			// 只需要返回接口url即可，不必拼接param
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

在调用时，ac参数使用"{扩展名}:{调用名}"的格式：

	callSvr('zhanda:token/get-token', {user: 'test', password: 'test123'}, function (data) {
		console.log(data);
	});

旧的调用方式ac参数使用数组，现在已不建议使用：

	callSvr(['token/get-token', 'zhanda'], ...);

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
如果要修改callSvr缺省调用方法，可以改写 MUI.callSvrExt['default']。示例：

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

可以从opt.ctx_中取到{ac, ext, noex, dfd}等值（如opt.ctx_.ac），可以从opt.url中取到{ac, params}值。

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

## ES6支持：jQuery的$.Deferred兼容Promise接口 / 使用await

支持Promise/Deferred编程风格:

	var dfd = callSvr("...");
	dfd.then(function (data) {
		console.log(data);
	})
	.catch(function (err) {
		app_alert(err);
	})
	.finally(...)

支持catch/finally等Promise类接口。接口逻辑失败时，dfd.reject()触发fail/catch链。

支持await编程风格，上例可写为：

	// 使用await时callSvr调用失败是无法返回的，加{noex:1}选项可让失败时返回false
	var rv = callSvr("...", $.noop, null, {noex:1});
	if (rv === false) {
		// 失败逻辑 dfd.catch. 取错误信息用WUI.lastError={ac, tm, tv, ret}
		console.log(WUI.lastError.ret)
	}
	else {
		// 成功逻辑 dfd.then
	}
	// finally逻辑

示例：

	let rv = await callSvr("Ordr.query", {res:"count(*) cnt", fmt:"one"})
	let cnt = rv.cnt

## 直接取json类文件

(v5.5) 如果ac是调用相对路径, 则直接当成最终路径, 不做url拼接处理:

	callSvr("./1.json"); // 如果是callSvr("1.json") 则实际url可能是 "../api.php/1.json"这样.
	callSvr("../1.php");

相当于调用

	$.ajax("../1.php", {dataType: "json", success: callback})
	或
	$.getJSON("../1.php", callback);

注意下面调用未指定dataType, 不会按筋斗云协议格式处理:

	$.ajax("../1.php", {success: callback})

@see $.ajax
*/
self.callSvr = callSvr;
self.callSvrExt = {};
function callSvr(ac, params, fn, postParams, userOptions)
{
	if ($.isFunction(params)) {
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
	if (userOptions && userOptions.noex)
		ctx.noex = 1;
	if (ext) {
		ctx.ext = ext;
	}
	ctx.dfd = $.Deferred();
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

	// 自动判断是否用json格式
	if (opt.contentType == null && opt.data) {
		var useJson = $.isArray(opt.data);
		if (!useJson && $.isPlainObject(opt.data)) {
			$.each(opt.data, function (i, e) {
				if (typeof(e) == "object") {
					useJson = true;
					return false;
				}
			})
		}
		if (useJson) {
			opt.contentType = "application/json";
		}
	}

	console.log(callType + ": " + opt.type + " " + ac0);
	if (ctx.isMock)
		return callSvrMock(opt, isSyncCall);

	// post json content
	var isJson = opt.contentType && opt.contentType.indexOf("/json")>0;
	if (isJson && opt.data instanceof Object)
		opt.data = JSON.stringify(opt.data);

	if (opt.data && opt.processData !== false && opt.url.indexOf("?xp=") > 0) {
		if (typeof(opt.data) === "string") {
			// 猜一下。最好还是应用明确指定
			if (opt.contentType == null) {
				var pos;
				if (opt.data[0] == '{' || opt.data[0] == '[') {
					opt.contentType = "application/json";
				}
				else if ((pos=opt.data.indexOf('=')>0) && pos<100) { // 变量名不超过100B (像`a[b][3]=1`这种就比较长)
					opt.contentType = "application/x-www-form-urlencoded";
				}
				else {
					opt.contentType = "text/plain";
				}
			}
			opt.data = self.base64Encode(opt.data, true);
		}
		else {
			opt.data = self.base64Encode(JSON.stringify(opt.data), true);
			opt.contentType = "application/json";
		}
		opt.contentType += ";xparam=1";
	}
	$.ajax(opt);
	// dfd.resolve/reject is done in defDataProc
	return ctx.dfd;
}

// opt = {success, .ctx_={isMock, getMockData, dfd} }
function callSvrMock(opt, isSyncCall)
{
	var dfd_ = opt.ctx_.dfd;
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
		if (rv !== RV_ABORT)
		{
			opt_.success && opt_.success(rv);
//			dfd_.resolve(rv); // defDataProc resolve it
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
	if ($.isFunction(params)) {
		userOptions = postParams;
		postParams = fn;
		fn = params;
		params = null;
	}
	userOptions = $.extend({async: false}, userOptions);
	var dfd = callSvr(ac, params, function (data) {
		ret = data;
		fn && fn.call(this, data);
	}, postParams, userOptions);
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
		if (rv === RV_ABORT)
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


	MUI.useBatchCall();
	callSvr("..."); // 这个返回值的结果将用于以下调用
	callSvr("Ordr.query", {
		res: "id,dscr",
		status: "{$-1.status}",  // 整体替换，结果可以是一个对象
		cond: "id>{$-1.id}" // 部分替换，其结果只能是字符串
	}, api_OrdrQuery, {
		ref: ["status", "cond"] // 须在ref中指定需要处理的key
	});

特别地，当get/post整个是一个字符串时，直接整体替换，无须在ref中指定，如：

	callSvr("Ordr.add", $.noop, "{$-1}", {contentType:"application/json"});

以下为引用格式示例：

	{$1} // 第1次调用的结果。
	{$-1} // 前1次调用的结果。
	{$-1.path} // 取前一次调用结果的path属性
	{$1[0]} // 取第1次调用结果（是个数组）的第0个值。
	{$1[0].amount}
	{$-1.price * $-1.qty} // 可以做简单的数值计算

如果值计算失败，则当作"null"填充。

综合示例：

	MUI.useBatchCall();
	callSvr("Ordr.completeItem", $.noop, {itemId:1})
	callSvr("Ordr.completeItem", $.noop, {itemId:2, qty:2})
	callSvr("Ordr.calc", $.noop, {items:["{$1}", "{$2}"]}, {contentType:"application/json", ref:["items"] });
	callSvr("Ordr.add", $.noop, "{$3}", {contentType:"application/json"});

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
				if (data1 !== RV_ABORT) {
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

/**
@fn isBatchMode()

是否批量操作模式（即是否按住Ctrl键操作）。
*/
self.isBatchMode = function () {
	return m_batchMode;
}

self.toggleBatchMode = toggleBatchMode;
function toggleBatchMode(val) {
	if (val !== undefined)
		m_batchMode = val;
	else
		m_batchMode = !m_batchMode;
	app_alert(T("批量模式") + ": " + (m_batchMode?"ON":"OFF"));
	// 标题栏显示红色. 在style.css中设置#my-tabMain.batchMode.
	self.tabMain.toggleClass("batchMode", m_batchMode);

	// 允许点击多选
	var opt = WUI.getActivePage().find(".datagrid-f").datagrid("options");
	opt.ctrlSelect = !m_batchMode;
	$.fn.datagrid.defaults.singleSelect = false;
	$.fn.datagrid.defaults.ctrlSelect = !m_batchMode;
}

mCommon.assert($.fn.combobox, "require jquery-easyui lib.");

/**
@fn getRow(jtbl) -> row

用于列表中选择一行来操作，返回该行数据。如果未选则报错，返回null。

	var row = WUI.getRow(jtbl);
	if (row == null)
		return;

 */
self.getRow = getRow;
function getRow(jtbl, silent)
{
	var row = jtbl.datagrid('getSelected');
	if (! row && ! silent)
	{
		self.app_alert(T("请先选择一行。"), "w");
		return null;
	}
	return row;
}

/**
@fn isTreegrid(jtbl)

判断是treegrid还是datagrid。
示例：

	var datagrid = WUI.isTreegrid(jtbl)? "treegrid": "datagrid";
	var opt = jtbl[datagrid]("options");

 */
self.isTreegrid = isTreegrid;
function isTreegrid(jtbl)
{
	var d;
	if (jtbl == null || jtbl.size() == 0 || (d=jtbl.data()) == null)
		return false;
	return !! d.treegrid;
}

/** 
@fn reload(jtbl, url?, queryParams?, doAppendFilter?) 

刷新数据表，或用指定查询条件重新查询。

url和queryParams都可以指定查询条件，url通过makeUrl指定查询参数，它是基础查询一般不改变；
queryParams在查询对话框做查询时会被替换、或是点Ctrl-刷新时会被清除；如果doAppendFilter为true时会叠加之前的查询条件。
在明细对话框上三击字段标题可查询，按住Ctrl后三击则是追加查询模式。
*/
self.reload = reload;
function reload(jtbl, url, queryParams, doAppendFilter)
{
	var datagrid = isTreegrid(jtbl)? "treegrid": "datagrid";
	if (url != null || queryParams != null) {
		var opt = jtbl[datagrid]("options");
		if (url != null) {
			opt.url = url;
		}
		if (queryParams != null) {
			opt.queryParams = doAppendFilter? self.extendQueryParam(opt.queryParams, queryParams): queryParams;
		}
	}

	// 如果当前页面不是table所在页，则先切换到所在页
	if (jtbl.is(":hidden")) {
		var opage = mCommon.getAncestor(jtbl[0], istab);
		if (opage && opage.title)
			$(opage).closest(".easyui-tabs").tabs("select", opage.title);
	}

	resetPageNumber(jtbl);
	jtbl[datagrid]('reload');
	jtbl[datagrid]('clearSelections');
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
	if (!data)
		data = [];
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

/*
jdListToDgList处理后的数据格式：

	{total:10, rows:[
		{id:1, name, fatherId: null},
		{id:2, name, fatherId: 1},
		...
	]}

为适合treegrid显示，应为子结点添加_parentId字段：

	{total:10, rows:[
		{id:1, ...}
		{id:2, ..., _parentId:1},
		...
	]}

easyui-treegrid会将其再转成层次结构：

	{total:10, rows:[
		{id:1, ..., children: [
			{id:2, ...},
		]}
		...
	]}

特别地，为了查询结果能正常显示（排除展开结点操作的查询，其它查询的树表是残缺不全的），当发现数据有fatherId但父结点不在列表中时，不去设置_parentId，避免该行无法显示。
*/
function jdListToTree(data, idField, fatherField, parentId, isLeaf)
{
	var data1 = jdListToDgList(data)

	var idMap = {};
	$.each(data1.rows, function (i, e) {
		idMap[e[idField]] = true;
	});
	$.each(data1.rows, function (i, e) {
		var fatherId = e[fatherField];
		// parentId存在表示异步查询子结点, 应设置_parentId字段.
		if (fatherId && (idMap[fatherId] || parentId)) {
			e._parentId = fatherId;
		}
		if (isLeaf && !isLeaf(e)) {
			e.state = 'closed'; // 如果无结点, 则其展开时将触发ajax查询子结点
		}
	})
	return data1;
}

/** 
@fn reloadRow(jtbl, rowData?)

@param rowData 通过原始数据指定行，可通过WUI.getRow(jtbl)获取当前所选择的行数据。

rowData如果未指定，则使用当前选择的行。

示例：

	var row = WUI.getRow(jtbl);
	if (row == null)
		return;
	...
	WUI.reloadRow(jtbl, row);

如果要刷新整个表，可用WUI.reload(jtbl)。
刷新整个页面可用WUI.reloadPage()，但一般只用于调试，不用于生产环境。

返回Deferred对象，表示加载完成。
 */
self.reloadRow = reloadRow;
function reloadRow(jtbl, rowData)
{
	var datagrid = isTreegrid(jtbl)? "treegrid": "datagrid";
	if (rowData == null) {
		rowData = jtbl[datagrid]('getSelected');
		if (rowData == null)
			return;
	}
	jtbl[datagrid]("loading");
	var opt = jtbl[datagrid]("options");
	return self.callSvr(opt.url, api_queryOne, {cond: "id=" + rowData.id});

	function api_queryOne(data) 
	{
		jtbl[datagrid]("loaded");
		var idx = jtbl[datagrid]("getRowIndex", rowData);
		var objArr = jdListToArray(data);
		if (datagrid == "treegrid") {
			$.extend(rowData, objArr[0]);
			var fatherId = rowData[opt.fatherField]; // "fatherId"
			var id = rowData[opt.idField];
			if (rowData["_parentId"] && rowData["_parentId"] != fatherId) {
				rowData["_parentId"] = fatherId;
				jtbl.treegrid("remove", id);
				jtbl.treegrid("append", {
					parent: rowData["_parentId"],
					data: [rowData]
				});
			}
			else {
				jtbl.treegrid("update", {id: id, row: rowData});
			}
			return;
		}
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
	var datagrid = isTreegrid(jtbl)? "treegrid": "datagrid";
	jtbl[datagrid]("loading");
	var opt = jtbl[datagrid]("options");
	self.callSvr(opt.url, api_queryOne, {cond: "id=" + id});

	function api_queryOne(data)
	{
		jtbl[datagrid]("loaded");
		var objArr = jdListToArray(data);
		if (objArr.length != 1)
			return;
		var row = objArr[0];
		if (datagrid == "treegrid") {
			if (jtbl.treegrid('getData').length == 0) { // bugfix: 加第一行时，使用loadData以删除“没有数据”这行
				jtbl.treegrid('loadData', [row]);
				return;
			}
			var fatherId = row[opt.fatherField];
			jtbl.treegrid('append',{
				parent: fatherId,
				data: [row]
			});
			return;
		}
		if (opt.sortOrder == "desc")
			jtbl.datagrid("insertRow", {index:0, row: row});
		else
			jtbl.datagrid("appendRow", row);
	}
}

function tabid(title)
{
	return "pg_" + title.replace(/[ ()\[\]\/\\,<>.!@#$%^&*-+]+/g, "_");
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
	jo.jdata().init = true;

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
		console.log("### initfn: " + attr, jo.selector);
 		try {
			initfn.apply(jo, paramArr || []);
		} catch (ex) {
			console.error(ex);
			throw(ex);
		}
	}
}

function getModulePath(file)
{
	var url = self.options.moduleExt["showPage"](file);
	if (url)
		return url;
	return self.options.pageFolder + "/" + file;
}

/** 
@fn showPage(pageName, showPageOpt?={title, target, pageFilter}, paramArr?=[showPageOpt])

- pageName: 由page上的class指定。
- showPageOpt.title: 如果未指定，则使用page上的title属性. (v6.1) 如果有多语言翻译，此处title是未翻译过的开发语言。
- paramArr: 调用initfn时使用的参数，是一个数组。如果不指定，则调用initfn直接传入showPageOpt。推荐不指定该参数。
- force: (v6.1) 如果页面已存在，默认直接跳到该页面，指定`force: 1`会刷新该页面。

@alias showPage(pageName, title?, paramArr?)

新页面以title作为id。
注意：每个页面都是根据pages下相应pageName复制出来的，显示在一个新的tab页中。相同的title当作同一页面。
初始化函数由page上的my-initfn属性指定。

page定义示例: 

	<div id="my-pages" style="display:none">
		<div class="pageHome" title="首页" my-initfn="initPageHome"></div>
	</div>

page调用示例:

	WUI.showPage("pageHome");
	WUI.showPage("pageHome", "我的首页"); // 默认标题是"首页"，这里指定显示标题为"我的首页"。
	WUI.showPage("pageHome", {title: "我的首页"}); // 同上

(v5.4) 如果标题中含有"%s"，将替换成原始标题，同时传参到initPage:

	WUI.showPage("pageHome", {title: "%s-" + cityName, cityName: cityName}); //e.g. 显示 "首页-上海"

title用于唯一标识tab，即如果相同title的tab存在则直接切换过去。除非：
(v5.5) 如果标题以"!"结尾, 则每次都打开新的tab页，(v6.1)等价于指定选项`showPageOpt.force:1`:

	WUI.showPage("pageHome", "我的首页!");
	WUI.showPage("pageHome", {title: "我的首页", force:1}); // 同上

## showPageOpt.pageFilter: (v6) 指定列表页过滤条件(PAGE_FILTER)

示例

	var pageFilter = {cond: {status: "在职"}};
	WUI.showPage("pageEmployee", {title: "员工", pageFilter: pageFilter});

它直接影响页面中的datagrid的查询条件。

选项`_pageFilterOnly`用于影响datagrid查询只用page filter的条件。

	var pageFilter = { cond: {status: "在职"}, _pageFilterOnly: true };
	WUI.showPage("pageEmployee", {title: "员工", pageFilter: pageFilter});

注意：旧应用中通过paramArr[1]来指定pageFilter, 目前兼容该用法，但不推荐使用：

	WUI.showPage("pageEmployee", "员工", [null, pageFilter]); // 旧写法，不推荐使用
	// 等价于
	WUI.showPage("pageEmployee", {title: "员工", pageFilter: pageFilter});

## (v6) 返回deferred对象

showPage返回deferred/promise对象，表示页面加载完成。所以如果某些操作要依赖于页面完成，可以用：

	var dfd = WUI.showPage(...);
	dfd.then(fn);
	// fn中的操作需要依赖上面页面。

或

	await WUI.showPage();
	fn();

## showPageOpt.target: 指定显示在哪个tabs中

一般与系统页面pageTab合用，pageTab可显示一个或多个tabs，然后把新页面显示在指定tabs中。示例：

	await WUI.showPage("pageTab", {title: "员工!", tabs:"40%,60%"});
	WUI.showPage("pageEmployee", {title: "管理员", pageFilter:{cond: {perms:"~mgr"}}, target:"员工_1"});
	WUI.showPage("pageEmployee", {title: "非管理员", pageFilter:{cond: {perms:"!~mgr"}}, target:"员工_2"});

注意：下面两个页面target要依赖于pageTab页面，所以需要加await等待pageTab页面加载完成。

@see pageTab
*/
self.showPage = showPage;
function showPage(pageName, title_or_opt, paramArr)
{
	var showPageOpt = {pageName: pageName};
	if ($.isPlainObject(title_or_opt)) {
		$.extend(true, showPageOpt, title_or_opt);
	}
	else {
		showPageOpt.title = title_or_opt;
	}
	var title = showPageOpt.title;
	if (title && title.substr(-1, 1) == "!") {
		showPageOpt.force = true;
		showPageOpt.title = title.substr(0, title.length-1);
	}
	if (paramArr == null) {
		paramArr = [showPageOpt];
	}
	// 兼容旧应用，pageFilter=paramArr[1]; 新应用不应再使用
	else if (!showPageOpt.pageFilter && $.isArray(paramArr) && $.isPlainObject(paramArr[1])) {
		showPageOpt.pageFilter = paramArr[1];
	}

	var dfdShowPage = $.Deferred();
	var showPageArgs_ = [pageName, showPageOpt, paramArr];
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
			return dfdShowPage;
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
	return dfdShowPage;

	function initPage()
	{
		var title0 = jpage.attr("title") || "无标题";
		if (! showPageOpt.title)
			showPageOpt.title = title0;
		var title = showPageOpt.title;
		title = T(title).replace('%s', title0);

		var tt = showPageOpt.target? $("#"+showPageOpt.target): self.tabMain;
		if (tt.tabs('exists', title)) {
			if (!showPageOpt.force) {
				tt.tabs('select', title);
				dfdShowPage.resolve();
				return;
			}
			tt.tabs('close', title);
		}

		var id = tabid(title);
		var content = "<div id='" + id + "' title='" + title + "' style='height:100%'/>";
		var jtab = $(content);
		var closable = (pageName != self.options.pageHome);

		tt.tabs('add',{
	// 		id: id,
			title: title,
			closable: closable,
			fit: true,
			content: jtab
		});

		var jpageNew = jpage.clone().appendTo(jtab);
		jpageNew.addClass('wui-page');
		jpageNew.attr("wui-pageName", pageName);
		jpageNew.attr("title", title);

		var dep = self.evalAttr(jpageNew, "wui-deferred");
		if (dep) {
			self.assert(dep.then, "*** wui-deferred attribute DOES NOT return a deferred object");
			dep.then(initPage1);
			return;
		}
		initPage1();

		function initPage1()
		{
			jpageNew.data("showPageArgs_", showPageArgs_); // used by WUI.reloadPage
			enhancePage(jpageNew);
			$.parser.parse(jpageNew); // easyui enhancement
			self.enhanceWithin(jpageNew);
			callInitfn(jpageNew, paramArr);

			jpageNew.trigger('pagecreate');
			jpageNew.trigger('pageshow');
			dfdShowPage.resolve();
		}
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

// (param?, ignoreQueryParam?=false)  param优先级最高，会返回新对象，不改变param 
function getDgFilter(jtbl, param, ignoreQueryParam)
{
	var p1, p2;
	var p3 = getPageFilter(jtbl.closest(".wui-page"));
	if (p3 && p3._pageFilterOnly) {
		p3 = $.extend(true, {}, p3); // 复制一份
		delete p3._pageFilterOnly;
	}
	else {
		var datagrid = isTreegrid(jtbl)? "treegrid": "datagrid";
		var dgOpt = jtbl[datagrid]("options");
		var p1 = dgOpt.url && dgOpt.url.params;
		if (p1)
			delete p1._app;
		var p2 = !ignoreQueryParam && dgOpt.queryParams;
	}
	return self.extendQueryParam({}, p1, p2, p3, param);
}

/**
@fn getPageFilter(jpage, name?)
@key PAGE_FILTER

取页面的过滤参数，由框架自动处理.
返回showPage原始过滤参数或null。注意不要修改它。

如果指定name，则取page filter中的该过滤字段的值。示例：假如page filter有以下4种：

	{ cond: { type: "A" }}
	{ cond: "type='A'"}
	{ cond: {type: "A OR B"} }
	{ cond: {type: "~A*"} }

则调用getPageFilter(jpage, "type")时，仅当第1种才返回"A"；
其它几种的cond值要么不是对象，要么不是相等条件，均返回null。

*/
self.getPageFilter = getPageFilter;
function getPageFilter(jpage, name)
{
	var showPageArgs = jpage.data("showPageArgs_");
	// showPage(0:pageName, 1:opt={pageName, title, pageFilter?}, 2:paramArr?);  e.g. WUI.showPage(pageName, {title: "title", pageFilter: {cond:cond}})
	if (showPageArgs && $.isPlainObject(showPageArgs[1].pageFilter)) {
		var ret = showPageArgs[1].pageFilter;
		if (name) {
			ret = $.isPlainObject(ret.cond)? ret.cond[name]: null;
			if (! isFixedField(ret))
				ret = null;
		}
		return ret;
	}
}

// 对于页面中只有一个datagrid的情况，铺满显示，且工具栏置顶。
function enhancePage(jpage)
{
	var o = jpage[0].firstElementChild;
	if (o && o.tagName == "TABLE" && jpage[0].children.length == 1) {
		if (o.style.height == "" || o.style.height == "auto")
			o.style.height = "100%";
	}
}

function enhanceDialog(jdlg)
{
	// tabs, datagrid宽度自适应, resize时自动调整
	jdlg.find(".easyui-tabs, .wui-subobj>table").each(function () {
		if (!this.style.width)
			this.style.width = "100%";
	});
	// 如果td直接下面的某项设置有required属性，则自动在该项标题td上加required类（标记"*"表示必填）
	jdlg.find("td>[required]").each(function () {
		$(this).parent().prev("td").addClass("required");
	});
}

/**
@fn saveDlg(jdlg, noCloseDlg=false)

对话框保存，相当于点击确定按钮。如果noCloseDlg=true，则不关闭对话框（即“应用”保存功能）。
 */
self.saveDlg = saveDlg;
self.noCloseDlg = false;
function saveDlg(jdlg, noCloseDlg)
{
	if (noCloseDlg) {
		self.noCloseDlg = true;
		setTimeout(function () {
			self.noCloseDlg = false;
		}, 2000); // 一般2s内保存完毕
	}
	// 点击确定按钮
	jdlg.next(".dialog-button").find("#btnOk").click();
}

/**
@fn closeDlg(jdlg) 
*/
self.closeDlg = closeDlg;
function closeDlg(jdlg)
{
	if (self.noCloseDlg)
		return;
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
			// NOTE: 部分组件(如jsoneditor)上修改值后，仅在失去焦点时方可取到值。
			$(e.target).blur().focus();
			fnOk();
			return false;
		}
		else if (e.keyCode == 27 && fnCancel) {
			fnCancel();
			return false;
		}
		// Ctrl-F: find mode
		else if ((e.ctrlKey||e.metaKey) && e.which == 70)
		{
			showObjDlg($(this), FormMode.forFind, $(this).data("objParam"));
			return false;
		}
		// Ctrl-D: duplicate
		else if ((e.ctrlKey||e.metaKey) && e.which == 68)
		{
			dupDlg($(this));
			return false;
		}
/* // Ctrl-A: add mode
		else if ((e.ctrlKey||e.metaKey) && e.which == 65)
		{
			showObjDlg($(this), FormMode.forAdd, null);
			return false;
		}
*/
	});
}

/**
@fn dupDlg(jdlg)

复制并添加对象。
对象对话框在更新模式下，按Ctrl-D或右键对话框空白处选择“再次新增”，可复制当前对象，进入添加模式。

支持对子表进行复制，注意仅当子表是允许添加的才会被复制（wui-subobj组件，且设置了valueField和dlg选项）。
TODO 由于子表支持懒加载，目前有个限制，如果子表尚未加载则无法复制；可手工点击tab页让它加载才能复制。

在对话框进入新增模式后，编号(id)会被清除，其它字段保留，
如果对话框编写过新增时的逻辑，比如自动填写或disable某些字段，这些逻辑会生效。

如果字段在新增时是disabled状态，比如“添加时间”等字段，尽管它仍显示为旧数据且无法修改，
但在添加时它并不会提交，所以没有影响。

如果要定制复制时的逻辑，可以使用下面事件：

@key event-duplicate(ev, data) 对话框上复制添加对象

如果要定制添加行为，可在对话框的duplicate事件中修改数据。示例：

	jdlg.on("duplicate", function (ev, data) {
		// 可修改data, 若有子表则是有相应的数组字段
		// 主表id，子表id及关联字段在这里可以访问，之后会被框架自动删除，此处无须处理
		console.log(data);
	});

 */
self.dupDlg = dupDlg;
function dupDlg(jdlg)
{
	var formMode = jdlg.jdata().mode;
	if (formMode != FormMode.forSet)
		return false;

	var data = $.extend(true, {}, jdlg.data("origin_"));
	jdlg.find(".wui-subobj").each(function () {
		var jsub = $(this);
		var subOpt = WUI.getOptions(jsub);
		var isLoaded = jsub.data("subobjLoaded_"); // TODO: 懒加载的subobj，如何取数据？
		// 有valueField和dlg属性的子表才能添加
		if (! (subOpt.valueField && subOpt.dlg && subOpt.dgCall && isLoaded && subOpt.relatedKey))
			return;

		// 典型主子表，设置有关联字段的可以复制。支持relatedKey类似如: 'invId'或'invId={id}'这种。
		var ms = subOpt.relatedKey.match(/^([^ =]+)/);
		if (! ms)
			return;
		var relatedKey = ms[1];

		var rows = subOpt.dgCall("getData").rows; // 就是jtbl.datagrid("getData")
		data[subOpt.valueField] = rows;

		setTimeout(function (ev) {
			var rows1 = data[subOpt.valueField];
			if (! $.isArray(rows1))
				return;
			rows1.forEach (function (e) {
				delete e.id;
				delete e[relatedKey];
			});
			subOpt.dgCall("loadData", rows);
		}, 50);
	});

	// 可插入自定义逻辑
	jdlg.trigger("duplicate", [data]);
	delete data.id;

	WUI.showObjDlg(jdlg, FormMode.forAdd, {
		data: data
	});
}

/**
@fn isSmallScreen

判断是否为手机小屏显示. 宽度低于640当作小屏处理.
*/
self.isSmallScreen = isSmallScreen;
function isSmallScreen() {
	return $(document.body).width() < 640;
}
if (isSmallScreen()) {
	$('<meta name="viewport" content="width=device-width, initial-scale=0.8, maximum-scale=0.8">').appendTo(document.head);
}

/**
@fn showDlg(jdlg, opt?)

@param jdlg 可以是jquery对象，也可以是selector字符串或DOM对象，比如 "#dlgOrder".
注意：当对话框动态从外部加载时，jdlg=$("#dlgOrder") 一开始会为空数组，这时也可以调用该函数，且调用后jdlg会被修改为实际加载的对话框对象。

@param opt?={url, buttons, noCancel=false, okLabel="确定", cancelLabel="取消", modal=true, reset=true, validate=true, data, onOk, onSubmit, title}

- opt.url: String. 点击确定后，提交到后台的URL。如果设置则自动提交数据，否则应在opt.onOk回调或validate事件中手动提交。
- opt.buttons: Object数组。用于添加“确定”、“取消”按钮以外的其它按钮，如`[{text: '下一步', iconCls:'icon-ok', handler: btnNext_click}]`。
 用opt.okLabel/cancelLabel可修改“确定”、“取消”按钮的名字，用opt.noCancel=true可不要“取消”按钮。
- opt.modal: Boolean.模态对话框，这时不可操作对话框外其它部分，如登录框等。设置为false改为非模态对话框。
- opt.data: Object. 自动加载的数据, 将自动填充到对话框上带name属性的DOM上。(v6.0) 与opt.forSet一起使用时，在修改对象时，仅当与opt.data有差异的数据才会传到服务端。
- opt.reset: Boolean. 显示对话框前先清空。默认为true.
- opt.validate: Boolean. 是否提交前用easyui-form组件验证数据。内部使用。
- opt.onSubmit: Function(data) 自动提交前回调。用于验证或补齐提交数据，返回false可取消提交。opt.url为空时不回调。
- opt.onOk: Function(data?) 如果自动提交(opt.url非空)，则服务端接口返回数据后回调，data为返回数据。如果是手动提交，则点确定按钮时回调，没有data参数。
	(v6.0) 如果onOk设置为'close'，则显示操作成功并关闭对话框。
- opt.title: String. 如果指定，则更新对话框标题。
- opt.dialogOpt: 底层jquery-easyui dialog选项。参考http://www.jeasyui.net/plugins/159.html
- opt.reload: (v5.5) 先重置再加载。只用于开发环境，方便在Chrome控制台中调试。
- opt.meta: (v6) 指定通过meta自动生成的输入项
- opt.metaParent: (v6) 指定meta自动生成项的父结点，默认为对话框下第一个table，仅当meta存在时有效
- opt.forSet: (v6.0) 与opt.data一起使用，设置为true表示只提交修改的数据。
- opt.onShow: (v6.0) Function(formMode, data) 显示时回调

如果是对象对话框（showObjDlg）调用过来，会自动带上以下选项：

- opt.mode: formMode
- opt.jtbl: 绑定的数据表(可能为空)

## 对话框加载

示例1：静态加载（在web/store.html中的my-pages中定义），通过对话框的id属性标识。

	<div id="my-pages" style="display:none">
		<div id="dlgLogin" title="商户登录">  
			...
		</div>
	<div>

加载：`WUI.showDlg($("#dlgLogin"))`。对话框顶层DOM用div或form都可以。用form更简单些。
除了少数内置对话框，一般不建议这样用，而是建议从外部文件动态加载（模块化）。

示例2：从内部模板动态加载，模板id须为"tpl_{对话框id}"，对话框上不用指定id

	<script type="text/template" id="tpl_dlgLogin">
		<div title="商户登录">  
			...
		</div>
	</script>

加载：`WUI.showDlg($("#dlgLogin"))`或`WUI.showDlg("#dlgLogin")`。
比示例1要好些，但一般也不建议这样用。目前是webcc编译优化机制使用该技术做发布前常用对话框的合并压缩。

示例3：从外部模板动态加载，模板是个文件如web/page/dlgLogin.html，对话框上不用指定id

	<div title="商户登录">  
		...
	</div>

加载：`WUI.showDlg($("#dlgLogin"))`或`WUI.showDlg("#dlgLogin")`。
这是目前使用对话框的主要方式。

示例4：不用HTML，直接JS中创建DOM：

	var jdlg = $('<div title="商户登录">Hello World</div>');
	WUI.showDlg(jdlg);

适合编程动态实现的对话框。参考使用更简单的WUI.showDlgByMeta或WUI.showDlg的meta选项。

## 对话框编程模式

对话框有两种编程模式，一是通过opt参数在启动对话框时设置属性及回调函数(如onOk)，另一种是在dialog初始化函数中处理事件(如validate事件)实现逻辑，有利于独立模块化。

对话框显示时会触发以下事件：

	事件beforeshow
	事件show
	opt.onShow(formMode, data)

对于自动提交数据的对话框(设置了opt.url)，提交数据过程中回调函数及事件执行顺序为：

	事件validate; // 提交前，用于验证或设置提交数据。返回false或ev.preventDefault()可取消提交，中止以下代码执行。
	opt.onSubmit(jdlg, data); // 提交前，验证或设置提交数据，返回false将阻止提交。
	... 框架通过callSvr自动提交数据，如添加、更新对象等。
	opt.onOk(data); // 提交且服务端返回数据后。data是服务端返回数据。
	事件retdata; // 与onOk类似。

对于手动提交数据的对话框(opt.url为空)，执行顺序为：

	事件validate; // 用于验证、设置提交数据、提交数据。
	opt.onOk(); // 同上. 回调函数中this为jdlg.

注意：

- onOk/onShow/onSubmit等回调中this对象为当前对话框jdlg.
- 参数opt可在beforeshow事件中设置，这样便于在对话框模块中自行设置选项，包括okLabel, onOk回调等等。
- 旧版本中的回调 opt.onAfterSubmit() 回调已删除，请用opt.onOk()替代。

调用此函数后，对话框将加上以下CSS Class:
@key .wui-dialog 标识WUI对话框的类名。

示例：显示一个对话框，点击确定后调用后端接口。

	WUI.showDlg("#dlgCopyTo", {
		modal: false, 
		reset: false,
		url: WUI.makeUrl("Category.copyTo", {cond: ...}),
		onSubmit: ..., // 提交前验证，返回False则取消提交
		onOk: function (retdata) {
			var jdlgCopyTo = this; // this是当前对话框名
			// 自动提交后处理返回数据retdata
		}
	});

- 在对话框HTML中以带name属性的输入框作为参数，如`用户名:<input name="uname">`.
- 默认为模态框(只能操作当前对话框，不能操作页面中其它组件)，指定modal:false使它成为非模态；
- 默认每次打开都清空数据，指定reset:false使输入框保留初值或上次填写内容。
- 设置了url属性，点击确定自动提交时相当于调用`callSvr(url, 回调onOk(retdata), POST内容为WUI.getFormData(dlg))`。

如果不使用url选项，也可实现如下：

	WUI.showDlg("#dlgCopyTo", {
		modal: false, 
		reset: false,
		onOk: function () {
			var jdlgCopyTo = this; // this是当前对话框名
			var data = WUI.getFormData(jdlgCopyTo);
			callSvr("Category.copyTo", {cond: ...}, function (retdata) { ... }, data);
		}
	});

如果要做更多的初始化配置，比如处理对话框事件，则使用初始化函数机制，即在对话框DOM上设置`my-initfn`属性：

	<div title="复制到" my-initfn="initDlgCopyTo"> ... </div>

初始化函数示例：

	function initDlgCopyTo()
	{
		var jdlg = $(this);

		jdlg.on("beforeshow", onBeforeShow)
			.on("validate", onValidate);

		function onBeforeShow(ev, formMode, opt) {
		}
		function onValidate(ev, mode, oriData, newData) {
		}
	}

## 对象型对话框与formMode

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

## 对话框事件

操作对话框时会发出以下事件供回调：

	create - 对话框创建（在my-initfn执行后）
	beforeshow - 对话框显示前。常用来处理对话框显示参数opt或初始数据opt.data.
	show - 显示对话框后。常用来设置字段值或样式，隐藏字段、初始化子表datagrid或隐藏子表列等。
	validate - 用于提交前验证、补齐数据等。返回false可取消提交。(v5.2) 支持其中有异步操作.
	retdata - 服务端返回结果时触发。用来根据服务器返回数据继续处理，如再次调用接口。

注意：

- 旧版本中的initdata, loaddata, savedata将废弃，应分别改用beforeshow, show, validate事件替代，注意事件参数及检查对话框模式。

@key event-create(ev)
对话框初始化函数执行后触发。

@key event-beforeshow(ev, formMode, opt)
显示对话框前触发。

- opt参数即showDlg的opt参数，可在此处修改，例如修改opt.title可以设置对话框标题。
- opt.objParam参数是由showObjDlg传入给dialog的参数，比如opt.objParam.obj, opt.objParam.formMode等。
- 通过修改opt.data可为字段设置缺省值。注意forFind模式下opt.data为空。
- 可以通过在beforeshow中用setTimeout延迟执行某些动作，这与在show事件中回调操作效果基本一样。
- (v6) 设置opt.cancel=true可取消显示对话框.

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

@see example-dialog-event 在对话框中使用事件

## reset控制

对话框上有name属性的组件在显示对话框时会自动清除（除非设置opt.reset=false或组件设置有noReset属性）。

@key .my-reset 标识在显示对话框时应清除
对于没有name属性（不与数据关联）的组件，可加该CSS类标识要求清除。
例如，想在forSet模式下添加显示内容, 而在forFind/forAdd模式下时清除内容这样的需求。

	<div class="my-reset">...</div>

@key [noReset]
某些字段希望设置后一直保留，不要被清空，可以设置noReset属性，例如：

	<input type="hidden" name="status" value="PA" noReset>

## 控制底层jquery-easyui对话框

wui-dialog可以使用底层easyui-dialog/easyui-window/easyui-panel的选项或方法，参考：

- easyui-dialog: https://www.jeasyui.net/plugins/181.html
- easyui-window: https://www.jeasyui.net/plugins/180.html
- easyui-pandel: https://www.jeasyui.net/plugins/159.html

示例：打开时最大化，关闭对话框时回调事件：

	var dialogOpt = {  
		maximized: true,
		onClose:function(){
			console.log("close");
		}  
	};

	jfrm.on("beforeshow",function(ev, formMode, opt) {
		opt.dialogOpt = dialogOpt;
	})

(v6) 除了直接指定opt.dialogOpt，还可以直接通过data-options来设置，示例：
不显示折叠、最大化按钮，自定义类名"loginPanel"

	<div id="dlgLogin" title="登录" data-options="cls:'loginPanel',collapsible:false,maximizable:false" style="width:350px;height:210px;">  
	...
	</div>

## 复用dialog模板

(v5.3引入，v6修改) 该机制可用于自定义表(UDT, 对话框动态生成)。

如 dlgUDT_inst_A 与 dlgUDT_inst_B 会共用dlgUDT对话框模板，只要用"_inst_"分隔对话框模板文件和后缀名。

	WUI.showDlg("dlgUDT_inst_A"); // 自动加载page/dlgUDT.html文件

若涉及重用其它模块中的页面或对话框，请参考 WUI.options.moduleExt

## 动态生成字段的对话框

(v6) 该机制可用于为已有对话框动态追加字段（比如用于用户自定义字段UDF)，或是只用纯JS而不用html来创建对话框。

示例：为对话框dlgReportCond追加两个输入字段。

	var itemArr = [
		// title, dom, hint?
		{title: "状态", dom: '<select name="status" class="my-combobox" data-options="jdEnumMap:OrderStatusMap"></select>'},
		{title: "订单号", dom: "<textarea name='param' rows=5></textarea>", hint: '每行一个订单号'}
	];
	WUI.showDlg("#dlgReportCond", {
		meta: itemArr,
		onOk: function (data) {
			console.log(data)
		},
		// metaParent: "table:first" // 也可指定插入点父结点
	});

通过指定opt.meta动态生成字段，这些字段默认放置于对话框中的第一个table下。
一般详情对话框DOM模型均为"<form><table></table></form>"。

注意由于对话框有id，只会创建一次。之后再调用也不会再创建。如果希望能创建多的对话框互不影响，可以用"#dlgReportCond_inst_A"这种方式指定是用它的一个实例。

示例2：动态创建一个登录对话框

	var jdlg = $('<form title="商户登录"><table></table></form>');
	var meta = [
		{title: "用户名", dom: '<input name="uname" class="easyui-validatebox" required>', hint: "字母开头或11位手机号"},
		{title: "密码", dom: '<input type="password" name="pwd" class="easyui-validatebox" required>'}
	];
	WUI.showDlg(jdlg, {
		meta: meta,
		onOk: function (data) {
			console.log(data); // 根据meta中每个带name项的输入框生成：{uname, pwd}
			callSvr("login", function () {
				app_show("登录成功");
				WUI.closeDlg(jdlg);
			}, data);
		}
	});

可以没有title/dom，只用hint用于逻辑说明，示例:

	var meta = [
		{hint:'查询<code>工单实际开工日期</code>在指定日期区间的所有受EC到影响的工件'},
		{title: "序列号", dom: '<input name="code">'},
		...
	];
	WUI.showDlg("#dlgReportCond", {
		meta: meta,
		onOk: function (data) { ... }
	});

@see showDlgByMeta
@see showObjDlg
*/
self.showDlg = showDlg;
function showDlg(jdlg, opt) 
{
	if (jdlg.constructor != jQuery)
		jdlg = $(jdlg);

	if (opt && opt.reload) {
		opt = $.extend({}, opt);
		delete opt.reload;
		if (jdlg.size() > 0) {
			unloadDialog(jdlg);
			if (! jdlg.attr("id"))
				return;
			jdlg = $("#" + jdlg.attr("id"));
		}
	}
	if (loadDialog(jdlg, onLoad, opt))
		return;
	function onLoad() {
		jdlg.trigger('create');
		showDlg(jdlg, opt);
	}

	var formMode = opt && opt.mode;
	opt = $.extend({
		okLabel: "确定",
		cancelLabel: "取消",
		noCancel: false,
		modal: opt && opt.noCancel,
		reset: true,
		validate: true,
		forSet: (formMode == FormMode.forSet),
		data: {}
	}, opt);

	jdlg.addClass('wui-dialog');
	callInitfn(jdlg, [opt]);

	if (opt.fixedFields)
		$.extend(opt.data, opt.fixedFields);

	// TODO: 事件换成jdlg触发，不用jfrm。目前旧应用仍使用jfrm监听事件，暂应保持兼容。
	var jfrm = jdlg.is("form")? jdlg: jdlg.find("form:first");
	jfrm.trigger("beforeshow", [formMode, opt]);
	if (opt.cancel)
		return;

	var btns = [{id: "btnOk", text: opt.okLabel, iconCls:'icon-ok', handler: fnOk}];
	if (! opt.noCancel) 
		btns.push({id: "btnCancel", text: opt.cancelLabel, iconCls:'icon-cancel', handler: fnCancel})
	if ($.isArray(opt.buttons))
		btns.unshift.apply(btns, opt.buttons);

	var small = self.isSmallScreen();
	var dlgOpt = $.extend({
//		minimizable: true,
		maximizable: !small,
		collapsible: !small,
		resizable: !small,

		// reset default pos.
		left: null,
		top: null,

		closable: ! opt.noCancel,
		modal: opt.modal,
		buttons: btns,
		title: opt.title
	}, opt.dialogOpt, WUI.getOptions(jdlg));
	if (jdlg.is(":visible")) {
		dlgOpt0 = jdlg.dialog("options");
		$.extend(dlgOpt, {
			left: dlgOpt0.left,
			top: dlgOpt0.top
		});
	}
	// 禁用阴影，避开自适应高度时显示问题
	var h = jdlg[0].style.height;
	if (h == "" || h == "auto") {
		dlgOpt.shadow = false;
	}

	jdlg.dialog(dlgOpt);
	var perm = jdlg.attr("wui-perm") || jdlg.dialog("options").title;
	jdlg.toggleClass("wui-readonly", (opt.objParam && opt.objParam.readonly) || !self.canDo(perm, "对话框") || (formMode==FormMode.forSet && !self.canDo(perm, "修改")) );

	jdlg.okCancel(fnOk, opt.noCancel? undefined: fnCancel);

	if (opt.reset)
	{
		mCommon.setFormData(jdlg); // reset
		// !!! NOTE: form.reset does not reset hidden items, which causes data is not cleared for find mode !!!
		// jdlg.find("[type=hidden]:not([noReset])").val(""); // setFormData可将hidden清除。
		jdlg.find(".my-reset").empty();
	}
	if (opt.data && opt.reset)
	{
		jfrm.trigger("initdata", [opt.data, formMode]); // TODO: remove. 用beforeshow替代。
		//jfrm.form("load", opt.data);
		mCommon.setFormData(jdlg, opt.data, {setOrigin: opt.forSet});
		jfrm.trigger("loaddata", [opt.data, formMode]); // TODO: remove。用show替代。
// 		// load for jquery-easyui combobox
// 		// NOTE: depend on jeasyui implementation. for ver 1.4.2.
// 		jfrm.find("[comboname]").each (function (i, e) {
// 			$(e).combobox('setValue', opt.data[$(e).attr("comboname")]);
// 		});
	}

	// 含有固定值的对话框，根据opt.fixedFields[fieldName]填充值并设置只读.
	setFixedFields(jdlg, opt);

// 	openDlg(jdlg);
	focusDlg(jdlg);
	jfrm.trigger("show", [formMode, opt.data]);

	opt.onShow && opt.onShow.call(jdlg, formMode, opt.data);

	function fnCancel() {closeDlg(jdlg)}
	function fnOk()
	{
		if (jdlg.hasClass("wui-readonly") && formMode!=FormMode.forFind) { // css("pointer-events") == "none"
			closeDlg(jdlg);
			return;
		}

		var ret = true;
		if (opt.validate) {
			// 隐藏的组件不验证
			var jo = jfrm.find(".validatebox-text:hidden").filter(function () {
				var ji = $(this);
				return ji.css("display") == "none" || ji.closest("tr,.wui-field").css("display") == "none";
			});
			jo.validatebox("disableValidation");
			ret = jfrm.form("validate");
			jo.validatebox("enableValidation");
		}
		if (! ret) {
			var ji = jfrm.find(".validatebox-invalid:first");
			var vb = ji.data("validatebox");
			if (vb && vb.message && ji.is(":hidden,[readonly],:disabled")) {
				// 可能隐藏在某Tab页中，应切换过去，避免点确定按钮无反应
				var it = ji.gn();
				var code = "验证失败: <br><span style='color:red'>字段\"" + it.getTitle() + "\": " + vb.message + '</span>';
				app_alert(code, "w", function () {
					it.setFocus();
				});
			}
			return false;
		}

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

			var data = formMode != FormMode.forFind? mCommon.getFormData(jdlg): getFindData(jdlg);
			$.extend(data, newData);

/*
			// 新的验证接口，不支持异步
			var ev = $.Event("validate2");
			jfrm.trigger(ev, [formMode, data]);
			if (ev.isDefaultPrevented())
				return false;
*/
			if (opt.url) {
				// 没有更新时直接关闭对话框
				if (opt.forSet) {
					if ($.isEmptyObject(data)) {
						closeDlg(jdlg);
						return false;
					}
				}
				if (opt.onSubmit && opt.onSubmit.call(jdlg, data) === false)
					return false;

				var m = opt.url.action.match(/\.(add|set|del)$/);
				if (m) {
					var cmd = {add: "新增", set: "修改", del: "删除"}[m[1]];
					if (!self.canDo(perm, cmd)) {
						app_alert("无权限操作! 本操作需要权限：" + perm + "." + cmd, "w");
						throw "abort";
					}
				}
				// 批量更新
				if (formMode==FormMode.forSet && opt.url.action && /.set$/.test(opt.url.action)) {
					if ($.isEmptyObject(data)) {
						app_alert("没有需要更新的内容。");
						return;
					}
					var jtbl = jdlg.jdata().jtbl;
					var obj = opt.url.action.replace(".set", "");
					var rv = batchOp(obj, obj+".setIf", jtbl, {
						acName: "更新",
						data: data, 
						offline: opt.offline,
						onBatchDone: function () {
							// TODO: onCrud();
							closeDlg(jdlg);
						}
					});
					if (rv !== false)
						return;
				}
				self.callSvr(opt.url, function (retData) {
					success(data, retData);
				}, data);
			}
			else {
				success(data, data);
			}
			// opt.onAfterSubmit && opt.onAfterSubmit(jfrm); // REMOVED
		}

		function success (reqData, retData)
		{
			if (opt.data) // 更新对话框的原始数据
				$.extend(opt.data, reqData);
			if (opt.onOk) {
				jfrm.trigger('retdata', [retData, formMode]);
				if (opt.onOk === 'close') {
					app_show(T("操作成功!"));
					WUI.closeDlg(jdlg);
				}
				else {
					opt.onOk.call(jdlg, retData);
				}
			}
		}
	}
}

/**
@fn showDlgByMeta(meta, opt)

WUI.showDlg的简化版本，通过直接指定组件创建对话框。返回动态创建的jdlg。

- meta: [{title, dom, hint?}]
- opt: 同showDlg的参数

示例：

	var meta = [
		// title, dom, hint?
		{title: "接口名", dom: "<input name='ac' required>", hint: "示例: Ordr.query"},
		{title: "参数", dom: "<textarea name='param' rows=5></textarea>", hint: '示例: {cond: {createTm: ">2020-1-1"}, res: "count(*) cnt", gres: "status"}'}
	];
	WUI.showDlgByMeta(meta, {
		title: "通用查询",
		modal: false,
		onOk: function (data) {
			app_alert(JSON.stringify(data));
		}
	});

@see showDlg 参考opt.meta选项
 */
self.showDlgByMeta = showDlgByMeta;
function showDlgByMeta(itemArr, opt)
{
	var jdlg = $("<form><table></table></form>");
	if (! opt)
		opt = {};
	opt.meta = itemArr;
	self.showDlg(jdlg, opt);
	return jdlg;
}

/* 外部可扩展UDF
var myUdf = {
	prototype: WUI.UDF,
	onGetMeta(obj) {
		... 
	},
	addFieldByMeta: function (jdlg, jtbl, meta) {
		if (...) {
		}
		this.prototype.addFieldByMeta(meta);
	}
}
WUI.UDF = myUDF;
 */
self.UDF = {
	onGetMeta: function (obj) {
	},
	addFieldByMeta: addFieldByMeta,
	addColByMeta: function (columns) {
	}
};

function addFieldByMeta(jdlg, jp, itemArr)
{
	var code = '';
	for (var i=0; i<itemArr.length; ++i) {
		var item = itemArr[i];
		var hint = '';
		if (item.hint)
			hint = "<p class=\"hint\">" + item.hint + "</p>";
		code += "<tr><td>" + (item.title||'') + "</td><td>" + (item.dom||'') + hint + "</td></tr>";
	}
	if (code) {
		$(code).appendTo(jp);
		$.parser.parse(jp); // easyui enhancement
		self.enhanceWithin(jp);
	}
}

// 按住Ctrl/Command键进入批量模式。
var tmrBatch_;
$(document).keydown(function (e) {
	if (e.ctrlKey || e.metaKey) {
		m_batchMode = true;
		clearTimeout(tmrBatch_);
		tmrBatch_ = setTimeout(function () {
			m_batchMode = false;
			tmrBatch_ = null;
		},500);
	}
});
$(window).keyup(function (e) {
	if (e.ctrlKey || e.metaKey) {
		m_batchMode = false;
		clearTimeout(tmrBatch_);
	}
});

/**
@fn batchOp(obj, ac, jtbl, opt={data, acName="操作", onBatchDone, batchOpMode=0, queryParam})

基于列表的批量处理逻辑：(v6支持基于查询条件的批量处理逻辑，见下面opt.queryParam)

对表格jtbl中的多选数据进行批量处理，先调用`$obj.query(cond)`接口查询符合条件的数据条数（cond条件根据jtbl上的过滤条件及当前多选项自动得到），弹出确认框(`opt.acName`可定制弹出信息)，
确认后调用`ac(cond)`接口对多选数据进行批量处理，处理完成后回调`opt.onBatchDone`，并刷新jtbl表格。

其行为与框架内置的批量更新、批量删除相同。

@param ac 对象接口名, 如"Task.setIf"/"Task.delIf"，也可以是函数接口，如"printSn"

@param opt.acName 操作名称, 如"更新"/"删除"/"打印"等, 一个动词. 用于拼接操作提示语句.

@param opt.data  调用支持批量的接口的POST参数

opt.data也可以是一个函数dataFn(batchCnt)，参数batchCnt为当前批量操作的记录数(必定大于0)。
该函数返回data或一个Deferred对象(该对象适时应调用dfd.resolve(data)做批量操作)。dataFn返回false表示不做后续处理。

@return 如果返回false，表示当前非批量操作模式，或参数不正确无法操作。

为支持批量操作，服务端须支持以下接口:

	// 对象obj的标准查询接口:
	$obj.query($queryParam, res:"count(*) cnt") -> {cnt}
	// 批量操作接口ac, 接受过滤查询条件(可通过$obj.query接口查询), 返回实际操作的数量.
	$ac($queryParam)($data) -> $cnt

其中obj, ac, data(即POST参数)由本函数参数传入(data也可以是个函数, 返回POST参数), queryParam根据表格jtbl的选择行或过滤条件自动生成.

基于列表的批量操作，完成时会自动刷新表格, 无须手工刷新. 在列表上支持以下批量操作方式:

1. 基于多选: 按Ctrl/Shift在表上选择多行，然后点操作按钮(如"删除"按钮, 更新时的"确定"按钮)，批量操作选中行；生成过滤条件形式是`{cond: "id IN (100,101)"}`, 

2. 基于表格当前过滤条件: 按住Ctrl键(进入批量操作模式)点操作按钮, 批量操作表格过滤条件下的所有行. 若无过滤条件, 自动以`{cond: "id>0"}`做为过滤条件.

3. 如果未按Ctrl键, 且当前未选行或是单选行, 函数返回false表示当前非批量处理模式，不予处理。

@param batchOpMode 定制批量操作行为, 比如是否需要按Ctrl激活批量模式, 未按Ctrl时如何处理未选行或单选行。

- batchOpMode未指定或为0时, 使用上面所述的默认批量操作方式.
- 如果值为1: 总是批量操作, 无须按Ctrl键, 无论选择了0行或1行, 都使用当前的过滤条件.
- 如果值为2: 按住Ctrl键时与默认行为相同; 没按Ctrl时, 若选了0行则报错, 若选了1行, 则按批量操作对这1行操作, 过滤条件形式是是`{cond:"id=100"}`

简单来说, 默认模式对单个记录不处理, 返回false留给调用者处理; 模式2是对单个记录也按批量处理; 模式1是无须按Ctrl键就批量处理.

## 示例1: 无须对话框填写额外信息的批量操作

工件列表页(pageSn)中，点"打印条码"按钮, 打印选中的1行或多行的标签, 如果未选则报错. 如果按住Ctrl点击, 则按表格过滤条件批量打印所有行的标签.

显然, 这是一个batchOpMode=2的操作模式, 调用后端`Sn.print`接口, 对一行或多行数据统一处理，在列表页pageSn.js中为操作按钮指定操作:

	// function initPageSn
	var btn1 = {text: "打印条码", iconCls:'icon-ok', handler: function () {
		WUI.batchOp("Sn", "printSn", jtbl, {
			acName: "打印", 
			batchOpMode: 2
		});
	}};

	jtbl.datagrid({
		...
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export", btn1),
	});

后端应实现接口`printSn(cond)`, 实现示例:

	function api_printSn() {
		// 通过query接口查询操作对象内容. 
		$param = array_merge($_GET, ["res"=>"code", "fmt"=>"array" ]);
		$arr = callSvcInt("Sn.query", $param);
		addLog($rv);
		foreach ($arr as $one) {
			// 处理每个对象
		}
		// 应返回操作数量
		return count($arr);
	}

@param opt.queryParam

(v6) 基于查询条件的批量处理，即指定opt.queryParam，这时jtbl参数传null，与表格操作无关，只根据指定条件查询数量和批量操作。
注意jtbl和opt.queryParam必须指定其一。参见下面示例4。

## 示例2：打开对话框，批量设置一些信息

在列表页上添加操作按钮，pageXXX.js:

	// 点按钮打开批量上传对话框
	var btn1 = {text: "批量设置", iconCls:'icon-add', handler: function () {
		WUI.showDlg("#dlgUpload", {modal:false, jtbl: jtbl}); // 注意：为对话框传入特别参数jtbl即列表的jQuery对象，在batchOp函数中要使用它。
	}};
	jtbl.datagrid({
		...
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export", btn1),
	});

对批量设置页面上调用接口，dlgUpload.js:

	var jtbl;
	jdlg.on("validate", onValidate)
		on("beforeshow", onBeforeShow);

	function onBeforeShow(ev, formMode, opt) {
		jtbl = opt.jtbl; // 记录传入的参数
	}
	function onValidate(ev, mode, oriData, newData) 
	{
		WUI.batchOp("Item", "batchSetItemPrice", jtbl, {
			batchOpMode: 1,  // 无须按Ctrl键, 一律当成批量操作
			data: WUI.getFormData(jfrm),
			onBatchDone: function () {
				WUI.closeDlg(jdlg);
			}
		});
	}

注意：对主表字段的设置都可在通用的详情对话框上解决（若要批量设置子表，也可通过在set/setIf接口里处理虚拟字段解决）。一般无须编写批量设置操作。

## 示例3：打开对话框，先上传文件再批量操作

在安装任务列表页上，点"批量上传"按钮, 打开上传文件对话框(dlgUpload), 选择上传并点击"确定"按钮后, 先上传文件, 再将返回的附件编号批量更新到行记录上.

先选择操作模式batchOpMode=1, 点确定按钮时总是批量处理.

与示例2不同，上传文件是个异步操作，可为参数data传入一个返回Deferred对象（简称dfd）的函数(onGetData)用于生成POST参数，
以支持异步上传文件操作，在dfd.resolve(data)之后才会执行真正的批量操作.

pageTask.js:

	// 点按钮打开批量上传对话框
	var btn2 = {text: "批量上传附件", iconCls:'icon-add', handler: function () {
		WUI.showDlg("#dlgUpload", {modal:false, jtbl: jtbl}); // 注意：为对话框传入特别参数jtbl即列表的jQuery对象，在batchOp函数中要使用它。
	}};

dlgUpload.js:

	var jtbl;
	jdlg.on("validate", onValidate)
		on("beforeshow", onBeforeShow);

	function onBeforeShow(ev, formMode, opt) {
		jtbl = opt.jtbl; // 记录传入的参数
	}
	function onValidate(ev, mode, oriData, newData) 
	{
		WUI.batchOp("Task", "Task.setIf", jtbl, {
			batchOpMode: 1,  // 无须按Ctrl键, 一律当成批量操作
			data: onGetData,
			onBatchDone: function () {
				WUI.closeDlg(jdlg);
			}
		});
	}

	// 一定batchCnt>0. 若batchCnt=0即没有操作数据时, 会报错结束, 不会回调该函数.
	function onGetData(batchCnt)
	{
		var dfd = $.Deferred();
		app_alert("批量上传附件到" + batchCnt + "行记录?", "q", function () {
			var dfd1 = triggerAsync(jdlg.find(".wui-upload"), "submit"); // 异步上传文件，返回Deferred对象
			dfd1.then(function () {
				var data = WUI.getFormData(jfrm);
				if ($.isEmptyObject(data)) {
					app_alert("没有需要更新的内容。");
					return false;
				}
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

## 示例4: 基于查询条件的批量操作

示例：在工单列表页，批量为工单中的所有工件打印跟踪码。

工单为Ordr对象，工件为Sn对象。注意：此时是操作Sn对象，而非当前Ordr对象，所以不传jtbl，而是直接传入查询条件.

	WUI.batchOp("Sn", "printSn", null, {
		acName: "打印", 
		queryParam: {cond: "orderId=80"},
		data: {tplId: 10}
	});

后端批量打印接口设计为：

	printSn(cond, tplId) -> cnt

上例中，查询操作数量时将调用接口`callSvr("Sn.query", {cond: "orderId=80", res: "count(*) cnt"})`，
在批量操作时调用接口`callSvr("printSn", {cond: "orderId=80"}, $.noop, {tplId: 10})`。
*/
self.batchOp = batchOp;
function batchOp(obj, ac, jtbl, opt)
{
	if (obj == null)
		return false;
	opt = $.extend({
		batchOpMode: 0,
		acName: "操作"
	}, opt);

	var acName = opt.acName;
	var queryParams = opt.queryParam;
	if (queryParams) {
		queryCnt();
		return;
	}

	if (jtbl == null) {
		console.warn("batchOp: require jtbl or opt.queryParam")
		return false;
	}

	var selArr =  jtbl.datagrid("getChecked");
	var batchOpMode = opt.batchOpMode;
	if (!batchOpMode && ! (m_batchMode || selArr.length > 1)) {
		return false;
	}
	if (batchOpMode === 2 && !m_batchMode && selArr.length == 0) {
		self.app_alert(T("请先选择一行。"), "w");
		return false;
	}

	var doBatchOnSel = selArr.length > 1 && (selArr[0].id != null || opt.offline);
	// batchOpMode=2时，未按Ctrl时选中一行也按批量操作
	if (!doBatchOnSel && batchOpMode === 2 && !m_batchMode && selArr.length == 1 && selArr[0].id != null)
		doBatchOnSel = true;

	// offline时批量删除单独处理
	if (opt.offline) {
		if (acName == "删除") {
			var totalCnt = jtbl.datagrid("getRows").length;
			if (doBatchOnSel && selArr.length < totalCnt) {
				$.each(selArr, function (i, row) {
					var idx = jtbl.datagrid("getRowIndex", row);
					jtbl.datagrid("deleteRow", idx)
				});
			}
			else {
				jtbl.datagrid("loadData", []);
			}
		}
		return;
	}

	// 多选，cond为`id IN (...)`
	if (doBatchOnSel) {
		if (selArr.length == 1) {
			queryParams = {cond: "id=" + selArr[0].id};
		}
		else {
			var idList = $.map(selArr, function (e) { return e.id}).join(',');
			queryParams = {cond: "id IN (" + idList + ")"};
		}
		confirmBatch(selArr.length);
	}
	else {
		queryParams = getDgFilter(jtbl);
		if (!queryParams.cond)
			queryParams.cond = "t0.id>0"; // 避免后台因无条件而报错
		queryCnt();
	}
	return;

	function queryCnt() {
		var param = $.extend({}, queryParams, {res: "count(*) cnt"});
		self.callSvr(obj + ".query", param, function (data1) {
			confirmBatch(data1.d[0][0]);
		});
	}
	
	function confirmBatch(batchCnt) {
		console.log(ac + ": " + JSON.stringify(queryParams));
		if (batchCnt == 0) {
			app_alert("没有记录需要操作。");
			return;
		}
		var data = opt.data;
		if (!$.isFunction(data)) {
			if (batchCnt > 1)
				acName = "批量" + acName;
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
		self.callSvr(ac, queryParams, function (cnt) {
			opt.onBatchDone && opt.onBatchDone();
			if (jtbl) {
				if (doBatchOnSel && selArr.length == 1) {
					reloadRow(jtbl, selArr[0]);
				}
				else {
					reload(jtbl);
				}
			}
			app_alert(acName + cnt + "条记录");
		}, data);
	}
}

function isFixedField(value) {
	if (value == null)
		return false;
	if (typeof(value) != "string")
		return true;
	return !/^([!<>=~]|IN|NOT IN)/i.test(value);
}

// 修改和返回fixedFields，如果fixedFields为空，可能返回null
function getFixedFields(jpage, fixedFields)
{
	if (! (jpage && jpage.size() > 0))
		return fixedFields;

	var filter = getPageFilter(jpage);
	if (filter && filter.cond) {
		handleCond(filter.cond);
	}
	return fixedFields;

	function handleCond(cond) {
		if (!cond)
			return;
		if ($.isArray(cond)) {
			$.each(cond, function (i, e) {
				handleCond(e);
			});
		}
		else if ($.isPlainObject(cond)) {
			$.each(cond, function (k, v) {
				if (isFixedField(v)) {
					if (fixedFields == null)
						fixedFields = {};
					fixedFields[k] = v;
				}
			});
		}
	}
}

/*
如果objParam中指定了值，则字段只读，并且在forAdd模式下填充值。
如果objParam中未指定值，则不限制该字段，可自由设置或修改。
*/
function setFixedFields(jfrm, beforeShowOpt) {
	var objParam = beforeShowOpt.objParam;
	var fixedFields = beforeShowOpt.fixedFields;
	if (jfrm[0].cleanFn) {
		$.each(jfrm[0].cleanFn, function (i, fn) {
			fn();
		});
		jfrm[0].cleanFn = null;
	}
	var cleanFn = [];
	var forFind = beforeShowOpt.mode == FormMode.forFind;
	self.formItems(jfrm, function (ji, name, it) {
		// 兼容旧的fixedFields设置方法. TODO: 未来将移除
		var fixedVal = (ji.hasClass("wui-fixedField") && objParam && objParam[name] != null)? objParam[name]: null;
		if (fixedVal == null) {
			fixedVal = (fixedFields && fixedFields[name] != null)? fixedFields[name]: null;
		}
		if (fixedVal != null) {
			var oldVal = it.getReadonly();
			it.setReadonly(true);
			if (forFind) { // 查询模式时不用向后端提交fixedFields字段的值，它们会由列表页自动处理。
				var oldVal2 = it.getDisabled();
				it.setDisabled(true);
			}
			it.setValue(fixedVal);
			// 下次进来时恢复状态
			cleanFn.push(function () {
				it.setReadonly(oldVal);
				if (forFind) {
					it.setDisabled(oldVal2);
				}
			});
		}
	});
	if (cleanFn.length > 0)
		jfrm[0].cleanFn = cleanFn;
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

@var g_data.doUpload
(v6.1) 为便于在reload页面时定制逻辑，在unload页面时会设置g_data.doUnload变量为true，可以页面pagedestory事件中检测处理，如：

	jpage.on("pagedestroy", onPageDestroy);
	function onPageDestroy() {
		if (g_data.doUnload) {
			console.log('!!! unload page');
		}
	}

meta页面（或二次开发的页面）支持在更新meta后，点“刷新页面”重新加载meta，就是使用此机制。
*/
self.unloadPage = unloadPage;
function unloadPage(pageName)
{
	g_data.doUnload = true;
	setTimeout(function () {
		g_data.doUnload = false;
	});
	if (pageName == null) {
		pageName = self.getActivePage().attr("wui-pageName");
		if (pageName == null)
			return;
		self.tabClose();
	}
	// 不要删除内部页面
	var sel = "."+pageName;
	var jo = $(sel);
	if (jo.attr("wui-pageFile") == null)
		return;
	
	// 关闭所有引用该页面的tab页
	var jtabs = WUI.tabMain.tabs("tabs");
	for (var i=jtabs.length-1; i>=0; --i) {
		if (jtabs[i].find(sel).size() > 0)
			WUI.tabClose(i);
	}
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
@fn unloadDialog(jdlg?)
@alias reloadDialog

删除指定对话框jdlg，如果不指定jdlg，则删除当前激活的对话框。一般用于开发过程，在修改外部对话框后，调用该函数清除以便此后再载入页面，可以看到更新的内容。

	WUI.reloadDialog(jdlg);
	WUI.reloadDialog();
	WUI.reloadDialog(true); // 重置所有外部加载的对话框(v5.1)

注意：

- 对于内部对话框调用本函数无意义。直接关闭对话框即可。
- 由于不知道打开对话框的参数，reloadDialog无法重新打开对话框，因而它的行为与unloadDialog一样。
*/
self.unloadDialog = unloadDialog;
self.reloadDialog = unloadDialog;
function unloadDialog(jdlg)
{
	if (jdlg == null) {
		jdlg = getTopDialog();
	}
	else if (jdlg === true) {
		jdlg = $(".wui-dialog[wui-pageFile]");
	}
	else if (jdlg.hasClass("wui-dialog")) {
	}
	else {
		console.error("WUI.unloadDialog: bad dialog spec", jdlg);
	}

	jdlg.each(function () {
		var jdlg = $(this);  // 故意覆盖原jdlg, 分别处理
		if (jdlg.size() == 0)
			return;
		if (jdlg.is(":visible")) {
			try { closeDlg(jdlg); } catch (ex) { console.log(ex); }
		}

		// 是内部对话框，不做删除处理
		if (jdlg.attr("wui-pageFile") == null)
			return;
		var dlgId = jdlg.attr("id");
		try { jdlg.dialog("destroy"); } catch (ex) { console.log(ex); }
		jdlg.remove();
		$("style[wui-origin=" + dlgId + "]").remove();
	});
}

/**
@fn canDo(topic, cmd=null, defaultVal=null, permSet2=null)

权限检查回调，支持以下场景：

1. 页面上的操作（按钮）

	canDo(页面标题, 按钮标题);// 返回false则不显示该按钮

2. 对话框上的操作

	canDo(对话框标题, "对话框"); // 返回false表示对话框只读
	canDo(对话框标题, 按钮标题); // 返回false则不显示该按钮

特别地：如果对话框或页面上有wui-readonly类，则额外优先用permSet2来检查：

	canDo(对话框, 按钮标题, null, {只读:true}); // 返回false则不显示该按钮

topic可理解为数据对象（页面、对话框对应的数据模型），cmd可理解为操作（增加、修改、删除、只读等，常常是工具栏按钮）。
通过permSet2参数可指定额外权限。

判断逻辑示例：canDo("工艺", "修改")

	如果指定有"工艺.修改"，则返回true，或指定有"工艺.不可修改"，则返回false；否则
	如果指定有"修改"，则返回true，或指定有"不可修改", 则返回 false; 否则
	如果指定有"工艺.只读" 或 "只读"，则返回false; 否则
	如果指定有"工艺"，则返回true，或指定有"不可工艺", 则返回 false; 否则返回默认值。

判断逻辑示例：canDo("工艺", null)

	如果指定有"工艺"，则返回true，或指定有"不可工艺", 则返回 false; 否则默认值

判断逻辑示例：canDo(null, "修改")

	如果指定有"修改"，则返回true，或指定有"不可修改", 则返回 false; 否则
	如果指定有"只读"，则返回false; 否则返回默认值。

默认值逻辑：

	如果指定了默认值defaultVal，则返回defaultVal，否则
	如果指定有"不可*"，则默认值为false，否则返回 true
	(注意：如果未指定"*"或"不可*"，最终是允许)

特别地，对于菜单显示来说，顶级菜单的默认值指定是false，所以如果未指定"*"或"不可*"则最终不显示；
而子菜单的默认值则是父菜单是否允许，不指定则默认与父菜单相同。

建议明确指定默认值，采用以下两种风格之一：

风格一：默认允许，再逐一排除

	* 不可删除 不可导出 不可修改

风格二：默认限制，再逐一允许

	不可* 工单管理

要限制菜单项的话，先指定"不可*"，再加允许的菜单项，这样如果页面中链接其它页面或对话框，则默认是无权限的。
否则链接对象默认是可编辑的，存在漏洞。

TODO:通过设置 WUI.options.canDo(topic, cmd) 可扩展定制权限。

默认情况下，所有菜单不显示，其它操作均允许。
如果指定了"*"权限，则显示所有菜单。
如果指定了"不可XX"权限，则topic或cmd匹配XX则不允许。

@key wui-perm

- topic: 通过菜单、页面、对话框、按钮的wui-perm属性指定（按钮参考dg_toolbar函数），如果未指定，则取其text.
- cmd: 对话框，新增，修改，删除，导出，自定义的按钮

示例：假设有菜单结构如下（不包含最高管理员专有的“系统设置”）

	主数据管理
		企业
		用户

	运营管理
		活动
		公告
		积分商城

只显示“公告”菜单项：

	公告

只显示“运营管理”菜单组：

	运营管理

显示除了“运营管理”外的所有内容：

	* 不可运营管理

其中`*`表示显示所有菜单项。
显示所有内容（与管理员权限相同），但只能查看不可操作

	* 只读

“只读”权限排除了“新增”、“修改”等操作。
特别地，“只读”权限也不允许“导出”操作（虽然导出是读操作，但一般要求较高权限），假如要允许导出公告，可以设置：

	* 只读 公告.导出

显示“运营管理”，在列表页中不显示“删除”、“导出”按钮：

	运营管理 不可删除 不可导出

显示“运营管理”，在列表页中，不显示“删除”、“导出”按钮，但“公告”中显示“删除”按钮：

	运营管理 不可删除 不可导出 公告.删除

或等价于：

	运营管理 不可导出 活动.不可删除 积分商城.不可删除

显示“运营管理”和“主数据管理”菜单组，但“主数据管理”下面内容均是只读的：

	运营管理 主数据管理 企业.只读 用户.只读

## 关于页面与对话框

假如在“活动”页面中链接了“用户”对话框（或“活动”页面上某操作按钮会打开“用户”页面），即使该角色只有“活动”权限而没有“用户”的权限，也能正常打开用户对话框或页面并修改用户。
这是一个潜在安全漏洞，在配置权限时应特别注意。

这样设计是因为用户权限主要是针对菜单项的，而且可以只指定到父级菜单（表示下面子菜单均可显示）；这样就导致对未指定的权限，也无法判断是否可用（因为可能是菜单子项），目前处理为默认可用（可通过权限`不可*`来指定默认不可用）。

以指定运营管理下所有功能为例，解决办法：

- 简单的处理方式是对于所有链接的内容，分别加入黑名单，如特别指定“不可用户”（或指定“用户.只读”），这时链接的对话框或页面将以只读模式打开（对话框不可设置，页面无操作按钮）。最终权限指定为`运营管理 不可用户`

- 还有一种拒绝优先+精确指定的处理方式，即先指定`不可*`，然后再精确指定该角色可用的所有权限（通常是列举所有子菜单项供打勾选择）。最终权限指定为`不可* 活动 公告 积分商城`。这时应注意：
如果菜单项、页面、对话框的权限名不相同的，则可能出现菜单项能显示，而页面和对话框显示为只读。这种情况应确保菜单、页面、对话框的权限名（标题名或设置菜单的wui-perm属性）应一致。
例如菜单项叫“活动管理”而对话框和页面名为“活动”，则可将菜单的wui-perm属性设置为“活动”。
还有种比较常见的情况是页面和对话框为多个对象共用的（如客户和供应商共用一个页面和对话框），也是确保菜单名、页面名、对话框一致，在处理时往往是以showPage将菜单名传到页面，从页面打开对话框时则以页面标题指定对话框标题。

 */
self.canDo = canDo;
function canDo(topic, cmd, defaultVal, permSet2)
{
//	console.log('canDo: ', topic, cmd);
	if (!g_data.permSet) // 现在不可能为空了，管理员的permSet是 {"*": true}
		return true;

	if (defaultVal == null)
		defaultVal = (checkPerm('*') !== false);
	if (cmd == null) {
		if (topic) {
			var rv = checkPerm(topic);
			if (rv !== undefined)
				return rv;
		}
		return defaultVal;
	}

	if (topic) {
		var rv = checkPerm(topic + "." + cmd);
		if (rv !== undefined)
			return rv;
	}

	rv = checkPerm(cmd);
	if (rv !== undefined)
		return rv;

	// 对“只读”特殊处理
	if (topic)
		rv = checkPerm(topic + ".只读");
	if (rv === undefined)
		rv = checkPerm("只读");
	if (rv && (cmd == "新增" || cmd == "修改" || cmd == "删除" || cmd == "导入" || cmd == "对话框")) {
		return false;
	}

	if (topic) {
		rv = checkPerm(topic);
		if (rv !== undefined)
			return rv;
	}
	
	return defaultVal;

	// 返回true, false, undefined三种
	function checkPerm(perm) {
		if (permSet2) {
			var rv = permSet2[perm];
			if (rv !== undefined)
				return rv;
		}
		return g_data.permSet[perm];
	}
}

// ---- object CRUD {{{
var BTN_TEXT = {A:"添加", S:"确定", F:"查询", D:"删除"};
// e.g. var text = BTN_TEXT[mode];

function getFindData(jfrm, doGetAll)
{
	var kvList = {};
	var kvList2 = {};
	self.formItems(jfrm, function (ji, name, it) {
		if ((!doGetAll && it.getDisabled()) || ji.hasClass("notForFind"))
			return;
		var v = it.getValue();
		if (v == null || v === "")
			return;
		if (ji.attr("wui-find-hint")) {
			name += "/" + ji.attr("wui-find-hint");
		}
		if (ji.hasClass("wui-notCond"))
			kvList2[name] = v;
		else
			kvList[name] = v;
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

opt: {meta, metaParent}
*/
function loadDialog(jdlg, onLoad, opt)
{
	// 判断dialog未被移除
	if (jdlg.size() > 0 && jdlg[0].parentElement != null && jdlg[0].parentElement.parentElement != null) {
		if (! jdlg.hasClass("wui-dialog")) {
			jdlg.addClass('wui-dialog');
			enhanceDialog(jdlg);
		}
		return;
	}
	opt = opt || {};
	// showDlg支持jdlg为新创建的jquery对象，这时selector为空
	if (!jdlg.selector) {
		jdlg.addClass('wui-dialog');
		var jcontainer = $("#my-pages");
		jdlg.appendTo(jcontainer);
		loadDialogTpl1();
		return true;
	}
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
	// 支持dialog复用，dlgId格式为"{模板id}_inst_{后缀名}"。如 dlgUDT_inst_A 与 dlgUDT_inst_B 共用dlgUDT对话框模板。
	var arr = dlgId.split("_inst_");
	var tplName = arr[0];
	var sel = "#tpl_" + tplName;
	var html = $(sel).html();
	if (html) {
		loadDialogTpl(html, dlgId, pageFile);
		return true;
	}

	var pageFile = getModulePath(tplName + ".html");
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

		var dep = self.evalAttr(jdlg, "wui-deferred");
		if (dep) {
			self.assert(dep.then, "*** wui-deferred attribute DOES NOT return a deferred object");
			dep.then(loadDialogTpl1);
			return;
		}
		loadDialogTpl1();
	}

	function loadDialogTpl1()
	{
		var baseObj = jdlg.attr("my-obj") || opt.obj;
		var meta = opt.meta || (baseObj && self.UDF.onGetMeta(baseObj));
		// 支持由meta动态生成输入字段
		if (meta) {
			var jp = jdlg.find(opt.metaParent || "table:first");
			// 通过wui-meta-parent类控制只加1次meta
			if (jp.size() > 0 && !jp.hasClass("wui-meta-parent")) {
				self.UDF.addFieldByMeta(jdlg, jp, meta);
				jp.addClass("wui-meta-parent");
			}
		}

		enhanceDialog(jdlg);
		$.parser.parse(jdlg); // easyui enhancement
		jdlg.find(">table:first, form>table:first").has(":input").addClass("wui-form-table");
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
			// bugfix: 第1次点击对象链接时(showObjDlg动态加载对话框), 如果出错(如id不存在), 系统报错但遮罩层未清, 导致无法继续操作.
			// 原因是, 在ajax回调中再调用*同步*ajax操作且失败(这时$.active=2), 在dataFilter中会$.active减1, 然后强制用app_abort退出, 导致$.active清0, 从而在leaveWaiting时无法hideLoading
			// 解决方案: 在ajax回调处理中, 为防止后面调用同步ajax出错, 使用setTimeout让第一个调用先结束.
			setTimeout(onLoad);
		}
	}
	return true;
}

/**
@fn doFind(jo, jtbl?, doAppendFilter?=false)

根据对话框中jo部分内容查询，结果显示到表格(jtbl)中。
jo一般为对话框内的form或td，也可以为dialog自身。
查询时，取jo内部带name属性的字段作为查询条件。如果有多个字段，则生成AND条件。

如果查询条件为空，则不做查询；但如果指定jtbl的话，则强制查询。

jtbl未指定时，自动取对话框关联的表格；如果未关联，则不做查询。
doAppendFilter=true时，表示追加过滤条件。

@see .wui-notCond 指定独立查询条件
 */
self.doFind = doFind;
function doFind(jo, jtbl, doAppendFilter)
{
	var force = (jtbl!=null);
	if (!jtbl) {
		var jdlg = jo.closest(".wui-dialog");
		if (jdlg.size() > 0)
			jtbl = jdlg.jdata().jtbl;
	}
	if (!jtbl || jtbl.size() == 0) {
		console.warn("doFind: no table");
		return;
	}

	var param = getFindData(jo, true);
	if (!force && $.isEmptyObject(param)) {
		console.warn("doFind: no param");
		return;
	}

	// 归并table上的cond条件. dgOpt.url是makeUrl生成的，保存了原始的params
	// 避免url和queryParams中同名cond条件被覆盖，因而用AND合并。
	// 注意：这些逻辑在dgLoader中处理。
	reload(jtbl, undefined, param, doAppendFilter); // 将设置dgOpt.queryParams
}

/**
@fn showObjDlg(jdlg, mode, opt?={jtbl, id, obj})

@param jdlg 可以是jquery对象，也可以是selector字符串或DOM对象，比如 "#dlgOrder". 注意：当对话框保存为单独模块时，jdlg=$("#dlgOrder") 一开始会为空数组，这时也可以调用该函数，且调用后jdlg会被修改为实际加载的对话框对象。

@param opt.id String. 对话框set模式(mode=FormMode.forSet)时可设置，表示从后端加载数据，set/del如缺省则从关联的opt.jtbl中取, add/find时不需要
@param opt.jtbl Datagrid. 指定对话框关联的列表(datagrid)，用于从列表中取值，或最终自动刷新列表。 -- 如果dlg对应多个tbl, 必须每次打开都设置
@param opt.obj String. (v5.1) 对象对话框的对象名，如果未指定，则从my-obj属性获取。通过该参数可动态指定对象名。
@param opt.offline Boolean. (v5.1) 不与后台交互。
@param opt.readonly String. (v5.5) 指定对话框只读。即设置wui-readonly类。

showObjDlg底层通过showDlg实现，(v5.5)showObjDlg的opt会合并到showDlg的opt参数中，同时showDlg的opt.objParam将保留showObjDlg的原始opt。在每次打开对话框时，可以从beforeshow回调事件参数中以opt.objParam方式取出.
以下代码帮助你理解这几个参数的关系：

	function showObjDlg(jdlg, mode, opt)
	{
		opt = $.extend({}, jdlg.objParam, opt);
		var showDlgOpt = $.extend({}, opt, {
			...
			objParam: opt
		});
		showDlg(jdlg, showDlgOpt);
	}
	jdlg.on("beforeshow", function (ev, formMode, opt) {
		// opt即是上述showDlgOpt
		// opt.objParam为showObjDlg的原始opt，或由jdlg.objParam传入
	});

@param opt.title String. (v5.1) 指定对话框标题。
@param opt.data Object. (v5.5) 为对话框指定初始数据，对话框中name属性匹配的控件会在beforeshow事件后且show事件前自动被赋值。
param opt.onOk Function(retData) (v6) 与showDlg的onOk参数一致。在提交数据后回调，参数为后端返回数据，比如add接口返回新对象的id。

注意：如果是forSet模式的对话框，即更新数据时，只有与原始数据不同的字段才会提交后端。

其它参数可参考showDlg函数的opt参数。

@key objParam 对象对话框的初始参数。

(v5.1)
此外，通过设置jdlg.objParam，具有和设置opt参数一样的功能，常在initPageXXX中使用，因为在page中不直接调用showObjDlg，无法直接传参数opt.
示例：

	var jdlg = $("#dlgSupplier");
	jdlg.objParam = {type: "C", obj: "Customer"};
	showObjDlg(jdlg, FormMode.forSet, {id:101});
	// 等价于 showObjDlg(jdlg, FormMode.forSet, {id:101, obj: "Customer", type: "C"});

在dialog的事件beforeshow(ev, formMode, opt)中，可以通过opt.objParam取出showObjDlg传入的所有参数opt。
(v5.3) 可在对象对话框的初始化函数中使用 initDlgXXX(opt)，注意：非对象对话框初始化函数的opt参数与此不同。

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
			var rows = jtbl.datagrid("getData").rows, amount = 0;
			$.each(rows, function(e) {
				amount += e.price * e.qty;
			})
			frm.amount.value = amount.toFixed(2);
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

(v6.1) 通过jdlg.prop('objParam')可取到对象对话框的参数。

@param opt.reloadRow() 可用于刷新本对话框关联的表格行数据

事件参考：
@see showDlg
*/
self.showObjDlg = showObjDlg;
function showObjDlg(jdlg, mode, opt)
{
	if (jdlg.constructor != jQuery)
		jdlg = $(jdlg);
	if (loadDialog(jdlg, onLoad, opt))
		return;
	function onLoad() {
		jdlg.trigger('create');
		showObjDlg(jdlg, mode, opt);
	}

	opt = $.extend({mode: mode}, jdlg.objParam, opt);
	jdlg.data("objParam", jdlg.objParam);
	callInitfn(jdlg, [opt]);
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
				var rv = batchOp(obj, obj+".delIf", jd.jtbl, {
					acName: "删除",
					onBatchDone: onCrud,
					offline: opt.offline
				});
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
//		if (jd.jtbl) 
//			jd.jtbl.datagrid("clearSelections");
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

		self.app_confirm(T("确定要删除一条记录?"), function (b) {
			if (! b)
				return;

			var ac = obj + ".del";
			self.callSvr(ac, {id: id}, function(data) {
				if (jd.jtbl)
					reload(jd.jtbl);
				self.app_show(T('删除成功!'));
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
		self.formItems(jfrm, function (je, name, it) {
			var jshow = it.getShowbox();
			var bak = je.jdata().bak = {
				disabled: it.getDisabled(),
				readonly: it.getReadonly(),
				title: jshow.prop("title"),
				type: null
			}
			if (je.hasClass("notForFind")) {
				it.setDisabled(true);
				jshow.css("backgroundColor", "");
			}
			else if (jshow.is("[type=hidden]")) {
			}
			else {
				jshow.addClass("wui-find-field")
					.prop("title", self.queryHint);
				it.setDisabled(false);
				it.setReadonly(false);
				var type = jshow.attr("type");
				if (type && ["number", "date", "time", "datetime"].indexOf(type) >= 0) {
					bak.type = type;
					jshow.attr("type", "text");
				}
			}
		});
		jfrm.form("disableValidation");
	}
	else if (jd.mode == FormMode.forFind && mode != FormMode.forFind) {
		self.formItems(jfrm, function (je, name, it) {
			var bak = je.jdata().bak;
			if (bak == null)
				return;
			var jshow = it.getShowbox();
			jshow.removeClass("wui-find-field")
			jshow.prop("title", bak.title);
			it.setDisabled(bak.disabled);
			it.setReadonly(bak.readonly);
			if (bak.type) {
				jshow.attr("type", bak.type);
			}
		});
		jfrm.form("enableValidation");
	}

	jd.mode = mode;

	// load data
	var load_data = {};
	if (mode == FormMode.forAdd) {
		// var init_data = jd.init_data || (jd2 && jd2.init_data);
		load_data = $.extend({}, opt.data);
		// 添加时尝试设置父结点
		if (jd.jtbl && isTreegrid(jd.jtbl) && (rowData=getRow(jd.jtbl, true))) {
			// 在展开的结点上点添加，默认添加子结点；否则添加兄弟结点
			if (rowData.state == "open") {
				load_data["fatherId"] = rowData.id;
				//load_data["level"] = rowData.level+1;
			}
			else {
				load_data["fatherId"] = rowData["fatherId"];
				//load_data["level"] = rowData["level"];
			}
		}
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
		if (opt.data) {
			setTimeout(function () {
				mCommon.setFormData(jdlg, opt.data, {setOnlyDefined: true});
			});
		}
	}
	// objParam.reloadRow()
	opt.reloadRow = function () {
		if (mode == FormMode.forSet && opt.jtbl && rowData)
			self.reloadRow(opt.jtbl, rowData);
	};

	// opt.fixedFields叠加上pageFilter.cond中的有效字段，并复制到opt.data中。
	var jpage = opt.jtbl? opt.jtbl.closest(".wui-page"): null;
	opt.fixedFields = getFixedFields(jpage, opt.fixedFields);
	if (opt.fixedFields && (mode == FormMode.forAdd || mode == FormMode.forFind)) {
		$.extend(load_data, opt.fixedFields);
	}

	var jchkClose = null;

	// open the dialog
	var showDlgOpt = $.extend({}, opt, {
		url: url,
		okLabel: BTN_TEXT[mode],
		validate: mode!=FormMode.forFind,
		modal: false,  // mode == FormMode.forAdd || mode == FormMode.forSet
		reset: doReset,
		data: load_data,
//		onSubmit: onSubmit,
		onOk: onOk,
		objParam: opt,
		onShow: onShow
	});
	jdlg.prop('objParam', opt);
	showDlg(jdlg, showDlgOpt);

	if (mode == FormMode.forSet)
		jfrm.form("validate");

	function onShow(formMode, data) {
		opt.onShow && opt.onShow.call(this, formMode, data);
		var jbtns = jdlg.next(".dialog-button");
		jchkClose = jbtns.find(".chkClose");
		if (jchkClose.size() == 0) {
			var jo = $("<label style='float:left'><input type='checkbox' class='chkClose'> " + T("确定后关闭") + "</label>").prependTo(jbtns);
			jchkClose = jo.find(".chkClose");

			if (formMode == FormMode.forAdd) {
				var val = jdlg.data("closeAfterAdd");
				if (val || self.options.closeAfterAdd)
					jchkClose.prop("checked", true);
			}
			else if (formMode == FormMode.forFind) {
				var val = jdlg.data("closeAfterFind");
				if (val || self.options.closeAfterFind)
					jchkClose.prop("checked", true);
			}
			else if (formMode == FormMode.forSet) {
				jchkClose.prop("checked", true);
			}
			jchkClose.click(function () {
				var val = jchkClose.prop("checked");
				if (formMode == FormMode.forAdd) {
					jdlg.data("closeAfterAdd", val);
				}
				else if (formMode == FormMode.forFind) {
					jdlg.data("closeAfterFind", val);
				}
			});
		}
	}

	function onOk (retData) {
		opt.onOk && opt.onOk.call(this, retData);
		var jtbl = jd.jtbl;
		mCommon.assert(jchkClose.size() > 0);
		var doClose = jchkClose.prop("checked");
		if (mode==FormMode.forFind) {
			mCommon.assert(jtbl); // 查询结果显示到jtbl中
			//doFind(jfrm, jtbl);
			reload(jtbl, undefined, retData);
			// onCrud();
			if (doClose)
				closeDlg(jdlg);
			return;
		}
		// add/set/link
		// TODO: add option to force reload all (for set/add)
		var dfdSet = null;
		if (jtbl) {
			if (opt.offline) {
				var retData_vf = self.getFormData_vf(jfrm);
				retData = $.extend(retData_vf, retData);
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
					dfdSet = reloadRow(jtbl, rowData);
				else if (mode == FormMode.forAdd) {
					appendRow(jtbl, retData);
				}
				else
					reload(jtbl);
			}
		}
		if (doClose) {
			closeDlg(jdlg);
		}
		else if (mode == FormMode.forAdd) {
			showObjDlg(jdlg, mode); // reset and add another
		}
		else if (mode == FormMode.forSet) {
			if (dfdSet) {
				dfdSet.then(function () {
					showObjDlg(jdlg, mode, opt);
				});
			}
			else {
				setTimeout(function () {
					showObjDlg(jdlg, mode, opt);
				});
			}
		}
		if (!opt.offline)
			self.app_show(T('操作成功!'));
		onCrud();
	}

	function onCrud() {
		if (self.isBusy) {
			$(document).one("idle", onCrud);
			return;
		}
		if (obj && !opt.offline) {
			console.log("refresh: " + obj);
			$(".my-combobox,.wui-combogrid").trigger("markRefresh", obj);
		}
		opt.onCrud && opt.onCrud();
	}
}

/**
@fn dg_toolbar(jtbl, jdlg, button_lists...)

@param jdlg 可以是对话框的jquery对象，或selector如"#dlgOrder".

设置easyui-datagrid上toolbar上的按钮。缺省支持的按钮有r(refresh), f(find), a(add), s(set), d(del), 可通过以下设置方式修改：

	// jtbl.jdata().toolbar 缺省值为 "rfasd"
	jtbl.jdata().toolbar = "rfs"; // 没有a-添加,d-删除.
	// (v5.5) toolbar也可以是数组, 如 ["r", "f", "s", "export"]; 空串或空数组表示没有按钮.

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
导入可以用"import", 快速查询可以用"qsearch" (这两个以扩展方式在jdcloud-wui-ext.js中定义):

	var dgOpt = {
		...
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "import", "export", "-", btn1, btn2, "qsearch"),
	}

@see toolbar-qsearch 模糊查询

如果想自行定义导出行为参数，可以参考WUI.getExportHandler
@see getExportHandler 导出按钮设置

按钮的权限（即是否显示）取决于wui-perm和text属性。优先使用wui-perm。系统内置的常用的有："新增", "修改", "删除", "导出"
下面例子，把“导入”特别设置为内置的权限“新增”，这样不仅不必在角色管理中设置，且设置了“只读”等权限也可自动隐藏它。

	var btnImport = {text: "导入", "wui-perm": "新增", iconCls:'icon-ok', handler: function () {
		DlgImport.show({obj: "Ordr"}, function () {
			WUI.reload(jtbl);
		});
	}};

支持定义扩展，比如importOrdr:

	// ctx = {jtbl, jp, jdlg} // jp是jpage或jdlg，为上一层容器。jdlg是表格关联的对话框，
	// 注意jdlg在调用时可能尚未初始化，可以访问 jdlg.selector和jdlg.objParam等。
	dg_toolbar.importOrdr = function (ctx) {
		return {text: "导入", "wui-perm": "新增", iconCls:'icon-ok', handler: function () {
			DlgImport.show({obj: "Ordr"}, function () {
				WUI.reload(jtbl);
			});
		}}
	};

这时就可以直接这样来指定导入按钮（便于全局重用）：

	WUI.dg_toolbar(jtbl, jdlg, ..., "importOrdr")

@key event-dg_toolbar(ev, jtbl, jdlg) 定制列表按钮事件

示例：为订单列表增加一个“关联商品”按钮

	$(document).on("dg_toolbar", ".wui-page.pageOrder", pageOrder_onToolbar);
	// 用于二次开发，更成熟的写法像这样: UiMeta.on("dg_toolbar", "售后工单", function (ev, buttons, jtbl, jdlg) { ... })
	function pageOrder_onToolbar(ev, buttons, jtbl, jdlg) {
		// var jpage = $(ev.target);
		// console.log(jpage);
		var btnLinkToItem = {text: "关联商品", iconCls: "icon-redo", handler: function () {
			var row = WUI.getRow(jtbl);
			if (row == null)
				return;
			var pageFilter = { cond: {id: row.itemId} };
			PageUi.show("商品", "关联商品-订单"+row.id, pageFilter);
		}};
		buttons.push(btnLinkToItem);
	}

@key example-setToolbarMenu 动态修改数据表上的工具栏菜单状态

在dg_toolbar事件中，如果想指定datagrid选项，比如要实现需求：
单击一行时，自动根据当前行状态，设置菜单项是否disabled（比如非CR状态时，“删除”菜单不可点击）:

	jtbl.prop("datagridOpt", {
		onClickRow: function (rowIndex, rowData) {
			var val = (rowData.status == 'CR');
			WUI.setToolbarMenu(jtbl, {删除: val});
			// 因为框架可能扩展过datagrid一些功能，加上这句比较稳妥
			$.fn.datagrid.defaults.onClickRow(rowIndex, rowData);
		}
	});

@see setToolbarMenu
@key datagridOpt 二次开发中datagrid选项设置
*/
self.dg_toolbar = dg_toolbar;
function dg_toolbar(jtbl, jdlg)
{
	var toolbar = null;
	if (jtbl == null) {
		toolbar = "";
	}
	else {
		toolbar = jtbl.jdata().toolbar;
		if (toolbar == null)
			toolbar = "rfasd";
		jtbl.jdata().toolbar = ""; // 避免再调用时按钮添加重复
	}
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

	var btnSpecArr = $.isArray(toolbar)? $.extend([], toolbar): toolbar.split("");
	for (var i=2; i<arguments.length; ++i) {
		btnSpecArr.push(arguments[i]);
	}

	// 页面或对话框上的button
	var permSet2 = null;
	if (jtbl) {
		var jp = jtbl.closest(".wui-page");
		if (jp.size() == 0)
			jp = jtbl.closest(".wui-dialog");
		var perm = jp.attr("wui-perm") || jp.attr("title");
		if (!perm && jp.hasClass("wui-dialog")) {
			var tmp = jp.dialog("options");
			if (tmp)
				perm = tmp.title;
		}
		jp.trigger("dg_toolbar", [btnSpecArr, jtbl, jdlg]);
		permSet2 = (jtbl.jdata().readonly || jp.hasClass("wui-readonly"))? {"只读": true}: null;
	}
	var ctx = {jp: jp, jtbl: jtbl, jdlg: jdlg};
	for (var i=0; i<btnSpecArr.length; ++i) {
		var btn = btnSpecArr[i];
		if (! btn)
			continue;
		if (btn !== '-' && typeof(btn) == "string") {
			var btnfn = dg_toolbar[btn];
			mCommon.assert(btnfn, "toolbar button `" + btn + "` does not support");
			btn = btnfn(ctx);
		}
		else if ($.isArray(btn) && typeof(btn[0]) == "string") {
			var btnfn = dg_toolbar[btn[0]];
			mCommon.assert(btnfn, "toolbar button `" + btn[0] + "` does not support");
			btn = btnfn(ctx, btn[1]);
		}
		if (btn.text != "-" && perm && !self.canDo(perm, btn["wui-perm"] || btn.text, null, permSet2)) {
			continue;
		}
		btns.push(btn);
	}

	if (btns.length == 0)
		return null;
	return btns;
}

/**
@fn setToolbarMenu(jtbl, enableMap)

设置数据表工具栏上的菜单项，禁用或启用：

	WUI.setToolbarMenu(jtbl, {删除: false, 导出: true}); // 菜单项“删除”（即菜单标题）显示为禁用，“导出”显示为可用。

也可以通过回调函数(或lambda)操作该菜单项：

	WUI.setToolbarMenu(jtbl, {
		删除: ji => ji.linkbutton("disable"), // 禁用，等同于设置false
		导出: ji => ji.linkbutton("enable"), // 启用，等同于设置true
		// 导入: ji => ji.toggle(true)
		导入: function (ji) {
			var show = ...;
			ji.toggle(Show); // 显示或隐藏
		}
	});
 */
self.setToolbarMenu = setToolbarMenu;
function setToolbarMenu(jtbl, enableMap)
{
	jtbl.datagrid("getPanel").find(".datagrid-toolbar .l-btn .l-btn-text").each(function (i, o) {
		var val = enableMap[o.innerText];
		if (val !== undefined) {
			if ($.isFunction(val)) {
				val($(o).closest('.l-btn'));
			}
			else {
				$(o).closest('.l-btn').linkbutton(val? 'enable': 'disable');
			}
		}
	});
}

$.extend(dg_toolbar, {
	r: function (ctx) {
		return {text:'刷新', iconCls:'icon-reload', handler: function() {
			reload(ctx.jtbl, null, m_batchMode?{}:null);
		}} // Ctrl-点击，清空查询条件后查询。
	},
	f: function (ctx) {
		// 支持用户自定义查询。class是扩展属性，参考 EXT_LINK_BUTTON
		return {text:'查询', class: 'splitbutton', iconCls:'icon-search', handler: function () {
			showObjDlg(ctx.jdlg, FormMode.forFind, {jtbl: ctx.jtbl});
		}, menu: self.createFindMenu(ctx.jtbl) }
	},
	a: function (ctx) {
		return {text:'新增', iconCls:'icon-add', handler: function () {
			showObjDlg(ctx.jdlg, FormMode.forAdd, {jtbl: ctx.jtbl});
		}}
	},
	s: function (ctx) {
		return {text:'修改', iconCls:'icon-edit', handler: function () {
			showObjDlg(ctx.jdlg, FormMode.forSet, {jtbl: ctx.jtbl});
		}}
	},
	d: function (ctx) {
		return {text:'删除', iconCls:'icon-remove', handler: function () {
			showObjDlg(ctx.jdlg, FormMode.forDel, {jtbl: ctx.jtbl});
		}}
	},
	'export': function (ctx) {
		return {text: '导出', class: 'splitbutton', iconCls: 'icon-save', handler: getExportHandler(ctx.jtbl),
			menu: createExportMenu(ctx.jtbl)
		}
	}
});

function createExportMenu(jtbl)
{
	var jmenu = $('<div>' + 
		'<div data-options="id:\'csv\'">逗号分隔(csv)</div>' + 
		'<div data-options="id:\'txt\'">TAB分隔(txt)</div>' + 
		'<div data-options="id:\'html\'">网页(html)</div>' + 
		//'<div data-options="id:\'outfile\'">原始数据(outfile)</div>' + 
		'</div>');

	jmenu.menu({
		onClick: function (item) {
			console.log(item);
			var handler = getExportHandler(jtbl, null, {fmt: item.id});
			handler();
		}
	})
	return jmenu;
}

/**
@fn dg_dblclick(jtbl, jdlg)

@param jdlg 可以是对话框的jquery对象，或selector如"#dlgOrder".

设置双击datagrid行的回调，功能是打开相应的dialog
*/
self.dg_dblclick = function (jtbl, jdlg)
{
	return function (idx, data) {
//		jtbl.datagrid("selectRow", idx);
		showObjDlg(jdlg, FormMode.forSet, {jtbl: jtbl});
	}
}

//}}}

/**
@key a[href=#page]

页面中的a[href]字段会被框架特殊处理：

	<a href="#pageHome">首页</a>
	<a href="http://baidu.com">百度</a>

- href="#pageXXX"开头的，点击时会调用 WUI.showPage("#pageXXX");
*/
self.m_enhanceFn["a[href]"] = enhanceAnchor;
//self.m_enhanceFn["a[href^='#']"] = enhanceAnchor;
function enhanceAnchor(jo)
{
	if (jo.attr("onclick"))
		return;
	if (jo.attr("target"))
		return;

	var title = jo.text();
//	console.log(title);
	jo.click(function (ev) {
		var href = $(this).attr("href");
		if (href.search(/^#(page\w+)$/) >= 0) {
			var pageName = RegExp.$1;
			WUI.showPage.call(this, pageName);
			return false;
		}
/*
		// href="?fn"，会直接调用函数 fn(); 函数中this对象为当前DOM对象
		else if (href.search(/^\?(\w+)$/) >= 0) {
			var fn = RegExp.$1;
			fn = eval(fn);
			if (fn)
				fn.call(this);
			return false;
		}
*/
		if (href.match(/^https?:\/\//)) {
			WUI.showPage("pageIframe", title, [href]);
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

会根据datagrid当前设置，自动为query接口添加res(输出字段), cond(查询条件), fname(导出文件名), orderby(排序条件)参数。

若是已有url，希望从datagrid获取cond, fname等参数，而不要覆盖res参数，可以这样做：

	var url = WUI.makeUrl("PdiRecord.query", ...); // makeUrl生成的url具有params属性，为原始查询参数
	var btnExport = {text:'导出', iconCls:'icon-save', handler: WUI.getExportHandler(jtbl, null, {res: url.params.res || null}) };

@see getQueryParamFromTable 获取datagrid的当前查询参数
*/
self.getExportHandler = getExportHandler;
function getExportHandler(jtbl, ac, param)
{
	param = $.extend({}, {
		fmt: "excel",
		pagesz: -1
	}, param);

	return function () {
		if (ac == null) {
			if (jtbl.size() == 0 || !jtbl.hasClass("datagrid-f"))
				throw "error: bad datagrid: \"" + jtbl.selector + "\"";
			var datagrid = isTreegrid(jtbl)? "treegrid": "datagrid";
			ac = jtbl[datagrid]("options").url;
			if (ac == null) {
				app_alert("该数据表不支持导出", "w");
				return;
			}
		}
		var p1 = getQueryParamFromTable(jtbl, param);
		// dont export gres fields. 仅当未指定res时自动设置。
		if (p1.gres && !(param && param.res))
			p1.gresHidden = 1;
		var debugShow = false;
		if (m_batchMode) {
			var fmt = prompt("输入导出格式: excel csv txt excelcsv html outfile(无导出条数限制), 以!结尾为调试输出", p1.fmt);
			if (!fmt)
				return;
			if (fmt.substr(-1) == "!") {
				fmt = fmt.substr(0, fmt.length-1);
				debugShow = true;
			}
			p1.fmt = fmt;
		}

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
可能会设置{cond, orderby, res, fname}参数。但如果param中明确指定了比如res参数，则不会覆盖该参数。

res参数从列设置中获取，如"id 编号,name 姓名", 特别地，如果列对应字段以"_"结尾，不会加入res参数。

(v5.2)
如果表上有多选行，则导出条件为cond="t0.id IN (id1, id2)"这种形式。

fname自动根据当前页面的title以及datagrid当前的queryParam自动拼接生成。
如title是"检测记录报表", queryParam为"tm>='2020-1-1' and tm<='2020-7-1"，则生成文件名fname="检测记录报表-2020-1-1-2020-7-1".

@see getExportHandler 导出Excel
*/
self.getQueryParamFromTable = self.getParamFromTable = getQueryParamFromTable;
function getQueryParamFromTable(jtbl, param)
{
	var datagrid = self.isTreegrid(jtbl)? "treegrid": "datagrid";
	var opt = jtbl[datagrid]("options");

	var param1 = getDgFilter(jtbl); // param单独处理而不是一起合并，因为如果param.cond非空，不是做合并而是覆盖
	if (param != null) {
		$.extend(param1, param); // 保留param中内容，不修改param
	}
	else {
		param = {};
	}
	var selArr =  jtbl[datagrid]("getChecked");
	if (selArr.length > 1 && selArr[0].id != null) {
		var idList = $.map(selArr, function (e) { return e.id}).join(',');
		param1.cond = "t0.id IN (" + idList + ")";
	}
	if (param.orderby === undefined && opt.sortName) {
		param1.orderby = opt.sortName;
		if (opt.sortOrder && opt.sortOrder.toLowerCase() != "asc")
			param1.orderby += " " + opt.sortOrder;
	}
	if (param.res === undefined) {
		var resArr = [];
		$.each([opt.frozenColumns[0], opt.columns[0]], function (idx0, cols) {
			if (cols == null)
				return;
			$.each(cols, function (i, e) {
				if (! e.field || e.field.substr(-1) == "_")
					return;
				var one = e.field;
				if (one != e.title || e.jdEnumMap) {
					if (/[\s()\[\]\{\}\/\\,<>.!@#$%^&*-+]|^\d/.test(e.title))
						one += " " + Q(e.title, '"');
					else
						one += " " + e.title;
				}
				if (e.jdEnumMap) {
					one += '=' + mCommon.kvList2Str(e.jdEnumMap, ';', ':');
				}
				resArr.push(one);
			});
		});
		param1.res = resArr.join(',');
	}
	if (param.fname === undefined) {
		param1.fname = jtbl.prop("title") || jtbl.closest(".wui-page").prop("title");
		/*
		if (opt.queryParams && opt.queryParams.cond) {
			var keys = [];
			opt.queryParams.cond.replace(/'([^']+?)'/g, function (ms, ms1) {
				keys.push(ms1);
			});
			if (keys.length > 0) {
				param1.fname += "-" + keys.join("-");
			}
		}
		*/
	}
	return param1;
}

/**
@fn getDgInfo(jtbl, res?) -> { opt, isTreegrid, datagrid, url, param, ac, obj, sel?, selArr?, res?, dgFilter? }

取datagrid关联信息. 返回字段标记?的须显式指定，如：

	var dg = WUI.getDgInfo(jtbl); // {opt, url, ...}
	var dg = WUI.getDgInfo(jtbl, {res: null}); // 多返回res字段
	var data = jtbl[dg.datagrid]("getData"); // 相当于jtbl.datagrid(...), 但兼容treegrid调用。

- opt: 数据表option
- url: 关联的查询URL
- param: 额外查询参数
- ac: 关联的后端接口，比如"Ordr.query"
- obj: 关联的对象，比如"Ordr"
- isTreegrid: 是否为treegrid
- datagrid: "datagrid"或"treegrid"

- sel: 当前选中行的数据，无选中时为null
- selArr: 当前所有所中行的数据数据，无选中时为[]
- res: 字段信息，{ field => {field, title, jdEnumMap?} }
 */
self.getDgInfo = getDgInfo;
function getDgInfo(jtbl, res)
{
	if (!jtbl || jtbl.size() == 0 || !jtbl.hasClass("datagrid-f")) {
		console.error("bad datagrid: ", jtbl);
		throw "getDgInfo error: bad datagrid.";
	}

	if (res == null)
		res = {};

	res.isTreegrid = self.isTreegrid(jtbl);
	var datagrid = res.datagrid = (res.isTreegrid? "treegrid": "datagrid");
	var opt = res.opt = jtbl[datagrid]("options");
	res.url = opt.url;
	res.param = opt.queryParams;
	res.ac = opt.url && opt.url.action;
	if (res.ac) {
		var m = res.ac.match(/\w+(?=\.query\b)/);
		res.obj = m && m[0];
	}
	if (res.sel !== undefined) {
		res.sel = jtbl[datagrid]('getSelected');
	}
	if (res.selArr !== undefined) {
		res.selArr = jtbl[datagrid]("getChecked");
	}
	if (res.res !== undefined) {
		res.res = {};
		$.each([opt.frozenColumns[0], opt.columns[0]], function (idx0, cols) {
			if (cols == null)
				return;
			$.each(cols, function (i, e) {
				if (! e.field || e.field.substr(-1) == "_")
					return;
				res.res[e.field] = e;
			});
		});
	}
	if (res.dgFilter !== undefined) {
		res.dgFilter = getDgFilter(jtbl);
	}
	return res;
}

window.YesNoMap = {
	0: T("否"),
	1: T("是")
};
window.YesNo2Map = {
	0: T("否"),
	1: T("是"),
	2: T("处理中")
};

var Formatter = {
	dt: function (value, row) {
		var dt = WUI.parseDate(value);
		if (dt == null)
			return value;
		return dt.format("L");
	},
	number: function (value, row) {
		var ret = parseFloat(value);
		return isNaN(ret)? value: ret;
	},
/**
@fn Formatter.atts

列表中显示附件（支持多个）, 每个附件一个链接，点击后可下载该附件。（使用服务端att接口）
*/
	atts: function (value, row) {
		if (value == null)
			return "(无)";
		return value.toString().replace(/(\d+)(?::([^,]+))?,?/g, function (ms, attId, name) {
			var url = WUI.makeUrl("att", {id: attId});
			if (name == null)
				name = attId;
			return "<a target='_black' href='" + url + "'>" + name + "</a>&nbsp;";
		});
	},
/**
@fn Formatter.picx(opt={thumb?, preview?})

显示图片（支持多图）, 每个图可以有预览, 点击后在新页面打开并依次显示所有的图片.（使用服务端pic接口）

- thumb: 空-不存在缩略图，1-有缩略图: WUI.options.useNewThumb=0时id是缩略图(传统)，为1时id是原图(新风格)
- preview: 非空时，表示显示图片编号预览，其值为显示预览图的个数。

@alias Formatter.pics

相当于picx({thumb:1, preview:3})。显示图片列表预览，点击链接显示图片列表。

@alias Formatter.pics1

相当于picx({thumb:1})。不显示图片列表预览，点击链接显示图片列表。
 */
	picx: function (opt) {
		if (opt === null)
			opt = {};
		return function (value, row) {
			if (value == null)
				return "(无图)";
			if (!opt.preview)
				return '<a target="_black" href="' + linkUrl(value) + '">' + value + '</a>';

			var maxN = opt.preview || 3; // 最多显示图片数
			value1 = value.toString().replace(/(\d+)(?::([^,]+))?,?/g, function (ms, picId, name) {
				if (name == null)
					name = "图" + picId;
				if (maxN <= 0)
					return name + " ";
				-- maxN;
				var url;
				if (opt.thumb && self.options.useNewThumb) {
					url = WUI.makeUrl("att", {id: picId, thumb:1});
				}
				else {
					url = WUI.makeUrl("att", {id: picId});
				}
				return '<img alt="' + name + '" src="' + url + '">';
			});
			return '<a target="_black" href="' + linkUrl(value) + '">' + value1 + '</a>';
		}
		function linkUrl(value) {
			if (!opt.thumb) {
				return WUI.makeUrl("pic", {id:value});
			}
			else if (!self.options.useNewThumb) {
				return WUI.makeUrl("pic", {smallId:value});
			}
			else {
				return WUI.makeUrl("pic", {id:value, thumb:1});
			}
		}
	},

/**
@fn Formatter.flag(yes, no)

显示flag类的值，示例：

	<th data-options="field:'clearFlag', sortable:true, formatter:Formatter.flag("已结算", "未结算"), styler:Formatter.enumStyler({1:'Disabled',0:'Warning'}, 'Warning')">结算状态</th>

注意flag字段建议用Formatter.enum和jdEnumMap，因为在导出表格时，只用flag的话，导出值还是0,1无法被转换，还不如定义一个Map来的更清晰。

@see datagrid.formatter
@see Formatter.enum
*/
	flag: function (yes, no) {
		if (yes == null)
			yes = T("是");
		if (no == null)
			no = T("否");
		return function (value, row) {
			if (value == null)
				return;
			return value? yes: no;
		}
	},
/**
@fn Formatter.enum(enumMap, sep=',')

将字段的枚举值显示为描述信息。示例：

		<th data-options="field:'status', jdEnumMap: OrderStatusMap, formatter: WUI.formatter.enum(OrderStatusMap)">状态</th>

如果状态值为"CR"，则显示为"未付款". 全局变量OrderStatusMap在代码中定义如下（一般在web/app.js中定义）

	var OrderStatusMap = {
		CR: "未付款", 
		PA: "待服务"
	}

常用的YesNoMap是预定义的`0-否,1-是`映射，示例：

	<th data-options="field:'clearFlag', sortable:true, jdEnumMap:YesNoMap, formatter:Formatter.enum(YesNoMap), styler:Formatter.enumStyler({1:'Disabled',0:'Warning'}, 'Warning')">已结算</th>

特别地，可以为null指定值：

	<th data-options="field:'name', sortable:true, formatter:Formatter.enum({null:'(默认)'})">页面名</th>

@see datagrid.formatter
@see Formatter.enumStyler
 */
	enum: function (enumMap, sep) {
		sep = sep || ',';
		return function (value, row) {
			if (value == null)
				return enumMap[value];
			var v = enumMap[value];
			if (v != null)
				return v;
			if (value.indexOf && value.indexOf(sep) > 0) {
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
/**
@fn Formatter.enumStyler(colorMap, defaultColor?, field?)

为列表的单元格上色，示例：

	<th data-options="field:'status', jdEnumMap: OrderStatusMap, formatter:Formatter.enum(OrderStatusMap), styler:Formatter.enumStyler({PA:'Warning', RE:'Disabled', CR:'#00ff00', null: 'Error'}), sortable:true">状态</th>

颜色可以直接用rgb表示如'#00ff00'，或是颜色名如'red'等，最常用是用系统预定的几个常量'Warning'（黄）, 'Error'（红）, 'Info'（绿）, 'Disabled'（灰）.
缺省值可通过defaultColor传入。

如果是根据其它字段来判断，使用field选项指定字段，示例: 显示statusStr字段，但根据status字段值来显示颜色（默认'Info'颜色）

	<th data-options="field:'statusStr', styler:Formatter.enumStyler({PA:'Warning'}, 'Info', 'status'), sortable:true">状态</th>

@see datagrid.styler
@see Formatter.enumFnStyler 比enumStyler更强大
 */
	enumStyler: function (colorMap, defaultColor, field) {
		return function (value, row) {
			if (field)
				value = row[field];
			var color = colorMap[value];
			if (color == null && defaultColor)
				color = defaultColor;
			if (Color[color])
				color = Color[color];
			if (color)
				return "background-color: " + color;
		}
	},
/**
@fn Formatter.enumFnStyler(colorMap, defaultColor)

为列表的单元格上色，示例：

	<th data-options="field:'id', sortable:true, sorter:intSort, styler:Formatter.enumFnStyler({'v<10': 'Error', 'v>=10&&v<20': 'Warning'}, 'Info')">编号</th>

每个键是个表达式（其实是个函数），特殊变量v和row分别表示当前列值和当前行。缺省值可通过defaultColor传入。

@see Formatter.enumStyler
 */
	enumFnStyler: function (colorMap, defaultColor) {
		// elem: [fn(v), key]
		var fnArr = $.map(colorMap, function (v0, k) {
			// 注意：这里函数参数为v和row，所以字符串中可为使用v表示传入值; 特殊键true表示匹配所有剩下的
			return [ [function (v, row) { return eval(k) }, v0] ];
		});
		console.log(fnArr);
		return function (value, row) {
			var color = null;
			$.each(fnArr, function (i, fn) {
				if (fn[0](value, row)) {
					color = fn[1];
					return false;
				}
			});
			if (color == null && defaultColor)
				color = defaultColor;
			
			if (Color[color])
				color = Color[color];
			if (color)
				return "background-color: " + color;
		}
	},
	// showField=false: 显示value
	// showField=true: 显示"{id}-{name}"
	// 否则显示指定字段
	linkTo: function (field, dlgRef, showField) {
		return function (value, row) {
			if (value == null)
				return;
			var val = typeof(showField)=="string"? row[showField]:
				showField? (row[field] + "-" + value): value;
			return self.makeLinkTo(dlgRef, row[field], val);
		}
	},

/**
@fn Formatter.progress

以进度条方式显示百分比，传入数值value为[0,1]间小数：

	<th data-options="field:'progress', formatter: Formatter.progress">工单进度</th>

如果要定制颜色等样式，可以加个styler，如

	<th data-options="field:'progress', formatter: Formatter.progress, styler: OrdrFormatter.progressStyler">工单进度</th>

通过为cell指定一个class来控制内部进度条样式：

	progressStyler: function (value, row) {
		var st = ... // 'info', 'error'
		return {class: st}; // 直接返回字符串表示styler; 也可以返回 {class, style}这样
	}

然后通过CSS类来改写进度条颜色：

	<style>
	.info .progressbar-value {
		background-color: rgb(190, 247, 190) !important;
	}
	.error .progressbar-value {
		background-color: rgb(253, 168, 172) !important;
	}
	</style>

 */
	progress: function (value, row) {
		if (! value)
			return;
		value = Math.ceil(value * 100);
		var htmlstr = '<div class="easyui-progressbar progressbar" style="min-width: 100px;width: 100%; height: 20px;">'
			+ '<div class="progressbar-value" style="width: ' + value + '%; height: 20px; line-height: 20px;"></div>'
			+ '<div class="progressbar-text" style="width: ' + value + '%; top: 0;">' + value+ '%</div>'
			+ '</div>';
		return htmlstr;
	}
};
Formatter.pics = Formatter.picx({thumb:1, preview:3});
Formatter.pics1 = Formatter.picx({thumb:1});

/**
@var formatter = {dt, number, pics, flag(yes?=是,no?=否), enum(enumMap), linkTo(field, dlgRef, showId?=false) }

常常应用定义Formatter变量来扩展WUI.formatter，如

	var Formatter = {
		userId: WUI.formatter.linkTo("userId", "#dlgUser"), // 显示用户名(value)，点击后打开用户明细框
		storeId: WUI.formatter.linkTo("storeId", "#dlgStore", true), // 显示"商户id-商户名", 点击后打开商户明细框
		orderStatus: WUI.formatter.enum({CR: "新创建", CA: "已取消"}) // 将CR,CA这样的值转换为显示文字。
	};
	Formatter = $.extend(WUI.formatter, Formatter);

可用值：

- dt/number: 显示日期、数值
- pics/pics1: 显示一张或一组图片链接，点一个链接可以在新页面上显示原图片。(v5.4) pics直接显示图片(最多3张，可通过Formatter.pics.maxCnt设置)，更直观；pics1只显示图片编号，效率更好。
- atts: (v5.4) 显示一个或一组附件，点链接可下载附件。
- enum(enumMap): 根据一个map为枚举值显示描述信息，如 `enum({CR:"创建", CA:"取消"})`。
 (v5.1) 也支持枚举值列表，如设置为 `enumList({emp:"员工", mgr:"经理"})`，则会将"emp"和"emp,mgr"分别解析为"员工", "员工,经理"
- flag(yes?, no?): 显示yes-no字段，如 `flag("禁用","启用")`，也可以用enum，如`enum({0:"启用",1:"禁用"})`
- linkTo: 生成链接，点击打开对象详情对话框

在datagrid中使用：

	<th data-options="field:'createTm', sortable:true, formatter:Formatter.dt">创建时间</th>
	<th data-options="field:'amount', sortable:true, sorter: numberSort, formatter:Formatter.number">金额</th>
	<th data-options="field:'userName', sortable:true, formatter:Formatter.linkTo('userId', '#dlgUser')">用户</th>
	<th data-options="field:'status', sortable:true, jdEnumMap: OrderStatusMap, formatter: Formatter.orderStatus">状态</th>
	<th data-options="field:'done', sortable:true, formatter: Formatter.flag()">已处理</th>
*/
self.formatter = Formatter;

// ---- easyui setup {{{

function dgLoader(param, success, error)
{
	var jo = $(this);
	var datagrid = self.isTreegrid(jo)? "treegrid": "datagrid";
	var opts = jo[datagrid]("options");
	if (opts.data) {
		return defaultDgLoader[datagrid].apply(this, arguments);
	}
	if (opts.url == null)
		return false;
	var param1 = {};
	for (var k in param) {
		if (k === "rows") {
			param1.pagesz = param[k];
		}
	/*  param page is supported by jdcloud
		else if (k === "page") {
			param1.page = param[k];
		}
	*/
		else if (k === "sort") {
			param1.orderby = param.sort + " " + param.order;
		}
		else if (k === "order") {
		}
		else if (k === "q" && opts.jd_qsearch) {
			param1.qsearch = opts.jd_qsearch + ":" + param.q;
		}
		else {
			param1[k] = param[k];
		}
	}

	// PAGE_FILTER 根据showPage参数自动对页面中的datagrid进行过滤: 
	// WUI.showPage(pageName, title, [param1, {cond:cond}]) 
	param1 = getDgFilter(jo, param1, true); // 设置ignoreQueryParam=true因为param1中已包含了queryParams，不忽略的话条件会重复

	var dfd = self.callSvr(opts.url, param1, success);
	dfd.fail(function () {
		// hide the loading icon
		jo[datagrid]("loaded");
	});
}

/**
@key datagrid.sumFields 数据表统计列

为datagrid扩展属性，用于在数据表底部显示统计值。
默认统计逻辑是当前页面内累加，如：

	var dgOpt = {
		url: WUI.makeUrl("Contract.query"),
		showFooter: true, // 指定要显示底部统计
		sumFields: ["amount", "invoiceAmount", "recvAmount"], // 指定哪些列加统计值
		...
	});
	jtbl.datagrid(dgOpt);

如果想跨页统计，即显示所有页数据的统计（在当前查询条件下），需要为query调用添加statRes参数，如：

	var dgOpt = {
		url: WUI.makeUrl("Contract.query", {
			// 指定返回amount, invoiceAmount两个统计列
			statRes: "SUM(amount) amount, SUM(invoiceAmount) invoiceAmount",
		}),
		showFooter: true, // 指定要显示底部统计
		sumFields: ["amount", "invoiceAmount", "recvAmount"], // 注意：此时amount,invoiceAmount由于在statRes中指定，是跨页数据统计，而recvAmount未在statRes中指定，则只统计当前显示页。
		...
	});
	jtbl.datagrid(dgOpt);

*/

function dgLoadFilter(data)
{
	var ret = jdListToDgList(data);
	var isOnePage = (ret.total == ret.rows.length);
	// 隐藏pager: 一页能显示完且不超过5条.
	var doHidePager = (isOnePage && ret.total <= 5);
	// 超过1页使用remoteSort, 否则使用localSort.
//	$(this).datagrid("options").remoteSort = (! isOnePage);

	var jtbl = $(this);
	var dgOpt = jtbl.datagrid("options");
	if (dgOpt.pagination) {
		hidePagerAuto(jtbl, doHidePager);
	}
	// 支持统计列计算。TODO: 允许自定义统计逻辑与格式
	if (dgOpt.showFooter && dgOpt.sumFields) {
		var stat = data.stat || {};
		dgOpt.sumFields.forEach(function (field) {
			if (stat[field] !== undefined)
				return;
			stat[field] = ret.rows.reduce(function (s, row, i) {
				var v = row[field];
				if (!v || isNaN(v))
					return s;
				return s + parseFloat(v);
			}, 0);
		});
		ret.footer = [stat];
	}
	return ret;

	function hidePagerAuto(jtbl, doHidePager) {
		var tmpName = "_restorefn_pager";
		var jpager = jtbl.datagrid("getPager");
		var isHidden = jpager.css("display") == "none";
		if (doHidePager && !isHidden) {
			var h = jpager.height();
			jpager.hide().height(0);
			jtbl.data(tmpName, function () {
				jpager.height(h).show();
			})
		}
		else if (!doHidePager && isHidden) {
			var restorefn = jtbl.data(tmpName);
			restorefn();
			jtbl.data(tmpName, null);
		}
	}
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

/**
@key datagrid.quickAutoSize

扩展属性quickAutoSize。当行很多且列很多时，表格加载极慢。如果是简单表格（全部列都显示且自动大小，没有多行表头等），可以用这个属性优化。
在pageSimple中默认quickAutoSize为true。

	var dgOpt = {
		...
		pageSize: 200, // 默认一页20，改为200后，默认性能将显著下降; 设置为500后，显示将超过10秒
		pageList: [200, 500, 1000],
		quickAutoSize: true // WUI对easyui-datagrid的扩展属性，用于大量列时提升性能. 参考: jquery.easyui.min.js
	};
	jtbl.datagrid(dgOpt);

其原因是easyui-datagrid的autoSizeColumn方法有性能问题。当一页行数很多时可尝试使用quickAutoSize选项。
*/
var defaultDgLoader = {
	datagrid: $.fn.datagrid.defaults.loader,
	treegrid: $.fn.treegrid.defaults.loader
}
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
	pageList: [20,50,100],

	loadFilter: dgLoadFilter,
	loader: dgLoader,

	onLoadError: self.ctx.defAjaxErrProc,
	onBeforeSortColumn: function (sort, order) {
		var jtbl = $(this);
		resetPageNumber(jtbl);
	},

	onLoadSuccess: function (data) {
		if (data.total) {
			// bugfix: 有时无法显示横向滚动条
			$(this).datagrid("fitColumns");
		}
		else {
/**
@key .noData

CSS类, 可定义无数据提示的样式
 */
			// 提示"无数据". 在sytle.css中定义noData类
			var body = $(this).data().datagrid.dc.body2;
			var view =  $(this).data().datagrid.dc.view;
			var h = 50;
			view.height(view.height() - body.height() + h);
			body.height(h);
			body.find('table tbody').empty().append('<tr><td width="' + body.width() + 'px" height="50px" align="center" class="noData" style="border:none; color:#ccc; font-size:14px">没有数据</td></tr>');
		}
	},

	// 右键点左上角空白列:
	onHeaderContextMenu: function (ev, field) {
		var jtbl = $(this);
		var jmenu = GridHeaderMenu.showMenu({left: ev.pageX, top: ev.pageY, field}, jtbl, field);

		ev.preventDefault();
	},

	onClickCell: function (row, field, val) {
		var this_ = this;
		var jtbl = $(this);

		// 多选时显示列统计信息，一段时间内只显示一次
		if (this_.infoTmr)
			clearTimeout(this_.infoTmr);
		this_.infoTmr = setTimeout(function () {
			GridHeaderMenu.statSelection(jtbl, row, field);
			delete this_.infoTmr;
		}, 1000);
	},

	// 此回调由扩展datagrid源码得来
	onInitOptions: function (opt) {
		var ac = opt.url && opt.url.action;
		if (ac) {
			var m = ac.match(/\w+(?=\.query\b)/);
			var obj = m && m[0];
			if (obj) {
				opt.obj = obj;
				var jtbl = $(this);
				var baseObj = jtbl.attr("my-obj") || obj;
				var meta = self.UDF.onGetMeta(baseObj);
				if (meta && !jtbl.data("udfLoaded_")) { // 防止对话框上的datagrid重复添加字段
					self.UDF.addColByMeta(opt.columns[0], meta);
					jtbl.data("udfLoaded_", true);
				}
			}
		}
		// 支持通过 `jtbl.prop("datagridOpt", { onClickRow: ..., sortName: ...});`的方式配置datagrid选项，常用于二次开发时在dg_toolbar事件中设置datagrid选项。
		if (this.datagridOpt) {
			$.extend(opt, this.datagridOpt);
		}
		// support lang: 表头翻译
		opt.columns[0].forEach(function (e) {
			e.title = T(e.title);
		});
	},

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

/**
@var GridHeaderMenu

表头左上角右键菜单功能。

扩展示例：

	WUI.GridHeaderMenu.items.push('<div id="showObjLog">操作日志</div>');
	WUI.GridHeaderMenu.showObjLog = function (jtbl) {
		var row = WUI.getRow(jtbl);
		if (!row)
			return;
		...
		WUI.showPage("pageObjLog", "操作日志!", [null, param]);
	};

*/
var GridHeaderMenu = {
	showMenu: function (pos, jtbl, field) {
		// 注意id与函数名的匹配
		jmenu = $('<div class="mnuGridHeader"></div>');
		var items = field? GridHeaderMenu.itemsForField: GridHeaderMenu.items;
		$.each(items, function (i, e) {
			var je = $(e);
			var perm = je.attr("wui-perm") || je.text();
			if (canDo("通用", perm))
				je.appendTo(jmenu);
		});
		jmenu.menu({
			onClick: function (mnuItem) {
				GridHeaderMenu[mnuItem.id].call(mnuItem, jtbl, field);
			}
		});
		jmenu.menu('show', pos);
	},
	// 表头左侧右键菜单
	items: [
		'<div id="showDlgFieldInfo">字段信息</div>',
		'<div id="filterGrid" data-options="iconCls:\'icon-search\'">自定义查询</div>',
		'<div id="showDlgDataReport" data-options="iconCls:\'icon-sum\'">自定义报表</div>',
		'<div id="showDlgQuery">高级查询</div>',
		'<div id="import" wui-perm="新增" data-options="iconCls:\'icon-add\'">导入</div>',
		'<div id="export" data-options="iconCls:\'icon-save\'">导出</div>'
	],
	// 列头右键菜单
	itemsForField: [
		'<div id="copyCol">复制本列</div>',
		'<div id="statCol" data-options="iconCls:\'icon-sum\'">统计本列</div>',
		'<div id="doFindCell" data-options="iconCls:\'icon-search\'">查询本列</div>',
		'<div id="freezeCol" data-options="iconCls:\'icon-lock\'">冻结列</div>',
	],
	// 以下为菜单项处理函数

	showDlgFieldInfo: function (jtbl) {
		var param = WUI.getQueryParamFromTable(jtbl);
		console.log(param);

		var title = "字段信息";
		var title1 = jtbl.prop("title") || jtbl.closest(".wui-page").prop("title");
		if (title1)
			title += "-" + title1;

		var strArr = [];
		var datagrid = WUI.isTreegrid(jtbl)? "treegrid": "datagrid";
		var url = jtbl[datagrid]("options").url;
		if (url && url.action)
			strArr.push("<b>[接口]</b>\n" + url.action);
		if (param.cond) {
			var cond = param.cond;
			if ($.isArray(cond) || $.isPlainObject(cond))
				cond = JSON.stringify(cond);
			strArr.push("<b>[查询条件]</b>\n" + cond);
		}
		if (param.orderby)
			strArr.push("<b>[排序]</b>\n" + param.orderby);

		// {name/字段名, title/标题, cmt/备注?, example/示例?}
		var varr = WUI.list2varr(param.res, " ", ",");
		var resArr = WUI.rs2Array({h:["name","title"], d:varr});
		var rows = jtbl.datagrid("getData").rows;
		if (rows.length > 0) {
			var colMap = {};
			$.each(resArr, function (i, res) {
				colMap[ res.name ] = true; // name
				addExample(rows, res);
			});
			$.each(rows[0], function (field, val) {
				if (colMap[field])
					return;
				var res = { name:field, title:"(未使用)"};
				addExample(rows, res);
				resArr.push(res);
			});
		}
		strArr.push("<b>[字段列表]</b>\n");

		var jdlg = $("<div class='dlgFieldInfo' style='width:500px;height:500px' title='" + title + "'><pre>" + strArr.join("\n\n") + "</pre>" +
			"<table id='res' style='width:100%'></table>" +
			"</div>");
		if ($("#styleFieldInfo").size() == 0) {
			var style = "<style id='styleFieldInfo'>" + 
				".dlgFieldInfo .datagrid-cell { white-space: normal }" +
				".dlgFieldInfo .example { color: blue; font-size: 0.6em }" +
				"</style>";
			$(style).appendTo(document.head);
		}
		WUI.showDlg(jdlg, {
			modal: false,
			onOk: function () {
				WUI.closeDlg(this);
			},
			noCancel: true
		});
		setTimeout(onShow);

		function onShow() {
			jdlg.find("#res").datagrid({
				columns: [[
					{ field: "name", title: "字段", width: "33%" },
					{ field: "title", title: "标题", width:"34%" },
					{ field: "example", title: "示例", width: "33%"},
				]],
				pagination: false,
				data: resArr
			});
		}

		function addExample(rows, res) {
			var field = res.name;
			if (rows[0][field] === undefined) {
				res.name += "<span style='color:red'>(缺失)</span>";
			}
			if (res.title) {
				res.title = "<span>" + res.title + "</span>";
			}
			var arr = [];
			var MAX_EXAMPLE = 2;
			var lastOne = null;
			$.each(rows, function (i, row) {
				var s = row[field];
				if ($.isArray(s) || $.isPlainObject(s))
					s = JSON.stringify(s);
				if (s && s != lastOne) {
					arr.push(s);
					lastOne = s;
					if (arr.length == MAX_EXAMPLE)
						return false;
				}
			});
			if (arr.length > 0)
				res.example = "<span class='example'>" + arr.join('<br>') + "</span>";
		}
	},

	filterGrid: function (jtbl) {
		var param = self.getDgInfo(jtbl).param;
		app_alert(T("查询条件(cond)? "), "p", function (cond) {
			WUI.reload(jtbl, null, {cond: cond});
		}, {defValue: param && param.cond});
	},
	showDlgDataReport: function (jtbl) {
		self.showDlg("#dlgDataReport");
	},
	showDlgQuery: function (jtbl) {
		var data = null;
		var datagrid = WUI.isTreegrid(jtbl)? "treegrid": "datagrid";
		var url = jtbl[datagrid]("options").url;
		if (url && url.action)
			data = {ac: url.action};
		var param = WUI.getQueryParamFromTable(jtbl);
		self.showDlgQuery(data, param);
	},
	'import': function (jtbl) {
		var param = self.getDgInfo(jtbl);
		if (!param.obj) {
			app_alert(T("该数据表不支持导入"), "w");
			return;
		}
		DlgImport.show({obj: param.obj}, function () {
			WUI.reload(jtbl);
		});
	},
	'export': function (jtbl) {
		var fn = getExportHandler(jtbl);
		fn();
	},

	dgStatCol: function (rows, field) {
		var stat = {cnt: 0, realCnt: 0, numCnt: 0, sum: 0, max: 0, min: 0, info: []};
		stat.cnt = rows.length;
		if (stat.cnt < 1)
			return stat;
		rows.forEach(function (e) {
			var v = e[field];
			if (v === null || v === "")
				return;
			++ stat.realCnt;

			if (isNaN(v))
				return;
			if (v.constructor !== Number) {
				v = parseFloat(v);
			}
			++ stat.numCnt;
			if (stat.numCnt == 1) {
				stat.max = v;
				stat.min = v;
				stat.sum = v;
			}
			else {
				stat.sum += v;
				if (v > stat.max)
					stat.max = v;
				if (v < stat.min)
					stat.min = v;
			}
		});
		stat.info = [
			"COUNT=" + stat.cnt,
			"COUNT(非空项)=" + stat.realCnt
		];
		if (stat.numCnt > 0) {
			stat.info.push(
				"COUNT(数值项)=" + stat.numCnt,
				"SUM=" + stat.sum,
				"MAX=" + stat.max,
				"MIN=" + stat.min,
				"AVG=" + stat.sum/stat.numCnt
			)
		}
		return stat;
	},

	statSelection: function (jtbl, row, field) {
		var rows = jtbl.datagrid("getSelections");
		if (rows.length < 2)
			return;
		var stat = GridHeaderMenu.dgStatCol(rows, field);
		var colTitle = jtbl.datagrid("getColumnOption", field).title;
		var title = "选中" + rows.length + "行，列=[" + colTitle + "]";
		app_show(stat.info.join("<br>"), title);
	},

	copyCol: function (jtbl, field) {
		var rows = jtbl.datagrid("getSelections");
		var arr = null;
		if (rows.length < 2) { // 非多选时，复制本列所有数据（包含标题行）
			var data = jtbl.datagrid("getData");
			arr = data.rows.map(function (e) {
				return e[field];
			});
			var colTitle = jtbl.datagrid("getColumnOption", field).title;
			arr.unshift(colTitle);
		}
		else { // 多选时，只复制已选择行的列数据
			arr = rows.map(function (e) {
				return e[field];
			});
		}
		var ret = arr.join("\r\n");
		self.execCopy(ret);
	},
	statCol: function (jtbl, field) {
		var data = jtbl.datagrid("getData");
		var colTitle = jtbl.datagrid("getColumnOption", field).title;
		if (data.rows.length == 0) {
			var info = "[" + colTitle + "]列: 无数据";
			app_alert(info);
			return;
		}
		var stat = GridHeaderMenu.dgStatCol(data.rows, field);
		stat.info.unshift("<b>[" + colTitle + "]</b>列:");
		var jdlg = $("<div title='列统计'><pre>" + stat.info.join("\n") + "</pre></div>");
		WUI.showDlg(jdlg, {
			modal: false,
			onOk: function () {
				WUI.closeDlg(this);
			},
			noCancel: true
		});
	},
	doFindCell: function (jtbl, field) {
		var dgInfo = WUI.getDgInfo(jtbl);
		var colTitle = jtbl.datagrid("getColumnOption", field).title;
		if (colTitle != field)
			colTitle += "(" + field + ")";
		var info = "请输入<b>[" + colTitle + "]</b>的过滤条件：<br>" +
			"按住Ctrl点\"确定\"可追加过滤条件。";
		var rows = jtbl.datagrid("getSelections");
		var defValue = $.map(rows, function (row) {
			return row[field];
		}).join(',');
		app_alert(info, "p", function (text) {
			var kv = {};
			kv[field] = text;
			var param = WUI.getQueryParam(kv);
			var doAppendFilter = WUI.isBatchMode();
			WUI.reload(jtbl, undefined, param, doAppendFilter);
		}, {defValue: defValue});
	},
	freezeCol: function (jtbl, field) {
		var dgOpt = jtbl.datagrid("options");
		if (dgOpt.columns.length > 1) {
			app_alert("不支持", "w");
			return;
		}
		var cols = [];
		if (dgOpt.frozenColumns[0])
			cols.push.apply(cols, dgOpt.frozenColumns[0]);
		cols.push.apply(cols, dgOpt.columns[0]);
		var col = cols.findIndex(function (e) {
			return e.field == field;
		});
		dgOpt.quickAutoSize = false; // TODO: 暂不支持性能优化，数据很多（比如几百行，且列很多）时会慢
		jtbl.datagrid({
			frozenColumns: [cols.slice(0, col+1)],
			columns: [cols.slice(col+1)]
		});
	}
}
self.GridHeaderMenu = GridHeaderMenu;

/**
@fn showDlgQuery(data?={ac, param})

显示高级查询对话框。在表头左上角右键菜单中有“高级查询”对话框。
 */
self.showDlgQuery = showDlgQuery;
function showDlgQuery(data1, param)
{
	var itemArr = [
		// title, dom, hint?
		{title: "接口名", dom: "<input name='ac' required>", hint: "示例: Ordr.query"},
		{title: "参数", dom: '<textarea name="param" rows=8></textarea>', hint: "cond:查询条件, res:返回字段, gres:分组字段, pivot:转置字段, fmt:输出格式(html,excel,txt,list,array,csv等)"},
		{title: "统计图<br>参数", dom: '<textarea name="showChartParam" rows=4></textarea>', 
			hint: "<a target='_blank' href='https://oliveche.com/jdcloud-site/api_web.html#showDlgChart'>须为数组，原型为[rs2StatOpt, seriesOpt, chartOpt]</a><br>" + 
				"示例: <span class='example'>[]</span> <span class='example'>[{xcol: [0,1]}]</span>" +
				" <span class='example'>[{ tmUnit: 'y,m' }]</span> <span class='example'>[null, {type:'pie'}]</span>"
		}
	];
	var data = $.extend({
		ac: 'Ordr.query',
		param: param ? JSON.stringify(param, null, 2) :  '{\n cond: {createTm: ">2020-1-1"},\n res: "count(*) 数量",\n gres: "status 状态=CR:新创建;PA:待处理;RE:已完成;CA:已取消",\n// pivot: "状态"\n}'
	}, data1);
	var jdlg = self.showDlgByMeta(itemArr, {
		title: "高级查询",
		modal: false,
		data: data,
		onOk: function (data) {
			var param = {page: 1};
			if (data.param) {
				try {
					param = $.extend(param, eval("(" + data.param + ")"));
				}
				catch (ex) {
					app_alert("参数格式出错：须为JS对象格式");
					return false;
				}
			}
			var showChartParam;
			if (data.showChartParam) {
				try {
					showChartParam = eval("(" + data.showChartParam + ")");
				}
				catch (ex) {
					app_alert("参数格式出错：须为JS对象格式");
					return false;
				}
				if (! $.isArray(showChartParam)) {
					app_alert("统计图表参数必须为JS数组格式");
					return false;
				}
			}
			var url = self.makeUrl(data.ac, param);
			if (param && param.fmt) {
				window.open(url);
				return;
			}
			WUI.showPage("pageSimple", T("查询结果") + "!", [ url, null, null, showChartParam ]);
//			WUI.closeDlg(this);
		}
	});
	jdlg.find(".example").css({
		//fontStyle: "italic",
		backgroundColor: "#eeeeee",
		cursor: "pointer"
	}).click(function () {
		$(this).closest("td").find("textarea:first").val($(this).text());
	});
}

$.extend($.fn.treegrid.defaults, {
	idField: "id",
	treeField: "id", // 只影响显示，在该字段上折叠
	pagination: false,
	rownumbers:true,
	fatherField: "fatherId", // 该字段为WUI扩展，指向父节点的字段
	singleSelect: false,
	ctrlSelect: true, // 默认是单选，按ctrl或shift支持多选
	loadFilter: function (data, parentId) {
		var opt = $(this).treegrid("options");
		var isLeaf = opt.isLeaf;
		var ret = jdListToTree(data, opt.idField, opt.fatherField, parentId, isLeaf);
		return ret;
	},
	loader: dgLoader,
	onBeforeLoad: function (row, param) {
		if (row) { // row非空表示展开父结点操作，须将param改为 {cond?, id} => {cond:"fatherId=1"}
			var opt = $(this).treegrid("options");
			param.cond = opt.fatherField + "=" + row.id;
			delete param["id"];
		}
	},
	onLoadSuccess: function (row, data) {
		// 空数据显示优化
		$.fn.datagrid.defaults.onLoadSuccess.call(this, data);
	},
	onHeaderContextMenu: $.fn.datagrid.defaults.onHeaderContextMenu
});

$.extend($.fn.combotree.defaults, {
	idField: "id",
	textField: "name",
	fatherField: "fatherId", // 该字段为WUI扩展，指向父节点的字段
	loadFilter: function (data, parentId) {
		var arr = null;
		// support simple array
		if ($.isArray(data)) {
			arr = data;
		}
		else if ($.isArray(data.list)) {
			arr = data.list;
		}
		// support compressed table format: {h,d}
		else if (data.h !== undefined)
		{
			arr = WUI.rs2Array(data);
		}
		else {
			return data;
		}
		var opt = $(this).tree("options"); // NOTE: 这里this似乎是tree; 用combotree/combo都取不了
		var ret = WUI.makeTree(arr, opt.idField, opt.fatherField);
		$.each(arr, function (i, e) {
			e.text = e[opt.textField];
		// e.state = 'closed'; // 如果无结点, 则其展开时将触发ajax查询子结点
		});
		return ret;
	}
});

$.extend($.fn.combogrid.defaults, {
	loadFilter: $.fn.datagrid.defaults.loadFilter,
	loader: $.fn.datagrid.defaults.loader,
});

$.extend($.fn.combotreegrid.defaults, {
	idField: "id",
	treeField: "name",
	textField: "name",
	fatherField: "fatherId", // 该字段为WUI扩展，指向父节点的字段
	loadFilter: $.fn.treegrid.defaults.loadFilter
});

/**
@fn checkIdCard(idcard)

身份证校验，示例：

	var rv = WUI.checkIdCard("310115200809090927"); // false
	var rv = WUI.checkIdCard("310115200809090928"); // true

 */
self.checkIdCard = checkIdCard;
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

/**
@key .easyui-validatebox

为form中的组件加上该类，可以限制输入类型，如：

	<input name="amount" class="easyui-validatebox" data-options="validType:'number'" required>

validType还支持：

- number: 数字
- uname: 4-16位用户名，字母开头
- cellphone: 11位手机号
- usercode: 11位手机号或客户代码
- idcard: 18位身份证号
- datetime: 格式为"年-月-日 时:分:秒"，时间部分可忽略
- equalTo(selector): 校验两次密码输入相同，示例：`validType:'equalTo[\'#txtNewPwd\']'`。它会找在同一个form下的指定组件与其比较。
- pwd: 4-16位密码

注意：

- required选项定义是否允许为空。它可以写在data-options中如`required:true;validType:'number'`，也可以单独以属性方式来写。
 建议使用属性方式来写，这样在对话框上会自动添加"*"号标识。

- 如果未填写，则不检查validType指定的rule。除非在rule中定义了`checkEmpty:true`选项(这是jdcloud扩展easyui的选项)。

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
			return /^[0-9.-]+$/.test(v);
		},
		message: T("validate.number") || '必须为数字!'
	},
	/*
	workday: {
		validator: function(value) {
			return value.match(/^[1-7,abc]+$/);
		},
		message: '格式例："1,3a,5b"表示周一,周三上午,周五下午.'
	},
	*/
	idcard: {
		validator: checkIdCard,
		message: T("validate.idcard") || '18位身份证号有误!'
	},
	uname: {
		validator: function (v) {
			return v.length>=4 && v.length<=16 && /^[a-z]\w+$/i.test(v);
		},
		message: T("validate.uname") || "4-16位英文字母或数字，以字母开头，不能出现符号."
	},
	pwd: {
		validator: function (v) {
			return (v.length>=4 && v.length<=16) || v.length==32; // 32 for md5 result
		},
		message: T("validate.pwd") || "4-16位字母、数字或符号."
	},
	equalTo: {
		validator: function (v, param) { // param: [selector]
			return v==$(this).closest("form").find(param[0]).val();
		},
		message: T("validate.equalTo") || "两次输入不一致."
	},
	cellphone: {
		validator: function (v) {
			return v.length==11 && !/\D/.test(v);
		},
		message: T("validate.cellphone") || "手机号为11位数字"
	},
	datetime: {
		validator: function (v) {
			return /\d{4}-\d{1,2}-\d{1,2}( \d{1,2}:\d{1,2}(:\d{1,2})?)?/.test(v);
		},
		message: T("validate.datetime") || "格式为\"年-月-日 时:分:秒\"，时间部分可忽略"
	},
	usercode: {
		validator: function (v) {
			return /^[a-zA-Z]/.test(v) || (v.length==11 && !/\D/.test(v)); 
		},
		message: T("validate.usercode") || "11位手机号或客户代码"
	}
};

var validateboxDefaults = {
	rules: DefaultValidateRules,
	validateOnCreate: false,
	missingMessage: "必填项，不可为空"
}
$.extend(true, $.fn.validatebox.defaults, validateboxDefaults);
$.extend(true, $.fn.combo.defaults, validateboxDefaults);
$.extend(true, $.fn.combogrid.defaults, validateboxDefaults);

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

/**
@key easyui-linkbutton
@key EXT_LINK_BUTTON

datagrid options中的toolbar，我们使用代码指定方式，即

	var btnFind = {text:'查询', iconCls:'icon-search', handler: function () {
		showObjDlg(ctx.jdlg, FormMode.forFind, {jtbl: ctx.jtbl});
	};
	jtbl.datagrid({ ... 
		toolbar: WUI.dg_toolbar(jtbl, jdlg, ... btnFind)
	});

缺点是它只能使用默认的linkbutton组件（在easyui里写死了）。
此处进行hack，增加class属性，让它支持splitbutton/menubutton，示例：

	var jmneu = $('#mm').menu({
		onClick: function (item) {
			console.log(item.id);
		}
	});
	var btnFind = {text:'查询', class: 'splitbutton', iconCls:'icon-search', handler: ..., menu: jmenu};

*/
$.fn.linkbutton0 = $.fn.linkbutton;
$.fn.linkbutton = function (a, b) {
	if ($.isPlainObject(a) && a.class) {
		mCommon.assert(a.class == "splitbutton" || a.class == "menubutton");
		var cls = a.class;
		delete a.class;
		return $.fn[cls].apply(this, arguments);
	}
	return $.fn.linkbutton0.apply(this, arguments);
}
$.extend($.fn.linkbutton, $.fn.linkbutton0);

if (g_args.lang != "dev") {
$.fn.datebox.defaults.formatter = function(date){
	var y = date.getFullYear();
	var m = date.getMonth()+1;
	var d = date.getDate();
	return y+'-'+(m<10?('0'+m):m)+'-'+(d<10?('0'+d):d);
};
$.fn.datebox.defaults.parser = function(s){
	if (!s) return new Date();
	var ss = s.split('-');
	var y = parseInt(ss[0],10);
	var m = parseInt(ss[1],10);
	var d = parseInt(ss[2],10);
	if (!isNaN(y) && !isNaN(m) && !isNaN(d)){
		return new Date(y,m-1,d);
	} else {
		return new Date();
	}
};
}
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
	// 如果首行有colspan，则添加隐藏行定宽
	if (doAddTr) {
		var td = dup("<td></td>", colCnt);
		$('<tr class="wui-form-table-tr-width" style="visibility:hidden">' + td + '</tr>').prependTo(jo);
		tr = tbl.rows[0];
	}
	// 输入框等分
	var w = 100 / (colCnt/2);
	for (var i=1; i<colCnt; i+=2) {
		var je = $(tr.cells[i]);
		if (je.attr("width") == null)
			je.attr("width", w + "%");
		je.css("min-width", "100px");
	}
	self.enhanceLang(jo.find("td:even"));

	/*
	2s内三击字段标题，触发查询。Ctrl+三击为追加过滤条件
	 */
	self.doSpecial(jo, 'td', function (ev) {
		var jo = $(this).next();
		if (jo.find("[name]").size() > 0) {
			var appendFilter = (ev.ctrlKey || ev.metaKey);
			doFind(jo, null, appendFilter);
		}
	}, 3, 2);

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

// ====== global {{{
/**
@var isBusy

标识应用当前是否正在与服务端交互。一般用于自动化测试。
*/
self.isBusy = false;

/**
@var g_args 全局URL参数

应用参数。

URL参数会自动加入该对象，例如URL为 `http://{server}/{app}/index.html?orderId=10&dscr=上门洗车`，则该对象有以下值：

	g_args.orderId=10; // 注意：如果参数是个数值，则自动转为数值类型，不再是字符串。
	g_args.dscr="上门洗车"; // 对字符串会自动进行URL解码。

框架会自动处理一些参数：

- g_args._debug: 指定后台的调试等级，有效值为1-9. 而且一旦指定，后端将记录debug日志。参考：后端测试模式 P_TEST_MODE，调试等级 P_DEBUG，调试日志 P_DEBUG_LOG
- g_args.autoLogin: 记住登录信息(token)，下次自动登录；注意：如果是在手机模式下打开，此行为是默认的。示例：http://server/jdcloud/web/?autoLogin
- g_args.phpdebug: (v6) 设置为1时，以调用接口时激活PHP调试，与vscode/netbeans/vim-vdebug等PHP调试器联合使用。参考：http://oliveche.com/jdcloud-site/phpdebug.html
- g_args.lang: (v6.1) 指定语言，默认为开发语言"dev"，支持英文"en"（加载lib/lang-en.js）。

@see parseQuery URL参数通过该函数获取。
*/
window.g_args = {};

/**
@var g_data = {userInfo?, initClient?, hasRole()}

应用全局共享数据。

在登录时，会自动设置userInfo属性为个人信息。所以可以通过 g_data.userInfo==null 来判断是否已登录。

- g_data.userInfo: 登录后，保存用户信息。
- g_data.hasRole(roleList): 检查用户是否有指定角色，如g_data.hasRole("mgr")，多个角色用逗号分隔如g_data.hasRole("mgr,业务员"). 
注意：检查权限请用WUI.canDo()函数
- g_data.initClient: 保存调用initCient接口返回的内容，用于获取后端配置项。
例如后端全局变量P_initClient中设置的选项会存入g_data.initClient中。常用于用后端配置项控制前端逻辑。

*/
window.g_data = {};

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
@var WUI.options

{appName=user, title="客户端", onShowLogin, pageHome="pageHome", pageFolder="page"}

- appName: 用于与后端通讯时标识app.
- pageHome: 首页的id, 默认为"pageHome"
- pageFolder: 子页面或对话框所在文件夹, 默认为"page"
- closeAfterAdd: (=false) 设置为true时，添加数据后关闭窗口。默认行为是添加数据后保留并清空窗口以便连续添加。
- closeAfterFind: (=false) (v6)设置为true时，查询后关闭窗口。默认行为是查询后窗口不关闭。
- fuzzyMatch: (=false) 设置为true时，则查询对话框中的文本查询匹配字符串任意部分。
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
	mockDelay: 50,

/**
@var WUI.options.moduleExt

用于模块扩展。有两个回调函数选项：

	// 定制模块的页面路径
	WUI.options.moduleExt.showPage = function (name) {
		// name为showPage或showDlg函数调用时的页面/对话框；返回实际页面地址；示例：
		var map = {
			"pageOrdr__Mes.html": "page/mes/pageOrdr.html",
			"pageOrdr__Mes.js": "page/mes/pageOrdr.js",
		};
		return map[name] || name;
	}
	// 定制模块的接口调用地址
	WUI.options.moduleExt.callSvr = function (name) {
		// name为callSvr调用的接口名，返回实际URL地址；示例：
		var map = {
			"Ordr__Mes.query" => "../../mes/api/Ordr.query",
			"Ordr__Item.query" => "../../mes/api/Item.query"
		}
		return map[name] || name;
	}

详细用法案例，可参考：筋斗云开发实例讲解 - 系统复用与微服务方案。
*/
	moduleExt: { showPage: $.noop, callSvr: $.noop },

/**
@var WUI.options.xparam
 */
	xparam: 1,

/**
@var MUI.options.useNewThumb

带缩略图的图片编号保存风格。

- 0: 保存小图编号，用att(id)取小图，用att(thumbId)取大图
- 1: 保存大图编号，用att(id,thumb=1)取小图，用att(id)取大图
 */
	useNewThumb: 0
};

//}}}

parseArgs();
initLang();

// 子模块
JdcloudApp.call(self);
JdcloudCall.call(self);
JdcloudPage.call(self);

// set g_args
function parseArgs()
{
	if (location.search) {
		g_args = mCommon.parseQuery(location.search.substr(1));
	}
}

// === language {{{
/**
@var LANG 多国语言支持/翻译

系统支持通过URL参数lang指定语言，如指定英文版本：`http://myserver/myapp/web/store.html?lang=en`

如果未指定lang参数，则根据html的lang属性来确定语言，如指定英文版：

	<html lang="en">

默认为开发语言(lang="dev")，以中文为主。英文版下若想切换到开发语言，可以用`http://myserver/myapp/web/store.html?lang=dev`
g_args.lang中保存着实际使用的语言。

自带英文语言翻译文件lib/lang-en.js，当lang=en时加载它。可扩展它或以它为模板创建其它语言翻译文件。
语言翻译文件中，设置全局变量LANG，将开发语言翻译为其它语言。

系统会自动为菜单项、页面标题、列表表头标题、对话框标题等查找翻译。
其它DOM组件若想支持翻译，可手工添加CSS类lang，如:

	<div><label class="lang"><input type="checkbox" value="mgr">最高管理员</label></div>

	<a href="javascript:logout()" class="logout"><span class="lang"><i class="icon-exit"></i>退出系统</span></a>

或在代码中，使用WUI.enhanceLang(jo)来为DOM组件支持翻译，或直接用T(str)翻译字符串。
注意lang类或enhanceLang函数不能设置组件下子组件的文字，可先取到文字组件再设置如`WUI.enhanceLang(jo.find(".title"))`。

@fn T(s) 字符串翻译

T函数用于将开发语言翻译为当前使用的语言。

@key .lang DOM组件支持翻译
@fn enhanceLang(jo) DOM组件支持翻译

 */
function T(s) {
	if (s == null || LANG == null)
		return s;
	var s1 = s;
	if (s.length > 2 && s.substr(-2) == "管理")
		s1 = s.substr(0, s.length-2);
	return LANG[s1] || s;
}

function initLang() {
	window.LANG = null;
	window.T = T;
	if (!g_args.lang)
		g_args.lang = document.documentElement.lang || 'dev';
	if (g_args.lang != 'dev') {
		mCommon.loadScript("lib/lang-" + g_args.lang + ".js", {async: false});
		mCommon.loadScript("lib/easyui/locale/easyui-lang-en.js");
	}
	else {
		mCommon.loadScript("lib/easyui/locale/easyui-lang-zh_CN.js");
	}
}

self.m_enhanceFn[".lang"] = self.enhanceLang = enhanceLang;
function enhanceLang(jo)
{
	if (LANG == null)
		return;
	jo.contents().each(function () {
		if (this.nodeType == 3) { // text
			var t = T(this.nodeValue);
			this.nodeValue = t;
		}
	});
}
// }}}

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

	// 确认框(confirm, 确定/取消)
	// 仅当点击“确定”按钮才会进入回调函数。如果想处理取消事件，可使用opt.onCancel()回调
	app_alert("立即付款?", "q", function () {
		WUI.showPage("#pay");
	});

	// 提示输入框(prompt)
	// 仅当点击“确定”按钮且输入值非空时才会进入回调函数。可使用opt.defValue指定缺省值
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
	var s = {i: T("提示"), w: T("警告"), e: T("出错")}[type] || "";
	var s1 = "<b>[" + s + "]</b>";
	jmsg = $.messager.alert(self.options.title + " - " + s, s1 + " " + msg, icon, fn);

	// 查看jquery-easyui对象，发现OK按钮的class=1-btn
	setTimeout(function() {
		var jbtn = jmsg.parent().find(".l-btn");
		jbtn.focus();
		if (alertOpt.timeoutInterval) {
			setTimeout(function() {
				try {
					jbtn.click();
				} catch (ex) {
					console.error(ex);
				}
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
	$.messager.confirm(self.options.title + " - " + T("确认"), s, fn);
}

/**
@fn app_show(msg, title?)

使用jQuery easyui弹出对话框.
*/
self.app_show = app_show;
function app_show(msg, title)
{
	$.messager.show({title: title||self.options.title, msg: msg});
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
	return name;
}

self.saveLoginToken = saveLoginToken;
function saveLoginToken(data)
{
	if (data._token)
	{
		mCommon.setStorage(tokenName(), data._token);
	}
}
self.loadLoginToken = loadLoginToken;
function loadLoginToken()
{
	return mCommon.getStorage(tokenName());
}
self.deleteLoginToken = deleteLoginToken;
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

		WUI.tryAutoLogin(WUI.handleLogin, "Employee.get");
	}

	$(main);

该函数同步调用后端接口。如果要异步调用，请改用tryAutoLoginAsync函数，返回Deferred对象，resolve表示登录成功，reject表示登录失败。
*/
self.tryAutoLogin = tryAutoLogin;
function tryAutoLogin(onHandleLogin, reuseCmd)
{
	// initClient接口返回了userInfo，表示使用第三方认证，跳过tryAutoLogin
	if (g_data.initClient && g_data.initClient.userInfo)
		return;

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

	self.showLogin();
	return ok;
}

self.showLogin = showLogin;
function showLogin()
{
	self.options.onShowLogin();
}

self.tryAutoLoginAsync = tryAutoLoginAsync;
function tryAutoLoginAsync(onHandleLogin, reuseCmd)
{
	var ajaxOpt = {noex: true};
	var dfd = $.Deferred();

	function success(data) {
		if (onHandleLogin)
			onHandleLogin.call(this, data);
		dfd.resolve();
	}
	function fail() {
		dfd.reject();
		self.showLogin();
	}

	// first try "User.get"
	if (reuseCmd != null) {
		self.callSvr(reuseCmd, function (data) {
			if (data === false) {
				loginByToken()
				return;
			}
			success(data);
		}, null, ajaxOpt);
	}
	else {
		loginByToken();
	}

	// then use "login(token)"
	function loginByToken()
	{
		var token = loadLoginToken();
		if (token != null)
		{
			var postData = {token: token};
			self.callSvr("login", function (data) {
				if (data === false) {
					fail();
					return;
				}
				success(data);
			}, postData, ajaxOpt);
		}
		else {
			fail();
		}
	}
	return dfd.promise();
}

/**
@fn handleLogin(userInfo)
@param userInfo 调用login/Employee.get等接口返回的用户信息数据。

处理login相关的操作, 如设置g_data.userInfo, 保存自动登录的token等等.

(v5.5) 如果URL中包含hash（即"#pageIssue"这样），且以"#page"开头，则登录后会自动打开同名的列表页（如"pageIssue"页面）。

@var dfdLogin

用于在登录完成状态下执行操作的Deferred/Promise对象。
示例：若未登录，则在登录后显示消息；若已登录则直接显示消息

	WUI.dfdLogin.then(function () {
		app_show("hello");
	});

*/
self.handleLogin = handleLogin;
self.dfdLogin = $.Deferred();
function handleLogin(data)
{
	g_data.userInfo = data;
	// 自动登录: http://...?autoLogin
	if (g_args.autoLogin || /android|ipad|iphone/i.test(navigator.userAgent))
		saveLoginToken(data);

	WUI.applyPermission();

	var jcont = $("body");
	if (WUI.isSmallScreen()) {
		$("#menu").attr("data-options", "collapsed:true");
	}
	jcont.layout();
	// bugfix: jcont.layout()会导致panel-header类被去除，再显示login页时则会多显示一个窗口头部
	$(".loginPanel > .window-header").addClass("panel-header");
	$("#menu,#main").css("visibility", "");

	$(".my-title").html(document.title);
	if (data) {
		$(".user-name").html(data.name || data.uname);
		$(".user-phone").html(data.phone);
	}

	self.dfdLogin.resolve();
	self.showPage(self.options.pageHome);
	if (location.hash.startsWith("#page")) {
		WUI.showPage(location.hash.replace('#', ''));
	}
}
//}}}

// ------ plugins {{{
/**
@fn initClient(param = null)

一般在进入页面时，同步地调用后端initClient接口，获取基本配置信息。
此后可通过g_data.initClient取这些配置。

若指定param参数(JS对象，如`{token: 123}`)，则作为POST参数调用initClient接口.

*/
self.initClient = initClient;
var plugins_ = {};
function initClient(param)
{
	self.callSvrSync('initClient', function (data) {
		g_data.initClient = data;
		plugins_ = data.plugins || {};
		$.each(plugins_, function (k, e) {
			if (e.js) {
				// plugin dir
				var js = BASE_URL + 'plugin/' + k + '/' + e.js;
				mCommon.loadScript(js, {async:true});
			}
		});
	}, param);
	if (g_data.initClient && g_data.initClient.userInfo) {
		WUI.handleLogin(g_data.initClient.userInfo);
		// NOTE: 会自动跳过tryAutoLogin
	}
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
返回logout调用的deferred对象
*/
self.logout = logout;
function logout(dontReload)
{
	deleteLoginToken();
	g_data.userInfo = null;
	return self.callSvr("logout", function (data) {
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

/**
@var PageHeaderMenu

页面上方标题栏的右键菜单

扩展示例：

	WUI.PageHeaderMenu.items.push('<div id="reloadUiMeta">刷新Addon</div>');
	WUI.PageHeaderMenu.reloadUiMeta = function () {
		UiMeta.reloadUiMeta();
	}

 */
	// 标题栏右键菜单
	self.PageHeaderMenu = {
		items: [
			'<div id="mnuReload">刷新页面</div>',
			'<div id="mnuReloadDlg">刷新对话框</div>',
			'<div id="mnuBatch">批量模式</div>'
		],

		// 处理函数
		mnuReload: function () {
			self.reloadPage();
			self.reloadDialog(true);
		},
		mnuReloadDlg: function () {
			var jdlg = self.isBatchMode()? true: null;
			self.reloadDialog(jdlg);
		},
		mnuBatch: function () {
			console.log(this);
			self.toggleBatchMode();
		}
	};

	var jmenu = null;
	function onSpecial(ev) {
		if (jmenu == null) {
			jmenu = $('<div>' + self.PageHeaderMenu.items.join('') + '</div>');
			jmenu.menu({
				onClick: function (mnuItem) {
					self.PageHeaderMenu[mnuItem.id].call(mnuItem);
				}
			});
		}

		jmenu.menu('show', {left: ev.pageX, top: ev.pageY});
		return false;
	}
	// 连续3次点击当前tab标题，或右键点击, 弹出特别菜单, 可重新加载页面等
	self.doSpecial(self.tabMain.find(".tabs-header"), ".tabs-selected", onSpecial, 3);
	self.tabMain.find(".tabs-header").on("contextmenu", ".tabs-selected", onSpecial);

/* datagrid宽度自适应，page上似乎自动的；dialog上通过设置width:100%实现。见enhanceDialog/enhancePage
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
*/

	// 全局resize.dialog事件
	function onResizePanel() {
		//console.log("dialog resize");
		var jo = $(this);
		jo.trigger("resize.dialog");
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
 （注意：在其它页面进行修改操作时，会自动触发markRefresh事件，以便下拉框能自动刷新。）
- (v5.2)加载列表：jo.trigger("loadOptions", param);  一般用于级联列表，即url带参数的情况。(注意：v6起不再使用，改用setOption事件)
- (v6) 重新设置选项：jo.trigger("setOption", opt); 而且仅当点击到下拉框时才会加载选项列表。

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

@param opt {url, jdEnumMap/jdEnumList, formatter, textField, valueField, loadFilter, urlParams, isLoaded_, url_, emptyText}

@param opt.url 动态加载使用的url，或一个返回URL的函数（这时会调用opt.url(opt.urlParams)得到实际URL，并保存在opt.url_中）
所以要取URL可以用

	var opt = WUI.getOptions(jo);
	url = opt.url_ || opt.url;

@param opt.emptyText 设置首个空行（值为null）对应的显示文字。

## 用url选项加载下拉列表

例如，想显示所有员工(Employee)的下拉列表，绑定员工编号字段(id)，显示是员工姓名(name):

	分派给 <select name="empId" class="my-combobox" data-options="url:WUI.makeUrl('Employee.query', {res:'id,name',pagesz:-1})"></select>

(v6)也可以用input来代替select，组件会自动处理.

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

(v5.2) url还可以是一个函数。如果带一个参数，一般用于**动态列表**或**级联列表**。参考后面相关章节。

## 用jdEnumMap选项指定下拉列表

也支持通过key-value列表用jdEnumMap选项或jdEnumList选项来初始化下拉框，如：

	订单状态： <select name="status" class="my-combobox" data-options="jdEnumMap:OrderStatusMap"></select>
	或者：
	订单状态： <select name="status" class="my-combobox" data-options="jdEnumList:'CR:未付款;CA:已取消'"></select>
	或者：(key-value相同时, 只用';'间隔)
	订单状态： <select name="status" class="my-combobox" data-options="jdEnumList:'未付款;已取消'"></select>

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

## 动态列表 - setOption

(v6) url选项使用函数，之后调用loadOptions方法刷新

示例：在安装任务明细对话框(dlgTask)中，根据品牌(brand)过滤显示相应的门店列表(Store).

	var ListOptions = {
		// 带个cond参数，为query接口的查询条件参数，支持 "brand='xxx'" 或 {brand: 'xxx'}两种格式。
		Store: function (cond) {
			var opts = {
				valueField: "id",
				textField: "name",
				url: WUI.makeUrl('Store.query', {
					res: 'id,name',
					cond: cond,
					pagesz: -1
				},
				formatter: function (row) { return row.id + "-" + row.name; }
			};
			return opts;
		}
	};

在明细对话框HTML中不指定options而是代码中动态设置：

	<form>
		品牌 <input name="brand">
		门店 <select name="storeId" class="my-combobox"></select>
	</form>

对话框初始化函数：在显示对话框或修改品牌后刷新门店列表

	function initDlgTask()
	{
		...
		
		$(frm.brand).on("change", function () {
			if (this.value) {
				// 用setOption动态修改设置。注意trigger函数第二个参数须为数组，作为参数传递给用on监听该事件的处理函数。
				$(frm.storeId).trigger("setOption", [ ListOptions.Store({brand: this.value}) ]);
			}
		});

		function onShow() {
			$(frm.brand).trigger("change");
		}
	}

### 动态修改固定下拉列表

(v6) 示例：根据type决定下拉列表用哪个，通过setOption来设置。

	function onBeforeShow(ev, formMode, opt) {
		var type = opt.objParam && opt.objParam.type || opt.data && opt.data.type;

		var comboOpt = type == "入库" ? { jdEnumMap: MoveTypeMap } :
			type == "出库"? { jdEnumMap: MoveTypeMap2 } : null
		jdlg.find("[name=moveType]").trigger("setOption", [comboOpt]);
	}

如果setOption给的参数是null，则忽略不处理。

### 旧方案(不建议使用)

(v5.2起, v6前) url选项使用函数，之后调用loadOptions方法刷新:

	var ListOptions = {
		Store: function () {
			var opts = {
				valueField: "id",
				textField: "name",
				// !!! url使用函数指定, 之后手工给参数调用loadOptions方法刷新 !!!
				url: function (brand) {
					return WUI.makeUrl('Store.query', {
						res: 'id,name',
						cond: "brand='" + brand + "'",
						pagesz: -1
					})
				},
				formatter: function (row) { return row.id + "-" + row.name; }
			};
			return opts;
		}
	};

在明细对话框HTML中：

	<form>
		品牌 <input name="brand">
		门店 <select name="storeId" class="my-combobox" data-options="ListOptions.Store()"></select>
	</form>

对话框初始化函数：在显示对话框或修改品牌后刷新门店列表

	function initDlgTask()
	{
		...
		
		$(frm.brand).on("change", function () {
			if (this.value)
				$(frm.storeId).trigger("loadOptions", this.value);
		});

		function onShow() {
			$(frm.brand).trigger("change");
		}
	}

## 级联列表支持

(v5.2引入, v6使用新方案) 与动态列表机制相同。

示例：缺陷类型(defectTypeId)与缺陷代码(defectId)二级关系：选一个缺陷类型，缺陷代码自动刷新为该类型下的代码。
在初始化时，如果字段有值，下拉框应分别正确显示。

在一级内容切换时，二级列表自动从后台查询获取。同时如果是已经获取过的，缓存可以生效不必反复获取。
双击仍支持刷新。

对话框上HTML如下：（defectId是用于提交的字段，所以用name属性；defectTypeId不用提交，所以用了id属性）

	<select id="defectTypeId" class="my-combobox" data-options="ListOptions.DefectType()" style="width:45%"></select>
	<select name="defectId" class="my-combobox" data-options="" style="width:45%"></select>

defectId上暂时不设置，之后传参动态设置。

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
		Defect: function (typeId) {
			var opts = {
				valueField: "id",
				textField: "code",
				url: WUI.makeUrl('Defect.query', {
					res: 'id,code,name',
					cond: "typeId=" + typeId,
					pagesz: -1
				},
				formatter: function (row) { return row.code + "-" + row.name; }
			};
			return opts;
		}
	}

在对话框上设置关联动作，调用setOption事件：

	$(frm.defectTypeId).on("change", function () {
		var typeId = $(this).val();
		if (typeId)
			$(frm.defectId).trigger("setOption", [ ListOptions.Defect(typeId) ]);
	});

注意jQuery的trigger发起事件函数第二个参数须为数组。

对话框加载时，手工设置defectTypeId的值：

	function onShow() {
		$(frm.defectTypeId).val(defectTypeId).trigger("change");
	}

## 自动感知对象变动并刷新列表

假如某mycombobox组件查询Employee对象列表。当在Employee页面新建、修改、删除对象后，回到组件的页面，点击组件时将自动刷新列表。
(wui-combogrid也具有类似功能)

## 验证要求必填

(v6) my-combobox继承easyui-validatebox，通过添加requried属性来指定必填项，显示时会在字段后自动加红色星号：

	<select name="status" class="my-combobox" data-options="jdEnumMap:OrderStatusMap" required></select>

旧用法（不建议使用）：

	<select name="status" class="my-combobox easyui-validatebox" data-options="jdEnumMap:OrderStatusMap, required:true"></select>

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
		if (jo.attr("required"))
			opts.required = true;
		if (o.tagName != "SELECT") {
			var jo1 = $("<select></select>");
			$.each(o.attributes, function (i,e) {
				jo1.attr(e.name, e.value);
			});
			jo.replaceWith(jo1);
			jo = jo1;
			o = jo1[0];
		}
		jo.removeAttr("data-options");
		jo.addClass("easyui-validatebox");
		jo.validatebox(opts);

		o.enableAsyncFix = true; // 有这个标志的select才做特殊处理
		if (opts.url) {
			if (!jo.attr("ondblclick"))
			{
				jo.off("dblclick").dblclick(function () {
					if (! confirm("刷新数据?"))
						return false;
					refresh();
				});
			}
		}
		jo.on("refresh", refresh);
		jo.on("markRefresh", markRefresh);
		jo.on("loadOptions", function (ev, param) {
			if (param && opts.urlParams != param)
				opts.isLoaded_ = false;
			opts.urlParams = param;
			loadOptions();
		});
		// bugfix: loadOptions中会设置value_, 这将导致无法人工选择空行后保存(由于重写了val()函数，设空后val()实际返回的是value_字段，因其值未变，导致保存时会忽略该字段)
		// 但如果不是人为点击触发的事件则不应清空value_，否则`jo.val(99); jo.trigger("change")`这样的代码将出错，jo.val设置的`value_`值将被jo.trigger清掉。
		jo.change(function (ev) {
			if (! ev.isTrigger)
				this.value_ = "";
		});
		jo.on("setOption", function (ev, opt) {
			if (opt == null)
				return;
			$.extend(opts, opt);
			opts.isLoaded_ = false;
			if (this.value_)
				loadOptions();
		});

		// 在显示下拉列表前填充列表。注意若用click事件则太晚，会有闪烁。
		jo.keydown(function () {
			// 处理只读属性
			if ($(this).attr("readonly"))
				return false;
			loadOptions();
		});
		jo.mousedown(function () {
			loadOptions();
		});

		function loadOptions()
		{
			if (opts.isLoaded_)
				return;
			opts.isLoaded_ = true;
			jo.prop("value_", jo.val()); // 备份val到value_
			jo.empty();
			// 添加空值到首行
			var j1 = $("<option value=''></option>").appendTo(jo);
			if (opts.emptyText)
				j1.text(opts.emptyText);

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
				jo.attr("wui-find-hint", "e"); // 查询时精确匹配
			}

			if (opts.url == null) {
				// 恢复value
				jo.val(jo.prop("value_"));
				return;
			}
			var url = opts.url;
			if ($.isFunction(url)) {
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
					.prop("chooseValue", row)
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
			if (elem.enableAsyncFix && value) {
				$(elem).trigger("loadOptions");
			}
			return hook.set.apply(this, arguments);
		},
		get: function (elem) {
			if (elem.enableAsyncFix)
				return hook.get.apply(this, arguments) || elem.value_;
			return hook.get.apply(this, arguments);
		}
	}
}
mycombobox_fixAsyncSetValue();
//}}}

// ====== WEBCC_END_FILE jquery-mycombobox.js }}}

// Generated by webcc_merge
// vi: foldmethod=marker
