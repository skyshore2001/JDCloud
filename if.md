# 接口说明

本文档中以`$BASE_URL`指代HTTP调用基本地址: 

- 测试环境为 http://a.com/jdcloud/api.php/
- 生产环境为 http://a.com/jdcloud/api.php/

## 通用机制

### 接口返回

- 接口调用使用HTTP/HTTPS协议，只要服务端正确收到请求并处理，HTTP返回码均为200。其内容使用json格式，为一个至少含有2元素的数组。
	- 在调用成功时返回内容格式为 `[0, data]`，其中`data`的类型由接口返回类型所定义。
	- 在请求失败时返回内容格式为 `[非0错误码, 错误信息]`。示例：`[1, "参数不正确"]`。
	- 从返回数组的第3个元素起，为调试信息，仅用于问题诊断。

- 所有交互内容采用UTF-8编码。

### 对象查询接口

形式如`XX.query`的接口是对象查询接口，它支持以下通用查询参数：

- res: 指定需要的返回字段，如`id,name`, `*,items`等，默认值为`*`。可以为字段指定别名，如`id 编号, name 名字`。
- cond: 指定查询条件。示例：`status='PA'`, `status='PA' OR status='RE'`, `tm>='2020-1-1' and tm<'2020-2-1'`
- orderby: 指定排序方式，如按编号倒排：`id DESC`，可以多个字段如`status, id DESC`

**[返回格式]**

query接口默认返回格式为`{h,d}`：

	{h: ["字段1", "字段2", ...], d: [ ["字段1内容", "字段2内容", ...], [ ...第2行 ], ... ] } 

建议前端通过`rs2Array`函数转成对象对象格式。

通过`fmt`参数可以调整返回格式，常用有：

- fmt=list: 返回格式为`{list: 对象数组}`
- fmt=one: 只取一条

- fmt=excel: 导出Excel文件（配合fname参数可指定默认文件名）

**[分页机制]**

常用分页列表，或自动上拉加载列表。query接口支持以下参数：

- pagesz: 指定每次返回多少条数据，默认为20条数据。
- pagekey: 一般首页查询可不填写，而下次查询时应根据上次调用时返回数据的"nextkey"字段来填写。如果需要知道总记录数，可在首次查询时填写0，则会返回总记录数即total字段。

返回：

- nextkey: 供取下一页时填写参数"pagekey". 如果不存在该字段，则说明已经是最后一批数据。
- total: 返回总记录数，仅当pagekey指定为0时返回。

示例：

第一次查询

	Ordr.query()

返回

	{nextkey: 10800910, h: [id, ...], data: [...]}

其中的nextkey将供下次查询时填写pagekey字段；首次查询还会返回total字段。由于缺省页大小为20，所以可估计总共有51/20=3页。

要在首次查询时返回总记录数，则用pagekey=0：

	Ordr.query(pagekey=0)

这时返回

	{nextkey: 10800910, total: 51, h: [id, ...], data: [...]}

第二次查询(下一页)

	Ordr.query(pagekey=10800910)

返回

	{nextkey: 10800931, h: [...], d: [...]}

仍返回nextkey字段说明还可以继续查询，

再查询下一页

	Ordr.query(pagekey=10800931)

返回

	{h: [...], d: [...]}

返回数据中不带"nextkey"属性，表示所有数据获取完毕。

### 图片地址

系统中的图片字段，一般使用图片编号或编号列表。字段名常常叫做`picId`，内容如`100`, `101`这样的数字，或是字段名叫`pics`，内容是像`100,101`这样多个数字。
要获取图片，可以用`att`接口，例如要显示编号为100的图片：

	<img src="$BASE_URL/att?id=100">

一般使用框架提供的`makeUrl`函数生成地址，如：

	// 取图片地址：
	var imgUrl = MUI.makeUrl("att", {id: 100});

在支持缩略图时，字段内保存的是缩略图的编号，可以这样来取缩略图和原始大图的地址：

	// 取缩略图地址：
	var imgUrl = MUI.makeUrl("att", {id: 100});
	// 取原始图地址：
	var bigImgUrl = MUI.makeUrl("att", {thumbId: 100});

### 上传文件

使用multipart/form-data格式上传（标准html支持，可一次传多个文件）:

	POST $BASE_URL/upload?genThumb={genThumb}
	Content-Type: multipart/form-data

	(multipart/form-data格式的单个或多个文件内容)

参数：

- genThumb: 默认为0。设置为1时表示生成缩略图。

注意：该接口需要用户登录权限。

返回：

	[{id, thumbId?}]

- id: 图片编号。
- thumbId: 生成的缩略图编号。

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

