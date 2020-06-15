/**
@module JdcloudExt

框架扩展功能或常用函数.
 */

JdcloudExt.call(window.WUI || window.MUI);
function JdcloudExt()
{
var self = this;

/**
@key .wui-upload

对话框上的上传文件组件。

用于在对象详情对话框中，展示关联图片字段。图片可以为单张或多张。
除显示图片外，也可以展示其它用户上传的文件，如视频、文本等。

预览图样式在style.css中由 `.wui-upload img`定义。
点击一张预览图，如果有jqPhotoSwipe插件，则全屏显示图片且可左右切换；否则在新窗口打开大图。

示例：只需要标注wui-upload类及指定data-options，即可实现图片预览、上传等操作。

	<table>
		<tr>
			<td>上传多图</td>
			<td class="wui-upload">
				<input name="pics">
			</td>
		</tr>
		<tr>
			<td>上传单图</td>
			<td class="wui-upload" data-options="multiple:false">
				<input name="picId">
			</td>
		</tr>
		<tr>
			<td>上传附件</td>
			<td class="wui-upload" data-options="pic:false">
				<input name="atts">
			</td>
		</tr>
	</table>

- 带name组件的input绑定到后端字段，并被自动隐藏。允许有多个带name的input组件，仅第一个input被处理。
- options中可以设置：{ nothumb, pic, fname }

组件会自动添加预览区及文件选择框等，完整的DOM大体如下：

	<div class="wui-upload">
		<input name="atts">
		<div class="imgs"></div>
		<input type="file" multiple>
		<p class="hint"><a href="javascript:;" class="btnEditAtts">编辑</a></p>
	</div>

其中imgs为预览区，内部DOM结构为 `.imgs - a标签 - img或p标签`。
在上传图片或文件后，会在imgs下创建`<a>`标签，对于图片a标签里面是img标签，否则是p标签。
a标签上数据如下：

- attr("attId")为当前图片的缩略图编号，如"100"。如果无该属性，表示尚未上传。
- attr("att")为当前预览图的原始数据。在opt.fname=1时包含文件名，如"100:file1.pdf"。
- prop("fileObj_") 当上传无缩略图图片(opt.nothumb=1)或上传附件(opt.pic=false)时，fileObj_中保存了文件对象，用于之后上传。

在a下的img标签上，有以下数据：

- attr("picId")保存图片缩略图ID。如果无该属性，表示尚未上传。
- prop("picData_")保存图片压缩信息。仅当新选择的图片才有。

@param opt.multiple=true 设置false限制只能选一张图。

@param opt.nothumb=false 设置为true表示不生成缩略图，且不做压缩。

	<td class="wui-upload" data-options="nothumb:true">...</td>

@param opt.pic=true 设置为false，用于上传视频或其它非图片文件

如果为false, 在.imgs区域内显示文件名链接而非图片。

@param opt.fname 上传附件时（pic=true）时保存原文件名。

在opt.pic=true时，默认会保存文件名到字段中。保存的格式为 `List(attId, fileName)` 即"{attId}:{orgName},{attId2}:{orgName2},..."
设置为false只保存文件编号，不保存文件名。

@param opt.manual=false 是否自动上传提交

默认无须代码即可自动上传文件。如果想要手工操控，可以触发submit事件，
示例：在dialog的validate事件中先确认提示再上传，而不是直接上传：

HTML:

	<div class="wui-upload" data-options="manual:true">...</div>

JS:

	jdlg.on("validate", onValidate);
	function onValidate(ev)
	{
		var dfd = $.Deferred();
		app_alert("确认上传?", "q", function () {
			var dfd1 = WUI.triggerAsync(jdlg.find(".wui-upload"), "submit");
			dfd1.then(doNext);
		});
		// dialog的validate方法支持异步，故设置ev.dfds数组来告知调用者等异步操作结束再继续
		ev.dfds.push(dfd.promise());

		function doNext() {
			dfd.resolve();
		}
	}

## 右键菜单

@param opt.menu 设置右键菜单

在预览区右键单击会出现菜单，默认有“删除”菜单。
示例：商品可以上传多张照片，其中选择一张作为商品头像。
我们在右键中添加一个“设置为缺省头像”菜单，点击后将该图片圈出，将其图片编号保存到字段中。
数据结构为：

	@Item: id, picId, pics

上面表Item中，picId为头像的图片ID，pics为逗号分隔的图片列表。

HTML: 在data-options中指定菜单的ID和显示文字。缺省头像将添加"active"类：

	<style>
	.wui-upload img.active {
		border: 5px solid red;
	}
	</style>

	<tr>
		<td>门店照片</td>
		<td class="wui-upload" data-options="menu:{mnuSetDefault:'设置为缺省头像'}">
			<input name="pics">
			<input type="input" style="display:none" name="picId">
		</td>
	</tr>

在右键点击菜单时，wui-upload组件会触发onMenu事件，其中参数item为当前预览项（.imgs区域下的a标签，在它下面才是img或p标签）

	// 在initDlgXXX中：
	jdlg.on("menu", onMenu);
	function onMenu(ev, menuId, item)
	{
		if (menuId == "mnuSetDefault") {
			var ja = $(item);
			if (ja.attr("attId")) {
				ja.closest(".wui-upload").find("img").removeClass("active");
				var jimg = ja.find("img");
				jimg.addClass("active");

				frm = jdlg.find("form")[0];
				frm.picId.value = jimg.attr("picId");
			}
		}
	}
	// 高亮显示选中的头像picId。
	// 注意：要用jdlg而不是jfrm的show事件。否则wui-upload尚未初始化完成
	jdlg.on("show", function (ev, formMode, initData) {
		if (initData && initData.picId) {
			jdlg.find(".wui-upload img[picId=" + initData.picId + "]").addClass("active");
		}
	});
	
## 音频等文件上传

@param opt.accept 指定可上传的文件类型

示例：上传单个音频文件，如m4a, mp3等格式。

	<td>文件</td>
	<td class="wui-upload" data-options="multiple:false,pic:false,accept:'audio/*'">
		<input name="attId">
		<p class="hint">要求格式m4a,mp3,wav; 采样率为16000</p>
	</td>

## 压缩参数

@param opt.maxSize?=1280 指定压缩后图片的最大长或宽
@param opt.quality?=0.8 指定压缩质量, 一般不用修改.

示例：默认1280像素不够, 增加到2000像素:

	<tr>
		<td>图片</td>
		<td class="wui-upload" data-options="maxSize:2000">
			<input name="pics">
		</td>
	</tr>

 */
self.m_enhanceFn[".wui-upload"] = enhanceUpload;

function enhanceUpload(jupload)
{
	var jdlg = jupload.closest(".wui-dialog");
	if (jdlg.size() == 0)
		return;

	var defOpt = {
		multiple: true,
		pic: true,
		manual: false
	};
	var opt = WUI.getOptions(jupload, defOpt);
	if (opt.fname === undefined)
		opt.fname = !opt.pic; // 非图片时，自动保存文件名

	var jname = jupload.find("input[name]:first");
	var jimgs = $('<div class="imgs"></div>');
	var jfile = $('<input type="file">');
	var jedit = $('<p class="hint"><a href="javascript:;" class="btnEditAtts">编辑文本</a> 右键删除</p>');
	jname.after(jimgs, jfile, jedit);

	jupload.css("white-space", "normal");
	jupload.find(".btnEditAtts").click(function () {
		jname.toggle();
	});

	jfile.prop("multiple", opt.multiple);

	if (opt.accept) {
		jfile.attr("accept", opt.accept);
	}
	else if (opt.pic) {
		jfile.attr("accept", "image/*");
	}
	jfile.change(onChooseFile);

	// 右键菜单
	var jmenu = $('<div><div id="mnuDelPic">删除</div></div>');
	if (opt.menu && $.isPlainObject(opt.menu)) {
		$.each(opt.menu, function (k, v) {
			$("<div>").attr("id", k).html(v).appendTo(jmenu);
		});
	}

	var curSel;
	jmenu.menu({
		onClick: function (mnuItem) {
			var mnuId = mnuItem.id;
			jupload.trigger("menu", [mnuId, curSel]);
			switch (mnuItem.id) {
			case "mnuDelPic":
				$(curSel).remove();
				break;
			}
		}
	});
	// a下面有：img-预览图, p-文件名
	jupload.on("contextmenu", ".imgs>a", function (ev) {
		ev.preventDefault();
		jmenu.menu('show', {left: ev.pageX, top: ev.pageY});
		curSel = this;
	});

	jupload.on("submit", onSubmit);

	jdlg.on("show", onShow);
	if (!opt.manual)
		jdlg.on("validate", onValidate);

	function onShow(ev) {
		jname.hide();
		hiddenToImg(jupload);
	}

	function onValidate(ev, mode, oriData, newData) {
		if (mode != FormMode.forAdd && mode != FormMode.forSet)
			return;
		onSubmit(ev);
	}

	function onSubmit(ev) {
		var dfd = imgToHidden(jupload);
		if (ev.dfds && $.isArray(ev.dfds) && dfd && dfd.then)
			ev.dfds.push(dfd);
	}
}

function arrayToImg(jp, arr)
{
	var opt = WUI.getOptions(jp);
	var jImgContainer = jp.find("div.imgs");
	jImgContainer.empty();
	jImgContainer.addClass("my-reset"); // 用于在 查找/添加 模式时清除内容.
	
	$.each (arr, function (i, att) {
		if (!att)
			return;
		var attId,text;
		if (att.indexOf(':') > 0) {
			var arr1 = att.split(':');
			attId = arr1[0];
			text = arr1[1];
		}
		else {
			attId = text = att;
		}
		if (attId == "")
			return;
		var url = WUI.makeUrl("att", {id: attId});
		var linkUrl = (opt.nothumb||!opt.pic) ? url: WUI.makeUrl("att", {thumbId: attId});
		var ja = $('<a target="_blank">').attr({
			"href": linkUrl,
			"att": att,
			"attId": attId
		}).appendTo(jImgContainer);
		if (opt.pic) {
			$("<img>").attr({
					'src': url,
					'picId':attId
				})
				.appendTo(ja);
		}
		else {
			createFilePreview(ja, text);
		}
	});
	// 图片浏览器升级显示
	if (opt.pic && jQuery.fn.jqPhotoSwipe)
		jImgContainer.jqPhotoSwipe({selector:"a"});
}

// 创建<p>标签显示文件名，添加到<a>标签上。<p>标签内有"删除"按钮
function createFilePreview(ja, text)
{
	var jp = $("<p>").text(text).css("margin", "0").appendTo(ja);
	var jx = $("<span style='color:#aaa; margin-left:8px'>[删除]</span>").appendTo(jp);
	jx.click(function () {
		$(this).closest("a").remove();
		return false;
	});
	return jp;
}

function hiddenToImg(jp, sep)
{
	if (sep == null)
		sep = DEFAULT_SEP;
	var val = jp.find("input[name]:first").val();
	var arr = val? val.split(sep) : [];
	arrayToImg(jp, arr);
}

/*
@fn imgToHidden(jp, sep?=",")

用于在对象详情对话框中，展示关联图片字段。图片可以为单张或多张。

如果有文件需要上传, 调用upload接口保存新增加的图片。使用异步上传，返回Deferred对象给dialog的validate事件处理函数。
可显示文件上传进度条。

@see hiddenToImg 有示例
*/
function imgToHidden(jp, sep)
{
	if (sep == null)
		sep = DEFAULT_SEP;
	var val = [];
	jp.find("div.imgs").addClass("my-reset"); // 用于在 查找/添加 模式时清除内容.

	var dfd;
	var ajaxOpt = {
		onUploadProgress: function (e) {
			if (e.lengthComputable) {
				var value = e.loaded / e.total * 100;
				console.log("upload " + value + "% " + (e.loaded/1024).toFixed(1) + "KB/" + (e.total/1024).toFixed(1) + "KB");
				WUI.app_progress(value);
			}
		},
		xhr: function () {
			var xhr = $.ajaxSettings.xhr();
			if (xhr.upload) {
				xhr.upload.addEventListener('progress', this.onUploadProgress, false);
			}
			return xhr;
		}
	};
	var opt = WUI.getOptions(jp);
	if (opt.pic && !opt.nothumb) {
		var fd = new FormData();
		var imgArr = [];
		jp.find("img").each(function (i, e) {
			// e.g. "data:image/jpeg;base64,..."
			if (this.picData_ != null) {
				imgArr.push(this);
				fd.append("file" + imgArr.length, this.picData_.blob, this.picData_.name);
			}
			else {
				var picId = $(this).attr("picId");
				if (picId)
					val.push(picId);
			}
		});
		if (imgArr.length > 0) {
			var params = {genThumb: 1, autoResize: 0};
			dfd = callSvr('upload', params, function (data) {
				$.each(data, function (i, e) {
					val.push(e.thumbId);
					$(imgArr[i]).attr("picId", e.thumbId);
					imgArr[i].picData_ = null;
				});
			}, fd, ajaxOpt);
		}
	}
	else {
		var files = [];
		jp.find(".imgs a").each(function() {
			var att = $(this).attr('att');
			if (att)
				val.push(att);
			if (this.fileObj_)
				files.push(this.fileObj_);
		});
		if (files.length > 0) {
			var fd = new FormData();
			$.each(files, function (i, e) {
				fd.append('file' + (i+1), e);
			});
			var params = {autoResize: 0};
			dfd = callSvr('upload', params, function (data) {
				$.each(data, function (i, e) {
					var att = e.id;
					if (opt.fname) {
						att += ":" + e.orgName.replace(/[:,]/g, '_'); // 去除文件名中特殊符号
					}
					val.push(att);
				});
			}, fd, ajaxOpt);
		}
	}
	if (dfd) {
		dfd.then(done);
		return dfd;
	}
	else {
		done();
	}

	function done() {
		jp.find("input:hidden:first").val( val.join(sep));
	}
}

/*
@fn onChooseFile()

与hiddenToImg/imgToHidden合用，在对话框上显示一个图片字段。
在文件输入框中，选中一个文件后，调用此方法，可将图片压缩后显示到指定的img标签中(div.imgs)。

使用WUI.compressImg组件进行图片压缩，最大宽高不超过1280px。然后以base64字串方式将图片显示到一个img组件中。

TODO: 添加图片压缩参数，图片框显示大小等。

@see hiddenToImg
*/
function onChooseFile(ev)
{
	var jp = $(this).closest(".wui-upload");
	var jdiv = jp.find("div.imgs");
	var opt = WUI.getOptions(jp);
	if (!opt.multiple) {
		jdiv.empty();
	}
	if (!opt.pic) { // 显示附件
		$.each(this.files, function (i, fileObj) {
			console.log(fileObj);
			var ja = $('<a target="_blank">').appendTo(jdiv);
			ja.prop('fileObj_', fileObj);
			createFilePreview(ja, fileObj.name);
		});
		this.value = "";
		return;
	}

	var picFiles = this.files;
	var compress = !opt.nothumb;

	$.each(picFiles, function (i, fileObj) {
		if (compress) {
			var compressOpt = {quality: opt.quality||0.8, maxSize: opt.maxSize||1280};
			WUI.compressImg(fileObj, function (picData) {
				var jimg;
				if (! opt.multiple) {
					jimg = jdiv.find("img:first");
					if (jimg.size() == 0) {
						jimg = null;
					}
				}
				if (jimg == null) {
					jimg = $("<img>");
				}
				jimg.attr("src", picData.b64src)
					.prop("picData_", picData);
				addNewItem(jimg);
			}, compressOpt);
		}
		else {
			var windowURL = window.URL || window.webkitURL;
			var dataURL = windowURL.createObjectURL(fileObj);
			var jimg = $("<img>");
			jimg.attr('src', dataURL);
			var ja = addNewItem(jimg);
			ja.prop("fileObj_", fileObj);
		}
	});
	this.value = "";

	function addNewItem(ji) {
		var ja = $('<a target="_blank">');
		ja.append(ji).appendTo(jdiv);
		ja.attr("href", ji.attr("src"));
		/*
		if (ja.jqPhotoSwipe)
			ja.jqPhotoSwipe();
		*/
		return ja;
	}
}

/**
@key .wui-checkList

用于在对象详情对话框中，以一组复选框(checkbox)来对应一个逗号分隔式列表的字段。
例如对象Employee中有一个“权限列表”字段perms定义如下：

	perms:: List(perm)。权限列表，可用值为: item-上架商户管理权限, emp-普通员工权限, mgr-经理权限。

现在以一组checkbox来在表达perms字段，希望字段中有几项就将相应的checkbox选中，例如值"emp,mgr"表示同时具有emp与mgr权限，显示时应选中这两项。
定义HTML如下：

	<tr>
		<td>权限</td>
		<td class="wui-checkList">
			<input type="hidden" name="perms">
			<label><input type="checkbox" value="emp" checked>员工(默认)</label><br>
			<label><input type="checkbox" value="item">上架商品管理</label><br>
			<label><input type="checkbox" value="mgr">经理</label><br>
		</td>
	</tr>

wui-checkList块中包含一个hidden对象和一组checkbox. hidden对象的name设置为字段名, 每个checkbox的value字段设置为每一项的内部名字。
 */ 
self.m_enhanceFn[".wui-checkList"] = enhanceCheckList;

function enhanceCheckList(jp)
{
	var jdlg = jp.closest(".wui-dialog");
	if (jdlg.size() == 0)
		return;

	var defOpt = {
		sep: ','
	};
	var opt = WUI.getOptions(jp, defOpt);
	var dfd = $.Deferred();
	if (opt.url) {
		var url = opt.url;
		self.assert(opt.valueField && opt.textField, "wui-checkList: 使用url选项，必须设置valueField和textField选项");
		if (m_dataCache[url] === undefined) {
			self.callSvr(url, onLoadOptions);
		}
		else {
			onLoadOptions(m_dataCache[url]);
		}
	}
	else {
		dfd.resolve();
	}
	function onLoadOptions(data) {
		m_dataCache[url] = data;
		applyData(data);
	}
	function applyData(data) {
		var ls = WUI.rs2Array(data);
		$.each(ls, function (i, e) {
			$('<div><label><input type="checkbox" value="' + e[opt.valueField] + '">' + e[opt.textField] + '</label></div>').appendTo(jp);
		});
		dfd.resolve();
	}

	jdlg.on("show", onShow)
		.on("validate", onValidate);

	function onShow(ev) {
		dfd.then(function () {
			hiddenToCheckbox(jp);
		});
	}

	function onValidate(ev, mode, oriData, newData) {
		checkboxToHidden(jp);
	}
}

/*
@fn checkboxToHidden(jp, sep?=',')

@param jp  jquery结点
@param sep?=','  分隔符，默认为逗号
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

/*
@fn hiddenToCheckbox(jp, sep?=",")

@param jp  jquery结点
@param sep?=','  分隔符，默认为逗号
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

/**
@key .wui-labels

标签字段（labels）是空白分隔的一组词，每个词是一个标签（label）。
可以在字段下方将常用标签列出供用户选择，点一下标签则添加到文本框中，再点一下删除它。

	<tr>
		<td>标签</td>
		<td class="wui-labels">
			<input name="label" >
			<p class="hint">企业类型：<span class="labels" dfd="StoreDialog.dfdLabel"></span></p>
			<p class="hint">行业标签：<span class="labels">IT 金融 工业</span></p>
			<p class="hint">位置标签：<span class="labels">一期 二期 三期 四期</span></p>
		</td>
	</tr>

- 最终操作的文本字段是.wui-labels下带name属性的输入框。
- 在.labels中的文本将被按空白切换，优化显示成一个个标签，可以点击。
- 支持异步获取，比如要调用接口获取内容，可以指定`dfd`属性是一个Deferred对象。
- 添加的标签具有`labelMark`类(label太常用，没有用它以免冲突)，默认已设置样式。

异步获取示例：

	var StoreDialog = {
		dfdLabel: $.Deferred()
	}
	callSvr("Conf.query", {cond: "name='企业分类'", fmt: "one", res: "value"}, function (data) {
		StoreDialog.dfdLabel.resolve(data.value);
	})

// TODO: 支持beforeShow时更新
 */ 
self.m_enhanceFn[".wui-labels"] = enhanceLabels;

function enhanceLabels(jp)
{
	var jdlg = jp.closest(".wui-dialog");
	if (jdlg.size() == 0)
		return;

	var doInit = true;
	jdlg.on("beforeshow", onBeforeShow);

	function onBeforeShow() {
		if (! doInit)
			return;
		doInit = false;

		jp.on("click", ".labelMark", function () {
			var label = $(this).text();
			var o = jp.find(":input[name]")[0];
			var str = o.value;
			if (str.indexOf(label) < 0) {
				if (str.length == 0)
					str = label;
				else
					str += ' ' + label;
			}
			else {
				str = str.replace(/\s*(\S+)/g, function (m, m1) {
					if (m1 == label)
						return "";
					return m;
				});
			}
			o.value = str;
		});

		showLabel();
	}

	function showLabel() {
		jp.find(".labels").each(function () {
			var jo = $(this);
			var prop = jo.attr("dfd");
			if (prop) {
				var rv = WUI.evalAttr(jo, "dfd");
				WUI.assert(rv.then, "Property `dfd' MUST be a Deferred object: " + prop);
				rv.then(function (text) {
					handleLabel(jo, text);
				})
			}
			else {
				handleLabel(jo, jo.html());
			}
		});
	}

	function handleLabel(jo, s) {
		if (s && s.indexOf("span") < 0) {
			var spanHtml = s.split(/\s+/).map(function (e) {
				return '<span class="labelMark">' + e + '</span>';
			}).join(' ');
			jo.html(spanHtml);
		}
	}
}

/**
@key #menu

管理端功能菜单，以"menu"作为id:

	<div id="menu">
		<div class="menu-expand-group">
			<a class="expanded"><span><i class="fa fa-pencil-square-o"></i>主数据管理</span></a>
			<div class="menu-expandable">
				<a href="#pageCustomer">客户管理</a>
				<a href="#pageStore">门店管理</a>
				<a href="#pageVendor">供应商管理</a>
			</div>
		</div>
		<!-- 单独的菜单项示例 -->
		<a href="javascript:WUI.showDlg('#dlgImport',{modal:false})"><span><i class="fa fa-pencil-square-o"></i>批量导入</span></a>
		<a href="javascript:showDlgChpwd()"><span><i class="fa fa-user-times"></i>修改密码</span></a>
	</div>

菜单组由menu-expand-group标识，第一个a为菜单组标题，可加"expanded"类使其默认展开。
图标使用font awesome库，由`<i class="fa fa-xxx"></i>`指定，图标查询可参考 http://www.fontawesome.com.cn/faicons/ 或 https://fontawesome.com/icons

 */
function enhanceMenu()
{
	var jo = $('#menu');

	jo.find("a").addClass("my-menu-item");
	jo.find(".menu-expandable").hide();
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
	// set active
	jo[0].addEventListener("click", function (ev) {
		if (ev.target.tagName != "A" || !$(ev.target).is(".my-menu-item:not(.menu-item-head)")<0)
			return;
		jo.find(".my-menu-item").removeClass("active");
		$(ev.target).addClass("active");
	}, true);

	// add event handler to menu items
	function menu_onexpand(ev) {
		$(this).toggleClass('expanded');
		var show = $(this).hasClass('expanded');
		var $expandContainer = $(this).next();
		$expandContainer.toggle(show);
	}
}
$(enhanceMenu);

/**
@key .wui-combogrid

可搜索的下拉列表。
示例：在dialog上，填写门店字段（填写Id，显示名字），从门店列表中选择一个门店。

	<form my-obj="Task" title="安装任务" wui-script="dlgTask.js" my-initfn="initDlgTask">
		<tr>
			<td>门店</td>
			<td>
				<input class="wui-combogrid" name="storeId" data-options="ListOptions.StoreGrid">
			</td>
		</tr>
	</form>

选项定义如下：

	ListOptions.StoreGrid = {
		jd_vField: "storeName",
		panelWidth: 450,
		width: '95%',
		textField: "name",
		columns: [[
			{field:'id',title:'编号',width:80},
			{field:'name',title:'名称',width:120}
		]],
		url: WUI.makeUrl('Store.query', {
			res: 'id,name',
		})
	};

属性请参考easyui-combogrid相关属性。wui-combogrid扩展属性如下:

- jd_vField: 显示文本对应的虚拟字段, 用于初始显示和查询。
- jd_showId: 默认为true. 显示"idField - textField"格式. 设置为false时只显示textField.

在选择一行并返回时，它会触发choose事件：

	var jo = jdlg.find("[comboname=storeId]"); // 注意不是 "[name=storeId]"（原始的input已经变成一个hidden组件，只存储值）
	jo.on("choose", function (ev, row) {
		console.log('choose row: ', row);
		...
	});

在输入时，它会自动以url及参数q向后端发起查询，如`callSvr("Store.query", {res:'id,name', q='1'})`.
在筋斗云后端须支持相应对象的模糊查询(请查阅文档qsearch)。

特别逻辑：

- 在初始化时，由于尚未从后端查询文本，这时显示jd_vField字段的文本。
- 如果输入值不在列表中，且不是数字，将当作非法输入被清空。
- 特别地，在查询模式下（forFind），可以输入任意条件，比如">10", "1-10"等。如果输入的是文本，比如"上海*"，则自动以jd_vField字段进行而非数值编号进行查询。
 */
self.m_enhanceFn[".wui-combogrid"] = enhanceCombogrid;
function enhanceCombogrid(jo)
{
	var opt1 = WUI.getOptions(jo);
	jo.removeAttr("data-options"); // 避免被easyui错误解析
	var jdlg;
	var $dg;
	var doInit = true;

	var opt = $.extend({}, $.fn.datagrid.defaults, {
		delay: 500,
		idField: "id",
		textField: "name",
		jd_showId: true,
		mode: 'remote',
		// 首次打开面板时加载url
		onShowPanel: function () {
			if (doInit && opt1.url) {
				doInit = false;
				$dg.datagrid("options").url = opt1.url;
				$dg.datagrid("reload");
			}
		},
		// 值val必须为数值(因为值对应id字段)才合法, 否则将清空val和text
		onHidePanel: function () {
			var val = jo.combogrid("getValue");
			if (! val)
				return;
			if (jdlg.size() > 0 && jdlg.jdata().mode == FormMode.forFind) {
				if (vfield && /[^\d><=!-,]/.test(val) ) {
					jo.prop("nameForFind", vfield);
				}
				return;
			}
			jo.removeProp("nameForFind");

//			var val1 = jo.combogrid("textbox").val();
			if (! $.isNumeric(val)) {
				jo.combogrid("setValue", "");
			}
			else if (opt.jd_showId) {
				var txt = jo.combogrid("getText");
				if (! /^\d+ - /.test(txt)) {
					jo.combogrid("setText", val + " - " + txt);
				}
			}
			var row = $dg.datagrid("getSelected");
			if (row)
				jo.trigger("choose", [row]);
		},
		// !!! TODO: 解决combogrid 1.4.2的bug. 1.5.2以上已修复, 应移除。
		onLoadSuccess: function () {
			$dg && $.fn.datagrid.defaults.onLoadSuccess.apply($dg[0], arguments);
		}
	}, opt1);

	var vfield = opt.jd_vField;
	var showId = opt.jd_showId;

	// 创建后再指定，这样初始化时不调用接口
	opt.url = null;
	jo.combogrid(opt);
	$dg = jo.combogrid("grid");
// 	if (url) {
// 		$dg.datagrid("options").url = url;
// 	}

/*
	jo.combogrid("textbox").blur(function (ev) {
		var val1 = this.value;
	});
	*/

	jdlg = jo.closest(".wui-dialog");
	if (jdlg.size() == 0)
		return;

	jdlg.on("beforeshow", onBeforeShow);

	function onBeforeShow(ev, formMode, opt) {
		if (formMode == FormMode.forSet && vfield) {
			setTimeout(function () {
				// onShow
				var val = jo.combogrid("getValue");
				if (val != "") {
					var txt = showId? val + " - " + opt.data[vfield]: opt.data[vfield];
					jo.combogrid("setText", txt);
				}
			});
			jo.removeProp("nameForFind");
		}
	}
}

/**
@key .combo-f

支持基于easyui-combo的表单扩展控件，如 combogrid/datebox/datetimebox等, 在使用WUI.getFormData时可以获取到控件值.

示例：可以在对话框或页面上使用日期/日期时间选择控件：

	<input type="text" name="startDt" class="easyui-datebox">
	<input type="text" name="startTm" data-options="showSeconds:false" class="easyui-datetimebox">

form提交时能够正确获取它们的值：
	var d = WUI.getFormData(jfrm); // {startDt: "2019-10-10", startTm: "2019-10-10 10:10"}

而且在查询模式下，日期等字段也不受格式限制，可输入诸如"2019-10", "2019-1-1~2019-7-1"这样的表达式。
*/
self.formItems[".combo-f"] = $.extend({}, self.defaultFormItems, {
	getComboType_: function (jo) {
		var o = jo[0];
		if (! o.comboType) {
			var arr = Object.keys(jo.data()); // e.g. ["combogrid", "combo", "textbox"]
			// console.log(arr);
			for (var i=0; i<arr.length; ++i) {
				if (jo[arr[i]]) {
					o.comboType = arr[i];
					break;
				}
			}
		}
		return o.comboType;
	},
	getName: function (jo) {
		// 取原始名字comboname
		return jo.prop("nameForFind") || jo.attr("comboname");
	},
	setValue: function (jo, val) {
		var type = this.getComboType_(jo);
		jo[type]("setValue", val);
	},
	getValue: function (jo) {
		var type = this.getComboType_(jo);
		return jo[type]("getValue");
	}
});

/*
self.formItems[".combogrid-f"] = $.extend({}, self.defaultFormItems, {
	getName: function (jo) {
		return jo.attr("comboname");
	},
	setValue: function (jo, val) {
		jo.combogrid("setValue", val);
	},
	getValue: function (jo) {
		return jo.combogrid("getValue");
	}
});

self.formItems[".datebox-f"] = $.extend({}, self.defaultFormItems, {
	getName: function (jo) {
		return jo.attr("comboname");
	},
	setValue: function (jo, val) {
		jo.datebox("setValue", val);
	},
	getValue: function (jo) {
		return jo.datebox("getValue");
	}
});

self.formItems[".datetimebox-f"] = $.extend({}, self.defaultFormItems, {
	getName: function (jo) {
		return jo.attr("comboname");
	},
	setValue: function (jo, val) {
		jo.datetimebox("setValue", val);
	},
	getValue: function (jo) {
		return jo.datetimebox("getValue");
	}
});
*/

/**
@fn toggleCol(jtbl, col, show)

显示或隐藏datagrid的列。示例：

	WUI.toggleCol(jtbl, 'status', false);

如果列不存在将出错。
*/
self.toggleCol = toggleCol;
function toggleCol(jtbl, col, show)
{
	jtbl.datagrid(show?"showColumn":"hideColumn", col);
}

/**
@fn toggleFields(jtbl_or_jfrm, showMap)

根据type隐藏datagrid列表或明细页form中的项。示例：

	function toggleItemFields(jo, type)
	{
		WUI.toggleFields(jo, {
			type: !type,
			status: !type || type!="公告",
			tm: !type || type=="活动" || type=="卡券" || type=="停车券",
			price: !type || type=="集市",
			qty: !type || type=="卡券"
		});
	}

列表中调用，控制列显示：pageItem.js

		var type = objParam & objParam.type; // 假设objParam是initPageXX函数的传入参数。
		toggleItemFields(jtbl, type);

明细页中调用，控制字段显示：dlgItem.js

		var type = objParam && objParam.type; // objParam = 对话框beforeshow事件中的opt.objParam
		toggleItemFields(jfrm, type);

 */
self.toggleFields = toggleFields;
function toggleFields(jo, showMap)
{
	if (jo.prop("tagName") == "TABLE") {
		var jtbl = jo;
		$.each(showMap, function (k, v) {
			// 忽略找不到列的错误
			try {
				toggleCol(jtbl, k, v);
			} catch (ex) {
				// console.error('fail to toggleCol: ' + k);
			}
		});
	}
	else if (jo.prop("tagName") == "FORM") {
		var frm = jo[0];
		$.each(showMap, function (k, v) {
			var o = frm[k];
			if (o)
				$(o).closest("tr").toggle(v);
		});
	}
}

function initPermSet(rolePerms)
{
	if (!rolePerms)
		return;

	var permSet = {};
	var rpArr = rolePerms.split(/\s+/);
	$.each (rpArr, function (i, e) {
		var e1 = e.replace(/不可/, '');
		if (e1.length != e.length) {
			permSet[e1] = false;
		}
		else {
			var n = e.indexOf('.');
			if (n > 0)
				permSet[e.substr(0, n)] = true;
			permSet[e] = true;
		}
	});
	console.log('permSet', permSet);
	return permSet;
}

/**
@fn WUI.applyPermission()

@key permission 菜单权限控制

前端通过菜单项来控制不同角色可见项，具体参见store.html中菜单样例。

	<div class="perm-mgr" style="display:none">
		<div class="menu-expand-group">
			<a><span><i class="fa fa-pencil-square-o"></i>系统设置</span></a>
			<div class="menu-expandable">
				<a href="#pageEmployee">登录帐户管理</a>
				...
			</div>
		</div>
	</div>

系统默认使用mgr,emp两个角色。一般系统设置由perm-mgr控制，其它菜单组由perm-emp控制。
其它角色则需要在角色表中定义允许的菜单项。

根据用户权限，如"item,mgr"等，菜单中有perm-xxx类的元素会显示，有nperm-xxx类的元素会隐藏

示例：只有mgr权限显示

	<div class="perm-mgr" style="display:none"></div>

示例：bx权限不显示（其它权限可显示）

	<a href="#pageItem" class="nperm-bx">商品管理</a>

可通过 g_data.hasPerm(perm) 查询是否有某项权限。
 */
self.applyPermission = applyPermission;
function applyPermission()
{
	var perms = g_data.userInfo.perms;
	var rolePerms = g_data.userInfo.rolePerms;

	// e.g. "item,mgr" - ".perm-item, .perm-mgr"
	if (!perms)
		return;
	var sel = perms.replace(/([^, ]+)/g, '.perm-$1');
	var arr = perms.split(/,/);
	if (sel) {
		$(sel).show();
		var sel2 = sel.replace(/perm/g, 'nperm');
		$(sel2).hide();
	}

	g_data.hasRole = g_data.hasPerm = function (perm) {
		return arr.indexOf(perm) >= 0;
/*
		var found = false;
		$.each(arr, function (i, e) {
				if (e == perm) {
					found = true;
					return false;
				}
		});
		return found;
*/	}

	if (rolePerms) {
		g_data.permSet = initPermSet(rolePerms);
		var defaultShow = self.canDo("*", null, false);
		$("#menu .perm-emp .menu-expand-group").each(function () {
			showGroup($(this));
		});

		// 支持多级嵌套
		function showGroup(jo) {
			var t = jo.find("a:first").text(); // 菜单组名称
			var doShowGroup = self.canDo(t, null, defaultShow);
			var doShow = defaultShow;
			jo.find(">.menu-expandable>a").each(function () {
				var t = $(this).text();
				if (WUI.canDo(t, null, doShowGroup)) {
					doShow = true;
					// $(this).show();
				}
				else {
					$(this).hide();
				}
			});
			jo.find(">.menu-expand-group").each(function () {
				if (showGroup($(this)))
					doShow = true;
			});
			if (doShowGroup || doShow) {
				jo.closest(".perm-emp").show();
				return true;
			}
			return false;
		}
	}
}

/**
@fn WUI.fname(fn)

为fn生成一个名字。一般用于为a链接生成全局函数。

	function onGetHtml(value, row) {
		var fn = WUI.fname(function () {
			console.log(row);
		});
		return '<a href="' + fn + '()">' + value + '</a>';
	}

或：

	function onGetHtml(value, row) {
		return WUI.makeLink(value, function () {
			console.log(row);
		});
	}

@see makeLink
 */
window.fnarr = [];
self.fname = fname;
function fname(fn)
{
	fnarr.push(fn);
	return "fnarr[" + (fnarr.length-1) + "]";
}

/**
@fn WUI.makeLink(text, fn)

生成一个A链接，显示text，点击运行fn.
用于为easyui-datagrid cell提供html.

	<table>
		...
		<th data-options="field:'orderCnt', sortable:true, sorter:intSort, formatter:ItemFormatter.orderCnt">订单数/报名数</th>
	</table>

定义formatter:

	var ItemFormatter = {
		orderCnt: function (value, row) {
			if (!value)
				return value;
			return WUI.makeLink(value, function () {
				var objParam = {type: row.type, itemId: row.id};
				WUI.showPage("pageOrder", "订单-" + objParam.itemId, [ objParam ]);
			});
		},
	};

@see fname
 */
self.makeLink = makeLink;
function makeLink(text, fn)
{
	return '<a href="javascript:' + self.fname(fn) + '()">' + text + '</a>';
}

function getObjFromJtbl(jtbl)
{
	if (!jtbl || jtbl.size() == 0 || !jtbl.hasClass("datagrid-f")) {
		console.error("bad datagrid: ", jtbl);
		throw "getObjFromJtbl error: bad datagrid.";
	}
	var url = jtbl.datagrid("options").url;
	var m = url.match(/\w+(?=\.query\b)/);
	return m && m[0];
}

$.extend(self.dg_toolbar, {
	"import": function (ctx) {
		return {text: "导入", "wui-perm": "新增", iconCls:'icon-ok', handler: function () {
			var obj = getObjFromJtbl(ctx.jtbl);
			self.assert(obj, "dg_toolbar.import: 对象未指定，无法导入");
			self.assert(DlgImport, "DlgImport未定义");
			DlgImport.show({obj: obj}, function () {
				WUI.reload(ctx.jtbl);
			});
		}};
	},

	qsearch: function (ctx) {
		var randCls = "qsearch-" + WUI.randChr(4); // 避免有多个qsearch组件时重名冲突
		setTimeout(function () {
			ctx.jpage.find(".qsearch." + randCls).click(function () {
				return false;
			});
			ctx.jpage.find(".qsearch." + randCls).keydown(function (e) {
				if (e.keyCode == 13) {
					$(this).closest(".l-btn").click();
				}
			});
		});
		return {text: "<input style='width:8em' class='qsearch " + randCls + "'>", iconAlign:'right', iconCls:'icon-search', handler: function () {
			var val = $(this).find(".qsearch").val();
			WUI.reload(ctx.jtbl, null, {q: val});
		}};
	}
});

}
