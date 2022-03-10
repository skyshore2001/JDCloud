/**
@module pageTab 一个多Tab页面

- showPageOpt: {tabs?="100%"}

在一个页面中显示一个或多个Tabs组件（如果有多个Tabs，支持上下或左右排列），每个Tabs又可放置多个独立的页面，即：

	<tabsA>
	`- <tabA1-page1> <tabA2-page2>

	<tabsB>
	`- <tabB1-page3> <tabB2-page4>

用法示例：

	// 显示1个tabs组件，id为"设备生命周期_1"(之后showPage要用); title加"!"后缀表示再次打开时刷新该页面
	WUI.showPage("pageTab", "设备生命周期!"); 

	// 两个tabs组件，上下各50%，每个tabs的id分别为"设备生命周期_1"和"设备生命周期_2"(之后showPage要用)
	WUI.showPage("pageTab", {title: "设备生命周期!", tabs: "50%,50%"});

	// 两个tabs，左右各50%
	WUI.showPage("pageTab", {title: "设备生命周期!", tabs: "50%|50%"});

在指定的Tabs中显示页面可以用：

	// 在第1个Tabs中显示页面, 用target参数指定tabs
	WUI.showPage("pageSn", {target: "设备生命周期_1"} );

	// 在第1个tabs中再显示1个页面
	var url = WUI.makeUrl("Ordr.query", {
		gres:"y 年,m 月, userId",
		res:"userName 客户, COUNT(*) 订单数, SUM(amount) 总金额",
		hiddenFields: "userId",
		orderby: "总金额 DESC"
	});
	WUI.showPage("pageSimple", {target: "设备生命周期_1", title:"订单月报表!"}, [url]);

	// 在第2个Tabs中显示页面
	WUI.showPage("pageUi", {target: "设备生命周期_2", uimeta: "售后工单"}); 

注意：target以pageTab指定的title开头，再加上"_1"等后缀；
特别地，若title中含有空格、"-"等符号，则只取符号前的字符。
比如title="工单 - 1"，则target可以用"工单_1"或"工单_2"；而title="工单1"时，target可以用"工单1_1", "工单1_2"
*/
function initPageTab(opt)
{
	var jpage = $(this);
	if (!opt.tabs)
		opt.tabs = "100%";
	var arr = opt.tabs.split(/[,|]/);
	var dir = ",";
	if (opt.tabs.indexOf("|") > 0)
		dir = "|";

	var id0 = jpage.attr("title").replace(/[ ()\[\]\/\\,<>.!@#$%^&*-+].*$/, "");
	$.each(arr, function (i, e) {
		var id = id0 + "_" + (i+1);
		if (dir == ",") {
			var code = WUI.applyTpl('<div id="{id}" class="easyui-tabs" style="width:100%;height:{height}">', {id: id, height: e});
		}
		else {
			var code = WUI.applyTpl('<div id="{id}" class="easyui-tabs" style="width:{width};height:100%;float:left">', {id: id, width: e});
		}
		var jo = $(code).appendTo(jpage);
		jo.tabs();
	});
}
