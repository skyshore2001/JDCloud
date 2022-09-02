# 版本日志

## v6 - 2022/3

- 后端(jd-php)
 - 重构应用框架。引入JDEnv替代ApiApp，DBH等全局变量移入JDEnv，`$_GET/$_POST/$_SERVER/header/echo`去全局化
 - 支持swoole环境，用于守护进程服务（daemon）的开发: server/daemon下有示例。
 - 支持后端扩展（二次开发/扩展开发/Addon开发），优先找Imp类。
 - 通用query接口：
   - 支持tmField参数，用于自定义报表中支持指定时间统计字段；
   - 统计增强：支持statRes参数，返回统计列；增强sumFields参数，支持统计跨页数据；pivotSumField参数，分组后统计。
   - pivot: 支持在分组查询时包含非分组、非统计的普通列。
   - 查询参数cond除支持字符串数组外，增加支持键值对，增强getQueryCond函数；可用params("cond")取cond参数，会同时从GET/POST参数中取
   - 支持通用Obj.query(qsearch)接口，如`callSvr("Ordr.query", {qsearch: "dscr,cmt:张* 退款"})`
   - 导出excel时(query接口)自动判断列类型(以前全部用字符串,不方便在excel中做数值计算)
   - 导出excel支持某项为数组
 - 子表更新支持patch/put两种模式
 - 批量导入时的更新机制增强(batchAdd+uniKey), uniKey支持虚拟字段，支持只批量更新模式(uniKey加!结尾); 全面支持子表更新(默认使用put模式更新子表)
 - 增加通用对象接口batchSet/batchDel，与setIf/delIf接口相同，但对每个对象依次处理，可执行定制逻辑。
 - 通用add接口：除指定res外，还可以指定res_xxx, param_xxx子表选项。
 - SQL日志记录INSERT/UPDATE语句返回值（或新的ID），记录queryOne/queryAll的返回记录数
 - 支持通用URL参数`_raw`，返回非json的纯数据，用于与shell集成。
 - 会话名由{appName}id改为采用{appType}id，这样浏览器中不同应用(比如员工移动端emp和管理端emp-adm)可共享登录会话
 - 引入readBlock函数编程模型(common.php)
 - 支持在免认证接口内部调用需要认证的接口，支持模拟身份认证（Conf::$authKeys增加none类型）
 - 推荐使用jdRet函数替代MyException/DirectReturn/setRet等
 - 统一使用jsonEncode, 去除全局JSON_FLAG
 - 增加对ApiLog与SyslogV接口，允许超级管理员(admin)或最高管理员(emp:mgr)访问
 - common: 增加qstr, myexec, redirectOut等函数。

- 管理端(jd-web)
 - 二次开发支持
   - WUI.setDlgLogic: 新的对话框逻辑设置方式。
   - gn字段访问器：formItems底层重构，支持WUI.getFormItem/gn(jquery)通用组件访问接口
   - upgrade-addon: 支持addon的导入（安装）、导出。
   - 引入jsoneditor与ace代码编辑器。
   - 页面增加dg_toolbar事件，支持定制列表工具栏按钮
 - 通用统计报表（WUI.showDataReport、dlgDataReport）支持数据透视表
    - 支持指定行、列分组项和统计项，支持多个统计项，支持查询条件，支持指定时间字段自动按年月等分组；支持行、列上汇总。
    - 支持生成统计图。WUI.showDlgChart支持直接显示统计图。
    - 支持treegrid树表显示
 - datagrid数据表
   - 支持列统计，右键列头或多选时可见。支持在数据表底部显示列统计值。datagrid扩展sumFields选项，可结合后端query接口的statRes做跨页统计
   - 支持自动限制最大列宽为500px。支持通过CSS设置datagrid最大列宽(wui-datagrid-cell-max-width)
   - 增加表头右键和列上右键，增加字段信息、自定义查询、自定义报表、操作日志等一系列通用操作。
 - 通用操作日志(pageObjLog)，关联当前表格，或当前选择的单行或多行中的对象
 - 通用页面筛选条件。WUI.showPage接口支持指定额外筛选条件（pageFilter选项）。注意WUI.showPage接口支持选项，导致initPageXxx(objParam)这种定义不兼容需要手工升级;
 - pageIframe: 支持超链接在系统内tab页显示
 - pageTab: 通用布局页，支持页面内左右或上下布局，每个布局区域支持多tabs；WUI.showPage通过target选项指定在哪个tab显示页面
 - pageSimple: 通用数据表页面，可用于自定义查询和自定义统计分析的输出，支持分页、支持辅助列
 - 对话框
   - 增加“应用”（saveDlg），立即保存，不关闭对话框
   - 在forSet模式对话框上按Ctrl-D，复制新增(dupDlg)功能；
   - 增加“确定后关闭”选项，兼容WUI.options.closeAfterAdd/closeAfterFind。默认行为：连续添加、连续查询、单次修改后关闭。修改后不关闭对话框，则会重新刷新当前对话框。
 - plugin login: 支持限制用户一处登录
 - treegrid支持多选。
 - 页面的toolbar按钮逻辑扩展支持参数，比如qsearch工具栏按钮支持指定字段参数。
 - 系统间同步数据最佳实践：添加“复制到”对话框(dlgCopyTo)。
 - 升级到jquery easyui 1.7.6(支持jquery1.x的最新版)
 - 增加 wui-help 组件，wui-more组件（点击展开内容）
 - URL参数phpdebug=1支持php调试
 - combobox/combogrid支持动态设置选项。combobox延迟加载列表。
 - dlgImport: 支持批量更新以及对一个对象多种导入
 - 增加Formatter.progress显示百分比
 - wui-combogrid组件：支持下拉列表中添加对象
 - Cinf用于系统配置。CinfList配置
 - wui-labels组件优化：支持每次打开对话框时均刷新标签列表
 - batchOp增强，支持基于指定查询条件的批量操作模式。

