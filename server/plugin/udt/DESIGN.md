# UDT - 用户自定义表

## 用法概要

在主设计文档中包含本文件：

	@include server\plugin\udt\DESIGN.md

用于创建表和字段。

在设计文档中初始化定义"U_"开头的表（即用户自定义表），示例：

	@U_费用: 项目号,项目实施时间(date),安装内容,项目负责人,金额(n)

- 表名及字段名可以用中文（确保utf-8编码）
- 系统自动为它创建以下字段：id, tm, updateTm
 这些字段无须手工添加。

定义时，字段默认为字符串类型，可以指定的类型参考下节UDF.type字段说明。
使用tool/upgrade工具升级数据库。
（注意：TODO: 目前受限于upgrade工具，必须先调用一次upgrade工具生成UDT等表，再定义用户表，然后再运行一次upgrade工具）

后端包含该插件，在plugin/index.php中添加：

	Plugins::add("udt");

系统根据用户表定义，自动显示合适的前端页面（包括移动端和管理端）。
将m2/page和web/page下的文件复制到相应位置。(可在本目录运行make命令);
将m2/index.js合并到主js文件中（如m2/index.js).

查看管理端页面：

	WUI.showPage("pageUDT","费用",["费用"]);

第三个参数是UDT名字，必传。第二个参数是页面标题，一般与UDT名相关。

管理端显示明细对话框：

	WUI.showDlg("#dlgUDT__费用");

查看移动端页面：

	MUI.showPage("#udt__费用");

## 数据库设计

用户表及字段定义(metadata):

@UDT: id, name, title
@UDF: id, name, title, type(s), udtId

type: Enum(s-字符串,n-小数,i-整数,t-长字符串,tm-日期时间,date-日期)

生成的表如下：

U_{tableName}: id, tm, updateTm, {field1}, {field2}, ...

## 交互接口

取metadata:

	UDT.get(name) -> {id, ..., @fields}

	fields: UDF表关联

- AUTH_GUEST

udt表的各项操作：

	U_费用.get/query/del/set/add/batchAdd

- AUTH_EMP有所有权限，AUTH_GUEST只有get权限

## 前端应用接口

管理端：

	// "U_费用"表
	WUI.showPage('pageUDT','费用统计',['费用']);

	var jdlg = $('#dlgUDT__费用');
	jdlg.objParam = {name: '费用'};
	WUI.showObjDlg(jdlg);

	或
	WUI.showObjDlg('#dlgUDT__费用', FormMode.forAdd, {name: '费用'})

- page/pageUDT.html
- page/dlgUDT.html

移动端：

	MUI.showPage("udt__费用");

- page/udt.html

