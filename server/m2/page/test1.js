function initPageTest1() {
	var jpage = $(this);
	/*
	window.jv=jpage.find('video');
	jv.attr('src', makeUrl('att', {id:33}));
	//jv.play();
	return;
	*/

	function api_hello(data)
	{
		console.log(data);
	}

	jpage.find("#btn1").on('click', function () {
		var data = new FormData();
		$.each(jpage.find('#file1')[0].files, function (i, e) {
			data.append('file' + (i+1), e);
		});
		callSvr('upload', api_hello, data);
	});
}