- 工具(jd-tool)
 - 在线升级工具tool/init.php在配置存在时要求输入密码进入。支持初始化sqlite
 - fix-table.php用于批量导入图片或文件
 - upgrade-addon: 支持addon的导入（安装）、导出。

## v5.5 - 2021/2

- 后端(jd-php)
 - 对象定义增强，subobj支持关联表（设置关联条件）；
   虚拟字段vcol可依赖主表字段、虚拟字段或子表字段(require)，支持多个依赖字段，且依赖的辅助字段不显示在最终结果中的。(hiddenFields0)
   计算字段(enumFields)可使用各种类型的依赖，取字段值时使用getAliasVal函数。
 - query查询接口增强，支持fmt=array/hash/multihash/one?/tree等格式；支持pivot参数，将行转置到列上
 - batchAdd批量导入接口增强。支持存在则更新（uniKey指定唯一索引，支持联合索引），支持同时导入子表，支持列名映射，支持csv格式及json格式。
 - 接口认证新机制，hasPerm支持扩展认证，支持HTTP标准的Basic认证方式及之前的simple认证。
   通过Conf::$authKeys指定认证参数，支持模拟系统用户。通过Conf::$authHandlers扩展认证方式。
 - del接口增强，删除对象自动当做禁用处理的机制(delField)
 - 自动从AC_xxx文件中加载AC0_xxx, AC2_xxx等类
 - 增加jdRet，callSvcAsync，table2html, arrFind, arrMap, arrGrep等函数
 - 默认允许跨域调用
 - upload插件：上传接口允许定制路径

- 管理端(jd-web)
 - 新增wui-combogrid下拉列表组件；
 - wui-subobj组件增强，使用tabs组件在对话框中展示子表;
   增加用`relateKey={id}`的方式定义关联，更直观；支持非id字段关联的关联表；支持树表(treegrid)展示
   支持offline模式添加数据时回显虚拟字段，以及提交时排除虚拟字段。
 - wui-upload组件: 上传附件时支持显示名字，选项opt.fname通过虚拟字段显示附件名；允许定制上传接口
 - 查询模式增强，支持默认实施模糊查询(WUI.options.fuzzyMatch)；getQueryCond增强，支持指定字段类型等。
 - 统计与通用报表查询增强(pageSimple, dlgReportCond, pivot机制), 
   rs2Stat统计函数重构和增强，增加pivot行列转置，自定义显示格式更强大。增加pageSimple页面动态显示统计表。
 - 批量操作batchOp增强,支持对任意操作批量操作
 - 列表工具栏支持可扩展机制(`dg_toolbar`), 除增删改查外，扩展了“导入/import”,“快速查询qsearch”操作，成为标准操作。
 - 导入导出增强，导出时文件名包含查询条件
 - WUI.formItems重构支持扩展输入框，已支持easyui组件中的databox, datetimebox, combo系列等。
 - callSvr返回的dfd支持用catch处理异常。$.Deferred自动兼容H5的Promise接口。
 - callSvr支持取js/json等文件, 添加loadCss/loadJson函数；wui-deferred支持按需加载js/css库
 - 访问项目根目录，默认打开web管理端；管理端打开时可直接进入URL hash中指定页面
 - 新增moduleExt模块扩展机制，支持复用另一个项目的后端接口、页面、对话框。参见实例文档。
 - 新增wui-picker-edit/wui-picker-help组件，用于增强对话框上输入框。
 - 增加WUI.showByType根据type决定当前显示/启用一组控件中的哪一个控件。
 - 增加Formatter.enumFnStyler用于更灵活地定义不同状态的颜色

