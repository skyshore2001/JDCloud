# 附件上传下载

## 概要设计

上传下载接口。

服务端配置参数及调用接口见plugin.php中头部注释.

## 数据库设计

**[附件]**

@Attachment: id, path(l), orgPicId, exif(t), tm, orgName(l)

path
: String. 文件在服务器上的相对路径, 可方便的转成绝对路径或URL

orgPicId
: Integer. 原图编号。对于缩略图片，链接到对应原始大图片的id.

exif
: String. 图片或文件的扩展信息。以JSON字符串方式保存。典型的如时间和GPS信息，比如：`{"DateTime": "2015:10:08 11:03:02", "GPSLongtitude": [121,42,7.19], "GPSLatitude": [31,14,45.8]}`

tm
: DateTime. 上传时间。

## 交互接口

### 附件上传

使用multipart/form-data格式上传（标准html支持，可一次传多个文件）:

	upload(category?, genThumb?=0, autoResize?=1, onGetPath?)(POST content:multipart/form-data) -> [{id, orgName, size, path, thumbId?}]
	
直接传文件内容，一次只能传一个文件:

	upload(fmt=raw|raw_b64, f, exif?, ...)(POST content:raw) -> [{id, orgName, size, path, thumbId?}]
	
上传照片等内容. 返回附件id. 因为允许一次上传多个文件，返回的是一个数组，每项对应上传的一个文件。

- AUTH_LOGIN | simple

**[参数]**

genThumb
: Boolean. 为1时生成缩略图。如果未指定category, 则默认缩略图宽高不超过360.

category
: String. 图片类别。服务端将根据category不同，将图片放置相应的文件夹中(upload/{category}/{date:yyyymm}/)，用于图片自动裁切缩略图到指定大小。
 例如，商家图片上传使用"store", 用户头像上传使用"user", 其它情况不赋值. 不同的category在生成缩略图时尺寸不同, 可配置变量`Upload:$categoryMap`，缺省为最大360

content
: 文件内容。默认使用multipart/form-data格式，详见请求示例。如果fmt为"raw"或"raw_b64"，则直接为文件内容（或其base64编码）

autoResize
: Boolean. 缺省为1，即如果上传的是图片，且当图片大小超过500K, 自动缩小图片到宽高不超过1280(Upload::$maxPicSize指定).
 也可以指定为一个数字, 比如300, 则表示图片最大宽高不超过该值.
 如果前端做过图片压缩, 宜指定此参数为0.

exif
: Object. 扩展信息。JSON格式，如上传时间及GPS信息：`{"DateTime": "2015:10:08 11:03:02", "GPSLongtitude": [121,42,7.19], "GPSLatitude": [31,14,45.8]}`
 上传图片时可传图片扩展信息（exif信息），包括时间、GPS信息，注意：exif信息只在上传单图时有意义。

fmt
: 指定格式，可为"raw"或"raw_b64"。这时必须用参数"f"指定文件名; 且POST content为文件内容(fmt=raw)或文件经base64编码后(fmt=raw_b64)的内容。

f
: 指定文件名，后台将检查其扩展名。且在fmt="raw"/"raw_b64"时使用。

注意：

- 仅支持上传指定的文件扩展名，可配置`Upload::$fileTypes`。
- 文件最大可上传的大小，可在php.ini中修改配置upload_max_filesize, post_max_size, max_execution_time等相关选项。
- 在保存文件时，文件路径使用以下规则: upload/{category}/{date:YYYYMM}/{6位随机数}.{原扩展名}
 例如, 商家图片(category=store)路径为 upload/store/201501/123456.jpg. 用户上传的某图片(category为空)路径可能为 upload/201501/123456.jpg

**[返回]**

id
: 附件id. 可根据att(id)接口获取该文件。

thumbId
: 如果参数设置了genThumb=1, 则会生成缩略图并返回该字段为生成的缩略图id.

orgName
: 原文件名。可在form-data中获取，或从参数f中获取。在下载(att接口)时会使用到。

