# 接口说明

本文档中以`$BASE_URL`指代HTTP调用基本地址: 

- 测试环境为 http://test.server.com/jdcloud/api/
- 生产环境为 http://prod.server.com/jdcloud/api/

本文档调用示例使用JS函数`callSvr`表示：

	callSvr(调用名, URL参数/可选, $.noop(表示空的回调函数，用来分隔URL和POST参数), POST参数/可选, 其它选项/可选)

比如，下面表示同时传了URL参数id和POST参数amount：

	callSvr("Ordr.set", {id: 100}, $.noop, {amount: 99.9});

## 通用机制

### 接口返回

- 接口调用使用HTTP/HTTPS协议，只要服务端正确收到请求并处理，HTTP返回码均为200。其内容使用json格式，为一个至少含有2元素的数组。
	- 在调用成功时返回内容格式为 `[0, data]`，其中`data`的类型由接口返回类型所定义。
	- 在请求失败时返回内容格式为 `[非0错误码, 错误信息]`。示例：`[1, "参数不正确"]`。
	- 从返回数组的第3个元素起，为调试信息，仅用于问题诊断。

- 所有交互内容采用UTF-8编码。

### 认证机制

通过HTTP标准的Basic认证方式进行认证。
调用方在请求时，添加以下HTTP头传用户名和密码（假设用户名、密码分别是test、1234）：

	Authorization: Basic dGVzdDoxMjM0

按HTTP协议，Basic后面的内容为"用户名:密码"进行base64编码，即base64_encode("test:1234") = "dGVzdDoxMjM0"

使用curl测试示例：

	curl -u test:1234 -d "p1=1&p2=xxx" http://localhost/jdcloud/api/hello?a=1

### 对象查询接口

	GET $BASE_URL/XX.query

形式如`XX.query`的接口是对象查询接口，一般使用GET方法通过URL传参，也可以通过POST内容传参。它支持以下通用查询参数：

- res: 指定需要的返回字段，如`id,name`, `*,items`等，默认值为`*`。可以为字段指定别名，如`id 编号, name 名字`。
- cond: 指定查询条件。示例：`status='PA'`, `status='PA' OR status='RE'`, `tm>='2020-1-1' and tm<'2020-2-1'`。使用jdcloud前端框架可通过getQueryCond函数生成查询条件。
- orderby: 指定排序方式，如按编号倒排：`id DESC`，可以多个字段如`status, id DESC`

注意：返回列表会分页，默认每页20条数据，可通过pagesz参数调整每页条数。

**[返回格式]**

query接口默认返回格式为`{h,d}`，通过表头h与表内容d传数据表，由于表头单独返回，相比传统对象数组格式减少了重复，传输更高效：

	{h: ["字段1", "字段2", ...], d: [ ["字段1内容", "字段2内容", ...], [ ...第2行 ], ... ] } 

使用jdcloud前端框架可通过`rs2Array`函数转成对象对象格式，或通过`rs2Hash`/`rs2MultiHash`转成映射表格式。
`rs2MultiHash`常用于数据分组
示例:http://oliveche.com/jdcloud-site/api_web.html#rs2MultiHash

通过`fmt`参数可以调整返回格式，常用有：

- fmt=list: 返回格式为`{list: 对象数组}`
- fmt=one: 只取一条
- fmt=array: 返回对象数组，相当于fmt=list时的list子项，由于无法返回分页参数，所以不适合分页。

- fmt=excel: 导出Excel文件（配合fname参数可指定默认文件名）

**[分页机制]**

传统分页列表使用page参数指定页码，根据返回的total与页内条数(pagesz)确定页数：

- page: Integer. 可选，指定分页页码，默认为1（第1页）。
- pagesz: Integer. 指定每次返回多少条数据，默认为20条数据。设置为-1表示返回最大条目数，后端默认限制为最大1000条，可调整到最大1万条。

返回：

- total: 返回总记录数，仅当指定了page参数，或有pagekey参数且指定为0时返回。
- nextkey: 用于上拉加载分页（下节介绍），供取下一页时填写参数"pagekey". 如果不存在该字段，则说明已经是最后一页数据。

示例：

取首页：

	callSvr("Ordr.query", {page: 1})

返回：

	{h: [id, ...], data: [...], total: 51}

可推算总页数为`Math.ceil(51/20)=3`页（按默认pagesz=20计算）。

取第2页：

	callSvr("Ordr.query", {page: 2})

另一种分页方式更高效，即上拉加载分页，使用pagekey参数：

- pagekey: String. 一般首页查询可不填写，而下次查询时应根据上次调用时返回数据的"nextkey"字段来填写。如果需要知道总记录数，可在首次查询时填写0，则会返回总记录数即total字段。

示例：取首页查询

	callSvr("Ordr.query")

返回

	{nextkey: "10800910", h: [id, ...], data: [...]}

其中的nextkey将供下次查询时填写pagekey字段。

第二次查询(下一页)

	callSvr("Ordr.query", {pagekey: "10800910"});