- 工具(jd-tool)
 - 新插件体系，支持插件独立维护，新增插件工具jdcloud-plugin.sh。
   创建jdcloud-plugin-notify, jdcloud-plugin-ueditor, jdcloud-plugin-mail, jdcloud-plugin-jsonEditor, jdcloud-plugin-seqgen等插件。
 - 移动端部署简化，使用makefile替代webcc

## v5.4 - 2020/5

- 后端(jd-php)
 - (subobj)支持子对象级联操作，支持子对象查询参数`param_{subobj}`, 添加文档“子表对象设计”及最佳实践。
 - 支持qsearch模糊匹配机制，可模糊查询表中多个字段。
 - 支持记录调试日志到debug.log，不再只依赖于调试输出到前端，便于线上调试和追溯。日志文件可设置`P_DEBUG_LOG`
 - 对象调用重构。增加AccessControl::callSvc，内部可直接指定AC类调用。增加tmpEnv函数。
 - 增加simple认证方式, 目前upload接口支持simple认证. 
 - 外部字段增强(isExt)
 - 设置只读属性将报错，增加useStrictReadonly兼容旧版;
 - 对象set/del接口也会先通过执行onQuery查询是否有操作权限，从而限制操作数据的范围. 
 - 调用对象接口时，系统自动加载`class/AC_{obj}.php`文件
 - batch重构和增强：引用参数更灵活；batch调用在ac中显示明细
 - query接口支持fmt=one, 类似get接口，方便单条查询，特别适合取数量的接口。
 - enumFields回调函数增强，增加参数row: fn(val, row)
 - 增加`P_initClient`机制为前端传全局配置。
 - 支持伪uuid类型的id
 - 使用jdEncryptI加解密。
 - 增加text2html支持简单markdown文本转html
 - 增加inSet, issetval增强(支持"perms?"), getBaseUrl增强；增加getSignContent支持生成签名，jsonEncode/jsonDecode
 - jd-plugin-pay, jd-plugin-login: 重构三方支付插件和微信认证。支持微信unionid
 - jd-plugin-upload: autoResize参数支持直接设置图片宽高. 小图片可不再做压缩
 - jd-plugin-login: 增加重置密码接口
 - jd-plugin-upload: 增加pic接口，可生成多图页面。

- 前端(jd-m2)
 - 支持扩展动画效果，添加动效：向上滑入up和弹出pop两个效果；调整页面返回时效果为推出
 - jd-plugin-syslog: 增加记录页面切换日志
 - 增加MUI.options.fixTopbarColor，为true则自动根据页面第一个hd的背景色设置手机顶栏颜色. 增加setTopbarColor手动设置顶栏色。
 - 增加MUI.options.onShowPage选项: 可用于统一处理登录认证
 - MUI.initPageList支持本地分页(localPageSize)
 - 加载时延迟500ms显示加载图标(可配置)。

- 管理端(jd-web)
 - jd-plugin-role: 管理端角色权限框架，支持自定义角色对应的菜单/按钮项。
 - 批量导入与batchAdd接口功能增强及最佳实践，批量上传及工具：upload/tool/gen_upload simiar_join
 - 支持treegrid树型列表. 
 - 新增标签选择组件 .wui-labels
 - 页面表格自适应高度，表头和工具栏置顶。
 - 新增WUI.makeLink, 支持生成a链接时同时指定回调函数。
 - 三击或右击标题栏, 弹出隐藏菜单. 支持手机上三击标题栏设置批量操作模式.
 - 添加WUI.tryAutoLoginAsync 支持异步登录
 - 对话框padding按默认不指定。
 - WUI.showPage标题中可以使用%s占位符

- 工具(jd-tool)
 - 新增文档《筋斗云开发实例讲解.md》和《子表对象设计.md》
 - create-wui-page改进。生成页面时可配置是否生成移动端页面
 - `git_clone`: 默认不下载项目日志（使用depth=1参数），减少项目大小

