/**
@fn compressImg(img, cb, opt)

通过限定图片大小来压缩图片，用于图片预览和上传。
不支持IE8及以下版本。

- img: Image对象
- cb: Function(picData) 回调函数
- opt: {quality=0.8, maxSize=1280, mimeType?="image/jpeg"}
- opt.maxSize: 压缩完后宽、高不超过该值。为0表示不压缩。
- opt.quality: 0.0-1.0之间的数字。
- opt.mimeType: 输出MIME格式。

函数cb的回调参数: picData={b64src,blob,w,h,w0,h0,quality,mimeType,size0,size,b64size,info}

b64src为base64格式的Data URL, 如 "data:image/jpeg;base64,/9j/4AAQSk...", 用于给image或background-image赋值显示图片；

可以赋值给Image.src:

	var img = new Image();
	img.src = picData.b64src;

或

	$("<div>").css("background-image", "url(" + rv.b64src + ")");

blob用于放到FormData中上传：

	fd.append('file' + idx, this.lrzData_.blob, this.lrzData_.name);

其它picData属性：

- w0,h0,size0分别为原图宽、高、大小; w,h,size为压缩后图片的宽、高、大小。
- quality: jpeg压缩质量,0-1之间。
- mimeType: 输出的图片格式
- info: 提示信息，会在console中显示。用于调试。

**[预览和上传示例]**

HTML:

	<form action="upfile.php">
		<div class="img-preview"></div>
		<input type="file" /><br/>
		<input type="submit" >
	</form>

用picData.b64src来显示预览图，并将picData保存在img.picData_属性中，供后面上传用。

	var jfrm = $("form");
	var jpreview = jfrm.find(".img-preview");
	var opt = {maxSize:1280};
	jfrm.find("input[type=file]").change(function (ev) {
		$.each(this.files, function (i, fileObj) {
			compressImg(fileObj, function (picData) {
				$("<img>").attr("src", picData.b64src)
					.prop("picData_", picData)
					.appendTo(jpreview);
				//$("<div>").css("background-image", "url("+picData.b64src+")").appendTo(jpreview);
			}, opt);
		});
		this.value = "";
	});

上传picData.blob到服务器

	jfrm.submit(function (ev) {
		ev.preventDefault();

		var fd = new FormData();
		var idx = 1;
		jpreview.find("img").each(function () {
			// 名字要不一样，否则可能会覆盖
			fd.append('file' + idx, this.picData_.blob, this.picData_.name);
			++idx;
		});
	 
		$.ajax({
			url: jfrm.attr("action"),
			data: fd,
			processData: false,
			contentType: false,
			type: 'POST',
			// 允许跨域调用
			xhrFields: {
				withCredentials: true
			},
			success: cb
		});
		return false;
	});

参考：JIC.js (https://github.com/brunobar79/J-I-C)

TODO: 用完后及时释放内存，如调用revokeObjectURL等。
 */
