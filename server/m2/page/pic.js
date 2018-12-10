function initPagePic()
{
	var jpage = $(this);
	var uploadPic = new MUI.UploadPic(jpage);

	jpage.on("pagebeforeshow", onPageBeforeShow);
	jpage.find(".btnUpload").click(btnUpload_click);

	function onPageBeforeShow() {
		// TODO: load pics
		$.each(["userPic", "itemPics"], function (i, name) {
			var attIds = MUI.getStorage(name);
			jpage.find("#" + name).attr("data-atts", attIds);
		});
	}

	function btnUpload_click() {
		/* 简单上传
		uploadPic.submit().then(function (userPic, itemPics) {
		});
		*/
		// 精细控制上传进度：
		var dfd = uploadPic.submit(onUpload, onUploadProgress);
		dfd.then(function (userPic, itemPics) {
			console.log("全部完成! userPic=" + userPic.join(',') + "; itemPics=" + itemPics.join(','));
		});
	}

	function onUpload(attIds) {
		// this对象为当前uploadpic
		var id = this.attr("id");
		var pics = attIds.join(',');
		console.log("onUpload: " + id + "=" + pics);

		MUI.setStorage(id, pics);
		// 每个上传区一旦有图片更新，则调用接口更新图片列表。
		// 如果返回一个Deferred对象，则progress.done会等待该事件结束才发生
		// return callSvr("Task1.set", {id: task.id}, $.noop, {pics: pics});
	}

	// progress: {curPicCnt/已上传照片数, picCnt/总共需上传的照片数, curAreaCnt/已完成的上传区数, areaCnt/总共需更新的上传区数, curKB/当前已完成的上传大小, KB/总上传大小, done/是否全部完成}
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
}