## v5.3 - 2019/7

- 后端(jd-php)
 - ObjLog机制。可用Conf::enableObjLog关闭
 - 支持jsonp格式返回（URL参数`_jsonp`）
 - 可在onApiInit中支持将`notify/orderStatus`这样的URL转换成`Notify.orderStatus`
 - 增加Conf::enableAutoSession可手工控制session开始。
 - 用黑白名单和Conf::checkSecure替代ApiWatch; 日志中记录IP时支持透过代理(getReqIp)
 - 将class目录设置为默认库包含路径. 
 - 批量导入时支持备份文件(batchAdd)
 - callSvcInt增强; getQueryCond; SimpleCache; 
 - 接口`Obj.del(force=1)`在id不存在时不报错
 - jd-plugin-login: 万能密码机制, 可配置变量maintainPwd（维护密码）
 - jd-plugin-upload: 支持导出附件到zip(Upload::exportZip)
 - jd-plugin-login: 绑定微信用户增强，可合并用户；Login::$bindUserUseCode=false 绑定用户手机时无须验证码

- 前端(jd-m2)
 - MUI.initPageDetail/setFormSubmit支持异步提交; 

- 管理端(jd-web)
 - 导出excel文件, 不再用excelcsv, 而是输出真正的excel. 支持ctrl-导出时选择导出格式
 - 添加数据后可关闭窗口(WUI.options.closeAfterAdd)
 - jd-plugin-udt: 初步支持UDT(用户自定义表对象)，支持中文对象名和前端页面名
 - 管理端表格列数很多时，在手机上加载、刷新很慢。修改easyui源码解决
 - 对话框上的固定字段：wui-fixedField, 添加时自动从对话框的objParam中取值，其它模式不可修改（即readonly）
 - 增加查询操作：对话框中三击（2秒内）字段标题栏，可快速按查询该字段，Ctrl+三击为追加过滤条件
 - 在页面工具栏中，按住Ctrl(batch模式)点击“刷新”按钮，可清空当前查询条件

- 工具(tool)
 - 增加模型一键生成演示(tool/index.php), 自动生成后端、前端、更新数据库表、添加菜单项。
 - create-wui-page/create-mui-page模板增强: 列表、明细页处理对象添加和删除

## v5.2 - 2019/3

- 前端(jd-m2)
 - 脚本错误可上传到syslog表
 - jd-uploadpic插件，用于上传图片（压缩、预览、上传）。增加compressImg函数。
   支持上传时显示进度百分比
 - 支持设置从某些页面返回时，不刷新当前页(backNoRefresh)
 - setStorage/getStorage支持自动添加变量前缀，由STORAGE_PREFIX指定，以便不同项目可同时运行。
 - 直接用源码部署，也支持应用优化，m2目录下可运行make用于合并文件。
 - 批量导入对话框示例dlgImport
 - 微信中不显示标题栏
 - getFormData支持传数组参数即name=xx[] 形式
 - 页面支持多个hd和ft
 - 自动处理URL中的wxCode参数（一般是微信小程序中获取并传给web-view），做微信认证
 - MUI.options.enableSwitchApp自动切换H5应用
 - app.css中可定义主色调等。

- 后端(jd-php)
 - 批量更新、批量删除、批量导入（添加）功能: setIf, delIf, batchAdd
 - 导出文件增强：queryAllWithHeader, handleExportFormat
 - ApiLog1: 记录batch操作明细
 - queryAll支持返回多结果集
 - 自定义返回格式机制(`X_RET_FN`)
 - upload与login插件增强
 - httpCall记录慢查询到日志
 - 缺省查询最大返回数据条数由100条改为1000条。
 - 在conf.user.php中设置session超时时间
 - query接口导出时，支持html格式：Obj.query(fmt=html)
 - jd-php: apilog中将上传时间也算进来
 - dbUpdate等操作数据库时，可用dbExpr指定SQL表达式
 - jd-plugin-login: 支持微信小程序登录，增加login2(wxCode)接口
 - 外部虚拟字段机制(isExt)
 - IP白名单机制(whiteIpList)
 - 异步调用机制(enableAsync)

- 管理端(jd-web)
 - 详情对话框样式调整，输入框自动占满宽度
 - my-combobox: 支持级联下拉列表
 - 菜单中设置"nperm-xxx"类表示无xxx权限则显示。
 - 统计页支持直接显示未汇总数据的图表
 - 用WUI.compressImg替代lrz库。
 - 增加jdcloud-wui-ext.js，支持wui-upload和wui-checkList组件，用于对话框上的上传文件/图片，以及多选框。
 - 添加对象（或更新后）时下拉列表（my-combobox）可自动刷新
 - 引入异步事件调用triggerAsync
 - 在showDlg时可设置底层jquery-easyui dialog选项
 - 手机上显示优化

