function initDlgOrder()
{
	var jdlg = $(this);
	var jfrm = jdlg.find("form");
	jfrm.on("beforeshow", function(ev, mode) {
		jdlg.find(".forFind").toggle(mode == FormMode.forFind);
		jdlg.find(".notForFind").toggle(mode != FormMode.forFind);
	})
	.on("loaddata", function (ev, data) {
		var showMore = (data.orderLog !== undefined);
		var divOrderMore = jdlg.find("#divOrderMore");
		if (! showMore) {
			divOrderMore.hide();
			jdlg.find("#btnOrderMore").show();
			return;
		}
		jdlg.find("#btnOrderMore").hide();
		divOrderMore.show();

		jdlg.find("#tblOrderLog").datagrid({
			data: data.orderLog
		});
	});
}
