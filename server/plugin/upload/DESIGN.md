# 附件上传下载

## 概要设计

上传下载接口。

服务端配置参数及调用接口见plugin.php中头部注释.

### 关于图片

系统中的图片字段，一般使用图片编号或编号列表。字段名常常叫做`picId`，内容如`100`, `101`这样的数字，或是字段名叫`pics`，内容是像`100,101`这样多个数字。
要获取图片，可以用`att`接口，例如要显示编号为100的图片：

	<img src="$BASE_URL/att?id=100">

一般使用框架提供的`makeUrl`函数生成地址，如：

	// 取图片地址：
	var imgUrl = MUI.makeUrl("att", {id: 100}); // 其实就是 $BASE_URL/att?id=100
	jimg.attr("src", imgUrl); // 设置到img.src属性。

在支持缩略图时（upload接口的参数genThumb=1），上传后会返回id(原图)和thumbId(缩略图)两个编号。

习惯上字段内保存的是缩略图的编号，可以这样来取缩略图和原始大图的地址：

	// 取缩略图地址：
	var imgUrl = MUI.makeUrl("att", {id: 100});
	// 取原始图地址：
	var bigImgUrl = MUI.makeUrl("att", {thumbId: 100});

v6.1后字段内也可保存原图编号，这时这样来取缩略图和原始大图的地址：

	// 取缩略图地址：
	var imgUrl = MUI.makeUrl("att", {id: 100, thumb:1});
	// 取原始图地址：
	var bigImgUrl = MUI.makeUrl("att", {id: 100});

pic接口用于可生成一个显示一组图片的URL，直接在浏览器（或iframe）中显示。
注意att接口直接返回一张图的内容，而pic接口返回html片段，它支持多图。

用法示例：根据图片编号列表"100,102"，显示图片列表

	var url = MUI.makeUrl("pic", {id: "100,102"}); // 其实就是 $BASE_URL/pic?id=100,102
	window.open(url);
	//或jframe.attr("src", url);

用法示例：pics字段中保存了缩略图编号列表，如"100,102"，则显示缩略图列表，点击一张图时显示原图：

	var url = MUI.makeUrl("pic", {smallId: "100,102"}); // 其实就是 $BASE_URL/pic?smallId=100,102

若pics字段中保存的是原图编号列表，如"100,102"，则显示缩略图列表，点击一张图时显示原图：

	var url = MUI.makeUrl("pic", {id: "100,102", thumb: 1}); // 其实就是 $BASE_URL/pic?id=100,102&thumb=1

jdcloud管理端wui-upload组件支持上传和预览图片，选项WUI.options.useNewThumb=1时，表示字段内容为大图（原图）编号。
管理端列表页的WUI.Formatter.pics/pics1/picx也支持WUI.option.useNewThumb指定带缩略图的图片编号保存风格。

类似的，jdcloud移动端uploadpic组件使用MUI.options.useNewThumb=1来判断新风格。

## 数据库设计

**[附件]**

@Attachment: id, path(l), orgPicId, exif(t), tm, orgName(l)

path
: String. 文件在服务器上的相对路径, 可方便的转成绝对路径或URL

orgPicId
: Integer. 原图编号。对于缩略图片，链接到对应原始大图片的id. (v6.1) 如果为负数，则表示当前是原图，-orgPicId链接到它的缩略图。原图和缩略图是双向链接的。

exif
: String. 图片或文件的扩展信息。以JSON字符串方式保存。典型的如时间和GPS信息，比如：`{"DateTime": "2015:10:08 11:03:02", "GPSLongtitude": [121,42,7.19], "GPSLatitude": [31,14,45.8]}`

tm
: DateTime. 上传时间。

## 交互接口

### 附件上传

使用multipart/form-data格式上传（标准html支持，可一次传多个文件）:

	upload(category?, genThumb?=0, autoResize?=1, f?, exif?)(POST content:multipart/form-data) -> [{id, name, orgName, size, path, thumbId?}]
	
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
: String. 扩展信息。如上传时间及GPS信息：`{"DateTime": "2015:10:08 11:03:02", "GPSLongtitude": [121,42,7.19], "GPSLatitude": [31,14,45.8]}`
 上传图片时可传图片扩展信息（exif信息），包括时间、GPS信息，注意：exif信息只在上传单图时有意义。

fmt
: 指定格式，可为"raw"或"raw_b64"。这时必须用参数"f"指定文件名; 且POST content为文件内容(fmt=raw)或文件经base64编码后(fmt=raw_b64)的内容。