function compressImg(fileObj, cb, opt)
{
	var opt0 = {
		quality: 0.8,
		maxSize: 1280,
		mimeType: "image/jpeg"
	};
	opt = $.extend(opt0, opt);

	// 部分旧浏览器使用BlobBuilder的（如android-6.0, mate7自带浏览器）, 压缩率很差。不如直接上传。而且似乎是2M左右文件浏览器无法上传，导致服务器收不到。
	window.BlobBuilder = (window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder);
 	var doDowngrade = !window.Blob 
			|| window.BlobBuilder;
	if (doDowngrade) {
		var rv = {
			name: fileObj.name,
			size: fileObj.size,
			b64src: window.URL.createObjectURL(fileObj),
			blob: fileObj,
		};
		rv.info = "compress ignored. " + rv.name + ": " + (rv.size/1024).toFixed(0) + "KB";
		console.log(rv.info);
		cb(rv);
		return;
	}

	var img = new Image();
	// 火狐7以下版本要用 img.src = fileObj.getAsDataURL();
	img.src = window.URL.createObjectURL(fileObj);
	img.onload = function () {
		var rv = resizeImg(img);
		rv.info = "compress " + rv.name + " q=" + rv.quality + ": " + rv.w0 + "x" + rv.h0 + "->" + rv.w + "x" + rv.h + ", " + (rv.size0/1024).toFixed(0) + "KB->" + (rv.size/1024).toFixed(0) + "KB(rate=" + (rv.size / rv.size0 * 100).toFixed(2) + "%,b64=" + (rv.b64size/1024).toFixed(0) + "KB)";
		console.log(rv.info);
		cb(rv);
	}

	// return: {w, h, quality, size, b64src}
	function resizeImg()
	{
		var w = img.naturalWidth, h = img.naturalHeight;
		if (opt.maxSize<w || opt.maxSize<h) {
			if (w > h) {
				h = Math.round(h * opt.maxSize / w);
				w = opt.maxSize;
			}
			else {
				w = Math.round(w * opt.maxSize / h);
				h = opt.maxSize;
			}
		}

		var cvs = document.createElement('canvas');
		cvs.width = w;
		cvs.height = h;

		var ctx = cvs.getContext("2d").drawImage(img, 0, 0, w, h);
		var b64src = cvs.toDataURL(opt.mimeType, opt.quality);
		var blob = getBlob(b64src);
		// 无压缩效果，则直接用原图
		if (blob.size > fileObj.size) {
			blob = fileObj;
			b64src = img.src;
			opt.mimeType = fileObj.type;
		}
		// 如果没有扩展名或文件类型发生变化，自动更改扩展名
		var fname = getFname(fileObj.name, opt.mimeType);
		return {
			w0: img.naturalWidth,
			h0: img.naturalHeight,
			w: w,
			h: h,
			quality: opt.quality,
			mimeType: opt.mimeType,
			b64src: b64src,
			name: fname,
			blob: blob,
			size0: fileObj.size,
			b64size: b64src.length,
			size: blob.size
		};
	}

	function getBlob(b64src) 
	{
		var bytes = window.atob(b64src.split(',')[1]); // "data:image/jpeg;base64,{b64data}"
		//var ab = new ArrayBuffer(bytes.length);
		var ia = new Uint8Array(bytes.length);
		for(var i = 0; i < bytes.length; i++){
			ia[i] = bytes.charCodeAt(i);
		}
		var blob;
		try {
			blob = new Blob([ia.buffer], {type: opt.mimeType});
		}
		catch(e){
			// TypeError old chrome and FF
			if (e.name == 'TypeError' && window.BlobBuilder){
				var bb = new BlobBuilder();
				bb.append(ia.buffer);
				blob = bb.getBlob(opt.mimeType);
			}
			else{
				// We're screwed, blob constructor unsupported entirely   
			}
		}
		return blob;
	}

	function getFname(fname, mimeType)
	{
		var exts = {
			"image/jpeg": ".jpg",
			"image/png": ".png",
			"image/webp": ".webp"
		};
		var ext1 = exts[mimeType];
		if (ext1 == null)
			return fname;
		return fname.replace(/(\.\w+)?$/, ext1);
	}
}

/**
@class MUI.UploadPic(jo, opt)

@param jo jQuery DOM对象, 它是uploadpic类，或是包含一个或多个uploadpic类（上传区）的DOM对象。
@param opt {size?=1280, quality?=0.8, uploadParam?}
参考compressImg函数opt参数.
TODO: 支持为每个上传区定义不同的opt, 这时opt是一个回调函数: opt(jo) - jo为上传区, 返回该区的设置。

TODO: 是否允许删除，加opt; 防止双击上传多次

注意：

- 加载 jdcloud-uploadpic.js
- 以uploadpic开头的类所需CSS，目前放在app.css中。
- 预览大图依赖weui库中的样式。

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

	// 点击提交时调用submit，当上传完成后，
	uploadPic.submit().then(function (userPic, itemPics) {
		
	});

	// 如果要精细控制上传进度：
	var dfd = uploadPic.submit(onUpload, onUploadProgress);
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

onUploadProgress用于显示上传进度。框架也会自动在console中显示上传进度。

	// progress: {curPicCnt/已上传照片数, picCnt/总共需上传的照片数, curAreaCnt/已完成的上传区数, areaCnt/总共需更新的上传区数, curKB/当前已完成的上传大小, KB/总上传大小, done/是否全部完成}
	// 示例：利用app_alert显示进度。
	function onUploadProgress(progress)
	{
		var info = progress.picCnt>0? "上传" + progress.curPicCnt + "/" + progress.picCnt + "张照片": "更新照片";
		if (progress.done) {
			info += " - <b>完成!</b>";
		}
		else {
			info += "...";
		}
		app_alert(info, {keep:true});
	}

onUploadDone在全部上传完成后调用，参数分别为每个上传区的图片编号数组（不论该上传区是否需要更新）。

	function onUploadDone(attIds, attIds1) {
		// arguments
	}

在预览位uploadpic-item对象上，设置了以下属性：

- ji.prop("picData_") -> {b64src,blob,w,h,size,...} (参考compressImg的回调函数cb的参数) 
 当选择的图片进行压缩后，数据存储在picData_中。b64src字段可作为url显示图片。在上传服务端后该数据被清空。
- ji.prop("attId_") -> 对应的图片（缩略图）编号。仅当在服务器上已有才显示。
- ji.css("background-image"); -> 缩略图片的url。如果是待上传或刚刚上传的图片，则是大图的base64编码url。

TODO: 无操作时回调？

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
	self.opt = $.extend({}, opt);

	self.jupload.each(function () {
		uploadPic1($(this));
	});

	function uploadPic1(jo)
	{
		var jinput = jo.find("input[type=file]");
		var isMul = jinput.prop("multiple");

		var atts = jo.data("atts");
		if (atts) {
			atts = atts.toString().split(/\s*,\s*/);
			$.each(atts, function (i, e) {
				previewImg(jo, e, null, isMul);
			});
		}

		jinput.change(function (ev) {
			$.each(this.files, function (i, fileObj) {
				compressImg(fileObj, function (picData) {
					previewImg(jo, null, picData, isMul);
				});
			});
			this.value = "";
		});

		jo.on("click", ".uploadpic-item", function () {
			if (this.picData_ || this.attId_) {
				PageGallery.show($(this));
				return false;
			}
		});
	}

	// 对于单图, 直接覆盖原先的uploadpic-item; 如果原先没有, 则新建一个.
	// 对于多图, 如果之前有空闲的item就直接用, 否则在其后创建一个.
	// uploadpic-item上的property: attId_, picData_; attribute: `background-image: url(url)`
	function previewImg(jo, attId, picData, isMul) {
		var url;
		if (attId != null) {
			url = MUI.makeUrl("att", {id:attId});
		}
		else if (picData != null) {
			url = picData.b64src;
		}
		else {
			MUI.assert(false);
		}

		if (!isMul) {
			var ji = jo.find(".uploadpic-item");
			if (ji.size() == 0) {
				ji = newPreview().addClass("uploadpic-item").prependTo(jo);
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
					if (e.style.backgroundImage == "") {
						ji = $(e);
						return false;
					}
				});
				if (ji == null) {
					ji = newPreview();
					$(ji0[ji0.size()-1]).after(ji);
				}
			}
		}
		ji.css("background-image", "url(" + url + ")");
		ji.prop("picData_", picData)
			.prop("attId_", attId);
	}

	function newPreview() {
		var ji = $("<div>").addClass("uploadpic-item");
		var btnDel = $("<div>").addClass("uploadpic-delItem").text("x").appendTo(ji);
		btnDel.click(onDelPreview);
		return ji;
	}
}

