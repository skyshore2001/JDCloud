// ====== app shared 

var DEFAULT_SEP = ',';
var g_data = {}; // {userInfo={id,...} }

$.extend(WUI.options, {
	serverUrl: "../api.php"
});

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

/**
@fn row2tr(row)
@return jquery tr对象
@param row {\@cols}, col: {useTh?=false, html?, \%css?, \%attr?, \%on?}

根据row结构构造jQuery tr对象。
*/
function row2tr(row)
{
	var jtr = $("<tr></tr>");
	$.each(row.cols, function (i, col) {
		var jtd = $(col.useTh? "<th></th>": "<td></td>");
		jtd.appendTo(jtr);
		if (col.html != null)
			jtd.html(col.html);
		if (col.css != null)
			jtd.css(col.css);
		if (col.attr != null)
			jtd.attr(col.attr);
		if (col.on != null)
			jtd.on(col.on);
	});
	return jtr;
}

/**
@fn checkboxToHidden(jp, sep?=',')

@param jp  jquery结点
@param sep?=','  分隔符，默认为逗号

用于在对象详情对话框中，以一组复选框(checkbox)来对应一个逗号分隔式列表的字段。
例如对象Employee中有一个“权限列表”字段perms定义如下：

	perms:: List(perm)。权限列表，可用值为: item-上架商户管理权限, emp-普通员工权限, mgr-经理权限。

现在以一组checkbox来在表达perms字段，希望字段中有几项就将相应的checkbox选中，例如值"emp,mgr"表示同时具有emp与mgr权限，显示时应选中这两项。
定义HTML如下：

	<div id="dlgEmployee" my-obj="Employee" my-initfn="initDlgEmployee" title="商户员工">
		...
		<div id="divPerms">
			<input type="hidden" name="perms">
			<label><input type="checkbox" value="item">上架商品管理</label><br>
			<label><input type="checkbox" value="emp" checked>员工:查看,操作订单(默认)</label><br>
			<label><input type="checkbox" value="mgr">商户管理</label><br>
		</div>
	</div>

注意：

- divPerms块中包含一个hidden对象和一组checkbox. hidden对象的name设置为字段名, 每个checkbox的value字段设置为每一项的内部名字。

在JS中调用如下：

	function initDlgEmployee()
	{
		var jdlg = $(this);
		var jfrm = jdlg.find("form");
		jfrm.on("loaddata", function (ev, data) {
			// 显示时perms字段自动存在hidden对象中，通过调用 hiddenToCheckbox将相应的checkbox选中
			hiddenToCheckbox(jfrm.find("#divPerms"));
		})
		.on("savedata", function (ev) {
			// 保存时收集checkbox选中的内容，存储到hidden对象中。
			checkboxToHidden(jfrm.find("#divPerms"));
		});
	}

@see hiddenToCheckbox
*/
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
	jp.find("input:hidden:first").val(val.join(sep));
}

/**
@fn hiddenToCheckbox(jp, sep?=",")

@param jp  jquery结点
@param sep?=','  分隔符，默认为逗号

用于在对象详情对话框中，以一组复选框(checkbox)来对应一个逗号分隔式列表的字段。

@see checkboxToHidden （有示例）
*/
function hiddenToCheckbox(jp, sep)
{
	if (sep == null)
		sep = DEFAULT_SEP;
	var val = jp.find("input:hidden:first").val().split(sep);
	jp.find(":checkbox").each (function () {
		this.checked = val.indexOf(this.value) !== -1;
	});
}

function arrayToImg(jp, arr)
{
	var nothumb = jp.attr('wui-nothumb') !== undefined;
	var nopic = jp.attr('wui-nopic') !== undefined;

	var jImgContainer = jp.find("div.imgs");
	jImgContainer.empty();
	jImgContainer.addClass("my-reset"); // 用于在 查找/添加 模式时清除内容.
	$.each (arr, function (i, attId) {
		if (attId == "")
			return;
		var url = WUI.makeUrl("att", {id: attId});
		var linkUrl = (nothumb||nopic) ? url: WUI.makeUrl("att", {thumbId: attId});
		var ja = $("<a target='_black'>").attr("href", linkUrl).appendTo(jImgContainer);
		if (!nopic) {
			$("<img>").attr("src", url)
				.attr("picId", attId)
				.css("max-width", "100px")
				.appendTo(ja);
		}
		else {
			ja.html(attId);
			jImgContainer.append($("<span> </span>"));
		}
	});
}