f
: String. 
使用默认的form-data格式上传时，指定文件字段的名称, 例如`f=ir`表示只对form-data数据块`Content-Disposition: form-data; name="ir"; filename="file1.txt"`保存到文件；可以用逗号分隔指定多个如`f=ir,ir-raw`；如果不指定则保存所有上传的文件。
在fmt="raw"/"raw_b64"上传时，f必传用于指定文件名, 一般应带扩展名, 后台将检查其扩展名。

注意：

- 仅支持上传指定的文件扩展名，可配置`Upload::$fileTypes`。
- 文件最大可上传的大小及上传时间，可在php.ini中修改配置upload_max_filesize, post_max_size, max_file_uploads等相关选项。
	- max_input_time默认为60秒, 超出时报错"上传失败". ($_FILES为空)
	- post_max_size默认为8M, 为上传数据大小限制, 超过时报错"上传失败". ($_FILES为空)
	- upload_max_filesize默认为2M, 为单个文件大小限制, 超过时报错, 并提示文件不可超过多大.
	- max_file_uploads为一次最多传多少文件, 默认20, 超过时不报错, 但后面的文件丢失.
- 在保存文件时，文件路径使用以下规则: upload/{category}/{date:YYYYMM}/{6位随机数}.{原扩展名}
 例如, 商家图片(category=store)路径为 upload/store/201501/123456.jpg. 用户上传的某图片(category为空)路径可能为 upload/201501/123456.jpg

注意：路径是相对$conf_dataDir配置的地址，默认为server目录下。

**[返回]**

id
: 附件id. 可根据att(id)接口获取该文件。

name
: 文件字段名。对应上传时form-data块中的name值。

orgName
: 原文件名。对应form-data块中的filename值，或从参数f中获取。在下载(att接口)时会使用到。

size
: 文件大小

path
: 文件路径. 可通过`{baseDir}/{path}`路径来下载文件. 但一般不建议使用它, 而是使用`att(id)`接口来下载文件.

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

使用callSvr测试：

	callSvr("upload", {f:"1.txt",fmt:"raw"}, $.noop, "hello中文");
	callSvr("upload", {f:"1.txt",fmt:"raw_b64"}, $.noop, MUI.base64Encode("hello中文"));

### 附件下载

根据id下载附件或图片：

	att(id, down?)
	
取图片id的缩略图：
	
	att(id, thumb=1)
	
取缩略图id对应的原图：

	att(thumbId)
	
注意: 该调用不符合接口规范, 它不返回格式为"[code, data]"的json串, 而是直接返回文件内容.

HTTP header "Content-Type"将标识正确的文件MIME类型，如jpg类型为"image/jpeg".

如果找不到附件，将返回HTTP状态码"404 Not Found"。

默认是直接输出文件内容供下载，但如果文件大小超过100MB(可通过`Upload::bigFileSize`配置, 设置为-1表示不限制大小都用php处理)，或是请求头中含有"Range"（比如播放mp4视频，会分段取），则直接重定向到原文件。

**[参数]**

- thumbId: 缩略图编号
- thumb: 指定为1时，取图片对应的缩略图，如果没有返回`404-Not found`。
- down: 默认浏览器访问图片、音视频时自动预览（显示或播放，通过mimetype确认类型），其它类型则下载。如果指定down=0则直接预览，指定down=1则直接下载。

**[示例]**

获取id=100的附件：

	GET api.php/att?id=100

(v6.1)取图片id=200, 获取它的缩略图：

	GET api.php/att?id=200&thumb=1

在生成缩略图的情况下，常常图片200的缩略图编号为201（但并不总是这样）。若已知缩略图id=201, 获取它对应的原图：

	GET api.php/att?thumbId=201

找到图片返回:

	HTTP/1.1 200 OK
	Content-Type: image/jpeg
	
	(图片内容)

一般浏览器可以正确直接显示该图片:

	<img src="http://myserver/mysvc/api.php/att?id=100">

(v6.1)显示图片100的缩略图：

	<img src="http://myserver/mysvc/api.php/att?id=100&thumb=1">

显示缩略图101对应的原图：

	<img src="http://myserver/mysvc/api.php/att?thumbId=101">

或找不到图片：

	HTTP/1.1 404 Not Found
	Content-Type: text/plain; charset=UTF-8

### 查看图片

该接口生成一个图片列表网页。

	pic(id?, thumbId?, smallId?, thumb?)

