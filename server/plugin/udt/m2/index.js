var PageUdt = {
	showForAdd: function(formData) {
		this.formMode = FormMode.forAdd;
		this.formData = formData;
		MUI.showPage(this.pageId);
	},
	showForSet: function (formData) {
		this.formMode = FormMode.forSet;
		this.formData = formData;
		MUI.showPage(this.pageId);
	},

	show: function (id) {
		if (id)
			this.showForSet({id: id});
		else
			this.showForAdd();
	},

	formMode: null,
	formData: null,
	pageId: "udt",
	hasPicField: false
};

var g_udts = {};
function UDTGet(name, fn)
{
	var data = g_udts[name];
	if (data) {
		fn(data);
		return;
	}

	var defFields = [
		{name: "id", title: "编号", type: "id"},
		//{name: "tm", title: "创建时间", type: "tm"},
		//{name: "updateTm", title: "更新时间", type: "tm"}
	];
	callSvr("UDT.get", {name: name}, api_UDTGet);
	function api_UDTGet(data) {
		data.fields.unshift.apply(data.fields, defFields);
		console.log(data);
		g_udts[name] = data;
		fn(data);
	}
}

