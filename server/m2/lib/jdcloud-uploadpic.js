/**
@class MUI.UploadPic(jo, opt/optfn)

@param jo jQuery DOM对象, 它是uploadpic类，或是包含一个或多个uploadpic类（上传区）的DOM对象。
@param opt {uploadParam?} 兼容MUI.compressImg函数opt参数，如 {quality=0.8, maxSize=1280, ...}
opt也可以是一个函数: optfn(jo) - jo为上传区, 返回该区的设置，这样就支持为每个上传区定义不同的选项。

初始化之后也可以这样为每一个上传区指定option:

	var opt = MUI.getOptions(jo);
	opt.xx =xxx;

@param opt.uploadParam 调用upload接口的额外参数。
目前调用筋斗云upload接口，使用参数`{genThumb:1, autoResize:0}`，可以通过uploadParam指定额外参数。

注意：

- 加载 jdcloud-uploadpic.js
- 以uploadpic开头的类所需CSS，目前放在app.css中。
- 预览大图依赖weui库中的样式。

引入库：由于要上传功能的页面不多，建议只在逻辑页面用到的时候引入，像这样：

	<div mui-initfn="initPagePic" mui-script="pic.js" mui-deferred="loadUploadLib()">
	
loadUploadLib在app.js中有示例。在预览图片时，它自动检查和调用photoswipe库，优先用该库来预览。

示例HTML

	<!-- 单图上传区: 比如上传用户头像。这里把预览图和文件按钮合一了，点预览图即可再选择文件 -->
	<div class="uploadpic" id="userPic">
	  <div class="uploadpic-btn uploadpic-item">
	    <input type="file">
	  </div>
	</div>

	<!-- 多图上传区：比如上传产品明细图片。 -->
	<div class="uploadpic" id="itemPics">
	  <div class="uploadpic-btn">
	    <input type="file" multiple>
	  </div>
	</div>

- 类uploadpic为上传区。
- 类uploadpic-btn为文件选择区，其中包含的input[type=file]组件，如果没有multiple属性，则是单图上传区，只允许选择一张图预览和上传，否则为多图上传区，允许选择和上传多图。
- 类uploadpic-item为预览位，每张图片对应一个预览位。点击预览位可以查看大图（Gallery页面）
 如果当前没有预览位，则会在uploadpic内创建一个预览位；否则，在单图上传区中则会覆盖已有预览位，在多图上传区中会有已有上传位后再创建一个新的预览位。
- 如果在uploadpic中预先定义了uploadpic-item类对象，称为固定预览位，常用于自行指定预览位位置或样式。程序自动创建的预览位称为动态预览位。
 选择图片后，如果有空闲的固定预览位，则在该预览位显示预览，否则动态创建新的预览位（clone第一个固定预览位）
- 在删除图片时，如果图片在动态预览位，则会删除预览位，否则只是清空预览位的背景。

JS

	// 如果已有图片需要预览，将缩略图ID列表传入data-atts属性，在new UploadPic时会根据Id在图片预览区加上已经存在的图片
	jpage.find("#userPic").attr("data-atts", "208");
	jpage.find("#itemPics").attr("data-atts", "210,212,214");

	// 初始化，显示预览图
	var uploadPic = new MUI.UploadPic(jpage); // 可直接传uploadpic类的jQuery对象或包含它的jQuery DOM对象
	// var uploadPic = new MUI.UploadPic(jpage, {maxSize:1600, uploadParam:{type:"task"}} ); // 指定选项

	// 如果重新设置了data-atts属性，可调用
	// uploadPic.reset();

	// 点击提交时调用submit，当上传完成后，
	uploadPic.submit().then(function (userPic, itemPics) {
		
	});

	// 如果要精细控制上传进度：
	var dfd = uploadPic.submit(onUpload, onUploadProgress, onNoWork);
	dfd.then(onUploadDone);

onUpload回调仅当需要上传照片或删除照片时调用，在照片上传完成后触发。一般用于将照片列表更新到相应对象上。如果有多个上传区更新，则会分别调用。
attIds为上传后返回的缩略图Id数组，this为当前上传区的jQuery对象。
如果函数返回一个Deferred对象（如callSvr调用），则onUploadDone（以及onUploadProgress的最后一次progress.done=true的回调）会在所有这些调用完成之后才触发。

	// 每个上传区一旦有图片更新，则调用Task1.set更新图片列表。
	function onUpload(attIds) {
		// this对象为当前uploadpic
		var pics = attIds.join(',');
		var task = this.data("task_");
		// 如果返回一个Deferred对象，则progress.done会等待该事件结束才发生
		return callSvr("Task1.set", {id: task.id}, $.noop, {pics: pics});
	}

onUploadProgress用于显示上传进度。如果未指定，框架使用默认的进度提示，同时会在console中显示上传进度。如下所示：

	// progress: {curPicCnt/已上传照片数, picCnt/总共需上传的照片数, curAreaCnt/已完成的上传区数, areaCnt/总共需更新的上传区数, curSize/当前已完成的上传大小, size/总上传大小, done/是否全部完成, percent/上传完成百分数0-100}
	// 示例：利用app_alert显示进度。
	function onUploadProgress(progress)
	{
		var info = progress.picCnt>0? "正在上传... " + progress.percent + "% - " + progress.curPicCnt + "/" + progress.picCnt + "张照片": "更新照片";
		var alertOpt = {keep: true};
		if (progress.done) {
			info += " - <b>完成!</b>";
			alertOpt.timeoutInterval = 500;
		}
		else {
			info += "...";
		}
		app_alert(info, alertOpt);
	}

onNoWork在无任何更新时回调。这时onUpload和onUploadProgress都不会被调用到。

	function onNoWork() {
		app_alert("都保存好了。");
	}

onUploadDone在全部上传完成后调用，参数分别为每个上传区的图片编号数组（不论该上传区是否需要更新）。

	function onUploadDone(attIds, attIds1) {
		// arguments
	}

在预览位uploadpic-item对象上，设置了以下属性：

- ji.prop("picData_") -> {b64src,blob,w,h,size,...} (参考compressImg的回调函数cb的参数) 
 当选择的图片进行压缩后，数据存储在picData_中。b64src字段可作为url显示图片。在上传服务端后该数据被清空。
- ji.prop("attId_") -> 对应的图片（缩略图）编号。仅当在服务器上已有才显示。
- ji.prop("isFixed_") -> true表示固定预览位，只能清空，不可被删除。
- ji.css("background-image"); -> 缩略图片的url。如果是待上传或刚刚上传的图片，则是大图的base64编码url。

在上传区uploadpic对象上，私有数据存储在MUI.getOptions(jo)中：

- isMul: 标识是多图上传区。在安卓手机上，由于对文件选择框的multiple属性支持不好，常常去掉和禁用它。所以内部使用isMul属性来区分。
- delMark_: 标识是否有删除图片操作。在submit后恢复为null.

@see compressImg

## 清空与重置

清空全部图片：

	uploadPic.empty();
	// 等价于 uploadPic.reset(true);

修改了data-attr属性后重新刷新显示：

	uploadPic.reset();

## 设置只读，不可添加删除图片

	uploadPic.readonly(true);
	var isReadonly = uploadPic.readonly();

## 获取图片数

要判断预览区有几张图，可以用：

	var cnt = uploadPic.countPic(); // 总图片数
	var oldCnt = uploadPic.countPic(1); // 已有图片数
	var newCnt = uploadPic.countPic(2); // 新选择的图片数

## 指定上传区操作

当uploadPic包含多个上传区时，可以用filter指定之后的方法是针对哪一个区。注意filter只对下一次调用有效。

	uploadPic.filter(idx).其它方法(); // idx为下标或jQuery的filter

示例：

	var cnt = uploadPic.filter(0).stat().cnt;
	// 等价于 var cnt = uploadPic.filter(":eq(0)").stat().cnt;
	uploadPic.filter(".storePics").empty();

 */
