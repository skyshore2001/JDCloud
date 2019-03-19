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
