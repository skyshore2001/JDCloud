// ====== app shared 

var DEFAULT_SEP = ',';
var g_data = {}; // {userInfo={id,...} }

$.extend(WUI.options, {
	serverUrl: "../api.php"
});

// ==== defines {{{
var OrderStatusMap = {
	CR: "未付款", 
	PA: "待服务", 
	RE: "已服务", 
	RA: "已评价", 
	CA: "已取消", 
	ST: "正在服务"
};

var ActionMap = {
	CR: "创建",
	PA: "付款",
	RE: "服务完成",
	CA: "取消",
	RA: "评价",
	ST: "开始服务",
	CT: "更改预约时间",
	AS: "派单",
	AC: "接单"
};

var PermMap = {
	emp: "员工",
	mgr: "管理员"
};

// 注意：与class "status-info", "status-warning"等保持一致。
var Color = {
	Info: "rgb(190, 247, 190)", // lightgreen,
	Warning: "yellow",
	Error: "rgb(253, 168, 172)", // red;
	Disabled: "#cccccc" // grey
}
//}}}

// ==== app toolkit {{{
// 生成"年-月-日"格式日期
function dateStr(s)
{
	var dt = WUI.parseDate(s);
	if (dt == null)
		return "";
	return dt.format("D");
}

// 生成"年-月-日 时：分"格式日期
function dtStr(s)
{
	var dt = WUI.parseDate(s);
	if (dt == null)
		return "";
	return dt.format("yyyy-mm-dd HH:MM");
}

function addTooltip(html, tooltip)
{
	if (tooltip == null || tooltip == "")
		return html;
	return "<span title='" + tooltip + "'>" + html + "</span>";
}

/**
@fn searchField(o, param)

在详情页对话框中，以某字段作为查询条件来查询。

@param o 当前对象。一般在onclick事件中调用时，直接填写this.
@param param 查询参数，如 {userPhone: "13712345678"}，可以指定多个参数。

示例：在订单表中，显示用户手机号，边上再增加一个按钮“查询该手机所有订单”，点击就以当前显示的手机号查询所有订单：

	<div id="dlgOrder" my-obj="Ordr" my-initfn="initDlgOrder" title="用户订单" style="padding:20px 40px 20px 40px;width:520px;height:500px;">  
		<form method="POST">
			用户手机号 <input name="userPhone" class="easyui-validatebox" data-options="validType:'usercode'">
			<input class="notForFind" type=button onClick="searchField(this, {userPhone: this.form.userPhone.value});" value="查询该手机所有订单">
		</form>
	</div>

@see WUI.getQueryCond 值支持比较运行符等多种格式，可参考这里定义。
*/
function searchField(o, param)
{
	var jdlg = $(o).closest(".window-body");
	var jtbl = jdlg.jdata().jtbl;
	if (jtbl.size() == 0) {
		app_alert("请先打开列表再查询", "w");
		return;
	}
	var queryParams = WUI.getQueryParam(param);
	if (queryParams.cond == "")
		return;
	WUI.reload(jtbl, null, queryParams);
}

function toggleCol(jtbl, col, show)
{
	jtbl.datagrid(show?"showColumn":"hideColumn", col);
}
//}}}

// ==== functions {{{
function setAppTitle(title)
{
	if (document.title == "")
		document.title = title;
	$(".my-title").html(document.title);
	$("body.easyui-layout").layout("panel", "center").panel({title: "欢迎使用" + title});
}

function logout()
{
	WUI.logout();
}
// }}}

// vim: set foldmethod=marker:
