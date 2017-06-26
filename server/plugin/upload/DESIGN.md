# 附件上传下载

## 概要设计

上传下载接口。

## 数据库设计

**[附件]**

@Attachment: id, path, orgPicId, exif(t), tm

path
: String. 文件在服务器上的相对路径, 可方便的转成绝对路径或URL

orgPicId
: Integer. 原图编号。对于缩略图片，链接到对应原始大图片的id.

exif
: String. 图片或文件的扩展信息。以JSON字符串方式保存。典型的如时间和GPS信息，比如：`{"DateTime": "2015:10:08 11:03:02", "GPSLongtitude": [121,42,7.19], "GPSLatitude": [31,14,45.8]}`

tm
: DateTime. 上传时间。


路径使用以下规则: upload/{type}/{date:YYYYMM}/{randnum}.{ext}

例如, 商家图片路径可以为 upload_store/201501/101.jpg. 用户上传的某图片路径可能为 upload/201501/102.jpg

## 交互接口

### 附件上传

使用multipart/form-data格式上传（标准html支持，可一次传多个文件）:

	upload(type?=default, genThumb?=0, autoResize?=1)(POST content:multipart/form-data) -> [{id, thumbId?}]
	
直接传文件内容，一次只能传一个文件:

	upload(fmt=raw|raw_b64, f, exif?, ...)(POST content:raw) -> [{id, thumbId?}]
	
TODO: 如果使用微信的上传接口, 可以调用:

	upload(..., weixinServerIds) -> [{id, thumbId?}]

上传照片等内容. 返回附件id. 因为允许一次上传多个文件，返回的是一个数组，每项对应上传的一个文件。

员工端上传图片时应传图片扩展信息（exif信息），包括时间、GPS信息，以便后期（通过工具校验数据）验证员工是否在指定的时间地点去洗车。
注意：exif信息只在上传单图时有意义。

TODO:将限制只支持jpg等几种指定格式; 以及限制最大可传文件的size

**[参数]**

genThumb
: Boolean. 为1时生成缩略图。如果未指定type, 则按type=default设置缩略图大小.

type
: String. 商家图片上传使用"store", 用户头像上传使用"user", 其它情况不赋值. 不同的type在生成缩略图时尺寸不同。

content
: 文件内容。默认使用multipart/form-data格式，详见请求示例。如果fmt为"raw"或"raw_b64"，则直接为文件内容（或其base64编码）

autoResize
: Boolean. 缺省为1，即当图片大小超过500K, 自动缩小图片到最大像素1920x1080.

exif
: Object. 扩展信息。JSON格式，如上传时间及GPS信息：`{"DateTime": "2015:10:08 11:03:02", "GPSLongtitude": [121,42,7.19], "GPSLatitude": [31,14,45.8]}`

fmt
: 指定格式，可为"raw"或"raw_b64"。这时必须用参数"f"指定文件名; 且POST content为文件内容(fmt=raw)或文件经base64编码后(fmt=raw_b64)的内容。

f
: 指定文件名，后台将检查其扩展名。且在fmt="raw"/"raw_b64"时使用。

TODO
type决定生成缩略图的大小：

- type=user: 128x128
- type=store: 200x150
- type=default: 100x100

**[返回]**

id
: 附件id. 可根据att(id)接口获取该文件。

thumbId
: 如果参数设置了genThumb=1, 则会生成缩略图并返回该字段为生成的缩略图id.

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

## 前端应用接口

（无）
