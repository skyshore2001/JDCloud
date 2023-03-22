/**
@module dlgReportCond

	DlgReportCond.show(onOk, meta?, inst?);

- onOk(data): 回调函数
- meta: 用于追加动态字段, 参考WUI.showDlgByMeta
- inst: 实例名，与meta配合使用，不同场景配不同meta.

用于显示查询对话框，默认包含tm1, tm2字段对应用户输入的开始、结束时间。
可以用WUI.getQueryCond生成查询条件，它支持任意一个字段为空的情况下也能生成正确的条件表达式。

	DlgReportCond.show(function (data) {
		var cond = WUI.getQueryCond({tm: [data.tm1, data.tm2]});
		console.log(data, cond); // 示例: data={tm1: "2021-1-1 8:00", tm2: ""}, cond="tm>='2021-1-1 8:00'"
	})

也可以增加自定义字段：

	var meta = [
		// title, dom, hint?
		{title: "状态", dom: '<select name="status" class="my-combobox" data-options="jdEnumMap:OrderStatusMap"></select>'},
		{title: "订单号", dom: "<textarea name='param' rows=5></textarea>", hint: '每行一个订单号'}
	];
	DlgReportCond.show(function (data) {
		console.log(data); // data中增加了status和param字段(如果没有填写则没有)
		var cond = WUI.getQueryCond({tm: [data.tm1, data.tm2], status: data.status, param: data.param});
		console.log(cond);
	}, meta)

如果有多个不同的使用场景，对应的自定义字段不同，可以指定实例名来实现，如订单和工单的查询条件有些不同，可分开写：

	DlgReportCond.show(function (data) {
		console.log(data);
	}, meta1, "订单");

	DlgReportCond.show(function (data) {
		console.log(data);
	}, meta2, "工单");

如果完全自定义对话框（连默认的日期选项也不要），可直接使用[showDlgByMeta](api_web.html#showDlgByMeta)：

	var meta = [
		{title: "序列号", dom: '<input name="code" class="easyui-validatebox" required>'}
	];
	WUI.showDlgByMeta(meta, {modal:false, reset:false, title: "设备生命周期", onOk: async function (data) {
		var pageFilter = {cond: data};
		WUI.showPage("pageSn", {title: "设备生命周期-工件!", pageFilter: pageFilter});
	}});

示例2: 对话框上面有计划日期、硫化区域、尺寸三个定制字段，其中计划日期是日期字段，通过`{data: {dt: xxx}}`为它指定初始值；
“硫化区域”是个下拉框，使用my-combobox组件，通过jdEnumMap指定下拉列表项。在onOk回调中生成查询url并以pageSimple来显示。
在onInitGrid中定制了工具栏，dgOpt.toolbar置空表示不要工具栏了。

```javascript
window.MachineMap = {
	"~B*": "B区",
	"~R*": "C区",
	"~D*": "D区"
};
var meta = [
	{title: "计划日期", dom: '<input name="dt" class="easyui-datebox" required>'},
	{title: "硫化区域", dom: '<input name="machine" class="my-combobox" data-options="jdEnumMap: MachineMap">'},
	{title: "尺寸", dom: '<input name="size">'}
];
var dt = new Date().addDay(-1); // 默认前1天
WUI.showDlgByMeta(meta, {modal:false, title: "生产计划查询", data: {dt: dt.format("yyyy-mm-dd")}, onOk: function (data) {
	var url = WUI.makeUrl("Plan.query", data);
	WUI.showPage("pageSimple", "生产计划!", [url, null, onInitGrid]);
}});

function onInitGrid(jpage, jtbl, dgOpt, columns, data) {
	// 列表页不显示工具栏
	dgOpt.toolbar = null;
}
```

@see showDlgByMeta
 */
function initDlgReportCond()
{
	var jdlg = $(this);
	var jfrm = jdlg;
	var frm = jfrm[0];

	var txtTmRange = jdlg.find(".cboTmRange");
	txtTmRange.change(function () {
		var range = WUI.getTmRange(this.value);
		if (range) {
			WUI.setFormData(jfrm, {tm1: range[0], tm2: range[1]});
		}
	});
	jdlg.on("show", onShow);

	function onShow() {
		txtTmRange.change();
	}
}

