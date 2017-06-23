## v4.0 - 2017/6

重构项：

- 基于本项目分离出以下可独立应用的筋斗云家族项目：
	- jdcloud-php 筋斗云后端框架
	- jdcloud-m 筋斗云前端框架
	- jdcloud-mui 筋斗云前端单页应用框架
	- jdcloud-wui 筋斗云移动端单页应用框架
	- jdcloud-cs 筋斗云后端框架(.NET版)
	- jdcloud-java 筋斗云后端框架(java版)
	- jdcloud-rtest 筋斗云后端接口测试框架
	- jdcloud-gendoc 筋斗云文档工具

- 移动前端: 使用分离出的jdcloud-mui库。
- 管理端: 使用分离出的jdcloud-wui库，支持逻辑页模块化开发。将缺省主题由蓝色改为黑白风格。
- 设计文档使用更通用的markdown(md)格式替代小众的vimwiki(wiki)。
- 插件重构: 将原先示例功能插件化，重新定义模块编码规范，引入JDSingletonImp模式替换原有的PluginBase及其事件机制。
- 后端: 框架文件重构到server/php/jdcloud-php目录下。
- 后端: 引入autoload机制（默认未开启）。包含php/autoload.php可使得php/class目录下的类文件按需加载。

改进项：

- 后端: 测试模式只能通过后端配置；模拟模式以及调试日志等级只在测试模式下有效。
- 后端: 支持对象型接口使用非标准接口，如Ordr.cancel。
- 部署工具: 支持MSSQL
- 上线工具: 支持sftp; 更智能可自动关联线上代码库和online代码库

## v3.3 - 2017/1

- 前端: 支持模拟接口(MUI.mockData)
- 前端: 逻辑页面支持vue库协同工作
- 前端: 页面路由允许定制URL, 支持多级目录; 识别运行商劫持, 可继续运行.
- 工具: webcc支持非git环境下使用

## v3.2 - 2016/12

- 删除server/m目录中旧的JQM框架部分。移动端只使用server/m2目录。
- 工具：webcc增强，可合并压缩js/css/逻辑页。
- 工具：jdcloud-build(原名make_install) 支持以git方式发布。
- 前端：callSvr扩展机制增强，可设置默认适配非筋斗云后端。
- 前端：initPageList支持适配非筋斗云后端接口
- 前端：逻辑页内嵌style自动限制在当前页生效。

## v3.1 - 2016/11

- 后端：支持插件API，增加syslog插件
- 前端：增加 MUI.formatField 等方法, initPageList增强
- 工具：upgrade.php增强，支持文档包含，showtable支持模糊查询等。

## v3.0 - 2016/10

- 插件机制
- 发布时文件合并增强，可合并目录下所有文件

## v2.5 - 2016/8

- 后端：getExt函数 - 外部系统依赖部分重构。

## v2.4 - 2016/7/25

- 前端：callSvr接口支持FormData
- 后端：支持虚拟表
- 文档：显示子项目录
- 工具：webcc支持指定分支上传。

## v2.3 - 2016/7/8

- 后端：cond/orderby中均可以使用虚拟字段
- 后端：限制分页时每页最大数据条数。
- 管理端：文档完善
- 管理端：查询对话框中支持多条件and/or联合。
- 前端：页面切换机制更新
- 前端：支持跨域开发，移动端开发可不用开Web服务或php.
- 协议：测试模式与模拟模式反馈客户端

## v2.2 - 2016/6/20

- 支持批量请求(batchCall)，并支持事务及参数引用。
- 客户端自动更新机制。
- 前端：增加列表页与详情页框架。(initPageList, initPageDetail)
- 前端：页面元素模板化生成，建议使用函数setFormData或juicer库
- API文档工具与文档生成
- Sprite图生成工具

## v2.1 - 2016/6/1

- 后端：支持分组统计查询（gres参数）。
- 工具：添加初始化配置等工具（tool/init.php）。
- 前端：超级管理端帐户可配置：环境变量 P_ADMIN_CRED

## v2 - 2016/5/30

- 目录结构调整
- webcc支持差量构建，并支持差量发布到多个服务器。
- 后端：支持RESTFul形式的URL。
- 后端：避免XSS攻击

## v1 - 2016/3/14

筋斗云前端和后端框架：

- 实现DACA架构及BQP通讯协议。
- 前端移动框架：实现页面对象模型（POM）
- webcc发布组件