- id: 图片编号，或编号列表(以逗号分隔)。
- thumbId: 缩略图编号，或编号列表(以逗号分隔)。
- smallId: 缩略图编号列表，显示小图，点击可跳转到大图
- thumb: (v6.1) 与id合用，表示id是原图，但列表中显示为缩略图，点击可链接到原图

示例：

	<a target="_black" href="http://myserver/mysvc/api.php/pic?id=10,12,14">查看图片</a>
	<a target="_black" href="http://myserver/mysvc/api.php/pic?thumbId=10,12,14">查看图片</a>
	<a target="_black" href="http://myserver/mysvc/api.php/pic?id=10,12&thumbId=10,12&smallId=10,12">查看图片</a>

### 导出文本文件

导出指定文本的文件，可指定编码。

	export(fname, str, enc?, forexcel?=1)

- fname: 下载文件的默认文件名。
- str: 文件内容。
- enc: 要转换的编码，默认utf-8。最终以该编码输出。
- forexcel: 默认当fname后缀为".csv"时，为避免excel误处理大数字（手机号/身份证号等），会自动转成`="12345678901"`的形式。本参数设置为0时禁用该处理。

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

## 上传的文件存数据库方案

目前上传文件的存放路径为$conf_DataDir/upload/，如果是单台服务器，访问时是没有问题的。
如果有双机热备或负载均衡环境，则访问不同的服务器，就无法确定拿到之前保存的文件了。

解决方案：

方案一：使用共享存储，比如引入一个第三方的nas网盘，通过nfs甚至ssh挂载到服务器上，再配置$conf_dataDir把数据目录指向共享盘
方案二：双机同步，每台服务器上运行个同步进程，在发生变更时实时（比如inotify+rsyn方案）将文件同步到其它服务器。
方案三：存数据库（其实也是共享存储方案，数据库是独立于这几台服务器的）。在上面条件不具备时，这是部署起来最简单的方案。

为Attachment表添加字段data，类型按最大尺寸来选，blob: 64K; mediumblob: 16M; longblob: 4G，示例：

	ALTER TABLE Attachment add data mediumblob

在plugin/index.php或php/conf.user.php中添加配置项：

	$GLOBALS["conf_upload_storeInDb"] = true;

注意：即使文件保存在DB中，本地也会再存一份。

## 文件和普通字段一起上传 - file2id

接口默认处理所有带filename的项，也可以通过参数f来指定保存form-data块中指定name的文件(注意不是filename).

示例：一次上传红外图文件(ir)、原始温度数据文件(ir-raw)、普通数据(result)

上传内容示例如下:
```txt
--------------------------357185ac2c5d2929
Content-Disposition: form-data; name="ir"; filename="1.jpg"
Content-Type: image/jpeg

(1.jpg content here)
--------------------------357185ac2c5d2929
Content-Disposition: form-data; name="ir-raw"; filename="1.dat"
Content-Type: application/octet

(1.dat content here)
--------------------------357185ac2c5d2929
Content-Disposition: form-data; name="result"
Content-Type: application/json

{"tm":"2021-1-1 10:10:10", "maxT":32.3}
```

可用curl命令生成上述请求：`curl -F "ir=@1.jpg" -F "ir-raw=@1.dat" -F "result=<1.json" -u $userpwd $url`

假如对应处理接口为: `XX.add()(tm, maxT, irPicId, rawAttId)`

可以用file2id函数来处理文件字段，它先调用upload接口，再将上传的附件id赋值到$_POST中:

```php
	// AC_Xxx::onValidate()
	$_POST = jsonDecode($_POST["result"]);
	$kmap = [
		"ir" => "irPicId",
		"ir-raw" => "rawAttId",
	];
	file2id($kmap, ["category"=>"muyuan", "autoResize"=>0]);
```

如果不使用file2id方法(即复用upload接口)，其参考简要实现如下：
```php
	// AC_Xxx::onValidate()
    $kmap = [
        "ir" => "irPicId",
        "ir-raw" => "rawAttId",
    ];
    $dir = "upload/foitem/";
    if (!is_dir($dir))
        mkdir($dir, 0777, true);
    foreach ($_FILES as $k=>$f) {
        if (! array_key_exists($k, $kmap))
            continue;

        $fname = $dir . $f["name"];
        move_uploaded_file($f["tmp_name"], $fname);
        $attId = dbInsert("Attachment", [
            "path" => $fname,
            "orgName" => $f["name"],
            "tm" => date(FMT_DT),
        ]);
        $k1 = $kmap[$k];
        $_POST[$k1] = $attId;
    }
```