/**
@fn hiddenToImg(jp, sep?=",")

用于在对象详情对话框中，展示关联图片字段。图片可以为单张或多张。
除显示图片外，也可以展示其它用户上传的文件，如视频、文本等。

## 显示图片

以下是一个带图片的商户表设计，里面有两个字段picId与pics，一个显示单张图片，一个显示一组图片。

	@Store: id, name, picId, pics

	picId:: Integer. 商户头像。
	pics:: List(Integer). 商户图片列表，格式如"101,102,103".

要显示单张图片，可编写HTML如下：

	<div id="dlgStore" my-obj="Store" title="商户" my-initfn="initDlgStore">
		...
		<tr>
			<td>商户头像</td>
			<td id="divStorePicId">
				<input name="picId" style="display:none">
				<div class="imgs"></div>
				<input type="file" accept="image/*" onchange="onChooseFile.apply(this)">
			</td>
		</tr> 
	</div>

注意：

- 在divStorePicId中，包括一个hidden对象(隐藏的input对象或input[type=hidden]对象)，用于保存原始字段值；一个div.imgs，用于显示图片(其实是缩略图)；一个input[type=file]，用于选择图片。
- 为input[type=file]组件设置onchange方法，以便在选择图片后，压缩图片并显示到div.imgs中。
- 如果不需要压缩缩略图，则可在jp上设置属性 wui-nothumb, 如

		<td id="divStorePicId" wui-nothumb>
		...
		</td>
- 可以有多个hidden对象，该方法只对第一个读写。

@key wui-nothumb

## 显示多张图片

要显示多张图片，可编写HTML如下：

	<tr>
		<td>门店照片</td>
		<td id="divStorePics">
			<input name="pics" style="display:none">
			<div class="imgs"></div>
			<input type="file" accept="image/*" multiple onchange="onChooseFile.apply(this)">
			<p>（图片上点右键，可以删除图片等操作）</p>
		</td>
	</tr>

- 与上面显示单张图片的例子比较，只要将input[type=file]组件设置multiple属性，以便可以一次选择多个图片，
 同时onChooseFile函数会根据是否有该属性，决定添加图片还是覆盖原有图片。

为了可以做删除图片等操作，可以在对话框中再加个右键菜单，比如

	<div id="mnuPics">
		<div id="mnuDelPic">删除图片</div>
	</div>

JS逻辑如下：
	
	function initDlgStore()
	{
		var jdlg = $(this);
		var jmenu = jdlg.find("#mnuPics");
		
		var jfrm = jdlg.find("form");
		jfrm.on("loaddata", function (ev, data) {
			// 加载图片
			hiddenToImg(jfrm.find("#divStorePics"));
			hiddenToImg(jfrm.find("#divStorePicId"));
		})
		.on("savedata", function (ev) {
			// 保存图片
			imgToHidden(jfrm.find("#divStorePics"));
			imgToHidden(jfrm.find("#divStorePicId"));
		});

		// 设置右键菜单，比如删除图片
		var curImg;
		jmenu.menu({
			onClick: function (item) {
				var jimg = $(curImg);
				switch (item.id) {
				case "mnuDelPic":
					jimg.remove();
					break;
				}
			}
		});
		jdlg.on("contextmenu", "img", function (ev) {
			ev.preventDefault();
			jmenu.menu('show', {left: ev.pageX, top: ev.pageY});
			curImg = this;
		});
	}

## 显示视频或其它文件

@key wui-nopic

以上传视频文件为例，HTML代码如下：

	<td>上传素材视频</td>
	<td id="divVideoFile" wui-nopic>
		<input name="attId" style="display:none">
		<div class="imgs"></div>
		<input class="videoFile" type="file">
	</td>
 
通过添加属性"wui-nopic", 在.imgs区域内显示文件链接而非图片。其它JS代码与处理图片无异。

@see imgToHidden
@see onChooseFile
*/
function hiddenToImg(jp, sep)
{
	if (sep == null)
		sep = DEFAULT_SEP;
	var val = jp.find("input:hidden:first").val().split(sep);
	arrayToImg(jp, val);
}