返回数据有含有nextkey字段说明还可以继续查询，若不带"nextkey"属性，表示所有数据获取完毕。

要在首次查询时返回总记录数，则须指定pagekey=0：

	callSvr("Ordr.query", {pagekey: 0})

这时返回

	{nextkey: 10800910, total: 51, h: [id, ...], data: [...]}

可推算总页数为`Math.ceil(51/20)=3`页（按默认pagesz=20计算）。

### 对象修改接口

要更新的字段通过POST内容传输。支持urlencoded或json格式，通过`Content-Type: application/x-www-form-urlencoded`或`Content-Type: application/json`指定POST内容格式。

添加/add接口：

	POST $BASE_URL/XX.add

	添加字段内容

返回格式为`[0, id]`，其中id是新添加对象的编号，是个整数，可用于之后操作。

更新/set接口：

	POST $BASE_URL/XX.set?id={id}

	修改字段内容

注意：编号id通过url传递，要修改的字段在POST内容中传递。

删除/del接口：

	GET $BASE_URL/XX.del?id={id}

### 图片地址

系统中的图片字段，一般使用图片编号或编号列表。字段名常常叫做`picId`，内容如`100`, `101`这样的数字，或是字段名叫`pics`，内容是像`100,101`这样多个数字。
要获取图片，可以用`att`接口，例如要显示编号为100的图片：

	<img src="$BASE_URL/att?id=100">

一般使用框架提供的`makeUrl`函数生成地址，如：

	// 取图片地址：
	var imgUrl = MUI.makeUrl("att", {id: 100}); // 其实就是 $BASE_URL/att?id=100
	jimg.attr("src", imgUrl); // 设置到img.src属性。

在支持缩略图时，如果字段内保存的是大图（原图）编号：

	// 取小图(缩略图)地址：加thumb=1参数表示取小图
	var imgUrl = MUI.makeUrl("att", {id: 100, thumb: 1});
	// 取大图(原图)地址：
	var bigImgUrl = MUI.makeUrl("att", {id: 100});

如果字段内保存的是缩略图的编号，可以这样来取缩略图和原始大图的地址：

	// 取小图(缩略图)地址：
	var imgUrl = MUI.makeUrl("att", {id: 100});
	// 取大图(原图)地址：用参数thumbId=100表示曲取小图编号100对应的大图
	var bigImgUrl = MUI.makeUrl("att", {thumbId: 100});

服务端还支持pic接口，可生成一个显示图片的URL，直接在浏览器（或iframe）中显示。
注意att接口直接返回一张图的内容，而pic接口返回html片段，它支持多图。用法示例：

	// 如果"100,102"是大图
	var url = MUI.makeUrl("pic", {id: "100,102"}); // 其实就是 $BASE_URL/pic?id=100,102
	jframe.attr("src", url);

	// 如果"100,102"是小图
	var url = MUI.makeUrl("pic", {thumbId: "100,102"}); // 其实就是 $BASE_URL/pic?thumbId=100,102
	jframe.attr("src", url);

### 上传文件

使用multipart/form-data格式上传（标准html支持，可一次传多个文件）:

	POST $BASE_URL/upload?genThumb={genThumb}
	Content-Type: multipart/form-data

	(multipart/form-data格式的单个或多个文件内容)

参数：

- genThumb: 默认为0。设置为1时表示生成缩略图。

注意：该接口需要用户登录权限，也可以使用[简单认证](#简单认证机制).

返回：

	[{id, thumbId?}]

- id: 图片编号。
- thumbId: 生成的缩略图编号。

注意返回的是一个数组，若一次上传多个文件，则依次返回。

在填写文件字段比如atts时（或是不带缩略图的图片字段），将文件编号以逗号分隔后存入，比如`100`, `101,102`这样。取文件时用`att(id)`接口。
在填写图片字段比如pics时，一般应支持缩略图(参数genThumb=1)，这时将图片编号以逗号分隔，比如`101,103`这样存入图片字段中。
取图片时用`att(id)`接口。取缩略图用`att(id,thumb=1)`接口.

示例：使用FormData对象上传

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

### 签名

若接口调用要求验证签名，须设置`_sign`参数。算法如下: 

	_sign=md5(timestamp + pwd)

timestamp为unix时间戳（可由C语言`time()`生成，或Java/Javascript的`new Date().getTime()`得到，支持秒或毫秒两种精度），pwd为密钥（请从服务方获取）。

示例: timestamp=1576600003, pwd=demo, 则

	str = timestamp + pwd = "1576600003demo"
	_sign=md5(str)="cfb74e1d9c85910ea9f9b2ff30885d4a"

注意: 时间戳2小时内有效。

## 设置店铺状态

	POST $BASE_URL/Store.set?id={id}&_sign={sign}
	
	pause={pause}&timestamp={timestamp}

参数：

- id: 店铺编号。
- pause: 1-因低温暂停服务, 0-恢复正常服务

调用成功返回

	[0, "OK"]

其中0表示接口调用成功。调用失败时返回示例：

	[1, "参数不正确"]