path
: 文件路径. 可通过`{baseDir}/{path}`路径来下载文件. 但一般不建议使用它, 而是使用`att(id)`接口来下载文件.

**[示例1]**

使用Content-Type为multipart/form-data可一次上传一个或多个文件。
假如上传两个文件"file1.txt"和"file2.txt", HTTP请求如下：

	POST api.php/upload
	Content-Type:multipart/form-data; boundary=----WebKitFormBoundary6oVKiDmuQSPOtt2L
	Content-Length: ...
	
	------WebKitFormBoundary6oVKiDmuQSPOtt2L
	Content-Disposition: form-data; name="file1"; filename="file1.txt"
	Content-Type: text/plain
	
	(content of file1)
	------WebKitFormBoundary6oVKiDmuQSPOtt2L
	Content-Disposition: form-data; name="file2"; filename="file2.txt"
	Content-Type: text/plain
	
	(content of file2)
	------WebKitFormBoundary6oVKiDmuQSPOtt2L--


注意：

- "Content-Type"必须为"multipart/form-data"并指定boundary. 欲了解详细格式请百度.
- 服务端处理时，会根据filename生成一个新名字（会使用同样的扩展名, 如本例中的".txt"），然后将文件内容保存到该文件中。

使用html自带的form和file组件可以自动生成这样的POST请求，如上传两个文件：

	<form action="api.php/upload" method=post enctype="multipart/form-data">
		<input type=file name="file1" accept="image/*">
		<input type=file name="file2" accept="image/*">
		<input type=submit value="上传">
	</form>

也可以只使用一个file组件，只要设置属性multiple以允许多选文件(以chrome为例，在文件选择框中可以按Ctrl键多选文件)，但注意此时name必须带中括号：

	<form action="api.php/upload" method=post enctype="multipart/form-data">
		<input type=file name="file[]" multiple="multiple" accept="image/*">
		<input type=submit value="上传">
	</form>

multiple属性是html5新增属性，如果浏览器不支持，也可以这样写两个文件上传框：

	<form action="api.php/upload" method=post enctype="multipart/form-data">
		<input type=file name="file[]" multiple="multiple" accept="image/*">
		<input type=file name="file[]" multiple="multiple" accept="image/*">
		<input type=submit value="上传">
	</form>

返回示例如下：

	[ {id:1, thumbId:2}, {id:3, thumbId:4} ]

**[示例2]**

使用fmt=raw上传：

	POST api.php/upload&fmt=raw&f=1.jpg
	Content-Type: image/jpeg
	Content-Length: ...
	
	(jpg文件内容)

使用fmt=raw_b64上传：

	POST api.php/upload&fmt=raw_b64&f=1.jpg
	Content-Type: text/plain
	Content-Length: ...
	
	/9j/4AAQSkZJRgABAQEASABIAAD/4QC+RXhpZgAATU0AKgAAAAgABgE...

返回示例：

	[ {id:1, thumbId:2} ]

### 附件下载

	att(id)
	
	根据id下载附件.
	
	att(thumbId)
	
	使用缩略图id获取原图. 

注意: 该调用不符合接口规范, 它不返回格式为"[code, data]"的json串, 而是直接返回文件内容.

HTTP header "Content-Type"将标识正确的文件MIME类型，如jpg类型为"image/jpeg".

如果找不到附件，将返回HTTP状态码"404 Not Found"。

默认是直接输出文件内容供下载，但如果文件大小超过100MB(可通过`Upload::bigFileSize`配置, 设置为-1表示不限制大小都用php处理)，或是请求头中含有"Range"（比如播放mp4视频，会分段取），则直接重定向到原文件。

**[参数]**

thumbId
: 缩略图id

**[示例]**

获取id=100的附件：

	GET api.php/att?id=100

已知缩略图id=100, 获取它对应的原图：

	GET api.php/att?thumbId=100

找到图片返回:

	HTTP/1.1 200 OK
	Content-Type: image/jpeg
	
	(图片内容)

一般浏览器可以正确直接显示该图片:

	<img src="http://myserver/mysvc/api.php/att?id=100">

