// ====== app shared 

var DEFAULT_SEP = ',';
var g_data = {}; // {userInfo={id,...} }

// ==== defines {{{
var OrderStatusStr = {
	CR: "未付款", 
	PA: "待服务", 
	RE: "已服务", 
	RA: "已评价", 
	CA: "已取消", 
	ST: "正在服务"
};

var ActionStrs = {
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

// 注意：与class "status-info", "status-warning"等保持一致。
var Color = {
	Info: "rgb(190, 247, 190)", // lightgreen,
	Warning: "yellow",
	Error: "rgb(253, 168, 172)", // red;
	Disabled: "#cccccc", // grey
}
//}}}

// ==== app toolkit {{{
// jp: parent dom that contains checkbox and hidden
// sep?=',': the seperate
function checkboxToHidden(jp, sep)
{
	if (sep == null)
		sep = DEFAULT_SEP;
	var val = [];
	jp.find(":checkbox").each (function () {
		if (this.checked) {
			val.push(this.value);
		}
	});
	jp.find("input[type=hidden]").val(val.join(sep));
}

// jp: parent dom that contains checkbox and hidden
function hiddenToCheckbox(jp, sep)
{
	if (sep == null)
		sep = DEFAULT_SEP;
	var val = jp.find("input[type=hidden]").val().split(sep);
	jp.find(":checkbox").each (function () {
		this.checked = val.indexOf(this.value) !== -1;
	});
}

function arrayToImg(jp, arr)
{
	var jImgContainer = jp.find("div.imgs");
	jImgContainer.empty();
	jImgContainer.addClass("my-reset"); // 用于在 查找/添加 模式时清除内容.
	$.each (arr, function (i, thumbId) {
		if (thumbId == "")
			return;
		var url = makeUrl("att", {id: thumbId});
		var linkUrl = makeUrl("att", {thumbId: thumbId});
		var ja = $("<a target='_black'>").attr("href", linkUrl).appendTo(jImgContainer);
		$("<img>").attr("src", url)
			.attr("picId", thumbId)
			.css("max-width", "100px")
			.appendTo(ja);
	});
}

/*
			<tr>
				<td>门店照片</td>  
				<td id="divStorePics">
					<input type="hidden" name="pics">
					<div class="imgs"></div><input type="file" accept="image/*" multiple onchange="onChooseFile.apply(this)">
				</td>  
			</tr> 
*/
// sep?=','
function hiddenToImg(jp, sep)
{
	if (sep == null)
		sep = DEFAULT_SEP;
	var val = jp.find("input[type=hidden]:first").val().split(sep);
	arrayToImg(jp, val);
}

function imgToHidden(jp, sep)
{
	if (sep == null)
		sep = DEFAULT_SEP;
	var val = [];
	jp.find("div.imgs").addClass("my-reset"); // 用于在 查找/添加 模式时清除内容.
	jp.find("img").each(function () {
			// e.g. "data:image/jpeg;base64,..."
			if (this.src.substr(0, 4) === "data") {
				var b64data = this.src.substr(this.src.indexOf(",")+1);
				var url = makeUrl("upload", {fmt: "raw_b64", genThumb: 1, f: "1.jpg", autoResize: 0});
				var ids;
				callSvrSync(url, function (data) {
					val.push(data[0].thumbId);
				}, b64data);
			}
			else {
				var picId = $(this).attr("picId");
				if (picId);
					val.push(picId);
			}
	});
	jp.find("input[type=hidden]").val( val.join(sep));
}

function addTooltip(html, tooltip)
{
	if (tooltip == null || tooltip == "")
		return html;
	return "<span title='" + tooltip + "'>" + html + "</span>";
}

function onChooseFile()
{
	var dfd = $.getScriptWithCache("js/lrz.mobile.min.js");
	var picFiles = this.files;
	var jdiv = $(this).parent().find("div.imgs");

	var onlyOne = $(this).prop("multiple") == false;

	dfd.done(function () {
		$.each(picFiles, function (i, file) {
			lrz(file, {
				width: 1280,
				height: 1280,
				done: function (results) {
					//results.base64
					var jimg;
					if (onlyOne) {
						jimg = jdiv.find("img:first");
						if (jimg.size() == 0) {
							jimg = $("<img>");
						}
					}
					else {
						jimg = $("<img>");
					}
					jimg.attr("src", results.base64)
						.css("max-width", "100px")
						.appendTo(jdiv);
				}
			});
		});
	})
}

function searchField(o, param)
{
	var jdlg = $(o).getAncestor(".window-body");
	var jtbl = jdlg.jdata().jtbl;
	if (jtbl.size() == 0) {
		app_alert("请先打开列表再查询", "w");
		return;
	}
	var queryParams = MyUI.getQueryParam(param);
	if (queryParams.cond == "")
		return;
	MyUI.reload(jtbl, null, queryParams);
}

//}}}

// ==== functions {{{
function setAppTitle(title)
{
	MyApp.title = title;
	if (document.title == "")
		document.title = MyApp.title;
	$(".my-title").html(document.title);
	$("body.easyui-layout").layout("panel", "center").panel({title: "欢迎使用" + MyApp.title});
}

function logout()
{
	deleteLoginToken();
	g_data.userInfo = null;
	callSvr(makeUrl("logout"), function (data) {
		reloadSite();
	});
}
// }}}

// vim: set foldmethod=marker:
