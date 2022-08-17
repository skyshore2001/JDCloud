// ====== app shared 

var DEFAULT_SEP = ',';
var g_data = {}; // {userInfo={id,...} }

$.extend(WUI.options, {
	serverUrl: "../api.php"
});

// ==== defines {{{
var CinfList = [
//	{ name: "faultLabel", text: "faultLabel(不良品标签)", dscr: "空格分隔的一组标签，如<code>标签1 标签2</code>" },
];

var OrderStatusMap = {
	CR: "新创建", 
	PA: "待服务", 
	RE: "已完成", 
	RA: "已评价", 
	CA: "已取消", 
	ST: "正在服务"
};

var PermMap = {
	mgr: "最高管理员",
	emp: "管理员"
};

// 注意：与class "status-info", "status-warning"等保持一致。
var Color = {
	Info: "#bef7be", // lightgreen,
	Warning: "#FFFF68",
	Error: "#ff9999", // red;
	Disabled: "#dddddd" // grey
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
//}}}

// ==== functions {{{
function setAppTitle(title, logo, icon)
{
	document.title = title;
	$(".my-title").html(title);
	$(".header-bar .header-bar_name").html(title);
	if (logo) {
		$(".header-bar .header-bar_logo").attr("src", logo);
	}
	if (icon) {
		$("link[rel=icon]").attr("href", icon);
	}
}

function logout()
{
	WUI.logout();
}
// }}}

// vim: set foldmethod=marker:
