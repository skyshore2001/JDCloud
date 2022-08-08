<?php
$pics = [];
if (isset($meta)) {
	foreach($meta as $k=>$v) {
		if (@$v["isPic"]) {
			$pics[] = $k;
		}
	};
}
?>
function initPage<?=$obj?>() 
{
	var jpage = $(this);
	// jpage.on("pagebeforeshow", onPageBeforeShow);

	var pageItf = Page<?=$obj?>;
<?php if ($pics) { ?>
	var uploadPic = new MUI.UploadPic(jpage);
<?php }?>
	if (pageItf.formMode == null) {
		pageItf.showForAdd();
	}

	var detailItf = MUI.initPageDetail(jpage, {
		pageItf: pageItf,
		onValidate: function (jf) {
			// 补足字段和验证字段，返回false则取消form提交。
			if (pageItf.formMode == FormMode.forSet) {
			}
<?php
if ($pics) {
	$picFields = join(', ', $pics);
	echo <<<EOL
			var dfd = $.Deferred();
			uploadPic.submit().then(function ($picFields) {
				dfd.resolve();
			});
			return dfd;

EOL;
}
?>
		},
		onGet: function (data) {
<?php
if ($pics) {
	echo <<<EOL
			uploadPic.reset();

EOL;
}
?>
		},
		onAdd: function (id) {
			// var fn = MUI.reloadPage;
			var fn = history.back;
			app_alert("添加成功, 编号为" + id + "!", fn);
		},
		onSet: function (data) {
			var fn = history.back;
			app_alert("已更新!", fn);
		},
		onDel: function () {
			app_alert("已删除!");
		},
		/*
		onNoAction: function () {
			history.back();
		}
		*/
	});

	jpage.find("#btnDel").click(btnDel_click);

	function btnDel_click(ev) {
		app_alert("删除记录？", "q", detailItf.del.bind(detailItf));
	}
}

// TODO: move page interface to the main js file
var Page<?=$obj?> = {
	showForAdd: function(formData) {
		this.formMode = FormMode.forAdd;
		this.formData = formData;
		MUI.showPage("#<?=lcfirst($obj)?>");
	},
	showForSet: function (formData) {
		this.formMode = FormMode.forSet;
		this.formData = formData;
		MUI.showPage("#<?=lcfirst($obj)?>");
	},
	show: function (id) {
		if (id)
			this.showForSet({id:id});
		else
			this.showForAdd();
	},

	formMode: null,
	formData: null
};