或找不到图片：

	HTTP/1.1 404 Not Found
	Content-Type: text/plain; charset=UTF-8

### 查看图片

该接口生成一个图片列表网页。

	pic(id?, thumbId?, smallId?)

- id: 图片编号，或编号列表(以逗号分隔)。
- thumbId: 缩略图编号，或编号列表(以逗号分隔)。
- smallId: 缩略图编号列表，显示小图，点击可跳转到大图

示例：

	<a target="_black" href="http://myserver/mysvc/api.php/pic?id=10,12,14">查看图片</a>
	<a target="_black" href="http://myserver/mysvc/api.php/pic?thumbId=10,12,14">查看图片</a>
	<a target="_black" href="http://myserver/mysvc/api.php/pic?id=10,12&thumbId=10,12&smallId=10,12">查看图片</a>

### 导出文本文件

导出指定文本的文件，可指定编码。

	export(fname, str, enc?)

- fname: 下载文件的默认文件名。
- str: 文件内容。
- enc: 要转换的编码，默认utf-8。最终以该编码输出。

JS使用示例：

	var text = "标题1,标题2\n内容1,内容2";
	window.open(WUI.makeUrl("export", {fname:"template.csv", enc: "gbk", str: text}));
	
直接导出指定文件名的文件。

## 上传示例

### curl测试上传

上传一个图片, 并生成缩略图:

	baseUrl=http://localhost/p/jdcloud/api.php
	curl -s -F "file=@1.png" "$baseUrl/upload?genThumb=1"

支持一次上传多个文件, 注意名称须不一样: (名称无所谓, 只要不同即可, 下面分别用名字file1/file2)

	curl -s -F "file1=@1.png" -F "file2=@2.jpg" "http://localhost/p/jdcloud/api.php/upload?genThumb=1"
	
直接使用raw格式上传: `upload(f, fmt=raw)`

	curl -s --data-binary @1.png "http://localhost/p/mallv2/api.php/upload?f=1.png&fmt=raw"

注: upload接口须认证客户端, 可以用筋斗云simple认证方式, 可在conf.user.php设置密码如 `putenv("simplePwd=test123");`, 然后调用时用-H添加HTTP头:

	curl -s -b 1.txt -F "file=@1.png" "$baseUrl/upload?genThumb=1" -H "x-daca-simple: test123"

也可以先登录, 保持cookie并调用: (-c保存到cookie文件, -b使用cookie文件)

	curl -s -c 1.txt "$baseUrl/login?uname=user1&pwd=1234"
	curl -s -F "file=@1.png" "$baseUrl/upload?genThumb=1" -b 1.txt

### form上传

	<form action="http://localhost/p/jdcloud/api.php/upload" method="post">
		<input type=file name="file[]" multiple="multiple" accept="image/*">
		<input type=submit value="上传">
	</form>

### JS上传示例

使用FormData对象.

HTML:

	file: <input id="file1" type="file" multiple>
	<button type="button" id="btn1">upload</button>

JS:

	jpage.find("#btn1").on('click', function () {
		var fd = new FormData();
		$.each(jpage.find('#file1')[0].files, function (i, e) {
			fd.append('file' + (i+1), e);
		});
		callSvr('upload', api_upload, fd);

		function api_upload(data) { ... }
	});

## 定制上传路径

示例：下载中心资源版本文件上传要求将文件上传到`upload/resource/{资源名称}/{文件名称}`, 可定制接口:

	upload(category=resource, resource, version) -> [{ id, orgName, size, path }]
    
参数:

- resource: 文件所属资源
- version: 版本号

调用成功返回示例:

    [0, [
        {"id:" 100, "path":"upload/resource/fotric340操作手册/1.0.0/fotric340.pdf", ...}
        ...
    ]]
    
实现方式：在plugin/index.php中定制:

	Upload::$categoryMap["resource"] = ["path"=>"%{resource}/%{version}/%f", "sameNameOverwrite"=>true];

sameNameOverwrite表示若重名则覆盖. 默认是重名则自动改名.
