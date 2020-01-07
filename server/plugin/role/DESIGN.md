# 管理平台角色权限设计

## 用法概要

在主设计文档中包含本文件：

	@include server\plugin\role\DESIGN.md

用于创建表和字段。

后端无须包含本插件，即无须修改plugin/index.php。

在本目录中运行`make`，为工程添加相关文件，将它们加入git仓库 (TODO: 自动加)。

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

在员工管理列表页，将perms字段改为如下：web/page/pageEmployee.html

			<th data-options="field:'perms', jdEnumMap:PermMap, formatter:Formatter.enum(PermMap), sortable:true">角色</th>

如果员工管理详情页，将perms字段修改为如下：web/page/dlgEmployee.html

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
			if ($this->ac == "get") {
				$this->addRes("perms rolePerms");
				$this->enumFields["rolePerms"] = function ($perms, $row) {
					if (! $perms)
						return;
					// "perm1, perm2" => "IN ('perm1', 'perm2')"
					$permsExpr = preg_replace_callback('/\w+/u', function ($ms) {
						return Q($ms[0]);
					}, $perms);
					$arr = queryAll("SELECT perms FROM Role WHERE name IN (" . $permsExpr . ")");
					$rolePerms = array_map(function ($e) { return $e[0]; }, $arr);
					return join(' ', $rolePerms);
				};
			}
		}
	}

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

