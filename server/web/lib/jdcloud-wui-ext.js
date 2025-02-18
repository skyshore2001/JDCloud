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
			<td class="wui-upload" data-options="pic:false,fname:'attName'"> <!-- v5.5: 显示使用虚拟字段attName,须后端提供,也可以用 fname=1将显示内容保存到atts字段 -->
				<input name="atts">
			</td>
		</tr>
		<tr>
			<td>上传单个附件</td>
			<td class="wui-upload" data-options="multiple:false,pic:false,fname:'attName'">
				<input name="attId">
			</td>
		</tr>
	</table>

- 带name组件的input绑定到后端字段，并被自动隐藏。允许有多个带name的input组件，仅第一个input被处理。
- options中可以设置：{ nothumb, pic, fname  }

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

@param opt.nothumb=false 设置为true表示不生成缩略图，且不做压缩（除非指定maxSize参数，这时不生成缩略图，但仍然压缩）。

	<td class="wui-upload" data-options="nothumb:true">...</td>

@param opt.pic=true 设置为false，用于上传视频或其它非图片文件

如果为false, 在.imgs区域内显示文件名链接而非图片。

@param opt.fname 是否显示文件名。默认为0。目前不用于图片，只用于附件（即pic=false时有效）。

(v5.5) 

- 当值为0时，字段只保存文件编号或编号列表，如"100", "100,101"。
- 当值为1时，字段保存文件编号及文件名（可当备注使用），如"100:合同.docx", "100:合同.docx,101:合同附件.xlsx"
- 还可以指定一个虚拟字段名，表示字段虽然只保存编号，但显示时可使用指定的虚拟字段，且其格式与fname=1时相同。这样看到的效果与fname=1类似。

示例：用attId字段保存单个附件，并显示附件名

由于attId是数值字段，不可存额外字符串信息，所以不能设置fname=1。
这时在后端做一个虚拟字段如attName，格式为"{attId}:{fileName}":

		protected $vcolDefs = [
			[
				"res" => ["concat(att.id,':',att.orgName) attName"],
				"join" => "LEFT JOIN Attachment att ON att.id=t0.attId",
				"default" => true
			]
			...
		];

列表页中展示使用虚拟字段attName而非attId：

			<th data-options="field:'attName', formatter:Formatter.atts">模板文件</th>

在详情对话框中指定fname为虚拟字段"att"：

			<td>模板文件</td>
			<td class="wui-upload" data-options="multiple:false,pic:false,fname:'attName'">
				<input name="attId">
			</td>

示例：用atts存多个附件。

这时，可设置fname=1，即把文件名也存到atts字段。
也可以设置fname='attName'(虚拟字段)，其格式为"{attId}:{filename},{attId2}:{filename2}"，后端实现参考如下(使用find_in_set)：

			[
				"res" => ["(SELECT group_concat(concat(att.id,':',att.orgName)) FROM Attachment att WHERE find_in_set(id, t0.atts)) attName"],
				"default" => true
			]

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

## 动态设置选项

示例：在dialog的beforeshow事件回调中，根据情况设置upload组件的选项，如是否压缩图片：

	// function initDlgXXX
	//
	jdlg.on("beforeshow", onBeforeShow);
	
	function onBeforeShow(ev, formMode, opt) 
	{
		var objParam = opt.objParam;
		var jo = jpage.find(".picId");
		// 获取和动态设置选项：
		var uploadOpt = WUI.getOptions(jo);
		uploadOpt.nothumb = (objParam.type === "A");
	}

 ## 定制上传接口

 - opt.onGetQueryParam: Function() -> {ac?, ...} 定义上传接口名和接口参数。
 - opt.onGetData: Function(ret)  处理接口返回结果ret。

 示例：调用`upload1(resource, version) -> [{id, ..., url}]` 接口。
 该接口扩展了默认的upload接口，需要传入resource等参数，返回的url字段需要设置到form相应字段上。

	// function initDlgVersion
	var jo = jdlg.find(".uploadFile");
	var uploadOpt = WUI.getOptions(jo);
	uploadOpt.onGetQueryParam = function () {
		return {
			ac: "upload1",
			resource: $(frm.resourceId).val(),
			version: $(frm.name).val()
		}
	}
	uploadOpt.onGetData = function (ret) {
		var resUrl = ret[0].url;
		$(frm.url).val(resUrl);
	}

## 存储小图还是大图

jdcloud传统风格是在上传图片后(upload接口)，存储返回的小图编号(thumbId), 通过att(thumbId)访问大图。

WUI.options.useNewThumb=1时为新风格，即存储upload接口返回的大图编号(id)，通过att(id, thumb=1)访问小图。

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
		manual: false,
		fname: 0
	};
	var opt = WUI.getOptions(jupload, defOpt);

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
	if (jupload.attr("disabled")) {
		jupload.gn().setDisabled(true);
	}

	jdlg.on("show", onShow);
	if (!opt.manual)
		jdlg.on("validate", onValidate);

	function onShow(ev, formMode, initData) {
		jname.hide();
		var val = null;
		if (opt.fname == 0 || opt.fname == 1) {
			val = jupload.find("input[name]:first").val();
		}
		else {
			val = initData && initData[opt.fname];
		}
		var sep = DEFAULT_SEP;
		var arr = val? val.split(sep) : [];
		arrayToImg(jupload, arr);
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
			text = att;
			if (/^\d+$/.test(att))
				attId = att;
		}
		if (attId) {
			var url = WUI.makeUrl("att", {id: attId});
			var linkUrl = (opt.nothumb||!opt.pic) ? url: 
				(WUI.options.useNewThumb? WUI.makeUrl("att", {id: attId}): WUI.makeUrl("att", {thumbId: attId}));
		}
		else {
			var url = '../' + att;
			var linkUrl = url;
		}
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

/*
@fn imgToHidden(jp, sep?=",")

用于在对象详情对话框中，展示关联图片字段。图片可以为单张或多张。

如果有文件需要上传, 调用upload接口保存新增加的图片。使用异步上传，返回Deferred对象给dialog的validate事件处理函数。
可显示文件上传进度条。

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
			dfd = callUpload(params, fd, function (data) {
				$.each(data, function (i, e) {
					if (WUI.options.useNewThumb) {
						val.push(e.id); // 存大图
					}
					else {
						val.push(e.thumbId); // 存小图
					}
					$(imgArr[i]).attr("picId", e.thumbId);
					imgArr[i].picData_ = null;
				});
			});
		}
	}
	else {
		var files = [];
		jp.find(".imgs a").each(function() {
			var att = $(this).attr(opt.fname==1? 'att': 'attId'); //=1时保存文件名到字段中。
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
			dfd = callUpload(params, fd, function (data) {
				$.each(data, function (i, e) {
					var att = e.id;
					if (opt.fname == 1) {
						att += ":" + e.orgName.replace(/[:,]/g, '_'); // 去除文件名中特殊符号
					}
					val.push(att);
				});
			});
		}
	}
	if (dfd) {
		dfd.then(done);
		return dfd;
	}
	else {
		done();
	}

	function callUpload(params, fd, api_upload) {
		var ac = 'upload';
		if (opt.onGetQueryParam) {
			params = opt.onGetQueryParam();
			if (params.ac) {
				ac = params.ac;
				delete params.ac;
			}
		}
		var dfd = callSvr(ac, params, function (data) {
			api_upload && api_upload.call(this, data);
			opt.onGetData && opt.onGetData(data);
		}, fd, ajaxOpt);
		return dfd;
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
	var compress = ! (opt.nothumb && opt.maxSize === undefined);

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

self.getFormItemExt["wui-upload"] = function (ji) {
	if (ji.hasClass("wui-upload")) {
		return new UploadFormItem(ji);
	}
	if (ji.parent().hasClass("wui-upload")) {
		return new UploadFormItem(ji.parent());
	}
}

function UploadFormItem(ji) {
	WUI.FormItem.call(this, ji);
	this.jvalue = ji.find("[name]:first");
}
UploadFormItem.prototype = $.extend(new WUI.FormItem(), {
	getName: function () {
		return this.jvalue.attr("name");
	},
	getDisabled: function () {
		return this.jvalue.prop("disabled");
	},
	setDisabled: function (val) {
		this.jvalue.prop("disabled", val);
		this.updateShow_();
	},
	getReadonly: function () {
		return this.jvalue.prop("readonly");
	},
	setReadonly: function (val) {
		this.jvalue.prop("readonly", val);
		this.updateShow_();
	},
	getValue: function () {
		return this.jvalue.val();
	},
	setValue: function (val) {
		this.jvalue.val(val);
	},
	getShowbox: function () {
		return $();
	},

	updateShow_: function () {
		var show = !this.getDisabled() && !this.getReadonly();
		this.jvalue.next(".imgs").nextAll().toggle(show);
	}
});

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

一般会在字段下方将常用标签列出供用户选择，点一下标签则追加到文本框中，再点一下删除该标签项。多个标签以空格分隔。

(v6) 可以设置选项opt.simple=true，这时如果单击一个标签，则直接填写（而不是追加）到文本框中，类似于单选。

示例1：列出各种类型，点一下类型标签就追加到对话框，再点一下会删除该项。

	<tr>
		<td>标签</td>
		<td class="wui-labels">
			<input name="label" >
			<p class="hint">企业类型：<span class="labels" dfd="DlgStoreVar.onGetLabel()"></span></p>
			<p class="hint">行业标签：<span class="labels">IT 金融 工业</span></p>
			<p class="hint">位置标签：<span class="labels">一期 二期 三期 四期</span></p>
		</td>
	</tr>

具有CSS类"labels"的组件，内容以空白分隔的多个标签，如`IT 金融 工业"。

- 最终操作的文本字段是.wui-labels下带name属性的输入框（或是指定有CSS类`wui-labelTarget`的输入框）。
- 在.labels中的文本将被按空白切换，优化显示成一个个标签，可以点击。
- 支持异步获取，比如要调用接口获取内容，可以指定`dfd`属性是一个Deferred对象。
- 添加的标签具有`labelMark`类(label太常用，没有用它以免冲突)，默认已设置样式，可以为它自定义样式。

本例中dfd属性"DlgStoreVar.onGetLabel()"是个函数调用，它返回的是一个Deferred对象，这样可以实现异步获取再设置标签列表，示例：（在dlgStore.js中）

	function initDlgStore() {
		// 按惯例，只被Xx页面使用的变量可放在dlgXx.js中的DlgXxVar中，而会被其它页面调用的变量则放在全局应用store.js中的DlgXx中（称为页面接口）。
		window.DlgStoreVar = {
			onGetLabel: function () {
				var dfd = $.Deferred();
				callSvr("Conf.query", {cond: "name='企业分类'", fmt: "one", res: "value"}, function (data) {
					DlgStoreVar.dfdLabel.resolve(data.value);
				})
				return dfd;
			}
		};
		...
	}

上面的DlgStoreVar.onGetLabel也可以直接返回标签列表，如：

		window.DlgStoreVar = {
			onGetLabel: function () {
				return "标签1 标签2";
			}
		}

在第一次打开页面时会调用onGetLabel函数，设置标签列表。

(v6) 如果想每次打开页面都调用，只需要稍加修改，直接为dfd指定函数`DlgStoreVar.onGetLabel`（而不是函数调用后的返回值`DlgStoreVar.onGetLabel()`）：

		<p class="hint">企业类型：<span class="labels" dfd="DlgStoreVar.onGetLabel"></span></p>

(v6) 示例1-1：可以为不良品(Fault)设置标签，可通过系统配置项"Cinf.faultLabel"来配置可用的标签，即后端提供`Cinf.getValue({name: "faultLabel"})`接口获取可用标签列表（以空格分隔）

在dlgFault.html中设置标签字段：

		<tr>
			<td>标签</td>
			<td class="wui-labels">
				<input name="label">
				<p class="hint"><span class="labels" dfd="DlgFaultVar.onGetLabel"></span></p>
			</td>
		</tr>

注意dfd属性直接指定为函数`DlgFaultVar.onGetLabel`，也就是每次打开页面都会执行它：这意味着当修改系统配置项`faultLabel`后，无须刷新系统，重新打开不良品对话框就可以点选新标签了。

在dlgFault.js中定义动态获取标签：

	window.DlgFaultVar = {
		onGetLabel: function () {
			return callSvr("Cinf.getValue", {name: "faultLabel"});
		}
	}

注意：函数里比上例简化了很多，因为callSvr返回是就是Defered对象，而且由于`Cinf.getValue`接口刚好返回的数据格式就是"标签1 标签2"字符串，所以不用再新建一个Defered对象在处理格式转换后做resolve了。

示例2：设置配置项，并配以说明和示例

	<tr>
		<td>配置项名称</td>
		<td class="wui-labels">
			<input name="name" class="easyui-validatebox" required>
			<div class="hint">可选项和示例值：
				<p class="easyui-tooltip" title="在移动端提交缺陷问题时，可从下拉列表中选择问题类型，就是在此处配置的，多个值以英文分号分隔。"><span class="labels">常见问题</span> 内饰;轮胎</p>
				<p class="easyui-tooltip" title="多个值以英文空格分隔"><span class="labels">集市品类</span> 办公用品 书籍 卡票券</p>
				<p class="easyui-tooltip" title="格式为`姓名,电话`"><span class="labels">会议室预订联系人</span> Candy,13917091068</p>
			</div>
		</td>
	</tr>

示例3：(v6) 推荐项为单选(simple模式)，且标签可以显示(text)与实际值(value)不同。

		<tr>
			<td>URL地址</td>
			<td class="wui-labels" data-options="simple:true">
				<input name="url" value="http://oliveche.com/mes/">
				<p class="hint">
					<span class="labels">生产环境|http://192.168.10.23/mes/ 测试|http://oliveche.com/mes/</span>
				</p>
			</td>
		</tr>

- 设置组件选项(data-options内)simple为true
- 每项标签的格式为"text|value?"(前面例子也适用)，如"生产环境|http://192.168.10.23/mes/"表示显示"生产环境"，但点击后取值为"http://192.168.10.23/mes/"。
 */ 
self.m_enhanceFn[".wui-labels"] = enhanceLabels;