JdcloudUploadPic.call(window.WUI || window.MUI);
function JdcloudUploadPic()
{
var MUI = this;

// opt: {uploadParam}
MUI.UploadPic = UploadPic;
function UploadPic(jparent, opt)
{
	var self = this;
	self.jupload = jparent.is(".uploadpic")? jparent: jparent.find(".uploadpic");

	var optfn = null;
	if ($.isFunction(opt)) {
		optfn = opt;
	}

	self.jupload.each(function () {
		var jo = $(this);
		if (optfn)
			opt = optfn(jo);
		uploadPic1(jo, opt);
	});
}

// UploadPicArea，一个上传区。私有数据存储存储于 areaOpt = MUI.getOptions(jo)
// areaOpt: {isMul, delMark_}
function uploadPic1(jo, opt)
{
	var jinput = jo.find("input[type=file]");
	var isMul = jinput.prop("multiple");
	var areaOpt = MUI.getOptions(jo);
	$.extend(areaOpt, opt);
	areaOpt.isMul = isMul;

	// TODO: Remove. NOTE: 部分安卓手机设置multiple后无法选择文件
	if (isMul && MUI.isWeixin() && MUI.isAndroid()) {
		jinput.prop("multiple", false);
	}
	jinput.attr("accept", "image/*");

	jo.find(".uploadpic-item").each(function (i, e) {
		this.isFixed_ = true;
	});

	loadPreview(jo, isMul);

	jo.on("change", "input[type=file]", function (ev) {
		$.each(this.files, function (i, fileObj) {
			MUI.compressImg(fileObj, function (picData) {
				previewImg(jo, null, picData, isMul);
			}, areaOpt);
		});
		this.value = "";
	});

	jo.on("click", "input[type=file]", function (ev) {
		if (areaOpt.readonly) {
			app_alert("当前不可添加!", "w");
			return false;
		}
	});

	jo.on("click", ".uploadpic-item", function (ev) {
		var ji = $(this);
		if ($(ev.target).hasClass("uploadpic-delItem")) {
			delPreview(ji);
			ev.stopImmediatePropagation();
			return false;
		}
		// 有photoSwipe则用之, 否则用PageGallery看。
		if (ji.css("backgroundImage") != "none" && !jQuery.fn.jqPhotoSwipe) {
			PageGallery.show($(this));
			ev.stopImmediatePropagation();
			return false;
		}
	});
}

function loadPreview(jo, isMul)
{
	var atts = jo.attr("data-atts");
	if (atts) {
		atts = atts.toString().split(/\s*,\s*/);
		$.each(atts, function (i, e) {
			previewImg(jo, e, null, isMul);
		});
	}
	if (jQuery.fn.jqPhotoSwipe) {
		var opt = {
			onGetPicUrl: function (jo) {
				var attId = jo.prop("attId_");
				if (!attId) {
					var picData = jo.prop("picData_");
					return picData && picData.b64src;
				}
				return MUI.makeUrl("att", {thumbId: attId});
			},
			selector: ".uploadpic-item"
		};
		//jo.find(".uploadpic-item").jqPhotoSwipe(opt);
		jo.jqPhotoSwipe(opt);
		/* bugfix: jqPhotoSwipe之后, delItem无法点击. 新版jd_photoSwipe.js重写后不再需要这段
		jo.find(".uploadpic-delItem").click(function () {
			var ji = $(this).closest(".uploadpic-item");
			delPreview(ji);
			return false;
		});
		*/
	}

}

// 对于单图, 直接覆盖原先的uploadpic-item; 如果原先没有, 则新建一个.
// 对于多图, 如果之前有空闲的item就直接用, 否则在其后创建一个.
// uploadpic-item上的property: attId_, picData_; attribute: `background-image: url(url)`
function previewImg(jo, attId, picData, isMul)
{
	var url;
	if (attId) {
		url = MUI.makeUrl("att", {id:attId});
	}
	else if (picData != null) {
		url = picData.b64src;
	}
	else {
		return false;
	}

	if (!isMul) {
		var ji = jo.find(".uploadpic-item");
		if (ji.size() == 0) {
			ji = newPreview().prependTo(jo);
		}
	}
	else {
		var ji0 = jo.find(".uploadpic-item");
		var ji;
		if (ji0.size() == 0) {
			ji = newPreview().prependTo(jo);
		}
		else {
			ji0.each(function(i, e) {
				if ($(this).css("backgroundImage") == "none") {
					ji = $(this);
					return false;
				}
			});
			if (ji == null) {
				ji = ji0.first().clone();
				$(ji0[ji0.size()-1]).after(ji);
			}
		}
	}

	if (ji.find(".uploadpic-delItem").size() == 0) {
		// z-index: 在input button之上
		$("<div>").addClass("uploadpic-delItem").css("z-index",1).text("x").appendTo(ji);
	}
	ji.css("backgroundImage", "url(" + url + ")");
	ji.prop("picData_", picData)
		.prop("attId_", attId);
}

function newPreview()
{
	return $("<div>").addClass("uploadpic-item");
}

// forReset=false
function delPreview(ji, forReset)
{
	var jo = ji.closest(".uploadpic");
	var opt = MUI.getOptions(jo);
	if (opt.readonly)
		return;
	if (!forReset) {
		opt.delMark_ = true; // 标记有删除操作，需要更新
	}

	if (ji.prop("isFixed_")) {
		ji.prop("attId_", null);
		ji.prop("picData_", null);
		ji.css("backgroundImage", "none");
		ji.find(".uploadpic-delItem").remove();
	}
	else {
		ji.remove();
	}
}

// 如果需要更改，返回Deferred对象，在上传完成后Deferred对象可执行；否则返回空。
function submit1(jo, cb, progress, progressCb)
{
	var fd = null;
	var idx = 1;
	var imgArr = [];
	var totalSize = 0;
	var atts = null;
	var dfd = $.Deferred();
	var opt = MUI.getOptions(jo);

	jo.find(".uploadpic-item").each(function () {
		if (this.picData_ == null)
			return;
		if (fd == null) {
			fd = new FormData();
		}
		// 名字要不一样，否则可能会覆盖
		fd.append('file' + idx, this.picData_.blob, this.picData_.name);
		totalSize += this.picData_.size;
		imgArr.push(this);
		++idx;
	});
	if (fd == null) {
		if (opt.delMark_) {
			progress.areaCnt += 1;
			done(cb);
			return dfd;
		}
		return;
	}

	var sizeObj = {loaded:0, total:0};
	progress.areaCnt += 1;
	progress.picCnt += imgArr.length;
	progress.size += totalSize;
	progress.uploadedSize.push(sizeObj);

	var ajaxOpt = {
		onUploadProgress: function (e) {
			if (e.lengthComputable) {
				sizeObj.loaded = e.loaded;
				sizeObj.total = e.total;
				progressCb(progress);
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

	var param = $.extend({genThumb:1, autoResize:0}, opt.uploadParam);
	callSvr("upload", param, api_upload, fd, ajaxOpt);
	return dfd;

	function api_upload(data) {
		MUI.assert($.isArray(data) && data.length == imgArr.length);
		$.each(imgArr, function(i) {
			this.picData_ = null;
			this.attId_ = data[i].thumbId;
		});
		done(cb);
	}

	function done (cb) {
		atts = getAtts(jo);
		if (cb) {
			var rv = cb.call(jo, atts);
			if (rv && rv.then) {
				rv.then(function () {
					done();
				});
				return;
			}
		}
		opt.delMark_ = null;
		progress.curAreaCnt += 1;
		progress.curPicCnt += imgArr.length;
		progress.curSize += totalSize;
		progressCb(progress);
		if (dfd) {
			dfd.resolve(atts);
		}
	}
}

function getAtts(jo)
{
	var atts = [];
	jo.find(".uploadpic-item").each(function () {
		atts.push($(this).prop("attId_"));
	});
	return atts;
}

function onUploadProgress(progress)
{
	var info = progress.picCnt>0? "正在上传... " + progress.percent + "% - " + progress.curPicCnt + "/" + progress.picCnt + "张照片": "更新照片";
	var alertOpt = {keep: true};
	if (progress.done) {
		info += " - <b>完成!</b>";
		alertOpt.timeoutInterval = 500;
	}
	else {
		info += "...";
	}
	app_alert(info, alertOpt);
}

UploadPic.prototype.submit = uploadPic_submit;
function uploadPic_submit(cb, progressCb, onNoWork)
{
	var self = this;
	var dfdArr = [];
	var needWork = false;
	// progress: {curPicCnt, picCnt, curAreaCnt, areaCnt, curSize, size, percent, done}
	var progress = {curPicCnt:0, picCnt:0, curAreaCnt:0, areaCnt:0, curSize:0, size:0, done: false, percent:0, uploadedSize:[]};
	if (progressCb == null)
		progressCb = onUploadProgress;
	self.jupload.each(function () {
		var jo = $(this);
		var dfd = submit1(jo, cb, progress, progressCb1);
		if (dfd) {
			needWork = true;
			dfdArr.push(dfd);
		}
		else {
			var atts = getAtts(jo);
			dfdArr.push(atts);
		}
	});
	var dfdAll = $.when.apply($, dfdArr);
	if (needWork) {
		progressCb1(progress);
		dfdAll.then(function () {
			console.log(arguments);
			progress.done = true;
			progressCb1(progress);
		});
	}
	else {
		onNoWork && onNoWork();
	}
	return dfdAll;

	function progressCb1(pg)
	{
		// calc percent
		var arr = pg.uploadedSize; // elem: {loaded, total}
		var loaded = 0, total = 0;
		$.each(arr, function () {
			loaded += this.loaded;
			total += this.total;
		});
		if (total < pg.size) {
			total = pg.size;
		}
		pg.percent = (loaded / total * 100).toFixed(0);

		var info = "uploadpic: " + pg.percent + "%, area " + pg.curAreaCnt + "/" + pg.areaCnt + ", pic " + pg.curPicCnt + "/" + pg.picCnt + ", size " + pg.curSize + "/" + pg.size + ", uploadedSize " + loaded + "/" + total;
		if (pg.done) {
			info += " - done!";
		}
		else {
			info += "...";
		}
		console.log(info);
		if (progressCb) {
			progressCb(pg);
		}
	}
}

// ---- Gallery view ---- {{{
var PageGallery = {
	jpreviewItem_: null,
	show: function (jpreviewItem) {
		this.jpreviewItem_ = jpreviewItem;
		createPageGallery();
		MUI.showPage("#uploadpic-gallery", {ani:'none', backNoRefresh:true});
	}
};

function createPageGallery()
{
	var jpage = $("#uploadpic-gallery");
	if(jpage.length > 0)
		return jpage;
	jpage = $(
		'<div id="uploadpic-gallery" class="mui-page weui-gallery" mui-swipenav="no" style="background-color:#000;">'+
			'<span class="weui-gallery__img galleryImg"></span>' + 
			'<div class="weui-gallery__opr">'+
				'<a href="javascript:" class="weui-gallery__del galleryImgDel">'+
					'<i class="weui-icon-delete weui-icon_gallery-delete"></i>'+
				'</a>'+
			'</div>'+
		'</div>'
	).appendTo(document.body);
	initPageGallery.call(jpage);
	return jpage;
}

function initPageGallery()
{
	var jpage = this;

	var jimg = jpage.find(".weui-gallery__img");
	var jdel = jpage.find(".weui-gallery__del");

	jpage.on("pagebeforeshow", function () {
		if (PageGallery.jpreviewItem_ == null)
			return;
		var ji = PageGallery.jpreviewItem_;
		setupImage(ji);
	});

	jpage.swipe({
		swipeLeft: swipeH,
		swipeRight: swipeH,
	});

	jimg.click(function(ev) {
		goBackNoAni();
	});

	jdel.click(function(ev) {
		ev.preventDefault();
		delPreview(PageGallery.jpreviewItem_);
		PageGallery.jpreviewItem_ = null;
		goBackNoAni();
	});

	function setupImage(ji) {
		var attId = ji.prop("attId_");
		if (attId) {
			url = "url(" + MUI.makeUrl("att", {thumbId: attId}) + ")";
		}
		else {
			url = ji.css("background-image");
		}
		jimg.css("background-image", url);
	}

	function swipeH(ev, direction, distance, duration, fingerCnt, fingerData, currentDirection) {
		var ji = PageGallery.jpreviewItem_;
		var ji1 = null;
		if (direction == 'left')
		{
			ji1 = ji.next(".uploadpic-item");
		}
		else if (direction == 'right')
		{
			ji1 = ji.prev(".uploadpic-item");
		}
		if (ji1 == null || ji1.size() == 0) {
			goBackNoAni();
			return false;
		}
		PageGallery.jpreviewItem_ = ji = ji1;
		setupImage(ji);
	}

	function goBackNoAni() {
		MUI.nextShowPageOpt = {ani:"none"};
		history.back();
	}
}
// ------------ }}}

UploadPic.prototype.filter = function (idx) {
	if (idx === undefined)
		return;
	var jo = this.jupload;
	if (typeof(idx) == "number")
		jo = jo.eq(idx);
	else
		jo = jo.filter(idx);
	this.jfiltered = jo;
	return this;
}

function getFiltered(self) {
	if (self.jfiltered) {
		var jo = self.jfiltered;
		self.jfiltered = null;
		return jo;
	}
	return self.jupload;
}

UploadPic.prototype.reset = uploadPic_reset;
function uploadPic_reset(empty)
{
	var self = this;
	var jupload = getFiltered(self);
	jupload.each(function () {
		var jo = $(this);
		jo.find(".uploadpic-item").each(function (i, e) {
			delPreview($(this), true);
		});
		if (empty) {
			jo.attr("data-atts", "");
		}
		else {
			var isMul = MUI.getOptions(jo).isMul;
			loadPreview(jo, isMul);
		}
	});
}

UploadPic.prototype.empty = function () {
	this.reset(true);
}

UploadPic.prototype.readonly = uploadPic_readonly;
function uploadPic_readonly(val)
{
	var self = this;
	var jupload = getFiltered(self);
	if (val == null)
		return MUI.getOptions(jupload).readonly;

	jupload.each(function () {
		var jo = $(this);
		MUI.getOptions(jo).readonly = val;
		jo.find(".uploadpic-delItem").toggle(!val);
	});
}

// which: 0-all(缺省), 1-old, 2-new
UploadPic.prototype.countPic = function (which) {
	var self = this;
	var jupload = getFiltered(self);
	var oldCnt=0, newCnt=0;
	jupload.find(".uploadpic-item").each(function () {
		if (this.attId_) {
			++ oldCnt;
		}
		else if (this.picData_) {
			++ newCnt;
		}
	});
	if (!which)
		return oldCnt + newCnt;
	return which==1? oldCnt: which==2? newCnt: 0;
}

}