function onDelPreview(ev)
{
	var ji = $(this).parent();
	delPreviewItem(ji);
}

function delPreviewItem(ji)
{
	ji.closest(".uploadpic").prop("delMark_", true); // 标记有删除操作，需要更新
	ji.remove();
}

// 如果需要更改，返回Deferred对象，在上传完成后Deferred对象可执行；否则返回空。
function submit1(jo, cb, opt, progress, progressCb)
{
	var fd = null;
	var idx = 1;
	var imgArr = [];
	var totalKB = 0;
	var atts = null;
	var dfd = $.Deferred();

	jo.find(".uploadpic-item").each(function () {
		if (this.picData_ == null)
			return;
		if (fd == null) {
			fd = new FormData();
		}
		// 名字要不一样，否则可能会覆盖
		fd.append('file' + idx, this.picData_.blob, this.picData_.name);
		totalKB += this.picData_.size;
		imgArr.push(this);
		++idx;
	});
	if (fd == null) {
		if (jo.prop("delMark_")) {
			progress.areaCnt += 1;
			done(cb);
			return dfd;
		}
		return;
	}

	progress.areaCnt += 1;
	progress.picCnt += imgArr.length;
	totalKB = parseFloat((totalKB/1024).toFixed(0));
	progress.KB += totalKB;

	var param = $.extend({genThumb:1, autoResize:0}, opt.uploadParam);
	callSvr("upload", param, api_upload, fd);
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
		jo.prop("delMark_", null);
		progress.curAreaCnt += 1;
		progress.curPicCnt += imgArr.length;
		progress.curKB += totalKB;
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

UploadPic.prototype.submit = uploadPic_submit;
function uploadPic_submit(cb, progressCb)
{
	var self = this;
	var dfdArr = [];
	var needWork = false;
	// progress: {curPicCnt, picCnt, curAreaCnt, areaCnt, curKB, KB, done}
	var progress = {curPicCnt:0, picCnt:0, curAreaCnt:0, areaCnt:0, curKB:0, KB:0, done: false};
	self.jupload.each(function () {
		var jo = $(this);
		var dfd = submit1(jo, cb, self.opt, progress, progressCb1);
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
	return dfdAll;

	function progressCb1(pg)
	{
		var info = "uploadpic: area " + pg.curAreaCnt + "/" + pg.areaCnt + ", pic " + pg.curPicCnt + "/" + pg.picCnt + ", size " + pg.curKB + "KB/" + pg.KB + "KB";
		if (progress.done) {
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
		MUI.showPage("#uploadpic-gallery", {backNoRefresh:true});
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
		history.back();
	});

	jdel.click(function(ev) {
		ev.preventDefault();
		delPreviewItem(PageGallery.jpreviewItem_);
		PageGallery.jpreviewItem_ = null;
		history.back();
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
		if (ji1 && ji1.size() > 0) {
			PageGallery.jpreviewItem_ = ji = ji1;
		}
		setupImage(ji);
	}
}
// ------------ }}}

}