- 工具(jd-tool)
 - create-mui-page.sh，生成移动页面模板。
 - tool/genDbDoc.pl 生成数据库表文档工具

## v5.1 - 2018/7

- 前端
 - 支持静默调用，callSvr的noLoadingImg选项增强。
 - 允许在handleLogin中定制首页。
 - 移动端示例程序WeUI库升级到1.x，与之前不兼容。

- 管理端
 - 页面传参数给对话框机制(jdlg.objParam)；
 - 支持页面及对话框为不同对象所复用；
 - 添加对象时可设置子表不立即写数据库（showObjDialog支持offline模式）
 - 导出excel增强。支持导出枚举字段。
 - getFormData支持上传文件；
 - 外部对话框支持顶级form标签。
 - 增加create-wui-page工具，可创建管理端页面、对话框模板。
 - 调试增强：连续5次点击当前tab标题，重新加载页面和对话框，便于立即刷新逻辑页。
 - 查询模式增强：支持日期类型字段直接查询某日、某月，如"2018-5"相当于原先的"2018-5-1~2018-6-1"
 - 示例增加登录帐户管理。
 - 统计页时间段增强。
 - showObjDlg增加opt.onCrud回调, 用于点击表格上的增删改查工具按钮完成操作时插入逻辑

- 后端
 - RESTful风格增强，且支持非标准CRUD接口。
 - 新增dbUpdate/dbInsert函数。增加BatchInsert，用于大批量导入数据。
 - 批量更新与批量删除接口，支持使用虚拟字段查询。
 - 增加arrayCmp工具函数，用于数据同步。
 - 添加partner插件，提供开放API验证机制。
 - query接口cond参数允许同时出现在GET/POST中，且允许为数组。
 - excel导出优化
 - 子表查询优化：原先query接口查子对象要做N次查询，现在只做1次查询，然后后端实现与主表join。
 - httpCall增强。
 - 添加php/class目录，默认做为按需加载的类目录。
 - (plugin login) login接口废弃wantAll参数，默认返回用户信息; 添加reg接口。
 - (plugin upload) 缩略图默认大小360px；图片压缩后大小不超过1280x1280.
 
- 工具
 - (jd-upgrade) 部署工具支持导出更新表结构的SQL。小数字段默认保留小数后2位（原来是4位）。
 - (jd-build) 自动先从online库更新。
 - (tool/init.php) 初始化时P_URL_PATH参数默认为空，不再强制验证cookie。
 - (tool/upgrade/) 支持在线升级数据库。

## v5.0 - 2018/1

- 前端：升级原生APP接口，框架由cordova 5.4升级到cordova 7.1.
- 前端：默认引入fastclick库解决IOS点击延迟问题。
- 前端：顶栏图标按钮优化。管理端样式优化。
- 前端：batch优化，只有一个调用不使用batch调用
- 前端：默认允许跨域调用
- 管理端：my-combobox增强，支持指定列表，支持异步调用，支持batch调用。
- 管理端：导出Excel功能增强，支持枚举字段。
- 管理端：查询条件支持数字或日期区间
- 管理端：WUI对话框事件优化。去除formLink窗口模式。
- 后端：get/query接口支持返回枚举描述及自定义字段处理
- 工具：增加git_clone.sh工具，解决应用提交日志和库更新日志混杂在一起的问题
- 工具：upgrade工具可独立于jdcloud-php库运行，并增加upgrade.sh。
- 工具：文档显示样式增强

## v4.2 - 2017/9

- 后端：通过query操作增加gcond参数，废弃wantArray参数，代之以`pagesz:-1`.
- 前端：逻辑页可声明依赖库，支持mui-deferred属性
- 前端：添加list2varr函数处理后台压缩表格式
- 工具：jdcloud-gendoc增强，支持模板输出，支持指定js/css。
- 工具：upgrade工具增强，命令行可直接执行内部命令
- 文档美化，增加左侧目录。

## v4.1 - 2017/8

- 前端：统计分析页支持。initPageStat(web/lib/jdcloud-wui-stat.js)
- 去除xdk支持(Intel已停止XDK项目). 换用Cordova直接编译手机应用。参考jdcloud-app项目。

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