function enhanceLabels(jp)
{
	var jdlg = jp.closest(".wui-dialog");
	if (jdlg.size() == 0)
		return;

	var defOpt = {
		simple: false,
	};
	var opt = WUI.getOptions(jp, defOpt);

	var doInit = true;
	jdlg.on("beforeshow", onBeforeShow);

	jp.on("click", ".labelMark", function () {
		var label = $(this).attr("value");
		var o = jp.find(":input[name],.wui-labelTarget")[0];
		if (opt.simple) {
			o.value = label;
			return;
		}
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

	function onBeforeShow() {
		if (! doInit && ! opt.doUpdate)
			return;
		doInit = false;
		showLabel();
	}

	function showLabel() {
		jp.find(".labels").each(function () {
			var jo = $(this);
			var prop = jo.attr("dfd");
			if (prop) {
				var rv = WUI.evalAttr(jo, "dfd");
				if ($.isFunction(rv)) {
					doInit = true; // NOTE: 只要设置是Function则每次打开页面都会初始化
					rv = rv();
				}
				if (rv.then) {
					rv.then(function (text) {
						handleLabel(jo, text);
					})
				}
				else {
					handleLabel(jo, rv);
				}
			}
			else {
				handleLabel(jo, jo.html());
			}
		});
	}

	function handleLabel(jo, s) {
		if (s && s.indexOf("span") < 0) {
			var spanHtml = s.split(/\s+/).map(function (e) {
				var a = e.split('|');
				var text = a[0], value = (a[1]||a[0]);
				return '<span class="labelMark" value="' + value + '">' + text + '</span>';
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
		<a href="javascript:;" onclick="WUI.showDlg('#dlgImport',{modal:false})"><span><i class="fa fa-pencil-square-o"></i>批量导入</span></a>
		<a href="javascript:;" onclick="showDlgChpwd()"><span><i class="fa fa-user-times"></i>修改密码</span></a>
	</div>

菜单组由menu-expand-group标识，第一个a为菜单组标题，可加"expanded"类使其默认展开。
图标使用font awesome库，由`<i class="fa fa-xxx"></i>`指定，图标查询可参考 http://www.fontawesome.com.cn/faicons/ 或 https://fontawesome.com/icons

 */
self.enhanceMenu = enhanceMenu;
function enhanceMenu()
{
	var jo = $('#menu');

	jo.find("a").addClass("my-menu-item");
	jo.find(".menu-expand-group").each(function () {
		var ji = $(this);
		if (ji.hasClass("wui-enhanced"))
			return;
		ji.find(".menu-expandable").hide();
		ji.addClass("wui-enhanced");
		ji.find("a:first")
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
	if (jo.hasClass("wui-enhanced"))
		return;
	jo.addClass("wui-enhanced");
	jo.find("a").each(function () {
		if (! $(this).attr("wui-perm")) {
			$(this).attr("wui-perm", $(this).text().trim());
		}
	});
	WUI.enhanceLang(jo.find("a, a span"));

	// set active
	jo[0].addEventListener("click", function (ev) {
		var ji = $(ev.target).closest(".my-menu-item:not(.menu-item-head)");
		if (ji.size() == 0)
			return;
		jo.find(".my-menu-item.active").removeClass("active");
		ji.addClass("active");
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
@fn getMenuTree(jo=$("#menu")|opt)

- jo: 菜单对象，默认为 $("#menu")。
- opt.filter: `fn(e) -> e` 用于调整返回对象结构。

返回主菜单的树型数组：[ {name, perm, @children} ]，可通过opt.filter来修改返回结构。

可以用tree组件展示，如：

	// 转为 [{text, children}] 结构
	var tree = WUI.getMenuTree({
		filter: function (e) {
			var text = e.name;
			if (e.name != e.perm)
				text += "(" + e.perm + ")";
			return { text: text, children: e.children }
		}
	});
	jo.tree({
		data: tree,
		checkbox: true
	});

可以用treegrid组件展示，如：

	var tree = WUI.getMenuTree();
	jtbl.treegrid({
		data: tree,
		idField: "name",
		treeField: "name",
		checkbox: true,
		columns:[[
			{title:'菜单项',field:'name',formatter: function (v, row) {
				if (v == row.perm)
					return v;
				return v + "(" + row.perm + ")";
			}},
		]]
	});
 */
self.getMenuTree = getMenuTree;
function getMenuTree(jo, arr, opt)
{
	if ($.isPlainObject(jo)) {
		opt = jo;
		jo = null;
	}
	if (jo == null)
		jo = $("#menu");
	if (arr == null)
		arr = [];
	jo.children().each(function (i, e) {
		var children = arr;
		var je = $(e);
		if (je.css("display") == "none")
			return;
		if (je.hasClass("my-menu-item")) {
			children = [];
			var item = {
				name: je.text().trim(),
				perm: je.attr("wui-perm"),
				children: children
			};
			if (! item.perm)
				item.perm = item.name;
			if (opt && opt.filter) {
				item = opt.filter(item);
			}
			arr.push(item);
			je = je.next();
			if (! je.hasClass("menu-expandable"))
				return;
		}
		else if (je.hasClass("menu-expandable"))
			return;
		getMenuTree(je, children, opt);
	});
	return arr;
}

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
		jd_dlgForAdd: "#dlgStore",
		// jd_qsearch: "name", // 模糊匹配字段
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
- jd_dlgForAdd: (v6) 如果指定，则下拉列表中显示“新增”按钮，可以打开该对话框添加对象。（支持权限控制）
- jd_qsearch: (v7) 指定模糊查询的字段列表(多个以逗号分隔)。由datagrid适配即dgLoader实现。

在wui-combogrid的输入框中输入后会自动进行模糊查询，展示匹配的数据列表；
选项jd_qsearch用于直接指定模糊查询的字段列表；如果不指定的话，则须由后端指定，否则无法模糊查询。

未指定jd_qsearch选项时，调用接口示例为`callSvr("Store.query", {res:"id,name", q="张三"})`.
须由筋斗云后端指定qsearch字段，示例如下：(详细可参考后端手册, 搜索qsearch):

	class AC2_Xxx
	{
		protected function onQuery() {
			$this->qsearch("name,phone", param("q"));
		}
	}

指定jd_qsearch时，调用接口示例为: `callSvr("Store.query", {res:"id,name", qserach:"name:张三"})`.

在选择一行并返回时，它会触发choose事件：

	// 注意要取combogrid对象要用comboname! 而不是用 "[name=storeId]"（原始的input已经变成一个hidden组件，只存储值）
	var jo = jdlg.find("[comboname=storeId]"); 
	jo.on("choose", function (ev, row) {
		console.log('choose row: ', row);
		...
	});

jo是easyui-combogrid，可以调用它的相应方法，如禁用和启用它：

	jo.combogrid("disable");
	jo.combogrid("enable");

特别逻辑：

- 在初始化时，由于尚未从后端查询文本，这时显示jd_vField字段的文本。
- 如果输入值不在列表中，且不是数字，将当作非法输入被清空。
- 特别地，在查询模式下（forFind），可以输入任意条件，比如">10", "1-10"等。如果输入的是文本，比如"上海*"，则自动以jd_vField字段进行而非数值编号进行查询。

示例2：简单的情况，选择时只用名字，不用id。

	// var ListOptions 定义中：
	// 只用name不用id
	CateGrid: {
		jd_vField: "category",
		jd_showId: false,
		// jd_qsearch: "name,fatherName",
		panelWidth: 450,
		width: '95%',
		idField: "name",
		textField: "name",
		columns: [[
			{field:'name',title:'类别',width:120},
			{field:'fatherName',title:'父类别',width:120},
		]],
		url: WUI.makeUrl('Category.query', {
			res: 'id,name,fatherName'
		})
	}

在dialog中：

		<input class="wui-combogrid" name="category" data-options="ListOptions.CateGrid">

设置方法：

- idField和textField一样，都用name;
- jd_showId指定为false即不显示idField;

## markRefresh 标记下次打开时刷新列表

(v5.5) 与my-combobox类似，组件会在其它页面更新对象后自动刷新列表。
外部想要刷新组件列表，可以触发markRefresh事件：

	jo = jdlg.find("[comboname=xxxId]");
	jo.trigger("markRefresh", obj); // obj是可选的，若指定则仅当obj匹配组件对应obj时才会刷新。

## 动态修改下拉列表

(v6) 与my-combobox方法相同，重新设置选项：

	jo = jdlg.find("[comboname=xxxId]");
	jo.trigger("setOption", opt);

动态修改组件选项示例：

	// 比如每打开对话框时，根据type动态显示列表。可在dialog的beforeShow事件中编码：
	var cond = type == 'A'? xx: yy...;
	// 取出选项，动态修改url
	var jo = jdlg.find("[comboname=categoryId]");
	jo.trigger("setOption", ListOptions.CategoryGrid(cond));

## 使用gn函数访问组件

设置值：

	jdlg.gn("userId").val(10);
	jdlg.gn("userId").val([10, "用户1"]); // 如果传数组，则同时设置值和显示文本

设置状态：

	jdlg.gn("userId").visible(true)
		.readonly(true)
		.disabled(true);

注意gn函数支持链式调用。

重置选项：

	jdlg.gn("userId").setOption(ListOptions.UserGrid({phone: "~*9204"}));

## 显示为树表combotreegrid

当设置选项treeField后，显示为树表，示例：

	// var ListOptions 定义中：
	CateGrid: {
		treeField: "name", // 在name字段上折叠
		...
		url: WUI.makeUrl('Category.query', {
			res: 'id,name,fatherName',
			pagesz: -1 // 树表应全部显示
		})
	}

## 支持多选的数据表或树表

设置选项`multiple: true`后支持多选，combogrid和combotreegrid均支持。
多个选项将以逗号分隔的id值如来保存, 如`2,3,4`; 此处id值由idField定义，不一定是数值。

可以通过FormItem的getValue/setValue方法(或gn的val方法)来存取值，值为逗号分隔的字符串(而不是数组)。

TODO：不支持jd_showId/jd_vField选项。因而在尚未加载过数据时（比如初次打开对话框时），会显示为值数字(id)而不是文本内容。

 */
self.m_enhanceFn[".wui-combogrid"] = enhanceCombogrid;
function enhanceCombogrid(jo)
{
	var myopt = WUI.getOptions(jo);
	// add default option
	WUI.extendNoOverride(myopt, {
		jd_showId: true,
		delay: 500,
		idField: "id",
		textField: "name",
		mode: 'remote',
	});
	jo.removeAttr("data-options"); // 避免被easyui错误解析

	var jdlg;
	var isCombogridCreated = false;
	var doInit = true;

	var combogrid = "combogrid", datagrid = "datagrid";
	if (myopt.treeField) {
		combogrid = "combotreegrid";
		datagrid = "treegrid";
	}

	setOption();

	jo.on("markRefresh", markRefresh);
	jo.on("setOption", function (ev, opt) {
		setOption(opt);
	});

	jdlg = jo.closest(".wui-dialog");
	if (jdlg.size() == 0)
		return;

	jdlg.on("beforeshow", onBeforeShow);

	function initCombogrid()
	{
		if (isCombogridCreated)
			return;
		isCombogridCreated = true;

		var $dg;
		var curVal, curText;

		var initOpt = $.extend({}, $.fn[datagrid].defaults, {
			// 首次打开面板时加载url
			onShowPanel: function () {
				if (doInit && myopt.url) {
					doInit = false;
					$dg[datagrid]("options").url = myopt.url;
					$dg[datagrid]("reload");
				}
				curVal = jo[combogrid]("getValue");
				curText = jo[combogrid]("getText");
			},
			// 值val必须为数值(因为值对应id字段)才合法, 否则将清空val和text
			onHidePanel: function () {
				if (myopt.multiple)
					return;
				var val = jo[combogrid]("getValue");
				if (! val || curVal == val) {
					jo[combogrid]("setText", curText);
					return;
				}

				jo.removeProp("nameForFind");
				if (jdlg.size() > 0 && jdlg.jdata().mode == FormMode.forFind) {
					if (myopt.jd_vField && /[^\d><=!,-]/.test(val) ) {
						jo.prop("nameForFind", myopt.jd_vField);
					}
					return;
				}

				var isId = (myopt.idField == "id");
	//			var val1 = jo[combogrid]("textbox").val();
				if (isId && ! $.isNumeric(val)) {
					jo[combogrid]("setValue", "");
				}
				else if (myopt.jd_showId) {
					var txt = jo[combogrid]("getText");
					if (! /^\d+ - /.test(txt)) {
						jo[combogrid]("setText", val + " - " + txt);
					}
				}
				var row = $dg[datagrid]("getSelected");
				if (row)
					jo.trigger("choose", [row]);
			},
			/* !!! TODO: 解决combogrid 1.4.2的bug. 1.5.2以上已修复, 应移除。
			onLoadSuccess: function () {
				$dg && $.fn.datagrid.defaults.onLoadSuccess.apply($dg[0], arguments);
			}
			*/
		}, myopt, {url: null}); // URL在创建后再指定，这样初始化时不调用接口
		if (myopt.jd_dlgForAdd && WUI.canDo(null, "新增")) {
			var jdlgForAdd = $(myopt.jd_dlgForAdd);
			var btnAdd = {text:'新增', iconCls:'icon-add', handler: function () {
				jo.combo("hidePanel");
				WUI.showObjDlg(jdlgForAdd, FormMode.forAdd, {onOk: function (retData) {
					jo[combogrid]("setValue", retData);
					jo[combogrid]("setText", retData + " - (新增)");
					jo.removeProp("nameForFind");
				}});
			}};
			initOpt.toolbar = WUI.dg_toolbar(null, jdlgForAdd, btnAdd);
		}
		jo[combogrid](initOpt);
		$dg = jo[combogrid]("grid");
	}

/*
	jo[combogrid]("textbox").blur(function (ev) {
		var val1 = this.value;
	});
	*/

	function onBeforeShow(ev, formMode, formOpt) {
		// 推迟执行，以便应用在onBeforeShow中设置组件选项。
		setTimeout(function () {
			if (myopt.multiple) {
				// NOTE: 支持多选时，会生成0到多个带name属性的隐藏字段，自动setFormData无法正确处理, 这里单独处理
				var name = jo.attr("comboname");
				if (name && formOpt.data[name]) {
					var val = formOpt.data[name].split(',');
					jo[combogrid]("setValues", val);
				}
				return;
			}
			if (myopt.jd_vField && formOpt.data && formOpt.data[myopt.jd_vField]) {
				// onShow
				var val = jo[combogrid]("getValue");
				if (val != "") {
					var txt = formOpt.data[myopt.jd_vField];
					if (myopt.jd_showId) {
						var prefix = val + " - ";
						if (!txt.startsWith(prefix))
							txt = prefix + txt;
					}
					jo[combogrid]("setText", txt);
				}
				// nameForFind用于find模式下指定字段名，从而可以按名字来查询。Add/set模式下应清除。
				jo.removeProp("nameForFind");
			}
		});
	}

	function markRefresh(ev, obj)
	{
		var url = WUI.getOptions(jo).url;
		if (url == null)
			return;
		if (obj) {
			var ac = obj + ".query";
			if (url.action != ac)
				return;
		}
		doInit = true;
	}

	function setOption(opt) {
		var rv = diffObj(myopt, opt);
		if (rv == null)
			return;
		$.extend(myopt, opt);
		doInit = true;
		if (opt && rv.columns) {
			// 设置columns属性时做combogrid初始化
			isCombogridCreated = false;
		}
		initCombogrid();
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
self.getFormItemExt["combo"] = function (ji) {
	// 注意：jo.combo()创建后，它会将name属性转移到一个新建的hidden对象。传入这里的ji可以是原combo对象也可以是那个hidden对象。
	// 在实现方法时只根据原combo对象即jcombo
	var jcombo;
	if (ji.hasClass("combo-f")) {
		jcombo = ji;
	}
	else if (ji.is("[type=hidden].textbox-value")) {
		jcombo = ji.closest(".combo").prev(".combo-f");
	}
	else {
		return;
	}
	if (jcombo.size() == 0)
		return;

	var jcomboCall;
	var arr = Object.keys(jcombo.data()); // e.g. ["combogrid", "combo", "textbox"]
	// console.log(arr);
	for (var i=0; i<arr.length; ++i) {
		if (jcombo[arr[i]]) {
			var comboType = arr[i]; // e.g. combogrid
			var fn = jcombo[comboType].bind(jcombo);
			jcomboCall = fn;
			break;
		}
	}
	WUI.assert(jcomboCall);
	return new ComboFormItem(ji, jcombo, jcomboCall);
}

function ComboFormItem(ji, jcombo, jcomboCall) {
	WUI.FormItem.call(this, ji);
	this.jcombo = jcombo;
	this.jcomboCall = jcomboCall;
}

// 适用于 combo, combogrid, datebox, datetimebox
// { ji, jcombo, jcomboCall }
ComboFormItem.prototype = $.extend(new WUI.FormItem(), {
	getName: function () {
		var jcombo = this.jcombo;
		return jcombo.prop("nameForFind") || jcombo.attr("comboname");
	},
	getJo: function () {
		return this.jcombo;
	},
	setValue: function (val) {
		var fn = this.jcomboCall;
		var opt = WUI.getOptions(this.jcombo);
		if (opt.multiple) {
			if (val == null) {
				val = [];
			}
			else if (! $.isArray(val)) {
				val = val.split(',');
			}
			fn("setValues", val);
			return;
		}
		if ($.isArray(val)) {
			fn("setValue", val[0]);
			if (opt.jd_showId) {
				fn("setText", val[0] + " - " + val[1]);
			}
			else {
				fn("setText", val[1]);
			}
			return;
		}
		fn("setValue", val); // 调用比如 jcombo.combogrid("setValue", ...)
	},
	getValue: function () {
		var fn = this.jcomboCall;
		var opt = WUI.getOptions(this.jcombo);
		if (opt.multiple) {
			return fn("getValues").join(',');
		}
		return fn("getValue").trim();
	},
	getDisabled: function () {
		var fn = this.jcomboCall;
		return fn("options").disabled;
	},
	setDisabled: function (val) {
		var fn = this.jcomboCall;
		fn(val? "disable": "enable");
	},
	getReadonly: function () {
		var fn = this.jcomboCall;
		return fn("options").readonly;
	},
	setReadonly: function (val) {
		var fn = this.jcomboCall;
		fn(val? "disableValidation": "enableValidation");
		return fn("readonly", val);
	},
	// 用于显示的虚拟字段值
	getValue_vf: function () {
		var fn = this.jcomboCall;
		return fn("getText");
	},
	getShowbox: function () {
		var fn = this.jcomboCall;
		return fn("textbox");
	},
});

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

@key .wui-field

在隐藏字段时，默认是找到字段所在的行(tr)或标识`wui-field`类的元素控制其显示或隐藏。示例：

		<tr>
			<td></td>
				<label class="wui-field"><input name="forEnd" type="checkbox" value="1"> 结束打卡</label>
			</td>

			<td></td>
			<td>
				<label class="wui-field"><input name="repairFlag" type="checkbox" value="1"> 是否维修</label>
			</td>
		</tr>

这里一行有两组字段，以wui-field类来指定字段所在的范围。如果不指定该类，则整行(tr层)将默认当作字段范围。
JS控制：(dialog的onShow时)

		WUI.toggleFields(jfrm, {
			forEnd: formMode == FormMode.forSet && !frm.tm1.value,
			repairFlag: g_args.repair
		})

 */
self.toggleFields = toggleFields;
function toggleFields(jo, showMap)
{
	if (jo.prop("tagName") == "TABLE") {
		var jtbl = jo;
		$.each(showMap, function (k, v) {
			// 忽略找不到列的错误
			try {
				toggleCol(jtbl, k, !!v);
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
				$(o).closest("tr,.wui-field").toggle(!!v);
		});
	}
}

function initPermSet(rolePerms)
{
	var permSet = {};
	var isAdm = g_data.hasRole("mgr,emp");
	if (isAdm) {
		permSet["*"] = true;
	}
	var rpArr = rolePerms? rolePerms.split(/\s+/): [];
	$.each (rpArr, function (i, e) {
		if (isAdm && (e.indexOf("不可")>=0 || e.indexOf("只读")>=0))
			return;

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

可通过 g_data.hasRole(roles) 查询是否有某一项或几项角色。注意：由于历史原因，hasRole/hasPerm是同样的函数。

	var isMgr = g_data.hasRole("mgr"); // 最高管理员
	var isEmp = g_data.hasRole("emp"); // 一般管理员
	var isAdm = g_data.hasRole("mgr,emp"); // 管理员(两种都行)
	var isKF = g_data.hasRole("客服");

自定义权限规则复杂，一般由框架管理，可以用`canDo(对象, 权限)`函数查询，如：

	var bval = WUI.canDo("客户管理"); // 查一个特定对象，名词性
	var bval = WUI.canDo(null, "首件确认"); // 查一个特定权限，动词性。（最高）管理员或指定了"*"权限的话，则默认也允许。
	var bval = WUI.canDo(null, "维修", false); // 查一个特定权限，动词性，缺省值设置false表示未直接设置就不允许，即使是（最高）管理员或指定了"*"权限也不允许。

WUI.canDo的底层实现是通过`g_data.permSet[perm]`查询。
 */
self.applyPermission = applyPermission;
function applyPermission()
{
	var perms = g_data.userInfo.perms;
	var rolePerms = g_data.userInfo.rolePerms;

	// e.g. "item,mgr" - ".perm-item, .perm-mgr"
	if (!perms)
		return;
	// replace special chars
	perms = perms.replace(/[&]/g, '_');
	var sel = perms.replace(/([^, ]+)/g, '.perm-$1');
	var arr = perms.split(/,/);
	if (sel) {
		$(sel).show();
		var sel2 = sel.replace(/perm/g, 'nperm');
		$(sel2).hide();
	}

	// 注意：Employee.perms指的是角色；rolePerms才是权限集合。用g_data.hasRole检查角色，用WUI.canDo检查权限
	g_data.hasRole = g_data.hasPerm = function (perms) {
		var arr1 = perms.split(',');
		for (var i=0; i<arr1.length; ++i) {
			var perm = arr1[i].trim();
			if (arr.indexOf(perm) >= 0)
				return true;
		}
		return false;
	}

	g_data.permSet = initPermSet(rolePerms);
	if (! g_data.hasRole("mgr,emp")) {
		var defaultShow = self.canDo("*", null, false);
		$("#menu .perm-emp .menu-expand-group").each(function () {
			showGroup($(this));
		});
	}

	// 支持多级嵌套
	function showGroup(jo) {
		var t = jo.find("a:first").text(); // 菜单组名称
		var doShowGroup = self.canDo(t, null, defaultShow);
		var doShow = defaultShow;
		var allHidden = true;
		jo.find(">.menu-expandable>a").each(function () {
			var t = $(this).attr("wui-perm") || $(this).text().trim();
			if (WUI.canDo(t, null, doShowGroup)) {
				doShow = true;
				allHidden = false;
				// $(this).show();
			}
			else {
				$(this).remove();
			}
		});
		jo.find(">.menu-expand-group").each(function () {
			if (showGroup($(this))) {
				doShow = true;
				allHidden = false;
			}
		});
		if (allHidden) {
			jo.closest(".menu-expand-group").remove();
			return false;
		}
		else if (doShowGroup || doShow) {
			jo.closest(".perm-emp").show();
			return true;
		}
		return false;
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
	return '<a href="javascript:;" onclick="' + self.fname(fn) + '()">' + text + '</a>';
}

window.ApproveFlagMap = {
	0: "无审批",
	1: "待审批",
	2: "通过",
	3: "不通过"
}
window.ApproveFlagStyler = {
	0: "Disabled",
	1: "Warning",
	2: "Info",
	3: "Error"
}

/**
@key toolbar 工具栏扩展菜单项

- import: 导入
- export: 导出
- report: 报表
- qsearch: 模糊查询，支持指定字段
@see toolbar-qsearch

- approve: 审批
@see toolbar-approve
*/
$.extend(self.dg_toolbar, {
	"import": function (ctx) {
		return {text: "导入", "wui-perm": "新增", iconCls:'icon-add', handler: function () {
			self.GridHeaderMenu['import'](ctx.jtbl);
		}};
	},

/**
@key toolbar-qsearch

工具栏-模糊查询。支持指定查询字段。

	// pageXx.js function initPageXx
	var dgOpt = {
		...
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "qsearch"),
	};
	jtbl.datagrid(dgOpt);

它调用接口`callSvr("Xx.query", {q: val})`
需要后端支持查询，比如须指定在哪些字段查询：
```php
protected function onQuery() {
    $this->qsearch(["code", "category"], param("q"));
}
```

(v6) 新用法：也支持前端直接指定字段查询：

	var dgOpt = {
		...
		// 表示在code或category两个字段中模糊查询。
		toolbar: WUI.dg_toolbar(jtbl, jdlg, ["qsearch", "code,category"]),
	};
	jtbl.datagrid(dgOpt);

它将调用接口`callSvr("Xx.query", {qsearch: "字段1,字段2:" + val})`。
 */
	qsearch: function (ctx, param) {
		var randCls = "qsearch-" + WUI.randChr(4); // 避免有多个qsearch组件时重名冲突
		setTimeout(function () {
			//给搜索框的父元素添加一个类名，方便修改样式
			var jo = ctx.jp.find(".qsearch." + randCls);
			jo.closest(".l-btn").addClass('qsearch-btn').removeAttr("href"); // 去除href属性，否则无法选框内文字
			jo.click(function () {
				return false;
			});
			jo.keydown(function (e) {
				if (e.keyCode == 13) {
					$(this).closest(".l-btn").click();
					return false; // 避免触发对话框回车事件
				}
			});
			// 提示搜索字段
			if (param) {
				var colMap = WUI.getDgColMap(ctx.jtbl);
				var str = $.map(param.split(','), function (e) {
					var e1 = e.replace(/[*]/g, '');
					return (colMap[e1] && colMap[e1].title) || e;
				}).join('/');
				jo.attr({
					placeholder: str,
					title: "搜索字段: " + str + ' (' + param + ')'
				});
			}
		});
		return {text: "<input style='width:8em' class='qsearch " + randCls + "'>", iconAlign:'right', iconCls:'icon-search', "wui-perm": "查询", handler: function () {
			var val = $(this).find(".qsearch").val();
			if (param == null) {
				WUI.reload(ctx.jtbl, null, {q: val});
			}
			else {
				WUI.reload(ctx.jtbl, null, {qsearch: param + ":" + val});
			}
		}};
	},

	report: function (ctx) {
		return {text: '报表', iconCls: 'icon-sum', handler: function () {
			self.showDlg("#dlgDataReport");
		}};	
	},

/**
@key toolbar-approve 审批菜单

参数选项：

- text: 指定按钮显示文字，默认为"审批"
- obj: 指定审批对象, 调用{obj}.set接口，将设置approveFlag字段（可由approveFlagField指定）；特别地，指定ApproveRec表示使用审批流组件，将调用ApproveRec.add接口做审批。
- onSet(row, data, title): 见下面例子
- canApprove(row): 权限检查回调，如果指定，用于在审批时由前端检查权限；不指定时不检查（后端检查）。
- approveFlagField: 默认值为"approveFlag"，审批状态字段名。

依赖字段：

- approveFlag: 审批状态(ApproveFlagMap), Enum(0-无审批, 1-待审批, 2-通过, 3-不通过), 可用ApproveFlagStyler修饰各状态颜色。

可选字段：

- approveEmpId: 审批人

示例：显示审批菜单，在发起审批时，若未指定审批人则自动填写审批人

	function canApprove_WO(row) {
		return g_data.userInfo.id == row.approveEmpId || g_data.hasRole("mgr,售后审核");
	}
	var btnApprove = ["approve", {
		obj: "WarrantyOrder", // 最终将调用"WarrantyOrder.set"接口
		canApprove: function (row) {
			return canApprove_WO(row);
		},
		// data: 待保存的新数据(data.approveFlag为新状态), row: 原数据, title: 当前菜单项名称，比如“发起审批”
		onSet: function (row, data, title) {
			// 发起审批时，自动填写审批人
			if (data.approveFlag ==1 && row.approveEmpId == null) {
				var empId = callSvrSync("Employee.query", {fmt: "one?", res: "id", role:"售后审核"});
				if (empId)
					data.approveEmpId = empId;
			}
		}
	}];

	var dgOpt = {
		...
		toolbar: WUI.dg_toolbar(jtbl, jdlg, btnApprove),
	};
	jtbl.datagrid(dgOpt);

做二次开发时，对话框上approveFlag设置示例：

	{
		disabled: e => canApprove_WO(e),
		enumMap: ApproveFlagMap,
		styler: Formatter.enumStyler(ApproveFlagStyler),
		desc: "【售后审核】角色或【最高管理员】或指定审批人可审批"
	}

对话框上approveEmpId设置示例：

	{
		disabled: e => canApprove_WO(e)
	}

上面例子中用callSvrSync是使用同步方式来取数据的，更好的写法是直接用异步的callSvr。
onSet回调支持异步，
异步写法1：使用async/await。

		onSet: async function (row, data) {
			if (data.approveFlag ==1 && row.approveEmpId == null) {
				var empId = await callSvr("Employee.query", {fmt: "one?", res: "id", role:"售后审核"});
				if (empId)
					data.approveEmpId = empId;
			}
		}

异步写法2：返回一个Deferred对象(callSvr函数刚好返回Deferred对象)

		onSet: function (row, data) {
			if (data.approveFlag ==1 && row.approveEmpId == null) {
				var dfd = callSvr("Employee.query", {fmt: "one?", res: "id", role:"售后审核"});
				dfd.then(function (empId) {
					if (empId)
						data.approveEmpId = empId;
				});
				return dfd;
			}
		}

示例：审批时弹出对话框，可输入备注(approveCmt)
在onSet中使用WUI.showDlgByMeta弹出自定义对话框，显然是异步操作，需要返回dfd对象。

	function canApprove_WO(row) {
		return g_data.userInfo.id == row.approveEmpId || g_data.hasRole("mgr,售后审核");
	}
	var btnApprove = ["approve", {
		obj: "WarrantyOrder",
		canApprove: function (row) {
			return canApprove_WO(row);
		},
		// data: 待保存的新数据(data.approveFlag为新状态), row: 原数据, title: 当前菜单项名称，比如“发起审批”
	
		onSet: function (row, data, title) {
			var dfd = $.Deferred();
			var meta = [
				// title, dom, hint?
				{title: "备注", dom: "<textarea name='approveCmt' rows=5></textarea>", hint: '选填，将添加到备注列表中'}
			];
			var jdlg = WUI.showDlgByMeta(meta, {
				title: title,
				onOk: async function (data1) {
					// 发起审批时，自动填写审批人
					if (data.approveFlag ==1 && row.approveEmpId == null) {
						var empId = await callSvr("Employee.query", {fmt: "one?", res: "id", role:"售后审核"});
						if (empId)
							data.approveEmpId = empId;
					}
					if (data1.approveCmt) {
						data.cmts = [
							{text: data1.approveCmt}
						];
					}
					dfd.resolve();
					WUI.closeDlg(jdlg);
				}
			});
			return dfd;
		}
	}];

 */
	approve: function (ctx, opt) {
		self.assert(opt.ac || opt.obj, "approve: 审批对象opt.obj或审批接口opt.ac至少指定一个");
		opt = $.extend({
			approveFlagField: "approveFlag",
			text: "审批",
		}, opt);
		var jmnuApprove = $('<div style="width:150px;display:none">' +
			'<div id="ap1" data-options="iconCls:\'icon-help\'">发起审批</div>' +
			'<div id="ap2" data-options="iconCls:\'icon-ok\'">审批通过</div>' +
			'<div id="ap3" data-options="iconCls:\'icon-no\'">审批不通过</div>' +
		'</div>');
		jmnuApprove.menu({
			onClick: function (o) {
				var row = WUI.getRow(ctx.jtbl);
				if (!row)
					return;
				// approveFlag: 0: "无审批", 1: "待审批", 2: "通过", 3: "不通过"
				var approveFlag = parseInt(o.id.replace('ap', '')); // "ap1" => 1
				var approveFlag0 = row[opt.approveFlagField];
				if (approveFlag == approveFlag0) {
					app_alert("已经是\"" + ApproveFlagMap[approveFlag] + "\"状态，无须操作。", "w");
					return;
				}
				if ((approveFlag == 2 || approveFlag == 3) && approveFlag0 == 0) {
					app_alert("请先[发起审批]后（状态为\"待审批\"）再操作。", "w");
					return;
				}
				var data = {};
				data[opt.approveFlagField] = approveFlag;
				if (opt.canApprove && !opt.canApprove(row)) {
					if (approveFlag == 1 && (approveFlag0 == 0 || approveFlag0 == 3)) {
					}
					else {
						app_alert("无权限操作", "w");
						return;
					}
				}
				var rv = opt.onSet && opt.onSet(row, data, o.text);
				if (rv && rv.then) {
					rv.then(done);
				}
				else {
					done();
				}

				function done() {
					if (opt.obj) {
						callSvr(opt.ac + ".set", {id: row.id}, function () {
							app_show("操作成功");
							WUI.reloadRow(ctx.jtbl, row);
						}, data);
					}
					else if (opt.ac) {
						callSvr(opt.ac, function () {
							app_show("操作成功");
							WUI.reloadRow(ctx.jtbl, row);
						}, data);
					}
				}
			}
		})
		return {text: opt.text, iconCls:"icon-more", class:"menubutton", menu: jmnuApprove};
	}
});

// 用户自定义查询
self.createFindMenu = createFindMenu;
function createFindMenu(jtbl)
{
	var items = null; // elem: { text, query }
	var curItem = null;
	var ac = null;
	if (jtbl.size() == 0) {
		console.warn("createFindMenu: bad jtbl", jtbl);
		return;
	}

	var jmenu = $('<div>' + 
		'<div class="btnSave" data-options="iconCls:\'icon-save\', id:\'btnSave\'">保存查询</div>' + 
		'<div class="btnClear" data-options="iconCls:\'icon-remove\', id:\'btnClear\'">清除查询</div>' + 
		'<div class="btnUserQuery" data-options="iconCls:\'icon-search\', id:\'btnUserQuery\'">自定义查询</div>' + 
		'<div class="menu-sep"></div>' + 
		'</div>');
	initCtxMenu();

	jmenu.menu({
		onClick: function (item) {
			console.log(item);
			if (item.id == "btnSave") {
				var param = self.getQueryParamFromTable(jtbl);
				app_alert(T("设置查询名称为? "), "p", function (queryName) {
					if (items == null) {
						items = [];
					}
					items.push({
						text: queryName,
						query: param.cond
					});
					updateMenu();
					saveItems();
				});
			}
			else if (item.id == "btnClear") {
				WUI.reload(jtbl, null, {});
			}
			else if (item.id == "btnUserQuery") {
				WUI.GridHeaderMenu.filterGrid(jtbl);
			}
			else if (item.opt) {
				WUI.reload(jtbl, null, {cond: item.opt.query});
			}
		},
		onShow: function () {
			var cond = self.getQueryParamFromTable(jtbl).cond;
			var btnSave = jmenu.find(".btnSave");
			jmenu.menu(cond? "enableItem": "disableItem", btnSave);
			var btnClear = jmenu.find(".btnClear");
			jmenu.menu(cond? "enableItem": "disableItem", btnClear);
		}
	})

	setTimeout(function () {
		var dg = WUI.getDgInfo(jtbl);
		ac = dg.ac;
		loadItems(); 
		updateMenu();
	});


	return jmenu;

	function updateMenu()
	{
		jmenu.find(".menu-sep").nextAll().remove();
		jmenu.find(".menu-sep").toggle(items.length > 0);
		$.each(items, function (i, e) {
			jmenu.menu("appendItem", {
				text: e.text,
				opt: e
			});
		});
	}

	function loadItems() {
		var name = "userQuery." + ac;
		items = self.getStorage(name) || [];
	}
	function saveItems() {
		var name = "userQuery." + ac;
		self.setStorage(name, items);
	}

	// 删除和修改菜单项
	function initCtxMenu() {
		var jctxMenu = $('<div>' +
			'<div data-options="iconCls:\'icon-remove\', id:\'btnDel\'">删除</div>' +
			'<div data-options="iconCls:\'icon-edit\', id:\'btnEdit\'">修改</div>' +
		'</div>');
		jctxMenu.menu({
			onClick: function (item) {
				if (item.id == "btnDel") {
					app_alert("删除查询项`" + curItem.text + "`?", "q", function () {
						var idx = items.indexOf(curItem.opt);
						items.splice(idx, 1);
						jmenu.menu("removeItem", curItem.target);
						saveItems();
					});
				}
				else if (item.id == "btnEdit") {
					app_alert("设置查询名称为?", "p", function (queryName) {
						curItem.text = queryName;
						curItem.opt.text = queryName;
						jmenu.menu("setText", {
							target: curItem.target,
							text: queryName
						});
						saveItems();
					}, {defValue: curItem.text});
				}
			}
		});
		jmenu.on("contextmenu", ".menu-item", function (ev) {
			var item = jmenu.menu("getItem", this);
			if (item.opt) {
				curItem = item;
				jctxMenu.menu("show", {
					left: ev.pageX,
					top: ev.pageY
				})
			}
			ev.preventDefault();
			ev.stopImmediatePropagation();
			return false;
		});
	}
}

/**
@key .wui-subobj

选项：opt={obj, relatedKey, res?, dlg?/关联的明细对话框, datagrid/treegrid}

这些选项在dlg设置时有效：{valueField, readonly, objParam, toolbar, vFields}

- opt.forceLoad: 显示为Tab页时（即每个Tab页一个子表），为减少后端查询，若该Tab页尚未显示，是不加载该子表的。设置forceLoad为true则无论是否显示均强制加载。

## 示例：可以增删改查的子表：

	<div class="wui-subobj" data-options="obj:'CusOrder', relatedKey:'cusId', valueField:'orders', dlg:'dlgCusOrder'">
		<p><b>物流订单</b></p>
		<table>
			<thead><tr>
				<th data-options="field:'tm', sortable:true">制单时间</th>
				<th data-options="field:'status', sortable:true, jdEnumMap:CusOrderStatusMap, formatter:Formatter.enum(CusOrderStatusMap), styler:Formatter.enumStyler({CR:'Warning',CL:'Disabled'})">状态</th>
				<th data-options="field:'amount', sortable:true, sorter:numberSort">金额</th>
			</tr></thead>
		</table>
	</div>

选项说明：

- opt.obj: 子表对象，与relatedKey字段一起自动生成子表查询，即`{obj}.query`接口。

		class AC2_CusOrder extends AccessControl
		{
		}

- relatedKey: 关联字段. 指定两表(当前表与obj对应表)如何关联, 用于自动创建子表查询条件以及子表对话框的关联值设置(wui-fixedField)
 值"cusId"与"cusId={id}"等价, 表示`主表.id=CusOrder.cusId`.
 可以明确指定被关联字段, 如relatedKey="name={name}" 表示`主表.name=CusOrder.name`. 
 支持多个关联字段设置, 如`relId={id} AND type={type}`.
 支持in方式关联，如`id in ({itemIds})`，其中itemIds字段为逗号分割的id列表，如"100,102"

- opt.dlg: 对应子表详情对话框。如果指定，则允许添加、更新、查询操作。

以下字段仅当关联对话框（即dlg选项设置）后有效：

- opt.valueField: 对应后端子表名称，在随主表一起添加子表时，会用到该字段。如果不指定，则不可在主表添加时一起添加。它对应的后端实现示例如下：

		class AC2_Customer extends AccessControl
		{
			protected $subobj = [
				"orders" => [ "obj" => "CusOrder", "cond" => "cusId=%d" ]
			]
		}

- opt.readonly: 默认为false, 设置为true则在主表添加之后，不可对子表进行添加、更新或删除。

- opt.objParam: 关联的明细对象对话框的初始参数, 对应dialogOpt.objParam. 例如有 offline, onCrud()等选项. 
@see objParam

示例：在对话框dlgOrder上设置子表关联对话框dlgOrder1:

		<div class="wui-subobj" id="tabOrder1" data-options="...">

注意：要在onBeforeShow中设置objParam，如果在onShow中设置就晚了：

	jdlg.on("beforeshow", onBeforeShow)
	function onBeforeShow(ev, formMode, opt)
	{
		var type = opt.objParam && opt.objParam.type;
		var tab1Opt = WUI.getOptions(jdlg.find("#tabOrder1"));
		tab1Opt.objParam = { type: type };
		...
	}

## 动态修改选项

选项可以动态修改，如：

	// 在dialog的beforeshow回调中：
	var jsub = jdlg.find(".wui-subobj");
	WUI.getOptions(jsub).readonly = !g_data.hasRole("emp,mgr");

## 定制子对象操作按钮toobar

- opt.toolbar: 指定修改对象时的增删改查按钮, Enum(a-add, s-set, d-del, f-find, r-refresh), 字符串或数组, 缺省是所有按钮, 空串""或空数组[]表示没有任何按钮.

示例：只留下删除和刷新: 

	<div ... class="wui-subobj" data-options="..., toolbar:'rd'"

示例：为子表定制一个操作按钮“取消”：

	// function initPageXXX() 自定义个按钮
	var btnCancelOrder = {text: "取消订单", iconCls:'icon-delete', handler: function () {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		callSvc("Ordr.cancel", {id: row.id}, function () {
			app_show("操作完成");
			WUI.reloadRow(jtbl, row);
		})
	}};

	// 在dialog的beforeshow回调中：
	var jsub = jdlg.find(".wui-subobj");
	WUI.getOptions(jsub).toolbar = ["r", "f", "s", btnCancelOrder]

@see dg_toolbar

## 添加主对象时检查子表

可以在validate事件中，对添加的子表进行判断处理：

	function onValidate(ev, mode, oriData, newData) 
	{
		if (mode == FormMode.forAdd) {
			// 由于valueField选项设置为"orders", 子表数组会写在newDate.orders中
			if (newData.orders.length == 0) {
				WUI.app_alert("请添加子表项!", "w");
				return false;
			}
			// 假如需要压缩成一个字符串：
			// newData.orders = WUI.objarr2list(newData.orders, ["type", "amount"]);
		}
	}

注意：只有在主对象添加时可以检查子表。在更新模式下，子对象的更改是直接单独提交的，主对象中无法处理。

## 示例2：主表记录添加时不需要展示，添加之后子表/关联表可以增删改查：

	<div class="wui-subobj" data-options="obj:'CusOrder', relatedKey:'cusId', dlg:'dlgCusOrder'>
		...
	</div>

## 示例3：和主表字段一起添加，添加后变成只读不可再新增、更新、删除：

	<div class="wui-subobj" data-options="obj:'CusOrder', relatedKey:'cusId', valueField:'orders', dlg:'dlgCusOrder', readonly: true">
		...
	</div>

示例：最简单的只读子表，只查看，也不关联对话框

	<div class="wui-subobj" data-options="obj:'CusOrder', res:'id,tm,status,amount', relatedKey:'cusId'">
	</div>

- opt.res: 指定返回字段以提高性能，即query接口的res参数。注意在关联详细对话框（即指定dlg选项）时，一般不指定res，否则双击打开对话框时会字段显示不全。


## 示例4: 动态启用/禁用子表

启用或禁用可通过事件发送指令:
	jo.trigger("setOption", {disabled: boolDisabledVal}); // 会自动刷新UI

示例: 在物料明细对话框(dlgItem)中, 在Tabs组件中放置"组合"子表, 当下拉框选择"组合"时, 启用"组合"子表Tab页:

	<select name="type">
		<option value="">(无)</option>
		<option value="P">组合</option>
		<option value="U">拆卖</option>
	</select>

	<div class="easyui-tabs">
		<!-- 注意 wui-subobj-item1 类定义了名字为 item1，以便下面setDlgLogic中引用。它一般和valueField相同，但valueField选项可能不存在 -->
		<div class="wui-subobj wui-subobj-item1" data-options="obj:'Item1', valueField:'item1', relatedKey:'itemId', dlg:'dlgItem1'" title="组合">
			...
		</div>
	</div>

设置"组合"页随着type选择启用禁用:

	// 注意，subobj组件一般不设置name属性，而是通过定义CSS类`wui-subobj-{name}`类来标识名字，从而可以用 jdlg.gn("item1") 来找到它的通用接口。
	WUI.setDlgLogic(jdlg, "item1", {
		watch: "type",
		disabled: function (e) {
			return e.type != "P";
		},
		required: true
	});

## 示例5：显示为树表(treegrid)

- opt.datagrid: 设置easyui-datagrid的选项
- opt.treegrid: 如果指定，则以树表方式展示子表，设置easyui-treegrid的选项

默认使用以下配置：

	{
		idField: "id",  // 不建议修改
		fatherField: "fatherId", // 指向父结点的字段，不建议修改
		treeField: "id", // 显示树结点的字段名，可根据情况修改
	}

子表以树表显示时，不支持分页（查询时自动设置参数pagesz=-1）。

@see treegrid

## 示例6：offline模式时显示虚拟字段以及提交时排除虚拟字段

在添加主对象时，对子对象的添加、更新、删除操作不会立即操作数据库，而是将最终子对象列表与主对象一起提交（接口是主对象.add）。
我们称这时的子对象对话框为offline模式，它会带来一个问题，即子对象对话框上点确定后，子表列表中无法显示虚拟字段。

解决方案是：1. 在对话框中用jd_vField选项指定虚拟字段名，2. 在subobj选项中以vFields选项指定这些字段只显示而不最终提交到add接口中。

- opt.vFields: (v5.5) 指定虚拟字段(virtual field)，多个字段以逗号分隔。这些字段只用于显示，不提交到后端。

示例：InvRecord对象包含子表InvRecord1，字段定义为：

	@InvRecord1: id, invId, whId, whId2, itemId
	vcol: itemName, whName, whName2

打开对话框dlgInvRecord添加对象，再打开子表明细对话框dlgInvRecord1添加子表项。
在subobj组件中，通过选项vFields排除只用于显示而不向后端提交的虚拟字段，dlgInvRecord.html中：

		<div class="wui-subobj" data-options="obj:'InvRecord1', relatedKey:'invId', valueField:'inv1', vFields:'itemName,whName,whName2', dlg:'dlgInvRecord1'" title="物料明细">
			...子表与字段列表...
		</div>

子表明细对话框中，为了在点击确定后将虚拟字段拷贝回subobj子表列表中，应通过data-options中指定jd_vField选项来指定虚拟字段名，如 dlgInvRecord1.html:

	仓库   <select name="whId" class="my-combobox" required data-options="ListOptions.Warehouse()"></select>  (Warehouse函数中已定义{jd_vField: 'whName'})
	到仓库 <select name="whId2" class="my-combobox" required data-options="ListOptions.Warehouse({jd_vField:'whName2'})"></select> (覆盖Warehouse函数定义中的jd_vField选项)
	物料   <input name="itemId" class="wui-combogrid" required data-options="ListOptions.ItemGrid()">  (ItemGrid函数中已定义{jd_vField: 'itemName'})

ListOptions中对下拉列表参数的设置示例：(store.js)

	var ListOptions = {
		...
		Warehouse: function (opt) {
			return $.extend({
				jd_vField: "whName", // 指定它在明细对话框中对应的虚拟字段名
				textField: "name", // 注意区别于jd_vField，textField是指定显示内容是url返回表中的哪一列
				url: ...
			}, opt);
		},
		ItemGrid: function () {
			return {
				jd_vField: "itemName",
				textField: "name",
				url: ...
			}
		},
	}

注意带Grid结尾的选项用于wui-combogrid组件; 否则应用于my-combobox组件； 
两者选项接近，wui-combogrid选项中应包含columns定义以指定下拉列表中显示哪些列，而my-combobox往往包含formatter选项来控制显示（默认是显示textField选项指定的列，设置formatter后textField选项无效）

上例中, 通过为组件指定jd_vField选项，实现在offline模式的子表对话框上点确定时，会自动调用WUI.getFormData_vf将虚拟字段和值字段拼到一起，返回并显示到表格中。

@see getFormData_vf
 */
self.m_enhanceFn[".wui-subobj"] = enhanceSubobj;
function enhanceSubobj(jo)
{
	var opt = WUI.getOptions(jo);
	self.assert(opt.relatedKey, "wui-subobj: 选项relatedKey未设置");

	var relatedKey = opt.relatedKey;
	if (relatedKey.match(/^[\u4e00-\u9fa5\w]+$/))
		relatedKey += "={id}";

	var ctx = {};

	// 子表表格和子表对话框
	var jtbl = jo.find("table:first");
	self.assert(jtbl.size() >0, "wui-subobj: 未找到子表表格");

	var jdlg = jo.closest(".wui-dialog");
	if (jdlg.size() == 0)
		return;

	var jtabs = jo.closest(".easyui-tabs");
	var inTab = jtabs.size() > 0;
	var tabIndex = -1;

	jdlg.on("beforeshow", onBeforeShow);
	if (inTab) {
		tabIndex = jtabs.tabs("getTabIndex", jo);
		jo.on("tabSelect", loadData);
	}
	jo.on("setOption", function (ev, val) {
		$.extend(opt, val);
		if (val.disabled != undefined) {
			toggle(!val.disabled);
		}
		if (val.readonly !== undefined) {
			// TODO:
		}
	});

	var jdlg1;
	if (opt.dlg) {
		jdlg1 = $("#" + opt.dlg);
		if (opt.valueField)
			jdlg.on("validate", onValidate);
	}

	var datagrid = opt.treegrid? "treegrid": "datagrid";
	opt.dgCall = jtbl[datagrid].bind(jtbl); // FormItem中使用
	// 同步强制加载数据，以便getData/setData可立即获取/设置数据
	opt.forceLoadData = function () {
		WUI.useSyncCall();
		loadData(true);
	};
	
	function onBeforeShow(ev, formMode, beforeShowOpt) 
	{
		var objParam = beforeShowOpt.objParam;
		setTimeout(onShow);

		function onShow() {
			ctx = {
				formMode: formMode,
				formData: beforeShowOpt.data
			};
			jo.data("subobjLoaded_", false);
			loadData();
		}
	}

	function onValidate(ev, mode, oriData, newData) 
	{
		if (opt.disabled)
			return;
		if ((mode == FormMode.forAdd || mode == FormMode.forSet) && (jdlg1.objParam && jdlg1.objParam.offline)) {
			// 添加时设置子表字段
			self.assert(opt.valueField, "wui-subobj: 选项valueField未设置");
			if (jo.data("subobjLoaded_")) {
				var rows = jtbl[datagrid]("getData").rows;
				if (opt.vFields) {
					var fields = opt.vFields.split(/\s*,\s*/);
					newData[opt.valueField] = $.map(rows, function (e, i) {
						var e1 = $.extend({}, e);
						$.each(fields, function (idx, k) {
							delete e1[k];
						});
						return e1;
					});
				}
				else {
					newData[opt.valueField] = rows;
				}
			}
		}
	}

	function loadData(forceLoad) {
		var formMode = ctx.formMode;
		var formData = ctx.formData;
		var show = formMode == FormMode.forSet;
		if (jdlg1 && (formMode == FormMode.forAdd && !!opt.valueField && !opt.readonly))
			show = true;
		toggle(!opt.disabled && show);

		if (opt.forceLoad)
			forceLoad = true;
		if (jo.is(":hidden") && !forceLoad || opt.disabled)
			return;

		if (jo.data("subobjLoaded_")) {
			// bugfix: 隐藏初始化datagrid后，再点过来时无法显示表格
			if (forceLoad && !jo.is(":hidden")) {
				jo.closest(".panel-body").panel("doLayout", true);
			}
			return;
		}
		jo.data("subobjLoaded_", true);

		if (jdlg1) {
			jdlg1.objParam = $.extend({}, opt.objParam);
			if (formMode == FormMode.forAdd) {
				if (opt.valueField) {
					jdlg1.objParam.offline = true; // 添加时主子表一起提交
					setObjParam(jdlg1.objParam, formData);
					jtbl.jdata().toolbar = "ads"; // add/del/set
					var dgOpt = $.extend({
						toolbar: WUI.dg_toolbar(jtbl, jdlg1),
						onDblClickRow: WUI.dg_dblclick(jtbl, jdlg1),
						data: [],
						url: null,
					}, opt[datagrid]);
					jtbl[datagrid](dgOpt);
				}
			}
			else if (formMode == FormMode.forSet) {
				setObjParam(jdlg1.objParam, formData);
				var readonly = opt.readonly || jdlg.hasClass("wui-readonly");
				jdlg1.objParam.readonly = readonly;
				jtbl.jdata().toolbar = opt.toolbar;  // 允许所有
				jtbl.jdata().readonly = readonly;
				var dgOpt = $.extend({
					toolbar: WUI.dg_toolbar(jtbl, jdlg1),
					onDblClickRow: WUI.dg_dblclick(jtbl, jdlg1),
					url: getQueryUrl(formData)
				}, opt[datagrid]);
				jtbl[datagrid](dgOpt);

				// 隐藏子表工具栏，不允许操作（但可以双击一行查看明细，会设置这时子对话框只读）
				//jtbl.closest(".datagrid").find(".datagrid-toolbar").toggle(!readonly);
			}
		}
		else {
			if (formMode == FormMode.forSet) {
				var dgOpt = $.extend({
					url: getQueryUrl(formData)
				}, opt[datagrid]);
				if (opt.toolbar) {
					jtbl.jdata().toolbar = opt.toolbar;
					dgOpt.toolbar = WUI.dg_toolbar(jtbl, $());
				}
				jtbl[datagrid](dgOpt);
			}
		}
	}

	// 根据主表数据和relatedKey设置子表固定数据
	function setObjParam(objParam, formData) {
		// 格式示例: `relId={id}`, `type='工艺'`, `flag=1`
		var map = objParam.fixedFields = {};
		relatedKey.replace(/(\w+)=(?:\{(\w+)\}|(\S+))/g, function (ms, key, key2, value) {
			if (key2) {
				map[key] = formData[key2];
				if (map[key] === undefined)
					map[key] = "";
			}
			else {
				map[key] = value.replace(/['"]/g, '');
			}
		});
	}

	function toggle(show) {
		if (inTab) {
			toggleTab(jtabs, tabIndex, show);
		}
		else {
			jo.toggle(show);
		}
	}

	// 根据主表数据和relatedKey设置url
	function getQueryUrl(formData) {
		var cond = relatedKey.replace(/\{(\w+)\}/g, function (ms, ms1) {
			var val = formData[ms1];
			// 支持`xx in (1,3,4)`方式
			if (/^[\d,]+$/.test(val))
				return val;
			return Q(val);
		});
		var param = {cond: cond, res: opt.res};
		// 树型子表，一次全部取出
		if (opt.treegrid)
			param.pagesz = -1;
		return WUI.makeUrl(opt.obj + ".query", param);
	}
}

/**
@key easyui-tabs

扩展: 若未指定onSelect回调, 默认行为: 点Tab发出tabSelect事件, 由Tab自行处理
*/
$.fn.tabs.defaults.onSelect = function (title, idx) {
	$(this).tabs("getTab", idx).trigger("tabSelect");
	console.log('onSelect', arguments);
};

/**
@fn WUI.toggleTab(jtabs, which, show, noEvent?)

禁用或启用easyui-tabs组件的某个Tab页.
which可以是Tab页的索引数或标题.
示例:

	var jtabs = jdlg.find(".easyui-tabs");
	WUI.toggleTab(jtabs, "组合物料", formData.type == "P");

 */
self.toggleTab = toggleTab;
function toggleTab(jtabs, which, show, noEvent) {
	var jtab = jtabs.tabs("getTab", which);
	jtabs.tabs(show?"enableTab":"disableTab", which);
	// jtab.toggle(show); // 如果用隐藏, 且刚好jtab是当前活动Tab, 则有问题: 其它Tab无法点击
	jtab.css("visibility", show?"visible":"hidden");
}

self.getFormItemExt["wui-subobj"] = function (ji) {
	if (ji.hasClass("wui-subobj")) {
		return new SubobjFormItem(ji);
	}
}

function SubobjFormItem(ji) {
	WUI.FormItem.call(this, ji);
}
SubobjFormItem.prototype = $.extend(new WUI.FormItem(), {
	getName: function () {
		var opt = WUI.getOptions(this.ji);
		return opt.valueField;
	},
	getDisabled: function () {
		var opt = WUI.getOptions(this.ji);
		return opt.disabled;
	},
	setDisabled: function (val) {
		this.ji.trigger("setOption", {disabled: val});
	},
	getReadonly: function () {
		var opt = WUI.getOptions(this.ji);
		return opt.readonly;
	},
	setReadonly: function (val) {
		this.ji.trigger("setOption", {readonly: val});
	},
	getValue: function () {
		var opt = WUI.getOptions(this.ji);
		WUI.assert(opt.dgCall);
		opt.forceLoadData();
		var rows = opt.dgCall("getData").rows; // 就是jtbl.datagrid("getData")
		return rows;
	},
	setValue: function (val) {
		var opt = WUI.getOptions(this.ji);
		WUI.assert(opt.dgCall);
		opt.forceLoadData();
		opt.dgCall("loadData", val);
	},
	getTitle: function () {
		return this.ji.panel("options").title;
	},
	setTitle: function (val) {
		this.ji.closest(".easyui-tabs").tabs("update", {
			tab: this.ji,
			options: { title: val }
		});
	},
	visible: function (v) {
		var ji = this.getShowbox();
		if (v === undefined) {
			return ji.is(":visible");
		}
		ji.toggle(!!v);
		return this;
	},
	setFocus: function () {
		var title = this.getTitle();
		this.ji.closest(".easyui-tabs").tabs("select", title);
	}
});

/**
@key .wui-picker 字段编辑框中的小按钮

@key .wui-picker-edit 手工编辑按钮

示例：输入框后添加一个编辑按钮，默认不可编辑，点按钮编辑：

	<input name="value" class="wui-picker-edit">

特别地：

- 添加时，如果有required属性，默认可编辑；
- 查找时，如果这是个可查找字段则可编辑，且不显示picker按钮

要查看该字段是否绝对只读（不显示picker按钮，不可手工编辑），可以通过gn函数：

	var it = jo.gn(); // 或从对话框来取如 jdlg.gn("xxx")
	var ro = it.readonly();
	it.readonly(ro);

@key .wui-picker-help 帮助按钮

示例：输入框后添加一个帮助按钮：

	<input name="value" class="wui-picker-help" data-helpKey="取消工单">

点击帮助按钮，跳往WUI.options.helpUrl指定的地址。如果指定data-helpKey，则跳到该锚点处。

可以多个picker一起使用。

帮助链接：(加wui-help类则点击可跳转，同时也支持用data-helpKey属性指定主题)

	<a class="wui-help"><span><i class="fa fa-question-circle"></i>帮助</span></a>

*/

self.m_enhanceFn[".wui-picker-edit, .wui-picker-help, .wui-help"] = enhancePicker;
function enhancePicker(jo)
{
	var jbtns = $();
	if (jo.hasClass("wui-picker-edit")) {
		jo.prop("realReadonly", false);
		var jbtn = $("<a></a>");
		jbtn.linkbutton({
			iconCls: 'icon-edit',
			plain: true
		});
		jbtns = jbtns.add(jbtn);

		jbtn.click(enable);
		jo.blur(disable);

		var jdlg = jo.closest(".wui-dialog");
		// 将事件处理推迟到validatebox等初始化之后
		setTimeout(function () {
			jdlg.on("beforeshow", onBeforeShowForPickerEdit);
		});
	}
	if (jo.hasClass("wui-picker-help")) {
		var jbtn = $("<a></a>");
		jbtn.linkbutton({
			iconCls: 'icon-help',
			plain: true
		});
		jbtns = jbtns.add(jbtn);

		jbtn.click(help);
	}
	if (jo.hasClass("wui-help")) {
		jo.click(function () {
			help();
			return false;
		});
	}

	if (jbtns.length > 0) {
		jo.after(jbtns);
		if (jo.is(":input"))
			jo.css("margin-right", -5 -24 * jbtns.length);
		if (jo.is("textarea"))
			jo.css("vertical-align", "top");
	}

	function enable() {
		jo.prop("readonly", false);
	}
	function disable() {
		// 对话框查询模式(forFind)下不禁用
		if (jo.hasClass("wui-find-field"))
			return;
		jo.prop("readonly", true);
	}
	function help() {
		var url = WUI.options.helpUrl;
		if (! url)
			return;
		if (jo.attr("data-helpKey"))
			url += "#" + jo.attr("data-helpKey");
		window.open(url);
	}
	function onBeforeShowForPickerEdit(ev, formMode, opt) {
		// 添加模式下，如果是个带required属性的组件，不禁用
		var required = jo.prop("required");
		if (!required) {
			var d = jo.data("validatebox");
			if (d && d.options && d.options.required)
				required = true;
		}
		if (formMode == FormMode.forFind || (formMode == FormMode.forAdd && required)) {
			enable();
		}
		else {
			disable();
		}
	}
}

self.getFormItemExt["wui-picker-edit"] = function (ji) {
	if (ji.hasClass("wui-picker-edit")) {
		return new PickerFormItem(ji);
	}
}

function PickerFormItem(ji) {
	WUI.FormItem.call(this, ji);
//	this.jdlg = ji.closest(".wui-dialog");
}
PickerFormItem.prototype = $.extend(new WUI.FormItem(), {
	getReadonly: function () {
		return this.ji.prop("realReadonly");
	},
	setReadonly: function (val) {
		this.ji.prop("realReadonly", !!val);
		if (this.ji.hasClass("wui-find-field")) {
			this.ji.prop("readonly", !!val);
			this.ji.next("a").css("visibility", "hidden");
			return;
		}
		this.ji.next("a").css("visibility", val? "hidden": "visible");
	}
});

/**
@key .wui-more 可折叠的在线帮助信息

显示一个按钮，用于隐藏（默认）或显示后面的内容。基于easyui-linkbutton创建，兼容该组件的options比如图标.

	示例: 列对应: title=code,-,amount 
	<span class="wui-more" data-options="iconCls: 'icon-tip'">更多示例</span>
	<pre>
	映射方式对应: title=编码->code, Total Sum->amount&amp;useColMap=1
	根据code, 存在则更新: title=code,amount&amp;uniKey=code
	根据code, 批量更新: title=code,amount&amp;uniKey=code!
	带子表: title=code,amount,@order1.itemCode,@order1.qty&amp;uniKey=code
	</pre>

	<span class="wui-more"><i class="fa fa-question-circle"></i> 代码示例</span>
	<pre class="hint">
	$env->get("地址", "value");
	$env->set("地址", "value", "上海市XX区");
	</pre>

@see .wui-help
*/
self.m_enhanceFn[".wui-more"] = enhanceMoreBtn;
function enhanceMoreBtn(jo)
{
	var jmore = jo.nextAll();
	jmore.hide();
	jo.linkbutton({
//		iconCls: 'icon-tip',
//		plain: true,
		toggle: true
	});
//	jo.css({float: "left"});
	jo.click(function () {
		jmore.toggle();
	});
}

/**
@fn WUI.showByType(jo, type)

(v6) 该函数已不建议使用。本来用于显示多组mycombobox/wui-combogrid组件，现成推荐直接用组件的setOption事件动态修改组件选项。

对话框上form内的一组控件中，根据type决定当前显示/启用哪一个控件。

需求：ItemStatusList定义了Item的状态，但当Item类型为“报修”时，其状态使用`ItemStatusList_报修`，当类型为“公告”时，状态使用ItemStatusList_公告，其它类型的状态使用ItemStatusList

HTML: 在对话框中，将这几种情况都定义出来：

	<select name="status" class="my-combobox" data-options="jdEnumList:ItemStatusList"></select>
	<select name="status" class="my-combobox type-报修" style="display:none" data-options="jdEnumList:ItemStatusList_报修"></select>
	<select name="status" class="my-combobox type-公告" style="display:none" data-options="jdEnumList:ItemStatusList_公告"></select>

注意：当type与“报修”时，它按class为"type-报修"来匹配，显示匹配到的控件（并添加active类），隐藏并禁用其它控件。
如果都不匹配，这时看第一条，如果它不带`type-xxx`类，则使用第一条来显示，否则所有都不启用（隐藏、禁用）。

JS: 根据type设置合适的status下拉列表，当type变化时更新列表：

	function initDlgXXX()
	{
		...
		jdlg.on("beforeshow", onBeforeShow);
		// 1. 根据type动态显示status
		$(frm.type).on("change", function () {
			var type = $(this).val();
			WUI.showByType(jfrm.find("[name=status]"), type);
		});
		function onBeforeShow(ev, formMode, opt) 
		{
			...
			setTimeout(onShow);
			function onShow() {
				...
				// 2. 打开对话框时根据type动态显示status
				$(frm.type).trigger("change");
			}
		}
	}

支持combogrid组件，注意combogrid组件用"[comboname]"而非"[name]"来找jQuery组件：

	WUI.showByType(jdlg.find("[comboname=orderId]"), type);

HTML示例：

	<tr>
		<td class="orderIdTd">关联单据</td>
		<td>
			<input name="orderId" class="wui-combogrid type-生产领料 type-生产调拨 type-生产入库 type-生产退料" data-options="ListOptions.OrderGrid({type:'生产工单'})">
			<input name="orderId" class="wui-combogrid type-销售" data-options="ListOptions.OrderGrid({type:'销售计划'})">
			...
		</td>
	</tr>

支持组件状态被动态修改，比如添加模式时打开对话框就禁用该组件：

	jdlg.find("[comboname=orderId]").combogrid({disabled: forAdd});

这时调用showByType后，active组件仍会保持disabled状态。类似的，如果调用者先隐藏了组件，则调用showByType后active组件也是隐藏的。

注意：对tr等包含输入框的块组件也可使用，但要求内部只有一个带name的输入组件，且各块的内部输入组件的name都相同。

		<tr class="optional type-出库">...<input name="orderId">...</tr>
		<tr class="optional type-入库">...<input name="orderId">...</tr>

JS控制：

	WUI.showByType(jdlg.find("tr.optional"), type);

当一个块不显示时，其内部的带name的输入组件被设置disabled，提交时不会带该字段。
如果块内部包含多个输入框，或各块内的输入框的name不同，如果各块内所有输入框都默认显示、未禁用（也不会动态修改显示、禁用），这时也可以使用showByType，否则会有问题。
*/
self.showByType = showByType;
function showByType(jo, type) {
	var it = jo.hasClass("combo-f")? showByType.comboInterface :
		showByType.defaultInterface;

	// ja: 原active项，可能为空; 切换active项时，保持原有各状态不变
	var ja = it.getActive(jo);
	var visible = ja.size()>0? it.getVisible(ja): true;
	var disabled = ja.size()>0? it.getDisabled(ja): false;

	var jinit = it.getInitJo(jo); // jinit是带有原始type和class的元素
	var j1 = type? jinit.filter(".type-" + type): ja;
	if (j1.size() == 0) {
		// 如果第一个jo中没有设置type-xxx，则尝试用第一个做active; 否则就没有active项
		var cls = jinit.first().attr("class");
		if (cls && cls.indexOf("type-") < 0)
			j1 = jo.first();
	}
	jo.each(function () {
		var je = $(this);
		if (j1.size() >0 && j1[0] == je[0]) {
			it.setActive(je, true);
			it.setDisabled(je, disabled);
			it.setVisible(je, visible);
		}
		else {
			it.setActive(je, false);
			it.setDisabled(je, true);
			it.setVisible(je, false);
		}
	});
}

showByType.defaultInterface = {
	getInitJo: function (jo) {
		return jo;
	},
	getActive: function (jo) {
		return jo.filter(".active");
	},
	setActive: function (jo, val) {
		jo.toggleClass("active", val);
	},
	getVisible: function (jo) {
		return jo.is(":visible");
	},
	setVisible: function (jo, val) {
		return jo.toggle(val);
	},
	getDisabled: function (jo) {
		if (jo.is("[name]"))
			return jo.prop("disabled");
		return jo.find("[name]").prop("disabled");
	},
	setDisabled: function (jo, val) {
		if (jo.is("[name]"))
			jo.prop("disabled", val);
		else
			jo.find("[name]").prop("disabled", val);
	}
}

// combobox/combogrid特别处理 jo: hidden对象
// DOM结构为: input[comboname].combo-f.textbox-f(是隐藏的,原始type类加在这里), 
// 			span.combo(应隐藏它), input[type=hidden][name].textbox-value (jo:原始带name的字段,应disable它)
showByType.comboInterface = $.extend({}, showByType.defaultInterface, {
	getVisible: function (jo) {
		return jo.next().is(":visible");
	},
	setVisible: function (jo, val) {
		return jo.next().toggle(val);
	},
	getDisabled: function (jo) {
		return jo.next().find(".textbox-value").prop("disabled");
	},
	setDisabled: function (jo, val) {
		return jo.next().find(".textbox-value").prop("disabled", val);
	}
});

/**

@fn diffObj(obj, obj1)

返回null-无差异，如果是对象与对象比较，返回差异对象，否则返回true表示有差异

	var rv = diffObj({a:1, b:99}, {a:1, b:98, c:100});
	// rv: {b:98, c:100}

	var rv = diffObj([{a:1, b:99}], [{a:1, b:99}]);
	// rv: null (无差异)

	var rv = diffObj([{a:1, b:99}], [{a:1, b:99}, {a:2}]);
	// rv: true
	
	var rv = diffObj("hello", "hello");
	// rv: null (无差异)

	var rv = diffObj("hello", 99);
	// rv: true
 */

function diffObj(obj, obj1)
{
	if (obj == obj1)
		return null;

	if (typeof obj != typeof obj1)
		return true;

	if ($.isArray(obj) && $.isArray(obj1)) {
		for (var i=0; i<obj1.length; ++i) {
			if (diffObj(obj[i], obj1[i]) != null)
				return true;
		}
		return null;
	}
	if (!$.isPlainObject(obj))
		return JSON.stringify(obj) == JSON.stringify(obj1)? null: true;

	var ret = {};
	$.each(obj1, function (k, v) {
		if (obj[k] === undefined || typeof(obj[k]) != typeof(v)) {
			ret[k] = v;
			return;
		}
		if (diffObj(obj[k], v) != null)
			ret[k] = v;
	});
	return $.isEmptyObject(ret)? null: ret;
}

/**
@fn showDataReport(opt={ac, @gres, @gres2?, res?, cond?, title?="统计报表", detailPageName?, detailPageParamArr?, resFields?, cond2?, tmField?, showChart?, chartType?=line})

选项说明：

- res: 汇总字段，默认为`COUNT(*) 数量`
- gres: 行统计字段。须为数组，示例：`["userPhone", "userName 用户", null, "status 状态=CR:新创建;RE:已完成"]`。
	数组每个元素符合后端query接口res参数要求，可以是1个字段也可以是逗号分隔的多个字段；如果为空则跳过。
	注意：时间字段固定用"y 年", "m 月", "d 日", "h 时", "q 季度", "w 周", "wd 周几"这些。这样当点开统计对话框时，可自动选上相应的时间字段，比如`["y 年", "m 月"]`将自动选中"时间-年"和"时间-月";
	特别地，月报固定用 ["y 年,m 月"](配合tmUnit: "y,m", 统计图中可自动补齐缺失日期)，日报用 ["y 年,m 月,d 日"] (配合tmUnit: "y,m,d")。
- gres2: 列统计字段。格式与gres相同。
- cond: 查询条件，字符串，示例：WUI.getQueryCond({id: ">1", status: "CR,RE", createTm: ">=2020-1-1 and <2021-1-1"}), 用getQueryCond可使用查询框支持的条件格式。
- orderby: 排序方式
- title: 统计页面标题
- detailPageName: 在统计表中点击数值，可以显示明细页面。这里指定用哪个页面来显示明细项；如果未指定则不显示到明细页的链接。可以用"pageSimple"来显示通用页面。
- detailPageParamArr: 如果指定了detailPageName，可以用此参数来定制showPage的第三参数(paramArr)。
- tmField: 如果用到y,m,d等时间统计字段，应指定使用哪个时间字段进行运算。后端可能已经定义了时间字段(tmCols)，指定该选项可覆盖后端的定义。

- resFields: 用户可选择的字段列表（如res, cond中出现的字段）。如果指定（或指定了gres或gres2），则工具栏多出“统计”按钮，可供用户进一步设置。
 注意gres,gres2,tmField中的字段会被自动加入，在resFields中指定或不指定都可以。

- showChart: 是否显示统计图表对话框。
- tmUnit: 用于统计图，特别用于月报、日报等，会自动补齐缺少的时间。常用有："y,m"-年月,"y,m,d"-年月日。注意一旦指定tmUnit则orderby选项自动与tmUnit相同。
- chartType: line-折线图(默认), bar-直方图, pie-饼图

- showSum: 自动添加统计行或列
- pivotSumField: 统计列列名，默认为"合计"

- queryParam: 直接指定查询参数，如`{for: "xx报表"}`
- frozen: 指定冻结列个数，冻结列不随着滚动条左右移动，`frozen:1`表示冻结1列。参考[pageSimple]中的冻结列。

@see JdcloudStat.tmUnit 

- cond2: 内部使用，在cond基础上再加一层过滤，由报表对话框上用户设置的条件生成。
 在cond基础上再加一层过滤，条件由统计对话框上设置。参考WUI.getQueryCond。示例: 

示例：

	WUI.showDataReport({
		ac: "Employee.query",
		gres: ["depName 部门", "性别"],
		gres2: ["职称", "学历"],
		cond: WUI.getQueryCond({status: '在职'}),
		detailPageName: "pageEmployee1",
		title: "师资报表"
	});

示例：订单月报

	WUI.showDataReport({
		ac: "Ordr.query",
		res: "SUM(amount) 总和", // 不指定则默认为`COUNT(1) 总数`
		tmField: "createTm 创建时间",
		gres: ["y 年,m 月", "status 状态=CR:新创建;RE:已完成;CA:已取消"],
		gres2: ["dscr 订单类别"],
		cond: WUI.getQueryCond({createTm: ">=2020-1-1 and <2021-1-1", status: "CR,RE,CA"}), // 生成条件字符串
		detailPageName: "pageOrder",
		title: "订单月报",

		// 定义用户可选的字段，定义它或gres/gres2会在工具栏显示“统计”按钮。注意不需要定义y,m等时间字段，它们由tmField自动生成。
		resFields: "amount 金额, status 状态=CR:新创建;RE:已完成;CA:已取消, dscr 订单类别, userName 用户, userPhone 用户手机号, createTm 创建时间",

		// showChart: true, // 显示统计图
		// gres: ["y 年,m 月"],
		// tmUnit: "y,m",
	});

示例：订单状态占比, 显示饼图（当只有gres没有gres2，且没有tmUnit时，可自动显示饼图）

	WUI.showDataReport({
		ac: "Ordr.query",
		res: "COUNT(1) 总数", // 不指定则默认为`COUNT(1) 总数`
		gres: ["status 状态=CR:新创建;RE:已完成;CA:已取消"],
		detailPageName: "pageOrder",
		title: "订单状态占比",

		// 定义用户可选的字段，定义它或gres/gres2会在工具栏显示“统计”按钮。注意不需要定义y,m等时间字段，它们由tmField自动生成。
		resFields: "amount 金额, status 状态=CR:新创建;RE:已完成;CA:已取消, dscr 订单类别, userName 用户, userPhone 用户手机号, createTm 创建时间",

		showChart: true, // 显示统计图
		orderby: "总数 DESC"
	});

示例：多个统计项：订单状态报表，同时统计数量和金额：

	WUI.showDataReport({
		ac: "Ordr.query",
		res: "COUNT(1) 总数, SUM(amount) 总金额",
		gres: ["status 状态=CR:新创建;RE:已完成;CA:已取消"],
		// gres2: ["dscr 订单类别"], // 试试加上列统计项有何样式区别
		detailPageName: "pageOrder",
		title: "订单状态占比",
		// showSum: true, // 自动添加行列统计

		// 定义用户可选的字段，定义它会在工具栏显示“统计”按钮。注意不需要定义y,m等时间字段，它们由tmField自动生成。
		resFields: "amount 金额, status 状态=CR:新创建;RE:已完成;CA:已取消, dscr 订单类别, userName 用户, userPhone 用户手机号, createTm 创建时间",
	});

注意：统计图(showChart:true)目前只支持第一个统计项。

res中也可以加一些不用于统计的字段，统计列必须放在res最后面，系统会自动将res中最后若干个连续地以COUNT或SUM聚合的字段会当成统计列。

	WUI.showDataReport({
		ac: "Ordr.query",
		res: "userName 用户, userPhone 手机号, createTm 创建时间, COUNT(1) 总数, SUM(amount) 总金额", // 自动识别2个统计列，调用query接口时设置参数`pivotCnt:2`
		gres: ["status 状态=CR:新创建;RE:已完成;CA:已取消"],
		gres2: ["dscr 订单类别"],
		detailPageName: "pageOrder",
		title: "订单状态占比",
		showSum: true, // 自动添加行列统计
	});

 */
self.showDataReport = showDataReport;
function showDataReport(opt, showPageOpt)
{
	self.assert(opt && opt.ac, "选项ac未指定");
	opt = $.extend({
		title: T("统计报表"),
		res: "COUNT(*) 数量",
		gres: [],
		gres2: [],
		detailPageParamArr: []
	}, opt);

	var gres = [];
	var gres2 = [];
	var gresAll = [];
	var pivot = [];

	self.assert($.isArray(opt.gres), "gres必须为数组");
	opt.gres.forEach(function (e0) {
		if (! e0)
			return;
		e0.split(/\s*,\s*/).forEach(function (e) {
			if (! e)
				return;
			gres.push(e);
			gresAll.push(e);
		});
	});

	self.assert($.isArray(opt.gres2), "gres2必须为数组");
	opt.gres2.forEach(function (e0) {
		if (! e0)
			return;
		e0.split(/\s*,\s*/).forEach(function (e) {
			if (! e)
				return;
			gres2.push(e);
			gresAll.push(e);
			var rv = getFieldInfo(e);
			pivot.push(rv.title);
		});
	});

	var cond = opt.cond;
	if (opt.cond2) {
		if (cond)
			cond += " AND (" + opt.cond2 + ")";
		else
			cond = opt.cond2;
	}

	var resCols = opt.res.split(/\s*,\s*/);
	var sumTitles = [];
	for (var idx=resCols.length-1; idx >= 0; -- idx) {
		var res = resCols[idx];
		var rv = getFieldInfo(res);
		// 目前后端允许使用：count|sum|max|min|avg|countif|sumif
		if (! /\b(\w+)\b[()]/i.test(rv.name))
			break;
		sumTitles.unshift(rv.title);
	}
	var queryParams = $.extend({
		res: opt.res,
		cond: cond,
		orderby: opt.orderby,
		tmField: opt.tmField && opt.tmField.split(' ')[0],
		gres: gresAll.join(','),
		pagesz: -1
	}, opt.queryParam);
	if (pivot.length > 0) {
		queryParams.pivot = pivot.join(',');
		queryParams.pivotCnt = sumTitles.length;
	}
	if (opt.showSum) {
		if (pivot.length == 0) {
			queryParams.sumFields = sumTitles.join(',');
		}
		else {
			queryParams.pivotSumField = (opt.pivotSumField || "合计");
		}
	}
	var url = WUI.makeUrl(opt.ac, queryParams);
	WUI.showPage("pageSimple", opt.title + "!", [url, {frozen: opt.frozen}, onInitGrid]);

	function onInitGrid(jpage, jtbl, dgOpt, columns, data)
	{
		// 用于dlgDataReport对话框打开时读取并继续设置参数
		jtbl.data("showDataReportOpt", opt);
		// 加个报表按钮
		//dgOpt.toolbar = WUI.dg_toolbar(jtbl, null, "report");
		if (opt.resFields || gresAll.length > 0) {
			var arr = opt.resFields? opt.resFields.split(/\s*,\s*/): [];
			$.each(gresAll, function (i, e) {
				// 排除tmField衍生的时间字段
				if (e && !/^(y|m|d|h|q|w|wd) /.test(e) && arr.indexOf(e) < 0)
					arr.push(e);
			});
			if (opt.tmField && arr.indexOf(opt.tmField) < 0)
				arr.push(opt.tmField);
			opt.resFields = arr.join(',');
			if (opt.resFields)
				dgOpt.toolbar.push.apply(dgOpt.toolbar, WUI.dg_toolbar(jtbl, null, "report"));
		}

		// dgOpt: datagrid的选项，如设置 dgOpt.onClickCell等属性
		// columns: 列数组，可设置列的formatter等属性
		// data: ajax得到的原始数据
		var rowCnt = data.d && data.d.length || 0;
		var sumCol = gres.length + (resCols.length - sumTitles.length);
		if (queryParams.hiddenFields) {
			queryParams.hiddenFields.split(',').forEach(function (e) {
				if (gres.indexOf(e) >= 0)
					-- sumCol;
			});
		}
		$.each(columns, function (i, col) {
			if (i >= sumCol) {
				if (opt.detailPageName)
					col.formatter = getFormatter(col, rowCnt);
				col.sortable = true;
				col.sorter = numberSort;
				if (opt.showSum && queryParams.pivotSumField == col.title) {
					col.isSumCol = true;
				}
			}
			else {
				col.sortable = true;
			}
		});
		// 统计是在一页内全部显示，故只用本地排序；用sumRow
		dgOpt.remoteSort = false;
		// dgOpt.sumRow是datagrid扩展选项，用于最后一行不参与排序。
		if (opt.showSum && rowCnt > 1)
			dgOpt.sumRow = 1;

		// console.log(columns);

		if (opt.showChart) {
			var data1 = data;
			if (opt.showSum) {
				// 自动去除统计行或列
				data1 = $.extend(true, {}, data);
				if (queryParams.pivotSumField == data1.h[data1.h.length-1])
					data1.h.pop();
				if (data1.d.length > 1)
					data1.d.pop();
			}
			var xlen = gres.length;
			var rs2StatOpt = {
				xcol: range(0, xlen),
				ycol: range(sumCol, data1.h.length),
				tmUnit: opt.tmUnit
			};
			if (opt.chartType == "pie") {
				rs2StatOpt.maxSeriesCnt = 10;
				if (rs2StatOpt.tmUnit)
					rs2StatOpt.noTmInsert = 1;
			}
			var seriesOpt = {
				type: opt.chartType || "line",
//				stack: rs2statopt.ycol.length>1? "X": undefined // 堆叠柱图
			};
			self.showDlgChart(data1, rs2StatOpt, seriesOpt);
		}
	}
	function getFormatter(col, rowCnt) {
		return formatter_sum;

		function formatter_sum(value, row, rowIdx) {
			if (!value)
				return;
			if ($.isArray(value)) {
				value = value.map(function (e, i) {
					return sumTitles[i] + ": " + e;
				}).join("<br>");
			}
			return WUI.makeLink(value, function () {
				var cond = {};
				// 最后一行设置isSumRow标记
				var isSumRow = (opt.showSum && rowIdx > 0 && rowIdx == rowCnt-1);
				if (!isSumRow) {
					gres.forEach(function (e, i) {
						var rv = getFieldInfo(e);
						var val = row[rv.title];
						if (val === null || val === "(null)") {
							val = "null";
						}
						else if (val === "") {
							val = "empty";
						}
						else if (rv.enumMapReverse) {
							val = rv.enumMapReverse[val];
						}
						cond[rv.name] = val;
					});
				}
				if (!col.isSumCol) {
					gres2.forEach(function (e, i) {
						var rv = getFieldInfo(e);
						var val = col.title.split('-')[i]; // col.title: "field1-field2"
						if (val === "(null)") {
							val = "null";
						}
						else if (val === "") {
							val = "empty";
						}
						else if (rv.enumMapReverse) {
							val = rv.enumMapReverse[val];
						}
						cond[rv.name] = val;
					});
				}
				console.log(cond);
				if (queryParams.cond) {
					cond = [queryParams.cond, cond];
				}

				var title = opt.title + "-明细项!";
				if (opt.detailPageName) {
					// _pageFilterOnly防止datagrid上有其它查询参数影响结果
					var queryParams1 = {cond: cond, _pageFilterOnly: true};
					if (queryParams.tmField)
						queryParams1.tmField = queryParams.tmField;
					opt.detailPageParamArr[1] = queryParams1;
					self.showPage(opt.detailPageName, title, opt.detailPageParamArr);
				}
				else if (opt.detailPageName == "pageSimple") {
					var url = WUI.makeUrl(opt.ac, {
						cond: cond,
					});
					self.showPage("pageSimple", title, [url])
				}
			});
		}
	}
	// 区间 [start, end)
	function range(start, end) {
		var ret = [];
		for (var i=start; i<end; ++i) {
			ret.push(i);
		}
		return ret;
	}

	// "name", "name title", 'name "title"', "name =CR:xx;RE:yy", "name title=CR:xx;RE:yy"
	// return {name, title, enumMapReverse?}
	function getFieldInfo(res)
	{
		var arr = res.split2(' ');
		var name = arr[0];
		var title = name;
		var mapStr = null;
		if (arr.length > 1) {
			var arr1 = arr[1].split('=');
			if (arr1.length == 1) {
				title = arr1[0];
			}
			else {
				if (arr1[0])
					title = arr1[0];
				mapStr = arr1[1];
			}
		}
		var rv = {name:name, title:title};
		if (mapStr) {
			rv.enumMapReverse = WUI.parseKvList(mapStr, ";", ":", true);
		}
		return rv;
	}
}

var dfdStatLib_;
window.loadStatLib = loadStatLib;
function loadStatLib()
{
	if (dfdStatLib_ == null) {
		dfdStatLib_ = $.when(
			WUI.loadScript("lib/echarts.min.js"),
			WUI.loadScript("lib/jdcloud-wui-stat.js")
		);
	}
	return dfdStatLib_;
}

/**
@fn showDlgChart(data, rs2StatOpt, seriesOpt, chartOpt)

- data: 可以是数据，也可以是deferred对象（比如callSvr返回）
- rs2StatOpt: 数据转换选项，参考rs2Stat
- seriesOpt, chartOpt: 参考echarts全局参数以及series参数: https://echarts.apache.org/zh/option.html#series
  echarts示例：https://echarts.apache.org/examples/zh/index.html

@see WUI.rs2Stat 图表数据转换
@see WUI.initChart　显示图表
@see pageSimple 通用列表页

示例：

```javascript
// 各状态订单数: 柱图
WUI.showDlgChart(callSvr("Ordr.query", {
	gres: "status =CR:新创建;RE:已完成;CA:已取消",
	res: "count(*) 总数",
}));

// 也可以与pageSimple列表页结合，同时显示列表页和统计图：
var url = WUI.makeUrl("Ordr.query", {
	gres: "status 状态=CR:新创建;RE:已完成;CA:已取消",
	res: "count(*) 总数",
});
var showChartParam = []; // 必须指定数组，即showDlgChart的后三个参数：[rs2StatOpt, seriesOpt, chartOpt]
WUI.showPage("pageSimple", "订单统计!", [url, null, null, showChartParam]);

// 各状态订单数: 饼图，习惯上应占比排序
WUI.showDlgChart(callSvr("Ordr.query", {
	gres: "status =CR:新创建;RE:已完成;CA:已取消",
	res: "count(*) 总数",
	orderby: "总数 DESC"
}), null, {
	type: "pie"
});

// 订单年报
WUI.showDlgChart(callSvr("Ordr.query", {
	gres: "y",
	res: "count(*) 总数",
}));

// 订单月报，横坐标为年月（两列）
WUI.showDlgChart(callSvr("Ordr.query", {
	gres: "y,m",
	res: "count(*) 总数",
}), {  // rs2StatOpt
	xcol:[0,1]
});

// 订单月报，指定tmUnit，注意加orderby让时间排序，支持自动补齐缺少的时间
WUI.showDlgChart(callSvr("Ordr.query", {
	gres: "y,m",
	res: "count(*) 总数",
	orderby: "y,m"
}), {  // rs2StatOpt
	tmUnit: "y,m"
});

// 也可以与pageSimple列表页结合，同时显示列表页和统计图：
var url = WUI.makeUrl("Ordr.query", {
	gres: "y 年,m 月",
	res: "count(*) 总数",
	orderby: "y,m"
});
var showChartParam = [ {tmUnit: "y,m"} ];
WUI.showPage("pageSimple", "订单统计!", [url, null, null, showChartParam]);

// 订单各月占比，显示为饼图，哪个月订单多则排在前
WUI.showDlgChart(callSvr("Ordr.query", {
	gres: "y,m",
	res: "count(*) 总数",
	orderby: "总数 DESC"
}), {  // rs2StatOpt
	xcol:[0,1]
}, { // seriesOpt
	type: "pie"
}, { // chartOpt
	title: { text: "订单各月分布" }
});

// 分状态订单月报
WUI.showDlgChart(callSvr("Ordr.query", {
	gres: "y,m,status =CR:新创建;RE:已完成;CA:已取消",
	res: "count(*) 总数",
	orderby: "y,m"
}), {  // rs2StatOpt
	tmUnit: "y,m"
});

// 同上，配置堆积柱状图，配置stack
WUI.showDlgChart(callSvr("Ordr.query", {
	gres: "y,m,status =CR:新创建;RE:已完成;CA:已取消",
	res: "count(*) 总数",
	orderby: "y,m"
}), {  // rs2StatOpt
	tmUnit: "y,m"
}, { // seriesOpt
	type: "bar",
	stack: "X"
}, { // chartOpt
	// swapXY: true // 横向柱状图
});

// 分用户订单月报
WUI.showDlgChart(callSvr("Ordr.query", {
	cond: {createTm: ">=2010-1-1 and <2030-1-1"},
	gres: "userId",
	res: "userName,count(*) 总数",
	orderby: "总数 DESC"
}), {  // rs2StatOpt
	xcol: 1
},{ // seriesOpt
	type: 'pie', // 饼图
});

// 分用户订单月报
WUI.showDlgChart(callSvr("Ordr.query", {
	cond: {createTm: ">=2020-1-1 and <2021-1-1"},
	gres: "y,m,userId",
	res: "userName,count(*) 总数",
	orderby: "y,m"
}), {  // rs2StatOpt
	tmUnit: "y,m"
}, { // seriesOpt
	type: 'bar',
});
```
 */
self.showDlgChart = showDlgChart;
function showDlgChart(data, rs2StatOpt, seriesOpt, chartOpt)
{
	var dfd = loadStatLib();
	$.when(dfd, data).then(function (tmp, data) {
		showChart(data);
	});

	function showChart(data)
	{
		var jdlg = $('<div style="width:800px; height:600px;"><div id="divChart" style="width:100%;height:100%"></div></div>');
		WUI.showDlg(jdlg, {
			title: "统计图",
			onOk: function () {
				WUI.closeDlg($(this));
			}
		});

		var jchart = jdlg.find("#divChart");
		var statData = WUI.rs2Stat(data, rs2StatOpt);
		// 饼图配置
		if (seriesOpt && seriesOpt.type == "pie") {
			seriesOpt = $.extend(true, {
				type: 'pie',
				itemStyle: {
					normal: {
						label: {
							show: true,
							formatter: '{b}: {d}%'
						}
					}
				}
			}, seriesOpt);
		}
		// 柱图配置
		else if (!seriesOpt || seriesOpt.type == "bar" || seriesOpt.type == "line") {
			chartOpt = $.extend(true, {
				toolbox: {
					show: true,
					feature: {
						saveAsImage: { show: true },
						dataView: { show: true },
						magicType: {type: ['line', 'bar', 'stack']},
						restore: { show: true}
					}
				}
			}, chartOpt);
		}
		setTimeout(onShow);

		function onShow() {
			WUI.initChart(jchart[0], statData, seriesOpt, chartOpt);
		}
	}
}

// 对象对话框上右键操作
$(document).on('contextmenu', '.wui-dialog[my-obj]', dlg_onContextMenu);
function dlg_onContextMenu(ev) {
	if (ev.target != this && ev.target.tagName != 'TD')
		return;

	var jdlg = $(this);
	var jtarget = $(ev.target);
	var menus = [];
	if (ev.target.tagName == 'TD') {
		var jo = jtarget.next();
		if (jo.find('[name]').size() > 0) {
			menus.push('<div id="find" data-options="iconCls:\'icon-search\'">查询该字段</div>');
		}
	}
	var objParam = jdlg.prop('objParam');
	if (objParam && !objParam.readonly && objParam.mode == FormMode.forSet) {
		var perm = jdlg.attr("wui-perm") || jdlg.dialog("options").title;
		if (WUI.canDo(perm, '新增'))
			menus.push('<div id="dup" data-options="iconCls:\'icon-add\'">再次新增</div>');
	}
	if (menus.length == 0)
		return;
	var jmenu = $('<div>' + menus.join('') + '</div>');
	jmenu.menu({
		onClick: function (item) {
			if (item.id == 'dup') {
				WUI.dupDlg(jdlg);
			}
			else if (item.id == 'find') {
				var appendFilter = (ev.ctrlKey || ev.metaKey);
				WUI.doFind(jo, null, appendFilter);
			}
			return false;
		}
	});
	jmenu.menu('show', {
		left: ev.pageX,
		top: ev.pageY
	});
	return false;
}

// ====== 操作日志扩展 {{{
/**
@module ObjLog 操作日志

系统默认会记录操作日志ObjLog，可在管理端展示：

- 菜单：系统设置-操作日志，结合查询框查找

		<a href="#pageObjLog">操作日志</a>

- 表中选中任一记录，在表头右键菜单中，可查看该记录关联的操作日志。
- 可添加“日志”菜单到工具栏，按钮名为"objLog"：

		jtbl.datagrid({
			...
			toolbar: WUI.dg_toolbar(jtbl, jdlg, ..., 'objLog');
		});

 */
WUI.GridHeaderMenu.items.push('<div id="showObjLog" data-options="iconCls:\'icon-tip\'">操作日志</div>');
WUI.GridHeaderMenu.showObjLog = function (jtbl) {
	var dg = WUI.getDgInfo(jtbl, {selArr: null, dgFilter: null});
	if (! dg.obj) {
		app_alert("该数据表不支持查看日志", "w");
		return;
	}
	var obj = dg.obj;
	var param = {cond: {obj: obj}}
	if (dg.selArr.length == 0 || dg.selArr[0].id === undefined) { // 未选择时，显示表中所有行的日志
		if (dg.dgFilter && !$.isEmptyObject(dg.dgFilter))
			param.objFilter = dg.dgFilter;
	}
	else if (dg.selArr.length == 1) {
		var objId = dg.selArr[0].id;
		param.cond.objId = objId;
	}
	else {
		param.cond.objId = "IN " + dg.selArr.map(function (e) {
			return e.id;
		}).join(',');
	}
	WUI.showPage("pageObjLog", "操作日志-" + obj + "!", [{jtblSrc: jtbl}, param]);
};

$.extend(self.dg_toolbar, {
	"objLog": function (ctx) {
		return {text: "日志", iconCls:'icon-tip', handler: function () {
			WUI.GridHeaderMenu.showObjLog(ctx.jtbl);
		}};
	},
});
// }}}

// ==== 支持对话框逻辑定义 setDlgLogic {{{
/**
@fn setDlgLogic(jdlg, name, logic)
@key .wui-dialog-logic 指定对话框逻辑

设置对话框业务逻辑。

## readonly-是否只读,disabled-是否禁用,show-是否显示,value-设置值

示例：对orderId组件，添加之后不可以修改：

	// 一般可定义在initDlgXXX函数中
	WUI.setDlgLogic(jdlg, "orderId", {
		readonlyForSet: true
	});

也可以定义在DOM对象上，如：

	<input name="orderId" class="wui-dialog-logic" data-options="readonlyForSet:true">

如果是叠加在wui-combogrid组件上：

	<input name="orderId" class="wui-combogrid wui-dialog-logic" data-options="$.extend(ListOptions.UserGrid(), readonlyForSet:true)">

logic中支持readonly选项，也支持readonlyForAdd/readonlyForSet这些特定模式的选项，它们既可以设置为一个值，也可以是一个函数`fn(data, gn)`（或等价的lambda表达式）:

- 参数data: 当前对象的数据，可通过 WUI.getTopDialog().jdata().logicData.data 来实时查看；
- 参数gn: 字段访问器，可用于操作其它字段。比如`gn("name").val()`取name字段值；参考[getFormItem]。
- 返回值: 对于readonly/show等选项，无返回值(undefined)时表示不设置，否则将返回值转换为true/false; 对于value选项，仅当函数返回非undefined/false才会设置值；

如果同时指定了readonly和readonlyForAdd选项，则当添加模式时优先用readonlyForAdd选项，其它模式也类似。

这个特性同样适用于以下disabled/readonly/value选项，比如有disabledForAdd/readonlyForSet/valueForAdd等选项。

示例：添加时无须填写，但之后可修改：可设置添加时隐藏或只读

	showForAdd: false
	或
	readonlyForAdd: true

注意：

- show选项会影响forFind模式，可以单独指定showForFind，它比show选项优先级高。
- 带数据的对话框，在打开时不会修改数据，即value选项在forSet模式对话框刚打开时不会生效。

示例：添加时自动填写

	填当前日期：直接设置值
	valueForAdd: new Date().format("D")

	或指定lambda或函数：
	valueForAdd: () => new Date().format("D")
	（与直接指定值的区别是每次打开对话框时都会计算）

	填当前操作员：
	valueForAdd: () => g_data.userInfo.id

如果不允许改，则加上

	readonlyForAdd: true

示例：计算字段（不提交）

	disabled: true
	value: e => e.x + "-" + e.y

由于后端没这个实体字段，所以不能提交。注意readonly和disabled在前端效果相似，但readonly字段会提交而disabled字段不提交。

## watch-监控变化

示例：根据status值，如果为CR就显示orderId字段

	WUI.setDlgLogic(jdlg, "orderId", {
		show: e => e.status == "CR",
		watch: "status" // 指定依赖字段，当它变化时刷新当前字段
	});

上面用的是lambda写法，参数e是对话框初始数据。
如果浏览器不支持lambda，可以用函数形式：

	WUI.setDlgLogic(jdlg, "orderId", {
		show: function (e) {
			return e.status == "CR";
		},
		watch: "status"
	});

类似于readonly选项，选项show也支持showForAdd, showForSet, showForFind这些扩展选项。

上面如果只设置show选项，则只会在打开对话框时设置字段，加上watch选项指定依赖字段，则当依赖字段发生变化时也会动态刷新。
甚至可以依赖多字段，用逗号隔开即可，如单价(price)或数量(qty)变化后，更新总价(total):

	WUI.setDlgLogic(jdlg, "total", {
		value: e => e.price * e.qty,
		watch: "price,qty" // 依赖多字段，以逗号分隔，注意不要多加空格
	});

watch选项会刷新disabled/readonly/show/value系列选项中的表达式。

### 从下拉列表中取值

示例：商品字段(itemId)使用下拉数据表(wui-combogrid下拉框组件)显示，有id,name,price三列，如果从下拉列表中选择了一个商品，则自动用选中行的price列来更新对话框上的price字段:

	WUI.setDlgLogic(jdlg, "price", {
		value: e => e.eventData_itemId?.price,
		watch: "itemId"
	});

当选择商品后，可以从e.eventData_itemId数据中取到下拉列表的值（其中itemId是下拉列表对应的字段名），如`e.eventData_itemId.price`；
`e.eventData_itemId?.price`中的`?.`是ES6写法，相当于`e.eventData_itemId && e.eventData_itemId.price`（如果e.eventData_itemId有值时再取e.eventData_itemId.price，避免字段为空报错）。

类似地，如果是其它字段变化，则可以从`e.eventData_{字段名}`中取值。my-combobox组件下拉时也是返回选择行对应的数据。

注意：如果有其它字段依赖了修改的值，比如上节例子中total字段依赖price，则此时会连锁地去更新total字段。

### 使用onWatch选项

更自由地，可以用onWatch选项定义一个函数，当watch字段变化后执行，原型为：`onWatch(e=当前对象数据, ev=扩展数据, gn=字段访问器)`，在ev参数中：

- ev.name表示当前变化的字段名，可用于依赖多个字段时用于区分是哪个字段变化。
- ev.formMode表示当前对话框模式，是添加(FormMode.forAdd)、更新(FormMode.forSet)或是查找(FormMode.forFind)。
- ev.data根据组件不同值也不同，对于wui-combogrid和my-combobox组件，它表示选择的数据行，比如列表定义了`id,name,code`三列，它就以`{id, name, code}`格式返回这三列数据。

参数gn是一个函数，可以对任意字段进行处理，用`gn(字段名)`可以取到该字段，然后可以链式调用通用接口，如`gn("orderId").visible(true).disabled(false).readonly(true).val(100)`。

- visible: 获取或设置是否显示。无参数时表示获取。带参数设置时支持上例中的链式设置。
- disabled: 获取或设置是否禁用
- readonly: 获取或设置是否只读
- val: 获取或设置值。对于wui-subobj组件，它返回表格数据。

示例：当选择了一个工件(snId, 使用combogrid组件)后，自动填充工单(orderId, 使用combogrid组件)、工单开工时间(actualTm)等字段。

	WUI.setDlgLogic(jdlg, "snId", {
		watch: "snId",
		onWatch: async function (e, ev, gn) {
			console.log(ev);
			// combogrid组件设置值可以用一个数组，同时设置value和text
			gn("orderId").val([ev.data.orderId, ev.data.orderCode]);

			// ev.data中没有现成数据，故再调用接口查一下
			var rv = await callSvr("Ordr.get", {id: ev.data.orderId, res: "actualTm"})
			gn("actualTm").val(rv.actualTm);
		}
	});

@see jQuery.fn.gn

## 动态设置combogrid/subobj等组件选项

可使用`setOption(e, it, gn)`来设置组件。

- e: 当前数据
- it: 当前组件的访问器，比如it.val('xx'), it.readonly(true)等
- gn: 可访问对话框中各组件，如gn('ac').val()等

示例：type="入库"时，下拉列表moveType字段显示入库选项，type="出库"时，显示出库选项

	var MoveTypeMap_出库 = {
		602: "销售出库冲销",
		202: "成本中心",
		222: "项目",
		552: "报废冲销"
	};

	var MoveTypeMap_入库 = {
		102: "生产入库冲销",
		201: "成本中心领料"
	}

	// html中的组件： <input name="moveType" class="my-combobox">
	WUI.setDlgLogic(jdlg, "moveType", {
		setOption: function (e, it, gn) {
			return {
				jdEnumMap: e.type == "入库"? MoveTypeMap_入库: MoveTypeMap_出库
			}
		},
		watch: "type"
	});

也可以直接设置静态值：

	// html中：<input class="wui-combogrid">
	WUI.setDlgLogic(jdlg, "whId", {
		setOption: ListOptions.WhGrid()
	});

这与直接在html中设置是等价的：

	<input class="wui-combogrid" data-options="ListOptions.WhGrid()">

## 提交前验证

	required: true,

	// 返回一个非空字符串，则表示验证失败，字符串即是错误信息
	validate: v => /^\d{11}$/.test(v) || "手机号须11位数字"

注意验证选项对添加、更新有效，没有forAdd/forSet选项。

validate函数原型为：`validate(value, it, gn)`

- value: 当前值
- it: 当前字段访问器，如it.val()即value，还有it.getTitle()取字段标题。
- gn: 字段访问器，如 gn("id") 取到id字段，gn("id").val()取id字段的值。

示例：当status字段值为RE时，当前字段值不可为空：

	{
		validate: (v,it,gn) => {
			if (gn("status").val() == "RE" && !v)
				return "单据完成时[" + it.getTitle() + "]不可为空";
		}
	}

用gn取其它字段值；用it.getTitle()取当前字段标题。

注意：当字段未在对话框中显示，或是禁用状态时，或是只读状态时，不执行验证。

子表（wui-subobj）对象一样支持required/validate，在validate函数中传入值v是一个数组，如果没有填写则v.length为0。示例：

	{
		//required: true,
		validate: function (value, it, gn) {
			if (value.length < 2) {
				return "明细表至少添加2行!";
			}
		}
	}

此外，还可以设置validType选项，它与easyui-validatebox组件兼容。示例：

	{
		required: true,
		validType: "email"
	}

注意：validType与validate选项不可一起使用。

@see .easyui-validatebox
 */
WUI.m_enhanceFn[".wui-dialog-logic"] = function (jo) {
	var jdlg = jo.closest(".wui-dialog");
	var it = WUI.getFormItem(jo);
	var name = it.getName();
	WUI.assert(jdlg.size()>0 && name);
	WUI.setDlgLogic(jdlg, name, WUI.getOptions(jo));
}

WUI.setDlgLogic = setDlgLogic;
function setDlgLogic(jdlg, name, logic)
{
	var map = {};
	var gn = jdlg.gn.bind(jdlg);
	var onShowArr = [];

	// 对话框上保持该数据
	var logicData = jdlg.jdata().logicData;
	if (logicData == null) {
		logicData = jdlg.jdata().logicData = {
			doInit: true,
			data: null,
			initFnArr: [] // {name, watch, onShowArr}
		}
	}

	$.each(logic, function (k, v) {
		if (/^show/.test(k)) {
			// 只绑一次
			if (map["show"])
				return;
			map["show"] = true;
			onShowArr.push(function (formMode, data) {
				var val = calcVal("show", v, true, formMode, data, true);
				if (val !== undefined) {
					gn(name).visible(val);
				}
			});
		}
		else if (/^disabled/.test(k)) {
			if (map["disabled"])
				return;
			map["disabled"] = true;
			onShowArr.push(function (formMode, data) {
				var val = calcVal("disabled", v, false, formMode, data);
				if (val !== undefined) {
					gn(name).disabled(val);
				}
			});
		}
		else if (/^readonly/.test(k)) {
			if (map["readonly"])
				return;
			map["readonly"] = true;
			onShowArr.push(function (formMode, data) {
				// bugfix: 注意框架设置 fixedFields 时会自动将字段设置为readonly，此时不应再次处理
				var o = jdlg.prop("objParam");
				if (o && o.fixedFields && o.fixedFields[name] != null)
					return;
				var val = calcVal("readonly", v, false, formMode, data);
				if (val !== undefined) {
					gn(name).readonly(val);
				}
			});
		}
		else if (/^value/.test(k)) {
			if (map["value"])
				return;
			map["value"] = true;
			onShowArr.push(function (formMode, data, isInit) {
				// forSet模式初始化时不修改数据。
				if (isInit && formMode == FormMode.forSet)
					return;
				var val = calcVal("value", v, undefined, formMode, data);
				if (val !== undefined && val !== false) {
					var it = gn(name);
					it.val(val);
					it.getJo().trigger("change");
				}
			});
		}
		else if (k == "setOption") {
			var it = gn(name);
			if ($.isPlainObject(v)) {
				it.setOption(v);
			}
			else if ($.isFunction(v)) {
				jdlg.on("beforeshow", function (ev, formMode, dlgOpt) {
					var val = v(dlgOpt.data, it, gn);
					it.setOption(val);
				});
			}
			else {
				console.error("bad dialog logic for " + k + ": ", v);
			}
		}
		else if (k == "validate" || k == "required" || k == "validType") {
			if (map["validate"])
				return;
			map["validate"] = true;

			// wui-subobj单独处理
			if (jdlg.find(".wui-subobj-" + name).size() > 0) {
				jdlg.on("validate", subobj_onValidate);
				return;
			}

			// 集成validatebox组件(easyui的combo/combogrid/datebox等普通输入组件都是基于它)
			var opt = {
				required: logic.required,
				validType: logic.validType,
			}
			if (logic.validate) {
				// NOTE: 1. rule名即validType选项只能字母，不可包含数字，否则找不到规则! easyui-validatebox组件之坑(已fix)
				// 2. 原easyui validatebox在值为空时不走验证，已修改源码，扩展checkEmpty选项，以便实现根据其它字段值动态判断是否必填的需求
				opt.rules = {
					v: {
						validator: validator,
						message: '验证失败',
						checkEmpty: true
					}
				};
				opt.validType = 'v';
			}

			// 等待UDF组件加完（WUI.enhanceWithin调用完）再添加逻辑
			setTimeout(function () {
				var it = gn(name);
				/* bugfix: combogrid等也调用validatebox而不是自身的combogrid方法，否则会将值清空掉
				if (it.jcomboCall) { // combo系列单独处理
					it.jcomboCall(opt);
				}
				*/
				it.getJo().validatebox(opt);
				// 标题上标记"*"表示必填
				if (logic.required) {
					it.getJo().closest("td").prev("td").addClass("required");
				}
			});

			function validator() {
				var it = gn(name);
				if (! it.visible() || it.readonly())
					return true;
				var val = it.val();
				if (logic.validate) {
					var rv = logic.validate(val, it, gn);
					if (typeof(rv) == "string") {
						opt.rules.v.message = rv;
						return false;
					}
				}
				return true;
			}

			function subobj_onValidate(ev, formMode, data) {
				if (formMode === FormMode.forFind)
					return;
				var it = gn(name);
				if (it.disabled() || it.readonly())
					return;
				var val = it.val();
				if (logic.required && (!val || ($.isArray(val) && val.length == 0))) {
					app_alert(it.getTitle() + "不可为空。", "w", function () {
						it.setFocus();
					});
					ev.stopImmediatePropagation();
					return false;
				}
				if (logic.validate) {
					var rv = logic.validate(val, it, gn);
					if (typeof(rv) == "string") {
						app_alert(rv, "w", function () {
							it.setFocus();
						});
						ev.stopImmediatePropagation();
						return false;
					}
				}
			}
		}
	});

	if (onShowArr.length > 0) {
		logicData.initFnArr.push({name: name, watch: logic.watch, onShowArr: onShowArr});
	}
	if (logicData.doInit) {
		logicData.doInit = false;
		// 对话框onShow时，所有setDlgLogic中show/value等逻辑按依赖顺序执行。
		// 用于解决valueForAdd设置字段后，依赖它的字段能自动更新的问题
		jdlg.on("show", function (ev, formMode, initData) {
			logicData.data = $.extend(true, {}, initData);

			// 按依赖顺序调用, callmap用于检查是否已调用
			var callmap = [];
			logicData.initFnArr.forEach(execLogic);

			function execLogic(elem, idx) {
				if (callmap[idx]) // 已执行标记
					return;
				callmap[idx] = true;
				if (elem.watch) { // 先执行依赖项
					elem.watch.split(',').forEach(function (depName) {
						logicData.initFnArr.forEach(function (elem1, idx1) {
							if (elem1.name == depName && !callmap[idx1]) {
								execLogic(elem1, idx1);
							}
						});
					});
				}
				elem.onShowArr.forEach(function (fn) {
					fn(formMode, logicData.data, true);
				});
				$.extend(logicData.data, WUI.getFormData(jdlg, "all"));
			}
		});
	}

	if (logic.watch) {
		var watchArr = logic.watch.split(',');
		jdlg.on("change", onChange); // for input/select/my-combobox
		jdlg.on("choose", onChange); // for wui-combogrid
		function onChange(ev, eventData) {
			var jo = $(ev.target);
			var watchField = jo.gn().getName();
			if (watchArr.indexOf(watchField) >= 0) {
				var data = $.extend(logicData.data, WUI.getFormData(jdlg, "all") );
				var formMode = jdlg.jdata().mode;
				if (jo.hasClass("my-combobox"))
					eventData = jo.prop("selectedOptions")[0].chooseValue || {};
				data["eventData_" + watchField] = eventData;
				setTimeout(function () { // 清除临时数据
					delete data["eventData_" + watchField];
				}, 50);

				if (logic.onWatch) {
					logic.onWatch(data, {
						name: watchField,
						formMode: formMode,
						data: eventData
					}, gn);
				}
				onShowArr.forEach(function (fn) {
					fn(formMode, data);
				});
				if (logic.setOption) {
					var it = gn(name);
					var val = logic.setOption(data, it, gn);
					it.setOption(val);
				}
			}
		}
	}

	function calcVal(k, v, defVal, formMode, data, canForFind) {
		var val = defVal;
		if (formMode == FormMode.forFind && !canForFind)
			return val;
		if (formMode == FormMode.forAdd && logic[k + "ForAdd"] !== undefined) {
			val = logic[k + "ForAdd"];
		}
		else if (formMode == FormMode.forSet && logic[k + "ForSet"] !== undefined) {
			val = logic[k + "ForSet"];
		}
		else if (formMode == FormMode.forFind && logic[k + "ForFind"] !== undefined) {
			val = logic[k + "ForFind"];
		}
		else if (logic[k] !== undefined) {
			val = logic[k];
		}
		if ($.isFunction(val))
			val = val(data, gn);
		return val;
	}
}
// }}}

// 查询模式下，显示开始、结束日期选择框
var DateBoxForFind = {
	delay: 1000,
	onShowPanel: function () {
		var jo = $(this);
		if (! jo.combo("textbox").is(".wui-find-field"))
			return;
		var data = jo.data("combo");
		if (data.rangeStep == null)
			data.rangeStep = 0;
		var label = (data.rangeStep == 1? "选结束<i class='hint' title='例如`2020-1-1~2020-2-1`就是2020年1月全月，不包含结束日期2月1日这天，这样更简单不必考虑每月最后一天是几号。'>不含<i>": "选开始");
		jo.combo("panel").find(".datebox-button .datebox-button-a:eq(1)").html(label);
	},
	onChange: function (newVal, oldVal) {
		var jo = $(this);
		if (! jo.combo("textbox").is(".wui-find-field") || !newVal || newVal.indexOf("~") >= 0)
			return;
		var data = jo.data("combo");
		if (data.rangeStep == null) { // 未经panel选择，不处理
			return;
		}
		else if (data.rangeStep === 0) {
			setTimeout(function () {
				if (jo.combo("panel").is(":visible")) // 如果setValue不是点击触发的，则panel未关闭，此时不处理
					return;
				data.rangeStep = 1;
				jo.combo("showPanel");
			}, 200);
		}
		else if (data.rangeStep === 1) {
			if (oldVal.indexOf("~")>0) {
				oldVal = oldVal.replace(/~.*$/, '');
			}
			var t = oldVal + "~" + newVal;
			t = t.replace(/ 00:00:00/g, '');
			setTimeout(function () {
				data.rangeStep = null;
				jo.next().find(".textbox-value").val(t); // setValue but no validate
				jo.combo("setText", t);
				// restore label
				jo.combo("panel").find(".datebox-button .datebox-button-a:eq(1)").html("确定");
			});
		}
	}
};

$.extend($.fn.datebox.defaults, DateBoxForFind);
$.extend($.fn.datetimebox.defaults, DateBoxForFind);

// Ctrl-Alt双击元素：全屏显示多行文本框、代码编辑框、页面或对话框等
$(document).on("dblclick", function(ev) {
	if (! (ev.ctrlKey && ev.altKey))
		return;
	var jo = $(ev.target).closest("textarea,.ace_editor,.wui-page,.wui-dialog,.wui-fullscreen");
	if (jo.size() > 0) {
		jo[0].requestFullscreen();
	}
});
}
// vi: foldmethod=marker 