/**
@fn imgToHidden(jp, sep?=",")

用于在对象详情对话框中，展示关联图片字段。图片可以为单张或多张。

会先调用upload(fmt=raw_b64)接口保存所有改动的图片，然后将picId存储到hidden字段中。

@see hiddenToImg 有示例
*/
function imgToHidden(jp, sep)
{
	if (sep == null)
		sep = DEFAULT_SEP;
	var val = [];
	jp.find("div.imgs").addClass("my-reset"); // 用于在 查找/添加 模式时清除内容.
	var nothumb = jp.attr('wui-nothumb') !== undefined;
	var nopic = jp.attr('wui-nopic') !== undefined;
	var doUpdate = false;
	if (! (nothumb||nopic) ) {
		jp.find("img").each(function () {
			doUpdate = true;
			// e.g. "data:image/jpeg;base64,..."
			if (this.src.substr(0, 4) === "data") {
				var b64data = this.src.substr(this.src.indexOf(",")+1);
				var params = {fmt: "raw_b64", genThumb: 1, f: "1.jpg", autoResize: 0};
				var ids;
				callSvrSync("upload", params, function (data) {
					val.push(data[0].thumbId);
				}, b64data);
			}
			else {
				var picId = $(this).attr("picId");
				if (picId);
					val.push(picId);
			}
		});
	}
	else {
		var files = jp.find("input[type=file]")[0].files;
		if (files.length > 0) {
			doUpdate = true;
			var fd = new FormData();
			$.each(files, function (i, e) {
				fd.append('file' + (i+1), e);
			});
			callSvrSync('upload', function (data) {
				$.each(data, function (i, e) {
					val.push(e.id);
				});
			}, fd);
		}
	}
	if (doUpdate)
		jp.find("input:hidden:first").val( val.join(sep));
}

function addTooltip(html, tooltip)
{
	if (tooltip == null || tooltip == "")
		return html;
	return "<span title='" + tooltip + "'>" + html + "</span>";
}

/**
@fn onChooseFile()

与hiddenToImg/imgToHidden合用，在对话框上显示一个图片字段。
在文件输入框中，选中一个文件后，调用此方法，可将图片压缩后显示到指定的img标签中(div.imgs)。

使用lrz组件进行图片压缩，最大宽高不超过1280px。然后以base64字串方式将图片显示到一个img组件中。

TODO: 添加图片压缩参数，图片框显示大小等。

@see hiddenToImg
*/
function onChooseFile()
{
	var jp = $(this).parent();
	var jdiv = jp.find("div.imgs");

	var nopic = jp.attr('wui-nopic') !== undefined;
	if (nopic) {
		jdiv.find("a").html("(待更新)");
		return;
	}

	var nothumb = jp.attr('wui-nothumb') !== undefined;

	var dfd = WUI.loadScript("lib/lrz.mobile.min.js");
	var picFiles = this.files;
	var compress = !nothumb;

	var onlyOne = $(this).prop("multiple") == false;

	dfd.done(function () {
		$.each(picFiles, function (i, file) {
			if (compress) {
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
			}
			else {
				var windowURL = window.URL || window.webkitURL;
				var dataURL = windowURL.createObjectURL(file);
				jimg.attr('src', dataURL);
			}
		});
	})
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

function enhanceMenu()
{
	var MENU_ITEM_HEIGHT = 47;

	var jo = $('#menu');
	jo.find("a").addClass("my-menu-item");
	jo.find(".menu-expand-group").each(function () {
		$(this).find("a:first")
			.addClass("menu-item-head")
			.click(menu_onexpand)
			.append('<i class="fa fa-angle-down" aria-hidden="true"></i>')
			.each(function () {
				if ($(this).hasClass("expanded")) {
					$(this).removeClass("expanded");
					menu_onexpand.call(this);
				}
			});
	});

	// add event handler to menu items
	function menu_onexpand(ev) {
		$(this).toggleClass('expanded');
		var $expandContainer = $(this).next();
		var containerHeight = !$expandContainer.height() && $expandContainer.children().length * MENU_ITEM_HEIGHT || 0;
		$expandContainer.css({
			height: containerHeight + 'px'
		});
	}
}
$(enhanceMenu);

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
