function initDlgOrder()
{
	var jdlg = $(this);
	jdlg.on("beforeshow", function(ev, mode, opt) {
		jdlg.find(".forFind").toggle(mode == FormMode.forFind);
		jdlg.find(".notForFind").toggle(mode != FormMode.forFind);

		var divOrder1 = jdlg.find("#divOrder1");
		var orderLog = opt.data && opt.data.orderLog;
		if (orderLog) {
			divOrder1.show();
			setTimeout(function () {
				// 可写在show事件中，或用setTimeout推迟执行。
				jdlg.find("#tblOrderLog").datagrid({
					data: orderLog
				});
			});
		}
		else {
			divOrder1.hide();
		}
	});
}
