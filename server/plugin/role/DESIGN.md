# 管理平台角色权限设计

## 安装

在主设计文档中包含本文件：

	@include server\plugin\role\DESIGN.md

用于创建表和字段。

后端无须包含本插件，应在plugin/index.php中设置：

	$GLOBALS["P_initClient"]["enableRole"] = true;

前端可使用`g_data.initClient.enableRole`检查是否开启本特性。

在本目录中运行`make`，为工程添加相关文件，这些文件将自动加入git仓库。

在管理端主菜单中添加“角色管理”：

	<div class="perm-mgr" style="display:none">
		<div class="menu-expand-group">
			<a><span><i class="fa fa-pencil-square-o"></i>系统设置</span></a>
			<div class="menu-expandable">
				...
				<a href="#pageRole">角色管理</a>
				...
			</div>
		</div>
	</div>

以下编码已在项目中做过适配，无须添加，步骤仅供参考：

在员工管理列表页，将perms字段改为如下：web/page/pageEmployee.html

			<th data-options="field:'perms', jdEnumMap:PermMap, formatter:Formatter.enum(PermMap), sortable:true">角色</th>

在员工管理详情页，将perms字段修改为如下：web/page/dlgEmployee.html

			<tr>
				<td>角色</td>
				<td class="wui-checkList" data-options="ListOptions.Role()">
					<input type="hidden" name="perms">
					<div><label><input type="checkbox" value="mgr">最高管理员</label></div>
					<div><label><input type="checkbox" value="emp" checked>管理员</label></div>
				</td>
			</tr>

在主逻辑store.js中添加ListOptions.Role函数：

	var ListOptions = {
		...
		Role: function () {
			var opts = {
				valueField: "name",
				textField: "name",
				url: WUI.makeUrl('Role.query', {
					res: 'name',
					pagesz: -1
				})
			};
			return opts;
		}
	};

在后端api_objects.php中，扩展接口`Employee.get`，返回rolePerms字段

	Employee.get() -> {..., rolePerms}

	class AC2_Employee extends ...
	{
		protected function onQuery()
		{
			if ($GLOBALS["P_initClient"]["enableRole"]) {
				AC0_Role::handleRole($this);
			}
		}
	}

## 概要设计

角色包括系统**内置角色**和**自定义角色**. 

默认内置角色有:

- mgr: 最高管理员, 有系统设置权限, 查看无限制
- emp: 管理员, 只能查看自己的内容。不显示“系统设置”菜单（即不可配置用户、角色）

要添加内置角色，请参考文档[筋斗云开发实例讲解]的[角色定义]章节。

自定义角色功能由本插件提供，包括为角色定义菜单权限、操作权限（CRUD等）。
按下节步骤添加角色权限配置功能后，在管理端“系统设置”菜单中，将添加“角色管理”菜单，其中可创建和定义角色。

最简单的方法是，要显示什么菜单，就添加一个角色，配置该菜单名，比如“车辆管理 异常管理”。
添加菜单名后，该项下所有操作都被允许，如果要限制操作，可以按提示添加如“只读”，“不可导出”等。
详细规则见下节介绍。

### 权限设置规则

默认情况下，所有菜单不显示，其它操作均允许。
如果指定了`*`权限，则显示所有菜单。
如果指定了`不可XX`权限，则topic或cmd匹配XX则不允许。

- topic: 通过菜单、页面、对话框、按钮的`wui-perm`属性指定，如果未指定，则取其文本text.
- cmd: 对话框，新增，修改，删除，导出，自定义的按钮

示例：假设有菜单结构如下（不包含最高管理员专有的“系统设置”）

	主数据管理
		企业
		用户

	运营管理
		活动
		公告
		积分商城

只显示“公告”菜单项：

	公告

只显示“运营管理”菜单组：

	运营管理

显示除了“运营管理”外的所有内容：

	* 不可运营管理

其中`*`表示显示所有菜单项。
显示所有内容（与管理员权限相同），但只能查看不可操作

	* 只读

“只读”权限排除了“新增”、“修改”等操作。
特别地，“只读”权限也不允许“导出”操作（虽然导出是读操作，但一般要求较高权限），假如要允许导出公告，可以设置：

	* 只读 公告.导出

显示“运营管理”，在列表页中不显示“删除”、“导出”按钮：

	运营管理 不可删除 不可导出

显示“运营管理”，在列表页中，不显示“删除”、“导出”按钮，但“公告”中显示“删除”按钮：

	运营管理 不可删除 不可导出 公告.删除

或等价于：

	运营管理 不可导出 活动.不可删除 积分商城.不可删除

显示“运营管理”和“主数据管理”菜单组，但“主数据管理”下面内容均是只读的：

	运营管理 主数据管理 企业.只读 用户.只读

### 后端设计

角色存储在字段Employee.perms中（包括自定义角色），值示例："mgr", "emp", "财务管理"等。
权限由Employee.get接口(管理端登录接口返回也一样)根据perms字段及Role表定义自动生成虚拟字段rolePerms:

	Employee.get() -> {... rolePerms}

筋斗云前端框架自行根据Employee.rolePerms自行设置菜单和按钮，对其它框架给出参考设计实现。

本插件还为Employee对象增加了查询参数role，如查询有“售后审核”权限的某个员工：

	callSvr("Employee.query", {fmt: "one?", res: "id", role:"售后审核"})

注意：它会支持一个人多角色的情况，如果使用查询条件`cond: "perms='售后审核'"`则不正确。

### 前端设计

参考：

- WUI.canDo 在jdcloud-wui.js中内置，实现权限规则。文档有如何设置权限的示例
- WUI.applyPermission 登录后根据perms/rolePerms过滤菜单(或文档中查询key permission 菜单权限控制)，定义于jdcloud-wui-ext.js中。

## 数据库设计

@Role: id, name, perms(t)

- perms: 权限名列表，中间以空格分隔。每个权限名可加"不可"前缀。例："运营管理 不可导出 用户.导出 活动管理.只读 积分商城.不可删除"。

## 交互接口

管理端设置角色：

	Role.add/set/get/query/del

- AUTH_EMP

返回用户权限：

	Employee.get() -> {id, perms, ..., rolePerms}

TODO: 后端控制权限

	hasPermName("活动管理");

## 前端应用接口

权限检查：

	g_data.permSet
	WUI.canDo(topic, cmd=null, defaultVal=true)

为页面、对话框标记权限可以用wui-perm属性。详细参考 canDo。

角色检查：

	g_data.hasRole(role); // 等同于 g_data.hasPerm，由于历史原因，hasPerm函数指的其实是角色。

TODO 可在applyPermission之前自行设置`g_data.rolePerms`字段，从而设置固定的role。

管理端增加页面：

- page/pageRole.html
- page/dlgRole.html

