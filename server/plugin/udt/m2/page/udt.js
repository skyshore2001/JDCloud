function initPageUdt() 
{
	var jpage = $(this);
	var jfrm = jpage.find("form:first");
	var uploadPic;
	var pageId = jpage.attr("id");

	var name = pageId.split("__")[1];
	MUI.assert(name);
	var name1 = name + "Id"; // for storage

	var pageItf = window["PageUdt__" + name] = {
		pageId: pageId
	};
	pageItf.__proto__ = PageUdt;
	setPageTitle("加载" + name + "...");
	UDTGet(name, initPage);

	function setPageTitle(title) {
		jpage.find(".hd h1").html(title);
		MUI.setDocTitle(title);
	}

	function initPage(udt) {
		setPageTitle(udt.title);
		jfrm.attr("action", "U_" + udt.name);

		if (pageItf.formMode == null) {
			var id = MUI.getStorage(name1);
			pageItf.show(id);
		}
		// create fields
		var tplCell = jpage.find("#tplCell").html();
		var tplCellSys = jpage.find("#tplCellSys").html();
		var jbtns = jpage.find("#divBtns");
		$.each(udt.fields, function (i, field) {
			var attr = {};
			if (field.id == null) {
				tpl = tplCellSys;
			}
			else if (checkPicField(field.name, attr)) {
				if (attr.multiple) {
					tpl = jpage.find("#tplCellPic2").html();
				}
				else {
					tpl = jpage.find("#tplCellPic").html();
				}
				pageItf.hasPicField = true;
			}
			else {
				tpl = tplCell;
			}
			var je = $(MUI.applyTpl(tpl, field));
			if (field.type == "tm" || field.type == "date") {
				je.find("input").attr("placeholder", "格式: 年-月-日");
			}
			je.insertBefore(jbtns);
		});

		jpage.find("#btnReset").click(function () {
			MUI.delStorage(name1);
			MUI.reloadPage();
		});

		if (pageItf.hasPicField) {
			var dfd = loadUploadLib();
			dfd.then(initPage2);
		}
		else {
			initPage2();
		}
	}

	function initPage2() {
		if (pageItf.hasPicField) {
			uploadPic = new MUI.UploadPic(jpage);
		}

		MUI.initPageDetail(jpage, {
			pageItf: pageItf,
			onValidate: function (jf) {
				// 补足字段和验证字段，返回false则取消form提交。
				if (pageItf.formMode == FormMode.forSet) {
				}
				if (uploadPic) {
					var dfd = $.Deferred();
					uploadPic.submit().then(function () {
						dfd.resolve();
					});
					return dfd;
				}
			},
			onGet: function (data) {
				if (uploadPic) {
					uploadPic.reset();
				}
			},
			onAdd: function (id) {
				MUI.setStorage(name1, id);
				app_alert("添加成功, 编号为" + id + "!", MUI.reloadPage);
			},
			onSet: function (data) {
				var fn = history.back;
				app_alert("已更新!", fn);
			},
			onDel: function () {
				app_alert("已删除!");
			},
			onNoAction: function () {
				app_alert("已保存!");
			}
		});
		jpage.trigger("pagebeforeshow");
	}

	function checkPicField(name, attr) {
		if (name.match(/(picId|pics)$/i)) {
			attr.multiple = name.substr(-1) === 's';
			return true;
		}
		return false;
	}
}

